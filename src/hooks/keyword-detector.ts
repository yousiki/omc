/**
 * Keyword Detector Hook
 *
 * Detects execution mode keywords in user prompts and returns the appropriate
 * mode message to inject into context.
 */

import { applyMagicKeywords } from '../features/magic-keywords';
import type { HookInput, HookOutput } from '../types';
import { removeCodeBlocks } from '../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const KEYWORD_PATTERNS = {
  cancel: /\b(cancelomc|stopomc)\b/i,
  ralph: /\b(ralph)\b(?!-)/i,
  autopilot: /\b(autopilot|auto[\s-]?pilot|fullsend|full\s+auto)\b/i,
  ultrawork: /\b(ultrawork|ulw)\b/i,
  pipeline: /\bagent\s+pipeline\b|\bchain\s+agents\b/i,
  ralplan: /\b(ralplan)\b/i,
  tdd: /\b(tdd)\b|\btest\s+first\b/i,
  ultrathink: /\b(ultrathink)\b/i,
  deepsearch: /\b(deepsearch)\b|\bsearch\s+the\s+codebase\b|\bfind\s+in\s+(the\s+)?codebase\b/i,
  analyze: /\b(deep[\s-]?analyze|deepanalyze)\b/i,
} as const;

export type KeywordType = keyof typeof KEYWORD_PATTERNS;

export interface DetectedKeyword {
  type: KeywordType;
  keyword: string;
  position: number;
}

// ---------------------------------------------------------------------------
// Priority & heavy modes
// ---------------------------------------------------------------------------

const PRIORITY_ORDER: KeywordType[] = [
  'cancel',
  'ralph',
  'autopilot',
  'ultrawork',
  'pipeline',
  'ralplan',
  'tdd',
  'ultrathink',
  'deepsearch',
  'analyze',
];

/** Heavy orchestration modes suppressed for small tasks */
const HEAVY_MODES = new Set<KeywordType>(['ralph', 'autopilot', 'ultrawork', 'pipeline', 'ralplan']);

// ---------------------------------------------------------------------------
// Non-Latin script pattern (for multilingual prompt detection)
// ---------------------------------------------------------------------------

/**
 * Matches non-Latin script characters: CJK, Korean, Cyrillic, Arabic,
 * Devanagari, Thai, Myanmar.
 */
export const NON_LATIN_SCRIPT_PATTERN =
  /[\u3000-\u9FFF\uAC00-\uD7AF\u0400-\u04FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u1000-\u109F]/u;

// ---------------------------------------------------------------------------
// Sanitization helpers
// ---------------------------------------------------------------------------

/**
 * Sanitize text for keyword detection by removing structural noise.
 * Strips XML-like tags, URLs, file paths, and code blocks.
 */
export function sanitizeForKeywordDetection(text: string): string {
  // Cap input to prevent regex pathology on very long strings
  const capped = text.length > 10_000 ? text.slice(0, 10_000) : text;
  // Remove simple XML-like tags (non-greedy, no backreference)
  let result = capped.replace(/<\/?[\w][\w-]*(?:\s[^>]*)?\s*>/g, '');
  // Remove URLs
  result = result.replace(/https?:\/\/\S+/g, '');
  // Remove file paths
  result = result.replace(/(^|[\s"'`(])(?:\.?\/(?:[\w.-]+\/)*[\w.-]+|(?:[\w.-]+\/)+[\w.-]+\.\w+)/gm, '$1');
  // Remove code blocks (fenced and inline)
  result = removeCodeBlocks(result);
  return result;
}

// ---------------------------------------------------------------------------
// Task-size classification (inlined — lightweight, no separate module needed)
// ---------------------------------------------------------------------------

type TaskSize = 'small' | 'medium' | 'large';

const SMALL_TASK_SIGNALS: RegExp[] = [
  /\btypo\b/i,
  /\bspelling\b/i,
  /\brename\s+\w+\s+to\b/i,
  /\bone[\s-]liner?\b/i,
  /\bone[\s-]line\s+fix\b/i,
  /\bsingle\s+file\b/i,
  /\bin\s+this\s+file\b/i,
  /\bthis\s+function\b/i,
  /\bthis\s+line\b/i,
  /\bminor\s+(fix|change|update|tweak)\b/i,
  /\bfix\s+(a\s+)?typo\b/i,
  /\badd\s+a?\s*comment\b/i,
  /\bwhitespace\b/i,
  /\bindentation\b/i,
  /\bformat(ting)?\s+(this|the)\b/i,
  /\bquick\s+fix\b/i,
  /\bsmall\s+(fix|change|tweak|update)\b/i,
  /\bupdate\s+(the\s+)?version\b/i,
  /\bbump\s+version\b/i,
];

const LARGE_TASK_SIGNALS: RegExp[] = [
  /\barchitect(ure|ural)?\b/i,
  /\brefactor\b/i,
  /\bredesign\b/i,
  /\bfrom\s+scratch\b/i,
  /\bcross[\s-]cutting\b/i,
  /\bentire\s+(codebase|project|application|app|system)\b/i,
  /\ball\s+(files|modules|components)\b/i,
  /\bmultiple\s+files\b/i,
  /\bacross\s+(the\s+)?(codebase|project|files|modules)\b/i,
  /\bsystem[\s-]wide\b/i,
  /\bmigrat(e|ion)\b/i,
  /\bfull[\s-]stack\b/i,
  /\bend[\s-]to[\s-]end\b/i,
  /\boverhaul\b/i,
  /\bcomprehensive\b/i,
  /\bextensive\b/i,
  /\bimplement\s+(a\s+)?(new\s+)?system\b/i,
  /\bbuild\s+(a\s+)?(complete|full|new)\b/i,
];

const ESCAPE_HATCH_PREFIXES = ['quick:', 'simple:', 'tiny:', 'minor:', 'small:', 'just:', 'only:'];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function classifyTaskSize(text: string, smallWordLimit = 50): TaskSize {
  const wordCount = countWords(text);
  const trimmed = text.trim().toLowerCase();

  if (ESCAPE_HATCH_PREFIXES.some((p) => trimmed.startsWith(p))) return 'small';
  if (LARGE_TASK_SIGNALS.some((p) => p.test(text))) return 'large';
  if (wordCount > 200) return 'large';
  if (SMALL_TASK_SIGNALS.some((p) => p.test(text))) return 'small';
  if (wordCount <= smallWordLimit) return 'small';

  return 'medium';
}

// ---------------------------------------------------------------------------
// Core detection
// ---------------------------------------------------------------------------

/**
 * Detect all keywords in text, returning matches with type and position.
 */
export function detectKeywords(text: string): DetectedKeyword[] {
  const cleanedText = sanitizeForKeywordDetection(text);
  const detected: DetectedKeyword[] = [];

  for (const type of PRIORITY_ORDER) {
    const pattern = KEYWORD_PATTERNS[type];
    const match = cleanedText.match(pattern);

    if (match && match.index !== undefined) {
      detected.push({
        type,
        keyword: match[0],
        position: match.index,
      });
    }
  }

  return detected;
}

/**
 * Get the highest-priority keyword after conflict resolution and task-size filtering.
 * Cancel is exclusive — suppresses all other keywords.
 */
export function getPrimaryKeyword(text: string): DetectedKeyword | null {
  const detected = detectKeywords(text);
  if (detected.length === 0) return null;

  const types = [...new Set(detected.map((d) => d.type))];

  // Cancel is exclusive
  if (types.includes('cancel')) {
    return detected.find((d) => d.type === 'cancel') ?? null;
  }

  // Sort by priority
  const prioritized = PRIORITY_ORDER.filter((k) => types.includes(k));

  // Apply task-size filtering
  const size = classifyTaskSize(text);
  const filtered = size === 'small' ? prioritized.filter((k) => !HEAVY_MODES.has(k)) : prioritized;

  if (filtered.length === 0) return null;

  return detected.find((d) => d.type === filtered[0]) ?? null;
}

// ---------------------------------------------------------------------------
// Hook handler
// ---------------------------------------------------------------------------

/**
 * Main hook handler for keyword detection.
 *
 * The hook-level keyword patterns (e.g. "ralph", "autopilot") are intentionally
 * narrower than the magic keyword feature triggers (e.g. "analyze" vs the full
 * list of analysis triggers). Hook keywords detect explicit mode invocations,
 * while magic keywords detect general intent for enhancement.
 */
export function processKeywordDetector(input: HookInput): HookOutput {
  const prompt = input.prompt;
  if (!prompt) return { continue: true };

  const primary = getPrimaryKeyword(prompt);
  if (!primary) return { continue: true };

  const enhancement = applyMagicKeywords(prompt);
  const keywordTag = primary.type.toUpperCase();

  return {
    continue: true,
    message: `[MAGIC KEYWORD: ${keywordTag}] ${enhancement}`,
  };
}
