# Radical Refactor: omc -> omc

**Date:** 2026-02-27
**Branch:** feat/radical-slimming
**Target:** v5.0.0

## Summary

A four-phase refactor that transforms omc into a lean, TypeScript-only project named `omc`. The rename reflects the project's philosophy: extreme simplification of an overly complex predecessor.

## Approach: Layered Commits

Each phase is a separate commit, independently reviewable and bisectable.

---

## Phase 1: Rename (omc -> omc)

**Goal:** The string `omc` should not appear anywhere in the codebase.

**Scope:**
- `package.json`: `"name": "omc"`
- `.claude-plugin/plugin.json`: update plugin name/id
- All skill `SKILL.md` files: `omc:` prefix -> `omc:`
- `docs/CLAUDE.md`: all references updated
- `src/` TypeScript (~20 files): string literals
- `scripts/` (~4 files): references
- `agents/*.md` (~9 files): references
- `README.md`, root `AGENTS.md`
- `templates/` files

**Rules:**
- Skill prefix: `omc:autopilot` -> `omc:autopilot`
- Product name in prose: `omc` -> `omc`
- README notes omc is forked from and is short for omc

---

## Phase 2: Deletion & Cleanup

### Docs to remove
- `docs/MIGRATION.md`
- `docs/COMPATIBILITY.md`
- `docs/PERFORMANCE-MONITORING.md`
- `docs/LOCAL_PLUGIN_INSTALL.md`
- `docs/design/` (entire directory)

### Docs to keep
- `docs/ARCHITECTURE.md`
- `docs/CLAUDE.md`
- `docs/FEATURES.md`
- `docs/REFERENCE.md`
- `docs/agent-templates/`
- `docs/plans/` (this file)

### Skills to remove (9)
| Skill | Reason |
|---|---|
| `omc-setup` | Replaced by `omc setup` CLI |
| `omc-doctor` | Replaced by `omc setup` CLI (diagnostics folded in) |
| `omc-help` | Generic help, not needed as a skill |
| `learn-about-omc` | Usage pattern analysis, unnecessary |
| `hud` | HUD system already removed |
| `mcp-setup` | Should be CLI-driven if needed |
| `release` | Internal release workflow |
| `skill` | Meta skill manager, unnecessary |
| `project-session-manager` | Complex shell scripts, use built-in worktrees |

### Skills to keep (~24)
- Core workflows: `autopilot`, `ralph`, `ralph-init`, `ralplan`, `ultrawork`, `ultraqa`, `pipeline`, `plan`, `team`, `sciomc`
- Agent shortcuts: `analyze`, `tdd`, `build-fix`, `code-review`, `security-review`, `review`
- Utilities: `cancel`, `note`, `learner`, `trace`, `deepinit`, `external-context`, `writer-memory`

### Backward-compat code to remove
- Deprecated agent aliases in `src/agents/definitions.ts`
- Legacy detection/cleanup code in installer
- v2/v3 migration logic
- Old hook format templates in `templates/`

---

## Phase 3: Convert scripts/ to TypeScript

**Current state:** 27 `.mjs`/`.cjs`/`.sh` files in `scripts/`.

**Target state:**
- All `.mjs` files -> `.ts` files (1:1 conversion)
- `run.cjs` -> `run.ts`
- Remove any `.sh` files (replace with TS equivalents)
- Update `hooks/hooks.json` to point to `.ts` files
- Bun executes `.ts` natively, no compilation step

**Approach:** Add type annotations, replace `require()` with `import`, use proper TypeScript types. No structural changes to hook logic.

---

## Phase 4: CLI Rewrite

### New CLI surface

```
omc setup     # The single interactive setup command
omc --version # Show version
omc --help    # Show help
```

### `omc setup` flow (using @clack/prompts)

```
1. intro("omc setup")
2. Detect existing installation
   - Check ~/.claude/CLAUDE.md for OMC markers
   - Check ~/.claude/.omc-config.json
   - If found: "Existing installation detected. Reconfigure?"
3. CLAUDE.md installation
   - select: Install to ~/.claude/CLAUDE.md (global) or .claude/CLAUDE.md (project)?
   - Copy docs/CLAUDE.md to chosen location (merge with existing if OMC markers found)
4. Execution mode preference
   - select: Default execution mode? (ultrawork / team / autopilot)
   - Write to ~/.claude/.omc-config.json
5. Diagnostics (always run)
   - Check for legacy hooks, stale cache, orphaned files
   - Auto-fix or report issues
6. outro("Setup complete!")
```

### Files to create/modify
- New: `src/cli/setup.ts` - setup command logic
- Rewrite: `src/cli/index.ts` - minimal (just `omc setup` + version/help)
- Add dep: `@clack/prompts`

### Files to remove
- `src/cli/commands/doctor-conflicts.ts`
- `src/cli/commands/teleport.ts`
- `src/cli/launch.ts`
- `src/cli/win32-warning.ts` (if unused after cleanup)
- `src/features/auto-update.ts` (and related auto-update logic)

### Dependencies
- Keep: `commander`, `chalk`
- Add: `@clack/prompts`
- Remove: any deps only used by removed code

---

## Non-goals

- No backward compatibility with omc installations
- No migration paths from old versions
- No agent alias backward compat
- No auto-update system (users update via plugin marketplace)
