import test from "node:test";
import assert from "node:assert/strict";
import { chooseHours, dailyNorm, parseHoursRows, parseHoursTotals, summarizeHours } from "../lib/hours.ts";
import { matchEmployee, parseAttendanceRows, parsePayrollRows } from "../lib/sheet-imports.ts";

const days = [
  { date: "2026-03-02", off: "", short: false },
  { date: "2026-03-03", off: "", short: true },
  { date: "2026-03-07", off: "weekend", short: false },
  { date: "2026-03-08", off: "holiday", short: false },
];
test("extra, rest-day and night hours are told apart", () => {
  const hours = new Map([
    ["2026-03-02", { hours: 10, night: 2 }],
    ["2026-03-03", { hours: 7, night: 0 }],
    ["2026-03-07", { hours: 5, night: 1 }],
  ]);
  const s = summarizeHours(days, hours, 40);
  assert.deepEqual(s, { days: 3, worked: 22, overtime: 2, restDay: 5, night: 3 });
});
test("a shorter week and the eve of a holiday lower the norm", () => {
  assert.equal(dailyNorm(40, false), 8);
  assert.equal(dailyNorm(40, true), 7);
  assert.equal(dailyNorm(36, false), 7.2);
});
test("hours rows are read and bad ones reported", () => {
  const r = parseHoursRows([
    ["Ad Soyad", "Tarix", "Saat", "Gecə saatı"],
    ["Aysel", "2026-03-02", "9,5", "1"],
    ["Orxan", "02.03.2026", "30", ""],
    ["Nigar", "bilinməz", "8", ""],
  ]);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].hours, 9.5);
  assert.equal(r.issues.length, 2);
});

test("month totals are read, with the FİN code and a default month", () => {
  const r = parseHoursTotals([
    ["FİN", "Ay", "Artıq iş saatı", "İstirahət günü saatı", "Gecə saatı"],
    ["5abc123", "2026-03", "6,5", "", ""],
    ["6XYZ789", "03.2026", "", "8", "12"],
    ["7QQQ111", "2026-13", "1", "", ""],
    ["8WWW222", "2026-03", "500", "", ""],
  ]);
  assert.equal(r.rows.length, 2);
  assert.deepEqual([r.rows[0].fin, r.rows[0].month, r.rows[0].overtime], ["5ABC123", "2026-03", 6.5]);
  assert.deepEqual([r.rows[1].month, r.rows[1].restDay, r.rows[1].night], ["2026-03", 8, 12]);
  assert.equal(r.issues.length, 2);
  const d = parseHoursTotals([["Ad Soyad", "Artıq iş saatı"], ["Aysel", "3"]], "2026-04");
  assert.equal(d.rows[0].month, "2026-04");
});

test("daily entries win over the month total; they are never added", () => {
  const base = { days, weekHours: 40, needsApproval: false, approvedDays: new Set(), totalCoveredByOrder: false };
  const daily = new Map([["2026-03-02", { hours: 10, night: 0 }]]);
  const total = { overtime: 20, restDay: 4, night: 2, status: "" };
  const both = chooseHours({ ...base, daily, total });
  assert.equal(both.source, "daily");
  assert.equal(both.summary.overtime, 2);
  const only = chooseHours({ ...base, total });
  assert.deepEqual([only.source, only.summary.overtime, only.summary.restDay, only.summary.night], ["month", 20, 4, 2]);
  assert.equal(chooseHours({ ...base }).source, "none");
});

test("with the approval rule extra hours wait for an order or an approval", () => {
  const base = { days, weekHours: 40, needsApproval: true, totalCoveredByOrder: false };
  const daily = new Map([["2026-03-02", { hours: 10, night: 0 }], ["2026-03-07", { hours: 5, night: 0 }]]);
  const waiting = chooseHours({ ...base, daily, approvedDays: new Set() });
  assert.deepEqual([waiting.summary.overtime, waiting.summary.restDay, waiting.waiting], [0, 0, 7]);
  const ordered = chooseHours({ ...base, daily, approvedDays: new Set(["2026-03-02"]) });
  assert.deepEqual([ordered.summary.overtime, ordered.summary.restDay], [2, 0]);
  const total = { overtime: 10, restDay: 0, night: 3, status: "" };
  assert.equal(chooseHours({ ...base, total, approvedDays: new Set() }).summary.overtime, 0);
  assert.equal(chooseHours({ ...base, total, approvedDays: new Set() }).summary.night, 3);
  assert.equal(chooseHours({ ...base, total: { ...total, status: "approved" }, approvedDays: new Set() }).summary.overtime, 10);
  assert.equal(chooseHours({ ...base, total, approvedDays: new Set(), totalCoveredByOrder: true }).summary.overtime, 10);
});

test("the FİN code tells two employees with one name apart", () => {
  const list = [
    { id: "a", name: "Elnur Əliyev", email: "", fin: "5ABC123" },
    { id: "b", name: "Elnur Əliyev", email: "", fin: "6XYZ789" },
  ];
  assert.deepEqual(matchEmployee(list, { name: "Elnur Əliyev", email: "", fin: "6xyz 789" }), { id: "b" });
  assert.ok("error" in matchEmployee(list, { name: "Elnur Əliyev", email: "" }));
  assert.ok("error" in matchEmployee(list, { name: "Elnur Əliyev", email: "", fin: "9ZZZ000" }));
  // a sheet may carry the FİN alone
  const a = parseAttendanceRows([["FİN", "Başlama tarixi", "Səbəb"], ["5ABC123", "2026-03-02", "Xəstəlik"]]);
  assert.equal(a.rows.length, 1);
  assert.equal(a.rows[0].fin, "5ABC123");
  const p = parsePayrollRows([["FİN", "Mükafat"], ["6XYZ789", "100"]]);
  assert.equal(p.rows[0].fin, "6XYZ789");
});
