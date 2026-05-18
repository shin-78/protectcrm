#!/bin/sh
set -e

echo "==> ProtectCRM: Starting Evolution API with smart migration support..."

# Evolution API stores files here
APP_DIR="/evolution"
cd "$APP_DIR"

# Prepare migrations
echo "==> Preparing postgresql migrations..."
rm -rf ./prisma/migrations
cp -r ./prisma/postgresql-migrations ./prisma/migrations

echo "==> Running prisma migrate deploy..."

# Try normal deploy first
if npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma; then
  echo "==> Migrations applied successfully."
else
  echo "==> Deploy failed (P3005 - schema not empty). Attempting to baseline all migrations..."

  # List all migration folders and mark each as applied
  for MIGRATION_DIR in $(ls -d ./prisma/migrations/*/  2>/dev/null | sort); do
    MIGRATION_NAME=$(basename "$MIGRATION_DIR")
    echo "==> Baselining: $MIGRATION_NAME"
    npx prisma migrate resolve \
      --applied "$MIGRATION_NAME" \
      --schema ./prisma/postgresql-schema.prisma 2>/dev/null || true
  done

  echo "==> Retrying migrate deploy after baseline..."
  npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma || echo "==> All migrations already applied, continuing..."
fi

echo "==> Starting Evolution API..."
# Start using the original npm start command
exec npm start
