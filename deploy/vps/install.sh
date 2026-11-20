#!/usr/bin/env bash
# JobMatch VPS quraşdırması (AlmaLinux 9 / Rocky 9 / RHEL 9). Root ilə işlədin:
#   bash install.sh <domen> <e-poçt> [release.tar.gz]
# Nümunə: bash install.sh jobmatch.az info@digilabs.az /root/jobmatch-release.tar.gz
# Domen hələ yönləndirilməyibsə "-" yazın: sayt http://IP ünvanında açılır, SSL sonra əlavə olunur.
set -euo pipefail

DOMAIN="${1:?Domen lazımdır (məs. jobmatch.az və ya -)}"
EMAIL="${2:?SSL bildirişləri üçün e-poçt lazımdır}"
RELEASE="${3:-/root/jobmatch-release.tar.gz}"
APP=/opt/jobmatch/app
DATA=/opt/jobmatch/data
ENVF=/etc/jobmatch/env
HERE="$(cd "$(dirname "$0")" && pwd)"

[ "$(id -u)" = 0 ] || { echo "Root ilə işlədin (sudo -i)."; exit 1; }
[ -f "$RELEASE" ] || { echo "Release faylı tapılmadı: $RELEASE"; exit 1; }

echo "[1/9] Swap (1 GB RAM üçün lazımdır)"
if ! swapon --show | grep -q .; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "[2/9] Paketlər"
dnf -y install epel-release >/dev/null
dnf -y install nginx certbot python3-certbot-nginx sqlite curl tar policycoreutils-python-utils >/dev/null
if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 22 ]; then
  curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - >/dev/null
  dnf -y install nodejs >/dev/null
fi
node -v

echo "[3/9] İstifadəçi və qovluqlar"
id jobmatch >/dev/null 2>&1 || useradd --system --home /opt/jobmatch --shell /sbin/nologin jobmatch
mkdir -p "$APP" "$DATA" /etc/jobmatch /var/backups/jobmatch /opt/jobmatch/bin

echo "[4/9] Proqram faylları"
systemctl stop jobmatch 2>/dev/null || true
rm -rf "$APP"/dist "$APP"/drizzle
tar -xzf "$RELEASE" -C "$APP"
cp "$HERE/update.sh" "$HERE/backup.sh" "$HERE/cron.sh" /opt/jobmatch/bin/ 2>/dev/null || cp "$APP"/deploy/vps/{update.sh,backup.sh,cron.sh} /opt/jobmatch/bin/
chmod +x /opt/jobmatch/bin/*.sh
(cd "$APP" && npm install --omit=dev --no-audit --no-fund 2>&1 | tail -2)

echo "[5/9] Gizli ayarlar ($ENVF)"
if [ ! -f "$ENVF" ]; then
  SITE="https://$DOMAIN"; [ "$DOMAIN" = "-" ] && SITE="http://$(curl -fsS https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
  cat > "$ENVF" <<EOF
# Dəyərləri doldurun, sonra: systemctl restart jobmatch
SITE_URL=$SITE
CRON_SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 40)
# E-poçt (Resend): açar olmadan e-poçt göndərilmir
EMAIL_FROM=
RESEND_API_KEY=
# Süni intellekt (ixtiyari)
OPENAI_API_KEY=
DEEPSEEK_API_KEY=
# Şəxsi məlumat şifrələməsi (bir dəfə yaradın və itirməyin!)
DATA_KEY=$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 43)
# Şirkət rekvizitləri (istifadə şərtləri/məxfilik səhifələri üçün)
PLATFORM_LEGAL_NAME=
PLATFORM_VOEN=
PLATFORM_ADDRESS=
PLATFORM_EMAIL=info@digilabs.az
# Cloudflare Turnstile (ixtiyari)
TURNSTILE_SITE_KEY=
TURNSTILE_SECRET=
EOF
  chmod 640 "$ENVF"; chown root:jobmatch "$ENVF"
fi
chown -R jobmatch:jobmatch /opt/jobmatch "$DATA" /var/backups/jobmatch

echo "[6/9] Servislər"
cp "$HERE"/systemd/* /etc/systemd/system/ 2>/dev/null || cp "$APP"/deploy/vps/systemd/* /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now jobmatch.service jobmatch-cron-30min.timer jobmatch-cron-daily.timer jobmatch-backup.timer

echo "[7/9] Nginx"
SN="$DOMAIN"; [ "$DOMAIN" = "-" ] && SN="_"
sed "s/__DOMAIN__/$SN/g" "${HERE}/nginx.conf" > /etc/nginx/conf.d/jobmatch.conf
setsebool -P httpd_can_network_connect 1 2>/dev/null || true
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo "[8/9] Firewall"
if systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-service=http --add-service=https >/dev/null
  firewall-cmd --reload >/dev/null
fi

echo "[9/9] SSL"
if [ "$DOMAIN" != "-" ]; then
  if getent hosts "$DOMAIN" | grep -q "$(curl -fsS https://ifconfig.me 2>/dev/null || echo none)"; then
    certbot --nginx -d "$DOMAIN" -m "$EMAIL" --agree-tos --no-eff-email --redirect -n || echo "SSL alınmadı: domen yönləndirməsini yoxlayıb 'certbot --nginx -d $DOMAIN' əmrini təkrarlayın."
  else
    echo "Domen $DOMAIN hələ bu serverin IP-sinə yönəlməyib. Yönləndirdikdən sonra: certbot --nginx -d $DOMAIN -m $EMAIL --agree-tos --redirect"
  fi
fi

echo
echo "Hazırdır. Yoxlama:  systemctl status jobmatch   |   curl -I http://127.0.0.1:8787/"
echo "Gizli ayarlar: $ENVF   (dəyişəndən sonra: systemctl restart jobmatch)"
