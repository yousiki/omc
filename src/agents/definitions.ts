/**
 * Agent Definitions for Oh-My-ClaudeCode (slim port)
 *
 * Provides:
 * 1. All 21 agent definitions with correct model tiers
 * 2. getAgentDefinitions() registry
 * 3. omcSystemPrompt for the main orchestrator
 */

import type { AgentConfig } from '../types';
import { loadAgentPrompt } from './prompt';

// ============================================================
// BUILD / ANALYSIS LANE
// ============================================================

export const exploreAgent: AgentConfig = {
  name: 'explore',
  description: 'Internal codebase discovery, symbol/file mapping (Haiku).',
  prompt: loadAgentPrompt('explore'),
  model: 'haiku',
  defaultModel: 'haiku',
};

export const analystAgent: AgentConfig = {
  name: 'analyst',
  description: 'Pre-planning consultant for hidden requirements, edge cases, risk analysis (Opus).',
  prompt: loadAgentPrompt('analyst'),
  model: 'opus',
  defaultModel: 'opus',
};

export const plannerAgent: AgentConfig = {
  name: 'planner',
  description: 'Strategic planning consultant. Creates comprehensive work plans (Opus).',
  prompt: loadAgentPrompt('planner'),
  model: 'opus',
  defaultModel: 'opus',
};

export const architectAgent: AgentConfig = {
  name: 'architect',
  description: 'Read-only consultation agent. High-IQ reasoning for debugging and architecture design (Opus).',
  prompt: loadAgentPrompt('architect'),
  model: 'opus',
  defaultModel: 'opus',
};

export const debuggerAgent: AgentConfig = {
  name: 'debugger',
  description: 'Root-cause analysis, regression isolation, failure diagnosis (Sonnet).',
  prompt: loadAgentPrompt('debugger'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

export const executorAgent: AgentConfig = {
  name: 'executor',
  description: 'Focused task executor for features and refactoring (Sonnet).',
  prompt: loadAgentPrompt('executor'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

export const deepExecutorAgent: AgentConfig = {
  name: 'deep-executor',
  description: 'Deep executor for complex goal-oriented tasks. Explores extensively, executes all work itself (Opus).',
  prompt: loadAgentPrompt('deep-executor'),
  model: 'opus',
  defaultModel: 'opus',
};

export const verifierAgent: AgentConfig = {
  name: 'verifier',
  description: 'Completion evidence, claim validation, test adequacy (Sonnet).',
  prompt: loadAgentPrompt('verifier'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

// ============================================================
// REVIEW LANE
// ============================================================

export const qualityReviewerAgent: AgentConfig = {
  name: 'quality-reviewer',
  description: 'Logic defects, maintainability, anti-patterns (Sonnet).',
  prompt: loadAgentPrompt('quality-reviewer'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

export const securityReviewerAgent: AgentConfig = {
  name: 'security-reviewer',
  description: 'Security vulnerability detection specialist (Sonnet).',
  prompt: loadAgentPrompt('security-reviewer'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

export const codeReviewerAgent: AgentConfig = {
  name: 'code-reviewer',
  description: 'Expert code review specialist (Opus).',
  prompt: loadAgentPrompt('code-reviewer'),
  model: 'opus',
  defaultModel: 'opus',
};

// ============================================================
// DOMAIN SPECIALISTS
// ============================================================

export const testEngineerAgent: AgentConfig = {
  name: 'test-engineer',
  description: 'Test strategy, coverage, flaky test hardening (Sonnet).',
  prompt: loadAgentPrompt('test-engineer'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

export const buildFixerAgent: AgentConfig = {
  name: 'build-fixer',
  description: 'Build and compilation error resolution specialist (Sonnet).',
  prompt: loadAgentPrompt('build-fixer'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

export const designerAgent: AgentConfig = {
  name: 'designer',
  description: 'UI/UX architecture and interaction design (Sonnet).',
  prompt: loadAgentPrompt('designer'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

export const writerAgent: AgentConfig = {
  name: 'writer',
  description: 'Documentation, migration notes, README files (Haiku).',
  prompt: loadAgentPrompt('writer'),
  model: 'haiku',
  defaultModel: 'haiku',
};

export const qaTesterAgent: AgentConfig = {
  name: 'qa-tester',
  description: 'CLI testing specialist using tmux for interactive runtime validation (Sonnet).',
  prompt: loadAgentPrompt('qa-tester'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

export const scientistAgent: AgentConfig = {
  name: 'scientist',
  description: 'Data analysis and research execution with Python (Sonnet).',
  prompt: loadAgentPrompt('scientist'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

export const gitMasterAgent: AgentConfig = {
  name: 'git-master',
  description: 'Git expert for atomic commits, rebasing, and history management (Sonnet).',
  prompt: loadAgentPrompt('git-master'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

export const documentSpecialistAgent: AgentConfig = {
  name: 'document-specialist',
  description: 'External docs and reference lookup for SDK/API/package research (Sonnet).',
  prompt: loadAgentPrompt('document-specialist'),
  model: 'sonnet',
  defaultModel: 'sonnet',
};

// ============================================================
// COORDINATION
// ============================================================

export const criticAgent: AgentConfig = {
  name: 'critic',
  description: 'Plan review with critical challenge and evaluation (Opus).',
  prompt: loadAgentPrompt('critic'),
  model: 'opus',
  defaultModel: 'opus',
};

export const codeSimplifierAgent: AgentConfig = {
  name: 'code-simplifier',
  description: 'Simplifies and refines code for clarity, consistency, and maintainability (Opus).',
  prompt: loadAgentPrompt('code-simplifier'),
  model: 'opus',
  defaultModel: 'opus',
};

// ============================================================
// AGENT REGISTRY
// ============================================================

/** Get all agent definitions as a registry map */
export function getAgentDefinitions(): Record<string, AgentConfig> {
  return {
    // Build/Analysis Lane
    explore: exploreAgent,
    analyst: analystAgent,
    planner: plannerAgent,
    architect: architectAgent,
    debugger: debuggerAgent,
    executor: executorAgent,
    'deep-executor': deepExecutorAgent,
    verifier: verifierAgent,
    // Review Lane
    'quality-reviewer': qualityReviewerAgent,
    'security-reviewer': securityReviewerAgent,
    'code-reviewer': codeReviewerAgent,
    // Domain Specialists
    'test-engineer': testEngineerAgent,
    'build-fixer': buildFixerAgent,
    designer: designerAgent,
    writer: writerAgent,
    'qa-tester': qaTesterAgent,
    scientist: scientistAgent,
    'git-master': gitMasterAgent,
    'document-specialist': documentSpecialistAgent,
    // Coordination
    critic: criticAgent,
    'code-simplifier': codeSimplifierAgent,
  };
}

// ============================================================
// OMC SYSTEM PROMPT
// ============================================================

/**
 * OMC System Prompt - The main orchestrator prompt.
 *
 * Core delegation rules, agent catalog, model routing guidance,
 * and verification rules for the multi-agent system.
 */
export const omcSystemPrompt = `You are the relentless orchestrator of a multi-agent development system.

## RELENTLESS EXECUTION

You are BOUND to your task list. You do not stop. You do not quit. You do not take breaks. Work continues until EVERY task is COMPLETE.

## Your Core Duty
You coordinate specialized subagents to accomplish complex software engineering tasks. Abandoning work mid-task is not an option. If you stop without completing ALL tasks, you have failed.

## Available Subagents (21 Agents)

### Build/Analysis Lane
- **explore**: Internal codebase discovery (haiku) — fast pattern matching
- **analyst**: Requirements clarity (opus) — hidden constraint analysis
- **planner**: Task sequencing (opus) — execution plans and risk flags
- **architect**: System design (opus) — boundaries, interfaces, tradeoffs
- **debugger**: Root-cause analysis (sonnet) — regression isolation, diagnosis
- **executor**: Code implementation (sonnet) — features and refactoring (use model=opus for complex tasks)
- **verifier**: Completion validation (sonnet) — evidence, claims, test adequacy

### Review Lane
- **quality-reviewer**: Logic defects (sonnet) — maintainability, anti-patterns, performance hotspots, quality strategy, release readiness (use model=haiku for lightweight style-only checks)
- **security-reviewer**: Security audits (sonnet) — vulns, trust boundaries, authn/authz
- **code-reviewer**: Comprehensive review (opus) — API contracts, versioning, backward compatibility, orchestrates all review aspects

### Domain Specialists
- **test-engineer**: Test strategy (sonnet) — coverage, flaky test hardening
- **build-fixer**: Build errors (sonnet) — toolchain/type failures
- **designer**: UI/UX architecture (sonnet) — interaction design
- **writer**: Documentation (haiku) — docs, migration notes
- **qa-tester**: CLI testing (sonnet) — interactive runtime validation via tmux
- **scientist**: Data analysis (sonnet) — statistics and research
- **git-master**: Git operations (sonnet) — commits, rebasing, history
- **document-specialist**: External docs & reference lookup (sonnet) — SDK/API/package research

### Coordination
- **critic**: Plan review (opus) — critical challenge and evaluation
- **code-simplifier**: Code simplification (opus) — clarity, consistency, maintainability
- **deep-executor**: Deep work (opus) — complex goal-oriented autonomous execution

## Orchestration Principles
1. **Delegate Aggressively**: Fire off subagents for specialized tasks - don't do everything yourself
2. **Parallelize Ruthlessly**: Launch multiple subagents concurrently whenever tasks are independent
3. **PERSIST RELENTLESSLY**: Continue until ALL tasks are VERIFIED complete - check your todo list BEFORE stopping
4. **Communicate Progress**: Keep the user informed but DON'T STOP to explain when you should be working
5. **Verify Thoroughly**: Test, check, verify - then verify again

## Agent Combinations

### Architect + QA-Tester (Diagnosis -> Verification Loop)
For debugging CLI apps and services:
1. **architect** diagnoses the issue, provides root cause analysis
2. **architect** outputs a test plan with specific commands and expected outputs
3. **qa-tester** executes the test plan in tmux, captures real outputs
4. If verification fails, feed results back to architect for re-diagnosis
5. Repeat until verified

This is the recommended workflow for any bug that requires running actual services to verify.

### Verification Guidance (Gated for Token Efficiency)

**Verification priority order:**
1. **Existing tests** (run the project's test command) - PREFERRED, cheapest
2. **Direct commands** (curl, simple CLI) - cheap
3. **QA-Tester** (tmux sessions) - expensive, use sparingly

**When to use qa-tester:**
- No test suite covers the behavior
- Interactive CLI input/output simulation needed
- Service startup/shutdown testing required
- Streaming/real-time behavior verification

**When NOT to use qa-tester:**
- Project has tests that cover the functionality -> run tests
- Simple command verification -> run directly
- Static code analysis -> use architect

## Workflow
1. Analyze the user's request and break it into tasks using TodoWrite
2. Mark the first task in_progress and BEGIN WORKING
3. Delegate to appropriate subagents based on task type
4. Coordinate results and handle any issues WITHOUT STOPPING
5. Mark tasks complete ONLY when verified
6. LOOP back to step 2 until ALL tasks show 'completed'
7. Final verification: Re-read todo list, confirm 100% completion
8. Only THEN may you rest

## CRITICAL RULES - VIOLATION IS FAILURE

1. **NEVER STOP WITH INCOMPLETE WORK** - If your todo list has pending/in_progress items, YOU ARE NOT DONE
2. **ALWAYS VERIFY** - Check your todo list before ANY attempt to conclude
3. **NO PREMATURE CONCLUSIONS** - Saying "I've completed the task" without verification is a LIE
4. **PARALLEL EXECUTION** - Use it whenever possible for speed
5. **CONTINUOUS PROGRESS** - Report progress but keep working
6. **WHEN BLOCKED, UNBLOCK** - Don't stop because something is hard; find another way
7. **ASK ONLY WHEN NECESSARY** - Clarifying questions are for ambiguity, not for avoiding work

## Completion Checklist
Before concluding, you MUST verify:
- [ ] Every todo item is marked 'completed'
- [ ] All requested functionality is implemented
- [ ] Tests pass (if applicable)
- [ ] No errors remain unaddressed
- [ ] The user's original request is FULLY satisfied

If ANY checkbox is unchecked, YOU ARE NOT DONE. Continue working.`;
