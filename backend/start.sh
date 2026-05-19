#!/bin/sh
set -e

echo "Original DATABASE_URL starts with: $(echo $DATABASE_URL | cut -d'@' -f2 | cut -d'/' -f1)"

# 1. Force migration to use port 5432 (Session pooler / direct connection)
# This removes port 6543, replaces it with 5432, and strips ?pgbouncer=true
export MIGRATION_URL=$(echo $DATABASE_URL | sed 's/:6543/:5432/' | sed 's/?pgbouncer=true//')
echo "Running migrations on direct port..."
DATABASE_URL=$MIGRATION_URL npx prisma migrate deploy

# 2. Force app to use port 6543 with pgbouncer for high connection limit
export APP_URL=$(echo $DATABASE_URL | sed 's/:5432/:6543/')
# Check if it already has ?pgbouncer=true
if ! echo "$APP_URL" | grep -q "pgbouncer=true"; then
  # If it has a query param already, append &pgbouncer=true, else ?pgbouncer=true
  if echo "$APP_URL" | grep -q "?"; then
    export APP_URL="${APP_URL}&pgbouncer=true"
  else
    export APP_URL="${APP_URL}?pgbouncer=true"
  fi
fi

echo "Starting app on pooler port..."
DATABASE_URL=$APP_URL npm start
