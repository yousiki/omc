/**
 * Python REPL Tool
 *
 * Self-contained module providing a persistent Python execution environment.
 * Spawns a Python subprocess running the gyoshu_bridge.py JSON-RPC server
 * over a Unix socket. Supports execute, reset, get_state, and interrupt actions.
 *
 * Architecture:
 * - PythonBridge: Manages the bridge subprocess lifecycle
 * - Socket client: Sends JSON-RPC 2.0 requests over Unix socket
 * - Session locking: File-based lock to prevent concurrent access
 */

import type { ChildProcess } from 'node:child_process';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  existsSync,
  constants as fsConstants,
  lstatSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { open, unlink } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { homedir, hostname, platform as osPlatform, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Tool definition type (matches MCP server registration)
// ---------------------------------------------------------------------------

export interface PythonReplToolDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface BridgeMeta {
  pid: number;
  socketPath: string;
  startedAt: string;
  sessionId: string;
  pythonPath: string;
}

interface ExecuteResult {
  success: boolean;
  stdout: string;
  stderr: string;
  markers?: Array<{ type: string; subtype: string | null; content: string }>;
  timing?: { started_at: string; duration_ms: number };
  memory?: { rss_mb: number; vms_mb: number };
  error?: { type: string; message: string; traceback: string };
}

interface StateResult {
  memory: { rss_mb: number; vms_mb: number };
  variables: string[];
  variable_count: number;
}

interface ResetResult {
  status: string;
  memory: { rss_mb: number; vms_mb: number };
}

interface InterruptResult {
  status: string;
  terminatedBy?: string;
  terminationTimeMs?: number;
}

interface JsonRpcResponse {
  jsonrpc: string;
  id: string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_EXECUTION_TIMEOUT_MS = 300_000; // 5 minutes
const BRIDGE_SPAWN_TIMEOUT_MS = 30_000; // 30 seconds
const SHORT_HASH_LEN = 12;

// ---------------------------------------------------------------------------
// Path utilities
// ---------------------------------------------------------------------------

function getRuntimeDir(): string {
  const plat = osPlatform();
  if (plat === 'darwin') {
    return join(homedir(), 'Library', 'Caches', 'omc', 'runtime');
  }
  const xdg = process.env.XDG_RUNTIME_DIR;
  if (xdg && existsSync(xdg)) {
    return join(xdg, 'omc');
  }
  return join(tmpdir(), 'omc', 'runtime');
}

function shortenId(id: string): string {
  return createHash('sha256').update(id).digest('hex').slice(0, SHORT_HASH_LEN);
}

function getSessionDir(sessionId: string): string {
  return join(getRuntimeDir(), shortenId(sessionId));
}

function getSocketPath(sessionId: string): string {
  return join(getSessionDir(sessionId), 'bridge.sock');
}

function getMetaPath(sessionId: string): string {
  return join(getSessionDir(sessionId), 'bridge_meta.json');
}

function getLockPath(sessionId: string): string {
  return join(getSessionDir(sessionId), 'session.lock');
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
}

// ---------------------------------------------------------------------------
// Bridge script discovery
// ---------------------------------------------------------------------------

/**
 * Find the gyoshu_bridge.py script.
 * Searches relative to this module, then common locations.
 */
function findBridgeScript(): string {
  // Environment variable override
  if (process.env.OMC_BRIDGE_SCRIPT && existsSync(process.env.OMC_BRIDGE_SCRIPT)) {
    return process.env.OMC_BRIDGE_SCRIPT;
  }

  // Relative to this file: src/tools/python-repl.ts -> ../../scripts/
  const candidates = [
    resolve(dirname(import.meta.path || __filename), '..', '..', 'scripts', 'gyoshu_bridge.py'),
    resolve(process.cwd(), 'scripts', 'gyoshu_bridge.py'),
    resolve(dirname(import.meta.path || __filename), '..', '..', 'bridge', 'gyoshu_bridge.py'),
    resolve(process.cwd(), 'bridge', 'gyoshu_bridge.py'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error(`gyoshu_bridge.py not found. Searched:\n${candidates.map((c) => `  - ${c}`).join('\n')}`);
}

// ---------------------------------------------------------------------------
// Python environment detection
// ---------------------------------------------------------------------------

function findPython(projectDir: string): string {
  // Check for .venv
  const binDir = osPlatform() === 'win32' ? 'Scripts' : 'bin';
  const pyExe = osPlatform() === 'win32' ? 'python.exe' : 'python';
  const venvPython = join(projectDir, '.venv', binDir, pyExe);
  if (existsSync(venvPython)) return venvPython;

  // Fallback to system python3
  try {
    const { spawnSync } = require('node:child_process');
    const result = spawnSync('python3', ['--version'], { timeout: 5000 });
    if (result.status === 0) return 'python3';
  } catch {
    // not available
  }

  throw new Error('No Python environment found. Create a virtual environment first:\n' + '  python -m venv .venv');
}

// ---------------------------------------------------------------------------
// JSON-RPC socket client
// ---------------------------------------------------------------------------

class SocketConnectionError extends Error {
  constructor(
    message: string,
    public readonly socketPath: string,
  ) {
    super(message);
    this.name = 'SocketConnectionError';
  }
}

class SocketTimeoutError extends Error {
  constructor(
    message: string,
    public readonly timeoutMs: number,
  ) {
    super(message);
    this.name = 'SocketTimeoutError';
  }
}

class JsonRpcError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'JsonRpcError';
  }
}

function sendSocketRequest<T>(
  socketPath: string,
  method: string,
  params: Record<string, unknown> = {},
  timeout = 60_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = randomUUID();
    const request = { jsonrpc: '2.0', id, method, params };
    const requestLine = `${JSON.stringify(request)}\n`;

    let responseBuffer = '';
    let timedOut = false;
    const MAX_RESPONSE_SIZE = 2 * 1024 * 1024; // 2MB

    const timer = setTimeout(() => {
      timedOut = true;
      socket.destroy();
      reject(new SocketTimeoutError(`Request timeout after ${timeout}ms for method "${method}"`, timeout));
    }, timeout);

    const cleanup = () => {
      clearTimeout(timer);
      socket.removeAllListeners();
      socket.destroy();
    };

    const socket = createConnection({ path: socketPath });

    socket.on('connect', () => {
      socket.write(requestLine);
    });

    socket.on('data', (chunk: Buffer) => {
      responseBuffer += chunk.toString();

      if (responseBuffer.length > MAX_RESPONSE_SIZE) {
        cleanup();
        reject(new Error(`Response exceeded maximum size of ${MAX_RESPONSE_SIZE} bytes`));
        return;
      }

      const newlineIndex = responseBuffer.indexOf('\n');
      if (newlineIndex !== -1) {
        const jsonLine = responseBuffer.slice(0, newlineIndex);
        cleanup();

        try {
          const response = JSON.parse(jsonLine) as JsonRpcResponse;

          if (response.jsonrpc !== '2.0') {
            reject(new Error(`Invalid JSON-RPC version: "${response.jsonrpc}"`));
            return;
          }
          if (response.id !== id) {
            reject(new Error(`Response ID mismatch: expected "${id}", got "${response.id}"`));
            return;
          }
          if (response.error) {
            reject(new JsonRpcError(response.error.message, response.error.code, response.error.data));
            return;
          }

          resolve(response.result as T);
        } catch (e) {
          reject(new Error(`Failed to parse JSON-RPC response: ${(e as Error).message}`));
        }
      }
    });

    socket.on('error', (err: NodeJS.ErrnoException) => {
      if (timedOut) return;
      cleanup();

      if (err.code === 'ENOENT') {
        reject(new SocketConnectionError(`Socket does not exist: ${socketPath}`, socketPath));
      } else if (err.code === 'ECONNREFUSED') {
        reject(new SocketConnectionError(`Connection refused: ${socketPath}`, socketPath));
      } else {
        reject(new SocketConnectionError(`Socket error: ${err.message}`, socketPath));
      }
    });

    socket.on('close', () => {
      if (timedOut) return;
      if (responseBuffer.indexOf('\n') === -1) {
        cleanup();
        reject(new Error(`Socket closed without complete response (method: "${method}")`));
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Simple file-based session lock
// ---------------------------------------------------------------------------

class SessionLock {
  private lockPath: string;
  private lockId: string;
  private held = false;

  constructor(sessionId: string) {
    this.lockPath = getLockPath(sessionId);
    this.lockId = randomUUID();
  }

  async acquire(timeoutMs = 30_000): Promise<void> {
    if (this.held) return;

    ensureDir(dirname(this.lockPath));

    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      // Check for existing lock
      try {
        const existing = readFileSync(this.lockPath, 'utf-8');
        const lockInfo = JSON.parse(existing);

        // Check if lock is stale (holder process dead or lock too old)
        const age = Date.now() - new Date(lockInfo.acquiredAt).getTime();
        if (age > 60_000) {
          // Stale lock, try to break it
          try {
            unlinkSync(this.lockPath);
          } catch {
            /* ignore */
          }
        } else {
          // Lock is fresh, check if holding process is alive
          try {
            process.kill(lockInfo.pid, 0);
            // Process alive, wait and retry
            await sleep(100);
            continue;
          } catch {
            // Process dead, break lock
            try {
              unlinkSync(this.lockPath);
            } catch {
              /* ignore */
            }
          }
        }
      } catch {
        // Lock file doesn't exist or can't be read
      }

      // Try to create lock atomically
      try {
        const flags = fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL;
        const fh = await open(this.lockPath, flags, 0o644);
        const lockInfo = {
          lockId: this.lockId,
          pid: process.pid,
          hostname: hostname(),
          acquiredAt: new Date().toISOString(),
        };
        await fh.writeFile(JSON.stringify(lockInfo));
        await fh.close();

        // Verify we hold the lock
        const verify = JSON.parse(readFileSync(this.lockPath, 'utf-8'));
        if (verify.lockId === this.lockId) {
          this.held = true;
          return;
        }
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
          // Another process got the lock first
          await sleep(100);
          continue;
        }
        // Other error
      }

      await sleep(100);
    }

    throw new Error(`Failed to acquire session lock within ${timeoutMs}ms`);
  }

  async release(): Promise<void> {
    if (!this.held) return;
    try {
      const content = readFileSync(this.lockPath, 'utf-8');
      const info = JSON.parse(content);
      if (info.lockId === this.lockId) {
        await unlink(this.lockPath);
      }
    } catch {
      // Ignore
    } finally {
      this.held = false;
    }
  }
}

// ---------------------------------------------------------------------------
// PythonBridge: subprocess lifecycle
// ---------------------------------------------------------------------------

// Per-session bridge instances
const bridges = new Map<string, BridgeMeta>();

function isSocketFile(p: string): boolean {
  try {
    return lstatSync(p).isSocket();
  } catch {
    return false;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function safeUnlink(p: string): void {
  try {
    unlinkSync(p);
  } catch {
    /* ignore */
  }
}

async function spawnBridge(sessionId: string, projectDir?: string): Promise<BridgeMeta> {
  const sessionDir = getSessionDir(sessionId);
  ensureDir(sessionDir);

  const socketPath = getSocketPath(sessionId);
  const bridgeScript = findBridgeScript();
  const effectiveDir = projectDir || process.cwd();
  const pythonPath = findPython(effectiveDir);

  // Clean up stale socket
  safeUnlink(socketPath);

  const proc: ChildProcess = spawn(pythonPath, [bridgeScript, socketPath], {
    stdio: ['ignore', 'ignore', 'pipe'],
    cwd: effectiveDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    detached: true,
  });

  proc.unref();

  // Capture stderr for error reporting
  let stderrBuffer = '';
  proc.stderr?.on('data', (chunk: Buffer) => {
    if (stderrBuffer.length < 64 * 1024) {
      stderrBuffer += chunk.toString();
    }
  });

  // Track early exit
  let exitCode: number | null = null;
  proc.on('exit', (code) => {
    exitCode = code ?? 1;
  });

  // Wait for socket to appear
  const startTime = Date.now();
  while (!isSocketFile(socketPath)) {
    if (exitCode !== null) {
      throw new Error(
        `Bridge exited with code ${exitCode} before creating socket. Stderr: ${stderrBuffer || '(empty)'}`,
      );
    }
    if (Date.now() - startTime > BRIDGE_SPAWN_TIMEOUT_MS) {
      if (proc.pid) {
        try {
          process.kill(-proc.pid, 'SIGKILL');
        } catch {
          try {
            process.kill(proc.pid, 'SIGKILL');
          } catch {
            /* */
          }
        }
      }
      throw new Error(
        `Bridge failed to create socket in ${BRIDGE_SPAWN_TIMEOUT_MS}ms. Stderr: ${stderrBuffer || '(empty)'}`,
      );
    }
    await sleep(100);
  }

  const meta: BridgeMeta = {
    pid: proc.pid!,
    socketPath,
    startedAt: new Date().toISOString(),
    sessionId,
    pythonPath,
  };

  // Persist metadata
  try {
    const metaPath = getMetaPath(sessionId);
    writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  } catch {
    // Non-fatal
  }

  bridges.set(sessionId, meta);
  return meta;
}

async function ensureBridge(sessionId: string, projectDir?: string): Promise<BridgeMeta> {
  // Check cached meta
  const cached = bridges.get(sessionId);
  if (cached && isProcessAlive(cached.pid) && isSocketFile(cached.socketPath)) {
    return cached;
  }

  // Check persisted meta
  try {
    const metaPath = getMetaPath(sessionId);
    if (existsSync(metaPath)) {
      const raw = JSON.parse(readFileSync(metaPath, 'utf-8')) as BridgeMeta;
      if (raw.sessionId === sessionId && isProcessAlive(raw.pid) && isSocketFile(raw.socketPath)) {
        bridges.set(sessionId, raw);
        return raw;
      }
    }
  } catch {
    // Fall through to spawn
  }

  return spawnBridge(sessionId, projectDir);
}

function killBridge(sessionId: string): void {
  const meta = bridges.get(sessionId);
  if (!meta) return;

  try {
    // Try process group kill
    try {
      process.kill(-meta.pid, 'SIGTERM');
    } catch {
      try {
        process.kill(meta.pid, 'SIGTERM');
      } catch {
        /* */
      }
    }

    // Escalate to SIGKILL after a brief delay
    setTimeout(() => {
      try {
        process.kill(-meta.pid, 'SIGKILL');
      } catch {
        try {
          process.kill(meta.pid, 'SIGKILL');
        } catch {
          /* */
        }
      }
    }, 2500);
  } catch {
    // Process already dead
  }

  safeUnlink(meta.socketPath);
  try {
    unlinkSync(getMetaPath(sessionId));
  } catch {
    /* */
  }
  bridges.delete(sessionId);
}

// ---------------------------------------------------------------------------
// Execution counter
// ---------------------------------------------------------------------------

const executionCounters = new Map<string, number>();

function nextExecutionCount(sessionId: string): number {
  const current = executionCounters.get(sessionId) || 0;
  const next = current + 1;
  executionCounters.set(sessionId, next);
  return next;
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function formatExecuteResult(result: ExecuteResult, sessionId: string, label?: string, count?: number): string {
  const lines: string[] = ['=== Python REPL Execution ===', `Session: ${sessionId}`];
  if (label) lines.push(`Label: ${label}`);
  if (count !== undefined) lines.push(`Execution #: ${count}`);
  lines.push('');

  if (result.stdout) {
    lines.push('--- Output ---', result.stdout.trimEnd(), '');
  }
  if (result.stderr) {
    lines.push('--- Errors ---', result.stderr.trimEnd(), '');
  }
  if (result.markers && result.markers.length > 0) {
    lines.push('--- Markers ---');
    for (const m of result.markers) {
      const sub = m.subtype ? `:${m.subtype}` : '';
      lines.push(`[${m.type}${sub}] ${m.content}`);
    }
    lines.push('');
  }
  if (result.timing) {
    const sec = (result.timing.duration_ms / 1000).toFixed(3);
    lines.push('--- Timing ---', `Duration: ${sec}s`, `Started: ${result.timing.started_at}`, '');
  }
  if (result.memory) {
    lines.push(
      '--- Memory ---',
      `RSS: ${result.memory.rss_mb.toFixed(1)} MB`,
      `VMS: ${result.memory.vms_mb.toFixed(1)} MB`,
      '',
    );
  }
  if (result.error) {
    lines.push('=== Execution Failed ===');
    lines.push(`Error Type: ${result.error.type}`, `Message: ${result.error.message}`);
    if (result.error.traceback) lines.push('', 'Traceback:', result.error.traceback);
    lines.push('');
  }

  lines.push(result.success ? '=== Execution Complete ===' : '=== Execution Failed ===');
  return lines.join('\n');
}

function formatStateResult(result: StateResult, sessionId: string): string {
  const lines = [
    '=== Python REPL State ===',
    `Session: ${sessionId}`,
    '',
    '--- Memory ---',
    `RSS: ${result.memory.rss_mb.toFixed(1)} MB`,
    `VMS: ${result.memory.vms_mb.toFixed(1)} MB`,
    '',
    '--- Variables ---',
    `Count: ${result.variable_count}`,
  ];
  if (result.variables.length > 0) {
    lines.push('');
    for (let i = 0; i < result.variables.length; i += 10) {
      lines.push(result.variables.slice(i, i + 10).join(', '));
    }
  } else {
    lines.push('(no user variables defined)');
  }
  lines.push('', '=== State Retrieved ===');
  return lines.join('\n');
}

function formatResetResult(result: ResetResult, sessionId: string): string {
  return [
    '=== Python REPL Reset ===',
    `Session: ${sessionId}`,
    `Status: ${result.status}`,
    '',
    '--- Memory After Reset ---',
    `RSS: ${result.memory.rss_mb.toFixed(1)} MB`,
    `VMS: ${result.memory.vms_mb.toFixed(1)} MB`,
    '',
    '=== Namespace Cleared ===',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function textResult(text: string, isError?: boolean) {
  return { content: [{ type: 'text' as const, text }], ...(isError ? { isError } : {}) };
}

// ---------------------------------------------------------------------------
// Action handlers
// ---------------------------------------------------------------------------

async function handleExecute(
  sessionId: string,
  socketPath: string,
  code: string,
  executionTimeout: number,
  executionLabel?: string,
): Promise<string> {
  const count = nextExecutionCount(sessionId);

  try {
    const result = await sendSocketRequest<ExecuteResult>(
      socketPath,
      'execute',
      { code, timeout: executionTimeout / 1000 },
      executionTimeout + 10_000,
    );
    return formatExecuteResult(result, sessionId, executionLabel, count);
  } catch (error) {
    if (error instanceof SocketConnectionError) throw error;

    if (error instanceof SocketTimeoutError) {
      return [
        '=== Execution Timeout ===',
        `Session: ${sessionId}`,
        '',
        `The code execution exceeded the timeout of ${executionTimeout / 1000} seconds.`,
        '',
        'The execution is still running in the background.',
        'Use the "interrupt" action to stop it.',
      ].join('\n');
    }

    if (error instanceof JsonRpcError) {
      return [
        '=== Execution Failed ===',
        `Session: ${sessionId}`,
        '',
        `Error Code: ${error.code}`,
        `Message: ${error.message}`,
        ...(error.data ? [`Data: ${JSON.stringify(error.data, null, 2)}`] : []),
      ].join('\n');
    }

    throw error;
  }
}

async function handleReset(sessionId: string, socketPath: string): Promise<string> {
  try {
    const result = await sendSocketRequest<ResetResult>(socketPath, 'reset', {}, 10_000);
    return formatResetResult(result, sessionId);
  } catch {
    killBridge(sessionId);
    return [
      '=== Bridge Restarted ===',
      `Session: ${sessionId}`,
      '',
      'The bridge was unresponsive and has been terminated.',
      'A new bridge will be spawned on the next request.',
      '',
      'Memory has been cleared.',
    ].join('\n');
  }
}

async function handleGetState(sessionId: string, socketPath: string): Promise<string> {
  try {
    const result = await sendSocketRequest<StateResult>(socketPath, 'get_state', {}, 5_000);
    return formatStateResult(result, sessionId);
  } catch (error) {
    if (error instanceof SocketConnectionError) throw error;

    if (error instanceof SocketTimeoutError) {
      return [
        '=== State Retrieval Timeout ===',
        `Session: ${sessionId}`,
        '',
        'Could not retrieve state within timeout.',
        'The bridge may be busy with a long-running execution.',
      ].join('\n');
    }

    throw error;
  }
}

async function handleInterrupt(sessionId: string, socketPath: string): Promise<string> {
  try {
    const result = await sendSocketRequest<InterruptResult>(socketPath, 'interrupt', {}, 5_000);
    return [
      '=== Python REPL Interrupt ===',
      `Session: ${sessionId}`,
      `Status: ${result.status || 'interrupted'}`,
      'Terminated By: graceful',
      '',
      '=== Execution Interrupted ===',
    ].join('\n');
  } catch {
    killBridge(sessionId);
    return [
      '=== Python REPL Interrupt ===',
      `Session: ${sessionId}`,
      'Status: force_killed',
      'Terminated By: SIGKILL',
      '',
      '=== Execution Interrupted ===',
    ].join('\n');
  }
}

// ---------------------------------------------------------------------------
// Main tool handler
// ---------------------------------------------------------------------------

async function pythonReplHandler(args: Record<string, unknown>): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}> {
  const action = args.action as string;
  const sessionId = (args.sessionId as string) || 'default';
  const code = args.code as string | undefined;
  const executionLabel = args.executionLabel as string | undefined;
  const executionTimeout = (args.executionTimeout as number) || DEFAULT_EXECUTION_TIMEOUT_MS;
  const projectDir = args.projectDir as string | undefined;

  // Validate action
  const validActions = ['execute', 'interrupt', 'reset', 'get_state'];
  if (!validActions.includes(action)) {
    return textResult(`Unknown action: ${action}\n\nValid actions: ${validActions.join(', ')}`, true);
  }

  // Validate execute requires code
  if (action === 'execute' && !code) {
    return textResult(
      'The "execute" action requires the "code" parameter.\n\n' +
        'Example:\n  action: "execute"\n  code: "print(\'Hello!\')"',
      true,
    );
  }

  // Acquire session lock
  const lock = new SessionLock(sessionId);
  try {
    await lock.acquire(30_000);
  } catch (error) {
    return textResult(
      `=== Session Busy ===\nSession: ${sessionId}\n\n` +
        `Could not acquire session lock: ${(error as Error).message}\n\n` +
        'Suggestions:\n  1. Wait and retry later\n  2. Use "interrupt" to stop current execution\n  3. Use "reset" to clear the session',
      true,
    );
  }

  try {
    // Ensure bridge is running
    let meta: BridgeMeta;
    try {
      meta = await ensureBridge(sessionId, projectDir);
    } catch (error) {
      return textResult(
        `=== Bridge Startup Failed ===\nSession: ${sessionId}\n\n` +
          `Error: ${(error as Error).message}\n\n` +
          'Ensure you have Python available:\n  python -m venv .venv',
        true,
      );
    }

    // Dispatch to action handler
    switch (action) {
      case 'execute': {
        try {
          const output = await handleExecute(sessionId, meta.socketPath, code!, executionTimeout, executionLabel);
          return textResult(output);
        } catch (error) {
          if (error instanceof SocketConnectionError) {
            // Try respawning once
            try {
              meta = await spawnBridge(sessionId, projectDir);
              const output = await handleExecute(sessionId, meta.socketPath, code!, executionTimeout, executionLabel);
              return textResult(output);
            } catch (retryError) {
              return textResult(
                `=== Connection Error ===\nSession: ${sessionId}\n\n` +
                  `Error: ${(retryError as Error).message}\n\n` +
                  'The bridge process may have crashed. Retry will auto-restart.',
                true,
              );
            }
          }
          return textResult(
            `=== Error ===\nSession: ${sessionId}\nAction: execute\n\n${(error as Error).message}`,
            true,
          );
        }
      }

      case 'reset': {
        const output = await handleReset(sessionId, meta.socketPath);
        return textResult(output);
      }

      case 'get_state': {
        try {
          const output = await handleGetState(sessionId, meta.socketPath);
          return textResult(output);
        } catch (error) {
          if (error instanceof SocketConnectionError) {
            return textResult(
              `=== Connection Error ===\nSession: ${sessionId}\n\n` + `Error: ${(error as Error).message}`,
              true,
            );
          }
          return textResult(
            `=== Error ===\nSession: ${sessionId}\nAction: get_state\n\n${(error as Error).message}`,
            true,
          );
        }
      }

      case 'interrupt': {
        const output = await handleInterrupt(sessionId, meta.socketPath);
        return textResult(output);
      }

      default:
        return textResult(`Unknown action: ${action}`, true);
    }
  } finally {
    await lock.release();
  }
}

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

const pythonReplTool: PythonReplToolDefinition = {
  name: 'python_repl',

  description:
    'Execute Python code in a persistent REPL environment. ' +
    'Variables and state persist between calls within the same session. ' +
    'Actions: execute (run code), interrupt (stop execution), reset (clear state), get_state (view memory/variables).',

  schema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['execute', 'interrupt', 'reset', 'get_state'],
        description:
          'Action to perform: execute (run Python code), interrupt (stop running code), ' +
          'reset (clear namespace), get_state (memory and variables)',
      },
      sessionId: {
        type: 'string',
        description: 'Unique identifier for the session (default: "default")',
      },
      code: {
        type: 'string',
        description: 'Python code to execute (required for "execute" action)',
      },
      executionLabel: {
        type: 'string',
        description: 'Human-readable label for this code execution',
      },
      executionTimeout: {
        type: 'number',
        description: 'Timeout for code execution in milliseconds (default: 300000 = 5 min)',
      },
      projectDir: {
        type: 'string',
        description: 'Project directory containing .venv/. Defaults to current working directory.',
      },
    },
    required: ['action'],
  },

  handler: pythonReplHandler,
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const pythonReplTools: PythonReplToolDefinition[] = [pythonReplTool];
