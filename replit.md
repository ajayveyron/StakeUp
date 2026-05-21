# Pact Raven

Make a pact, lock money behind it, show proof, and let the record decide what comes back.

## Run & Operate

- `pnpm dev:mobile` — run the Expo app from the repo root
- `pnpm typecheck` — typecheck active workspace packages
- `pnpm test:mobile` — run focused mobile logic tests
- Required services: Clerk, Convex, and Razorpay for the full paid flow

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with expo-router
- State/backend: Convex with Clerk auth
- Fonts: Inter (400, 500, 600, 700)
- Icons: @expo/vector-icons (Feather)
- Haptics: expo-haptics

## Where things live

- `artifacts/mobile/` — Expo app
  - `app/(tabs)/` — Home, Commitments, Stats screens
  - `app/commitment/new.tsx` — 4-step pact creation form
  - `app/commitment/[id].tsx` — detail view + check-in action
  - `contexts/CommitmentsContext.tsx` — Convex-backed commitment operations
  - `utils/commitment.ts` — calculation helpers (refund, schedule, etc.)
  - `components/CheckInModal.tsx` — bottom sheet for submitting proof/steps
  - `components/CommitmentCard.tsx` — card used in list views
  - `components/MonthCalendar.tsx` — calendar with scheduled vs missed days
  - `constants/colors.ts` — dark financial theme (green/amber/red)

## Architecture decisions

- **Web/PWA-first Expo app**: the active flow uses Clerk auth and Convex data.
- **Schedule-based pacts**: users pick days of week + daily target + duration. Refund credit is pactAmount ÷ total committed days.
- **Manual proof review**: submitted proof counts as submitted while under review. Approved days add refunds to the user's in-app wallet; rejected days are forfeited with a reason.
- **Forfeit destinations**: users choose one charity before the pact starts. Forfeited deposit amounts are not Pact Raven revenue.
- **11:59 PM local deadline**: shown via a live countdown on all pending check-ins.
- **Two goal types only (v1)**: Content posting with public link proof and workout proof with fresh image upload/prompt matching.

## Product

Users create a pact and lock a refundable deposit against the pact rules. Each scheduled day, they submit proof for review. Approved proof creates proportional refund credit. Missed or rejected days forfeit the matching deposit credit to the selected charity.

## User preferences

- Language: "Refund" not "Earning" — money comes back to you, not earned
- Only Content Creation and Workout Proof for v1
- Content check-ins require a public share link
- Workout check-ins require fresh prompt-matching proof
- 11:59 PM local deadline per committed day
- Dark financial theme (Coinbase/Robinhood-inspired)

## Gotchas

- Health app integration is intentionally out of v1
- The restart_workflow tool times out for Expo (Metro takes ~90s to start) but the app IS running — check the preview pane
