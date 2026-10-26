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
| `0031_job_templates` | Vakansiya şablonları (`job_templates`) |
| `0032_job_views` | Vakansiya baxışları (`job_views`): vakansiya, baxanın birtərəfli hash-ı, gün; 180 gündən sonra silinir |
| `0033_assessment_show_result` | Testdə `show_result`: nəticə (bal, keçdi/keçmədi) namizədə yalnız işəgötürən icazə verdikdə və açıq suallar yoxlandıqdan sonra göstərilir |
| `0034_question_bank` | Sual bankı (`question_bank`): şirkətin təkrar istifadə etdiyi suallar, etiket, eyni mətnli sualın təkrarı bloklanır |
| `0035_test_outcome` | Testdə `on_pass`/`on_fail` (nəticəyə görə müraciət statusu, defolt söndürülü), göndərilmiş testdə `outcome_applied` (nəticə yalnız bir dəfə tətbiq olunur) |
| `0036_test_reminder` | Göndərilmiş testdə `reminded_at`: başlanmayan test üçün namizədə 2 gündən sonra bir dəfə xatırlatma (gündəlik cron, e-poçt binding varsa e-poçtla da) |
| `0037_employee_probation_documents` | İşçidə `probation_end`, `probation_reminded` (gündəlik cron xatırlatması) və `employee_documents` (sənəd qovluğu) |
| `0038_headcount_plan` | Ştat planı: şöbə üzrə planlanan say |
| `0039_interview_panel_slots` | Müsahibədə `panel` (aparanlar) və `slots` (namizədin seçəcəyi 2-3 vaxt variantı) |
| `0040_offer_templates` | Təklif şablonları (`offer_templates`): müqavilə növü, sınaq, qrafik, imkanlar, mətn; maaş və tarix şablona yazılmır |
| `0041_message_templates` | Şirkətin ortaq mesaj şablonları (`message_templates`) |
| `0042_saved_searches` | Namizəd siyahısının saxlanmış axtarışları (`saved_searches`) |
| `0043_company_logo` | Şirkət loqosu (`company_profiles.logo_type/logo_data`, 300 KB-a qədər, ictimai `companies/logo`) |
| `0044_interview_templates` | Müsahibə sual şablonları (`interview_templates`) |
| `0045_invoice_vat` | Fakturada `vat_percent` (0 və ya 18, məbləğə daxil); yeni faktura şirkətə bildiriş və e-poçt göndərir |
| `0046_message_attachments_assignee` | Mesaja qoşma (`messages.attachment_*`, PDF/şəkil 500 KB-a qədər) və yazışmanı komanda üzvünə təyin etmə (`message_threads.assignee_id`) |
| `0047_account_security` | Şifrə sıfırlama və e-poçt təsdiqi (`auth_tokens`, `password_accounts.verified`), cihaz siyahısı (`sessions.created/agent`), iki mərhələli giriş (`totp_secrets`) |
| `0048_job_alerts` | Namizədin vakansiya xəbərdarlıqları (`job_alerts`); gündəlik cron yeni uyğun vakansiyaları bildirir (`seen` siyahısı təkrarın qarşısını alır) |
| `0049_support_attachments` | Dəstək sorğusuna və cavaba fayl əlavəsi (`support_messages.attachment_*`) |
| `0050_plan_reminder` | Paket dövrü bitməzdən 3 gün əvvəl bir dəfə xatırlatma (`subscriptions.renewal_reminded`) |
| `0051_thread_archive` | Yazışmanı hər tərəf üçün ayrıca arxivləmə (`candidate_archived`, `company_archived`) |
| `0052_company_reviews` | Şirkət rəyləri (`company_reviews`): müraciət etmiş namizəd yazır, admin təsdiq edir, ad göstərilmir |
| `0053_notification_prefs` | Hər istifadəçinin söndürdüyü e-poçt bildiriş kateqoriyaları (`notification_prefs`) |
| `0054_ai_usage` | AI sorğu sayı, simvol ölçüsü və xətalar gün/funksiya/provayder/istifadəçi üzrə (`ai_usage`; mətnlər saxlanmır) |
| `0055_error_log_privacy` | Xəta jurnalı (`error_log`, şəxsi məlumatsız, 30 gün) və şəxsi məlumat sorğularının qeydi (`privacy_requests`) |
| `0056_admin_tools` | Gecikmiş faktura xatırlatması (`billing_invoices.reminded_at`), AI qiymətləndirmə “səhvdir” işarəsi (`ai_job_ratings.flagged`), ayarların tarixçəsi (`setting_history`) |
| `0057_profile_versions` | Profilin əvvəlki vəziyyətləri (`profile_versions`, ən çoxu 10, 10 dəqiqədə bir); geri qaytarmaq mümkündür |
| `0058_company_gallery` | Şirkət səhifəsinin şəkil qalereyası (`company_images`, ən çoxu 6 şəkil, hər biri 300 KB-a qədər) |
| `0059_approvals_delegation` | Təklif və maaş təsdiq sorğuları (`approval_requests`), əvəzedicilər (`approval_delegates`), şirkətin təsdiq qaydaları (`company_profiles.approval_rules`) |
| `0060_approval_info_onboarding` | Təsdiq sorğusunda cavab və eskalasiya sütunları, işçi adaptasiya siyahısı (`employee_tasks`) |

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

## Vakansiya baxışları və məxfilik
- Namizəd vakansiyanı açanda gündə bir dəfə sayılır. Bazada namizədin kimliyi yox, `vakansiya + namizəd` üçün birtərəfli hash saxlanır; şirkət yalnız say görür.
- Qeydlər 180 gündən sonra gündəlik cron ilə silinir (`purgeOldJobViews`). Admin üçün "indi göndər" əməliyyatı da təmizləməni işlədir.
- Şirkətin öz baxışı və qeydiyyatsız ziyarətçilər sayılmır.

## Hesab təhlükəsizliyi: e-poçt tələbi

Şifrə sıfırlama və e-poçt təsdiq linkləri yalnız Cloudflare `EMAIL` binding və `EMAIL_FROM` qurulubsa göndərilir (şifrə sıfırlama linki başqa yolla çatdırılmır). Qurulmayıbsa istifadəçi linki ala bilməz: “Şifrəni unutmusunuz?” formu yenə “göndərildi” cavabı verir (hesabın olub-olmadığı açılmasın deyə). Lokal yoxlama üçün `DEV_MAIL_LOG=1` linkləri jurnala yazır; canlı mühitdə bunu qoymayın. İki mərhələli giriş e-poçt tələb etmir.

## Gündəlik cron işləri (`0 5 * * *`)

Hesabat xülasələri, müsahibə xatırlatmaları, başlanmamış test xatırlatması, işçi sınaq müddəti xatırlatması, vakansiya xəbərdarlıqları, paket müddəti xatırlatması, gecikmiş faktura xatırlatması, vakansiya baxışlarının təmizlənməsi, 2 gündən çox gözləyən təsdiqlərin xatırlatması. E-poçt hissəsi `EMAIL` binding və `EMAIL_FROM` tələb edir; bildirişlər onsuz da sayt daxilində işləyir. Hər istifadəçi e-poçt kateqoriyalarını “Hesab” bölməsindən söndürə bilər.

## PWA

`public/manifest.webmanifest`, `public/sw.js`, `public/offline.html` və ikonlar ana ekrana əlavə etməyi və oflayn səhifəni təmin edir. Service worker yalnız istehsal rejimində qeydə alınır və `/api/` sorğularını heç vaxt keşləmir.
