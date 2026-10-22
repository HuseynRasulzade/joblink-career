// Shared job titles catalog and its effect on role matching.
import test from "node:test";
import assert from "node:assert/strict";
import {
  fullJobTitleCatalog,
  JOB_TITLE_FAMILIES,
  canonicalJobTitle,
  normalizeJobTitleKey,
  searchJobTitles,
} from "../lib/job-title-catalog.ts";
import { roleRelevance } from "../lib/model.ts";

const job = (title, category = "") => ({ title, category });

test("catalog: unique ids, valid families, no spelling variant shared by two titles", () => {
  const ids = fullJobTitleCatalog().map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(fullJobTitleCatalog().length >= 200);
  const owner = new Map();
  for (const t of fullJobTitleCatalog()) {
    assert.ok(JOB_TITLE_FAMILIES[t.family], `${t.id} has unknown family ${t.family}`);
    for (const alias of t.aliases) {
      const key = normalizeJobTitleKey(alias);
      assert.ok(!owner.has(key) || owner.get(key) === t.id, `"${alias}" used by ${owner.get(key)} and ${t.id}`);
      owner.set(key, t.id);
    }
  }
});

test("search tolerates typos, other languages and partial input", () => {
  assert.equal(searchJobTitles("mühasip")[0].id, "accountant");
  assert.equal(searchJobTitles("Chief Accountant")[0].id, "chief-accountant");
  assert.equal(canonicalJobTitle("главный бухгалтер")?.id, "chief-accountant");
  assert.ok(searchJobTitles("satın").some((t) => t.id === "procurement-specialist"));
  assert.deepEqual(searchJobTitles(""), []);
});

test("the same catalog title in any language is the same profession", () => {
  assert.equal(roleRelevance("Chief Accountant", job("Baş mühasib")), 1);
  assert.equal(roleRelevance("главный бухгалтер", job("Baş mühasib")), 1);
});

test("catalog families relate titles without shared words", () => {
  assert.equal(roleRelevance("Xəzinədarlıq mütəxəssisi", job("Kredit analitiki")), 0.7);
  assert.equal(roleRelevance("Kuryer", job("Baş mühasib", "Maliyyə")), 0.1);
});

test("seniority variants are one profession and career context groups fields", async () => {
  const { careerContext, blankProfile } = await import("../lib/model.ts");
  assert.ok(searchJobTitles("senior accountant").length > 0);
  assert.equal(roleRelevance("Junior Auditor", job("Auditor")), 1);
  const ctx = careerContext(
    { ...blankProfile, experiences: [
      { id: "1", title: "Audit Assistant 1", company: "Deloitte", start: "2024-10", end: "2025-05", current: false, description: "", employmentType: "" },
      { id: "2", title: "Junior Economist", company: "SOCAR", start: "2025-07", end: "", current: true, description: "", employmentType: "" },
    ] },
    new Date("2026-10-19"),
  );
  assert.ok(ctx.fields.length >= 1);
  assert.ok(ctx.fields[0].months >= 8);
});

test("the catalog covers many professions and carries Russian names", () => {
  const all = fullJobTitleCatalog();
  assert.ok(all.length >= 1000, `only ${all.length} titles`);
  assert.equal(canonicalJobTitle("Roughneck")?.family, "oilgas");
  assert.equal(canonicalJobTitle("Aqronom")?.family, "agriculture");
  assert.equal(canonicalJobTitle("Dərzi")?.family, "trades");
  assert.equal(canonicalJobTitle("Бухгалтер")?.id, "accountant");
  assert.equal(canonicalJobTitle("Accountant")?.labelRu, "Бухгалтер");
  const withoutRu = all.filter((t) => !t.base && !t.labelRu);
  assert.equal(withoutRu.length, 0, `no Russian name: ${withoutRu.map((t) => t.id).join(", ")}`);
});

test("titles typed in Russian, Azerbaijani or with typos are found", () => {
  assert.equal(searchJobTitles("водитель такси")[0].id, "taxi-driver");
  assert.equal(searchJobTitles("qazmaçı")[0].id, "driller");
  assert.equal(searchJobTitles("kosmetoloq")[0].id, "cosmetologist");
  assert.equal(searchJobTitles("fermr")[0].id, "farmer");
});

test("new fields relate titles in the same family", () => {
  assert.equal(roleRelevance("Qazmaçı", job("Neft emalı zavodu operatoru")), 0.7);
  assert.equal(roleRelevance("Dərzi", job("Baş mühasib", "Maliyyə")), 0.1);
});
