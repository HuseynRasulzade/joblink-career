// Study programme catalog and the "programme · level" degree string.
import test from "node:test";
import assert from "node:assert/strict";
import {
  DEGREE_LEVELS,
  MAJORS,
  MAJOR_FIELDS,
  canonicalMajor,
  composeDegree,
  normalizeMajorKey,
  parseDegree,
  searchMajors,
} from "../lib/major-catalog.ts";

test("catalog: unique ids, known fields, no name shared by two programmes", () => {
  const ids = MAJORS.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(MAJORS.length >= 400, `only ${MAJORS.length}`);
  const owner = new Map();
  for (const m of MAJORS) {
    assert.ok(MAJOR_FIELDS[m.field], `${m.id}: unknown field ${m.field}`);
    assert.ok(m.label && m.labelEn && m.labelRu, `${m.id} lacks a name`);
    for (const alias of m.aliases) {
      const key = normalizeMajorKey(alias);
      assert.ok(!owner.has(key) || owner.get(key) === m.id, `"${alias}" used by ${owner.get(key)} and ${m.id}`);
      owner.set(key, m.id);
    }
  }
});

test("common Azerbaijani programmes are present", () => {
  for (const name of [
    "Maliyyə",
    "Mühasibat uçotu",
    "Bank işi",
    "Marketinq",
    "Menecment",
    "Hüquqşünaslıq",
    "Beynəlxalq münasibətlər",
    "Psixologiya",
    "Proqram mühəndisliyi",
    "Neft-qaz mühəndisliyi",
    "Müalicə işi",
    "Əczaçılıq",
    "Stomatologiya",
    "İnşaat mühəndisliyi",
    "Memarlıq",
    "Jurnalistika",
    "Sinif müəllimliyi",
  ])
    assert.ok(canonicalMajor(name), name);
});

test("search finds other languages, abbreviations and typos", () => {
  assert.equal(searchMajors("finance")[0].label, "Maliyyə");
  assert.equal(searchMajors("бухгалтерский учёт")[0].id, "accounting");
  assert.equal(searchMajors("mühasibat")[0].field, "business");
  assert.equal(searchMajors("MBA")[0].id, "master-of-business-administration");
  assert.equal(searchMajors("marketink")[0].id, "marketing");
  assert.deepEqual(searchMajors("x"), []);
  assert.deepEqual(searchMajors("zzzzqqqq"), []);
});

test("degree strings split into programme and level and back", () => {
  assert.equal(parseDegree("Maliyyə · Bakalavr").level?.id, "bachelor");
  assert.equal(parseDegree("Maliyyə · Bakalavr").major, "Maliyyə");
  assert.equal(parseDegree("MSc").level?.id, "master");
  assert.equal(parseDegree("Finance, bachelor").level, null);
  const parsed = parseDegree("Bakalavr · Maliyyə · İqtisadiyyat fakültəsi");
  assert.equal(parsed.level?.id, "bachelor");
  assert.equal(parsed.major, "Maliyyə · İqtisadiyyat fakültəsi");
  const level = DEGREE_LEVELS.find((l) => l.id === "master");
  assert.equal(composeDegree("Marketinq", level), "Marketinq · Magistr");
  assert.equal(composeDegree("Marketinq", level, "en"), "Marketinq · Master's degree");
  assert.equal(composeDegree("", level), "Magistr");
  assert.equal(composeDegree("Marketinq", null), "Marketinq");
  assert.deepEqual(parseDegree(composeDegree("Marketinq", level)).major, "Marketinq");
});

test("administrator-added programmes are found like catalog ones and can be cleared", async () => {
  const { setCustomMajors } = await import("../lib/major-catalog.ts");
  const added = { id: "custom:9", label: "Kosmik mühəndislik sınağı", labelEn: "Space engineering test", labelRu: "Космическая инженерия тест", field: "engineering", aliases: ["Kosmik mühəndislik sınağı", "Space engineering test", "Космическая инженерия тест", "KMS-test"] };
  assert.equal(canonicalMajor("KMS-test"), null);
  setCustomMajors([added]);
  assert.equal(canonicalMajor("kosmik muhendislik sinagi")?.id, "custom:9");
  assert.equal(searchMajors("space engineering")[0].id, "custom:9");
  setCustomMajors([]);
  assert.equal(canonicalMajor("KMS-test"), null);
});

test("a slip in a partly typed programme still finds it", () => {
  assert.equal(searchMajors("proqram muhendislk")[0].id, "software-engineering");
  assert.equal(searchMajors("beynelxalq munasibet")[0].id, "international-relations");
});
