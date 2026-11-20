#!/usr/bin/env bash
# Yeni versiyanı yükləmək: yeni release faylını serverə qoyun və işlədin:  bash /opt/jobmatch/bin/update.sh /root/jobmatch-release.tar.gz
set -euo pipefail
RELEASE="${1:?release.tar.gz yolu lazımdır}"
APP=/opt/jobmatch/app
/opt/jobmatch/bin/backup.sh || true
systemctl stop jobmatch
rm -rf "$APP"/dist "$APP"/drizzle
tar -xzf "$RELEASE" -C "$APP"
(cd "$APP" && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -1)
chown -R jobmatch:jobmatch /opt/jobmatch
systemctl start jobmatch
sleep 15
curl -fsS -o /dev/null -w "Sayt cavabı: %{http_code}\n" http://127.0.0.1:8787/
