#!/usr/bin/env node

import { Command } from 'commander';
import { getRuntimePackageVersion } from '../lib/version.js';
import { setupCommand } from './setup.js';

const version = getRuntimePackageVersion();

const program = new Command();

program
  .name('omc')
  .description('omc — multi-agent orchestration for Claude Code')
  .version(version);

program
  .command('setup')
  .description('Configure omc (install CLAUDE.md, set preferences, run diagnostics)')
  .action(async () => {
    await setupCommand();
  });

program.parse();
