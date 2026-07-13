#!/bin/sh
# Applies pending database migrations, then launches the API. Migrations are
# idempotent (`migrate deploy` only applies what's missing), so this is safe to
# run on every container start.
set -e

echo "[entrypoint] Applying database migrations..."
pnpm exec prisma migrate deploy --schema=./prisma/schema.prisma

echo "[entrypoint] Starting FinanceHub API..."
exec node main.js
