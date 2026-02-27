<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/installer/

## Purpose

Installation system that sets up OMC in a user's Claude Code environment. Creates hook configurations, copies hook scripts, registers MCP servers, and manages the `~/.claude/` directory structure.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Main installer — orchestrates full installation/uninstallation |
| `hooks.ts` | Installs hook scripts and `hooks.json` configuration |

## For AI Agents

### Working In This Directory

- Installer writes to `~/.claude/` — the user's Claude Code config directory
- `hooks.ts` copies scripts from `templates/hooks/` to the install destination
- Installer is idempotent — safe to run multiple times
- Uninstaller reverses all installation steps

### Testing Requirements

- Tests in `__tests__/` use temporary directories to avoid touching real `~/.claude/`
- Mock file system operations where possible

### Common Patterns

- Check existing installations before overwriting
- Preserve user customizations (manual sections in config files)
- Log all changes for user visibility

## Dependencies

### Internal
- `templates/hooks/` — hook script templates to install
- `src/lib/worktree-paths.ts` — path resolution

<!-- MANUAL: -->
