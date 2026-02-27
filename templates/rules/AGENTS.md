<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# templates/rules/

## Purpose

Coding style, workflow, and best-practice rules injected into Claude Code sessions via the `rules-injector` hook. These markdown files define conventions that Claude follows when working in a project.

## Key Files

| File | Description |
|------|-------------|
| `coding-style.md` | Code style conventions (TypeScript, formatting, naming) |
| `git-workflow.md` | Git commit, branching, and PR workflow rules |
| `karpathy-guidelines.md` | Andrej Karpathy's AI coding guidelines |
| `performance.md` | Performance optimization guidelines |
| `security.md` | Security best practices and vulnerability prevention |
| `testing.md` | Testing strategy and coverage requirements |
| `README.md` | Overview of available rule sets |

## For AI Agents

### Working In This Directory

- Rules are injected at `UserPromptSubmit` time by `src/hooks/rules-injector/`
- Each file is standalone markdown — no special syntax required
- Keep rules concise: injected context consumes token budget
- Users can configure which rule files are active in their OMC config

### Common Patterns

- Rules use imperative language: "Always", "Never", "Prefer"
- Include examples of correct and incorrect patterns

## Dependencies

### Internal
- Injected by `src/hooks/rules-injector/index.ts`
- Configurable via user's `~/.claude/.omc-config.json`

<!-- MANUAL: -->
