/**
 * Oh-My-ClaudeCode
 * Multi-agent orchestration system for Claude Code.
 */

// Core types
export type { AgentConfig, ModelType, HookInput, HookOutput, PluginConfig } from './types';

// Agent system
export { getAgentDefinitions, omcSystemPrompt } from './agents/definitions';
export { loadAgentPrompt } from './agents/prompt';

// Utilities
export { resolveWorktreeRoot, readJsonFile, writeJsonFile, MODE_NAMES, readStdin } from './utils';

// Config loading
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
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
