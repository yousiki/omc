<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# scripts/lib/

## Purpose

Shared utility modules used by multiple hook scripts. These lightweight helpers avoid duplication across the `.mjs` scripts in the parent directory.

## Key Files

| File | Description |
|------|-------------|
| `atomic-write.mjs` | Atomic file write utility (write-then-rename pattern) |
| `stdin.mjs` | stdin reading helper for hook input processing |

## For AI Agents

### Working In This Directory

- Keep utilities minimal and focused — these run in hook context with limited startup time
- Prefer synchronous operations where possible (hooks are often time-sensitive)
- Use `.mjs` extension for ESM compatibility

## Dependencies

### Internal
- Used by scripts in `scripts/`

<!-- MANUAL: -->
