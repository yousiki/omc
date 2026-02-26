/**
 * Persistent Mode Hook
 *
 * Unified Stop handler that prevents premature stopping when work remains.
 * Checks active execution modes in priority order and injects continuation
 * messages via soft enforcement (always returns `continue: true`).
 *
 * Priority order:
 *   1. Never block context-limit / rate-limit stops (deadlock prevention)
 *   2. Never block user abort / explicit cancel
 *   3. Ralph  -- boulder/Sisyphus continuation
 *   4. Ultrawork -- ultrawork continuation
 *   5. Autopilot -- autopilot continuation
 *   6. Todo-continuation -- incomplete tasks
 *   7. Skill-state -- active skill protection
 */

import type { HookInput, HookOutput } from '../types';
import { isModeActive } from './mode-registry';
import type { ExecutionMode } from './mode-registry';
import { processRalphStop } from './ralph';
import { processAutopilotStop } from './autopilot';
import { checkIncompleteTodos } from './todo-continuation';
import { checkSkillActiveState } from './skill-state';

// ---------------------------------------------------------------------------
// Stop-type detectors
// ---------------------------------------------------------------------------

function isContextLimitStop(input: HookInput): boolean {
  return input.stopReason === 'context_limit';
}

function isRateLimitStop(input: HookInput): boolean {
  return input.stopReason === 'rate_limit';
}

function isUserAbort(input: HookInput): boolean {
  return input.userRequested === true;
}

function isExplicitCancel(input: HookInput): boolean {
  const prompt = input.prompt ?? '';
  return /\b(cancelomc|stopomc)\b/i.test(prompt) || /\/oh-my-claudecode:cancel\b/.test(prompt);
}

// ---------------------------------------------------------------------------
// Continuation message builders
// ---------------------------------------------------------------------------

function modeContinuationMessage(mode: ExecutionMode): string {
  return `<system-reminder>
hook additional context: [MAGIC KEYWORD: ${mode.toUpperCase()}] The boulder never stops. Continue working on the active plan.
</system-reminder>`;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Check all persistent modes and return a HookOutput.
 *
 * Always returns `continue: true`. When a mode is active and the stop is not
 * a special case (context-limit, rate-limit, user abort, cancel), a
 * continuation message is injected to keep the agent working.
 */
export function checkPersistentModes(input: HookInput, directory: string): HookOutput {
  // 1. Never block context-limit or rate-limit stops
  if (isContextLimitStop(input) || isRateLimitStop(input)) {
    return { continue: true };
  }

  // 2. Never block user abort or explicit cancel
  if (isUserAbort(input) || isExplicitCancel(input)) {
    return { continue: true };
  }

  // 3. Ralph
  if (isModeActive('ralph', directory)) {
    return processRalphStop(directory);
  }

  // 4. Ultrawork
  if (isModeActive('ultrawork', directory)) {
    return {
      continue: true,
      message: modeContinuationMessage('ultrawork'),
    };
  }

  // 5. Autopilot
  if (isModeActive('autopilot', directory)) {
    return processAutopilotStop(directory);
  }

  // 6. Todo-continuation
  const todoResult = checkIncompleteTodos(input, directory);
  if (todoResult.message) {
    return todoResult;
  }

  // 7. Skill-state
  const skillResult = checkSkillActiveState(directory);
  if (skillResult.message) {
    return skillResult;
  }

  // Nothing active -- allow stop with no injected message
  return { continue: true };
}
