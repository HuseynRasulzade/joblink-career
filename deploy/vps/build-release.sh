#!/usr/bin/env bash
# Release faylını hazırlayır (öz kompüterinizdə/CI-də, serverdə yox):  bash deploy/vps/build-release.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
npm run build:cloudflare
rm -f dist/server/.dev.vars
STAGE=$(mktemp -d)
cp -r dist drizzle wrangler.external.json "$STAGE"/
mkdir -p "$STAGE/deploy" && cp -r deploy/vps "$STAGE/deploy/"
WR=$(node -p "require('./node_modules/wrangler/package.json').version")
cat > "$STAGE/package.json" <<JSON
{ "name": "jobmatch-runtime", "private": true, "dependencies": { "wrangler": "$WR" } }
JSON
tar -czf jobmatch-release.tar.gz -C "$STAGE" .
rm -rf "$STAGE"
ls -lh jobmatch-release.tar.gz
