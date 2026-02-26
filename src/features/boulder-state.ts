/**
 * Boulder State - Canonical module for plan persistence and continuation enforcement.
 *
 * Manages the "boulder" metaphor: an active plan that the agent must continue
 * pushing until all tasks are complete (like Sisyphus).
 *
 * This is THE canonical module. Other files should import from here rather than
 * maintaining inline duplicates.
 */

import { existsSync, readFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, basename } from 'path';
import { readJsonFile, writeJsonFile } from '../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BoulderState {
  /** Absolute path to the active plan file */
  active_plan: string;
  /** ISO timestamp when work started */
  started_at: string;
  /** Session IDs that have worked on this plan */
  session_ids: string[];
  /** Plan name derived from filename */
  plan_name: string;
  /** Whether this boulder is currently active */
  active: boolean;
  /** ISO timestamp of last state update (for stale detection) */
  updatedAt: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface PlanProgress {
  /** Total number of checkboxes */
  total: number;
  /** Number of completed checkboxes */
  completed: number;
  /** Whether all tasks are done */
  isComplete: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** OMC state directory */
export const BOULDER_DIR = '.omc';

/** Boulder state file name */
export const BOULDER_FILE = 'boulder.json';

/** Planner plan directory (relative to project root) */
export const PLANNER_PLANS_DIR = '.omc/plans';

/** The Sisyphus continuation prompt */
export const CONTINUATION_PROMPT =
  'The boulder never stops. You are Sisyphus. The boulder must reach the top of the hill.\n' +
  'You have an active plan. Do not stop. Do not pass go. Continue executing the plan until ALL tasks are verified complete.';

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

/** Get the full path to the boulder state file */
function getBoulderFilePath(directory: string): string {
  return join(directory, BOULDER_DIR, BOULDER_FILE);
}

/** Read boulder state from .omc/boulder.json */
export function readBoulderState(directory: string): BoulderState | null {
  return readJsonFile<BoulderState>(getBoulderFilePath(directory));
}

/** Write boulder state */
export function writeBoulderState(directory: string, state: BoulderState): void {
  writeJsonFile(getBoulderFilePath(directory), state);
}

/** Clear boulder state (remove the file) */
export function clearBoulderState(directory: string): void {
  const filePath = getBoulderFilePath(directory);
  try {
    unlinkSync(filePath);
  } catch (error) {
    // ENOENT is fine -- file already gone
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Plan progress
// ---------------------------------------------------------------------------

/** Get plan progress by counting markdown checkboxes */
export function getPlanProgress(planPath: string): PlanProgress {
  if (!existsSync(planPath)) {
    return { total: 0, completed: 0, isComplete: true };
  }

  try {
    const content = readFileSync(planPath, 'utf-8');

    // Match markdown checkboxes: - [ ] or * [ ] (unchecked) and - [x]/- [X] or * [x]/[X] (checked)
    const uncheckedMatches = content.match(/^[-*]\s*\[\s*\]/gm) || [];
    const checkedMatches = content.match(/^[-*]\s*\[[xX]\]/gm) || [];

    const total = uncheckedMatches.length + checkedMatches.length;
    const completed = checkedMatches.length;

    return {
      total,
      completed,
      isComplete: completed === total && total > 0,
    };
  } catch {
    return { total: 0, completed: 0, isComplete: true };
  }
}

// ---------------------------------------------------------------------------
// Session tracking
// ---------------------------------------------------------------------------

/** Append a session ID to the boulder state */
export function appendSessionId(directory: string, sessionId: string): void {
  const state = readBoulderState(directory);
  if (!state) return;

  if (!state.session_ids.includes(sessionId)) {
    state.session_ids.push(sessionId);
    state.updatedAt = new Date().toISOString();
    writeBoulderState(directory, state);
  }
}

// ---------------------------------------------------------------------------
// Plan discovery
// ---------------------------------------------------------------------------

/** Find plan files in .omc/plans/, sorted by modification time (newest first) */
export function findPlannerPlans(directory: string): string[] {
  const dir = join(directory, PLANNER_PLANS_DIR);

  if (!existsSync(dir)) {
    return [];
  }

  try {
    const files = readdirSync(dir);
    return files
      .filter((f) => f.endsWith('.md'))
      .map((f) => join(dir, f))
      .sort((a, b) => {
        const aStat = statSync(a);
        const bStat = statSync(b);
        return bStat.mtimeMs - aStat.mtimeMs;
      });
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Continuation check
// ---------------------------------------------------------------------------

/** Check if there's active work that should continue */
export function checkBoulderContinuation(directory: string): {
  shouldContinue: boolean;
  message?: string;
} {
  const state = readBoulderState(directory);

  if (!state || !state.active) {
    return { shouldContinue: false };
  }

  const progress = getPlanProgress(state.active_plan);

  if (progress.isComplete) {
    return { shouldContinue: false };
  }

  return {
    shouldContinue: true,
    message: `Plan progress: ${progress.completed}/${progress.total} tasks complete. Continue with the plan.`,
  };
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/** Extract plan name from file path */
export function getPlanName(planPath: string): string {
  return basename(planPath, '.md');
}

/** Create a new boulder state for a plan */
export function createBoulderState(planPath: string, sessionId: string): BoulderState {
  const now = new Date().toISOString();
  return {
    active_plan: planPath,
    started_at: now,
    session_ids: [sessionId],
    plan_name: getPlanName(planPath),
    active: true,
    updatedAt: now,
  };
}
