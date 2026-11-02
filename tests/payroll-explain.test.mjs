import test from "node:test";
import assert from "node:assert/strict";
import { explainChange } from "../lib/payroll-explain.ts";

const base = { month: "2026-02", gross: 1000, net: 865, incomeTax: 24, insurance: 111, deductions: 0, workedDays: 20, normDays: 20, toPay: 865, lines: [{ id: "worked", label: "x", amount: 1000 }] };
test("the changes between two months are told in words", () => {
  assert.match(explainChange(null, base)[0], /ilk haqq-hesab/);
  const next = { ...base, month: "2026-03", gross: 1150, net: 984.5, incomeTax: 33, insurance: 132.5, workedDays: 18, normDays: 18, lines: [{ id: "worked", label: "x", amount: 1000 }, { id: "bonus", label: "Mükafat", amount: 150 }] };
  const text = explainChange(base, next).join(" | ");
  assert.match(text, /119\.50 AZN çoxdur/);
  assert.match(text, /Yeni: mükafat 150\.00 AZN/);
  assert.match(text, /İş günləri: bu ay 18\/18/);
  assert.match(text, /Vergi və sığorta/);
  assert.match(explainChange(base, base)[0], /eynidir/);
});
