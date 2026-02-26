/**
 * Context Injection
 *
 * Consolidated module for collecting and injecting context from multiple
 * sources into user prompts. Supports priority ordering and deduplication.
 *
 * Contains:
 * - Context types (ContextSourceType, ContextPriority, ContextEntry, etc.)
 * - ContextCollector class (singleton, session-scoped, priority sorting)
 * - Injection functions (injectPendingContext, injectContextIntoText)
 * - createContextInjectorHook factory
 * - Global `contextCollector` singleton export
 *
 * Adapted from:
 * - src/features/context-injector/types.ts
 * - src/features/context-injector/collector.ts
 * - src/features/context-injector/injector.ts
 * - src/features/context-injector/index.ts
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Source identifier for context injection.
 * Each source registers context that will be merged and injected together.
 */
export type ContextSourceType =
  | 'keyword-detector'
  | 'rules-injector'
  | 'directory-agents'
  | 'directory-readme'
  | 'boulder-state'
  | 'session-context'
  | 'learner'
  | 'beads'
  | 'project-memory'
  | 'custom';

/**
 * Priority levels for context ordering.
 * Higher-priority contexts appear first in the merged output.
 */
export type ContextPriority = 'critical' | 'high' | 'normal' | 'low';

/**
 * A single context entry registered by a source.
 */
export interface ContextEntry {
  /** Unique identifier for this entry within the source */
  id: string;
  /** The source that registered this context */
  source: ContextSourceType;
  /** The actual context content to inject */
  content: string;
  /** Priority for ordering (default: normal) */
  priority: ContextPriority;
  /** Timestamp when registered */
  timestamp: number;
  /** Optional metadata for debugging/logging */
  metadata?: Record<string, unknown>;
}

/**
 * Options for registering context.
 */
export interface RegisterContextOptions {
  /** Unique ID for this context entry (used for deduplication) */
  id: string;
  /** Source identifier */
  source: ContextSourceType;
  /** The content to inject */
  content: string;
  /** Priority for ordering (default: normal) */
  priority?: ContextPriority;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Result of getting pending context for a session.
 */
export interface PendingContext {
  /** Merged context string, ready for injection */
  merged: string;
  /** Individual entries that were merged */
  entries: ContextEntry[];
  /** Whether there is any content to inject */
  hasContent: boolean;
}

/**
 * Message context from the original user message.
 * Used when injecting to match the message format.
 */
export interface MessageContext {
  sessionId?: string;
  agent?: string;
  model?: {
    providerId?: string;
    modelId?: string;
  };
  path?: {
    cwd?: string;
    root?: string;
  };
  tools?: Record<string, boolean>;
}

/**
 * Output parts from hook processing.
 */
export interface OutputPart {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/**
 * Injection strategy for context.
 */
export type InjectionStrategy = 'prepend' | 'append' | 'wrap';

/**
 * Result of an injection operation.
 */
export interface InjectionResult {
  /** Whether injection occurred */
  injected: boolean;
  /** Length of injected context */
  contextLength: number;
  /** Number of entries injected */
  entryCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Priority ordering — lower number = higher priority */
const PRIORITY_ORDER: Record<ContextPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/** Separator between merged context entries */
const CONTEXT_SEPARATOR = '\n\n---\n\n';

/** Default separator between injected context and original content */
const DEFAULT_SEPARATOR = '\n\n---\n\n';

// ---------------------------------------------------------------------------
// ContextCollector
// ---------------------------------------------------------------------------

/**
 * Collects and manages context entries for sessions.
 *
 * Session-scoped: each session has its own isolated context map.
 * Supports priority sorting and deduplication by source:id key.
 */
export class ContextCollector {
  private sessions: Map<string, Map<string, ContextEntry>> = new Map();

  /**
   * Register a context entry for a session.
   *
   * If an entry with the same `source:id` key already exists it will be
   * replaced (deduplication).
   */
  register(sessionId: string, options: RegisterContextOptions): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new Map());
    }

    const sessionMap = this.sessions.get(sessionId)!;
    const key = `${options.source}:${options.id}`;

    const entry: ContextEntry = {
      id: options.id,
      source: options.source,
      content: options.content,
      priority: options.priority ?? 'normal',
      timestamp: Date.now(),
      metadata: options.metadata,
    };

    sessionMap.set(key, entry);
  }

  /**
   * Get pending context for a session without consuming it.
   */
  getPending(sessionId: string): PendingContext {
    const sessionMap = this.sessions.get(sessionId);

    if (!sessionMap || sessionMap.size === 0) {
      return { merged: '', entries: [], hasContent: false };
    }

    const entries = this.sortEntries([...sessionMap.values()]);
    const merged = entries.map((e) => e.content).join(CONTEXT_SEPARATOR);

    return {
      merged,
      entries,
      hasContent: entries.length > 0,
    };
  }

  /**
   * Get and consume pending context for a session.
   * After consumption the session's context is cleared.
   */
  consume(sessionId: string): PendingContext {
    const pending = this.getPending(sessionId);
    this.clear(sessionId);
    return pending;
  }

  /**
   * Clear all context for a session.
   */
  clear(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /**
   * Check if a session has pending context.
   */
  hasPending(sessionId: string): boolean {
    const sessionMap = this.sessions.get(sessionId);
    return sessionMap !== undefined && sessionMap.size > 0;
  }

  /**
   * Get the count of entries for a session.
   */
  getEntryCount(sessionId: string): number {
    return this.sessions.get(sessionId)?.size ?? 0;
  }

  /**
   * Remove a specific entry from a session.
   * Returns true if the entry was found and removed.
   */
  removeEntry(sessionId: string, source: string, id: string): boolean {
    const sessionMap = this.sessions.get(sessionId);
    if (!sessionMap) return false;
    return sessionMap.delete(`${source}:${id}`);
  }

  /**
   * Get all active session IDs.
   */
  getActiveSessions(): string[] {
    return [...this.sessions.keys()];
  }

  /**
   * Sort entries by priority (higher first) then by timestamp (earlier first).
   */
  private sortEntries(entries: ContextEntry[]): ContextEntry[] {
    return entries.sort((a, b) => {
      const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp;
    });
  }
}

// ---------------------------------------------------------------------------
// Global singleton
// ---------------------------------------------------------------------------

/** Global singleton ContextCollector instance */
export const contextCollector = new ContextCollector();

// ---------------------------------------------------------------------------
// Injection functions
// ---------------------------------------------------------------------------

/**
 * Inject pending context into an array of output parts.
 *
 * Finds the first text part and modifies it according to the chosen strategy.
 * Consumes the pending context on success.
 */
export function injectPendingContext(
  collector: ContextCollector,
  sessionId: string,
  parts: OutputPart[],
  strategy: InjectionStrategy = 'prepend',
): InjectionResult {
  if (!collector.hasPending(sessionId)) {
    return { injected: false, contextLength: 0, entryCount: 0 };
  }

  const textPartIndex = parts.findIndex((p) => p.type === 'text' && p.text !== undefined);
  if (textPartIndex === -1) {
    return { injected: false, contextLength: 0, entryCount: 0 };
  }

  const pending = collector.consume(sessionId);
  const originalText = parts[textPartIndex].text ?? '';

  switch (strategy) {
    case 'prepend':
      parts[textPartIndex].text = `${pending.merged}${DEFAULT_SEPARATOR}${originalText}`;
      break;
    case 'append':
      parts[textPartIndex].text = `${originalText}${DEFAULT_SEPARATOR}${pending.merged}`;
      break;
    case 'wrap':
      parts[textPartIndex].text =
        `<injected-context>\n${pending.merged}\n</injected-context>${DEFAULT_SEPARATOR}${originalText}`;
      break;
  }

  return {
    injected: true,
    contextLength: pending.merged.length,
    entryCount: pending.entries.length,
  };
}

/**
 * Inject pending context into a raw text string.
 *
 * Returns the modified string and injection metadata.
 * Consumes the pending context on success.
 */
export function injectContextIntoText(
  collector: ContextCollector,
  sessionId: string,
  text: string,
  strategy: InjectionStrategy = 'prepend',
): { result: string; injectionResult: InjectionResult } {
  if (!collector.hasPending(sessionId)) {
    return {
      result: text,
      injectionResult: { injected: false, contextLength: 0, entryCount: 0 },
    };
  }

  const pending = collector.consume(sessionId);
  let result: string;

  switch (strategy) {
    case 'prepend':
      result = `${pending.merged}${DEFAULT_SEPARATOR}${text}`;
      break;
    case 'append':
      result = `${text}${DEFAULT_SEPARATOR}${pending.merged}`;
      break;
    case 'wrap':
      result = `<injected-context>\n${pending.merged}\n</injected-context>${DEFAULT_SEPARATOR}${text}`;
      break;
  }

  return {
    result,
    injectionResult: {
      injected: true,
      contextLength: pending.merged.length,
      entryCount: pending.entries.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Hook factory
// ---------------------------------------------------------------------------

/**
 * Create a Claude Code-compatible hook handler for context injection.
 *
 * Returns an object with helpers that wrap the given collector, providing
 * a convenient API for hook implementations.
 */
export function createContextInjectorHook(collector: ContextCollector) {
  return {
    /**
     * Process a user message and inject any pending context.
     */
    processUserMessage: (sessionId: string, message: string): { message: string; injected: boolean } => {
      if (!collector.hasPending(sessionId)) {
        return { message, injected: false };
      }

      const { result } = injectContextIntoText(collector, sessionId, message, 'prepend');
      return { message: result, injected: true };
    },

    /**
     * Register context for injection into the next message.
     */
    registerContext: collector.register.bind(collector),

    /**
     * Check if there is pending context for a session.
     */
    hasPending: collector.hasPending.bind(collector),

    /**
     * Clear pending context without injecting.
     */
    clear: collector.clear.bind(collector),
  };
}
