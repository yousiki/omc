/**
 * Autopilot Hook
 *
 * Multi-phase orchestration mode that guides autonomous execution
 * from idea to working code through: expansion -> planning -> execution -> qa -> validation -> complete.
 *
 * Simplified from old src/hooks/autopilot/ (types.ts, state.ts, prompts.ts, enforcement.ts)
 * into a single focused module. No team/notification/codex/gemini dependencies.
 */

import { join } from 'path';
import { readJsonFile, writeJsonFile } from '../utils';
import type { HookOutput } from '../types';
import type { ModeState } from './mode-registry';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AutopilotPhase = 'expansion' | 'planning' | 'execution' | 'qa' | 'validation' | 'complete';

export interface AutopilotState extends ModeState {
  phase: AutopilotPhase;
  iteration: number;
  planPath?: string;
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function stateFilePath(directory: string): string {
  return join(directory, '.omc', 'state', 'autopilot-state.json');
}

// ---------------------------------------------------------------------------
// Phase guidance
// ---------------------------------------------------------------------------

const PHASE_GUIDANCE: Record<AutopilotPhase, string> = {
  expansion: 'Gather requirements, explore the codebase, understand the full scope.',
  planning: 'Create a detailed implementation plan. Break work into tasks.',
  execution: 'Execute the plan. Delegate to specialized agents.',
  qa: 'Run tests, verify all requirements are met.',
  validation: 'Final verification. Ensure nothing is broken.',
  complete: 'All work is done.',
};

// ---------------------------------------------------------------------------
// State read/write
// ---------------------------------------------------------------------------

export function readAutopilotState(directory: string): AutopilotState | null {
  return readJsonFile<AutopilotState>(stateFilePath(directory));
}

export function writeAutopilotState(directory: string, state: AutopilotState): void {
  writeJsonFile(stateFilePath(directory), state);
}

// ---------------------------------------------------------------------------
// Active check
// ---------------------------------------------------------------------------

export function isAutopilotActive(directory: string): boolean {
  const state = readAutopilotState(directory);
  return state?.active === true;
}

// ---------------------------------------------------------------------------
// Start / Stop
// ---------------------------------------------------------------------------

export function startAutopilot(directory: string, sessionId?: string): boolean {
  const existing = readAutopilotState(directory);
  if (existing?.active) return false;

  const now = new Date().toISOString();
  const state: AutopilotState = {
    active: true,
    startedAt: now,
    updatedAt: now,
    phase: 'expansion',
    iteration: 0,
    ...(sessionId ? { sessionId } : {}),
  };
  writeAutopilotState(directory, state);
  return true;
}

export function stopAutopilot(directory: string): void {
  const existing = readAutopilotState(directory);
  const now = new Date().toISOString();
  const state: AutopilotState = {
    active: false,
    startedAt: existing?.startedAt ?? now,
    updatedAt: now,
    phase: existing?.phase ?? 'complete',
    iteration: existing?.iteration ?? 0,
    sessionId: existing?.sessionId,
    planPath: existing?.planPath,
  };
  writeAutopilotState(directory, state);
}

// ---------------------------------------------------------------------------
// Phase transition
// ---------------------------------------------------------------------------

export function transitionPhase(directory: string, newPhase: AutopilotPhase): void {
  const state = readAutopilotState(directory);
  if (!state || !state.active) return;

  state.phase = newPhase;
  state.updatedAt = new Date().toISOString();

  if (newPhase === 'complete') {
    state.active = false;
  }

  writeAutopilotState(directory, state);
}

// ---------------------------------------------------------------------------
// Context generation
// ---------------------------------------------------------------------------

export function getAutopilotContext(directory: string): string | null {
  const state = readAutopilotState(directory);
  if (!state?.active) return null;

  const guidance = PHASE_GUIDANCE[state.phase] ?? '';

  return `<autopilot-context>
Phase: ${state.phase} | Iteration: ${state.iteration}
${guidance}
</autopilot-context>`;
}

// ---------------------------------------------------------------------------
// Stop hook processing
// ---------------------------------------------------------------------------

export function processAutopilotStop(directory: string): HookOutput {
  const state = readAutopilotState(directory);

  if (!state?.active) {
    return { continue: true };
  }

  // If complete, allow stop
  if (state.phase === 'complete') {
    return { continue: true };
  }

  // Increment iteration
  state.iteration += 1;
  state.updatedAt = new Date().toISOString();
  writeAutopilotState(directory, state);

  const context = getAutopilotContext(directory) ?? '';

  return {
    continue: true,
    message: `<system-reminder>
hook additional context: [MAGIC KEYWORD: AUTOPILOT] The autopilot is still running. Continue working.
${context}
</system-reminder>`,
  };
}
