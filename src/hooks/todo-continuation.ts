/**
 * Todo Continuation Hook
 *
 * Prevents stopping when incomplete todos/tasks remain.
 * Checks `.omc/todos.json` and `.claude/todos.json` for pending items.
 * Tracks attempt count to prevent infinite loops (max 5 attempts).
 *
 * Simplified from old src/hooks/todo-continuation/index.ts:
 * - No session-scoped task files, no global scan
 * - Pure JSON file-based state in `.omc/state/todo-continuation.json`
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { HookInput, HookOutput } from '../types';
import { readJsonFile, writeJsonFile } from '../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TodoItem {
  content: string;
  status: string;
}

interface TodoContinuationState {
  attempts: number;
  lastChecked: string;
  sessionId?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function stateFilePath(directory: string): string {
  return join(directory, '.omc', 'state', 'todo-continuation.json');
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

function readState(directory: string): TodoContinuationState | null {
  return readJsonFile<TodoContinuationState>(stateFilePath(directory));
}

function writeState(directory: string, state: TodoContinuationState): void {
  writeJsonFile(stateFilePath(directory), state);
}

// ---------------------------------------------------------------------------
// Todo file parsing
// ---------------------------------------------------------------------------

function parseTodoFile(filePath: string): TodoItem[] {
  try {
    if (!existsSync(filePath)) return [];
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);

    // Handle array format
    if (Array.isArray(data)) {
      return data.filter((item) => item && typeof item.content === 'string' && typeof item.status === 'string');
    }

    // Handle object format with todos array
    if (data.todos && Array.isArray(data.todos)) {
      return data.todos.filter((item: unknown) => {
        const todo = item as Record<string, unknown>;
        return todo && typeof todo.content === 'string' && typeof todo.status === 'string';
      }) as TodoItem[];
    }

    return [];
  } catch {
    return [];
  }
}

function isIncomplete(todo: TodoItem): boolean {
  return todo.status !== 'completed' && todo.status !== 'cancelled';
}

// ---------------------------------------------------------------------------
// Incomplete todo detection
// ---------------------------------------------------------------------------

function countIncompleteTodos(directory: string): number {
  const paths = [join(directory, '.omc', 'todos.json'), join(directory, '.claude', 'todos.json')];

  const seen = new Set<string>();
  let count = 0;

  for (const p of paths) {
    const todos = parseTodoFile(p);
    for (const todo of todos) {
      const key = `${todo.content}:${todo.status}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (isIncomplete(todo)) count++;
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function checkIncompleteTodos(input: HookInput, directory: string): HookOutput {
  const incompleteCount = countIncompleteTodos(directory);

  if (incompleteCount === 0) {
    return { continue: true };
  }

  // Track attempts to prevent infinite loops
  const state = readState(directory) ?? { attempts: 0, lastChecked: '' };
  state.attempts += 1;
  state.lastChecked = new Date().toISOString();
  state.sessionId = input.sessionId;
  writeState(directory, state);

  // After max attempts, allow stop
  if (state.attempts > MAX_ATTEMPTS) {
    return { continue: true };
  }

  return {
    continue: true,
    message: `<system-reminder>
hook additional context: You have ${incompleteCount} incomplete task(s). Continue working on the remaining items. (attempt ${state.attempts}/${MAX_ATTEMPTS})
</system-reminder>`,
  };
}
