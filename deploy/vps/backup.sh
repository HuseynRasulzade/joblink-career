#!/usr/bin/env bash
# Gündəlik ehtiyat nüsxə: bütün SQLite fayllarının təhlükəsiz surəti, son 14 gün saxlanır.
set -eu
OUT=/var/backups/jobmatch
STAMP=$(date +%Y%m%d-%H%M)
mkdir -p "$OUT/$STAMP"
find /opt/jobmatch/data -name '*.sqlite' -print0 | while IFS= read -r -d '' f; do
  sqlite3 "$f" ".backup '$OUT/$STAMP/$(basename "$f")'"
done
tar -czf "$OUT/jobmatch-$STAMP.tar.gz" -C "$OUT" "$STAMP" && rm -rf "$OUT/$STAMP"
find "$OUT" -name 'jobmatch-*.tar.gz' -mtime +14 -delete
echo "Ehtiyat nüsxə: $OUT/jobmatch-$STAMP.tar.gz"
