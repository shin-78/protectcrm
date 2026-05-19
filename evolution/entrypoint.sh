#!/bin/sh
set -e

echo "==> ProtectCRM: Starting Evolution API with FAST migration support..."

if [ -z "$DATABASE_URL" ] && [ -n "$DATABASE_CONNECTION_URI" ]; then
  export DATABASE_URL="$DATABASE_CONNECTION_URI"
  echo "==> Mapped DATABASE_CONNECTION_URI to DATABASE_URL"
fi

if [ -z "$DATABASE_URL" ]; then
  echo "==> ERROR: Neither DATABASE_URL nor DATABASE_CONNECTION_URI is set!"
  exit 1
fi

cd /evolution

# Prepare migrations
echo "==> Preparing postgresql migrations..."
rm -rf ./prisma/migrations
cp -r ./prisma/postgresql-migrations ./prisma/migrations

echo "==> Cleaning up any failed migrations to prevent P3009..."
cat << 'EOF' > /evolution/fast-baseline.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function run() {
  try {
    // Remove any failed migrations to resolve P3009
    await prisma.$executeRawUnsafe(`DELETE FROM _prisma_migrations WHERE finished_at IS NULL;`);
    console.log("==> Cleared failed migrations.");

    // Baseline all migrations
    const dirs = fs.readdirSync('./prisma/migrations').filter(f => !f.includes('.'));
    for (const dir of dirs) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) 
        VALUES (gen_random_uuid(), 'baseline', now(), '${dir}', '', NULL, now(), 1) 
        ON CONFLICT DO NOTHING;
      `);
    }
    console.log("==> Fast baseline completed!");
  } catch (e) {
    console.log("==> Fast baseline ignored (table might not exist yet):", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
EOF

node /evolution/fast-baseline.js

echo "==> Running prisma migrate deploy..."
npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma || true

echo "==> Starting Evolution API server..."
exec npm run start:prod
