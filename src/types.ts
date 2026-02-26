/** Model tier for agent routing */
export type ModelType = 'haiku' | 'sonnet' | 'opus';

/** Configuration for a specialized agent */
export interface AgentConfig {
  name: string;
  description: string;
  prompt: string;
  model: ModelType;
  defaultModel?: ModelType;
  disallowedTools?: string[];
}

/** Normalized hook input (camelCase) */
export interface HookInput {
  sessionId?: string;
  directory?: string;
  prompt?: string;
  toolName?: string;
  toolInput?: unknown;
  toolOutput?: unknown;
  hookEventName?: string;
  transcriptPath?: string;
  stopReason?: string;
  userRequested?: boolean;
  agentId?: string;
  agentType?: string;
  agentName?: string;
  parentSessionId?: string;
}

/** Hook output returned to Claude Code */
export interface HookOutput {
  continue: boolean;
  message?: string;
  reason?: string;
  modifiedInput?: unknown;
  suppressOutput?: boolean;
}

/** Plugin configuration */
export interface PluginConfig {
  magicKeywords?: Record<string, boolean>;
  delegationEnforcement?: 'off' | 'warn' | 'strict';
  modelRouting?: boolean;
  backgroundTasks?: boolean;
  [key: string]: unknown;
}
