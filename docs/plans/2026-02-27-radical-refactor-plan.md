# Radical Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform oh-my-claudecode into a lean, TypeScript-only project named `omc` across four phases.

**Architecture:** Layered commits—each phase is independently reviewable and bisectable. Phase 1 renames, Phase 2 deletes, Phase 3 converts JS to TS, Phase 4 rewrites the CLI.

**Tech Stack:** TypeScript, Bun, Commander.js, @clack/prompts, chalk

---

## Task 1: Rename oh-my-claudecode -> omc in config files

**Files:**
- Modify: `package.json:2`
- Modify: `.claude-plugin/plugin.json:2,6,8,9`
- Modify: `.claude-plugin/marketplace.json:11,20`

**Step 1: Update package.json name**

In `package.json`, change:
```json
"name": "oh-my-claudecode",
```
to:
```json
"name": "omc",
```

**Step 2: Update plugin.json**

In `.claude-plugin/plugin.json`, replace all occurrences of `oh-my-claudecode` with `omc`.

**Step 3: Update marketplace.json**

In `.claude-plugin/marketplace.json`, replace all occurrences of `oh-my-claudecode` with `omc`.

**Step 4: Verify**

Run: `grep -r "oh-my-claudecode" package.json .claude-plugin/`
Expected: No matches

**Step 5: Commit**

```bash
git add package.json .claude-plugin/
git commit -m "refactor: rename oh-my-claudecode to omc in package and plugin configs"
```

---

## Task 2: Rename oh-my-claudecode -> omc in all skill SKILL.md files

**Files:**
- Modify: All `skills/*/SKILL.md` files (24 remaining skills after cleanup + 9 being removed will be deleted in Phase 2)
- Modify: `skills/AGENTS.md`

**Step 1: Global replace in all SKILL.md files**

Replace `oh-my-claudecode:` with `omc:` and `oh-my-claudecode` (standalone) with `omc` in every file under `skills/`.

The key patterns to replace:
- `/oh-my-claudecode:` -> `/omc:` (slash command invocations)
- `"oh-my-claudecode:` -> `"omc:` (Task subagent_type strings)
- `oh-my-claudecode:` -> `omc:` (agent prefix references)
- `oh-my-claudecode` (standalone, in prose) -> `omc`

**Step 2: Verify**

Run: `grep -r "oh-my-claudecode" skills/`
Expected: No matches

**Step 3: Commit**

```bash
git add skills/
git commit -m "refactor: rename oh-my-claudecode to omc in all skill files"
```

---

## Task 3: Rename oh-my-claudecode -> omc in docs/

**Files:**
- Modify: `docs/CLAUDE.md` (~10 occurrences across lines 3,5,40-42,55,122,192,244,273)
- Modify: `docs/AGENTS.md` (lines 6,12,75)
- Modify: `docs/FEATURES.md` (lines 3,347)
- Modify: `docs/ARCHITECTURE.md` (lines 3,7,73,121)
- Modify: `docs/REFERENCE.md` (~50 occurrences)
- Modify: `docs/plans/2026-02-27-radical-refactor-design.md`

Note: `docs/MIGRATION.md`, `docs/COMPATIBILITY.md`, `docs/PERFORMANCE-MONITORING.md`, `docs/LOCAL_PLUGIN_INSTALL.md`, `docs/design/` will be deleted in Phase 2, so skip renaming those.

**Step 1: Replace in docs that will be kept**

Apply the same replacement rules as Task 2 to all docs files listed above.

For `docs/CLAUDE.md` specifically, this is the canonical CLAUDE.md injected into user configs. Ensure:
- `oh-my-claudecode:` prefix -> `omc:` in agent catalog, skills, and examples
- `oh-my-claudecode` in prose -> `omc`
- The OMC:VERSION marker can stay as-is (it's a version tag)

**Step 2: Verify**

Run: `grep -r "oh-my-claudecode" docs/CLAUDE.md docs/AGENTS.md docs/FEATURES.md docs/ARCHITECTURE.md docs/REFERENCE.md docs/plans/`
Expected: No matches

**Step 3: Commit**

```bash
git add docs/
git commit -m "refactor: rename oh-my-claudecode to omc in documentation"
```

---

## Task 4: Rename oh-my-claudecode -> omc in agents/ and templates/

**Files:**
- Modify: `agents/quality-reviewer.md:51`
- Modify: `agents/planner.md:32,51,94`
- Modify: `agents/deep-executor.md:57`
- Modify: `agents/executor.md:54`
- Modify: `agents/designer.md:50`
- Modify: `agents/architect.md:56`
- Modify: `agents/test-engineer.md:52`
- Modify: `agents/security-reviewer.md:58`
- Modify: `agents/code-reviewer.md:52`
- Modify: `templates/rules/README.md:25`
- Modify: `templates/hooks/keyword-detector.mjs:168,188`
- Modify: `templates/hooks/lib/atomic-write.mjs:2`
- Modify: `templates/hooks/lib/stdin.mjs:4`
- Modify: `templates/hooks/code-simplifier.mjs:81`
- Modify: `templates/hooks/session-start.mjs:203,221,239`
- Modify: `templates/hooks/pre-tool-use.mjs:77,144`
- Modify: `templates/hooks/persistent-mode.mjs:366,443,520,543,571,609,647,683,733`

**Step 1: Replace in all agents/ files**

Replace `oh-my-claudecode` with `omc` in all 9 agent .md files.

**Step 2: Replace in all templates/ files**

Replace `oh-my-claudecode` with `omc` in all templates/ files. Key runtime-significant changes:
- `templates/hooks/session-start.mjs:203` — `pkg?.name === 'oh-my-claudecode'` -> `pkg?.name === 'omc'`
- `templates/hooks/persistent-mode.mjs` — all skill invocation strings

**Step 3: Verify**

Run: `grep -r "oh-my-claudecode" agents/ templates/`
Expected: No matches

**Step 4: Commit**

```bash
git add agents/ templates/
git commit -m "refactor: rename oh-my-claudecode to omc in agents and templates"
```

---

## Task 5: Rename oh-my-claudecode -> omc in scripts/

**Files:**
- Modify: `scripts/keyword-detector.mjs:199,219`
- Modify: `scripts/lib/atomic-write.mjs:2`
- Modify: `scripts/lib/stdin.mjs:4`
- Modify: `scripts/plugin-setup.mjs:62,65,87-89`
- Modify: `scripts/post-tool-verifier.mjs:283`
- Modify: `scripts/find-node.sh:86`
- Modify: `scripts/code-simplifier.mjs:74`
- Modify: `scripts/session-start.mjs:179,284,422`
- Modify: `scripts/persistent-mode.mjs:325,398,475,497,525,563,601,637,688`
- Modify: `scripts/persistent-mode.cjs:252,322,361,381,403,425,445,482`
- Modify: `scripts/run.cjs:45,60,66`

**Step 1: Replace in all scripts/ files**

Runtime-significant changes that affect logic:
- `scripts/run.cjs:60,66` — plugin cache path detection uses `oh-my-claudecode` in path pattern
- `scripts/session-start.mjs:179` — npm registry URL contains `oh-my-claudecode`
- `scripts/plugin-setup.mjs:87-89` — checks `pkg?.name === 'oh-my-claudecode'`
- `scripts/persistent-mode.mjs` and `.cjs` — skill invocation strings like `/oh-my-claudecode:cancel`

**Step 2: Verify**

Run: `grep -r "oh-my-claudecode" scripts/`
Expected: No matches

**Step 3: Commit**

```bash
git add scripts/
git commit -m "refactor: rename oh-my-claudecode to omc in hook scripts"
```

---

## Task 6: Rename oh-my-claudecode -> omc in src/

**Files (runtime-significant, grouped by function):**

Identity/path:
- `src/utils/paths.ts:66,69,72` — plugin cache path builder
- `src/features/auto-update.ts:23` — `REPO_NAME = 'oh-my-claudecode'` constant
- `src/installer/index.ts:114,155,159,170,610-612,628,653,668,671` — `isOmcHook()` regex, user-facing strings
- `src/cli/index.ts:116,144,956,1242,1262,1267` — CLI description and help strings

Prefix normalization:
- `src/hooks/skill-state/index.ts:16,123,190` — `.replace(/^oh-my-claudecode:/, '')`
- `src/features/delegation-enforcer.ts:64,65,168,173` — agent type normalization
- `src/hooks/subagent-tracker/index.ts:885,934,972,1054,1147,1170` — prefix detection
- `src/hooks/subagent-tracker/session-replay.ts:185,206` — prefix in replay
- `src/hooks/auto-slash-command/constants.ts:20,24-28` — hardcoded skill exclusion list

Hook/mode logic:
- `src/hooks/persistent-mode/index.ts:7,570,725,769` — skill invocation strings
- `src/hooks/ralph/loop.ts:4,286` — skill references
- `src/hooks/ralph/verifier.ts:11,201,232` — agent type prefixes
- `src/hooks/ralph/prd.ts:430` — agent type prefix
- `src/hooks/autopilot/prompts.ts:23,45,101,139,189,192,195,246,255,289,306,323` — prompt strings with agent prefixes
- `src/hooks/autopilot/validation.ts:167,184,201` — agent prefixes
- `src/hooks/autopilot/state.ts:593,596,599` — agent prefixes
- `src/hooks/ultraqa/index.ts:173` — skill reference
- `src/hooks/learner/detector.ts:282` — prefix
- `src/hooks/code-simplifier/index.ts:145` — prefix
- `src/hooks/todo-continuation/index.ts:186,211,225,248` — prefix
- `src/hooks/bridge.ts:896` — prefix
- `src/hooks/mode-registry/index.ts:257` — prefix
- `src/features/task-decomposer/index.ts:706-718` — agent type strings
- `src/features/continuation-enforcement.ts:115` — prefix

Other:
- `src/index.ts:245`
- `src/lib/atomic-write.ts:2`
- `src/commands/index.ts:124,153`
- `src/tools/resume-session.ts:61`
- `src/hud/usage-api.ts:90`
- `src/hud/index.ts:5`
- `src/hud/custom-rate-provider.ts:47`
- `src/hud/elements/skills.ts:24`
- `src/hud/elements/agents.ts:141,295`
- `src/cli/README.md:7,10`
- `src/installer/hooks.ts:283`
- `src/AGENTS.md:6`
- `src/features/AGENTS.md:6`
- `src/agents/AGENTS.md:10`
- `src/features/verification/README.md:150`

Test files (~25 files, patterns will be covered by global replace):
- All `src/__tests__/*.test.ts` and `src/hooks/*/__tests__/*.test.ts` files

**Step 1: Replace in all src/ files**

Global replace `oh-my-claudecode` -> `omc` across all files in `src/`. The key patterns:
- `'oh-my-claudecode:'` -> `'omc:'` (string literals for prefixes)
- `"oh-my-claudecode"` -> `"omc"` (package name)
- `/oh-my-claudecode:/` -> `/omc:/` (regex patterns)
- `oh-my-claudecode` in comments/docs -> `omc`

**Step 2: Verify**

Run: `grep -r "oh-my-claudecode" src/`
Expected: No matches

**Step 3: Verify TypeScript compiles**

Run: `bun run typecheck`
Expected: No errors (or only pre-existing errors unrelated to rename)

**Step 4: Run tests**

Run: `bun test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add src/
git commit -m "refactor: rename oh-my-claudecode to omc in all TypeScript source"
```

---

## Task 7: Rename in root files and final verification

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

**Step 1: Update README.md**

Replace all `oh-my-claudecode` with `omc`. Add a note near the top:
> omc (short for oh-my-claudecode) is a fork of the original project, rebuilt with a focus on simplicity.

**Step 2: Update root AGENTS.md**

Replace `oh-my-claudecode` with `omc`.

**Step 3: Final global verification**

Run: `grep -r "oh-my-claudecode" --include="*.ts" --include="*.js" --include="*.mjs" --include="*.cjs" --include="*.md" --include="*.json" --include="*.sh" .`
Expected: No matches in any tracked file (git-ignored files like node_modules are fine)

**Step 4: Commit**

```bash
git add README.md AGENTS.md
git commit -m "refactor: complete oh-my-claudecode -> omc rename in root files"
```

---

## Task 8: Delete unnecessary docs

**Files:**
- Delete: `docs/MIGRATION.md`
- Delete: `docs/COMPATIBILITY.md`
- Delete: `docs/PERFORMANCE-MONITORING.md`
- Delete: `docs/LOCAL_PLUGIN_INSTALL.md`
- Delete: `docs/design/AGENTS.md`
- Delete: `docs/design/project-session-manager.md`
- Delete: `docs/design/` (directory)

**Step 1: Remove the files**

```bash
rm docs/MIGRATION.md docs/COMPATIBILITY.md docs/PERFORMANCE-MONITORING.md docs/LOCAL_PLUGIN_INSTALL.md
rm -rf docs/design/
```

**Step 2: Check for broken references**

Run: `grep -r "MIGRATION.md\|COMPATIBILITY.md\|PERFORMANCE-MONITORING.md\|LOCAL_PLUGIN_INSTALL.md" docs/ src/ skills/ README.md`
Expected: No matches (or update any references found)

**Step 3: Commit**

```bash
git add -A docs/
git commit -m "chore: remove obsolete docs (migration, compat, perf-monitoring, local-install, design)"
```

---

## Task 9: Delete unnecessary skills

**Files:**
- Delete: `skills/omc-setup/` (entire directory)
- Delete: `skills/omc-doctor/` (entire directory)
- Delete: `skills/omc-help/` (entire directory)
- Delete: `skills/learn-about-omc/` (entire directory)
- Delete: `skills/hud/` (entire directory)
- Delete: `skills/mcp-setup/` (entire directory)
- Delete: `skills/release/` (entire directory)
- Delete: `skills/skill/` (entire directory)
- Delete: `skills/project-session-manager/` (entire directory, includes 14 extra shell/template files)

**Step 1: Remove skill directories**

```bash
rm -rf skills/omc-setup skills/omc-doctor skills/omc-help skills/learn-about-omc skills/hud skills/mcp-setup skills/release skills/skill skills/project-session-manager
```

**Step 2: Update skills/AGENTS.md**

Remove the rows for all 9 deleted skills from the skill table.

**Step 3: Update docs/CLAUDE.md**

In the `<skills>` section, remove `omc-setup`, `mcp-setup`, `hud`, `omc-doctor`, `omc-help` from the Utilities line. Remove `project-session-manager` and its `psm` alias. Remove `skill`. Remove `release`. Remove `learn-about-omc`.

The Utilities line should become:
```
Utilities: `cancel`, `note`, `learner`, `trace`, `writer-memory`, `ralph-init`
```

**Step 4: Update docs/REFERENCE.md**

Remove entries for all 9 deleted skills from the reference tables.

**Step 5: Commit**

```bash
git add -A skills/ docs/
git commit -m "chore: remove 9 unnecessary skills (omc-setup, omc-doctor, omc-help, learn-about-omc, hud, mcp-setup, release, skill, project-session-manager)"
```

---

## Task 10: Update tests that reference deleted skills

**Files:**
- Modify: `src/__tests__/skills.test.ts` — update expected skill count (33 -> 24) and remove deleted skill names
- Modify: `src/__tests__/consolidation-contracts.test.ts:42-43` — remove `omc-doctor` and `omc-help` assertions
- Modify: `src/skills/__tests__/mingw-escape.test.ts` — remove `describe` blocks for `omc-setup` and `hud` SKILL.md content tests
- Modify: `src/__tests__/hud-windows.test.ts:168-182` — remove checks that read `skills/hud/SKILL.md` and `skills/omc-doctor/SKILL.md`
- Modify: `src/__tests__/tier0-docs-consistency.test.ts:51-52` — remove `project-session-manager` assertion
- Modify: `src/__tests__/auto-slash-aliases.test.ts` — remove PSM-related test cases

**Step 1: Update each test file**

For each file, remove or update assertions that reference deleted skills. Adjust expected counts.

**Step 2: Run tests**

Run: `bun test`
Expected: All tests pass

**Step 3: Commit**

```bash
git add src/__tests__/ src/skills/__tests__/
git commit -m "test: update tests for removed skills"
```

---

## Task 11: Remove backward-compatibility code

**Files:**
- Modify: `src/agents/definitions.ts` — remove deprecated alias exports (`researcherAgent`, `tddGuideAgentAlias`) and deprecated routing text from `omcSystemPrompt`
- Modify: `src/installer/index.ts` — remove legacy hook detection/cleanup code, simplify `isOmcHook()` regex
- Modify: `src/installer/hooks.ts` — remove deprecated `getHookScripts()`, `getHooksSettingsConfig()`, `shouldUseNodeHooks()`
- Modify: `src/hooks/skill-state/index.ts` — remove entries for deleted skills from protection tier map
- Modify: `src/hooks/auto-slash-command/constants.ts` — remove deleted skills from exclusion list
- Modify: `src/cli/index.ts` — remove references to `/omc:omc-setup` and `/omc:omc-doctor` in help strings
- Modify: `src/hud/index.ts` — remove omc-setup fallback references
- Modify: `src/cli/commands/doctor-conflicts.ts` — remove omc-setup references (file will be deleted in Phase 4, but clean up references now)
- Delete: `src/features/auto-update.ts` (960 lines — entire auto-update system)
- Modify: `src/features/AGENTS.md` — remove auto-update references

**Step 1: Remove deprecated aliases in definitions.ts**

Remove:
- The `researcherAgent` -> `documentSpecialistAgent` alias export
- The `tddGuideAgentAlias` -> `testEngineerAgent` alias export
- The deprecated aliases paragraph from `omcSystemPrompt`:
  ```
  Deprecated aliases (backward compatibility only): `researcher` -> `document-specialist`, ...
  ```

**Step 2: Remove auto-update.ts**

```bash
rm src/features/auto-update.ts
```

Update all imports of auto-update in `src/cli/index.ts` — remove the import and all `update`/`update-reconcile` command definitions.

**Step 3: Clean up installer backward-compat**

In `src/installer/index.ts`:
- Simplify `isOmcHook()` to use `omc` pattern instead of `oh-my-claudecode`
- Remove any legacy bash hook cleanup code
- Remove `CORE_COMMANDS` empty array and its usage

In `src/installer/hooks.ts`:
- Remove deprecated `getHookScripts()`, `getHooksSettingsConfig()`, `shouldUseNodeHooks()`
- Keep the mode message constants (ULTRAWORK_MESSAGE, RALPH_MESSAGE, etc.) as they're still used

**Step 4: Clean up skill-state and auto-slash-command**

In `src/hooks/skill-state/index.ts`: Remove entries for `omc-setup`, `omc-doctor`, `omc-help`, `learn-about-omc`, `hud`, `mcp-setup`, `release`, `skill`, `project-session-manager` from the protection tier map.

In `src/hooks/auto-slash-command/constants.ts`: Remove deleted skills from the exclusion list.

**Step 5: Verify TypeScript compiles**

Run: `bun run typecheck`
Expected: No errors

**Step 6: Run tests**

Run: `bun test`
Expected: All tests pass (update any failing tests referencing auto-update or deprecated aliases)

**Step 7: Commit**

```bash
git add -A src/
git commit -m "refactor: remove backward-compat code, deprecated aliases, and auto-update system"
```

---

## Task 12: Convert scripts/lib/ to TypeScript

**Files:**
- Convert: `scripts/lib/stdin.mjs` -> `scripts/lib/stdin.ts` (64 lines)
- Convert: `scripts/lib/atomic-write.mjs` -> `scripts/lib/atomic-write.ts` (95 lines)
- Delete: `scripts/lib/AGENTS.md` (documentation, not needed)

**Step 1: Convert stdin.mjs to stdin.ts**

Rename file and add types:
- Add explicit return type `Promise<string>` to the `readStdin` function
- Replace `const { setTimeout } = require('timers')` with ES import if present
- Add types to all parameters

**Step 2: Convert atomic-write.mjs to atomic-write.ts**

Rename and add types:
- Add explicit parameter and return types
- Replace any `require()` calls with ES imports

**Step 3: Update all importers**

Every `.mjs` script that imports `./lib/stdin.mjs` or `./lib/atomic-write.mjs` needs its import path updated. This will be done as each script is converted in subsequent tasks, but for now update any remaining `.mjs` files that import from lib.

**Step 4: Verify**

Run: `bun scripts/lib/stdin.ts` (should not crash on import)
Run: `bun scripts/lib/atomic-write.ts` (should not crash on import)

**Step 5: Commit**

```bash
git add scripts/lib/
git commit -m "refactor: convert scripts/lib/ from .mjs to TypeScript"
```

---

## Task 13: Convert thin-shim scripts to TypeScript

These scripts are ~21 lines each and just delegate to src/hooks/:

**Files:**
- Convert: `scripts/permission-handler.mjs` -> `scripts/permission-handler.ts`
- Convert: `scripts/pre-compact.mjs` -> `scripts/pre-compact.ts`
- Convert: `scripts/session-end.mjs` -> `scripts/session-end.ts`
- Convert: `scripts/setup-init.mjs` -> `scripts/setup-init.ts`
- Convert: `scripts/setup-maintenance.mjs` -> `scripts/setup-maintenance.ts`
- Convert: `scripts/subagent-tracker.mjs` -> `scripts/subagent-tracker.ts`
- Convert: `scripts/project-memory-precompact.mjs` -> `scripts/project-memory-precompact.ts`
- Convert: `scripts/project-memory-session.mjs` -> `scripts/project-memory-session.ts`
- Convert: `scripts/project-memory-posttool.mjs` -> `scripts/project-memory-posttool.ts`

**Step 1: Convert each file**

For each file: rename `.mjs` -> `.ts`, add types to the stdin input and dynamic imports, update `./lib/stdin.mjs` import to `./lib/stdin.ts`.

**Step 2: Update hooks/hooks.json**

For each converted script, update the command in `hooks/hooks.json` from `.mjs` to `.ts`.

**Step 3: Commit**

```bash
git add scripts/ hooks/
git commit -m "refactor: convert thin-shim hook scripts from .mjs to TypeScript"
```

---

## Task 14: Convert medium hook scripts to TypeScript

These have inline logic (100-300 lines):

**Files:**
- Convert: `scripts/context-safety.mjs` -> `scripts/context-safety.ts` (100 lines)
- Convert: `scripts/context-guard-stop.mjs` -> `scripts/context-guard-stop.ts` (181 lines)
- Convert: `scripts/post-tool-use-failure.mjs` -> `scripts/post-tool-use-failure.ts` (177 lines)
- Convert: `scripts/verify-deliverables.mjs` -> `scripts/verify-deliverables.ts` (234 lines)
- Convert: `scripts/code-simplifier.mjs` -> `scripts/code-simplifier.ts` (193 lines)
- Convert: `scripts/skill-injector.mjs` -> `scripts/skill-injector.ts` (290 lines)
- Convert: `scripts/plugin-setup.mjs` -> `scripts/plugin-setup.ts` (205 lines)

**Step 1: Convert each file**

For each: rename `.mjs` -> `.ts`, add explicit types to all functions/variables, update lib imports, replace any `require()` with ES imports.

**Step 2: Update hooks/hooks.json**

Update all command references from `.mjs` to `.ts`.

**Step 3: Verify TypeScript compiles**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add scripts/ hooks/
git commit -m "refactor: convert medium hook scripts from .mjs to TypeScript"
```

---

## Task 15: Convert large hook scripts to TypeScript

These are 300+ line scripts with significant inline logic:

**Files:**
- Convert: `scripts/pre-tool-enforcer.mjs` -> `scripts/pre-tool-enforcer.ts` (271 lines)
- Convert: `scripts/post-tool-verifier.mjs` -> `scripts/post-tool-verifier.ts` (439 lines)
- Convert: `scripts/keyword-detector.mjs` -> `scripts/keyword-detector.ts` (489 lines)
- Convert: `scripts/session-start.mjs` -> `scripts/session-start.ts` (499 lines)
- Convert: `scripts/persistent-mode.mjs` -> `scripts/persistent-mode.ts` (715 lines)

**Step 1: Convert each file**

These are the most complex conversions. For each:
- Rename `.mjs` -> `.ts`
- Add interfaces for hook input/output shapes
- Add types to all function parameters and return values
- Replace `require()` with ES imports
- Update lib imports

**Step 2: Delete persistent-mode.cjs**

Since we're converting to TypeScript, remove the CJS duplicate:
```bash
rm scripts/persistent-mode.cjs
```
Update `hooks/hooks.json` to point to `persistent-mode.ts` instead of `persistent-mode.cjs`.

**Step 3: Update hooks/hooks.json**

Update all remaining command references.

**Step 4: Verify**

Run: `bun run typecheck`

**Step 5: Commit**

```bash
git add scripts/ hooks/
git commit -m "refactor: convert large hook scripts from .mjs to TypeScript"
```

---

## Task 16: Convert utility scripts and clean up

**Files:**
- Convert: `scripts/run.cjs` -> `scripts/run.ts` (114 lines)
- Convert: `scripts/cleanup-orphans.mjs` -> `scripts/cleanup-orphans.ts` (206 lines)
- Convert: `scripts/status.mjs` -> `scripts/status.ts` (144 lines)
- Delete: `scripts/find-node.sh` (90 lines — legacy Node finder, superseded by Bun)
- Delete: `scripts/uninstall.sh` (169 lines — we use plugin uninstall instead)
- Delete: `scripts/AGENTS.md` (documentation file)

**Step 1: Convert run.cjs to run.ts**

This is the universal hook entry point. Convert from CJS to TypeScript:
- Replace `require()` with ES imports
- Add types for process argv handling
- Update the `#!/usr/bin/env node` shebang (Bun handles `.ts` natively)

**Step 2: Convert utility scripts**

Convert `cleanup-orphans.mjs` and `status.mjs` to TypeScript.

**Step 3: Delete legacy scripts**

```bash
rm scripts/find-node.sh scripts/uninstall.sh scripts/AGENTS.md
```

**Step 4: Update hooks/hooks.json**

Change the universal entry point from `run.cjs` to `run.ts` in all hook commands.

**Step 5: Final verification of scripts/**

Run: `ls scripts/`
Expected: Only `.ts` files and `lib/` directory (which also contains only `.ts` files)

Run: `grep -r "\.mjs\|\.cjs\|\.sh" hooks/hooks.json`
Expected: No matches (all references should be `.ts`)

**Step 6: Commit**

```bash
git add scripts/ hooks/
git commit -m "refactor: convert remaining scripts to TypeScript, remove legacy shell scripts"
```

---

## Task 17: Install @clack/prompts and set up new CLI structure

**Files:**
- Modify: `package.json` — add `@clack/prompts` dependency
- Create: `src/cli/setup.ts` — new setup command
- Delete: `src/cli/commands/doctor-conflicts.ts`
- Delete: `src/cli/commands/teleport.ts`
- Delete: `src/cli/commands/__tests__/teleport.test.ts`
- Delete: `src/cli/__tests__/teleport-help.test.ts`
- Delete: `src/cli/launch.ts`
- Delete: `src/cli/win32-warning.ts`
- Delete: `src/cli/README.md`

**Step 1: Install @clack/prompts**

```bash
bun add @clack/prompts
```

**Step 2: Delete removed CLI files**

```bash
rm src/cli/commands/doctor-conflicts.ts src/cli/commands/teleport.ts
rm src/cli/commands/__tests__/teleport.test.ts src/cli/__tests__/teleport-help.test.ts
rm src/cli/launch.ts src/cli/win32-warning.ts src/cli/README.md
```

Remove `src/cli/commands/` directory if empty after deletion.

**Step 3: Create src/cli/setup.ts**

```typescript
import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { mergeClaudeMd } from '../installer/index.js';

const CLAUDE_DIR = join(homedir(), '.claude');
const OMC_CONFIG = join(CLAUDE_DIR, '.omc-config.json');

interface OmcConfig {
  setupComplete?: boolean;
  setupTimestamp?: string;
  defaultExecutionMode?: string;
  [key: string]: unknown;
}

function readConfig(): OmcConfig {
  if (existsSync(OMC_CONFIG)) {
    try {
      return JSON.parse(readFileSync(OMC_CONFIG, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function writeConfig(config: OmcConfig): void {
  mkdirSync(dirname(OMC_CONFIG), { recursive: true });
  writeFileSync(OMC_CONFIG, JSON.stringify(config, null, 2) + '\n');
}

export async function setupCommand(): Promise<void> {
  p.intro(chalk.bold('omc setup'));

  // Step 1: Detect existing installation
  const config = readConfig();
  const claudeMdGlobal = join(CLAUDE_DIR, 'CLAUDE.md');
  const claudeMdProject = join(process.cwd(), '.claude', 'CLAUDE.md');
  const hasExisting = config.setupComplete || existsSync(claudeMdGlobal);

  if (hasExisting) {
    const reconfigure = await p.confirm({
      message: 'Existing omc installation detected. Reconfigure?',
      initialValue: false,
    });
    if (p.isCancel(reconfigure) || !reconfigure) {
      p.outro('Setup cancelled.');
      return;
    }
  }

  // Step 2: CLAUDE.md installation target
  const target = await p.select({
    message: 'Where should omc install its CLAUDE.md?',
    options: [
      { value: 'global', label: `Global (~/.claude/CLAUDE.md)`, hint: 'applies to all projects' },
      { value: 'project', label: `Project (.claude/CLAUDE.md)`, hint: 'this project only' },
    ],
  });

  if (p.isCancel(target)) {
    p.outro('Setup cancelled.');
    return;
  }

  // Find the source CLAUDE.md from the plugin root
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || dirname(dirname(import.meta.dirname));
  const sourceMd = join(pluginRoot, 'docs', 'CLAUDE.md');

  if (!existsSync(sourceMd)) {
    p.log.error(`Could not find docs/CLAUDE.md at ${sourceMd}`);
    p.outro('Setup failed.');
    process.exit(1);
  }

  const sourceContent = readFileSync(sourceMd, 'utf-8');
  const targetPath = target === 'global' ? claudeMdGlobal : claudeMdProject;

  mkdirSync(dirname(targetPath), { recursive: true });

  if (existsSync(targetPath)) {
    const existing = readFileSync(targetPath, 'utf-8');
    const merged = mergeClaudeMd(existing, sourceContent);
    writeFileSync(targetPath, merged);
    p.log.success(`Updated ${targetPath}`);
  } else {
    writeFileSync(targetPath, sourceContent);
    p.log.success(`Installed ${targetPath}`);
  }

  // Step 3: Default execution mode
  const mode = await p.select({
    message: 'Default execution mode?',
    options: [
      { value: 'ultrawork', label: 'Ultrawork', hint: 'maximum parallelism' },
      { value: 'team', label: 'Team', hint: 'coordinated multi-agent' },
      { value: 'autopilot', label: 'Autopilot', hint: 'fully autonomous' },
    ],
  });

  if (p.isCancel(mode)) {
    p.outro('Setup cancelled.');
    return;
  }

  // Step 4: Save config
  const newConfig: OmcConfig = {
    ...config,
    setupComplete: true,
    setupTimestamp: new Date().toISOString(),
    defaultExecutionMode: mode as string,
  };
  writeConfig(newConfig);
  p.log.success('Configuration saved.');

  // Step 5: Diagnostics
  const s = p.spinner();
  s.start('Running diagnostics...');

  const issues: string[] = [];

  // Check for legacy hooks in settings.json
  const settingsFile = join(CLAUDE_DIR, 'settings.json');
  if (existsSync(settingsFile)) {
    try {
      const settings = JSON.parse(readFileSync(settingsFile, 'utf-8'));
      if (settings.hooks) {
        const hookStr = JSON.stringify(settings.hooks);
        if (hookStr.includes('omc') || hookStr.includes('oh-my-claudecode')) {
          issues.push('Legacy hook entries found in ~/.claude/settings.json — these are no longer needed (hooks are delivered via plugin)');
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Check for stale plugin cache versions
  const cacheDir = join(CLAUDE_DIR, 'plugins', 'cache', 'omc');
  if (existsSync(cacheDir)) {
    try {
      const { readdirSync } = await import('fs');
      const versions = readdirSync(cacheDir);
      if (versions.length > 1) {
        issues.push(`Multiple plugin versions in cache (${versions.join(', ')}). Consider removing old versions.`);
      }
    } catch { /* ignore */ }
  }

  // Check for orphaned files
  const legacyDirs = ['agents', 'commands', 'skills'].map(d => join(CLAUDE_DIR, d));
  for (const dir of legacyDirs) {
    if (existsSync(dir)) {
      issues.push(`Legacy directory found: ${dir} — may contain outdated files from curl-based install`);
    }
  }

  s.stop('Diagnostics complete.');

  if (issues.length > 0) {
    p.log.warn(`Found ${issues.length} issue(s):`);
    for (const issue of issues) {
      p.log.message(`  - ${issue}`);
    }
  } else {
    p.log.success('No issues found.');
  }

  p.outro(chalk.green('Setup complete!'));
}
```

**Step 4: Commit**

```bash
git add package.json bun.lockb src/cli/
git commit -m "feat: create omc setup command with @clack/prompts, remove old CLI files"
```

---

## Task 18: Rewrite src/cli/index.ts

**Files:**
- Rewrite: `src/cli/index.ts` — from 1294 lines to ~50 lines

**Step 1: Rewrite the CLI entry point**

```typescript
#!/usr/bin/env node

import { Command } from 'commander';
import { getRuntimePackageVersion } from '../lib/version.js';
import { setupCommand } from './setup.js';

const version = getRuntimePackageVersion();

const program = new Command();

program
  .name('omc')
  .description('omc — multi-agent orchestration for Claude Code')
  .version(version);

program
  .command('setup')
  .description('Configure omc (install CLAUDE.md, set preferences, run diagnostics)')
  .action(async () => {
    await setupCommand();
  });

program.parse();
```

**Step 2: Remove unused imports**

Delete all imports that were used by removed commands (auto-update, installer, teleport, doctor-conflicts, launch, etc.).

**Step 3: Verify**

Run: `bun src/cli/index.ts --version`
Expected: Prints version number

Run: `bun src/cli/index.ts setup --help`
Expected: Prints setup help

Run: `bun run typecheck`
Expected: No errors

**Step 4: Commit**

```bash
git add src/cli/index.ts
git commit -m "refactor: rewrite CLI to minimal omc setup entry point"
```

---

## Task 19: Clean up unused src/ modules

After removing the CLI commands and auto-update, some src/ modules may be orphaned.

**Files to evaluate for removal:**
- `src/cli/utils/formatting.ts` — check if still imported anywhere
- `src/cli/commands/` directory — should be empty, delete if so
- `src/hud/` — entire directory if HUD was already removed (verify)
- `src/features/auto-update.ts` — already deleted in Task 11
- `src/installer/hooks.ts` — evaluate if still needed after backward-compat removal
- Any test files for removed modules

**Step 1: Check for orphaned modules**

Run: `grep -r "from.*auto-update" src/` — should be empty
Run: `grep -r "from.*doctor-conflicts" src/` — should be empty
Run: `grep -r "from.*teleport" src/` — should be empty
Run: `grep -r "from.*launch" src/` — should be empty
Run: `grep -r "from.*win32-warning" src/` — should be empty

Remove any files that are no longer imported.

**Step 2: Clean up related test files**

Remove tests for deleted modules:
- `src/__tests__/auto-update.test.ts`
- `src/__tests__/hud-agents.test.ts` (if src/hud/ removed)
- `src/__tests__/hud-windows.test.ts` (if src/hud/ removed)
- `src/__tests__/hud/skills.test.ts` (if src/hud/ removed)
- Any other orphaned test files

**Step 3: Verify**

Run: `bun run typecheck`
Run: `bun test`

**Step 4: Commit**

```bash
git add -A src/
git commit -m "chore: remove orphaned modules and tests after CLI/feature cleanup"
```

---

## Task 20: Final verification and cleanup

**Step 1: Global verification — no oh-my-claudecode references**

Run: `grep -r "oh-my-claudecode" --include="*.ts" --include="*.js" --include="*.mjs" --include="*.cjs" --include="*.md" --include="*.json" --include="*.sh" . | grep -v node_modules | grep -v .git`
Expected: Zero matches

**Step 2: No .mjs/.cjs/.sh in scripts/**

Run: `find scripts/ -name "*.mjs" -o -name "*.cjs" -o -name "*.sh"`
Expected: Zero matches

**Step 3: TypeScript compiles clean**

Run: `bun run typecheck`
Expected: No errors

**Step 4: All tests pass**

Run: `bun test`
Expected: All pass

**Step 5: Plugin loads correctly**

Verify `.claude-plugin/plugin.json` is valid JSON and references correct paths.

**Step 6: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final verification and cleanup for omc v5.0.0"
```
