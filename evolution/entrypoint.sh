#!/bin/sh
set -e

echo "==> ProtectCRM: Starting Evolution API..."

if [ -z "$DATABASE_URL" ] && [ -n "$DATABASE_CONNECTION_URI" ]; then
  export DATABASE_URL="$DATABASE_CONNECTION_URI"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "==> ERROR: Neither DATABASE_URL nor DATABASE_CONNECTION_URI is set!"
  exit 1
fi

cd /evolution

echo "==> Preparing migrations..."
rm -rf ./prisma/migrations
cp -r ./prisma/postgresql-migrations ./prisma/migrations

echo "==> Running database migrations..."
npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma || echo "==> Migrations warning (continuing anyway)"

echo "==> Starting Evolution API server..."
exec npm run start:prod
