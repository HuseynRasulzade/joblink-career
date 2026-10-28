import test from "node:test";
import assert from "node:assert/strict";
import { daysOff, monthDays, summarize, ATTENDANCE_CODES } from "../lib/calendar-az.ts";

const offIn = (year, prefix) => [...daysOff(year).keys()].filter((d) => d.startsWith(prefix)).map((d) => d.slice(5)).sort();

test("March 2026: Women's Day on a Sunday moves to 9 March; Novruz and Ramazan move four days to 25, 26, 27 and 30 March", () => {
  assert.deepEqual(offIn(2026, "2026-03"), ["03-08", "03-09", "03-20", "03-21", "03-22", "03-23", "03-24", "03-25", "03-26", "03-27", "03-30"]);
});

test("May 2026: Victory Day on a Saturday moves to 11 May; Qurban and Independence Day overlap, so 29 May is off", () => {
  assert.deepEqual(offIn(2026, "2026-05"), ["05-09", "05-11", "05-27", "05-28", "05-29"]);
  assert.equal(daysOff(2026).get("2026-05-28")?.label, "Müstəqillik günü / Qurban bayramı");
});

test("a holiday on a weekday takes nothing with it; a year without a religious decree has the fixed holidays", () => {
  assert.deepEqual(offIn(2026, "2026-01"), ["01-01", "01-02", "01-20"]);
  assert.ok(daysOff(2031).has("2031-03-20"));
});

test("a month shows weekends, holidays and the company's own days", () => {
  const days = monthDays(2026, 5, [{ day: "2026-05-04", kind: "off", label: "Korporativ gün" }, { day: "2026-05-30", kind: "work", label: "" }]);
  const byDate = Object.fromEntries(days.map((d) => [d.date, d.off]));
  assert.equal(days.length, 31);
  assert.equal(byDate["2026-05-02"], "weekend");
  assert.equal(byDate["2026-05-11"], "transfer");
  assert.equal(byDate["2026-05-28"], "holiday");
  assert.equal(byDate["2026-05-04"], "company");
  assert.equal(byDate["2026-05-30"], "");
});

test("summary: norm, days worked and leave by code, only for the days employed", () => {
  const days = monthDays(2026, 6);
  const marks = { "2026-06-01": "sick", "2026-06-02": "sick", "2026-06-03": "annual", "2026-06-06": "annual", "2026-06-10": "absent", "2026-06-13": "trip" };
  const full = summarize(days, marks, { start: "2020-01-01", end: "" });
  // June 2026: 22 weekdays, 15 June (Monday) and 26 June (Friday) are holidays -> norm 20
  assert.equal(full.norm, 20);
  assert.equal(full.byCode.sick, 2);
  assert.equal(full.byCode.annual, 2);
  // worked = 21 - sick(2) - annual on a working day(1) - absent(1) + trip on a Saturday(1)
  assert.equal(full.worked, 20 - 2 - 1 - 1 + 1);
  const joined = summarize(days, {}, { start: "2026-06-16", end: "" });
  assert.equal(joined.norm, 10);
  assert.ok(ATTENDANCE_CODES.some((c) => c.id === "paternity") && ATTENDANCE_CODES.some((c) => c.id === "maternity"));
});
