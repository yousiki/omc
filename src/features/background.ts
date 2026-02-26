/**
 * Background Task Management
 *
 * Consolidated module for background task execution, concurrency control,
 * and system prompt guidance.
 *
 * Contains:
 * - BackgroundTask types and related types
 * - ConcurrencyManager (queue-based, configurable limits)
 * - BackgroundManager (persistence, task lifecycle, pruning)
 * - shouldRunInBackground() heuristic
 * - getBackgroundTaskGuidance() for system prompt text
 *
 * Adapted from:
 * - src/features/background-agent/types.ts
 * - src/features/background-agent/concurrency.ts
 * - src/features/background-agent/manager.ts
 * - src/features/background-tasks.ts
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { writeJsonFile } from '../utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Status of a background task.
 */
export type BackgroundTaskStatus =
  | 'queued' // Waiting for concurrency slot
  | 'running'
  | 'completed'
  | 'error'
  | 'cancelled';

/**
 * Progress tracking for a background task.
 */
export interface TaskProgress {
  /** Number of tool calls made */
  toolCalls: number;
  /** Last tool used */
  lastTool?: string;
  /** Last update timestamp */
  lastUpdate: Date;
  /** Last message content (truncated) */
  lastMessage?: string;
  /** Last message timestamp */
  lastMessageAt?: Date;
}

/**
 * A background task being managed.
 */
export interface BackgroundTask {
  /** Unique task identifier */
  id: string;
  /** Session ID for this task */
  sessionId: string;
  /** Parent session that launched this task */
  parentSessionId: string;
  /** Short description of the task */
  description: string;
  /** Original prompt for the task */
  prompt: string;
  /** Agent handling the task */
  agent: string;
  /** Current status */
  status: BackgroundTaskStatus;
  /** When the task was queued (waiting for concurrency) */
  queuedAt?: Date;
  /** When the task started running */
  startedAt: Date;
  /** When the task completed (if completed) */
  completedAt?: Date;
  /** Result output (if completed) */
  result?: string;
  /** Error message (if failed) */
  error?: string;
  /** Progress tracking */
  progress?: TaskProgress;
  /** Key for concurrency tracking */
  concurrencyKey?: string;
  /** Parent model (preserved from launch input) */
  parentModel?: string;
}

/**
 * Input for launching a new background task.
 */
export interface LaunchInput {
  /** Short description of the task */
  description: string;
  /** Prompt for the task */
  prompt: string;
  /** Agent to handle the task */
  agent: string;
  /** Parent session ID */
  parentSessionId: string;
  /** Model configuration (optional) */
  model?: string;
}

/**
 * Input for resuming a background task.
 */
export interface ResumeInput {
  /** Session ID to resume */
  sessionId: string;
  /** New prompt to send */
  prompt: string;
  /** Parent session ID */
  parentSessionId: string;
}

/**
 * Context for resuming a background task.
 */
export interface ResumeContext {
  /** Session ID of the task */
  sessionId: string;
  /** Original prompt for the task */
  previousPrompt: string;
  /** Number of tool calls made so far */
  toolCallCount: number;
  /** Last tool used (if any) */
  lastToolUsed?: string;
  /** Summary of last output (truncated) */
  lastOutputSummary?: string;
  /** When the task started */
  startedAt: Date;
  /** When the task was last active */
  lastActivityAt: Date;
}

/**
 * Configuration for background task management and concurrency.
 */
export interface BackgroundTaskConfig {
  /** Default concurrency limit (0 = unlimited) */
  defaultConcurrency?: number;
  /** Per-model concurrency limits */
  modelConcurrency?: Record<string, number>;
  /** Per-provider concurrency limits */
  providerConcurrency?: Record<string, number>;
  /** Maximum total background tasks (running + queued) */
  maxTotalTasks?: number;
  /** Task timeout in milliseconds */
  taskTimeoutMs?: number;
  /** Maximum queue size (tasks waiting for a slot) */
  maxQueueSize?: number;
  /** Threshold in ms for detecting stale sessions (default: 5 min) */
  staleThresholdMs?: number;
  /** Callback invoked when a stale session is detected */
  onStaleSession?: (task: BackgroundTask) => void;
}

/**
 * Result of a background execution decision.
 */
export interface TaskExecutionDecision {
  /** Whether to run in background */
  runInBackground: boolean;
  /** Human-readable reason for the decision */
  reason: string;
  /** Estimated duration category */
  estimatedDuration: 'quick' | 'medium' | 'long' | 'unknown';
  /** Confidence level of the decision */
  confidence: 'high' | 'medium' | 'low';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default task timeout: 30 minutes */
const DEFAULT_TASK_TTL_MS = 30 * 60 * 1000;

/** Default maximum concurrent background tasks */
export const DEFAULT_MAX_BACKGROUND_TASKS = 5;

/**
 * Patterns that indicate long-running operations.
 * These should typically run in background.
 */
export const LONG_RUNNING_PATTERNS = [
  // Package managers
  /\b(npm|yarn|pnpm|bun)\s+(install|ci|update|upgrade)\b/i,
  /\b(pip|pip3)\s+install\b/i,
  /\bcargo\s+(build|install|test)\b/i,
  /\bgo\s+(build|install|test)\b/i,
  /\brustup\s+(update|install)\b/i,
  /\bgem\s+install\b/i,
  /\bcomposer\s+install\b/i,
  /\bmaven|mvn\s+(install|package|test)\b/i,
  /\bgradle\s+(build|test)\b/i,

  // Build commands
  /\b(npm|yarn|pnpm|bun)\s+run\s+(build|compile|bundle)\b/i,
  /\bmake\s*(all|build|install)?\s*$/i,
  /\bcmake\s+--build\b/i,
  /\btsc\s+(--build|-b)?\b/i,
  /\bwebpack\b/i,
  /\brollup\b/i,
  /\besbuild\b/i,
  /\bvite\s+build\b/i,

  // Test suites
  /\b(npm|yarn|pnpm|bun)\s+run\s+test\b/i,
  /\b(jest|mocha|vitest|pytest|cargo\s+test)\b/i,
  /\bgo\s+test\b/i,

  // Docker operations
  /\bdocker\s+(build|pull|push)\b/i,
  /\bdocker-compose\s+(up|build)\b/i,

  // Database operations
  /\b(prisma|typeorm|sequelize)\s+(migrate|generate|push)\b/i,

  // Linting large codebases
  /\b(eslint|prettier)\s+[^|]*\.\s*$/i,

  // Git operations on large repos
  /\bgit\s+(clone|fetch|pull)\b/i,
];

/**
 * Patterns that should always run blocking (foreground).
 * These are quick operations or need immediate feedback.
 */
export const BLOCKING_PATTERNS = [
  // Quick status checks
  /\bgit\s+(status|diff|log|branch)\b/i,
  /\bls\b/i,
  /\bpwd\b/i,
  /\bcat\b/i,
  /\becho\b/i,
  /\bhead\b/i,
  /\btail\b/i,
  /\bwc\b/i,
  /\bwhich\b/i,
  /\btype\b/i,

  // File operations
  /\bcp\b/i,
  /\bmv\b/i,
  /\brm\b/i,
  /\bmkdir\b/i,
  /\btouch\b/i,

  // Environment checks
  /\benv\b/i,
  /\bprintenv\b/i,
  /\bnode\s+-[vpe]\b/i,
  /\bnpm\s+-v\b/i,
  /\bpython\s+--version\b/i,
];

// ---------------------------------------------------------------------------
// ConcurrencyManager
// ---------------------------------------------------------------------------

/**
 * Manages concurrency limits for background tasks.
 * Provides acquire/release semantics with queue-based waiting.
 */
export class ConcurrencyManager {
  private config?: BackgroundTaskConfig;
  private counts: Map<string, number> = new Map();
  private queues: Map<string, Array<() => void>> = new Map();

  constructor(config?: BackgroundTaskConfig) {
    this.config = config;
  }

  /**
   * Get the concurrency limit for a given key (model/agent name).
   */
  getConcurrencyLimit(key: string): number {
    // Check model-specific limit
    const modelLimit = this.config?.modelConcurrency?.[key];
    if (modelLimit !== undefined) {
      return modelLimit === 0 ? Infinity : modelLimit;
    }

    // Check provider-specific limit (first segment of key before /)
    const provider = key.split('/')[0];
    const providerLimit = this.config?.providerConcurrency?.[provider];
    if (providerLimit !== undefined) {
      return providerLimit === 0 ? Infinity : providerLimit;
    }

    // Fall back to default
    const defaultLimit = this.config?.defaultConcurrency;
    if (defaultLimit !== undefined) {
      return defaultLimit === 0 ? Infinity : defaultLimit;
    }

    // Default: 5 concurrent tasks per key
    return 5;
  }

  /**
   * Acquire a slot for the given key.
   * Returns immediately if under limit, otherwise queues the request.
   */
  async acquire(key: string): Promise<void> {
    const limit = this.getConcurrencyLimit(key);
    if (limit === Infinity) {
      return;
    }

    const current = this.counts.get(key) ?? 0;
    if (current < limit) {
      this.counts.set(key, current + 1);
      return;
    }

    // Queue the request until a slot becomes available
    return new Promise<void>((resolve) => {
      const queue = this.queues.get(key) ?? [];
      queue.push(resolve);
      this.queues.set(key, queue);
    });
  }

  /**
   * Release a slot for the given key.
   * If there are queued requests, resolves the next one.
   */
  release(key: string): void {
    const limit = this.getConcurrencyLimit(key);
    if (limit === Infinity) {
      return;
    }

    const queue = this.queues.get(key);
    if (queue && queue.length > 0) {
      // Promote next queued request to running
      const next = queue.shift()!;
      next();
    } else {
      // Decrement active count
      const current = this.counts.get(key) ?? 0;
      if (current > 0) {
        this.counts.set(key, current - 1);
      }
    }
  }

  /**
   * Get current active count for a key.
   */
  getCount(key: string): number {
    return this.counts.get(key) ?? 0;
  }

  /**
   * Get queue length for a key.
   */
  getQueueLength(key: string): number {
    return this.queues.get(key)?.length ?? 0;
  }

  /**
   * Check if a key is at capacity.
   */
  isAtCapacity(key: string): boolean {
    const limit = this.getConcurrencyLimit(key);
    if (limit === Infinity) return false;
    return (this.counts.get(key) ?? 0) >= limit;
  }

  /**
   * Get all active keys and their counts.
   */
  getActiveCounts(): Map<string, number> {
    return new Map(this.counts);
  }

  /**
   * Clear all counts and queues.
   */
  clear(): void {
    this.counts.clear();
    this.queues.clear();
  }
}

// ---------------------------------------------------------------------------
// BackgroundManager
// ---------------------------------------------------------------------------

/**
 * Manages background tasks: persistence, lifecycle, concurrency, and pruning.
 *
 * Tasks are persisted under `.omc/state/background-tasks/` in the project root
 * (or a configured directory).
 */
export class BackgroundManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private concurrencyManager: ConcurrencyManager;
  private config: BackgroundTaskConfig;
  private storageDir: string;
  private pruneInterval?: ReturnType<typeof setInterval>;

  constructor(directory: string, config?: BackgroundTaskConfig) {
    this.config = config ?? {};
    this.concurrencyManager = new ConcurrencyManager(config);
    this.storageDir = join(directory, '.omc', 'state', 'background-tasks');
    this.ensureStorageDir();
    this.loadPersistedTasks();
    this.startPruning();
  }

  // -------------------------------------------------------------------------
  // Storage helpers
  // -------------------------------------------------------------------------

  private ensureStorageDir(): void {
    if (!existsSync(this.storageDir)) {
      mkdirSync(this.storageDir, { recursive: true });
    }
  }

  private getTaskPath(taskId: string): string {
    return join(this.storageDir, `${taskId}.json`);
  }

  private persistTask(task: BackgroundTask): void {
    writeJsonFile(this.getTaskPath(task.id), task);
  }

  private unpersistTask(taskId: string): void {
    const path = this.getTaskPath(taskId);
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }

  private loadPersistedTasks(): void {
    if (!existsSync(this.storageDir)) return;

    try {
      const files = readdirSync(this.storageDir) as string[];

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        try {
          const path = join(this.storageDir, file);
          const content = readFileSync(path, 'utf-8');
          const task = JSON.parse(content) as BackgroundTask;

          // Restore Date objects from serialized ISO strings
          task.startedAt = new Date(task.startedAt);
          if (task.queuedAt) task.queuedAt = new Date(task.queuedAt);
          if (task.completedAt) task.completedAt = new Date(task.completedAt);
          if (task.progress?.lastUpdate) {
            task.progress.lastUpdate = new Date(task.progress.lastUpdate);
          }
          if (task.progress?.lastMessageAt) {
            task.progress.lastMessageAt = new Date(task.progress.lastMessageAt);
          }

          this.tasks.set(task.id, task);
        } catch {
          // Skip invalid task files silently
        }
      }
    } catch {
      // Ignore errors reading directory
    }
  }

  // -------------------------------------------------------------------------
  // ID generation
  // -------------------------------------------------------------------------

  private generateTaskId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `bg_${timestamp}${random}`;
  }

  // -------------------------------------------------------------------------
  // Pruning
  // -------------------------------------------------------------------------

  private startPruning(): void {
    if (this.pruneInterval) return;

    this.pruneInterval = setInterval(() => {
      this.pruneStaleTasksAndNotifications();
    }, 60_000); // Every minute

    // Don't keep the process alive just for pruning
    if (this.pruneInterval.unref) {
      this.pruneInterval.unref();
    }
  }

  private stopPruning(): void {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = undefined;
    }
  }

  private pruneStaleTasksAndNotifications(): void {
    const now = Date.now();
    const ttl = this.config.taskTimeoutMs ?? DEFAULT_TASK_TTL_MS;

    for (const [taskId, task] of this.tasks.entries()) {
      const age = now - task.startedAt.getTime();
      if (age > ttl && (task.status === 'running' || task.status === 'queued')) {
        task.status = 'error';
        task.error = `Task timed out after ${Math.round(ttl / 60_000)} minutes`;
        task.completedAt = new Date();

        if (task.concurrencyKey) {
          this.concurrencyManager.release(task.concurrencyKey);
        }

        this.unpersistTask(taskId);
        this.tasks.delete(taskId);
      }
    }

    // Detect and handle stale running sessions
    this.detectAndHandleStaleSessions();
  }

  /**
   * Detect running tasks with no recent activity and handle them.
   */
  private detectAndHandleStaleSessions(): void {
    const now = Date.now();
    const threshold = this.config.staleThresholdMs ?? 5 * 60 * 1000;

    for (const task of this.tasks.values()) {
      if (task.status !== 'running') continue;

      const lastActivity = task.progress?.lastUpdate ?? task.startedAt;
      const timeSinceActivity = now - lastActivity.getTime();

      if (timeSinceActivity > threshold) {
        if (this.config.onStaleSession) {
          this.config.onStaleSession(task);
        } else if (timeSinceActivity > threshold * 2) {
          // Default: mark as error after 2× threshold with no activity
          task.status = 'error';
          task.error = `Task stale: no activity for ${Math.round(timeSinceActivity / 60_000)} minutes`;
          task.completedAt = new Date();

          if (task.concurrencyKey) {
            this.concurrencyManager.release(task.concurrencyKey);
          }

          this.unpersistTask(task.id);
          this.tasks.delete(task.id);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Task lifecycle
  // -------------------------------------------------------------------------

  /**
   * Register and launch a new background task.
   *
   * Creates the task in QUEUED state immediately (so it is visible), then
   * waits for a concurrency slot before transitioning to RUNNING.
   */
  async launch(input: LaunchInput): Promise<BackgroundTask> {
    const concurrencyKey = input.agent;

    const runningTasks = Array.from(this.tasks.values()).filter((t) => t.status === 'running');
    const queuedTasks = Array.from(this.tasks.values()).filter((t) => t.status === 'queued');
    const tasksInFlight = runningTasks.length + queuedTasks.length;

    // Enforce maxTotalTasks
    const maxTotal = this.config.maxTotalTasks ?? 10;
    if (tasksInFlight >= maxTotal) {
      throw new Error(
        `Maximum tasks in flight (${maxTotal}) reached. ` +
          `Currently: ${runningTasks.length} running, ${queuedTasks.length} queued. ` +
          `Wait for some tasks to complete.`,
      );
    }

    // Enforce explicit maxQueueSize
    const maxQueueSize = this.config.maxQueueSize;
    if (maxQueueSize !== undefined && queuedTasks.length >= maxQueueSize) {
      throw new Error(
        `Maximum queue size (${maxQueueSize}) reached. ` +
          `Currently: ${runningTasks.length} running, ${queuedTasks.length} queued. ` +
          `Wait for some tasks to start or complete.`,
      );
    }

    const taskId = this.generateTaskId();
    const sessionId = `ses_${this.generateTaskId()}`;

    const task: BackgroundTask = {
      id: taskId,
      sessionId,
      parentSessionId: input.parentSessionId,
      description: input.description,
      prompt: input.prompt,
      agent: input.agent,
      status: 'queued',
      queuedAt: new Date(),
      startedAt: new Date(), // Placeholder; updated when slot acquired
      progress: {
        toolCalls: 0,
        lastUpdate: new Date(),
      },
      concurrencyKey,
      parentModel: input.model,
    };

    // Store immediately so the task is visible while waiting
    this.tasks.set(taskId, task);
    this.persistTask(task);

    // Wait for a concurrency slot (may resolve immediately or block)
    await this.concurrencyManager.acquire(concurrencyKey);

    // Transition to RUNNING once slot acquired
    task.status = 'running';
    task.startedAt = new Date();
    this.persistTask(task);

    return task;
  }

  /**
   * Resume an existing background task by session ID.
   */
  async resume(input: ResumeInput): Promise<BackgroundTask> {
    const existingTask = this.findBySession(input.sessionId);
    if (!existingTask) {
      throw new Error(`Task not found for session: ${input.sessionId}`);
    }

    existingTask.status = 'running';
    existingTask.completedAt = undefined;
    existingTask.error = undefined;
    existingTask.parentSessionId = input.parentSessionId;

    if (!existingTask.progress) {
      existingTask.progress = { toolCalls: 0, lastUpdate: new Date() };
    }
    existingTask.progress.lastUpdate = new Date();

    this.persistTask(existingTask);
    return existingTask;
  }

  /**
   * Get resume context for a session (used by resume_session tool).
   */
  getResumeContext(sessionId: string): ResumeContext | null {
    const task = this.findBySession(sessionId);
    if (!task) return null;

    return {
      sessionId: task.sessionId,
      previousPrompt: task.prompt,
      toolCallCount: task.progress?.toolCalls ?? 0,
      lastToolUsed: task.progress?.lastTool,
      lastOutputSummary: task.progress?.lastMessage?.slice(0, 500),
      startedAt: task.startedAt,
      lastActivityAt: task.progress?.lastUpdate ?? task.startedAt,
    };
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  getTask(id: string): BackgroundTask | undefined {
    return this.tasks.get(id);
  }

  findBySession(sessionId: string): BackgroundTask | undefined {
    for (const task of this.tasks.values()) {
      if (task.sessionId === sessionId) return task;
    }
    return undefined;
  }

  getTasksByParentSession(sessionId: string): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.parentSessionId === sessionId);
  }

  getAllTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values());
  }

  getRunningTasks(): BackgroundTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === 'running');
  }

  // -------------------------------------------------------------------------
  // Mutations
  // -------------------------------------------------------------------------

  /**
   * Update task status, optionally recording a result or error message.
   */
  updateTaskStatus(taskId: string, status: BackgroundTaskStatus, result?: string, error?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = status;
    if (result) task.result = result;
    if (error) task.error = error;

    if (status === 'completed' || status === 'error' || status === 'cancelled') {
      task.completedAt = new Date();

      if (task.concurrencyKey) {
        this.concurrencyManager.release(task.concurrencyKey);
      }
    }

    this.persistTask(task);
  }

  /**
   * Update task progress fields.
   */
  updateTaskProgress(taskId: string, progress: Partial<TaskProgress>): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    if (!task.progress) {
      task.progress = { toolCalls: 0, lastUpdate: new Date() };
    }

    Object.assign(task.progress, progress, { lastUpdate: new Date() });
    this.persistTask(task);
  }

  /**
   * Remove a task completely (memory + disk).
   */
  removeTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (task?.concurrencyKey) {
      this.concurrencyManager.release(task.concurrencyKey);
    }

    this.unpersistTask(taskId);
    this.tasks.delete(taskId);
  }

  // -------------------------------------------------------------------------
  // Display helpers
  // -------------------------------------------------------------------------

  formatDuration(start: Date, end?: Date): string {
    const duration = (end ?? new Date()).getTime() - start.getTime();
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  getStatusSummary(): string {
    const running = this.getRunningTasks();
    const queued = Array.from(this.tasks.values()).filter((t) => t.status === 'queued');
    const all = this.getAllTasks();

    if (all.length === 0) return 'No background tasks.';

    const lines: string[] = [
      `Background Tasks: ${running.length} running, ${queued.length} queued, ${all.length} total`,
      '',
    ];

    for (const task of all) {
      const duration = this.formatDuration(task.startedAt, task.completedAt);
      const status = task.status.toUpperCase();
      const progress = task.progress ? ` (${task.progress.toolCalls} tools)` : '';
      lines.push(`  [${status}] ${task.description} - ${duration}${progress}`);
      if (task.error) lines.push(`    Error: ${task.error}`);
    }

    return lines.join('\n');
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  cleanup(): void {
    this.stopPruning();
    this.tasks.clear();
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let instance: BackgroundManager | undefined;

/**
 * Get (or create) the singleton BackgroundManager.
 *
 * @param directory - Project root directory; required on first call.
 * @param config    - Optional configuration; applied only on first call.
 */
export function getBackgroundManager(directory: string, config?: BackgroundTaskConfig): BackgroundManager {
  if (!instance) {
    instance = new BackgroundManager(directory, config);
  }
  return instance;
}

/**
 * Reset the singleton (for testing).
 */
export function resetBackgroundManager(): void {
  if (instance) {
    instance.cleanup();
    instance = undefined;
  }
}

// ---------------------------------------------------------------------------
// shouldRunInBackground heuristic
// ---------------------------------------------------------------------------

/**
 * Determine if a command should run in background.
 *
 * Core heuristic function that decides whether a command should be executed
 * with `run_in_background: true`.
 *
 * @param command               - The command string to analyze.
 * @param currentBackgroundCount - Number of currently running background tasks.
 * @param maxBackgroundTasks    - Maximum allowed concurrent background tasks.
 */
export function shouldRunInBackground(
  command: string,
  currentBackgroundCount: number = 0,
  maxBackgroundTasks: number = DEFAULT_MAX_BACKGROUND_TASKS,
): TaskExecutionDecision {
  // Check if at capacity
  if (currentBackgroundCount >= maxBackgroundTasks) {
    return {
      runInBackground: false,
      reason: `At background task limit (${currentBackgroundCount}/${maxBackgroundTasks}). Wait for existing tasks or run blocking.`,
      estimatedDuration: 'unknown',
      confidence: 'high',
    };
  }

  // Check for explicit blocking patterns first
  for (const pattern of BLOCKING_PATTERNS) {
    if (pattern.test(command)) {
      return {
        runInBackground: false,
        reason: 'Quick operation that should complete immediately.',
        estimatedDuration: 'quick',
        confidence: 'high',
      };
    }
  }

  // Check for long-running patterns
  for (const pattern of LONG_RUNNING_PATTERNS) {
    if (pattern.test(command)) {
      return {
        runInBackground: true,
        reason: 'Long-running operation detected. Run in background to continue other work.',
        estimatedDuration: 'long',
        confidence: 'high',
      };
    }
  }

  // Heuristic: complex command chains may take time
  const pipeCount = (command.match(/\|/g) || []).length;
  const andCount = (command.match(/&&/g) || []).length;
  if (pipeCount > 2 || andCount > 2) {
    return {
      runInBackground: true,
      reason: 'Complex command chain that may take time.',
      estimatedDuration: 'medium',
      confidence: 'medium',
    };
  }

  // Default: run blocking for unknown commands
  return {
    runInBackground: false,
    reason: 'Unknown command type. Running blocking for immediate feedback.',
    estimatedDuration: 'unknown',
    confidence: 'low',
  };
}

// ---------------------------------------------------------------------------
// System prompt guidance
// ---------------------------------------------------------------------------

/**
 * System prompt text for background task execution guidance.
 *
 * Append this text to the system prompt to guide agents on when and how to
 * use background execution.
 */
export function getBackgroundTaskGuidance(maxBackgroundTasks: number = DEFAULT_MAX_BACKGROUND_TASKS): string {
  return `
## Background Task Execution

For long-running operations, use the \`run_in_background\` parameter to avoid blocking.

### When to Use Background Execution

**Run in Background** (set \`run_in_background: true\`):
- Package installation (\`npm install\`, \`pip install\`, \`cargo build\`, etc.)
- Build processes (project build command, \`make\`, etc.)
- Test suites (project test command, etc.)
- Docker operations: \`docker build\`, \`docker pull\`
- Git operations on large repos: \`git clone\`, \`git fetch\`
- Database migrations: \`prisma migrate\`, \`typeorm migration:run\`

**Run Blocking** (foreground, immediate):
- Quick status checks: \`git status\`, \`ls\`, \`pwd\`
- File operations: \`cat\`, \`head\`, \`tail\`
- Simple commands: \`echo\`, \`which\`, \`env\`
- Operations needing immediate feedback

### How to Use Background Execution

1. **Start in background:**
   \`\`\`
   Bash(command: "project build command", run_in_background: true)
   \`\`\`

2. **Continue with other work** while the task runs

3. **Check results later:**
   \`\`\`
   TaskOutput(task_id: "<task_id_from_step_1>", block: false)
   \`\`\`

### Concurrency Limits

- Maximum **${maxBackgroundTasks}** concurrent background tasks
- If at limit, wait for existing tasks to complete or run the new task blocking
- Use \`TaskOutput\` to check if background tasks have finished

### Decision Checklist

Before running a command, ask:
1. Will this take more than 5 seconds? → Consider background
2. Do I need the result immediately? → Run blocking
3. Can I do other useful work while waiting? → Use background
4. Am I at the background task limit? → Run blocking or wait
`;
}
