# JobMatch — VPS quraşdırması (AlmaLinux 9)

Sayt Cloudflare Workers üçün yazılıb. VPS-də həmin kod `workerd` mühərriki ilə işləyir, məlumat bazası isə serverdəki SQLite fayllarındadır (`/opt/jobmatch/data`). Nginx + pulsuz SSL (Let's Encrypt), systemd servisləri, cron əvəzi taymerlər və gündəlik ehtiyat nüsxə quraşdırılır.

## Quraşdırma (bir dəfə)
1. **DNS:** domen idarəetməsində `A` qeydi: `jobmatch.az` → `203.161.44.162` (istəsəniz `www` üçün də).
2. **Release faylını serverə göndərin** (öz kompüterinizin terminalından):
   `scp jobmatch-release.tar.gz root@203.161.44.162:/root/`   (parol: paneldə «Root/Admin Password»)
3. **Serverə daxil olun:** `ssh root@203.161.44.162` (və ya paneldə VNC/Console).
4. **Quraşdırın:**
   ```
   cd /root && tar -xzf jobmatch-release.tar.gz ./deploy
   bash deploy/vps/install.sh jobmatch.az info@digilabs.az /root/jobmatch-release.tar.gz
   ```
   (Domen hələ yönləndirilməyibsə: `-` yazın, sayt `http://203.161.44.162` ünvanında açılır.)
5. **Gizli ayarlar:** `nano /etc/jobmatch/env` → `RESEND_API_KEY`, `EMAIL_FROM`, `OPENAI_API_KEY` və s. doldurun, sonra `systemctl restart jobmatch`. `DATA_KEY`-i itirməyin.

## Sürətləndirmə (nginx)
`bash /opt/jobmatch/app/deploy/vps/speedup.sh` — statik fayllar diskdən birbaşa verilir (brauzerdə 1 il), HTTP/2 açılır, daxil olmamış ziyarətçilər üçün açılış səhifəsi 60 saniyə keşlənir. Xəta olsa köhnə ayar özü bərpa olunur. Yoxlama: `curl -sI https://jobmatch.az/` iki dəfə, ikincidə `X-Cache: HIT`.

## Yeniləmə
Yeni `jobmatch-release.tar.gz`-i serverə göndərin və: `bash /opt/jobmatch/bin/update.sh /root/jobmatch-release.tar.gz` (əvvəlcə ehtiyat nüsxə alır, miqrasiyaları tətbiq edir).

## Gündəlik istifadə
- Status/log: `systemctl status jobmatch` · `journalctl -u jobmatch -f`
- Taymerlər: `systemctl list-timers 'jobmatch*'`
- Ehtiyat nüsxə: `/var/backups/jobmatch` (hər gün 03:00, 14 gün saxlanır). Bərpa: servisi dayandırıb `.sqlite` fayllarını `/opt/jobmatch/data/` altına geri qoyun.

## Bilmək lazımdır
- **Baza boşdur:** Cloudflare-dakı canlı saytın verilənləri avtomatik köçürülmür.
- **Admin:** `wrangler.external.json` içindəki `ADMIN_EMAIL` ilə qeydiyyatdan keçən hesab admin olur; lazım olarsa onu dəyişib yeni release yığın.
- **1 GB RAM:** sayt ~550 MB işlədir, 2 GB swap avtomatik yaradılır. Yük artarsa RAM-ı 2 GB-a qaldırmaq tövsiyə olunur.
- Şəkil optimallaşdırma (Cloudflare Images) VPS-də yoxdur: şəkillər orijinal ölçüdə verilir.
- `/__cron` yolu yalnız `CRON_SECRET` ilə işləyir və nginx onu xaricdən bağlayır.
