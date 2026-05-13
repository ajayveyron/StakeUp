# AGENTS.md

## Working Rules

- Do not run npm builds unless explicitly asked.
- Do not use a browser unless explicitly asked.
- Use pnpm for package commands.
- Prefer `rg` for repo search.
- Do not revert user changes unless explicitly asked.

## Project Shape

- Main app: `artifacts/mobile`
- Local dev from repo root: `pnpm dev:mobile`
- Active-package typecheck from repo root: `pnpm typecheck`
- Full workspace typecheck from repo root: `pnpm typecheck:all`
- Mobile logic tests from repo root: `pnpm test:mobile`

## Notes

- The mobile app is Expo with expo-router.
- v1 stores data locally with AsyncStorage and does not require a backend.
- The `artifacts/mobile` package has a Replit-specific `dev` script; use the root `dev:mobile` command for local development.
- `artifacts/mockup-sandbox` is a prototype package and is intentionally excluded from the default typecheck.
