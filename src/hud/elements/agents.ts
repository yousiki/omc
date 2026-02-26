/**
 * OMC HUD - Agents Element
 *
 * Renders active agent count display with multiple format options:
 * - count: agents:2
 * - codes: agents:Oes (type-coded with model tier casing)
 * - detailed: agents:[architect(2m),explore,exec]
 */

import { dim, getDurationColor, getModelTierColor, RESET } from '../colors.js';
import type { ActiveAgent, AgentsFormat } from '../types.js';

const CYAN = '\x1b[36m';

// ============================================================================
// Inline string-width utility (CJK-aware)
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

// ============================================================================
// Agent Type Codes
// ============================================================================

/**
 * Single-character codes for each agent type.
 * Case indicates model tier: Uppercase = Opus, lowercase = Sonnet/Haiku
 */
const AGENT_TYPE_CODES: Record<string, string> = {
  // ============================================================
  // BUILD/ANALYSIS LANE
  // ============================================================
  explore: 'e',
  analyst: 'T', // opus
  planner: 'P', // opus
  architect: 'A', // opus
  debugger: 'g', // sonnet
  executor: 'x', // sonnet
  'deep-executor': 'X', // opus
  verifier: 'V', // sonnet

  // ============================================================
  // REVIEW LANE
  // ============================================================
  'style-reviewer': 'y', // haiku
  'quality-reviewer': 'Qr', // sonnet
  'api-reviewer': 'i', // sonnet
  'security-reviewer': 'K', // sonnet
  'performance-reviewer': 'o', // sonnet
  'code-reviewer': 'R', // opus

  // ============================================================
  // DOMAIN SPECIALISTS
  // ============================================================
  'dependency-expert': 'l', // sonnet
  'test-engineer': 't', // sonnet
  'quality-strategist': 'Qs', // sonnet
  'build-fixer': 'b', // sonnet
  designer: 'd', // sonnet
  writer: 'w', // haiku
  'qa-tester': 'q', // sonnet
  scientist: 's', // sonnet
  'git-master': 'm', // sonnet

  // ============================================================
  // PRODUCT LANE
  // ============================================================
  'product-manager': 'Pm', // sonnet
  'ux-researcher': 'u', // sonnet
  'information-architect': 'Ia', // sonnet
  'product-analyst': 'a', // sonnet

  // ============================================================
  // COORDINATION
  // ============================================================
  critic: 'C', // opus
  vision: 'v', // sonnet
  'document-specialist': 'D', // sonnet

  // ============================================================
  // BACKWARD COMPATIBILITY (Deprecated)
  // ============================================================
  researcher: 'r', // sonnet
};

/**
 * Get single-character code for an agent type.
 */
function getAgentCode(agentType: string, model?: string): string {
  const parts = agentType.split(':');
  const shortName = parts[parts.length - 1] || agentType;

  let code = AGENT_TYPE_CODES[shortName];

  if (!code) {
    code = shortName.charAt(0).toUpperCase();
  }

  if (model) {
    const tier = model.toLowerCase();
    if (code.length === 1) {
      code = tier.includes('opus') ? code.toUpperCase() : code.toLowerCase();
    } else {
      const first = tier.includes('opus') ? code[0].toUpperCase() : code[0].toLowerCase();
      code = first + code.slice(1);
    }
  }

  return code;
}

/**
 * Format duration for display.
 * <10s: no suffix, 10s-59s: (Xs), 1m-9m: (Xm), >=10m: !
 */
function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);

  if (seconds < 10) {
    return '';
  } else if (seconds < 60) {
    return `(${seconds}s)`;
  } else if (minutes < 10) {
    return `(${minutes}m)`;
  } else {
    return '!';
  }
}

// ============================================================================
// Render Functions
// ============================================================================

/**
 * Render active agent count.
 * Returns null if no agents are running.
 *
 * Format: agents:2
 */
export function renderAgents(agents: ActiveAgent[]): string | null {
  const running = agents.filter((a) => a.status === 'running').length;

  if (running === 0) {
    return null;
  }

  return `agents:${CYAN}${running}${RESET}`;
}

/**
 * Sort agents by start time (freshest first, oldest last)
 */
function sortByFreshest(agents: ActiveAgent[]): ActiveAgent[] {
  return [...agents].sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

/**
 * Render agents with single-character type codes.
 * Uppercase = Opus tier, lowercase = Sonnet/Haiku.
 * Color-coded by model tier.
 *
 * Format: agents:Oes
 */
export function renderAgentsCoded(agents: ActiveAgent[]): string | null {
  const running = sortByFreshest(agents.filter((a) => a.status === 'running'));

  if (running.length === 0) {
    return null;
  }

  const codes = running.map((a) => {
    const code = getAgentCode(a.type, a.model);
    const color = getModelTierColor(a.model);
    return `${color}${code}${RESET}`;
  });

  return `agents:${codes.join('')}`;
}

/**
 * Render agents with codes and duration indicators.
 * Shows how long each agent has been running.
 *
 * Format: agents:O(2m)es
 */
export function renderAgentsCodedWithDuration(agents: ActiveAgent[]): string | null {
  const running = sortByFreshest(agents.filter((a) => a.status === 'running'));

  if (running.length === 0) {
    return null;
  }

  const now = Date.now();

  const codes = running.map((a) => {
    const code = getAgentCode(a.type, a.model);
    const durationMs = now - a.startTime.getTime();
    const duration = formatDuration(durationMs);

    const modelColor = getModelTierColor(a.model);

    if (duration === '!') {
      const durationColor = getDurationColor(durationMs);
      return `${modelColor}${code}${durationColor}!${RESET}`;
    } else if (duration) {
      return `${modelColor}${code}${dim(duration)}${RESET}`;
    } else {
      return `${modelColor}${code}${RESET}`;
    }
  });

  return `agents:${codes.join('')}`;
}

/**
 * Render detailed agent list (for full mode).
 *
 * Format: agents:[architect(2m),explore,exec]
 */
export function renderAgentsDetailed(agents: ActiveAgent[]): string | null {
  const running = sortByFreshest(agents.filter((a) => a.status === 'running'));

  if (running.length === 0) {
    return null;
  }

  const now = Date.now();

  const names = running.map((a) => {
    const parts = a.type.split(':');
    let name = parts[parts.length - 1] || a.type;

    if (name === 'executor') name = 'exec';
    if (name === 'deep-executor') name = 'deep-x';
    if (name === 'designer') name = 'design';
    if (name === 'qa-tester') name = 'qa';
    if (name === 'scientist') name = 'sci';
    if (name === 'security-reviewer') name = 'sec';
    if (name === 'build-fixer') name = 'build';
    if (name === 'code-reviewer') name = 'review';
    if (name === 'git-master') name = 'git';
    if (name === 'style-reviewer') name = 'style';
    if (name === 'quality-reviewer') name = 'quality';
    if (name === 'api-reviewer') name = 'api-rev';
    if (name === 'performance-reviewer') name = 'perf';
    if (name === 'dependency-expert') name = 'dep-exp';
    if (name === 'document-specialist') name = 'doc-spec';
    if (name === 'test-engineer') name = 'test-eng';
    if (name === 'quality-strategist') name = 'qs';
    if (name === 'debugger') name = 'debug';
    if (name === 'verifier') name = 'verify';
    if (name === 'product-manager') name = 'pm';
    if (name === 'ux-researcher') name = 'uxr';
    if (name === 'information-architect') name = 'ia';
    if (name === 'product-analyst') name = 'pa';

    const durationMs = now - a.startTime.getTime();
    const duration = formatDuration(durationMs);

    return duration ? `${name}${duration}` : name;
  });

  return `agents:[${CYAN}${names.join(',')}${RESET}]`;
}

/**
 * Truncate description to fit in statusline.
 * CJK-aware: accounts for double-width characters.
 */
function truncateDescription(desc: string | undefined, maxWidth: number = 20): string {
  if (!desc) return '...';
  return truncateToWidth(desc, maxWidth);
}

/**
 * Get short agent type name.
 */
function getShortAgentName(agentType: string): string {
  const parts = agentType.split(':');
  const name = parts[parts.length - 1] || agentType;

  const abbrevs: Record<string, string> = {
    executor: 'exec',
    'deep-executor': 'deep-x',
    debugger: 'debug',
    verifier: 'verify',
    'style-reviewer': 'style',
    'quality-reviewer': 'quality',
    'api-reviewer': 'api-rev',
    'security-reviewer': 'sec',
    'performance-reviewer': 'perf',
    'code-reviewer': 'review',
    'dependency-expert': 'dep-exp',
    'document-specialist': 'doc-spec',
    'test-engineer': 'test-eng',
    'quality-strategist': 'qs',
    'build-fixer': 'build',
    designer: 'design',
    'qa-tester': 'qa',
    scientist: 'sci',
    'git-master': 'git',
    'product-manager': 'pm',
    'ux-researcher': 'uxr',
    'information-architect': 'ia',
    'product-analyst': 'pa',
    researcher: 'dep-exp',
  };

  return abbrevs[name] || name;
}

/**
 * Render agents with descriptions - most informative format.
 * Shows what each agent is actually doing.
 *
 * Format: O:analyzing code | e:searching files
 */
export function renderAgentsWithDescriptions(agents: ActiveAgent[]): string | null {
  const running = sortByFreshest(agents.filter((a) => a.status === 'running'));

  if (running.length === 0) {
    return null;
  }

  const now = Date.now();

  const entries = running.map((a) => {
    const code = getAgentCode(a.type, a.model);
    const color = getModelTierColor(a.model);
    const desc = truncateDescription(a.description, 25);
    const durationMs = now - a.startTime.getTime();
    const duration = formatDuration(durationMs);

    let entry = `${color}${code}${RESET}:${dim(desc)}`;
    if (duration && duration !== '!') {
      entry += dim(duration);
    } else if (duration === '!') {
      const durationColor = getDurationColor(durationMs);
      entry += `${durationColor}!${RESET}`;
    }

    return entry;
  });

  return entries.join(dim(' | '));
}

/**
 * Render agents showing descriptions only (no codes).
 * Maximum clarity about what's running.
 *
 * Format: [analyzing code, searching files]
 */
export function renderAgentsDescOnly(agents: ActiveAgent[]): string | null {
  const running = sortByFreshest(agents.filter((a) => a.status === 'running'));

  if (running.length === 0) {
    return null;
  }

  const now = Date.now();

  const descriptions = running.map((a) => {
    const color = getModelTierColor(a.model);
    const shortName = getShortAgentName(a.type);
    const desc = a.description ? truncateDescription(a.description, 20) : shortName;
    const durationMs = now - a.startTime.getTime();
    const duration = formatDuration(durationMs);

    if (duration === '!') {
      const durationColor = getDurationColor(durationMs);
      return `${color}${desc}${durationColor}!${RESET}`;
    } else if (duration) {
      return `${color}${desc}${dim(duration)}${RESET}`;
    }
    return `${color}${desc}${RESET}`;
  });

  return `[${descriptions.join(dim(', '))}]`;
}

/**
 * Format duration with padding for alignment.
 */
function formatDurationPadded(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);

  if (seconds < 10) {
    return '    ';
  } else if (seconds < 60) {
    return `${seconds}s`.padStart(4);
  } else if (minutes < 10) {
    return `${minutes}m`.padStart(4);
  } else {
    return `${minutes}m`.padStart(4);
  }
}

/**
 * Multi-line render result type.
 */
export interface MultiLineRenderResult {
  headerPart: string | null;
  detailLines: string[];
}

/**
 * Render agents as multi-line display for maximum clarity.
 * Returns header addition + multiple detail lines.
 *
 * Format:
 * ├─ O architect     2m   analyzing architecture patterns...
 * ├─ e explore    45s  searching for test files
 * └─ x exec       1m   implementing validation logic
 */
export function renderAgentsMultiLine(agents: ActiveAgent[], maxLines: number = 5): MultiLineRenderResult {
  const running = sortByFreshest(agents.filter((a) => a.status === 'running'));

  if (running.length === 0) {
    return { headerPart: null, detailLines: [] };
  }

  const headerPart = `agents:${CYAN}${running.length}${RESET}`;

  const now = Date.now();
  const detailLines: string[] = [];
  const displayCount = Math.min(running.length, maxLines);

  running.slice(0, maxLines).forEach((a, index) => {
    const isLast = index === displayCount - 1 && running.length <= maxLines;
    const prefix = isLast ? '└─' : '├─';

    const code = getAgentCode(a.type, a.model);
    const color = getModelTierColor(a.model);
    const shortName = getShortAgentName(a.type).padEnd(12);

    const durationMs = now - a.startTime.getTime();
    const duration = formatDurationPadded(durationMs);
    const durationColor = getDurationColor(durationMs);

    const desc = a.description || '...';
    const truncatedDesc = truncateToWidth(desc, 45);

    detailLines.push(
      `${dim(prefix)} ${color}${code}${RESET} ${dim(shortName)}${durationColor}${duration}${RESET}  ${truncatedDesc}`,
    );
  });

  if (running.length > maxLines) {
    const remaining = running.length - maxLines;
    detailLines.push(`${dim(`└─ +${remaining} more agents...`)}`);
  }

  return { headerPart, detailLines };
}

/**
 * Render agents based on format configuration.
 */
export function renderAgentsByFormat(agents: ActiveAgent[], format: AgentsFormat): string | null {
  switch (format) {
    case 'count':
      return renderAgents(agents);
    case 'codes':
      return renderAgentsCoded(agents);
    case 'codes-duration':
      return renderAgentsCodedWithDuration(agents);
    case 'detailed':
      return renderAgentsDetailed(agents);
    case 'descriptions':
      return renderAgentsWithDescriptions(agents);
    case 'tasks':
      return renderAgentsDescOnly(agents);
    case 'multiline':
      return renderAgentsMultiLine(agents).headerPart;
    default:
      return renderAgentsCoded(agents);
  }
}
