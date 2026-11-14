import test from "node:test";
import assert from "node:assert/strict";
import { stableHash } from "../lib/ai-hash.ts";

test("spaces, capitals and punctuation do not change the hash", async () => {
  const a = await stableHash({ title: "Baş  mühasib", requirements: "ACCA sertifikatı, 3 il təcrübə." });
  const b = await stableHash({ requirements: "acca sertifikatı 3 il təcrübə", title: "baş mühasib" });
  assert.equal(a, b);
});
test("a different meaning changes it", async () => {
  const a = await stableHash({ title: "Mühasib", requirements: "3 il təcrübə" });
  assert.notEqual(a, await stableHash({ title: "Mühasib", requirements: "5 il təcrübə" }));
  assert.notEqual(a, await stableHash({ title: "Baş mühasib", requirements: "3 il təcrübə" }));
});
test("the years of a person count in half years, so a day does not change the hash", async () => {
  const a = await stableHash({ relevantYears: 4.01, skills: ["Excel"] });
  const b = await stableHash({ relevantYears: 4.12, skills: ["excel"] });
  assert.equal(a, b);
  assert.notEqual(a, await stableHash({ relevantYears: 4.6, skills: ["Excel"] }));
});
test("the order of the fields does not matter, the order of a list does", async () => {
  assert.equal(await stableHash({ a: 1, b: 2 }), await stableHash({ b: 2, a: 1 }));
  assert.notEqual(await stableHash({ skills: ["A", "B"] }), await stableHash({ skills: ["B", "A"] }));
});
