#!/usr/bin/env bun

/**
 * PostToolUse Hook: Project Memory Learning
 * Learns from tool outputs and updates project memory
 */

import { readStdin } from './lib/stdin.js';

// Debug logging helper - gated behind OMC_DEBUG env var
const debugLog = (...args: unknown[]): void => {
  if (process.env.OMC_DEBUG) console.error('[omc:debug:project-memory]', ...args);
};

// Dynamic imports with graceful fallback (separate try-catch for partial availability)
let learnFromToolOutput: ((toolName: string, toolInput: any, toolOutput: string, projectRoot: string) => Promise<void>) | null = null;
let findProjectRoot: ((directory: string) => string | null) | null = null;
try {
  learnFromToolOutput = (await import('../src/hooks/project-memory/learner.ts')).learnFromToolOutput;
} catch (err) {
  const nodeErr = err as NodeJS.ErrnoException;
  if (nodeErr?.code === 'ERR_MODULE_NOT_FOUND') {
    debugLog('learner module not found, skipping');
  } else {
    debugLog('Unexpected learner import error:', nodeErr?.code, nodeErr?.message);
  }
}
try {
  findProjectRoot = (await import('../src/hooks/rules-injector/finder.ts')).findProjectRoot;
} catch (err) {
  const nodeErr = err as NodeJS.ErrnoException;
  if (nodeErr?.code === 'ERR_MODULE_NOT_FOUND') {
    debugLog('finder module not found, skipping');
  } else {
    debugLog('Unexpected finder import error:', nodeErr?.code, nodeErr?.message);
  }
}

/**
 * Main hook execution
 */
async function main(): Promise<void> {
  try {
    const input = await readStdin();
    const data = JSON.parse(input) as Record<string, unknown>;

    // Early exit if imports failed
    if (!learnFromToolOutput || !findProjectRoot) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    // Extract directory and find project root
    const directory = (data.cwd || data.directory || process.cwd()) as string;
    const projectRoot = findProjectRoot(directory);

    if (projectRoot) {
      // Learn from tool output
      await learnFromToolOutput(
        (data.tool_name || data.toolName || '') as string,
        data.tool_input || data.toolInput || {},
        (data.tool_response || data.toolOutput || '') as string,
        projectRoot
      );
    }

    // Return success
    console.log(JSON.stringify({
      continue: true,
      suppressOutput: true
    }));
  } catch {
    // Always continue on error
    console.log(JSON.stringify({
      continue: true,
      suppressOutput: true
    }));
  }
}

main();
