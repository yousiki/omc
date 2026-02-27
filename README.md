# omc

omc (short for oh-my-claudecode) is a fork of [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode), rebuilt with a focus on simplicity.

## What's Different

This is a heavily customized version with the following changes:

- **Bun Runtime**: Uses [Bun](https://bun.sh) (≥1.0.0) instead of Node.js
- **No Dist Directory**: Runs directly from source — no build artifacts
- **Radical Cleanup**: Removed unused files, duplicate docs, and unnecessary clutter
- **Simplified CLI**: Single `omc setup` command replaces agent-driven setup wizards

## Status

⚠️ **Under Construction** — This is a personal fork for active development. Feel free to reference it, but expect breaking changes and no stability guarantees.

## Installation

Install as a Claude Code plugin:

```bash
/plugin marketplace add https://github.com/yousiki/omc
/plugin install omc
```

Then setup:

```bash
omc setup
```

## Requirements

- **Bun** ≥ 1.0.0 ([install](https://bun.sh))
- **Claude Code** CLI

## Quick Example

```bash
/team 3:executor "implement a feature"
```

## License

MIT

---

**Original Project**: [Yeachan-Heo/oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode)

For full documentation, refer to the original repository.
