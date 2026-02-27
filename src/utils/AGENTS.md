<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/utils/

## Purpose

General-purpose utility functions that don't belong to a specific feature domain. Covers configuration directory resolution, frontmatter parsing, path utilities, Node.js binary resolution, and string width calculation.

## Key Files

| File | Description |
|------|-------------|
| `config-dir.ts` | Resolves `~/.claude/` and other config directories |
| `frontmatter.ts` | Parses YAML/TOML frontmatter from markdown files |
| `paths.ts` | Path manipulation and resolution utilities |
| `resolve-node.ts` | Finds the Node.js binary path for subprocess spawning |
| `string-width.ts` | Calculates display width of strings (handles Unicode/emoji) |

## For AI Agents

### Working In This Directory

- All functions are pure utilities — no side effects except `config-dir.ts` (reads env)
- Tests in `__tests__/` cover edge cases for each utility
- `string-width.ts` is used by the HUD renderer for alignment

## Dependencies

No significant external dependencies (built-in Node.js/Bun APIs only).

<!-- MANUAL: -->
