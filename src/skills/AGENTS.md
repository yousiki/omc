<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/skills/

## Purpose

Source code for the skills runtime — handles loading, parsing, and executing user-invocable skills. Skills are markdown files in `skills/` (root) that define the prompts and instructions injected when a user invokes a `/skill-name` command.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Skills runtime — loads and dispatches skill invocations |

## For AI Agents

### Working In This Directory

- Skill definitions (markdown content) live in `skills/<name>/` at the project root
- This directory contains the runtime that executes those definitions
- `index.ts` maps skill names to their markdown files and handles injection

### Testing Requirements

- Tests in `__tests__/` mock file system reads for skill markdown files

## Dependencies

### Internal
- `skills/` (root) — skill markdown definition files
- `src/hooks/auto-slash-command/` — detects skill invocations

<!-- MANUAL: -->
