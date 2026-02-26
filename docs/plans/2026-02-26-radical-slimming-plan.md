# Radical Slimming Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite oh-my-claudecode as a clean, minimal, bun-native TypeScript multi-agent orchestration plugin (~45 files, ~3MB) from the current 592-file, 47MB monolith.

**Architecture:** Layered migration — create new clean `src/` alongside old code, port module by module from old→new with rewrites, then delete old code. The plugin must work at every stage.

**Tech Stack:** Bun (runtime + package manager), TypeScript (strict), Biome (lint+format), Vitest (tests), MCP SDK, Claude Agent SDK, ast-grep, zod

---

## Phase 0: Preparation

### Task 0.1: Create feature branch from dev

**Files:**
- None (git operation only)

**Step 1: Create branch**

```bash
git checkout dev
git pull origin dev
git checkout -b feat/radical-slimming dev
```

**Step 2: Commit**

No commit needed — branch created.

---

## Phase 1: Foundation (Bun + Project Skeleton)

### Task 1.1: Initialize bun project and tooling config

**Files:**
- Modify: `package.json`
- Create: `biome.json`
- Modify: `tsconfig.json`
- Delete: `eslint.config.js`
- Delete: `package-lock.json`

**Step 1: Install bun (if not already installed)**

```bash
bun --version  # Verify bun is available
```

**Step 2: Update package.json for bun-native**

Replace the current package.json with a minimal bun-native version:
- Change `"main"` from `"dist/index.js"` to `"src/index.ts"`
- Remove all `build:*` scripts (no build step needed)
- Replace `"test": "vitest"` with `"test": "bun test"` (or keep vitest via bun)
- Remove `"prepare"` and `"prepublishOnly"` build hooks
- Remove `bin` entries pointing to `dist/cli/`
- Remove `"files"` array (or update to exclude dist/bridge)
- Change `"engines"` from `node >= 20` to document bun requirement
- Remove dependencies: `chalk`, `commander`, `safe-regex`, `jsonc-parser`
- Replace `better-sqlite3` with note to use `bun:sqlite`
- Remove `ajv` (consolidate with `zod`)
- Keep: `@anthropic-ai/claude-agent-sdk`, `@modelcontextprotocol/sdk`, `@ast-grep/napi`, `zod`, `vscode-languageserver-protocol`
- Move all `devDependencies` to use bun equivalents

**Step 3: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExcessiveCognitiveComplexity": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 120
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  }
}
```

**Step 4: Update tsconfig.json for bun**

Key changes:
- Keep `"strict": true`
- Set `"target": "ESNext"` (bun supports latest)
- Set `"module": "ESNext"`
- Set `"moduleResolution": "bundler"` (bun's resolution)
- Remove `"outDir"`, `"declaration"`, `"declarationMap"`, `"sourceMap"` (no build step)
- Add `"types": ["bun-types"]`
- Set `"rootDir": "."` (include scripts/ too)

**Step 5: Delete old config files**

```bash
rm -f eslint.config.js package-lock.json
```

**Step 6: Install dependencies with bun**

```bash
bun install
```

**Step 7: Verify**

```bash
bun run --help  # Verify bun works
```

**Step 8: Commit**

```bash
git add package.json biome.json tsconfig.json bun.lockb
git rm eslint.config.js package-lock.json
git commit -m "chore: switch to bun-native project with biome"
```

---

### Task 1.2: Create new src/ skeleton structure

**Files:**
- Create: `src-new/index.ts` (placeholder)
- Create: `src-new/agents/definitions.ts` (placeholder)
- Create: `src-new/agents/prompt.ts` (placeholder)
- Create: `src-new/hooks/bridge.ts` (placeholder)
- Create: `src-new/hooks/orchestrator.ts` (placeholder)
- Create: `src-new/features/boulder-state.ts` (placeholder)
- Create: `src-new/tools/lsp.ts` (placeholder)
- Create: `src-new/mcp/server.ts` (placeholder)
- Create: `src-new/hud/index.ts` (placeholder)
- Create: `src-new/utils/index.ts` (placeholder)

We use `src-new/` during migration to avoid conflicts with old `src/`. In Phase 9 we'll rename `src/` to `src-old/` and `src-new/` to `src/`.

**Step 1: Create directory structure**

```bash
mkdir -p src-new/{agents,hooks,features,tools,mcp,hud/elements,utils}
```

**Step 2: Create placeholder files**

Each placeholder exports a `// TODO: port from src/` comment and empty exports so the module structure compiles.

**Step 3: Commit**

```bash
git add src-new/
git commit -m "chore: create src-new/ skeleton for layered migration"
```

---

### Task 1.3: Port shared types and utilities

**Files:**
- Create: `src-new/types.ts`
- Create: `src-new/utils/index.ts`
- Reference: `src/shared/types.ts`, `src/lib/worktree-paths.ts`, `src/lib/mode-names.ts`

**Step 1: Create types.ts**

Port essential types from `src/shared/types.ts`:
- `AgentConfig` — `{ name: string; description: string; prompt: string; model: ModelType; defaultModel?: ModelType; disallowedTools?: string[] }`
- `ModelType` — `'haiku' | 'sonnet' | 'opus'`
- `HookInput` — normalized camelCase hook input
- `HookOutput` — `{ continue: boolean; message?: string; reason?: string; modifiedInput?: unknown }`
- `PluginConfig` — configuration shape
- `SessionState` — session tracking

Strip all team/notification/openclaw related types.

**Step 2: Create utils/index.ts**

Port essential utilities:
- `resolveWorktreeRoot(cwd: string): string` — from `src/lib/worktree-paths.ts` (runs `git rev-parse --show-toplevel`)
- `readJsonFile(path: string): unknown | null` — safe JSON reader
- `writeJsonFile(path: string, data: unknown): void` — atomic JSON writer
- `MODE_NAMES` constant — from `src/lib/mode-names.ts`, remove team/notification entries
- `readStdin(timeoutMs?: number): Promise<string>` — timeout-protected stdin reader (port from `scripts/lib/stdin.mjs` to TypeScript)

**Step 3: Verify**

```bash
bun run src-new/types.ts        # Should not error
bun run src-new/utils/index.ts  # Should not error
```

**Step 4: Commit**

```bash
git add src-new/types.ts src-new/utils/
git commit -m "feat: port shared types and utilities to src-new"
```

---

### Task 1.4: Port agent definitions and prompt loader

**Files:**
- Create: `src-new/agents/prompt.ts`
- Create: `src-new/agents/definitions.ts`
- Reference: `src/agents/utils.ts` (loadAgentPrompt), `src/agents/definitions.ts`

**Step 1: Create agents/prompt.ts**

Port `loadAgentPrompt()` from `src/agents/utils.ts`:
- Uses `Bun.file()` to read `agents/{name}.md`
- Returns the markdown content as a string
- Resolves path relative to project root (use `import.meta.dir`)
- Port `parseDisallowedTools()` if present in agent .md frontmatter

**Step 2: Create agents/definitions.ts**

Port from `src/agents/definitions.ts`:
- Define all 21 `AgentConfig` objects (explore, architect, planner, executor, deep-executor, critic, debugger, verifier, analyst, code-reviewer, quality-reviewer, security-reviewer, test-engineer, build-fixer, designer, writer, document-specialist, qa-tester, scientist, git-master, code-simplifier)
- Export `getAgentDefinitions(): Record<string, AgentConfig>`
- Export `omcSystemPrompt: string` (port the orchestrator system prompt)
- Remove all deprecated aliases (researcherAgent, etc.) — clean break
- Remove all backward compatibility code
- Each agent: `{ name, description, prompt: loadAgentPrompt(name), model, defaultModel }`

**Step 3: Verify**

```bash
bun -e "import { getAgentDefinitions } from './src-new/agents/definitions'; const agents = getAgentDefinitions(); console.log(Object.keys(agents).length, 'agents loaded')"
# Expected: 21 agents loaded
```

**Step 4: Commit**

```bash
git add src-new/agents/
git commit -m "feat: port 21 agent definitions to src-new"
```

---

### Task 1.5: Port plugin entry point

**Files:**
- Create: `src-new/index.ts`
- Reference: `src/index.ts`

**Step 1: Create minimal index.ts**

Port from `src/index.ts`, keeping only:
- `export { getAgentDefinitions, omcSystemPrompt } from './agents/definitions'`
- `export * from './types'`
- Config loading (simplified — read `.omc/config.json` or `~/.claude/.omc-config.json`)
- Remove: auto-update, boulder state exports (will be added back in later phases)
- Remove: all team/notification/openclaw exports

This is a minimal entry point that grows as we port more modules.

**Step 2: Verify**

```bash
bun -e "import { getAgentDefinitions } from './src-new/index'; console.log('Plugin entry OK')"
```

**Step 3: Commit**

```bash
git add src-new/index.ts
git commit -m "feat: port plugin entry point to src-new"
```

---

### Task 1.6: Update plugin configuration for bun

**Files:**
- Modify: `.mcp.json`
- Modify: `.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`

**Step 1: Update .mcp.json**

Change from:
```json
{
  "mcpServers": {
    "t": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/bridge/mcp-server.cjs"] },
    "team": { "command": "node", "args": ["${CLAUDE_PLUGIN_ROOT}/bridge/team-mcp.cjs"] }
  }
}
```

To:
```json
{
  "mcpServers": {
    "t": { "command": "bun", "args": ["run", "${CLAUDE_PLUGIN_ROOT}/src-new/mcp/server.ts"] }
  }
}
```

Remove `team` server entirely.

**Step 2: Update plugin.json**

Update version, description. Skills path remains `./skills/`.

**Step 3: Update marketplace.json**

Update agent count (21), skill count (28), description.

**Step 4: Commit**

```bash
git add .mcp.json .claude-plugin/
git commit -m "chore: update plugin config for bun-native runtime"
```

---

## Phase 2: Core Loop (Hook Bridge + Orchestrator + Delegation)

### Task 2.1: Port hook bridge (bun-native)

**Files:**
- Create: `src-new/hooks/bridge.ts`
- Create: `scripts/hook-entry.ts` (replaces run.cjs + *.mjs pattern)
- Reference: `src/hooks/bridge.ts`, `src/hooks/bridge-normalize.ts`, `scripts/run.cjs`

**Step 1: Create hook-entry.ts**

This is the **single bun-native entry point** that replaces the 3-step chain (run.cjs → *.mjs → bridge.ts):

```typescript
#!/usr/bin/env bun
// Single hook entry point. Claude Code calls:
//   bun run scripts/hook-entry.ts <hook-type>
// Input: JSON on stdin. Output: JSON on stdout.

import { readStdin } from '../src-new/utils';
import { processHook } from '../src-new/hooks/bridge';

const hookType = process.argv[2];
const input = JSON.parse(await readStdin(5000) || '{}');
const result = await processHook(hookType, input);
process.stdout.write(JSON.stringify(result));
```

**Step 2: Create hooks/bridge.ts**

Port from `src/hooks/bridge.ts`:
- `normalizeHookInput(raw)` — snake_case → camelCase conversion
- `processHook(hookType, rawInput)` — main dispatch switch
- Initially only implement the `continue: true` passthrough for all hooks
- We'll add real implementations in subsequent tasks

```typescript
export async function processHook(hookType: string, rawInput: unknown): Promise<HookOutput> {
  const input = normalizeHookInput(rawInput);

  switch (hookType) {
    case 'keyword-detector':
    case 'pre-tool-use':
    case 'post-tool-use':
    case 'session-start':
    case 'persistent-mode':
    case 'permission-request':
    case 'subagent-start':
    case 'subagent-stop':
    case 'pre-compact':
    case 'setup':
    case 'session-end':
      return { continue: true }; // Stub — will be implemented
    default:
      return { continue: true };
  }
}
```

**Step 3: Update hooks/hooks.json**

Replace all hook commands from:
```json
"command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/run.cjs\" \"${CLAUDE_PLUGIN_ROOT}/scripts/keyword-detector.mjs\""
```
To:
```json
"command": "bun run \"${CLAUDE_PLUGIN_ROOT}/scripts/hook-entry.ts\" keyword-detector"
```

Update ALL hook entries to use the single `hook-entry.ts` with the hook type as argument. Keep timeouts the same.

**Step 4: Verify**

```bash
echo '{"prompt":"hello","cwd":"/tmp"}' | bun run scripts/hook-entry.ts keyword-detector
# Expected: {"continue":true}
```

**Step 5: Commit**

```bash
git add src-new/hooks/bridge.ts scripts/hook-entry.ts hooks/hooks.json
git commit -m "feat: port hook bridge to bun-native single entry point"
```

---

### Task 2.2: Port keyword detector

**Files:**
- Create: `src-new/hooks/keyword-detector.ts`
- Create: `src-new/features/magic-keywords.ts`
- Modify: `src-new/hooks/bridge.ts` (wire up keyword-detector case)
- Reference: `src/hooks/keyword-detector/index.ts`, `src/features/magic-keywords.ts`

**Step 1: Create features/magic-keywords.ts**

Port keyword definitions from `src/features/magic-keywords.ts`:
- Built-in keywords: `ultrawork` (aliases: ulw, uw), `search`, `analyze`, `ultrathink`
- Each with regex pattern, system message, and description
- Remove any team/codex/gemini keyword references

**Step 2: Create hooks/keyword-detector.ts**

Port from `src/hooks/keyword-detector/index.ts`:
- Persistent keyword patterns (10 kept): ralph, autopilot, cancel, ultrawork, pipeline, ralplan, tdd, ultrathink, deepsearch, analyze
- Remove: team, swarm, ultrapilot, codex, gemini, ccg patterns
- Remove: `isTeamEnabled()` checks and team auto-emission logic
- Keep: priority ordering, mutual exclusion rules, task-size filtering
- Keep: `sanitizeForKeywordDetection()`, `removeCodeBlocks()`, `NON_LATIN_SCRIPT_PATTERN`

**Step 3: Wire into bridge.ts**

Update the `keyword-detector` case in `processHook()` to call the real implementation.

**Step 4: Verify**

```bash
echo '{"prompt":"ralph implement login","cwd":"/tmp"}' | bun run scripts/hook-entry.ts keyword-detector
# Expected: {"continue":true,"message":"[MODE: RALPH]..."}

echo '{"prompt":"hello world","cwd":"/tmp"}' | bun run scripts/hook-entry.ts keyword-detector
# Expected: {"continue":true} (no keyword detected)
```

**Step 5: Commit**

```bash
git add src-new/hooks/keyword-detector.ts src-new/features/magic-keywords.ts src-new/hooks/bridge.ts
git commit -m "feat: port keyword detector with 10 magic keywords"
```

---

### Task 2.3: Port orchestrator (pre/post tool hooks)

**Files:**
- Create: `src-new/hooks/orchestrator.ts`
- Modify: `src-new/hooks/bridge.ts` (wire up pre-tool-use and post-tool-use)
- Reference: `src/hooks/omc-orchestrator/index.ts`

**Step 1: Create hooks/orchestrator.ts**

Port from `src/hooks/omc-orchestrator/index.ts`:
- `processPreTool(input)` — delegation enforcement (prevent orchestrator from editing source files directly), model injection via delegation enforcer
- `processPostTool(input)` — state tracking, `<remember>` tag processing, boulder progress reminders, git diff stats
- Remove: all team-related state checks and team mode references
- Remove: notification triggers

**Step 2: Wire into bridge.ts**

Update `pre-tool-use` and `post-tool-use` cases.

**Step 3: Verify**

```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"/project/src/app.ts"},"cwd":"/project"}' | bun run scripts/hook-entry.ts pre-tool-use
# Expected: delegation enforcement message or continue
```

**Step 4: Commit**

```bash
git add src-new/hooks/orchestrator.ts src-new/hooks/bridge.ts
git commit -m "feat: port orchestrator pre/post tool hooks"
```

---

### Task 2.4: Port delegation enforcement and model routing

**Files:**
- Create: `src-new/features/delegation.ts`
- Create: `src-new/features/model-routing.ts`
- Reference: `src/features/delegation-enforcer.ts`, `src/features/delegation-routing/`, `src/features/model-routing/`

**Step 1: Create features/delegation.ts**

Port from `src/features/delegation-enforcer.ts` + `src/features/delegation-routing/`:
- `enforceModel(toolInput)` — inject model if not specified, based on agent definition
- `shouldDelegate(toolName, filePath)` — check if orchestrator should delegate vs act directly
- `ALLOWED_PATH_PATTERNS` — paths orchestrator can write directly (.omc/, .claude/, CLAUDE.md, AGENTS.md)
- Remove: codex/gemini provider fallback, deprecated alias routing

**Step 2: Create features/model-routing.ts**

Port from `src/features/model-routing/`:
- `routeModel(taskDescription, agentName)` — analyze complexity, return recommended ModelType
- Scoring logic: LOW (haiku), MEDIUM (sonnet), HIGH (opus)
- Lexical signals (keywords like "debug", "architecture", "risk")
- Structural signals (subtask count, impact scope)

**Step 3: Verify**

```bash
bun -e "
import { enforceModel } from './src-new/features/delegation';
console.log(enforceModel({ subagent_type: 'executor' }));
// Expected: { model: 'sonnet', ... }
"
```

**Step 4: Commit**

```bash
git add src-new/features/delegation.ts src-new/features/model-routing.ts
git commit -m "feat: port delegation enforcement and model routing"
```

---

## Phase 3: Execution Modes

### Task 3.1: Port mode registry and persistent mode

**Files:**
- Create: `src-new/hooks/mode-registry.ts`
- Create: `src-new/hooks/persistent-mode.ts`
- Modify: `src-new/hooks/bridge.ts` (wire up)
- Reference: `src/hooks/mode-registry/index.ts`, `src/hooks/persistent-mode/`

**Step 1: Create hooks/mode-registry.ts**

Port from `src/hooks/mode-registry/index.ts`:
- Track active modes (ralph, autopilot, ultrawork, pipeline, etc.)
- Mutual exclusion enforcement
- State file read/write from `.omc/state/`
- Remove: team mode tracking

**Step 2: Create hooks/persistent-mode.ts**

Port from `src/hooks/persistent-mode/` (the unified Stop handler):
- Coordinates ralph, ultrawork, autopilot, todo-continuation, and skill-state
- Prevents premature stopping when work remains
- Remove: team mode coordination

**Step 3: Wire into bridge.ts**

**Step 4: Verify**

```bash
echo '{"stop_reason":"user_requested","cwd":"/project"}' | bun run scripts/hook-entry.ts persistent-mode
# Expected: {"continue":true} (no active modes)
```

**Step 5: Commit**

```bash
git add src-new/hooks/mode-registry.ts src-new/hooks/persistent-mode.ts src-new/hooks/bridge.ts
git commit -m "feat: port mode registry and persistent mode"
```

---

### Task 3.2: Port ralph loop

**Files:**
- Create: `src-new/hooks/ralph.ts`
- Modify: `src-new/hooks/bridge.ts`
- Reference: `src/hooks/ralph/`

**Step 1: Create hooks/ralph.ts**

Port from `src/hooks/ralph/`:
- Ralph state management (read/write ralph-state.json)
- PRD support (load PRD context)
- Architect verification integration
- Self-referential loop: detect stop → check progress → continue or allow stop
- Remove: team-linked ralph state

**Step 2: Wire into bridge.ts**

**Step 3: Verify**

Test ralph activation and continuation logic.

**Step 4: Commit**

```bash
git add src-new/hooks/ralph.ts src-new/hooks/bridge.ts
git commit -m "feat: port ralph loop hook"
```

---

### Task 3.3: Port autopilot and todo-continuation

**Files:**
- Create: `src-new/hooks/autopilot.ts`
- Create: `src-new/hooks/todo-continuation.ts`
- Create: `src-new/hooks/skill-state.ts`
- Modify: `src-new/hooks/bridge.ts`
- Reference: `src/hooks/autopilot/`, `src/hooks/todo-continuation/`, `src/hooks/skill-state/`

**Step 1: Create hooks/autopilot.ts**

Port from `src/hooks/autopilot/`:
- Phase management: expansion → planning → execution → QA → validation
- State persistence in autopilot-state.json
- Remove: team/notification initialization checks

**Step 2: Create hooks/todo-continuation.ts**

Port from `src/hooks/todo-continuation/`:
- Prevent stopping when incomplete Tasks/todos remain
- Parse transcript for pending TodoWrite items

**Step 3: Create hooks/skill-state.ts**

Port from `src/hooks/skill-state/`:
- Track active skill execution with protection levels
- Prevent premature stops during skill operations

**Step 4: Wire into bridge.ts**

**Step 5: Commit**

```bash
git add src-new/hooks/autopilot.ts src-new/hooks/todo-continuation.ts src-new/hooks/skill-state.ts src-new/hooks/bridge.ts
git commit -m "feat: port autopilot, todo-continuation, and skill-state hooks"
```

---

### Task 3.4: Port boulder state (plan persistence)

**Files:**
- Create: `src-new/features/boulder-state.ts`
- Reference: `src/features/boulder-state/`, `src/features/continuation-enforcement.ts`

**Step 1: Create features/boulder-state.ts**

Port from `src/features/boulder-state/storage.ts` + `src/features/continuation-enforcement.ts`:
- `BoulderState` type: active_plan, started_at, session_ids, plan_name, active
- `readBoulderState()`, `writeBoulderState()`, `clearBoulderState()`
- `getPlanProgress(planPath)` — parse markdown checkboxes
- `continuationSystemPromptAddition` — the Sisyphus prompt
- `checkBoulderContinuation()` — check if work incomplete
- Consolidate types + storage + enforcement into single file

**Step 2: Verify**

```bash
bun -e "
import { getPlanProgress } from './src-new/features/boulder-state';
// Test with a mock plan file
"
```

**Step 3: Commit**

```bash
git add src-new/features/boulder-state.ts
git commit -m "feat: port boulder state and continuation enforcement"
```

---

## Phase 4: Safety + Recovery Hooks

### Task 4.1: Port recovery, setup, and permission handler

**Files:**
- Create: `src-new/hooks/recovery.ts`
- Create: `src-new/hooks/setup.ts`
- Create: `src-new/hooks/permission-handler.ts`
- Modify: `src-new/hooks/bridge.ts`
- Reference: `src/hooks/recovery/`, `src/hooks/setup/`, `src/hooks/permission-handler/`

**Step 1: Create hooks/recovery.ts**

Port from `src/hooks/recovery/`:
- Priority: context window > session recovery > edit errors
- Context window limit detection and recovery prompt

**Step 2: Create hooks/setup.ts**

Port from `src/hooks/setup/`:
- Directory initialization (.omc/state/, .omc/plans/, etc.)
- State pruning for stale sessions
- Remove: team/notification setup

**Step 3: Create hooks/permission-handler.ts**

Port from `src/hooks/permission-handler/`:
- Auto-allow safe read-only commands (ls, cat, git status, etc.)
- Reduce permission friction

**Step 4: Wire into bridge.ts and verify**

**Step 5: Commit**

```bash
git add src-new/hooks/recovery.ts src-new/hooks/setup.ts src-new/hooks/permission-handler.ts src-new/hooks/bridge.ts
git commit -m "feat: port recovery, setup, and permission handler hooks"
```

---

### Task 4.2: Port remaining safety hooks

**Files:**
- Create: `src-new/hooks/preemptive-compact.ts`
- Create: `src-new/hooks/subagent-tracker.ts`
- Create: `src-new/hooks/task-size-detector.ts`
- Create: `src-new/hooks/empty-msg-sanitizer.ts`
- Create: `src-new/hooks/thinking-validator.ts`
- Modify: `src-new/hooks/bridge.ts`

**Step 1: Create each hook**

Port from corresponding `src/hooks/` directories:
- `preemptive-compact.ts` — monitor context usage, warn before limit
- `subagent-tracker.ts` — track agent lifecycle with metrics, staleness detection
- `task-size-detector.ts` — classify prompts as small/medium/large
- `empty-msg-sanitizer.ts` — sanitize empty messages to prevent API errors
- `thinking-validator.ts` — prepend synthetic thinking blocks to prevent API errors

**Step 2: Wire all into bridge.ts and verify**

**Step 3: Commit**

```bash
git add src-new/hooks/preemptive-compact.ts src-new/hooks/subagent-tracker.ts src-new/hooks/task-size-detector.ts src-new/hooks/empty-msg-sanitizer.ts src-new/hooks/thinking-validator.ts src-new/hooks/bridge.ts
git commit -m "feat: port safety hooks (compact, tracker, task-size, sanitizer, thinking)"
```

---

## Phase 5: Tools + MCP Server

### Task 5.1: Port MCP server

**Files:**
- Create: `src-new/mcp/server.ts`
- Reference: `src/mcp/omc-tools-server.ts`, `src/mcp/servers.ts`

**Step 1: Create mcp/server.ts**

Port from `src/mcp/omc-tools-server.ts`:
- Single MCP server that exposes all tools
- Uses `@modelcontextprotocol/sdk` Server class
- Registers tool handlers for LSP, AST, Python REPL, state, notepad, project-memory
- Remove: team MCP tools (omc_run_team_*)
- Remove: job management and prompt persistence (codex/gemini)
- Use `Bun.serve()` or stdio transport depending on MCP SDK support

**Step 2: Verify**

```bash
echo '{"jsonrpc":"2.0","method":"initialize","params":{"capabilities":{}},"id":1}' | bun run src-new/mcp/server.ts
# Should respond with MCP initialize response
```

**Step 3: Commit**

```bash
git add src-new/mcp/server.ts
git commit -m "feat: port MCP server (bun-native, single server)"
```

---

### Task 5.2: Port LSP tools

**Files:**
- Create: `src-new/tools/lsp.ts`
- Reference: `src/tools/lsp-tools.ts`

**Step 1: Create tools/lsp.ts**

Port from `src/tools/lsp-tools.ts`:
- All LSP operations: hover, goto definition, find references, document symbols, workspace symbols, diagnostics, rename, code actions
- Uses `vscode-languageserver-protocol`
- Keep the LSP client connection management

**Step 2: Commit**

```bash
git add src-new/tools/lsp.ts
git commit -m "feat: port LSP tools"
```

---

### Task 5.3: Port AST tools and Python REPL

**Files:**
- Create: `src-new/tools/ast.ts`
- Create: `src-new/tools/python-repl.ts`
- Reference: `src/tools/ast-tools.ts`, `src/tools/python-repl/`

**Step 1: Create tools/ast.ts**

Port from `src/tools/ast-tools.ts`:
- `ast_grep_search` — structural code pattern search
- `ast_grep_replace` — structural transformation
- Uses `@ast-grep/napi`

**Step 2: Create tools/python-repl.ts**

Port from `src/tools/python-repl/`:
- Python REPL bridge manager
- Socket client for persistent Python sessions
- Session lock management
- Port the Python bridge script reference (`gyoshu_bridge.py`)

**Step 3: Commit**

```bash
git add src-new/tools/ast.ts src-new/tools/python-repl.ts
git commit -m "feat: port AST tools and Python REPL"
```

---

## Phase 6: HUD

### Task 6.1: Port HUD core

**Files:**
- Create: `src-new/hud/index.ts`
- Create: `src-new/hud/types.ts`
- Create: `src-new/hud/stdin.ts`
- Create: `src-new/hud/state.ts`
- Create: `src-new/hud/transcript.ts`
- Create: `src-new/hud/omc-state.ts`
- Create: `src-new/hud/render.ts`
- Create: `src-new/hud/sanitize.ts`
- Create: `src-new/hud/colors.ts`
- Create: `src-new/hud/background-tasks.ts`
- Create: `src-new/hud/background-cleanup.ts`
- Create: `src-new/hud/usage-api.ts`
- Create: `src-new/hud/custom-rate-provider.ts`
- Reference: `src/hud/`

**Step 1: Port all HUD files**

The HUD is already clean and independent. Port each file from `src/hud/`:
- Update imports to use new paths
- Replace any `node` references with `bun`
- Replace `chalk` usage with direct ANSI codes (the HUD already has its own `colors.ts`)
- Remove any team state references (there should be none based on analysis)

**Step 2: Port HUD entry point**

`src-new/hud/index.ts` should be executable:
```typescript
#!/usr/bin/env bun
// HUD statusline entry point
// Claude Code calls: bun run src-new/hud/index.ts
```

**Step 3: Commit**

```bash
git add src-new/hud/
git commit -m "feat: port HUD system (bun-native)"
```

---

### Task 6.2: Port HUD elements

**Files:**
- Create: `src-new/hud/elements/index.ts`
- Create: `src-new/hud/elements/agents.ts`
- Create: `src-new/hud/elements/autopilot.ts`
- Create: `src-new/hud/elements/background.ts`
- Create: `src-new/hud/elements/call-counts.ts`
- Create: `src-new/hud/elements/context.ts`
- Create: `src-new/hud/elements/context-warning.ts`
- Create: `src-new/hud/elements/cwd.ts`
- Create: `src-new/hud/elements/git.ts`
- Create: `src-new/hud/elements/limits.ts`
- Create: `src-new/hud/elements/model.ts`
- Create: `src-new/hud/elements/permission.ts`
- Create: `src-new/hud/elements/prd.ts`
- Create: `src-new/hud/elements/prompt-time.ts`
- Create: `src-new/hud/elements/ralph.ts`
- Create: `src-new/hud/elements/session.ts`
- Create: `src-new/hud/elements/skills.ts`
- Create: `src-new/hud/elements/thinking.ts`
- Create: `src-new/hud/elements/todos.ts`
- Reference: `src/hud/elements/`

**Step 1: Port all element files**

Each element is a self-contained render function. Port directly with updated imports.

**Step 2: Verify HUD end-to-end**

```bash
echo '{"transcript_path":"/tmp/test.jsonl","cwd":"/project","model":{"id":"claude-sonnet-4-6"},"context_window":{"used":50000,"total":200000}}' | bun run src-new/hud/index.ts
# Expected: Rendered statusline output
```

**Step 3: Commit**

```bash
git add src-new/hud/elements/
git commit -m "feat: port all 19 HUD elements"
```

---

## Phase 7: Features + Background

### Task 7.1: Port background tasks and context injection

**Files:**
- Create: `src-new/features/background.ts`
- Create: `src-new/features/context.ts`
- Reference: `src/features/background-agent/`, `src/features/background-tasks.ts`, `src/features/context-injector/`

**Step 1: Create features/background.ts**

Port from `src/features/background-agent/manager.ts` + `src/features/background-tasks.ts`:
- BackgroundManager class for tracking background tasks
- `shouldRunInBackground()` heuristic function
- Concurrency management
- Persistent task storage in `.omc/state/background-tasks/`

**Step 2: Create features/context.ts**

Port from `src/features/context-injector/`:
- Auto-inject context from AGENTS.md, CLAUDE.md, README.md
- Context collector pattern

**Step 3: Commit**

```bash
git add src-new/features/background.ts src-new/features/context.ts
git commit -m "feat: port background tasks and context injection"
```

---

### Task 7.2: Update plugin entry point with all exports

**Files:**
- Modify: `src-new/index.ts`

**Step 1: Update index.ts to re-export all ported modules**

Now that all modules are ported, update `src-new/index.ts` to be the complete entry point:
- Export agents, hooks, features, tools, mcp, hud, utils
- Export config loading
- This is the final shape of the plugin entry point

**Step 2: Verify full import**

```bash
bun -e "import * as omc from './src-new/index'; console.log(Object.keys(omc).length, 'exports')"
```

**Step 3: Commit**

```bash
git add src-new/index.ts
git commit -m "feat: complete plugin entry point with all module exports"
```

---

## Phase 8: Skills

### Task 8.1: Clean up kept skills (remove team/notification references)

**Files:**
- Modify: `skills/cancel/SKILL.md`
- Modify: `skills/autopilot/SKILL.md`
- Modify: `skills/omc-doctor/SKILL.md`
- Modify: `skills/ultrapilot/SKILL.md` (if it references team)

**Step 1: Edit each skill's SKILL.md**

For each skill that references removed systems:
- Remove team cleanup instructions from `cancel`
- Remove team/notification initialization from `autopilot`
- Remove team/notification/openclaw diagnostic sections from `omc-doctor`
- Update any references to removed keywords or modes

**Step 2: Verify skills load**

```bash
ls skills/*/SKILL.md | wc -l
# Expected: 28 skill directories
```

**Step 3: Commit**

```bash
git add skills/
git commit -m "feat: clean up skills (remove team/notification/openclaw refs)"
```

---

### Task 8.2: Delete removed skills

**Files:**
- Delete: `skills/team/`
- Delete: `skills/omc-teams/`
- Delete: `skills/project-session-manager/`
- Delete: `skills/configure-notifications/`
- Delete: `skills/configure-openclaw/`
- Delete: `skills/ccg/`
- Delete: `skills/deepinit/`
- Delete: `skills/omc-setup/`
- Delete: `skills/release/`

**Step 1: Delete skill directories**

```bash
rm -rf skills/team skills/omc-teams skills/project-session-manager skills/configure-notifications skills/configure-openclaw skills/ccg skills/deepinit skills/omc-setup skills/release
```

**Step 2: Verify remaining skills**

```bash
ls -d skills/*/
# Expected: 28 directories
```

**Step 3: Commit**

```bash
git add -A skills/
git commit -m "chore: remove 9 skills (team, notifications, openclaw, codex/gemini)"
```

---

## Phase 9: Cleanup + Finalization

### Task 9.1: Swap src/ directories

**Files:**
- Rename: `src/` → `src-old/` (keep as reference temporarily)
- Rename: `src-new/` → `src/`

**Step 1: Rename directories**

```bash
mv src src-old
mv src-new src
```

**Step 2: Update all import paths in hooks.json and .mcp.json**

Change `src-new/` → `src/` in any config files.

**Step 3: Verify plugin still works**

```bash
echo '{"prompt":"hello","cwd":"/tmp"}' | bun run scripts/hook-entry.ts keyword-detector
# Expected: {"continue":true}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: swap src-new to src (migration complete)"
```

---

### Task 9.2: Delete old source and artifacts

**Files:**
- Delete: `src-old/` (after verifying everything works)
- Delete: `dist/`
- Delete: `bridge/`
- Delete: `seminar/`
- Delete: `benchmark/`
- Delete: `research/`
- Delete: `examples/`
- Delete: `templates/`
- Delete: `test-writer-project/`

**Step 1: Delete directories**

```bash
rm -rf src-old dist bridge seminar benchmark research examples templates test-writer-project
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: delete old src, dist, bridge, and non-essential directories"
```

---

### Task 9.3: Delete non-English READMEs and misc files

**Files:**
- Delete: `README.es.md`, `README.ja.md`, `README.ko.md`, `README.pt.md`, `README.vi.md`, `README.zh.md`
- Delete: `ANALYSIS.md`, `CATEGORY_IMPLEMENTATION.md`, `CHANGELOG.md`, `IMPLEMENTATION_SUMMARY.md`, `ISSUE-319-FIX.md`, `SECURITY-FIXES.md`, `omc-review-runtime-layer.md`
- Delete: `done.json`, `farewell.txt`, `greeting.txt`, `hello.txt`, `hello-codex.txt`, `world.txt`
- Delete: `test-background-tasks.ts`, `test-routing.mjs`
- Delete: `vitest.config.ts` (if switching to bun test)
- Delete: `typos.toml` (evaluate if still needed)

**Step 1: Delete files**

```bash
rm -f README.es.md README.ja.md README.ko.md README.pt.md README.vi.md README.zh.md
rm -f ANALYSIS.md CATEGORY_IMPLEMENTATION.md CHANGELOG.md IMPLEMENTATION_SUMMARY.md ISSUE-319-FIX.md SECURITY-FIXES.md omc-review-runtime-layer.md
rm -f done.json farewell.txt greeting.txt hello.txt hello-codex.txt world.txt
rm -f test-background-tasks.ts test-routing.mjs
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: delete non-English READMEs, misc docs, and test artifacts"
```

---

### Task 9.4: Clean up old scripts/ directory

**Files:**
- Delete: All `scripts/*.mjs` files (replaced by `scripts/hook-entry.ts`)
- Delete: `scripts/run.cjs`
- Delete: `scripts/lib/` (stdin reader now in src-new/utils)
- Delete: All `scripts/build-*.mjs` (no build step)
- Keep: `scripts/hook-entry.ts`, `scripts/session-start.ts`, `scripts/session-end.ts`

**Step 1: Create session-start.ts and session-end.ts**

Port `scripts/session-start.mjs` → `scripts/session-start.ts`:
- Convert from JS to TypeScript
- Replace `process.env` patterns with bun equivalents
- Simplify: remove version drift/symlink cache logic (no dist/ to manage)
- Keep: persistent mode restoration, todo restoration, notepad priority context injection

Port `scripts/session-end.mjs` → `scripts/session-end.ts`:
- Convert from JS to TypeScript
- Keep: session cleanup, metrics recording

**Step 2: Delete old scripts**

```bash
rm -f scripts/run.cjs scripts/*.mjs
rm -rf scripts/lib/
rm -f scripts/build-*.mjs scripts/compose-docs.mjs scripts/sync-metadata.ts scripts/skill-injector.mjs
```

**Step 3: Commit**

```bash
git add -A scripts/
git commit -m "chore: clean up scripts/ - TypeScript only, single hook entry"
```

---

### Task 9.5: Update documentation

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`
- Modify: `docs/` (clean up or delete obsolete docs)

**Step 1: Rewrite README.md**

Clean, focused README:
- What is oh-my-claudecode (multi-agent orchestration for Claude Code)
- Prerequisites: bun
- Installation: `claude plugin add ...`
- Quick start
- 21 agents, 28 skills, 10 magic keywords
- No mention of codex, gemini, teams, notifications

**Step 2: Rewrite CLAUDE.md**

Update the orchestrator system prompt document:
- Remove team_compositions, team_pipeline sections
- Remove omc-teams, ccg, team, swarm references from skills section
- Remove team MCP tools
- Remove deprecated aliases section
- Update agent catalog (keep all 21, remove deprecated aliases)
- Update hooks_and_context section

**Step 3: Update AGENTS.md**

Ensure it reflects the 21-agent lineup without deprecated aliases.

**Step 4: Clean docs/ directory**

- Delete: `docs/COMPATIBILITY.md`, `docs/MIGRATION.md` (no backward compat)
- Delete: `docs/CJK-IME-KNOWN-ISSUES.md` (if no longer relevant)
- Keep: `docs/ARCHITECTURE.md` (update for new structure)
- Keep: `docs/FEATURES.md` (update for new feature set)
- Keep: `docs/plans/` (design docs)

**Step 5: Commit**

```bash
git add -A
git commit -m "docs: rewrite README, CLAUDE.md, AGENTS.md for slimmed version"
```

---

### Task 9.6: Final verification

**Step 1: Check repo size**

```bash
du -sh .
# Expected: ~3-4MB (excluding .git)
```

**Step 2: Count files**

```bash
find src/ -name "*.ts" | wc -l
# Expected: ~45-50

ls agents/*.md | wc -l
# Expected: 21

ls -d skills/*/ | wc -l
# Expected: 28
```

**Step 3: Test hook bridge**

```bash
echo '{"prompt":"ralph build feature","cwd":"/tmp"}' | bun run scripts/hook-entry.ts keyword-detector
echo '{"tool_name":"Write","tool_input":{},"cwd":"/tmp"}' | bun run scripts/hook-entry.ts pre-tool-use
echo '{"cwd":"/tmp"}' | bun run scripts/hook-entry.ts setup
```

**Step 4: Test MCP server**

```bash
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}' | bun run src/mcp/server.ts
```

**Step 5: Test HUD**

```bash
echo '{"transcript_path":"","cwd":"/tmp","model":{"id":"claude-sonnet-4-6"},"context_window":{"used":50000,"total":200000}}' | bun run src/hud/index.ts
```

**Step 6: Lint check**

```bash
bunx biome check src/
```

**Step 7: Final commit**

```bash
git add -A
git commit -m "chore: final verification - radical slimming complete"
```

---

### Task 9.7: Create PR

```bash
gh pr create --base dev --title "feat: radical slimming - bun-native rewrite" --body "$(cat <<'EOF'
## Summary

- Rewrote oh-my-claudecode as clean, minimal, bun-native TypeScript
- Reduced from 592 files / 47MB to ~50 files / ~3-4MB (~90% reduction)
- All 21 agents, 28 skills, 16 hooks, HUD preserved
- Removed: team system, notifications, openclaw, codex/gemini, backward compat
- Bun runs TypeScript directly - no build step, no dist/, no bridge/
- Biome replaces ESLint + Prettier
- Single hook entry point replaces 30+ shell scripts

## Removed
- `src/team/` (67 files) - tmux multi-worker system
- `src/notifications/` - Telegram/Discord/Slack
- `src/openclaw/` - external automation gateway
- `dist/` (17MB), `bridge/` (1.6MB) - no build step needed
- `seminar/`, `benchmark/`, `research/`, `examples/`, `templates/`
- 6 non-English READMEs, misc docs
- 9 skills (team, omc-teams, PSM, notifications, openclaw, ccg, deepinit, omc-setup, release)
- 6 magic keywords (team, swarm, ultrapilot, codex, gemini, ccg)

## Test plan
- [ ] Plugin loads in Claude Code
- [ ] All 21 agents available via Task tool
- [ ] Keyword detection works (ralph, autopilot, ultrawork)
- [ ] HUD renders in statusline
- [ ] MCP tools respond (LSP, AST)
- [ ] All 28 skills invoke correctly
- [ ] Ralph loop persists across stop attempts
- [ ] Boulder continuation enforces plan completion

Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Summary

| Phase | Tasks | What it delivers |
|-------|-------|-----------------|
| 0 | 1 | Feature branch |
| 1 | 6 | Bun project + agents + plugin entry |
| 2 | 4 | Hook bridge + keywords + orchestrator + delegation |
| 3 | 4 | Mode registry + ralph + autopilot + boulder |
| 4 | 2 | Recovery + safety hooks (6 hooks) |
| 5 | 3 | MCP server + LSP + AST + Python REPL |
| 6 | 2 | HUD core + 19 elements |
| 7 | 2 | Background tasks + context injection |
| 8 | 2 | Skills cleanup + deletion |
| 9 | 7 | Swap dirs + delete old + docs + verify + PR |
| **Total** | **33 tasks** | **Complete slimmed plugin** |
