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

const director = (extra = {}) => ({
  ...worker("Maliyyə direktoru", "Maliyyə strategiyasının hazırlanması, komandanın idarə edilməsi, investorlara təqdimatlar", "2012-01"),
  ...extra,
});

test("a director applying for an analyst post is named as an overqualification risk", () => {
  const r = match(director(), job);
  assert.ok(r.fit.risks.some((x) => x.includes("həddindən artıq təcrübəli")));
  assert.ok(r.score <= 55, `score ${r.score}`);
});

test("a director who once worked at the vacancy's level is not punished as hard", () => {
  const stepper = director();
  stepper.experiences = [
    { ...stepper.experiences[0], current: false, end: "2019-12" },
    { id: "2", title: "Mühasib", company: "Y", employmentType: "", start: "2008-01", end: "2011-12", current: false, description: "Hesabatların hazırlanması və uçot" },
  ];
  const r = match(stepper, job);
  assert.ok(r.score > match(director(), job).score);
  assert.ok(r.fit.risks.some((x) => x.includes("əvvəl bu səviyyədə")));
});

test("expected pay far above the vacancy's range is a risk and limits the score", () => {
  const paid = { ...job, minSalary: 800, maxSalary: 1200 };
  const r = match({ ...worker("Mühasib", "Hesabatların hazırlanması, debitor və kreditor uçotu, Microsoft Excel", "2019-01"), salary: 3000 }, paid);
  assert.ok(r.fit.risks.some((x) => x.includes("Maaş gözləntisi")));
  assert.ok(r.score <= 84);
});

test("a related master's degree adds more than a bachelor's, an unrelated one adds nothing", async () => {
  const { educationFit } = await import("../lib/career.ts");
  assert.equal(educationFit([{ degree: "Magistratura (MBA) · Biznes" }], "finance").bonus, 4);
  assert.equal(educationFit([{ degree: "Bakalavr · Maliyyə" }], "finance").bonus, 2);
  assert.equal(educationFit([{ degree: "Bakalavr · Tarix" }], "finance").bonus, 0);
  assert.equal(educationFit([], "finance").degree, "none");
});

test("deputy, controller, lead and department-head titles get the right level", async () => {
  const { titleLevel } = await import("../lib/role-level.ts");
  assert.equal(titleLevel("Maliyyə direktorunun müavini"), 5);
  assert.equal(titleLevel("Controller"), 4);
  assert.equal(titleLevel("Lead Financial Analyst"), 3);
  assert.equal(titleLevel("Maliyyə şöbəsinin rəhbəri"), 5);
  assert.equal(titleLevel("Vice President"), 6);
});

test("strong candidates stay in order instead of tying at the ceiling", () => {
  const good = match(worker("Mühasib", "Hesabatların hazırlanması, debitor və kreditor uçotu, Microsoft Excel", "2015-01"), job);
  const withDegree = match({ ...worker("Mühasib", "Hesabatların hazırlanması, debitor və kreditor uçotu, Microsoft Excel", "2015-01"), education: [{ id: "1", school: "ADIU", degree: "Magistratura · Maliyyə", year: "2014" }] }, job);
  assert.ok(withDegree.score >= good.score);
  assert.ok(withDegree.score <= 95);
});

test("an accountant is not a sales person just because the title says 'operator'", async () => {
  const { roleFamilies } = await import("../lib/model.ts");
  assert.ok(!roleFamilies("Mühasib operator").has("sales"));
  assert.ok(roleFamilies("Mühasib operator").has("finance"));
  assert.ok(roleFamilies("Zəng mərkəzi operatoru").has("sales"));
});

test("a vacancy without required skills is judged by the duties, not by the field alone", () => {
  const open = { ...job, title: "Satış meneceri", category: "Satış və müştəri xidməti", skills: [], description: "Müştərilərlə görüşlər, satış planının icrası, yeni müştərilərin cəlb edilməsi" };
  const accountant = match(worker("Mühasib operator", "Hesabatların hazırlanması, qaimələr, kassa əməliyyatları", "2019-01"), open);
  assert.ok(accountant.score <= 40, `score ${accountant.score}`);
});
