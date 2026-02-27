<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/notifications/

## Purpose

Multi-platform notification system for session lifecycle events. Sends notifications to Discord (webhook and bot), Telegram, Slack, and generic webhooks when Claude Code sessions start, end, or hit significant events. Supports per-event configuration and template-based message formatting.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Public API — `notify()`, platform send functions |
| `types.ts` | Notification types: `NotificationEvent`, `NotificationPlatform`, configs |
| `dispatcher.ts` | Routes notifications to platform-specific handlers |
| `formatter.ts` | Formats messages using template variables |
| `template-engine.ts` | Template rendering for notification messages |
| `hook-config.ts` | Per-hook notification configuration loading |
| `hook-config-types.ts` | Types for hook-level notification config |
| `session-registry.ts` | Tracks active session metadata for notifications |
| `config.ts` | Loads notification configuration from `~/.claude/` |
| `tmux.ts` | tmux session detection for notification context |
| `reply-listener.ts` | Listens for replies from notification platforms |

## For AI Agents

### Working In This Directory

- Notifications are fire-and-forget — failures are logged but not fatal
- Configuration lives in `~/.claude/omc-notifications.json`
- `dispatchNotifications()` is the main entry point
- Template variables: `{sessionId}`, `{projectPath}`, `{event}`, etc.

### Testing Requirements

- Tests in `__tests__/` use mock HTTP clients for platform calls
- Test template rendering with various variable combinations

### Common Patterns

```typescript
// Sending a notification
await notify('session-end', {
  sessionId: 'abc123',
  projectPath: '/path/to/project',
  duration: 1234
});
```

## Dependencies

### External
- HTTP fetch (built-in) — platform API calls

<!-- MANUAL: -->
