#!/usr/bin/env bun
/**
 * Single hook entry point for Claude Code.
 * Replaces the old run.cjs + *.mjs + bridge.ts chain.
 *
 * Usage: bun run scripts/hook-entry.ts <hook-type>
 * Input: JSON on stdin
 * Output: JSON on stdout
 */

import { readStdin } from '../src/utils';
import { processHook } from '../src/hooks/bridge';

async function main() {
  const hookType = process.argv[2];
  if (!hookType) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  try {
    const inputStr = await readStdin(5000);
    const rawInput = inputStr ? JSON.parse(inputStr) : {};
    const result = await processHook(hookType, rawInput);
    process.stdout.write(JSON.stringify(result));
  } catch {
    // Never crash -- always output valid JSON
    process.stdout.write(JSON.stringify({ continue: true }));
  }
}

main().catch(() => {
  process.stdout.write(JSON.stringify({ continue: true }));
  process.exit(0);
});
