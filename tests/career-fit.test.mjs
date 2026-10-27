// Career evidence: field weights, recency, career changers and the readable band.
import assert from "node:assert/strict";
import test from "node:test";
import { blankProfile, match } from "../lib/model.ts";
import { bandFor, fieldProfile, recencyWeight, weightedYears } from "../lib/career.ts";

test("recent work counts fully and old work counts less", () => {
  const now = new Date("2026-10-27");
  assert.equal(recencyWeight(12), 1);
  assert.equal(recencyWeight(100), 0.75);
  assert.equal(recencyWeight(200), 0.5);
  const recent = weightedYears([{ start: "2021-01", end: "2026-01", current: false }], now);
  const old = weightedYears([{ start: "2005-01", end: "2010-01", current: false }], now);
  assert.ok(recent > old);
  assert.ok(old > 0);
});

test("bands follow the score and fields have their own weights", () => {
  assert.equal(bandFor(85), "strong");
  assert.equal(bandFor(65), "good");
  assert.equal(bandFor(45), "partial");
  assert.equal(bandFor(10), "weak");
  assert.ok(fieldProfile("sales").experience > fieldProfile("it").experience);
  assert.ok(fieldProfile("finance").certBonus > fieldProfile("sales").certBonus);
  assert.equal(fieldProfile("unknown").skills, 50);
});

const job = {
  id: "j", owner: "c", title: "Mühasib", company: "T", city: "Bakı", mode: "Ofisdə", type: "Tam ştat",
  category: "Maliyyə, bankçılıq və sığorta", minSalary: 0, maxSalary: 0, minYears: 2, maxYears: 5,
  skills: ["Microsoft Excel", "Debitor və kreditor uçotu"], description: "Hesabatların hazırlanması, uçot", requirements: "", status: "published",
};
const worker = (title, description, start = "2019-01") => ({
  ...blankProfile, city: "Bakı", mode: "Ofisdə", title, skills: ["Microsoft Excel", "Debitor və kreditor uçotu"],
  experiences: [{ id: "1", title, company: "X", employmentType: "", start, end: "", current: true, description }],
});

test("the result carries a band, five parts and reasons", () => {
  const r = match(worker("Mühasib", "Hesabatların hazırlanması, debitor və kreditor uçotu, Microsoft Excel"), job);
  assert.ok(["strong", "good", "partial", "weak"].includes(r.fit.band));
  assert.equal(r.fit.parts.length, 5);
  assert.equal(r.fit.fieldChange, false);
  assert.ok(r.fit.parts.every((x) => x.note));
});

test("a career changer who has done the work is not treated as a newcomer", () => {
  const r = match(
    worker("Satış meneceri", "Müştərilərin debitor və kreditor uçotu, Microsoft Excel ilə hesabatların hazırlanması"),
    job,
  );
  assert.equal(r.fit.fieldChange, true);
  assert.ok(r.relevantYears >= 3, `relevantYears ${r.relevantYears}`);
  assert.ok(!r.caps.includes("experience-gap"));
});

test("an unrelated person with no matching work stays weak", () => {
  const r = match({ ...worker("Aşpaz", "Yemək hazırlanması"), skills: [] }, job);
  assert.equal(r.fit.fieldChange, false);
  assert.ok(r.score <= 45);
  assert.ok(["weak", "partial"].includes(r.fit.band));
});

test("a score never claims certainty and weak duties cannot give a strong band", () => {
  const perfect = match(
    worker("Mühasib", "Hesabatların hazırlanması, debitor və kreditor uçotu, Microsoft Excel ilə uçot", "2010-01"),
    job,
  );
  assert.ok(perfect.score <= 95, `score ${perfect.score}`);
  const vague = match(worker("Mühasib", "Strategiyanın hazırlanması, komandanın idarə edilməsi, investisiya layihələrinin qiymətləndirilməsi, rəhbərliyə təqdimatlar", "2012-01"), {
    ...job,
    description: "Qaimə-fakturaların uçotu, bank çıxarışlarının işlənməsi, kassa əməliyyatları, əmək haqqı hesablanması",
  });
  assert.ok(vague.score <= 75, `score ${vague.score}`);
  assert.notEqual(vague.fit.band, "strong");
});

test("a certification in the vacancy's field helps even when the vacancy does not ask for it", () => {
  const plain = worker("Mühasib", "Hesabatların hazırlanması, qaimələr", "2025-01");
  plain.skills = ["Microsoft Excel"];
  const certified = {
    ...plain,
    certifications: [{ id: "acca", status: "in_progress", level: "", passed: [] }],
  };
  const a = match(plain, job);
  const b = match(certified, job);
  assert.ok(b.score > a.score, `${b.score} vs ${a.score}`);
  assert.ok(b.fit.strengths.some((x) => x.includes("sertifikat")));
});

test("certifications of one field are weighed by world recognition", async () => {
  const { certificationPrestige } = await import("../lib/cert-prestige.ts");
  assert.ok(certificationPrestige("acca").weight > certificationPrestige("az-pms-ifrs").weight);
  assert.ok(certificationPrestige("acca").weight > certificationPrestige("acca-fia").weight);
  const base = worker("Mühasib", "Hesabatların hazırlanması, qaimələr", "2025-01");
  base.skills = ["Microsoft Excel"];
  const withCert = (id) => ({ ...base, certifications: [{ id, status: "active", level: "", passed: [] }] });
  const global = match(withCert("acca"), job);
  const local = match(withCert("az-pms-ifrs"), job);
  assert.ok(global.score > local.score, `${global.score} vs ${local.score}`);
});

test("recognition tiers cover every field, not only finance", async () => {
  const { certificationPrestige } = await import("../lib/cert-prestige.ts");
  const w = (id) => certificationPrestige(id).weight;
  assert.ok(w("pmp") > w("capm"));
  assert.ok(w("cissp") > w("isc2-cc"));
  assert.ok(w("aws-devops") > w("aws-ccp"));
  assert.ok(w("ccie") > w("ccna"));
  assert.ok(w("cipd") > w("aihr"));
  assert.ok(w("nebosh-diploma") > w("first-aid"));
  assert.ok(w("az-305") > w("az-900"));
  assert.ok(w("az-305") > w("az-pms-ifrs"), "Azure exams are not national credentials");
  assert.equal(certificationPrestige("az-auditor").label, "milli");
});
