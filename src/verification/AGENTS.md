<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/verification/

## Purpose

Verification tier selection logic. Automatically picks the appropriate verifier agent model (haiku/sonnet/opus) based on the scope and complexity of changes being verified, following the sizing guidance in the OMC operating principles.

## Key Files

| File | Description |
|------|-------------|
| `tier-selector.ts` | Selects verification tier (haiku/sonnet/opus) by change scope |
| `tier-selector.test.ts` | Unit tests for tier selection logic |

## For AI Agents

### Working In This Directory

- Tier selection is purely functional — no side effects
- Input: change metrics (file count, line count, security/arch flags)
- Output: `"haiku" | "sonnet" | "opus"` model string
- Thresholds: small (<5 files, <100 lines) → haiku; large (>20 files, security/arch) → opus; else sonnet

### Testing Requirements

- `tier-selector.test.ts` covers all boundary conditions
- Run: `bun test src/verification/tier-selector.test.ts`

## Dependencies

### Internal
- Used by `src/features/verification/` for agent dispatch

<!-- MANUAL: -->
