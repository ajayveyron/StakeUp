# Pact Raven

Pact Raven is a mobile app for goal commitments at pactraven.com. Users create a pact, submit proof on scheduled days, and receive proportional wallet refunds for manually approved check-ins.

## Quick Start

Requirements:

- Node.js 24
- pnpm via Corepack

```bash
nvm use 24
corepack enable
pnpm install
pnpm dev:mobile
```

The local dev command starts the Expo mobile app from the repo root.

## Useful Commands

```bash
pnpm dev:mobile     # start Expo locally on port 8081
pnpm typecheck      # typecheck active packages
pnpm typecheck:all  # typecheck the full workspace, including prototypes
pnpm test:mobile    # run focused mobile logic tests
```

The root `build` script exists, but do not run builds unless you specifically need one.

## Repository Map

- `artifacts/mobile` - active Expo app.
- `artifacts/api-server` - backend package scaffold; not required for local-only v1.
- `artifacts/mockup-sandbox` - Vite mockup/prototype package; excluded from the default typecheck.
- `lib` - shared workspace packages.
- `scripts` - workspace scripts and shared tooling.
- `attached_assets` - imported raw assets that should be reviewed before shipping.
- `replit.md` - original Replit-generated project notes.

## Mobile App

Key files:

- `artifacts/mobile/app/(tabs)` - Home, Commitments, and Profile tabs.
- `artifacts/mobile/app/commitment/new.tsx` - commitment creation flow.
- `artifacts/mobile/app/commitment/[id].tsx` - commitment detail and check-in flow.
- `artifacts/mobile/contexts/CommitmentsContext.tsx` - local commitment state and AsyncStorage persistence.
- `artifacts/mobile/utils/commitment.ts` - schedule, refund, date, and status helpers.
- `artifacts/mobile/constants/colors.ts` - dark financial color system.

## Product Decisions

- v1 is local-only and uses AsyncStorage.
- No backend or env vars are required for the mobile app.
- Supported goal types are Content Creation and Step Count.
- Submitted proof enters manual review and counts as submitted while review is pending.
- Content check-ins require a public HTTP URL; private posts are not valid proof.
- Step check-ins require meeting or exceeding the daily target.
- Approved refunds are credited to the user's in-app wallet.
- Rejected or missed days are forfeited to the chosen friend beneficiary or the reward pool.
- Refund language is intentional: users get their own pact amount back for approved days.
- Scheduled-day deadlines are local time.
- Product rules are captured in `docs/product-decisions.md`.

## Assets

Current checked-in app asset:

- `artifacts/mobile/assets/images/icon.png`

Current raw imported asset:

- `attached_assets/image_1778662144777.png`

Before release, decide whether the raw asset should be promoted into `artifacts/mobile/assets` or removed. Add proper Expo icon, splash, and adaptive icon assets once brand direction is settled.

## Development Notes

Use the root workspace commands when possible. They make it clear which package is being operated on and avoid accidentally running Replit-specific scripts locally.
