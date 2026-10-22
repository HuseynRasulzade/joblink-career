// Workforce flow metrics.
import test from "node:test";
import assert from "node:assert/strict";
import { addDays, computeWorkforce, daysBetween, monthsOf, normalizeExit } from "../lib/workforce.ts";

const emp = (over) => ({ department: "Satış", startDate: "2024-01-01", endDate: "", status: "active", exitType: "", exitReason: "", source: "manual", ...over });

test("date helpers", () => {
  assert.equal(addDays("2025-03-01", -1), "2025-02-28");
  assert.equal(daysBetween("2025-01-01", "2025-01-31"), 30);
  assert.deepEqual(monthsOf("2025-11-15", "2026-02-10"), ["2025-11", "2025-12", "2026-01", "2026-02"]);
});

const people = [
  emp({ startDate: "2023-05-01" }),
  emp({ startDate: "2024-02-01", department: "Maliyyə" }),
  emp({ startDate: "2025-02-10", department: "Satış" }), // hired in the period
  emp({ startDate: "2025-03-01", department: "Satış", status: "left", endDate: "2025-04-15", exitType: "resignation", exitReason: "salary" }), // early exit
  emp({ startDate: "2022-01-01", status: "left", endDate: "2025-06-30", exitType: "dismissal", exitReason: "performance" }),
  emp({ startDate: "2020-01-01", department: "Maliyyə", status: "left", endDate: "2024-12-31", exitType: "resignation", exitReason: "career" }), // before the period
  emp({ startDate: "2025-07-01", status: "leave" }),
];
const vacancies = [
  { created: "2025-04-20T10:00:00Z", reason: "replacement-exit" },
  { created: "2025-05-01T10:00:00Z", reason: "new-position" },
  { created: "2024-11-01T10:00:00Z", reason: "new-position" },
];

test("headcount, hires, exits and turnover for a period", () => {
  const m = computeWorkforce(people, vacancies, "2025-01-01", "2025-12-31", { includeReasons: true });
  assert.equal(m.headcountStart, 3); // 2023, 2024 and the 2022 starter who leaves in June; the 2020 leaver went on 31 Dec
  assert.equal(m.hires, 3);
  assert.equal(m.exits, 2);
  assert.equal(m.headcountEnd, 3 + 3 - 2);
  assert.equal(m.net, m.headcountEnd - m.headcountStart);
  assert.equal(m.turnoverPercent, Math.round((2 / ((3 + 4) / 2)) * 1000) / 10);
  assert.equal(m.earlyExits, 1);
  assert.equal(m.earlyExitPercent, 50);
});

test("monthly series covers every month of the period", () => {
  const m = computeWorkforce(people, vacancies, "2025-01-01", "2025-12-31", { includeReasons: true });
  assert.equal(m.months.length, 12);
  const april = m.months.find((x) => x.month === "2025-04");
  assert.equal(april.exits, 1);
  assert.equal(m.months.reduce((n, x) => n + x.hires, 0), m.hires);
  assert.equal(m.months.reduce((n, x) => n + x.exits, 0), m.exits);
  assert.equal(m.months[11].headcount, m.headcountEnd);
});

test("exit reasons are hidden from viewers without permission", () => {
  const hidden = computeWorkforce(people, vacancies, "2025-01-01", "2025-12-31", { includeReasons: false });
  assert.equal(hidden.exitReasons, null);
  assert.ok(hidden.exitTypes.length > 0);
  assert.ok(!JSON.stringify(hidden.insights).includes("səbəbi: "));
  const shown = computeWorkforce(people, vacancies, "2025-01-01", "2025-12-31", { includeReasons: true });
  assert.deepEqual(shown.exitReasons.map((r) => r.id).sort(), ["performance", "salary"]);
});

test("vacancies opened for a departure are counted per period", () => {
  const m = computeWorkforce(people, vacancies, "2025-01-01", "2025-12-31", { includeReasons: true });
  assert.equal(m.replacementOpened, 1);
  assert.equal(m.vacancyReasons.find((r) => r.reason === "new-position").count, 1);
});

test("departments split headcount, hires and exits", () => {
  const m = computeWorkforce(people, vacancies, "2025-01-01", "2025-12-31", { includeReasons: false });
  const sales = m.departments.find((d) => d.name === "Satış");
  assert.equal(sales.exits, 2);
  assert.ok(m.departments.find((d) => d.name === "Maliyyə"));
});

test("an empty company and a period without staff do not divide by zero", () => {
  const m = computeWorkforce([], [], "2025-01-01", "2025-12-31", { includeReasons: true });
  assert.equal(m.turnoverPercent, null);
  assert.equal(m.hires, 0);
  assert.equal(m.months.length, 12);
});

test("leaving requires a type and a reason and a sensible date", () => {
  assert.equal(normalizeExit({ status: "active", endDate: "2025-01-01", exitType: "x", exitReason: "y", exitNote: "" }, "2024-01-01", "2025-06-01").exitType, "");
  assert.match(normalizeExit({ status: "left", endDate: "", exitType: "", exitReason: "salary", exitNote: "" }, "", "2025-06-01").error, /növünü/);
  assert.match(normalizeExit({ status: "left", endDate: "", exitType: "resignation", exitReason: "", exitNote: "" }, "", "2025-06-01").error, /səbəbini/);
  assert.match(normalizeExit({ status: "left", endDate: "2023-01-01", exitType: "resignation", exitReason: "salary", exitNote: "" }, "2024-01-01", "2025-06-01").error, /əvvəl/);
  const ok = normalizeExit({ status: "left", endDate: "", exitType: "resignation", exitReason: "salary", exitNote: " qeyd " }, "2024-01-01", "2025-06-01");
  assert.equal(ok.error, "");
  assert.equal(ok.endDate, "2025-06-01");
  assert.equal(ok.exitNote, "qeyd");
});
