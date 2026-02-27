<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/shared/

## Purpose

Shared TypeScript type definitions used across multiple modules. Acts as the central type registry to avoid circular imports.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export of all shared types |
| `types.ts` | Core shared interfaces: session types, hook event shapes, agent types |

## For AI Agents

### Working In This Directory

- Add types here only when they are genuinely used by 3+ modules
- Avoid adding implementation code — this directory is types only
- Use `interface` for public APIs, `type` for aliases and unions

## Dependencies

No internal dependencies (must remain leaf node to avoid circular imports).

<!-- MANUAL: -->
