/**
 * Mode Registry - Centralized mode state detection and mutual exclusion.
 *
 * Simplified from the old src/ implementation:
 * - No SQLite, no marker files, no session-scoped variants
 * - Pure JSON file-based state in `.omc/state/{mode}-state.json`
 * - 6 modes kept (removed team/swarm/ultrapilot)
 */

import { join } from 'path';
import { readJsonFile, writeJsonFile } from '../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ExecutionMode = 'ralph' | 'autopilot' | 'ultrawork' | 'pipeline' | 'ultraqa' | 'tdd';

export interface ModeState {
  active: boolean;
  startedAt: string;   // ISO timestamp
  sessionId?: string;
  updatedAt: string;    // ISO timestamp
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All known execution modes */
const ALL_MODES: ExecutionMode[] = ['ralph', 'autopilot', 'ultrawork', 'pipeline', 'ultraqa', 'tdd'];

/** Modes that cannot be active simultaneously */
const EXCLUSIVE_MODES: ExecutionMode[] = ['autopilot', 'pipeline'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stateFilePath(mode: ExecutionMode, directory: string): string {
  return join(directory, '.omc', 'state', `${mode}-state.json`);
}

function readState(mode: ExecutionMode, directory: string): ModeState | null {
  return readJsonFile<ModeState>(stateFilePath(mode, directory));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Check if a mode is currently active */
export function isModeActive(mode: ExecutionMode, directory: string): boolean {
  const state = readState(mode, directory);
  return state?.active === true;
}

/** Check if a mode can be started (mutual exclusion for exclusive modes) */
export function canStartMode(
  mode: ExecutionMode,
  directory: string,
): { allowed: boolean; reason?: string } {
  if (EXCLUSIVE_MODES.includes(mode)) {
    for (const other of EXCLUSIVE_MODES) {
      if (other !== mode && isModeActive(other, directory)) {
        return {
          allowed: false,
          reason: `Cannot start ${mode} while ${other} is active. Cancel ${other} first.`,
        };
      }
    }
  }
  return { allowed: true };
}

/** Start a mode -- writes state file after checking mutual exclusion */
export function startMode(
  mode: ExecutionMode,
  directory: string,
  sessionId?: string,
): boolean {
  const check = canStartMode(mode, directory);
  if (!check.allowed) {
    return false;
  }

  const now = new Date().toISOString();
  const state: ModeState = {
    active: true,
    startedAt: now,
    updatedAt: now,
    ...(sessionId ? { sessionId } : {}),
  };
  writeJsonFile(stateFilePath(mode, directory), state);
  return true;
}

/** Stop a mode -- marks state as inactive */
export function stopMode(mode: ExecutionMode, directory: string): void {
  const existing = readState(mode, directory);
  const now = new Date().toISOString();
  const state: ModeState = {
    active: false,
    startedAt: existing?.startedAt ?? now,
    updatedAt: now,
    sessionId: existing?.sessionId,
    metadata: existing?.metadata,
  };
  writeJsonFile(stateFilePath(mode, directory), state);
}

/** Get all currently active modes */
export function getActiveModes(directory: string): ExecutionMode[] {
  return ALL_MODES.filter((m) => isModeActive(m, directory));
}
