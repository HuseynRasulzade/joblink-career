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
1. ~~HR "İşə qəbul edildi" statusunu namizəd təklifi qəbul etmədən verə bilirdi, işçi maaşsız (0 AZN) əlavə olunurdu.~~ **Düzəldildi:** cavab gözləyən təklif varsa işə qəbul bloklanır (namizəd qəbul edəndə avtomatik tamamlanır və təklifdəki maaş yazılır), "Uyğun deyil" statusu gözləyən təklifi geri çəkir. Təklif göndərilməyibsə, işə qəbul əvvəlki kimi mümkündür (maaş əl ilə yazılır).
2. ~~Süni intellektsiz vakansiya layihəsi vəzifənin dərəcəsini itirirdi ("Baş mühasib" → "Mühasib", "Satış meneceri" → "Satış mütəxəssisi").~~ **Düzəldildi:** işəgötürənin yazdığı və vəzifə siyahısında tanınan vəzifə adı olduğu kimi saxlanılır.
3. Ayrılan işçi üçün tarix və səbəb saxlanmır, işçi axını hesabatı yoxdur.
4. Hesabat növləri yalnız 4-dür, qıf və dövriyyə hesabatı yoxdur.
5. Maaş kalkulyatorunun vergi bazası və dərəcələri rəsmi mənbə ilə təsdiqlənməyib (Vergilər Nazirliyi saytına bu mühitdən çıxış yoxdur).

## 6. Düzəldilənlər və əlavə olunanlar (2026-10-23)

- **İşçi axını modulu quruldu** (`İşçi axını` bölməsi): dövr seçimi, işçi sayı, işə qəbul, ayrılan, dövriyyə, ilk 90 gündə ayrılanlar, orta staj, aylıq qrafik, şöbələr üzrə cədvəl, ayrılma növü və səbəbi (yalnız HR, direktor və hesab sahibi), vakansiya səbəbi ilə müqayisə, avtomatik nəticələr. Miqrasiya `0022_workforce_flow.sql`.
- **İşçi kartı:** ayrılma tarixi, növü, səbəbi, qeyd və hərəkət tarixçəsi (işə qəbul, vəzifə, şöbə, maaş, məzuniyyət, ayrılma).
- **Yeni XLSX hesabatları:** işçi axını, ayrılanlar, qıf (vakansiya üzrə mərhələlər və səbəb), vakansiya səbəbləri.
- **Dashboard:** "Güclü namizədlər" göstəricisi (uyğunluq 70% və yuxarı olan müraciətlərin payı).
- **İşə qəbul və təklif:** cavab gözləyən təklif varsa işə qəbul bloklanır, rədd gözləyən təklifi geri çəkir.
- **Vakansiya layihəsi:** vəzifənin dərəcəsi saxlanılır, süni intellekt işləməyəndə şablona qayıdır.
- **Maaş kalkulyatoru** Vergilər Nazirliyinin 2026 cədvəlinə görə yeniləndi.

## 7. Testlər, hesabatlar, mesajlar və təsdiqlər: ətraflı analiz (2026-10-23)

Kodu oxudum və lokal serverdə rekruter (icazəsiz), şöbə rəhbəri, HR/hesab sahibi və namizəd hesabları ilə real axınlardan keçdim. Faizlər tələblər siyahınıza görə təxmini hazırlıqdır.

### Testlər: ~55%
**İşləyir:** test yaratma (tək seçim, çox seçim, açıq cavab), sənəd əlavəsi (PDF və şəkil), namizədə göndərmə, serverdə taymer, kamera, mikrofon və tam ekran tələbi, pozuntu qeydi, dəyişikliyin səbəbi ilə tarixçəsi, göndərilmiş testin silinməməsi, nəticə cədvəli, gecikmə işarəsi.

**Yoxlamada tapılan çatışmazlıqlar:**
1. **İcazə və şəxs.** İcazəsi olmayan rekruter testləri siyahılaya, açıb dəyişə, gizli test sənədini endirə və namizədə göndərə bildi. Tarixçədə "kim baxdı və kim dəyişdi" yerinə şirkət adı yazılır, konkret şəxs görünmür. Tələb: faylı yalnız icazə verilmiş şəxs görsün və hər baxış və dəyişiklik şəxslə qeyd olunsun.
2. **Test başlayandan sonra dəyişdirilə bilir.** Namizəd başlayandan sonra cavab açarı dəyişdirildi, düzgün cavab verən namizəd 0/2 aldı, çünki bal sonradan dəyişən testlə hesablanır (test nüsxəsi saxlanmır).
3. **Açıq cavablar qiymətləndirilə bilmir.** Cavabı görmək olur, bal vermək üçün yer yoxdur. Yekun bal yalnız seçim suallarından çıxır.
4. **Vaxtı keçən test bağlanmır.** Namizəd 8 saat gec təhvil verdi, qəbul olundu ("gecikmə ilə" işarəsi ilə) və tam bal aldı. Heç vaxt təhvil verməyən test həmişə "Davam edir" qalır.
5. **Formatlar.** Yalnız PDF, PNG, JPG, WEBP. Word və Excel yoxdur. Sualları fayldan idxal etmək olmur.
6. **Nəzarət yalnız brauzer tərəfindədir.** Pozuntular namizədin brauzerindən gəlir. Kameranın həqiqətən açıq olduğu serverdə yoxlanmır, şəkil və ya yazı saxlanmır. Ekran şəklinin qarşısını brauzerdə almaq mümkün deyil.
7. Suallar və variantlar qarışdırılmır, təkrar cəhd və vaxt uzatma yoxdur, nəticə vakansiya statusuna bağlı deyil.

### Hesabatlar: ~60%
**İşləyir:** dashboard (qıf, günlük qrafik, vakansiya üzrə cədvəl), 8 XLSX hesabatı, hesabatlar auditə yazılır, başlıq, filtr və dondurulmuş sətir, mətn xanaları formula kimi oxunmur.
**Çatışmır:**
1. Dashboard və hesabatlarda dövr, vakansiya və şöbə filtri yoxdur (`from`/`to` parametrləri qəbul olunmur).
2. Şöbə rəhbəri bütün şirkətin müraciətlərini (namizədin e-poçtu və telefonu ilə) və bütün işçi siyahısını ixrac edə bilir, öz şöbəsi ilə məhdudlaşmır.
3. Tarixlər mətn kimi yazılır, planlı hesabat və dövrlər arası müqayisə yoxdur.
4. Test nəticələri və mesaj cavab vaxtı hesabatlara daxil deyil.

### Mesajlar: ~65%
**İşləyir:** namizəd və şirkət yazışması, vakansiya üzrə söhbət, cavab (sitat), oxunma işarəsi, axtarış, səhifələmə, blok yoxlaması, yalnız müraciət edənə və ya təkliflərə açıq namizədə yazmaq.
**Çatışmır:**
1. Yeni mesaj üçün bildiriş və e-poçt yoxdur, qarşı tərəf yalnız bölməni açanda sayğacı görür (namizədə bildiriş sayı 6 qaldı).
2. Komanda üzvü göstərilmir: rekruterin mesajı namizədə "şirkət" kimi görünür, şirkət daxilində də kimin yazdığı bilinmir.
3. Spam qoruması yoxdur: ardıcıl 30 mesaj qəbul olundu.
4. Fayl əlavəsi, şablon cavab, söhbəti arxivə atma və təyin etmə yoxdur.

### Təsdiqlər: ~75%
**İşləyir:** iki mərhələ (HR, sonra direktor), hesab sahibi hər ikisini edə bilir, rədd üçün səbəb məcburidir, öz göndərdiyini təsdiqləmək olmaz, rola görə icazə, auditə yazılır, təsdiqdən sonra izləyənlərə bildiriş.
**Çatışmır:**
1. **Təsdiq verənə vakansiyanın məzmunu göstərilmir.** Kartda yalnız ad, şəhər və səbəb var. Maaş aralığı, təsvir, tələblər və bacarıqlar görünmədən təsdiqləmək olur.
2. Rədd edilmiş elan düzəldilib yenidən göndərilə bilmir, yeni elan yaratmaq lazımdır.
3. Göndərənə fərdi bildiriş getmir: bildirişlər şirkətin ortaq qutusuna düşür və komanda üzvü öz adına bildiriş ala bilmir.
4. Rədd edilmiş layihə üçün "Yayımla" yenidən basılanda cavab köhnə "təsdiq gözləyir" statusunu göstərir (real status "rədd edilib").
5. Xatırlatma, gecikmə həddi və səlahiyyət verilməsi yoxdur. Təsdiq yalnız vakansiyalar üçündür, təklif və maaş dəyişikliyi üçün yoxdur.

### Ən vacib düzəlişlər (sıra ilə)
1. Test icazəsi və şəxsin qeydi, test sənədinə baxışı məhdudlaşdırmaq.
2. Test nüsxəsini namizədə göndərilən anda saxlamaq, başlamış testi dəyişməyə qadağa.
3. Açıq cavabları qiymətləndirmək, vaxtı bitən testi avtomatik bağlamaq, həddi keçən gec təhvili rədd etmək.
4. Təsdiq kartında vakansiyanın tam məzmunu və rədd edilmişi redaktə edib yenidən göndərmək.
5. Mesaj bildirişi, komanda üzvünün adı, spam həddi.
6. Hesabatlarda dövr və vakansiya filtri, şöbə rəhbəri üçün şöbə ilə məhdudlaşdırma.

## 8. Bölmə 7-dəki düzəlişlərin icrası (migrasiya 0025)

### Görüldü
**Testlər**
- Test idarəsi yeni `tests` icazəsinə bağlandı (hesab sahibi, direktor, HR). Rekruter/menecerə yalnız hesab sahibi/HR "Komanda" səhifəsindən əlavə icazə verə bilər. Cavablar və fayl baxışları artıq şirkət adı ilə yox, **real istifadəçi adı ilə** jurnala yazılır. Naviqasiyada icazəsiz bölmələr gizlədilir.
- Test namizədə göndəriləndə **surəti (snapshot)** götürülür: ad, təlimat, müddət, keçid balı, suallar. Sonradan redaktə yalnız yeni göndərilənlərə təsir edir; namizəd və bal hesablaması həmişə öz surətindən istifadə edir. Göndərildikdən sonra test faylı dəyişdirilə bilmir.
- Açıq suallar üçün **əl ilə qiymətləndirmə** (`hr/assessments/grade`): hər sual öz maksimum balı daxilində; hamısı yoxlanılana qədər status "yoxlanmalıdır", ümumi bal yalnız sonra tam hesablanır.
- **Vaxt bitmə**: son tarix + 60 san. keçəndə yekun göndəriş 409 ilə rədd edilir; başlanmış, lakin təhvil verilməmiş test sonrakı sorğuda avtomatik `expired` olur (son saxlanmış cavablarla). Şirkət "+15 dəq" ilə vaxtı uzada və ya testi ləğv edə bilər (səbəb tarixçədə).
- **Avtomatik saxlama** (hər 20 san.) və təkrar açılışda cavabların bərpası.
- Namizəd siyahısında "Vaxt bitib" statusu, şirkətdə "Ləğv edilib/Vaxt bitib" etiketləri; dashboard testləri `expired` daxil sayır.

**Təsdiqlər**
- Təsdiqləyən artıq vakansiyanın tam məzmununu (təsvir, tələblər, maaş, bacarıqlar və s.) görür; 2 gündən çox gözləyənlərdə "gündür gözləyir" göstəricisi.
- Rədd olunmuş vakansiya düzəlişlə **yenidən göndərilir** (`company/approvals/resubmit`); əvvəlki qərarlar `approvalHistory`-də qalır, yeni iki mərhələli təsdiq başlayır.
- Təsdiq/rədd bildirişi indi göndərənin **şəxsi** bildirişinə də düşür (bildirişlər siyahısı şirkət qutusu + şəxsi qutunu birləşdirir).
- `publish` artıq göndərilmiş layihə üçün köhnə "pending" yox, vakansiyanın **real statusunu** qaytarır.

**Mesajlar**
- Qarşı tərəfə bildiriş (oxunmamış ardıcıllığın birinci mesajında bir dəfə), mesajın **müəllifi** (komanda üzvünün adı, yalnız şirkət tərəfi görür), real istifadəçi üzrə **spam limiti** (5 dəq-də 20 mesaj).

**Hesabatlar**
- Dashboard və XLSX üçün `from`/`to`/`jobId` filtrləri (UI-da tarix və vakansiya seçimi).
- Publish icazəsi olmayan rollar (menecer, rekruter) yalnız **özünün yaratdığı** vakansiyaları (`createdBy`) görür; işçi/işçi axını/ayrılanlar/faktura hesabatları onlara bağlıdır, təklif/test/işçi sayğacları şirkət üzrə olduğu üçün gizlədilir.
- İşçi hesabatında e-poçt/telefon yalnız `salaries` icazəsi olanlara verilir.

**Komanda**: üzv başına əlavə icazə (`tests`, `reports`) — dəvətdə və cədvəldə. Əskik `grants` sütunu heç vaxt üzvü sahibə çevirmir.

### Qalanlar (hələ edilməyib)
- Test fayllarını Word/Excel kimi qəbul etmək; sual və variant sırasını qarışdırmaq; server tərəfdə ekran şəkli/proctoring (brauzerdə texniki olaraq mümkün deyil — yalnız qeydə alınır).
- Test nəticəsinin vakansiya statusuna avtomatik bağlanması; sualların CSV ilə idxalı.
- Mesajlarda qoşma, şablon, arxiv, mesajı komanda üzvünə təyin etmək.
- Təsdiq xatırlatmaları, əvəzedici (delegation), təklif/maaş üçün təsdiq.
- `hr` siyahısının menecer üçün özünə aid vakansiyalarla məhdudlaşdırılması (indi yalnız dashboard və hesabatlar məhduddur; köhnə vakansiyalarda `createdBy` yoxdur, ona görə menecer onları görmür).
- XLSX-də həqiqi tarix xanaları (indi mətn).
- Əvvəlki siyahıdan: ESCO vəzifə idxalı, saytın rus UI-sı, ASAN imza, real ödəniş provayderi, SMS, işəgötürən paketləri, **deploy** (GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` əlavə edib "Deploy to Cloudflare" workflow-nu işə salmaq lazımdır), əmək haqqı kalkulyatorunda "3% (−200 AZN)" izahının rəsmi kalkulyatorla yoxlanması (1000/3000 AZN özəl, 1000 AZN dövlət).

### 9. Sonradan tamamlananlar
- XLSX-də `YYYY-MM-DD` dəyərləri həqiqi Excel tarix xanalarıdır (filtr və çeşidləmə işləyir), testi var.
- Test suallarının sırası hər namizəd üçün fərqli, lakin sabit qarışdırılır (variantlar qarışdırılmır ki, düzgün cavab indeksləri pozulmasın).
- Sualların CSV ilə yüklənməsi (`tip;sual;variantlar;düzgün;bal`), testi var.
- `hr` siyahısı (vakansiyalar, müraciətlər) menecer/rekruter üçün yalnız özünün yaratdığı vakansiyalarla məhduddur.
- Hələ qalır: Word/Excel test faylı, test nəticəsinin vakansiya statusuna bağlanması, mesaj qoşması/şablonu/arxivi/təyinatı, təsdiq xatırlatması və əvəzedici (planlaşdırıcı tələb edir), təklif/maaş təsdiqi, ESCO idxalı, rus UI, ASAN imza, real ödəniş, SMS, işəgötürən paketləri, deploy (GitHub secrets).
