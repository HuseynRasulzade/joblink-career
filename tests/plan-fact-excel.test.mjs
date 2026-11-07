import test from "node:test";
import assert from "node:assert/strict";
import { parsePlanFactSheets, parseMonthCell, PF, BUDGET_KINDS } from "../lib/plan-fact-excel.ts";

const sheets = (extra = {}) => [
  { name: PF.budget, rows: [["Növ", "Departament", "Ay", "Məbləğ (AZN)"], ["Hədiyyələr və təbriklər", "Maliyyə", "2026-11", "500"], ["əmək haqqı", "", "11.2026", "20000,50"], ["Kosmos", "", "2026-11", "5"], ["Təlim", "", "Noyabr 2026", "300"], ["Təlim", "", "2026-13", "300"]] },
  { name: PF.headcount, rows: [["Ay", "Hədəf işçi sayı"], ["2026-11", "12"], ["2026-11", "13"], ["2026-12", "abc"]] },
  { name: PF.expenses, rows: [["Növ", "Xərcin adı", "Departament", "Məbləğ (AZN)", "Tarix", "Kimə ödəniləcək", "Qeyd"], ["Tədbirlər", "Yeni il", "", "1 200", "20.12.2026", "Otel MMC", ""], ["Əmək haqqı", "x", "", "5", "2026-11-01"], ["Hədiyyələr", "", "", "5", "2026-11-01"], ["Hədiyyələr", "Köhnə", "", "50", "2026-11-01", "", "", "Ödənilib", "JL-2026-000001", "", "", "", "", "abc-id"]] },
  ...Object.entries(extra).map(([name, rows]) => ({ name, rows })),
];

test("the budget sheet is read with kinds, months and amounts; bad lines are named", () => {
  const r = parsePlanFactSheets(sheets());
  assert.deepEqual(r.budgets.map((b) => [b.category, b.department, b.month, b.amount]), [["gifts", "Maliyyə", "2026-11", 500], ["payroll", "", "2026-11", 20000.5], ["training", "", "2026-11", 300]]);
  const bad = r.issues.filter((i) => i.sheet === PF.budget);
  assert.equal(bad.length, 2);
  assert.match(bad[0].reason, /Kosmos/);
});
test("the headcount sheet takes whole numbers and refuses a month twice", () => {
  const r = parsePlanFactSheets(sheets());
  assert.deepEqual(r.targets, [{ month: "2026-11", target: 12 }]);
  assert.equal(r.issues.filter((i) => i.sheet === PF.headcount).length, 2);
});
test("expenses: pay is not an expense kind, lines out of the platform are skipped, amounts with spaces read", () => {
  const r = parsePlanFactSheets(sheets());
  assert.equal(r.expenses.length, 1);
  assert.deepEqual([r.expenses[0].category, r.expenses[0].amount, r.expenses[0].date], ["events", 1200, "2026-12-20"]);
  assert.equal(r.skipped, 1);
  assert.equal(r.issues.filter((i) => i.sheet === PF.expenses).length, 2);
});
test("a file of another kind is refused, months are read in several ways", () => {
  assert.match(parsePlanFactSheets([{ name: "Sheet1", rows: [["a"]] }]).issues[0].reason, /plan və fakt faylı deyil/);
  for (const [text, month] of [["2026-03", "2026-03"], ["3/2026", "2026-03"], ["Mart 2026", "2026-03"], ["2026-03-15", "2026-03"], ["2026-00", ""], ["", ""]]) assert.equal(parseMonthCell(text), month, text);
  assert.ok(BUDGET_KINDS.length >= 9);
});

import { planFactWorkbook, planFactTemplate } from "../lib/plan-fact-excel.ts";
test("the exported workbook reads back, and the sample file reads without a problem", () => {
  const out = planFactWorkbook({
    year: "2026",
    budgets: [{ category: "gifts", department: "Maliyyə", month: "2026-11", amount: 500 }],
    targets: [{ month: "2026-11", target: 12 }],
    expenses: [{ id: "x1", category: "gifts", title: "A", department: "", amount: 10, date: "2026-11-20", payee: "", note: "", status: "paid", orderNo: "JL-2026-000001", paidOn: "2026-11-22", method: "bank", payFrom: "", payRef: "" }],
  });
  const sheets = out.map((s) => ({ name: s.name, rows: [s.headers, ...s.rows.map((r) => r.map((c) => String(c ?? "")))] }));
  const back = parsePlanFactSheets(sheets);
  assert.equal(back.budgets.length, 1);
  assert.equal(back.targets.length, 1);
  assert.equal(back.expenses.length, 0);
  assert.equal(back.skipped, 1);
  const sample = planFactTemplate("2026");
  const read = parsePlanFactSheets(sample.map((s) => ({ name: s.name, rows: [s.headers, ...s.rows.map((r) => r.map((c) => String(c ?? "")))] })));
  assert.deepEqual(read.issues, []);
  assert.ok(read.budgets.length >= 4 && read.targets.length >= 3 && read.expenses.length >= 2);
});
