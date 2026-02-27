import * as p from '@clack/prompts';
import chalk from 'chalk';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { mergeClaudeMd } from '../installer/index.js';

const CLAUDE_DIR = join(homedir(), '.claude');
const OMC_CONFIG = join(CLAUDE_DIR, '.omc-config.json');

interface OmcConfig {
  setupComplete?: boolean;
  setupTimestamp?: string;
  defaultExecutionMode?: string;
  [key: string]: unknown;
}

function readConfig(): OmcConfig {
  if (existsSync(OMC_CONFIG)) {
    try {
      return JSON.parse(readFileSync(OMC_CONFIG, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function writeConfig(config: OmcConfig): void {
  mkdirSync(dirname(OMC_CONFIG), { recursive: true });
  writeFileSync(OMC_CONFIG, JSON.stringify(config, null, 2) + '\n');
}

export async function setupCommand(): Promise<void> {
  p.intro(chalk.bold('omc setup'));

  // Step 1: Detect existing installation
  const config = readConfig();
  const claudeMdGlobal = join(CLAUDE_DIR, 'CLAUDE.md');
  const claudeMdProject = join(process.cwd(), '.claude', 'CLAUDE.md');
  const hasExisting = config.setupComplete || existsSync(claudeMdGlobal);

  if (hasExisting) {
    const reconfigure = await p.confirm({
      message: 'Existing omc installation detected. Reconfigure?',
      initialValue: false,
    });
    if (p.isCancel(reconfigure) || !reconfigure) {
      p.outro('Setup cancelled.');
      return;
    }
  }

  // Step 2: CLAUDE.md installation target
  const target = await p.select({
    message: 'Where should omc install its CLAUDE.md?',
    options: [
      { value: 'global', label: 'Global (~/.claude/CLAUDE.md)', hint: 'applies to all projects' },
      { value: 'project', label: 'Project (.claude/CLAUDE.md)', hint: 'this project only' },
    ],
  });

  if (p.isCancel(target)) {
    p.outro('Setup cancelled.');
    return;
  }

  // Find the source CLAUDE.md from the plugin root
  const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || dirname(dirname(import.meta.dirname));
  const sourceMd = join(pluginRoot, 'docs', 'CLAUDE.md');

  if (!existsSync(sourceMd)) {
    p.log.error(`Could not find docs/CLAUDE.md at ${sourceMd}`);
    p.outro('Setup failed.');
    process.exit(1);
  }

  const sourceContent = readFileSync(sourceMd, 'utf-8');
  const targetPath = target === 'global' ? claudeMdGlobal : claudeMdProject;

  mkdirSync(dirname(targetPath), { recursive: true });

  if (existsSync(targetPath)) {
    const existing = readFileSync(targetPath, 'utf-8');
    const merged = mergeClaudeMd(existing, sourceContent);
    writeFileSync(targetPath, merged);
    p.log.success(`Updated ${targetPath}`);
  } else {
    writeFileSync(targetPath, sourceContent);
    p.log.success(`Installed ${targetPath}`);
  }

  // Step 3: Default execution mode
  const mode = await p.select({
    message: 'Default execution mode?',
    options: [
      { value: 'ultrawork', label: 'Ultrawork', hint: 'maximum parallelism' },
      { value: 'team', label: 'Team', hint: 'coordinated multi-agent' },
      { value: 'autopilot', label: 'Autopilot', hint: 'fully autonomous' },
    ],
  });

  if (p.isCancel(mode)) {
    p.outro('Setup cancelled.');
    return;
  }

  // Step 4: Save config
  const newConfig: OmcConfig = {
    ...config,
    setupComplete: true,
    setupTimestamp: new Date().toISOString(),
    defaultExecutionMode: mode as string,
  };
  writeConfig(newConfig);
  p.log.success('Configuration saved.');

  // Step 5: Diagnostics
  const s = p.spinner();
  s.start('Running diagnostics...');

  const issues: string[] = [];

  // Check for legacy hooks in settings.json
  const settingsFile = join(CLAUDE_DIR, 'settings.json');
  if (existsSync(settingsFile)) {
    try {
      const settings = JSON.parse(readFileSync(settingsFile, 'utf-8'));
      if (settings.hooks) {
        const hookStr = JSON.stringify(settings.hooks);
        if (hookStr.includes('omc') || hookStr.includes('oh-my-claudecode')) {
          issues.push('Legacy hook entries found in ~/.claude/settings.json — these are no longer needed (hooks are delivered via plugin)');
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Check for stale plugin cache versions
  const cacheDir = join(CLAUDE_DIR, 'plugins', 'cache', 'omc');
  if (existsSync(cacheDir)) {
    try {
      const versions = readdirSync(cacheDir);
      if (versions.length > 1) {
        issues.push(`Multiple plugin versions in cache (${versions.join(', ')}). Consider removing old versions.`);
      }
    } catch { /* ignore */ }
  }

  // Check for orphaned files
  const legacyDirs = ['agents', 'commands', 'skills'].map(d => join(CLAUDE_DIR, d));
  for (const dir of legacyDirs) {
    if (existsSync(dir)) {
      issues.push(`Legacy directory found: ${dir} — may contain outdated files from curl-based install`);
    }
  }

  s.stop('Diagnostics complete.');

  if (issues.length > 0) {
    p.log.warn(`Found ${issues.length} issue(s):`);
    for (const issue of issues) {
      p.log.message(`  - ${issue}`);
    }
  } else {
    p.log.success('No issues found.');
  }

  p.outro(chalk.green('Setup complete!'));
}
