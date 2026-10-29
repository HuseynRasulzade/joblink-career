import test from "node:test";
import assert from "node:assert/strict";
import { daysOff, monthDays, summarize, ATTENDANCE_CODES, yearCalendar } from "../lib/calendar-az.ts";

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

test("production calendar: days, hours and the year's total", async () => {
  const { yearCalendar, HOURS_PER_DAY } = await import("../lib/calendar-az.ts");
  const year = yearCalendar(2026);
  assert.equal(year.length, 12);
  const march = year[2];
  // March 2026: 31 days, 22 weekdays, 8 of them holidays -> 14 working days
  assert.equal(march.calendarDays, 31);
  assert.equal(march.workDays, 14);
  assert.equal(march.holidayDays, 8);
  assert.equal(march.restDays, 9);
  // 19 March is the eve of the 20 March holiday: shortened by an hour, paid in full
  assert.equal(march.shortDays, 1);
  assert.equal(march.hours, 14 * HOURS_PER_DAY - 1);
  assert.equal(march.paidHours, 14 * HOURS_PER_DAY);
  assert.equal(year.reduce((sum, m) => sum + m.calendarDays, 0), 365);
  assert.ok(year.every((m) => m.workDays + m.restDays + m.holidayDays === m.calendarDays));
  const withOwn = yearCalendar(2026, [{ day: "2026-03-14", kind: "work", label: "" }]);
  assert.equal(withOwn[2].workDays, 15);
});

test("the eve of a holiday is a shortened day (7 hours at work, 8 paid), also before a holiday on a weekend", () => {
  const short = (year, month) => monthDays(year, month).filter((d) => d.short).map((d) => d.date.slice(5));
  assert.deepEqual(short(2026, 1), ["01-19"]);
  assert.deepEqual(short(2026, 3), ["03-19"]);
  assert.deepEqual(short(2026, 12), ["12-30"]);
  // 8 May is the Friday before the Saturday holiday of 9 May; 26 May is the eve of 27 May
  assert.deepEqual(short(2026, 5), ["05-08", "05-26"]);
  assert.deepEqual(short(2026, 6), ["06-25"]);
  const days = monthDays(2026, 3, [{ day: "2026-03-18", kind: "short", label: "" }, { day: "2026-03-19", kind: "work", label: "" }]);
  assert.equal(days.find((d) => d.date === "2026-03-18").short, true);
  assert.equal(days.find((d) => d.date === "2026-03-19").short, false);
});

test("attendance hours: a shortened day is worked 7 hours and paid 8", () => {
  const days = monthDays(2026, 3);
  const summary = summarize(days, {}, { start: "2020-01-01", end: "" });
  assert.equal(summary.worked, 14);
  assert.equal(summary.hours, 14 * 8 - 1);
  assert.equal(summary.paidHours, 14 * 8);
  assert.equal(summary.shortDays, 1);
});

// The official 2026 production calendar (Ministry of Labour and Social Protection of Population):
// working hours by month, 1922 hours in the year, 241 working days.
test("2026 matches the official production calendar month by month", () => {
  const official = [
    [19, 151],
    [20, 160],
    [14, 111],
    [22, 176],
    [17, 134],
    [20, 159],
    [23, 184],
    [21, 168],
    [22, 176],
    [22, 176],
    [19, 152],
    [22, 175],
  ];
  const year = yearCalendar(2026);
  assert.deepEqual(year.map((m) => [m.workDays, m.hours]), official);
  assert.equal(year.reduce((sum, m) => sum + m.hours, 0), 1922);
  assert.equal(year.reduce((sum, m) => sum + m.workDays, 0), 241);
  // there is no day off in October
  assert.deepEqual(offIn(2026, "2026-10"), []);
});

test("every attendance code has a short mark, a group and is listed once", () => {
  const marks = ATTENDANCE_CODES.map((c) => c.short);
  assert.equal(new Set(marks).size, marks.length);
  assert.equal(new Set(ATTENDANCE_CODES.map((c) => c.id)).size, ATTENDANCE_CODES.length);
  assert.ok(ATTENDANCE_CODES.length >= 20);
  assert.ok(ATTENDANCE_CODES.every((c) => c.group && c.label));
});

import { weeklyHours } from "../lib/employee-rights.ts";
import { EMPTY_PROFILE } from "../lib/employee-profile.ts";
test("a 36-hour week: shorter day, no extra shortening before holidays, paid as a full day", () => {
  const days = monthDays(2026, 3);
  const none = {};
  const normal = summarize(days, none, { start: "", end: "" });
  const reduced = summarize(days, none, { start: "", end: "" }, 36);
  assert.equal(normal.norm, 14);
  assert.equal(reduced.norm, 14);
  assert.equal(reduced.worked, 14);
  assert.equal(reduced.hours, 100.8); // 14 days x 7.2
  assert.equal(reduced.paidHours, 14 * 8);
  assert.equal(reduced.shortDays, 0);
  assert.equal(reduced.weekHours, 36);
  assert.equal(normal.weekHours, 40);
  assert.ok(normal.shortDays > 0, "an ordinary worker still has the shortened eve of holidays");
  assert.equal(summarize(days, none, { start: "", end: "" }, 24).hours, 67.2); // 14 x 4.8
  // leave days are not worked hours
  const leave = { "2026-03-02": "annual", "2026-03-03": "annual" };
  assert.equal(summarize(days, leave, { start: "", end: "" }, 36).hours, 12 * 7.2 + 0);
});
test("who has a shorter week", () => {
  assert.deepEqual(weeklyHours({ ...EMPTY_PROFILE, disability: "p61_80" }, "2026-06-01").hours, 36);
  assert.equal(weeklyHours({ ...EMPTY_PROFILE, disability: "p81_100" }, "2026-06-01").hours, 36);
  assert.equal(weeklyHours({ ...EMPTY_PROFILE, disability: "under61" }, "2026-06-01").hours, 40);
  assert.equal(weeklyHours({ ...EMPTY_PROFILE }, "2026-06-01").hours, 40);
  assert.equal(weeklyHours({ ...EMPTY_PROFILE, birthDate: "2009-05-01" }, "2026-06-01").hours, 36);
  assert.equal(weeklyHours({ ...EMPTY_PROFILE, birthDate: "2012-05-01" }, "2026-06-01").hours, 24);
  assert.match(weeklyHours({ ...EMPTY_PROFILE, disability: "p61_80" }, "2026-06-01").reason, /91\.2/);
});
