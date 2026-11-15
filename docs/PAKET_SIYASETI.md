# JobMatch paket siyasəti (AI xərci və qazanc)

**Status:** yalnız siyasətdir, proqramda **hələ tətbiq olunmayıb**. Təsdiq edilmiş variant: Standart şirkət paketi **239 ₼ = 5 000 tam CV analizi + 20 000 AI sıralaması** (Variant B).
Tarix: 2026-11-15.

## 1. Əsas qaydalar

1. **Aylıq paket modeli.** Müştəri hər ay sabit haqq ödəyir və aylıq kvota alır. Kvota CV sayı ilə göstərilir (token arxada hesablanır).
2. **İki növ AI əməliyyatı (şirkət tərəfi):**
   - **AI sıralaması (ucuz):** hər müraciət edənə yalnız bir bal (≈ 250 token). Cədvəl bu sıraya düzülür.
   - **Tam CV analizi (≈ 3 800 token):** yalnız HR-ın seçdiyi namizədlər üçün güclü və zəif tərəflər, risklər.
3. **Namizəd seçimi HR-dadır:** əvvəl AI hamını sıralayır, HR seçir, sonra AI yalnız seçilənləri tam analiz edir. Hamısını analiz etmək nəzərdə tutulmur.
4. **Yaddaş qaydası:** eyni CV və eyni vakansiya dəyişməyibsə təkrar analiz olunmur və kvotadan çıxılmır.
5. **Kvota bitəndə:** AI söndürülür, platformanın öz qayda əsaslı sıralaması (pulsuz) işləyir. Əlavə analiz paketi satıla bilər.
6. **Qazanc hədəfi (net):** kiçik paketlərdə **40%**, orta paketlərdə **25%**, böyük paketlərdə **20%**.

## 2. Xərc hesabının əsası (ən pis hal)

| Qəbul | Dəyər |
|---|---|
| ƏDV | 18% qiymətə daxildir (qiymətin 15,25%-i) |
| Ödəniş komissiyası | 2,5% |
| Server və dəstək | 2,5% |
| AI provayderi | **hamısı OpenAI** (ən bahalı hal) |
| OpenAI qiyməti | ≈ 5,44 ₼ / 1 milyon token (1 $ = 1,7 ₼; koddakı təxmini qiymət cədvəli) |
| Tam CV analizi | ≈ 3 800 token ≈ **0,0207 ₼** |
| AI sıralaması | ≈ 250 token ≈ **0,00136 ₼** |

AI xərcinə ayrılan pay: `qiymət × (0,7975 − net qazanc hədəfi)`. Yəni kiçik paketdə 39,75%, orta paketdə 54,75%, böyük paketdə 59,75%.
«Minimal qazanc» hər yerdə **ən pis haldır**: müştəri bütün kvotanı hər ay bitirir və hamısı OpenAI-dır. Real istifadədə müştərilər kvotanın təxminən 10–20%-ni işlədir, onda net qazanc **təxminən 70%** olur. Ucuz modeldə (DeepSeek səviyyəsi) xərc 5–6 dəfə azdır.

## 3. Şirkət (işəgötürən) paketləri

| Paket | Aylıq haqq | Tam CV analizi | AI sıralaması | AI xərci (ən pis) | Net qazanc (ən pis) |
|---|---|---|---|---|---|
| **Başlanğıc** | 49 ₼ | 650 | 4 000 | 18,9 ₼ | **20,2 ₼ (41%)** |
| **Standart** | **239 ₼** | **5 000** | **20 000** | 130,6 ₼ | **60,0 ₼ (25%)** |
| **Böyük** | 399 ₼ | 8 200 | 49 000 | 236,1 ₼ | **82,1 ₼ (21%)** |

Qeydlər:
- Standart üçün seçim: 149 ₼ qiymətlə 5 000 tam analizi yalnız OpenAI ilə vermək marjanı 10%-ə salırdı. 239 ₼ bunu 25%-də saxlayır.
- Bütün şirkət paketlərində sıralama sayı tam analizin təxminən 4–6 mislidir.

## 4. Namizəd (fərdi) paketləri

Namizəd paketlərində «tam analiz» namizədin öz CV-sinin vakansiyalara uyğunluq analizi, CV düzəlişi və analoji əməliyyatlardır.

| Paket | Aylıq haqq | Net qazanc hədəfi | Aylıq AI tavanı | Tam analiz | 5 saatlıq pəncərə |
|---|---|---|---|---|---|
| Pulsuz | 0 ₼ | marketinq xərci | 20 000 token | ≈ 5 | 4 000 token |
| Əsas | 3 ₼ | 40% (1,2 ₼) | 219 000 token | ≈ 57 | 4 000 token |
| Plus-5 | 5 ₼ | 40% (2,0 ₼) | 366 000 token | ≈ 96 | 5 000 token |
| Plus-7 | 7 ₼ | 25% (1,75 ₼) | 705 000 token | ≈ 185 | 10 000 token |
| Plus-10 | 10 ₼ | 25% (2,5 ₼) | 1,0 milyon token | ≈ 265 | 14 000 token |
| **Premium** (yeni) | 19 ₼ | 20% (3,8 ₼) | 2,1 milyon token | ≈ 550 | 29 000 token |

**5 saatlıq pəncərə:** token balansı hər 5 saatdan bir sıfırlanır (gündə ≈ 4,8 dəfə). Pəncərə ən azı bir tam CV analizini (3 800 token) əhatə edir. Aylıq tavan pəncərə yenilənməsini sui-istifadədən qoruyur: pəncərəni hər dəfə tam işlətsə belə, ayın cəmi tavandan çox ola bilməz.

## 5. Qoruyucular

1. **Aylıq xərc tavanı** hər hesab üçün: dolanda AI söndürülür, qaydalar işləyir.
2. **5 saatlıq pəncərə** namizəd paketlərində: bir gündə bütün kvotanın yanmasının qarşısını alır.
3. **Yaddaş** təkrar analizi kvotadan çıxmır.
4. **Admin paneldə** hər hesabın istifadəsi, xərci və qazancı görünür (mövcud AI büdcə səhifəsinin genişlənməsi kimi).
5. **Provayder dayansa:** zəncir yerli model → DeepSeek → qaydalar (hələ qurulmayıb).

## 6. Proqramda nələr hələ yoxdur (tətbiq olunmalı)

- Aylıq kvota sayğacı (tam analiz və sıralama ayrı), kabinetdə «Qalan: N / M» və yenilənmə tarixi.
- 5 saatlıq pəncərə və aylıq tavan (namizəd paketləri).
- Paketin dəyişdirilməsi və ödənişlə əlaqə (mövcud abunə səhifəsində).
- Admin hesabatı: paketlər üzrə gəlir, AI xərci, net qazanc.
- Şirkət tərəfi üçün «AI sıralaması» və «seçilənlərin tam analizi» artıq proqramdadır, amma **kvota ilə bağlanmayıb**.

## 7. Açıq suallar

1. **Premium (19 ₼)** namizəd paketi yeni əlavə olunsun?
2. **ƏDV:** şirkətiniz ƏDV ödəyicisidirsə, qiymətə daxildir? Ödəyici deyilsə, tavanlar artır.
3. **Mövcud abunəçilər** (Əsas, Plus) dərhal yeni sistemə keçsin, yoxsa keçid dövrü olsun?
4. Ucuz model (DeepSeek səviyyəsi) kütləvi sıralama üçün istifadə olunsa, `ai-eval` ilə OpenAI ilə müqayisə olunmalıdır. Onda sıralama kvotası xeyli artırıla bilər.
