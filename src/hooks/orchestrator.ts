/**
 * Orchestrator pre/post tool-use hooks.
 *
 * Enforces delegation (orchestrator should not write source files directly)
 * and enriches post-tool context (remember tags, boulder progress).
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, normalize, relative } from 'node:path';
import { getPlanProgress, readBoulderState } from '../features/boulder-state';
import type { HookInput, HookOutput } from '../types';
import { resolveWorktreeRoot } from '../utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Paths the orchestrator IS allowed to write directly (tested against forward-slash normalized relative paths). */
const ALLOWED_PATH_PATTERNS: RegExp[] = [
  /^\.?\/?(\.omc)\//,
  /^\.?\/?(\.claude)\//,
  /^\.?\/?CLAUDE\.md$|\/CLAUDE\.md$/,
  /^\.?\/?AGENTS\.md$|\/AGENTS\.md$/,
  /^\.?\/?\.mcp\.json$/,
];

/** Source file extensions that trigger the delegation reminder. */
const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.c',
  '.cpp',
  '.svelte',
  '.vue',
  '.rb',
  '.php',
  '.swift',
  '.kt',
  '.scala',
  '.sh',
  '.bash',
]);

/** Tools that perform file writes. */
const WRITE_EDIT_TOOLS = new Set(['Write', 'Edit', 'write', 'edit']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalise any path to forward slashes. */
function toFwd(p: string): string {
  return p.replace(/\\/g, '/');
}

/** Check whether a file path is in the allowed-write set. */
function isAllowedPath(filePath: string, directory?: string): boolean {
  if (!filePath) return true;

  const normalized = toFwd(normalize(toFwd(filePath)));

  // Reject explicit traversal that escapes
  if (normalized.startsWith('../') || normalized === '..') return false;

  // Fast path: check relative patterns
  if (ALLOWED_PATH_PATTERNS.some((p) => p.test(normalized))) return true;

  // Absolute path: strip worktree root, then re-check
  if (isAbsolute(filePath) && directory) {
    const root = resolveWorktreeRoot(directory);
    const rel = toFwd(relative(root, filePath));
    if (rel.startsWith('../') || rel === '..' || isAbsolute(rel)) return false;
    return ALLOWED_PATH_PATTERNS.some((p) => p.test(rel));
  }

  return false;
}

/** Check whether a file extension is a source extension. */
function isSourceExtension(filePath: string): boolean {
  return SOURCE_EXTENSIONS.has(extname(filePath).toLowerCase());
}

/** Extract file_path from toolInput (handles various key names). */
function extractFilePath(toolInput: unknown): string | undefined {
  if (!toolInput || typeof toolInput !== 'object') return undefined;
  const t = toolInput as Record<string, unknown>;
  const raw = t.file_path ?? t.filePath ?? t.path ?? t.file ?? t.notebook_path;
  return typeof raw === 'string' ? raw : undefined;
}

// ---------------------------------------------------------------------------
// Remember tags
// ---------------------------------------------------------------------------

/**
 * Process `<remember>` and `<remember priority>` tags from tool output.
 * Writes entries into `.omc/notepad.md`.
 */
function processRememberTags(output: string, directory: string): void {
  try {
    const notepadPath = join(directory, '.omc', 'notepad.md');
    const omcDir = dirname(notepadPath);

    // Collect all tags first
    const priorityTags: string[] = [];
    const regularTags: string[] = [];

    for (const match of output.matchAll(/<remember\s+priority>([\s\S]*?)<\/remember>/gi)) {
      const content = match[1].trim();
      if (content) priorityTags.push(content);
    }
    for (const match of output.matchAll(/<remember>([\s\S]*?)<\/remember>/gi)) {
      const content = match[1].trim();
      if (content) regularTags.push(content);
    }

    if (priorityTags.length === 0 && regularTags.length === 0) return;

    // Single read
    ensureNotepad(omcDir, notepadPath);
    let doc = readFileSync(notepadPath, 'utf-8');

    // Apply priority tags (last one wins — overwrites the section)
    if (priorityTags.length > 0) {
      const combined = priorityTags.join('\n');
      doc = doc.replace(/(## Priority Context\n(?:<!--[\s\S]*?-->\n)?)[\s\S]*?(?=\n## )/, `$1${combined}\n`);
    }

    // Append regular tags before MANUAL section
    if (regularTags.length > 0) {
      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const entries = regularTags.map((c) => `\n### ${timestamp}\n${c}\n`).join('');
      const manualIdx = doc.indexOf('## MANUAL');
      if (manualIdx !== -1) {
        doc = `${doc.slice(0, manualIdx) + entries}\n${doc.slice(manualIdx)}`;
      } else {
        doc += entries;
      }
    }

    // Single write
    writeFileSync(notepadPath, doc, 'utf-8');
  } catch {
    // Never crash on malformed tags
  }
}

function ensureNotepad(omcDir: string, notepadPath: string): void {
  if (!existsSync(omcDir)) mkdirSync(omcDir, { recursive: true });
  if (!existsSync(notepadPath)) {
    writeFileSync(
      notepadPath,
      `# Notepad\n<!-- Auto-managed by OMC. -->\n\n## Priority Context\n<!-- Critical discoveries only. -->\n\n## Working Memory\n<!-- Session notes. -->\n\n## MANUAL\n<!-- User content. -->\n`,
      'utf-8',
    );
  }
}

// ---------------------------------------------------------------------------
// Audit logging
// ---------------------------------------------------------------------------

function logAudit(directory: string, entry: Record<string, unknown>): void {
  try {
    const logDir = join(directory, '.omc', 'logs');
    if (!existsSync(logDir)) mkdirSync(logDir, { recursive: true });
    const logPath = join(logDir, 'orchestrator-audit.jsonl');
    appendFileSync(logPath, `${JSON.stringify({ ...entry, timestamp: new Date().toISOString() })}\n`);
  } catch {
    // Audit logging must never break the hook
  }
}

// ---------------------------------------------------------------------------
// Pre-tool-use handler
// ---------------------------------------------------------------------------

export function processPreTool(input: HookInput): HookOutput {
  // Subagents skip delegation enforcement
  if (input.parentSessionId) {
    return { continue: true };
  }

  const toolName = input.toolName ?? '';
  const directory = input.directory ?? process.cwd();

  // Only check write/edit tools
  if (!WRITE_EDIT_TOOLS.has(toolName)) {
    return { continue: true };
  }

  const filePath = extractFilePath(input.toolInput);

  // No file path or path is allowed -- pass through
  if (!filePath || isAllowedPath(filePath, directory)) {
    if (filePath) {
      logAudit(directory, { tool: toolName, filePath, decision: 'allowed' });
    }
    return { continue: true };
  }

  // Source file → delegation reminder
  if (isSourceExtension(filePath)) {
    logAudit(directory, { tool: toolName, filePath, decision: 'warned', reason: 'source_file' });

    return {
      continue: true,
      message: [
        '<delegation-reminder>',
        'You are the orchestrator. Delegate source file edits to an executor or specialist agent.',
        'Use Task(subagent_type="oh-my-claudecode:executor") for implementation work.',
        `Direct file: ${filePath}`,
        '</delegation-reminder>',
      ].join('\n'),
    };
  }

  // Non-source, non-allowed -- still let it through (only source files get the reminder)
  logAudit(directory, { tool: toolName, filePath, decision: 'allowed', reason: 'non_source' });
  return { continue: true };
}

// ---------------------------------------------------------------------------
// Post-tool-use handler
// ---------------------------------------------------------------------------

export function processPostTool(input: HookInput): HookOutput {
  // Subagents skip enrichment
  if (input.parentSessionId) {
    return { continue: true };
  }

  const toolName = input.toolName ?? '';
  const directory = input.directory ?? process.cwd();
  const toolOutput = typeof input.toolOutput === 'string' ? input.toolOutput : '';

  // --- Remember tag processing (on any tool with output) ---
  if (toolOutput) {
    processRememberTags(toolOutput, directory);
  }

  // --- Boulder progress reminder after Task/delegation calls ---
  if (toolName === 'Task' || toolName === 'task') {
    const boulder = readBoulderState(directory);
    if (boulder && boulder.active !== false) {
      const progress = getPlanProgress(boulder.active_plan);
      if (progress.total > 0) {
        return {
          continue: true,
          message: `Plan progress: ${progress.completed}/${progress.total} tasks complete. Continue with the plan.`,
        };
      }
    }
    return { continue: true };
  }

  // --- Brief note after Write/Edit ---
  if (WRITE_EDIT_TOOLS.has(toolName)) {
    const filePath = extractFilePath(input.toolInput);
    if (filePath) {
      logAudit(directory, { tool: toolName, filePath, event: 'post-write' });
    }
  }

  return { continue: true };
}
