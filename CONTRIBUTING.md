# Contributing

This repository follows GitHub Flow.

---

## Workflow

1. Sync your base branch (`master` for now).
2. Create a short-lived branch:
    - `feature/<short-description>`
    - `fix/<short-description>`
    - `chore/<short-description>` (docs, config, non-functional changes)
3. Commit small, focused changes with clear messages (see below).
4. Push branch and open a Pull Request.
5. Ensure CI passes before merge.
6. Merge PR and delete the branch.

---

## Local Checks

Run before opening a PR:

```bash
npm ci
npm run build
```

The build must produce zero TypeScript errors. If touching Roblox behavior, note any manual Studio verification needed.

---

## Commit Messages

Use the format `<type>: <short description>`, for example:

| Type | When to use |
|---|---|
| `feat` | New gameplay feature or system |
| `fix` | Bug fix |
| `chore` | Dependency update, config, tooling |
| `docs` | Documentation only |
| `refactor` | Non-behavioral code restructuring |

Examples:
- `feat: add gold conveyor with 2x speed`
- `fix: prevent nil access in UpgradeShop when data is loading`
- `chore: update roblox-ts to 3.x`
- `docs: document placement flow in README`

---

## TypeScript Guidelines

- Use `strict: true` — no `any` or `unknown` where typed alternatives exist.
- Use absolute imports (`shared/remotes`, `server/data`) — `tsconfig` sets `baseUrl: "src"`.
- Prefer explicit return types on exported functions.
- Keep shared type changes in `shared/types.ts` and constant changes in `shared/constants.ts`.
- Do not duplicate type definitions across `server/` and `client/`.

---

## Architecture Rules

- Server state and game logic live in `src/server/` only.
- UI and input handling live in `src/client/` only.
- `src/shared/` contains only types, constants, and remote contracts — no Roblox service calls.
- All RemoteEvents must go through `getRemotes()` from `shared/remotes.ts`.

---

## Pull Request Guidelines

- Fill in the PR template sections: Summary, Testing, Checklist.
- Summarize **behavior** changes, not just file diffs.
- Include manual Studio verification steps when the change affects gameplay.
- Keep PRs focused — one feature or fix per PR.
