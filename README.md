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

Important backend env:

- `ADMIN_EMAILS` - comma-separated Clerk emails that can use in-app admin ops.
- `SLACK_ADMIN_USER_IDS` - comma-separated Slack user IDs allowed to use Slack approve/reject/activate/discard actions.
- `SLACK_SIGNING_SECRET`, `SLACK_BOT_TOKEN`, `SLACK_REVIEW_CHANNEL_ID`, `SLACK_PAYMENT_CHANNEL_ID` - Slack review/payment notifications.
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` - Razorpay order creation and payment verification.

## Repository Map

- `artifacts/mobile` - active Expo app.
- `convex` - active backend for users, commitments, check-ins, reviews, payments, ledger, notifications, and Slack/admin operations.
- `artifacts/api-server` - legacy backend scaffold; not part of the current product flow.
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
- `artifacts/mobile/contexts/CommitmentsContext.tsx` - Convex-backed commitment operations and app context.
- `artifacts/mobile/utils/commitment.ts` - schedule, refund, date, and status helpers.
- `artifacts/mobile/constants/colors.ts` - dark financial color system.

## Product Decisions

- v1 is web/PWA-first in the Expo app and uses Convex + Clerk.
- Supported pact types are content posting and workout proof.
- Submitted proof enters manual review and counts as submitted while review is pending.
- Content check-ins require a public HTTP URL; private posts are not valid proof.
- Workout check-ins require fresh proof matching the daily prompt. Direct image upload is wired through Convex storage, with proof links as a fallback.
- Approved proof creates refund credit in the user's ledger.
- Rejected or missed days forfeit that day's deposit credit to the chosen charity.
- User payouts are manual UPI payouts requested from the app and recorded by admin with the UPI reference.
- Slack review actions require a signed Slack request and a configured Slack admin user allowlist.
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
