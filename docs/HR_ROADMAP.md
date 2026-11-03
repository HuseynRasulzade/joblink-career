# HR üçün tam funksiya xəritəsi və inkişaf təklifi

Tarix: 2026-10-29. Vəziyyət: canlı sayt `joblink-career.huseynresulzade04.workers.dev`, filial `claude/seed-demo-accounts`.

Qiymətləndirmə: ✅ var · 🟡 qismən · ❌ yoxdur. Əmək: S (1–2 gün), M (3–7 gün), L (2+ həftə).

## 1. Bir HR-ın işi və proqramdakı vəziyyət

| Sahə | Vəziyyət | Nə var / nə çatmır |
|---|---|---|
| İşə qəbul (vakansiya, namizəd, müsahibə, test, təklif) | ✅ | Vakansiyalar, namizəd axını, istedad bazası, müsahibə, testlər, iş təklifi, təsdiq zənciri, AI köməkçi. Çatmır: bir neçə sayta eyni anda yerləşdirmə, referal proqramı, rəy yoxlaması |
| İşçi kartı və şəxsi iş | ✅ | Şəxsi məlumatlar, vəsiqə, əlillik və vergi güzəşti, bank/kart, sənəd qovluğu, əmrlər, müqavilə şablonları, işçi profili qoşulması. Çatmır: sənəd müddəti xatırlatması (tibbi baxış, sertifikat), təşkilat sxemi, işçi şəkli |
| Ştat cədvəli və struktur | ✅ | Plan, kilid və direktor təsdiqi, vəzifə və şöbə kataloqu, maaş həddi, ştat dərəcəsi. Çatmır: ştat dəyişikliyi tarixçəsinin qrafik görüntüsü, vəzifə təlimatları (iş təsviri) |
| Davamiyyət | ✅ | Gün üzrə qeyd, Excel idxalı, qısaldılmış həftə, giriş-çıxış saatı, işçinin özünün qeydi, gecikmə jurnalı, artıq iş təsdiqi, saatların əmək haqqına avtomatik keçməsi, növbələr. Çatmır: məkan yoxlaması, turniket inteqrasiyası |
| Məzuniyyət və icazə | ✅ | Əmrlər, işçi ərizəsi, qalıq, məzuniyyət haqqı (md. 140), illik qrafik, birbaşa rəhbər təsdiqi ("İş yerim → Komandam"), üst-üstə düşmə və şöbə yükü yoxlaması, HR qapısı (rəhbər cavab verməmiş əmr hazırlanmır), ezamiyyət. Çatmır: rəhbərin yoxluğunda əvəzedici, məzuniyyət balansının ərizə zamanı iş günü ilə dəqiq yoxlanması |
| Əmək haqqı | ✅ | Hesablama, avans, vergi güzəşti, müavinətlər, ödənişlər və geri çəkmə, bank sənədi və ikinci təsdiq, hesablaşma hesabatı, haqq-hesab vərəqəsi, işçiyə bildiriş. Çatmır: bölmə 2-də |
| Hesabatlar | ✅ | İşçi axını, dövriyyə, kadr və fond hesabatı, hesablaşma hesabatı. Çatmır: qrafiklər, proqnoz, plan-fakt xəbərdarlığı |
| Performans və inkişaf | ❌ | Məqsəd, qiymətləndirmə dövrü, 360° rəy, 1:1 qeydləri, bacarıq matrisi, təlim planı |
| Aktivlər | ❌ | Noutbuk, telefon, açar, forma: verilmə və qaytarma aktı |
| İşçi təcrübəsi | ❌ | Elanlar, sorğular (eNPS), ad günü və il dönümü, HR-a müraciət (tiket) |
| Çıxış prosesi | 🟡 | Çıxış növü və səbəbi, işdən çıxarma əmri. Çatmır: çıxış siyahısı (aktivlərin qaytarılması), çıxış müsahibəsi, son haqq-hesabın əmək haqqına bağlanması |
| Əməyin mühafizəsi | ❌ | Təlimat jurnalları, tibbi baxış qrafiki, qəza qeydləri |
| Hüquqi uyğunluq | 🟡 | Əmr və müqavilə layihələri, audit qeydləri, rol və icazələr. Çatmır: sənəd reyestri və versiyalar, e-imza, daxili əmək qaydaları, şəxsi məlumatların rəzayəti və saxlama müddəti |

## 2. Əmək haqqı bölməsində qalan boşluqlar (düzəliş sırası ilə)

1. **Maaş tarixçəsi (M).** Hazırda keçmiş aylar cari maaşla hesablanır. Tarixlə qüvvəyə minən maaş cədvəli lazımdır; ay təsdiqlənəndə o ayın maaşı donur.
2. **İşdən çıxan işçinin son haqq-hesabı (M).** İstifadə olunmamış məzuniyyət kompensasiyası kalkulyatorda var, əmək haqqı cədvəlinə düşmür.
3. **Müavinət qaydalarının hüquqi yoxlanması (S).** Faiz (100%), ilk günlərin ödənişi, orta məbləğin əsası, e-bülleten nömrəsi.
4. **Təkrarlanan əlavə və tutulmalar (M).** Kredit, aliment, daimi əlavə hər ay yenidən yazılır; 176-cı maddədən artıq qalan tutulma növbəti aya keçmir.
5. **Saat uçotu (L).** Artıq iş, gecə və bayram saatları davamiyyətdən avtomatik gəlsin.
6. **Bank çıxarışı ilə uyğunlaşdırma (M).** Bank CSV yüklənir, ödənişlər avtomatik "ödənilib" olur. Birbaşa bank API-si üçün bankla müqavilə lazımdır.
7. **Cron ilə avtomatik hazırlıq (S).** Avans və maaş günü ödəniş sənədinin layihəsi və xatırlatma gündəlik işlə yaransın.
8. **Minimum əmək haqqı və 200 AZN azadolma yoxlaması (S).** Mühasib təsdiqləməlidir.
9. **Hesabat sürəti (M).** Təsdiqlənmiş aylar üçün hazır nəticədən oxumaq; böyük şirkətlərdə 12 ay canlı hesablanmasın.
10. **Şəxsi məlumatların şifrələnməsi və baxış jurnalı (M).** Kart, FİN, IBAN sahə səviyyəsində şifrələnsin; kimin hansı işçinin maaşına baxdığı qeydə alınsın.

## 3. Təklif olunan yeni modullar

### Dalğa 1: hüquqi risk və gündəlik iş (4–6 həftə)
| Modul | Niyə | Əmək |
|---|---|---|
| Məzuniyyət qrafiki və sorğu axını | İllik qrafik işəgötürənin öhdəliyidir; rəhbər təsdiqi, üst-üstə düşmə, qalıq proqnozu | M |
| Sənəd reyestri və müddət xatırlatmaları | Müqavilə, əmr və arayışların nömrələnməsi, versiyası, imza vəziyyəti; vəsiqə, tibbi baxış, sertifikat bitməsi | M |
| İşdən çıxma axını | Siyahı, aktivlərin qaytarılması, çıxış müsahibəsi, son haqq-hesab | M |
| Aktivlər (inventar) | Verilmə və qaytarma aktı, işçi çıxanda qaytarılmayanlar | M |
| Maaş tarixçəsi və son haqq-hesab | Bölmə 2, 1–2-ci bəndlər | M |
| Haqq-hesab vərəqəsi və sənəd bildirişləri | E-poçt və tətbiqdə xatırlatmalar genişləndirilsin | S |

### Dalğa 2: inkişaf və cəlb etmə (6–10 həftə)
| Modul | Niyə | Əmək |
|---|---|---|
| Performans: məqsədlər və qiymətləndirmə dövrü | Sınaq müddəti qiymətləndirməsi ilə başlamaq, sonra illik dövr | L |
| Təlim planı və büdcə | Sertifikat kataloqu və bacarıq kataloqu artıq var | M |
| Davamiyyət saatları və növbə qrafiki | Artıq iş və gecə işinin avtomatik hesabı | L |
| Ezamiyyət və xərc hesabatı | Əmək haqqındakı "digər ödəniş" ilə bağlanır | M |
| Elanlar və sorğular (eNPS) | İşçi bağlılığı, rəhbərə rəy | M |
| HR tiketləri | İşçi sual yazır, HR cavab verir, SLA ölçülür | M |

### Dalğa 3: platforma və inteqrasiya (uzunmüddətli)
| Modul | Niyə | Əmək |
|---|---|---|
| Bank API və çıxarış uyğunlaşdırması | Pulun faktiki köçürülməsi və yoxlanması | L |
| E-imza və müqavilələrin dövlət sistemində qeydiyyatı | Hüquqi tələb və əl işinin azalması | L |
| 1C və mühasibat ixracı | Mühasibin ikinci dəfə yazmaması | M |
| Mobil tətbiq (PWA) | İşçi vərəqə, məzuniyyət sorğusu, davamiyyət | L |
| Çoxşirkətli (holdinq) görünüş | Bir neçə hüquqi şəxs üçün ümumi hesabat | L |
| AI izahat və anomaliya | "Bu ay net niyə azdır?", qəfil dəyişən maaş xəbərdarlığı | M |

## 4. Gələn 30 gün üçün təklif edilən sıra
1. Məzuniyyət qrafiki və sorğu axını.
2. Maaş tarixçəsi və işdən çıxanın son haqq-hesabı.
3. Sənəd reyestri və müddət xatırlatmaları.
4. İşdən çıxma siyahısı və aktivlər.
5. Müavinət qaydalarının hüquqi yoxlanması (qanun mətni lazımdır).

## 5. Bilmədiklərim və sizdən lazım olanlar
- Sosial Sığorta Qanunu mətni (müavinət faizi, ilk günlərin ödənişi, orta məbləğin əsası).
- Bankların birbaşa köçürmə API-si üçün müqavilə və giriş məlumatları.
- Şirkətin illik məzuniyyət qrafikinin və daxili əmək qaydalarının mövcud formaları.
- E-imza və dövlət sisteminin istifadə tələbləri.

## 6. İcra vəziyyəti (2026-11-02)

**Edilənlər** (canlı sayt, hər biri API səviyyəsində yoxlanılıb)

| Bənd | Harada |
|---|---|
| Maaş tarixçəsi (tarixlə qüvvəyə minən maaş, gün üzrə çəkili hesab) | İşçi kartı → Maaş tarixçəsi |
| Çıxan işçinin məzuniyyət kompensasiyası əmək haqqında | Əmək haqqı cədvəli (xitam ayı) |
| Təkrarlanan əlavə və tutulmalar, 176-cı maddə həddindən qalan tutulmanın növbəti aya keçməsi | Əmək haqqı → Əlavə / tutulma |
| Əmək haqqı məlumatlarının Excel idxalı | Əmək haqqı → Excel-dən əlavə və saatlar |
| Minimum maaş və ani dəyişiklik (±25%) xəbərdarlıqları | Əmək haqqı cədvəli |
| Gündəlik xatırlatmalar (avans günü, təsdiqlənməmiş ay, sənəd müddəti) | Cron (gündəlik) |
| Bank çıxarışı ilə ödənişlərin uyğunlaşdırılması | Əmək haqqı → Bank və ödəniş sənədləri |
| Saat uçotu (gün üzrə saat, artıq iş, istirahət günü işi, gecə), Excel idxalı | Davamiyyət → Saat uçotu |
| Baxış jurnalı (kim maaşa və şəxsi məlumata baxıb) | Şirkət audit jurnalı |
| Məzuniyyət qrafiki, işçi təklifləri, departament yükü, çap | Kadr əməliyyatları |
| Sənəd reyestri, bitmə tarixləri, hazırlanmış sənədlərin saxlanması və işçinin elektron təsdiqi | Kadr əməliyyatları, İş yerim → Sənədlər |
| İşdən çıxma siyahısı və çıxış müsahibəsi | Kadr əməliyyatları, İş yerim |
| Aktivlər (əmlak), təhvil-təslim aktı, Excel idxalı | Kadr əməliyyatları, İş yerim → Əmlakım |
| Təşkilat sxemi | Kadr əməliyyatları |
| Performans (dövr, məqsəd, özünüqiymət, rəhbər qiyməti, təsdiq) | İnkişaf və kommunikasiya, İş yerim |
| Təlim planı, büdcə, iştirakçılar, əməyin mühafizəsi təlimləri | İnkişaf və kommunikasiya, İş yerim |
| Növbə qrafiki və növbələrin saat uçotuna köçürülməsi | İnkişaf və kommunikasiya, İş yerim |
| Ezamiyyət: sorğu, təsdiq, xərc hesabatı, hesablaşma | İnkişaf və kommunikasiya, İş yerim |
| Elanlar və sorğular (eNPS, anonimlik qorunur) | İnkişaf və kommunikasiya, İş yerim |
| HR tiketləri əvəzinə: mövcud “İşçi ərizələri” + cavab müddəti statistikası | Əmrlər reyestri → İşçi ərizələri |
| Mühasibat jurnalı (debet/kredit, şirkətin hesab kodları) | Əmək haqqı → Mühasibat jurnalı |
| “Bu ay nə dəyişib?” izahı | İş yerim → Əmək haqqı |
| Mobil (PWA) | Əvvəldən var (manifest və service worker) |

**Edilməyənlər və səbəbi**

| Bənd | Səbəb |
|---|---|
| Birbaşa bank API və pulun avtomatik köçürülməsi | Bankla korporativ müqavilə və giriş məlumatları lazımdır |
| Hüquqi qüvvəli e-imza, əmək müqaviləsinin dövlət sistemində qeydiyyatı | Xarici sistem və sertifikat tələb olunur (indiki təsdiq sadə elektron təsdiqdir) |
| Kart, FİN, IBAN sahələrinin şifrələnməsi | Şifrələmə açarı (gizli dəyər) və bütün oxuma yerlərinin dəyişməsi lazımdır; ayrıca iş kimi planlaşdırılmalıdır |
| Müavinət faizlərinin hüquqi yoxlanması | Sosial Sığorta Qanunu mətni lazımdır |
| Holdinq (çox şirkətli) görünüşü | Şirkətlər arasında hesab əlaqəsi və icazə modeli lazımdır |
| Vakansiyaların bir neçə sayta yerləşdirilməsi, referal proqramı, rəy yoxlaması | Xarici saytların müqaviləsi; ayrıca modul kimi planlaşdırılmalıdır |

## 7. Sonrakı mərhələ (2026-11-02)

| Bənd | Vəziyyət |
|---|---|
| Müavinət faizləri | Şirkət ayarlarında dəyişdirilir (Əmək haqqı → Ödəniş ayarları, yalnız direktor); qanun mətni gələndə yalnız rəqəm yazılır |
| Şəxsi məlumatların şifrələməsi | Kod hazırdır (AES-GCM). `DATA_KEY` gizli dəyəri qoyulanda yeni yazılanlar şifrələnir, “Şirkət məlumatları” səhifəsindəki düymə köhnələri şifrələyir. Açar yoxdursa hər şey əvvəlki kimi işləyir |
| Tövsiyə proqramı | Kadr əməliyyatları → Tövsiyə proqramı; işçi tərəfi İş yerim → Tövsiyə proqramı; bonus ödənişi əmək haqqında “digər ödəniş” |
| Rəy yoxlaması | Kadr əməliyyatları → Rəy yoxlaması |
| Vakansiya paylaşma | Vakansiyalarım → Paylaş; açıq vakansiyaların XML lenti: `/jobs/feed.xml` |
| Hələ edilməyib | Birbaşa bank API, hüquqi e-imza və dövlət sistemində qeydiyyat, holdinq görünüşü |

## 8. Sosial Sığorta Qanunu tətbiqi

- Md. 6: müavinət üçün ən azı 6 ay sığorta stajı (işdə keçən ay + profildə «əvvəlki sığorta stajı»); staj çatmırsa müavinət 0.
- Md. 6 / Əmək Pensiyaları Qanunu md. 6-1: aylıq müavinət ≤ 25 × minimum əmək pensiyası. Pensiyanın məbləği qanun mətnində yoxdur, ayarlarda daxil edilir.
- Md. 17: müavinəti sığortaçı birbaşa ödəyir; defolt rejim «sığortaçı». Şirkət ödəyirsə ayarlarda «şirkət ödəyir» seçilir, onda ödəniş/bank reyestri açılır.
- Faiz qanunda yoxdur: şirkət ayarıdır.

## 9. Qrup (holdinq) girişi: ən sonda

Qərar: holdinq görünüşü ayrıca yeni **istifadəçi giriş növü** kimi qurulacaq (qrup rəhbəri girişi). Bir giriş bir neçə şirkət hesabına qrup səviyyəsində baxır. Bütün digər işlər bitəndən sonra edilir. Əvvəlcədən lazım olan qərarlar: qrupa hansı şirkət hesabları daxildir, qrup girişi nəyi görür (yalnız icmal/hesabat, yoxsa maaş da), şirkət sahibinin razılığı necə alınır.

## 10. İstifadəçi növləri üzrə uyğunsuzluq və çatışmazlıqlar (2026-11-02)

Mənbə: menyu, icazə cədvəli (`lib/company.ts`) və API yolları üzrə kod baxışı. «Yoxlanmalı» işarəsi: kodda təsdiq etmədiyim, test lazım olan bənd.

### Şöbə rəhbəri (rol «manager»)
- Rolun icazəsi yalnız «hesabatlar»dır. Kadr əməliyyatları (məzuniyyət qrafiki, ezamiyyət, növbə, performans, təlim) «işçilər» icazəsinə bağlıdır; şöbə rəhbəri öz şöbəsinin işçiləri üçün bunları təsdiq edə bilmir.
- Şöbə üzrə məhdudlaşdırılmış görünüş yoxdur: rəhbər yalnız öz komandasını (davamiyyət, məzuniyyət, ərizələr) görməlidir.
- Aşağı işçinin ərizəsi/məzuniyyəti/ezamiyyəti əvvəl rəhbərə, sonra HR-a gedən zəncir yoxdur.
- Performans qiymətləndirməsini rəhbər öz komandası üçün yaza bilmir.

### İşçi («İş yerim»)
- Şəxsi məlumat dəyişikliyi (ünvan, kart, IBAN) üçün təsdiqli sorğu axını yoxdur; yalnız ümumi ərizə var.
- Özünüxidmət davamiyyət qeydi (gəliş/gediş, məkan) yoxdur; davamiyyəti HR/tabel məsulu aparır.
- Hüquqi qüvvəli elektron imza yoxdur; imza «oxudum/təsdiq edirəm» qeydidir.
- Mobil push bildirişi yoxdur (PWA var, push ayrıca qurulmayıb).
- Müavinətin faktiki ödənişi (sığortaçıdan) işçi tərəfdə izlənmir.

### HR meneceri
- Qəbul olunmuş təklifdən avtomatik işçi kartı və əmr yaradılması: yoxlanmalı.
- Vergi/DSMF aylıq bəyannamə formaları (rəsmi portal formatı) yoxdur; yalnız hesabat və 1C ixracı var.
- İşə qəbul/ixrac sənədlərinin dövlət reyestrinə (ƏMAS) göndərilməsi yoxdur.
- HR üçün vahid «bu gün nə etməli» siyahısı (gecikən təsdiqlər, müddəti bitən sənədlər) yalnız hissəvi: xatırlatmalar var, vahid pəncərə yoxdur.

### Mühasib / maliyyə
- Bank ilə birbaşa köçürmə yoxdur (fayl ixracı + çıxarış uzlaşdırması var).
- Müavinətin sığortaçıdan əldə edilməsi və şirkətlə uzlaşdırılması üçün ayrıca uçot yoxdur.
- Yalnız-oxu «xarici auditor/mühasib» rolu yoxdur.
- Minimum pensiya və müavinət faizi əl ilə daxil edilir; dəyişikliyi izləyən rəsmi mənbə bağlantısı yoxdur.

### Direktor / hesab sahibi
- Bütün təsdiqlər üçün vahid pəncərə hissəvidir (vakansiya, ödəniş partiyası, struktur ayrı yerlərdə).
- Şifrələmə açarı (`DATA_KEY`) qoyulmayıb, şəxsi məlumatlar hələ şifrəsizdir; açarın ehtiyat nüsxəsi məsuliyyəti sizdədir.
- Qrup/holdinq görünüşü: 9-cu bölməyə bax.

### Rekruter
- Vakansiyanın xarici saytlara avtomatik göndərilməsi yoxdur (lent və paylaşma linki var).
- Namizəd sənədlərinin (CV, sertifikat) toplu yoxlanması: yoxlanmalı.

### Namizəd (iş axtaran)
- Namizəd işə qəbul olunanda hesabdan «İş yerim»ə keçid yalnız şirkət bağlantısı ilə olur; avtomatik keçid: yoxlanmalı.
- Müsahibə vaxtını namizədin özünün seçməsi (boş vaxt cədvəli): yoxlanmalı.

### Platforma admini
- Şirkət bazalarının məxfilik girişi üçün ayrıca baxış jurnalı var (audit); şirkət daxili HR məlumatlarına admin girişinin məhdudlaşdırılması ayrıca qərardır.
- Ödəniş/paket tərəfi mövcuddur; real kart ödənişi inteqrasiyası xarici müqavilə tələb edir.

## 11. Davamiyyət tamamlandı (2026-11-02)

- Giriş-çıxış saatı: tabel məsulu gün üzrə vaxt yazır, saat avtomatik hesablanır (nahar fasiləsi çıxılır, gecə 22:00–06:00).
- İşçi «İş yerim → Giriş-çıxış»da «Gəldim/Getdim» basır; vaxtı server (Bakı vaxtı) yazır.
- Gecikmə və tez çıxış (icazə müddəti ayarlıdır), boş qalmış iş günləri, Giriş-çıxış jurnalı.
- Artıq iş təsdiqi: ayar açıqdırsa təsdiqlənməyən artıq iş və istirahət günü saatı əmək haqqına düşmür (md. 99, 105).
- Hələ yoxdur: coğrafi məkan yoxlaması, turniket/biometrik cihaz inteqrasiyası, rəhbərin yalnız öz şöbəsi üzrə təsdiqi.

## 12. Məzuniyyət və icazə tamamlandı (2026-11-02)

- İşçi kartında «Birbaşa rəhbər» seçilir (rəhbərin «İş yerim» profili qoşulmalıdır). Məzuniyyət və icazə növlü ərizələr əvvəlcə rəhbərə gedir, rəhbər «Komandam» bölməsində təsdiq və ya səbəblə rədd edir.
- Rəhbər cavab verməyənə qədər HR əmr hazırlaya bilmir; rəhbər rədd edərsə ərizə bağlanır və işçiyə bildiriş gedir.
- Yoxlamalar (ərizə yazılanda, rəhbərə və HR-a): cədvəldə həmin günlərdə artıq məzuniyyət/xəstəlik qeydi, işçinin başqa açıq ərizəsi, şöbədə eyni vaxtda çox adamın məzuniyyəti.
- Rəhbər komandasının bu günkü vəziyyətini və növbəti 45 gündə kimin olmayacağını görür.
- Hələ yoxdur: rəhbər məzuniyyətdə olanda əvəzedici, rəhbərin komandasında davamiyyət/artıq iş təsdiqi.

## 13. Hesabat sürəti (2026-11-02)

- Çox aylı hesabatlarda (hesablaşma hesabatı) aylar üçün ortaq məlumat bir dəfə yüklənir: maaş tarixçəsi, ödəniş ayarları və təsdiqlənmiş ayların donmuş nəticələri. Əvvəl hər ay bunu təkrar yükləyir və hər ayın 12 əvvəlki snapşotunu yenidən oxuyurdu (12 aylıq hesabatda ən çox 150-yə yaxın snapşot oxunuşu, indi 12).
- Nəticə əvvəlki ilə eynidir (400 işçi, 12 təsdiqlənmiş ay üzərində hesabatın bütün məzmunu müqayisə olunub).
- Yerli bazada vaxt demək olar dəyişmir (~0,5 san): qazanc D1 sorğularının sayında (12 aylıq hesabatda ~48 ortaq sorğu əvəzinə 3) və CPU-dadır. Canlı sayt üzərində ölçülməyib.
- Edilməyib: hazır xülasə cədvəli. Ödəniş geri çəkiləndə, ay yenidən açılanda və işçi məlumatı dəyişəndə onu yeniləmək riski var; ölçmə göstərməsə lazım deyil.

## 14. Əmək haqqı siyahısının qalan bəndləri (2026-11-02)

- 3. E-bülleten nömrəsi: əlavə/tutulma pəncərəsində yazılır; müavinət günü olub nömrə yoxdursa cədvəldə xəbərdarlıq, hesablaşma hesabatında müavinət sətrində nömrə görünür.
- 7. Ödəniş sənədinin layihəsi: bank hesabı «avtomatik hazırla» rejimindədirsə layihə avans və maaş günü bank bölməsi açılanda yaranır; gündəlik cron xatırlatma göndərir. Cron özü layihə yaratmır, çünki hesablama serverin sorğu qatındadır.
- 8. Vergi parametrləri: cədvəldə banner göstərir (minimum əmək haqqı, gəlir vergisi, DSMF, tibbi və işsizlik sığortası); mühasib ildə bir dəfə «Yoxladım, təsdiq edirəm» basır, təsdiq audit jurnalına yazılır.
- 10. Şifrələmə: kod hazırdır; `DATA_KEY` secret-ini yalnız sahib qoya bilər.

## 15. Saat uçotunun birləşdirilməsi (2026-11-02)

- **Saat yalnız bir yerdə yazılır: Davamiyyət → Saat uçotu.** Əmək haqqı pəncərəsindən artıq iş, istirahət günü, gecə saatı və gecə əlavəsi sahələri çıxarıldı; orada yalnız oxunan xülasə qalır (mənbə, saatlar, gözləyən saat).
- **İki rejim:** gündəlik (gün üzrə saat və giriş-çıxış) və ay yekunu (işçi üçün ayda bir rəqəm). Eyni ay üçün gündəlik qeyd varsa yalnız o sayılır, ikisi toplanmır; ay yekunu gündəlik qeyd olan aya yazılmır.
- **Excel:** «gündəlik saat» və «ay yekunu» ayrı faylla yüklənir. Əmək haqqı Excel-i yalnız mükafat, əlavə və tutulmanı yükləyir; saat sütunları olarsa xəbərdarlıq verilir.
- **FİN ilə eyniləşdirmə:** davamiyyət, saat (gündəlik və ay yekunu) və əmək haqqı Excel-ində «FİN» sütunu varsa işçi yalnız FİN ilə tapılır; eyni adlı iki işçi dəqiq ayrılır. FİN işçi kartında yazılmalıdır.
- **Gecə əlavəsi faizi** işçi kartına köçdü (köhnə rəqəm hələ yazılıbsa ehtiyat kimi işləyir).
- **Artıq iş əmri:** imzalanmış «artıq işə cəlb» və «istirahət günü işə cəlb» əmri həmin günlərin saatını təsdiqləyir (ayarda təsdiq qaydası açıqdırsa).
- **Əmrsiz məzuniyyət:** davamiyyətdə əllə işarələnmiş və əmri olmayan məzuniyyət/icazə günləri üçün xəbərdarlıq.
- **Köçürmə:** təsdiqlənməmiş aylarda əmək haqqı pəncərəsində yazılmış saatlar ay yekunu kimi köçürüldü (təsdiqlənmiş statusla); təsdiqlənmiş aylar donmuş nəticədən oxunur və dəyişmir.

## 16. İnkişaf və kommunikasiya tamamlanması, işçi sorğuları, «Bu gün» paneli (2026-11-03)

**Edilənlər**
- Növbə qrafiki: təyinatda məzuniyyət/xəstəlik/ezamiyyət ilə toqquşma, iki növbə arası fasilə və ardıcıl iş günü yoxlaması (xəbərdarlıq, həddlər «Qaydalar»da), dövrü şablon (məs. 2 iş / 2 istirahət).
- Təlim: sertifikatın etibarlılıq müddəti və nömrəsi, bitən sertifikatların siyahısı, gündəlik cron ilə HR-a xatırlatma, vəzifəyə görə məcburi təlim və onu keçməyənlər, işçi öz sertifikatını görür.
- Elanlar: «oxudum, təsdiq edirəm» tələbi, kimin oxuduğu/təsdiqlədiyi və gözləyənlər.
- 1:1 görüş qeydləri (HR və rəhbər yazır, işçiyə görünən və yalnız rəhbərlərə görünən).
- Rəhbər («İş yerim → Komandam»): komandanın performans qiymətləndirməsi, ezamiyyət sorğusunu təsdiqi/rədd, komandanın növbələri, 1:1 qeydləri.
- Ezamiyyət: rəhbər təsdiqi mərhələsi, xarici ezamiyyət işarəsi, ölkə daxili/xarici gündəlik normalar (gündəlik boş qalanda tətbiq olunur).
- eNPS sorğular arası dinamika.
- İşçinin məlumat dəyişikliyi sorğusu (IBAN, kart, ünvan və s.): HR yoxlayıb təsdiq edəndə kart yenilənir, dəyər şifrələmə açarı varsa şifrəli saxlanır.
- HR «Bu gün nə etməli» paneli (gözləyən ərizələr, rəhbərdə ilişənlər, bitən sənəd və sertifikatlar, sınaq müddəti, ad günləri, təsdiqlər).

**Hələ edilməyib (səbəbi ilə)**
- Ezamiyyət qəbzlərinin şəkil/fayl kimi yüklənməsi (fayl anbarı və ölçü qaydaları ayrıca qərar tələb edir).
- Dövlət gündəlik normasının rəsmi cədvəldən avtomatik hesablanması: normalar şirkətin özü tərəfindən yazılır.
- Növbələrdə departament üzrə minimum işçi sayı qaydası və işçilər arası növbə dəyişdirmə sorğusu.
- 360° rəy və bacarıq matrisi, qiymətin maaş artımına bağlanması.
- Təlim müqaviləsi (təlimdən sonra işləmə öhdəliyi).
- Elana fayl əlavəsi, şərh, dövri (aylıq) sorğuların planlanması.
- Holdinq (qrup) girişi, bankla birbaşa köçürmə, hüquqi e-imza, mobil push, turniket/GPS: xarici müqavilə, açar və ya ayrıca qərar tələb edir.

## 17. İnkişaf və kommunikasiya: ikinci mərhələ (2026-11-03)

- **Növbə qrafiki səhifəsi anlaşıqlı oldu:** bölmənin başında nə üçün olduğu yazılır; növbə növü yoxdursa «Standart növbələri yarat» düyməsi 4 növbə (Səhər, Gündüz, Axşam, Gecə) yaradır; növbələr rənglidir; hər işçinin iki həftəlik saat cəmi göstərilir (40 saatdan çox qırmızı); «Çap» düyməsi.
- **Departament üzrə minimum işçi sayı** («Qaydalar»da): planlanmış gündə departamentdə növbədə kifayət qədər adam yoxdursa xəbərdarlıq.
- **Növbə dəyişdirmə:** işçi kolleqaya xahiş göndərir → kolleqa razı olur → rəhbər («Komandam») və ya HR təsdiq edir → iki növbə yerini dəyişir.
- **Kolleqa rəyi (360°):** HR və ya rəhbər seçilmiş kolleqalardan rəy istəyir; kolleqa 1–5 qiymət və qısa mətn yazır; yalnız orta qiymət və adsız mətnlər görünür (HR, rəhbər).
- **Təkrarlanan sorğular:** sorğu aylıq/rüblük/illik təkrarlana bilər; gündəlik iş vaxtı çatanda köhnə dövrü bağlayıb yenisini açır və işçilərə bildiriş göndərir.
- Hər hissənin başında nə üçün olduğu və necə işlədiyi qısaca yazılıb.

**Hələ edilməyib:** ezamiyyət qəbzlərinin faylı, rəsmi gündəlik normanın avtomatik hesabı, təlim müqaviləsi, bacarıq matrisi, qiymətin maaş artımına bağlanması, elana fayl və şərh.

## 18. Qalan bəndlərin bağlanması (2026-11-03)

- **Rəhbərin komandası üçün davamiyyət:** «Komandam»da komandanın təsdiq gözləyən artıq iş saatları (gün və ay yekunu) təsdiq/rədd edilir.
- **Auditor rolu (yalnız baxış):** əmək haqqı, işçilər, davamiyyət, sənəd və hesabatlara baxır; server şirkət məlumatına hər yazını rədd edir; IBAN, FİN, bank və Excel faylları bağlıdır.
- **Vahid təsdiq pəncərəsi:** «Təsdiqlər» səhifəsində vakansiya/struktur təsdiqlərindən sonra «Digər gözləyən təsdiqlər»: artıq iş, növbə dəyişdirmə, ezamiyyət, məzuniyyət qrafiki (bir kliklə), ödəniş sənədləri və ərizələr (keçidlə).
- **Müavinət uçotu:** hər ay üçün gözlənilən müavinət (işçi, gün, məbləğ, e-bülleten) və sığortaçıdan daxil olanlar, fərq.
- **Ödəniş sənədi layihəsi cron ilə:** bank hesabı «avtomatik hazırla» rejimindədirsə gündəlik iş şirkətin sahibi adından 5 dəqiqəlik, dərhal silinən sessiya ilə bank səhifəsini açır, avans/maaş günü layihə hazır olur.
- **Ezamiyyətdən əmr:** təsdiqlənən ezamiyyət üçün əmr avtomatik yaranır (şöbə rəhbəri və direktor imza üçün), imzalayan yoxdursa günlər «ezamiyyətdə» işarələnir.
- **Məzuniyyət balansı:** ərizə yazılanda istənilən gün sayı (bayramsız) qalıqla müqayisə olunur; **əvəzedici:** işçi kartında rəhbərin əvəzedicisi seçilir, rəhbər yoxdursa ərizə əvəzedicisinə (yoxdursa HR-a) gedir.
- **Elana şərh:** işçilər şərh yazır, HR cavab verir və silir.
- **Təlim öhdəliyi:** təlimdən sonra işləmə müddəti və xərc; çıxış prosesində xəbərdarlıq.
- **Bacarıq matrisi:** bacarıqlar, işçi səviyyəsi, vəzifə hədəfi, boşluqlar (HR, rəhbər, işçi).
- **Qiymət → maaş artımı:** qiymətləndirmədən sonra tövsiyə (artım, mükafat, vəzifə, inkişaf planı); artım tarixlə maaş tarixçəsinə tətbiq olunur.
- **Namizəd müqayisə cədvəli:** müsahibə nəticələri, maaş gözləntisi və diapazon, təcrübə və məcburi sertifikat çatışmazlığı, qısa nəticə, Excel və çap.

**Qərarla edilməyib:** əmək haqqı hesabatı üçün hazır xülasə cədvəli. Hesabat 400 işçi və 12 ay üçün yerli bazada ~0,5 saniyədir; xülasə cədvəli ödəniş geri çəkiləndə, ay açılanda və işçi məlumatı dəyişəndə köhnəlib səhv rəqəm göstərmək riski daşıyır, ölçülmüş problem olmadığı üçün əlavə edilmədi.

## 19. Növbə işçi kartına bağlı oldu (2026-11-03)

- İşçi kartında «Növbəli rejimdə işləyir» + standart növbə + ritm (ardıcıl iş/istirahət günü, başlanğıc). İşarələnməyibsə işçi adi iş rejimindədir.
- Növbə cədvəlinə yalnız növbəli işçilər düşür; növbə yalnız onlara təyin olunur (digərlərinə server rədd edir).
- Standart növbələr (Səhər 08–16, Gündüz 09–18, Axşam 16–24, Gecə 22–06) şirkət üçün avtomatik yaranır; dəyişmək və əlavə etmək olar. Növbənin adı dəyişsə, işçi kartlarındakı standart növbə də yenilənir.
- «Standart rejimlə doldur»: hər işçinin növbəsi və ritmi ilə seçilən iki həftənin boş günləri doldurulur (artıq təyin olunmuş günlərə toxunulmur).
- «Növbəli işçilər» pəncərəsi: bir neçə işçini birdən növbəli rejimə keçirmək/qaytarmaq.
- Excel: «Excel: növbə cədvəli» (işçi, tarix aralığı, növbə və ya İstirahət) və «Excel: növbəli işçilər» (rejim, standart növbə, ritm); hər ikisi nümunə fayl və təlimat ilə, FİN ilə işçi eyniləşdirilir.

## 20. Yoxlanmış bəndlər və müqayisə cədvəlinə test nəticəsi (2026-11-03)

- **Qəbul olunan təklifdən işçi kartı:** namizəd təklifi qəbul edəndə işçi kartı avtomatik yaranır (vəzifə, maaş, başlama tarixi, sınaq müddəti, qəbul tarixçəsi, işə adaptasiya tapşırıqları) və namizədin hesabı karta bağlanır, yəni «İş yerim» özü açılır. Kodda təsdiq edildi.
- **Müsahibə vaxtı:** işəgötürən bir neçə vaxt təklif edir, namizəd birini seçir və ya təsdiqləyir. Kodda təsdiq edildi.
- **Namizəd müqayisə cədvəli:** test nəticələri (nəticə faizi, keçid həddi, yoxlanılır) əlavə olundu.
