// Admin catalog upkeep: imports, translation check, duplicates and merging.
import assert from "node:assert/strict";
import test from "node:test";
import {
  duplicateGroups,
  mergedAliases,
  nameKey,
  parseEducationCsv,
  parseTitleCsv,
  translationIssues,
} from "../lib/catalog-check.ts";

const families = { finance: { az: "Maliyyə, mühasibatlıq və bank", en: "Finance" }, it: { az: "İT və məlumat", en: "IT and data" } };

test("job titles are imported with the group given as key or name", () => {
  const csv = "Ad;Name;Qrup;sinonimlər\nMaliyyə analitiki;Financial analyst;finance;fin analitik|analitik\nProqramçı;Developer;İT və məlumat\nBoş;;finance\nGeniş;Wide;naməlum\nMaliyyə analitiki;Again;finance";
  const { rows, issues } = parseTitleCsv(csv, families);
  assert.deepEqual(rows.map((r) => [r.label, r.family, r.aliases.length]), [["Maliyyə analitiki", "finance", 2], ["Proqramçı", "it", 0]]);
  assert.equal(issues.length, 3);
  assert.ok(issues.some((i) => /qrup/i.test(i.reason)));
  assert.ok(issues.some((i) => /təkrar/i.test(i.reason)));
});

test("education items are imported with a country or field", () => {
  const groups = {
    university: { AZ: { az: "Azərbaycan", en: "Azerbaijan", ru: "Азербайджан" } },
    major: { law: { az: "Hüquq", en: "Law", ru: "Право" } },
  };
  const csv = "Növ;Ad;Name;Название;Ölkə/Sahə;sinonimlər\nuniversitet;Bakı Dövlət Universiteti;Baku State University;Бакинский государственный университет;Azərbaycan;BDU\nixtisas;Hüquqşünaslıq;Jurisprudence;;law\nsəhv;X;Y;Z;AZ\nuniversitet;Yeni;New;;Marsda";
  const { rows, issues } = parseEducationCsv(csv, groups);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].extra, "AZ");
  assert.equal(rows[1].labelRu, "Hüquqşünaslıq");
  assert.equal(issues.length, 2);
});

test("missing or copied translations are reported", () => {
  const found = translationIssues([
    { kind: "skill", id: "1", label: "Büdcələşdirmə", labelEn: "", aliases: [] },
    { kind: "skill", id: "2", label: "Excel", labelEn: "excel", aliases: [] },
    { kind: "job-title", id: "3", label: "Mühasib", labelEn: "Mühasib", aliases: [] },
    { kind: "skill", id: "4", label: "Satış", labelEn: "Sales", aliases: [] },
    { kind: "university", id: "5", label: "ADA", labelEn: "ADA University", labelRu: "", aliases: [] },
    { kind: "certification", id: "6", label: "ACCA", aliases: [] },
  ]);
  assert.deepEqual(found.map((f) => f.id), ["1", "2", "3", "5"]);
});

test("duplicates share a name or alias in any language and spelling", () => {
  const groups = duplicateGroups([
    { kind: "job-title", id: "a", label: "Maliyyə analitiki", labelEn: "Financial analyst", aliases: [] },
    { kind: "job-title", id: "b", label: "Fin analitik", labelEn: "Finance analyst", aliases: ["MALİYYƏ  analitiki."] },
    { kind: "job-title", id: "c", label: "Mühasib", labelEn: "Accountant", aliases: [] },
    { kind: "skill", id: "d", label: "Mühasib", labelEn: "Accountant", aliases: [] },
  ]);
  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].ids, ["a", "b"]);
  assert.equal(nameKey("Əhməd  İsmayıl!"), "ehmed ismayil");
});

test("a merge keeps the names of both entries", () => {
  const keep = { kind: "job-title", id: "a", label: "Maliyyə analitiki", labelEn: "Financial analyst", aliases: ["fin analitik"] };
  const drop = { kind: "job-title", id: "b", label: "Fin analitik", labelEn: "Finance analyst", aliases: ["Maliyyə analitiki"] };
  assert.deepEqual(mergedAliases(keep, drop), ["fin analitik", "Finance analyst"]);
});
