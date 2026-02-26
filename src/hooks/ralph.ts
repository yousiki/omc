/**
 * Ralph Hook - Self-referential persistence loop.
 *
 * When activated, ralph:
 *   1. Tracks iteration count
 *   2. Loads PRD (product requirements document) context if available
 *   3. Checks plan progress (via boulder state)
 *   4. Prevents stopping until work is complete (via persistent-mode integration)
 *   5. Supports architect verification cycles
 *
 * State is stored via mode-registry at `.omc/state/ralph-state.json`.
 */

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { HookOutput } from '../types';
import type { ModeState } from './mode-registry';
import { isModeActive, startMode, stopMode } from './mode-registry';
import { readJsonFile, writeJsonFile } from '../utils';
import { readBoulderState, getPlanProgress } from '../features/boulder-state';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RalphState extends ModeState {
  iteration: number;
  prdPath?: string;
  verificationPending?: boolean;
  metadata?: {
    prdName?: string;
    planPath?: string;
    [key: string]: unknown;
  };
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function statePath(directory: string): string {
  return join(directory, '.omc', 'state', 'ralph-state.json');
}

function plansDir(directory: string): string {
  return join(directory, '.omc', 'plans');
}

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------

/** Read ralph-specific state */
export function readRalphState(directory: string): RalphState | null {
  return readJsonFile<RalphState>(statePath(directory));
}

/** Write ralph-specific state */
export function writeRalphState(directory: string, state: RalphState): void {
  writeJsonFile(statePath(directory), state);
}

/** Increment the ralph iteration counter. Returns the new count. */
export function incrementRalphIteration(directory: string): number {
  const state = readRalphState(directory);
  if (!state || !state.active) {
    return 0;
  }
  state.iteration += 1;
  state.updatedAt = new Date().toISOString();
  writeRalphState(directory, state);
  return state.iteration;
}

/** Check if ralph is active */
export function isRalphActive(directory: string): boolean {
  return isModeActive('ralph', directory);
}

// ---------------------------------------------------------------------------
// Start / Stop
// ---------------------------------------------------------------------------

/** Start ralph mode */
export function startRalph(
  directory: string,
  sessionId?: string,
  prdPath?: string,
): boolean {
  const ok = startMode('ralph', directory, sessionId);
  if (!ok) {
    return false;
  }

  // Overwrite the generic ModeState with ralph-specific fields
  const now = new Date().toISOString();
  const state: RalphState = {
    active: true,
    startedAt: now,
    updatedAt: now,
    iteration: 1,
    ...(sessionId ? { sessionId } : {}),
    ...(prdPath ? { prdPath } : {}),
  };

  // Populate metadata from PRD / boulder if available
  const meta: RalphState['metadata'] = {};
  if (prdPath) {
    meta.prdName = prdPath;
  }
  const boulder = readBoulderState(directory);
  if (boulder?.active_plan) {
    meta.planPath = boulder.active_plan;
  }
  if (Object.keys(meta).length > 0) {
    state.metadata = meta;
  }

  writeRalphState(directory, state);
  return true;
}

/** Stop ralph mode */
export function stopRalph(directory: string): void {
  stopMode('ralph', directory);
}

// ---------------------------------------------------------------------------
// PRD loading
// ---------------------------------------------------------------------------

/**
 * Check for PRD file and return its contents.
 *
 * Resolution order:
 *   1. Explicit `prdPath` argument
 *   2. `prdPath` stored in ralph state
 *   3. Scan `.omc/plans/` for `*-prd.md` files (pick first match)
 */
export function loadPrd(directory: string, prdPath?: string): string | null {
  // 1. Explicit path
  if (prdPath && existsSync(prdPath)) {
    try {
      return readFileSync(prdPath, 'utf-8');
    } catch {
      // fall through
    }
  }

  // 2. Path from ralph state
  const state = readRalphState(directory);
  if (state?.prdPath && existsSync(state.prdPath)) {
    try {
      return readFileSync(state.prdPath, 'utf-8');
    } catch {
      // fall through
    }
  }

  // 3. Scan .omc/plans/ for *-prd.md
  const dir = plansDir(directory);
  if (existsSync(dir)) {
    try {
      const files = readdirSync(dir).filter((f) => f.endsWith('-prd.md'));
      if (files.length > 0) {
        const fullPath = join(dir, files[0]);
        return readFileSync(fullPath, 'utf-8');
      }
    } catch {
      // fall through
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Context generation
// ---------------------------------------------------------------------------

/**
 * Get ralph context for injection into prompts.
 *
 * Returns a `<ralph-context>` block containing:
 *   - Current iteration
 *   - PRD content (if available)
 *   - Plan progress from boulder state (if active)
 *
 * Returns `null` when ralph is not active.
 */
export function getRalphContext(directory: string): string | null {
  const state = readRalphState(directory);
  if (!state?.active) {
    return null;
  }

  const parts: string[] = [];

  // Iteration
  parts.push(`Ralph iteration: ${state.iteration}`);

  // PRD content
  const prd = loadPrd(directory);
  if (prd) {
    parts.push(prd);
  } else {
    parts.push('No PRD loaded.');
  }

  // Plan progress via boulder
  const boulder = readBoulderState(directory);
  if (boulder?.active_plan && boulder.active) {
    const progress = getPlanProgress(boulder.active_plan);
    if (progress.total > 0) {
      parts.push(`Plan: ${progress.completed}/${progress.total} tasks complete`);
    }
  }

  return `<ralph-context>\n${parts.join('\n')}\n</ralph-context>`;
}

// ---------------------------------------------------------------------------
// Stop event processing (called from persistent-mode)
// ---------------------------------------------------------------------------

/**
 * Process ralph stop event.
 *
 * If ralph is active, increments the iteration counter and returns a
 * continuation message with the Sisyphus prompt. If ralph is not active,
 * returns a pass-through output.
 */
export function processRalphStop(directory: string): HookOutput {
  const state = readRalphState(directory);
  if (!state?.active) {
    return { continue: true };
  }

  const iteration = incrementRalphIteration(directory);

  return {
    continue: true,
    message: `<system-reminder>
hook additional context: The boulder never stops. You are Sisyphus. The boulder must reach the top of the hill.
Ralph iteration: ${iteration}. Continue executing the plan. Do not stop until ALL tasks are verified complete.
</system-reminder>`,
  };
}
