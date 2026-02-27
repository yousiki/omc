/**
 * Delegation Routing Types
 *
 * Type definitions for the delegation routing system.
 * Now that external providers (codex/gemini) are removed,
 * delegation is Claude-only but the routing config structure
 * is preserved for role-based agent selection.
 */

/** Provider for delegation - now only 'claude' */
export type DelegationProvider = 'claude';

/** Tool used for delegation */
export type DelegationTool = 'Task';

/** A configured route for a specific role */
export interface DelegationRoute {
  provider: DelegationProvider;
  tool: DelegationTool;
  model?: string;
  agentType?: string;
  fallback?: string[];
}

/** Configuration for delegation routing */
export interface DelegationRoutingConfig {
  enabled?: boolean;
  defaultProvider?: DelegationProvider;
  roles?: Record<string, DelegationRoute>;
}

/** Decision result from the delegation resolver */
export interface DelegationDecision {
  provider: DelegationProvider;
  tool: DelegationTool;
  agentOrModel: string;
  reason: string;
  fallbackChain?: string[];
}

/** Options passed to resolveDelegation */
export interface ResolveDelegationOptions {
  agentRole: string;
  explicitTool?: DelegationTool;
  explicitModel?: string;
  config?: DelegationRoutingConfig;
}

/**
 * Default delegation routing configuration
 */
export const DEFAULT_DELEGATION_CONFIG: DelegationRoutingConfig = {
  enabled: false,
  defaultProvider: 'claude',
  roles: {},
};

/**
 * Role category to default Claude subagent mapping
 */
export const ROLE_CATEGORY_DEFAULTS: Record<string, string> = {
  // Exploration roles
  explore: 'explore',
  'document-specialist': 'document-specialist',
  researcher: 'document-specialist',
  'tdd-guide': 'test-engineer',

  // Advisory roles (high complexity)
  architect: 'architect',
  planner: 'planner',
  critic: 'critic',
  analyst: 'analyst',

  // Implementation roles
  executor: 'executor',

  // Review roles
  'code-reviewer': 'code-reviewer',
  'security-reviewer': 'security-reviewer',
  'quality-reviewer': 'quality-reviewer',

  // Specialized roles
  designer: 'designer',
  writer: 'writer',
  'qa-tester': 'qa-tester',
  debugger: 'debugger',
  scientist: 'scientist',
  'build-fixer': 'build-fixer',
  'git-master': 'executor',
  'code-simplifier': 'executor',
};

/**
 * Deprecated role aliases mapped to canonical role names.
 */
export const DEPRECATED_ROLE_ALIASES: Readonly<Record<string, string>> = {
  researcher: 'document-specialist',
  'tdd-guide': 'test-engineer',
  'api-reviewer': 'code-reviewer',
  'performance-reviewer': 'quality-reviewer',
  'dependency-expert': 'document-specialist',
  'quality-strategist': 'quality-reviewer',
  vision: 'document-specialist',
};

/**
 * Normalize legacy role aliases to canonical role names.
 */
export function normalizeDelegationRole(role: string): string {
  return DEPRECATED_ROLE_ALIASES[role] ?? role;
}

/**
 * Check if delegation routing is enabled
 */
export function isDelegationEnabled(
  config: DelegationRoutingConfig | undefined
): boolean {
  return config?.enabled === true;
}
