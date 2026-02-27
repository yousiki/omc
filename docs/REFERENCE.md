# Reference Documentation

Complete reference for omc. For quick start, see the main [README.md](../README.md).

---

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Agents](#agents)
- [Skills](#skills)
- [Slash Commands](#slash-commands)
- [Hooks System](#hooks-system)
- [Magic Keywords](#magic-keywords)
- [Platform Support](#platform-support)
- [Performance Monitoring](#performance-monitoring)
- [Troubleshooting](#troubleshooting)
- [Changelog](#changelog)

---

## Installation

**Only the Claude Code Plugin method is supported.** Other installation methods (npm, bun, curl) are deprecated and may not work correctly.

### Claude Code Plugin (Required)

```bash
# Step 1: Add the marketplace
/plugin marketplace add https://github.com/Yeachan-Heo/omc

# Step 2: Install the plugin
/plugin install omc
```

This integrates directly with Claude Code's plugin system and uses Node.js hooks.

> **Note**: Direct npm/bun global installs are **not supported**. The plugin system handles all installation and hook setup automatically.

### Requirements

- [Claude Code](https://docs.anthropic.com/claude-code) installed
- One of:
  - **Claude Max/Pro subscription** (recommended for individuals)
  - **Anthropic API key** (`ANTHROPIC_API_KEY` environment variable)

---

## Configuration

### Setup

Run the CLI setup command:

```
omc setup
```

This interactive command will:
- Install CLAUDE.md (global or project-scoped)
- Set your default execution mode
- Run diagnostics for common issues

### What Configuration Enables

| Feature | Without | With omc Config |
|---------|---------|-----------------|
| Agent delegation | Manual only | Automatic based on task |
| Keyword detection | Disabled | ultrawork, search, analyze |
| Todo continuation | Basic | Enforced completion |
| Model routing | Default | Smart tier selection |
| Skill composition | None | Auto-combines skills |

### Configuration Precedence

If both configurations exist, **project-scoped takes precedence** over global:

```
./.claude/CLAUDE.md  (project)   →  Overrides  →  ~/.claude/CLAUDE.md  (global)
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OMC_STATE_DIR` | _(unset)_ | Centralized state directory. When set, OMC stores state at `$OMC_STATE_DIR/{project-id}/` instead of `{worktree}/.omc/`. This preserves state across worktree deletions. The project identifier is derived from the git remote URL (or worktree path for local-only repos). |
| `OMC_BRIDGE_SCRIPT` | _(auto-detected)_ | Path to the Python bridge script |
| `OMC_PARALLEL_EXECUTION` | `true` | Enable/disable parallel agent execution |
| `DISABLE_OMC` | _(unset)_ | Set to any value to disable all OMC hooks |
| `OMC_SKIP_HOOKS` | _(unset)_ | Comma-separated list of hook names to skip |

#### Centralized State with `OMC_STATE_DIR`

By default, OMC stores state in `{worktree}/.omc/`. This is lost when worktrees are deleted. To preserve state across worktree lifecycles, set `OMC_STATE_DIR`:

```bash
# In your shell profile (~/.bashrc, ~/.zshrc, etc.)
export OMC_STATE_DIR="$HOME/.claude/omc"
```

This resolves to `~/.claude/omc/{project-identifier}/` where the project identifier uses a hash of the git remote URL (stable across worktrees/clones) with a fallback to the directory path hash for local-only repos.

If both a legacy `{worktree}/.omc/` directory and a centralized directory exist, OMC logs a notice and uses the centralized directory. You can then migrate data from the legacy directory and remove it.

### When to Re-run Setup

- **First time**: Run after installation
- **After updates**: Re-run to get the latest configuration
- **Different machines**: Run on each machine where you use Claude Code

> **NOTE**: After updating the plugin, re-run `omc setup` to apply the latest CLAUDE.md changes.

### Agent Customization

Edit agent files in `~/.claude/agents/` to customize behavior:

```yaml
---
name: architect
description: Your custom description
tools: Read, Grep, Glob, Bash, Edit
model: opus  # or sonnet, haiku
---

Your custom system prompt here...
```

### Project-Level Config

Create `.claude/CLAUDE.md` in your project for project-specific instructions:

```markdown
# Project Context

This is a TypeScript monorepo using:
- Bun runtime
- React for frontend
- PostgreSQL database

## Conventions
- Use functional components
- All API routes in /src/api
- Tests alongside source files
```

---

## Agents

Always use `omc:` prefix when calling via Task tool.

### By Domain and Tier

| Domain | LOW (Haiku) | MEDIUM (Sonnet) | HIGH (Opus) |
|--------|-------------|-----------------|-------------|
| **Analysis** | `architect-low` | `architect-medium` | `architect` |
| **Execution** | `executor-low` | `executor` | `executor-high` |
| **Search** | `explore` | - | `explore-high` |
| **Research** | - | `document-specialist` | - |
| **Frontend** | `designer-low` | `designer` | `designer-high` |
| **Docs** | `writer` | - | - |
| **Visual** | - | `vision` | - |
| **Planning** | - | - | `planner` |
| **Critique** | - | - | `critic` |
| **Pre-Planning** | - | - | `analyst` |
| **Testing** | - | `qa-tester` | - |
| **Security** | `security-reviewer-low` | - | `security-reviewer` |
| **Build** | - | `build-fixer` | - |
| **TDD** | - | `test-engineer` | - |
| **Code Review** | - | - | `code-reviewer` |
| **Data Science** | - | `scientist` | `scientist-high` |

### Agent Selection Guide

| Task Type | Best Agent | Model |
|-----------|------------|-------|
| Quick code lookup | `explore` | haiku |
| Find files/patterns | `explore` | haiku |
| Complex architectural search | `explore-high` | opus |
| Simple code change | `executor-low` | haiku |
| Feature implementation | `executor` | sonnet |
| Complex refactoring | `executor-high` | opus |
| Debug simple issue | `architect-low` | haiku |
| Debug complex issue | `architect` | opus |
| UI component | `designer` | sonnet |
| Complex UI system | `designer-high` | opus |
| Write docs/comments | `writer` | haiku |
| Research docs/APIs | `document-specialist` | sonnet |
| Analyze images/diagrams | `vision` | sonnet |
| Strategic planning | `planner` | opus |
| Review/critique plan | `critic` | opus |
| Pre-planning analysis | `analyst` | opus |
| Test CLI interactively | `qa-tester` | sonnet |
| Security review | `security-reviewer` | opus |
| Quick security scan | `security-reviewer-low` | haiku |
| Fix build errors | `build-fixer` | sonnet |
| Simple build fix | `build-fixer` (model=haiku) | haiku |
| TDD workflow | `test-engineer` | sonnet |
| Quick test suggestions | `test-engineer` (model=haiku) | haiku |
| Code review | `code-reviewer` | opus |
| Quick code check | `code-reviewer` (model=haiku) | haiku |
| Data analysis/stats | `scientist` | sonnet |
| Quick data inspection | `scientist` (model=haiku) | haiku |
| Complex ML/hypothesis | `scientist-high` | opus |

---

## Skills

### Core Skills

| Skill | Description | Manual Command |
|-------|-------------|----------------|
| `orchestrate` | Multi-agent orchestration mode | - |
| `autopilot` | Full autonomous execution from idea to working code | `/omc:autopilot` |
| `ultrawork` | Maximum performance with parallel agents | `/omc:ultrawork` |
| `team` | N coordinated agents on shared task list using native teams | `/omc:team` |
| `pipeline` | Sequential agent chaining | `/omc:pipeline` |
| `ralph` | Self-referential development until completion | `/omc:ralph` |
| `ralph-init` | Initialize PRD for structured task tracking | `/omc:ralph-init` |
| `ultraqa` | Autonomous QA cycling workflow | `/omc:ultraqa` |
| `plan` | Start planning session (consensus mode uses RALPLAN-DR structured deliberation) | `/omc:plan` |
| `ralplan` | Iterative planning (Planner+Architect+Critic) with structured deliberation; short mode default, `--deliberate` for high-risk pre-mortem + expanded test plan | `/omc:ralplan` |
| `review` | Review work plans with critic | `/omc:review` |

### Enhancement Skills

| Skill | Description | Manual Command |
|-------|-------------|----------------|
| `deepinit` | Hierarchical AGENTS.md codebase documentation | `/omc:deepinit` |
| `deepsearch` | Thorough multi-strategy codebase search | `/omc:deepsearch` |
| `analyze` | Deep analysis and investigation | `/omc:analyze` |
| `sciomc` | Parallel scientist orchestration | `/omc:sciomc` |
| `frontend-ui-ux` | Designer-turned-developer UI/UX expertise | (silent activation) |
| `git-master` | Git expert for atomic commits and history | (silent activation) |
| `tdd` | TDD enforcement: test-first development | `/omc:tdd` |
| `learner` | Extract reusable skill from session | `/omc:learner` |
| `build-fix` | Fix build and TypeScript errors | `/omc:build-fix` |
| `code-review` | Comprehensive code review | `/omc:code-review` |
| `security-review` | Security vulnerability detection | `/omc:security-review` |

### Utility Skills

| Skill | Description | Manual Command |
|-------|-------------|----------------|
| `note` | Save notes to compaction-resilient notepad | `/omc:note` |
| `cancel` | Unified cancellation for all modes | `/omc:cancel` |
| `writer-memory` | Agentic memory system for writers | `/omc:writer-memory` |

---

## Slash Commands

All skills are available as slash commands with the prefix `/omc:`.

| Command | Description |
|---------|-------------|
| `/omc:orchestrate <task>` | Activate multi-agent orchestration mode |
| `/omc:autopilot <task>` | Full autonomous execution |
| `/omc:ultrawork <task>` | Maximum performance mode with parallel agents |
| `/omc:team <N>:<agent> <task>` | Coordinated native team workflow |
| `/omc:pipeline <stages>` | Sequential agent chaining |
| `/omc:ralph-init <task>` | Initialize PRD for structured task tracking |
| `/omc:ralph <task>` | Self-referential loop until task completion |
| `/omc:ultraqa <goal>` | Autonomous QA cycling workflow |
| `/omc:plan <description>` | Start planning session (supports consensus structured deliberation) |
| `/omc:ralplan <description>` | Iterative planning with consensus structured deliberation (`--deliberate` for high-risk mode) |
| `/omc:review [plan-path]` | Review a plan with critic |
| `/omc:deepsearch <query>` | Thorough multi-strategy codebase search |
| `/omc:deepinit [path]` | Index codebase with hierarchical AGENTS.md files |
| `/omc:analyze <target>` | Deep analysis and investigation |
| `/omc:sciomc <topic>` | Parallel research orchestration |
| `/omc:tdd <feature>` | TDD workflow enforcement |
| `/omc:learner` | Extract reusable skill from session |
| `/omc:note <content>` | Save notes to notepad.md |
| `/omc:cancel` | Unified cancellation |

---

## Hooks System

Oh-my-claudecode includes lifecycle hooks that enhance Claude Code's behavior.

### Execution Mode Hooks

| Hook | Description |
|------|-------------|
| `autopilot` | Full autonomous execution from idea to working code |
| `ultrawork` | Maximum parallel agent execution |
| `ralph` | Persistence until verified complete |
| `team-pipeline` | Native team staged pipeline orchestration |
| `ultraqa` | QA cycling until goal met |
| `mode-registry` | Tracks active execution mode state (including team/ralph/ultrawork/ralplan) |
| `persistent-mode` | Maintains mode state across sessions |

### Core Hooks

| Hook | Description |
|------|-------------|
| `rules-injector` | Dynamic rules injection with YAML frontmatter parsing |
| `omc-orchestrator` | Enforces orchestrator behavior and delegation |
| `auto-slash-command` | Automatic slash command detection and execution |
| `keyword-detector` | Magic keyword detection (ultrawork, ralph, etc.) |
| `todo-continuation` | Ensures todo list completion |
| `notepad` | Compaction-resilient memory system |
| `learner` | Skill extraction from conversations |

### Context & Recovery

| Hook | Description |
|------|-------------|
| `recovery` | Edit error, session, and context window recovery |
| `preemptive-compaction` | Context usage monitoring to prevent limits |
| `pre-compact` | Pre-compaction processing |
| `directory-readme-injector` | README context injection |

### Quality & Validation

| Hook | Description |
|------|-------------|
| `comment-checker` | BDD detection and directive filtering |
| `thinking-block-validator` | Extended thinking validation |
| `empty-message-sanitizer` | Empty message handling |
| `permission-handler` | Permission requests and validation |
| `think-mode` | Extended thinking detection |
| `code-simplifier` | Auto-simplify recently modified files on Stop (opt-in) |

### Code Simplifier Hook

The `code-simplifier` Stop hook automatically delegates recently modified source files to the
`code-simplifier` agent after each Claude turn. It is **disabled by default** and must be
explicitly enabled via `~/.omc/config.json`.

**Enable:**
```json
{
  "codeSimplifier": {
    "enabled": true
  }
}
```

**Full config options:**
```json
{
  "codeSimplifier": {
    "enabled": true,
    "extensions": [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs"],
    "maxFiles": 10
  }
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Opt-in to automatic simplification |
| `extensions` | `string[]` | `[".ts",".tsx",".js",".jsx",".py",".go",".rs"]` | File extensions to consider |
| `maxFiles` | `number` | `10` | Maximum files simplified per turn |

**How it works:**
1. When Claude stops, the hook runs `git diff HEAD --name-only` to find modified files
2. If modified source files are found, the hook injects a message asking Claude to delegate to the `code-simplifier` agent
3. The agent simplifies the files for clarity and consistency without changing behavior
4. A turn-scoped marker prevents the hook from triggering more than once per turn cycle

### Coordination & Environment

| Hook | Description |
|------|-------------|
| `subagent-tracker` | Tracks spawned sub-agents |
| `session-end` | Session termination handling |
| `non-interactive-env` | CI/non-interactive environment handling |
| `agent-usage-reminder` | Reminder to use specialized agents |
| `plugin-patterns` | Plugin pattern detection |
| `setup` | Initial setup and configuration |

---

## Magic Keywords

Just include these words anywhere in your prompt to activate enhanced modes:

| Keyword | Effect |
|---------|--------|
| `ultrawork`, `ulw`, `uw` | Activates parallel agent orchestration |
| `eco`, `efficient`, `save-tokens`, `budget` | Token-efficient parallel execution |
| `autopilot`, `build me`, `I want a` | Full autonomous execution |
| `ralph`, `don't stop`, `must complete` | Persistence until verified complete |
| `plan this`, `plan the` | Planning interview workflow |
| `ralplan` | Iterative planning consensus with structured deliberation (`--deliberate` for high-risk mode) |
| `search`, `find`, `locate` | Enhanced search mode |
| `analyze`, `investigate`, `debug` | Deep analysis mode |
| `sciomc` | Parallel research orchestration |
| `tdd`, `test first`, `red green` | TDD workflow enforcement |
| `pipeline`, `chain agents` | Sequential agent chaining |
| `stop`, `cancel`, `abort` | Unified cancellation |

### Examples

```bash
# In Claude Code:

# Maximum parallelism
ultrawork implement user authentication with OAuth

# Token-efficient parallelism
eco fix all TypeScript errors

# Enhanced search
find all files that import the utils module

# Deep analysis
analyze why the tests are failing

# Autonomous execution
autopilot: build a todo app with React

# Persistence mode
ralph: refactor the authentication module

# Planning session
plan this feature

# TDD workflow
tdd: implement password validation

# Agent chaining
pipeline: analyze → fix → test this bug
```

---

## Platform Support

### Operating Systems

| Platform | Install Method | Hook Type |
|----------|---------------|-----------|
| **Windows** | WSL2 recommended (see note) | Node.js (.mjs) |
| **macOS** | curl or npm | Bash (.sh) |
| **Linux** | curl or npm | Bash (.sh) |

> **Note**: Bash hooks are fully portable across macOS and Linux (no GNU-specific dependencies).

> **Windows**: Native Windows (win32) support is experimental. OMC requires tmux, which is not available on native Windows. **WSL2 is strongly recommended** for Windows users. See the [WSL2 installation guide](https://learn.microsoft.com/en-us/windows/wsl/install). Native Windows issues may have limited support.

> **Advanced**: Set `OMC_USE_NODE_HOOKS=1` to use Node.js hooks on macOS/Linux.

### Available Tools

| Tool | Status | Description |
|------|--------|-------------|
| **Read** | ✅ Available | Read files |
| **Write** | ✅ Available | Create files |
| **Edit** | ✅ Available | Modify files |
| **Bash** | ✅ Available | Run shell commands |
| **Glob** | ✅ Available | Find files by pattern |
| **Grep** | ✅ Available | Search file contents |
| **WebSearch** | ✅ Available | Search the web |
| **WebFetch** | ✅ Available | Fetch web pages |
| **Task** | ✅ Available | Spawn subagents |
| **TodoWrite** | ✅ Available | Track tasks |

### LSP Tools (Real Implementation)

| Tool | Status | Description |
|------|--------|-------------|
| `lsp_hover` | ✅ Implemented | Get type info and documentation at position |
| `lsp_goto_definition` | ✅ Implemented | Jump to symbol definition |
| `lsp_find_references` | ✅ Implemented | Find all usages of a symbol |
| `lsp_document_symbols` | ✅ Implemented | Get file outline (functions, classes, etc.) |
| `lsp_workspace_symbols` | ✅ Implemented | Search symbols across workspace |
| `lsp_diagnostics` | ✅ Implemented | Get errors, warnings, hints |
| `lsp_prepare_rename` | ✅ Implemented | Check if rename is valid |
| `lsp_rename` | ✅ Implemented | Rename symbol across project |
| `lsp_code_actions` | ✅ Implemented | Get available refactorings |
| `lsp_code_action_resolve` | ✅ Implemented | Get details of a code action |
| `lsp_servers` | ✅ Implemented | List available language servers |
| `lsp_diagnostics_directory` | ✅ Implemented | Project-level type checking |

> **Note**: LSP tools require language servers to be installed (typescript-language-server, pylsp, rust-analyzer, gopls, etc.). Use `lsp_servers` to check installation status.

### AST Tools (ast-grep Integration)

| Tool | Status | Description |
|------|--------|-------------|
| `ast_grep_search` | ✅ Implemented | Pattern-based code search using AST matching |
| `ast_grep_replace` | ✅ Implemented | Pattern-based code transformation |

> **Note**: AST tools use [@ast-grep/napi](https://ast-grep.github.io/) for structural code matching. Supports meta-variables like `$VAR` (single node) and `$$$` (multiple nodes).

---

## Performance Monitoring

omc includes comprehensive monitoring for agent performance, token usage, and debugging parallel workflows.

### Quick Overview

| Feature | Description | Access |
|---------|-------------|--------|
| **Agent Observatory** | Real-time agent status, efficiency, bottlenecks | HUD / API |
| **Token Analytics** | Cost tracking, usage reports, budget warnings | `omc stats`, `omc cost` |
| **Session Replay** | Event timeline for post-session analysis | `.omc/state/agent-replay-*.jsonl` |
| **Intervention System** | Auto-detection of stale agents, cost overruns | Automatic |

### CLI Commands

```bash
omc stats          # Current session statistics
omc cost daily     # Daily cost report
omc cost weekly    # Weekly cost report
omc agents         # Agent breakdown
omc backfill       # Import historical transcript data
```

### HUD Analytics Preset

Enable detailed cost tracking in your status line:

```json
{
  "omcHud": {
    "preset": "analytics"
  }
}
```

### External Resources

- **[MarginLab.ai](https://marginlab.ai)** - SWE-Bench-Pro performance tracking with statistical significance testing for detecting Claude model degradation

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Hooks not executing | Check hook permissions: `chmod +x ~/.claude/hooks/**/*.sh` |
| Agents not delegating | Verify CLAUDE.md is loaded: check `./.claude/CLAUDE.md` or `~/.claude/CLAUDE.md` |
| LSP tools not working | Install language servers: `npm install -g typescript-language-server` |
| Token limit errors | Use `/omc:` for token-efficient execution |

### Auto-Update

Oh-my-claudecode includes a silent auto-update system that checks for updates in the background.

Features:
- **Rate-limited**: Checks at most once every 24 hours
- **Concurrent-safe**: Lock file prevents simultaneous update attempts
- **Cross-platform**: Works on both macOS and Linux

To manually update, re-run the plugin install command or use Claude Code's built-in update mechanism.

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/Yeachan-Heo/omc/main/scripts/uninstall.sh | bash
```

Or manually:

```bash
rm ~/.claude/agents/{architect,document-specialist,explore,designer,writer,vision,critic,analyst,executor,qa-tester}.md
rm ~/.claude/commands/{analyze,autopilot,deepsearch,plan,review,ultrawork}.md
```

---

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for version history and release notes.

---

## License

MIT - see [LICENSE](../LICENSE)

## Credits

Inspired by [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) by code-yeongyu.
