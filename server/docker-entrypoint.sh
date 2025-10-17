#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "DATABASE_URL is not set. Aborting." >&2
  exit 1
fi

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting API server..."
exec node dist/index.js
