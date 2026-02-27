import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('auto-slash command skill aliases', () => {
  const originalCwd = process.cwd();
  const originalClaudeConfigDir = process.env.CLAUDE_CONFIG_DIR;

  let tempRoot: string;
  let tempConfigDir: string;
  let tempProjectDir: string;

  async function loadExecutor() {
    vi.resetModules();
    return import('../hooks/auto-slash-command/executor.js');
  }

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'omc-auto-slash-aliases-'));
    tempConfigDir = join(tempRoot, 'claude-config');
    tempProjectDir = join(tempRoot, 'project');

    mkdirSync(join(tempConfigDir, 'skills', 'team'), { recursive: true });
    mkdirSync(join(tempConfigDir, 'skills', 'test-skill'), { recursive: true });
    mkdirSync(join(tempProjectDir, '.claude', 'commands'), { recursive: true });

    writeFileSync(
      join(tempConfigDir, 'skills', 'team', 'SKILL.md'),
      `---
name: team
description: Team orchestration
---

Team body`
    );

    writeFileSync(
      join(tempConfigDir, 'skills', 'test-skill', 'SKILL.md'),
      `---
name: test-skill
description: Test skill with alias
aliases: [ts-alias]
---

Test skill body`
    );

    process.env.CLAUDE_CONFIG_DIR = tempConfigDir;
    process.chdir(tempProjectDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (originalClaudeConfigDir === undefined) {
      delete process.env.CLAUDE_CONFIG_DIR;
    } else {
      process.env.CLAUDE_CONFIG_DIR = originalClaudeConfigDir;
    }
    vi.resetModules();
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('discovers alias commands from skill frontmatter', async () => {
    const { discoverAllCommands, findCommand, listAvailableCommands } = await loadExecutor();

    const commands = discoverAllCommands();
    const names = commands.map((command) => command.name);

    expect(names).toContain('team');
    expect(names).toContain('test-skill');
    expect(names).toContain('ts-alias');

    const alias = findCommand('ts-alias');

    expect(alias?.scope).toBe('skill');
    expect(alias?.metadata.aliasOf).toBe('test-skill');
    expect(alias?.metadata.deprecatedAlias).toBe(true);
    expect(alias?.metadata.deprecationMessage).toContain('/test-skill');

    const listedNames = listAvailableCommands().map((command) => command.name);
    expect(listedNames).toContain('team');
    expect(listedNames).toContain('test-skill');
    expect(listedNames).not.toContain('ts-alias');
  });

  it('injects deprecation warning when alias command is executed', async () => {
    const { executeSlashCommand } = await loadExecutor();

    const result = executeSlashCommand({
      command: 'ts-alias',
      args: '',
      raw: '/ts-alias',
    });

    expect(result.success).toBe(true);
    expect(result.replacementText).toContain('Deprecated Alias');
    expect(result.replacementText).toContain('/ts-alias');
    expect(result.replacementText).toContain('/test-skill');
  });
});
