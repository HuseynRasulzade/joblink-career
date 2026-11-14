import test from "node:test";
import assert from "node:assert/strict";
import { daysOff, monthDays, setPlatformCalendar, knownReligiousYears } from "../lib/calendar-az.ts";

test.afterEach(() => setPlatformCalendar([]));

test("a religious holiday the admin enters for a new year is a holiday and follows the transfer rule", () => {
  // 2027-03-20 is a Saturday: the lost day moves to the next working day.
  setPlatformCalendar([{ day: "2027-09-04", kind: "holiday", label: "Test bayramı" }]); // Saturday
  const off = daysOff(2027);
  assert.equal(off.get("2027-09-04")?.kind, "holiday");
  assert.equal(off.get("2027-09-06")?.kind, "transfer");
  assert.ok(knownReligiousYears().includes(2027));
});

test("a working Saturday set by the admin is a working day", () => {
  setPlatformCalendar([{ day: "2027-02-06", kind: "work", label: "Köçürülmüş iş günü" }]);
  const day = monthDays(2027, 2).find((d) => d.date === "2027-02-06");
  assert.equal(day.off, "");
  assert.equal(day.label, "Köçürülmüş iş günü");
});

test("a cancelled holiday is not off and moves nothing", () => {
  setPlatformCalendar([{ day: "2027-05-28", kind: "work", label: "" }]);
  assert.equal(daysOff(2027).has("2027-05-28"), false);
});

test("a plain day off and a shortened day", () => {
  setPlatformCalendar([{ day: "2027-04-14", kind: "off", label: "Əlavə istirahət" }, { day: "2027-04-15", kind: "short", label: "" }]);
  const days = monthDays(2027, 4);
  assert.equal(days.find((d) => d.date === "2027-04-14").off, "holiday");
  const short = days.find((d) => d.date === "2027-04-15");
  assert.equal(short.off, "");
  assert.equal(short.short, true);
});

test("without admin changes nothing differs", () => {
  assert.equal(daysOff(2026).get("2026-03-20")?.label, "Novruz bayramı / Ramazan bayramı");
});
