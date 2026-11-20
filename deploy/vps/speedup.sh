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
for f in update.sh backup.sh cron.sh; do [ -f "/opt/jobmatch/app/deploy/vps/$f" ] && install -m 755 "/opt/jobmatch/app/deploy/vps/$f" "/opt/jobmatch/bin/$f"; done
# nginx-in fayllara çatması üçün: qovluqlar oxunaqlı olmalıdır (arxivdən gələn 700 icazə nginx-i bloklayırdı)
chmod 755 /opt/jobmatch /opt/jobmatch/app
chmod -R a+rX "$CLIENT"
NGUSER=$(awk '/^user[ \t]/ {gsub(";", "", $2); print $2; exit}' /etc/nginx/nginx.conf)
NGUSER=${NGUSER:-nginx}
mkdir -p /var/cache/nginx/jobmatch
chown "$NGUSER":"$NGUSER" /var/cache/nginx/jobmatch
if command -v semanage >/dev/null 2>&1 && [ "$(getenforce 2>/dev/null)" = "Enforcing" ]; then
  semanage fcontext -a -t httpd_sys_content_t "$CLIENT(/.*)?" 2>/dev/null || true
  restorecon -R "$CLIENT" 2>/dev/null || true
fi
BACKUP="$CONF.bak.$(date +%s)"
cp -a "$CONF" "$BACKUP"
mkdir -p /etc/nginx/snippets

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
  # Öz-yoxlama: statik fayl həqiqətən 200 verirmi? Vermirsə statik hissə avtomatik söndürülür (sayt sınmasın).
  DOMAIN=$(awk '/server_name/ {gsub(";", "", $2); print $2; exit}' "$CONF")
  ASSET=$(cd "$CLIENT" && ls _next/static/css/*.css 2>/dev/null | head -1)
  CODE=$(curl -sk -o /dev/null -w '%{http_code}' --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/$ASSET" 2>/dev/null || echo 000)
  if [ "$CODE" != "200" ]; then
    echo "Statik fayl yoxlaması alınmadı (cavab: $CODE). Statik hissə söndürülür, sayt əvvəlki kimi işləyir."
    sed -i '/jobmatch-static.conf/d' "$CONF"
    nginx -t && systemctl reload nginx
    echo "Səbəb üçün baxın:  tail -5 /var/log/nginx/error.log   və   getenforce"
    exit 1
  fi
  curl -sk -o /dev/null --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" || true
  CACHE=$(curl -sk -D - -o /dev/null --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/" | awk -F': ' 'tolower($1)=="x-cache" {print $2}' | tr -d '\r')
  echo "Hazırdır. Statik fayllar: 200 (nginx-dən). Açılış səhifəsi keşi: ${CACHE:-?}   (HIT olmalıdır)"
else
  echo "nginx ayarı səhv oldu, köhnə ayar bərpa olunur..."
  cp -a "$BACKUP" "$CONF"
  rm -f /etc/nginx/conf.d/jobmatch-cache.conf
  nginx -t && systemctl reload nginx
  exit 1
fi
