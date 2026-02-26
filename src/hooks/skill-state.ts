/**
 * Skill Active State Management
 *
 * Tracks when a skill is actively executing so the persistent-mode Stop hook
 * can prevent premature session termination.
 *
 * Protection levels control how aggressively we prevent stopping:
 * - none:   no protection (skill has its own mode state or is instant)
 * - light:  max 3 reinforcements, 5-min TTL
 * - medium: max 5 reinforcements, 15-min TTL
 * - heavy:  max 10 reinforcements, 30-min TTL
 *
 * Simplified from old src/hooks/skill-state/index.ts:
 * - No session-scoped paths, no worktree helpers
 * - Pure JSON file-based state in `.omc/state/skill-active-state.json`
 */

import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import type { HookOutput } from '../types';
import { readJsonFile, writeJsonFile } from '../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProtectionLevel = 'none' | 'light' | 'medium' | 'heavy';

export interface SkillActiveState {
  active: boolean;
  skillName: string;
  protectionLevel: ProtectionLevel;
  reinforcements: number;
  maxReinforcements: number;
  startedAt: string;
  ttlMs: number;
}

// ---------------------------------------------------------------------------
// Protection configuration per level
// ---------------------------------------------------------------------------

interface ProtectionConfig {
  maxReinforcements: number;
  ttlMs: number;
}

const _PROTECTION_CONFIGS: Record<ProtectionLevel, ProtectionConfig> = {
  none: { maxReinforcements: 0, ttlMs: 0 },
  light: { maxReinforcements: 3, ttlMs: 5 * 60 * 1000 }, // 5 min
  medium: { maxReinforcements: 5, ttlMs: 15 * 60 * 1000 }, // 15 min
  heavy: { maxReinforcements: 10, ttlMs: 30 * 60 * 1000 }, // 30 min
};

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function stateFilePath(directory: string): string {
  return join(directory, '.omc', 'state', 'skill-active-state.json');
}

// ---------------------------------------------------------------------------
// State read/write/clear
// ---------------------------------------------------------------------------

export function readSkillActiveState(directory: string): SkillActiveState | null {
  const state = readJsonFile<SkillActiveState>(stateFilePath(directory));
  if (!state || typeof state.active !== 'boolean') return null;
  return state;
}

export function writeSkillActiveState(directory: string, state: SkillActiveState): void {
  writeJsonFile(stateFilePath(directory), state);
}

export function clearSkillActiveState(directory: string): void {
  const path = stateFilePath(directory);
  try {
    if (existsSync(path)) unlinkSync(path);
  } catch {
    // Ignore removal errors
  }
}

// ---------------------------------------------------------------------------
// Check for stop hook
// ---------------------------------------------------------------------------

export function checkSkillActiveState(directory: string): HookOutput {
  const state = readSkillActiveState(directory);

  // 1. Not active
  if (!state || !state.active) {
    return { continue: true };
  }

  // 2. TTL expired -> auto-clear
  const elapsed = Date.now() - new Date(state.startedAt).getTime();
  if (state.ttlMs > 0 && elapsed > state.ttlMs) {
    clearSkillActiveState(directory);
    return { continue: true };
  }

  // 3. Reinforcements exhausted -> auto-clear
  if (state.reinforcements >= state.maxReinforcements) {
    clearSkillActiveState(directory);
    return { continue: true };
  }

  // 4. Still active -- increment reinforcements and return continuation
  state.reinforcements += 1;
  writeSkillActiveState(directory, state);

  return {
    continue: true,
    message: `<system-reminder>
hook additional context: [SKILL ACTIVE: ${state.skillName}] The "${state.skillName}" skill is still executing (reinforcement ${state.reinforcements}/${state.maxReinforcements}). Continue working on the skill's instructions.
</system-reminder>`,
  };
}
