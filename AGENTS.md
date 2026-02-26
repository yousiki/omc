<!-- Generated: 2026-01-28 | Updated: 2026-01-31 -->

# oh-my-claudecode

Multi-agent orchestration system for Claude Code CLI, providing intelligent delegation, parallel execution, and IDE-like capabilities through LSP/AST integration.

**Version:** 4.0.0
**Purpose:** Transform Claude Code into a conductor of specialized AI agents
**Inspired by:** oh-my-zsh / oh-my-opencode

## Purpose

oh-my-claudecode enhances Claude Code with:

- **21 specialized agents** across multiple domains with 3-tier model routing (Haiku/Sonnet/Opus)
- **28 skills** for workflow automation and specialized behaviors
- **Hooks** for event-driven execution modes and enhancements
- **15 custom tools** including 12 LSP, 2 AST, and Python REPL
- **Execution modes**: autopilot, ultrawork, ralph, ultrapilot, pipeline
- **MCP integration** with plugin-scoped tool discovery and skill loading

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Project dependencies and npm scripts |
| `tsconfig.json` | TypeScript configuration |
| `CHANGELOG.md` | Version history and release notes |
| `docs/CLAUDE.md` | End-user orchestration instructions (installed to user projects) |
| `src/index.ts` | Main entry point - exports `createOmcSession()` |
| `.mcp.json` | MCP server configuration for plugin discovery |
| `.claude-plugin/plugin.json` | Claude Code plugin manifest |

## Subdirectories

| Directory | Purpose | Related AGENTS.md |
|-----------|---------|-------------------|
| `src/` | TypeScript source code - core library | `src/AGENTS.md` |
| `agents/` | Markdown prompt templates for 21 agents (see `agents/templates/` for guidelines) | - |
| `skills/` | 28 skill definitions for workflows | `skills/AGENTS.md` |
| `commands/` | Slash command definitions (mirrors skills) | - |
| `scripts/` | Build scripts, utilities, and automation | - |
| `docs/` | User documentation and guides | `docs/AGENTS.md` |
| `templates/` | Hook and rule templates (coding-style, testing, security, performance, git-workflow) | - |
| `benchmark/` | Performance testing framework | - |
| `bridge/` | Pre-bundled MCP server for plugin distribution | - |

## For AI Agents

### Working In This Directory

1. **Delegation-First Protocol**: You are a CONDUCTOR, not a performer. Delegate substantive work:

   | Work Type | Delegate To | Model |
   |-----------|-------------|-------|
   | Code changes | `executor` / `executor-low` / `executor-high` | sonnet/haiku/opus |
   | Analysis | `architect` / `architect-medium` / `architect-low` | opus/sonnet/haiku |
   | Search | `explore` / `explore-high` | haiku/opus |
   | UI/UX | `designer` / `designer-low` / `designer-high` | sonnet/haiku/opus |
   | Docs | `writer` | haiku |
   | Security | `security-reviewer` / `security-reviewer-low` | opus/haiku |
   | Build errors | `build-fixer` | sonnet |
   | Testing | `qa-tester` | sonnet |
   | Code review | `code-reviewer` | opus |
   | TDD | `test-engineer` / `test-engineer-low` | sonnet/haiku |
   | Data analysis | `scientist` / `scientist-high` | sonnet/opus |

2. **LSP/AST Tools**: Use IDE-like tools for code intelligence:
   - `lsp_hover` - Type info and documentation at position
   - `lsp_goto_definition` - Jump to symbol definition
   - `lsp_find_references` - Find all usages across codebase
   - `lsp_document_symbols` - Get file outline
   - `lsp_workspace_symbols` - Search symbols across workspace
   - `lsp_diagnostics` - Get errors/warnings for single file
   - `lsp_diagnostics_directory` - Project-wide type checking (uses tsc or LSP)
   - `lsp_rename` - Preview refactoring across files
   - `lsp_code_actions` - Get available quick fixes
   - `ast_grep_search` - Structural code search with patterns
   - `ast_grep_replace` - AST-aware code transformation
   - `python_repl` - Execute Python code for data analysis

3. **Model Routing**: Match model tier to task complexity:
   - **Haiku** (LOW): Simple lookups, trivial fixes, fast searches
   - **Sonnet** (MEDIUM): Standard implementation, moderate reasoning
   - **Opus** (HIGH): Complex reasoning, architecture, debugging

### Modification Checklist

#### Cross-File Dependencies

| If you modify... | Also check/update... |
|------------------|---------------------|
| `agents/*.md` | `src/agents/definitions.ts`, `src/agents/index.ts`, `docs/REFERENCE.md` |
| `skills/*/SKILL.md` | `commands/*.md` (mirror), `scripts/build-skill-bridge.mjs` |
| `commands/*.md` | `skills/*/SKILL.md` (mirror) |
| `src/hooks/*` | `src/hooks/index.ts`, `src/hooks/bridge.ts`, related skill/command |
| Agent prompt | Tiered variants (`-low`, `-medium`, `-high`) |
| Tool definition | `src/tools/index.ts`, `src/mcp/omc-tools-server.ts`, `docs/REFERENCE.md` |
| `src/mcp/*` | `docs/REFERENCE.md` (MCP Tools section) |
| Agent tool assignments | `docs/CLAUDE.md` (Agent Tool Matrix) |
| `templates/rules/*` | `src/hooks/rules-injector/` if pattern changes |
| New execution mode | `src/hooks/*/`, `skills/*/SKILL.md`, `commands/*.md` (all three) |

#### Documentation Updates (docs/)

| If you change... | Update this docs/ file |
|------------------|----------------------|
| Agent count or agent list | `docs/REFERENCE.md` (Agents section) |
| Skill count or skill list | `docs/REFERENCE.md` (Skills section) |
| Hook count or hook list | `docs/REFERENCE.md` (Hooks System section) |
| Magic keywords | `docs/REFERENCE.md` (Magic Keywords section) |
| Architecture or skill composition | `docs/ARCHITECTURE.md` |
| Internal API or feature | `docs/FEATURES.md` |
| Tiered agent design | `docs/TIERED_AGENTS_V2.md` |
| CLAUDE.md content | `docs/CLAUDE.md` (end-user instructions) |

#### Skills ↔ Commands Relationship

- `skills/` contains skill implementations with full prompts
- `commands/` contains slash command definitions that invoke skills
- Both should be kept in sync for the same functionality

#### AGENTS.md Update Requirements

When you modify files in these locations, update the corresponding AGENTS.md:

| If you change... | Update this AGENTS.md |
|------------------|----------------------|
| Root project structure, new features | `/AGENTS.md` (this file) |
| `src/**/*.ts` structure or new modules | `src/AGENTS.md` |
| `agents/*.md` files | `src/agents/AGENTS.md` (implementation details) |
| `skills/*/` directories | `skills/AGENTS.md` |
| `src/hooks/*/` directories | `src/hooks/AGENTS.md` |
| `src/tools/**/*.ts` | `src/tools/AGENTS.md` |
| `src/features/*/` modules | `src/features/AGENTS.md` |
| `src/tools/lsp/` | `src/tools/lsp/AGENTS.md` |
| `src/tools/diagnostics/` | `src/tools/diagnostics/AGENTS.md` |
| `src/agents/*.ts` | `src/agents/AGENTS.md` |

#### What to Update

- Update version number when releasing
- Update feature descriptions when functionality changes
- Update file/directory tables when structure changes
- Keep "Generated" date as original, update "Updated" date

### Testing Requirements

```bash
bun test              # Run Vitest test suite
bun run build         # TypeScript compilation
bun run lint          # ESLint checks
bun run test:coverage # Coverage report
```

### Common Patterns

```typescript
// Entry point
import { createOmcSession } from 'oh-my-claudecode';
const session = createOmcSession();

// Agent registration
import { getAgentDefinitions } from './agents/definitions';
const agents = getAgentDefinitions();

// Tool access
import { allCustomTools, lspTools, astTools } from './tools';
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Claude Code CLI                          │
├─────────────────────────────────────────────────────────────┤
│                  oh-my-claudecode (OMC)                     │
│  ┌─────────────┬─────────────┬─────────────┬─────────────┐  │
│  │   Skills    │   Agents    │    Tools    │   Hooks     │  │
│  │ (28 skills) │ (21 agents) │(LSP/AST/REPL)│             │  │
│  └─────────────┴─────────────┴─────────────┴─────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Features Layer                             ││
│  │ model-routing | boulder-state | verification | notepad  ││
│  │ delegation-categories | task-decomposer | state-manager ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Agent Summary (21 Total)

### Build/Analysis Lane (8)

| Agent | Model | Purpose |
|-------|-------|---------|
| explore | haiku | Fast codebase pattern search and discovery |
| analyst | opus | Requirements clarity, acceptance criteria, hidden constraints |
| planner | opus | Task sequencing, execution plans, risk flags |
| architect | opus | System design, boundaries, interfaces, long-horizon tradeoffs |
| debugger | sonnet | Root-cause analysis, regression isolation, failure diagnosis |
| executor | sonnet | Code implementation, refactoring, feature work |
| deep-executor | opus | Complex autonomous goal-oriented tasks |
| verifier | sonnet | Completion evidence, claim validation, test adequacy |

### Review Lane (3)

| Agent | Model | Purpose |
|-------|-------|---------|
| quality-reviewer | sonnet | Logic defects, maintainability, anti-patterns, performance |
| security-reviewer | sonnet | Vulnerabilities, trust boundaries, authn/authz |
| code-reviewer | opus | Comprehensive review across concerns, API contracts, versioning |

### Domain Specialists (9)

| Agent | Model | Purpose |
|-------|-------|---------|
| test-engineer | sonnet | Test strategy, coverage, flaky-test hardening |
| build-fixer | sonnet | Build/toolchain/type failures |
| designer | sonnet | UX/UI architecture, interaction design |
| writer | haiku | Docs, migration notes, user guidance |
| qa-tester | sonnet | Interactive CLI/service runtime validation |
| scientist | sonnet | Data/statistical analysis |
| document-specialist | sonnet | External documentation and reference lookup |
| git-master | sonnet | Git workflows, branching, conflict resolution |
| code-simplifier | sonnet | Code simplification and readability improvements |

### Coordination (1)

| Agent | Model | Purpose |
|-------|-------|---------|
| critic | opus | Plan/design critical challenge |

## Execution Modes

| Mode | Trigger | Purpose |
|------|---------|---------|
| autopilot | "autopilot", "build me", "I want a" | Full autonomous execution |
| ultrawork | "ulw", "ultrawork" | Maximum parallel agent execution |
| ralph | "ralph", "don't stop until" | Persistence with verifier verification |
| ultrapilot | "ultrapilot", "parallel build" | Parallel autonomous execution |
| pipeline | "pipeline" | Sequential agent chaining with data passing |

## Skills (27)

Skills: `autopilot`, `ultrawork`, `ralph`, `ultrapilot`, `plan`, `ralplan`, `tdd`, `security-review`, `code-review`, `sciomc`, `external-context`, `analyze`, `pipeline`, `cancel`, `learner`, `note`, `omc-doctor`, `mcp-setup`, `build-fix`, `ultraqa`, `omc-help`, `trace`, `skill`, `writer-memory`, `ralph-init`, `learn-about-omc`, `review`

## LSP/AST Tools

### LSP Tools

```typescript
// IDE-like code intelligence via Language Server Protocol
lsp_hover              // Type info at position
lsp_goto_definition    // Jump to definition
lsp_find_references    // Find all usages
lsp_document_symbols   // File outline
lsp_workspace_symbols  // Cross-workspace symbol search
lsp_diagnostics        // Single file errors/warnings
lsp_diagnostics_directory  // PROJECT-WIDE type checking
lsp_servers            // List available language servers
lsp_prepare_rename     // Check if rename is valid
lsp_rename             // Preview multi-file rename
lsp_code_actions       // Available refactorings/fixes
lsp_code_action_resolve // Get action details
```

#### Supported Languages

TypeScript, Python, Rust, Go, C/C++, Java, JSON, HTML, CSS, YAML

### AST Tools

```typescript
// Structural code search/transform via ast-grep
ast_grep_search   // Pattern matching with meta-variables ($NAME, $$$ARGS)
ast_grep_replace  // AST-aware code transformation (dry-run by default)
```

#### Supported Languages

JavaScript, TypeScript, TSX, Python, Ruby, Go, Rust, Java, Kotlin, Swift, C, C++, C#, HTML, CSS, JSON, YAML

## State Files

| Path | Purpose |
|------|---------|
| `.omc/state/*.json` | Execution mode state (autopilot, ralph, ultrawork, etc.) |
| `.omc/notepads/` | Plan-scoped wisdom (learnings, decisions, issues) |
| `~/.omc/state/` | Global state |
| `~/.claude/.omc/` | Legacy state (auto-migrated) |

## Dependencies

### Runtime

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/claude-agent-sdk` | Claude Code integration |
| `@ast-grep/napi` | AST-based code search/replace |
| `vscode-languageserver-protocol` | LSP types |
| `zod` | Runtime schema validation |
| `chalk` | Terminal styling |
| `commander` | CLI parsing |

### Development

| Package | Purpose |
|---------|---------|
| `typescript` | Type system |
| `vitest` | Testing framework |
| `eslint` | Linting |
| `prettier` | Code formatting |

## Commands

```bash
bun run build           # Build TypeScript + skill bridge
bun run dev             # Watch mode
bun test                # Run tests
bun run test:coverage   # Coverage report
bun run lint            # ESLint
bun run sync-metadata   # Sync agent/skill metadata
```

## Hook System

Key hooks in `src/hooks/`:

- `autopilot/` - Full autonomous execution
- `ralph/` - Persistence until verified
- `ultrawork/` - Parallel execution
- `ultrapilot/` - Parallel autopilot with ownership
- `learner/` - Skill extraction
- `recovery/` - Error recovery
- `rules-injector/` - Rule file injection
- `think-mode/` - Enhanced reasoning

## Configuration

Settings in `~/.claude/.omc-config.json`:

```json
{
  "defaultExecutionMode": "ultrawork",
  "mcpServers": {
    "context7": { "enabled": true },
    "exa": { "enabled": true, "apiKey": "..." }
  }
}
```

<!-- MANUAL: Project-specific notes below this line are preserved on regeneration -->

<!-- OMX:RUNTIME:START -->
<session_context>
**Session:** omx-1771026854926-3tbxcj | 2026-02-13T23:54:14.929Z

**Compaction Protocol:**
Before context compaction, preserve critical state:
1. Write progress checkpoint via state_write MCP tool
2. Save key decisions to notepad via notepad_write_working
3. If context is >80% full, proactively checkpoint state
</session_context>
<!-- OMX:RUNTIME:END -->
