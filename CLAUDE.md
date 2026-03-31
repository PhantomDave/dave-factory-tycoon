# CLAUDE.md

Repository guidance for Claude-style coding agents.

## Goals

- Deliver minimal, correct, testable changes.
- Respect existing Roblox game loop and upgrade flow.

## Conventions

- Keep server state mutation in `src/server`.
- Keep UI rendering and interactions in `src/client/ui`.
- Keep shared type definitions centralized in `src/shared/types.ts`.

## Change Discipline

- Avoid renaming public shared symbols unless requested.
- Keep diffs narrow to the user request.
- Add concise comments only for non-obvious logic.

## Validation

- Run `npm run build`.
- Include manual test notes for in-game behavior where relevant.
