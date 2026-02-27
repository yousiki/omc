/**
 * Tests for issue #729: node -e inline scripts in SKILL.md files must not
 * contain '!' characters, which MINGW64/Git Bash (Windows) escapes to '\!'
 * causing SyntaxError in the generated JavaScript.
 *
 * Note: The originally affected files (skills/omc-setup/SKILL.md and
 * skills/hud/SKILL.md) have been deleted as part of the radical slimming
 * refactor. This test suite is retained as a placeholder.
 */

import { describe, it, expect } from 'vitest';

describe('MINGW64 escape safety: no "!" in node -e inline scripts (issue #729)', () => {
  it('placeholder: hud and omc-setup skills were deleted', () => {
    // The hud and omc-setup skills have been removed from the codebase.
    // This test suite previously validated MINGW64 safety for those skills.
    expect(true).toBe(true);
  });
});
