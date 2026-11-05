# HR üçün tam funksiya xəritəsi və inkişaf təklifi

> **Sadə xülasə üçün `docs/NE_QALIB.md`-ə baxın:** nə hazırdır, nə qalıb, sizdən nə lazımdır. Bu sənəd isə işin tam tarixçəsidir (hər bölmə bir addımdır, ən yenisi sonda).


Tarix: 2026-10-29. Vəziyyət: canlı sayt `joblink-career.huseynresulzade04.workers.dev`, filial `claude/seed-demo-accounts`.

Qiymətləndirmə: ✅ var · 🟡 qismən · ❌ yoxdur. Əmək: S (1–2 gün), M (3–7 gün), L (2+ həftə).

## 1. Bir HR-ın işi və proqramdakı vəziyyət

| Sahə | Vəziyyət | Nə var / nə çatmır |
|---|---|---|
| İşə qəbul (vakansiya, namizəd, müsahibə, test, təklif) | ✅ | Vakansiyalar, namizəd axını, istedad bazası, müsahibə, testlər, iş təklifi, təsdiq zənciri, AI köməkçi, tövsiyə proqramı, rəy yoxlaması, vakansiya paylaşma. Çatmır: bir neçə xarici sayta eyni anda yerləşdirmə (xarici müqavilə) |
| İşçi kartı və şəxsi iş | ✅ | Şəxsi məlumatlar, vəsiqə, əlillik və vergi güzəşti, bank/kart, sənəd qovluğu, əmrlər, müqavilə şablonları, işçi profili qoşulması. Sənəd müddəti xatırlatması və təşkilat sxemi var. İşçi şəkli (bölmə 29) |
| Ştat cədvəli və struktur | ✅ | Plan, kilid və direktor təsdiqi, vəzifə və şöbə kataloqu, maaş həddi, ştat dərəcəsi. Vəzifə təlimatları (versiyalı, işçi təsdiqi ilə, bölmə 28), kadr dinamikası qrafiki və plan-fakt (bölmə 28) |
| Davamiyyət | ✅ | Gün üzrə qeyd, Excel idxalı, qısaldılmış həftə, giriş-çıxış saatı, işçinin özünün qeydi, gecikmə jurnalı, artıq iş təsdiqi, saatların əmək haqqına avtomatik keçməsi, növbələr. Məkan yoxlaması (bölmə 28). Çatmır: turniket inteqrasiyası (xarici cihaz) |
| Məzuniyyət və icazə | ✅ | Əmrlər, işçi ərizəsi, qalıq, məzuniyyət haqqı (md. 140), illik qrafik, birbaşa rəhbər təsdiqi ("İş yerim → Komandam"), üst-üstə düşmə və şöbə yükü yoxlaması, HR qapısı (rəhbər cavab verməmiş əmr hazırlanmır), ezamiyyət. Rəhbərin yoxluğunda əvəzedici var |
| Əmək haqqı | ✅ | Hesablama, avans, vergi güzəşti, müavinətlər, ödənişlər və geri çəkmə, bank sənədi və ikinci təsdiq, hesablaşma hesabatı, haqq-hesab vərəqəsi, işçiyə bildiriş. Qalan bəndlər bölmə 2–14-də tamamlanıb |
| Hesabatlar | ✅ | İşçi axını, dövriyyə, kadr və fond hesabatı, hesablaşma hesabatı. Qrafik, proqnoz və plan-fakt xəbərdarlığı (bölmə 28) |
| Performans və inkişaf | ✅ | Məqsəd, qiymətləndirmə dövrü, 360° rəy, 1:1 qeydləri, bacarıq matrisi, təlim planı |
| Aktivlər | ✅ | Noutbuk, telefon, açar, forma: verilmə və qaytarma aktı |
| İşçi təcrübəsi | ✅ | Elanlar, sorğular (eNPS), ad günü və il dönümü, HR-a müraciət (tiket) |
| Çıxış prosesi | ✅ | Çıxış növü və səbəbi, işdən çıxarma əmri, çıxış siyahısı, aktivlərin qaytarılması, çıxış müsahibəsi, son haqq-hesab (məzuniyyət kompensasiyası əmək haqqında) |
| Əməyin mühafizəsi | ✅ | Təlimat jurnalı, tibbi baxış qrafiki, qəza qeydləri (bölmə 25) |
| Hüquqi uyğunluq | 🟡 | Əmr və müqavilə layihələri, audit qeydləri, rol və icazələr, versiyalı daxili qaydalar, rəzayət, saxlama müddəti (bölmə 25). Çatmır: hüquqi e-imza (xarici müqavilə) |

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

## 21. Böyük şirkətlər üçün işçi seçimi (2026-11-03)

- Ortaq «İşçi seçici»: ad, vəzifə və şöbə üzrə axtarış, departament süzgəci, «siyahıdakı N nəfəri seç», «yalnız seçilənlər», seçilənlərin sayı; siyahı 100-ün hissələri ilə göstərilir (yüzlərlə və minlərlə işçidə səhifə ağırlaşmır).
- İstifadə olunduğu yerlər: növbəli rejimə keçirmə və geri qaytarma, dövrü növbə şablonu, təlim iştirakçıları, kolleqa rəyi.
- Çoxlu işçi serverə 200-lük hissələrlə göndərilir, gedişat göstərilir. Növbə cədvəli 40 işçilik səhifələrlə, axtarış və departament süzgəci ilə açılır.
- 403 işçi ilə brauzerdə yoxlanıb (axtarış, hamısını seçmə, 3 hissəli yazma, cədvəl 1–40 / 403).

## 22. Təkrar məlumat daxil etməyin aradan qaldırılması

1. İmzalanmış əmr işçi kartını avtomatik yeniləyir (köçürmə, maaş, ad, xitam, ixtisar, sınaq, dayandırma, mükafat); əvvəlki vəziyyət `order_effects`-də saxlanır və geri qaytarıla bilər. Gələcək tarixli təsirlər cron/lazy ilə tətbiq olunur.
2. Çıxış: xitam əmri ↔ kart statusu ↔ offboarding bağlıdır.
3. Məzuniyyət planı ↔ ərizə ↔ əmr ↔ tabel.
4. Performans mükafatı → əmək haqqı "Mükafat".
5. Təlim ↔ bacarıq matrisi (təlim nəticəsi bacarıq səviyyəsini verir).
6. Üç gələn qutusu əvəzinə vahid HR gələn qutusu.
7. "İşçi axını" menyudan çıxarıldı, Hesabatlara birləşdirildi.

Məhdudiyyət: əvəzetmə, qrafik, uzatma, intizam əmrlərinin kart təsiri yoxdur; UI hər təsir növü üçün test edilməyib.

## 23. İşçi kartı tək mənbə, "Kadr hadisəsi" girişi, Excel ilə kütləvi giriş

**Audit nəticəsi (kart tək mənbə).** Vəzifə, departament, maaş, status yalnız `company_employees`-də saxlanır; rəhbər, növbə, gecə faizi kartın profilində; bacarıq `employee_skills`-də. Digər bölmələr (ştat cədvəli, tabel, məzuniyyət qrafiki, ezamiyyət, performans) yalnız işçi ID-si ilə kartdan oxuyur. Kartı dəyişən bütün yollar (əmr, əl ilə redaktə, performans artımı, maaş qərarı, çıxış) tarixçəyə yazır. Tapılan boşluqlar:
- Excel idxalı vəzifə/departament dəyişikliyini tarixçəyə yazmırdı və yalnız e-poçt/ad+tarixlə uyğunlaşdırırdı → düzəldildi.
- İntizam, müqavilənin uzadılması, əvəzetmə və iş rejimi əmrləri kartda iz qoymurdu → imzalananda kart tarixçəsinə yazılır, geri qaytarıla bilir.

**Kadr hadisəsi.** Əmrlər reyestrində "Kadr hadisəsi" düyməsi: işçi siyahıdan seçilir (və ya yeni işçi + FİN ilə kart yaradılır və işə qəbul əmrinə keçilir), hadisə növü seçilir, məlumat bir dəfə yazılır. Göndərməzdən əvvəl "İmzalandıqdan sonra nə olacaq" siyahısı göstərilir (kart, tabel, məzuniyyət qrafiki, əmək haqqı, çıxış işi). İmzadan sonra hamısı özü tətbiq olunur.

**Excel (işçilər).** Yeni "FİN" sütunu. Uyğunlaşdırma sırası: FİN → e-poçt → ad+başlama tarixi. FİN eyni adlı iki işçini ayırır; kartdakı FİN fayldakından fərqlidirsə sətir rədd edilir; kartda FİN yoxdursa ora yazılır; yanlış formatlı və ya faylda təkrar FİN bildirilir. Nümunə fayl yeniləndi.

Məhdudiyyətlər: əmr növlərinin UI-da hər biri brauzerdə ayrıca yoxlanmayıb; yeni işçinin FİN-i şifrələmə açarı (`DATA_KEY`) qoyulanda şifrələnmiş saxlanır.

## 24. Holdinq (qrup) girişi

Qərarlar (9-cu bölmədəki açıq suallara cavab):
- **Qrupa kim daxildir:** şirkət hesabları razılıqla. Baş şirkət (hesab sahibi və ya direktor) qrup yaradır və 14 gün keçərli, birdəfəlik **dəvət kodu** verir; digər şirkətin hesab sahibi/direktoru kodu yazıb qoşulur. Bir şirkət yalnız bir qrupda ola bilər; baş şirkət başqa qrupa qoşula bilməz.
- **Qrup nəyi görür:** yalnız **yekunlar**: işçi sayı, məzuniyyətdə olanlar, 12 ayda işə qəbul/çıxış, axıcılıq, gözləyən əmr, açıq vakansiya, departamentlər üzrə say. İşçi adı, maaşı və şəxsi məlumat heç vaxt çıxmır. **Maaş yekunu** (son təsdiqlənmiş ayın gross/net/işəgötürən xərci) yalnız üzv şirkət özü işarələyəndə göstərilir və hər baxışda üzv şirkətin jurnalına yazılır.
- **Razılıq və çıxış:** üzv istənilən vaxt qrupdan çıxa və maaş paylaşmasını dəyişə bilər; baş şirkət üzvü çıxara bilər; qoşulma, çıxış və paylaşma dəyişiklikləri hər iki şirkətin baxış jurnalında qalır.
- **Giriş növü:** ayrıca yeni hesab növü yaradılmadı; baş şirkətin hesab sahibi/direktoru mövcud girişlə "Qrup (holdinq)" bölməsinə baxır. Holdinqin özü hüquqi şəxs deyilsə, ona ayrıca şirkət hesabı açmaq lazımdır.
- Excel ixracı (icmal + departamentlər).

Texniki: `company_groups`, `company_group_links` (miqrasiya 0091), `lib/company-group.ts` (yekunlar, axıcılıq, ay snapşotunun cəmi; test), `company/group*` endpoint-ləri, `app/GroupPage.tsx`.

Hələ olmayanlar: qrup üzrə aylıq dinamika qrafiki, qrup səviyyəsində ayrıca hesab növü (şirkətə bağlı olmayan şəxs üçün), üzv şirkətlərin vahid kataloqu/ortaq vəzifə adları.

## 25. Əməyin mühafizəsi və hüquqi uyğunluq

Statusu köhnə cədvəldə ❌ görünən "Performans, aktivlər, işçi təcrübəsi, çıxış prosesi" artıq əvvəlki bölmələrdə tamamlanıb. Bu bölmə yalnız həqiqətən çatışmayanları əhatə edir.

**Əməyin mühafizəsi** (Kadr əməliyyatları → Əməyin mühafizəsi): təlimat jurnalı (giriş, ilkin, təkrar, növbədənkənar, yanğın; kim keçib, mövzu, işçi imzaladı), tibbi baxış qrafiki (ilkin/dövri/növbədənkənar, nəticə, klinika), qəza və hadisə qeydləri (növ, yer, təsvir, səbəb, tədbir, itirilən gün, status). Növbəti təlimat (6 ay) və dövri baxış (1 il) tarixi yazılmasa avtomatik qoyulur; vaxtı keçən və 30 gün qalan qeydlər yuxarıda siyahılanır. Ağır və ya ölümlə nəticələnən hadisədə "dövlət əmək müfəttişliyinə və sığortaçıya bildirmək lazımdır" xəbərdarlığı çıxır. İşçi öz təlimat və baxışlarını "İş yerim → Qaydalar və təhlükəsizlik"də görür.

**Daxili qaydalar, siyasətlər və razılıq** (Kadr əməliyyatları → Qaydalar və razılıq): mətn dəyişəndə yeni versiya yaranır, köhnələri saxlanır; işçi hər versiyanı təsdiq edir (mətnin hash-i ilə), yeni versiyada yenidən təsdiq istənilir; HR kimin təsdiq etmədiyini görür. "Razılıq" növündə işçi razılığı özü geri götürə bilər (qeyd jurnalda). Üç nümunə layihə var: daxili əmək qaydaları, şəxsi məlumatların işlənməsinə razılıq, məlumatların qorunması siyasəti (hüquqşünasla yoxlamaq lazımdır).

**Saxlama müddəti** (Kadr əməliyyatları → Saxlama müddəti): hər sənəd qrupu üçün il (şirkət dəyişə bilər), müddəti bitmiş işdən çıxmış işçi işləri siyahıda göstərilir. Sistem heç nəyi silmir.

Diqqət: saxlama illəri (şəxsi işlər 75, əmrlər 75, tabel 5 və s.) orientirdir, rəsmi cədvələ qarşı yoxlanmayıb; hüquqşünas və arxiv qaydaları ilə təsdiq etmək lazımdır. Hüquqi e-imza (ASAN imza və s.) xarici müqavilə tələb edir; daxili təsdiq hash ilə saxlanır, amma qanuni e-imza deyil.

Texniki: miqrasiya 0092 (`ohs_records`, `policy_docs`, `policy_versions`, `policy_acks`, `retention_rules`), `lib/ohs.ts` (yoxlama, tarixlər, saxlama; test), `lib/policy-templates.ts`, `company/ohs*`, `company/policies*`, `company/retention*`, `employee/policies*`, `employee/ohs`, `app/ComplianceHr.tsx`, `app/WorkplaceCompliance.tsx`.

## 26. İşçi təcrübəsi, aktivlər və çıxış: qalan boşluqlar

Köhnə cədvəldəki "Performans və inkişaf, Aktivlər, İşçi təcrübəsi, Çıxış prosesi" sətirləri bölmə 3–25-də artıq tamamlanmışdı (məqsəd/dövr/360°/1:1/bacarıq matrisi/təlim planı və büdcəsi, aktivlər və təhvil-təslim aktı, elan/sorğu/eNPS/HR tiketi, çıxış siyahısı/müsahibə/son haqq-hesab). Real çatışmayanlar bunlar idi:

- **Ad günü və il dönümü:** HR üçün növbəti 30 gün siyahısı (Kadr əməliyyatları → Ad günləri və il dönümləri). Şirkət açarı açanda kolleqalar "İş yerim → İşçi təcrübəsi"ndə yalnız ad və gün/ayı görür (doğum ili göstərilmir), həmin gün sahibinə təbrik bildirişi gedir (gündəlik cron, gündə bir dəfə). İlkin vəziyyət bağlıdır (doğum tarixi şəxsi məlumatdır). Qeyri-kəbisə il: 29 fevral adi ildə 28 fevrala düşür; 1 ildən az staj il dönümü sayılmır.
- **Əmlakın təhvil alınması:** işçi "İş yerim → Aktivlər"də "Təhvil aldım" ilə verilməni elektron təsdiq edir; HR siyahıda "işçi təsdiq edib / hələ etməyib" görür; çap olunan verilmə aktına təsdiq tarixi yazılır. Qaytarma HR tərəfindən qeyd olunur.
- **Son haqq-hesab:** çıxış prosesində istifadə olunmamış əsas məzuniyyətin kompensasiyası (md. 143) kartdakı məlumatdan təxmini hesablanıb göstərilir; dəqiq məbləğ son ayın əmək haqqında "məzuniyyət kompensasiyası" sütununda çıxır.

Texniki: miqrasiya 0093 (`asset_assignments.ack_issued_at`), `lib/celebrations.ts` (test), `company/celebrations*`, `employee/celebrations`, `employee/assets/ack`, `runCelebrations` cron.

Qalan yeganə boşluq: hüquqi e-imza (ASAN imza və s.) — xarici müqavilə tələb edir.

## 27. Excel ilə məlumat əlavə: məzuniyyət qrafiki və əməyin mühafizəsi

Kadr əməliyyatları → Məzuniyyət qrafiki və Əməyin mühafizəsi bölmələrində "Excel-dən yüklə" düyməsi: nümunə fayl (təlimat vərəqi ilə), yükləmədən əvvəl önizləmə, sətir-sətir xəta siyahısı.

- **Məzuniyyət qrafiki:** Ad Soyad / FİN, Başlama, Gün sayı və ya Bitmə, Status (Təklif / Təsdiqlənib), Qeyd. Bitmə yazılsa, bayram günləri nəzərə alınaraq gün sayı hesablanır. "Təsdiqlənib" olanlar üçün ərizə yaranır və işçiyə bildiriş gedir (formada olduğu kimi). Eyni dövr artıq varsa sətir keçilir; üst-üstə düşmə, şöbədə çox adamın eyni vaxtda məzuniyyəti və qalan günlərin çatmaması xəbərdarlıq kimi göstərilir. "Götürülüb" statusu yüklənmir (əmr imzalananda özü olur).
- **Əməyin mühafizəsi:** bir faylda üç növ qeyd (Təlimat, Tibbi baxış, Hadisə); hər sətir formadakı eyni yoxlamadan keçir (təlimatı keçən şəxs məcburidir, növ və nəticə tanınmalıdır, növbəti tarix boşdursa avtomatik 6 ay / 1 il). Ağır hadisə "bildirilib" olmadan yüklənərsə xəbərdarlıq çıxır.
- İşçi hər iki faylda **FİN ilə** tapılır (eyni adlı iki işçi qarışmır); FİN yoxdursa e-poçt, sonra ad; birmənalı olmayan sətir yüklənmir və səbəbi yazılır.

Texniki: `parseLeavePlan`, `parseOhsRows` (`lib/sheet-imports.ts`), `leaveplan` və `ohs` şablonları (`lib/sheet-templates.ts`, testlə oxunur), `company/leave-schedule/import`, `company/ohs/import`.

## 28. Kadr dinamikası və proqnoz, vəzifə təlimatı, davamiyyətdə məkan yoxlaması

Bölmə 1-dəki köhnə cədvəl yenilənib: ❌ qalmış sətirlərin hamısı artıq tamamlanıb. Real çatışmayanlar bunlar idi:

- **Hesabatlar → Kadr dinamikası, proqnoz və plan-fakt:** son 12 ayda işçi sayı, işə qəbul və çıxış (SVG qrafik), son 6 ayın orta qəbul/çıxışına əsaslanan 3 aylıq proqnoz (sadə tendensiya), ştat cədvəli ilə faktiki işçi müqayisəsi və xəbərdarlıqlar (ştatdan artıq işçi, ştatda yeri olmayan işçi, 25%+ boş yer).
- **Vəzifə təlimatı (iş təsviri):** "Qaydalar və razılıq" bölməsində yeni növ; vəzifə seçilir, mətn versiyalanır, yalnız o vəzifədəki işçilər "İş yerim → Qaydalar"da görür və təsdiq edir; işçi vəzifəsi dəyişəndə yeni təlimat avtomatik təsdiq gözləyənlərə düşür. Nümunə mətn layihədir.
- **Davamiyyətdə məkan yoxlaması:** Davamiyyət ayarlarında üç rejim (yoxlanmasın / kənarda HR üçün qeyd / yalnız ofisdə). Ofisin koordinatı və məsafə (20–5000 m) yazılır. İşçinin koordinatları saxlanmır, yalnız məsafə hesablanır; kənarda qeyd olunanda cədvəldə "Ofisdən N m kənarda qeyd olunub" yazılır. GPS brauzer icazəsi tələb edir; dəqiqliyi cihazdan asılıdır, qəti sübut deyil.

Texniki: miqrasiya 0094 (`policy_docs.position`), `lib/hr-trends.ts`, `lib/geofence.ts` (testlərlə), `company/hr-trends`, `app/HrTrends.tsx`.

Qalan: işçi şəkli (fayl saxlama, məxfilik), turniket inteqrasiyası (xarici cihaz), hüquqi e-imza, bank API, bir neçə xarici sayta eyni anda yerləşdirmə.

## 29. İşçi şəkli

İşçi kartında (Şəxsi məlumatlar) HR, "İş yerim → Məlumatlarım"da isə işçi özü şəkil yükləyir və silir. Brauzer şəkli 256 piksellik JPEG-ə kiçildir; server yalnız JPEG, PNG və WebP qəbul edir, faylın başlığını yoxlayır (başqa fayl şəkil adı ilə keçmir, SVG qəbul olunmur), 150 KB-dan böyüyünü rədd edir. Şəkil yalnız şəxsi məlumat icazəsi olan HR işçilərinə görünür; hər dəyişiklik baxış jurnalına yazılır. İşçilər siyahısında və təşkilat sxemində şəkil göstərilmir (yük və məxfilik səbəbi ilə).

Diqqət: şəkil `DATA_KEY` şifrələməsinə daxil deyil, bazada adi şəkildə (base64) saxlanır.

Texniki: miqrasiya 0095 (`employee_photos`), `lib/photo.ts` (test), `company/employees/photo*`, `employee/photo*`, `app/EmployeePhoto.tsx`.

Qalan: turniket inteqrasiyası (xarici cihaz), hüquqi e-imza, bank API, bir neçə xarici sayta eyni anda yerləşdirmə — hamısı xarici müqavilə və ya cihaz tələb edir.

## 30. Bacarıq matrisi: admin kataloqundan seçim və Excel

- **Bacarıqlar yalnız platformanın bacarıq kataloqundan seçilir** (admin panelindəki kataloq: daxili bacarıqlar və adminin əlavə etdikləri). Matris səhifəsində sərbəst mətn əvəzinə axtarış qutusu var: yazdıqca kataloqdan uyğunlar çıxır (ad, oxşar ad və kateqoriya üzrə), artıq matrisdə olanlar təklif edilmir. Kataloqda olmayan bacarıq server tərəfindən də rədd edilir; yenisi lazımdırsa admin kataloqa əlavə etməlidir. Matrisin limiti 40-dan 100 bacarığa qaldırıldı.
- **Excel ilə yükləmə** ("Excel-dən yüklə"): Ad Soyad / FİN, Bacarıq, Səviyyə, Hədəf. Səviyyə 0–4 rəqəmi və ya söz (başlanğıc, işləyə bilir, yaxşı, ekspert) ola bilər; boş buraxılan dəyişmir. Fayldakı bacarıq adı kataloqda ada və ya oxşar adlara görə tapılır və matrisə avtomatik əlavə olunur; tapılmayan bacarıq və işçi sətir-sətir xəta kimi göstərilir. İşçi FİN ilə tapılır. Nümunə fayl kataloqdan olan bacarıqlarla hazırlanıb (testlə yoxlanır).
- ESCO bacarıqları əvvəlcə daxil deyildi; bölmə 33-də əlavə olundu.

Texniki: miqrasiya 0096 (`skill_defs.catalog_id`), `lib/skill-matrix.ts` (testlərlə), `parseSkillMatrix`, `company/skill-matrix/catalog`, `company/skill-matrix/import`.

## 31. Excel ilə yükləmə: performans məqsədləri və təlim planı

- **Performans → "Məqsədləri Excel-dən yüklə"** (açıq dövrdə): Ad Soyad / FİN, Məqsəd, Hədəf, Çəki (1–10), Dövr. Dövr sütunu boşdursa seçilmiş dövr götürülür. Eyni işçiyə eyni adlı məqsəd keçilir, bir işçiyə ən çox 12 məqsəd yazılır, bağlı dövrə yazılmır; işçilərə (bir işçiyə bir dəfə) bildiriş gedir.
- **Təlim → "Excel-dən yüklə"**: bir sətir bir iştirakçıdır, eyni ad və başlama tarixi olan sətirlər bir təlimdir (artıq varsa təkrar yaradılmır, yeni iştirakçılar əlavə olunur). Növ, saat, xərc (büdcəyə yazılır), status, sertifikat müddəti; "Bacarıq" sütunu yalnız platformanın bacarıq kataloqundan qəbul edilir və matrisə avtomatik əlavə olunur. İştirakçılar FİN ilə tapılır və təlimə dəvət bildirişi alır.
- Hər iki fayl üçün nümunə fayl və təlimat vərəqi var (testlə oxunur), yükləmədən əvvəl önizləmə göstərilir.

Texniki: `parsePerfGoals`, `parseTrainings`, `company/performance/goals-import`, `company/training/import`. Yeni miqrasiya yoxdur.

## 32. Plan-fakt hesabatında planı təyin etmək

Hesabatlar → "Kadr dinamikası, proqnoz və plan-fakt" səhifəsində plan artıq yalnız oxunmur, orada təyin olunur (ştat planı icazəsi olan istifadəçi üçün):

- **Aylıq hədəf işçi sayı:** il seçilir, hər ay üçün şirkətdə olmalı say yazılır və ya "ilin sonuna hədəf" yazılıb "Bərabər paylaşdır" ilə cari saydan həmin hədəfə qədər aylara bölünür (düzəliş etmək olar). Plan qrafikdə narıncı nöqtəli xətt kimi görünür.
- **Sapma xəbərdarlığı:** son 3 ayda faktiki say plandan 5%-dən çox (ən azı 1 nəfər) kənara çıxırsa: azdırsa "işə qəbul lazım ola bilər" (sarı), artıqdırsa qırmızı xəbərdarlıq.
- **Departament planı yerində:** departament bir ştat sətridirsə, plan sayı birbaşa dəyişdirilir (ştat planı kilidlidirsə dəyişiklik direktorun təsdiqinə gedir); bir neçə sətir varsa, ştat cədvəlində dəyişdirilir.

Texniki: miqrasiya 0097 (`headcount_targets`), `linearTargets` və `targetAlerts` (`lib/hr-trends.ts`, testlə), `POST company/hr-trends/targets` (icazə: ştat planı).

## 33. Bacarıq matrisinə ESCO bacarıqları

Bacarıq matrisində axtarış, əlavə etmə və Excel idxalı artıq üç mənbədən işləyir: admin panelindəki kataloq (əvvəlcə), sonra ESCO cədvəli və O*NET alət adları (platformanın bacarıq seçicisindəki eyni siyahılar). ESCO adları ingiliscədir: axtarışda "ESCO" / "O*NET" işarəsi ilə göstərilir; Excel-də həm əsas adı, həm oxşar ESCO adlarını yazmaq olar (məsələn "contract negotiation"). Siyahılarda olmayan bacarıq yenə də rədd edilir. Təlim planı faylındakı "Bacarıq" sütunu da eyni qaydada işləyir.

Diqqət: ESCO cədvəli canlı bazada admin tərəfindən yüklənibsə işləyir (admin panelindəki ESCO idxalı); boşdursa yalnız kataloq və O*NET nəticə verir.

## 34. Rəsmi gündəlik ezamiyyət cədvəli

Nazirlər Kabinetinin 25.01.2008-ci il 14 nömrəli qərarı (26.10.2026-cı ilə qədər dəyişikliklərlə birləşdirilmiş mətn, istifadəçinin yüklədiyi fayl) əsasında: Azərbaycan daxilində şəhərə görə norma (125/100/95/90 AZN, mehmanxana 70%, sənədsiz 50%) və 106 xarici ölkənin (ayrıca şəhərləri ilə) normaları `lib/trip-norms-data.ts`-də (fayldan avtomatik yaradılıb) və `lib/trip-norms.ts`-də (axtarış: ölkə, şəhər, ingiliscə adlar; testlərlə). Gündəlik boş qalanda: təyinatın rəsmi normu; xarici normada şirkətin yazdığı valyuta məzənnəsi (hr_settings `trip_fx_*`) tələb olunur, məzənnə yoxdursa şirkətin ümumi norması işlənir. Endpoint-lər: `company/trips/norm`, `company/trips/norm-table`, `company/trips/norms` (+məzənnə). Ezamiyyət formasında norma göstərişi və bir kliklə doldurma, "Rəsmi norma cədvəli" pəncərəsi. Yeni miqrasiya yoxdur.

## 35. Müsahibə mərkəzi: Namizədlər ↔ Müsahibələr ↔ Testlər

- **Namizədlər → Müsahibələr:** "Müraciət edənlər" siyahısında və pipeline lövhəsində "Müsahibəyə dəvət et" düyməsi (status "Müsahibə"; namizədə bildiriş gedir). Dəvət olunub vaxtı təyin edilməyən namizəd Müsahibələr səhifəsində avtomatik "Vaxt gözləyir" siyahısına düşür; vaxt təyin ediləndə oradan çıxır.
- **Müsahibələr səhifəsi yenidən quruldu:** dörd bölmə (Vaxt gözləyir, Gələcək, Rəy gözləyir, Keçmiş), vakansiya filtri və axtarış, hər kartda "Vaxt təyin et", "Test göndər", "Suallar".
- **Testlər buradan göndərilir:** "Test göndər" mövcud test göndərmə pəncərəsini açır; kartda son testin vəziyyəti (göndərilib / bal) görünür.
- **Vakansiya üzrə suallar:** əvvəlcə həmin vakansiyaya bağlanmış siyahı, sonra adında vəzifənin adı olan siyahı, yoxdursa vakansiyanın tələb olunan bacarıqlarından avtomatik yaradılmış suallar. "Müsahibə sualları" bölməsində siyahını vakansiyaya bağlamaq olar.

Texniki: miqrasiya 0098 (`interview_templates.job_id`), `lib/interview-guide.ts` (testlərlə), `hr/interviews` GET indi `waiting`, `tests`, `guides` qaytarır. Qeyd: "Uyğun namizədlər" (istedad axtarışı) siyahısında dəvət düyməsi yoxdur, çünki orada hələ müraciət yoxdur; namizəd müraciət edəndən sonra dəvət olunur.

## 36. Çoxlu müsahibə dəvəti (Uyğun namizədlər və Müraciət edənlər)

Namizədlər bölməsində hər iki siyahıda (Uyğun namizədlər, Müraciət edənlər) və pipeline-da: hər namizəddə "Müsahibəyə dəvət et", həm də "Dəvət üçün seç" qutusu ilə bir neçəsini seçib "Seçilənləri müsahibəyə dəvət et". Açılan pəncərədə tarix/saat, müddət, format, link/ünvan, panel, alternativ vaxtlar və qeyd təyin olunur (vaxtı sonraya saxlamaq da olar: namizəd "Vaxt gözləyir" siyahısına düşür). Hamısı eyni vaxtla göndərilir; fərqli vaxt üçün ayrı-ayrı dəvət edilir. Müraciət etməmiş uyğun namizədə dəvət zamanı vakansiya üzrə müraciət (mənbə `company-invite`) avtomatik açılır. Aktiv müsahibəsi olan və ya rədd/qəbul/geri götürülmüş müraciətlər atlanır, nəticə siyahısı bildirişdə göstərilir. Endpoint: `POST hr/interviews/invite` (bir dəfəyə ən çoxu 30).
