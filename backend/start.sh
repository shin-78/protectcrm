#!/bin/sh
set -e

echo "==> Cleaning ghost migration records..."

# Use node inline to delete the stuck migration record via Prisma
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.\$executeRawUnsafe(
      \"DELETE FROM _prisma_migrations WHERE migration_name IN ('20251122003044_add_chat_instance_remotejid_unique') AND finished_at IS NULL\"
    );
    console.log('Ghost migration records removed.');
  } catch(e) {
    console.log('No ghost records found or table not ready:', e.message);
  } finally {
    await prisma.\$disconnect();
  }
}
main();
"

echo "==> Running migrations..."
npx prisma migrate deploy

echo "==> Starting application..."
npm start
