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
