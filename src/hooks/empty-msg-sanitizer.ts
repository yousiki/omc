/**
 * Empty Message Sanitizer Hook
 *
 * Sanitizes empty messages to prevent API errors. When a prompt is empty
 * or whitespace-only, replaces it with "Continue." to ensure a valid request.
 *
 * Port of src/hooks/empty-message-sanitizer/index.ts, radically slimmed
 * for the Bun-native rewrite. The old version handled complex message-part
 * structures; this version handles the simple UserPromptSubmit case where
 * the hook input has a `prompt` field.
 */

import type { HookInput, HookOutput } from '../types';

/** Default placeholder for empty prompts */
const PLACEHOLDER_TEXT = 'Continue.';

// ---------------------------------------------------------------------------
// Hook handler
// ---------------------------------------------------------------------------

/**
 * Process empty message sanitization for UserPromptSubmit.
 *
 * If the prompt is empty or whitespace-only, returns a modifiedInput
 * with a placeholder prompt to prevent API errors.
 */
export function processEmptyMsgSanitizer(input: HookInput): HookOutput {
  const prompt = input.prompt;

  if (!prompt || !prompt.trim()) {
    return {
      continue: true,
      modifiedInput: {
        prompt: PLACEHOLDER_TEXT,
      },
    };
  }

  // Prompt has content -- pass through
  return { continue: true };
}
