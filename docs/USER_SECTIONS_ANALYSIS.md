# İstifadəçi tipləri və bölmələri üzrə analiz: nə qalıb, nə əlavə etmək olar

Tarix: 2026-10-23. Əsas: kod (naviqasiya, API, miqrasiyalar) və bu söhbətdə real/sintetik yoxlamalar.
Qeyd: "yoxdur" yazılan imkanlar kodda axtarışla təsdiqlənib (parol sıfırlama, e-poçt təsdiqi, 2FA, müsahibə təqvimi, PWA manifest, SMS). Mobil görünüş, əlçatanlıq və yük sistemli yoxlanılmayıb.

## 1. İş axtaran

| Bölmə | Vəziyyət | Çatışmayan / əlavə olunacaq |
|---|---|---|
| Ümumi baxış | İşləyir | Profilin dolğunluq göstəricisi ("CV 70% hazırdır, nə əlavə edin"), növbəti addım kartı |
| Vakansiyalar | Filtr, saxlama, müqayisə, qayda % və AI balı (admin seçimi ilə) | Vakansiya xəbərdarlığı (saxlanmış axtarış + gündəlik cron bildirişi/e-poçt) və “oxşar vakansiyalar” hazırdır |
| Şirkətlər | İzləmə və bloklama | Şirkət səhifəsi (loqo, təsvir, açıq vakansiyalar) və moderasiyalı rəy/reytinq hazırdır |
| CV analizi | AI analiz, sübut yoxlaması, struktur CV | Brendli PDF CV, profil versiya tarixçəsi (10 versiyaya qədər, geri qaytarma) və vakansiyaya uyğunlaşdırılmış CV (vakansiyanın istədiyi bacarıqlar önə çıxarılır, heç nə əlavə olunmur) hazırdır |
| AI tövsiyələri / AI köməkçi | İşləyir (AI açarı tələb edir) | Müsahibə məşqi və öyrənmə planı AI köməkçidə hazır istiqamətlərlə (sual düymələri) işləyir (AI açarı tələb edir) |
| Mənim profilim | Təcrübə, təhsil (universitet/ixtisas siyahıları), sertifikat, sənəd təsdiqi, avtomatik müraciət | Portfolio linki və “iş təkliflərinə açığam” seçimi var; istinad şəxsləri (3-ə qədər, yalnız müraciət edilən işəgötürənə görünür) və məlumat ixracı (JSON) əlavə olundu. Maaş gözləntisində net/gross seçimi də var. Qalır: əsas/əlavə iş yeri |
| Müraciətlərim | Status, hadisə tarixçəsi, təkliflər, testlər | Müsahibə təyinatı və xatırlatma, status bildirişi, rədd səbəbinin göstərilməsi (işəgötürən seçsə) hazırdır. Qalır: müraciəti geri götürmə izahı |
| Mesajlar | Cavab, oxundu işarəsi, axtarış | Qoşma (PDF/şəkil) əlavə olundu. Qalır: mesaj şikayəti, arxiv |
| Maaş kalkulyatoru | 2026 qaydaları | Vakansiyada maaş növü (net/gross), təxmini net/gross qarşılığı və gözləntiylə müqayisə hazırdır. Uyğunluq balı maaşı hələ əvvəlki qaydayla (rəqəm olaraq) müqayisə edir |
| Paketlər | Planlar, kart, müqavilə (mock provayder) | Real ödəniş provayderi, faktura PDF, planın yenilənməsi xatırlatması |
| Dəstək | Sorğular və cavablar | Tez-tez verilən suallar və sorğuya fayl əlavəsi hazırdır |
| Hesab | Giriş, qeydiyyat, hesabın silinməsi, şifrə sıfırlama (e-poçt linki), e-poçt təsdiqi, iki mərhələli giriş (TOTP + ehtiyat kodlar), aktiv cihazlar və uzaqdan çıxış | Hesab silinəndə bütün şəxsi məlumat cədvəlləri təmizlənir. E-poçt göndərilməsi üçün `EMAIL` binding lazımdır |

Ən vacib 3: parol sıfırlama və e-poçt təsdiqi, vakansiya xəbərdarlığı, müsahibə təyinatı və xatırlatma.

## 2. İşəgötürən (şirkət və komanda)

| Bölmə | Vəziyyət | Çatışmayan / əlavə olunacaq |
|---|---|---|
| Ümumi baxış / Hesabatlar | KPI və əvvəlki dövrlə müqayisə, tarix və vakansiya filtri, mərhələlər üzrə keçid faizi (ən son mərhələyə görə), müraciət mənbəyi (namizəd özü / AI avtomatik), aylar üzrə trend və orta işə qəbul müddəti, XLSX (vakansiya, müraciət, test, təklif, işçi və s.), avtomatik həftəlik/aylıq hesabat (cron, bildiriş və e-poçt), müraciət mənbəyi (Joblink, AI, şirkət dəvəti, LinkedIn/Facebook/Instagram/Telegram/WhatsApp/e-poçt/tövsiyə izləmə linkləri), "Diqqət tələb edənlər" bloku (təsdiq, baxılmamış müraciət, yoxlanmamış test, cavabsız təklif, bitən vakansiya, şirkət yoxlaması) | Hesabatı PDF kimi saxlama/çap (brauzerin çap pəncərəsi) hazırdır; vakansiya üzrə trend vakansiya filtri ilə görünür |
| Vakansiyalarım | AI ilə yaradılma, təsdiq zənciri, yayım, **kopyalama** (yeni layihə kimi), **şablonlar** (saxla, siyahı, istifadə et, sil), "bitməyə X gün qalıb" xəbərdarlığı, izləmə linkləri, **redaktə** (yayımlanmış/dayandırılmış vakansiyanı yerində dəyişmək, fəaliyyət jurnalı), **son tarixi uzatmaq** (+7/14/30 gün, bitmiş vakansiya yenidən aktiv olur), kartda müraciət/yeni/müsahibə/işə qəbul sayları və son tarixə qalan gün, axtarış, status süzgəci və sıralama, bağlama səbəbi (dolduruldu/ləğv/digər), redaktədə vacib dəyişiklikdə (maaş, vəzifə, şəhər, rejim, qrafik, ünvan, son tarix) müraciət etmiş namizədlərə bildiriş, baxan namizəd sayı, son 7 gün və konversiya (kartda, hesabatda, XLSX-də; baxanın kimliyi saxlanmır, 180 gün), **bir kliklə təkrar yayım** (bağlanmış və ya müddəti bitmiş vakansiya eyni məzmunla yeni elan kimi, +30 gün; icazəsiz rol üçün təsdiqə gedir) | — (bölmə tamamlanıb) |
| Namizədlər | Siyahı, AI sıralama (admin seçimi), pipeline, qiymətləndirmə | Toplu əməliyyat və istedad bazası hazırdır (pipeline kartlarında seçim: status "Baxışda/Uyğun deyil", mesaj, bazaya əlavə; "İstedad bazası" bölməsi: etiket, qeyd, axtarış). Qalır: saxlanmış axtarışlar, dublikat aşkarlama |
| HR AI köməkçi | Vakansiya layihəsi, namizəd analizi | Müsahibə sualları və qiymətləndirmə cədvəli şablonu, vakansiya mətninin ədalət yoxlaması (ayrı-seçkilik dili) |
| Testlər | Snapshot, əl ilə qiymət, vaxt bitməsi, avtosave, CSV idxal, sual sırası, hər test üzrə statistika (təhvil, orta bal, keçdi/keçmədi, yoxlanılır), keçdi/keçmədi nişanı, testi kopyalama, başqa testdən sual götürmə, pipeline-dan bir neçə namizədə toplu test göndərmə, təhvil bildirişində keçid nəticəsi | Fayldan test yaratma (Word, Excel, PDF, RTF, CSV, TXT: suallar və düzgün cavablar avtomatik oxunur, test bazaya yüklənir), namizədə nəticəni göstərmə seçimi, pipeline kartında test nişanı hazırdır. Sual bankı (etiketlə, təkrarsız) və standart formatda olmayan fayllar üçün AI ilə oxuma (razılıqla, `OPENAI_API_KEY` lazımdır, gündə 20) əlavə olundu. Test nəticəsi müraciət statusuna bağlana bilir (hər test üçün ayrıca seçim, defolt söndürülü: keçəndə “Baxışda”, keçməyəndə “Uyğun deyil”; yalnız tam qiymətləndirmədən sonra, işə qəbul/təklif mərhələsinə toxunmur). Brauzer nəzarəti (tam ekran, tab/pəncərə, kopyalama, kamera/mikrofon qeydləri) əvvəldən var; real proktorinq (şəkil/ekran yazısı, üz tanıma) brauzerdə etibarlı mümkün deyil. Nəticələrin Excel-ə yüklənməsi, sual üzrə təhlil (ən çox səhv edilən suallar), başlanmayan test üçün namizədə xatırlatma da var. Bölmə tamamlanıb |
| Təsdiqlər | Tam məzmun, yenidən göndərmə, bildirişlər | Xatırlatma və əvəzedici (planlaşdırıcı tələb edir), təklif və maaş üçün təsdiq |
| İşçilər / İşçi axını | İşçi siyahısı, ayrılma, dövriyyə, tarixçə | Təklifdən işçiyə avtomatik keçid, sınaq müddəti (siyahıda göstərilir, bitməsinə 7 gün qalanda və ya bitəndə bildiriş/e-poçt, “Diqqət tələb edənlər”də), sənəd qovluğu (PDF/şəkil, 30 sənəd, yalnız HR/direktor/sahib, hər açılış jurnalda, işçi silinəndə sənədlər də silinir). Ştat planı (şöbə üzrə plan, indi işləyən, boş yer) da var. |
| Komanda və rollar | 5 rol, əlavə icazələr (`tests`, `reports`), jurnal | Rol şablonları (dəvət formasında hazır rol + icazə kombinasiyaları) hazırdır. Üzv fəaliyyət hesabatı da var (son 30 gündə hər üzvün əməliyyat sayı). Qalır: SSO (xarici provayder) |
| Şirkət məlumatları | Sənəd yoxlaması, VÖEN | Loqo, ofis ünvanı və xəritə linki, video linki, LinkedIn/Instagram/Facebook, yarandığı il (namizədlərə görünən şirkət səhifəsi) hazırdır. Qalır: yerli (lokal) şəkil qalereyası və video yükləmə |
| Hesablar və ödənişlər | Faktura, ödəniş | Yeni fakturada avtomatik bildiriş və e-poçt, ƏDV (0/18%, məbləğə daxil) hazırdır. Qalır: real ödəniş provayderi (xarici) |
| Mesajlar | Şirkət qutusu, müəllif adı, bildiriş, limit | Şirkət mesaj şablonları, mesaja qoşma (PDF/şəkil), yazışmanı komanda üzvünə təyin etmə və təyinata görə süzmə hazırdır |
| **Müsahibə** | Var: pipeline kartından təyin etmə (Bakı vaxtı, ofis/onlayn/telefon), namizədin təsdiqi və ya imtinası, vaxt dəyişmə və ləğv, "keçirildi/gəlmədi", 1–5 rəy və tövsiyə, `.ics` təqvim faylı, bildiriş və e-poçt, gündəlik xatırlatma (cron) | Namizədə 2-3 vaxt variantı təklif etmə (namizəd seçir) və müsahibə aparanlar (panel) hazırdır. Müsahibə sual şablonları da var. Bölmə tamamlanıb |
| **Təklif** | Var (status, qəbul) | Təklif şablonları (saxla/doldur), təklif sənədində gross/net qarşılığı (təxmini), qəbul edildikdə təklifdəki sınaq müddətindən işçinin sınaq sonu avtomatik hesablanır. Qalır: ASAN e-imza (xarici inteqrasiya, bizdən asılı deyil) |

Ən vacib 3: müsahibə modulu, toplu əməliyyat və istedad bazası, təklif şablonu və e-imza.

## 3. Admin

| Bölmə | Vəziyyət | Çatışmayan / əlavə olunacaq |
|---|---|---|
| Platforma icmalı | Əsas göstəricilər | AI istifadə və xərc paneli hazırdır (funksiya, provayder, istifadəçi, gün üzrə sorğu/token/təxmini xərc; qiymətlər `lib/ai-cost.ts`-də təxminidir) |
| İstifadəçilər | Siyahı, dayandırma | Hesab siqnalları (birdəfəlik e-poçt, şübhəli ad, təsdiqsiz şirkətin çox vakansiyası, qısa müddətdə çox müraciət) və şəxsi məlumat sorğularının qeydi (ixrac/silmə) hazırdır |
| Vakansiya moderasiyası | Moderasiya | Spam/saxta vakansiya siqnalları və toplu dayandırma/arxivləmə hazırdır |
| Müraciət axını / Ödənişlər | İcmal, borclar | Gecikmiş fakturalar üçün həftəlik avtomatik xatırlatma (bildiriş + e-poçt) hazırdır; maliyyə reyestri CSV-yə yüklənir |
| Kataloqlar (bacarıq, sertifikat, vəzifə, təhsil) | Admin əlavə edir, istifadəçi sorğuları | Bacarıqlar üçün CSV idxal (dublikatlar atlanır və hesabatda göstərilir) hazırdır. Qalır: digər kataloqlarda idxal, dublikatların birləşdirilməsi, tərcümə yoxlaması |
| Uyğunluq balı | Qayda/AI seçimi, limitlər | Ayarların dəyişmə tarixçəsi və AI qiymətləndirmə nümunələri (“səhvdir” işarəsi) hazırdır |
| Sorğular və mesajlar | Dəstək | Hazır cavab şablonları və SLA göstəricisi (ilk cavab müddəti, cavabsızlar) hazırdır |
| İzləmə və bloklar | Var | Mesaj və vakansiya şikayəti “Şikayət” mövzusu ilə sorğular bölməsinə düşür (filtr var) |
| Şirkət / Sənəd yoxlaması | Var | Növbədə gözləmə müddəti və hazır rədd səbəbi şablonları hazırdır |
| Sistem və audit | Audit | Audit ixracı (Excel), xəta jurnalı (server + brauzer, şəxsi məlumatsız), ehtiyat nüsxə təlimatı (D1 Time Travel) hazırdır. Avtomatik nüsxə çıxarma yoxdur |

Ən vacib 3: AI xərc paneli, şikayət növbəsi, şəxsi məlumat sorğularının idarəsi.

## 4. Hamıya aid (platforma)

1. **Hesab təhlükəsizliyi:** hazırdır (şifrə sıfırlama, e-poçt təsdiqi, 2FA, cihaz siyahısı). E-poçt göndərmək üçün `EMAIL` binding lazımdır.
2. **Bildirişlər:** hazırdır: status, təklif, test, mesaj, faktura və xəbərdarlıq bildirişləri e-poçtla da gedir (e-poçt qurulubsa); hər istifadəçi kateqoriyaları söndürə bilər. SMS yoxdur (xarici provayder).
3. **Mobil:** PWA hazırdır (ana ekrana əlavə, oflayn səhifə). Real APK hosting olmadan mümkün deyil.
4. **Dillər:** az/en/ru var. Rus dili interfeys mətnlərini əhatə edir (`lib/i18n-ru.ts`, `lib/i18n-extra.ts`); tərcüməsi olmayan mətn ingiliscəyə düşür. AI cavabları (CV analizi, söhbət) rus seçilsə də Azərbaycan dilində qalır; dinamik mətnlər (vakansiya təsviri, şirkət məlumatı) istifadəçinin yazdığı dildə göstərilir. Tərcümələr maşın-köməkli yazılıb, native yoxlama tövsiyə olunur.
5. **Əlçatanlıq:** axe-core (WCAG 2 A/AA) ilə bütün əsas səhifələr yoxlandı; rəng kontrastı və iç-içə interaktiv elementlər düzəldildi. Yük/performans testi aparılmayıb.
6. **Əməliyyat:** xəta jurnalı və audit ixracı hazırdır. Canlı sayt üçün Cloudflare secret-ləri lazımdır; monitorinq (xarici) yoxdur.
7. **Kod sağlamlığı:** paylaşılan köməkçilər `lib/api-core.ts` və `lib/api-matching.ts`-ə köçürüldü; `route()` funksiyası hələ tək fayldadır.

## 5. Təklif olunan sıra
1. Canlı sayt (hosting) və hesab təhlükəsizliyi (parol sıfırlama, e-poçt təsdiqi).
2. Müsahibə modulu (hər iki tərəf üçün) və status e-poçtları.
3. Maaş modulunun qoşulması (vakansiya və gözləntidə gross/net).
4. AI xərc paneli və şikayət növbəsi (admin).
5. Vakansiya xəbərdarlığı, istedad bazası, toplu əməliyyat.
6. Qalan yarımçıq funksiyalar (Word/Excel test, mesaj qoşması, təsdiq xatırlatması, ESCO, ASAN, SMS, real ödəniş).

## Əlavə (işəgötürən): saxlanmış axtarışlar və dublikat aşkarlama

- **Saxlanmış axtarışlar:** namizəd siyahısındakı filtr dəsti (minimum uyğunluq, təcrübə, bacarıqlar, sertifikat, izlədiklərim, mətn) adla saxlanır və bir kliklə tətbiq olunur (30 ədədə qədər).
- **Dublikat aşkarlama:** pipeline kartında namizədin eyni şirkətin başqa vakansiyasına müraciət etməsi və fərqli hesabların eyni e-poçt/telefonu paylaşması göstərilir (`lib/duplicates.ts`). Namizəd silinmir və ya bloklanmır, qərar HR-dadır.
