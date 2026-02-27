#!/usr/bin/env node

/**
 * Skill Injector Hook (UserPromptSubmit)
 * Injects relevant learned skills into context based on prompt triggers.
 *
 * STANDALONE SCRIPT - uses bridge module from src/hooks/learner/bridge.ts
 * Falls back to inline implementation if bridge not available
 *
 * Enhancement in v3.5: Now uses RECURSIVE discovery (skills in subdirectories included)
 */

import { existsSync, readdirSync, readFileSync, realpathSync } from 'fs';
import { join, basename } from 'path';
import { homedir } from 'os';
import { readStdin } from './lib/stdin.js';

interface HookInput {
  prompt?: string;
  session_id?: string;
  sessionId?: string;
  cwd?: string;
}

interface SkillFrontmatter {
  name: string;
  triggers: string[];
  content: string;
}

interface SkillCandidate {
  path: string;
  scope: 'project' | 'user';
}

interface MatchedSkill {
  path: string;
  name: string;
  content: string;
  score: number;
  scope: string;
  triggers: string[];
}

interface SkillMetadata {
  path: string;
  triggers: string[];
  score: number;
  scope: string;
}

interface BridgeModule {
  matchSkillsForInjection: (
    prompt: string,
    directory: string,
    sessionId: string,
    options: { maxResults: number }
  ) => MatchedSkill[];
  markSkillsInjected: (sessionId: string, paths: string[], directory: string) => void;
}

// Try to load the bridge module (TS source, run via bun)
let bridge: BridgeModule | null = null;
try {
  // Dynamic path string prevents tsc from flagging .ts extension (Bun resolves it at runtime)
  const bridgePath = '../src/hooks/learner/bridge.ts';
  bridge = await import(bridgePath) as BridgeModule;
} catch {
  // Bridge not available - use fallback
}

// Constants (used by fallback)
const cfgDir = process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
const USER_SKILLS_DIR = join(cfgDir, 'skills', 'omc-learned');
const GLOBAL_SKILLS_DIR = join(homedir(), '.omc', 'skills');
const PROJECT_SKILLS_SUBDIR = join('.omc', 'skills');
const SKILL_EXTENSION = '.md';
const MAX_SKILLS_PER_SESSION = 5;

// =============================================================================
// Fallback Implementation (used when bridge bundle not available)
// =============================================================================

// In-memory cache (resets each process - known limitation, fixed by bridge)
const injectedCacheFallback = new Map<string, Set<string>>();

// Parse YAML frontmatter from skill file (fallback)
function parseSkillFrontmatterFallback(content: string): SkillFrontmatter | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return null;

  const yamlContent = match[1];
  const body = match[2].trim();

  // Simple YAML parsing for triggers
  const triggers: string[] = [];
  const triggerMatch = yamlContent.match(/triggers:\s*\n((?:\s+-\s*.+\n?)*)/);
  if (triggerMatch) {
    const lines = triggerMatch[1].split('\n');
    for (const line of lines) {
      const itemMatch = line.match(/^\s+-\s*["']?([^"'\n]+)["']?\s*$/);
      if (itemMatch) triggers.push(itemMatch[1].trim().toLowerCase());
    }
  }

  // Extract name
  const nameMatch = yamlContent.match(/name:\s*["']?([^"'\n]+)["']?/);
  const name = nameMatch ? nameMatch[1].trim() : 'Unnamed Skill';

  return { name, triggers, content: body };
}

// Find all skill files (fallback - NON-RECURSIVE for backward compat)
function findSkillFilesFallback(directory: string): SkillCandidate[] {
  const candidates: SkillCandidate[] = [];
  const seenPaths = new Set<string>();

  // Project-level skills (higher priority)
  const projectDir = join(directory, PROJECT_SKILLS_SUBDIR);
  if (existsSync(projectDir)) {
    try {
      const files = readdirSync(projectDir, { withFileTypes: true });
      for (const file of files) {
        if (file.isFile() && file.name.endsWith(SKILL_EXTENSION)) {
          const fullPath = join(projectDir, file.name);
          try {
            const realPath = realpathSync(fullPath);
            if (!seenPaths.has(realPath)) {
              seenPaths.add(realPath);
              candidates.push({ path: fullPath, scope: 'project' });
            }
          } catch {
            // Ignore symlink resolution errors
          }
        }
      }
    } catch {
      // Ignore directory read errors
    }
  }

  // User-level skills (search both global and legacy directories)
  const userDirs = [GLOBAL_SKILLS_DIR, USER_SKILLS_DIR];
  for (const userDir of userDirs) {
    if (existsSync(userDir)) {
      try {
        const files = readdirSync(userDir, { withFileTypes: true });
        for (const file of files) {
          if (file.isFile() && file.name.endsWith(SKILL_EXTENSION)) {
            const fullPath = join(userDir, file.name);
            try {
              const realPath = realpathSync(fullPath);
              if (!seenPaths.has(realPath)) {
                seenPaths.add(realPath);
                candidates.push({ path: fullPath, scope: 'user' });
              }
            } catch {
              // Ignore symlink resolution errors
            }
          }
        }
      } catch {
        // Ignore directory read errors
      }
    }
  }

  return candidates;
}

// Find matching skills (fallback)
function findMatchingSkillsFallback(prompt: string, directory: string, sessionId: string): MatchedSkill[] {
  const promptLower = prompt.toLowerCase();
  const candidates = findSkillFilesFallback(directory);
  const matches: MatchedSkill[] = [];

  // Get or create session cache
  if (!injectedCacheFallback.has(sessionId)) {
    injectedCacheFallback.set(sessionId, new Set());
  }
  const alreadyInjected = injectedCacheFallback.get(sessionId)!;

  for (const candidate of candidates) {
    // Skip if already injected this session
    if (alreadyInjected.has(candidate.path)) continue;

    try {
      const content = readFileSync(candidate.path, 'utf-8');
      const skill = parseSkillFrontmatterFallback(content);
      if (!skill) continue;

      // Check if any trigger matches
      let score = 0;
      for (const trigger of skill.triggers) {
        if (promptLower.includes(trigger)) {
          score += 10;
        }
      }

      if (score > 0) {
        matches.push({
          path: candidate.path,
          name: skill.name,
          content: skill.content,
          score,
          scope: candidate.scope,
          triggers: skill.triggers
        });
      }
    } catch {
      // Ignore file read errors
    }
  }

  // Sort by score (descending) and limit
  matches.sort((a, b) => b.score - a.score);
  const selected = matches.slice(0, MAX_SKILLS_PER_SESSION);

  // Mark as injected
  for (const skill of selected) {
    alreadyInjected.add(skill.path);
  }

  return selected;
}

// =============================================================================
// Main Logic (uses bridge if available, fallback otherwise)
// =============================================================================

// Find matching skills - delegates to bridge or fallback
function findMatchingSkills(prompt: string, directory: string, sessionId: string): MatchedSkill[] {
  if (bridge) {
    // Use bridge (RECURSIVE discovery, persistent session cache)
    const matches = bridge.matchSkillsForInjection(prompt, directory, sessionId, {
      maxResults: MAX_SKILLS_PER_SESSION
    });

    // Mark as injected via bridge
    if (matches.length > 0) {
      bridge.markSkillsInjected(sessionId, matches.map(s => s.path), directory);
    }

    return matches;
  }

  // Fallback (NON-RECURSIVE, in-memory cache)
  return findMatchingSkillsFallback(prompt, directory, sessionId);
}

// Format skills for injection
function formatSkillsMessage(skills: MatchedSkill[]): string {
  const lines = [
    '<mnemosyne>',
    '',
    '## Relevant Learned Skills',
    '',
    'The following skills from previous sessions may help:',
    ''
  ];

  for (const skill of skills) {
    lines.push(`### ${skill.name} (${skill.scope})`);

    // Add metadata block for programmatic parsing
    const metadata: SkillMetadata = {
      path: skill.path,
      triggers: skill.triggers,
      score: skill.score,
      scope: skill.scope
    };
    lines.push(`<skill-metadata>${JSON.stringify(metadata)}</skill-metadata>`);
    lines.push('');

    lines.push(skill.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  lines.push('</mnemosyne>');
  return lines.join('\n');
}

// Main
async function main(): Promise<void> {
  try {
    const input = await readStdin();
    if (!input.trim()) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    let data: HookInput = {};
    try { data = JSON.parse(input) as HookInput; } catch { /* ignore parse errors */ }

    const prompt = data.prompt || '';
    const sessionId = data.session_id || data.sessionId || 'unknown';
    const directory = data.cwd || process.cwd();

    // Skip if no prompt
    if (!prompt) {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
      return;
    }

    const matchingSkills = findMatchingSkills(prompt, directory, sessionId);

    // Record skill activations to flow trace (best-effort)
    if (matchingSkills.length > 0) {
      try {
        const flowTracerPath = '../src/hooks/subagent-tracker/flow-tracer.ts';
        const { recordSkillActivated } = await import(flowTracerPath);
        for (const skill of matchingSkills) {
          recordSkillActivated(directory, sessionId, skill.name, skill.scope || 'learned');
        }
      } catch { /* silent - trace is best-effort */ }
    }

    if (matchingSkills.length > 0) {
      console.log(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: formatSkillsMessage(matchingSkills)
        }
      }));
    } else {
      console.log(JSON.stringify({ continue: true, suppressOutput: true }));
    }
  } catch {
    // On any error, allow continuation
    console.log(JSON.stringify({ continue: true, suppressOutput: true }));
  }
}

main();
