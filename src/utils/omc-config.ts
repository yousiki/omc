/**
 * OMC Configuration Reader
 *
 * Reads the .omc-config.json file for runtime configuration.
 * Extracted from features/auto-update.ts during radical slimming.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getConfigDir } from './config-dir.js';
import type { TaskTool } from '../hooks/beads-context/types.js';

/** Installation paths (respects CLAUDE_CONFIG_DIR env var) */
export const CLAUDE_CONFIG_DIR = getConfigDir();
export const CONFIG_FILE = join(CLAUDE_CONFIG_DIR, '.omc-config.json');

/**
 * Stop hook callback configuration for file logging
 */
export interface StopCallbackFileConfig {
  enabled: boolean;
  /** File path with placeholders: {session_id}, {date}, {time} */
  path: string;
  /** Output format */
  format?: 'markdown' | 'json';
}

/**
 * Stop hook callback configuration for Telegram
 */
export interface StopCallbackTelegramConfig {
  enabled: boolean;
  /** Telegram bot token */
  botToken?: string;
  /** Chat ID to send messages to */
  chatId?: string;
  /** Optional tags/usernames to prefix in notifications */
  tagList?: string[];
}

/**
 * Stop hook callback configuration for Discord
 */
export interface StopCallbackDiscordConfig {
  enabled: boolean;
  /** Discord webhook URL */
  webhookUrl?: string;
  /** Optional tags/user IDs/roles to prefix in notifications */
  tagList?: string[];
}

/**
 * Stop hook callback configuration for Slack
 */
export interface StopCallbackSlackConfig {
  enabled: boolean;
  /** Slack incoming webhook URL */
  webhookUrl?: string;
  /** Optional tags/mentions to include in notifications */
  tagList?: string[];
}

/**
 * Stop hook callbacks configuration
 */
export interface StopHookCallbacksConfig {
  file?: StopCallbackFileConfig;
  telegram?: StopCallbackTelegramConfig;
  discord?: StopCallbackDiscordConfig;
  slack?: StopCallbackSlackConfig;
}

/**
 * OMC configuration (stored in .omc-config.json)
 */
export interface OMCConfig {
  /** Whether silent auto-updates are enabled (opt-in for security) */
  silentAutoUpdate: boolean;
  /** When the configuration was set */
  configuredAt?: string;
  /** Configuration schema version */
  configVersion?: number;
  /** Preferred task management tool */
  taskTool?: TaskTool;
  /** Configuration for the selected task tool */
  taskToolConfig?: {
    /** Use beads-mcp instead of CLI */
    useMcp?: boolean;
    /** Inject usage instructions at session start (default: true) */
    injectInstructions?: boolean;
  };
  /** Whether initial setup has been completed (ISO timestamp) */
  setupCompleted?: string;
  /** Version of setup wizard that was completed */
  setupVersion?: string;
  /** Stop hook callback configuration */
  stopHookCallbacks?: StopHookCallbacksConfig;
  /** Whether HUD statusline is enabled (default: true). Set to false to skip HUD installation. */
  hudEnabled?: boolean;
  /** Whether to prompt for upgrade at session start when a new version is available (default: true).
   *  Set to false to show a passive notification instead of an interactive prompt. */
  autoUpgradePrompt?: boolean;
  /** Absolute path to the Node.js binary detected at setup time.
   *  Used by find-node.sh so hooks work for nvm/fnm users where node is not on PATH. */
  nodeBinary?: string;
}

/**
 * Read the OMC configuration
 */
export function getOMCConfig(): OMCConfig {
  if (!existsSync(CONFIG_FILE)) {
    // No config file = disabled by default for security
    return { silentAutoUpdate: false };
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content) as OMCConfig;
    return {
      silentAutoUpdate: config.silentAutoUpdate ?? false,
      configuredAt: config.configuredAt,
      configVersion: config.configVersion,
      taskTool: config.taskTool,
      taskToolConfig: config.taskToolConfig,
      setupCompleted: config.setupCompleted,
      setupVersion: config.setupVersion,
      stopHookCallbacks: config.stopHookCallbacks,
      hudEnabled: config.hudEnabled,
      autoUpgradePrompt: config.autoUpgradePrompt,
    };
  } catch {
    // If config file is invalid, default to disabled for security
    return { silentAutoUpdate: false };
  }
}

/**
 * Check if team feature is enabled
 * Returns false by default - requires explicit opt-in
 * Checks ~/.claude/settings.json first, then env var fallback
 */
export function isTeamEnabled(): boolean {
  try {
    const settingsPath = join(CLAUDE_CONFIG_DIR, 'settings.json');
    if (existsSync(settingsPath)) {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
      const val = settings.env?.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
      if (val === '1' || val === 'true') {
        return true;
      }
    }
  } catch {
    // Fall through to env check
  }
  const envVal = process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS;
  return envVal === '1' || envVal === 'true';
}

/**
 * Compare semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  // Remove 'v' prefix if present
  const cleanA = a.replace(/^v/, '');
  const cleanB = b.replace(/^v/, '');

  const partsA = cleanA.split('.').map(n => parseInt(n, 10) || 0);
  const partsB = cleanB.split('.').map(n => parseInt(n, 10) || 0);

  const maxLength = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLength; i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;

    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}
