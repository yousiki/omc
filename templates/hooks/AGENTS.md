<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# templates/hooks/

## Purpose

Template hook scripts that are copied to the user's Claude Code hooks directory during installation. These are the source templates from which the installed `.mjs` scripts are generated.

## Key Files

| File | Description |
|------|-------------|
| `pre-tool-use.mjs` | PreToolUse hook template |
| `post-tool-use.mjs` | PostToolUse hook template |
| `post-tool-use-failure.mjs` | PostToolUse failure template |
| `session-start.mjs` | SessionStart hook template |
| `stop-continuation.mjs` | Stop hook continuation template |
| `keyword-detector.mjs` | Keyword detection hook template |
| `code-simplifier.mjs` | Code simplifier hook template |
| `persistent-mode.mjs` | Persistent mode hook template |
| `pre-compact.mjs` | Pre-compact hook template |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `lib/` | Shared library templates copied to `scripts/lib/` |

## For AI Agents

### Working In This Directory

- Templates are installed verbatim — no templating engine is applied
- Changes here require reinstallation to take effect
- Keep parity between templates here and installed scripts in `scripts/`

## Dependencies

### Internal
- Installed by `src/installer/hooks.ts`
- Final installed output lives in `scripts/`

<!-- MANUAL: -->
