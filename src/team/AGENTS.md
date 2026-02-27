<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/team/

## Purpose

Team coordination infrastructure. Implements the bridge between Claude Code's native team system and external worker processes (tmux sessions, CLI workers). Manages task files, message routing (inbox/outbox), worker lifecycle, heartbeats, and MCP team bridge for multi-agent orchestration.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export of all public team APIs |
| `types.ts` | TypeScript types: `BridgeConfig`, `TaskFile`, `InboxMessage`, `OutboxMessage`, etc. |
| `runtime.ts` | Core team runtime — manages worker lifecycle and coordination |
| `runtime-cli.ts` | CLI worker runtime for codex/gemini subprocess workers |
| `task-file-ops.ts` | Task file CRUD: `readTask`, `updateTask`, `findNextTask`, etc. |
| `task-router.ts` | Routes tasks to appropriate workers based on capabilities |
| `message-router.ts` | Routes messages between team members |
| `inbox-outbox.ts` | Inbox/outbox message queue management |
| `outbox-reader.ts` | Reads and processes outbox messages |
| `tmux-session.ts` | tmux session management: create, kill, spawn workers |
| `tmux-comm.ts` | tmux pane communication (send keys, capture output) |
| `mcp-team-bridge.ts` | MCP bridge for Claude Code native team integration |
| `heartbeat.ts` | Worker heartbeat monitoring |
| `idle-nudge.ts` | Nudges idle workers to continue |
| `worker-bootstrap.ts` | Worker initialization and bootstrap |
| `worker-health.ts` | Worker health checks |
| `worker-restart.ts` | Automatic worker restart on failure |
| `phase-controller.ts` | Controls team pipeline phase transitions |
| `unified-team.ts` | Unified API across native and CLI workers |
| `capabilities.ts` | Worker capability declarations |
| `permissions.ts` | Team permission management |
| `audit-log.ts` | Audit logging for team operations |
| `activity-log.ts` | Activity timeline for team members |
| `merge-coordinator.ts` | Coordinates worktree merges from parallel workers |
| `team-registration.ts` | Registers team members with coordinator |
| `team-status.ts` | Reports team and worker status |
| `team-name.ts` | Team naming utilities |
| `state-paths.ts` | Resolves team state file paths |
| `summary-report.ts` | Generates team execution summary reports |
| `model-contract.ts` | Model capability contracts |
| `usage-tracker.ts` | Tracks token usage across team |
| `git-worktree.ts` | Git worktree management for isolated worker environments |
| `fs-utils.ts` | File system utilities for team coordination |
| `bridge-entry.ts` | Bridge entry point for worker processes |
| `cli-detection.ts` | Detects available CLI tools |

## For AI Agents

### Working In This Directory

- The team module is the most complex in the codebase — understand the coordination model before modifying
- Tasks are stored as JSON files in `.omc/tasks/<team-name>/`
- Workers communicate via inbox/outbox JSON files, not shared memory
- tmux sessions provide process isolation for CLI workers
- Git worktrees provide filesystem isolation for parallel workers
- `unified-team.ts` is the recommended entry point for most operations

### Testing Requirements

- Tests in `__tests__/` mock tmux and file system operations
- Integration tests require tmux to be available

## Dependencies

### Internal
- `src/lib/` — atomic writes, session isolation
- `src/notifications/` — team event notifications

### External
- `better-sqlite3` — job state persistence
- tmux (system) — process isolation for workers

<!-- MANUAL: -->
