/**
 * Delegation Enforcement & Routing
 *
 * Ensures model parameters are injected for Task/Agent calls and
 * resolves role-based delegation to the correct agent + model tier.
 *
 * Claude-only; no codex/gemini/team references.
 */

import { getAgentDefinitions } from '../agents/definitions';
import type { ModelType } from '../types';

// ============================================================
// CONSTANTS
// ============================================================

/** Prefix used for oh-my-claudecode subagent types */
const OMC_PREFIX = 'oh-my-claudecode:';

/**
 * Role category → canonical agent name mapping.
 *
 * Maps high-level task roles to the recommended agent for that role.
 */
const ROLE_TO_AGENT: Record<string, string> = {
  explore: 'explore',
  implement: 'executor',
  'deep-implement': 'deep-executor',
  review: 'code-reviewer',
  'quality-review': 'quality-reviewer',
  'security-review': 'security-reviewer',
  debug: 'debugger',
  test: 'test-engineer',
  plan: 'planner',
  architect: 'architect',
  analyze: 'analyst',
  design: 'designer',
  document: 'writer',
  'build-fix': 'build-fixer',
  qa: 'qa-tester',
  science: 'scientist',
};

// ============================================================
// TYPES
// ============================================================

/** Result of resolving a delegation route */
export interface DelegationDecision {
  /** Full subagent type (e.g. "oh-my-claudecode:executor") */
  agentType: string;
  /** Model tier for the agent */
  model: ModelType;
  /** Human-readable reason for the decision */
  reason: string;
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Enforce the correct model on a tool input for an agent/task call.
 *
 * When the orchestrator dispatches a Task with a `subagent_type` like
 * `"oh-my-claudecode:executor"`, this injects the correct `model` if
 * not already specified.
 *
 * @param toolInput - The raw tool input (Record with subagent_type, model, etc.)
 * @returns The (possibly modified) toolInput with model injected
 */
export function enforceModel(toolInput: Record<string, unknown>): Record<string, unknown> {
  const subagentType = toolInput.subagent_type;

  // Not an OMC subagent call — pass through
  if (typeof subagentType !== 'string' || !subagentType.startsWith(OMC_PREFIX)) {
    return toolInput;
  }

  // Already has a model specified — respect it
  if (toolInput.model) {
    return toolInput;
  }

  // Extract agent name after prefix
  const agentName = subagentType.slice(OMC_PREFIX.length);
  const model = getDefaultModel(agentName);

  if (!model) {
    // Unknown agent — return unmodified rather than throwing
    return toolInput;
  }

  return { ...toolInput, model };
}

/**
 * Get the default model tier for a given agent name.
 *
 * @param agentType - Agent name (e.g. "executor", "architect")
 * @returns The default ModelType, or undefined if unknown
 */
export function getDefaultModel(agentType: string): ModelType | undefined {
  const defs = getAgentDefinitions();
  const def = defs[agentType];
  return def?.model;
}

/**
 * Resolve a delegation route for a given role.
 *
 * Maps a high-level role (e.g. "implement", "review", "debug") to
 * the recommended agent and its default model tier.
 *
 * @param role - Role category (e.g. "implement", "explore", "review")
 * @returns DelegationDecision with agentType, model, and reason
 */
export function resolveDelegation(role: string): DelegationDecision {
  const agentName = ROLE_TO_AGENT[role];

  if (agentName) {
    const model = getDefaultModel(agentName);
    return {
      agentType: `${OMC_PREFIX}${agentName}`,
      model: model ?? 'sonnet',
      reason: `role '${role}' → ${agentName} (${model ?? 'sonnet'})`,
    };
  }

  // Unknown role — try treating it as an agent name directly
  const directModel = getDefaultModel(role);
  if (directModel) {
    return {
      agentType: `${OMC_PREFIX}${role}`,
      model: directModel,
      reason: `direct agent '${role}' (${directModel})`,
    };
  }

  // Fallback: use the role as agent name with sonnet default
  return {
    agentType: `${OMC_PREFIX}${role}`,
    model: 'sonnet',
    reason: `unknown role '${role}', fallback to sonnet`,
  };
}
