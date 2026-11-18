# JobMatch tanıtım videosu (~62 san, 16:9) — real ekran videolarından

Hazır fayl: `jobmatch_promo_az_silent.mp4` (səssiz, yanıb-sönən altyazılı) + `jobmatch_promo_az.srt`. Kadrlar şəkil deyil, platformada Playwright ilə icra olunan REAL əməliyyatların ekran videosudur (giriş, vakansiya axtarışı, 1 kliklə müraciət, işəgötürən icmalı, əmək haqqı, kalkulyator, qiymətlər; kursor və kliklər görünür). Sahnələr arasında keçidlər (circleopen, slide, wipe, zoomin, fade), animasiyalı başlıqlar, nişanlar və irəliləyiş xətti var. Ekran tam göstərilir, kəsilmir. Səsləndirmə ayrıca əlavə olunur (aşağıda).

## Səsləndirmə mətni (sahnələr üzrə)

| # | Vaxt | Ekranda yazı | Diktor (AZ) |
|---|---|---|---|
| 1 | 0:00 | Yenə Excel? Yenə CV yığını? Bəsdir. | Yenə Excel? Yenə CV yığını? Yenə "bu işçinin neçə gün məzuniyyəti qalıb" sualı? Bəsdir. |
| 2 | 0:05 | İşə qəbul da, kadr da: bir platformada. | JobMatch işə qəbulu da, kadr işini də bir yerə yığır. Daxil olursunuz, hər şey əlinizin altındadır. |
| 3 | 0:13 | Kimi çağırmalı? Bal göstərir. | Kimi müsahibəyə çağırmaq lazımdır? Bal göstərir: bacarıq, təcrübə, maaş gözləntisi. Ən güclülər həmişə yuxarıda. |
| 4 | 0:19 | Namizəd bir kliklə müraciət edir. | Namizəd bir kliklə müraciət edir. Süni intellekt CV-ni oxuyur, siz isə yalnız uyğun olanlara baxırsınız. |
| 5 | 0:26 | Nə harada qaldı? Hamısı bir ekranda. | Müraciət, müsahibə, test, təklif: işin harada qaldığını artıq axtarmırsınız. Hamısı bir ekranda. |
| 6 | 0:32 | Maaş hesabı? 2026 dərəcələri, avtomatik. | Əmək haqqı? Vergi və sığorta 2026 dərəcələri ilə avtomatik hesablanır. İşçi kartı, əmrlər, məzuniyyət, davamiyyət də eyni yerdədir. |
| 7 | 0:39 | Hələ tərəddüd edirsiniz? 13 kalkulyator pulsuz. | Hələ qərar verməmisiniz? Əvvəl 13 pulsuz kalkulyatoru yoxlayın: maaş, məzuniyyət, ixtisar, super-gross. Qeydiyyat belə istəmir. |
| 8 | 0:47 | Başlamaq pulsuz. AI: 49 AZN-dən · Kadr: 150 AZN | Qiymət? Başlamaq pulsuzdur. AI istəyirsinizsə 49 manatdan. AI-siz bütün platforma 150 manat, ƏDV əlavə olunur. |
| 9 | 0:54 | İndi qeydiyyatdan keçin. İlk addım pulsuzdur. | Növbəti CV yığınını açmazdan əvvəl bir dəqiqə ayırın. İndi pulsuz qeydiyyatdan keçin. JobMatch: doğru insan, doğru imkan. |

**Ton:** söhbət dili, qısa cümlələr, problem → həll → sübut (ekran) → qiymət → çağırış. Ekranda yazı diktorun cümləsini təkrarlamır, onu gücləndirir (səssiz baxanlar üçün altyazı da var). Uydurma rəqəm, rəy və "son gün" yoxdur.

RU (qısa): «Всё ещё читаете резюме вручную и считаете зарплату в Excel? JobMatch объединяет подбор и кадры в одной платформе… Начните бесплатно: ИИ — от 49 манат, вся платформа без ИИ — 150 манат + НДС. Зарегистрируйтесь сегодня.»
EN (short): “Still reading CVs by hand and doing payroll in Excel? JobMatch puts hiring and HR in one platform… Start free: AI from 49 AZN, the whole platform without AI 150 AZN + VAT. Sign up today.”

## Səsi necə əlavə etmək

1. **Pulsuz neyron səs:** `pip install edge-tts`, sonra `python3 scripts/promo-video/add_voice.py az-AZ-BanuNeural jobmatch_promo_az_silent.mp4 out.mp4` (qadın `BanuNeural`, kişi `BabekNeural`). Skript hər sahnənin səsini yaradır, vaxtına yerləşdirir və səsi normallaşdırır.
2. **Daha emosional / «bomba» təsiri üçün:** peşəkar diktor və ya ElevenLabs. Sahnələrin mətni yuxarıdadır; faylları `voice_work/scene0.mp3 … scene8.mp3` adı ilə qoyub `USE_EXISTING=1` ilə eyni skripti işlədin.
3. **Musiqi:** lisenziyası aydın fon musiqisi (Pixabay, YouTube Audio Library) əlavə edin, səsin altında -18 dB.
4. Videonu yenidən yaratmaq: lokal serveri açın (`JOBLINK_LOCAL=1 npx vinext dev --port 3111`), `node scripts/promo-video/record_clips.mjs all` ilə əməliyyatları çəkin, sonra `python3 scripts/promo-video/make_clips_video.py` (ffmpeg və Pillow lazımdır). Köhnə, şəkil əsaslı variant: `make_video.py`.

## Qeydlər

- Səsləndirmə mətnində yalnız platformada real olan imkanlar və hazırkı qiymətlər var (49 AZN-dən AI, 150 AZN Kadr, ƏDV əlavə). Qiymət dəyişərsə, 8-ci sahnənin mətnini və `make_video.py`-dakı başlığı yeniləyin.
- Ekranlarda lokal demo məlumat görünür; yayımdan əvvəl təmiz demo hesabla yenidən çəkmək olar.
- Final kadrda sayt ünvanı yoxdur: yayım kanalına görə (Instagram/TikTok/Meta reklamı) ünvan və QR kod əlavə edin.
