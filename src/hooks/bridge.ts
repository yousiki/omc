import type { HookInput, HookOutput } from '../types';
import { processEmptyMsgSanitizer } from './empty-msg-sanitizer';
import { processKeywordDetector } from './keyword-detector';
import { processPostTool, processPreTool } from './orchestrator';
import { processPermissionRequest } from './permission-handler';
import { checkPersistentModes } from './persistent-mode';
import { processPreCompact } from './preemptive-compact';
import { processRecovery } from './recovery';
import { processSetup } from './setup';
import { processSubagentStart, processSubagentStop } from './subagent-tracker';
import { processTaskSizeDetection } from './task-size-detector';
import { processThinkingValidator } from './thinking-validator';

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
 * Compose multiple hook results. Messages are concatenated; modifiedInput
 * from the first hook that provides one wins; continue is ANDed.
 */
function composeResults(...results: HookOutput[]): HookOutput {
  const messages: string[] = [];
  let modifiedInput: unknown;
  let shouldContinue = true;

  for (const r of results) {
    if (!r.continue) shouldContinue = false;
    if (r.message) messages.push(r.message);
    if (r.modifiedInput && modifiedInput === undefined) {
      modifiedInput = r.modifiedInput;
    }
  }

  const result: HookOutput = { continue: shouldContinue };
  if (messages.length > 0) result.message = messages.join('\n\n');
  if (modifiedInput !== undefined) result.modifiedInput = modifiedInput;
  return result;
}

/**
 * Main hook dispatch. Routes each hook type to its handler.
 */
export async function processHook(hookType: string, rawInput: unknown): Promise<HookOutput> {
  const input = normalizeHookInput((rawInput ?? {}) as Record<string, unknown>);

  switch (hookType) {
    case 'keyword-detector': {
      // UserPromptSubmit: compose empty-msg sanitizer, task-size detection,
      // and keyword detection into one response.
      const sanitizerResult = processEmptyMsgSanitizer(input);
      const taskSizeResult = processTaskSizeDetection(input);
      const keywordResult = processKeywordDetector(input);
      return composeResults(sanitizerResult, taskSizeResult, keywordResult);
    }
    case 'pre-tool-use':
      return processPreTool(input);
    case 'post-tool-use': {
      // PostToolUse: run orchestrator post-tool, then thinking validator
      const postToolResult = processPostTool(input);
      const thinkingResult = processThinkingValidator(input);
      return composeResults(postToolResult, thinkingResult);
    }
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
      return processSubagentStart(input, input.directory ?? process.cwd());
    case 'subagent-stop': {
      // SubagentStop: run tracker, then thinking validator on agent output
      const stopResult = processSubagentStop(input, input.directory ?? process.cwd());
      const thinkingStopResult = processThinkingValidator(input);
      return composeResults(stopResult, thinkingStopResult);
    }
    case 'pre-compact': {
      // PreCompact: run both recovery (stale state cleanup) and
      // preemptive compact (context preservation)
      const recoveryResult = processRecovery(input, input.directory ?? process.cwd());
      const compactResult = processPreCompact(input, input.directory ?? process.cwd());
      return composeResults(recoveryResult, compactResult);
    }
    default:
      return { continue: true };
  }
}
