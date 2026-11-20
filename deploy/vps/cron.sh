#!/usr/bin/env bash
# Cloudflare cron əvəzi: systemd taymeri çağırır. İstifadə: cron.sh "*/30 * * * *"  və ya  cron.sh "0 5 * * *"
set -eu
. /etc/jobmatch/env
curl -fsS -m 300 -X POST -H "x-cron-secret: ${CRON_SECRET}" --get --data-urlencode "cron=${1:-0 5 * * *}" http://127.0.0.1:8787/__cron
