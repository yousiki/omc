---
name: release
description: Automated release workflow for omc
---

# Release Skill

Automate the release process for omc.

## Usage

```
/omc:release <version>
```

Example: `/omc:release 2.4.0` or `/omc:release patch` or `/omc:release minor`

## Release Checklist

Execute these steps in order:

### 1. Version Bump
Update version in all locations:
- `package.json`
- `src/installer/index.ts` (VERSION constant)
- `src/__tests__/installer.test.ts` (expected version)
- `.claude-plugin/plugin.json`
- `README.md` (version badge and title)

### 2. Run Tests
```bash
bun test
```
All tests must pass before proceeding.

### 3. Commit Version Bump
```bash
git add -A
git commit -m "chore: Bump version to <version>"
```

### 4. Create & Push Tag
```bash
git tag v<version>
git push origin main
git push origin v<version>
```

### 5. Create GitHub Release
```bash
gh release create v<version> --title "v<version> - <title>" --notes "<release notes>"
```

### 6. Verify
- [ ] GitHub: https://github.com/Yeachan-Heo/omc/releases

## Version Files Reference

| File | Field/Line |
|------|------------|
| `package.json` | `"version": "X.Y.Z"` |
| `src/installer/index.ts` | `export const VERSION = 'X.Y.Z'` |
| `src/__tests__/installer.test.ts` | `expect(VERSION).toBe('X.Y.Z')` |
| `.claude-plugin/plugin.json` | `"version": "X.Y.Z"` |
| `README.md` | Title + version badge |

## Semantic Versioning

- **patch** (X.Y.Z+1): Bug fixes, minor improvements
- **minor** (X.Y+1.0): New features, backward compatible
- **major** (X+1.0.0): Breaking changes

## Notes

- Always run tests before tagging
- Create release notes summarizing changes
- Plugin marketplace syncs automatically from GitHub releases
