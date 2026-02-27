<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# docs/agent-templates/

## Purpose

Base template files for agent prompt authoring. Provides the foundational prompt structure and tier-specific instructions that all agent prompts build upon.

## Key Files

| File | Description |
|------|-------------|
| `base-agent.md` | Base agent prompt template with common sections |
| `tier-instructions.md` | Model tier-specific behavioral instructions (haiku/sonnet/opus) |
| `README.md` | Guide for creating new agent prompts |

## For AI Agents

### Working In This Directory

- `base-agent.md` defines the common structure all agent prompts should follow
- `tier-instructions.md` defines how agent behavior should adapt per model tier
- When creating a new agent, start from `base-agent.md` as the template
- New agent prompt files go in `agents/<name>.md` (root level), not here

## Dependencies

### Internal
- Referenced by `agents/*.md` prompt files
- Used by `src/agents/*.ts` TypeScript definitions

<!-- MANUAL: -->
