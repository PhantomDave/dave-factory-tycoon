# Dave Factory Tycoon

Roblox tycoon prototype built with roblox-ts and React UI.

## Tech Stack

- TypeScript via roblox-ts
- React with @rbxts/react and @rbxts/react-roblox
- Roblox services bindings via @rbxts/services

## Project Structure

- `src/server`: gameplay logic, upgrades, and server-side data
- `src/client`: client bootstrap and UI
- `src/shared`: shared types and remotes
- `include`: runtime support libraries

## Prerequisites

- Node.js 20+
- npm 10+
- Roblox Studio

## Development

Install dependencies:

```bash
npm ci
```

Build once:

```bash
npm run build
```

Watch mode:

```bash
npm run watch
```

## GitHub Flow

1. Start from `master` (or `main` when switched).
2. Create a short branch like `feature/miner-upgrades`.
3. Keep commits focused.
4. Open a PR early.
5. Merge only after CI is green.

## Pull Requests

- Use `.github/pull_request_template.md`
- Confirm `npm run build` passes
- Include a short testing note for Roblox Studio checks

## AI Collaboration Files

This repository includes AI guidance files for common tools:

- `.github/copilot-instructions.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.cursorrules`
- `GEMINI.md`

Keep all AI instructions aligned with actual project conventions.
