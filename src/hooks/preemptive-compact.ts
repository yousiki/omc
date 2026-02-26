/**
 * Preemptive Compact Hook
 *
 * When pre-compact fires, gathers current working context (active modes,
 * active plans, recent notepad entries) and returns a message that preserves
 * critical context through the compaction.
 *
 * This is a lightweight port of src/hooks/pre-compact/index.ts and
 * src/hooks/preemptive-compaction/index.ts, consolidated into a single
 * file for the Bun-native rewrite.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { HookInput, HookOutput } from '../types';
import { readJsonFile } from '../utils';

// ---------------------------------------------------------------------------
// State file readers
// ---------------------------------------------------------------------------

interface ModeState {
  active?: boolean;
  phase?: string;
  originalIdea?: string;
  iteration?: number;
  originalPrompt?: string;
  prompt?: string;
  original_prompt?: string;
  session_id?: string;
  task_count?: number;
  worker_count?: number;
  preset?: string;
  current_stage?: number;
  cycle?: number;
  status?: string;
  [key: string]: unknown;
}

/**
 * Read all active mode states from .omc/state/
 */
function readActiveModes(stateDir: string): string[] {
  if (!existsSync(stateDir)) return [];

  const modeFiles: Array<{ file: string; label: string; extract: (s: ModeState) => string | null }> = [
    {
      file: 'autopilot-state.json',
      label: 'Autopilot',
      extract: (s) =>
        s.active ? `Autopilot (Phase: ${s.phase || 'unknown'}, Idea: ${(s.originalIdea || '').slice(0, 100)})` : null,
    },
    {
      file: 'ralph-state.json',
      label: 'Ralph',
      extract: (s) =>
        s.active
          ? `Ralph (Iteration: ${s.iteration || 0}, Prompt: ${(s.originalPrompt || s.prompt || '').slice(0, 100)})`
          : null,
    },
    {
      file: 'ultrawork-state.json',
      label: 'Ultrawork',
      extract: (s) => (s.active ? `Ultrawork (Prompt: ${(s.original_prompt || s.prompt || '').slice(0, 100)})` : null),
    },
    {
      file: 'pipeline-state.json',
      label: 'Pipeline',
      extract: (s) => (s.active ? `Pipeline (Preset: ${s.preset || 'custom'}, Stage: ${s.current_stage || 0})` : null),
    },
    {
      file: 'ultraqa-state.json',
      label: 'UltraQA',
      extract: (s) => (s.active ? `UltraQA (Cycle: ${s.cycle || 0})` : null),
    },
    {
      file: 'ultrapilot-state.json',
      label: 'Ultrapilot',
      extract: (s) => (s.active ? `Ultrapilot (Workers: ${s.worker_count || 0})` : null),
    },
  ];

  const active: string[] = [];

  for (const { file, extract } of modeFiles) {
    const data = readJsonFile<ModeState>(join(stateDir, file));
    if (!data) continue;
    const desc = extract(data);
    if (desc) active.push(desc);
  }

  return active;
}

/**
 * Read TODO summary from todos.json
 */
function readTodoSummary(directory: string): string | null {
  const todoPaths = [join(directory, '.claude', 'todos.json'), join(directory, '.omc', 'state', 'todos.json')];

  for (const todoPath of todoPaths) {
    const todos = readJsonFile<Array<{ status: string }>>(todoPath);
    if (!todos || !Array.isArray(todos)) continue;

    const pending = todos.filter((t) => t.status === 'pending').length;
    const inProgress = todos.filter((t) => t.status === 'in_progress').length;
    const completed = todos.filter((t) => t.status === 'completed').length;
    const total = pending + inProgress + completed;

    if (total > 0) {
      return `TODOs: ${pending} pending, ${inProgress} in-progress, ${completed} completed`;
    }
  }

  return null;
}

/**
 * Read recent notepad/wisdom entries
 */
function readRecentWisdom(directory: string): string[] {
  const notepadsDir = join(directory, '.omc', 'notepads');
  if (!existsSync(notepadsDir)) return [];

  const wisdom: string[] = [];

  try {
    const planDirs = readdirSync(notepadsDir).filter((name) => {
      try {
        return statSync(join(notepadsDir, name)).isDirectory();
      } catch {
        return false;
      }
    });

    const wisdomFiles = ['learnings.md', 'decisions.md', 'issues.md'];

    for (const planDir of planDirs.slice(0, 3)) {
      for (const wf of wisdomFiles) {
        const wPath = join(notepadsDir, planDir, wf);
        if (!existsSync(wPath)) continue;
        try {
          const content = readFileSync(wPath, 'utf-8').trim();
          if (content) {
            // Take first 200 chars of each wisdom file
            wisdom.push(`[${planDir}/${wf}] ${content.slice(0, 200)}`);
          }
        } catch {
          // best effort
        }
      }
    }
  } catch {
    // best effort
  }

  return wisdom;
}

// ---------------------------------------------------------------------------
// Hook handler
// ---------------------------------------------------------------------------

/**
 * Process pre-compact hook.
 *
 * Gathers active modes, TODO state, and notepad wisdom, then returns a
 * message that preserves critical context through the compaction window.
 */
export function processPreCompact(_input: HookInput, directory: string): HookOutput {
  const stateDir = join(directory, '.omc', 'state');
  const sections: string[] = [];

  sections.push('CONTEXT PRESERVATION BEFORE COMPACTION');
  sections.push('');

  // Active modes
  const modes = readActiveModes(stateDir);
  if (modes.length > 0) {
    sections.push('## Active Modes');
    for (const mode of modes) {
      sections.push(`- ${mode}`);
    }
    sections.push('');
  }

  // TODO summary
  const todoSummary = readTodoSummary(directory);
  if (todoSummary) {
    sections.push(`## Progress: ${todoSummary}`);
    sections.push('');
  }

  // Notepad wisdom
  const wisdom = readRecentWisdom(directory);
  if (wisdom.length > 0) {
    sections.push('## Priority Notepad Content');
    for (const w of wisdom) {
      sections.push(`- ${w}`);
    }
    sections.push('');
  }

  // Instructions for post-compaction
  sections.push('---');
  sections.push('After compaction: review .omc/state/ for current mode states and .omc/plans/ for active plans.');

  if (sections.length <= 4) {
    // Only header + instructions, no real state to preserve
    return {
      continue: true,
      message: 'Context window compacting. Check .omc/state/ and .omc/plans/ for active work context after compaction.',
    };
  }

  return {
    continue: true,
    message: sections.join('\n'),
  };
}
