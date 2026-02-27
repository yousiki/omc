<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/interop/

## Purpose

Interoperability bridge between the OMC hook system and external state. Provides shared state utilities and OMX team state management used when bridging between different execution contexts (hooks, MCP servers, CLI workers).

## Key Files

| File | Description |
|------|-------------|
| `mcp-bridge.ts` | Bridge between MCP server and hook system state |
| `shared-state.ts` | Shared state accessors for cross-context coordination |
| `omx-team-state.ts` | OMX (external) team state management |

## For AI Agents

### Working In This Directory

- Interop modules use file-based state to cross process boundaries
- State files are stored in `.omc/state/` under the worktree root
- Tests in `__tests__/` use temporary directories for isolation

## Dependencies

### Internal
- `src/lib/worktree-paths.ts` — state file path resolution
- `src/lib/atomic-write.ts` — safe state file writes

<!-- MANUAL: -->
