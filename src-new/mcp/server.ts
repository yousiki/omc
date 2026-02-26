/**
 * MCP Server - Stdio-based MCP server exposing state, notepad, memory, and stub tools.
 *
 * Uses @modelcontextprotocol/sdk with stdio transport.
 * Tools are available as mcp__t__<tool_name>.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { join, dirname } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, statSync } from 'fs';

import {
  isModeActive,
  startMode,
  stopMode,
  getActiveModes,
} from '../hooks/mode-registry';
import type { ExecutionMode, ModeState } from '../hooks/mode-registry';
import { readJsonFile, writeJsonFile, resolveWorktreeRoot } from '../utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the working directory from the environment or process.cwd() */
function getRoot(): string {
  return resolveWorktreeRoot(process.env.OMC_WORKING_DIR ?? process.cwd());
}

/** Standard text result */
function textResult(text: string, isError = false) {
  return {
    content: [{ type: 'text' as const, text }],
    ...(isError ? { isError: true } : {}),
  };
}

/** State file path for a given mode */
function stateFilePath(mode: string, root: string): string {
  return join(root, '.omc', 'state', `${mode}-state.json`);
}

/** Ensure a directory exists */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Notepad helpers
// ---------------------------------------------------------------------------

const NOTEPAD_TEMPLATE = `# Notepad
<!-- Auto-managed by OMC. -->

## Priority Context
<!-- Critical discoveries only. -->

## Working Memory
<!-- Session notes. -->

## MANUAL
<!-- User content. -->
`;

function notepadPath(root: string): string {
  return join(root, '.omc', 'notepad.md');
}

function ensureNotepad(root: string): string {
  const path = notepadPath(root);
  const dir = dirname(path);
  ensureDir(dir);
  if (!existsSync(path)) {
    writeFileSync(path, NOTEPAD_TEMPLATE, 'utf-8');
  }
  return path;
}

function readNotepad(root: string): string | null {
  const path = notepadPath(root);
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

/** Extract a section from the notepad markdown. */
function extractSection(doc: string, section: 'priority' | 'working' | 'manual'): string {
  const sectionHeaders: Record<string, string> = {
    priority: '## Priority Context',
    working: '## Working Memory',
    manual: '## MANUAL',
  };
  const header = sectionHeaders[section];
  const idx = doc.indexOf(header);
  if (idx === -1) return '';

  const afterHeader = doc.slice(idx + header.length);
  // Find next ## section
  const nextSection = afterHeader.search(/\n## /);
  const raw = nextSection === -1 ? afterHeader : afterHeader.slice(0, nextSection);
  // Strip leading comment lines
  return raw.replace(/^\n*<!--[\s\S]*?-->\n?/, '').trim();
}

// ---------------------------------------------------------------------------
// Project memory helpers
// ---------------------------------------------------------------------------

function projectMemoryPath(root: string): string {
  return join(root, '.omc', 'project-memory.json');
}

interface ProjectMemory {
  version?: string;
  lastScanned?: number;
  projectRoot?: string;
  techStack?: unknown;
  build?: unknown;
  conventions?: unknown;
  structure?: unknown;
  customNotes?: Array<{ category: string; content: string; timestamp: number }>;
  userDirectives?: Array<{
    timestamp: number;
    directive: string;
    context?: string;
    source?: string;
    priority?: string;
  }>;
  [key: string]: unknown;
}

function loadProjectMemory(root: string): ProjectMemory | null {
  return readJsonFile<ProjectMemory>(projectMemoryPath(root));
}

function saveProjectMemory(root: string, data: ProjectMemory): void {
  writeJsonFile(projectMemoryPath(root), data);
}

// ---------------------------------------------------------------------------
// Known execution modes
// ---------------------------------------------------------------------------

const EXECUTION_MODES: [string, ...string[]] = [
  'ralph', 'autopilot', 'ultrawork', 'pipeline', 'ultraqa', 'tdd',
];

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: 't',
  version: '5.0.0',
});

// ============================================================================
// STATE TOOLS
// ============================================================================

server.tool(
  'state_read',
  'Read the current state for a specific execution mode. Returns the JSON state data or indicates if no state exists.',
  {
    mode: z.enum(EXECUTION_MODES).describe('The execution mode to read state for'),
  },
  async ({ mode }) => {
    try {
      const root = getRoot();
      const path = stateFilePath(mode, root);
      const state = readJsonFile<ModeState>(path);

      if (!state) {
        return textResult(`No state found for mode: ${mode}\nExpected path: ${path}`);
      }

      return textResult(
        `## State for ${mode}\n\nPath: ${path}\nActive: ${state.active}\n\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\``,
      );
    } catch (error) {
      return textResult(
        `Error reading state for ${mode}: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'state_write',
  'Write/update state for a specific execution mode. Creates the state file and directories if they do not exist.',
  {
    mode: z.enum(EXECUTION_MODES).describe('The execution mode to write state for'),
    active: z.boolean().optional().describe('Whether the mode is currently active'),
    iteration: z.number().optional().describe('Current iteration number'),
    max_iterations: z.number().optional().describe('Maximum iterations allowed'),
    current_phase: z.string().optional().describe('Current execution phase'),
    task_description: z.string().optional().describe('Description of the task being executed'),
    started_at: z.string().optional().describe('ISO timestamp when the mode started'),
    completed_at: z.string().optional().describe('ISO timestamp when the mode completed'),
    error: z.string().optional().describe('Error message if the mode failed'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Additional custom state fields'),
  },
  async (args) => {
    try {
      const root = getRoot();
      const { mode, active, metadata, ...rest } = args;

      // If activating, use startMode for mutual exclusion checks
      if (active === true) {
        const started = startMode(mode as ExecutionMode, root);
        if (!started) {
          return textResult(
            `Cannot activate ${mode}: another exclusive mode is already active.`,
            true,
          );
        }
      } else if (active === false) {
        stopMode(mode as ExecutionMode, root);
      }

      // Read current state and merge
      const path = stateFilePath(mode, root);
      const existing = readJsonFile<Record<string, unknown>>(path) ?? {};

      const updatedState: Record<string, unknown> = { ...existing };

      // Apply explicit fields only if provided
      if (active !== undefined) updatedState.active = active;
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) updatedState[key] = value;
      }
      if (metadata) {
        updatedState.metadata = { ...(existing.metadata as Record<string, unknown> ?? {}), ...metadata };
      }
      updatedState.updatedAt = new Date().toISOString();

      writeJsonFile(path, updatedState);

      return textResult(
        `Successfully wrote state for ${mode}\nPath: ${path}\n\n\`\`\`json\n${JSON.stringify(updatedState, null, 2)}\n\`\`\``,
      );
    } catch (error) {
      return textResult(
        `Error writing state for ${args.mode}: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'state_clear',
  'Clear/delete state for a specific execution mode. Removes the state file.',
  {
    mode: z.enum(EXECUTION_MODES).describe('The execution mode to clear state for'),
  },
  async ({ mode }) => {
    try {
      const root = getRoot();
      const path = stateFilePath(mode, root);

      if (!existsSync(path)) {
        return textResult(`No state found to clear for mode: ${mode}`);
      }

      // Stop the mode gracefully first
      stopMode(mode as ExecutionMode, root);
      // Then remove the file
      unlinkSync(path);

      return textResult(`Successfully cleared state for mode: ${mode}\nRemoved: ${path}`);
    } catch (error) {
      return textResult(
        `Error clearing state for ${mode}: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'state_list_active',
  'List all currently active execution modes.',
  {},
  async () => {
    try {
      const root = getRoot();
      const active = getActiveModes(root);

      if (active.length === 0) {
        return textResult('## Active Modes\n\nNo modes are currently active.');
      }

      const modeList = active.map((m) => `- **${m}**`).join('\n');
      return textResult(`## Active Modes (${active.length})\n\n${modeList}`);
    } catch (error) {
      return textResult(
        `Error listing active modes: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'state_get_status',
  'Get detailed status for a specific mode or all modes. Shows active status, file paths, and state contents.',
  {
    mode: z.enum(EXECUTION_MODES).optional().describe('Specific mode to check (omit for all modes)'),
  },
  async ({ mode }) => {
    try {
      const root = getRoot();

      if (mode) {
        const path = stateFilePath(mode, root);
        const active = isModeActive(mode as ExecutionMode, root);
        const state = readJsonFile<ModeState>(path);

        const lines = [
          `## Status: ${mode}\n`,
          `- **Active:** ${active ? 'Yes' : 'No'}`,
          `- **State Path:** ${path}`,
          `- **Exists:** ${existsSync(path) ? 'Yes' : 'No'}`,
        ];

        if (state) {
          const preview = JSON.stringify(state, null, 2).slice(0, 500);
          const truncated = preview.length >= 500 ? '\n...(truncated)' : '';
          lines.push(`\n### State Preview\n\`\`\`json\n${preview}${truncated}\n\`\`\``);
        }

        return textResult(lines.join('\n'));
      }

      // All modes
      const lines = ['## All Mode Statuses\n'];
      for (const m of EXECUTION_MODES) {
        const path = stateFilePath(m, root);
        const active = isModeActive(m as ExecutionMode, root);
        const icon = active ? '[ACTIVE]' : '[INACTIVE]';
        lines.push(`${icon} **${m}**: ${active ? 'Active' : 'Inactive'}`);
        lines.push(`   Path: \`${path}\``);
      }

      return textResult(lines.join('\n'));
    } catch (error) {
      return textResult(
        `Error getting status: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

// ============================================================================
// NOTEPAD TOOLS
// ============================================================================

const NOTEPAD_SECTIONS: [string, ...string[]] = ['all', 'priority', 'working', 'manual'];

server.tool(
  'notepad_read',
  'Read the notepad content. Can read the full notepad or a specific section (priority, working, manual).',
  {
    section: z.enum(NOTEPAD_SECTIONS).optional().describe('Section to read: "all" (default), "priority", "working", or "manual"'),
  },
  async ({ section = 'all' }) => {
    try {
      const root = getRoot();
      const doc = readNotepad(root);

      if (!doc) {
        return textResult('Notepad does not exist. Use notepad_write_* tools to create it.');
      }

      if (section === 'all') {
        return textResult(`## Notepad\n\nPath: ${notepadPath(root)}\n\n${doc}`);
      }

      const sectionTitles: Record<string, string> = {
        priority: 'Priority Context',
        working: 'Working Memory',
        manual: 'MANUAL',
      };

      const content = extractSection(doc, section as 'priority' | 'working' | 'manual');
      const title = sectionTitles[section] ?? section;

      if (!content) {
        return textResult(`## ${title}\n\n(Empty or section not found)`);
      }

      return textResult(`## ${title}\n\n${content}`);
    } catch (error) {
      return textResult(
        `Error reading notepad: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'notepad_write_priority',
  'Write to the Priority Context section. This REPLACES the existing content. Keep under 500 chars - this is always loaded at session start.',
  {
    content: z.string().max(2000).describe('Content to write (recommend under 500 chars)'),
  },
  async ({ content }) => {
    try {
      const root = getRoot();
      const path = ensureNotepad(root);
      let doc = readFileSync(path, 'utf-8');

      // Replace priority context section content
      const replaced = doc.replace(
        /(## Priority Context\n(?:<!--[\s\S]*?-->\n)?)[\s\S]*?(?=\n## )/,
        `$1${content}\n`,
      );

      if (replaced === doc && !doc.includes('## Priority Context')) {
        // Section header missing -- append it
        doc = `## Priority Context\n${content}\n\n${doc}`;
        writeFileSync(path, doc, 'utf-8');
      } else {
        writeFileSync(path, replaced, 'utf-8');
      }

      let response = `Successfully wrote to Priority Context (${content.length} chars)`;
      if (content.length > 500) {
        response += '\n\n**Warning:** Content exceeds recommended 500 character limit.';
      }

      return textResult(response);
    } catch (error) {
      return textResult(
        `Error writing to Priority Context: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'notepad_write_working',
  'Add an entry to Working Memory section. Entries are timestamped and auto-pruned after 7 days.',
  {
    content: z.string().max(4000).describe('Content to add as a new entry'),
  },
  async ({ content }) => {
    try {
      const root = getRoot();
      const path = ensureNotepad(root);
      let doc = readFileSync(path, 'utf-8');

      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const entry = `\n### ${timestamp}\n${content}\n`;

      // Insert before MANUAL section
      const manualIdx = doc.indexOf('## MANUAL');
      if (manualIdx !== -1) {
        doc = doc.slice(0, manualIdx) + entry + '\n' + doc.slice(manualIdx);
      } else {
        doc += entry;
      }

      writeFileSync(path, doc, 'utf-8');

      return textResult(`Successfully added entry to Working Memory (${content.length} chars)`);
    } catch (error) {
      return textResult(
        `Error writing to Working Memory: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'notepad_write_manual',
  'Add an entry to the MANUAL section. Content in this section is never auto-pruned.',
  {
    content: z.string().max(4000).describe('Content to add as a new entry'),
  },
  async ({ content }) => {
    try {
      const root = getRoot();
      const path = ensureNotepad(root);
      let doc = readFileSync(path, 'utf-8');

      const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
      const entry = `\n### ${timestamp}\n${content}\n`;

      // Append after MANUAL section header
      const manualIdx = doc.indexOf('## MANUAL');
      if (manualIdx !== -1) {
        // Find end of comment after MANUAL header
        const afterManual = doc.slice(manualIdx);
        const commentEnd = afterManual.search(/-->\n/);
        if (commentEnd !== -1) {
          const insertAt = manualIdx + commentEnd + 4; // after "-->\n"
          doc = doc.slice(0, insertAt) + entry + doc.slice(insertAt);
        } else {
          const headerEnd = manualIdx + '## MANUAL'.length;
          doc = doc.slice(0, headerEnd) + '\n' + entry + doc.slice(headerEnd);
        }
      } else {
        doc += '\n## MANUAL\n' + entry;
      }

      writeFileSync(path, doc, 'utf-8');

      return textResult(`Successfully added entry to MANUAL section (${content.length} chars)`);
    } catch (error) {
      return textResult(
        `Error writing to MANUAL: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'notepad_prune',
  'Prune Working Memory entries older than N days (default: 7 days).',
  {
    days: z.number().int().min(1).max(365).optional().describe('Remove entries older than this many days (default: 7)'),
  },
  async ({ days = 7 }) => {
    try {
      const root = getRoot();
      const doc = readNotepad(root);

      if (!doc) {
        return textResult('Notepad does not exist. Nothing to prune.');
      }

      const path = notepadPath(root);
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

      // Extract working memory section boundaries
      const workingStart = doc.indexOf('## Working Memory');
      const manualStart = doc.indexOf('## MANUAL');

      if (workingStart === -1) {
        return textResult('## Prune Results\n\n- Pruned: 0 entries\n- No Working Memory section found.');
      }

      const sectionEnd = manualStart !== -1 ? manualStart : doc.length;
      const before = doc.slice(0, workingStart);
      const workingSection = doc.slice(workingStart, sectionEnd);
      const after = doc.slice(sectionEnd);

      // Parse entries from working section
      const entryPattern = /### (\d{4}-\d{2}-\d{2} \d{2}:\d{2})\n([\s\S]*?)(?=\n### |\n## |$)/g;
      const header = workingSection.match(/^## Working Memory\n(?:<!--[\s\S]*?-->\n)?/)?.[0] ?? '## Working Memory\n';

      let pruned = 0;
      let remaining = 0;
      let kept = '';

      for (const match of workingSection.matchAll(entryPattern)) {
        const ts = new Date(match[1].replace(' ', 'T') + ':00Z').getTime();
        if (isNaN(ts) || ts >= cutoff) {
          kept += `\n### ${match[1]}\n${match[2].trimEnd()}\n`;
          remaining++;
        } else {
          pruned++;
        }
      }

      const newDoc = before + header + kept + '\n' + after;
      writeFileSync(path, newDoc, 'utf-8');

      return textResult(
        `## Prune Results\n\n- Pruned: ${pruned} entries\n- Remaining: ${remaining} entries\n- Threshold: ${days} days`,
      );
    } catch (error) {
      return textResult(
        `Error pruning notepad: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'notepad_stats',
  'Get statistics about the notepad (size, entry count, oldest entry).',
  {},
  async () => {
    try {
      const root = getRoot();
      const path = notepadPath(root);

      if (!existsSync(path)) {
        return textResult('## Notepad Statistics\n\nNotepad does not exist yet.');
      }

      const doc = readFileSync(path, 'utf-8');
      const stats = statSync(path);

      // Count working memory entries and find oldest
      const entryPattern = /### (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/g;
      const workingStart = doc.indexOf('## Working Memory');
      const manualStart = doc.indexOf('## MANUAL');

      let workingEntries = 0;
      let oldestEntry: string | null = null;

      if (workingStart !== -1) {
        const sectionEnd = manualStart !== -1 ? manualStart : doc.length;
        const section = doc.slice(workingStart, sectionEnd);

        for (const match of section.matchAll(entryPattern)) {
          workingEntries++;
          if (!oldestEntry || match[1] < oldestEntry) {
            oldestEntry = match[1];
          }
        }
      }

      // Priority context size
      const priorityContent = extractSection(doc, 'priority');

      const lines = [
        '## Notepad Statistics\n',
        `- **Total Size:** ${stats.size} bytes`,
        `- **Priority Context Size:** ${priorityContent.length} bytes`,
        `- **Working Memory Entries:** ${workingEntries}`,
        `- **Oldest Entry:** ${oldestEntry ?? 'None'}`,
        `- **Path:** ${path}`,
      ];

      return textResult(lines.join('\n'));
    } catch (error) {
      return textResult(
        `Error getting notepad stats: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

// ============================================================================
// PROJECT MEMORY TOOLS
// ============================================================================

const MEMORY_SECTIONS: [string, ...string[]] = [
  'all', 'techStack', 'build', 'conventions', 'structure', 'notes', 'directives',
];

server.tool(
  'project_memory_read',
  'Read the project memory. Can read the full memory or a specific section.',
  {
    section: z.enum(MEMORY_SECTIONS).optional().describe('Section to read (default: all)'),
  },
  async ({ section = 'all' }) => {
    try {
      const root = getRoot();
      const memory = loadProjectMemory(root);

      if (!memory) {
        return textResult(
          `Project memory does not exist.\nExpected path: ${projectMemoryPath(root)}\n\nUse project_memory_write to create it.`,
        );
      }

      if (section === 'all') {
        return textResult(
          `## Project Memory\n\nPath: ${projectMemoryPath(root)}\n\n\`\`\`json\n${JSON.stringify(memory, null, 2)}\n\`\`\``,
        );
      }

      const sectionMap: Record<string, string> = {
        techStack: 'techStack',
        build: 'build',
        conventions: 'conventions',
        structure: 'structure',
        notes: 'customNotes',
        directives: 'userDirectives',
      };

      const key = sectionMap[section] ?? section;
      const data = memory[key];

      return textResult(
        `## Project Memory: ${section}\n\n\`\`\`json\n${JSON.stringify(data ?? null, null, 2)}\n\`\`\``,
      );
    } catch (error) {
      return textResult(
        `Error reading project memory: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'project_memory_write',
  'Write/update project memory. Can replace entirely or merge with existing memory.',
  {
    data: z.record(z.string(), z.unknown()).describe('The memory object to write'),
    merge: z.boolean().optional().describe('If true, merge with existing memory (default: false = replace)'),
  },
  async ({ data, merge = false }) => {
    try {
      const root = getRoot();
      const memDir = dirname(projectMemoryPath(root));
      ensureDir(memDir);

      let finalMemory: ProjectMemory;

      if (merge) {
        const existing = loadProjectMemory(root);
        finalMemory = existing ? { ...existing, ...data } : data;
      } else {
        finalMemory = data;
      }

      // Ensure required fields
      if (!finalMemory.version) finalMemory.version = '1.0.0';
      if (!finalMemory.lastScanned) finalMemory.lastScanned = Date.now();
      if (!finalMemory.projectRoot) finalMemory.projectRoot = root;

      saveProjectMemory(root, finalMemory);

      return textResult(
        `Successfully ${merge ? 'merged' : 'wrote'} project memory.\nPath: ${projectMemoryPath(root)}`,
      );
    } catch (error) {
      return textResult(
        `Error writing project memory: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'project_memory_add_note',
  'Add a categorized note to project memory. Notes are persisted across sessions.',
  {
    category: z.string().max(50).describe('Note category (e.g., "build", "test", "deploy", "env", "architecture")'),
    content: z.string().max(1000).describe('Note content'),
  },
  async ({ category, content }) => {
    try {
      const root = getRoot();
      const memory = loadProjectMemory(root);

      if (!memory) {
        return textResult(
          'Project memory does not exist. Use project_memory_write to create it first.',
          true,
        );
      }

      if (!memory.customNotes) {
        memory.customNotes = [];
      }

      memory.customNotes.push({
        category,
        content,
        timestamp: Date.now(),
      });

      saveProjectMemory(root, memory);

      return textResult(
        `Successfully added note to project memory.\n\n- **Category:** ${category}\n- **Content:** ${content}`,
      );
    } catch (error) {
      return textResult(
        `Error adding note: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

server.tool(
  'project_memory_add_directive',
  'Add a directive to project memory. Directives are instructions that persist across sessions.',
  {
    content: z.string().max(500).describe('The directive (e.g., "Always use TypeScript strict mode")'),
    priority: z.enum(['high', 'normal']).optional().describe('Priority level (default: normal)'),
  },
  async ({ content, priority = 'normal' }) => {
    try {
      const root = getRoot();
      const memory = loadProjectMemory(root);

      if (!memory) {
        return textResult(
          'Project memory does not exist. Use project_memory_write to create it first.',
          true,
        );
      }

      if (!memory.userDirectives) {
        memory.userDirectives = [];
      }

      memory.userDirectives.push({
        timestamp: Date.now(),
        directive: content,
        source: 'explicit',
        priority,
      });

      saveProjectMemory(root, memory);

      return textResult(
        `Successfully added directive to project memory.\n\n- **Directive:** ${content}\n- **Priority:** ${priority}`,
      );
    } catch (error) {
      return textResult(
        `Error adding directive: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
);

// ============================================================================
// STUB TOOLS (LSP, AST, Python REPL) -- to be filled in Tasks 5.2 and 5.3
// ============================================================================

const STUB_TOOLS: Array<{ name: string; description: string }> = [
  { name: 'lsp_hover', description: 'Get hover information for a symbol at a position (not yet implemented).' },
  { name: 'lsp_goto_definition', description: 'Go to the definition of a symbol (not yet implemented).' },
  { name: 'lsp_find_references', description: 'Find all references to a symbol (not yet implemented).' },
  { name: 'lsp_document_symbols', description: 'List all symbols in a document (not yet implemented).' },
  { name: 'lsp_workspace_symbols', description: 'Search for symbols across the workspace (not yet implemented).' },
  { name: 'lsp_diagnostics', description: 'Get diagnostics (errors/warnings) for a file (not yet implemented).' },
  { name: 'ast_grep_search', description: 'Search code using AST patterns (not yet implemented).' },
  { name: 'ast_grep_replace', description: 'Replace code using AST patterns (not yet implemented).' },
  { name: 'python_repl', description: 'Execute Python code in a REPL environment (not yet implemented).' },
];

for (const stub of STUB_TOOLS) {
  server.tool(stub.name, stub.description, {}, async () => {
    return textResult(`${stub.name}: Not yet implemented. This tool will be available in a future release.`);
  });
}

// ============================================================================
// Start server
// ============================================================================

const transport = new StdioServerTransport();
await server.connect(transport);
