import { SHEET_TEMPLATES } from "../lib/sheet-templates.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { parseLevel, resolveCatalogSkill, searchCatalog } from "../lib/skill-matrix.ts";

const custom = [{ id: "admin:1", label: "Kran operatorluğu (şirkətə xas)", category: "Anbar", aliases: ["kran operatoru xyz", "qüllə kranı"] }];

test("a name or an alias of a catalog skill resolves to the catalog name, an unknown one does not", () => {
  const excel = resolveCatalogSkill("excel");
  assert.ok(excel, "Excel is in the catalog");
  assert.equal(resolveCatalogSkill(excel.label)?.id, excel.id);
  assert.equal(resolveCatalogSkill("kran operatoru xyz", custom)?.label, "Kran operatorluğu (şirkətə xas)");
  assert.equal(resolveCatalogSkill("kran operatoru xyz"), null);
  assert.equal(resolveCatalogSkill("tam uydurma bacarıq xyz"), null);
  assert.equal(resolveCatalogSkill(""), null);
});

test("the search offers catalog skills, the admin's own ones too, and leaves out the ones already taken", () => {
  assert.deepEqual(searchCatalog("x", custom), []);
  const found = searchCatalog("kran operator", custom);
  assert.equal(found[0].label, "Kran operatorluğu (şirkətə xas)");
  const ex = searchCatalog("excel");
  assert.ok(ex.length > 0);
  assert.equal(searchCatalog("excel", [], [ex[0].label]).some((s) => s.id === ex[0].id), false);
});

test("levels are read from figures and words, and nonsense is told apart from an empty cell", () => {
  assert.equal(parseLevel(""), null);
  assert.equal(parseLevel("3"), 3);
  assert.equal(parseLevel("Ekspert"), 4);
  assert.equal(parseLevel("işləyə bilir"), 2);
  assert.equal(parseLevel("0"), 0);
  assert.equal(parseLevel("çox yaxşı"), "bad");
  assert.equal(parseLevel("7"), "bad");
});

test("every skill in the sample file is in the catalog, so the sample loads as it is", () => {
  for (const [, , , skill] of SHEET_TEMPLATES.skillmatrix.examples) assert.ok(resolveCatalogSkill(String(skill)), String(skill));
});
