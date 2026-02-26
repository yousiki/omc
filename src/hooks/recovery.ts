/**
 * Context Window Recovery Hook
 *
 * Called on PreCompact or session-start to detect stale state
 * from crashed sessions and provide recovery context.
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { HookInput, HookOutput } from '../types';
import { readJsonFile, writeJsonFile } from '../utils';

/** How long before an active state file is considered stale (1 hour) */
const STALE_THRESHOLD_MS = 60 * 60 * 1000;

/**
 * Shape of a state file in .omc/state/
 */
interface StateFile {
  active?: boolean;
  updatedAt?: string | number;
  [key: string]: unknown;
}

/**
 * Mark stale state files as inactive.
 * A state file is stale if active === true but updatedAt is older than 1 hour.
 *
 * @returns list of filenames that were marked stale
 */
function markStaleStateFiles(stateDir: string): string[] {
  if (!existsSync(stateDir)) return [];

  const staleFiles: string[] = [];
  const now = Date.now();

  let files: string[];
  try {
    files = readdirSync(stateDir);
  } catch {
    return [];
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

    // Determine last update time: prefer updatedAt field, fall back to file mtime
    let lastUpdate: number;
    if (state.updatedAt) {
      lastUpdate =
        typeof state.updatedAt === 'number'
          ? state.updatedAt
          : new Date(state.updatedAt).getTime();
      if (isNaN(lastUpdate)) {
        // Invalid date string, fall back to file mtime
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
      try {
        writeJsonFile(filePath, { ...state, active: false });
        staleFiles.push(file);
      } catch {
        // Best effort -- skip on write failure
      }
    }
  }

  return staleFiles;
}

/**
 * Process recovery hook.
 *
 * - On PreCompact: return a reminder about active work context
 * - Always: check for stale state files from crashed sessions
 */
export function processRecovery(input: HookInput, directory: string): HookOutput {
  const stateDir = join(directory, '.omc', 'state');
  const messages: string[] = [];

  // If PreCompact, remind about active context
  if (input.hookEventName === 'PreCompact') {
    messages.push(
      'Context window is being compacted. Preserve awareness of active work: check .omc/state/ for current mode states and .omc/plans/ for active plans.',
    );
  }

  // Check for stale state from crashed sessions
  const staleFiles = markStaleStateFiles(stateDir);
  if (staleFiles.length > 0) {
    messages.push(
      `Recovered stale state from crashed sessions: ${staleFiles.join(', ')} (marked inactive).`,
    );
  }

  if (messages.length > 0) {
    return { continue: true, message: messages.join('\n') };
  }

  return { continue: true };
}
