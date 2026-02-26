/**
 * Permission Handler Hook
 *
 * Auto-allows safe read-only commands to reduce permission friction.
 * Unsafe commands are passed through to Claude Code's normal permission system.
 */

import type { HookInput, HookOutput } from '../types';

/** Command prefixes that are safe to auto-allow (read-only / informational) */
const SAFE_COMMAND_PREFIXES = [
  'ls',
  'cat',
  'head',
  'tail',
  'wc',
  'file',
  'stat',
  'git status',
  'git log',
  'git diff',
  'git show',
  'git branch',
  'pwd',
  'echo',
  'which',
  'type',
  'env',
  'bun --version',
  'node --version',
  'npm --version',
  'tree',
] as const;

/**
 * Check whether a command starts with one of the safe prefixes.
 *
 * A prefix matches when the command equals the prefix exactly,
 * or the character immediately after the prefix is a space, tab, newline,
 * pipe, semicolon, or end-of-string. This prevents "cat" from matching
 * "catastrophe" while still matching "cat foo.txt".
 */
function isSafeCommand(command: string): boolean {
  const trimmed = command.trim();

  for (const prefix of SAFE_COMMAND_PREFIXES) {
    if (trimmed === prefix) return true;
    if (trimmed.startsWith(prefix)) {
      const next = trimmed[prefix.length];
      // Only match if the prefix is followed by whitespace or end-of-command
      if (next === ' ' || next === '\t') return true;
    }
  }

  return false;
}

/**
 * Process a permission request.
 *
 * - If tool is Bash and command is safe: auto-allow
 * - Otherwise: pass through (let Claude Code handle it)
 */
export function processPermissionRequest(input: HookInput): HookOutput {
  // Only handle Bash tool -- strip proxy_ prefix if present
  const toolName = (input.toolName ?? '').replace(/^proxy_/, '');
  if (toolName !== 'Bash') {
    return { continue: true };
  }

  // Extract command from tool input
  const toolInput = input.toolInput as { command?: string } | undefined;
  const command = toolInput?.command;

  if (!command || typeof command !== 'string') {
    return { continue: true };
  }

  if (isSafeCommand(command)) {
    return { continue: true };
  }

  // Not safe -- let Claude Code's normal permission flow handle it
  return { continue: true };
}
