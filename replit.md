# StakeUp

Put real money on your goals. Show up every day, submit proof, and get your money back — one day at a time.

## Run & Operate

- `pnpm --filter @workspace/mobile run dev` — run the Expo app
- `pnpm --filter @workspace/mobile run typecheck` — typecheck mobile app
- Required env: none (local AsyncStorage, no backend)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with expo-router
- State: AsyncStorage (local, no server)
- Fonts: Inter (400, 500, 600, 700)
- Icons: @expo/vector-icons (Feather)
- Haptics: expo-haptics

## Where things live

- `artifacts/mobile/` — Expo app
  - `app/(tabs)/` — Home, Commitments, Stats screens
  - `app/commitment/new.tsx` — 4-step stake creation form
  - `app/commitment/[id].tsx` — detail view + check-in action
  - `contexts/CommitmentsContext.tsx` — all state + AsyncStorage
  - `utils/commitment.ts` — calculation helpers (refund, schedule, etc.)
  - `components/CheckInModal.tsx` — bottom sheet for submitting proof/steps
  - `components/CommitmentCard.tsx` — card used in list views
  - `components/MonthCalendar.tsx` — calendar with scheduled vs missed days
  - `constants/colors.ts` — dark financial theme (green/amber/red)

## Architecture decisions

- **Local-only storage** (AsyncStorage): no backend needed for v1. All data lives on device.
- **Schedule-based commitments**: users pick days of week + daily target + duration. Refund is stakeAmount ÷ total committed days.
- **Verified check-ins only earn refunds**: content requires a public HTTP URL; steps require hitting the daily step goal. Partial/unverified entries are recorded but earn nothing.
- **11:59 PM local deadline**: shown via a live countdown on all pending check-ins.
- **Two goal types only (v1)**: Content Creation (link proof) and Step Count (manual + future health app sync).

## Product

Users create a "stake" — they lock in an amount of money against a goal (e.g. post reels every Mon/Wed/Fri for 1 month, ₹3000 staked). Each day they complete their goal, they submit proof and get a proportional refund. Days they miss, the money stays forfeited (optionally to a named friend).

## User preferences

- Language: "Refund" not "Earning" — money comes back to you, not earned
- Only Content Creation and Step Count for v1
- Content check-ins require a public share link
- Steps check-ins require hitting the daily goal (health app sync = future)
- 11:59 PM local deadline per committed day
- Dark financial theme (Coinbase/Robinhood-inspired)

## Gotchas

- Health app integration (Apple Health / Google Fit) requires a development build — currently shows manual entry + "Coming soon" note
- The restart_workflow tool times out for Expo (Metro takes ~90s to start) but the app IS running — check the preview pane
