/**
 * OMC HUD - Todos Element
 *
 * Renders todo progress display.
 */

import { RESET } from '../colors.js';
import type { TodoItem } from '../types.js';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';

// ============================================================================
// Inline string-width utility (CJK-aware truncation)
// ============================================================================

function isCJKCharacter(codePoint: number): boolean {
  return (
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) ||
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) ||
    (codePoint >= 0x20000 && codePoint <= 0x2ebef) ||
    (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
    (codePoint >= 0xac00 && codePoint <= 0xd7af) ||
    (codePoint >= 0x1100 && codePoint <= 0x11ff) ||
    (codePoint >= 0x3130 && codePoint <= 0x318f) ||
    (codePoint >= 0xa960 && codePoint <= 0xa97f) ||
    (codePoint >= 0xd7b0 && codePoint <= 0xd7ff) ||
    (codePoint >= 0x3040 && codePoint <= 0x309f) ||
    (codePoint >= 0x30a0 && codePoint <= 0x30ff) ||
    (codePoint >= 0x31f0 && codePoint <= 0x31ff) ||
    (codePoint >= 0xff01 && codePoint <= 0xff60) ||
    (codePoint >= 0xffe0 && codePoint <= 0xffe6) ||
    (codePoint >= 0x3000 && codePoint <= 0x303f) ||
    (codePoint >= 0x3200 && codePoint <= 0x32ff) ||
    (codePoint >= 0x3300 && codePoint <= 0x33ff) ||
    (codePoint >= 0xfe30 && codePoint <= 0xfe4f)
  );
}

function isZeroWidth(codePoint: number): boolean {
  return (
    codePoint === 0x200b ||
    codePoint === 0x200c ||
    codePoint === 0x200d ||
    codePoint === 0xfeff ||
    (codePoint >= 0x0300 && codePoint <= 0x036f) ||
    (codePoint >= 0x1ab0 && codePoint <= 0x1aff) ||
    (codePoint >= 0x1dc0 && codePoint <= 0x1dff) ||
    (codePoint >= 0x20d0 && codePoint <= 0x20ff) ||
    (codePoint >= 0xfe20 && codePoint <= 0xfe2f)
  );
}

function getCharWidth(char: string): number {
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return 0;
  if (isZeroWidth(codePoint)) return 0;
  if (isCJKCharacter(codePoint)) return 2;
  return 1;
}

function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07/g, '');
}

function stringWidth(str: string): number {
  if (!str) return 0;
  const stripped = stripAnsi(str);
  let width = 0;
  for (const char of stripped) {
    width += getCharWidth(char);
  }
  return width;
}

function truncateToWidthNoSuffix(str: string, maxWidth: number): string {
  let width = 0;
  let result = '';
  for (const char of str) {
    const charWidth = getCharWidth(char);
    if (width + charWidth > maxWidth) break;
    result += char;
    width += charWidth;
  }
  return result;
}

function truncateToWidth(str: string, maxWidth: number, suffix: string = '...'): string {
  if (!str || maxWidth <= 0) return '';
  const strWidth = stringWidth(str);
  if (strWidth <= maxWidth) return str;
  const suffixWidth = stringWidth(suffix);
  const targetWidth = maxWidth - suffixWidth;
  if (targetWidth <= 0) return truncateToWidthNoSuffix(suffix, maxWidth);
  return truncateToWidthNoSuffix(str, targetWidth) + suffix;
}

/**
 * Render todo progress.
 * Returns null if no todos.
 *
 * Format: todos:2/5
 */
export function renderTodos(todos: TodoItem[]): string | null {
  if (todos.length === 0) {
    return null;
  }

  const completed = todos.filter((t) => t.status === 'completed').length;
  const total = todos.length;

  let color: string;
  const percent = (completed / total) * 100;

  if (percent >= 80) {
    color = GREEN;
  } else if (percent >= 50) {
    color = YELLOW;
  } else {
    color = CYAN;
  }

  return `todos:${color}${completed}/${total}${RESET}`;
}

/**
 * Render current in-progress todo (for full mode).
 *
 * Format: todos:2/5 (working: Implementing feature)
 */
export function renderTodosWithCurrent(todos: TodoItem[]): string | null {
  if (todos.length === 0) {
    return null;
  }

  const completed = todos.filter((t) => t.status === 'completed').length;
  const total = todos.length;
  const inProgress = todos.find((t) => t.status === 'in_progress');

  const percent = (completed / total) * 100;
  let color: string;

  if (percent >= 80) {
    color = GREEN;
  } else if (percent >= 50) {
    color = YELLOW;
  } else {
    color = CYAN;
  }

  let result = `todos:${color}${completed}/${total}${RESET}`;

  if (inProgress) {
    const activeText = inProgress.activeForm || inProgress.content || '...';
    const truncated = truncateToWidth(activeText, 30);
    result += ` ${DIM}(working: ${truncated})${RESET}`;
  }

  return result;
}
