<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# agents/

## Purpose

Agent prompt templates (.md files) that define the system prompts and behavioral instructions for each specialized AI agent type. These files are loaded at runtime by `src/agents/` to construct agent configurations. Each file corresponds to one agent type and contains the markdown system prompt that shapes agent behavior.

## Key Files

| File | Description |
|------|-------------|
| `analyst.md` | Requirements clarification, acceptance criteria, hidden constraints |
| `architect.md` | System design, boundaries, interfaces, long-horizon tradeoffs |
| `build-fixer.md` | Build/toolchain/type failure resolution (minimal diffs) |
| `code-reviewer.md` | Comprehensive API, contracts, versioning, backward compatibility |
| `code-simplifier.md` | Code clarity and consistency improvements |
| `critic.md` | Plan/design critical challenge and adversarial review |
| `debugger.md` | Root-cause analysis, regression isolation, failure diagnosis |
| `deep-executor.md` | Complex autonomous goal-oriented task execution |
| `designer.md` | UX/UI architecture and interaction design |
| `document-specialist.md` | External documentation and reference lookup |
| `executor.md` | Standard code implementation and refactoring |
| `explore.md` | Internal codebase discovery and symbol/file mapping |
| `git-master.md` | Git operations, atomic commits, history management |
| `planner.md` | Task sequencing, execution plans, risk flags |
| `qa-tester.md` | Interactive CLI/service runtime validation via tmux |
| `quality-reviewer.md` | Logic defects, maintainability, anti-patterns, SOLID |
| `scientist.md` | Data and statistical analysis |
| `security-reviewer.md` | Vulnerabilities, trust boundaries, authn/authz |
| `test-engineer.md` | Test strategy, coverage, flaky-test hardening |
| `verifier.md` | Completion evidence, claim validation, test adequacy |
| `writer.md` | Documentation, migration notes, user guidance |

## For AI Agents

### Working In This Directory

- Each `.md` file is a system prompt for an agent type
- The TypeScript source counterpart lives in `src/agents/<name>.ts`
- Keep prompts focused on the agent's specialty — avoid scope creep
- Use clear section headers in markdown for readability
- After editing a prompt, verify it renders correctly in the agent definition

### Common Patterns

- Prompts reference the agent's role, responsibilities, and output format
- Include examples of good vs. bad outputs where helpful
- Reference other agents for handoffs (e.g., "pass implementation to executor")

## Dependencies

### Internal
- Loaded by `src/agents/*.ts` agent definitions
- Referenced in `src/agents/definitions.ts` agent registry
- `base-agent.md` and `tier-instructions.md` live in `docs/agent-templates/` as base templates

<!-- MANUAL: -->
