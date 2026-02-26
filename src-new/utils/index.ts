import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync } from 'fs';
import { dirname, join } from 'path';

/** Resolve the git worktree root for a given directory */
export function resolveWorktreeRoot(cwd: string): string {
  try {
    return execSync('git rev-parse --show-toplevel', { cwd, encoding: 'utf-8' }).trim();
  } catch {
    return cwd;
  }
}

/** Safely read and parse a JSON file, returns null on failure */
export function readJsonFile<T = unknown>(path: string): T | null {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return null;
  }
}

/** Atomically write a JSON file (write to temp, then rename) */
export function writeJsonFile(path: string, data: unknown): void {
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const tmp = `${path}.tmp.${process.pid}`;
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  renameSync(tmp, path);
}

/** Execution mode names */
export const MODE_NAMES = {
  RALPH: 'ralph',
  AUTOPILOT: 'autopilot',
  ULTRAWORK: 'ultrawork',
  PIPELINE: 'pipeline',
  ULTRAQA: 'ultraqa',
  TDD: 'tdd',
} as const;

/** Read stdin with timeout protection (prevents hangs on Linux/Windows) */
export function readStdin(timeoutMs = 5000): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        process.stdin.removeAllListeners();
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    }, timeoutMs);

    process.stdin.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    process.stdin.on('end', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    });

    process.stdin.on('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve('');
      }
    });

    if (process.stdin.readableEnded) {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(Buffer.concat(chunks).toString('utf-8'));
      }
    }
  });
}
