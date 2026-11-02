import test from "node:test";
import assert from "node:assert/strict";
import { checkCoverage, checkShifts, patternDays, shiftLength } from "../lib/shift-rules.ts";

const day = { start: "09:00", end: "18:00" };
const night = { start: "22:00", end: "06:00" };
const names = new Map([["a", "Aysel"]]);
const run = (assign, away = new Map()) => checkShifts({ assignments: new Map([["a", new Map(assign)]]), away: new Map([["a", away]]), names, minRestHours: 11, maxConsecutive: 6 });

test("a shift on a day of leave is flagged", () => {
  const w = run([["2026-03-02", day]], new Map([["2026-03-02", "annual"]]));
  assert.equal(w.length, 1);
  assert.equal(w[0].kind, "away");
});
test("too short a rest between two shifts is flagged", () => {
  assert.equal(run([["2026-03-02", day], ["2026-03-03", day]]).length, 0);
  const w = run([["2026-03-02", night], ["2026-03-03", day]]);
  assert.deepEqual(w.map((x) => x.kind), ["rest"]); // night shift ends 06:00, the next starts 09:00: 3 hours
  assert.equal(run([["2026-03-02", day], ["2026-03-03", { start: "04:00", end: "12:00" }]]).length, 1);
});
test("seven days in a row are flagged once", () => {
  const days = Array.from({ length: 8 }, (_, i) => [`2026-03-0${i + 1}`, day]);
  const w = run(days);
  assert.deepEqual(w.map((x) => x.kind), ["streak"]);
  assert.equal(run(days.slice(0, 6)).length, 0);
});
test("a pattern lays work and rest days", () => {
  assert.deepEqual(patternDays("2026-03-01", "2026-03-08", 2, 2), ["2026-03-01", "2026-03-02", "2026-03-05", "2026-03-06"]);
  assert.deepEqual(patternDays("2026-03-01", "2026-03-04", 1, 1, 1), ["2026-03-02", "2026-03-04"]);
});

test("a department below its minimum on a planned day is flagged", () => {
  const staff = [{ id: "a", department: "Ops" }, { id: "b", department: "Ops" }, { id: "c", department: "Ops" }];
  const assigned = new Map([["a", new Set(["2026-03-02", "2026-03-03"])], ["b", new Set(["2026-03-02"])]]);
  const away = new Map([["b", new Map([["2026-03-02", "sick"]])]]);
  const w = checkCoverage({ days: ["2026-03-02", "2026-03-03", "2026-03-04"], staff, assigned, away, minByDepartment: new Map([["Ops", 2]]) });
  assert.deepEqual(w.map((x) => x.day), ["2026-03-02", "2026-03-03"]); // 03-04 has no shift planned at all
});
test("shift length passes midnight", () => {
  assert.equal(shiftLength("09:00", "18:00"), 9);
  assert.equal(shiftLength("22:00", "06:00"), 8);
});
