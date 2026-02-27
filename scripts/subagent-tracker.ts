#!/usr/bin/env bun
import { readStdin } from './lib/stdin.js';

async function main(): Promise<void> {
  const action = process.argv[2]; // 'start' or 'stop'

  // Read stdin (timeout-protected, see issue #240/#459)
  const input = await readStdin();

  try {
    const data = JSON.parse(input);
    const { processSubagentStart, processSubagentStop } = await import('../src/hooks/subagent-tracker/index.ts');

    let result: unknown;
    if (action === 'start') {
      result = await processSubagentStart(data as Parameters<typeof processSubagentStart>[0]);
    } else if (action === 'stop') {
      result = await processSubagentStop(data as Parameters<typeof processSubagentStop>[0]);
    } else {
      console.error(`[subagent-tracker] Unknown action: ${action}`);
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    console.log(JSON.stringify(result));
  } catch (error) {
    console.error('[subagent-tracker] Error:', (error as Error).message);
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
