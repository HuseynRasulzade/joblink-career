# JobMatch üçün Seedance prompt paketi

Bu paket JobMatch platforması üçün Seedance ilə (ByteDance video modeli) tanıtım videosu yaratmaq üçündür. Daxilində: **hazır promptlar**, **8 istinad şəkli** və **3 əsas + 3 əlavə istinad videosu**. Promptlar bu fayllara ad ilə istinad edir, ona görə şəkillər və videolar promptla uyğun gəlir.

> Qeyd: Seedance-in interfeysi və limitləri versiyaya görə dəyişir (istinad şəkli/video sayı, uzunluq, `@Image1` yazılışı). Aşağıdakı adlandırma ümumidir; sizin interfeys fərqli etiket işlədirsə, `@Image1` → sizin etiketlə əvəz edin. Limit az olarsa, "Əsas" siyahıdakı fayllarla başlayın.

---

## 1. Fayllar və promptdakı adları

**Şəkillər (`refs/`)**

| Prompt adı | Fayl | Nə üçündür |
|---|---|---|
| @Image1 | `image1_hero_landing.png` | Giriş səhifəsi: fiqur, nümunə qrafiklər, axtarış. **İlk kadr kimi də istifadə olunur** |
| @Image2 | `image2_job_match_score.png` | Vakansiya siyahısı, 84% uyğunluq nişanı, "Müraciət et" düyməsi |
| @Image3 | `image3_employer_dashboard.png` | İşəgötürən paneli: KPI-lər, müraciət dinamikası, mərhələlər |
| @Image4 | `image4_payroll.png` | Əmək haqqı: gross/net, vergi, bank reyestri |
| @Image5 | `image5_salary_calculator.png` | Maaş kalkulyatoru: gross → net cədvəli |
| @Image6 | `image6_pricing_company.png` | Şirkət paketləri (Pulsuz, 49, 149, 239, 399) |
| @Image7 | `image7_ai_matcher_character.png` | Dəbilqəli "AI namizəd seçici" personaj (tünd narıncı fonda). `image7b_character_transparent.png` — şəffaf fonlu variant |
| @Image8 | `image8_brand_style_palette.png` | Loqo `jobmatch✳`, rəng palitrası və üslub sözləri |

**Videolar (`videos/`)** — hər biri 5 san, 1280×720, səssiz

| Prompt adı | Fayl | Nə üçündür |
|---|---|---|
| @Video1 | `video1_hero_landing_5s.mp4` | Giriş səhifəsinin hərəkəti (qrafiklər animasiya olur, fiqur yellənir) |
| @Video2 | `video2_job_match_5s.mp4` | Namizəd vakansiya axtarır, uyğunluq balını görür |
| @Video3 | `video3_employer_dashboard_5s.mp4` | İşəgötürən paneli, qrafiklər |
| əlavə | `extra/video4_payroll_5s.mp4`, `video5_calculators_5s.mp4`, `video6_pricing_5s.mp4` | Əmək haqqı, kalkulyator, qiymətlər |

Yüklənmə sırası (limit azdırsa): **@Image7, @Image8, @Image1, @Image2, @Image3, @Video2, @Video3**. Qalanlar əlavədir.

---

## 2. MASTER PROMPT (15 saniyə, 16:9) — kopyalayıb yapışdırın

```
Create a 15-second cinematic 16:9 promo video for "JobMatch", an AI-powered platform that combines hiring, HR records and payroll, made in Azerbaijan.

LOOK: A deep warm black-maroon world (#140807 to #2a0f0b) lit by soft glowing orange light (#ff8a4c and #d94c18), thin orange light sweeps, volumetric orange haze, subtle film grain, shallow depth of field. Floating translucent frosted-glass UI cards with hairline light borders and gentle orange glow. Premium, modern, calm, confident tech-commercial style. Follow the palette and mood of @Image8 exactly.

HERO CHARACTER: the helmeted "AI talent matcher" from @Image7. Keep his face, glass-visor helmet, headphones and the orange/blue reflections identical in every frame. He looks calmly upward and forward, never speaks, only subtle breathing and slight head motion. Slow elliptical orbit rings glow around him.

SHOTS:
1) 0-3 s: Start exactly from the composition of @Image1 (use it as the first frame). Slow push-in toward the character. The sample glass charts around him animate: a bar chart grows, a donut chart draws, a rising line chart traces and ends in a glowing dot. Motion reference: @Video1.
2) 3-6 s: The camera glides past the character into a floating glass screen that looks exactly like @Image2 / @Video2: a vacancy list where one card is highlighted in orange with an 84% match badge. A white cursor moves to the orange apply button and clicks; a soft success glow pulses.
3) 6-9 s: Smooth parallax move to the employer dashboard from @Image3 / @Video3: KPI tiles slide in, the application bar chart grows, funnel bars fill from left to right.
4) 9-12 s: Dissolve into the payroll screen @Image4 and the calculator @Image5: gross-to-net rows slide in one by one, the final net amount is highlighted with an orange glow and numbers count up. Keep UI layouts and numbers exactly as in the references.
5) 12-15 s: Pull back. The screens fold into five frosted-glass pricing cards like @Image6, the middle one glowing. The cards converge and form the centered wordmark "jobmatch" with the orange asterisk (as in @Image8). A thin orange light sweep passes over the logo and the shot holds.

CAMERA: slow gliding dolly and gentle parallax, no shaking, no fast zooms; 24 fps cinematic motion; smooth match-cut transitions between shots.

AUDIO: modern warm cinematic electronic music, about 100 BPM, soft pulsing bass, light whooshes on transitions and tiny UI click sounds on the click. No voice, no lyrics.

STRICT RULES: Do not redesign or distort the UI from the references; keep it sharp and legible. No readable text anywhere except the "jobmatch" wordmark (no gibberish, no fake words). No real brand logos, no watermark, no subtitles, no extra people. Keep the colors inside the orange/maroon palette.
```

---

## 3. 60 saniyəlik versiya: 4 klip × 15 san (hamısı eyni üslubda)

Hər klipə **@Image7 və @Image8-i mütləq əlavə edin** (personaj və üslub eyni qalsın). Sonra klipləri montajda birləşdirin.

### Klip A — Giriş və problem → həll (15 san)
Əlavə: @Image1, @Video1
```
15-second cinematic 16:9 opening for "JobMatch". Same look as @Image8 (deep maroon-black background, soft orange glow, frosted-glass cards, film grain) and the same helmeted character as @Image7, identical in every frame.
0-5 s: A dark, messy desk-like space in warm shadow: scattered paper CV sheets, a spreadsheet grid floating, a clock; everything is dim and cluttered. Slow push-in.
5-9 s: An orange light wave sweeps through; the clutter dissolves into particles that flow toward the helmeted character, who turns his head to the light.
9-15 s: Reveal the composition of @Image1 (use as the final frame): character in the center with orbit rings, glass charts and cards floating around him, the wordmark area clean. Motion style from @Video1.
Camera: slow dolly-in, smooth, no shake. Audio: warm cinematic electronic build-up, soft whoosh at the reveal, no voice.
Rules: no readable text, no gibberish letters, keep colors in the orange/maroon palette, no extra people.
```

### Klip B — Namizəd: uyğunluq balı və 1 klik (15 san)
Əlavə: @Image2, @Video2
```
15-second cinematic 16:9 scene. Same style as @Image8 and same character as @Image7 (he appears small in the background as a glowing guide).
A large floating glass screen exactly like @Image2 / @Video2 fills the frame: job search field, filters, vacancy cards. Highlight one card in orange with an 84% match badge; a ring gauge around the badge fills smoothly. A white cursor glides to the orange apply button and clicks; a success glow pulses and a "sent" check appears. Orange particles rise from the click. Slow gliding camera with gentle parallax, depth of field blur on the edges.
Audio: soft pulsing electronic bass, a single clear UI click, light chime on success, no voice.
Rules: keep the UI layout identical to the references, sharp and legible; no gibberish text; orange/maroon palette only.
```

### Klip C — İşəgötürən paneli və kadr (15 san)
Əlavə: @Image3, @Video3, @Image4
```
15-second cinematic 16:9 scene. Same style as @Image8, same character as @Image7 as a faint glowing silhouette in the background.
Smooth parallax across the employer dashboard from @Image3 / @Video3: KPI tiles slide in, the application bar chart grows, the funnel bars (new, interview, offer, hired) fill one after another. Then the camera glides to the HR/payroll screen of @Image4: rows of employees and amounts slide in, the net amount glows orange. Glass panels float at different depths. Keep all UI exactly as in the references.
Camera: slow lateral dolly with depth parallax. Audio: steady warm electronic pulse, subtle whooshes, tiny UI ticks, no voice.
Rules: no gibberish text; sharp, legible UI; orange/maroon palette.
```

### Klip D — Kalkulyator, qiymət və finaldır (15 san)
Əlavə: @Image5, @Image6, @Image8
```
15-second cinematic 16:9 closing scene. Style of @Image8, character of @Image7.
0-5 s: The salary calculator like @Image5: the gross amount types in, rows slide in (tax, social insurance, net) and the net total counts up and glows.
5-10 s: The screen folds into five frosted-glass pricing cards like @Image6 (Free, 49, 149, 239, 399); the middle card pulses with an orange glow.
10-15 s: The cards converge into the centered wordmark "jobmatch" with the orange asterisk from @Image8 on the deep maroon background. The helmeted character from @Image7 appears behind the logo in soft glow. A thin orange light sweep crosses the logo and the shot holds for the last two seconds.
Audio: music resolves to a confident final chord, one soft whoosh, no voice.
Rules: only the "jobmatch" wordmark as readable text; no gibberish; palette stays orange/maroon.
```

---

## 4. Çıxarılmalı olanlar (negative) — ayrıca sahə varsa

```
distorted UI, garbled text, random letters, fake logos, watermark, subtitles, extra people, extra fingers, face change, helmet change, flicker, camera shake, blown-out highlights, neon blue or purple color shift, cartoon style, low resolution, jump cuts
```

---

## 5. Səsləndirmə mətni (Azərbaycanca, Seedance-dən sonra ayrıca səsləndirin)

Seedance Azərbaycan dilini və hərf ardıcıllığını etibarlı vermir, ona görə **səs və yazı montajda əlavə edilir**.

| Klip | Diktor mətni |
|---|---|
| A | CV-lər poçtda, işçi məlumatları Excel-də, əmək haqqı başqa yerdə. Vaxt hər gün bu dağınıqlığa gedir. JobMatch bunu dəyişir: iş axtaran, işəgötürən və kadr şöbəsi eyni platformada. |
| B | Süni intellekt hər CV-ni vakansiya ilə müqayisə edir və aydın uyğunluq balı verir. Namizəd bir kliklə müraciət edir. |
| C | Müraciətdən müsahibəyə, testdən təklifə: canlı panel hər namizədin harada olduğunu göstərir. İşçi kartı, əmrlər, məzuniyyət, davamiyyət və əmək haqqı eyni yerdədir. |
| D | Vergi və sığorta 2026 dərəcələri ilə avtomatik hesablanır. Başlamaq pulsuzdur, AI paketləri 49 manatdan; Kadr modulu AI ilə birlikdə 120, tək 150 manat, ƏDV əlavə olunur. JobMatch: doğru insan, doğru imkan. |

**Ekran yazıları (montajda əlavə edin):** "Doğru namizəd saniyələr içində", "Müraciət də bir klik", "Bütün mərhələlər bir ekranda", "13 kalkulyator, tamamilə pulsuz", "Pulsuz başlayın". Son kadrda: `JobMatch by Digilabs · +994 55 478 25 81 · info@digilabs.az`.

---

## 6. Faydalı məsləhətlər

- **Ardıcıllıq:** hər klipdə eyni 2 şəkli (@Image7 personaj, @Image8 üslub) göndərin. Personajın üzü dəyişərsə, `image7b_character_transparent.png` ilə yenidən cəhd edin.
- **UI dəqiqliyi:** modelin yenidən çəkdiyi ekranlarda yazılar bulanıq çıxa bilər. Ən etibarlı yol: Seedance ilə atmosfer və keçidləri yaradın, real ekranları isə bu paketdəki `videos/` klipləri ilə montajda üstə qoyun.
- **Uzun versiya (9:16):** promptun sonuna "vertical 9:16 framing, keep the character and UI centered" əlavə edin və ekranları yuxarı-aşağı düzün.
- **Sürətli iterasiya:** əvvəl 5 saniyəlik qısa test edin, sonra 15 saniyəyə keçin.
- **Hüquqi:** @Image7 personajı sizin göndərdiyiniz üçüncü tərəf istinad şəklindən hazırlanıb. İctimai reklamda istifadədən əvvəl şəklin müəllif hüququnu yoxlayın.
