import test from "node:test";
import assert from "node:assert/strict";
import * as c from "../lib/hr-calc.ts";

test("vacation entitlement follows articles 114-117", () => {
  assert.equal(c.vacationEntitlement({ tenureYears: 2 }).total, 21);
  assert.equal(c.vacationEntitlement({ tenureYears: 2, extendedMain: true }).total, 30);
  assert.equal(c.tenureLeaveDays(4.9), 0);
  assert.equal(c.tenureLeaveDays(5), 2);
  assert.equal(c.tenureLeaveDays(10), 4);
  assert.equal(c.tenureLeaveDays(15), 4);
  assert.equal(c.tenureLeaveDays(15.1), 6);
  const mother = c.vacationEntitlement({ tenureYears: 11, extendedMain: true, childrenUnder14: 2, eligibleForChildLeave: true });
  assert.equal(mother.total, 30 + 4 + 2);
  assert.equal(c.vacationEntitlement({ tenureYears: 0, childrenUnder14: 3, eligibleForChildLeave: true }).byChildren, 5);
  assert.equal(c.vacationEntitlement({ tenureYears: 0, childrenUnder14: 3 }).byChildren, 0);
});

test("vacation is extended by holidays inside it (art. 114.6)", () => {
  // 2026-05-25 .. : 27 and 28 May are Qurban, 28 is also Independence day (one day each), 29 is a moved day off
  const v = c.vacationDates("2026-05-25", 5);
  assert.ok(v.holidays.length >= 2);
  assert.equal(v.vacationDays, 5);
  assert.equal(v.calendarDays, 5 + v.holidays.length);
  assert.ok(v.end > "2026-05-29");
  assert.equal(c.vacationDates("bad", 5), null);
});

test("vacation pay: 12 months / 12 / 30.4 x days (art. 140.3)", () => {
  const pay = c.vacationPay(Array(12).fill(1520), 21, "2026-07-10");
  assert.equal(pay.averageMonthly, 1520);
  assert.equal(pay.dailyRate, 50);
  assert.equal(pay.pay, 1050);
  assert.equal(pay.payBy, "2026-07-07");
  // under 12 months: only the full months worked
  assert.equal(c.vacationPay([1000, 2000], 10).averageMonthly, 1500);
  // only the last 12 months
  assert.equal(c.averageMonthlyForLeave([9999, ...Array(12).fill(608)]).dailyRate, 20);
});

test("unused leave compensation (art. 144)", () => {
  const r = c.unusedLeaveCompensation({
    hireDate: "2024-01-01", endDate: "2026-01-01", mainLeaveDays: 21, usedDays: 21, monthlyEarnings: Array(12).fill(1520),
  });
  assert.equal(r.fullYears, 2);
  assert.ok(r.earnedDays >= 42);
  assert.equal(r.unusedDays, Math.round((r.earnedDays - 21) * 100) / 100);
  assert.equal(r.compensation, Math.round(r.unusedDays * 50 * 100) / 100);
  assert.equal(c.unusedLeaveCompensation({ hireDate: "2026-02-01", endDate: "2026-01-01", mainLeaveDays: 21, usedDays: 0, monthlyEarnings: [] }), null);
});

test("average pay for other cases (art. 177)", () => {
  const r = c.averageDailyEarnings({ earnings: 3000, workingDays: 40, paidDays: 5 });
  assert.equal(r.dailyRate, 75);
  assert.equal(r.pay, 375);
  const floor = c.averageDailyEarnings({ earnings: 3000, workingDays: 40, paidDays: 5, lastDailyPay: 100, floorToLastDay: true });
  assert.equal(floor.dailyRate, 100);
  assert.equal(floor.floorApplied, true);
  assert.equal(c.averageDailyEarnings({ earnings: 100, workingDays: 0, paidDays: 3 }).pay, 0);
});

test("termination by staff reduction (art. 77)", () => {
  assert.equal(c.noticeWeeks(0.5), 2);
  assert.equal(c.noticeWeeks(1), 4);
  assert.equal(c.noticeWeeks(5), 6);
  assert.equal(c.noticeWeeks(10), 6);
  assert.equal(c.noticeWeeks(10.1), 9);
  assert.equal(c.severanceMultiplier(0.5), 1);
  assert.equal(c.severanceMultiplier(3), 1.4);
  assert.equal(c.severanceMultiplier(7), 1.7);
  assert.equal(c.severanceMultiplier(12), 2);
  const t = c.termination({ tenureYears: 7, averageMonthly: 2000, reason: "reduction" });
  assert.equal(t.severance, 3400);
  assert.equal(t.noticeWeeks, 6);
  assert.equal(t.noticePay, 2800);
  const other = c.termination({ tenureYears: 7, averageMonthly: 2000, reason: "other" });
  assert.equal(other.severance, 0);
  assert.equal(c.minimumBenefit(1000, "three"), 3000);
});

test("resignation notice and probation (art. 69, 51)", () => {
  assert.equal(c.resignationDate("2026-03-10"), "2026-04-10");
  assert.equal(c.resignationDate("2026-01-31"), "2026-02-28");
  assert.equal(c.probationLimit(6).value, 2);
  assert.equal(c.probationLimit(12).unit, "ay");
  assert.equal(c.probationLimit(null).value, 3);
});

test("overtime, rest-day and night pay (art. 164-166)", () => {
  assert.deepEqual(c.hourlyRate(1600, 160), { hourly: 10, daily: 80 });
  assert.equal(c.overtimePay({ monthlySalary: 1600, normHours: 160, hours: 3 }).total, 60);
  assert.equal(c.restDayPay({ monthlySalary: 1600, normHours: 160, hours: 8, withinMonthlyNorm: true }).extra, 80);
  assert.equal(c.restDayPay({ monthlySalary: 1600, normHours: 160, hours: 8, withinMonthlyNorm: false }).extra, 160);
  assert.equal(c.nightPay({ monthlySalary: 1600, normHours: 160, nightHours: 10, supplementPercent: 20 }).extra, 20);
  assert.equal(c.overtimePay({ monthlySalary: 1600, normHours: 0, hours: 3 }).total, 0);
});

test("two thirds pay, proration and deductions (art. 167-176)", () => {
  assert.equal(c.twoThirdsPay(900, "downtime").amount, 600);
  assert.equal(c.proratedSalary(1000, 11, 22), 500);
  assert.equal(c.proratedSalary(1000, 30, 22), 1000);
  assert.equal(c.deductionLimit(1000, "general").maximum, 200);
  assert.equal(c.deductionLimit(1000, "writ").left, 500);
  assert.equal(c.deductionLimit(1000, "alimony").maximum, 700);
  assert.equal(c.deductionLimit(1000, "alimony", 25).maximum, 250);
  assert.equal(c.deductionLimit(1000, "alimony", 90).maximum, 700);
  assert.equal(c.deductionLimit(1000, "alimony", 90).capped, true);
  assert.equal(c.deductionLimit(1000, "general", 0).left, 1000);
  assert.equal(c.belowMinimumWage(400, 500), true);
});

test("Tax Code figures: VAT 18%, simplified 2%, entrepreneur 20%", () => {
  assert.deepEqual(c.vat(100, "add"), { net: 100, vat: 18, gross: 118, articles: ["173.1"], notes: [] });
  const out = c.vat(118, "extract");
  assert.equal(out.net, 100);
  assert.equal(out.vat, 18);
  assert.equal(c.simplifiedTax(10000).tax, 200);
  assert.equal(c.simplifiedTax(10000, 8).tax, 800);
  assert.equal(c.entrepreneurIncomeTax(1000).tax, 200);
});

import { calculateFromGross } from "../lib/salary.ts";
test("working days between dates use the production calendar", () => {
  const march = c.workingDaysBetween("2026-03-01", "2026-03-31");
  assert.equal(march.calendarDays, 31);
  // the official 2026 calendar has 17 working days in March (see calendar-az tests)
  assert.equal(march.workDays + march.weekendDays + march.holidayDays, 31);
  assert.equal(c.workingDaysBetween("2026-01-01", "2026-12-31").workDays, 241);
  assert.equal(c.workingDaysBetween("2026-02-01", "2026-01-01"), null);
});
test("maternity leave (art. 125)", () => {
  const normal = c.maternityLeave({ expectedBirth: "2026-06-10" });
  assert.equal(normal.totalDays, 126);
  assert.equal(normal.start, "2026-04-01");
  assert.equal(normal.end, "2026-08-04");
  assert.equal(c.maternityLeave({ expectedBirth: "2026-06-10", hardBirth: true }).totalDays, 140);
  assert.equal(c.maternityLeave({ expectedBirth: "2026-06-10", multiple: true, agriculture: true }).totalDays, 180);
  assert.equal(c.maternityLeave({ expectedBirth: "2026-06-10", actualBirth: "2026-06-15" }).totalDays, 131);
  assert.equal(c.maternityLeave({ expectedBirth: "x" }), null);
});
test("service length adds periods", () => {
  assert.equal(c.serviceLength([{ start: "2020-01-01", end: "2020-12-31" }]).years, 1);
  const two = c.serviceLength([{ start: "2020-01-01", end: "2020-06-30" }, { start: "2021-01-01", end: "2021-06-30" }]);
  assert.equal(two.years, 1);
  assert.equal(c.serviceLength([]).text, "0 gün");
});
test("final settlement taxes wages but not the severance", () => {
  const r = c.finalSettlement({
    monthlySalary: 1000, workedDays: 11, normDays: 22, unusedLeaveDays: 10, leaveDailyRate: 50,
    severance: 1400, sector: "private", calculate: (g, s) => calculateFromGross(g, s),
  });
  assert.equal(r.salaryForWorkedDays, 500);
  assert.equal(r.leaveCompensation, 500);
  assert.equal(r.taxable, 1000);
  assert.equal(r.toPay, Math.round((r.net + 1400) * 100) / 100);
  assert.ok(r.net < 1000 && r.net > 800);
});

test("a worker under 18 has the leave of article 119, a disabled one 42 days", () => {
  assert.equal(c.vacationEntitlement({ tenureYears: 6, age: 15 }).main, 42);
  assert.equal(c.vacationEntitlement({ tenureYears: 6, age: 17 }).main, 35);
  assert.equal(c.vacationEntitlement({ tenureYears: 6, age: 17, disabledMinor: true }).main, 42);
  const minor = c.vacationEntitlement({ tenureYears: 12, age: 17, childrenUnder14: 3, eligibleForChildLeave: true });
  assert.equal(minor.total, 35);
  assert.equal(minor.byTenure + minor.byChildren, 0);
  assert.equal(c.vacationEntitlement({ tenureYears: 6, age: 30 }).main, 21);
  assert.equal(c.vacationEntitlement({ tenureYears: 6, age: 30 }).byTenure, 2);
  assert.equal(c.vacationEntitlement({ tenureYears: 6, age: 17, harmfulConditionsDays: 6 }).total, 41);
});

import { insuranceBenefit } from "../lib/hr-calc.ts";
test("insurance benefit is a share of the 12-month average per calendar day", () => {
  const b = insuranceBenefit(Array(12).fill(912), 10, 100, "sick");
  assert.equal(b.averageMonthly, 912);
  assert.equal(b.dailyRate, 30);
  assert.equal(b.amount, 300);
  assert.equal(insuranceBenefit(Array(12).fill(912), 10, 60, "maternity").amount, 180);
});
