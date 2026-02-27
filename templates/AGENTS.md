<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# templates/

## Purpose

Template files that are copied or referenced during installation and project setup. Contains hook script templates and coding rule definitions injected into Claude Code sessions via the rules-injector hook.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `hooks/` | Hook script templates used during installation (see `hooks/AGENTS.md`) |
| `rules/` | Coding style and workflow rules injected into Claude sessions (see `rules/AGENTS.md`) |

## For AI Agents

### Working In This Directory

- Templates are static files; changes here affect new installations only
- Hook templates generate scripts in `scripts/` on install
- Rule templates are injected via the `rules-injector` hook into Claude's context

## Dependencies

### Internal
- `src/installer/` reads these during setup
- `src/hooks/rules-injector/` injects rules at session start

<!-- MANUAL: -->
