#!/usr/bin/env bun
/**
 * OMC Session End Hook (Bun-native)
 * Records session metrics, cleans up transient state.
 */

import {
  existsSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  mkdirSync,
  writeFileSync,
  statSync,
} from 'fs';
import { join } from 'path';
import { readStdin, resolveWorktreeRoot } from '../src/utils';

// Mode state files to clean up on session end
const SESSION_END_MODE_STATE_FILES = [
  { file: 'ultrawork-state.json', mode: 'ultrawork' },
  { file: 'ralph-state.json', mode: 'ralph' },
  { file: 'autopilot-state.json', mode: 'autopilot' },
  { file: 'pipeline-state.json', mode: 'pipeline' },
  { file: 'ultraqa-state.json', mode: 'ultraqa' },
];

// Mode files for metrics detection
const SESSION_METRICS_MODE_FILES = [
  { file: 'ultrawork-state.json', mode: 'ultrawork' },
  { file: 'ralph-state.json', mode: 'ralph' },
  { file: 'autopilot-state.json', mode: 'autopilot' },
  { file: 'pipeline-state.json', mode: 'pipeline' },
  { file: 'ultraqa-state.json', mode: 'ultraqa' },
];

interface SessionEndInput {
  session_id: string;
  transcript_path: string;
  cwd: string;
  reason: string;
}

interface SessionMetrics {
  session_id: string;
  started_at?: string;
  ended_at: string;
  reason: string;
  duration_ms?: number;
  agents_spawned: number;
  agents_completed: number;
  modes_used: string[];
}

function getAgentCounts(directory: string): { spawned: number; completed: number } {
  const trackingPath = join(directory, '.omc', 'state', 'subagent-tracking.json');
  if (!existsSync(trackingPath)) return { spawned: 0, completed: 0 };
  try {
    const tracking = JSON.parse(readFileSync(trackingPath, 'utf-8'));
    const spawned = tracking.agents?.length || 0;
    const completed =
      tracking.agents?.filter((a: { status?: string }) => a.status === 'completed').length || 0;
    return { spawned, completed };
  } catch {
    return { spawned: 0, completed: 0 };
  }
}

function getModesUsed(directory: string): string[] {
  const stateDir = join(directory, '.omc', 'state');
  if (!existsSync(stateDir)) return [];
  const modes: string[] = [];
  for (const { file, mode } of SESSION_METRICS_MODE_FILES) {
    if (existsSync(join(stateDir, file))) modes.push(mode);
  }
  return modes;
}

function getSessionStartTime(directory: string, sessionId?: string): string | undefined {
  const stateDir = join(directory, '.omc', 'state');
  if (!existsSync(stateDir)) return undefined;

  let matchedStartTime: string | undefined;
  let matchedEpoch = Infinity;

  for (const file of readdirSync(stateDir).filter((f) => f.endsWith('.json'))) {
    try {
      const state = JSON.parse(readFileSync(join(stateDir, file), 'utf-8'));
      if (!state.started_at) continue;
      const ts = Date.parse(state.started_at);
      if (!Number.isFinite(ts)) continue;

      if (sessionId && state.session_id === sessionId && ts < matchedEpoch) {
        matchedEpoch = ts;
        matchedStartTime = state.started_at;
      } else if (!state.session_id && ts < matchedEpoch) {
        matchedEpoch = ts;
        matchedStartTime = state.started_at;
      }
    } catch {
      continue;
    }
  }
  return matchedStartTime;
}

function recordMetrics(directory: string, input: SessionEndInput): SessionMetrics {
  const endedAt = new Date().toISOString();
  const startedAt = getSessionStartTime(directory, input.session_id);
  const { spawned, completed } = getAgentCounts(directory);
  const modesUsed = getModesUsed(directory);

  const metrics: SessionMetrics = {
    session_id: input.session_id,
    started_at: startedAt,
    ended_at: endedAt,
    reason: input.reason,
    agents_spawned: spawned,
    agents_completed: completed,
    modes_used: modesUsed,
  };

  if (startedAt) {
    try {
      metrics.duration_ms = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    } catch {}
  }

  return metrics;
}

function exportSessionSummary(directory: string, metrics: SessionMetrics): void {
  const sessionsDir = join(directory, '.omc', 'sessions');
  if (!existsSync(sessionsDir)) mkdirSync(sessionsDir, { recursive: true });
  try {
    writeFileSync(
      join(sessionsDir, `${metrics.session_id}.json`),
      JSON.stringify(metrics, null, 2),
      'utf-8',
    );
  } catch {}
}

function cleanupTransientState(directory: string): void {
  const omcDir = join(directory, '.omc');
  if (!existsSync(omcDir)) return;

  // Remove agent tracking
  const trackingPath = join(omcDir, 'state', 'subagent-tracking.json');
  if (existsSync(trackingPath)) {
    try {
      unlinkSync(trackingPath);
    } catch {}
  }

  // Clean stale checkpoints (>24h)
  const checkpointsDir = join(omcDir, 'checkpoints');
  if (existsSync(checkpointsDir)) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    try {
      for (const file of readdirSync(checkpointsDir)) {
        const filePath = join(checkpointsDir, file);
        if (statSync(filePath).mtimeMs < oneDayAgo) unlinkSync(filePath);
      }
    } catch {}
  }

  // Remove .tmp files recursively
  const removeTmpFiles = (dir: string) => {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) removeTmpFiles(fullPath);
        else if (entry.name.endsWith('.tmp')) unlinkSync(fullPath);
      }
    } catch {}
  };
  removeTmpFiles(omcDir);
}

function cleanupModeStates(directory: string, sessionId?: string): void {
  const stateDir = join(directory, '.omc', 'state');
  if (!existsSync(stateDir)) return;

  for (const { file } of SESSION_END_MODE_STATE_FILES) {
    const localPath = join(stateDir, file);
    if (!existsSync(localPath)) continue;
    try {
      if (file.endsWith('.json')) {
        const state = JSON.parse(readFileSync(localPath, 'utf-8'));
        if (state.active === true) {
          const stateSessionId = state.session_id as string | undefined;
          if (!sessionId || !stateSessionId || stateSessionId === sessionId) {
            unlinkSync(localPath);
          }
        }
      } else {
        unlinkSync(localPath);
      }
    } catch {}
  }
}

async function main() {
  try {
    const input = await readStdin();
    const data = JSON.parse(input || '{}') as SessionEndInput;
    const directory = resolveWorktreeRoot(data.cwd || process.cwd());

    const metrics = recordMetrics(directory, data);
    exportSessionSummary(directory, metrics);
    cleanupTransientState(directory);
    cleanupModeStates(directory, data.session_id);

    console.log(JSON.stringify({ continue: true }));
  } catch {
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
