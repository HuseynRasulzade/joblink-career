# JobMatch HR: nə hazırdır, nə qalıb (sadə izah)

Son yenilənmə: 2026-11-07.

## 1. Nə hazırdır (qısa)

Hamısı canlı saytda işləyir (deploy keçib).

| Sahə | Menyuda harada |
|---|---|
| İşə qəbul: vakansiya, namizəd, müsahibə, test, təklif | Vakansiyalarım, Namizədlər, Müsahibələr, Testlər |
| İşçi kartı: şəxsi məlumat, şəkil, sənəd, əmr, maaş tarixçəsi | İşçilər |
| Əmrlər və kadr hadisəsi (qəbul, köçürmə, maaş, məzuniyyət, xitam…) | Əmrlər reyestri → "Kadr hadisəsi" |
| Əmək haqqı: hesablama, avans, bank sənədi, haqq-hesab vərəqəsi | Əmək haqqı |
| Davamiyyət: tabel, giriş-çıxış, saat uçotu, növbə, məkan yoxlaması | Davamiyyət |
| Məzuniyyət qrafiki, sənəd reyestri, işdən çıxma, aktivlər, ad günü, əməyin mühafizəsi, daxili qaydalar və razılıq, saxlama müddəti | Kadr əməliyyatları |
| Performans, bacarıq matrisi, təlim, ezamiyyət, elan və sorğular, növbə qrafiki | İnkişaf və kommunikasiya |
| Kadr dinamikası qrafiki, proqnoz, plan-fakt, bütün hesabatlar | Hesabatlar |
| Holdinq (qrup) görünüşü | Qrup (holdinq) |
| İşçinin öz səhifəsi | İş yerim |

Bacarıq matrisi bacarıqları admin panelindəki kataloqdan və ESCO (həmçinin O*NET) siyahısından seçir.

Excel ilə yükləmə işləyən bölmələr: elanlar, ezamiyyət, işçilər, ştat, struktur, davamiyyət, təqvim, şəxsi məlumat, əmək haqqı əlavələri, saat uçotu, növbə, aktivlər, məzuniyyət qrafiki, əməyin mühafizəsi, bacarıq matrisi, performans məqsədləri, təlim planı. Hamısında nümunə fayl var, işçi FİN ilə tapılır.

## 2. Sizin qərarınız və ya məlumatınız lazımdır

Bunları mən öz başıma bağlaya bilmərəm.

1. **`DATA_KEY` açarı** (Cloudflare secret): qoyulmasa şəxsi məlumatlar (FİN, vəsiqə, bank) bazada şifrələnmir. Şəkil bu açara daxil deyil.
2. **Hüquqşünas yoxlaması:** nümunə mətnlər (daxili əmək qaydaları, razılıq, vəzifə təlimatı, əmr və müqavilə şablonları) və saxlama illəri (75 il, 5 il və s.) layihədir, rəsmi cədvələ qarşı yoxlanmayıb.
3. ~~Rəsmi gündəlik ezamiyyət cədvəli~~: hazırdır (aşağıda 8-ci bölmə). Mərkəzi Bankın rəsmi məzənnəsi artıq canlı gətirilir (cbar.az, ezamiyyətin başlama gününə görə); əl ilə yazılan məzənnə yalnız bank saytı əlçatmaz olanda ehtiyat kimi işlənir.
4. **Holdinq qərarları** (mən götürdüm, təsdiq edin və ya dəyişin): qrup yalnız yekunları görür, maaş yekunu yalnız üzv icazə verəndə; ayrıca "qrup rəhbəri" hesab növü yoxdur (baş şirkətin hesab sahibi baxır).
5. **Ad günü və il dönümü təbriki ilkin olaraq bağlıdır** (doğum tarixi şəxsi məlumatdır). Açmaq istəyirsinizsə: Kadr əməliyyatları → Ad günləri.

## 3. Xarici müqavilə və ya cihaz tələb edir (kodla həll olunmur)

- Birbaşa bank API (indi bank sənədi fayl kimi hazırlanır).
- Hüquqi e-imza (ASAN imza və s.) və dövlət sistemlərində qeydiyyat. İndiki "təsdiq" daxili və hash ilə saxlanır, amma qanuni e-imza deyil.
- Turniket inteqrasiyası.
- Bir neçə xarici iş saytına eyni anda vakansiya yerləşdirmə.
- Real kart ödənişi (paketlər).
- Mobil push bildiriş.

## 4. Canlı mühitdə hələ yoxlanmayıb

Lokalda və API ilə yoxlanıb, canlıda mən yoxlamamışam:

- Son miqrasiyalar (0091–0096): deploy iş axını hər deploy-dan əvvəl `wrangler d1 migrations apply --remote` işlədir və deploy-lar uğurla bitib, yəni tətbiq olunmalıdır. Canlı bazanı özüm sorğulamamışam. İlk açılışda xəta çıxsa, bu bölmələrə baxın: Qrup (holdinq), Əməyin mühafizəsi, Qaydalar və razılıq, Davamiyyət ayarları, işçi şəkli, Bacarıq matrisi.
- Gündəlik cron işləri (gələcək tarixli əmrlərin tətbiqi, təbriklər).
- İşçi tərəfin bəzi ekranları brauzerdə (yalnız API ilə yoxlanıb): "Təhvil aldım", "Qaydalar və təhlükəsizlik", kolleqa ad günləri.
- Hər əmr növü brauzerdə ayrıca sınanmayıb (məzuniyyət və işə qəbul sınanıb).
- Real brauzerdə GPS (məkan yoxlaması).

## 5. İnkişaf etdirmək olar (istəsəniz)

Mühüm olan, amma hələ edilməyənlər:

1. **Pilot sınaq:** 1–2 real şirkət və bir neçə işçi ilə canlıda yoxlama; ən çox xətanı bu tapar.
2. **Excel idxalı olmayan bölmələr:** sorğular (anketlər) və sənəd reyestrində müddətlər. (Ezamiyyət və elanlar üçün idxal var: İnkişaf və kommunikasiya → Ezamiyyət / Elanlar → “Excel-dən yüklə”.)
3. **Əmrlərin kartda təsiri:** müqavilə uzatma (kartda “Müqavilə: tarixədək”), iş rejimi (kartda “İş rejimi”) artıq kartı dəyişir, geri qaytarmaq olur və müqavilə 30 gün ərzində bitəndə “Bu gün” panelində xəbərdarlıq çıxır. Əvəzetmə və intizam əmrləri müvəqqəti/tənbeh xarakterli olduğu üçün yalnız kartın tarixçəsinə yazılır (bilərəkdən).
4. **Şəkil:** işçilər siyahısında göstərilir (yalnız şəxsi məlumat icazəsi olanlara, sətir ekrana çıxanda yüklənir); təşkilat sxemində hələ göstərilmir (yük və məxfilik səbəbi ilə).
5. **Avtomatik brauzer testləri:** `npm test` kod səviyyəsində testlərdir. Əsas ekranlar üçün brauzer smoke testi də var: `npm run e2e` (lokal serveri açın, `npm i --no-save playwright-core` quraşdırın; namizəd və işəgötürən hesabları ilə vakansiyalar, müsahibələr, təsdiqlər və vakansiya panelini yoxlayır). Hələ yalnız 6 yoxlamadır və avtomatik (CI) işə düşmür: tam ekran testləri hələ yoxdur.

## 6. Mən nəyi seçməyi tövsiyə edirəm

Əvvəlcə 2-ci bölmədəki 1, 2 və 5-ci maddələri həll edin (`DATA_KEY`, hüquqşünas, ad günü qərarı), sonra 4-cü bölmə üzrə canlıda 15 dəqiqəlik baxış keçin, sonra pilot.

## 7. `DATA_KEY` açarını necə qoymalı (5 dəqiqə)

Bunu mən edə bilmirəm: Cloudflare-ə və GitHub secret-lərinə girişim yoxdur. Siz edin:

1. **Açar yaradın** (öz kompüterinizdə, terminalda): `openssl rand -base64 32`. Çıxan sətir açardır (ən azı 16 simvol olmalıdır).
2. **Açarın surətini təhlükəsiz yerdə saxlayın** (parol meneceri). Açar itərsə, şifrələnmiş FİN, vəsiqə, IBAN, kart məlumatları **bərpa olunmur**. Açarı sonradan dəyişmək də olmaz: dəyişdirmə proseduru (yenidən şifrələmə) hələ yoxdur, köhnə məlumat bağlı qalar. Ona görə bir dəfə seçin və saxlayın.
3. **Cloudflare-də secret kimi qoyun:** Cloudflare paneli → Workers & Pages → `joblink-career` → Settings → Variables and Secrets → Add → növ **Secret**, ad `DATA_KEY`, dəyər: açar → Deploy. (Terminalda eyni iş: `npx wrangler secret put DATA_KEY --config wrangler.external.json`.) Növ mütləq "Secret" olmalıdır, adi dəyişən deploy zamanı silinə bilər.
4. **Saytda yoxlayın:** Şirkət məlumatları səhifəsində "Şəxsi məlumatların şifrələnməsi" qutusunda "Açar: qoyulub" yazmalıdır. Sonra "Açıq məlumatları indi şifrələ" düyməsini basın: mövcud işçilərin məlumatı şifrələnir. Yeni yazılanlar avtomatik şifrələnir.
5. Sınaq: bir işçinin kartında FİN-i açın (görünməlidir), sonra təsdiq edin ki, qutuda "şifrələnmiş profil" sayı artıb.

Qeyd: açar qoyulmayana qədər hər şey əvvəlki kimi işləyir, yəni bu addım təhlükəsizlik üçündür, sayt onsuz da dayanmır.

## 8. Rəsmi gündəlik ezamiyyət cədvəli (hazırdır)

Mənbə: sizin yüklədiyiniz Nazirlər Kabinetinin 25.01.2008-ci il 14 nömrəli qərarı, 26.10.2026-cı il dəyişikliklərinədək birləşdirilmiş mətn (106 xarici ölkə).

- **Azərbaycan daxilində:** Bakı 125, Naxçıvan 100, Gəncə və Sumqayıt 95, digər şəhər, rayon mərkəzi, qəsəbə və kənd 90 AZN. Gündəlik boş qalanda təyinata görə avtomatik yazılır.
- **Xarici ölkələr:** ölkə və ayrıca şəhər üzrə norma (məsələn Rusiya 170, Moskva və Sankt-Peterburq 260 ABŞ dolları; Türkiyə 180, Ankara 200, İstanbul 220 avro). Norma xarici valyutadadır: AZN-ə çevirmək üçün **Ezamiyyət → Gündəlik normalar və məzənnə**də ezamiyyət tarixinə Mərkəzi Bankın rəsmi məzənnəsini (USD, EUR, GBP, JPY) siz yazırsınız; məzənnə yoxdursa gündəliyi əllə yazırsınız.
- Ezamiyyət formasında təyinat yazılan kimi rəsmi norma göstərilir və bir kliklə gündəliyə yazılır. "Rəsmi norma cədvəli" düyməsi bütün ölkələri axtarışla göstərir.
- Norma mehmanxana (70%) və gündəlik xərcləri əhatə edir; ölkə daxilində mehmanxana sənədi yoxdursa mehmanxana hissəsinin 50%-i ödənilir; yol xərci sənədlərə görə ayrıca.
- Rəsmi cədvəldə tapılmayan yer üçün şirkətin əvvəlki ümumi norması qalır.
- Rəhbər işçilər üçün 2 nömrəli əlavə (əlavə faizlər, biznes klass nəqliyyat) proqrama daxil edilməyib: bu, yalnız dövlət rəhbər vəzifələrinə aiddir.

## 9. Əmək haqqı hesablama iş kitabı (Excel)

Əmək haqqı → **"Hesablama iş kitabı (Excel)"** düyməsi seçilmiş ay üçün formullu çoxvərəqli fayl yükləyir: İşçilər, Azad olmalar (məzuniyyət, xəstəlik, ezamiyyət və s. aralıqlar), Tabel (aralıqlardan avtomatik doldurulan davamiyyət cədvəli), Əlavə-Tutulma (mükafat, əlavə, tutulma, avans), Saatlar, Ezamiyyət (qanunun normaları + Mərkəzi Bankın məzənnəsi), Hesablama, Parametrlər, Normlar, Məzənnə, Güzəştlər, Kodlar, Köməkçi.

**Hesablama vərəqi** platformanın qaydalarını izləyir: gross, vergi və sığorta, xalis, tutulma həddi (20/50/70%), avans, ödəniləcək məbləğ, işəgötürən xərci, məzuniyyət haqqı (orta əmək haqqı), xitamda məzuniyyət kompensasiyası, boşdayanma, artıq iş və gecə əlavəsi, **sığorta müavinəti** (faiz, minimum pensiyanın 25 qatı ilə hədd, 6 aylıq staj şərti), **ay ərzində maaş dəyişikliyi** (günlərə görə çəkili orta), **vergi güzəşti** siyahıdan seçimi (+ 3-dən çox himayə), məzuniyyət və müavinət **təqvim günləri platformanın qaydası ilə** (hissəli məzuniyyət də dəqiqdir). Testlər faylı LibreOffice ilə yenidən hesablayıb platformanın nəticəsi ilə müqayisə edir (`tests/payroll-workbook.test.mjs`).

**"Excel iş kitabından yüklə"** önizləmə göstərir, sonra platformanın öz qaydaları ilə yazır (təsdiqlənmiş ay dəyişdirilmir):
- Azad olmalar → davamiyyət; mükafat, əlavə (adları ilə), tutulma; saatlar (ay yekunu); ezamiyyətlər (əl ilə yazılmış gündəlik saxlanır, boşdursa platforma qanunun normasından və başlama gününün məzənnəsindən hesablayır).
- **Yeni avans:** "Avansın ödəniş tarixi" doldurulmuş sətir ödəniş kimi qeyd olunur (avans günü və limitlər platformada yoxlanır). Tarixsiz sətirlər artıq qeyd olunmuş avanslardır, yenidən yazılmır.
- **Maaş dəyişikliyi:** İşçilər vərəqində "Yeni maaş" + "Dəyişmə tarixi" imzaya gedən əmr kimi yaradılır (direktor tapılmasa yaradılmır). Eyni əmr təkrar yaradılmır.
- Təyinat qanunun cədvəlində olmayan ezamiyyət sətri yüklənmir və səbəbi göstərilir.

Qalan məhdudiyyətlər: Microsoft Excel-də açılış mən tərəfindən sınanmayıb (fayl LibreOffice və openpyxl ilə yoxlanıb, formulların uzunluğu və dərinliyi Excel hədləri daxilindədir). Sığorta müavinətinin ödənilməsi sığortaçı tərəfindəndir və iş kitabında yalnız hesablanır.

**FİN:** iş kitabının işçi siyahısı göstərən bütün vərəqlərində (Tabel, Azad olmalar, Əlavə-Tutulma, Saatlar, Ezamiyyət, Hesablama) ad yanında FİN göstərilir (İşçilər vərəqindən avtomatik gəlir) və platformaya yükləmədə işçi FİN ilə tapılır. Platformanın qaydası: FİN yazılıbsa, işçi yalnız həmin FİN ilə tapılır; kartda olmayan və ya səhv FİN olan sətir yüklənmir.

## 10. Qalanlar və səbəbləri (2026-11-07 yekunu)

Mənim tərəfimdən bağlana bilənlərin hamısı bağlanıb. Aşağıdakılar qalır; hər birinin səbəbi və sizdən nə lazım olduğu yazılıb.

| Qalan | Səbəb | Sizdən nə lazımdır |
|---|---|---|
| AI funksiyaları canlıda 502 verir | AI provayderi açarı/balansı (OPENAI_API_KEY) canlıda işləmir; kod tərəfi hazırdır | Cloudflare secret-i yoxlayın / balansı artırın |
| E-poçt göndərilmə | `EMAIL_FROM` və `RESEND_API_KEY` secret-lərinin qoyulduğunu mən görə bilmirəm | Secret-ləri qoyun, sonra test bildirişi göndərin |
| `DATA_KEY` | Qoyulmasa şəxsi məlumatlar şifrələnmir | Cloudflare secret kimi əlavə edin |
| Microsoft Excel-də hesablama iş kitabı | Yalnız LibreOffice və openpyxl ilə yoxlanıb; real Excel mənim mühitimdə yoxdur | Faylı Excel-də açıb bir ayı müqayisə edin |
| Böyük şirkət (min-minlərlə işçi) üçün təşkilat sxemi | Sxem bütün işçiləri bir dəfəyə yükləyir, 10 000 işçidə yavaş olar | "Edək" deyin: şöbə sayları + 20-20 açılma + axtarış |
| Telefon görünüşü | Əsas səhifələr və yan menyu yoxlanıb və düzəldilib; hər bölmənin cədvəlləri telefonda tək-tək yoxlanmayıb | Pilot zamanı problemli ekranları göndərin |
| Hüquqi yoxlama | Şablon mətnlər, saxlama illəri, ezamiyyət normaları hüquqşünas baxışı tələb edir | Hüquqşünasa göstərin |
| ZZ-TEST məlumatları | Canlıda yoxlama üçün yaradılıb (hesablar, avans, məzuniyyət, maaş əmri) | İctimai açılışdan əvvəl silinməlidir (silməyə icazəniz var, deyin silim) |
| Xarici müqavilə tələb edənlər | Bank API, qanuni e-imza, turniket, push bildiriş, kart ödənişi | Bölmə 3-də |

## 11. Filiallar (2026-11-11)

Menyuda **Filiallar** (Kadr rejimi). Bir işçi bir neçə filialda işləyə bilər; hər filialda öz vəzifəsi yazılır (məs. A filialında baş mühasib, B filialında mühasib).

- **Maaş bölgüsü:** bir neçə filialda işləyənin maaşı və işəgötürən xərci filial sayına görə bərabər, filialların satışına görə, ya da işçi-filial sətrində əl ilə yazılmış faizlə bölünür. Bölgü Əmək haqqı → «Filiallar üzrə bölgü» hesabatında görünür (Excel-ə də çıxır). Vergi və ödəniş işçinin bir haqq-hesabı üzərindən gedir, bölgü yalnız xərc bölgüsüdür.
- **Satış limiti və bonus:** hər filial üçün ay üzrə satış limiti və satış, bir də bonus qaydası (sabit məbləğ və ya filiala düşən maaşın faizi; 100 = maaşın özü qədər). Satış limitə çatanda və ya keçəndə bonus işçinin əmək haqqına mükafat kimi avtomatik əlavə olunur (gəlir vergisi və sığorta ilə). Təsdiqlənmiş ayın satışı dəyişmir.
- **Excel:** Filiallar səhifəsində ixrac, nümunə fayl və yükləmə (Filiallar, İşçi-filial, Satış və bonus, Bölgü). Hesablama iş kitabında da «Filiallar» və «İşçi-filial» vərəqləri var; bonus və pay formullarla hesablanır, «Mükafat»a əlavə olunur və fayl platformaya geri yüklənir.
- **Hələ yoxdur:** pilləli bonus (limiti nə qədər aşdıqca artan), işçi siyahısında filial sütunu, satışın avtomatik gəlməsi (satış cədvəli əl ilə və ya Excel ilə yazılır).
