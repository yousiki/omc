import { join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

/** Resolve the project root (where agents/ directory lives) */
const PROJECT_ROOT = resolve(import.meta.dir, '..', '..');

/**
 * Strip YAML frontmatter from markdown content.
 */
function stripFrontmatter(content: string): string {
  const match = content.match(/^---[\s\S]*?---\s*([\s\S]*)$/);
  return match ? match[1].trim() : content.trim();
}

/**
 * Load an agent's prompt template from agents/{name}.md
 * Returns the markdown content as a string, with YAML frontmatter stripped.
 *
 * Security: Validates agent name to prevent path traversal attacks.
 */
export function loadAgentPrompt(name: string): string {
  // Security: Only allow alphanumeric characters and hyphens
  if (!/^[a-z0-9-]+$/i.test(name)) {
    throw new Error(`Invalid agent name: contains disallowed characters`);
  }

  const agentPath = join(PROJECT_ROOT, 'agents', `${name}.md`);

  if (!existsSync(agentPath)) {
    throw new Error(`Agent prompt not found: ${agentPath}`);
  }

  const content = readFileSync(agentPath, 'utf-8');
  return stripFrontmatter(content);
}
