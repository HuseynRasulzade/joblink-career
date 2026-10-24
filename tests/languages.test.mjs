import assert from "node:assert/strict";
import test from "node:test";
import { parseLanguages, serializeLanguages } from "../lib/languages.ts";

test("languages round-trip through the stored text", () => {
  const text = "Azərbaycan dili — ana dili; İngilis dili — B2; Rus dili";
  const rows = parseLanguages(text);
  assert.deepEqual(rows, [
    { name: "Azərbaycan dili", level: "ana dili" },
    { name: "İngilis dili", level: "B2" },
    { name: "Rus dili", level: "" },
  ]);
  assert.equal(serializeLanguages(rows), text);
});

test("languages accept the forms a CV or older profile uses", () => {
  assert.deepEqual(parseLanguages("İngilis: B1\nTürk dili (C1)\nFars dili"), [
    { name: "İngilis", level: "B1" },
    { name: "Türk dili", level: "C1" },
    { name: "Fars dili", level: "" },
  ]);
  assert.deepEqual(parseLanguages("Rus dili; rus dili — A2"), [{ name: "Rus dili", level: "" }]);
  assert.deepEqual(parseLanguages(""), []);
});
