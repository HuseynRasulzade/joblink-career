import test from "node:test";
import assert from "node:assert/strict";
import { employeePay, tenure, vacationBalance, staffFill, freeStaffPlaces } from "../lib/payroll.ts";

test("pay: net and gross give the same figures, super-gross is what the employer pays in all", () => {
  const fromGross = employeePay(2000, "gross");
  const fromNet = employeePay(fromGross.net, "net");
  assert.ok(Math.abs(fromNet.gross - 2000) < 0.05);
  assert.ok(fromGross.superGross > fromGross.gross);
  assert.equal(fromGross.superGross, fromGross.gross + fromGross.employerTotalContributions);
  assert.ok(fromGross.incomeTax > 0 && fromGross.employeeSocial > 0 && fromGross.employeeUnemployment > 0 && fromGross.employeeMedical > 0);
});

test("tenure counts whole months and stops at the end date", () => {
  assert.equal(tenure("2024-01-15", "", "2026-04-14")?.text, "2 il 2 ay");
  assert.equal(tenure("2026-04-01", "", "2026-04-10")?.text, "9 gün");
  assert.equal(tenure("2020-01-01", "2021-01-01", "2026-01-01")?.text, "1 il");
  assert.equal(tenure("", "", "2026-01-01"), null);
});

test("leave is earned a twelfth per month; leave taken lowers the balance", () => {
  const balance = vacationBalance({ start: "2025-01-01", end: "", entitlement: 24, used: 10 }, "2026-01-01");
  assert.equal(balance.accrued, 24);
  assert.equal(balance.remaining, 14);
  assert.equal(vacationBalance({ start: "2026-01-01", end: "", entitlement: 24, used: 8 }, "2026-04-01").remaining, -2);
});

test("staff: free places = planned - working people - open vacancies", () => {
  const units = [
    { id: "1", department: "Maliyyə", section: "Mühasibat", position: "Mühasib", planned: 3 },
    { id: "2", department: "Maliyyə", section: "Büdcə", position: "Analitik", planned: 2 },
  ];
  const people = [
    { department: "Maliyyə", section: "Mühasibat", position: "Mühasib", status: "active" },
    { department: "maliyyə", section: "", position: "", status: "leave" },
    { department: "Maliyyə", section: "", position: "", status: "left" },
  ];
  assert.equal(staffFill(units[0], people), 2);
  assert.deepEqual(freeStaffPlaces(units, people, 1, "Maliyyə"), { planned: 5, filled: 2, openVacancies: 1, free: 2 });
  assert.equal(freeStaffPlaces(units, people, 0, "IT"), null);
});
