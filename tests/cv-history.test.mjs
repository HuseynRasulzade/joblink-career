// Rule-based work history and education: used when the AI is unavailable.
import assert from "node:assert/strict";
import test from "node:test";
import { cvFields } from "../lib/cv-fields.ts";

const standard = `Elçin Rəhimov
Mühasib operator
İş təcrübəsi
Mühasib operator — MKT İstehsalat Kommersiya MMC
Fevral 2022 – İyun 2023
• Sənədlərin düzgünlüyünü yoxlamışdır.
• 1C sisteminə əməliyyatları daxil etmişdir.
Əsas vəsaitlər üzrə mühasib, MKT İstehsalat Kommersiya MMC (06.2023 – 10.2023)
• İnventarizasiya sənədlərini hazırlamışdır.
Baş mühasib | Alfa MMC | 2021 – hazırda
Debitor və kreditor uçotunun aparılması.
Təhsil
Azərbaycan Dövlət İqtisad Universiteti, Bakalavr, Mühasibat uçotu, 2016–2020
Xəzər Universiteti — Magistratura (MBA), 2021 – 2023
Bacarıqlar
1C, Excel`;

test("work records are read with dates, position and company", () => {
  const { experiences } = cvFields(standard);
  assert.equal(experiences.length, 3);
  assert.deepEqual(
    [experiences[0].title, experiences[0].company, experiences[0].start, experiences[0].end, experiences[0].current],
    ["Mühasib operator", "MKT İstehsalat Kommersiya MMC", "2022-02", "2023-06", false],
  );
  assert.deepEqual(
    [experiences[1].title, experiences[1].start, experiences[1].end],
    ["Əsas vəsaitlər üzrə mühasib", "2023-06", "2023-10"],
  );
  assert.deepEqual(
    [experiences[2].title, experiences[2].company, experiences[2].start, experiences[2].current],
    ["Baş mühasib", "Alfa MMC", "2021-01", true],
  );
  assert.ok(experiences[0].description.includes("1C sisteminə"));
});

test("education is read with school, subject and year", () => {
  const { education } = cvFields(standard);
  assert.equal(education.length, 2);
  assert.deepEqual([education[0].school, education[0].degree, education[0].year], ["Azərbaycan Dövlət İqtisad Universiteti", "Bakalavr · Mühasibat uçotu", "2020"]);
  assert.deepEqual([education[1].school, education[1].degree, education[1].year], ["Xəzər Universiteti", "Magistratura (MBA)", "2023"]);
});

const designed = `GİZEM KAYA
merhaba@harikasite.web.tr
MARKA YÖNETİCİSİ 0 212 123 24 25
DENEYİM
2024-...
Kayalı Şirketler Grubu- Marka Yöneticisi
Marka stratejisinin hazırlanması və xərclərə nəzarət.
Kayalı Şirketler Grubu- Marka Uzmanı 2021-2024
Marka kampaniyalarının idarə edilməsi.
E Ğ İ T İ M
Deryalar Üniversitesi- Endüstri Mühendisliği 2015-2019
Lisans
Deryalar Üniversitesi- Endüstri Mühendisliği 2019-2021
Yüksek Lisans`;

test("a layout with the dates before the position and letter-spaced headings is read", () => {
  const { experiences, education } = cvFields(designed);
  assert.equal(experiences.length, 2);
  assert.deepEqual([experiences[0].title, experiences[0].company, experiences[0].start, experiences[0].current], ["Marka Yöneticisi", "Kayalı Şirketler Grubu", "2024-01", true]);
  assert.deepEqual([experiences[1].title, experiences[1].start, experiences[1].end], ["Marka Uzmanı", "2021-01", "2024-12"]);
  assert.equal(education.length, 2);
  assert.equal(education[1].degree, "Endüstri Mühendisliği · Yüksek Lisans");
});

const sidebar = `BANA ULAŞIN
Atatürk Mah. Gazi
REFERANSLAR
HELİN KINAY
Mühendis
+0 212 123 24 25
BURAK KUZEY
ENERJİ SİSTEMLERİ MÜHENDİSİ
HAKKIMDA
Enerji sistemləri mühəndisi.
EĞİTİM
DERYALAR ÜNİVERSİTESİ
Yüksek Lisans Eğitimi
2036 | 2038
DERYALAR ÜNİVERSİTESİ
Lisans Eğitimi
2034 | 2036`;

test("the name is found after a sidebar, and a reference person is not taken for it", () => {
  const fields = cvFields(sidebar);
  assert.equal(fields.name, "BURAK KUZEY");
  assert.equal(fields.title, "ENERJİ SİSTEMLERİ MÜHENDİSİ");
  assert.equal(fields.education.length, 2);
  assert.equal(fields.education[1].year, "2036");
});

test("uncertain history stays empty instead of being invented", () => {
  const fields = cvFields("Elçin Rəhimov\nMühasib\nİş təcrübəsi\nÇoxlu işlərdə çalışmışam və bir çox şirkətlə əməkdaşlıq etmişəm.");
  assert.deepEqual(fields.experiences, []);
});
