#!/usr/bin/env bun
import { readStdin } from './lib/stdin.js';

async function main(): Promise<void> {
  // Read stdin (timeout-protected, see issue #240/#459)
  const input = await readStdin();

  try {
    const data = JSON.parse(input);
    const { processSetupMaintenance } = await import('../src/hooks/setup/index.ts');
    const result = await processSetupMaintenance(data as Parameters<typeof processSetupMaintenance>[0]);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('[setup-maintenance] Error:', (error as Error).message);
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
