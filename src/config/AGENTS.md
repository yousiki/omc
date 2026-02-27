<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/config/

## Purpose

Configuration loading and model definitions. Reads and validates the OMC configuration file (`~/.claude/.omc-config.json`) and defines the available Claude model identifiers.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export |
| `loader.ts` | Loads and validates OMC config with Zod schema |
| `models.ts` | Claude model ID constants (haiku, sonnet, opus variants) |

## For AI Agents

### Working In This Directory

- `loader.ts` caches config after first load — call `resetConfigCache()` in tests
- `models.ts` is the single source of truth for model IDs — always import from here
- Config validation uses Zod — schema changes require updating the Zod schema

### Common Patterns

```typescript
// Always use the models constants
import { CLAUDE_SONNET, CLAUDE_HAIKU, CLAUDE_OPUS } from '../config/models.js';
```

## Dependencies

### External
- `zod` — config schema validation
- `jsonc-parser` — JSONC config file parsing

<!-- MANUAL: -->
