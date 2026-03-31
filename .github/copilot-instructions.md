# Copilot Instructions

Apply these rules when generating code for this repository.

## Architecture

- Server gameplay logic belongs in `src/server`.
- Client UI logic belongs in `src/client`.
- Shared contracts belong in `src/shared`.

## Preferred Practices

- Keep remotes and payloads strongly typed.
- Favor small composable functions over large handlers.
- Reuse existing patterns from `src/server/miner.ts` and `src/server/upgrade.ts`.
- Keep React UI components in `src/client/ui/components` focused and readable.

## Safety

- Avoid changing economics/balance constants unless requested.
- Avoid changing remote names/events unless migration is included.
- Avoid introducing untyped `unknown`/`any` where existing types are available.

## Verification

- Run `npm run build` after changes.
- Report any required in-Studio verification steps.
