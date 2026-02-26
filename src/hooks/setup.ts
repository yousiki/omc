/**
 * Setup Hook
 *
 * Initializes OMC directories and prunes stale state on session start.
 * No team/notification setup, no SQLite -- just directory creation
 * and stale state cleanup.
 */

import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { HookInput, HookOutput } from '../types';
import { readJsonFile, writeJsonFile } from '../utils';

/** Directories that must exist under the project root */
const REQUIRED_DIRS = ['.omc/state', '.omc/plans', '.omc/logs', '.omc/research'] as const;

/** How long before an active state file is considered stale (1 hour) */
const STALE_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Shape of a state file in .omc/state/
 */
interface StateFile {
  active?: boolean;
  updatedAt?: string | number;
  name?: string;
  [key: string]: unknown;
}

/**
 * Ensure all required directories exist.
 * @returns list of directories that were newly created
 */
function ensureDirectories(directory: string): string[] {
  const created: string[] = [];
  for (const rel of REQUIRED_DIRS) {
    const full = join(directory, rel);
    if (!existsSync(full)) {
      try {
        mkdirSync(full, { recursive: true });
        created.push(rel);
      } catch {
        // Best effort -- skip on failure
      }
    }
  }
  return created;
}

/**
 * Prune stale state files in .omc/state/.
 *
 * A state file (*-state.json) is considered stale when:
 *   active === true  AND  updatedAt is older than 1 hour
 *
 * Stale files are set to active: false.
 *
 * @returns object with pruned file names and any remaining active mode names
 */
function pruneStaleState(directory: string): { pruned: string[]; activeModes: string[] } {
  const stateDir = join(directory, '.omc', 'state');
  if (!existsSync(stateDir)) return { pruned: [], activeModes: [] };

  const pruned: string[] = [];
  const activeModes: string[] = [];
  const now = Date.now();

  let files: string[];
  try {
    files = readdirSync(stateDir);
  } catch {
    return { pruned: [], activeModes: [] };
  }

  for (const file of files) {
    if (!file.endsWith('-state.json')) continue;

    const filePath = join(stateDir, file);
    try {
      const stats = statSync(filePath);
      if (stats.isDirectory()) continue;
    } catch {
      continue;
    }

    const state = readJsonFile<StateFile>(filePath);
    if (!state || state.active !== true) continue;

    // Determine last update time
    let lastUpdate: number;
    if (state.updatedAt) {
      lastUpdate = typeof state.updatedAt === 'number' ? state.updatedAt : new Date(state.updatedAt).getTime();
      if (Number.isNaN(lastUpdate)) {
        try {
          lastUpdate = statSync(filePath).mtimeMs;
        } catch {
          continue;
        }
      }
    } else {
      try {
        lastUpdate = statSync(filePath).mtimeMs;
      } catch {
        continue;
      }
    }

    if (now - lastUpdate > STALE_THRESHOLD_MS) {
      // Stale -- mark inactive
      try {
        writeJsonFile(filePath, { ...state, active: false });
        pruned.push(file);
      } catch {
        // Best effort
      }
    } else {
      // Still active
      const modeName = state.name ?? file.replace(/-state\.json$/, '');
      activeModes.push(modeName);
    }
  }

  return { pruned, activeModes };
}

/**
 * Process setup hook.
 *
 * 1. Ensure required directories exist
 * 2. Prune stale state files
 * 3. Return context message listing active modes (if any)
 */
export function processSetup(_input: HookInput, directory: string): HookOutput {
  // 1. Ensure directories
  const created = ensureDirectories(directory);

  // 2. Prune stale state
  const { pruned, activeModes } = pruneStaleState(directory);

  // 3. Build optional context message
  const parts: string[] = [];

  if (created.length > 0) {
    parts.push(`Created directories: ${created.join(', ')}`);
  }
  if (pruned.length > 0) {
    parts.push(`Pruned stale state: ${pruned.join(', ')}`);
  }
  if (activeModes.length > 0) {
    parts.push(`Active modes: ${activeModes.join(', ')}`);
  }

  if (parts.length > 0) {
    return { continue: true, message: `OMC setup: ${parts.join('; ')}` };
  }

  return { continue: true };
}
