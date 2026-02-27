<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/lib/

## Purpose

Shared utility library used across the entire codebase. Provides foundational primitives: atomic file writes, SQLite job state, session isolation, worktree path resolution, and version management.

## Key Files

| File | Description |
|------|-------------|
| `atomic-write.ts` | Write-then-rename atomic file writes to prevent corruption |
| `job-state-db.ts` | SQLite-backed job state database for background tasks |
| `mode-names.ts` | Canonical mode name constants (ralph, ultrawork, autopilot, etc.) |
| `session-isolation.ts` | Session-scoped file path isolation |
| `version.ts` | Reads runtime package version from `package.json` |
| `worktree-paths.ts` | Resolves OMC state paths relative to git worktree root |

## For AI Agents

### Working In This Directory

- `atomic-write.ts` must be used for all state file writes (never write directly)
- `worktree-paths.ts` is the canonical source for all `.omc/` path resolution
- `session-isolation.ts` creates per-session subdirectories when `sessionId` is available
- `job-state-db.ts` uses SQLite; database file lives at `.omc/jobs.db`

### Common Patterns

```typescript
// Always use atomic writes for state
import { atomicWriteFile } from '../lib/atomic-write.js';
await atomicWriteFile(statePath, JSON.stringify(state, null, 2));

// Always use worktree paths
import { getOmcStatePath } from '../lib/worktree-paths.js';
const statePath = getOmcStatePath('ralph-state.json');
```

### Testing Requirements

- Tests in `__tests__/` use `tmp` directories — never touch real worktree during tests

## Dependencies

### External
- `better-sqlite3` — SQLite in `job-state-db.ts`

<!-- MANUAL: -->
