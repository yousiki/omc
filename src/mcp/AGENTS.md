<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/mcp/

## Purpose

MCP (Model Context Protocol) server integration. Manages configurations for external MCP servers (Exa, Context7, Playwright, Filesystem, Memory) and runs an in-process OMC tools server that exposes custom tools (LSP, AST, state, notepad) to Claude agents.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export — MCP server configs and OMC tools server |
| `servers.ts` | External MCP server configurations (Exa, Context7, Playwright, etc.) |
| `omc-tools-server.ts` | In-process MCP server exposing all OMC custom tools |
| `mcp-config.ts` | MCP configuration loading and validation |
| `standalone-server.ts` | Standalone MCP server runner |
| `team-server.ts` | Team coordination MCP server |
| `job-management.ts` | Background job management for MCP workers |
| `job-state-db.ts` | SQLite-backed job state persistence |
| `prompt-injection.ts` | System prompt injection for MCP agents |
| `prompt-persistence.ts` | Persists prompts/responses for audit trail |
| `cli-detection.ts` | Detects available CLI tools (claude, codex, gemini) |

## For AI Agents

### Working In This Directory

- `omc-tools-server.ts` is the central file — it registers all custom tools (LSP, AST, state, notepad, trace, skills, memory) as MCP tool handlers
- External server configs in `servers.ts` follow `McpServerConfig` interface
- `job-state-db.ts` uses SQLite (`better-sqlite3`) for persistent job tracking
- `prompt-persistence.ts` writes to `~/.claude/omc-prompts/` for audit trail

### Testing Requirements

- Tests in `__tests__/` cover MCP tool routing and config loading
- Use mock MCP clients to test tool handlers

### Common Patterns

```typescript
// Registering a custom tool in omc-tools-server.ts
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  // dispatch to handler
});
```

## Dependencies

### Internal
- `src/tools/` — LSP, AST, Python REPL tool implementations
- `src/team/` — team bridge for multi-agent coordination

### External
- `@modelcontextprotocol/sdk` — MCP server/client protocol
- `better-sqlite3` — job state persistence

<!-- MANUAL: -->
