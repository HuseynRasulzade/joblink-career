# İşəgötürən tərəfin modul analizi və işçi axını modulu planı

Tarix: 2026-10-23. Əsas: kodun oxunması (`app/HrPanel.tsx`, `app/CompanyPages.tsx`, `app/Offers.tsx`, `app/api/joblink/[...path]/route.ts`, `drizzle/*`) və sizin tələblər siyahınız.

**Faizlər təxminidir.** Hər faiz "sizin tələblər siyahınızdan nə qədəri kodda var" sualının cavabıdır. Mən işəgötürən ekranlarını bu sessiyada brauzerdə gəzib yoxlamamışam, yalnız kodu oxumuşam. Əvvəlki sessiyada Mərhələ 4–6 lokalda sınanıb. Faiz "xətasız işləyir" demək deyil, "nəzərdə tutulan funksiyanın nə qədəri qurulub" deməkdir.

## 1. Modullar üzrə vəziyyət

| Modul | Hazırlıq | Var | Çatışmır |
|---|---|---|---|
| Vakansiya yaratma və təsdiq axını | 80% | AI ilə layihə, vəzifə siyahısı, səbəb (yalnız şirkət görür), seçim mərhələləri, HR və direktor təsdiqi | Vakansiya şablonu və kopyalama, vakansiya üzrə ayrıca analitika, müddət bitməsi xatırlatması, maaş aralığı tövsiyəsi |
| Namizədlər və ATS | 75% | Mərhələ lövhəsi, müqayisə, AI sıralama, AI vakansiya qiymətləndirməsi, izləmə və bloklama | Toplu əməliyyatlar, qeyd və etiketlər, namizəd üçün ortaq qiymətləndirmə kartı, təkrar müraciət xəbərdarlığı |
| Testlər və imtahan | 65% | Test hazırlama, ekran və kamera tələbi, server taymeri, pozuntu qeydi, faylın dəyişmə tarixçəsi | Real kamera və ekran icazəsi sınanmayıb, şəkil çəkmə və kamera yazısı yoxdur, bütün fayl formatları dəstəklənmir |
| İş təklifi | 55% | Hazır şablon, göndərmə, namizədin qəbul və imzası (yazılı ad) | Hüquqi qüvvəli elektron imza (ASAN imza), PDF çıxarma, təklifin versiyaları, müqaviləyə keçid |
| İşçilər | 45% | Siyahı, əl ilə əlavə, işə qəbul olunanın avtomatik əlavəsi, maaşı yalnız HR və direktor görür | Ayrılma tarixi və səbəbi, vəzifə tarixçəsi, Excel idxalı, eyni vəzifə üzrə müqayisə, işçi axını analitikası |
| Komanda və rollar | 80% | Rollar, dəvət, icazələr, audit jurnalı | Şöbə üzrə məhdudiyyət, rol dəyişikliyi tarixçəsi |
| Şirkət profili və yoxlama | 70% | VÖEN, e-taxes arayışı, admin təsdiqi, "təsdiqlənmiş şirkət" nişanı | Arayışın avtomatik oxunması və yoxlanması, rekvizitlərin vergi məlumatı ilə tutuşdurulması |
| Faktura və ödəniş | 40% | Fakturalar, ödəniş tarixçəsi, qalıq | Paketlər, ödəniş metodu, avtomatik ödəniş, abunəlik bitəndə məhdudiyyət (Mərhələ 7) |
| Hesabatlar | 55% | 4 XLSX hesabatı (müraciətlər, vakansiyalar, işçilər, fakturalar) | İşçi axını, vakansiya səbəbi və dövr müqayisəsi, vaxt filtri, planlı hesabat |
| İdarə paneli (dashboard) | 60% | Aktiv vakansiya, müraciət, işə qəbul, orta işə qəbul müddəti, təklifin qəbul faizi, mərhələ qıfı, 30 günlük qrafik | Ayrılan işçilər, dövriyyə, vakansiya səbəbi bölgüsü, namizəd keyfiyyəti, dövr seçimi |
| Mesajlar | 70% | Namizədlə söhbət tarixçəsi | Şablon cavablar, fayl göndərmə |
| Dəstək və şikayət | 70% | Mövzu siyahısı, status izləmə, admin e-poçtu | SLA və cavab vaxtı göstəricisi |
| Maaş kalkulyatoru | 60% | Gross-net, işəgötürən payı, işçi sayına görə ümumi xərc | Vergi bazasının və tibbi sığorta dərəcəsinin mühasibatla təsdiqi (açıq sual) |
| Avtomatik müqavilə | 5% | Yalnız təklif şablonu | Paketə uyğun əmək müqaviləsi (Mərhələ 7) |
| Barmaq izi ilə tabel | 0% | — | Ayrıca proqram yoxsa əlavə: qərar verilməyib |

**Ümumi: təxminən 58%.** Namizəd tərəfinin ATS hissəsi ən güclüdür. Ən zəif yerlər işçi tərəf (işçi axını, ayrılma), pul tərəfi (paket və ödəniş) və hüquqi sənədlərdir.

## 2. İlk görülməli düzəlişlər (təsir sırası ilə)

1. **İşçi axını modulu** (bax: bölmə 3). Sizin ən çox istədiyiniz şeydir və dashboard-un çatışmayan yarısını doldurur.
2. **Vakansiya səbəbinin hesabata bağlanması.** Səbəb artıq saxlanılır, amma heç bir hesabatda istifadə olunmur. "İşçi çıxışına görə açılan vakansiyalar" və "yeni ştat" bölgüsü dərhal faydalı olar.
3. **Namizəd keyfiyyəti göstəricisi.** AI qiymətləndirməsinin ən azı 70 bal alan namizədlərin sayı və faizi. Bu, "seçilən namizədlər nə qədər professionaldır" sualının cavabıdır.
4. **Elektron imza və PDF təklif.** Hüquqi qüvvə üçün vacibdir.
5. **Mərhələ 7** (paketlər, ödəniş, müqavilə), pul gətirən hissədir.
6. **Maaş kalkulyatorunun vergi hesablamasının təsdiqi.**
7. **Testlərin real kamera ilə sınanması** və bütün formatların dəstəyi.

## 3. İşçi axını modulu

### Məqsəd
Rəhbər bir səhifədə görsün: neçə işçi var, neçəsi gəldi, neçəsi getdi, niyə getdi, vakansiyalar nə qədər tez doldu, dövriyyə nə qədərdir.

### Baza dəyişikliyi (yeni miqrasiya)
`company_employees` cədvəlində indi yalnız status var. Əlavə olunmalıdır:
- `end_date` (ayrılma tarixi) və `exit_type`: istefa, işdən çıxarılma, müqavilənin bitməsi, razılaşma, digər.
- `exit_reason`: səbəb kateqoriyası (maaş, karyera, rəhbərlik, şəxsi, köçmə, digər) və qeyd. Yalnız HR və direktor görür.
- `job_id` və `replaced_employee_id`: vakansiya işçinin yerinə açılıbsa, əlaqə saxlanılır.
- Yeni `employee_events` cədvəli: işə qəbul, vəzifə dəyişikliyi, şöbə dəyişikliyi, maaş dəyişikliyi, məzuniyyət, ayrılma. Hər biri tarix və kimin dəyişdiyi ilə.

### Göstəricilər
- **İşçi sayı:** dövrün əvvəlində və sonunda, şöbə və vəzifə üzrə.
- **İşə qəbul və ayrılma:** aylıq say və xalis dəyişiklik.
- **Dövriyyə faizi:** `ayrılanlar ÷ orta işçi sayı × 100`, ay və il üzrə.
- **İlk 90 gündə ayrılanlar:** işə qəbul keyfiyyətinin ən sadə göstəricisi.
- **Orta staj:** hamı üçün və ayrılanlar üçün ayrıca.
- **Vakansiya səbəbi bölgüsü:** yeni ştat, işçi çıxışı, böyümə, müvəqqəti. İşçi çıxışına görə açılanların sayı ayrılanlarla tutuşdurulur.
- **İşə qəbul sürəti:** vakansiyanın açılmasından işə qəbula qədər gün, səbəb və vəzifə üzrə.
- **Mənbə keyfiyyəti:** işə qəbul olunanların neçəsi platformadan, neçəsi əl ilə əlavə olunub, və 90 gün sonra qalıb-qalmaması.
- **Eyni vəzifə üzrə müqayisə:** əvvəlki və yeni işçinin maaşı (yalnız maaş görmək icazəsi olanlar üçün).

### AI qatı
Rəqəmləri izah edən qısa şərh: "Satış şöbəsində son 6 ayda dövriyyə 28%, ayrılanların 4-ü ilk 90 gündə getdib, səbəb əsasən maaş". Şərh yalnız hesablanmış rəqəmlərə əsaslanmalıdır, modelə xam işçi adı və maaşı göndərilmir. Yoxlama qaydası AI qiymətləndirməsindəki kimi: rəqəm hesabdan gəlir, model yalnız sözlə izah edir.

### Ekranlar
1. **İşçi axını paneli:** dövr seçimi (ay, rüb, il), yuxarıda 5 əsas rəqəm, aylıq işə qəbul/ayrılma qrafiki, şöbə üzrə cədvəl.
2. **Ayrılma qeydi:** işçi kartında "Ayrıldı" düyməsi: tarix, növ, səbəb.
3. **Hesabat:** XLSX ixracı (dövriyyə, ayrılanlar, işə qəbul).
4. **Məlumat ixracı üçün icazə:** maaş və ayrılma səbəbi yalnız HR, direktor və hesab sahibi.

### İcra mərhələləri
1. Miqrasiya və ayrılma qeydi (kiçik).
2. Göstəricilərin hesablanması (server) və panel (orta).
3. Vakansiya səbəbi və yerinə işə qəbul bağlantısı (kiçik).
4. XLSX hesabat (kiçik).
5. AI şərhi (kiçik, ən son).

### Qərarlar
- Məlumat necə daxil olacaq? Şirkət Excel göndərir və biz daxil edirik (sizin ilkin planınız), yoxsa şirkət özü Excel yükləyir? Özünün yükləməsini məsləhət görürəm, və idxal ekranı əlavə edərdim.
- Barmaq izi tabeli ilə birləşdirilsin, yoxsa ayrı? İşçi axını modulu tabelsiz də işləyir, ona görə bu qərar onu gecikdirməməlidir.

## 4. Nəyi bilmirik
- İşəgötürən ekranları canlıda real istifadəçi ilə sınanmayıb.
- Maaş kalkulyatorunun düzgünlüyü mühasibatla təsdiqlənməyib.
- Testlərdəki kamera və ekran paylaşımı real brauzerdə yoxlanmayıb.

## 5. Real yoxlama (lokal server, test hesablar, 2026-10-23)

Proqramı lokal işə salıb işəgötürən axınını API ilə keçdim (şirkət qeydiyyatı, vakansiya, namizəd müraciəti, status, iş təklifi, işə qəbul, komanda, təsdiq, test, mesaj, hesabat). Ekranların vizual görünüşü, imtahan otağı, admin tərəfi və faktura yoxlanmayıb. AI funksiyaları açar olmadığı üçün lokal işləmir (cavab 503, gözlənilən haldır).

**İşləyir:** şirkət qeydiyyatı və rollar, dashboard rəqəmləri, vakansiyanın yaradılması və yayımı, səbəbin saxlanması, namizədin müraciəti, status dəyişməsi və tarixçə, iş təklifi (yalnız müsahibə mərhələsindən sonra), təklifin elektron qəbulu və işçinin avtomatik əlavə olunması (maaş və başlama tarixi təklifdən gəlir), işçinin əl ilə əlavəsi və statusu, komanda dəvəti, rekruterin vakansiyasının HR və direktor təsdiqi, test hazırlama və göndərmə, mesajlaşma, 4 XLSX hesabatı, audit jurnalı, şirkət profili, işəgötürən kalkulyatoru.

**Tapılan çatışmazlıqlar:**
1. HR "İşə qəbul edildi" statusunu namizəd təklifi qəbul etmədən verə bilir. İşçi maaşsız (0 AZN) əlavə olunur və namizəd sonra təklifi qəbul etsə belə maaş yenilənmir.
2. Süni intellektsiz vakansiya layihəsi vəzifənin dərəcəsini itirir ("Baş mühasib" → "Mühasib", "Satış meneceri" → "Satış mütəxəssisi").
3. Ayrılan işçi üçün tarix və səbəb saxlanmır, işçi axını hesabatı yoxdur.
4. Hesabat növləri yalnız 4-dür, qıf və dövriyyə hesabatı yoxdur.
5. Maaş kalkulyatorunun vergi bazası və dərəcələri rəsmi mənbə ilə təsdiqlənməyib (Vergilər Nazirliyi saytına bu mühitdən çıxış yoxdur).
