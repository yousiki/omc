<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/cli/commands/

## Purpose

Individual CLI command implementations for the `omc` tool. Each file implements one subcommand registered with Commander.js in the parent `index.ts`.

## Key Files

| File | Description |
|------|-------------|
| `doctor-conflicts.ts` | `omc doctor` — diagnoses hook/config conflicts |
| `teleport.ts` | `omc teleport` — session switching/resumption |
| `wait.ts` | `omc wait` — waits for background jobs to complete |

## For AI Agents

### Working In This Directory

- Each command file exports a Commander.js `Command` object
- Register new commands in `src/cli/index.ts`
- Keep command implementations thin — delegate to `src/` modules
- Tests in `__tests__/` cover argument parsing and output formatting

## Dependencies

### Internal
- `src/team/` — job status for `wait` command
- `src/lib/` — utilities

### External
- `commander` — command definition

<!-- MANUAL: -->
