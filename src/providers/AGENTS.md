<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-02-27 | Updated: 2026-02-27 -->

# src/providers/

## Purpose

Git hosting provider integrations. Provides a unified interface for interacting with GitHub, GitLab, Bitbucket, Gitea, and Azure DevOps APIs — used for PR creation, issue tracking, and repository operations in git-master and other agents.

## Key Files

| File | Description |
|------|-------------|
| `index.ts` | Barrel export and provider auto-detection |
| `types.ts` | Shared provider types: `PullRequest`, `Issue`, `Repository`, etc. |
| `github.ts` | GitHub REST API integration |
| `gitlab.ts` | GitLab API integration |
| `bitbucket.ts` | Bitbucket API integration |
| `gitea.ts` | Gitea API integration |
| `azure-devops.ts` | Azure DevOps API integration |

## For AI Agents

### Working In This Directory

- All providers implement a common interface defined in `types.ts`
- Provider is auto-detected from git remote URL in `index.ts`
- Authentication uses tokens from environment variables (e.g., `GITHUB_TOKEN`)
- Keep provider implementations isolated — no cross-provider dependencies

### Testing Requirements

- Tests in `src/__tests__/providers/` mock HTTP responses
- Test authentication error handling and rate limit responses

## Dependencies

### External
- HTTP fetch (built-in) — API calls

<!-- MANUAL: -->
