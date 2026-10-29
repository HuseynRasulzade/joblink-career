import test from "node:test";
import assert from "node:assert/strict";
import { computePay, availableAdvance, paymentDate, scheduleProblem, latePenalty, dayStatus, cleanInputs, EMPTY_INPUTS } from "../lib/payroll-calc.ts";

const days = (spec) => spec.flatMap(([status, n]) => Array(n).fill(status));
const FULL = days([["work", 14]]); // March 2026 has 14 working days
const near = (a, b, eps = 0.011) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

test("a full month pays the salary and the taxes of lib/salary", () => {
  const r = computePay({ monthlySalary: 1000, statuses: FULL });
  assert.equal(r.normDays, 14);
  assert.equal(r.gross, 1000);
  assert.equal(r.incomeTax, 24);
  assert.equal(r.employeeSocial, 86);
  assert.equal(r.employeeUnemployment, 5);
  assert.equal(r.employeeMedical, 20);
  assert.equal(r.net, 865);
  assert.equal(r.toPay, 865);
  assert.equal(r.lines.length, 1);
  assert.equal(r.employerCost > 1000, true);
});

test("days off the pay: unpaid, social-insurance days, partial month, paid leave", () => {
  assert.equal(computePay({ monthlySalary: 1000, statuses: days([["work", 7], ["unpaid", 7]]) }).gross, 500);
  const benefit = computePay({ monthlySalary: 1000, statuses: days([["work", 12], ["benefit", 2]]) });
  near(benefit.gross, 857.14);
  assert.equal(benefit.benefitDays, 2);
  assert.ok(benefit.notes.some((n) => /Sosial Sığorta/.test(n)));
  const leave = computePay({ monthlySalary: 1000, statuses: days([["work", 12], ["paid", 2]]) });
  assert.equal(leave.gross, 1000);
  assert.equal(leave.paidLeaveDays, 2);
  assert.equal(computePay({ monthlySalary: 1000, statuses: days([["outside", 10], ["work", 4]]) }).gross, 285.71);
  const down = computePay({ monthlySalary: 1000, statuses: days([["work", 11], ["twothirds", 3]]) });
  near(down.gross, 928.57);
  assert.equal(computePay({ monthlySalary: 0, statuses: FULL }).gross, 0);
});

test("extra work, night work, bonuses and allowances", () => {
  const r = computePay({
    monthlySalary: 1120,
    statuses: FULL,
    inputs: { overtimeHours: 3, restDayHours: 8, restDayWithinNorm: true, nightHours: 10, nightPercent: 20, bonus: 100, allowance: 50 },
  });
  assert.equal(r.hourly, 10); // 1120 / (14 x 8)
  const by = Object.fromEntries(r.lines.map((l) => [l.id, l.amount]));
  assert.equal(by.overtime, 60);
  assert.equal(by["rest-day"], 80);
  assert.equal(by.night, 20);
  assert.equal(by.bonus, 100);
  assert.equal(by.allowance, 50);
  assert.equal(r.gross, 1120 + 60 + 80 + 20 + 100 + 50);
  const out = computePay({ monthlySalary: 1120, statuses: FULL, inputs: { restDayHours: 8, restDayWithinNorm: false } });
  assert.equal(out.lines.find((l) => l.id === "rest-day").amount, 160);
});

test("a shorter week raises the hourly rate, not the salary", () => {
  const short = computePay({ monthlySalary: 1008, statuses: FULL, weekHours: 36, inputs: { overtimeHours: 1 } });
  assert.equal(short.hourly, 10); // 1008 / (14 x 7.2)
  assert.equal(short.gross, 1008 + 20);
});

test("a tax reduction lowers only the income tax", () => {
  const plain = computePay({ monthlySalary: 1000, statuses: FULL });
  const reduced = computePay({ monthlySalary: 1000, statuses: FULL, taxReduction: 200 });
  assert.equal(reduced.incomeTax, 18);
  assert.equal(reduced.net, plain.net + 6);
  assert.equal(reduced.employeeSocial, plain.employeeSocial);
});

test("deductions stop at the limit of article 176; advances come off the net", () => {
  const net = computePay({ monthlySalary: 1000, statuses: FULL }).net; // 865
  const general = computePay({ monthlySalary: 1000, statuses: FULL, inputs: { deductions: [{ label: "Kredit", amount: 300, kind: "general" }] } });
  assert.equal(general.otherDeductions[0].applied, 173); // 20% of 865
  assert.equal(general.deductionsCapped, true);
  assert.equal(general.toPay, net - 173);
  const writ = computePay({ monthlySalary: 1000, statuses: FULL, inputs: { deductions: [{ label: "İcra", amount: 600, kind: "writ" }] } });
  assert.equal(writ.otherDeductions[0].applied, 432.5);
  const small = computePay({ monthlySalary: 1000, statuses: FULL, inputs: { deductions: [{ label: "Həmkarlar", amount: 10, kind: "general" }] } });
  assert.equal(small.deductionsCapped, false);
  assert.equal(small.toPay, net - 10);
  const advanced = computePay({ monthlySalary: 1000, statuses: FULL, advances: 400 });
  assert.equal(advanced.toPay, 465);
  const over = computePay({ monthlySalary: 1000, statuses: FULL, advances: 1000 });
  assert.equal(over.toPay, 0);
  assert.equal(over.advanceExcess, 135);
});

test("what an employee can take in advance is what the days behind have earned", () => {
  const input = { monthlySalary: 1000, statuses: FULL };
  assert.deepEqual(availableAdvance(input, 7, 0), { available: 432.5, earned: 432.5, share: 0.5 });
  assert.equal(availableAdvance(input, 7, 100).available, 332.5);
  assert.equal(availableAdvance(input, 7, 900).available, 0);
  assert.equal(availableAdvance(input, 14, 0).available, 865);
  // days behind that were unpaid earn nothing
  const withUnpaid = { monthlySalary: 1000, statuses: days([["unpaid", 7], ["work", 7]]) };
  assert.equal(availableAdvance(withUnpaid, 7, 0).available, 0);
  assert.equal(availableAdvance({ monthlySalary: 0, statuses: FULL }, 7, 0).available, 0);
});

test("payment day moves back to a working day, two payments need a gap of 16 days", () => {
  assert.equal(paymentDate(2026, 3, 15), "2026-03-13"); // a Sunday
  assert.equal(paymentDate(2026, 3, 13), "2026-03-13");
  assert.equal(paymentDate(2026, 5, 28), "2026-05-26"); // Qurban and Independence Day, the 29th is moved off
  assert.equal(paymentDate(2026, 2, 31), "2026-02-27"); // clamped to the end of the month (28 Feb is a Saturday)
  assert.equal(scheduleProblem(0, 5), "");
  assert.equal(scheduleProblem(15, 30), "");
  assert.match(scheduleProblem(10, 30), /16/);
  assert.match(scheduleProblem(20, 10), /sonra/);
});

test("a late payment costs 1% a day", () => {
  assert.deepEqual(latePenalty("2026-03-13", "2026-03-18", 1000), { days: 5, amount: 50 });
  assert.deepEqual(latePenalty("2026-03-13", "2026-03-13", 1000), { days: 0, amount: 0 });
  assert.deepEqual(latePenalty("2026-03-13", "2026-03-20", 0), { days: 0, amount: 0 });
});

test("attendance codes map to how the pay counts them, inputs are cleaned", () => {
  assert.equal(dayStatus(""), "work");
  assert.equal(dayStatus("trip"), "work");
  assert.equal(dayStatus("annual"), "paid");
  assert.equal(dayStatus("donor"), "paid");
  assert.equal(dayStatus("downtime"), "twothirds");
  assert.equal(dayStatus("sick"), "benefit");
  assert.equal(dayStatus("maternity"), "benefit");
  assert.equal(dayStatus("unpaid"), "unpaid");
  assert.equal(dayStatus("absent"), "unpaid");
  const c = cleanInputs({ bonus: "-5", overtimeHours: 9999, deductions: [{ label: " Kredit ", amount: "50", kind: "alimony" }, { label: "x", amount: 0 }, null], restDayWithinNorm: false });
  assert.equal(c.bonus, 0);
  assert.equal(c.overtimeHours, 400);
  assert.deepEqual(c.deductions, [{ label: "Kredit", amount: 50, kind: "alimony" }]);
  assert.equal(c.restDayWithinNorm, false);
  assert.deepEqual(cleanInputs(null), EMPTY_INPUTS);
});

import { vacationCalendarDays } from "../lib/payroll-calc.ts";
test("vacation days count weekends between vacation working days but not holidays", () => {
  const days = [
    { date: "2026-03-02", off: "" }, { date: "2026-03-03", off: "" }, { date: "2026-03-04", off: "" }, { date: "2026-03-05", off: "" }, { date: "2026-03-06", off: "" },
    { date: "2026-03-07", off: "weekend" }, { date: "2026-03-08", off: "weekend" },
    { date: "2026-03-09", off: "" }, { date: "2026-03-10", off: "" }, { date: "2026-03-11", off: "holiday" }, { date: "2026-03-12", off: "" },
  ];
  const marked = new Set(["2026-03-04", "2026-03-05", "2026-03-06", "2026-03-09", "2026-03-10", "2026-03-12"]);
  assert.deepEqual(vacationCalendarDays(days, (d) => marked.has(d)), { workingDays: 6, calendarDays: 8 });
});
test("vacation pay uses the 12-month average over 30.4 days", () => {
  const statuses = Array.from({ length: 20 }, (_, i) => (i < 10 ? "paid" : "work"));
  const r = computePay({ monthlySalary: 1000, statuses, annual: { mask: statuses.map((s) => s === "paid"), calendarDays: 14, averageMonthly: 912 } });
  const line = r.lines.find((l) => l.id === "vacation");
  assert.equal(line.amount, Math.round(((912 / 30.4) * 14) * 100) / 100);
  assert.equal(r.lines.find((l) => l.id === "paid-leave"), undefined);
  assert.equal(r.lines.find((l) => l.id === "worked").amount, 500);
});
