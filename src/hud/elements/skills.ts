/**
 * OMC HUD - Skills Element
 *
 * Renders active skills badge (ultrawork, ralph mode indicators).
 */

import { cyan, RESET } from '../colors.js';
import type { RalphStateForHud, SkillInvocation, UltraworkStateForHud } from '../types.js';

const MAGENTA = '\x1b[35m';
const BRIGHT_MAGENTA = '\x1b[95m';

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
 * Truncate string to max visual width with ellipsis.
 * CJK-aware: accounts for double-width characters.
 */
function truncate(str: string, maxWidth: number): string {
  return truncateToWidth(str, maxWidth);
}

/**
 * Extract the display name from a skill name.
 * For namespaced skills (e.g., "oh-my-claudecode:plan"), returns only the last segment ("plan").
 * For non-namespaced skills, returns the name unchanged.
 */
function getSkillDisplayName(skillName: string): string {
  return skillName.split(':').pop() || skillName;
}

/**
 * Check if a skill name corresponds to an active mode.
 */
function isActiveMode(
  skillName: string,
  ultrawork: UltraworkStateForHud | null,
  ralph: RalphStateForHud | null,
): boolean {
  if (skillName === 'ultrawork' && ultrawork?.active) return true;
  if (skillName === 'ralph' && ralph?.active) return true;
  if (skillName === 'ultrawork+ralph' && ultrawork?.active && ralph?.active) return true;
  return false;
}

/**
 * Render active skill badges with optional last skill.
 * Returns null if no skills are active.
 *
 * Format: ultrawork or ultrawork + ralph | skill:planner
 */
export function renderSkills(
  ultrawork: UltraworkStateForHud | null,
  ralph: RalphStateForHud | null,
  lastSkill?: SkillInvocation | null,
): string | null {
  const parts: string[] = [];

  if (ralph?.active && ultrawork?.active) {
    parts.push(`${BRIGHT_MAGENTA}ultrawork+ralph${RESET}`);
  } else if (ultrawork?.active) {
    parts.push(`${MAGENTA}ultrawork${RESET}`);
  } else if (ralph?.active) {
    parts.push(`${MAGENTA}ralph${RESET}`);
  }

  if (lastSkill && !isActiveMode(lastSkill.name, ultrawork, ralph)) {
    const argsDisplay = lastSkill.args ? `(${truncate(lastSkill.args, 15)})` : '';
    const displayName = getSkillDisplayName(lastSkill.name);
    parts.push(cyan(`skill:${displayName}${argsDisplay}`));
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * Render last skill standalone (when activeSkills is disabled but lastSkill is enabled).
 */
export function renderLastSkill(lastSkill: SkillInvocation | null): string | null {
  if (!lastSkill) return null;

  const argsDisplay = lastSkill.args ? `(${truncate(lastSkill.args, 15)})` : '';
  const displayName = getSkillDisplayName(lastSkill.name);
  return cyan(`skill:${displayName}${argsDisplay}`);
}

/**
 * Render skill with reinforcement count (for debugging).
 *
 * Format: ultrawork(r3)
 */
export function renderSkillsWithReinforcement(
  ultrawork: UltraworkStateForHud | null,
  ralph: RalphStateForHud | null,
): string | null {
  if (!ultrawork?.active && !ralph?.active) {
    return null;
  }

  const parts: string[] = [];

  if (ultrawork?.active) {
    const reinforcement = ultrawork.reinforcementCount > 0 ? `(r${ultrawork.reinforcementCount})` : '';
    parts.push(`ultrawork${reinforcement}`);
  }

  if (ralph?.active) {
    parts.push('ralph');
  }

  return `${MAGENTA}${parts.join('-')}${RESET}`;
}
