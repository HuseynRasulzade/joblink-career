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

1. **Pilot sınaq:** 1–2 real şirkət və bir neçə işçi ilə canlıda yoxlama; ən çox xətanı bu tapar. (Bunu yalnız siz edə bilərsiniz; mən ZZ-TEST hesabları ilə yoxlayıram.)
2. ~~Excel idxalı olmayan bölmələr~~ **hazırdır:** sorğular (İnkişaf və kommunikasiya → Elanlar və sorğular → «Excel-dən yüklə») və sənəd müddətləri (Kadr əməliyyatları → Sənəd reyestri → «Müddətləri Excel-dən yüklə»). Sənəd müddəti faylı yalnız artıq işçinin qovluğunda olan sənədin bitmə tarixini yazır.
3. **Əmrlərin kartda təsiri:** müqavilə uzatma və iş rejimi kartı dəyişir, geri qaytarılır; müqavilə 30 gün ərzində bitəndə «Bu gün» panelində xəbərdarlıq çıxır. Əvəzetmə və intizam əmrləri müvəqqəti/tənbeh xarakterli olduğu üçün yalnız kartın tarixçəsinə yazılır (bilərəkdən).
4. ~~Şəkil təşkilat sxemində~~ **hazırdır:** şəxsi məlumat icazəsi olanlar üçün sxemdə hər işçi kartında şəkil görünür (şəkil yalnız kart ekrana gələndə yüklənir); icazəsi olmayana göstərilmir.
5. ~~Avtomatik brauzer testləri~~ **genişləndirildi:** `npm run e2e` indi 56 yoxlamadır: hər iki panelin hər menyu bəndi və hər sekməsi açılır, script xətası, 5xx cavab və «Sorğu tamamlanmadı» mesajı axtarılır; Plan və fakt, Filiallar və təşkilat sxemi adla yoxlanır. GitHub Actions-da deploy-dan sonra avtomatik işləyir, amma yalnız repo secret-ləri qoyulanda: `E2E_EMPLOYER_EMAIL`, `E2E_CANDIDATE_EMAIL`, `E2E_PASSWORD` (Settings → Secrets and variables → Actions). Qoyulmayıbsa addımı keçir və səbəbini yazır. Lokal: `E2E_BASE_URL`, həmin hesablar və `npm i --no-save playwright-core` ilə, ya da hazır sessiya cookie-si ilə (`E2E_COOKIE_EMPLOYER`, `E2E_COOKIE_CANDIDATE`). AI provayderi uğursuz olanda (502) test bunu ekran xətası saymır.

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

## 12. Filial → departament → şöbə → vəzifə (2026-11-11)

- **Filial yalnız Ştat cədvəlindən yaranır.** Ştat sətrində «Filial» sahəsi var (boş = şirkət üzrə); orada yazılan ad filial kimi Filiallar bölməsində özü görünür. Filiallar bölməsində «+ Filial» yoxdur: orada yalnız kod, şəhər, aktivlik, adı dəyişmək (ştatın bütün sətirlərində dəyişir) və bonus qaydası var. Ştat sətri olan filialı silmək olmur. Excel ilə ştat yükləyəndə də «Filial» sütunu var.
- **Hierarxiya:** filial → departament → şöbə → vəzifə. Ştat cədvəli indi filial üzrə qruplanır; Filiallar → «Struktur» sekməsi ağacı və hər vəzifədə kimin işlədiyini göstərir.
- **İşçi kartında:** «Filiallar» bölməsi: işçini bir neçə filiala bağlamaq, hər biri üçün filialın ştatından departament, şöbə və vəzifə seçmək. Departament, şöbə və vəzifə siyahıları artıq ştat cədvəlindən gəlir (kartda yeni ad yaradılmır).
- **Ştat sayı filiala görə:** filialın ştat sətri yalnız həmin filialda işləyənləri sayır.
- **Təşkilat sxemi:** «Filial» seçimi ilə bir filialın ağacı çəkilir (şirkət › filial › departament › şöbə › işçi).
- **Vakansiya yoxlaması filialı bilir:** vakansiyada «Filial» seçilir, ştatda yer, departament və vəzifə həmin filialın sətirlərinə görə yoxlanır; ştatda olmayan filial rədd edilir.

## 13. Vəzifə, maaş, departament, şöbə və filial dəyişikliyi (2026-11-11)

- **Harada:** Kadr rejimi → «Kadr hadisəsi» (və ya işçinin əmrləri) → «Başqa vəzifəyə, departamentə, şöbəyə və ya filiala keçirmə» əmri; maaş artımı/azalması üçün «Əmək haqqının dəyişdirilməsi» əmri. Hər ikisində tarix yazılır (keçmiş, bu gün və ya gələcək).
- **Əmr imzalananda kart özü dəyişir:** vəzifə, departament, şöbə, maaş (maaş tarixçəsinə sətir düşür), filial (köhnə filial bağlantısı həmin tarixdən bir gün əvvəl bitir, yenisi həmin gündən başlayır). Kartın tarixçəsində hər dəyişiklik görünür. Gələcək tarixli dəyişiklik həmin gün çatanda tətbiq olunur. «Geri qaytar» düyməsi hamısını (filial bağlantıları daxil) əvvəlki vəziyyətə qaytarır.
- **Ad və şöbə siyahıları ştat cədvəlindən gəlir.** Ştatda olmayan filial seçilsə dəyişiklik tətbiq olunmur, səbəbi əmrin yanında yazılır.
- **Maaşın filiallara bölünməsi ay ərzində keçiddə:** məsələn ayda 20 iş günü var, işçi 15 gün A filialında, 5 gün B filialında işləyib: maaş (gross, xalis, işəgötürən xərci) 75% / 25% bölünür. Gün sayı istehsalat təqviminə görə (bayram və istirahət günləri çıxılır). Əl ilə pay % yazılıbsa o üstün olur. Maaş artımı ay ortasında olarsa, mövcud qaydada aylıq maaş iş günlərinə görə orta götürülür.
- **Excel:** hesablama iş kitabının «İşçi-filial» vərəqində Başlama/Bitmə tarixləri və yeni «Filialda iş günü» sütunu var; «Pay (hesablanan)» formulu bu günlərə görə bölür (LibreOffice-də platforma ilə eyni nəticə verir). Maaş dəyişikliyi sütunları («Yeni maaş» + «Dəyişmə tarixi») əvvəlki kimi əmr kimi yüklənir.
- **Hələ yoxdur:** Excel faylı ilə vəzifə/departament/şöbə/filial dəyişikliyi (yalnız maaş dəyişikliyi Excel-dən yüklənir); bonus filial dəyişəndə günə görə bölünmür (satış limitinə çatan filialın bonusu həmin filialda işlədiyi dövrə yox, aylıq maaşın payına görə hesablanır).

## 14. AI-nin CV və vakansiya tərəfləri (2026-11-12)

- **İki ayrı tərəf:** «CV» (namizədin CV ilə işi: oxuma, analiz, yenidən yazma, uyğunluq, karyera məsləhəti, AI köməkçi) və «Vakansiya» (işəgötürənin işi: vakansiya layihəsi, namizəd sıralaması, test və sənəd oxuma, vəzifə adı uyğunlaşdırma). Hər AI çağırışı öz tərəfinə yazılır.
- **Ayrı limit və xərc:** Admin → AI limiti bölməsində hər tərəf üçün ayrıca aylıq dollar limiti və cari xərc var. Biri dolanda yalnız o tərəfin AI-si dayanır (qaydalarla hesablanmış nəticə göstərilir), digəri işləyir. Ümumi limit əvvəlki kimi qalır və hər ikisinə şamil olur.
- **Ayrı model (istəyə görə):** Cloudflare dəyişənləri `OPENAI_MODEL_CV` və `OPENAI_MODEL_VACANCY`; boşdursa `OPENAI_MODEL` (ya da `gpt-5.2`). Məsələn CV oxuma üçün ucuz, vakansiya üçün güclü model qoymaq olar.
- **Ayrı açar/provayder hələ yoxdur:** hər iki tərəf eyni `OPENAI_API_KEY` ilə işləyir; ayrı faktura lazımdırsa ayrı açar əlavə etmək lazımdır.

## 15. AI bir dəfə baxır, nəticə yaddaşda qalır (2026-11-14)

- **HR namizəd sıralaması:** hər namizədin balını AI hesablayır (əvvəlki ilk 40 limiti götürülüb, hovuz 300 namizədədək). Nəticə (bal, güclü/zəif tərəflər, tövsiyə) daimi saxlanır (400 gün istifadə olunmayana qədər), 30 günlük silinmə yoxdur. Uzun siyahı 96-96 hissələrlə hesablanır; hər hissə saxlanır, səhifə qalanını özü istəyir.
- **AI yenidən yalnız məzmun dəyişəndə baxır:** vakansiyanın tələbləri, bacarıqları, sertifikatları, minimum ili, vəzifə adı, kateqoriya, maaş və təsviri; namizədin təcrübəsi, təhsili, bacarığı, sertifikatı; yeni cüt; və ya qayda/prompt versiyası (bu halda köhnə nəticə dərhal silinmir, baxılanda yenilənir). Boşluq, böyük-kiçik hərf, durğu işarəsi, son tarix, ünvan, telefon və təcrübə ilinin gündəlik artımı (yarım il addımla) dəyişiklik sayılmır.
- **Namizəd tərəfi:** vakansiya uyğunluğu (`rank-jobs`) əvvəl də saxlanırdı, indi onun hash-i də eyni normallaşdırmadan keçir. CV analizi, uyğunluq rəyi, profil xülasəsi və CV yenidən yazma da «CV dəyişənə qədər» saxlanır.
- **Sayğac:** Admin → AI istifadəsi bölməsində «Yaddaşdan verilib» sətri: AI-yə getməyən sorğu sayı və bütün sorğuların neçə faizi.
- **Bir dəfəlik təsir:** hash qaydası dəyişdiyi üçün bu yenilənmədən əvvəl saxlanmış nəticələr bir dəfə yenidən hesablanacaq; bundan sonra təkrar olmayacaq.
- **Hələ ayrıca analiz olunur:** namizədin öz uyğunluq balı (`rank-jobs`) ilə işəgötürənin gördüyü bal ayrı AI çağırışlarıdır (ayrı prompt, ayrı saxlama). Birləşdirmək ayrıca qərardır.

## 16. Namizəd qiymətləndirməsi kodla, AI düymə ilə (2026-11-14)

- **«Uyğun namizədlər» artıq yalnız platformanın öz qaydaları ilə qiymətləndirilir.** AI səhifə açılanda özü işləmir. Vakansiyanın üstündəki **«AI analizi hesabla»** düyməsi (AI açıqdırsa) namizədləri anonim şəkildə AI ilə analiz edir; nəticə saxlanır, dəyişməyənlər təkrar analiz olunmur. AI kodu silinməyib.
- **Yeni qayda: «işin növü» (`lib/role-function.ts`).** Eyni sahədə işləmək kifayət deyil: mühasibat uçotu aparmaq ilə maliyyə hesabatı hazırlamaq eyni iş deyil (hesabat uçotdan sonra gəlir). Sistem hər CV-dən və vakansiyadan hansı işin gördüyünü çıxarır (uçot, əmək haqqı, hesabat, vergi, audit, büdcə, xəzinə, maliyyə analizi, kredit; İT: backend, frontend, mobil, DevOps, data, test, dəstək; satış, marketinq, hüquq, satınalma, anbar, logistika, kadr, zəng mərkəzi) və yaxın işlərə qismən bal verir (məsələn uçot → hesabat 0.5). Vakansiyanın əsas işi namizədin gördüyü işlə üst-üstə düşmürsə: bal ən çox 74 (az üst-üstə düşəndə 62), səbəb işəgötürənə yazılır («Eyni sahədə işləyib, amma vakansiyanın əsas işi “…” üzrə təcrübəsi görünmür: əsasən “…” ilə məşğul olub») və yeni «İşin növü» hissəsi görünür.
- **Hədləri:** bu qayda AI-nin dəqiqliyinə bərabər deyil. Yalnız yuxarıdakı sahələrdə yazılmış söz nümunələri ilə işləyir; tanımadığı sahədə köhnə qaydalar qalır. AI ilə uyğunluq faizi hələ ölçülməyib.

- **Düzəliş (2026-11-14):** «Uyğun namizədlər» bölməsində AI düyməsi və AI balı **yoxdur**: bölmə yalnız kodla qiymətləndirilir, sıralama da yalnız kod balına görədir. «AI analizi hesabla» düyməsi yalnız «Müraciət edənlər» bölməsində qalır. «İşin növü» qaydasında vakansiyanın işi başlıqda adlanmayıbsa mətndə aydın (3+ bal) olmalıdır: biznes analitikin tələblərindəki bir API/SQL qeydi onu developer vakansiyası etmir.

## 17. «Uyğun namizədlər»: mesaj və müraciət dəvəti (2026-11-14)

- Kartlarda «Müsahibəyə dəvət et» yerinə **«Mesaj yaz»** düyməsi var (kartda və «Ətraflı» pəncərəsində). O, Mesajlar bölməsini açır; mətn hazırdır («təcrübəniz “vakansiya” üzrə tələblərə uyğun görünür, zəhmət olmasa müraciət edin…»), işəgötürən dəyişə bilər.
- Mesaj **həmin vakansiyaya bağlı** söhbət kimi göndərilir və açıq (yayımlanmış) vakansiya tələb olunur; namizədə «Vakansiyaya müraciət dəvəti» bildirişi gedir.
- **Namizəd tərəfi:** söhbətin üstündə «Şirkət sizi “…” vakansiyasına müraciətə dəvət edib» və **«Vakansiyaya bax və müraciət et»** düyməsi (vakansiyanın öz səhifəsini açır); müraciət edibsə «müraciət etmisiniz ✓»; vakansiya bağlanıbsa bu yazılır.
- **İşəgötürən tərəfi:** söhbətin üstündə «Namizəd müraciət edib ✓» və ya «hələ müraciət etməyib» görünür.
- Bu bölmədə toplu «Dəvət üçün seç» işarəsi götürüldü (müsahibə dəvəti «Müraciət edənlər» bölməsində qalır).

## 18. Şəxsi kod, status axını, ödəniş, kod quruluşu (2026-11-16)

- **Şəxsi kod:** hər namizəd və şirkət oxunaqlı kod alır (`lib/public-code.ts`); axtarışda kodla tapmaq olur.
- **Status axını:** namizədin statusu əllə seçilmir, müsahibə mərhələsinə və sənədlərə bağlıdır (`lib/application-flow.ts`); server qaydaları pozan keçidi 409 ilə rədd edir. Vaxtı keçmiş müsahibələr avtomatik tamamlanır (`lib/interview-auto.ts`, 30 dəqiqəlik cron).
- **Ödəniş:** provayder boşdursa bağlıdır; sandbox bankı yoxlanıb (rədd → pulsuz qalır, təsdiq → paket + müqavilə + ödəniş sətri). Real ABB üçün müqavilə rekvizitləri lazımdır (kodla həll olunmur). Ətraflı: `docs/PACKAGES.md`.
- **İzləmə:** API cavablarında `Server-Timing` (sorğu sayı və vaxt); yavaş (>2,5 san, >25 sorğu) və 5xx cavablar Worker jurnalına yazılır. 10 dəqiqədə 5 və artıq 5xx olarsa bütün adminlərə «Server xətaları» bildirişi gedir (saatda ən çox bir dəfə; `lib/alerts.ts`, cədvəl `server_errors`).
- **Təhlükəsizlik:** CSP skript siyasəti **report-only** rejimindədir (heç nə bloklanmır; pozuntular `/api/csp-report` vasitəsilə Worker jurnalına yazılır). Jurnalda real pozuntu qalmayanda bloklayan siyasətə keçirilməlidir. Admin 2FA: panel xəbərdarlıq göstərir; hamı quranda `ADMIN_2FA_REQUIRED=1` ilə məcburi edilir (əvvəl etsəniz 2FA-sız admin girişdən çıxa bilər).
- **Kod quruluşu:** `app/api/joblink/[...path]/route.ts` 24 079 sətirdən 3 147-yə endi. Handlerlər `lib/api/handlers/<ad>-NN.ts` (78 fayl), ortaq köməkçilər `lib/api/shared.ts`, tiplər `lib/api/ctx.ts`. Yeni endpoint uyğun handler faylına əlavə edilir; `tests/route-paths.test.mjs` hər faylın çağırıldığını yoxlayır.
- **Hələ mənim əlimdə olmayanlar:** ABB müqaviləsi/rekvizitləri, öz domen, müqavilə mətninin hüquqşünas yoxlaması, real istifadəçi pilotu, sınaq məlumatlarının (ZZ-TEST hesabları, `sirket-demo`) açılışdan əvvəl silinməsi, CI e2e üçün repo secret-ləri.

## 19. Tam yoxlama və satışa hazırlıq qeydləri (2026-11-16)

- **Hüquqi səhifələr:** `/privacy` (məxfilik siyasəti) və `/terms` (istifadə şərtləri) əlavə olundu, mətn `lib/legal-text.ts`-dədir (qaralama: hüquqşünas yoxlamalıdır). Qeydiyyatda razılıq qutusu var və server razılıq olmadan 400 qaytarır. Operatorun adı, VÖEN, ünvan və e-poçt `PLATFORM_LEGAL_NAME`, `PLATFORM_VOEN`, `PLATFORM_ADDRESS`, `PLATFORM_EMAIL` dəyişənlərindən götürülür; satışdan əvvəl doldurulmalıdır.
- **Yoxlanılanlar (yerli, 4 rol):** 561 endpoint × GET/POST × 3 rol (admin, şirkət, namizəd) boş sorğu ilə 5xx axtarışı; hər rolun bütün menyuları brauzerlə; tam yol: qeydiyyat → profil → müraciət → müsahibə dəvəti → qəbul → iş təklifi → qəbul → işçi kartı avtomatik → «İş yerim» (məzuniyyət təklifi, təsdiq, giriş qeydi); admin: istifadəçini dayandırma/bərpa, vakansiya moderasiyası, siyahılar.
- **Düzəldilənlər:** formData tələb edən 3 endpoint (CV OCR, CV faylı, test bank qərarı) səhv formatda 500 yerinə 400 qaytarır; admin bacarıq kataloqunda təkrar React açarı.
- **Bağlandı (2026-11-17):** «Müsahibə» statusundan birbaşa «İşə qəbul» yalnız keçirilmiş (tamamlanmış) müsahibə və ya təhvil verilmiş test varsa mümkündür; yoxsa server 409 qaytarır. İş təklifinin qəbulu ilə işə qəbul bu qayda ilə bağlı deyil.

## 20. İşçi sayı planında ştat planını qurmaq (2026-11-17)

- «Plan və fakt → İşçi sayı planı» səhifəsinin yuxarısında **«Ştat planını qur»** bölməsi var: filial (boş = baş ofis), departament, şöbə, vəzifə, ştatın növü (tam / 3/4 / yarım / 1/4), işçi sayı və maaş həddi (min–maks). «Plana əlavə et» sətri birbaşa **Ştat cədvəlinə** yazır (eyni `staff_units` sətirləri, eyni yoxlamalar: maaş həddi, plan kilidi və direktor təsdiqi).
- Bölmənin altında plandakı bütün sətirlər, cəmi nəfər, tam ştat vahidi və aylıq maaş həddi görünür; «Cəmi … dekabr hədəfi kimi yaz» ştat cəmini ilin dekabr hədəfi edir, sonra aşağıdakı «Bərabər paylaşdır» ilə aylara bölünür.
- Ştat cədvəli (Filial → Departament → Şöbə → Vəzifə) bu sətirlərdən qurulur: plan, ştat növü, maaş həddi, işləyənlər, boş yerlər və «Vakansiya yarat».
- **Say limiti (2026-11-17):** ştat sətri yazıldıqdan sonra həmin departament/şöbə/vəzifə üçün yer qalmayıbsa, yeni işçi əlavə etmək (əl ilə), iş təklifi göndərmək (gözləyən təkliflər də yer tutur), işə qəbul etmək və Excel idxalı 409 ilə rədd olunur (`placeProblem`, `assertStaffPlace`). Cədvəldə adı olmayan vəzifə məhdudlaşmır. Maaş həddi qaydası əvvəlki kimi qalır (əl ilə, təklif, idxal, vakansiya).

## 21. Plan xətti təsdiqlənmiş büdcədən; say limiti sərtləşdi (2026-11-17)

- «İşçi sayı planı» səhifəsində aylıq hədəf yazmaq bölməsi **ləğv edildi**. Qrafikdəki narıncı plan xətti həmin ilin **təsdiqlənmiş planının** ştat cəmidir (hər ay eyni rəqəm); plan təsdiqlənməyibsə xətt yoxdur. Planı təsdiqə göndərmək üçün büdcə və ya ştat sətri olması kifayətdir (`company/plan-fact/submit` ştat sətirlərini də sayır).
- **Plana yazılmamış vəzifə:** ştat cədvəlində sətir varsa, orada adı olmayan vəzifəyə işçi götürmək olmur (əl ilə, təklif, işə qəbul, Excel). Cədvəli hələ boş olan şirkət məhdudlaşmır.
- **Say artırmaq:** eyni filial, departament, şöbə və vəzifə yenidən yazılanda yeni sətir yaranmır, mövcud sətir yenilənir; qurucuda hər sətirdə «Düzəlt» və «Sil» var.
- Plan kilidlidirsə (təsdiqlənibsə), dəyişiklik direktorun təsdiqinə gedir: bu, nəzarət üçün qalır.

## 22. «Plandan kənar» bölməsi (2026-11-17)

- «Plan və fakt → Plandan kənar»: üç növ sorğu, hamısında **səbəb məcburidir**: (1) plandan kənar işçi yeri (mövcud sətrə +N və ya yeni sətir), (2) ştat sətrinin maaş həddi artımı, (3) bir işçinin maaşının həddən kənara qaldırılması.
- Direktor (yeri/həddi) dərhal tətbiq edir, qalanlar üçün sorğu **Təsdiqlər** bölməsinə gedir; işçi maaş artımı həmişə təsdiqlə olur (təsdiq maaş həddini yoxlamır, istisna məhz budur; hədd də artırılmasa işçi ştat cədvəlində «həddən yuxarı» görünür). Bütün sorğular (tətbiq olunanlar da) bölmənin siyahısında saxlanır. Server: `company/staff/exception`, `company/staff/exceptions`.
- Say və maaş həddi rədd mesajları bu bölməyə yönəldir.

## 23. Plan və faktın genişlənməsi (2026-11-17)

- **Yerlərin tarixi:** ştat sətrində «nə vaxtdan» və «nə vaxta qədər» (ay). Plan xətti hər ay həmin ayda açıq yerlərin cəmidir (pilləli); gələcəkdə açılan yerə hələ işə qəbul olmur, müddəti bitmiş (layihə) yerə də. Migrasiya 0116.
- **Xərc:** hər sətirdə və cəmdə aylıq plan xərci (maaş həddi + işəgötürən payları, bu ay açıq yerlər üzrə) və faktiki işçilərin xərci.
- **Departament təklifi:** «Plandan kənar» bölməsində ayrıca növ; kim təklif edib qeyddə qalır, təsdiq/tətbiq eynidir. **Qeyd:** rəhbərin öz giriş səhifəsi yoxdur, təklifi HR yazır.
- **İlkin və yenilənmiş plan:** ilin ilk təsdiqində «ilkin» plan saxlanır (`plan_snapshots`), hər təsdiqdə «yenilənmiş» yenilənir; bölmədə ilkin plan, hazırkı plan və bu il plandan kənar sorğu sayı göstərilir.
- **Ssenari:** sətir və say seçilir, aylıq/illik əlavə xərc göstərilir.
- **Proqnoz:** növbəti 3 ayda gözlənilən çıxışlar (təyin olunmuş çıxış tarixi və ya müddətli müqavilənin sonu) və yerin orta dolma müddəti (vakansiyadan işçi kartına qədər).
- **Həftəlik xülasə:** bazar ertəsi direktor icazəli şəxslərə (daxili bildiriş və e-poçt) plandan ≥5% kənarlaşma və gözləyən sorğular; hər şey qaydasındadırsa göndərilmir (`lib/plan-digest.ts`, mövcud gündəlik cron).
- **Minimum əmək haqqı:** sətirin minimum maaşı 400 AZN-dən aşağıdırsa plan-fakt xəbərdarlığı çıxır.
- **Direktor hesabatı:** «Plandan kənar» bölməsində Excel (ştat planı, xülasə, sorğular).
- **Hələ edilməyib:** vəzifə daxilində maaş pillələri (junior/orta/böyük), ştatsız işçini bir kliklə sətrə bağlamaq, rəhbər üçün ayrıca təklif səhifəsi.

## 24. Rəhbər səhifəsi, maaş pillələri, bir kliklə yerləşdirmə (2026-11-17)

- **«Ehtiyac təklifi» səhifəsi** (Şöbə rəhbəri və digər komanda üzvləri; auditor görmür): departament, şöbə, vəzifə, pillə, neçə nəfər, ştat növü, tarix, maaş və məcburi səbəb. Rəhbər yalnız öz departamenti (Komanda və rollarda yazılmış) üçün göndərə bilər; ştat cədvəlini və maaşları görmür. Təklif həmişə Təsdiqlərə gedir, rəhbər yalnız öz təkliflərini və qərarı görür. Server: `company/proposals`.
- **Maaş pillələri:** ştat sətrində «Pillə» (Junior, Orta, Böyük, Rəhbər); eyni vəzifəyə müxtəlif pillə ayrı sətir və ayrı maaş həddi ilə yazılır. İşçi maaşı hansı pillənin həddinə düşürsə, ora yerləşir; iki pillənin arasındakı maaş rədd olunur. Migrasiya 0117.
- **Ştatda yeri olmayan işçi:** «Bir kliklə yerləşdir» (və «Hamısını yerləşdir»): işçinin departament, şöbə, vəzifə və maaşı ilə sətir açılır (eyni vəzifənin başqa sətri varsa onun pilləsi və ştat növü götürülür); plan kilidlidirsə təsdiqə gedir. Departamenti və ya vəzifəsi olmayan işçi üçün əvvəl kartı doldurmaq tələb olunur. Server: `company/staff/place-person`.

## 25. Plan və fakt Excel faylları (2026-11-17)

- **Plan və fakt faylı:** «İşçi sayı planı» (aylıq hədəf) vərəqi **«Ştat planı»** ilə əvəz olundu: Filial | Departament | Şöbə | Vəzifə | Pillə | Ştat sayı | Ştat dərəcəsi | Əmək haqqı | Maksimum əmək haqqı | Başlanğıc ay | Son ay | Qeyd. İxrac cari ştat sətirlərini yazır, yükləmə həmin sətirləri yeniləyir/əlavə edir (eyni filial, departament, şöbə, vəzifə, pillə = bir sətir). Maaş həddi yoxlanır; plan təsdiqlənibsə yükləmə direktorun təsdiqinə gedir. Köhnə «İşçi sayı planı» vərəqi oxunmur və bu barədə xəbərdarlıq çıxır.
- **Ştat cədvəli faylı** (şablon, idxal, XLSX ixracı): pillə, başlanğıc ay və son ay sütunları əlavə olundu; ixrac əvvəl «Filial» sütunu olmadığı üçün geri yüklənəndə filial itirdi, indi ixracın ilk 12 sütunu şablonla eynidir (yalnız oxunan əlavə sütunlar: işləyir, boş yer, FTE, aylıq xərc).
- Nümunə fayllar və təlimat vərəqləri yeni sütunları izah edir (pillə siyahısı, ay formatları, müvəqqəti yer).

## 26. Təsdiqlər və Ümumi baxış: plan əlaqəsi (2026-11-17)

- **Təsdiqlər:** ştat/plandan kənar sorğularının təfərrüatında indi sorğunun növü (plandan kənar yer, departament təklifi, maaş həddi artımı), səbəb, təklif edən, filial, pillə, say dəyişikliyi (məs. 3 → 5), ştatın növü, dövr və maaş həddi (indikinə qarşı) görünür. İşçi maaş artımında səbəb, vəzifənin ştat maaş həddi və yeni maaşın həddi aşıb-aşmadığı xəbərdarlığı göstərilir.
- **Ümumi baxış («Bu gün» siyahısı, Kadr rejimi):** ştatda yeri olmayan işçi, maaşı ştat həddindən kənar işçi, müddəti bitmiş müvəqqəti yerdə işçi, boş ştat yeri olub vakansiyası olmayan departamentlər, gözləyən plandan kənar sorğu/təklif, ilin planı təsdiqlənməyib, minimumdan aşağı maaş həddi.
- **Ümumi baxış (İşə qəbul rejimi, «Diqqət tələb edir»):** boş ştat yeri olan, amma vakansiya açılmayan departamentlər.
- Excel idxalının önizləmə pəncərələri (ştat cədvəli və plan-fakt faylı) brauzerdə yoxlandı: yeni sütunlar (filial, pillə, dövr) düzgün göstərilir.

## 27. Hesabatlar: ştat planı və təsdiq hesabatları (2026-11-17)

- **Yeni qrup «Ştat planı və fakt»:** Ştat planı sətir-sətir (filial, departament, şöbə, vəzifə, pillə, plan, faktiki, boş, dövr, maaş həddi, aylıq xərc), Ştat xərci plan/fakt (departament üzrə), Ştat uyğunsuzluqları (ştatsız və hədd kənarı), Plandan kənar sorğular və təkliflər (ilkin və hazırkı plan fərqi ilə), Gözlənilən çıxışlar, Yerin dolma müddəti.
- **Yeni qrup «Təsdiqlər və jurnal»:** Təsdiqlər (say, orta qərar müddəti, qərar verənlər), Şirkət əməliyyat jurnalı (icazəsi olanlar üçün).
- Hamısında Excel və çap var; serverdə iki yeni oxuma endpointi: `company/reports/expected-exits`, `company/reports/fill-time`.

## 28. Hesabatlar: müqayisə, qrafik, saxlanmış süzgəc, e-poçt, xarici alətlər (2026-11-17)

- **Hər hesabatda:** «Əvvəlki dövrlə müqayisə» (ay, il və ya tarix aralığı olan hesabatlarda; rəqəm sütunlarının yanında «əvvəlki dövr» və «dəyişiklik»), «Qrafik» (seçilən rəqəm sütunu üzrə ən böyük 15), 50 sətirlik səhifələmə (Excel hamısını yazır), «Süzgəcləri saxla» (öz adı ilə, hər istifadəçiyə ayrı), rəsmi çap/PDF şablonu (şirkət adı, tarix, süzgəclər, «Hazırladı / Yoxladı / Təsdiq etdi» imza yerləri). Excel və çap `company_audit`-ə yazılır (`report-export`, `report-print`); «Şirkət əməliyyat jurnalı»ndan axtarmaq olar.
- **Yeni hesabatlar:** Dövriyyə (səbəb və staj üzrə, ilk il faizi), İşə qəbul mərhələ müddəti və təklif qəbulu (+ bir işə qəbulun dəyəri), Əmək haqqı fondunun aylıq dəyişikliyi, Filial üzrə icmal, Gecikmə və erkən çıxış, Məzuniyyət öhdəliyi (təxmini: qalıq gün × aylıq maaş ÷ 30,4). Ad və çıxış səbəbi görünən hesabatlar yalnız «işçi məlumatı» icazəsi olanlara açıqdır.
- **E-poçtla göndəriş:** «Ştat planı sətir-sətir» hesabatı hər bazar ertəsi və ya ayın 1-i öz e-poçtunuza (mətn cədvəli kimi; qoşma yoxdur) gedir. Gündəlik cron işləyir (`lib/report-schedules.ts`).
- **Xarici alətlər:** Hesabatlar səhifəsinin altında açar yaradılır (bir dəfə göstərilir, bazada yalnız hash saxlanır, yenilənə/ləğv edilə bilər). `GET /api/report-feed/staff-plan` (başlıq `Authorization: Bearer AÇAR`) ştat planını CSV kimi verir (şəxsi ad və maaş yoxdur): Excel «From Web», Power BI «Web».
- Migrasiya 0118 (`report_saved`, `report_schedules`, `report_tokens`).

## 29. Arxa planda hesabat, İşçilər səhifəsi (2026-11-17)

- **Arxa planda hesabat:** ştat planı, işçi reyestri, dövriyyə, gözlənilən çıxışlar, dolma müddəti və əməliyyat jurnalı (5000 sətir) hesabatlarında «Arxa planda hazırla»: sorğu yalnız tapşırıq yazır (`report_jobs`), Worker cavab getdikdən sonra (`waitUntil`) hesabatı hazırlayır, nəticəni 7 gün saxlayır və bildiriş göndərir; Hesabatlar səhifəsinin altındakı «Hazır hesabatlar»da açılır (cədvəl, qrafik, müqayisə yox, Excel, çap). Eyni anda ən çoxu 3 tapşırıq, ən çoxu 20 000 sətir. Heç kim tapşırığı götürməsə (yerli işə salınma), ilk baxışda o hazırlanır. Migrasiya 0119.
- **Planlı e-poçt və həftəlik plan xülasəsi:** administrator üçün `admin/run-digests` indi `force` (hamısı indi), `dryRun` (göndərmədən mesajları cavabda qaytarır) qəbul edir; cron-un eyni işini yoxlamaq olar.
- **İşçilər səhifəsi:** status, departament və «plan» süzgəcləri, KPI düymələri (ştatsız, maaşı hədd kənarı, sınaq/müqavilə bitir), ada, departamenta və başlama tarixinə görə sıralama, 50-lik səhifələmə, «Ştat yeri» sütunu (filial, pillə) və ştatsız işçidə «Yerləşdir», seçilənləri Excel-ə yazmaq və ştata yerləşdirmək, yeni işçi kartında vəzifə üçün yer olmadıqda dərhal xəbərdarlıq (`company/staff/place-check`).

## 30. İşçilər bölməsinin genişlənməsi (miqrasiya 0120)

İşçi siyahısında «Ətraflı» düyməsi (işçi məlumatlarına icazəsi olan rollar üçün) və «Əlavə alətlər» paneli əlavə olundu. Server: `lib/api/handlers/employees-01.ts`, saf məntiq: `lib/employee-insight.ts` (testli).

- **Xronologiya** — `company/employees/timeline`: kart hadisələri, əmrlər, təsdiqlənmiş məzuniyyət, təlim, performans, məlumat sorğuları və sənədlər bir siyahıda (yeni → köhnə).
- **Kütləvi dəyişiklik** — `company/employees/bulk-update`: seçilən işçilər (≤100) üçün departament/şöbə köçürməsi imzasız, dərhal qüvvədə olan «köçürmə» əmri kimi yazılır (nömrə `KD-…`), kart `afterSigned` ilə dəyişir; hər işçi üçün ştat yeri (`placeProblem`) və maaş həddi (`checkSalary`) yoxlanılır, uyğun olmayan buraxılır və səbəb göstərilir. İş rejimi birbaşa kartda dəyişir və tarixçəyə yazılır. «Əvvəlcə yoxla» (dryRun) heç nə dəyişmir. Yeni departament şöbə göstərilməyəndə köhnə şöbə təmizlənir.
- **Təşkilat sxemi** — işçi siyahısındakı «Əlavə alətlər → Təşkilat sxemi» mövcud sxemi (`OrgChart`) orada açır.
- **Dublikatlar** — `company/employees/duplicates`: eyni FİN (yalnız şəxsi məlumat icazəsi və açar olanda; baxış jurnalına yazılır), eyni e-poçt, eyni ad + işə başlama günü.
- **Arxiv** — «Arxivi gizlət»: 12 aydan əvvəl çıxanlar siyahıdan gizlənir (silinmir).
- **İxrac** — `company/employees/export-one`: bir işçinin kartı, maaş tarixçəsi və xronologiyası Excel faylında; şəxsi sahələr yalnız şəxsi məlumat icazəsi ilə; jurnala yazılır.
- **Əlavə sahələr** — şirkət özü sahə yaradır (mətn/rəqəm/tarix, ≤20); dəyərlər işçi pəncərəsində. Yaratmaq/silmək «staff» icazəsi, dəyərləri görmək/yazmaq «employees» icazəsi tələb edir.
- **Varislik** — ştat sətri «əsas vəzifə» işarələnir (`staff_units.critical`), varislər hazırlıq dərəcəsi ilə (`succession`). Risk: vəzifə boşdur / varis yoxdur / dərhal hazır varis yoxdur.
- **Maaş müqayisəsi** — eyni vəzifədə şirkət daxili median və 25–75 faiz (≥3 nəfər), platformada dərc olunmuş elanların orta maaş həddi (≥5 elan; net maaşlı elanlar çıxarılır). Kiçik qruplar göstərilmir.
- **Sorğu profili** — departamentin eNPS nəticəsi yalnız ≥5 cavab olanda; fərdi cavab göstərilmir; işçinin öz iştirakı yalnız anonim olmayan sorğuda.

Məhdudiyyətlər: kütləvi dəyişiklik indi yalnız departament, şöbə və iş rejimini dəyişir (filial və maaş dəyişikliyi imzalı əmr və təsdiq tələb etdiyi üçün tək-tək əmrlə qalır); bazar müqayisəsi dərc olunmuş elanların maaş aralığına əsaslanır, real maaş statistikası deyil.

Rol yoxlaması (auditor və rəhbər): rəhbər heç bir yeni endpoint-ə çıxış almır (403). Auditor xronologiya, dublikat və sorğu profilini görür; maaş müqayisəsi (maaş icazəsi) 403-dür, ixrac faylında maaş və şəxsi sahələr olmur, FİN yoxlaması söndürülür, dəyişdirici alətlər (kütləvi dəyişiklik, sahə/varis idarəsi) görünmür. Qeyd: `requirePermission("salaries")` yol bölməsinə çevrilir, ona görə maaşa bağlı yeni yerlərdə `can(role,"salaries")` birbaşa yoxlanır.

Sürət (company/employees): canlı mühitdə hər D1 sorğusu ~100 ms çəkir (10 sorğu ≈ 1,2 s). Bir-birindən asılı olmayan oxumalar (tapşırıqlar, illik məzuniyyət, ştat planı, baxış jurnalı) indi `rows` ilə eyni anda başlayır. Cavabın məzmunu dəyişməyib (əvvəl/sonra müqayisə edildi). Digər səhifələr (`dashboard` 14, `today` 17, `hr-trends` 11, `hr-report` 10 sorğu) eyni üsulla azaldıla bilər — ölçülməmiş təxmin yox, canlı Server-Timing ilə ölçülüb.

## 31. Əmrlər reyestri və Əmək haqqı: yoxlama və idarəetmə (2026-11)

**Əmrlər reyestri** (`lib/orders-registry.ts`, testli):
- Sürətli süzgəc düymələri sayla: hamısı, imza gözləyir, 3+ gündür gözləyir, geri qaytarılıb, imzalanıb amma kartda tətbiq gözləyir, təkrarlanan nömrə, imzalanıb.
- «Gözləmə» sütunu: əmrin son hərəkətindən (yaradılma, təsdiq, geri göndərmə, düzəliş) keçən gün; 3 gündən çox qırmızı. İmzalanmış əmr gözləmir.
- «Kartda» sütunu: əmr kartı dəyişirsə tətbiq olunub / tətbiq gözləyir / geri qaytarılıb.
- Təkrarlanan nömrə xəbərdarlığı (eyni ildə eyni nömrə). Bu yoxlama real xəta tapdı: kütləvi dəyişikliyin əmr nömrəsi `KD-tarix-sıra` idi və eyni gündə ikinci dəfə təkrarlanırdı; indi nömrənin sonuna əmrin unikal kodu əlavə olunur.
- Nömrə/tarix/işçi/gözləmə üzrə sıralama, 50-lik səhifələmə, seçilmişlərin Excel faylı.

**Əmək haqqı** (`lib/payroll-check.ts`, testli): cədvəl təsdiqlənməzdən əvvəl «Təsdiqdən əvvəl yoxlama» paneli — xəta: maaş daxil edilməyib, avans artıqdır, bank üsulu üçün IBAN/kart yoxdur; xəbərdarlıq: heç bir iş günü yoxdur, ödəniləcək sıfırdır, maaş eyni qaldığı halda gross ≥20% dəyişib; məlumat: yeni/çıxan işçi, maaş dəyişikliyi, ödənişsiz gün. Əvvəlki ayın cədvəli ilə müqayisə (cədvəli olmayan ay müqayisə üçün yoxdur sayılır). Təsdiq düyməsi xəta varsa xəbərdarlıq edir (bloklamır). Cədvəldə işçi/vəzifə/departament axtarışı və «yalnız qalığı olanlar» süzgəci.

Bilərəkdən edilməyənlər (təklif): əmrlər üçün avtomatik xatırlatma e-poçtu (imza gözləyənə), əmr şablonlarının redaktəsi, əmrə fayl əlavəsi, əmək haqqında ay kilidləmə tarixi və ay bağlama yoxlama siyahısı, vergi bəyannaməsi üçün birbaşa e-taxes formatı, işçi başına illik gəlir vərəqəsi.

**Əlavə (31-ci bölmənin davamı):**
- **Gözləyən əmrlər üçün xatırlatma:** `lib/order-digest.ts` — bazar ertəsi və cümə axşamı (UTC) əmr icazəsi olan şəxslərə şirkət gələn qutusunda (və e-poçt ayarlanıbsa e-poçtla) bildiriş: 3 gündən çox imza gözləyən və geri qaytarılmış əmrlər. Heç nə yoxdursa göndərilmir. Cron-a (`worker/index.ts`) və `admin/run-digests` cavabına (`orderNotes`, `force` ilə hər gün) qoşulub. Təsdiq: yerlidə `force` ilə 1 bildiriş yarandı; real e-poçt çatdırılması yoxlanmayıb.
- **Əmək haqqında ay bağlama siyahısı:** yoxlama panelində — əvvəlki ay təsdiqlənib, vergi parametrləri təsdiqlənib, yoxlamada xəta yoxdur, hər işçinin maaşı var.
- **İllik yekun:** `company/payroll/annual?year=` (maaş icazəsi tələb edir, baxış jurnalına yazılır) təsdiqlənmiş ayların işçi üzrə gross, gəlir vergisi, işçi sığortası və net məbləğini verir; «İllik yekun (XLSX)» düyməsi iki vərəqli fayl yükləyir. Təsdiqlənməmiş aylar daxil edilmir və bu bildirilir. Rəsmi e-taxes bəyannamə formatı deyil.

## 32. Qalan menyu bölmələri: boşluqlar və təkliflər (2026-11)

Qeyd: bu siyahı menyu və koda baxışa əsaslanır (hər bölmənin düymələri, endpoint-ləri, testləri), hər bölmənin brauzerdə tam gəzilməsinə yox. Heç bir maddə hələ icra olunmayıb. «Boşluq» = mövcud olanda çatışmayan, «Təklif» = əlavə dəyər.

**Plan və fakt** (artıq geniş işləndi) — Boşluq: planın illik bağlanması və növbəti ilə köçürmə sihirbazı; büdcə (AZN) ilə işçi sayının eyni ekranda uzlaşması. Təklif: ssenari müqayisəsi («+5 nəfər olsa fond nə qədər»).

**Ehtiyac təklifi** — Boşluq: rəhbərin təklifi rədd/təsdiq olunanda bildirişin real e-poçtla çatması yoxlanmayıb; təklifə əlavə fayl/əsaslandırma sənədi yoxdur. Təklif: təsdiq olunan təklifdən bir kliklə vakansiya yaratmaq; təklifin statusunun rəhbərə izlənməsi.

**Filiallar** — Boşluq: filialın bağlanması/birləşdirilməsi (işçilərin köçürülməsi ilə); filial üzrə plan-fakt. Təklif: filial xəritəsi, filial üzrə ayrıca əmək haqqı fondu hesabatı (bölgü var, hesabat yoxdur).

**Kadr əməliyyatları** (məzuniyyət qrafiki, sənəd reyestri, işdən çıxma, aktivlər, sxem, tövsiyə, rəy yoxlaması, ad günləri, əməyin mühafizəsi, qaydalar, saxlama müddəti) — Boşluq: işdən çıxmada «çıxış müsahibəsi» anketi və avtomatik yoxlama siyahısının icra izləməsi; sənəd reyestrində son tarix xatırlatmasının e-poçtla çatması yoxlanmayıb; əməyin mühafizəsi qeydlərinə fayl əlavəsi yoxdur. Təklif: onboarding yoxlama siyahısı şablonları (vəzifəyə görə), işçi köçürməsində aktivlərin avtomatik qaytarma tələbi.

**İnkişaf və kommunikasiya** (performans, bacarıq, təlim, növbə, ezamiyyət, elan/sorğu) — Boşluq: performans dövrü nəticəsinin maaş artımı təklifinə bağlanması var, amma toplu «artım dalğası» təsdiqi yoxdur; təlim büdcəsi ilə plan-fakt əlaqəsi yoxdur; sorğu nəticələrində departament kəsimi yalnız eNPS-də var. Təklif: 9-box (performans × potensial) və varislik planı ilə əlaqə (İşçilər → Varislik artıq var); təlimdən sonra bacarıq səviyyəsinin avtomatik təklifi.

**Davamiyyət** — Boşluq: giriş-çıxış üçün cihaz/terminal inteqrasiyası yoxdur (yalnız əl ilə, Excel və geolokasiya); ay bağlama (davamiyyətin kilidlənməsi) əmək haqqı təsdiqindən ayrı idarə olunmur; gecikmə üçün intizam əmrinə birbaşa keçid yoxdur. Təklif: davamiyyət ayını təsdiqlədikdən sonra kilid və dəyişiklik üçün səbəbli sorğu; rəhbər görünüşündə həftəlik gecikmə xülasəsi.

**Komanda və rollar** — Boşluq: rolların dəyişməsinin tarixçəsi (kim kimə hansı icazəni nə vaxt verdi) ayrıca ekran kimi yoxdur (jurnalda var); müvəqqəti icazə (məs. məzuniyyətdə əvəzedici üçün tarix aralığı) yoxdur; admin 2FA məcburi deyil. Təklif: «icazələrin icmalı» — hər istifadəçinin nəyi görə biləcəyini bir cədvəldə göstərmək; icazə yeniləmə xatırlatması (ildə bir dəfə).

**Şirkət məlumatları** — Boşluq: məlumat dəyişikliyi sorğusu və təsdiq axını var, lakin sənəd versiyalarının (nizamnamə, VÖEN sənədi) tarixçəsi və müddət bitmə xatırlatması yoxdur. Təklif: şirkət profilinin tamlıq göstəricisi; şifrələmə açarının ehtiyat nüsxəsi və bərpa addımlarının ekranda izahı (açar itərsə şəxsi məlumatlar bərpa olunmur).

**Hesablar və ödənişlər** — Boşluq: hesab-fakturalar cədvəl və XLSX ilə verilir; fakturanın çap/PDF forması və ödəniş xatırlatmasının real e-poçtla çatması yoxlanmayıb; paket yeniləməsi üçün avtomatik ödəniş yoxdur (ABB müqaviləsindən asılıdır). Təklif: istifadə (AI kredit, vakansiya sayı) və limit göstəricisi eyni ekranda; illik ödənişə keçid təklifi.

**Kalkulyatorlar** — 13 kalkulyator var. Boşluq: nəticələrin saxlanması/paylaşılması və Excel-ə atılması yoxdur; kalkulyator nəticəsindən birbaşa əmr və ya kart dəyişikliyi başlatmaq mümkün deyil (məs. maaş hesabından «maaş dəyişikliyi əmri»). Təklif: «işçiyə tətbiq et» düyməsi; ildə bir dəfə vergi parametrlərinin yenilənməsinə dair mühasib təsdiqi ilə eyni mexanizm.

**Dəstək** — Boşluq: müraciətin təcililik/kateqoriyası, SLA və cavab müddəti göstəricisi yoxdur; şirkət tərəfdə müraciət tarixçəsində axtarış yoxdur. Təklif: tez-tez verilən suallar bölməsi və müraciət yaratmazdan əvvəl avtomatik təkliflər.

**Hamısına aid, qərar tələb edənlər:** CSP-nin məcburi rejimi, admin 2FA-nın məcburiliyi, real e-poçt çatdırılmasının canlıda yoxlanması (göndərici provayderi və açarı lazımdır), ABB ödəniş müqaviləsi, hüquqçu baxışı, əsl istifadəçilərlə pilot, açıq buraxılışdan əvvəl bütün ZZ-TEST və test məlumatlarının silinməsi.

## 33. Qalan bölmələrdən üç bəndin icrası (2026-11, miqrasiya 0121)

- **Davamiyyət ayını kilidləmək** (`lib/attendance-lock.ts`, `lib/api/handlers/attendance-01.ts`, cədvəl `attendance_locks`): «Ayı kilidlə» düyməsi; kilidli ayda cədvəldən əl ilə dəyişiklik (409) və Excel yükləməsi (sətir sətir bildirilir, qalanlar işləyir) bağlıdır. İmzalanmış əmrlər və ezamiyyət cədvələ yenə yazılır (hüquqi fakt sayılır). Əmək haqqı ayı təsdiqlənəndə davamiyyət avtomatik kilidlənir. Kilidi yalnız direktor/hesab sahibi açır və səbəb yazmalıdır (jurnala düşür). Yerlidə hamısı sınandı: kilid, 409, rəhbər üçün 403, səbəbsiz açma 400, açandan sonra dəyişiklik 200, əmək haqqı təsdiqində avtomatik kilid.
- **Kalkulyatordan maaş dəyişikliyi əmri**: Kalkulyatorlar → işçi seçilir → «… üçün maaş dəyişikliyi əmri hazırla»; açılan əmr pəncərəsində növ «maaş dəyişikliyi», məbləğ və əsas doldurulub gəlir; əmr adi imza axınına düşür. Məbləğ işçinin maaş növündə (gross/net) olmalıdır, uyğun gəlməyəndə izahla dayanır. Yerlidə pəncərənin açılması və məbləğin (1100) doldurulması brauzerdə yoxlandı; imza axınının tamamlanması bu dəfə yoxlanmadı (əvvəlki əmr testləri ilə eyni yol).
- **Ehtiyac təklifindən vakansiya**: təsdiqlənmiş təklifin yanında «Vakansiya aç» düyməsi (filial, departament, şöbə, vəzifə ilə HR köməkçisini açır). Mövcud «ştat sətrindən vakansiya» mexanizmini istifadə edir; vakansiya yenə də plan yoxlamasından keçir.

Düzəliş qeydi: 32-ci bölmədə «filial üzrə fond hesabatı yoxdur» demişdim — yanlış idi: Əmək haqqı → «Filiallar üzrə bölgü» (`BranchAllocation`) filial üzrə gross, pay, bonus və Excel verir. Yalnız aylar üzrə dinamika yoxdur.

## 34. İşə qəbul menyusu: boşluqlar və təkliflər (2026-11)

Qeyd: 32-ci bölmədəki kimi, menyu və koda baxışa əsaslanır (məsələn «scorecard», «qara siyahı», «avtomatik cavab», «işə qəbul müddəti» sözləri kodda tapılmadı), hər bölmə brauzerdə tam gəzilməyib. Heç bir maddə icra olunmayıb.

**Ümumi baxış** — Boşluq: bölmələrə (vakansiya, namizəd, müsahibə, təklif) bir ekranda «bu həftə nə etməliyəm» siyahısı yoxdur (İşə qəbul tərəfində «bu gün» paneli HR tərəfindəki qədər güclü deyil). Təklif: vakansiya üzrə «yaş» (neçə gündür açıqdır) və dayanmış namizəd xəbərdarlığı.

**Vakansiyalarım** — Boşluq: elanın performans göstəricisi (baxış → müraciət → müsahibə → təklif) bir cədvəldə yoxdur; vakansiyanı bağlayanda namizədlərə toplu rədd məktubu avtomatik getmir (əl ilə). Təklif: vakansiya şablonlarından klonlama düyməsi, vakansiyanın müddət bitmə xatırlatması, elan keyfiyyəti yoxlaması (maaş yazılıb, tələblər aydındır).

**Namizədlər** — Boşluq: rədd səbəbinin vahid kataloqu və rədd məktubu şablonu seçimi var, lakin rədd səbəbləri üzrə hesabat yoxdur; namizədin mənbəyi (sayt, tövsiyə, xarici) qeyd olunur, mənbə üzrə səmərəlilik hesabatı yoxdur; «qara siyahı» / təkrar müraciət xəbərdarlığı yoxdur. Təklif: mərhələdə qalma müddəti (SLA) xəbərdarlığı; namizədə avtomatik «müraciətiniz qəbul olundu» cavabı; GDPR üslubunda namizəd məlumatının saxlama müddəti və silmə.

**HR AI köməkçi** — Boşluq: AI cavablarının keyfiyyət/xərc izlənməsi admin tərəfdə var, şirkət tərəfdə istifadə sayı və qalan kredit söhbət ekranında görünmür (Hesablar və ödənişlərdə var). Təklif: elanı yazandan sonra «ədalətlilik yoxlaması» (cinsiyyət/yaş kodlu ifadələr); müsahibə sualları yaratmaq.

**İstedad bazası** — Boşluq: teqlər və yadda saxlanmış axtarışlar var, lakin bazaya «yeni vakansiya açıldı, uyğun namizədlərə xəbər ver» avtomatikası yoxdur; baza girişlərinin köhnəlməsi (6 aydan köhnə) təmizlənmir. Təklif: namizədə yenilik soruşan toplu e-poçt (razılıqla), istedad hovuzu üzrə ölçü göstəriciləri.

**Müsahibələr** — Boşluq: konflikt yoxlaması, cədvəl və iştirakçılar var; müsahibə sonrası vahid qiymətləndirmə vərəqi (kriteriyalar üzrə bal, çəkilərlə) yoxdur, rəy sərbəst mətndir; video link (Meet/Zoom) avtomatik yaranmır. Təklif: kriteriya şablonları və namizədləri bal üzrə müqayisə; müsahibədən 24 saat əvvəl namizədə və iştirakçılara xatırlatma (real e-poçt çatması yoxlanmayıb).

**Testlər** — Boşluq: sual idxalı (Excel/AI) və nəticələr var; sual bankı arasında təkrar sualların aşkarlanması və sual çətinliyinin statistikası yoxdur; testin saxtakarlıq əlamətləri (tab dəyişmə) yalnız qismən izlənir. Təklif: sual bankı kataloqu, test vaxtı statistikası.

**Təsdiqlər** — (əvvəlki işlərdə 3 pəncərəli görünüş, limitlər, adla təsdiq edilib). Boşluq: təsdiq gözləyən sorğuya e-poçt/telefon xatırlatmasının real çatması yoxlanmayıb. Təklif: təsdiqləyənin məzuniyyətdə olduğunu görüb avtomatik əvəzedicinin göstərilməsi (əvəzedici var, avtomatik seçim yoxdur).

**Mesajlar** — Boşluq: şablonlar, təyin etmə, axtarış və qoşma var; namizədin cavabı üçün gözləmə müddəti (SLA) və cavabsız söhbətlərin siyahısı yoxdur; mesaj şablonlarında dəyişən (namizədin adı, vakansiya) var-yox yoxlanmayıb. Təklif: «cavab gözləyənlər» filtri, iş saatından kənar avtomatik cavab.

**Təklif məktubları (Offers)** — Boşluq: şablon, göndərmə, geri çəkmə, cavab var; təklifin maaşının ştat həddi ilə avtomatik yoxlanması (vakansiya zamanı var) təklif mərhələsində ayrıca göstərilmir; təklif qəbul ediləndə işçi kartının avtomatik yaranması var, lakin onboarding yoxlama siyahısı başlamır. Təklif: qəbul → kart → onboarding tapşırıqları zəncirinin bir ekranda göstərilməsi.

**Hamısına aid:** işə qəbul hesabatları (mənbə üzrə, mərhələ üzrə keçid, işə qəbul müddəti, vakansiya üzrə xərc) Hesabatlar bölməsində `hiring-flow` və `turnover` ilə qismən örtülüb; tam «işə qəbul qıfı» (funnel) səhifəsi yoxdur. Qərar tələb edənlər 32-ci bölmənin sonundakı kimidir (CSP, admin 2FA, real e-poçt, ABB, hüquqçu, pilot, test məlumatlarının silinməsi).

## 35. ATS: işə qəbul analitikası, müsahibə skorkartı, namizədə qəbul bildirişi, dayanmış namizəd xatırlatması (miqrasiya 0122)

- **Müsahibə skorkartı** (`lib/interview-scorecard.ts`, `lib/api/handlers/interviews-02.ts`, cədvəl `interview_criteria`, `interviews.scores`): şirkət 12-yə qədər kriteriya və çəki (1–5) təyin edir (təyin etməyibsə 5 hazır kriteriya). Rəy yazanda hər kriteriya 1–5 qiymətləndirilir; ümumi qiymət çəkili ortadan (doldurulmayan kriteriya ortanı aşağı çəkmir) 1–5 tam ədəd kimi alınır. Kriteriyaları yalnız HR və yuxarı dəyişir, əvvəlki rəylər dəyişmir. Yerlidə: 5/4/2 balları və çəkilər 3/2/1 ilə orta 4.2 → qiymət 4, tövsiyə avtomatik «irəli».
- **İşə qəbul analitikası** (menyu «İşə qəbul analitikası», `lib/ats-analytics.ts`, `lib/api/handlers/ats-01.ts`, `app/AtsAnalytics.tsx`): işə qəbul qıfı (müraciət → baxış → müsahibə → təklif → işə qəbul, keçid faizləri), işə qəbul müddəti (median/orta), mərhələdə keçən müddət, mənbə üzrə nəticə, rədd səbəbləri, vakansiya üzrə cədvəl, dayanmış namizədlər (3–21 gün həddi), Excel faylı. Keçmiş statuslardan hesablanır, ona görə işə qəbul edilən aralıq mərhələlərdən də keçmiş sayılır; hadisəsi olmayan köhnə müraciətlər cari statusla sayılır. Yalnız hesab sahibi, direktor, HR və rekruter görür (namizəd adları var); rəhbər və auditor üçün menyu gizlədilir və endpoint 403 verir.
- **Namizədə qəbul bildirişi:** müraciət göndərilən anda namizədə bildiriş (və e-poçt ayarına görə e-poçt): «Müraciətiniz qəbul olundu».
- **Dayanmış namizəd xatırlatması** (`lib/ats-digest.ts`): çərşənbə axşamı və cümə (UTC) HR icazəsi olanlara şirkət gələn qutusunda bildiriş: 7+ gün hərəkətsiz namizəd sayı. Cron-a və `admin/run-digests` (`atsNotes`) cavabına qoşulub.

Qeydlər: 34-cü bölmədə «müsahibə xatırlatması yoxdur» deməmişdim, lakin «işə qəbul müddəti» və «avtomatik cavab» yoxdur demişdim — ikisi də indi var. Hələ yoxdur: qara siyahı/təkrar müraciət xəbərdarlığı (hüquqi baxış tələb edir), namizəd məlumatının saxlama müddəti və silmə, istedad bazasının avtomatik yenilənməsi, video link yaratma, mərhələdə SLA-nın vakansiya üzrə ayrıca təyini.

**Əlavə (35-ci bölmənin davamı):**
- **Rəylərin müqayisəsində skorkart:** Müsahibələr → «Rəylərin müqayisəsi» cədvəlində hər namizədin orta balının altında kriteriyalar üzrə orta bal (məs. «Texniki bilik: 5 · Ünsiyyət: 4») görünür. Yalnız skorkartla qiymətlənmiş müsahibələr sayılır. Yerlidə brauzerdə yoxlandı.
- **Təkrar müraciət xəbərdarlığı:** Namizədlər cədvəlində adın altında kiçik qeyd: «əvvəl N vakansiyada rədd edilib» (qırmızı), «digər N vakansiyaya da müraciət edib», «eyni əlaqə məlumatı: …». Bu məlumat serverdə əvvəldən hesablanırdı, lakin heç yerdə göstərilmirdi. Məntiq testlə yoxlanıb; yerli demo məlumatında təkrar namizəd olmadığı üçün brauzerdə qeyd görünmədi. Bu «qara siyahı» deyil: yalnız məlumatdır, qərarı işə qəbul edən verir.

## 36. Düzəlişlər: 32 və 34-cü bölmələrdəki yanlış «yoxdur» iddiaları (kodla yoxlandı)

32-ci bölməni yazanda bəzi bölmələri yalnız menyudan qiymətləndirmişdim. Sonradan kodla yoxlayanda aşağıdakılar yanlış çıxdı; onlar **artıq mövcuddur** və təkliflər siyahısından çıxarılmalıdır:
- **Kalkulyatorlar:** nəticəni Excel-ə atmaq və çap etmək var (`HrCalculators` daxilində `Export` konteksti, `createXlsx`, çap). Həqiqətən çatışmayan: nəticənin hesabda yadda saxlanması/paylaşılması (kalkulyatordan əmr hazırlamaq 33-cü bölmədə əlavə olundu).
- **Kadr əməliyyatları → İşdən çıxma:** çıxış müsahibəsi (`company/offboarding/interview`), yoxlama siyahısı, əmlak qaytarma və proses bağlama var. Çatışmayan: vəzifəyə görə fərqli yoxlama siyahısı şablonları (hazır siyahı bir dənədir, `lib/onboarding.ts`).
- **Plan və fakt:** planın təqdimi, təsdiqi, yenidən açılması və illik vəziyyəti (`company/plan-fact/state|submit|reopen`) var. «İlin bağlanması» deyilən çatışmazlıq yalnız növbəti ilə **avtomatik köçürmə sihirbazıdır**, bağlamanın özü yox.
- **İnkişaf və kommunikasiya:** performans qiymətindən maaş artımı təklifi var; çatışmayan yalnız çoxlu işçi üçün toplu «artım dalğası» təsdiqidir.
- **İşə qəbul tərəfində** (34-cü bölmə): müsahibə xatırlatması (`runInterviewReminders`) əvvəldən var idi; «işə qəbul müddəti» və «avtomatik cavab» yox idi, 35-ci bölmədə əlavə olundu.

Yoxlanmamış qalan «yoxdur» iddiaları (Davamiyyət → gecikmədən intizam əmrinə keçid, Komanda → icazə tarixçəsi ekranı, Dəstək → təcililik/SLA): koddan bir baxışla göründüyü qədərdir, brauzerdə təsdiqlənməyib.

**Niyə hesab-fakturanın çap/PDF formasını bilərəkdən yazmadım:** rəsmi hesab-faktura satıcının hüquqi rekvizitlərini (VÖEN, bank, imza) və ƏDV qaydalarını tələb edir; bu rekvizitlər mənə məlum deyil və yanlış rekvizitli «rəsmi» sənəd yaratmaq riskli olardı. Platformanın hüquqi məlumatları verilərsə edilə bilər.

## 37. Müvəqqəti icazə və adaptasiya siyahısı şablonu (miqrasiya 0123, 0124)

- **Müvəqqəti əlavə icazə** (`lib/grants-expiry.ts`, `company_members.grants_until`): Komanda və rollar → «İcazələr» pəncərəsində «Əlavə icazələr bu tarixədək» sahəsi (məs. məzuniyyətdə olan işçinin əvəzedicisi üçün). Bitmə günü daxildir; ondan sonra əlavə icazələr avtomatik işləməyi dayandırır, rolun öz icazələri qalır. Keçmiş tarix qəbul edilmir, jurnala tarixlə yazılır, cədvəldə «tarixədək / bitib» qeydi görünür. Yerlidə sınandı: rəhbərə «payroll» icazəsi (sabaha qədər) verilən kimi 200, tarix 2020-ə çəkiləndə 403, komanda siyahısında «bitib». Rol dəyişdirmə dropdown-u tarixi saxlayır.
- **Adaptasiya (qəbul) siyahısı şablonu** (`lib/onboarding.ts`, cədvəl `onboarding_templates`, İşçilər → Əlavə alətlər → «Qəbul siyahısı»): şirkət öz ümumi siyahısını və departamentə görə əlavə tapşırıqları yazır; yazmayıbsa hazır 9 tapşırıqlıq siyahı işləyir. Departament tapşırıqları ümumi siyahıya əlavə olunur. Yalnız yeni yaradılan adaptasiya siyahılarına təsir edir. Yerlidə: Maliyyə işçisi «ofis turu + 1C girişi (2-ci gün)», Satış işçisi yalnız «ofis turu» aldı. Rəhbər üçün 403.

## 38. İstifadə təlimatı (menyuda «İstifadə təlimatı»)

Namizəd, işəgötürən (həm «İşə qəbul», həm «Kadr» rejimi) və administrator menyusunda «İstifadə təlimatı» bölməsi var (`app/GuidePage.tsx`, məzmun `lib/guide-content.ts`). İstifadəçi növünə görə nişlər: namizəd, işçi (İş yerim), işə qəbul, kadr (HR), administrator (yalnız admin görür). Hər bölmədə addım-addım təlimat, menyuda harada olduğu və ipucu; axtarış bütün növlər üzrə işləyir; rolların cədvəli (`COMPANY_ROLES`) və tez-tez verilən suallar var; çap etmək olar. Dəqiqlik üçün `tests/guide-content.test.mjs` təlimatda adı çəkilən hər menyu bəndinin `app/Joblink.tsx` naviqasiyasında həqiqətən olmasını yoxlayır: menyu adı dəyişsə test pozulur və təlimat da yenilənməlidir. Yeni funksiya əlavə ediləndə `lib/guide-content.ts`-ə də yazın.

## 39. Vizual təkmilləşdirmələr (açılış səhifəsi, ilk addımlar, Ctrl+K, hərəkət)

- **Açılış səhifəsi** (`app/Landing.tsx`, `app/landing.css`): giriş etməyən ziyarətçi giriş formunun altında görür: üç istifadəçi növü, 3 addımda başlamaq, imkanlar, qiymətlər, tez-tez verilən suallar, «Qeydiyyatdan keç» düyməsi (formu göstərir) və alt hissə. Qiymətlər `lib/plans.ts` və `lib/ai-packages.ts`-dən oxunur: paket qiyməti dəyişəndə səhifə özü yenilənir. EN/RU tərcümələri `lib/i18n-landing.ts`-dədir. Yerlidə masaüstü və mobil ölçüdə yoxlandı (üfüqi sürüşmə yoxdur).
- **«İlk addımlar» kartı** (`app/FirstSteps.tsx`): namizədin ümumi baxışında (profil ≥70%, CV təhlili, yadda saxlama, ilk müraciət) və işəgötürənin ümumi baxışında (ilk vakansiya, ilk müraciət, müsahibə); hamısı bitəndə özü yox olur. Yeni, boş hesab üçün nəzərdə tutulub.
- **Ctrl+K / Cmd+K sürətli keçid** (`app/CommandPalette.tsx`): menyudakı istənilən bölməni hərf yazaraq açır (Azərbaycan hərflərini diakritiksiz də tapır), ox düymələri və Enter ilə.
- **Hərəkət:** «Yüklənir…» yazıları parıldayan animasiya alır (`loading-line`), səhifə açılanda yumşaq görünmə, KPI kartlarında hover qalxma; `prefers-reduced-motion` olanda hamısı söndürülür.
- **Yan menyu qrupları** (`lib/nav-groups.ts`): işəgötürən menyusu «Vakansiya və namizəd», «Qiymətləndirmə», «İşçilər və əmrlər», «Plan və əmək haqqı», «Şirkət» başlıqları altında açılıb-bağlanır; bağlanan başlıqlar brauzerdə yadda qalır, cari səhifənin qrupu həmişə açıq qalır. Yerlidə yoxlandı (bağlama, yadda qalma, Ctrl+K ilə keçid). Namizəd və admin menyusu dəyişməyib.
- Hələ edilməyib: vakansiya kartlarında şirkət loqosu, illüstrasiyalar, qaranlıq rejim (bax: bölmə 40).

## 40. NƏ QALIB (2026-11-18-ə olan vəziyyət)

Bu bölmə bütün işlərin sonunda qalan hər şeyin dürüst siyahısıdır. «Kod» = mən icra edə bilərəm; «Qərar/xarici» = sənin qərarın, hüquqi, müqavilə, açar və ya real istifadəçi lazımdır.

### A. Açıq buraxılışdan əvvəl məcburi (qərar / xarici)
1. **Test məlumatlarının silinməsi:** ZZ-TEST hesabları (`zz-test-company-…`, `zz-test-candidate-…`, `zz-test-reg-…`), `sirket-demo`, test qeydləri, yerli demo hesablar. Canlı mühitdən silinməlidir.
2. **Real e-poçt çatdırılması:** bütün e-poçt xatırlatmaları (əmr, namizəd qəbulu, dayanmış namizəd, hesabat cədvəli, təsdiq) kodda var, lakin canlıda göndərici provayder və açar yoxlanmayıb. Yerlidə yalnız gələn qutusu bildirişləri təsdiqlənib.
3. **Ödəniş:** ABB müqaviləsi və açarları; avtomatik yenilənən ödəniş.
4. **Öz domen:** indi `workers.dev` ünvanıdır; domen, e-poçt göndərən ünvanı, təqdimatlardakı ünvan.
5. **Hüquqçu baxışı:** istifadə şərtləri və məxfilik siyasəti, namizəd məlumatının saxlama müddəti və silinməsi, qara siyahı (yalnız hüquqi baxışdan sonra), əmək haqqı hesablamalarının məsuliyyət qeydi.
6. **Təhlükəsizlik siyasəti:** CSP hələ yalnız hesabat rejimindədir (məcburi rejimə keçmək üçün əvvəl canlıda pozuntu hesabatlarına baxmaq lazımdır); admin üçün 2 addımlı giriş məcburi deyil.
7. **Real istifadəçi pilotu:** sistemdə real istifadəçi yoxdur; analitika (işə qəbul müddəti və s.) real məlumatla mənalı olacaq.
8. **CI-də e2e testləri üçün gizli açarlar** (repoda qurulmayıb).

### B. Məhsul (kod, istəsən icra edim)
**İşə qəbul:** istedad bazasına toplu «hələ maraqlısınızmı» e-poçtu (razılıq qaydası ilə); namizəd məlumatının saxlama müddəti və silmə aləti; Meet/Zoom linkinin avtomatik yaranması (açar tələb edir); vakansiya üzrə ayrıca SLA həddi; skorkartlı müsahibələrin kriteriya üzrə ümumi hesabatı.
**Kadr və əmək haqqı:** növbəti ilə plan köçürmə sihirbazı; çoxlu işçi üçün toplu «maaş artımı dalğası» təsdiqi; vəzifəyə görə fərqli adaptasiya siyahısı (departament üzrə var); kütləvi dəyişikliyin filial və maaşı əhatə etməsi (indi yalnız departament, şöbə, iş rejimi); kalkulyator nəticəsinin hesabda saxlanması/paylaşılması; müvəqqəti icazə bitəndə xatırlatma; əmək haqqında aylar üzrə illik yekunun sürətləndirilməsi (indi canlıda ~5 s).
**Davamiyyət və komanda:** terminal/cihaz inteqrasiyası; gecikmədən intizam əmrinə birbaşa keçid; icazələrin tarixçəsi ekranı.
**Hesab-faktura:** çap/PDF forması (satıcının hüquqi rekvizitləri və ƏDV qaydası lazımdır — yazmamışam).
**Dəstək:** təcililik dərəcəsi və cavab müddəti (SLA).
**Sürət:** canlıda D1 sorğusu ~100 ms-dir; `dashboard` (14 sorğu), `today` (17), `hr-trends` (11), `hr-report` (10) səhifələri hələ ardıcıl sorğularla işləyir; `employees` artıq paralel edilib (~1,3 s → ~0,8 s).

### C. Vizual
Vakansiya kartlarında şirkət loqosu (loqo yüklənir, amma namizədə göstərmək üçün ictimai loqo ünvanı və vakansiya məlumatına əlavə lazımdır); illüstrasiyalar və boş vəziyyət şəkilləri; qaranlıq rejim (köhnə CSS-də çoxlu sərt rəng var, ayrıca iş tələb edir); marka serif şriftinin başlıqlarda istifadəsi.

### D. Yoxlama boşluqları (kodda var, amma brauzerdə təsdiqlənməyib)
- Rəhbər və auditor üçün yeni işçilər, əmrlər, əmək haqqı səhifələri tam gəzilməyib (API 403-lər yoxlanıb).
- Rus və ingilis dilində yeni səhifələr (açılış, təlimat) brauzerdə yoxlanmayıb; təlimat yalnız Azərbaycan dilindədir.
- Kalkulyatordan əmr: pəncərə açılır, lakin imza axını sonuna qədər sınanmayıb. «Vakansiya aç» düyməsi HR köməkçisini açır, elanın tam yaradılması sınanmayıb.
- Bölmə 32-dəki üç «yoxdur» iddiası təsdiqlənməyib (bölmə 36-ya bax): davamiyyətdə intizama keçid, komanda icazə tarixçəsi, dəstək SLA-sı.
- Təqdimat slaydları brauzerdə vizual yoxlanmayıb (linklər şəxsidir).

### E. Təqdimatlar və təlimat
- İnvestor təqdimatında sarı qutulu yerlər doldurulmalıdır: tarix, bazar rəqəmləri (mənbə ilə), rəqiblərin adları, nəticələr (real istifadəçi, pilot, ödəyən müştəri), komanda, tələb olunan məbləğ və istifadə bölgüsü, əlaqə.
- Reklam təqdimatında sayt ünvanı və əlaqə məlumatı yenilənməlidir; qiymətlər təqdimatdan əvvəl təsdiqlənməlidir.
- «İstifadə təlimatı» (`lib/guide-content.ts`) əl ilə yazılır: yeni funksiya əlavə edəndə təlimatı da yeniləmək lazımdır (menyu adı dəyişsə test pozulur).

## 41. Rol/icazə tarixçəsi və kalkulyator nəticəsini saxlamaq

- `company/team/history` (yalnız "team" icazəsi): rol, dəvət, dayandırma, silmə və davamiyyət kilidinin açılması hadisələri. «Komanda və rollar» səhifəsində «Rol və icazə tarixçəsi» paneli.
- `company/calc-saves` (GET/POST), `company/calc-saves/delete`: kalkulyator nəticəsi «Hesabda saxla» ilə saxlanır (maks. 300), «Saxlanmış hesablamalar» panelində açılır/silinir. Miqrasiya 0125.
- Maaş kalkulyatoru tabı hələ `Result` komponentini işlətmir, ona görə orada saxlama düyməsi yoxdur.
- Hələ edilməyib (xarici/hüquqi giriş lazımdır): video link, terminal inteqrasiyası, hesab-faktura çapı (satıcı rekvizitləri), istedad bazasına toplu e-poçt (razılıq + real göndərmə), namizəd məlumatının silinməsi (saxlama siyasəti hüquqi qərardır).

## 42. Brauzer yoxlaması (D bəndi) — nəticələr

- **Rəhbər və auditor:** hər menyu bəndi gəzildi (rəhbər 25, auditor 28 səhifə), JS xətası yoxdur. Tapılan xəta: auditor üçün «Plan və fakt» və «Filiallar» menyuda görünürdü, amma server 403 verirdi və səhifə sonsuz «Yüklənir…» qalırdı; menyu indi «salaries» icazəsinə bağlıdır (düzəldildi, yenidən yoxlandı). Rəhbərdə bəzi fon sorğuları 403 qaytarır (today, inbox, calc-saves…), amma səhifə sınmır.
- **EN/RU:** açılış səhifəsi tərcümə olunmurdu (`localizeTree` komponentin içinə girmir) — düzəldildi, EN/RU-da yoxlandı (yalnız plan adları AZ qalır). Menyu başlıqları və yeni bölmə adları tərcümə cədvəlinə əlavə olundu. **Hələ də AZ:** yeni səhifələrin (Hesabatlar, İşçilər, Komanda və rollar, Əmrlər reyestri, Əmək haqqı və s.) məzmunu böyük hissədə tərcümə olunmayıb: bu səhifə komponentləri `localizeTree`/`translate` işlətmir və cədvəldə cümlələr yoxdur. Bu ayrıca böyük tərcümə işidir.
- **Kalkulyatordan əmr:** pəncərə açıldı, direktor adı yazıldı, əmr yaradıldı, imzaya göndərildi və təsdiqlə «imzalandı» oldu (yerlidə). Yerli işçinin maaşı kalkulyator məbləği ilə eyni olduğu üçün kart dəyişmədi («Kartda dəyişiklik yoxdur») — real dəyişiklik halı ayrıca sınanmayıb.
- **«Vakansiya aç»-dan elanın tam yaradılması:** yoxlanmayıb.
- **Bölmə 32-dəki iddialar:** davamiyyətdən intizama keçid — həqiqətən yoxdur; icazə tarixçəsi — indi var (bölmə 41); dəstək SLA-sı — qismən var (adminə ilk cavab müddəti, cavabsız sayı), hədəf müddət/prioritet yoxdur.

## 43. Tərcümə, intizam keçidi, dəstək hədəfi, slayd düzəlişi

- **EN/RU:** səhifə komponentləri üçün DOM səviyyəsində tərcümə (`observeTranslations` in `app/i18n.tsx`, `Joblink.tsx`-də effekt) və yeni cədvəl `lib/i18n-pages.ts` (≈450 ifadə: hesabat adları, əmr növləri, rollar, kalkulyator etiketləri, menyu təlimatı). Brauzerdə ölçüldü: EN/RU-da Azərbaycanca qalan sətirlər 2557-dən 1193-ə düşdü (-53%). Qalanlar: uzun izah cümlələri, kalkulyator sahə adları, istifadə təlimatının mətni (yalnız AZ), verilənlər (adlar, tarixlər). Yeni ifadə əlavə etmək üçün `lib/i18n-pages.ts`-ə `az|en|ru` sətri yazın.
- **Davamiyyətdən intizam əmri:** «Davamiyyət → Saat uçotu»nda gecikməsi olan işçinin sırasında «İntizam əmri» düyməsi; əmr pəncərəsi əsas hissəsi jurnaldan (gün sayı, dəqiqə, tarixlər) dolu açılır. Yerlidə yoxlandı: əmr yaradıldı, bazada `discipline` növü və əsas mətni var.
- **Dəstək SLA hədəfi:** adminin dəstək səhifəsində ilk cavab hədəfi (24 saat) və aşılanda xəbərdarlıq. Prioritet sahəsi yoxdur.
- **«Vakansiya aç» (ştat boş yerindən):** HR köməkçisi sorğunu avtomatik doldurur, layihə yaranır, sahələr doldurulub yayımlandıqda elan «published» oldu (yerlidə). Ştat planında yer yoxdursa server düzgün rədd edir («Ştat planında yer yoxdur»).
- **Slaydlar:** 26 slayd 1920×1080 ölçüdə render olunub baxıldı; taşma yoxdur. Tapılan qüsur: tünd-yaşıl fonlu slaydlarda kart başlıqları (MƏBLƏĞ, NAMİZƏD…) oxunmurdu — hər iki təqdimatda düzəldildi və yenidən dərc olundu. Şrift (Fraunces/DM Sans) sandbox-da yoxdur, ona görə şrift görünüşü yoxlanmadı.
- Hələ edilməyib: qaranlıq rejim, vakansiya kartında loqo, illüstrasiyalar, serif başlıqlar.

## 44. Vizual (C) bəndləri

- **Qaranlıq rejim:** yuxarı panelda ay/günəş düyməsi (`app/ThemeToggle.tsx`); seçim brauzerdə yadda qalır. Texnika: səhifə CSS `filter: invert(.9) hue-rotate(180deg)` ilə çevrilir, şəkillər geri çevrilir (`app/polish.css`) — köhnə CSS-dəki sərt rənglər üçün ən etibarlı yol, amma real qaranlıq palitra deyil (rənglər təxminidir). Çap zamanı söndürülür. İşəgötürən «Əmrlər reyestri» səhifəsində baxıldı; bütün səhifələr gəzilmədi.
- **Vakansiya kartında loqo:** server vakansiyaya `companyLogo` bayrağı əlavə edir (`companyIdsWithLogo`), kart/siyahı/detal başlığı ictimai `companies/logo` ünvanından şəkli göstərir; loqo yoxdursa hərf qalır. Yerlidə 1×1 test şəkli ilə yoxlandı (4 şəkil göründü), test şəkli sonra silindi.
- **Boş vəziyyət illüstrasiyası:** `.admin-empty` və ikonsuz `.empty` bloklarında CSS ilə kiçik şəkil. Brauzerdə ayrıca baxılmadı.
- **Serif başlıqlar:** Fraunces şrifti (`--font-serif`) açılış səhifəsi və səhifə başlıqlarında. Sandbox-da şrift yoxdur, ona görə yalnız CSS tətbiqi, görünüşü canlıda yoxlamaq lazımdır.

## 45. Hesab bölməsi: AI paketi, əlavə analiz, dəstək prioriteti, qiymət kartları

- **Şirkətin öz AI paketi** («Hesablar və ödənişlər» səhifəsinin yuxarısı, `AiAccountPanel`): qalan tam analiz/reytinq (aylıq + əlavə), paketləri dəyişmək (Yüksəlt / Keç) və əlavə analiz paketi almaq (Kiçik 12 ₼, Orta 59 ₼, Böyük 169 ₼; qiymətlər ən pis halda ≥25% xalis mənfəət üçün hesablanıb, `lib/ai-packages.ts`). Endpointlər: `GET company/ai-account`, `POST company/ai-plan/change`, `POST company/ai-topup` (`lib/api/handlers/ai-billing-01.ts`, icazə «billing»). Miqrasiya 0126 (`company_ai_credits`, `company_ai_topups`).
- **Ödəniş məntiqi:** kart şlüzü yoxdur. Yüksəliş və əlavə paket **açıq hesab-faktura** yaradır (ƏDV 18% daxil, 7 gün), paket/analizlər dərhal aktivləşir; ödəniş bank köçürməsi ilə admin tərəfindən qeyd olunur. Aşağı paketə keçid dərhal olur, geri ödəniş yoxdur. **Aylıq yenilənmə üçün avtomatik hesab-faktura yoxdur** (yalnız dəyişiklik anında); bu hələ qərar tələb edir.
- **Əlavə analiz istifadəsi:** aylıq limit bitəndən sonra əlavə balansdan çıxılır (`chargeAi` in route.ts). Bu hissə yalnız kod oxunuşu və arifmetika ilə yazılıb; real AI sorğusu ilə limit aşımı yerlidə sınanmayıb.
- **Dəstək prioriteti:** sorğu yaradanda «Təcili» qutusu (meta.priority), adminin siyahısında nişan və təcili açıq sorğular birinci; SLA sətrində təcili hədəf 4 saat, 24 saatlıq ümumi hədəf. Prioritet avtomatik deyil, istifadəçi seçir.
- **Açılış səhifəsində qiymət kartları:** hər paket üçün ad, qiymət və daxil olanlar (namizəd paketləri `lib/plans.ts`-dən, şirkət paketləri kvotalarla); EN/RU tərcümələri əlavə olundu.
- **Tərcümə:** `lib/i18n-pages.ts` ≈ 610 ifadəyə çatdı (kalkulyator sahələri daxil); Azərbaycanca qalan sətirlər (HR səhifələri üzrə cəmi): 2557 → ≈1170. Qalanı uzun izah cümlələri və verilənlərdir.

## 46. Açılış səhifəsinin yenidən dizaynı və kalkulyator bölməsi

- `app/Landing.tsx` + `app/landing.css`: mərkəzləşdirilmiş bölmə başlıqları, ikonlu rol və imkan kartları, addım kartları, iş axtaran/şirkət **sekməli** qiymət kartları («Ən çox seçilən» nişanı, «Paketi seç» düyməsi, hər paketin tərkibi), tünd-yaşıl yekun çağırış zolağı.
- **Yeni «Kalkulyatorlar» bölməsi** (qiymətlərin aşağısında): işləyən maaş kalkulyatoru (gross/net, sektor; `lib/salary.ts` ilə platformadakı eyni hesab), 8 kalkulyatorun siyahısı və «Bütün kalkulyatorlardan istifadə et» düyməsi. Hesab məlumat xarakterlidir; işçi kartındakı güzəştlər burada yoxdur.
- Yoxlandı: masaüstü və 390 px mobil (üfüqi sürüşmə yoxdur), AZ və EN, kalkulyatorda net 3000 → gross 3 605,69. RU və qaranlıq rejimdə bu səhifəyə baxılmadı. Şrift sandbox-da yoxdur (serif ehtiyat şrift görünür), real görünüşü canlıda yoxlamaq lazımdır.

## 47. Hesablamaların rəsmi mətnlərlə yoxlanması (Vergi və Əmək Məcəllələri, 14 saylı qərar)

Yüklənən mətnlər: Vergi Məcəlləsi (2026-cı il dəyişiklikləri ilə), Əmək Məcəlləsi, Nazirlər Kabinetinin 14 saylı qərarı və 2024-cü il 200 saylı dəyişiklik qərarı.

**Düzəldilənlər**
- **Gəlir vergisi, 200 AZN azadolma (Vergi Məcəlləsi 102.1.6):** əsas iş yerində aylıq gəlir 2500 AZN-dək olduqda 200 AZN vergidən azaddır. Əvvəl bu azadolma yalnız özəl sektora tətbiq olunurdu; **dövlət və neft-qaz sektoru üçün də** tətbiq olunur (1000 AZN gross üçün vergi 140 yox, 14% × 800 = 112). Azadolma gəlirin özünə (≤2500) bağlıdır, güzəştdən (102.2–102.5) sonrakı məbləğə yox: 2600 AZN gross və 200 AZN güzəştdə azadolma verilmir. Eyni düstur Excel iş kitabında da yenilənib. Test: `tests/salary.test.mjs`.
- **İcbari tibbi sığorta həddi:** 2% hissənin həddi 2500 deyil, **8000 AZN** (sən təsdiq etdin; 160 AZN + 8000-dən yuxarı hissənin 0,5%). Verilən Məcəllələrdə tibbi sığorta dərəcəsi yoxdur, ona görə bu rəqəm mətnlərdən yox, sənin təsdiqindən götürülüb. Excel iş kitabındakı parametr və etiketlər də yenilənib.
- **14 saylı qərar, 6-cı bənd:** daimi iş vaxtı yolda keçən, gediş-gəliş xarakterli, növbə metodu ilə işləyən və ya çöl işçilərinə ezamiyyə xərcləri əvəzinə gündə **20 AZN** (2024-də 15-dən artırılıb): normalar cədvəlinin izahında göstərilir (`TRAVELLING_WORKER_DAILY`).

**Mətnlə üst-üstə düşdüyü təsdiqlənənlər**
- 2026-cı il özəl sektor cədvəli (3% / 75 + 10% / 625 + 14%), dövlət-neft cədvəli (14% / 350 + 25%), güzəştlər 800 / 400 / 200 / 100 / 50 AZN.
- Əmək Məcəlləsi: əsas məzuniyyət 21 və 30 gün (114), staj əlavəsi 2/4/6 gün (116), uşaqlı qadın 2/5 gün (117), məzuniyyət pulu 12 ay ÷ 12 ÷ 30,4 (139), ixtisarda xəbərdarlıq 2/4/6/9 həftə və işdənçıxarma müavinəti 1/1,4/1,7/2 misli (77), xəbərdarlıq əvəzi 0,5/0,9/1,4/2 misli, sınaq müddəti 2 həftə/3 ay (51), iş vaxtından artıq ikiqat (165), tutulmalar 20% / 50% / 70% (176).
- 14 saylı qərar: ölkədaxili normalar (Bakı 125, Naxçıvan 100, Gəncə və Sumqayıt 95, digər 90), mehmanxana 70%, sənədsiz 50%, və **106 xarici ölkənin hər bir norması** (200 saylı qərarın cədvəli ilə maşın müqayisəsi: fərq yoxdur).

**Hələ yoxlanmayanlar:** DSMF faizləri (yalnız Sosial Sığorta Qanunu və tibbi sığorta qanunu ilə yoxlanır, onlar bu yükləmələrdə yoxdur), işsizlik sığortası 0,5%, istirahət/bayram günü işinin haqqı (164, 107, 109), müavinət düsturları (əvvəl yüklənmiş Sosial Sığorta Qanunu ilə yoxlanmışdı).

## 48. Super-gross necə yaranır (izah paneli)

- `superGrossParts` (`lib/salary.ts`) və `app/SuperGross.tsx`: super-gross = gross maaş + işəgötürənin üç payı (DSMF, işsizlik, icbari tibbi sığorta). Panel rəngli zolaq, hər payın məbləği, qaydası və pillələr üzrə hesabı («200-dək 200 × 22% = 44 ₼ · 200–8000 arası 1 800 × 15% = 270 ₼») və cəmi göstərir; işəgötürən paylarının gross-a nisbəti də yazılır.
- Yerləri: işəgötürən kalkulyatorunun nəticəsi (Kadr → Kalkulyatorlar → İşəgötürən kalkulyatoru) və açılış səhifəsindəki kalkulyator («Super-gross necə yaranır?» açılan bölmə). İşçi siyahısındakı və əmək haqqı səhifəsindəki super-gross sütunlarında hələ izah yoxdur.
- Test: hissələrin cəmi `employerCost`-a bərabərdir (hər iki sektor, 4 maaş səviyyəsi). Kalkulyatorun alt qeydi də düzəldilib (200 AZN azadolma hər iki sektora aiddir).

## 49. Açıq kalkulyator səhifəsi (reklam və tanınma üçün)

- **Ünvan:** `/kalkulyatorlar` (qeydiyyatsız, sitemap-də var). `app/PublicCalculators.tsx` + `app/kalkulyatorlar/page.tsx`: marka başlığı, «Pulsuz hesab aç» düyməsi, hero («pulsuz · qeydiyyatsız», 2026 dərəcələri, maddə nömrəsi ilə), 13 kalkulyator, yaşıl çağırış bloku («Bu hesabları komandanız üçün avtomatlaşdırın»), sual-cavab, alt hissə.
- **Paylaşıla bilən nəticə:** maaş kalkulyatoru rəqəmləri ünvana yazır (`?m=3000&k=net&s=public&r=200`), «Nəticənin linkini kopyala» düyməsi var; link açılanda eyni hesab görünür. «Çap et / PDF» çapda yalnız hesabı göstərir; çap olunan kalkulyator vərəqinin altına «JobMatch kalkulyatorları ilə hesablanıb · <sayt>/kalkulyatorlar» yazılır.
- **Super-gross izahı** açıq səhifədə də var («İşəgötürənə neçəyə başa gəlir?»).
- **Axtarış (SEO):** başlıq və təsvir, canonical, Open Graph/Twitter, JSON-LD (`WebApplication` + `FAQPage`). Açılış səhifəsindəki kalkulyator bölməsindən link verilib.
- Yoxlandı: link parametrləri tətbiq olunur (net 3000, dövlət, güzəşt 200 → gross 3 848,91; super-gross 4 791,89), kopyalanan link düzdür, 390 px mobil ölçüdə üfüqi sürüşmə yoxdur. Yoxlanmayıb: real domendə paylaşım önizləməsi (Open Graph şəkli yoxdur), Google-da indeksləmə, rus və ingilis dilləri (səhifə yalnız Azərbaycan dilindədir).

## 50. Giriş səhifəsinin yeni dizaynı

- Göndərilən nümunəyə uyğun: tünd şabalıdı-narıncı fon, şüşə (blur) kartlar, parlayan «uyğunluq» kürəsi və fırlanan orbitlər, iri böyük hərfli başlıq («DOĞRU İNSAN / DOĞRU İMKAN»), «AI ilə işləyir» nişanı, sağda açıq şüşəli giriş paneli, narıncı «Daxil ol» düyməsi. Kod: `app/Joblink.tsx` (giriş bloku) və `app/landing.css` (sonda).
- Şəkil kopyalanmayıb: kürə, orbit və kartlar CSS ilə çəkilib. Kartlardakı «87%» və müraciət yolu **nümunədir** (kartda «Nümunə: uyğunluq balı» yazılıb), «3 istifadəçi növü, 13 kalkulyator, 3 dil» real faktlardır; uydurma namizəd/vakansiya sayı göstərilmir.
- Mobil (390 px): animasiyalı səhnə gizlənir, başlıq və giriş paneli alt-alta düzülür. Hərəkət azaldılmış rejimdə animasiyalar söndürülür.
- Yoxlandı: 1440 və 390 px, üfüqi sürüşmə yoxdur, JS xətası yoxdur, giriş formu görünür və düymə işləyir vəziyyətdədir (real giriş bu dizayn dəyişikliyi ilə sınanmayıb). Rus/ingilis dili və planşet ölçüsü ayrıca baxılmayıb. Şrift sandbox-da yoxdur (serif ehtiyat), real şrift görünüşü canlıda yoxlanmalıdır. Açılış səhifəsinin aşağıdakı hissələri hələ açıq (yaşıl/ağ) palitradadır.

## 51. Açılış səhifəsi: tünd üslub, vakansiya nümunələri, yuxarı menyu

- **Tünd üslub:** giriş ekranının tünd şabalıdı-narıncı üslubu bütün açılış səhifəsinə yayıldı (`app/landing.css`, sonda): şüşə kartlar, narıncı düymələr, tünd kalkulyator, qiymət kartları, sual-cavab, yekun zolaq, alt hissə.
- **Vakansiya nümunələri** (`JobsShowcase` in `app/Landing.tsx`): `/api/joblink/state`-dən açıq vakansiyalar (ən çox 6), eyni formatda kartlar: loqo/hərf, ad, şirkət, şəhər/format/növ, maaş, bacarıqlar, «Müraciət et» (qeydiyyat formasını açır), «Bütün vakansiyalara bax» (`/jobs`). Vakansiya yoxdursa platformanın nümunə elanları göstərilir və «Nümunə» nişanı çıxır; xarici elanlar göstərilmir. **Diqqət:** yerlidə və canlıda hazırda sınaq hesabının elanları görünür; real buraxılışdan əvvəl sınaq verilənləri silinməlidir (əks halda ziyarətçi onları görəcək).
- **Yuxarı menyu** (`app/GateNav.tsx`): sabit panel (sürüşdükdə bulanıq fon), bölmələr (Kimlər üçün, Vakansiyalar, Qiymətlər, Kalkulyatorlar, Suallar) və **«Daxil ol»** düyməsi; basanda iki seçim: «Daxil ol» və «Qeydiyyatdan keç». Seçim formu açır və səhifəni ora sürüşdürür (`AccountLogin`-ə `mode` parametri). Mobildə bölmə linkləri gizlənir, yalnız loqo və «Daxil ol» qalır.
- Yoxlandı (1440 və 390 px): menyu açılır, «Qeydiyyatdan keç» qeydiyyat formasını (ad, rol, şifrə), «Daxil ol» giriş formasını göstərir; vakansiya, qiymət və kalkulyator bölmələrinə baxıldı, üfüqi sürüşmə və JS xətası yoxdur. Yoxlanmayıb: real qeydiyyat/giriş axını bu dəyişiklikdən sonra, rus və ingilis dilləri, planşet ölçüsü, kalkulyatorun giriş sahəsinin real yazı ilə sınağı.

## 52. Açıq səhifələrin tünd üslubu və tərcümə yoxlaması

- **`/jobs` və `/jobs/ID`:** giriş səhifəsi ilə eyni tünd üslub (`app/jobs/PublicShell.tsx`): yuxarı menyu, şüşə vakansiya kartları (şəhər/format/növ, maaş, qısa təsvir, «Ətraflı bax»), detalda iri kart və «Qeydiyyatdan keç və müraciət et». Server komponentidir, JS tələb etmir.
- **`/kalkulyatorlar`:** eyni tünd üslub (şüşə kalkulyator paneli, narıncı sekmələr, tünd giriş sahələri, yekun çağırış bloku, sual-cavab). Yuxarı menyu digər açıq səhifələrlə eynidir.
- **Dil dəyişəndə tərcümə olunmayan yerlər:** giriş ekranındakı «3 istifadəçi növü, 13 kalkulyator, 3 dil», «Nümunə: uyğunluq balı», «AI ilə işləyir», başlıq və kartlar tərcümə cədvəlində yox idi: əlavə olundu (`lib/i18n-landing.ts`). Platforma üzrə (işəgötürən, namizəd, admin) brauzerlə hər menyu bəndi və sekmə gəzilib tərcümə olunmamış mətnlər çıxarıldı; ≈770 yeni ifadə `lib/i18n-pages.ts`-ə yazıldı. Ölçü: HR menyusunda EN/RU-da Azərbaycanca qalan sətirlər 1169 → 708. **Hələ qalanlar:** ≈330 uzun izah cümləsi (hesabat və büdcə izahları, təlimat paraqrafları), vəzifə və universitet kataloqları (verilənlərdir), admin panelinin bir hissəsi. Yeni ifadə üçün `lib/i18n-pages.ts`-ə `az|en|ru` sətri əlavə etmək kifayətdir.
- **Tapılan düzəlişlər:** maaş hesablama səhifəsindəki «İcbari tibbi sığorta: 2500-dək» mətni 8000-ə, gəlir vergisi izahları 200 AZN azadolma ilə uyğunlaşdırıldı (`route.ts`).

## 53. E-poçt təsdiq kodu, giriş dialoqu, hüquqi mətnlər

- **Təsdiq kodu** (`lib/external-auth.ts`, `app/AccountLogin.tsx`): yeni hesab yaradılanda e-poçta 6 rəqəmli kod gedir (15 dəqiqə, hash ilə `auth_tokens`-də `code`; `pending` işarəsi kod daxil olana qədər girişi bağlayır). Kod düzgün olanda `verified=1` və sessiya yalnız onda verilir. Yeni yollar: `auth/verify-code`, `auth/resend-code`. Hər kod üçün 5 yanlış cəhd (sonra 429), «Kodu yenidən göndər», hesabı olub kodu daxil etməyən istifadəçi girəndə yeni kod gedir. Köhnə (pending işarəsiz) hesablar əvvəlki kimi girir.
- **E-poçt qurulmayıbsa** (`EMAIL_FROM` + `RESEND_API_KEY`/`EMAIL` yoxdur və `DEV_MAIL_LOG≠1`) kod addımı atlanır və qeydiyyat köhnə qaydada sessiya verir: heç kim kilidlənmir. Lokal yoxlama üçün `DEV_MAIL_LOG=1` (kod serverin jurnalına yazılır).
- **Giriş paneli** yalnız yuxarı menyudan «Daxil ol/Qeydiyyatdan keç» seçiləndə dialoq kimi açılır; dil seçimi menyuda «Daxil ol» düyməsinin yanındadır.
- **İstifadə şərtləri və Məxfilik siyasəti** (`lib/legal-text.ts`) genişləndirildi: 15 və 13 bölmə, «son yenilənmə» tarixi (`LEGAL_UPDATED`). Əlavə olunanlar: e-poçt kodu, işəgötürənin işçi/namizəd məlumatı üçün rolu, AI (OpenAI/DeepSeek), ötürülmə, saxlama, hüquqlar, çərəzlər, uşaqlar, AI kreditləri, məzmun lisenziyası, məsuliyyət həddi. Mətn qaralamadır: operatorun adı/VÖEN/ünvan `PLATFORM_*` dəyişənlərindən gəlir, buraxılışdan əvvəl hüquqşünas yoxlamalıdır (yaş həddi 16, məsuliyyət həddi və s. onun qərarıdır).
- **Hüquqi səhifələr (yenidən işləndi):** `/terms` və `/privacy` indi tünd üslubda, AZ/EN/RU dilində (`lib/legal-text.ts` → `termsDoc/privacyDoc(op, lang)`, `app/LegalPage.tsx`): «Qısaca» xülasəsi, yapışqan mündəricat (anker linkləri), nömrələnmiş bölmələr, dil seçimi (saytın seçilmiş dilini götürür), «Çap et / PDF», digər sənədə keçid. Mətni dəyişəndə `LEGAL_UPDATED` tarixini də dəyişin. EN/RU mətnləri AZ-dan tərcümədir, hüquqşünas hər üç dili yoxlamalıdır.

## 54. Paketlər, tünd panellər, e-poçt kodu düzəlişləri

- **Paket kartları oxunmurdu:** açılış səhifəsinin tünd `.plan-card` qaydaları (açıq rəngli mətn) daxili «Paketlər» səhifəsinin kartlarına da keçirdi. İndi bütün bu qaydalar `.landing .plan-card` ilə məhdudlaşdırılıb (`app/landing.css`).
- **Paket seçmək:** bank ödənişi (`PAYMENT_PROVIDER`) qoşulmayıb, ona görə «Ödəniş tezliklə aktiv olacaq» yazılırdı. İndi namizəd «Paketi seç» ilə sorğu göndərir (`plan/request` → Dəstək gələn qutusunda «Paket sorğusu: …», mövzu «Ödəniş»); admin sorğunu açıb «Paketi 30 gün aktivləşdir» basır (`admin/support/grant-plan`, ödəniş tutulmur). Bank qoşulanda əvvəlki «Bank səhifəsində ödə» düymələri avtomatik görünür. Şirkət tərəfi əvvəlki kimi hesab-faktura ilə işləyir (`company/ai-plan/change`).
- **Tünd panellər:** daxil olduqdan sonrakı panellər indi standart olaraq tünddür (ay/günəş düyməsi ilə açığa keçmək olar, seçim brauzerdə qalır; panellər bağlananda `data-theme` silinir ki, açıq səhifələr çevrilməsin). Qəsdən tünd/rəngli kartlar (`.ov-dark`, `.ov-teal`, `.admin-hero`, `.discovery-banner`, `.profile-cover`) `app/polish.css`-də geri çevrilir.
- **E-poçt kodu:** canlı mühitdə kod yalnız e-poçt qurulubsa gedir (`EMAIL_FROM` + `RESEND_API_KEY`, ya da Cloudflare `EMAIL` bağlaması). Qurulmayıbsa kod addımı atlanır. Provayder məktubu rədd edərsə (məs. domen təsdiqlənməyib), hesab «gözləyən» qalmır: qeydiyyat köhnə qaydada sessiya verir.
- **İşəgötürən «Paketlər» bölməsi** (`hr-packages`, «Şirkət» qrupunda): AI paketini dəyişmək və əlavə analiz almaq (`CompanyPackagesPage`); «Hesablar və ödənişlər» artıq yalnız hesab-fakturaları göstərir.
- **Telefonda sol menyu** (≤900 px): standart gizlidir, yuxarıdakı ☰ düyməsi ilə soldan açılır (tam yazılarla), bölmə seçiləndə, kənara toxunanda və ya Esc ilə yenidən sola çəkilir (`menuOpen` in `Joblink.tsx`, `app/polish.css` sonu). Köhnə 58–76 px ikon zolağı götürüldü.

## 55. ƏDV-siz qiymətlər və Kadr modulu (+150 ₼)

- **Qiymətlər ƏDV-siz göstərilir:** namizəd paketləri, şirkət AI paketləri və əlavə analiz paketlərində «X ₼ + 18% ƏDV = Y ₼» yazılır (açılış səhifəsi, «Paketlər», təsdiq pəncərələri). Hesab-faktura və ödəniş məbləği ƏDV daxil cəmdir (`lib/vat.ts`: `grossCents`, `vatAzn`, `withVatAzn`); invoysdakı «ƏDV» hissəsi mövcud `vatParts` ilə cəmdən çıxarılır. `COST_SHARES.vat` 0-dır (qiymət ƏDV-sizdir), mənfəət hesabı ona görə dəyişdi.
- **Kadr modulu:** hər AI paket kartında «Kadr modulu +150 ₼/ay + 18% ƏDV» qutusu var; işarələyəndə aylıq cəmi (paket + 150) və ƏDV göstərilir, təsdiqdən sonra hesab-faktura yaranır (`company/ai-plan/change` + `hrModule`). Dəyər `company_ai_plans.hr_module` (migrasiya 0127). Qiymət: `HR_MODULE_PRICE_AZN` in `lib/ai-packages.ts`.
- **Kadr paketi (AI-siz) və bağlanma:** «Paketlər»də ayrıca «Kadr paketi» kartı var (150 ₼ + 18% ƏDV = 177 ₼, AI olmadan bütün platforma); AI paketləri istəyə görədir və hər kartda yenə Kadr qutusu var. **Yalnız 2026-11-19-dan sonra qeydiyyatdan keçən şirkətlər** üçün Kadr bölmələri (işçilər, əmrlər, əmək haqqı, davamiyyət, ezamiyyət və s.; `HR_MODULE_API` in `lib/ai-packages.ts`) paket alınana qədər bağlıdır: API 402 qaytarır, interfeys «Paketlər»ə yönləndirir (`company/me` → `hrModuleActive`). Daha əvvəl qeydiyyatdan keçənlər pulsuz davam edir (`HR_MODULE_REQUIRED_FROM`). İşə qəbul bölmələri hamı üçün açıqdır.
- Kadr paketi aylıq avtomatik yenilənmir: faktura seçəndə yaranır; müddət bitəndə bağlama hələ yoxdur (bir dəfə alınan paket `hr_module=1` kimi qalır).

## 56. Admin: real AI xərci, paket AI limitləri, təqvim və qanunvericilik faylları

- **Real AI xərci:** provayderin cavabındakı `usage` (giriş, keşdən giriş, çıxış tokenləri) `ai_usage`-də saxlanılır (migrasiya 0128) və xərc bununla hesablanır; token sayı verməyən köhnə/başqa sorğular simvol sayından təxmin edilir. Admin «AI istifadə və xərc»də «Real %» (real ölçülmüş sorğu payı) və qiymət cədvəli (giriş / keşdən giriş / çıxış, 1 milyon token üçün USD) görür və dəyişir (`admin/ai-prices`). Aylıq AI büdcə limiti də real xərclə yoxlanılır. Namizəd paketinin token limiti də real tokenlə sayılır.
- **Paket AI limitləri** (`admin-package-limits`, `lib/package-limits.ts`): namizəd paketləri (AI müraciət/gün, CV analizi/gün, CV düzəlişi/gün, token/5 saat, token/ay) və işəgötürən paketləri (tam analiz/ay, reytinq/ay) admin tərəfindən dəyişir; saxlanan kimi hamıya tətbiq olunur (hər server nüsxəsi 1 dəqiqədən bir oxuyur). Paket yazıları («Gündə 5 AI CV analizi») limitlərlə birlikdə yenilənir. Cədvəl ən pis halda (limitin hamısı işləndikdə) aylıq xərci və qalan marjanı son 30 günün real token qiyməti ilə göstərir. Açılış səhifəsinin qiymət kartları hələ koddakı ilkin limitləri göstərir.
- **İstehsalat təqvimini fayldan yeniləmək:** şəkil/PDF (AI ilə, `OPENAI_API_KEY` lazımdır), Word, Excel, CSV, mətn, ICS (AI-siz, `lib/calendar-extract.ts`). Tapılan günlər «Avtomatik tətbiq et» seçiləndə dərhal yazılır («Son yükləməni geri al» düyməsi var), əks halda yoxlama üçün cədvəldə göstərilir.
- **Qanunvericilik kitabxanası** (`admin-laws`, migrasiya 0129): istənilən növ fayl (8 MB-a qədər) parça-parça D1-də saxlanılır və həmişə «attachment» kimi yüklənir; AI xülasə və sənəddəki rəqəmləri (faiz, hədd, müddət, maddə) çıxarır. Sənəd hesablamaları öz-özünə dəyişmir: admin rəqəmləri kalkulyatorlarla tutuşdurub özü yeniləyir.

- **Kadr + AI birlikdə 120 ₼:** Kadr modulu ödənişli AI paketi ilə birlikdə istifadə olunanda ƏDV-siz **120 ₼/ay** (ƏDV ilə 141,60 ₼), tək (AI-siz və ya pulsuz AI ilə) **150 ₼/ay** (177 ₼). Hər AI paket kartında «Kadr ilə birlikdə istifadə et» düyməsi var; basanda kartda cəmi (məs. Başlanğıc 49 + 120 = 169 ₼ + ƏDV = 199,42 ₼) görünür və təsdiqdən sonra bir hesab-faktura yaranır. Qiymətlər `lib/ai-packages.ts`-də (`HR_MODULE_PRICE_AZN`, `HR_MODULE_BUNDLE_PRICE_AZN`, `hrModulePriceFor`).

## 57. Açılış səhifəsinin «ember» dizaynı bütün panellərdə

- Açılış səhifəsinin tünd-qəhvəyi fon, şüşə kartlar və narıncı vurğu görünüşü indi üç paneldə (namizəd, işəgötürən, admin) də defoltdur; açıq tema günəş/ay düyməsi ilə qalır.
- Köhnə «bütün səhifəni çevir» filtri (`invert + hue-rotate`) silindi: rənglər artıq həqiqi rənglərdir, şəkillər geri çevrilmir.
- `app/ember.css` **avtomatik yaranır**: `node scripts/gen-ember-theme.mjs` açıq stil fayllarını oxuyur və hər rəngi rolu üzrə (fon, mətn, xətt, kölgə, qrafik pilləsi) ember palitrasına çevirir. Yeni komponent əlavə edəndən sonra bu əmri işlədin və faylı commit edin.
- Əllə yazılan hissə `app/ember-base.css`-dir (dəyişənlər, forma sahələri, düymələr, yan menyu, kartlar, komponentlərin içində birbaşa yazılmış rənglər). Çap zamanı tünd tema tətbiq olunmur (`@media screen`).
- **Oxunaqlıq yoxlaması:** hər üç paneldə (işəgötürən 29, namizəd 14, admin 24 səhifə) və yazı sahələrində avtomatik kontrast ölçüldü (mətn rəngi ilə həqiqi fon, şəffaf qatlar toplanaraq; WCAG 4,5:1, böyük yazı 3:1). Tapılan zəif yerlər düzəldildi: narıncı düymə/nişanlarda yazı ağ, açıq tonlu hüceyrələrdə (təqvim, davamiyyət, növbə) tünd yazı, uçan qatlar (bildiriş, pəncərə, menyu) şəffaf yox, tam qeyri-şəffaf; açılış səhifəsində narıncı düymələr tündləşdirildi.

## 58. Giriş səhifəsi: dəbilqəli fiqur, axtarış, telefon, keçidlər

- **Hero:** parlaq kürənin yerinə istifadəçinin göndərdiyi istinad şəklindən kəsilmiş dəbilqəli fiqur (`public/hero-figure.webp`; mənbə şəkil kiçik olduğundan EDSR süni intellekt modeli ilə 4 dəfə böyüdülüb, səs-küy təmizlənib, kənarları yumşaq maskalanıb). Orijinal yüksək ölçülü fayl olsa əvəz edilə bilər.
- **Axtarış:** hero-da «Vəzifə, şirkət, bacarıq + şəhər» axtarışı və sürətli çiplər; `/jobs?q=&city=` açıq vakansiya səhifəsində süzgəc kimi işləyir (vəzifə, şirkət, şəhər, format, növ, kateqoriya, tələblər üzrə).
- **Telefon:** yuxarı menyuda qulaqlıq işarəsi ilə nömrə (`tel:` linki), telefonda yalnız işarə; «Əlaqə» bölməsi və footer. Nömrə (`+994 55 478 25 81`) və e-poçt `lib/contact.ts`-dədir.
- **Yeni bölmələr:** «Sürətli keçidlər» (vakansiyalar, kalkulyator, CV təhlili, şirkət kimi başla, qiymətlər, suallar), vakansiyalarda format süzgəci (Uzaqdan/Hibrid/Ofisdə/Tam ştat/Yarım ştat), «Əlaqə» kartı; aşağıdakı bloklar görünəndə yumşaq açılır (hərəkət azaldılmışsa söndürülür).
- Yeni mətnlər 3 dildədir (`lib/i18n-pages.ts`).

## 59. Hüquqi mətnlər: beynəlxalq səviyyə

- **Məxfilik siyasəti (18 bölmə, 3 dil):** hüquqi çərçivə (Azərbaycan «Fərdi məlumatlar haqqında» Qanunu, GDPR prinsipləri, CCPA/CPRA), alt-emalçı siyahısı (Cloudflare, Resend, OpenAI/DeepSeek, ödəniş), başqa ölkələrə ötürmə mexanizmləri (DPA/SCC), genişləndirilmiş hüquqlar (giriş, düzəliş, silmə, məhdudlaşdırma, köçürülmə, etiraz, razılığı geri götürmə, avtomatik qərarlar, 30 gün cavab), təhlükəsizlik və pozuntu (72 saat hədəfi), çərəzlər və yerli yaddaş, uşaqlar (16+), ABŞ sakinləri.
- **İstifadə şərtləri (22 bölmə, 3 dil):** təriflər, uyğunluq və səlahiyyət, üçüncü tərəf xidmətləri, zəmanətlərin rədd edilməsi, müəllif hüququ və məzmun şikayəti qaydası, zərərin əvəzi, qüvvədən kənar hallar, sanksiyalar, tətbiq olunan hüquq (Bakı), bildirişlər, ayrılıqlılıq, bütöv razılaşma, dil üstünlüyü (Azərbaycan).
- Operator: standart olaraq **Digilabs**, əlaqə **info@digilabs.az**. Hüquqi ad, VÖEN və ünvan Cloudflare-də `PLATFORM_LEGAL_NAME`, `PLATFORM_VOEN`, `PLATFORM_ADDRESS`, `PLATFORM_EMAIL` ilə yazılanda mətndə görünür.
- Mətn işçi layihəsidir: açıqlamadan əvvəl hüquqşünas yoxlamalıdır.
- **Hero qrafikləri:** fiqurun ətrafında 3 «Nümunə» qrafiki (`app/GateCharts.tsx`): müraciət dinamikası (sütun, böyüyərək açılır), namizəd mərhələləri (dairəvi), işə qəbul sürəti (xətt, çəkilərək açılır). Bunlar bəzəkdir, canlı məlumat deyil və kartlarda «Nümunə» yazılıb; dar ekranda gizlədilir, hərəkət azaldılmışsa animasiyasızdır.

## 60. Admin: qiymətlər, Kadr müddəti, bildiriş, sağlamlıq, göstəricilər (2026-11-19)

- **Qiymətlər:** «Paket qiymət və limitləri» səhifəsində namizəd və işəgötürən paketlərinin qiyməti, həmçinin Kadr modulunun iki qiyməti (AI ilə birlikdə / tək) dəyişir. Dəyişiklik paket səhifələrinə, yeni hesab-fakturalara və giriş səhifəsinə (`/api/joblink/public/packages`) dərhal keçir; kəsilmiş hesab-fakturalar dəyişmir. Ödənişli paket 0 ₼ edilə bilməz; birlikdə qiymət təkdən çox ola bilməz; ƏDV (18%) qanunla sabitdir və buradan dəyişmir.
- **Kadr müddəti:** alınmış Kadr modulu 30 gün işləyir (`company_ai_plans.hr_until`, miqrasiya 0130), sonra 402 ilə bağlanır; şirkət «Paketlər»dən yenidən aktivləşdirir və ya «30 gün uzat» edir (müddət bitməmişsə mövcud sondan əlavə olunur). 19 noyabr 2026-dan əvvəl yaranmış şirkətlərdə modul pulsuz qalır. `hr_until` boş olan köhnə sətirlər müddətsizdir.
- **Əl ilə paket / sınaq:** «İşəgötürən AI paketləri»ndə hər şirkət üçün Kadr modulu +30 / +90 gün verilir və ya geri alınır (hədiyyə, sınaq); audit jurnalına yazılır.
- **Hamıya bildiriş:** «Sistem sağlamlığı» səhifəsində mətn, auditoriya (hamı / işəgötürən / namizəd), görünüş və son tarix yazılır; panellərin yuxarısında zolaq kimi görünür, istifadəçi bağlaya bilər.
- **Sistem sağlamlığı:** baza, miqrasiyalar, e-poçt, AI, Turnstile, ödəniş, şifrələmə açarı, cron (son işləmə `app_settings.cron_last`), 24 saatın xətaları, vaxtı keçmiş hesab-fakturalar.
- **Gəlir və göstəricilər:** son 30 gün qeydiyyat qrafiki, şirkət və namizəd hunisi (qeydiyyat → vakansiya/profil → paket → ödəniş), aylıq hesab-fakturalar, aylıq təxmini gəlir. Gəlir **təxmini**dir (aktiv paketlərin ƏDV-siz cəmi), ödəniş inteqrasiyası olmadığı üçün həqiqi daxilolma deyil.
- **Edilmədi:** hesaba «görüntü rejimi» (admin istifadəçi kimi baxır): təhlükəsizlik və məxfilik baxımından ayrıca dizayn və hüquqi əsas (məxfilik siyasətində admin baxışı) tələb edir.
- **Vergi və sığorta parametrləri tarixlə** (`admin-tax-params`, `lib/salary.ts`, `lib/tax-params-store.ts`): gəlir vergisi pillələri (iki sektor), DSMF (işçi/işəgötürən, iki sektor), tibbi və işsizlik sığortası, vergidən azad məbləğ və həddi, minimum əmək haqqı bir **parametr dəstidir** və onun qüvvəyə mindiyi günü var. Daxili 2026 dəsti kodda qalır; admin yeni dəst əlavə edir (köhnəsini kopyalayıb dəyişir). Hesablamalar günə görə dəsti seçir: əmək haqqı ayı üçün `taxDay`, kalkulyator üçün `asOf`; bugün üçün isə qüvvədəki dəst. Köhnə aylar köhnə faizlərlə qalır. Köhnə sabit hesablamayla eyni nəticə verdiyi test ilə sübut olunub (20 maaş × 2 sektor × 3 azalma, xalisdən ümumiyə, super-gross).
  - **Hələ dəstə bağlanmayanlar:** məzuniyyət, xəstəlik müavinəti həddi (25× minimum pensiya), ezamiyyət normaları və s. ayrıca qalır; `MINIMUM_WAGE` sabiti yalnız köhnə uyğunluq üçündür, canlı dəyər `minimumWageAt(gün)`-dir.
  - Brauzerdəki kalkulyatorlar dəstləri `public/tax-params`-dan səhifə açılanda oxuyur; ilk saniyələrdə daxili dəstlə hesablaya bilər.
