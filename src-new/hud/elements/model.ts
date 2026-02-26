/**
 * OMC HUD - Model Element
 *
 * Renders the current model name.
 */

import { cyan } from '../colors.js';
import type { ModelFormat } from '../types.js';

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
 * Extract version from a model ID string.
 * E.g., 'claude-opus-4-6-20260205' -> '4.6'
 *       'claude-sonnet-4-6-20260217' -> '4.6'
 *       'claude-haiku-4-5-20251001' -> '4.5'
 */
function extractVersion(modelId: string): string | null {
  const idMatch = modelId.match(/(?:opus|sonnet|haiku)-(\d+)-(\d+)/i);
  if (idMatch) return `${idMatch[1]}.${idMatch[2]}`;

  const displayMatch = modelId.match(/(?:opus|sonnet|haiku)\s+(\d+(?:\.\d+)?)/i);
  if (displayMatch) return displayMatch[1];

  return null;
}

/**
 * Format model name for display.
 * Converts model IDs to friendly names based on the requested format.
 */
export function formatModelName(modelId: string | null | undefined, format: ModelFormat = 'short'): string | null {
  if (!modelId) return null;

  if (format === 'full') {
    return truncateToWidth(modelId, 40);
  }

  const id = modelId.toLowerCase();
  let shortName: string | null = null;

  if (id.includes('opus')) shortName = 'Opus';
  else if (id.includes('sonnet')) shortName = 'Sonnet';
  else if (id.includes('haiku')) shortName = 'Haiku';

  if (!shortName) {
    return truncateToWidth(modelId, 20);
  }

  if (format === 'versioned') {
    const version = extractVersion(id);
    if (version) return `${shortName} ${version}`;
  }

  return shortName;
}

/**
 * Render model element.
 */
export function renderModel(modelId: string | null | undefined, format: ModelFormat = 'short'): string | null {
  const name = formatModelName(modelId, format);
  if (!name) return null;
  return cyan(name);
}
