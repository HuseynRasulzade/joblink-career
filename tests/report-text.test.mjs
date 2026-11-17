import test from "node:test";
import assert from "node:assert/strict";
import { nextRunAfter, planReportText } from "../lib/report-text.ts";

test("nextRunAfter: weekly goes to the next Monday, monthly to the first of next month", () => {
  assert.equal(nextRunAfter("weekly", new Date("2026-11-17T10:00:00Z")), "2026-11-23"); // Tuesday -> Monday
  assert.equal(nextRunAfter("weekly", new Date("2026-11-23T10:00:00Z")), "2026-11-30"); // Monday -> next Monday
  assert.equal(nextRunAfter("monthly", new Date("2026-11-17T10:00:00Z")), "2026-12-01");
  assert.equal(nextRunAfter("monthly", new Date("2026-12-31T10:00:00Z")), "2027-01-01");
});
test("planReportText lists departments, totals and the cost line", () => {
  const r = planReportText("Demo", [{ department: "Maliyyə", planned: 5, filled: 3, free: 2 }, { department: "Satış", planned: 2, filled: 4, free: -2 }], { planned: 7, filled: 7, costMax: 12000, factCost: 11000 }, "2026-11-23");
  assert.match(r.subject, /Demo/);
  assert.match(r.text, /Maliyyə\s+5\s+3\s+2/);
  assert.match(r.text, /\+2 artıq/);
  assert.match(r.text, /Cəmi: plan 7, faktiki 7, boş 0/);
  assert.match(r.text, /12\D?000 AZN/);
});
