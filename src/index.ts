/**
 * Oh-My-ClaudeCode
 * Multi-agent orchestration system for Claude Code.
 */

// Agent system
export { getAgentDefinitions, omcSystemPrompt } from './agents/definitions';
export { loadAgentPrompt } from './agents/prompt';
export {
  BackgroundManager,
  ConcurrencyManager,
  getBackgroundManager,
  getBackgroundTaskGuidance,
  shouldRunInBackground,
} from './features/background';
export { checkBoulderContinuation, getPlanProgress, readBoulderState } from './features/boulder-state';
export {
  ContextCollector,
  contextCollector,
  createContextInjectorHook,
  injectContextIntoText,
  injectPendingContext,
} from './features/context';
export { enforceModel, resolveDelegation } from './features/delegation';
// Features
export { applyMagicKeywords, BUILTIN_MAGIC_KEYWORDS, detectMagicKeywords } from './features/magic-keywords';
export { analyzeComplexity, routeModel } from './features/model-routing';
// Hook system
export { normalizeHookInput, processHook } from './hooks/bridge';
export { detectKeywords, getPrimaryKeyword, processKeywordDetector } from './hooks/keyword-detector';
export { processPostTool, processPreTool } from './hooks/orchestrator';
export { processPermissionRequest } from './hooks/permission-handler';
export { checkPersistentModes } from './hooks/persistent-mode';
export { processRecovery } from './hooks/recovery';
export { processSetup } from './hooks/setup';
// Core types
export type { AgentConfig, HookInput, HookOutput, ModelType, PluginConfig } from './types';
// Utilities
export {
  escapeRegex,
  MODE_NAMES,
  readJsonFile,
  readStdin,
  removeCodeBlocks,
  resolveWorktreeRoot,
  writeJsonFile,
} from './utils';

// Config loading
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { PluginConfig } from './types';
import { resolveWorktreeRoot } from './utils';

/**
 * Load plugin configuration from .omc/config.json or ~/.claude/.omc-config.json
 */
export function loadConfig(cwd?: string): PluginConfig {
  const dir = cwd ?? process.cwd();

  // Try project-level config first
  try {
    const root = resolveWorktreeRoot(dir);
    const projectConfig = join(root, '.omc', 'config.json');
    if (existsSync(projectConfig)) {
      return JSON.parse(readFileSync(projectConfig, 'utf-8'));
    }
  } catch {
    // Fall through to user-level config
  }

  // Try user-level config
  const userConfig = join(homedir(), '.claude', '.omc-config.json');
  if (existsSync(userConfig)) {
    try {
      return JSON.parse(readFileSync(userConfig, 'utf-8'));
    } catch {
      // Fall through to defaults
    }
  }

  // Return empty config (all defaults)
  return {};
}
