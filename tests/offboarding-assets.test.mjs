import test from "node:test";
import assert from "node:assert/strict";
import { EXIT_QUESTIONS, OFFBOARDING_ITEMS, checklistProgress, cleanAnswers, cleanChecklist } from "../lib/offboarding.ts";
import { assetActHtml } from "../lib/assets.ts";

test("checklist progress counts only done items and drops unknown ones", () => {
  const state = cleanChecklist({ order: { done: true }, assets: { done: false }, nonsense: { done: true } });
  assert.deepEqual(Object.keys(state), ["order"]);
  const p = checklistProgress(state);
  assert.equal(p.total, OFFBOARDING_ITEMS.length);
  assert.equal(p.done, 1);
});
test("exit answers are checked against the question kind", () => {
  const a = cleanAnswers({ reason: "Əmək haqqı", manager: "4", pay: "9", recommend: "yes", return: "maybe", better: "  daha çox təlim  ", fake: "x" });
  assert.deepEqual(a, { reason: "Əmək haqqı", manager: "4", recommend: "yes", better: "daha çox təlim" });
  assert.ok(EXIT_QUESTIONS.length >= 6);
});
test("the asset act names the asset, the employee and escapes text", () => {
  const html = assetActHtml({ kind: "issue", number: "5", date: "2026-03-02", company: "Test MMC", employee: "Aysel <b>", position: "mühasib", asset: { name: "Noutbuk", serial: "SN1", inventoryNo: "INV-7", valueCents: 150000 }, condition: "yeni", note: "" });
  assert.match(html, /Noutbuk/);
  assert.match(html, /1\.?500/);
  assert.match(html, /Aysel &lt;b&gt;/);
});
