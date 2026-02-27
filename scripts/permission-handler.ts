#!/usr/bin/env bun
import { readStdin } from './lib/stdin.js';

async function main(): Promise<void> {
  // Read stdin (timeout-protected, see issue #240/#459)
  const input = await readStdin();

  try {
    const data = JSON.parse(input);
    const { processPermissionRequest } = await import('../src/hooks/permission-handler/index.ts');
    const result = await processPermissionRequest(data as Parameters<typeof processPermissionRequest>[0]);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('[permission-handler] Error:', (error as Error).message);
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
