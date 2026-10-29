# HR üçün tam funksiya xəritəsi və inkişaf təklifi

Tarix: 2026-10-29. Vəziyyət: canlı sayt `joblink-career.huseynresulzade04.workers.dev`, filial `claude/seed-demo-accounts`.

Qiymətləndirmə: ✅ var · 🟡 qismən · ❌ yoxdur. Əmək: S (1–2 gün), M (3–7 gün), L (2+ həftə).

## 1. Bir HR-ın işi və proqramdakı vəziyyət

| Sahə | Vəziyyət | Nə var / nə çatmır |
|---|---|---|
| İşə qəbul (vakansiya, namizəd, müsahibə, test, təklif) | ✅ | Vakansiyalar, namizəd axını, istedad bazası, müsahibə, testlər, iş təklifi, təsdiq zənciri, AI köməkçi. Çatmır: bir neçə sayta eyni anda yerləşdirmə, referal proqramı, rəy yoxlaması |
| İşçi kartı və şəxsi iş | ✅ | Şəxsi məlumatlar, vəsiqə, əlillik və vergi güzəşti, bank/kart, sənəd qovluğu, əmrlər, müqavilə şablonları, işçi profili qoşulması. Çatmır: sənəd müddəti xatırlatması (tibbi baxış, sertifikat), təşkilat sxemi, işçi şəkli |
| Ştat cədvəli və struktur | ✅ | Plan, kilid və direktor təsdiqi, vəzifə və şöbə kataloqu, maaş həddi, ştat dərəcəsi. Çatmır: ştat dəyişikliyi tarixçəsinin qrafik görüntüsü, vəzifə təlimatları (iş təsviri) |
| Davamiyyət | 🟡 | Gün üzrə qeyd, Excel idxalı, qısaldılmış həftə. Çatmır: giriş-çıxış saatı, növbə və qrafik, artıq iş təsdiqi, avtomatik saat hesabı |
| Məzuniyyət və icazə | 🟡 | Əmrlər, işçi ərizəsi, qalıq, məzuniyyət haqqı (md. 140). Çatmır: illik məzuniyyət qrafiki, rəhbər təsdiqi ilə sorğu axını, üst-üstə düşmə yoxlaması, ezamiyyət və xərc hesabatı |
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
