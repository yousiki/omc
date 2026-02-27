<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/openclaw/

## Purpose

OpenClaw gateway integration. Wakes external automations and AI agents by sending HTTP or command-based signals on Claude Code hook events. Non-blocking fire-and-forget design to avoid slowing Claude's hook pipeline. Supports HTTP gateway (webhook) and command gateway (local process) modes.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Public API — `wakeGateway()`, config loading, gateway resolution |
| `types.ts` | Types: `OpenClawConfig`, `OpenClawGatewayConfig`, `OpenClawPayload`, etc. |
| `config.ts` | Loads OpenClaw config from `~/.claude/omc-openclaw.json` |
| `dispatcher.ts` | Dispatches wake signals to HTTP or command gateways |

## For AI Agents

### Working In This Directory

- OpenClaw is always non-blocking — use `await` but catch and swallow errors
- HTTP gateways receive a JSON payload with event name and context
- Command gateways run a local shell command with interpolated instruction
- `interpolateInstruction()` substitutes `{variable}` placeholders in commands
- `shellEscapeArg()` sanitizes user data before shell interpolation
- Only whitelisted context fields are sent to prevent data leakage

### Security Notes

- `shellEscapeArg()` must be used for all shell-interpolated values
- Context whitelist in `index.ts` prevents accidental leakage of sensitive fields

### Testing Requirements

- Tests in `__tests__/` mock HTTP fetch and `child_process.exec`

## Dependencies

### Internal
- `src/notifications/tmux.ts` — tmux session context

<!-- MANUAL: -->
