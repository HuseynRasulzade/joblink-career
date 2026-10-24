// Certification catalog, CV recognition and their effect on matching.
import test from "node:test";
import assert from "node:assert/strict";
import {
  CERTIFICATION_CATALOG,
  CERTIFICATION_CATEGORIES,
  canonicalCertification,
  detectCertifications,
  normalizeCandidateCertifications,
  normalizeCertificationKey,
  normalizeJobCertifications,
  searchCertifications,
  certificationById,
  moduleSummary,
} from "../lib/certification-catalog.ts";
import { SKILL_CATALOG } from "../lib/skill-catalog.ts";
import { analyze, autoApplyEligible, blankProfile, candidateCertifications, match } from "../lib/model.ts";

const exp = (title, start, end, description = "", current = false) => ({
  id: `${title}-${start}`,
  title,
  company: "Test MMC",
  employmentType: "",
  start,
  end,
  current,
  description,
});
const accountant = (overrides = {}) => ({
  ...blankProfile,
  city: "Bakı",
  mode: "Ofisdə",
  title: "Baş mühasib",
  skills: ["Microsoft Excel", "Vergi uçotu"],
  experiences: [exp("Baş mühasib", "2017-01", "", "Vergi hesabatları, Excel", true)],
  ...overrides,
});
const vacancy = (overrides = {}) => ({
  id: "job",
  owner: "company",
  title: "Baş mühasib",
  company: "Test",
  city: "Bakı",
  mode: "Ofisdə",
  type: "Tam ştat",
  category: "Maliyyə, bankçılıq və sığorta",
  minSalary: 0,
  maxSalary: 0,
  minYears: 5,
  maxYears: 10,
  skills: ["Microsoft Excel", "Vergi uçotu", "MHBS / IFRS", "Maliyyə hesabatlılığı"],
  description: "",
  requirements: "",
  created: "2026-10-01",
  demo: false,
  status: "published",
  ...overrides,
});

test("catalog: ids are unique, categories and skill links are valid", () => {
  const ids = CERTIFICATION_CATALOG.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(CERTIFICATION_CATALOG.length >= 300, `only ${CERTIFICATION_CATALOG.length} certifications`);
  const skillIds = new Set(SKILL_CATALOG.map((s) => s.id));
  for (const c of CERTIFICATION_CATALOG) {
    assert.ok(CERTIFICATION_CATEGORIES[c.category], `${c.id} has unknown category`);
    assert.ok(c.skills.length, `${c.id} proves no skills`);
    for (const skill of c.skills) assert.ok(skillIds.has(skill), `${c.id} links missing skill ${skill}`);
    if (c.levels) assert.ok(c.levels.length >= 2, `${c.id} needs at least two levels`);
  }
  assert.equal(Object.keys(CERTIFICATION_CATEGORIES).length, new Set(CERTIFICATION_CATALOG.map((c) => c.category)).size);
});

test("catalog: no spelling variant points to two different certifications", () => {
  const owner = new Map();
  for (const c of CERTIFICATION_CATALOG)
    for (const alias of c.aliases) {
      const key = normalizeCertificationKey(alias);
      assert.ok(!owner.has(key) || owner.get(key) === c.id, `"${alias}" used by ${owner.get(key)} and ${c.id}`);
      owner.set(key, c.id);
    }
});

test("catalog: search finds certifications by acronym, full name and issuer", () => {
  assert.equal(searchCertifications("acca")[0].id, "acca");
  assert.equal(searchCertifications("Project Management Professional")[0].id, "pmp");
  assert.ok(searchCertifications("ISACA").some((c) => c.id === "cisa"));
  assert.equal(canonicalCertification("Chartered Financial Analyst")?.id, "cfa");
  assert.equal(canonicalCertification("ТРКИ")?.id, "trki");
});

test("recognition: statuses, levels and scores are read from CV text", () => {
  const found = Object.fromEntries(
    detectCertifications(
      "ACCA – 9/13 imtahan verilib, davam edir. IELTS Academic 7.5 (2023). PMP certified 2021. CFA Level II passed. NEBOSH IGC, vaxtı keçib.",
    ).map((c) => [c.id, c]),
  );
  assert.equal(found.acca.status, "in_progress");
  assert.equal(found.ielts.level, "7.5");
  assert.equal(found.ielts.year, "2023");
  assert.equal(found.pmp.status, "active");
  assert.equal(found.pmp.year, "2021");
  assert.equal(found.cfa.level, "Level II");
  assert.equal(found["nebosh-igc"].status, "expired");
});

test("recognition: plans and look-alike words are not certifications", () => {
  const ids = detectCertifications(
    "Gələcəkdə CIMA almaq istəyirəm. I want to take PMP next year. PE teacher. CA in Baku. AWS ilə işləmişəm. Pe-ri-od.",
  ).map((c) => c.id);
  assert.deepEqual(ids, []);
});

test("normalizers drop unknown ids, invalid levels and unsafe links", () => {
  const candidate = normalizeCandidateCertifications([
    { id: "ielts", status: "active", level: "12", credentialUrl: "javascript:alert(1)" },
    { id: "made-up", status: "active" },
    { id: "cfa", status: "in_progress", level: "level ii", year: "2024", credentialUrl: "https://cfainstitute.org/x" },
  ]);
  assert.deepEqual(candidate.map((c) => c.id), ["ielts", "cfa"]);
  assert.equal(candidate[0].level, undefined);
  assert.equal(candidate[0].credentialUrl, undefined);
  assert.equal(candidate[1].level, "Level II");
  assert.equal(candidate[1].credentialUrl, "https://cfainstitute.org/x");
  const job = normalizeJobCertifications(["ACCA", { id: "ielts", required: true, minLevel: "6,5" }, { id: "nope" }]);
  assert.deepEqual(job, [{ id: "acca", required: false }, { id: "ielts", required: true, minLevel: "6.5" }]);
});

test("profile certifications override what the CV text suggests", () => {
  const certs = candidateCertifications(
    accountant({
      cvText: "ACCA tələbəsi, 9/13 imtahan.",
      certifications: [{ id: "acca", status: "active", level: "Member (ACCA)" }],
    }),
  );
  assert.equal(certs.find((c) => c.id === "acca").status, "active");
});

test("matching: a missing required certification caps the score at 70", () => {
  const job = vacancy({ certifications: [{ id: "acca", required: true }] });
  const without = match(accountant(), job);
  const holder = match(accountant({ certifications: [{ id: "acca", status: "active" }] }), job);
  assert.ok(without.score <= 70, `without ACCA: ${without.score}`);
  assert.ok(without.caps.includes("missing-certification"));
  assert.ok(holder.score >= without.score + 15, `holder ${holder.score} vs ${without.score}`);
  assert.equal(holder.certEvidence[0].level, "held");
  assert.equal(autoApplyEligible(without, 80), false);
});

test("matching: in-progress and equivalent certifications count partly", () => {
  const job = vacancy({ certifications: [{ id: "acca", required: true }] });
  const student = match(accountant({ cvText: "ACCA tələbəsi, 9/13 imtahan verilib." }), job);
  const cpa = match(accountant({ certifications: [{ id: "cpa-us", status: "active" }] }), job);
  const member = match(accountant({ certifications: [{ id: "acca", status: "active" }] }), job);
  assert.equal(student.certEvidence[0].level, "in_progress");
  assert.equal(cpa.certEvidence[0].level, "equivalent");
  assert.ok(member.score > cpa.score && cpa.score > student.score, `${member.score} > ${cpa.score} > ${student.score}`);
  assert.ok(!student.caps.includes("missing-certification"));
});

test("matching: a score below the minimum level is flagged", () => {
  const job = vacancy({ certifications: [{ id: "ielts", required: true, minLevel: "6.5" }] });
  const low = match(accountant({ certifications: [{ id: "ielts", status: "active", level: "6" }] }), job);
  const high = match(accountant({ certifications: [{ id: "ielts", status: "active", level: "7" }] }), job);
  assert.equal(low.certEvidence[0].level, "below_level");
  assert.equal(high.certEvidence[0].level, "held");
  assert.ok(high.score > low.score);
});

test("matching: a held certification proves its skills and a preferred one adds a bonus", () => {
  const job = vacancy({ certifications: [{ id: "dipifr", required: false }] });
  const plain = match(accountant(), vacancy());
  const certified = match(accountant({ certifications: [{ id: "acca-dipifr", status: "active" }] }), job);
  assert.equal(certified.skillEvidence.find((x) => x.skill === "MHBS / IFRS").level, "certified");
  assert.ok(certified.score > plain.score, `${certified.score} vs ${plain.score}`);
});

test("CV score counts only recognized, earned certifications", () => {
  const text = analyze(accountant({ certificates: "salam" })).skills;
  const real = analyze(accountant({ certifications: [{ id: "acca", status: "active" }, { id: "ielts", status: "active", level: "7" }] })).skills;
  assert.ok(real >= text + 20, `${real} vs ${text}`);
});

test("recognition: individual ACCA papers become progress with a stage and count", () => {
  const [acca, pms] = detectCertifications(
    [
      "ACCA - Business and Technology (BT)",
      "ACCA - Management Accounting (MA)",
      "ACCA - Financial Accounting (FA)",
      "ACCA - Corporate and Business Law (LW)",
      "ACCA - Financial Reporting (FR)",
      "ACCA - Financial Management (FM)-prepare",
      "PMS - MHBS-1-ci mərhələ",
    ].join("\n"),
  );
  assert.equal(acca.id, "acca");
  assert.equal(acca.status, "in_progress");
  assert.equal(acca.level, "Applied Skills");
  assert.equal(acca.detail, "5/13 imtahan: BT, MA, FA, LW, FR · hazırlaşır: FM");
  assert.equal(pms.id, "az-pms-ifrs");
  assert.equal(pms.status, "in_progress");
  assert.equal(pms.level, "1-ci mərhələ");
});

test("recognition: Advanced Financial Management is not read as Financial Management", () => {
  const [acca] = detectCertifications("ACCA: Advanced Financial Management (AFM) passed");
  assert.equal(acca.level, "Strategic Professional");
  assert.match(acca.detail, /AFM/);
  assert.doesNotMatch(acca.detail, /\bFM\b/);
});

test("an ACCA member is not downgraded by listed papers", () => {
  const [acca] = detectCertifications("ACCA Member (ACCA) since 2019. ACCA - Financial Reporting (FR)");
  assert.equal(acca.status, "active");
  assert.equal(acca.level, "Member (ACCA)");
});

test("dismissed certifications are not taken from the CV again", () => {
  const profile = accountant({ cvText: "NEBOSH IGC", certificationsDismissed: ["nebosh-igc"] });
  assert.ok(!candidateCertifications(profile).some((c) => c.id === "nebosh-igc"));
});

test("recognition: exams written as 'Paper (CODE) · ACCA' and reversed PMS names", () => {
  const found = Object.fromEntries(
    detectCertifications(
      [
        "Business and Technology (BT) · ACCA",
        "Management Accounting (MA) · ACCA",
        "Financial Accounting (FA) · ACCA",
        "Corporate and Business Law (LW) · ACCA",
        "Financial Reporting (FR) · ACCA",
        "Financial Management (FM)-prepare · ACCA",
        "MHBS-1-ci mərhələ · PMS",
      ].join("\n"),
    ).map((c) => [c.id, c]),
  );
  assert.deepEqual(found.acca.passed, ["BT", "MA", "FA", "LW", "FR"]);
  assert.deepEqual(found.acca.preparing, ["FM"]);
  assert.equal(found.acca.level, "Applied Skills");
  assert.equal(found["az-pms-ifrs"].level, "1-ci mərhələ");
});

test("recognition: CIMA, CPA, CIA and FRM exams are read per module", () => {
  const found = Object.fromEntries(
    detectCertifications("CIMA: BA1, BA2, BA3 passed. CIMA E1 hazırlaşıram. US CPA – FAR, AUD passed. CIA Part 1 passed. FRM Part I")
      .map((c) => [c.id, c]),
  );
  assert.deepEqual(found.cima.passed, ["BA1", "BA2", "BA3"]);
  assert.deepEqual(found.cima.preparing, ["E1"]);
  assert.equal(found.cima.level, "Certificate in Business Accounting");
  assert.equal(found["cpa-us"].detail, "2/4 imtahan: AUD, FAR");
  assert.deepEqual(found.cia.passed, ["Part 1"]);
  assert.deepEqual(found.frm.passed, ["Part I"]);
});

test("module summary derives level, status and note; all exams make it active", () => {
  const acca = certificationById("acca");
  assert.deepEqual(moduleSummary(acca, ["BT", "MA", "FA"]), {
    status: "in_progress",
    level: "Applied Knowledge",
    detail: "3/13 imtahan: BT, MA, FA",
  });
  const all = acca.modules.map((mod) => mod.code).filter((code) => !["ATX", "AAA"].includes(code));
  assert.equal(moduleSummary(acca, all).status, "active");
  assert.equal(moduleSummary(acca, all).level, "Affiliate");
});

test("normalizer keeps only known exam codes", () => {
  const [acca] = normalizeCandidateCertifications([
    { id: "acca", status: "in_progress", passed: ["BT", "XX", "BT"], preparing: ["FM", "BT"] },
  ]);
  assert.deepEqual(acca.passed, ["BT"]);
  assert.deepEqual(acca.preparing, ["FM"]);
});

test("matching: employer-required exams are met by passed papers even before full ACCA", () => {
  const job = vacancy({ certifications: [{ id: "acca", required: true, modules: ["FR", "TX"] }] });
  const both = match(accountant({ certifications: [{ id: "acca", status: "in_progress", passed: ["BT", "FR", "TX"] }] }), job);
  const one = match(accountant({ certifications: [{ id: "acca", status: "in_progress", passed: ["BT", "FR"] }] }), job);
  const member = match(accountant({ certifications: [{ id: "acca", status: "active", level: "Member (ACCA)" }] }), job);
  assert.equal(both.certEvidence[0].level, "held");
  assert.equal(one.certEvidence[0].level, "in_progress");
  assert.equal(member.certEvidence[0].level, "held");
  assert.deepEqual(normalizeJobCertifications([{ id: "acca", modules: ["FR", "ZZ"] }])[0].modules, ["FR"]);
});

test("job certification: some exams required, others preferred", () => {
  const [wanted] = normalizeJobCertifications([
    { id: "acca", required: true, modules: ["BT", "MA"], preferredModules: ["FA", "MA", "XX"] },
  ]);
  assert.deepEqual(wanted.modules, ["BT", "MA"]);
  // MA is already required and XX is not an ACCA exam.
  assert.deepEqual(wanted.preferredModules, ["FA"]);
  // A preferred certification keeps no separate bonus list.
  const [soft] = normalizeJobCertifications([{ id: "acca", required: false, modules: ["BT"], preferredModules: ["FA"] }]);
  assert.equal(soft.preferredModules, undefined);
});

test("matching: preferred exams of a required certification add points without being required", () => {
  const job = vacancy({
    certifications: [{ id: "acca", required: true, modules: ["BT", "MA"], preferredModules: ["FA", "LW"] }],
  });
  const profile = (passed) =>
    accountant({ certifications: [{ id: "acca", status: "in_progress", level: "Applied Knowledge", passed }] });
  const base = match(profile(["BT", "MA"]), job);
  const more = match(profile(["BT", "MA", "FA", "LW"]), job);
  const missing = match(profile(["BT"]), job);
  assert.equal(base.certEvidence[0].level, "held");
  assert.equal(base.certEvidence[0].preferredPassed, 0);
  assert.equal(more.certEvidence[0].preferredPassed, 2);
  assert.equal(more.certEvidence[0].preferredTotal, 2);
  assert.ok(more.score > base.score, `${more.score} > ${base.score}`);
  // Missing a required exam is still not met, however many bonus exams exist.
  assert.notEqual(missing.certEvidence[0].level, "held");
});
