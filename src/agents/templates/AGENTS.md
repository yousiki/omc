<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/agents/templates/

## Purpose

Reusable prompt template fragments for agent system prompts. These markdown templates are included in agent prompts to provide consistent behavioral guidance across agent types.

## Key Files

| File | Description |
|------|-------------|
| `exploration-template.md` | Template for exploration/research task guidance |
| `implementation-template.md` | Template for implementation task guidance |

## For AI Agents

### Working In This Directory

- Templates are included via `prompt-helpers.ts` during agent configuration
- Keep templates concise — they add to every agent's token budget
- Use imperative language and concrete examples

## Dependencies

### Internal
- Loaded by `src/agents/prompt-helpers.ts`

<!-- MANUAL: -->
