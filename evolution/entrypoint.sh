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

# Prepare migrations
echo "==> Preparing postgresql migrations..."
rm -rf ./prisma/migrations
cp -r ./prisma/postgresql-migrations ./prisma/migrations

echo "==> Cleaning up fake baselines to allow real table creation..."
cat << 'EOF' > /evolution/cleanup-migrations.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    // Remove failed migrations
    await prisma.$executeRawUnsafe(`DELETE FROM _prisma_migrations WHERE finished_at IS NULL;`);
    
    // Remove the fake baselines I created earlier so Evolution can ACTUALLY create its tables
    await prisma.$executeRawUnsafe(`DELETE FROM _prisma_migrations WHERE checksum = 'baseline';`);
    
    console.log("==> Cleaned up migration history successfully.");
  } catch (e) {
    console.log("==> Cleanup ignored (table might not exist yet):", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
run();
EOF

node /evolution/cleanup-migrations.js

echo "==> Running prisma migrate deploy to create tables..."
npx prisma migrate deploy --schema ./prisma/postgresql-schema.prisma || true

echo "==> Starting Evolution API server..."
exec npm run start:prod
