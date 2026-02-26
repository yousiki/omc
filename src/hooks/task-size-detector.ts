/**
 * Task Size Detector Hook
 *
 * Standalone hook version of task-size classification. Wraps the lightweight
 * classifier (already inlined in keyword-detector.ts) for the UserPromptSubmit event.
 *
 * Port of src/hooks/task-size-detector/index.ts.
 *
 * - Classifies prompt as small/medium/large
 * - For small tasks: suggests lightweight approach
 * - For large tasks: suggests planning first
 * - For medium tasks: no message needed
 */

import type { HookInput, HookOutput } from '../types';

// ---------------------------------------------------------------------------
// Task-size classification (duplicated from keyword-detector to keep this
// module self-contained -- the logic is tiny)
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

function classifyTaskSize(text: string): TaskSize {
  const wordCount = countWords(text);
  const trimmed = text.trim().toLowerCase();

  if (ESCAPE_HATCH_PREFIXES.some((p) => trimmed.startsWith(p))) return 'small';
  if (LARGE_TASK_SIGNALS.some((p) => p.test(text))) return 'large';
  if (wordCount > 200) return 'large';
  if (SMALL_TASK_SIGNALS.some((p) => p.test(text))) return 'small';
  if (wordCount <= 50) return 'small';

  return 'medium';
}

// ---------------------------------------------------------------------------
// Hook handler
// ---------------------------------------------------------------------------

/**
 * Process task-size detection for UserPromptSubmit.
 *
 * Returns guidance messages for small and large tasks; medium tasks pass through.
 */
export function processTaskSizeDetection(input: HookInput): HookOutput {
  const prompt = input.prompt;
  if (!prompt || !prompt.trim()) return { continue: true };

  const size = classifyTaskSize(prompt);

  switch (size) {
    case 'small':
      return {
        continue: true,
        message:
          '[TASK-SIZE: SMALL] This appears to be a small/quick task. Use a lightweight approach -- no heavy orchestration needed. Execute directly.',
      };

    case 'large':
      return {
        continue: true,
        message:
          '[TASK-SIZE: LARGE] This appears to be a large/complex task. Consider planning first: break it into steps, identify affected files, and consider using TODO tracking.',
      };
    default:
      return { continue: true };
  }
}
