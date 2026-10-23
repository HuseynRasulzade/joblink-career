# Canlıya çıxarma

Kod `claude/seed-demo-accounts` branch-ındadır. `.github/workflows/deploy.yml` bu branch-a hər push olanda və ya əl ilə işə salınanda testləri keçir, build edir, **verilənlər bazası miqrasiyalarını tətbiq edir** və Cloudflare-ə yükləyir.

## Bir dəfəlik hazırlıq

1. Cloudflare-də API token yaradın: Workers redaktəsi və D1 redaktəsi icazələri ilə. Account ID-ni Workers & Pages səhifəsində görəcəksiniz.
2. GitHub → repozitoriya → Settings → Secrets and variables → Actions → New repository secret:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
3. Actions → “Deploy to Cloudflare” → Run workflow (branch: `claude/seed-demo-accounts`).

Tokeni heç kimə göndərməyin, yalnız GitHub-a yapışdırın.

## Bu versiya hansı miqrasiyaları gətirir

| Miqrasiya | Nə üçün |
|---|---|
| `0021_message_replies` | Mesajlara cavab |
| `0022_workforce_flow` | İşçinin ayrılma tarixi, növü, səbəbi, hərəkət tarixçəsi |
| `0023_plans_billing` | Paketlər, kartlar, ödənişlər, müqavilələr, günlük limitlər |
| `0024_custom_education_items` | Admin tərəfindən əlavə olunan universitet və ixtisaslar |
| `0025_tests_messages_hardening` | Test surəti (snapshot) və əl ilə qiymətləndirmə, komanda üzvü əlavə icazələri, mesaj müəllifi |
| `0026_matching_settings` | Admin ayarları (`app_settings`) və vakansiya başına AI reytinqləri (`ai_job_ratings`) |
| `0027_company_tax_check` | e-taxes vergi ödəyicisi yoxlamasının nəticəsi (`company_profiles.tax_check`) |
| `0028_digests_sources` | Avtomatik hesabat abunəlikləri (`digest_subscriptions`) və müraciət mənbəyi (`applications.source`) |
| `0029_interviews` | Müsahibələr (`interviews`): vaxt, format, namizədin cavabı, rəy |
| `0030_talent_pool` | İstedad bazası (`talent_pool`): etiket, qeyd, şirkət üzrə unikal |

Hamısı əlavə xarakterlidir (yeni cədvəl və sütun), mövcud məlumatı silmir və hər biri yalnız bir dəfə tətbiq olunur. Miqrasiya tətbiq olunmasa, işçi axını, paketlər və təhsil kataloqu işləməz.

## Dəyişənlər

| Dəyişən | Vəziyyət |
|---|---|
| `OPENAI_API_KEY` | CV analizi işləyirsə artıq var |
| `BILLING_ENFORCED` | Boş saxlayın. `1` yalnız real ödəniş qoşulandan sonra (bax `PACKAGES.md`) |
| `PAYMENT_PROVIDER` | Boş (test ödənişi) |
| `PLATFORM_LEGAL_NAME`, `PLATFORM_VOEN`, `PLATFORM_ADDRESS`, `PLATFORM_EMAIL` | Müqavilədəki operator rekvizitləri; paketlərdən əvvəl daxil edin |

## Deploy-dan sonra yoxlayın

- Vakansiya siyahısında boş profil uyğunluğu 0%, maaşsız vakansiyada “Razılaşma yolu ilə”.
- Vakansiya səhifəsində “AI qiymətləndirməsi” düyməsi.
- İşəgötürən panelində “İşçi axını”, namizəd panelində “Paketlər”, admin panelində “Təhsil kataloqu”.
- Təhsil bölməsində universitet və ixtisas seçicisi.

## Demo hesablar

Cloudflare → D1 → `joblink-career-db` → Console-da `scripts/seed-demo-accounts.mjs`-in yaratdığı SQL-i işlədin (skript hər dəfə yeni parol çıxarır, SQL və parollar bir-birinə uyğun olmalıdır).

## Planlanmış hesabatlar (cron) və e-poçt
- `wrangler.external.json`-dakı `triggers.crons` hər gün 05:00 UTC (Bakı 09:00) işə düşür. Həftəlik hesabat bazar ertəsi, aylıq hesabat ayın 1-i göndərilir. Workflow-un `wrangler deploy` addımı cron-u özü qeyd edir.
- Hesabat həmişə abunəçinin bildirişlərinə düşür. **E-poçtla göndərmək** üçün Cloudflare e-poçt göndərmə bağlaması (`EMAIL`) və `EMAIL_FROM` dəyişəni qurulmalıdır; onlar olmasa yalnız bildiriş yaranır.
- Admin üçün "indi göndər": `POST /api/joblink/admin/run-digests` (`{"force":true}` bütün abunəçilərə dərhal göndərir).
