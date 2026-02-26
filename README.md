[![npm version](https://img.shields.io/npm/v/oh-my-claude-sisyphus?color=cb3837)](https://www.npmjs.com/package/oh-my-claude-sisyphus)
[![npm downloads](https://img.shields.io/npm/dm/oh-my-claude-sisyphus?color=blue)](https://www.npmjs.com/package/oh-my-claude-sisyphus)
[![GitHub stars](https://img.shields.io/github/stars/Yeachan-Heo/oh-my-claudecode?style=flat&color=yellow)](https://github.com/Yeachan-Heo/oh-my-claudecode/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4%EF%B8%8F-red?style=flat&logo=github)](https://github.com/sponsors/Yeachan-Heo)

# oh-my-claudecode

**Multi-agent orchestration for Claude Code. Zero learning curve.**

*Don't learn Claude Code. Just use OMC.*

---

## Quick Start

**Step 1: Prerequisites**

Install [bun](https://bun.sh):
```bash
curl -fsSL https://bun.sh/install | bash
```

**Step 2: Install**
```bash
claude plugin add oh-my-claudecode
```

**Step 3: Build something**
```
autopilot: build a REST API for managing tasks
```

Or just say `ralph` to activate persistent execution mode.

That's it. Everything else is automatic.

---

## What is oh-my-claudecode?

oh-my-claudecode (OMC) is a multi-agent orchestration layer for Claude Code. It turns Claude Code into a conductor of specialized AI agents — coordinating parallel execution, persistent loops, and IDE-like code intelligence so you get more done with less effort.

Say `autopilot` or `ralph` to activate. No configuration required.

---

## Features

### 21 Specialized Agents

Agents cover every domain of software development with 3-tier model routing:

| Lane | Agents |
|------|--------|
| **Build/Analysis** | `explore`, `analyst`, `planner`, `architect`, `debugger`, `executor`, `deep-executor`, `verifier` |
| **Review** | `quality-reviewer`, `security-reviewer`, `code-reviewer` |
| **Domain Specialists** | `test-engineer`, `build-fixer`, `designer`, `writer`, `qa-tester`, `scientist`, `document-specialist`, `git-master`, `code-simplifier` |
| **Coordination** | `critic` |

Model routing matches complexity: `haiku` for quick lookups, `sonnet` for standard work, `opus` for deep reasoning.

### 28 Skills

Skills are invocable commands that automate complex workflows:

| Category | Skills |
|----------|--------|
| **Orchestration** | `autopilot`, `ralph`, `ultrawork`, `ultrapilot`, `pipeline`, `ultraqa` |
| **Planning** | `plan`, `ralplan`, `review` |
| **Analysis** | `analyze`, `sciomc`, `external-context`, `tdd`, `build-fix`, `code-review`, `security-review` |
| **Utilities** | `cancel`, `note`, `learner`, `omc-doctor`, `omc-help`, `mcp-setup`, `skill`, `trace`, `ralph-init`, `learn-about-omc`, `writer-memory` |

### 10 Magic Keywords

| Keyword | Effect |
|---------|--------|
| `autopilot` | Full autonomous execution from idea to working code |
| `ralph` | Persistent execution with verify/fix loops until done |
| `ulw` / `ultrawork` | Maximum parallelism across agents |
| `ultrapilot` | Parallel autonomous execution |
| `plan` | Strategic planning interview |
| `ralplan` | Iterative planning with consensus |
| `pipeline` | Sequential staged processing |
| `analyze` | Root-cause analysis and debugging |
| `tdd` | Test-driven development workflow |
| `sciomc` | Parallel scientist agents for analysis |

### MCP Tools

IDE-like code intelligence via built-in MCP servers:

**LSP Tools** (Language Server Protocol):
- `lsp_hover`, `lsp_goto_definition`, `lsp_find_references`
- `lsp_document_symbols`, `lsp_workspace_symbols`
- `lsp_diagnostics`, `lsp_diagnostics_directory`
- `lsp_rename`, `lsp_code_actions`

Supported languages: TypeScript, Python, Rust, Go, C/C++, Java, JSON, HTML, CSS, YAML

**AST Tools** (structural code search/transform):
- `ast_grep_search` — pattern matching with meta-variables
- `ast_grep_replace` — AST-aware code transformation

Supported languages: JS, TS, TSX, Python, Ruby, Go, Rust, Java, Kotlin, Swift, C, C++, C#, HTML, CSS, JSON, YAML

**Python REPL**:
- `python_repl` — persistent Python interpreter for data analysis

---

## Architecture

oh-my-claudecode is built on bun-native TypeScript:

- **Single hook entry point** — all Claude Code hooks route through one bridge
- **No build step** — TypeScript runs directly via bun
- **Plugin-scoped** — installs as a Claude Code plugin, zero global config pollution
- **Worktree-aware** — all state lives under `{worktree}/.omc/`, not in `~/.claude/`

```
Claude Code CLI
    |
oh-my-claudecode (plugin)
    |-- Skills (28)      -- user-invocable commands
    |-- Agents (21)      -- specialized sub-agents with model routing
    |-- Hooks            -- event-driven execution modes
    |-- MCP Tools        -- LSP, AST, Python REPL
    |-- Features         -- boulder-state, continuation, model-routing
```

State files:
- `{worktree}/.omc/state/` — execution mode state
- `{worktree}/.omc/notepad.md` — session notepad
- `{worktree}/.omc/project-memory.json` — persistent project memory

---

## Requirements

- [Claude Code](https://docs.anthropic.com/claude-code) CLI
- [bun](https://bun.sh) runtime
- Claude Max/Pro subscription OR Anthropic API key

---

## Documentation

- **[Full Reference](docs/REFERENCE.md)** — Complete feature documentation
- **[Performance Monitoring](docs/PERFORMANCE-MONITORING.md)** — Agent tracking, debugging, optimization
- **[Architecture](docs/ARCHITECTURE.md)** — How it works under the hood

---

## License

MIT

---

<div align="center">

**Inspired by:** [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) • [claude-hud](https://github.com/ryanjoachim/claude-hud) • [Superpowers](https://github.com/NexTechFusion/Superpowers) • [everything-claude-code](https://github.com/affaan-m/everything-claude-code)

**Zero learning curve. Maximum power.**

</div>

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Yeachan-Heo/oh-my-claudecode&type=date&legend=top-left)](https://www.star-history.com/#Yeachan-Heo/oh-my-claudecode&type=date&legend=top-left)

## Support This Project

If oh-my-claudecode helps your workflow, consider sponsoring:

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor-%E2%9D%A4%EF%B8%8F-red?style=for-the-badge&logo=github)](https://github.com/sponsors/Yeachan-Heo)

- Star the repo
- Report bugs
- Suggest features
- Contribute code
