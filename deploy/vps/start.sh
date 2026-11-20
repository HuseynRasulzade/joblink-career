#!/usr/bin/env bash
# systemd bunu işə salır: gizli ayarları köçürür, bazanı miqrasiya edir, saytı başladır.
set -euo pipefail
cd /opt/jobmatch/app
export WRANGLER_SEND_METRICS=false WRANGLER_LOG_PATH=/opt/jobmatch/wrangler-logs CI=1
WR="node node_modules/wrangler/bin/wrangler.js"
# Gizli ayarlar yalnız boş olmayan sətirlər (wrangler .dev.vars formatı)
grep -E '^[A-Z_]+=.+' /etc/jobmatch/env > dist/server/.dev.vars
$WR d1 migrations apply joblink-career-db --local --persist-to /opt/jobmatch/data -c wrangler.external.json
exec $WR dev -c dist/server/wrangler.json --local --persist-to /opt/jobmatch/data --port 8787 --ip 127.0.0.1
