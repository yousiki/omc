/**
 * Thinking Block Validator Hook
 *
 * Validates tool responses for malformed thinking blocks that could confuse
 * the Anthropic API. If a tool response starts with <thinking> or contains
 * malformed thinking tags, sanitizes them to prevent API errors.
 *
 * Port of src/hooks/thinking-block-validator/index.ts, slimmed for the
 * Bun-native rewrite. The old version handled complex message-transform
 * hooks; this version handles the PostToolUse / SubagentStop case where
 * the hook input has a `toolOutput` field.
 */

import type { HookInput, HookOutput } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Patterns that indicate a thinking block in tool output */
const THINKING_OPEN_PATTERN = /^\s*<thinking>/i;
const THINKING_TAG_PATTERN = /<\/?thinking>/gi;
const MALFORMED_THINKING_PATTERN = /<thinking>[\s\S]*?(?:<\/thinking>|$)/gi;

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Check if a string contains thinking-block markers that could confuse the API.
 */
function hasThinkingMarkers(text: string): boolean {
  return THINKING_OPEN_PATTERN.test(text) || THINKING_TAG_PATTERN.test(text);
}

/**
 * Sanitize thinking blocks from a string.
 * Removes <thinking>...</thinking> blocks and standalone tags.
 */
function sanitizeThinkingBlocks(text: string): string {
  // First remove complete thinking blocks (including content)
  let result = text.replace(MALFORMED_THINKING_PATTERN, '');
  // Then remove any remaining standalone tags
  result = result.replace(THINKING_TAG_PATTERN, '');
  return result.trim();
}

// ---------------------------------------------------------------------------
// Hook handler
// ---------------------------------------------------------------------------

/**
 * Process thinking block validation for PostToolUse / SubagentStop.
 *
 * Checks if the tool response contains thinking blocks that might confuse
 * the API. If found, sanitizes them out of the output.
 */
export function processThinkingValidator(input: HookInput): HookOutput {
  const toolOutput = input.toolOutput;

  // Only process string tool outputs
  if (typeof toolOutput !== 'string' || !toolOutput) {
    return { continue: true };
  }

  if (!hasThinkingMarkers(toolOutput)) {
    return { continue: true };
  }

  // Sanitize thinking blocks from the output
  const sanitized = sanitizeThinkingBlocks(toolOutput);

  if (sanitized === toolOutput) {
    // No actual change after sanitization
    return { continue: true };
  }

  return {
    continue: true,
    suppressOutput: true,
    message: sanitized || '[Tool output contained only thinking blocks and was sanitized]',
  };
}
