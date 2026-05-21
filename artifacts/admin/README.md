# Pact Raven Admin

Private beta-ops dashboard for tracking existing paid users, submissions, and refunds.

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
