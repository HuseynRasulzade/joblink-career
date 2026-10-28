// Rule-based CV reading for designed (Canva-style) CVs with Turkish headings and capitalised names.
import assert from "node:assert/strict";
import test from "node:test";
import { cvFields } from "../lib/cv-fields.ts";

const engineer = `[SƏHİFƏ 1]
BURAK KUZEY
ENERJİ SİSTEMLERİ MÜHENDİSİ
HAKKIMDA
Enerji sistemləri üzrə mühəndis, layihə və quraşdırma təcrübəsi.
İŞ GEÇMİŞİ
ENERJİ SİSTEMLERİ MÜHENDİSİ
Sesler Şirketi
EĞİTİM
DERYALAR ÜNİVERSİTESİ
Yüksek Lisans Eğitimi
YABANCI DİL
İNGİLİZCE
C1 seviye
FRANSIZCA
Başlangıç Düzeyinde`;

test("a capitalised name and the profession under it are read", () => {
  const fields = cvFields(engineer);
  assert.equal(fields.name, "BURAK KUZEY");
  assert.equal(fields.title, "ENERJİ SİSTEMLERİ MÜHENDİSİ");
});

test("Turkish headings end the sections", () => {
  const fields = cvFields(engineer);
  assert.ok(fields.summary.startsWith("Enerji sistemləri üzrə mühəndis"));
  assert.ok(!fields.summary.includes("Sesler"));
  assert.ok(fields.languages.includes("İNGİLİZCE"));
});

test("a first line with a phone number is not mistaken for a profession", () => {
  const fields = cvFields("GİZEM KAYA\n+0 212 123 24 25\nHAKKIMDA\nMarketinq üzrə mütəxəssis.");
  assert.equal(fields.name, "GİZEM KAYA");
  assert.equal(fields.title, "");
});

test("a name printed letter by letter, and a subject sharing a line with its years", () => {
  const out = cvFields(`G İ Z E M   K A Y A
Pazarlama Yöneticisi
gizem@mail.com

DENEYİM
Pazarlama Yöneticisi
Acme Teknoloji A.Ş. | 2020 - Devam

EĞİTİM
İstanbul Üniversitesi
İşletme 2014 - 2018`);
  assert.equal(out.name, "GİZEM KAYA");
  assert.equal(out.title, "Pazarlama Yöneticisi");
  assert.equal(out.education?.[0].degree, "İşletme");
  assert.equal(out.education?.[0].year, "2018");
});

test("positions without dates keep their company (position, company under it, then duties)", () => {
  const out = cvFields(`BURAK KUZEY
ENERJİ SİSTEMLERİ MÜHENDİSİ

İŞ GEÇMİŞİ
ENERJİ SİSTEMLERİ MÜHENDİSİ
Sesler Şirketi
Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Elektrik şebekesi projelerinin yönetimi ve raporlanması.

EĞİTİM
DERYALAR ÜNİVERSİTESİ
Lisans Eğitimi
2034 | 2036`);
  assert.equal(out.experiences?.length, 1);
  assert.equal(out.experiences?.[0].company, "Sesler Şirketi");
  assert.equal(out.experiences?.[0].title, "ENERJİ SİSTEMLERİ MÜHENDİSİ");
});

test("a letter-by-letter name without word gaps is split after a known first name", () => {
  const out = cvFields(`G İ Z E M K A Y A
P A Z A R L A M A  Y Ö N E T İ C İ S İ

DENEYİM
Pazarlama Yöneticisi
Acme A.Ş. | 2020 - Devam`);
  assert.equal(out.name, "GİZEM KAYA");
  assert.equal(out.title, "PAZARLAMA YÖNETİCİSİ");
});
