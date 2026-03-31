# GEMINI.md

Operational guidance for Gemini-based assistance in this repository.

## Project Facts

- Language: TypeScript (roblox-ts)
- Runtime target: Roblox
- Build command: `npm run build`

## Working Rules

- Follow existing code patterns before introducing new abstractions.
- Keep changes localized to requested behavior.
- Keep shared payloads strongly typed via `src/shared` contracts.
- Do not change remote naming without migration notes.

## Quality Bar

- Ensure compile/build succeeds.
- Call out any manual validation needed in Roblox Studio.
- Describe risks when touching server economy or upgrade logic.
