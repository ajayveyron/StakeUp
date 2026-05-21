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

## Legal And Policy Pages

- Keep the public legal pages in `artifacts/website/src/App.tsx` updated whenever pact pricing, slot rules, deposit handling, refund/payout flow, proof review, charity forfeits, payment providers, data collection, support contacts, business entity details, GST details, or launch geography changes.
- The required public policy surfaces are Terms of Use, Privacy Policy, and Payment/Cancellation/Refund/Delivery Policy. Product-specific pact rules, charity details, and support contacts can be summarized on the landing page and inside those policy pages unless counsel asks for separate pages.
- Do not call deposits `escrow`, `trust`, or `trustee-held` unless the legal/accounting structure has been explicitly reviewed and changed.
- Before paid public launch, replace placeholder legal entity, registered address, GSTIN, phone, support, legal, and grievance contact details with reviewed production details.

## Product Copy Voice

- Do not use generic habit-app copy like "great job", "you got this", "complete your task", "submit activity", or bland motivational language.
- Pact Raven should feel like a witness to a pact: calm, serious, direct, and a little ritualistic without becoming cute.
- Prefer words like `pact`, `proof`, `record`, `witness`, `sign`, `locked`, `successful day`, `missed day`, `rejected day`, `forfeited`, `refund credit`, and `the Raven`.
- Use product framing like "The Raven records the proof", "Lock the money", "Show proof", "Sign the record", "Successful day", and "Pact not met".
- Be honest about the model: approved proof creates successful days and refund credit; missed or rejected days forfeit to the user's chosen charity; forfeits are not Pact Raven revenue.
- Keep admin/operator copy functional and precise, but keep user-facing surfaces in the Pact Raven voice.
