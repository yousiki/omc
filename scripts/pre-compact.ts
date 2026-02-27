#!/usr/bin/env bun
import { readStdin } from './lib/stdin.js';

async function main(): Promise<void> {
  // Read stdin (timeout-protected, see issue #240/#459)
  const input = await readStdin();

  try {
    const data = JSON.parse(input);
    const { processPreCompact } = await import('../src/hooks/pre-compact/index.ts');
    const result = await processPreCompact(data as Parameters<typeof processPreCompact>[0]);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('[pre-compact] Error:', (error as Error).message);
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
