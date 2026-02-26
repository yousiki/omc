import type { HookInput, HookOutput } from '../types';
import { processKeywordDetector } from './keyword-detector';
import { processPreTool, processPostTool } from './orchestrator';
import { checkPersistentModes } from './persistent-mode';
import { processSetup } from './setup';
import { processPermissionRequest } from './permission-handler';
import { processRecovery } from './recovery';

/**
 * Normalize raw hook input from Claude Code (snake_case) to internal format (camelCase).
 */
export function normalizeHookInput(raw: Record<string, unknown>): HookInput {
  return {
    sessionId: (raw.session_id ?? raw.sessionId) as string | undefined,
    directory: (raw.cwd ?? raw.directory) as string | undefined,
    prompt: (raw.prompt ?? (raw.message as any)?.content) as string | undefined,
    toolName: (raw.tool_name ?? raw.toolName) as string | undefined,
    toolInput: raw.tool_input ?? raw.toolInput,
    toolOutput: (raw.tool_response ?? raw.tool_output ?? raw.toolOutput) as unknown,
    hookEventName: (raw.hook_event_name ?? raw.hookEventName) as string | undefined,
    transcriptPath: (raw.transcript_path ?? raw.transcriptPath) as string | undefined,
    stopReason: (raw.stop_reason ?? raw.stopReason) as string | undefined,
    userRequested: (raw.user_requested ?? raw.userRequested) as boolean | undefined,
    agentId: (raw.agent_id ?? raw.agentId) as string | undefined,
    agentType: (raw.agent_type ?? raw.agentType) as string | undefined,
    agentName: (raw.agent_name ?? raw.agentName) as string | undefined,
    parentSessionId: (raw.parent_session_id ?? raw.parentSessionId) as string | undefined,
  };
}

/**
 * Main hook dispatch. Routes each hook type to its handler.
 * Initially all hooks are stubs returning { continue: true }.
 * They will be implemented in subsequent tasks.
 */
export async function processHook(hookType: string, rawInput: unknown): Promise<HookOutput> {
  const input = normalizeHookInput((rawInput ?? {}) as Record<string, unknown>);

  switch (hookType) {
    case 'keyword-detector':
      return processKeywordDetector(input);
    case 'pre-tool-use':
      return processPreTool(input);
    case 'post-tool-use':
      return processPostTool(input);
    case 'persistent-mode':
      return checkPersistentModes(input, input.directory ?? process.cwd());
    case 'session-start':
      return processSetup(input, input.directory ?? process.cwd());
    case 'session-end':
      return { continue: true }; // Task 9.4
    case 'setup':
    case 'setup-init':
    case 'setup-maintenance':
      return processSetup(input, input.directory ?? process.cwd());
    case 'permission-request':
      return processPermissionRequest(input);
    case 'subagent-start':
    case 'subagent-stop':
      return { continue: true }; // Task 4.2
    case 'pre-compact':
      return processRecovery(input, input.directory ?? process.cwd());
    default:
      return { continue: true };
  }
}
