#!/usr/bin/env bun
/**
 * OMC Session Start Hook (Bun-native)
 * Restores persistent mode states when session starts.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { readStdin, readJsonFile } from '../src/utils';

async function main() {
  try {
    const input = await readStdin();
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(input || '{}');
    } catch {}

    const directory = (data.cwd ?? data.directory ?? process.cwd()) as string;
    const sessionId = (data.session_id ?? data.sessionId ?? '') as string;
    const messages: string[] = [];

    // Check for ultrawork state restore
    let ultraworkState: Record<string, unknown> | null = null;
    if (sessionId && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,255}$/.test(sessionId)) {
      ultraworkState = readJsonFile(
        join(directory, '.omc', 'state', 'sessions', sessionId, 'ultrawork-state.json'),
      );
      if (ultraworkState?.session_id && ultraworkState.session_id !== sessionId) {
        ultraworkState = null;
      }
    } else {
      ultraworkState = readJsonFile(join(directory, '.omc', 'state', 'ultrawork-state.json'));
    }

    if (ultraworkState?.active) {
      messages.push(`<session-restore>

[ULTRAWORK MODE RESTORED]

You have an active ultrawork session from ${ultraworkState.started_at}.
Original task: ${ultraworkState.original_prompt}

Continue working in ultrawork mode until all tasks are complete.

</session-restore>

---
`);
    }

    // Check for ralph loop state
    let ralphState: Record<string, unknown> | null = null;
    if (sessionId && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,255}$/.test(sessionId)) {
      ralphState = readJsonFile(
        join(directory, '.omc', 'state', 'sessions', sessionId, 'ralph-state.json'),
      );
      if (ralphState?.session_id && ralphState.session_id !== sessionId) {
        ralphState = null;
      }
    } else {
      ralphState = readJsonFile(join(directory, '.omc', 'state', 'ralph-state.json'));
      if (!ralphState) {
        ralphState = readJsonFile(join(directory, '.omc', 'ralph-state.json'));
      }
    }
    if (ralphState?.active) {
      messages.push(`<session-restore>

[RALPH LOOP RESTORED]

You have an active ralph-loop session.
Original task: ${ralphState.prompt || 'Task in progress'}
Iteration: ${ralphState.iteration || 1}/${ralphState.max_iterations || 10}

Continue working until the task is verified complete.

</session-restore>

---
`);
    }

    // Check for incomplete todos (project-local only)
    const localTodoPaths = [
      join(directory, '.omc', 'todos.json'),
      join(directory, '.claude', 'todos.json'),
    ];
    let incompleteCount = 0;
    for (const todoFile of localTodoPaths) {
      if (existsSync(todoFile)) {
        try {
          const todoData = readJsonFile(todoFile) as
            | { todos?: { status?: string }[] }
            | { status?: string }[]
            | null;
          const todos = (todoData && 'todos' in todoData ? todoData.todos : Array.isArray(todoData) ? todoData : []) ?? [];
          incompleteCount += todos.filter(
            (t: { status?: string }) => t.status !== 'completed' && t.status !== 'cancelled',
          ).length;
        } catch {}
      }
    }

    if (incompleteCount > 0) {
      messages.push(`<session-restore>

[PENDING TASKS DETECTED]

You have ${incompleteCount} incomplete tasks from a previous session.
Please continue working on these tasks.

</session-restore>

---
`);
    }

    // Check for notepad Priority Context
    const notepadPath = join(directory, '.omc', 'notepad.md');
    if (existsSync(notepadPath)) {
      try {
        const notepadContent = readFileSync(notepadPath, 'utf-8');
        const priorityMatch = notepadContent.match(/## Priority Context\n([\s\S]*?)(?=## |$)/);
        if (priorityMatch?.[1]?.trim()) {
          const cleanContent = priorityMatch[1].trim().replace(/<!--[\s\S]*?-->/g, '').trim();
          if (cleanContent) {
            messages.push(`<notepad-context>
[NOTEPAD - Priority Context]
${cleanContent}
</notepad-context>`);
          }
        }
      } catch {}
    }

    if (messages.length > 0) {
      console.log(
        JSON.stringify({
          continue: true,
          hookSpecificOutput: {
            hookEventName: 'SessionStart',
            additionalContext: messages.join('\n'),
          },
        }),
      );
    } else {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
    }
  } catch {
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
