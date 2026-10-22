# Paketlər, ödəniş və müqavilə

İşçi (namizəd) paketləri, ödəniş vasitələri, avtomatik ödəniş və avtomatik müqavilə.

## Paketlər (`lib/plans.ts`)

| Paket | Qiymət | Daxildir |
|---|---|---|
| Paketsiz | 0 AZN | Profil, özün müraciət, qaydalara əsaslanan CV qiymətləndirməsi |
| Sadə | 3 AZN | Seçilmiş şirkətlərin vakansiyaları e-poçtla (və nömrə varsa mesajla) |
| Plus 5 | 5 AZN | AI günlük 5 şirkətə müraciət, 1 AI CV analizi, 1 ATS düzəlişi |
| Plus 7 | 7 AZN | AI günlük 5 şirkətə müraciət, 5 analiz, 5 ATS düzəlişi |
| Plus 10 | 10 AZN | AI günlük 20 şirkətə müraciət, 20 analiz, 10 ATS düzəlişi |

Paket müddəti 30 gündür. Plus paketlər Sadə paketin imkanlarını da əhatə edir və AI köməkçi, AI xülasə, karyera tövsiyəsi və vakansiya uyğunluğu şərhini açır.

**Fərziyyələr** (sizin yazdığınız mətndən çıxardım, dəqiqləşdirin):
- Analiz və CV düzəlişi limitləri də günlükdür (müraciət limiti kimi).
- Plus 5 üçün “bir cv analizi bir” ifadəsini 1 analiz və 1 ATS düzəlişi kimi oxudum.
- Paket dəyişəndə yeni paket dərhal başlayır, köhnənin qalan günləri geri qaytarılmır.

## Ayarlar (Cloudflare Worker dəyişənləri)

| Dəyişən | Mənası |
|---|---|
| `BILLING_ENFORCED` | `1` olanda paket limitləri tətbiq olunur. Boş olanda hamı əvvəlki kimi limitsiz istifadə edir. |
| `PAYMENT_PROVIDER` | Boş və ya `mock`: test ödənişi. Real provayder hələ qoşulmayıb. |
| `PLATFORM_LEGAL_NAME`, `PLATFORM_VOEN`, `PLATFORM_ADDRESS`, `PLATFORM_EMAIL` | Müqavilədə operator kimi yazılan rekvizitlər. Boşdursa müqavilədə “[daxil edilməlidir]” görünür. |

**`BILLING_ENFORCED=1` etməzdən əvvəl** real ödəniş provayderini qoşmaq və müqavilə mətnini hüquqşünasa yoxlatmaq lazımdır. Yoxsa paketsiz istifadəçilər AI funksiyalarını itirəcək, amma real ödəniş edə bilməyəcəklər.

## Necə işləyir

- **Ödəniş vasitəsi:** yalnız kartın növü, son dörd rəqəm, bitmə tarixi və provayder tokeni saxlanılır. Kart nömrəsi və CVC saxlanılmır. Test provayderi kart nömrəsini server tərəfdə qəbul edir; real provayderdə kart brauzerdə tokenləşdirilməlidir ki, nömrə serverə çatmasın. `0002` ilə bitən test kartı rədd edilir.
- **Avtomatik ödəniş:** dövr bitəndə saxlanılmış kartdan eyni məbləğ tutulur. Zamanlayıcı yoxdur, yenilənmə istifadəçi paketi və ya limiti yoxlayanda (“Paketlər” səhifəsi, AI funksiyaları, vakansiya e-poçtu) baş verir. Cloudflare cron əlavə olunsa, bu daha dəqiq olar.
- **Müddət bitəndə:** avtomatik ödəniş söndürülüdürsə və ya ödəniş alınmırsa, hesab paketsiz rejimə keçir. Hesab və məlumatlar silinmir.
- **Limitlər:** `usage_counters` cədvəlində günlük sayğac. Keşdən gələn AI cavabı limitdən sayılmır.
- **Müqavilə:** paket ödənəndə `lib/contracts.ts` ilə xidmət müqaviləsi hazırlanır və `contracts` cədvəlində saxlanılır; “Paketlər” səhifəsində açılır və çap olunur. Mətn avtomatik hazırlanır və hüquqşünas tərəfindən yoxlanmalıdır.
- **E-poçt bildirişləri:** `BILLING_ENFORCED=1` olanda izlənən şirkətlərin yeni vakansiyası haqqında e-poçt yalnız Sadə və Plus paketlərə gedir. Daxili bildiriş hamıya gedir.

## Hələ olmayanlar

- Real ödəniş provayderi (kartın brauzerdə tokenləşdirilməsi, webhook).
- SMS göndərilməsi (SMS provayderi qurulmayıb, Sadə paketdə yalnız e-poçt işləyir).
- İşəgötürən paketləri: qiymət və tərkib verilməyib, ona görə yalnız iş axtaran paketləri qurulub. Müqavilə generatoru işəgötürən tərəfini artıq dəstəkləyir.
- Cloudflare cron ilə planlı yenilənmə.
