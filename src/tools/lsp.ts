/**
 * LSP (Language Server Protocol) Tools
 *
 * Self-contained module providing 12 IDE-like tools via real LSP server
 * integration. Includes a lightweight JSON-RPC client, server discovery,
 * formatting utilities, and directory-level diagnostics.
 *
 * Tools: lsp_hover, lsp_goto_definition, lsp_find_references,
 *        lsp_document_symbols, lsp_workspace_symbols, lsp_diagnostics,
 *        lsp_diagnostics_directory, lsp_servers, lsp_prepare_rename,
 *        lsp_rename, lsp_code_actions, lsp_code_action_resolve
 */

import { spawn } from 'child_process';
import { spawnSync, execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, dirname, parse, join, extname } from 'path';
import { pathToFileURL } from 'url';
import type { ChildProcess } from 'child_process';

// ---------------------------------------------------------------------------
// Tool definition type (matches MCP server registration)
// ---------------------------------------------------------------------------

export interface LspToolDefinition {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }>;
}

// ---------------------------------------------------------------------------
// LSP Protocol Types
// ---------------------------------------------------------------------------

interface Position {
  line: number;
  character: number;
}

interface Range {
  start: Position;
  end: Position;
}

interface Location {
  uri: string;
  range: Range;
}

interface Hover {
  contents:
    | string
    | { kind: string; value: string }
    | Array<string | { kind: string; value: string }>;
  range?: Range;
}

interface Diagnostic {
  range: Range;
  severity?: number;
  code?: string | number;
  source?: string;
  message: string;
}

interface DocumentSymbol {
  name: string;
  kind: number;
  range: Range;
  selectionRange: Range;
  children?: DocumentSymbol[];
}

interface SymbolInformation {
  name: string;
  kind: number;
  location: Location;
  containerName?: string;
}

interface WorkspaceEdit {
  changes?: Record<string, Array<{ range: Range; newText: string }>>;
  documentChanges?: Array<{
    textDocument: { uri: string };
    edits: Array<{ range: Range; newText: string }>;
  }>;
}

interface CodeAction {
  title: string;
  kind?: string;
  diagnostics?: Diagnostic[];
  isPreferred?: boolean;
  edit?: WorkspaceEdit;
  command?: { title: string; command: string; arguments?: unknown[] };
}

// ---------------------------------------------------------------------------
// JSON-RPC Types
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: unknown;
}

// ---------------------------------------------------------------------------
// Server Configurations
// ---------------------------------------------------------------------------

interface LspServerConfig {
  name: string;
  command: string;
  args: string[];
  extensions: string[];
  installHint: string;
  initializationOptions?: Record<string, unknown>;
}

const LSP_SERVERS: Record<string, LspServerConfig> = {
  typescript: {
    name: 'TypeScript Language Server',
    command: 'typescript-language-server',
    args: ['--stdio'],
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'],
    installHint: 'npm install -g typescript-language-server typescript',
  },
  python: {
    name: 'Python Language Server (pylsp)',
    command: 'pylsp',
    args: [],
    extensions: ['.py', '.pyw'],
    installHint: 'pip install python-lsp-server',
  },
  rust: {
    name: 'Rust Analyzer',
    command: 'rust-analyzer',
    args: [],
    extensions: ['.rs'],
    installHint: 'rustup component add rust-analyzer',
  },
  go: {
    name: 'gopls',
    command: 'gopls',
    args: ['serve'],
    extensions: ['.go'],
    installHint: 'go install golang.org/x/tools/gopls@latest',
  },
  c: {
    name: 'clangd',
    command: 'clangd',
    args: [],
    extensions: ['.c', '.h', '.cpp', '.cc', '.cxx', '.hpp', '.hxx'],
    installHint: 'Install clangd from your package manager or LLVM',
  },
  java: {
    name: 'Eclipse JDT Language Server',
    command: 'jdtls',
    args: [],
    extensions: ['.java'],
    installHint: 'Install from https://github.com/eclipse/eclipse.jdt.ls',
  },
  json: {
    name: 'JSON Language Server',
    command: 'vscode-json-language-server',
    args: ['--stdio'],
    extensions: ['.json', '.jsonc'],
    installHint: 'npm install -g vscode-langservers-extracted',
  },
  html: {
    name: 'HTML Language Server',
    command: 'vscode-html-language-server',
    args: ['--stdio'],
    extensions: ['.html', '.htm'],
    installHint: 'npm install -g vscode-langservers-extracted',
  },
  css: {
    name: 'CSS Language Server',
    command: 'vscode-css-language-server',
    args: ['--stdio'],
    extensions: ['.css', '.scss', '.less'],
    installHint: 'npm install -g vscode-langservers-extracted',
  },
  yaml: {
    name: 'YAML Language Server',
    command: 'yaml-language-server',
    args: ['--stdio'],
    extensions: ['.yaml', '.yml'],
    installHint: 'npm install -g yaml-language-server',
  },
  php: {
    name: 'PHP Language Server (Intelephense)',
    command: 'intelephense',
    args: ['--stdio'],
    extensions: ['.php', '.phtml'],
    installHint: 'npm install -g intelephense',
  },
  ruby: {
    name: 'Ruby Language Server (Solargraph)',
    command: 'solargraph',
    args: ['stdio'],
    extensions: ['.rb', '.rake', '.gemspec', '.erb'],
    installHint: 'gem install solargraph',
  },
  lua: {
    name: 'Lua Language Server',
    command: 'lua-language-server',
    args: [],
    extensions: ['.lua'],
    installHint: 'Install from https://github.com/LuaLS/lua-language-server',
  },
  kotlin: {
    name: 'Kotlin Language Server',
    command: 'kotlin-language-server',
    args: [],
    extensions: ['.kt', '.kts'],
    installHint:
      'Install from https://github.com/fwcd/kotlin-language-server',
  },
  elixir: {
    name: 'ElixirLS',
    command: 'elixir-ls',
    args: [],
    extensions: ['.ex', '.exs', '.heex', '.eex'],
    installHint: 'Install from https://github.com/elixir-lsp/elixir-ls',
  },
  csharp: {
    name: 'OmniSharp',
    command: 'omnisharp',
    args: ['-lsp'],
    extensions: ['.cs'],
    installHint: 'dotnet tool install -g omnisharp',
  },
  dart: {
    name: 'Dart Analysis Server',
    command: 'dart',
    args: ['language-server', '--protocol=lsp'],
    extensions: ['.dart'],
    installHint:
      'Install Dart SDK from https://dart.dev/get-dart or Flutter SDK from https://flutter.dev',
  },
  swift: {
    name: 'SourceKit-LSP',
    command: 'sourcekit-lsp',
    args: [],
    extensions: ['.swift'],
    installHint:
      'Install Swift from https://swift.org/download or via Xcode',
  },
};

// ---------------------------------------------------------------------------
// Server Discovery Helpers
// ---------------------------------------------------------------------------

function commandExists(command: string): boolean {
  const checkCommand = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(checkCommand, [command], { stdio: 'ignore' });
  return result.status === 0;
}

function getServerForFile(filePath: string): LspServerConfig | null {
  const ext = extname(filePath).toLowerCase();
  for (const config of Object.values(LSP_SERVERS)) {
    if (config.extensions.includes(ext)) {
      return config;
    }
  }
  return null;
}

function getAllServers(): Array<LspServerConfig & { installed: boolean }> {
  return Object.values(LSP_SERVERS).map((config) => ({
    ...config,
    installed: commandExists(config.command),
  }));
}

// ---------------------------------------------------------------------------
// Formatting Utilities
// ---------------------------------------------------------------------------

const SYMBOL_KINDS: Record<number, string> = {
  1: 'File',
  2: 'Module',
  3: 'Namespace',
  4: 'Package',
  5: 'Class',
  6: 'Method',
  7: 'Property',
  8: 'Field',
  9: 'Constructor',
  10: 'Enum',
  11: 'Interface',
  12: 'Function',
  13: 'Variable',
  14: 'Constant',
  15: 'String',
  16: 'Number',
  17: 'Boolean',
  18: 'Array',
  19: 'Object',
  20: 'Key',
  21: 'Null',
  22: 'EnumMember',
  23: 'Struct',
  24: 'Event',
  25: 'Operator',
  26: 'TypeParameter',
};

const SEVERITY_NAMES: Record<number, string> = {
  1: 'Error',
  2: 'Warning',
  3: 'Information',
  4: 'Hint',
};

function uriToPath(uri: string): string {
  if (uri.startsWith('file://')) {
    return decodeURIComponent(uri.slice(7));
  }
  return uri;
}

function formatPosition(line: number, character: number): string {
  return `${line + 1}:${character + 1}`;
}

function formatRange(range: Range): string {
  const start = formatPosition(range.start.line, range.start.character);
  const end = formatPosition(range.end.line, range.end.character);
  return start === end ? start : `${start}-${end}`;
}

function formatLocation(location: Location): string {
  const uri =
    location.uri || (location as Record<string, unknown>).targetUri;
  if (!uri) return 'Unknown location';
  const path = uriToPath(uri as string);
  const locationRange =
    location.range ||
    (location as Record<string, unknown>).targetRange ||
    (location as Record<string, unknown>).targetSelectionRange;
  if (!locationRange) return path;
  const range = formatRange(locationRange as Range);
  return `${path}:${range}`;
}

function formatHover(hover: Hover | null): string {
  if (!hover) return 'No hover information available';

  let text = '';
  if (typeof hover.contents === 'string') {
    text = hover.contents;
  } else if (Array.isArray(hover.contents)) {
    text = hover.contents
      .map((c) => (typeof c === 'string' ? c : c.value))
      .join('\n\n');
  } else if ('value' in hover.contents) {
    text = hover.contents.value;
  }

  if (hover.range) {
    text += `\n\nRange: ${formatRange(hover.range)}`;
  }

  return text || 'No hover information available';
}

function formatLocations(
  locations: Location | Location[] | null,
): string {
  if (!locations) return 'No locations found';
  const locs = Array.isArray(locations) ? locations : [locations];
  if (locs.length === 0) return 'No locations found';
  return locs.map((loc) => formatLocation(loc)).join('\n');
}

function formatDocumentSymbols(
  symbols: DocumentSymbol[] | SymbolInformation[] | null,
  indent = 0,
): string {
  if (!symbols || symbols.length === 0) return 'No symbols found';

  const lines: string[] = [];
  const prefix = '  '.repeat(indent);

  for (const symbol of symbols) {
    const kind = SYMBOL_KINDS[symbol.kind] || 'Unknown';
    if ('selectionRange' in symbol) {
      // DocumentSymbol
      const range = formatRange(symbol.range);
      lines.push(`${prefix}${kind}: ${symbol.name} [${range}]`);
      if (
        (symbol as DocumentSymbol).children &&
        (symbol as DocumentSymbol).children!.length > 0
      ) {
        lines.push(
          formatDocumentSymbols(
            (symbol as DocumentSymbol).children!,
            indent + 1,
          ),
        );
      }
    } else {
      // SymbolInformation
      const loc = formatLocation((symbol as SymbolInformation).location);
      const container = (symbol as SymbolInformation).containerName
        ? ` (in ${(symbol as SymbolInformation).containerName})`
        : '';
      lines.push(`${prefix}${kind}: ${symbol.name}${container} [${loc}]`);
    }
  }

  return lines.join('\n');
}

function formatWorkspaceSymbols(
  symbols: SymbolInformation[] | null,
): string {
  if (!symbols || symbols.length === 0) return 'No symbols found';
  const lines = symbols.map((symbol) => {
    const kind = SYMBOL_KINDS[symbol.kind] || 'Unknown';
    const loc = formatLocation(symbol.location);
    const container = symbol.containerName
      ? ` (in ${symbol.containerName})`
      : '';
    return `${kind}: ${symbol.name}${container}\n  ${loc}`;
  });
  return lines.join('\n\n');
}

function formatDiagnostics(
  diagnostics: Diagnostic[],
  filePath?: string,
): string {
  if (diagnostics.length === 0) return 'No diagnostics';
  const lines = diagnostics.map((diag) => {
    const severity = SEVERITY_NAMES[diag.severity || 1] || 'Unknown';
    const range = formatRange(diag.range);
    const source = diag.source ? `[${diag.source}]` : '';
    const code = diag.code ? ` (${diag.code})` : '';
    const location = filePath ? `${filePath}:${range}` : range;
    return `${severity}${code}${source}: ${diag.message}\n  at ${location}`;
  });
  return lines.join('\n\n');
}

function formatCodeActions(actions: CodeAction[] | null): string {
  if (!actions || actions.length === 0) return 'No code actions available';
  const lines = actions.map((action, index) => {
    const preferred = action.isPreferred ? ' (preferred)' : '';
    const kind = action.kind ? ` [${action.kind}]` : '';
    return `${index + 1}. ${action.title}${kind}${preferred}`;
  });
  return lines.join('\n');
}

function formatWorkspaceEdit(edit: WorkspaceEdit | null): string {
  if (!edit) return 'No edits';
  const lines: string[] = [];

  if (edit.changes) {
    for (const [uri, changes] of Object.entries(edit.changes)) {
      const path = uriToPath(uri);
      lines.push(`File: ${path}`);
      for (const change of changes) {
        const range = formatRange(change.range);
        const preview =
          change.newText.length > 50
            ? change.newText.slice(0, 50) + '...'
            : change.newText;
        lines.push(`  ${range}: "${preview}"`);
      }
    }
  }

  if (edit.documentChanges) {
    for (const docChange of edit.documentChanges) {
      const path = uriToPath(docChange.textDocument.uri);
      lines.push(`File: ${path}`);
      for (const change of docChange.edits) {
        const range = formatRange(change.range);
        const preview =
          change.newText.length > 50
            ? change.newText.slice(0, 50) + '...'
            : change.newText;
        lines.push(`  ${range}: "${preview}"`);
      }
    }
  }

  return lines.length > 0 ? lines.join('\n') : 'No edits';
}

function countEdits(
  edit: WorkspaceEdit | null,
): { files: number; edits: number } {
  if (!edit) return { files: 0, edits: 0 };
  let files = 0;
  let edits = 0;

  if (edit.changes) {
    files += Object.keys(edit.changes).length;
    edits += Object.values(edit.changes).reduce(
      (sum, changes) => sum + changes.length,
      0,
    );
  }

  if (edit.documentChanges) {
    files += edit.documentChanges.length;
    edits += edit.documentChanges.reduce(
      (sum, doc) => sum + doc.edits.length,
      0,
    );
  }

  return { files, edits };
}

// ---------------------------------------------------------------------------
// LSP Client
// ---------------------------------------------------------------------------

/** Convert a file path to a file:// URI */
function fileUri(filePath: string): string {
  return pathToFileURL(resolve(filePath)).href;
}

/** Language ID mapping from file extension */
const LANG_MAP: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescriptreact',
  js: 'javascript',
  jsx: 'javascriptreact',
  mts: 'typescript',
  cts: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  rs: 'rust',
  go: 'go',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  java: 'java',
  json: 'json',
  html: 'html',
  css: 'css',
  scss: 'scss',
  yaml: 'yaml',
  yml: 'yaml',
  php: 'php',
  phtml: 'php',
  rb: 'ruby',
  rake: 'ruby',
  gemspec: 'ruby',
  erb: 'ruby',
  lua: 'lua',
  kt: 'kotlin',
  kts: 'kotlin',
  ex: 'elixir',
  exs: 'elixir',
  heex: 'elixir',
  eex: 'elixir',
  cs: 'csharp',
  dart: 'dart',
  swift: 'swift',
};

class LspClient {
  private proc: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  private buffer = Buffer.alloc(0);
  private openDocuments = new Set<string>();
  private diagnosticsStore = new Map<string, Diagnostic[]>();
  private diagnosticWaiters = new Map<string, Array<() => void>>();
  private workspaceRoot: string;
  private serverConfig: LspServerConfig;
  private initialized = false;

  constructor(workspaceRoot: string, serverConfig: LspServerConfig) {
    this.workspaceRoot = resolve(workspaceRoot);
    this.serverConfig = serverConfig;
  }

  /** Start the LSP server and initialize the connection */
  async connect(): Promise<void> {
    if (this.proc) return;

    if (!commandExists(this.serverConfig.command)) {
      throw new Error(
        `Language server '${this.serverConfig.command}' not found.\n` +
          `Install with: ${this.serverConfig.installHint}`,
      );
    }

    return new Promise<void>((resolveConnect, rejectConnect) => {
      this.proc = spawn(this.serverConfig.command, this.serverConfig.args, {
        cwd: this.workspaceRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
      });

      this.proc.stdout?.on('data', (data: Buffer) => this.handleData(data));
      this.proc.stderr?.on('data', (data: Buffer) => {
        console.error(`LSP stderr: ${data.toString()}`);
      });

      this.proc.on('error', (error) => {
        rejectConnect(
          new Error(`Failed to start LSP server: ${error.message}`),
        );
      });

      this.proc.on('exit', (code) => {
        this.proc = null;
        this.initialized = false;
        this.rejectPendingRequests(
          new Error(`LSP server exited (code ${code})`),
        );
      });

      this.initialize()
        .then(() => {
          this.initialized = true;
          resolveConnect();
        })
        .catch(rejectConnect);
    });
  }

  /** Disconnect from the LSP server */
  async disconnect(): Promise<void> {
    if (!this.proc) return;
    try {
      await this.request('shutdown', null);
      this.notify('exit', null);
    } catch {
      // Ignore errors during shutdown
    }
    this.proc.kill();
    this.proc = null;
    this.initialized = false;
    this.pendingRequests.clear();
    this.openDocuments.clear();
    this.diagnosticsStore.clear();
  }

  private rejectPendingRequests(error: Error): void {
    for (const [id, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
      this.pendingRequests.delete(id);
    }
  }

  // -- JSON-RPC message framing ------------------------------------------

  private handleData(data: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, data]);
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) break;

      const header = this.buffer.subarray(0, headerEnd).toString();
      const match = header.match(/Content-Length: (\d+)/i);
      if (!match) {
        this.buffer = this.buffer.subarray(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(match[1], 10);
      const messageStart = headerEnd + 4;
      const messageEnd = messageStart + contentLength;
      if (this.buffer.length < messageEnd) break;

      const json = this.buffer.subarray(messageStart, messageEnd).toString();
      this.buffer = this.buffer.subarray(messageEnd);

      try {
        this.handleMessage(JSON.parse(json));
      } catch {
        // Invalid JSON, skip
      }
    }
  }

  private handleMessage(
    message: JsonRpcResponse | JsonRpcNotification,
  ): void {
    if ('id' in message && message.id !== undefined) {
      const pending = this.pendingRequests.get(
        message.id as number,
      );
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id as number);
        if ((message as JsonRpcResponse).error) {
          pending.reject(
            new Error((message as JsonRpcResponse).error!.message),
          );
        } else {
          pending.resolve((message as JsonRpcResponse).result);
        }
      }
    } else if ('method' in message) {
      this.handleNotification(message as JsonRpcNotification);
    }
  }

  private handleNotification(notification: JsonRpcNotification): void {
    if (notification.method === 'textDocument/publishDiagnostics') {
      const params = notification.params as {
        uri: string;
        diagnostics: Diagnostic[];
      };
      this.diagnosticsStore.set(params.uri, params.diagnostics);
      const waiters = this.diagnosticWaiters.get(params.uri);
      if (waiters && waiters.length > 0) {
        this.diagnosticWaiters.delete(params.uri);
        for (const wake of waiters) wake();
      }
    }
  }

  // -- JSON-RPC transport ------------------------------------------------

  private async request<T>(
    method: string,
    params: unknown,
    timeout = 15000,
  ): Promise<T> {
    if (!this.proc?.stdin) {
      throw new Error('LSP server not connected');
    }
    const id = ++this.requestId;
    const req: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };
    const content = JSON.stringify(req);
    const message = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;

    return new Promise<T>((resolveReq, rejectReq) => {
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(id);
        rejectReq(
          new Error(
            `LSP request '${method}' timed out after ${timeout}ms`,
          ),
        );
      }, timeout);

      this.pendingRequests.set(id, {
        resolve: resolveReq as (value: unknown) => void,
        reject: rejectReq,
        timeout: timeoutHandle,
      });

      this.proc?.stdin?.write(message);
    });
  }

  private notify(method: string, params: unknown): void {
    if (!this.proc?.stdin) return;
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    const content = JSON.stringify(notification);
    const message = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;
    this.proc.stdin.write(message);
  }

  // -- LSP lifecycle -----------------------------------------------------

  private async initialize(): Promise<void> {
    await this.request('initialize', {
      processId: process.pid,
      rootUri: pathToFileURL(this.workspaceRoot).href,
      rootPath: this.workspaceRoot,
      capabilities: {
        textDocument: {
          hover: { contentFormat: ['markdown', 'plaintext'] },
          definition: { linkSupport: true },
          references: {},
          documentSymbol: { hierarchicalDocumentSymbolSupport: true },
          codeAction: {
            codeActionLiteralSupport: {
              codeActionKind: { valueSet: [] },
            },
          },
          rename: { prepareSupport: true },
        },
        workspace: {
          symbol: {},
          workspaceFolders: true,
        },
      },
      initializationOptions: this.serverConfig.initializationOptions || {},
    });
    this.notify('initialized', {});
  }

  // -- Document management -----------------------------------------------

  async openDocument(filePath: string): Promise<void> {
    const uri = fileUri(filePath);
    if (this.openDocuments.has(uri)) return;

    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, 'utf-8');
    const ext = parse(filePath).ext.slice(1).toLowerCase();
    const languageId = LANG_MAP[ext] || ext;

    this.notify('textDocument/didOpen', {
      textDocument: { uri, languageId, version: 1, text: content },
    });
    this.openDocuments.add(uri);

    // Brief pause for server to process
    await new Promise((r) => setTimeout(r, 100));
  }

  private async prepareDocument(filePath: string): Promise<string> {
    await this.openDocument(filePath);
    return fileUri(filePath);
  }

  // -- LSP Request Methods -----------------------------------------------

  async hover(
    filePath: string,
    line: number,
    character: number,
  ): Promise<Hover | null> {
    const uri = await this.prepareDocument(filePath);
    return this.request<Hover | null>('textDocument/hover', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  async definition(
    filePath: string,
    line: number,
    character: number,
  ): Promise<Location | Location[] | null> {
    const uri = await this.prepareDocument(filePath);
    return this.request<Location | Location[] | null>(
      'textDocument/definition',
      { textDocument: { uri }, position: { line, character } },
    );
  }

  async references(
    filePath: string,
    line: number,
    character: number,
    includeDeclaration = true,
  ): Promise<Location[] | null> {
    const uri = await this.prepareDocument(filePath);
    return this.request<Location[] | null>('textDocument/references', {
      textDocument: { uri },
      position: { line, character },
      context: { includeDeclaration },
    });
  }

  async documentSymbols(
    filePath: string,
  ): Promise<DocumentSymbol[] | SymbolInformation[] | null> {
    const uri = await this.prepareDocument(filePath);
    return this.request<DocumentSymbol[] | SymbolInformation[] | null>(
      'textDocument/documentSymbol',
      { textDocument: { uri } },
    );
  }

  async workspaceSymbols(
    query: string,
  ): Promise<SymbolInformation[] | null> {
    return this.request<SymbolInformation[] | null>('workspace/symbol', {
      query,
    });
  }

  getDiagnostics(filePath: string): Diagnostic[] {
    const uri = fileUri(filePath);
    return this.diagnosticsStore.get(uri) || [];
  }

  /** Wait for the server to publish diagnostics or until timeout */
  waitForDiagnostics(filePath: string, timeoutMs = 2000): Promise<void> {
    const uri = fileUri(filePath);
    if (this.diagnosticsStore.has(uri)) return Promise.resolve();

    return new Promise<void>((resolveWait) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.diagnosticWaiters.delete(uri);
          resolveWait();
        }
      }, timeoutMs);

      const existing = this.diagnosticWaiters.get(uri) || [];
      existing.push(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolveWait();
        }
      });
      this.diagnosticWaiters.set(uri, existing);
    });
  }

  async prepareRename(
    filePath: string,
    line: number,
    character: number,
  ): Promise<Range | null> {
    const uri = await this.prepareDocument(filePath);
    try {
      const result = await this.request<
        Range | { range: Range; placeholder: string } | null
      >('textDocument/prepareRename', {
        textDocument: { uri },
        position: { line, character },
      });
      if (!result) return null;
      return 'range' in result ? result.range : result;
    } catch {
      return null;
    }
  }

  async rename(
    filePath: string,
    line: number,
    character: number,
    newName: string,
  ): Promise<WorkspaceEdit | null> {
    const uri = await this.prepareDocument(filePath);
    return this.request<WorkspaceEdit | null>('textDocument/rename', {
      textDocument: { uri },
      position: { line, character },
      newName,
    });
  }

  async codeActions(
    filePath: string,
    range: Range,
    diagnostics: Diagnostic[] = [],
  ): Promise<CodeAction[] | null> {
    const uri = await this.prepareDocument(filePath);
    return this.request<CodeAction[] | null>('textDocument/codeAction', {
      textDocument: { uri },
      range,
      context: { diagnostics },
    });
  }
}

// ---------------------------------------------------------------------------
// Client Manager (singleton, with idle eviction)
// ---------------------------------------------------------------------------

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 60 * 1000;

class LspClientManager {
  private clients = new Map<string, LspClient>();
  private lastUsed = new Map<string, number>();
  private inFlightCount = new Map<string, number>();
  private idleTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startIdleCheck();
  }

  /** Run a function with in-flight tracking; protects client from idle eviction */
  async runWithClientLease<T>(
    filePath: string,
    fn: (client: LspClient) => Promise<T>,
  ): Promise<T> {
    const serverConfig = getServerForFile(filePath);
    if (!serverConfig) {
      throw new Error(`No language server available for: ${filePath}`);
    }

    const workspaceRoot = this.findWorkspaceRoot(filePath);
    const key = `${workspaceRoot}:${serverConfig.command}`;

    let client = this.clients.get(key);
    if (!client) {
      client = new LspClient(workspaceRoot, serverConfig);
      await client.connect();
      this.clients.set(key, client);
    }

    this.lastUsed.set(key, Date.now());
    this.inFlightCount.set(key, (this.inFlightCount.get(key) || 0) + 1);

    try {
      return await fn(client);
    } finally {
      const count = (this.inFlightCount.get(key) || 1) - 1;
      if (count <= 0) {
        this.inFlightCount.delete(key);
      } else {
        this.inFlightCount.set(key, count);
      }
      this.lastUsed.set(key, Date.now());
    }
  }

  private findWorkspaceRoot(filePath: string): string {
    let dir = dirname(resolve(filePath));
    const markers = [
      'package.json',
      'tsconfig.json',
      'pyproject.toml',
      'Cargo.toml',
      'go.mod',
      '.git',
    ];

    while (true) {
      const parsed = parse(dir);
      if (parsed.root === dir) break;
      for (const marker of markers) {
        if (existsSync(join(dir, marker))) return dir;
      }
      dir = dirname(dir);
    }

    return dirname(resolve(filePath));
  }

  private startIdleCheck(): void {
    if (this.idleTimer) return;
    this.idleTimer = setInterval(
      () => this.evictIdleClients(),
      IDLE_CHECK_INTERVAL_MS,
    );
    if (
      this.idleTimer &&
      typeof this.idleTimer === 'object' &&
      'unref' in this.idleTimer
    ) {
      (this.idleTimer as NodeJS.Timeout).unref();
    }
  }

  private evictIdleClients(): void {
    const now = Date.now();
    for (const [key, lastUsedTime] of this.lastUsed.entries()) {
      if (now - lastUsedTime > IDLE_TIMEOUT_MS) {
        if ((this.inFlightCount.get(key) || 0) > 0) continue;
        const client = this.clients.get(key);
        if (client) {
          client.disconnect().catch(() => {});
          this.clients.delete(key);
          this.lastUsed.delete(key);
          this.inFlightCount.delete(key);
        }
      }
    }
  }

  async disconnectAll(): Promise<void> {
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }
    const entries = Array.from(this.clients.entries());
    await Promise.allSettled(entries.map(([, client]) => client.disconnect()));
    this.clients.clear();
    this.lastUsed.clear();
    this.inFlightCount.clear();
  }
}

const lspClientManager = new LspClientManager();

// ---------------------------------------------------------------------------
// Tool helper: withLspClient
// ---------------------------------------------------------------------------

type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

async function withLspClient(
  filePath: string,
  operation: string,
  fn: (client: LspClient) => Promise<string>,
): Promise<ToolResult> {
  try {
    const serverConfig = getServerForFile(filePath);
    if (!serverConfig) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `No language server available for file type: ${filePath}\n\nUse lsp_servers tool to see available language servers.`,
          },
        ],
      };
    }

    const result = await lspClientManager.runWithClientLease(filePath, fn);
    return { content: [{ type: 'text', text: result }] };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    if (message.includes('not found')) {
      return {
        isError: true,
        content: [{ type: 'text', text: message }],
      };
    }
    return {
      isError: true,
      content: [
        { type: 'text', text: `Error in ${operation}: ${message}` },
      ],
    };
  }
}

// ---------------------------------------------------------------------------
// Directory Diagnostics (tsc + LSP fallback)
// ---------------------------------------------------------------------------

const LSP_DIAGNOSTICS_WAIT_MS = 300;

interface TscDiagnostic {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

interface TscResult {
  success: boolean;
  diagnostics: TscDiagnostic[];
  errorCount: number;
  warningCount: number;
}

function runTscDiagnostics(directory: string): TscResult {
  const tsconfigPath = join(directory, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    return { success: true, diagnostics: [], errorCount: 0, warningCount: 0 };
  }

  try {
    execSync('tsc --noEmit --pretty false', {
      cwd: directory,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    return { success: true, diagnostics: [], errorCount: 0, warningCount: 0 };
  } catch (error: unknown) {
    const output =
      (error as { stdout?: string }).stdout ||
      (error as { stderr?: string }).stderr ||
      '';
    return parseTscOutput(output);
  }
}

function parseTscOutput(output: string): TscResult {
  const diagnostics: TscDiagnostic[] = [];
  const regex =
    /^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(output)) !== null) {
    diagnostics.push({
      file: match[1],
      line: parseInt(match[2], 10),
      column: parseInt(match[3], 10),
      severity: match[4] as 'error' | 'warning',
      code: match[5],
      message: match[6],
    });
  }

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  const warningCount = diagnostics.filter(
    (d) => d.severity === 'warning',
  ).length;

  return { success: errorCount === 0, diagnostics, errorCount, warningCount };
}

function findFiles(
  directory: string,
  extensions: string[],
  ignoreDirs: string[] = [],
): string[] {
  const results: string[] = [];
  const ignoreDirSet = new Set(ignoreDirs);

  function walk(dir: string) {
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            if (!ignoreDirSet.has(entry)) walk(fullPath);
          } else if (stat.isFile()) {
            if (extensions.includes(extname(fullPath))) results.push(fullPath);
          }
        } catch {
          continue;
        }
      }
    } catch {
      return;
    }
  }

  walk(directory);
  return results;
}

interface DirectoryDiagnosticResult {
  strategy: 'tsc' | 'lsp';
  success: boolean;
  errorCount: number;
  warningCount: number;
  diagnostics: string;
  summary: string;
}

async function runDirectoryDiagnostics(
  directory: string,
  strategy: 'tsc' | 'lsp' | 'auto' = 'auto',
): Promise<DirectoryDiagnosticResult> {
  const hasTsconfig = existsSync(join(directory, 'tsconfig.json'));
  const useStrategy: 'tsc' | 'lsp' =
    strategy === 'auto' ? (hasTsconfig ? 'tsc' : 'lsp') : strategy;

  if (useStrategy === 'tsc' && hasTsconfig) {
    return formatTscResult(runTscDiagnostics(directory));
  }
  return formatLspAggregatedResult(
    await runLspAggregatedDiagnostics(directory),
  );
}

function formatTscResult(result: TscResult): DirectoryDiagnosticResult {
  if (result.diagnostics.length === 0) {
    return {
      strategy: 'tsc',
      success: true,
      errorCount: 0,
      warningCount: 0,
      diagnostics: 'No diagnostics found. All files are clean!',
      summary: 'TypeScript check passed: 0 errors, 0 warnings',
    };
  }

  const byFile = new Map<string, TscDiagnostic[]>();
  for (const diag of result.diagnostics) {
    if (!byFile.has(diag.file)) byFile.set(diag.file, []);
    byFile.get(diag.file)!.push(diag);
  }

  const fileOutputs: string[] = [];
  for (const [file, diags] of byFile) {
    let fileOutput = `${file}:\n`;
    for (const diag of diags) {
      fileOutput += `  ${diag.line}:${diag.column} - ${diag.severity} ${diag.code}: ${diag.message}\n`;
    }
    fileOutputs.push(fileOutput);
  }

  return {
    strategy: 'tsc',
    success: result.success,
    errorCount: result.errorCount,
    warningCount: result.warningCount,
    diagnostics: fileOutputs.join('\n'),
    summary: `TypeScript check ${result.success ? 'passed' : 'failed'}: ${result.errorCount} errors, ${result.warningCount} warnings`,
  };
}

interface LspAggregationResult {
  success: boolean;
  diagnostics: Array<{ file: string; diagnostic: Diagnostic }>;
  errorCount: number;
  warningCount: number;
  filesChecked: number;
}

async function runLspAggregatedDiagnostics(
  directory: string,
  extensions: string[] = ['.ts', '.tsx', '.js', '.jsx'],
): Promise<LspAggregationResult> {
  const files = findFiles(directory, extensions, [
    'node_modules',
    'dist',
    'build',
    '.git',
  ]);

  const allDiagnostics: Array<{ file: string; diagnostic: Diagnostic }> = [];
  let filesChecked = 0;

  for (const file of files) {
    try {
      await lspClientManager.runWithClientLease(file, async (client) => {
        await client.openDocument(file);
        await client.waitForDiagnostics(file, LSP_DIAGNOSTICS_WAIT_MS);
        const diagnostics = client.getDiagnostics(file);
        for (const diagnostic of diagnostics) {
          allDiagnostics.push({ file, diagnostic });
        }
        filesChecked++;
      });
    } catch {
      continue;
    }
  }

  const errorCount = allDiagnostics.filter(
    (d) => d.diagnostic.severity === 1,
  ).length;
  const warningCount = allDiagnostics.filter(
    (d) => d.diagnostic.severity === 2,
  ).length;

  return {
    success: errorCount === 0,
    diagnostics: allDiagnostics,
    errorCount,
    warningCount,
    filesChecked,
  };
}

function formatLspAggregatedResult(
  result: LspAggregationResult,
): DirectoryDiagnosticResult {
  if (result.diagnostics.length === 0) {
    return {
      strategy: 'lsp',
      success: true,
      errorCount: 0,
      warningCount: 0,
      diagnostics: `Checked ${result.filesChecked} files. No diagnostics found!`,
      summary: `LSP check passed: 0 errors, 0 warnings (${result.filesChecked} files)`,
    };
  }

  const byFile = new Map<
    string,
    Array<{ file: string; diagnostic: Diagnostic }>
  >();
  for (const item of result.diagnostics) {
    if (!byFile.has(item.file)) byFile.set(item.file, []);
    byFile.get(item.file)!.push(item);
  }

  const fileOutputs: string[] = [];
  for (const [file, items] of byFile) {
    const diags = items.map((i) => i.diagnostic);
    fileOutputs.push(`${file}:\n${formatDiagnostics(diags, file)}`);
  }

  return {
    strategy: 'lsp',
    success: result.success,
    errorCount: result.errorCount,
    warningCount: result.warningCount,
    diagnostics: fileOutputs.join('\n\n'),
    summary: `LSP check ${result.success ? 'passed' : 'failed'}: ${result.errorCount} errors, ${result.warningCount} warnings (${result.filesChecked} files)`,
  };
}

// ---------------------------------------------------------------------------
// Tool Definitions (12 tools)
// ---------------------------------------------------------------------------

export const lspTools: LspToolDefinition[] = [
  // 1. lsp_hover
  {
    name: 'lsp_hover',
    description:
      'Get type information, documentation, and signature at a specific position in a file. Useful for understanding what a symbol represents.',
    schema: {
      file: 'string',
      line: 'number',
      character: 'number',
    },
    handler: async (args) => {
      const file = args.file as string;
      const line = args.line as number;
      const character = args.character as number;
      return withLspClient(file, 'hover', async (client) => {
        const hover = await client.hover(file, line - 1, character);
        return formatHover(hover);
      });
    },
  },

  // 2. lsp_goto_definition
  {
    name: 'lsp_goto_definition',
    description:
      'Find the definition location of a symbol (function, variable, class, etc.). Returns the file path and position where the symbol is defined.',
    schema: {
      file: 'string',
      line: 'number',
      character: 'number',
    },
    handler: async (args) => {
      const file = args.file as string;
      const line = args.line as number;
      const character = args.character as number;
      return withLspClient(file, 'goto definition', async (client) => {
        const locations = await client.definition(file, line - 1, character);
        return formatLocations(locations);
      });
    },
  },

  // 3. lsp_find_references
  {
    name: 'lsp_find_references',
    description:
      'Find all references to a symbol across the codebase. Useful for understanding usage patterns and impact of changes.',
    schema: {
      file: 'string',
      line: 'number',
      character: 'number',
      includeDeclaration: 'boolean?',
    },
    handler: async (args) => {
      const file = args.file as string;
      const line = args.line as number;
      const character = args.character as number;
      const includeDeclaration =
        (args.includeDeclaration as boolean | undefined) ?? true;
      return withLspClient(file, 'find references', async (client) => {
        const locations = await client.references(
          file,
          line - 1,
          character,
          includeDeclaration,
        );
        if (!locations || locations.length === 0) {
          return 'No references found';
        }
        return `Found ${locations.length} reference(s):\n\n${formatLocations(locations)}`;
      });
    },
  },

  // 4. lsp_document_symbols
  {
    name: 'lsp_document_symbols',
    description:
      'Get a hierarchical outline of all symbols in a file (functions, classes, variables, etc.). Useful for understanding file structure.',
    schema: {
      file: 'string',
    },
    handler: async (args) => {
      const file = args.file as string;
      return withLspClient(file, 'document symbols', async (client) => {
        const symbols = await client.documentSymbols(file);
        return formatDocumentSymbols(symbols);
      });
    },
  },

  // 5. lsp_workspace_symbols
  {
    name: 'lsp_workspace_symbols',
    description:
      'Search for symbols (functions, classes, etc.) across the entire workspace by name. Useful for finding definitions without knowing the exact file.',
    schema: {
      query: 'string',
      file: 'string',
    },
    handler: async (args) => {
      const query = args.query as string;
      const file = args.file as string;
      return withLspClient(file, 'workspace symbols', async (client) => {
        const symbols = await client.workspaceSymbols(query);
        if (!symbols || symbols.length === 0) {
          return `No symbols found matching: ${query}`;
        }
        return `Found ${symbols.length} symbol(s) matching "${query}":\n\n${formatWorkspaceSymbols(symbols)}`;
      });
    },
  },

  // 6. lsp_diagnostics
  {
    name: 'lsp_diagnostics',
    description:
      'Get language server diagnostics (errors, warnings, hints) for a file. Useful for finding issues without running the compiler.',
    schema: {
      file: 'string',
      severity: 'string?',
    },
    handler: async (args) => {
      const file = args.file as string;
      const severity = args.severity as string | undefined;
      return withLspClient(file, 'diagnostics', async (client) => {
        await client.openDocument(file);
        await new Promise((r) => setTimeout(r, LSP_DIAGNOSTICS_WAIT_MS));

        let diagnostics = client.getDiagnostics(file);

        if (severity) {
          const severityMap: Record<string, number> = {
            error: 1,
            warning: 2,
            info: 3,
            hint: 4,
          };
          const severityNum = severityMap[severity];
          if (severityNum) {
            diagnostics = diagnostics.filter(
              (d) => d.severity === severityNum,
            );
          }
        }

        if (diagnostics.length === 0) {
          return severity
            ? `No ${severity} diagnostics in ${file}`
            : `No diagnostics in ${file}`;
        }

        return `Found ${diagnostics.length} diagnostic(s):\n\n${formatDiagnostics(diagnostics, file)}`;
      });
    },
  },

  // 7. lsp_diagnostics_directory
  {
    name: 'lsp_diagnostics_directory',
    description:
      'Run project-level diagnostics on a directory using tsc --noEmit (preferred) or LSP iteration (fallback). Useful for checking the entire codebase for errors.',
    schema: {
      directory: 'string',
      strategy: 'string?',
    },
    handler: async (args) => {
      const directory = args.directory as string;
      const strategy = (args.strategy as 'tsc' | 'lsp' | 'auto') || 'auto';
      try {
        const result = await runDirectoryDiagnostics(directory, strategy);

        let output = `## Directory Diagnostics\n\n`;
        output += `Strategy: ${result.strategy}\n`;
        output += `Summary: ${result.summary}\n\n`;

        if (result.errorCount > 0 || result.warningCount > 0) {
          output += `### Diagnostics\n\n${result.diagnostics}`;
        } else {
          output += result.diagnostics;
        }

        return { content: [{ type: 'text' as const, text: output }] };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: `Error running directory diagnostics: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    },
  },

  // 8. lsp_servers
  {
    name: 'lsp_servers',
    description:
      'List all known language servers and their installation status. Shows which servers are available and how to install missing ones.',
    schema: {},
    handler: async () => {
      const servers = getAllServers();
      const installed = servers.filter((s) => s.installed);
      const notInstalled = servers.filter((s) => !s.installed);

      let text = '## Language Server Status\n\n';

      if (installed.length > 0) {
        text += '### Installed:\n';
        for (const server of installed) {
          text += `- ${server.name} (${server.command})\n`;
          text += `  Extensions: ${server.extensions.join(', ')}\n`;
        }
        text += '\n';
      }

      if (notInstalled.length > 0) {
        text += '### Not Installed:\n';
        for (const server of notInstalled) {
          text += `- ${server.name} (${server.command})\n`;
          text += `  Extensions: ${server.extensions.join(', ')}\n`;
          text += `  Install: ${server.installHint}\n`;
        }
      }

      return { content: [{ type: 'text' as const, text }] };
    },
  },

  // 9. lsp_prepare_rename
  {
    name: 'lsp_prepare_rename',
    description:
      'Check if a symbol at the given position can be renamed. Returns the range of the symbol if rename is possible.',
    schema: {
      file: 'string',
      line: 'number',
      character: 'number',
    },
    handler: async (args) => {
      const file = args.file as string;
      const line = args.line as number;
      const character = args.character as number;
      return withLspClient(file, 'prepare rename', async (client) => {
        const range = await client.prepareRename(file, line - 1, character);
        if (!range) {
          return 'Cannot rename symbol at this position';
        }
        return `Rename possible. Symbol range: line ${range.start.line + 1}, col ${range.start.character + 1} to line ${range.end.line + 1}, col ${range.end.character + 1}`;
      });
    },
  },

  // 10. lsp_rename
  {
    name: 'lsp_rename',
    description:
      'Rename a symbol (variable, function, class, etc.) across all files in the project. Returns the list of edits that would be made. Does NOT apply the changes automatically.',
    schema: {
      file: 'string',
      line: 'number',
      character: 'number',
      newName: 'string',
    },
    handler: async (args) => {
      const file = args.file as string;
      const line = args.line as number;
      const character = args.character as number;
      const newName = args.newName as string;
      return withLspClient(file, 'rename', async (client) => {
        const edit = await client.rename(file, line - 1, character, newName);
        if (!edit) {
          return 'Rename failed or no edits returned';
        }
        const { files, edits } = countEdits(edit);
        return `Rename to "${newName}" would affect ${files} file(s) with ${edits} edit(s):\n\n${formatWorkspaceEdit(edit)}\n\nNote: Use the Edit tool to apply these changes.`;
      });
    },
  },

  // 11. lsp_code_actions
  {
    name: 'lsp_code_actions',
    description:
      'Get available code actions (refactorings, quick fixes) for a selection. Returns a list of possible actions that can be applied.',
    schema: {
      file: 'string',
      startLine: 'number',
      startCharacter: 'number',
      endLine: 'number',
      endCharacter: 'number',
    },
    handler: async (args) => {
      const file = args.file as string;
      const startLine = args.startLine as number;
      const startCharacter = args.startCharacter as number;
      const endLine = args.endLine as number;
      const endCharacter = args.endCharacter as number;
      return withLspClient(file, 'code actions', async (client) => {
        const range: Range = {
          start: { line: startLine - 1, character: startCharacter },
          end: { line: endLine - 1, character: endCharacter },
        };
        const actions = await client.codeActions(file, range);
        return formatCodeActions(actions);
      });
    },
  },

  // 12. lsp_code_action_resolve
  {
    name: 'lsp_code_action_resolve',
    description:
      'Get the full edit details for a specific code action. Use after lsp_code_actions to see what changes an action would make.',
    schema: {
      file: 'string',
      startLine: 'number',
      startCharacter: 'number',
      endLine: 'number',
      endCharacter: 'number',
      actionIndex: 'number',
    },
    handler: async (args) => {
      const file = args.file as string;
      const startLine = args.startLine as number;
      const startCharacter = args.startCharacter as number;
      const endLine = args.endLine as number;
      const endCharacter = args.endCharacter as number;
      const actionIndex = args.actionIndex as number;
      return withLspClient(file, 'code action resolve', async (client) => {
        const range: Range = {
          start: { line: startLine - 1, character: startCharacter },
          end: { line: endLine - 1, character: endCharacter },
        };
        const actions = await client.codeActions(file, range);

        if (!actions || actions.length === 0) {
          return 'No code actions available';
        }

        if (actionIndex < 1 || actionIndex > actions.length) {
          return `Invalid action index. Available actions: 1-${actions.length}`;
        }

        const action = actions[actionIndex - 1];

        let result = `Action: ${action.title}\n`;
        if (action.kind) result += `Kind: ${action.kind}\n`;
        if (action.isPreferred) result += `(Preferred)\n`;

        if (action.edit) {
          result += `\nEdits:\n${formatWorkspaceEdit(action.edit)}`;
        }

        if (action.command) {
          result += `\nCommand: ${action.command.title} (${action.command.command})`;
        }

        return result;
      });
    },
  },
];
