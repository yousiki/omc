<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# oh-my-claudecode

## Purpose

Multi-agent orchestration system for Claude Code. Provides specialized AI agents, event-driven hooks, user-invocable skills, and tools (LSP, AST, Python REPL) that extend Claude Code with coordinated multi-agent workflows, persistent execution modes (ralph, autopilot, ultrawork), and intelligent task routing.

## Key Files

| File | Description |
|------|-------------|
| `package.json` | Project manifest - Bun runtime, dependencies, `omc` CLI bin |
| `tsconfig.json` | TypeScript configuration (strict mode) |
| `README.md` | User-facing documentation and installation guide |
| `bun.lock` | Bun lockfile for reproducible installs |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `src/` | TypeScript source code - core library (see `src/AGENTS.md`) |
| `agents/` | Agent prompt templates (.md files) for all 21 agent types (see `agents/AGENTS.md`) |
| `skills/` | User-invocable skill definitions (~38 skills) (see `skills/AGENTS.md`) |
| `hooks/` | Compiled runtime hook configuration (`hooks.json`) (see `hooks/AGENTS.md`) |
| `scripts/` | Build, setup, and maintenance scripts (see `scripts/AGENTS.md`) |
| `templates/` | Template files for hooks and coding rules (see `templates/AGENTS.md`) |
| `docs/` | Developer documentation and reference guides (see `docs/AGENTS.md`) |

## For AI Agents

### Working In This Directory

- **Runtime**: Bun ≥ 1.0.0 required (`bun run start`, `bun run typecheck`)
- **Entry point**: `src/index.ts` (library) and `src/cli/index.ts` (CLI `omc` command)
- **Package type**: ESM (`"type": "module"`)
- Do not modify `bun.lock` manually; use `bun install` to update
- Do not create `dist/` or `build/` directories — this project ships from source

### Testing Requirements

- Run `bun run typecheck` to check TypeScript errors across the project
- Test files are co-located in `__tests__/` subdirectories under each module
- Run individual test suites with `bun test src/path/to/__tests__/file.test.ts`

### Common Patterns

- TypeScript strict mode enforced throughout
- ESM imports with `.js` extension suffix (e.g., `import { foo } from './bar.js'`)
- Barrel exports via `index.ts` in each module
- Zod for runtime input validation at system boundaries

## Dependencies

### External

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/claude-agent-sdk` | Claude agent integration |
| `@ast-grep/napi` | AST pattern search and replace |
| `@modelcontextprotocol/sdk` | MCP server/client protocol |
| `better-sqlite3` | SQLite for job state and persistence |
| `chalk` | Terminal color output |
| `commander` | CLI argument parsing |
| `jsonc-parser` | JSONC config file parsing |
| `vscode-languageserver-protocol` | LSP protocol types |
| `zod` | Runtime schema validation |

<!-- MANUAL: -->
