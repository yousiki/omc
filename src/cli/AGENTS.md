<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/cli/

## Purpose

CLI entry point and command implementations for the `omc` command-line tool. Provides the user-facing interface for managing OMC installation, configuration, and status.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | CLI entry point — sets up Commander.js and registers all commands |
| `launch.ts` | Launches OMC sessions programmatically |
| `interop.ts` | CLI interoperability helpers |
| `tmux-utils.ts` | tmux session utilities for CLI use |
| `win32-warning.ts` | Windows compatibility warning message |
| `README.md` | CLI usage documentation |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `commands/` | Individual CLI command implementations (see `commands/AGENTS.md`) |
| `utils/` | CLI-specific utility functions |
| `__tests__/` | CLI unit tests |

## For AI Agents

### Working In This Directory

- CLI uses Commander.js for argument parsing
- Entry point is `src/cli/index.ts`, referenced as `bin.omc` in `package.json`
- Add new commands by creating a file in `commands/` and registering it in `index.ts`
- Keep CLI layer thin — delegate logic to `src/` modules

### Testing Requirements

- Test CLI commands in `__tests__/` using process spawn or Commander test utilities
- Verify help output and error messages

## Dependencies

### Internal
- `src/installer/` — installation commands
- `src/features/` — feature access via CLI

### External
- `commander` — CLI argument parsing
- `chalk` — terminal color output

<!-- MANUAL: -->
