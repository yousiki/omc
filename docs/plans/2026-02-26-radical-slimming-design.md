# Radical Slimming of oh-my-claudecode

**Date:** 2026-02-26
**Status:** Approved
**Approach:** Layered Migration (clean rewrite with incremental porting)

## Goal

Transform oh-my-claudecode from a 47MB, 592-file monolith into a clean, minimal, easy-to-understand multi-agent orchestration framework. Fully bun-native, fully TypeScript, no backward compatibility baggage.

## Guiding Principles

1. **Bun-native** — bun as the sole JS/TS runtime, no Node.js fallbacks
2. **TypeScript everywhere** — no `.js`, `.mjs`, or `.cjs` files in source
3. **No build step** — bun runs TypeScript directly, no `dist/` or `bridge/`
4. **Minimal surface** — every file must justify its existence
5. **Easy to follow** — a developer should understand the architecture in 30 minutes

## Architecture Overview

```
User prompt
  -> Claude Code plugin API
    -> Hook bridge (bun-native)
      -> Keyword detection -> mode activation
      -> Orchestrator pre-tool -> delegation enforcement + model injection
      -> Agent execution (21 specialized agents, 3-tier model routing)
      -> Orchestrator post-tool -> state tracking + reminders
      -> Boulder continuation -> loop until plan complete
    -> MCP server (LSP, AST, Python REPL tools)
    -> HUD statusline (real-time session monitoring)
```

## What We Keep

### Agents (21 — all kept, no removals)

Each agent fills a distinct, non-overlapping role. No consolidation needed.

| Agent | Role | Tier |
|-------|------|------|
| explore | Internal codebase search | Haiku |
| writer | Internal documentation | Haiku |
| executor | Simple/focused task implementation | Sonnet |
| deep-executor | Complex multi-file implementation | Opus |
| debugger | Root-cause isolation | Sonnet |
| verifier | Evidence-based completion validation | Sonnet |
| test-engineer | Test strategy + TDD | Sonnet |
| build-fixer | Build error resolution | Sonnet |
| designer | UI/UX visual design | Sonnet |
| document-specialist | External docs research | Sonnet |
| qa-tester | Interactive CLI testing via tmux | Sonnet |
| scientist | Data analysis, statistics, Python | Sonnet |
| git-master | Atomic commits, history mgmt | Sonnet |
| architect | Analysis + debugging + verification | Opus |
| planner | Work plan creation | Opus |
| critic | Plan validation gate | Opus |
| analyst | Requirements gap detection | Opus |
| code-reviewer | Generalist review (spec+quality) | Opus |
| quality-reviewer | Logic defects, anti-patterns, SOLID | Opus |
| security-reviewer | OWASP, vulnerabilities, secrets | Opus |
| code-simplifier | Refactoring for clarity | Opus |

### Skills (28 kept, 9 removed)

**Kept:**

| Skill | Notes |
|-------|-------|
| cancel | Simplify: remove team/notification cleanup branches |
| note | Keep as-is |
| plan | Keep as-is |
| ralph-init | Keep as-is |
| trace | Keep as-is |
| build-fix | Keep as-is |
| learn-about-omc | Keep as-is |
| omc-help | Keep as-is |
| ralph | Core persistence mode |
| ultrawork | Core parallel execution engine |
| autopilot | Simplify: remove team/notification checks |
| ultrapilot | Extended autonomous mode wrapper |
| ultraqa | QA-focused execution |
| code-review | Keep as-is |
| security-review | Keep as-is |
| sciomc | Research/analysis workflows |
| tdd | Test-driven development |
| pipeline | Multi-stage workflow execution |
| ralplan | Extended planning capability |
| skill | Skill management system |
| analyze | Code analysis workflow |
| omc-doctor | Simplify: remove team/notification/openclaw checks |
| external-context | MCP-based context loading |
| learner | Interactive learning mode |
| mcp-setup | MCP server configuration |
| writer-memory | Long-form writing persistence |
| review | Code review alternative |
| hud | HUD setup and configuration |

**Removed (9):**

| Skill | Reason |
|-------|--------|
| team | Depends on removed team system |
| omc-teams | Depends on removed team system + tmux CLI workers |
| project-session-manager | PSM module removed |
| configure-notifications | Notifications module removed |
| configure-openclaw | OpenClaw module removed |
| ccg | Requires Codex/Gemini CLIs |
| deepinit | Sets up removed systems (team, notifications) |
| omc-setup | Sets up removed systems (team, notifications) |
| release | Marginal, external workflow |

### Hooks (16 essential hooks)

| Hook | Event | Purpose |
|------|-------|---------|
| mode-registry | UserPromptSubmit, PreToolUse | Mode state + mutual exclusion |
| persistent-mode | Stop | Unified stop prevention |
| empty-msg-sanitizer | UserPromptSubmit | Prevent API errors |
| thinking-validator | PreCompact | Prevent thinking block errors |
| keyword-detector | UserPromptSubmit | Magic keyword routing |
| task-size-detector | UserPromptSubmit | Task classification |
| orchestrator | PreToolUse, PostToolUse | Delegation enforcement + state |
| recovery | PreToolUse | Error recovery |
| subagent-tracker | SubagentStart/Stop | Agent lifecycle tracking |
| setup | Setup | Session initialization |
| permission-handler | PreToolUse | Auto-allow safe commands |
| preemptive-compact | PostToolUse | Context monitoring |
| ralph | UserPromptSubmit, Stop | Ralph loop |
| autopilot | UserPromptSubmit, Stop | Autopilot mode |
| todo-continuation | Stop | Task completion enforcement |
| skill-state | Stop | Active skill protection |

### Magic Keywords (10 kept, 6 removed)

**Kept:** ralph, autopilot, cancel, ultrawork, pipeline, ralplan, tdd, ultrathink, deepsearch, analyze

**Removed:** team, swarm, ultrapilot, codex, gemini, ccg

### Core Features

| Feature | Description |
|---------|-------------|
| Boulder/Sisyphus state | Plan persistence + continuation enforcement |
| Delegation enforcement | Prevent orchestrator from editing directly |
| Model routing | 3-tier Haiku/Sonnet/Opus selection |
| Magic keywords | Trigger execution modes |
| Background tasks | Wrapper around Claude Code's native Task API |
| Context injection | Auto-inject AGENTS.md, CLAUDE.md context |

### Tool System (MCP)

| Tool | Description |
|------|-------------|
| LSP tools | Language Server Protocol operations |
| AST tools | AST analysis and transformation |
| Python REPL | Python execution bridge |

### HUD System

Kept and improved. Bun-native entry point, all 19 display elements preserved.

## What We Remove

### Entire Modules Deleted

| Module | Size | Files | Reason |
|--------|------|-------|--------|
| src/team/ | ~67 files | 7,676 LOC | tmux multi-worker system, not needed |
| src/notifications/ | ~10 files | — | Telegram/Discord/Slack notifications |
| src/openclaw/ | ~5 files | — | External automation gateway |
| src/interop/ | ~5 files | — | OMX interop bridge |
| Codex/Gemini code | ~20 files | — | External LLM delegation |

### Directories Deleted

| Directory | Size | Reason |
|-----------|------|--------|
| dist/ | 17MB | No build step — bun runs TS directly |
| bridge/ | 1.6MB | No pre-bundled CJS — bun runs TS directly |
| seminar/ | 1.8MB | Educational slides/notes |
| benchmark/ | 184KB | Performance testing framework |
| research/ | 16KB | Design documents |
| examples/ | 20KB | Usage examples |
| test-writer-project/ | 12KB | Sample project |
| templates/ | 136KB | Rule templates |

### Files Deleted

| File | Reason |
|------|--------|
| README.es.md | Non-English |
| README.ja.md | Non-English |
| README.ko.md | Non-English |
| README.pt.md | Non-English |
| README.vi.md | Non-English |
| README.zh.md | Non-English |
| ANALYSIS.md | Project analysis doc |
| CATEGORY_IMPLEMENTATION.md | Implementation notes |
| CHANGELOG.md | Changelog (restart fresh) |
| IMPLEMENTATION_SUMMARY.md | Implementation notes |
| ISSUE-319-FIX.md | Issue-specific doc |
| SECURITY-FIXES.md | Security fix notes |
| omc-review-runtime-layer.md | Review doc |
| done.json | Task tracking artifact |
| farewell.txt, greeting.txt, hello.txt, hello-codex.txt, world.txt | Test artifacts |
| test-background-tasks.ts | Test script |
| test-routing.mjs | Test script |
| eslint.config.js | Replaced by biome |
| package-lock.json | Replaced by bun.lockb |

## Target Directory Structure

```
oh-my-claudecode/
├── .claude-plugin/
│   ├── plugin.json                # Plugin manifest
│   └── marketplace.json           # Marketplace metadata
├── .mcp.json                      # MCP servers (bun run src/mcp/server.ts)
├── agents/                        # 21 agent prompt templates (markdown)
│   ├── architect.md
│   ├── analyst.md
│   ├── build-fixer.md
│   ├── code-reviewer.md
│   ├── code-simplifier.md
│   ├── critic.md
│   ├── debugger.md
│   ├── deep-executor.md
│   ├── designer.md
│   ├── document-specialist.md
│   ├── executor.md
│   ├── explore.md
│   ├── git-master.md
│   ├── planner.md
│   ├── qa-tester.md
│   ├── quality-reviewer.md
│   ├── scientist.md
│   ├── security-reviewer.md
│   ├── test-engineer.md
│   ├── verifier.md
│   └── writer.md
├── skills/                        # 28 skill directories
│   ├── analyze/
│   ├── autopilot/
│   ├── build-fix/
│   ├── cancel/
│   ├── code-review/
│   ├── external-context/
│   ├── hud/
│   ├── learn-about-omc/
│   ├── learner/
│   ├── mcp-setup/
│   ├── note/
│   ├── omc-doctor/
│   ├── omc-help/
│   ├── pipeline/
│   ├── plan/
│   ├── ralph/
│   ├── ralph-init/
│   ├── ralplan/
│   ├── review/
│   ├── sciomc/
│   ├── security-review/
│   ├── skill/
│   ├── tdd/
│   ├── trace/
│   ├── ultrapilot/
│   ├── ultraqa/
│   ├── ultrawork/
│   └── writer-memory/
├── src/
│   ├── index.ts                   # Plugin entry point
│   ├── agents/
│   │   ├── definitions.ts         # Agent registry (21 agents)
│   │   └── prompt.ts              # Prompt builder
│   ├── hooks/
│   │   ├── bridge.ts              # Hook bridge (bun-native)
│   │   ├── orchestrator.ts        # Pre/post tool hooks
│   │   ├── keyword-detector.ts    # Magic keyword detection
│   │   ├── mode-registry.ts       # Mode state management
│   │   ├── persistent-mode.ts     # Stop prevention
│   │   ├── recovery.ts            # Error recovery
│   │   ├── ralph.ts               # Ralph loop
│   │   ├── autopilot.ts           # Autopilot mode
│   │   ├── todo-continuation.ts   # Task completion enforcement
│   │   ├── setup.ts               # Session initialization
│   │   ├── subagent-tracker.ts    # Agent lifecycle tracking
│   │   ├── permission-handler.ts  # Auto-allow safe commands
│   │   ├── preemptive-compact.ts  # Context monitoring
│   │   ├── task-size-detector.ts  # Task classification
│   │   ├── empty-msg-sanitizer.ts # API error prevention
│   │   └── thinking-validator.ts  # Thinking block validation
│   ├── features/
│   │   ├── boulder-state.ts       # Plan persistence
│   │   ├── delegation.ts          # Delegation enforcement + routing
│   │   ├── model-routing.ts       # 3-tier model selection
│   │   ├── magic-keywords.ts      # Keyword definitions (10 keywords)
│   │   ├── background.ts          # Background task wrapper
│   │   └── context.ts             # Context injection
│   ├── tools/
│   │   ├── lsp.ts                 # LSP tools
│   │   ├── ast.ts                 # AST tools
│   │   └── python-repl.ts         # Python REPL
│   ├── mcp/
│   │   └── server.ts              # Single MCP server
│   ├── hud/
│   │   ├── index.ts               # HUD entry point (bun-native)
│   │   ├── state.ts               # State file management
│   │   ├── render.ts              # Main renderer
│   │   ├── types.ts               # Type definitions
│   │   ├── transcript.ts          # JSONL transcript parser
│   │   ├── stdin.ts               # Claude Code stdin parser
│   │   ├── omc-state.ts           # Ralph/Autopilot/PRD state
│   │   ├── background-tasks.ts    # Background task display
│   │   ├── background-cleanup.ts  # Task lifecycle
│   │   ├── usage-api.ts           # Rate limit API
│   │   ├── custom-rate-provider.ts# Custom rate limits
│   │   ├── sanitize.ts            # Terminal safety
│   │   ├── colors.ts              # ANSI utilities
│   │   └── elements/              # Render components
│   │       ├── index.ts
│   │       ├── agents.ts
│   │       ├── autopilot.ts
│   │       ├── background.ts
│   │       ├── call-counts.ts
│   │       ├── context.ts
│   │       ├── context-warning.ts
│   │       ├── cwd.ts
│   │       ├── git.ts
│   │       ├── limits.ts
│   │       ├── model.ts
│   │       ├── permission.ts
│   │       ├── prd.ts
│   │       ├── prompt-time.ts
│   │       ├── ralph.ts
│   │       ├── session.ts
│   │       ├── skills.ts
│   │       ├── thinking.ts
│   │       └── todos.ts
│   └── utils/
│       └── index.ts               # Shared utilities
├── scripts/
│   ├── session-start.ts           # Session startup (bun run)
│   └── session-end.ts             # Session cleanup (bun run)
├── tests/                         # Test suite (vitest + bun)
├── package.json                   # bun-native, minimal deps
├── tsconfig.json
├── biome.json                     # Lint + format (replaces eslint+prettier)
├── CLAUDE.md
├── AGENTS.md
├── README.md
└── LICENSE
```

## Technical Decisions

### Runtime: Bun Only

- `.mcp.json` uses `bun run src/mcp/server.ts` instead of `node bridge/mcp-server.cjs`
- HUD statusline uses `bun run src/hud/index.ts` instead of `node omc-hud.mjs`
- All scripts: `bun run scripts/session-start.ts` instead of `node scripts/session-start.mjs`
- `package.json` uses bun scripts, `bun.lockb` replaces `package-lock.json`
- Users must have bun installed (documented in README)

### No Build Step

- Bun runs TypeScript directly — no `tsc`, no `dist/`, no `bridge/`
- Source maps unnecessary — debugging happens in TypeScript source directly
- `package.json` `"main"` points to `src/index.ts`

### Biome for Lint + Format

- Single tool replaces ESLint + Prettier
- Faster, simpler configuration
- `biome.json` at project root

### Dependency Reduction

Current dependencies to evaluate during migration:

| Dependency | Status | Notes |
|------------|--------|-------|
| @anthropic-ai/claude-agent-sdk | KEEP | Core integration |
| @modelcontextprotocol/sdk | KEEP | MCP server |
| @ast-grep/napi | KEEP | AST tools |
| better-sqlite3 | EVALUATE | Used for job state DB — may replace with bun:sqlite |
| chalk | REMOVE | Use bun's built-in or simple ANSI codes |
| commander | EVALUATE | CLI framework — may not be needed |
| zod | KEEP | Schema validation |
| ajv | EVALUATE | May consolidate with zod |
| vscode-languageserver-protocol | KEEP | LSP tools |

### All JavaScript to TypeScript

Every `.js`, `.mjs`, `.cjs` file in the repo becomes `.ts`:
- `scripts/session-start.mjs` -> `scripts/session-start.ts`
- `scripts/session-end.mjs` -> `scripts/session-end.ts`
- `eslint.config.js` -> deleted (replaced by `biome.json`)
- `bridge/*.cjs` -> deleted (bun runs src/ directly)

## Migration Strategy

### Phase 1: Foundation

1. Set up bun project (`bun init`, `biome.json`, `tsconfig.json`)
2. Create new `src/` skeleton with target structure
3. Configure `.mcp.json` to point to new bun-native entry
4. Port `src/index.ts` — plugin entry point
5. Port `src/agents/` — agent registry + prompt builder
6. Port `src/utils/` — shared utilities
7. Verify: plugin loads in Claude Code, agents are registered

### Phase 2: Core Loop

8. Port `src/hooks/bridge.ts` — hook bridge (bun-native)
9. Port `src/hooks/orchestrator.ts` — pre/post tool hooks
10. Port `src/features/delegation.ts` — delegation enforcement
11. Port `src/features/model-routing.ts` — 3-tier model selection
12. Port `src/hooks/keyword-detector.ts` — magic keywords
13. Port `src/features/magic-keywords.ts` — keyword definitions
14. Verify: delegation + model routing works, keywords trigger modes

### Phase 3: Execution Modes

15. Port `src/hooks/mode-registry.ts` — mode state management
16. Port `src/hooks/persistent-mode.ts` — stop prevention
17. Port `src/hooks/ralph.ts` — ralph loop
18. Port `src/hooks/autopilot.ts` — autopilot mode
19. Port `src/hooks/todo-continuation.ts` — task completion
20. Port `src/features/boulder-state.ts` — plan persistence
21. Verify: ralph and autopilot loops work end-to-end

### Phase 4: Safety + Recovery

22. Port `src/hooks/recovery.ts` — error recovery
23. Port `src/hooks/setup.ts` — session initialization
24. Port `src/hooks/permission-handler.ts` — auto-allow safe commands
25. Port `src/hooks/preemptive-compact.ts` — context monitoring
26. Port `src/hooks/subagent-tracker.ts` — agent lifecycle
27. Port `src/hooks/task-size-detector.ts` — task classification
28. Port `src/hooks/empty-msg-sanitizer.ts` — API error prevention
29. Port `src/hooks/thinking-validator.ts` — thinking block validation
30. Port `src/hooks/skill-state.ts` — active skill protection
31. Verify: recovery works, context warnings fire, permissions auto-allowed

### Phase 5: Tools + MCP

32. Port `src/mcp/server.ts` — single MCP server
33. Port `src/tools/lsp.ts` — LSP tools
34. Port `src/tools/ast.ts` — AST tools
35. Port `src/tools/python-repl.ts` — Python REPL
36. Verify: MCP tools available in Claude Code, LSP/AST/REPL work

### Phase 6: HUD

37. Port `src/hud/` — all HUD files (bun-native entry)
38. Port `skills/hud/` — HUD setup skill
39. Update statusline command to use `bun run`
40. Verify: HUD renders in statusline with all elements

### Phase 7: Features + Background

41. Port `src/features/background.ts` — background task wrapper
42. Port `src/features/context.ts` — context injection
43. Verify: background tasks track correctly, context injected

### Phase 8: Skills

44. Port all 28 skill directories
45. Simplify cancel, autopilot, omc-doctor (remove team/notification refs)
46. Delete 9 removed skills
47. Verify: all skills load and invoke correctly

### Phase 9: Cleanup

48. Delete old `src/` (now fully replaced)
49. Delete `dist/`, `bridge/`, `seminar/`, `benchmark/`, `research/`, `examples/`, `templates/`, `test-writer-project/`
50. Delete non-English READMEs, misc docs, test artifacts
51. Delete `eslint.config.js`, `package-lock.json`
52. Update `README.md` for new bun-native setup
53. Update `CLAUDE.md` for new structure
54. Update `.claude-plugin/plugin.json` and `marketplace.json`
55. Final verification: full end-to-end test

## Size Estimates

| Metric | Current | Target |
|--------|---------|--------|
| Total repo | ~47MB | ~3-4MB |
| Files in src/ | ~592 | ~45-50 |
| Agent definitions | 21 | 21 |
| Skills | 37 | 28 |
| Hooks | 38 dirs | 16 files |
| Magic keywords | 16 | 10 |
| Runtime deps | 15+ | ~5-7 |
| Build step | tsc + esbuild | None |

## Risks

1. **Bun compatibility** — some npm packages may not work with bun (especially native addons like better-sqlite3). Mitigation: use `bun:sqlite` built-in.
2. **Edge cases** — the old codebase handles many edge cases discovered over time. Mitigation: port carefully, test each module.
3. **MCP server startup** — bun's TypeScript execution may be slower on first run due to transpilation. Mitigation: benchmark, consider `bun build --compile` if needed.
4. **Plugin API changes** — Claude Code's plugin API may expect specific patterns. Mitigation: test against current Claude Code version at each phase.
