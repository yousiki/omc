#!/usr/bin/env bun
import { readStdin } from './lib/stdin.js';

async function main(): Promise<void> {
  // Read stdin (timeout-protected, see issue #240/#459)
  const input = await readStdin();

  try {
    const data = JSON.parse(input);
    const { processSetupInit } = await import('../src/hooks/setup/index.ts');
    const result = await processSetupInit(data as Parameters<typeof processSetupInit>[0]);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('[setup-init] Error:', (error as Error).message);
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
