import test from "node:test";
import assert from "node:assert/strict";
import { DOC_KINDS, OTHER_TYPE, docLabel, normalizeDocType } from "../lib/employee-docs.ts";

test("every kind of document lists which one it can be", () => {
  for (const [key, kind] of Object.entries(DOC_KINDS)) {
    assert.ok(kind.label, key);
    assert.equal(new Set(kind.types).size, kind.types.length, key);
  }
  assert.ok(DOC_KINDS.contract.types.includes("Əmək müqaviləsi"));
  assert.ok(DOC_KINDS.order.types.includes("Məzuniyyət əmri"));
  assert.equal(DOC_KINDS.other.types.length, 0);
});

test("a document must say which one it is", () => {
  assert.equal(normalizeDocType("contract", "").ok, false);
  assert.deepEqual(normalizeDocType("contract", "Əmək müqaviləsi"), { ok: true, category: "contract", subtype: "Əmək müqaviləsi" });
  assert.equal(normalizeDocType("nonsense", "İşçinin ərizəsi").category, "other");
  assert.equal(normalizeDocType("other", "  İşçinin   ərizəsi ").subtype, "İşçinin ərizəsi");
  assert.equal(OTHER_TYPE, "Digər");
});

test("the label shows the type, number and date", () => {
  assert.equal(docLabel({ category: "contract", subtype: "Əmək müqaviləsi", docNumber: "12", docDate: "2026-01-15" }), "Əmək müqaviləsi · № 12 · 2026-01-15");
  assert.equal(docLabel({ category: "diploma", subtype: "" }), "Təhsil və sertifikat");
});
