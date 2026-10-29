import test from "node:test";
import assert from "node:assert/strict";
import { dueReminders } from "../lib/payroll-reminders.ts";

const base = { advanceDay: 15, payDay: 28, currentApproved: false, previousApproved: true, hasPrevious: true };
test("the day before the advance day", () => {
  const r = dueReminders({ ...base, today: "2026-04-14" });
  assert.deepEqual(r.map((x) => x.key), ["2026-04-advance"]);
});
test("a month not approved close to the pay day", () => {
  const r = dueReminders({ ...base, today: "2026-04-26" });
  assert.deepEqual(r.map((x) => x.key), ["2026-04-approve"]);
  assert.deepEqual(dueReminders({ ...base, today: "2026-04-26", currentApproved: true }), []);
});
test("a past month never approved", () => {
  const r = dueReminders({ ...base, today: "2026-04-05", previousApproved: false });
  assert.deepEqual(r.map((x) => x.key), ["2026-03-late"]);
  assert.deepEqual(dueReminders({ ...base, today: "2026-04-02", previousApproved: false }), []);
});
