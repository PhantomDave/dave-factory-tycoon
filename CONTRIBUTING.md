# Contributing

This repository follows GitHub Flow.

## Workflow
1. Sync your base branch (`master` for now).
2. Create a short-lived branch:
   - `feature/<short-description>`
   - `fix/<short-description>`
3. Commit small, focused changes.
4. Push branch and open a Pull Request.
5. Ensure CI passes before merge.
6. Merge PR and delete the branch.

## Local checks
Run before opening a PR:

```bash
npm ci
npm run build
```

## Commit guidance
Use clear messages describing intent and scope, for example:
- `feat: add miner upgrade balance tuning`
- `fix: prevent nil access in shop UI`
