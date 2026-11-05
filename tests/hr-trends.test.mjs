import test from "node:test";
import assert from "node:assert/strict";
import { forecast, linearTargets, monthSeries, planFactAlerts, targetAlerts } from "../lib/hr-trends.ts";

const people = [
  { startDate: "2025-01-10", endDate: "", status: "active" },
  { startDate: "2025-06-01", endDate: "", status: "active" },
  { startDate: "2025-08-15", endDate: "2025-10-20", status: "left" },
  { startDate: "2025-10-05", endDate: "", status: "active" },
];

test("the series counts who was there at each month end, who joined and who left", () => {
  const s = monthSeries(people, "2025-10", 4);
  assert.deepEqual(s.map((p) => p.month), ["2025-07", "2025-08", "2025-09", "2025-10"]);
  assert.deepEqual(s.map((p) => p.headcount), [2, 3, 3, 3]);
  assert.deepEqual(s.map((p) => p.joined), [0, 1, 0, 1]);
  assert.deepEqual(s.map((p) => p.left), [0, 0, 0, 1]);
  assert.equal(s[3].turnover, 28.6);
});

test("the forecast carries the average net change forward and never goes below zero", () => {
  const s = monthSeries(people, "2025-10", 4);
  const f = forecast(s, 2, 4);
  assert.deepEqual(f.map((p) => p.month), ["2025-11", "2025-12"]);
  assert.equal(f[0].headcount, 3.3);
  assert.deepEqual(forecast([{ month: "2025-01", headcount: 1, joined: 0, left: 5, turnover: 0 }], 2, 1).map((p) => p.headcount), [0, 0]);
  assert.deepEqual(forecast([]), []);
});

test("plan against fact warns about people over the plan and about many free places", () => {
  const a = planFactAlerts([
    { department: "Satış", planned: 4, filled: 6, unplaced: 0 },
    { department: "IT", planned: 8, filled: 4, unplaced: 1 },
    { department: "HR", planned: 4, filled: 4, unplaced: 0 },
  ]);
  assert.equal(a.length, 3);
  assert.equal(a[0].level, "red");
  assert.equal(a[a.length - 1].level, "amber");
  assert.match(a[0].text, /artıqdır/);
});

test("a plan spread in a straight line reaches the year-end figure", () => {
  const t = linearTargets(40, 52, "2026-11", "2027-02");
  assert.deepEqual(t.map((x) => [x.month, x.target]), [["2026-11", 40], ["2026-12", 44], ["2027-01", 48], ["2027-02", 52]]);
  assert.deepEqual(linearTargets(10, 20, "2026-11", "2026-11"), [{ month: "2026-11", target: 10 }]);
  assert.deepEqual(linearTargets(10, 20, "2026-12", "2026-11"), []);
});

test("months far from the plan are reported, small differences are not", () => {
  const series = [{ month: "2026-09", headcount: 40, joined: 0, left: 0, turnover: 0 }, { month: "2026-10", headcount: 36, joined: 0, left: 0, turnover: 0 }, { month: "2026-11", headcount: 47, joined: 0, left: 0, turnover: 0 }];
  const a = targetAlerts(series, { "2026-09": 41, "2026-10": 40, "2026-11": 42 });
  assert.deepEqual(a.map((x) => x.level), ["amber", "red"]);
  assert.match(a[0].text, /4 nəfər azdır/);
  assert.match(a[1].text, /5 nəfər artıqdır/);
  assert.deepEqual(targetAlerts(series, {}), []);
});
