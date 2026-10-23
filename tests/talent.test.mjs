import test from "node:test";
import assert from "node:assert/strict";
import { matchesTalent, sanitizeNote, sanitizeTags } from "../lib/talent.ts";

test("tags are trimmed, de-duplicated, limited and accept a comma list", () => {
  assert.deepEqual(sanitizeTags([" Mühasib ", "mühasib", "x", "Bakı", ""]), ["Mühasib", "Bakı"]);
  assert.deepEqual(sanitizeTags("1C, Excel,, Excel"), ["1C", "Excel"]);
  assert.equal(sanitizeTags(Array.from({ length: 20 }, (_, i) => `etiket${i}`)).length, 8);
  assert.deepEqual(sanitizeTags(null), []);
  assert.equal(sanitizeTags(["a".repeat(80)])[0].length, 30);
});
test("the note is cleaned and limited", () => {
  assert.equal(sanitizeNote("  Yaxşı \n namizəd "), "Yaxşı namizəd");
  assert.equal(sanitizeNote("x".repeat(2000)).length, 800);
  assert.equal(sanitizeNote(5), "");
});
test("search ignores Azerbaijani letter variants and looks in name, title, skills, tags and note", () => {
  const e = { name: "Aysel Məmmədova", title: "Mühasib", skills: ["Excel", "1C"], tags: ["Bakı", "gələcək"], note: "Müsahibədə güclü idi" };
  assert.equal(matchesTalent(e, { q: "memmedova" }), true);
  assert.equal(matchesTalent(e, { q: "muhasib" }), true);
  assert.equal(matchesTalent(e, { q: "excel" }), true);
  assert.equal(matchesTalent(e, { q: "gucllu" }), false);
  assert.equal(matchesTalent(e, { q: "guclu" }), true);
  assert.equal(matchesTalent(e, { tag: "baki" }), true);
  assert.equal(matchesTalent(e, { tag: "satış" }), false);
  assert.equal(matchesTalent(e, {}), true);
});
