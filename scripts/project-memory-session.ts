#!/usr/bin/env bun

/**
 * SessionStart Hook: Project Memory Detection
 * Auto-detects project environment and injects context
 */

import { readStdin } from './lib/stdin.js';

// Dynamic import of project memory module (prevents crash if dist is missing, see issue #362)
let registerProjectMemoryContext: ((sessionId: string, directory: string) => Promise<boolean>) | null = null;
try {
  const mod = await import('../src/hooks/project-memory/index.ts');
  registerProjectMemoryContext = mod.registerProjectMemoryContext;
} catch {
  // dist not built or missing - skip project memory detection silently
}

/**
 * Main hook execution
 */
async function main(): Promise<void> {
  try {
    const input = await readStdin();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(input) as Record<string, unknown>; } catch { /* ignore */ }

    // Extract directory and session ID
    const directory = (data.cwd || data.directory || process.cwd()) as string;
    const sessionId = (data.session_id || data.sessionId || '') as string;

    // Register project memory context (skip if module unavailable)
    if (registerProjectMemoryContext) {
      await registerProjectMemoryContext(sessionId, directory);
    }

    // Return success (context registered via contextCollector, not returned here)
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
