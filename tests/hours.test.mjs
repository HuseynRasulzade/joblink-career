import test from "node:test";
import assert from "node:assert/strict";
import { dailyNorm, parseHoursRows, summarizeHours } from "../lib/hours.ts";

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
