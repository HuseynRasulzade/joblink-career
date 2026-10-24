import test from "node:test";
import assert from "node:assert/strict";
import { salaryInsight } from "../lib/salary-view.ts";

test("a gross vacancy shows the net pay and compares on net", () => {
  const r = salaryInsight({ minSalary: 1500, maxSalary: 2000, salaryKind: "gross" }, { salary: 1200, salaryKind: "net" });
  assert.match(r.lines[0], /net/);
  assert.equal(r.verdict, "meets");
  const low = salaryInsight({ minSalary: 1500, maxSalary: 2000, salaryKind: "gross" }, { salary: 2500, salaryKind: "net" });
  assert.equal(low.verdict, "below");
});

test("without gross/net the comparison says it is unclear instead of guessing", () => {
  const r = salaryInsight({ minSalary: 1500, maxSalary: 1500 }, { salary: 1500, salaryKind: "net" });
  assert.match(r.lines[0], /göstərilməyib/);
  assert.equal(r.verdict, "unclear");
});

test("no salary or no wish gives no verdict", () => {
  assert.deepEqual(salaryInsight({ minSalary: 0, maxSalary: 0 }), { lines: [], verdict: null });
  assert.equal(salaryInsight({ minSalary: 1000, maxSalary: 1200, salaryKind: "net" }, { salary: 0 }).verdict, null);
});
