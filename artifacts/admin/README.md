# Pact Raven Admin

Standalone mobile-first admin dashboard for Pact Raven operations.

The dashboard is backed by the main Convex product tables and `convex/reviews.ts`.
It covers slots, deposits, today's proof, proof review, refunds, early-end
settlements, ledger history, and founder metrics.

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

## Deploy

Use a separate Vercel project rooted at `artifacts/admin`.

Recommended project:

```sh
pact-raven-admin
```

Attach `admin.pactraven.com` to that project, not the main `pact-raven` app
project.
