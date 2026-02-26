/**
 * OMC HUD - Background Tasks Element
 *
 * Renders background task count display.
 */

import { RESET } from '../colors.js';
import type { BackgroundTask } from '../types.js';

const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';

const MAX_CONCURRENT = 5;

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
 * Render background task count.
 * Returns null if no tasks are running.
 *
 * Format: bg:3/5
 */
export function renderBackground(tasks: BackgroundTask[]): string | null {
  const running = tasks.filter((t) => t.status === 'running').length;

  if (running === 0) {
    return null;
  }

  let color: string;
  if (running >= MAX_CONCURRENT) {
    color = YELLOW;
  } else if (running >= MAX_CONCURRENT - 1) {
    color = CYAN;
  } else {
    color = GREEN;
  }

  return `bg:${color}${running}/${MAX_CONCURRENT}${RESET}`;
}

/**
 * Render background tasks with descriptions (for full mode).
 *
 * Format: bg:3/5 [explore,architect,...]
 */
export function renderBackgroundDetailed(tasks: BackgroundTask[]): string | null {
  const running = tasks.filter((t) => t.status === 'running');

  if (running.length === 0) {
    return null;
  }

  let color: string;
  if (running.length >= MAX_CONCURRENT) {
    color = YELLOW;
  } else if (running.length >= MAX_CONCURRENT - 1) {
    color = CYAN;
  } else {
    color = GREEN;
  }

  const descriptions = running.slice(0, 3).map((t) => {
    if (t.agentType) {
      const parts = t.agentType.split(':');
      return parts[parts.length - 1];
    }
    return truncateToWidth(t.description, 8, '');
  });

  const suffix = running.length > 3 ? `,+${running.length - 3}` : '';
  return `bg:${color}${running.length}/${MAX_CONCURRENT}${RESET} ${DIM}[${descriptions.join(',')}${suffix}]${RESET}`;
}
