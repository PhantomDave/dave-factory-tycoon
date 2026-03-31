# AGENTS Guide

This file defines repository-specific coding expectations for AI agents.

## Scope

- Keep changes minimal and task-focused.
- Avoid broad refactors unless explicitly requested.
- Preserve existing gameplay behavior unless the task requires behavior changes.

## Code Style

- Use TypeScript for all files under `src`.
- Follow existing naming patterns in nearby files.
- Prefer explicit types in shared contracts (`src/shared/types.ts`).
- Do not introduce new dependencies without clear need.

## Roblox-Specific Rules

- Keep server-authoritative logic in `src/server`.
- Keep UI and input handling in `src/client`.
- Put cross-boundary contracts in `src/shared`.
- Validate remote usage and keep payloads typed.

## Validation

Before proposing completion:

1. Run `npm run build`.
2. Note any manual Roblox Studio checks still required.

## Pull Request Hygiene

- Summarize behavior changes, not only file diffs.
- Mention risks and follow-up work when relevant.
- Keep branch names short and descriptive.
