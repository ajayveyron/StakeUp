#!/bin/bash
set -e
corepack pnpm install --frozen-lockfile

if [ -n "${DATABASE_URL:-}" ]; then
  corepack pnpm --filter @workspace/db push
else
  echo "DATABASE_URL is not set; skipping database schema push."
fi
