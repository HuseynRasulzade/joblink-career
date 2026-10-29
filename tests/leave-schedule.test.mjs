import test from "node:test";
import assert from "node:assert/strict";
import { monthlyLoad, planLeave, scheduleWarnings } from "../lib/leave-schedule.ts";

const people = [
  { id: "a", name: "A", department: "Satış" },
  { id: "b", name: "B", department: "Satış" },
  { id: "c", name: "C", department: "Satış" },
  { id: "d", name: "D", department: "Maliyyə" },
];
test("a leave over a holiday ends later", () => {
  const plain = planLeave("2026-06-01", 10);
  const withHoliday = planLeave("2026-05-20", 10);
  assert.equal(plain.days, 10);
  assert.ok(withHoliday.holidays.length >= 1);
  assert.ok(withHoliday.calendarDays > withHoliday.days);
});
test("too many of a department away, own overlap and balance are warned", () => {
  const others = [{ id: "1", employeeId: "b", start: "2026-07-01", end: "2026-07-14", days: 14, status: "approved" }];
  const w = scheduleWarnings({ employeeId: "a", start: "2026-07-05", end: "2026-07-18", days: 14 }, others, people, { remaining: 10 });
  assert.ok(w.some((x) => /eyni vaxtda 2 nəfər/.test(x)));
  assert.ok(w.some((x) => /qalan məzuniyyətdən/.test(x)));
  const own = scheduleWarnings({ employeeId: "b", start: "2026-07-05", end: "2026-07-08", days: 4 }, others, people, { remaining: 30 });
  assert.ok(own.some((x) => /başqa məzuniyyəti/.test(x)));
  assert.deepEqual(scheduleWarnings({ employeeId: "d", start: "2026-07-05", end: "2026-07-08", days: 4 }, others, people, { remaining: 30 }), []);
});
test("monthly load counts people per department", () => {
  const load = monthlyLoad([{ id: "1", employeeId: "a", start: "2026-07-20", end: "2026-08-03", days: 15, status: "approved" }], people, 2026);
  const sales = load.find((l) => l.department === "Satış");
  assert.equal(sales.months[6], 1);
  assert.equal(sales.months[7], 1);
  assert.equal(sales.months[5], 0);
});
