/**
 * Subagent Tracker Hook
 *
 * Lightweight tracking of agent lifecycle events for metrics and staleness
 * detection. Logs events to .omc/logs/agent-metrics.jsonl.
 *
 * Port of src/hooks/subagent-tracker/index.ts, radically slimmed down
 * to just JSONL logging and staleness warnings.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HookInput, HookOutput } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOG_FILE = 'agent-metrics.jsonl';
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// JSONL logging
// ---------------------------------------------------------------------------

interface AgentMetricEntry {
  event: 'start' | 'stop';
  agentId?: string;
  agentName?: string;
  agentType?: string;
  timestamp: string;
  durationMs?: number;
  staleWarning?: boolean;
}

/**
 * Ensure log directory exists and return the log file path.
 */
function getLogPath(directory: string): string {
  const logDir = join(directory, '.omc', 'logs');
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  return join(logDir, LOG_FILE);
}

/**
 * Append a JSONL entry to the agent metrics log.
 */
function logMetric(directory: string, entry: AgentMetricEntry): void {
  try {
    const logPath = getLogPath(directory);
    appendFileSync(logPath, `${JSON.stringify(entry)}\n`, 'utf-8');
  } catch {
    // best-effort logging, never fail the hook
  }
}

/**
 * Find the start timestamp for a given agent from the JSONL log.
 * Scans from the end of the file for efficiency.
 */
function findStartTime(directory: string, agentId: string | undefined): number | null {
  if (!agentId) return null;

  try {
    const logPath = getLogPath(directory);
    if (!existsSync(logPath)) return null;

    const content = readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n');

    // Scan backward for the most recent start event for this agent
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const entry = JSON.parse(lines[i]) as AgentMetricEntry;
        if (entry.event === 'start' && entry.agentId === agentId) {
          return new Date(entry.timestamp).getTime();
        }
      } catch {}
    }
  } catch {
    // best effort
  }

  return null;
}

/**
 * Check all currently running agents for staleness by scanning the log.
 * An agent is "running" if it has a start entry but no corresponding stop.
 */
function detectStaleAgents(directory: string): string[] {
  try {
    const logPath = getLogPath(directory);
    if (!existsSync(logPath)) return [];

    const content = readFileSync(logPath, 'utf-8');
    const lines = content.trim().split('\n');

    // Track which agents have started vs stopped
    const starts = new Map<string, number>(); // agentId -> start timestamp
    const stopped = new Set<string>();

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as AgentMetricEntry;
        if (!entry.agentId) continue;

        if (entry.event === 'start') {
          starts.set(entry.agentId, new Date(entry.timestamp).getTime());
          stopped.delete(entry.agentId);
        } else if (entry.event === 'stop') {
          stopped.add(entry.agentId);
        }
      } catch {}
    }

    const now = Date.now();
    const stale: string[] = [];

    for (const [agentId, startTime] of starts) {
      if (!stopped.has(agentId) && now - startTime > STALE_THRESHOLD_MS) {
        stale.push(agentId);
      }
    }

    return stale;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Hook handlers
// ---------------------------------------------------------------------------

/**
 * Process SubagentStart event.
 *
 * Logs the agent start to JSONL and checks for stale agents.
 */
export function processSubagentStart(input: HookInput, directory: string): HookOutput {
  const now = new Date().toISOString();

  logMetric(directory, {
    event: 'start',
    agentId: input.agentId,
    agentName: input.agentName,
    agentType: input.agentType,
    timestamp: now,
  });

  // Check for stale agents
  const staleAgents = detectStaleAgents(directory);

  if (staleAgents.length > 0) {
    return {
      continue: true,
      message: `WARNING: ${staleAgents.length} agent(s) running > 10 minutes: ${staleAgents.join(', ')}. Consider checking for stuck agents.`,
    };
  }

  return { continue: true };
}

/**
 * Process SubagentStop event.
 *
 * Logs the agent stop with duration to JSONL.
 */
export function processSubagentStop(input: HookInput, directory: string): HookOutput {
  const now = new Date();
  const startTime = findStartTime(directory, input.agentId);
  const durationMs = startTime ? now.getTime() - startTime : undefined;

  logMetric(directory, {
    event: 'stop',
    agentId: input.agentId,
    agentName: input.agentName,
    agentType: input.agentType,
    timestamp: now.toISOString(),
    durationMs,
  });

  return { continue: true };
}
