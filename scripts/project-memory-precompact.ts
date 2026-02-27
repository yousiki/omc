#!/usr/bin/env bun

/**
 * PreCompact Hook: Project Memory Preservation
 * Ensures user directives and project context survive compaction
 */

import { processPreCompact } from '../src/hooks/project-memory/pre-compact.ts';
import { readStdin } from './lib/stdin.js';

/**
 * Main hook execution
 */
async function main(): Promise<void> {
  try {
    const input = await readStdin();
    const data = JSON.parse(input);

    // Process PreCompact
    const result = await processPreCompact(data as Parameters<typeof processPreCompact>[0]);

    // Return result
    console.log(JSON.stringify(result));
  } catch {
    // Always continue on error
    console.log(JSON.stringify({
      continue: true,
      suppressOutput: true,
    }));
  }
}

main();
