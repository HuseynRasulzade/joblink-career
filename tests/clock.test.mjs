import test from "node:test";
import assert from "node:assert/strict";
import { hoursFromClock, lateMinutes, earlyLeaveMinutes, bakuNow, DEFAULT_CLOCK } from "../lib/clock.ts";

test("hours with a break and night hours", () => {
  assert.deepEqual(hoursFromClock("09:00", "18:00", 60), { hours: 8, night: 0 });
  assert.deepEqual(hoursFromClock("09:00", "13:00", 60), { hours: 4, night: 0 });
  assert.deepEqual(hoursFromClock("22:00", "06:00", 0), { hours: 8, night: 8 });
  assert.deepEqual(hoursFromClock("14:00", "23:30", 60), { hours: 8.5, night: 1.5 });
  assert.equal(hoursFromClock("xx", "18:00"), null);
});
test("lateness uses the grace period", () => {
  assert.equal(lateMinutes("09:08", DEFAULT_CLOCK), 0);
  assert.equal(lateMinutes("09:25", DEFAULT_CLOCK), 25);
  assert.equal(earlyLeaveMinutes("17:00", DEFAULT_CLOCK), 60);
  assert.equal(earlyLeaveMinutes("17:55", DEFAULT_CLOCK), 0);
});
test("Baku time", () => {
  assert.deepEqual(bakuNow(new Date("2026-03-01T21:30:00Z")), { date: "2026-03-02", time: "01:30" });
});
