<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/hud/

## Purpose

Heads-Up Display (HUD) — the Claude Code statusline component. Reads session state, active modes, usage statistics, and transcript data to render a formatted status line displayed at the bottom of Claude Code's terminal UI.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Main entry point — reads stdin, computes state, renders output |
| `render.ts` | Renders HUD elements into a formatted statusline string |
| `state.ts` | HUD state management (reads/writes HUD state file) |
| `omc-state.ts` | Reads OMC mode states (ralph, ultrawork, autopilot, PRD) |
| `stdin.ts` | Reads stdin JSON from Claude Code's statusline protocol |
| `transcript.ts` | Parses Claude Code transcript for session context |
| `types.ts` | TypeScript types for HUD render context and session health |
| `colors.ts` | Terminal color definitions for HUD elements |
| `usage-api.ts` | Fetches token usage statistics |
| `custom-rate-provider.ts` | Custom cost rate provider for usage display |
| `sanitize.ts` | Sanitizes output for terminal display |
| `background-tasks.ts` | Tracks background task count for HUD display |
| `background-cleanup.ts` | Cleans up stale background task entries |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `elements/` | Individual HUD display element implementations |

## For AI Agents

### Working In This Directory

- HUD receives JSON on stdin from Claude Code's `--statusline` mechanism
- Output is a single line of terminal-formatted text returned on stdout
- `index.ts` orchestrates: read stdin → parse transcript → get state → render → sanitize → print
- HUD state is stored in the worktree at `.omc/state/hud-state.json`

### Testing Requirements

- Test render functions with mock `HudRenderContext` objects
- Ensure sanitize handles terminal escape sequences correctly

### Common Patterns

```typescript
// HUD render pipeline in index.ts
const stdin = await readStdin();
const state = await readHudState();
const omcState = await readRalphStateForHud();
const output = render(context);
console.log(sanitizeOutput(output));
```

## Dependencies

### Internal
- `src/features/auto-update.ts` — version comparison for update indicator
- `src/lib/version.ts` — runtime package version

### External
- `chalk` — terminal color formatting

<!-- MANUAL: -->
