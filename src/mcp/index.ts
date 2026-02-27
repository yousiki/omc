/**
 * MCP Server Module Exports
 */

export {
  createExaServer,
  createContext7Server,
  createPlaywrightServer,
  createFilesystemServer,
  createMemoryServer,
  getDefaultMcpServers,
  toSdkMcpFormat
} from './servers.js';

export type { McpServerConfig, McpServersConfig } from './servers.js';

// OMC Tools Server - in-process MCP server for custom tools
export {
  omcToolsServer,
  omcToolNames,
  getOmcToolNames
} from './omc-tools-server.js';

// Prompt injection helper for system prompt support
export {
  resolveSystemPrompt,
  buildPromptWithSystemContext,
  VALID_AGENT_ROLES,
  getValidAgentRoles,
  isValidAgentRoleName
} from '../agents/prompt-helpers.js';
export type { AgentRole } from '../agents/prompt-helpers.js';

// MCP Configuration module
export {
  loadMcpConfig,
  getMcpConfig,
  clearMcpConfigCache,
  isExternalPromptAllowed,
  getOutputPathPolicy,
  getOutputRedirectDir,
  DEFAULT_MCP_CONFIG
} from './mcp-config.js';
export type { McpConfig, OutputPathPolicy } from './mcp-config.js';
