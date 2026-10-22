// University catalog used by the education section.
import test from "node:test";
import assert from "node:assert/strict";
import {
  COUNTRIES,
  UNIVERSITIES,
  canonicalUniversity,
  normalizeUniversityKey,
  searchUniversities,
} from "../lib/university-catalog.ts";

test("catalog: unique ids, known countries, no name shared by two universities", () => {
  const ids = UNIVERSITIES.map((u) => u.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(UNIVERSITIES.length >= 400, `only ${UNIVERSITIES.length}`);
  const owner = new Map();
  for (const u of UNIVERSITIES) {
    assert.ok(COUNTRIES[u.country], `${u.id}: unknown country ${u.country}`);
    assert.ok(u.label && u.labelEn && u.labelRu, `${u.id} lacks a name`);
    for (const alias of u.aliases) {
      const key = normalizeUniversityKey(alias);
      assert.ok(!owner.has(key) || owner.get(key) === u.id, `"${alias}" used by ${owner.get(key)} and ${u.id}`);
      owner.set(key, u.id);
    }
  }
});

test("every Azerbaijani state university in the usual list is present", () => {
  for (const name of [
    "Bakı Dövlət Universiteti",
    "Azərbaycan Dövlət İqtisad Universiteti",
    "Azərbaycan Texniki Universiteti",
    "Azərbaycan Tibb Universiteti",
    "Azərbaycan Dillər Universiteti",
    "Azərbaycan Memarlıq və İnşaat Universiteti",
    "Gəncə Dövlət Universiteti",
    "Sumqayıt Dövlət Universiteti",
    "Naxçıvan Dövlət Universiteti",
    "ADA Universiteti",
    "Xəzər Universiteti",
    "Qafqaz Universiteti",
  ])
    assert.ok(canonicalUniversity(name), name);
});

test("search finds abbreviations, other languages, partial input and typos", () => {
  assert.equal(searchUniversities("BDU")[0].id, "az-baku-state-university");
  assert.equal(searchUniversities("UNEC")[0].country, "AZ");
  assert.equal(searchUniversities("Бакинский государственный")[0].id, "az-baku-state-university");
  assert.equal(searchUniversities("odtü")[0].labelEn, "Middle East Technical University");
  assert.equal(searchUniversities("harvard")[0].labelEn, "Harvard University");
  assert.equal(searchUniversities("oksford")[0].labelEn, "University of Oxford");
  assert.equal(searchUniversities("xezer univ")[0].id, "az-khazar-university");
  assert.deepEqual(searchUniversities("x"), []);
  assert.deepEqual(searchUniversities("zzzzqqqq"), []);
});

test("Azerbaijani institutions come first for a shared word", () => {
  const found = searchUniversities("state university", 5);
  assert.equal(found[0].country, "AZ");
});
