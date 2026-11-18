# JobMatch tanıtım videosu (~73 san, 16:9) — real ekran videolarından

Hazır fayl: `jobmatch_promo_az_silent.mp4` (səssiz, yanıb-sönən altyazılı) + `jobmatch_promo_az.srt`. Kadrlar şəkil deyil, platformada Playwright ilə icra olunan REAL əməliyyatların ekran videosudur (giriş, vakansiya axtarışı, 1 kliklə müraciət, işəgötürən icmalı, əmək haqqı, kalkulyator, qiymətlər; kursor və kliklər görünür). Sahnələr arasında keçidlər (circleopen, slide, wipe, zoomin, fade), animasiyalı başlıqlar, nişanlar və irəliləyiş xətti var. Ekran tam göstərilir, kəsilmir. Səsləndirmə ayrıca əlavə olunur (aşağıda).

## Səsləndirmə mətni (sahnələr üzrə)

| # | Ekranda yazı | Diktor (AZ) |
|---|---|---|
| 1 | Hər şey ayrı alətdə? Bu, itirilən vaxtdır. | CV-lər poçtda, işçi məlumatları Excel-də, əmək haqqı başqa yerdə. Vaxt hər gün bu dağınıqlığa gedir. |
| 2 | Bir platforma: iş axtarışından əmək haqqına. | JobMatch bunu dəyişir: iş axtaran, işəgötürən və kadr şöbəsi eyni platformada. |
| 3 | Doğru namizəd saniyələr içində. | Süni intellekt hər CV-ni vakansiya ilə müqayisə edir və aydın uyğunluq balı verir: bacarıq, təcrübə, maaş. |
| 4 | Müraciət də bir klik. | Namizəd bir kliklə müraciət edir. Siz isə vaxtınızı yalnız ən uyğun namizədlərə ayırırsınız. |
| 5 | Bütün mərhələlər bir ekranda. | Müraciətdən müsahibəyə, testdən təklifə: canlı panel hər namizədin harada olduğunu göstərir. |
| 6 | Kadr işi nizamlı və izlənən. | İşçi kartı, kadr əmrləri, məzuniyyət, davamiyyət, ştat planı: hamısı hazır şablonlarla, hər dəyişiklik tarixçədə. |
| 7 | Əmək haqqı avtomatik hesablanır. | Vergi və sığorta 2026 dərəcələri ilə avtomatik hesablanır. Bank reyestri və haqq-hesab vərəqələri hazırdır. |
| 8 | 13 kalkulyator. Tamamilə pulsuz. | Qeydiyyatsız belə 13 kalkulyator pulsuzdur: maaş, məzuniyyət, ixtisar, super-gross. Hər nəticədə qanun maddəsi var. |
| 9 | Pulsuz başlayın. İhtiyac artdıqca böyüyün. | Başlamaq pulsuzdur. AI paketləri 49 manatdan; Kadr modulu AI ilə birlikdə 120, tək 150 manat. ƏDV əlavə olunur. |
| 10 | İndi qeydiyyatdan keçin. İlk addım pulsuzdur. (JobMatch by Digilabs · +994 55 478 25 81) | Növbəti addımı gecikdirməyin: pulsuz hesab açın və doğru insanı, doğru imkanı tapın. |

**Ton:** söhbət dili, qısa cümlələr, problem → həll → sübut (ekran) → qiymət → çağırış. Ekranda yazı diktorun cümləsini təkrarlamır, onu gücləndirir (səssiz baxanlar üçün altyazı da var). Uydurma rəqəm, rəy və "son gün" yoxdur.

RU (qısa): «Всё ещё читаете резюме вручную и считаете зарплату в Excel? JobMatch объединяет подбор и кадры в одной платформе… Начните бесплатно: ИИ — от 49 манат, вся платформа без ИИ — 150 манат + НДС. Зарегистрируйтесь сегодня.»
EN (short): “Still reading CVs by hand and doing payroll in Excel? JobMatch puts hiring and HR in one platform… Start free: AI from 49 AZN, the whole platform without AI 150 AZN + VAT. Sign up today.”

## Səsi necə əlavə etmək

1. **Pulsuz neyron səs:** `pip install edge-tts`, sonra `python3 scripts/promo-video/add_voice.py az-AZ-BanuNeural jobmatch_promo_az_silent.mp4 out.mp4` (qadın `BanuNeural`, kişi `BabekNeural`). Skript hər sahnənin səsini yaradır, vaxtına yerləşdirir və səsi normallaşdırır.
2. **Daha emosional / «bomba» təsiri üçün:** peşəkar diktor və ya ElevenLabs. Sahnələrin mətni yuxarıdadır; faylları `voice_work/scene0.mp3 … scene8.mp3` adı ilə qoyub `USE_EXISTING=1` ilə eyni skripti işlədin.
3. **Musiqi:** lisenziyası aydın fon musiqisi (Pixabay, YouTube Audio Library) əlavə edin, səsin altında -18 dB.
4. Videonu yenidən yaratmaq: lokal serveri açın (`JOBLINK_LOCAL=1 npx vinext dev --port 3111`), `node scripts/promo-video/record_clips.mjs all` ilə əməliyyatları çəkin, sonra `python3 scripts/promo-video/make_clips_video.py` (ffmpeg və Pillow lazımdır). Köhnə, şəkil əsaslı variant: `make_video.py`.

## Qeydlər

- Video 18 noyabr 2026-da yeni «ember» dizaynı, yeni giriş səhifəsi və yeni paketlərlə yenidən çəkilib. Girişdəki telefon nömrəsi yer tutucu olduğundan çəkiliş skripti onu gizlədir (`record_lib.mjs`); real nömrə yazılandan sonra həmin sətri silin.

- Səsləndirmə mətnində yalnız platformada real olan imkanlar və hazırkı qiymətlər var (49 AZN-dən AI, 150 AZN Kadr, ƏDV əlavə). Qiymət dəyişərsə, 8-ci sahnənin mətnini və `make_video.py`-dakı başlığı yeniləyin.
- Ekranlarda lokal demo məlumat görünür; yayımdan əvvəl təmiz demo hesabla yenidən çəkmək olar.
- Final kadrda sayt ünvanı yoxdur: yayım kanalına görə (Instagram/TikTok/Meta reklamı) ünvan və QR kod əlavə edin.
