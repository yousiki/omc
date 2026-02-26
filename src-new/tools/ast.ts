/**
 * AST Tools using ast-grep
 *
 * Self-contained module providing 2 AST-aware code tools:
 * - ast_grep_search: Structural code pattern search with meta-variables
 * - ast_grep_replace: Structural code transformation with dry-run safety
 *
 * Dynamically imports @ast-grep/napi with graceful degradation.
 * Supports 17 languages: javascript, typescript, tsx, python, ruby, go,
 * rust, java, kotlin, swift, c, cpp, csharp, html, css, json, yaml.
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, resolve } from 'path';

// ---------------------------------------------------------------------------
// Tool definition type (matches MCP server registration)
// ---------------------------------------------------------------------------

export interface AstToolDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// Dynamic import for @ast-grep/napi (graceful degradation)
// ---------------------------------------------------------------------------

let sgModule: typeof import('@ast-grep/napi') | null = null;
let sgLoadFailed = false;
let sgLoadError = '';

async function getSgModule(): Promise<typeof import('@ast-grep/napi') | null> {
  if (sgLoadFailed) return null;
  if (sgModule) return sgModule;

  try {
    sgModule = await import('@ast-grep/napi');
    return sgModule;
  } catch (error) {
    sgLoadFailed = true;
    sgLoadError = error instanceof Error ? error.message : String(error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Language support
// ---------------------------------------------------------------------------

const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'tsx', 'python', 'ruby', 'go', 'rust',
  'java', 'kotlin', 'swift', 'c', 'cpp', 'csharp', 'html', 'css',
  'json', 'yaml',
] as const;

type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Convert lowercase language string to ast-grep Lang enum value.
 */
function toLangEnum(
  sg: typeof import('@ast-grep/napi'),
  language: string,
): import('@ast-grep/napi').Lang {
  const langMap: Record<string, import('@ast-grep/napi').Lang> = {
    javascript: sg.Lang.JavaScript,
    typescript: sg.Lang.TypeScript,
    tsx: sg.Lang.Tsx,
    python: sg.Lang.Python,
    ruby: sg.Lang.Ruby,
    go: sg.Lang.Go,
    rust: sg.Lang.Rust,
    java: sg.Lang.Java,
    kotlin: sg.Lang.Kotlin,
    swift: sg.Lang.Swift,
    c: sg.Lang.C,
    cpp: sg.Lang.Cpp,
    csharp: sg.Lang.CSharp,
    html: sg.Lang.Html,
    css: sg.Lang.Css,
    json: sg.Lang.Json,
    yaml: sg.Lang.Yaml,
  };

  const lang = langMap[language];
  if (!lang) throw new Error(`Unsupported language: ${language}`);
  return lang;
}

// ---------------------------------------------------------------------------
// File extension to language mapping
// ---------------------------------------------------------------------------

const EXT_TO_LANG: Record<string, SupportedLanguage> = {
  '.js': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  '.tsx': 'tsx',
  '.py': 'python',
  '.rb': 'ruby',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.kt': 'kotlin',
  '.kts': 'kotlin',
  '.swift': 'swift',
  '.c': 'c',
  '.h': 'c',
  '.cpp': 'cpp',
  '.cc': 'cpp',
  '.cxx': 'cpp',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.html': 'html',
  '.htm': 'html',
  '.css': 'css',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
};

// Directories to skip during file discovery
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '__pycache__', '.venv', 'venv',
]);

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/**
 * Get files matching the language in a directory or single file.
 */
function getFilesForLanguage(
  dirPath: string,
  language: string,
  maxFiles = 1000,
): string[] {
  const files: string[] = [];
  const extensions = Object.entries(EXT_TO_LANG)
    .filter(([, lang]) => lang === language)
    .map(([ext]) => ext);

  function walk(dir: string): void {
    if (files.length >= maxFiles) return;

    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (files.length >= maxFiles) return;

        const fullPath = join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  const resolvedPath = resolve(dirPath);

  try {
    const stat = statSync(resolvedPath);
    if (stat.isFile()) return [resolvedPath];
  } catch {
    return [];
  }

  walk(resolvedPath);
  return files;
}

// ---------------------------------------------------------------------------
// Match formatting
// ---------------------------------------------------------------------------

function formatMatch(
  filePath: string,
  _matchText: string,
  startLine: number,
  endLine: number,
  context: number,
  fileContent: string,
): string {
  const lines = fileContent.split('\n');
  const contextStart = Math.max(0, startLine - context - 1);
  const contextEnd = Math.min(lines.length, endLine + context);

  const contextLines = lines.slice(contextStart, contextEnd);
  const numberedLines = contextLines.map((line, i) => {
    const lineNum = contextStart + i + 1;
    const isMatch = lineNum >= startLine && lineNum <= endLine;
    const prefix = isMatch ? '>' : ' ';
    return `${prefix} ${lineNum.toString().padStart(4)}: ${line}`;
  });

  return `${filePath}:${startLine}\n${numberedLines.join('\n')}`;
}

// ---------------------------------------------------------------------------
// Helper: text response
// ---------------------------------------------------------------------------

function textResult(text: string, isError?: boolean) {
  return { content: [{ type: 'text' as const, text }], ...(isError ? { isError } : {}) };
}

function unavailableResult(): { content: Array<{ type: 'text'; text: string }>; isError: boolean } {
  return textResult(
    '@ast-grep/napi is not available. Install it with: npm install @ast-grep/napi\n' +
    `Error: ${sgLoadError}`,
    true,
  );
}

// ---------------------------------------------------------------------------
// JSON Schema helpers (no zod dependency)
// ---------------------------------------------------------------------------

const languageEnumSchema = {
  type: 'string' as const,
  enum: [...SUPPORTED_LANGUAGES],
  description: 'Programming language',
};

// ---------------------------------------------------------------------------
// Tool 1: ast_grep_search
// ---------------------------------------------------------------------------

const astGrepSearchTool: AstToolDefinition = {
  name: 'ast_grep_search',

  description:
    'Search for code patterns using AST matching. More precise than text search.\n\n' +
    'Use meta-variables in patterns:\n' +
    '- $NAME - matches any single AST node (identifier, expression, etc.)\n' +
    '- $$$ARGS - matches multiple nodes (for function arguments, list items, etc.)\n\n' +
    'Examples:\n' +
    '- "function $NAME($$$ARGS)" - find all function declarations\n' +
    '- "console.log($MSG)" - find all console.log calls\n' +
    '- "if ($COND) { $$$BODY }" - find all if statements\n' +
    '- "$X === null" - find null equality checks\n' +
    '- "import $$$IMPORTS from \'$MODULE\'" - find imports\n\n' +
    'Note: Patterns must be valid AST nodes for the language.',

  schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'AST pattern with meta-variables ($VAR, $$$VARS)',
      },
      language: languageEnumSchema,
      path: {
        type: 'string',
        description: 'Directory or file to search (default: current directory)',
      },
      context: {
        type: 'number',
        description: 'Lines of context around matches (default: 2, max: 10)',
      },
      maxResults: {
        type: 'number',
        description: 'Maximum results to return (default: 20, max: 100)',
      },
    },
    required: ['pattern', 'language'],
  },

  handler: async (args: Record<string, unknown>) => {
    const pattern = args.pattern as string;
    const language = args.language as string;
    const searchPath = (args.path as string) || '.';
    const context = Math.min(Math.max((args.context as number) || 2, 0), 10);
    const maxResults = Math.min(Math.max((args.maxResults as number) || 20, 1), 100);

    if (!pattern || !language) {
      return textResult('Missing required parameters: pattern and language', true);
    }

    if (!SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
      return textResult(
        `Unsupported language: ${language}\nSupported: ${SUPPORTED_LANGUAGES.join(', ')}`,
        true,
      );
    }

    try {
      const sg = await getSgModule();
      if (!sg) return unavailableResult();

      const files = getFilesForLanguage(searchPath, language);

      if (files.length === 0) {
        return textResult(`No ${language} files found in ${searchPath}`);
      }

      const results: string[] = [];
      let totalMatches = 0;

      for (const filePath of files) {
        if (totalMatches >= maxResults) break;

        try {
          const content = readFileSync(filePath, 'utf-8');
          const root = sg.parse(toLangEnum(sg, language), content).root();
          const matches = root.findAll(pattern);

          for (const match of matches) {
            if (totalMatches >= maxResults) break;

            const range = match.range();
            const startLine = range.start.line + 1;
            const endLine = range.end.line + 1;

            results.push(
              formatMatch(filePath, match.text(), startLine, endLine, context, content),
            );
            totalMatches++;
          }
        } catch {
          // Skip files that fail to parse
        }
      }

      if (results.length === 0) {
        return textResult(
          `No matches found for pattern: ${pattern}\n\n` +
          `Searched ${files.length} ${language} file(s) in ${searchPath}\n\n` +
          'Tip: Ensure the pattern is a valid AST node. For example:\n' +
          '- Use "function $NAME" not just "$NAME"\n' +
          '- Use "console.log($X)" not "console.log"',
        );
      }

      const header = `Found ${totalMatches} match(es) in ${files.length} file(s)\nPattern: ${pattern}\n\n`;
      return textResult(header + results.join('\n\n---\n\n'));
    } catch (error) {
      return textResult(
        `Error in AST search: ${error instanceof Error ? error.message : String(error)}\n\n` +
        'Common issues:\n' +
        '- Pattern must be a complete AST node\n' +
        '- Language must match file type\n' +
        '- Check that @ast-grep/napi is installed',
        true,
      );
    }
  },
};

// ---------------------------------------------------------------------------
// Tool 2: ast_grep_replace
// ---------------------------------------------------------------------------

const astGrepReplaceTool: AstToolDefinition = {
  name: 'ast_grep_replace',

  description:
    'Replace code patterns using AST matching. Preserves matched content via meta-variables.\n\n' +
    'Use meta-variables in both pattern and replacement:\n' +
    '- $NAME in pattern captures a node, use $NAME in replacement to insert it\n' +
    '- $$$ARGS captures multiple nodes\n\n' +
    'Examples:\n' +
    '- Pattern: "console.log($MSG)" -> Replacement: "logger.info($MSG)"\n' +
    '- Pattern: "var $NAME = $VALUE" -> Replacement: "const $NAME = $VALUE"\n' +
    '- Pattern: "$OBJ.forEach(($ITEM) => { $$$BODY })" -> Replacement: "for (const $ITEM of $OBJ) { $$$BODY }"\n\n' +
    'IMPORTANT: dryRun=true (default) only previews changes. Set dryRun=false to apply.',

  schema: {
    type: 'object',
    properties: {
      pattern: {
        type: 'string',
        description: 'Pattern to match',
      },
      replacement: {
        type: 'string',
        description: 'Replacement pattern (use same meta-variables)',
      },
      language: languageEnumSchema,
      path: {
        type: 'string',
        description: 'Directory or file to search (default: current directory)',
      },
      dryRun: {
        type: 'boolean',
        description: 'Preview only, don\'t apply changes (default: true)',
      },
    },
    required: ['pattern', 'replacement', 'language'],
  },

  handler: async (args: Record<string, unknown>) => {
    const pattern = args.pattern as string;
    const replacement = args.replacement as string;
    const language = args.language as string;
    const searchPath = (args.path as string) || '.';
    const dryRun = args.dryRun !== false; // default true

    if (!pattern || !replacement || !language) {
      return textResult('Missing required parameters: pattern, replacement, and language', true);
    }

    if (!SUPPORTED_LANGUAGES.includes(language as SupportedLanguage)) {
      return textResult(
        `Unsupported language: ${language}\nSupported: ${SUPPORTED_LANGUAGES.join(', ')}`,
        true,
      );
    }

    try {
      const sg = await getSgModule();
      if (!sg) return unavailableResult();

      const files = getFilesForLanguage(searchPath, language);

      if (files.length === 0) {
        return textResult(`No ${language} files found in ${searchPath}`);
      }

      const changes: Array<{ file: string; before: string; after: string; line: number }> = [];
      let totalReplacements = 0;

      for (const filePath of files) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          const root = sg.parse(toLangEnum(sg, language), content).root();
          const matches = root.findAll(pattern);

          if (matches.length === 0) continue;

          // Collect all edits for this file
          const edits: Array<{
            start: number;
            end: number;
            replacement: string;
            line: number;
            before: string;
          }> = [];

          for (const match of matches) {
            const range = match.range();
            const startOffset = range.start.index;
            const endOffset = range.end.index;

            // Build replacement by substituting meta-variables
            let finalReplacement = replacement;

            try {
              const metaVars = replacement.match(/\$\$?\$?[A-Z_][A-Z0-9_]*/g) || [];
              for (const metaVar of metaVars) {
                const varName = metaVar.replace(/^\$+/, '');
                const captured = match.getMatch(varName);
                if (captured) {
                  finalReplacement = finalReplacement.replaceAll(metaVar, captured.text());
                }
              }
            } catch {
              // If meta-variable extraction fails, use pattern as-is
            }

            edits.push({
              start: startOffset,
              end: endOffset,
              replacement: finalReplacement,
              line: range.start.line + 1,
              before: match.text(),
            });
          }

          // Sort edits in reverse order to apply from end to start
          edits.sort((a, b) => b.start - a.start);

          let newContent = content;
          for (const edit of edits) {
            const before = newContent.slice(edit.start, edit.end);
            newContent =
              newContent.slice(0, edit.start) +
              edit.replacement +
              newContent.slice(edit.end);

            changes.push({
              file: filePath,
              before,
              after: edit.replacement,
              line: edit.line,
            });
            totalReplacements++;
          }

          if (!dryRun && edits.length > 0) {
            writeFileSync(filePath, newContent, 'utf-8');
          }
        } catch {
          // Skip files that fail to parse
        }
      }

      if (changes.length === 0) {
        return textResult(
          `No matches found for pattern: ${pattern}\n\n` +
          `Searched ${files.length} ${language} file(s) in ${searchPath}`,
        );
      }

      const mode = dryRun ? 'DRY RUN (no changes applied)' : 'CHANGES APPLIED';
      const header =
        `${mode}\n\n` +
        `Found ${totalReplacements} replacement(s) in ${files.length} file(s)\n` +
        `Pattern: ${pattern}\nReplacement: ${replacement}\n\n`;

      const changeList = changes
        .slice(0, 50)
        .map((c) => `${c.file}:${c.line}\n  - ${c.before}\n  + ${c.after}`)
        .join('\n\n');

      const footer = changes.length > 50
        ? `\n\n... and ${changes.length - 50} more changes`
        : '';

      const tip = dryRun ? '\n\nTo apply changes, run with dryRun: false' : '';

      return textResult(header + changeList + footer + tip);
    } catch (error) {
      return textResult(
        `Error in AST replace: ${error instanceof Error ? error.message : String(error)}`,
        true,
      );
    }
  },
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const astTools: AstToolDefinition[] = [astGrepSearchTool, astGrepReplaceTool];
