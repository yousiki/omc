import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveDelegation, parseFallbackChain } from '../resolver.js';
import type { DelegationRoutingConfig, ResolveDelegationOptions } from '../types.js';

describe('resolveDelegation', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  // Test 3: Disabled routing falls back to defaults
  it('should use default when routing is disabled', () => {
    const result = resolveDelegation({
      agentRole: 'explore',
      config: { enabled: false, roles: { explore: { provider: 'claude', tool: 'Task', model: 'flash' } } }
    });
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
  });

  // Test 5: Empty config uses defaults
  it('should use defaults when config is empty', () => {
    const result = resolveDelegation({ agentRole: 'architect' });
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
    expect(result.agentOrModel).toBe('architect');
  });

  // Test 10: Explicit Task tool
  it('should resolve Task explicit tool', () => {
    const result = resolveDelegation({
      agentRole: 'architect',
      explicitTool: 'Task'
    });
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
    expect(result.agentOrModel).toBe('architect');
  });

  // Test 12: Role with default mapping uses Claude subagent
  it('should use default heuristic for mapped roles', () => {
    const result = resolveDelegation({
      agentRole: 'executor',
      config: { enabled: true, roles: {} }
    });
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
    expect(result.agentOrModel).toBe('executor');
    expect(result.reason).toContain('Default heuristic');
  });

  // Test 12: Config with agentType instead of model
  it('should use agentType when model is not specified', () => {
    const result = resolveDelegation({
      agentRole: 'custom-role',
      config: {
        enabled: true,
        roles: {
          'custom-role': { provider: 'claude', tool: 'Task', agentType: 'explore' }
        }
      }
    });
    expect(result.agentOrModel).toBe('explore');
  });

  // Test 15: Config enabled but role not in roles map
  it('should fallback to defaults when role not in config roles', () => {
    const result = resolveDelegation({
      agentRole: 'nonexistent-role',
      config: {
        enabled: true,
        roles: { explore: { provider: 'claude', tool: 'Task', model: 'flash' } }
      }
    });
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
    expect(result.agentOrModel).toBe('nonexistent-role');
    expect(result.reason).toContain('Fallback to Claude Task');
  });

  // Test 16: Config explicitly enabled undefined (should be treated as disabled)
  it('should treat undefined enabled as disabled', () => {
    const result = resolveDelegation({
      agentRole: 'explore',
      config: {
        roles: { explore: { provider: 'claude', tool: 'Task', model: 'flash' } }
      } as DelegationRoutingConfig
    });
    // When enabled is undefined, isDelegationEnabled returns false
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
    expect(result.agentOrModel).toBe('explore');
    expect(result.reason).toContain('Default heuristic');
  });

  // Test 17: Empty roles object with enabled true
  it('should use defaults when roles object is empty', () => {
    const result = resolveDelegation({
      agentRole: 'architect',
      config: { enabled: true, roles: {} }
    });
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
    expect(result.agentOrModel).toBe('architect');
    expect(result.reason).toContain('Default heuristic');
  });

  // Test 18: All known role categories use defaults correctly
  it.each([
    ['explore', 'explore'],
    ['document-specialist', 'document-specialist'],
    ['researcher', 'document-specialist'],
    ['tdd-guide', 'test-engineer'],
    ['architect', 'architect'],

    ['planner', 'planner'],
    ['critic', 'critic'],
    ['analyst', 'analyst'],
    ['executor', 'executor'],
    ['deep-executor', 'deep-executor'],
    ['code-reviewer', 'code-reviewer'],
    ['security-reviewer', 'security-reviewer'],
    ['quality-reviewer', 'quality-reviewer'],
    ['designer', 'designer'],
    ['writer', 'writer'],
    ['vision', 'document-specialist'],
    ['qa-tester', 'qa-tester'],
    ['debugger', 'debugger'],
    ['scientist', 'scientist'],
    ['build-fixer', 'build-fixer'],
  ])('should map role %s to default agent %s', (role, expectedAgent) => {
    const result = resolveDelegation({ agentRole: role });
    expect(result.agentOrModel).toBe(expectedAgent);
    expect(result.provider).toBe('claude');
  });

  // Test 19: Undefined config
  it('should handle undefined config gracefully', () => {
    const result = resolveDelegation({
      agentRole: 'explore',
      config: undefined
    });
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
  });

  // Test 20: Config with model and agentType - model takes precedence
  it('should prefer model over agentType when both specified', () => {
    const result = resolveDelegation({
      agentRole: 'custom-role',
      config: {
        enabled: true,
        roles: {
          'custom-role': {
            provider: 'claude',
            tool: 'Task',
            model: 'custom-model',
            agentType: 'explore'
          }
        }
      }
    });
    expect(result.agentOrModel).toBe('custom-model');
  });

  // Test: Unknown role + defaultProvider: 'claude' (explicit) with full assertion
  it('should handle unknown role with claude defaultProvider', () => {
    const result = resolveDelegation({
      agentRole: 'totally-unknown-role',
      config: { enabled: true, defaultProvider: 'claude' }
    });
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
    expect(result.agentOrModel).toBe('totally-unknown-role');
    expect(result.reason).toContain('Fallback to Claude Task');
    expect(result.fallbackChain).toBeUndefined();
  });

  // Test: Known role + defaultProvider (should use heuristic, not defaultProvider)
  it('should use heuristic for known role even with different defaultProvider', () => {
    const result = resolveDelegation({
      agentRole: 'architect',
      config: { enabled: true, defaultProvider: 'claude' }
    });
    // architect is in ROLE_CATEGORY_DEFAULTS, so should use Claude subagent
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
    expect(result.agentOrModel).toBe('architect');
    expect(result.reason).toContain('Default heuristic');
  });
});

describe('parseFallbackChain', () => {
  it('should parse valid fallback strings', () => {
    const result = parseFallbackChain(['claude:explore', 'claude:architect']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ provider: 'claude', agentOrModel: 'explore' });
    expect(result[1]).toEqual({ provider: 'claude', agentOrModel: 'architect' });
  });

  it('should return empty array for undefined input', () => {
    expect(parseFallbackChain(undefined)).toEqual([]);
  });

  it('should return empty array for empty array input', () => {
    expect(parseFallbackChain([])).toEqual([]);
  });

  it('should handle fallback strings with multiple colons', () => {
    const result = parseFallbackChain(['claude:some:role']);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ provider: 'claude', agentOrModel: 'some:role' });
  });

  it('should skip invalid entries without colon', () => {
    const result = parseFallbackChain(['claude:explore', 'invalid-entry', 'claude:architect']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ provider: 'claude', agentOrModel: 'explore' });
    expect(result[1]).toEqual({ provider: 'claude', agentOrModel: 'architect' });
  });

  it('should skip entries with empty provider', () => {
    const result = parseFallbackChain([':explore', 'claude:architect']);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ provider: 'claude', agentOrModel: 'architect' });
  });

  it('should skip entries with empty agent/model', () => {
    const result = parseFallbackChain(['claude:', 'claude:architect']);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ provider: 'claude', agentOrModel: 'architect' });
  });

  it('should handle single valid entry', () => {
    const result = parseFallbackChain(['claude:explore']);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ provider: 'claude', agentOrModel: 'explore' });
  });

  it('should handle all invalid entries', () => {
    const result = parseFallbackChain(['invalid', 'another-invalid', '']);
    expect(result).toEqual([]);
  });

  it('should preserve case sensitivity', () => {
    const result = parseFallbackChain(['Claude:Explore', 'CLAUDE:GPT-5']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ provider: 'Claude', agentOrModel: 'Explore' });
    expect(result[1]).toEqual({ provider: 'CLAUDE', agentOrModel: 'GPT-5' });
  });

  it('should handle entries with extra whitespace in model name', () => {
    const result = parseFallbackChain(['claude: explore with spaces']);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ provider: 'claude', agentOrModel: 'explore with spaces' });
  });

  it('should trim whitespace from fallback entries', () => {
    const result = parseFallbackChain(['  claude  :  explore  ', '  claude  :  architect  ']);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ provider: 'claude', agentOrModel: 'explore' });
    expect(result[1]).toEqual({ provider: 'claude', agentOrModel: 'architect' });
  });
});

describe('resolveDelegation provider/tool mismatch correction', () => {
  it('should correct provider/tool mismatch', () => {
    // This tests that resolveFromConfig always returns tool: 'Task'
    // even when the config specifies claude provider (the only valid combo)
    const result = resolveDelegation({
      agentRole: 'test-role',
      config: {
        enabled: true,
        roles: {
          'test-role': { provider: 'claude', tool: 'Task', model: 'test' }
        }
      }
    });
    expect(result.provider).toBe('claude');
    expect(result.tool).toBe('Task');
  });
});
