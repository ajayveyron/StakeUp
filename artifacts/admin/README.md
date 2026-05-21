# Pact Raven Admin

Legacy private beta-ops dashboard for tracking the original manually managed beta cohort.

The current product admin surface is `artifacts/mobile/app/admin/reviews.tsx` backed by the main Convex `reviews`, `payments`, and ledger functions. Use this package only when you intentionally need the old beta cohort tools.

## Environment

Create `artifacts/admin/.env.local` with:

```sh
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_CONVEX_URL=https://...
```

The signed-in Clerk email must be present in Convex `ADMIN_EMAILS`.

## Run

From the repo root:

```sh
pnpm dev:admin
```

The first signed-in admin can seed the initial 3-user beta cohort from the dashboard.
