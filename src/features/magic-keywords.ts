/**
 * Magic Keywords Feature
 *
 * Detects special keywords in prompts and activates enhanced behaviors.
 * Each keyword maps to a system message enhancement that augments the prompt.
 */

import type { PluginConfig } from '../types';
import { escapeRegex, removeCodeBlocks } from '../utils';

/** A magic keyword definition */
export interface MagicKeyword {
  triggers: string[];
  action: (prompt: string, triggers: string[]) => string;
  description: string;
}

/** Remove trigger words from a prompt using the keyword's own trigger list */
function removeTriggerWords(prompt: string, triggers: string[]): string {
  let result = prompt;
  for (const trigger of triggers) {
    const regex = new RegExp(`\\b${escapeRegex(trigger)}\\b`, 'gi');
    result = result.replace(regex, '');
  }
  return result.trim();
}

/**
 * Ultrawork mode enhancement.
 * Activates maximum performance with parallel agent orchestration.
 */
const ultraworkEnhancement: MagicKeyword = {
  triggers: ['ultrawork', 'ulw', 'uw'],
  description: 'Activates maximum performance mode with parallel agent orchestration',
  action: (prompt: string, triggers: string[]) => {
    const cleanPrompt = removeTriggerWords(prompt, triggers);
    return `<ultrawork-mode>

**MANDATORY**: You MUST say "ULTRAWORK MODE ENABLED!" to the user as your first response when this mode activates. This is non-negotiable.

[CODE RED] Maximum precision required.

YOU MUST LEVERAGE ALL AVAILABLE AGENTS TO THEIR FULLEST POTENTIAL.
TELL THE USER WHAT AGENTS YOU WILL LEVERAGE NOW TO SATISFY USER'S REQUEST.

## AGENT UTILIZATION PRINCIPLES (by capability, not by name)
- **Codebase Exploration**: Spawn exploration agents using BACKGROUND TASKS for file patterns, internal implementations, project structure
- **Documentation & References**: Use document-specialist agents via BACKGROUND TASKS for API references, examples, external library docs
- **Planning & Strategy**: NEVER plan yourself - ALWAYS spawn a dedicated planning agent for work breakdown
- **High-IQ Reasoning**: Leverage specialized agents for architecture decisions, code review, strategic planning

## EXECUTION RULES
- **TODO**: Track EVERY step. Mark complete IMMEDIATELY after each.
- **PARALLEL**: Fire independent agent calls simultaneously via Task(run_in_background=true) - NEVER wait sequentially.
- **BACKGROUND FIRST**: Use Task for exploration/document-specialist agents (10+ concurrent if needed).
- **VERIFY**: Re-read request after completion. Check ALL requirements met before reporting done.
- **DELEGATE**: Don't do everything yourself - orchestrate specialized agents for their strengths.

## VERIFICATION GUARANTEE (NON-NEGOTIABLE)

**NOTHING is "done" without PROOF it works.**

### Execution & Evidence Requirements

| Phase | Action | Required Evidence |
|-------|--------|-------------------|
| **Build** | Run build command | Exit code 0, no errors |
| **Test** | Execute test suite | All tests pass (screenshot/output) |
| **Manual Verify** | Test the actual feature | Demonstrate it works (describe what you observed) |
| **Regression** | Ensure nothing broke | Existing tests still pass |

**WITHOUT evidence = NOT verified = NOT done.**

## ZERO TOLERANCE FAILURES
- **NO Scope Reduction**: Never make "demo", "skeleton", "simplified", "basic" versions - deliver FULL implementation
- **NO Partial Completion**: Never stop at 60-80% saying "you can extend this..." - finish 100%
- **NO TEST DELETION**: Never delete or skip failing tests to make the build pass. Fix the code, not the tests.

THE USER ASKED FOR X. DELIVER EXACTLY X. NOT A SUBSET. NOT A DEMO. NOT A STARTING POINT.

</ultrawork-mode>

---

${cleanPrompt}`;
  },
};

/**
 * Search mode enhancement -- multilingual support.
 * Maximizes search effort and thoroughness.
 *
 * Note: The action's internal regex is intentionally broader than `triggers`,
 * including multilingual patterns (CJK, Korean, Vietnamese, Japanese) and
 * common phrases like "where is" / "show me" / "list all".
 */
const searchEnhancement: MagicKeyword = {
  triggers: [
    'search',
    'find',
    'locate',
    'lookup',
    'explore',
    'discover',
    'scan',
    'grep',
    'query',
    'browse',
    'detect',
    'trace',
    'seek',
    'track',
    'pinpoint',
    'hunt',
  ],
  description: 'Maximizes search effort and thoroughness',
  action: (prompt: string) => {
    const searchPattern =
      /\b(search|find|locate|lookup|look\s*up|explore|discover|scan|grep|query|browse|detect|trace|seek|track|pinpoint|hunt)\b|where\s+is|show\s+me|list\s+all|검색|찾아|탐색|조회|스캔|서치|뒤져|찾기|어디|추적|탐지|찾아봐|찾아내|보여줘|목록|検索|探して|見つけて|サーチ|探索|スキャン|どこ|発見|捜索|見つけ出す|一覧|搜索|查找|寻找|查询|检索|定位|扫描|发现|在哪里|找出来|列出|tìm kiếm|tra cứu|định vị|quét|phát hiện|truy tìm|tìm ra|ở đâu|liệt kê/i;

    if (!searchPattern.test(removeCodeBlocks(prompt))) {
      return prompt;
    }

    return `${prompt}

[search-mode]
MAXIMIZE SEARCH EFFORT. Launch multiple background agents IN PARALLEL:
- explore agents (codebase patterns, file structures, ast-grep)
- document-specialist agents (remote repos, official docs, GitHub examples)
Plus direct tools: Grep, ripgrep (rg), ast-grep (sg)
NEVER stop at first result - be exhaustive.`;
  },
};

/**
 * Analyze mode enhancement -- multilingual support.
 * Activates deep analysis and investigation mode.
 *
 * Note: The action's internal regex is intentionally broader than `triggers`,
 * including multilingual patterns and question phrases like "why is" / "how does".
 */
const analyzeEnhancement: MagicKeyword = {
  triggers: [
    'analyze',
    'analyse',
    'investigate',
    'examine',
    'study',
    'deep-dive',
    'inspect',
    'audit',
    'evaluate',
    'assess',
    'review',
    'diagnose',
    'scrutinize',
    'dissect',
    'debug',
    'comprehend',
    'interpret',
    'breakdown',
    'understand',
  ],
  description: 'Activates deep analysis and investigation mode',
  action: (prompt: string) => {
    const analyzePattern =
      /\b(analyze|analyse|investigate|examine|study|deep[\s-]?dive|inspect|audit|evaluate|assess|review|diagnose|scrutinize|dissect|debug|comprehend|interpret|breakdown|understand)\b|why\s+is|how\s+does|how\s+to|분석|조사|파악|연구|검토|진단|이해|설명|원인|이유|뜯어봐|따져봐|평가|해석|디버깅|디버그|어떻게|왜|살펴|分析|調査|解析|検討|研究|診断|理解|説明|検証|精査|究明|デバッグ|なぜ|どう|仕組み|调查|检查|剖析|深入|诊断|解释|调试|为什么|原理|搞清楚|弄明白|phân tích|điều tra|nghiên cứu|kiểm tra|xem xét|chẩn đoán|giải thích|tìm hiểu|gỡ lỗi|tại sao/i;

    if (!analyzePattern.test(removeCodeBlocks(prompt))) {
      return prompt;
    }

    return `${prompt}

[analyze-mode]
ANALYSIS MODE. Gather context before diving deep:

CONTEXT GATHERING (parallel):
- 1-2 explore agents (codebase patterns, implementations)
- 1-2 document-specialist agents (if external library involved)
- Direct tools: Grep, AST-grep, LSP for targeted searches

IF COMPLEX (architecture, multi-system, debugging after 2+ failures):
- Consult architect for strategic guidance

SYNTHESIZE findings before proceeding.`;
  },
};

/**
 * Ultrathink mode enhancement.
 * Activates extended thinking and deep reasoning.
 */
const ultrathinkEnhancement: MagicKeyword = {
  triggers: ['ultrathink', 'think', 'reason', 'ponder'],
  description: 'Activates extended thinking mode for deep reasoning',
  action: (prompt: string, triggers: string[]) => {
    const triggerPattern = new RegExp(`\\b(${triggers.map(escapeRegex).join('|')})\\b`, 'i');
    if (!triggerPattern.test(removeCodeBlocks(prompt))) {
      return prompt;
    }

    const cleanPrompt = removeTriggerWords(prompt, triggers);

    return `[ULTRATHINK MODE - EXTENDED REASONING ACTIVATED]

${cleanPrompt}

## Deep Thinking Instructions
- Take your time to think through this problem thoroughly
- Consider multiple approaches before settling on a solution
- Identify edge cases, risks, and potential issues
- Think step-by-step through complex logic
- Question your assumptions
- Consider what could go wrong
- Evaluate trade-offs between different solutions
- Look for patterns from similar problems

IMPORTANT: Do not rush. Quality of reasoning matters more than speed.
Use maximum cognitive effort before responding.`;
  },
};

/**
 * All built-in magic keyword definitions, keyed by name.
 */
export const BUILTIN_MAGIC_KEYWORDS: Record<string, MagicKeyword> = {
  ultrawork: ultraworkEnhancement,
  search: searchEnhancement,
  analyze: analyzeEnhancement,
  ultrathink: ultrathinkEnhancement,
};

/**
 * Apply config overrides to a copy of the built-in keywords.
 * Config only supports disabling keywords (value === false).
 */
function resolveKeywords(config?: PluginConfig): Record<string, MagicKeyword> {
  const keywords: Record<string, MagicKeyword> = {};
  for (const [name, kw] of Object.entries(BUILTIN_MAGIC_KEYWORDS)) {
    keywords[name] = { ...kw, triggers: [...kw.triggers] };
  }

  if (!config?.magicKeywords) return keywords;

  for (const [name, value] of Object.entries(config.magicKeywords)) {
    if (value === false && name in keywords) {
      delete keywords[name];
    }
  }

  return keywords;
}

/** Pre-compiled trigger patterns per keyword (built once at module load) */
const triggerPatternCache = new Map<string, RegExp>();

function getTriggerPattern(trigger: string): RegExp {
  let pattern = triggerPatternCache.get(trigger);
  if (!pattern) {
    pattern = new RegExp(`\\b${escapeRegex(trigger)}\\b`, 'i');
    triggerPatternCache.set(trigger, pattern);
  }
  return pattern;
}

/**
 * Detect which magic keywords are present in a prompt.
 * Returns an array of keyword names (e.g. ['ultrawork', 'search']).
 */
export function detectMagicKeywords(prompt: string, config?: PluginConfig): string[] {
  const keywords = resolveKeywords(config);
  const cleanedPrompt = removeCodeBlocks(prompt);
  const detected: string[] = [];

  for (const [name, kw] of Object.entries(keywords)) {
    for (const trigger of kw.triggers) {
      if (getTriggerPattern(trigger).test(cleanedPrompt)) {
        detected.push(name);
        break;
      }
    }
  }

  return detected;
}

/**
 * Apply all matching keyword enhancements to a prompt.
 * Detection is always against the original prompt (not the mutated result)
 * to prevent cascading enhancements.
 */
export function applyMagicKeywords(prompt: string, config?: PluginConfig): string {
  const keywords = resolveKeywords(config);
  const cleanedPrompt = removeCodeBlocks(prompt);
  let result = prompt;

  for (const kw of Object.values(keywords)) {
    const hasKeyword = kw.triggers.some((trigger) => getTriggerPattern(trigger).test(cleanedPrompt));

    if (hasKeyword) {
      result = kw.action(result, kw.triggers);
    }
  }

  return result;
}
