<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# scripts/

## Purpose

Runtime hook scripts (`.mjs`, `.cjs`) and utility shell scripts that are installed into the user's Claude Code environment. These scripts are the executable handlers referenced by `hooks.json` and called by Claude Code on hook events. They bridge Claude Code hook events to the TypeScript source logic in `src/hooks/`.

## Key Files

| File | Description |
|------|-------------|
| `session-start.mjs` | SessionStart hook — initializes OMC state, loads notepad |
| `session-end.mjs` | SessionEnd hook — persists state |
| `pre-tool-use.mjs` | PreToolUse hook — runs enforcers, injects context |
| `post-tool-use.mjs` | PostToolUse hook — verifies deliverables, tracks usage |
| `post-tool-use-failure.mjs` | PostToolUse failure path handler |
| `stop-continuation.mjs` | Stop hook — handles ralph/ultrawork continuation |
| `keyword-detector.mjs` | Detects skill trigger keywords in user prompts |
| `code-simplifier.mjs` | Code simplification post-tool hook |
| `persistent-mode.mjs` | Persistent mode state management |
| `persistent-mode.cjs` | CJS variant for compatibility |
| `pre-compact.mjs` | Pre-compaction hook — saves notepad state |
| `skill-injector.mjs` | Injects skill system prompts |
| `context-guard-stop.mjs` | Context window guard |
| `context-safety.mjs` | Context safety checks |
| `project-memory-posttool.mjs` | Project memory post-tool updates |
| `project-memory-precompact.mjs` | Project memory pre-compact save |
| `project-memory-session.mjs` | Project memory session initialization |
| `subagent-tracker.mjs` | Tracks subagent usage across session |
| `setup-init.mjs` | Initial setup wizard handler |
| `setup-maintenance.mjs` | Maintenance and update setup |
| `verify-deliverables.mjs` | Verifies task deliverables post-tool |
| `permission-handler.mjs` | Handles permission requests |
| `cleanup-orphans.mjs` | Cleans up orphaned state files |
| `status.mjs` | Status reporting helper |
| `run.cjs` | CJS runner for compatibility |
| `find-node.sh` | Finds Node.js installation path |
| `uninstall.sh` | Uninstalls OMC hooks and config |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `lib/` | Shared library utilities for scripts (see `lib/AGENTS.md`) |

## For AI Agents

### Working In This Directory

- Scripts use `.mjs` (ESM) format by default; `.cjs` variants exist for compatibility
- Each script is a thin entry point that imports from `src/` via the compiled output
- Do not add complex logic here — keep scripts as thin dispatchers to `src/hooks/`
- After modifying source hooks in `src/hooks/`, regenerate scripts via installation

### Testing Requirements

- Test hook scripts end-to-end using Claude Code's hook testing mechanism
- Unit tests for hook logic live in `src/hooks/<name>/__tests__/`

## Dependencies

### Internal
- Sources from `src/hooks/` (compiled)
- Shared utilities from `scripts/lib/`

<!-- MANUAL: -->
