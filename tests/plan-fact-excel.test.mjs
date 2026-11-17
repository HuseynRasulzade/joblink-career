import test from "node:test";
import assert from "node:assert/strict";
import { parsePlanFactSheets, parseMonthCell, PF, BUDGET_KINDS } from "../lib/plan-fact-excel.ts";

const sheets = (extra = {}) => [
  { name: PF.budget, rows: [["Növ", "Departament", "Ay", "Məbləğ (AZN)"], ["Hədiyyələr və təbriklər", "Maliyyə", "2026-11", "500"], ["əmək haqqı", "", "11.2026", "20000,50"], ["Kosmos", "", "2026-11", "5"], ["Təlim", "", "Noyabr 2026", "300"], ["Təlim", "", "2026-13", "300"]] },
  { name: PF.staff, rows: [["Filial", "Departament", "Şöbə", "Vəzifə", "Pillə", "Ştat sayı", "Ştat dərəcəsi", "Əmək haqqı", "Maksimum əmək haqqı", "Başlanğıc ay", "Son ay", "Qeyd"], ["", "Maliyyə", "Mühasibat", "Mühasib", "junior", "2", "tam", "800", "1200", "2026-09", "", ""], ["", "Maliyyə", "Mühasibat", "Mühasib", "Junior", "1", "tam", "800", "1200", "", "", ""], ["A filialı", "Satış", "", "Menecer", "ortaq", "1", "tam", "", "", "", "", ""], ["", "İT", "", "Proqramçı", "", "1", "yarım", "1500", "", "2026-10", "2026-04", ""], ["", "İT", "", "Test mühəndisi", "Böyük", "1", "1/4", "2 000", "", "11.2026", "Mart 2027", "layihə"]] },
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
test("the staff sheet reads levels, rates, months and pay bands; mistakes are named and a repeated place is refused", () => {
  const r = parsePlanFactSheets(sheets());
  assert.deepEqual(r.staff.map((x) => [x.department, x.position, x.level, x.planned, x.rate, x.salary, x.salaryMax, x.startMonth, x.endMonth]), [
    ["Maliyyə", "Mühasib", "Junior", 2, 1, 800, 1200, "2026-09", ""],
    ["İT", "Test mühəndisi", "Böyük (Senior)", 1, 0.25, 2000, 2000, "2026-11", "2027-03"],
  ]);
  const bad = r.issues.filter((i) => i.sheet === PF.staff).map((i) => i.reason);
  assert.equal(bad.length, 3);
  assert.ok(bad.some((m) => /Pillə/.test(m)) && bad.some((m) => /Son ay/.test(m)) && bad.some((m) => /iki dəfə/.test(m)));
});
test("the old monthly-target sheet is no longer read: it is reported, nothing is saved from it", () => {
  const r = parsePlanFactSheets([...sheets(), { name: "İşçi sayı planı", rows: [["Ay", "Hədəf işçi sayı"], ["2026-11", "12"]] }]);
  assert.equal(r.legacyTargets, 1);
  assert.ok(r.issues.some((i) => i.sheet === "İşçi sayı planı" && /artıq oxunmur/.test(i.reason)));
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
    staff: [{ branch: "A filialı", department: "Maliyyə", section: "Mühasibat", position: "Mühasib", level: "Junior", rate: 0.5, planned: 2, salaryMin: 800, salaryMax: 1200, startMonth: "2026-09", endMonth: "2027-03", note: "n" }],
    expenses: [{ id: "x1", category: "gifts", title: "A", department: "", amount: 10, date: "2026-11-20", payee: "", note: "", status: "paid", orderNo: "JL-2026-000001", paidOn: "2026-11-22", method: "bank", payFrom: "", payRef: "" }],
  });
  const sheets = out.map((s) => ({ name: s.name, rows: [s.headers, ...s.rows.map((r) => r.map((c) => String(c ?? "")))] }));
  const back = parsePlanFactSheets(sheets);
  assert.equal(back.budgets.length, 1);
  assert.equal(back.staff.length, 1);
  assert.deepEqual([back.staff[0].branch, back.staff[0].level, back.staff[0].rate, back.staff[0].salary, back.staff[0].salaryMax, back.staff[0].startMonth, back.staff[0].endMonth], ["A filialı", "Junior", 0.5, 800, 1200, "2026-09", "2027-03"]);
  assert.equal(back.expenses.length, 0);
  assert.equal(back.skipped, 1);
  const sample = planFactTemplate("2026");
  const read = parsePlanFactSheets(sample.map((s) => ({ name: s.name, rows: [s.headers, ...s.rows.map((r) => r.map((c) => String(c ?? "")))] })));
  assert.deepEqual(read.issues, []);
  assert.ok(read.budgets.length >= 4 && read.staff.length >= 4 && read.expenses.length >= 2);
});
