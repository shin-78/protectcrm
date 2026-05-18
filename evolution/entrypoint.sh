#!/bin/sh
set -e

echo "==> ProtectCRM: Starting Evolution API with smart migration support..."

# Map DATABASE_CONNECTION_URI to DATABASE_URL if not already set
# (Render uses DATABASE_CONNECTION_URI but Prisma needs DATABASE_URL)
if [ -z "$DATABASE_URL" ] && [ -n "$DATABASE_CONNECTION_URI" ]; then
  export DATABASE_URL="$DATABASE_CONNECTION_URI"
  echo "==> Mapped DATABASE_CONNECTION_URI to DATABASE_URL"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "==> ERROR: Neither DATABASE_URL nor DATABASE_CONNECTION_URI is set!"
  exit 1
fi

echo "==> Database URL is set, proceeding..."

# Navigate to Evolution API directory
cd /evolution

# Prepare migrations
echo "==> Preparing postgresql migrations..."
rm -rf ./prisma/migrations
cp -r ./prisma/postgresql-migrations ./prisma/migrations

echo "==> Running prisma migrate deploy..."

# Try normal deploy first
if npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma 2>&1; then
  echo "==> Migrations applied successfully."
else
  echo "==> Normal deploy failed (likely P3005 - schema not empty). Baselining migrations..."

  # Mark all existing migrations as applied (baseline)
  for MIGRATION_DIR in $(ls -d ./prisma/migrations/*/  2>/dev/null | sort); do
    MIGRATION_NAME=$(basename "$MIGRATION_DIR")
    echo "==> Baselining: $MIGRATION_NAME"
    npx prisma migrate resolve \
      --applied "$MIGRATION_NAME" \
      --schema ./prisma/postgresql-schema.prisma 2>/dev/null || true
  done

  echo "==> Retrying migrate deploy after baseline..."
  npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma || true
fi

echo "==> Starting Evolution API server..."
exec npm start
