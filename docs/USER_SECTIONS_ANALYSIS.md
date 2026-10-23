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
| Ümumi baxış / Hesabatlar | KPI və əvvəlki dövrlə müqayisə, tarix və vakansiya filtri, mərhələlər üzrə keçid faizi (ən son mərhələyə görə), müraciət mənbəyi (namizəd özü / AI avtomatik), aylar üzrə trend və orta işə qəbul müddəti, XLSX (vakansiya, müraciət, test, təklif, işçi və s.), "Diqqət tələb edənlər" bloku (təsdiq, baxılmamış müraciət, yoxlanmamış test, cavabsız təklif, bitən vakansiya, şirkət yoxlaması) | Planlanmış hesabat (e-poçtla həftəlik, planlaşdırıcı tələb edir), mənbə kimi xarici kanallar (hazırda yalnız namizəd/AI), vakansiya üzrə ayrıca trend |
| Vakansiyalarım | AI ilə yaradılma, təsdiq zənciri, yayım | Vakansiyanı kopyalamaq, şablonlar, "bitməyə X gün qalıb" xəbərdarlığı, təkrar yayım |
| Namizədlər | Siyahı, AI sıralama (admin seçimi), pipeline, qiymətləndirmə | Toplu əməliyyat (bir neçə nəfərə status/mesaj), istedad bazası (talent pool) və saxlanmış axtarışlar, namizəd qeydləri/etiketləri, dublikat aşkarlama |
| HR AI köməkçi | Vakansiya layihəsi, namizəd analizi | Müsahibə sualları və qiymətləndirmə cədvəli şablonu, vakansiya mətninin ədalət yoxlaması (ayrı-seçkilik dili) |
| Testlər | Snapshot, əl ilə qiymət, vaxt bitməsi, avtosave, CSV idxal, sual sırası | Word/Excel test faylı, sual bankı və təkrar istifadə, test nəticəsinin vakansiya statusuna bağlanması, namizədə nəticənin göstərilməsi seçimi |
| Təsdiqlər | Tam məzmun, yenidən göndərmə, bildirişlər | Xatırlatma və əvəzedici (planlaşdırıcı tələb edir), təklif və maaş üçün təsdiq |
| İşçilər / İşçi axını | İşçi siyahısı, ayrılma, dövriyyə, tarixçə | Təklifdən işçiyə avtomatik keçid var; əlavə: sənəd qovluğu, sınaq müddəti xatırlatması, ştat planı (olan və planlanan yer) |
| Komanda və rollar | 5 rol, əlavə icazələr (`tests`, `reports`), jurnal | Rol şablonları, üzvün fəaliyyət hesabatı, SSO |
| Şirkət məlumatları | Sənəd yoxlaması, VÖEN | İşəgötürən səhifəsi (lokal/şəkil/video), ofis ünvanı xəritə |
| Hesablar və ödənişlər | Faktura, ödəniş | Real provayder, avtomatik faktura e-poçtu, ƏDV |
| Mesajlar | Şirkət qutusu, müəllif adı, bildiriş, limit | Şablonlar, qoşma, mesajı komanda üzvünə təyin etmək |
| **Müsahibə** | **Yoxdur** | Təqvim, namizədə təklif olunan vaxt slotları, xatırlatma, nəticə forması (rəy), panel müsahibəsi |
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
