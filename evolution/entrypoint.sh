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

echo "==> Starting server (tables already created via Supabase SQL Editor)..."
exec npm run start:prod
