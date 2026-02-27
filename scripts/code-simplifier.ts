#!/usr/bin/env node

/**
 * OMC Code Simplifier Stop Hook (Node.js)
 *
 * Intercepts Stop events to automatically delegate recently modified source files
 * to the code-simplifier agent for cleanup and simplification.
 *
 * Opt-in via ~/.omc/config.json: { "codeSimplifier": { "enabled": true } }
 * Default: disabled (must explicitly opt in)
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  unlinkSync,
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import { readStdin } from './lib/stdin.js';

interface HookInput {
  cwd?: string;
  directory?: string;
}

interface OmcConfig {
  codeSimplifier?: {
    enabled?: boolean;
    extensions?: string[];
    maxFiles?: number;
  };
}

const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'];
const DEFAULT_MAX_FILES = 10;
const MARKER_FILENAME = 'code-simplifier-triggered.marker';

function readJsonFile(filePath: string): OmcConfig | null {
  try {
    if (!existsSync(filePath)) return null;
    return JSON.parse(readFileSync(filePath, 'utf-8')) as OmcConfig;
  } catch {
    return null;
  }
}

function readOmcConfig(): OmcConfig | null {
  return readJsonFile(join(homedir(), '.omc', 'config.json'));
}

function isEnabled(config: OmcConfig | null): boolean {
  return config?.codeSimplifier?.enabled === true;
}

function getModifiedFiles(cwd: string, extensions: string[], maxFiles: number): string[] {
  try {
    const output = execSync('git diff HEAD --name-only', {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5000,
    });

    return output
      .trim()
      .split('\n')
      .filter((f) => f.trim().length > 0)
      .filter((f) => extensions.some((ext) => f.endsWith(ext)))
      .slice(0, maxFiles);
  } catch {
    return [];
  }
}

function buildMessage(files: string[]): string {
  const fileList = files.map((f) => `  - ${f}`).join('\n');
  const fileArgs = files.join('\\n');
  return (
    `[CODE SIMPLIFIER] Recently modified files detected. Delegate to the ` +
    `code-simplifier agent to simplify the following files for clarity, ` +
    `consistency, and maintainability (without changing behavior):\n\n` +
    `${fileList}\n\n` +
    `Use: Task(subagent_type="omc:code-simplifier", ` +
    `prompt="Simplify the recently modified files:\\n${fileArgs}")`
  );
}

async function main(): Promise<void> {
  try {
    const input = await readStdin();
    let data: HookInput = {};
    try {
      data = JSON.parse(input) as HookInput;
    } catch {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const cwd = data.cwd || data.directory || process.cwd();
    const stateDir = join(cwd, '.omc', 'state');
    const config = readOmcConfig();

    if (!isEnabled(config)) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const markerPath = join(stateDir, MARKER_FILENAME);

    // If already triggered this turn, clear marker and allow stop
    if (existsSync(markerPath)) {
      try {
        unlinkSync(markerPath);
      } catch {
        // ignore
      }
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    const extensions = config?.codeSimplifier?.extensions ?? DEFAULT_EXTENSIONS;
    const maxFiles = config?.codeSimplifier?.maxFiles ?? DEFAULT_MAX_FILES;
    const files = getModifiedFiles(cwd, extensions, maxFiles);

    if (files.length === 0) {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
      return;
    }

    // Write trigger marker to prevent re-triggering within this turn cycle
    try {
      if (!existsSync(stateDir)) {
        mkdirSync(stateDir, { recursive: true });
      }
      writeFileSync(markerPath, new Date().toISOString(), 'utf-8');
    } catch {
      // best-effort — proceed even if marker write fails
    }

    process.stdout.write(
      JSON.stringify({ decision: 'block', reason: buildMessage(files) }) + '\n',
    );
  } catch (error) {
    try {
      process.stderr.write(`[code-simplifier] Error: ${(error as Error)?.message || error}\n`);
    } catch {
      // ignore
    }
    try {
      process.stdout.write(JSON.stringify({ continue: true }) + '\n');
    } catch {
      process.exit(0);
    }
  }
}

process.on('uncaughtException', (error: Error) => {
  try {
    process.stderr.write(`[code-simplifier] Uncaught: ${error?.message || error}\n`);
  } catch {
    // ignore
  }
  try {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  } catch {
    // ignore
  }
  process.exit(0);
});

process.on('unhandledRejection', (error: unknown) => {
  try {
    process.stderr.write(`[code-simplifier] Unhandled: ${(error as Error)?.message || error}\n`);
  } catch {
    // ignore
  }
  try {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  } catch {
    // ignore
  }
  process.exit(0);
});

// Safety timeout: force exit after 10 seconds to prevent hook from hanging
const safetyTimeout = setTimeout(() => {
  try {
    process.stderr.write('[code-simplifier] Safety timeout reached, forcing exit\n');
  } catch {
    // ignore
  }
  try {
    process.stdout.write(JSON.stringify({ continue: true }) + '\n');
  } catch {
    // ignore
  }
  process.exit(0);
}, 10000);

main().finally(() => {
  clearTimeout(safetyTimeout);
});
