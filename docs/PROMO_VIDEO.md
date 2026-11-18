# JobMatch tanıtım videosu (53 san, 16:9)

Hazır fayl: `jobmatch_promo_az_silent.mp4` (səssiz, yanıb-sönən altyazılı) + `jobmatch_promo_az.srt`. Ekranlar platformanın real tünd interfeysindən (lokal demo hesablar) çəkilib. Səsləndirmə ayrıca əlavə olunur (aşağıda).

## Səsləndirmə mətni (sahnələr üzrə)

| # | Vaxt | AZ (diktor) | Ekran |
|---|---|---|---|
| 1 | 0:00 | Hələ də CV-ləri əl ilə oxuyursunuz? Maaşı Excel-də hesablayırsınız? | açılış (narıncı kürə, 87% uyğunluq kartı) |
| 2 | 0:05 | JobMatch işə qəbulu və kadr idarəçiliyini bir platformaya yığır. Vakansiya yaradın, namizədlər uyğunluq balı ilə sıralansın. | vakansiya kartları |
| 3 | 0:12 | Bacarıq, təcrübə, maaş gözləntisi: hər namizəd üçün bir bal. Ən güclülər yuxarıda. | namizəd paneli, 84% |
| 4 | 0:18 | Süni intellekt CV-ni təhlil edir: güclü və zəif tərəfləri göstərir, düzəliş təklif edir. | CV analizi |
| 5 | 0:24 | Müraciətlər, müsahibələr, testlər, təkliflər: bütün axın bir ekranda. | işəgötürən icmalı |
| 6 | 0:30 | Kadr modulu: işçi kartı, əmrlər, məzuniyyət, davamiyyət və əmək haqqı. Vergi və sığorta avtomatik hesablanır. | əmək haqqı |
| 7 | 0:37 | Üstəlik, 13 pulsuz kalkulyator: maaş, məzuniyyət, ixtisar, super-gross. Qeydiyyat belə lazım deyil. | kalkulyatorlar |
| 8 | 0:43 | Pulsuz başlayın. AI istəyirsinizsə 49 manatdan. AI olmadan bütün platforma 150 manat, ƏDV əlavə olunur. | qiymətlər |
| 9 | 0:50 | Bu gün pulsuz qeydiyyatdan keçin və ilk vakansiyanı yerləşdirin. JobMatch: doğru insan, doğru imkan. | final |

RU (qısa): «Всё ещё читаете резюме вручную и считаете зарплату в Excel? JobMatch объединяет подбор и кадры в одной платформе… Начните бесплатно: ИИ — от 49 манат, вся платформа без ИИ — 150 манат + НДС. Зарегистрируйтесь сегодня.»
EN (short): “Still reading CVs by hand and doing payroll in Excel? JobMatch puts hiring and HR in one platform… Start free: AI from 49 AZN, the whole platform without AI 150 AZN + VAT. Sign up today.”

## Səsi necə əlavə etmək

1. **Pulsuz neyron səs:** `pip install edge-tts`, sonra `python3 scripts/promo-video/add_voice.py az-AZ-BanuNeural jobmatch_promo_az_silent.mp4 out.mp4` (qadın `BanuNeural`, kişi `BabekNeural`). Skript hər sahnənin səsini yaradır, vaxtına yerləşdirir və səsi normallaşdırır.
2. **Daha emosional / «bomba» təsiri üçün:** peşəkar diktor və ya ElevenLabs. Sahnələrin mətni yuxarıdadır; faylları `voice_work/scene0.mp3 … scene8.mp3` adı ilə qoyub `USE_EXISTING=1` ilə eyni skripti işlədin.
3. **Musiqi:** lisenziyası aydın fon musiqisi (Pixabay, YouTube Audio Library) əlavə edin, səsin altında -18 dB.
4. Videonu yenidən yaratmaq: `SHOTS=<ekran şəkilləri qovluğu> python3 scripts/promo-video/make_video.py` (ffmpeg və Pillow lazımdır).

## Qeydlər

- Səsləndirmə mətnində yalnız platformada real olan imkanlar və hazırkı qiymətlər var (49 AZN-dən AI, 150 AZN Kadr, ƏDV əlavə). Qiymət dəyişərsə, 8-ci sahnənin mətnini və `make_video.py`-dakı başlığı yeniləyin.
- Ekranlarda lokal demo məlumat görünür; yayımdan əvvəl təmiz demo hesabla yenidən çəkmək olar.
- Final kadrda sayt ünvanı yoxdur: yayım kanalına görə (Instagram/TikTok/Meta reklamı) ünvan və QR kod əlavə edin.
