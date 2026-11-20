#!/usr/bin/env bash
# Saytı sürətləndirir (bir dəfə işlədin, təkrar işlətmək təhlükəsizdir):
#  - şrift, JS, CSS, şəkil faylları nginx tərəfindən birbaşa diskdən verilir (tətbiqin içindən keçmir) və brauzerdə 1 il saxlanır;
#  - nginx → tətbiq arasında açıq bağlantı saxlanır (keepalive), HTTPS üçün HTTP/2 açılır;
#  - hesaba daxil olmamış ziyarətçilər üçün açılış səhifəsi 60 saniyə keşlənir.
# Xəta olsa köhnə ayar avtomatik bərpa olunur.   İstifadə:  bash /opt/jobmatch/app/deploy/vps/speedup.sh
set -euo pipefail
CONF=/etc/nginx/conf.d/jobmatch.conf
CLIENT=/opt/jobmatch/app/dist/client
[ -f "$CONF" ] || { echo "nginx ayarı tapılmadı: $CONF"; exit 1; }
[ -d "$CLIENT" ] || { echo "Tətbiq faylları tapılmadı: $CLIENT"; exit 1; }
# Yeni versiyanın köməkçi skriptləri (yeniləmə köhnə keşi təmizləyir)
for f in update.sh backup.sh cron.sh; do [ -f "$CLIENT/../deploy/vps/$f" ] && install -m 755 "$CLIENT/../deploy/vps/$f" "/opt/jobmatch/bin/$f"; done
BACKUP="$CONF.bak.$(date +%s)"
cp -a "$CONF" "$BACKUP"
mkdir -p /etc/nginx/snippets /var/cache/nginx/jobmatch

cat > /etc/nginx/conf.d/jobmatch-cache.conf <<'EOF'
upstream jobmatch_app { server 127.0.0.1:8787; keepalive 16; }
proxy_cache_path /var/cache/nginx/jobmatch levels=1:2 keys_zone=jobmatch:10m max_size=100m inactive=10m use_temp_path=off;
# Yalnız açılış səhifəsi ("/" və "/?...") və yalnız hesaba daxil olmamış ziyarətçi üçün keşlənir.
map "$request_uri:$http_cookie" $jm_skip_cache {
    default 1;
    "~^/(\?[^:]*)?:(?!.*__Host-joblink_session=)" 0;
}
EOF

cat > /etc/nginx/snippets/jobmatch-static.conf <<EOF
# Statik fayllar birbaşa diskdən (məzmunu adında hash var, dəyişəndə adı da dəyişir)
location /_next/static/ {
    alias $CLIENT/_next/static/;
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    access_log off;
    try_files \$uri =404;
}
location ~ ^/(hero-figure\.webp|icon-192\.png|icon-512\.png|joblink\.svg|favicon\.svg|manifest\.webmanifest|offline\.html)\$ {
    root $CLIENT;
    expires 7d;
    add_header Cache-Control "public, max-age=604800" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    try_files \$uri =404;
}
EOF

python3 - "$CONF" <<'PY'
import re, sys
p = sys.argv[1]
s = open(p).read()
inc = "include /etc/nginx/snippets/jobmatch-static.conf;"
if inc not in s:
    s = re.sub(r"(\n[ \t]*server_name [^;]*;)", lambda m: m.group(1) + "\n    " + inc, s)
s = s.replace("proxy_pass http://127.0.0.1:8787;", "proxy_pass http://jobmatch_app;")
if 'proxy_set_header Connection "";' not in s:
    s = s.replace("proxy_http_version 1.1;", 'proxy_http_version 1.1;\n        proxy_set_header Connection "";')
cache = """
        proxy_cache jobmatch;
        proxy_cache_key $scheme$host$request_uri;
        proxy_cache_valid 200 60s;
        proxy_ignore_headers Cache-Control Expires;
        proxy_cache_bypass $jm_skip_cache;
        proxy_no_cache $jm_skip_cache;
        add_header X-Cache $upstream_cache_status always;"""
if "proxy_cache jobmatch;" not in s:
    s = s.replace("proxy_pass http://jobmatch_app;", "proxy_pass http://jobmatch_app;" + cache, 1)
s = re.sub(r"listen 443 ssl;", "listen 443 ssl http2;", s)
s = re.sub(r"listen \[::\]:443 ssl ipv6only=on;", "listen [::]:443 ssl http2 ipv6only=on;", s)
open(p, "w").write(s)
PY

if nginx -t; then
  systemctl reload nginx
  echo "Hazırdır. Yoxlama:  curl -sI https://\$(hostname -f 2>/dev/null || echo jobmatch.az)/ | head -5   (ikinci sorğuda X-Cache: HIT görünməlidir)"
else
  echo "nginx ayarı səhv oldu, köhnə ayar bərpa olunur..."
  cp -a "$BACKUP" "$CONF"
  rm -f /etc/nginx/conf.d/jobmatch-cache.conf
  nginx -t && systemctl reload nginx
  exit 1
fi
