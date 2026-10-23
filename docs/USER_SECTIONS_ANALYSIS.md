# İstifadəçi tipləri və bölmələri üzrə analiz: nə qalıb, nə əlavə etmək olar

Tarix: 2026-10-23. Əsas: kod (naviqasiya, API, miqrasiyalar) və bu söhbətdə real/sintetik yoxlamalar.
Qeyd: "yoxdur" yazılan imkanlar kodda axtarışla təsdiqlənib (parol sıfırlama, e-poçt təsdiqi, 2FA, müsahibə təqvimi, PWA manifest, SMS). Mobil görünüş, əlçatanlıq və yük sistemli yoxlanılmayıb.

## 1. İş axtaran

| Bölmə | Vəziyyət | Çatışmayan / əlavə olunacaq |
|---|---|---|
| Ümumi baxış | İşləyir | Profilin dolğunluq göstəricisi ("CV 70% hazırdır, nə əlavə edin"), növbəti addım kartı |
| Vakansiyalar | Filtr, saxlama, müqayisə, qayda % və AI balı (admin seçimi ilə) | **Vakansiya xəbərdarlığı** (yeni uyğun vakansiya olanda bildiriş/e-poçt), saxlanmış axtarış, "bu vakansiyaya oxşarlar" |
| Şirkətlər | İzləmə və bloklama | Şirkət səhifəsi (təsvir, açıq vakansiyalar, işəgötürən brendi), rəy/reytinq (moderasiya ilə) |
| CV analizi | AI analiz, sübut yoxlaması, struktur CV | CV-ni PDF kimi yükləmək/şablonla yaratmaq (CV builder), versiya tarixçəsi, vakansiyaya uyğunlaşdırılmış CV variantı |
| AI tövsiyələri / AI köməkçi | İşləyir (AI açarı tələb edir) | Müsahibəyə hazırlıq rejimi (sual-cavab məşqi), öyrənmə planı (çatışan bacarıqlar üçün), söhbət tarixçəsi var |
| Mənim profilim | Təcrübə, təhsil (universitet/ixtisas siyahıları), sertifikat, sənəd təsdiqi, avtomatik müraciət | Layihələr/portfolio linkləri, istinad şəxsləri (referans), maaş gözləntisində gross/net və əsas/əlavə iş yeri (maaş modulu hazırdır, qoşulmayıb), "profili gizlət/aç" aydın idarəsi, öz məlumatını yükləmək (ixrac) |
| Müraciətlərim | Status, hadisə tarixçəsi, təkliflər, testlər | **Müsahibə təyinatı və xatırlatma** (tarix, yer/link, təqvimə əlavə), statusa görə e-poçt/bildiriş, müraciəti geri götürmə izahı, rədd səbəbi göstərilməsi (işəgötürən icazə versə) |
| Mesajlar | Cavab, oxundu işarəsi, axtarış | Qoşma (CV/sənəd), hazır cavablar var, mesaj şikayəti, arxiv |
| Maaş kalkulyatoru | 2026 qaydaları | Vakansiya maaşını gross/net kimi göstərmək və gözləntiylə müqayisə (`lib/tax.ts` hazırdır) |
| Paketlər | Planlar, kart, müqavilə (mock provayder) | Real ödəniş provayderi, faktura PDF, planın yenilənməsi xatırlatması |
| Dəstək | Sorğular və cavablar | Tez-tez verilən suallar, sorğuya fayl əlavəsi |
| Hesab | Giriş, qeydiyyat, hesabın silinməsi | **Parol sıfırlama yoxdur**, **e-poçt təsdiqi yoxdur**, iki mərhələli giriş (2FA) yoxdur, aktiv sessiyalar siyahısı |

Ən vacib 3: parol sıfırlama və e-poçt təsdiqi, vakansiya xəbərdarlığı, müsahibə təyinatı və xatırlatma.

## 2. İşəgötürən (şirkət və komanda)

| Bölmə | Vəziyyət | Çatışmayan / əlavə olunacaq |
|---|---|---|
| Ümumi baxış / Hesabatlar | KPI və əvvəlki dövrlə müqayisə, tarix və vakansiya filtri, mərhələlər üzrə keçid faizi (ən son mərhələyə görə), müraciət mənbəyi (namizəd özü / AI avtomatik), aylar üzrə trend və orta işə qəbul müddəti, XLSX (vakansiya, müraciət, test, təklif, işçi və s.), avtomatik həftəlik/aylıq hesabat (cron, bildiriş və e-poçt), müraciət mənbəyi (Joblink, AI, şirkət dəvəti, LinkedIn/Facebook/Instagram/Telegram/WhatsApp/e-poçt/tövsiyə izləmə linkləri), "Diqqət tələb edənlər" bloku (təsdiq, baxılmamış müraciət, yoxlanmamış test, cavabsız təklif, bitən vakansiya, şirkət yoxlaması) | Vakansiya üzrə ayrıca trend, hesabatın PDF kimi göndərilməsi |
| Vakansiyalarım | AI ilə yaradılma, təsdiq zənciri, yayım, **kopyalama** (yeni layihə kimi), **şablonlar** (saxla, siyahı, istifadə et, sil), "bitməyə X gün qalıb" xəbərdarlığı, izləmə linkləri, **redaktə** (yayımlanmış/dayandırılmış vakansiyanı yerində dəyişmək, fəaliyyət jurnalı), **son tarixi uzatmaq** (+7/14/30 gün, bitmiş vakansiya yenidən aktiv olur), kartda müraciət/yeni/müsahibə/işə qəbul sayları və son tarixə qalan gün, axtarış, status süzgəci və sıralama, bağlama səbəbi (dolduruldu/ləğv/digər), redaktədə vacib dəyişiklikdə (maaş, vəzifə, şəhər, rejim, qrafik, ünvan, son tarix) müraciət etmiş namizədlərə bildiriş, baxan namizəd sayı, son 7 gün və konversiya (kartda, hesabatda, XLSX-də; baxanın kimliyi saxlanmır, 180 gün), **bir kliklə təkrar yayım** (bağlanmış və ya müddəti bitmiş vakansiya eyni məzmunla yeni elan kimi, +30 gün; icazəsiz rol üçün təsdiqə gedir) | — (bölmə tamamlanıb) |
| Namizədlər | Siyahı, AI sıralama (admin seçimi), pipeline, qiymətləndirmə | Toplu əməliyyat və istedad bazası hazırdır (pipeline kartlarında seçim: status "Baxışda/Uyğun deyil", mesaj, bazaya əlavə; "İstedad bazası" bölməsi: etiket, qeyd, axtarış). Qalır: saxlanmış axtarışlar, dublikat aşkarlama |
| HR AI köməkçi | Vakansiya layihəsi, namizəd analizi | Müsahibə sualları və qiymətləndirmə cədvəli şablonu, vakansiya mətninin ədalət yoxlaması (ayrı-seçkilik dili) |
| Testlər | Snapshot, əl ilə qiymət, vaxt bitməsi, avtosave, CSV idxal, sual sırası, hər test üzrə statistika (təhvil, orta bal, keçdi/keçmədi, yoxlanılır), keçdi/keçmədi nişanı, testi kopyalama, başqa testdən sual götürmə, pipeline-dan bir neçə namizədə toplu test göndərmə, təhvil bildirişində keçid nəticəsi | Fayldan test yaratma (Word, Excel, PDF, RTF, CSV, TXT: suallar və düzgün cavablar avtomatik oxunur, test bazaya yüklənir), namizədə nəticəni göstərmə seçimi, pipeline kartında test nişanı hazırdır. Sual bankı (etiketlə, təkrarsız) və standart formatda olmayan fayllar üçün AI ilə oxuma (razılıqla, `OPENAI_API_KEY` lazımdır, gündə 20) əlavə olundu. Test nəticəsi müraciət statusuna bağlana bilir (hər test üçün ayrıca seçim, defolt söndürülü: keçəndə “Baxışda”, keçməyəndə “Uyğun deyil”; yalnız tam qiymətləndirmədən sonra, işə qəbul/təklif mərhələsinə toxunmur). Brauzer nəzarəti (tam ekran, tab/pəncərə, kopyalama, kamera/mikrofon qeydləri) əvvəldən var; real proktorinq (şəkil/ekran yazısı, üz tanıma) brauzerdə etibarlı mümkün deyil. Nəticələrin Excel-ə yüklənməsi, sual üzrə təhlil (ən çox səhv edilən suallar), başlanmayan test üçün namizədə xatırlatma da var. Bölmə tamamlanıb |
| Təsdiqlər | Tam məzmun, yenidən göndərmə, bildirişlər | Xatırlatma və əvəzedici (planlaşdırıcı tələb edir), təklif və maaş üçün təsdiq |
| İşçilər / İşçi axını | İşçi siyahısı, ayrılma, dövriyyə, tarixçə | Təklifdən işçiyə avtomatik keçid var; əlavə: sənəd qovluğu, sınaq müddəti xatırlatması, ştat planı (olan və planlanan yer) |
| Komanda və rollar | 5 rol, əlavə icazələr (`tests`, `reports`), jurnal | Rol şablonları, üzvün fəaliyyət hesabatı, SSO |
| Şirkət məlumatları | Sənəd yoxlaması, VÖEN | İşəgötürən səhifəsi (lokal/şəkil/video), ofis ünvanı xəritə |
| Hesablar və ödənişlər | Faktura, ödəniş | Real provayder, avtomatik faktura e-poçtu, ƏDV |
| Mesajlar | Şirkət qutusu, müəllif adı, bildiriş, limit | Şablonlar, qoşma, mesajı komanda üzvünə təyin etmək |
| **Müsahibə** | Var: pipeline kartından təyin etmə (Bakı vaxtı, ofis/onlayn/telefon), namizədin təsdiqi və ya imtinası, vaxt dəyişmə və ləğv, "keçirildi/gəlmədi", 1–5 rəy və tövsiyə, `.ics` təqvim faylı, bildiriş və e-poçt, gündəlik xatırlatma (cron) | Namizədə bir neçə vaxt slotu təklif etmək, panel müsahibəsi (bir neçə müsahibəçi), müsahibə sual şablonları |
| **Təklif** | Var (status, qəbul) | Şablon, e-imza (ASAN), maaşın gross/net göstərilməsi (`lib/tax.ts`) |

Ən vacib 3: müsahibə modulu, toplu əməliyyat və istedad bazası, təklif şablonu və e-imza.

## 3. Admin

| Bölmə | Vəziyyət | Çatışmayan / əlavə olunacaq |
|---|---|---|
| Platforma icmalı | Əsas göstəricilər | **AI xərc və istifadə paneli** (neçə AI sorğusu, kim, təxmini xərc; "Uyğunluq balı" ayarı ilə birlikdə vacibdir) |
| İstifadəçilər | Siyahı, dayandırma | Rol dəyişimi jurnalı, istifadəçi məlumatını ixrac və silmə sorğularının idarəsi (GDPR/şəxsi məlumat), şübhəli hesab aşkarlama |
| Vakansiya moderasiyası | Moderasiya | Avtomatik spam/saxta vakansiya siqnalları, toplu rədd |
| Müraciət axını / Ödənişlər | İcmal, borclar | Hesabat ixracı, xatırlatma e-poçtları |
| Kataloqlar (bacarıq, sertifikat, vəzifə, təhsil) | Admin əlavə edir, istifadəçi sorğuları | Toplu idxal (CSV), dublikatların birləşdirilməsi, tərcümə yoxlaması (az/en/ru) |
| Uyğunluq balı | Qayda/AI seçimi, limitlər | Seçimin dəyişmə tarixçəsi, AI keyfiyyət nümunələri (admin nəticəyə baxıb "səhvdir" işarələyə bilsin) |
| Sorğular və mesajlar | Dəstək | Cavab şablonları, SLA göstəricisi (cavab müddəti) |
| İzləmə və bloklar | Var | Şikayət növbəsi (mesaj/vakansiya) |
| Şirkət / Sənəd yoxlaması | Var | Yoxlama növbəsinin müddət göstəricisi, rədd səbəbi şablonları |
| Sistem və audit | Audit | Audit ixracı, xəta jurnalı, bazanın ehtiyat nüsxə vəziyyəti |

Ən vacib 3: AI xərc paneli, şikayət növbəsi, şəxsi məlumat sorğularının idarəsi.

## 4. Hamıya aid (platforma)

1. **Hesab təhlükəsizliyi:** parol sıfırlama, e-poçt təsdiqi, 2FA. İstifadəçilərə açmazdan əvvəl ən vacib boşluqdur.
2. **Bildirişlər:** sayt içi bildiriş var; e-poçt göndərmə mexanizmi var, amma status dəyişimi, mesaj, vakansiya xəbərdarlığı üçün sistemli e-poçt şablonları yoxdur. SMS yoxdur.
3. **Mobil:** PWA (ana ekrana əlavə, oflayn kabuk) yoxdur. Real APK hosting olmadan mümkün deyil.
4. **Dillər:** az/en var, rus UI yoxdur.
5. **Əlçatanlıq və performans:** sistemli yoxlanılmayıb.
6. **Əməliyyat:** xəta jurnalı, ehtiyat nüsxə, monitorinq yoxdur. Canlı sayt hələ yoxdur (Cloudflare secret-ləri).
7. **Kod sağlamlığı:** bütün API tək faylda (`route.ts`), bölmək lazımdır.

## 5. Təklif olunan sıra
1. Canlı sayt (hosting) və hesab təhlükəsizliyi (parol sıfırlama, e-poçt təsdiqi).
2. Müsahibə modulu (hər iki tərəf üçün) və status e-poçtları.
3. Maaş modulunun qoşulması (vakansiya və gözləntidə gross/net).
4. AI xərc paneli və şikayət növbəsi (admin).
5. Vakansiya xəbərdarlığı, istedad bazası, toplu əməliyyat.
6. Qalan yarımçıq funksiyalar (Word/Excel test, mesaj qoşması, təsdiq xatırlatması, ESCO, rus dili, ASAN, SMS, real ödəniş).
