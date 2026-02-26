/**
 * Model Routing
 *
 * Intelligent model tier selection based on task complexity analysis.
 * Routes tasks to haiku/sonnet/opus based on lexical and structural signals.
 *
 * Standalone module — only imports types.
 */

import type { ModelType } from '../types';

// ============================================================
// TYPES
// ============================================================

/** Complexity tier */
export type ComplexityTier = 'LOW' | 'MEDIUM' | 'HIGH';

/** Result of complexity analysis */
export interface ComplexityAnalysis {
  tier: ComplexityTier;
  model: ModelType;
  signals: string[];
}

// ============================================================
// CONSTANTS
// ============================================================

/** Map complexity tiers to model types */
const TIER_TO_MODEL: Record<ComplexityTier, ModelType> = {
  LOW: 'haiku',
  MEDIUM: 'sonnet',
  HIGH: 'opus',
};

/**
 * Known agent → default model mapping.
 *
 * This is a standalone lookup that mirrors the agent definitions
 * without importing them, keeping model-routing free of circular deps.
 */
const AGENT_MODELS: Record<string, ModelType> = {
  // LOW tier
  explore: 'haiku',
  writer: 'haiku',
  // MEDIUM tier
  executor: 'sonnet',
  debugger: 'sonnet',
  verifier: 'sonnet',
  'quality-reviewer': 'sonnet',
  'security-reviewer': 'sonnet',
  'test-engineer': 'sonnet',
  'build-fixer': 'sonnet',
  designer: 'sonnet',
  'qa-tester': 'sonnet',
  scientist: 'sonnet',
  'git-master': 'sonnet',
  'document-specialist': 'sonnet',
  // HIGH tier
  architect: 'opus',
  planner: 'opus',
  analyst: 'opus',
  critic: 'opus',
  'code-reviewer': 'opus',
  'deep-executor': 'opus',
  'code-simplifier': 'opus',
};

// ---- Keyword lists for lexical signal detection ----

const ARCHITECTURE_KEYWORDS = [
  'refactor', 'redesign', 'decouple', 'modularize', 'abstract',
  'pattern', 'architecture',
];

const DEBUGGING_KEYWORDS = [
  'debug', 'diagnose', 'root cause', 'investigate', 'trace',
];

const SIMPLE_KEYWORDS = [
  'find', 'search', 'locate', 'list', 'show', 'get', 'fetch',
];

const RISK_KEYWORDS = [
  'critical', 'production', 'security', 'breaking', 'migration', 'deploy',
];

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Route a task to the appropriate model tier.
 *
 * If `agentName` is provided and has a known default model, returns
 * that directly (fast path). Otherwise, analyzes the task description
 * for complexity signals.
 *
 * @param taskDescription - Free-text description of the task
 * @param agentName - Optional agent name for fast-path lookup
 * @returns The recommended ModelType
 */
export function routeModel(taskDescription: string, agentName?: string): ModelType {
  // Fast path: known agent → use its default model
  if (agentName) {
    const agentModel = quickTierForAgent(agentName);
    if (agentModel) return agentModel;
  }

  // Full analysis path
  const { model } = analyzeComplexity(taskDescription);
  return model;
}

/**
 * Quick tier lookup for known agent types.
 *
 * Bypasses complexity analysis entirely — returns the agent's
 * default model from the static mapping.
 *
 * @param agentName - Agent name (e.g. "executor", "architect")
 * @returns The default ModelType, or undefined if agent is unknown
 */
export function quickTierForAgent(agentName: string): ModelType | undefined {
  return AGENT_MODELS[agentName];
}

/**
 * Analyze task complexity and return a recommendation.
 *
 * Scans the task description for lexical and structural signals
 * and maps the result to a complexity tier + model.
 *
 * @param taskDescription - Free-text description of the task
 * @returns ComplexityAnalysis with tier, model, and detected signals
 */
export function analyzeComplexity(taskDescription: string): ComplexityAnalysis {
  const lower = taskDescription.toLowerCase();
  const signals: string[] = [];

  let highScore = 0;
  let mediumScore = 0;
  let lowScore = 0;

  // ---- Lexical signals ----

  if (matchesAny(lower, ARCHITECTURE_KEYWORDS)) {
    highScore += 2;
    signals.push('architecture keywords detected');
  }

  if (matchesAny(lower, RISK_KEYWORDS)) {
    highScore += 2;
    signals.push('risk keywords detected');
  }

  if (matchesAny(lower, DEBUGGING_KEYWORDS)) {
    mediumScore += 2;
    signals.push('debugging keywords detected');
  }

  if (matchesAny(lower, SIMPLE_KEYWORDS)) {
    lowScore += 2;
    signals.push('simple task keywords detected');
  }

  // ---- Structural signals ----

  const wordCount = taskDescription.split(/\s+/).filter(Boolean).length;
  if (wordCount > 200) {
    highScore += 1;
    signals.push(`long description (${wordCount} words)`);
  } else if (wordCount < 20 && highScore === 0) {
    // Only count brevity toward LOW if no high-complexity signals are present
    lowScore += 1;
    signals.push(`short description (${wordCount} words)`);
  }

  // Multiple file paths (patterns like /path/to/file or ./relative)
  const filePathMatches = taskDescription.match(/(?:\/[\w.-]+){2,}|\.\/[\w./-]+/g);
  if (filePathMatches && filePathMatches.length >= 2) {
    mediumScore += 1;
    signals.push(`multiple file paths (${filePathMatches.length})`);
  }

  // Code blocks
  const codeBlockCount = (taskDescription.match(/```/g) || []).length / 2;
  if (codeBlockCount >= 1) {
    mediumScore += 1;
    signals.push(`contains code blocks (${Math.floor(codeBlockCount)})`);
  }

  // ---- Determine tier ----
  // Prefer higher tiers on ties to avoid under-provisioning.

  let tier: ComplexityTier;

  if (highScore > 0 && highScore >= mediumScore && highScore >= lowScore) {
    tier = 'HIGH';
  } else if (mediumScore > 0 && mediumScore >= lowScore) {
    tier = 'MEDIUM';
  } else if (lowScore > 0) {
    tier = 'LOW';
  } else {
    tier = 'MEDIUM';
  }

  // If no signals detected at all, default to MEDIUM
  if (signals.length === 0) {
    tier = 'MEDIUM';
    signals.push('no strong signals, defaulting to medium');
  }

  return {
    tier,
    model: TIER_TO_MODEL[tier],
    signals,
  };
}

// ============================================================
// INTERNAL HELPERS
// ============================================================

/** Check if text contains any of the given keywords */
function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}
