# Uyğunluq balı: qaydalar və AI (admin seçimi)

## İki bal
- **Qaydalar** (`match()`): pulsuz, ani, deterministik. Sıralamanın və avtomatik müraciətin təhlükəsizlik həddinin əsasıdır.
- **AI reytinqi**: CV-ni vakansiya ilə model müqayisə edir (bal 0–100 və qısa səbəb). Hər iki bal həmişə mövcuddur.

Admin paneli → **Uyğunluq balı** səhifəsində üç tərəf üçün ayrıca seçilir (defolt hamısı "qaydalar", yəni xərc yoxdur):

| Tərəf | "AI" seçiləndə |
|---|---|
| İş axtaran | Vakansiya siyahısı açılanda CV-yə uyğun ən yaxşı N vakansiya avtomatik qiymətləndirilir, siyahı AI balına görə sıralanır, kartda qaydalarla bal da göstərilir. İstifadəçi razılıq xanasını bir dəfə işarələyir (brauzerdə yadda qalır). |
| İşəgötürən | "AI ilə sırala" düyməsi AI reytinqi verir. "Qaydalar" seçiləndə düymə yalnız qayda balını göstərir, AI çağırılmır. |
| Avtomatik müraciət | Vakansiya əvvəlcə qayda-əsaslı təhlükəsizlik həddindən keçməlidir, sonra AI balı da namizədin minimumuna çatmalıdır. AI işləməsə qaydalara qayıdılır. |

Digər ayarlar: avtomatik analiz olunan vakansiya sayı (defolt 20), AI-yə göndərilən minimum qayda balı (defolt 25), gündəlik yeni AI qiymətləndirmə limiti (defolt 0 = limitsiz; paketlərə görə limitlər sonra buradan qoyulacaq).

## "Hər vakansiya üzrə bir dəfə"
Hər namizəd–vakansiya cütü üçün nəticə `ai_job_ratings`-də saxlanılır. Açar CV faktlarının, vakansiya məzmununun, dilin və versiyanın SHA-256 hash-idir:
- CV-də bacarıq, təcrübə, mətn və ya sertifikat dəyişəndə **bütün** reytinqlər yenidən hesablanır.
- Vakansiyanın tələbləri dəyişəndə yalnız o vakansiya yenilənir.
- Telefon, şəhər və s. kimi AI-nin görmədiyi sahə dəyişəndə heç nə çağırılmır.
- Yeni vakansiya əlavə olunanda yalnız o analiz olunur.
Yoxlama (lokal saxta AI ilə): ilk dəfə 3 vakansiya = 1 AI sorğusu; təkrar = 0; 1 yeni vakansiya = 1 sorğu, 1 reytinq; CV dəyişdi = 4 reytinqin hamısı; yalnız telefon = 0.

## Xərc (təxmini, real ölçmə yoxdur)
Qiymət modelə və tarifə bağlıdır (`OPENAI_MODEL` / `DEEPSEEK_MODEL`), buna görə dollar rəqəmi yazmıram. Sorğu ölçüsü koda əsasən:
- CV (maks. 12 000 simvol, Azərbaycan dilində təqribən 4 000–5 000 token) **hər sorğuya təkrar göndərilir**.
- Hər vakansiya təqribən 250 token, hər reytinq cavabı təqribən 80 token.
- Sorğu 15 vakansiyaya qədər toplanır.

| Hal | Giriş (token) | Çıxış (token) | Sorğu |
|---|---|---|---|
| İlk dəfə, 20 vakansiya (2 sorğu) | 8 000–18 000 | ~2 500 | 2 |
| Sonradan 1 yeni vakansiya | 4 000–5 500 | ~100 | 1 |
| CV dəyişdi, 20 vakansiya | 8 000–18 000 | ~2 500 | 2 |
| Təkrar açılış (dəyişiklik yoxdur) | 0 | 0 | 0 |

Aylıq xərc ≈ (istifadəçi sayı) × (ayda CV dəyişikliyi sayı + yeni vakansiya partiyaları) × yuxarıdakı sətirlər × tarif. Əsas xərc mənbəyi CV-nin hər sorğuda təkrar göndərilməsidir; ona görə yeni vakansiyalar bir-bir yox, partiya ilə analiz olunur.

Xərci azaldan ayarlar: "avtomatik analiz olunan vakansiya sayı", "minimum qayda balı" (aid olmayan vakansiyalar AI-yə getmir), "gündəlik limit".

## Hələ edilməyib
Bu mərhələdə yalnız yuxarıdakılar var. Əvvəlki uzun spesifikasiyadan (6 meyarlı rubrika, B rejimi, vergi balı ilə inteqrasiya) heç biri bu işə daxil edilməyib. `lib/tax.ts` və `config/tax_az_2026.json` ayrıca əlavə olunub və hələ heç yerə qoşulmayıb.
