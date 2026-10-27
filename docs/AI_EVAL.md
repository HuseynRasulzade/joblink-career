# AI-nin ölçülməsi

AI-nin real işdə nə qədər düz olduğunu bilmək üçün işəgötürən rəyi toplanır.

## Rəy necə toplanır
- Namizəd siyahısında AI nəticəsinin altında (və kartdakı “AI qiymətləndirməsi”ndə) **“AI düz dedi? Düz / Yanlış”** düymələri var.
- “Yanlış” seçiləndə işəgötürən istəsə düzgün qərarı (müsahibə / nəzərə al / uyğun deyil), balı (0–100) və qeydi yazır.
- Hər istifadəçi hər vakansiya və namizəd üçün bir rəy verir; təkrar göndərəndə rəy yenilənir (`ai_feedback` cədvəli).

## Nəticələr
- Admin panel → **AI istifadə və xərc** → “AI-nin dəqiqliyi”: rəy sayı, AI-nin düz dediyi pay, tövsiyə üzrə uyğunluq, qarışıqlıq cədvəli, AI və qaydaların orta bal səhvi, son “yanlış” rəylər.
- CSV ixracı: eyni səhifədə “Rəyləri CSV kimi yüklə”. Ətraflı baxış üçün:
  `node --experimental-strip-types scripts/ai-eval.mjs ai-feedback-<tarix>.csv`

## Necə istifadə etməli
1. Ən azı 30 rəy yığılana qədər nəticəyə güvənməyin.
2. “Yanlış” rəylərin qeydlərini oxuyub təkrarlanan səbəbi tapın (məsələn, “həddindən artıq təcrübəli namizədi çox aşağı qiymətləndirir”).
3. Səbəb təkrarlanırsa, həmin qaydanı AI təlimatına (`app/api/joblink/[...path]/route.ts` içində `hr-rank` təlimatı, `lib/fit-review.ts`) konkret cümlə kimi əlavə edin.
4. Dəyişiklikdən sonra yeni rəyləri ayrıca izləyin; AI qaydalardan pis çıxırsa (“qaydalar AI-dən yaxşıdır”), AI-nin çəkisini azaldın.
