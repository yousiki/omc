#!/usr/bin/env bun
import { readStdin } from './lib/stdin.js';

async function main(): Promise<void> {
  // Read stdin (timeout-protected, see issue #240/#459)
  const input = await readStdin();

  try {
    const data = JSON.parse(input);
    const { processSessionEnd } = await import('../src/hooks/session-end/index.ts');
    const result = await processSessionEnd(data as Parameters<typeof processSessionEnd>[0]);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('[session-end] Error:', (error as Error).message);
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
