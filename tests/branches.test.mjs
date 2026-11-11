import test from "node:test";
import assert from "node:assert/strict";
import { sharesOf, bonusesOf, limitReached, linkActiveIn, splitAmount, normalizeMode } from "../lib/branches.ts";

const link = (branchId, extra = {}) => ({ employeeId: "e1", branchId, role: "", sharePct: 0, bonusEligible: true, from: "", to: "", ...extra });

test("an employee in two branches: equal shares by default", () => {
  const s = sharesOf([link("A"), link("B")], "equal", () => 0);
  assert.equal(s.get("A"), 0.5);
  assert.equal(s.get("B"), 0.5);
  assert.equal(sharesOf([link("A")], "equal", () => 0).get("A"), 1);
});
test("by sales: the share follows the sales; no sales falls back to equal", () => {
  const sales = { A: 3000, B: 1000 };
  const s = sharesOf([link("A"), link("B")], "sales", (id) => sales[id]);
  assert.equal(s.get("A"), 0.75);
  assert.equal(s.get("B"), 0.25);
  assert.equal(sharesOf([link("A"), link("B")], "sales", () => 0).get("A"), 0.5);
});
test("percentages written by hand win over the mode and are normalised", () => {
  const s = sharesOf([link("A", { sharePct: 70 }), link("B", { sharePct: 30 })], "sales", () => 999);
  assert.equal(s.get("A"), 0.7);
  const half = sharesOf([link("A", { sharePct: 50 }), link("B", { sharePct: 25 })], "equal", () => 0);
  assert.ok(Math.abs(half.get("A") - 2 / 3) < 1e-9);
});
test("the limit is reached at or above the target, never without one", () => {
  assert.ok(limitReached({ target: 1000, sales: 1000 }));
  assert.ok(limitReached({ target: 1000, sales: 1500 }));
  assert.ok(!limitReached({ target: 1000, sales: 999.99 }));
  assert.ok(!limitReached({ target: 0, sales: 500 }));
  assert.ok(!limitReached(undefined));
});
test("a fixed bonus is paid in full for each branch that reached its limit; a percentage follows the pay share", () => {
  const names = { A: "A filialı", B: "B filialı" };
  const sales = [{ branchId: "A", month: "2026-11", target: 1000, sales: 1200 }, { branchId: "B", month: "2026-11", target: 500, sales: 400 }];
  const rules = [{ branchId: "A", kind: "fixed", value: 200, active: true }, { branchId: "B", kind: "fixed", value: 300, active: true }];
  const shares = sharesOf([link("A"), link("B")], "equal", () => 0);
  const out = bonusesOf({ links: [link("A"), link("B")], shares, grossSalary: 2000, rules, sales, nameOf: (id) => names[id] });
  assert.equal(out.length, 1);
  assert.equal(out[0].amount, 200);
  assert.match(out[0].label, /A filialı/);
  const pct = bonusesOf({ links: [link("A"), link("B")], shares, grossSalary: 2000, rules: [{ branchId: "A", kind: "salary_percent", value: 100, active: true }], sales, nameOf: (id) => names[id] });
  assert.equal(pct[0].amount, 1000);
});
test("no bonus for a rule that is off, a person who is not eligible, or a rule with no value", () => {
  const sales = [{ branchId: "A", month: "2026-11", target: 100, sales: 200 }];
  const base = { shares: new Map([["A", 1]]), grossSalary: 1000, sales, nameOf: () => "A" };
  assert.equal(bonusesOf({ ...base, links: [link("A")], rules: [{ branchId: "A", kind: "fixed", value: 50, active: false }] }).length, 0);
  assert.equal(bonusesOf({ ...base, links: [link("A", { bonusEligible: false })], rules: [{ branchId: "A", kind: "fixed", value: 50, active: true }] }).length, 0);
  assert.equal(bonusesOf({ ...base, links: [link("A")], rules: [{ branchId: "A", kind: "fixed", value: 0, active: true }] }).length, 0);
});
test("links outside the month do not count; an amount splits to the cent", () => {
  assert.ok(linkActiveIn({ from: "", to: "" }, "2026-11"));
  assert.ok(linkActiveIn({ from: "2026-11-15", to: "" }, "2026-11"));
  assert.ok(!linkActiveIn({ from: "2026-12-01", to: "" }, "2026-11"));
  assert.ok(!linkActiveIn({ from: "", to: "2026-10-31" }, "2026-11"));
  const parts = splitAmount(100, new Map([["A", 1 / 3], ["B", 1 / 3], ["C", 1 / 3]]));
  assert.equal([...parts.values()].reduce((t, v) => t + v, 0).toFixed(2), "100.00");
  assert.equal(normalizeMode("sales"), "sales");
  assert.equal(normalizeMode("x"), "equal");
});

import { assignPeople, summarize } from "../lib/staff-plan.ts";
test("a row of a branch takes only people who work in that branch; people with no branch fit any row", () => {
  const units = [
    { id: "a", branch: "A filialı", department: "Maliyyə", section: "", position: "Mühasib", planned: 1, rate: 1, salaryMin: 0, salaryMax: 0 },
    { id: "b", branch: "B filialı", department: "Maliyyə", section: "", position: "Mühasib", planned: 1, rate: 1, salaryMin: 0, salaryMax: 0 },
  ];
  const person = (id, branches) => ({ id, department: "Maliyyə", section: "", position: "Mühasib", status: "active", branches });
  const placed = assignPeople(units, [person("x", ["B filialı"]), person("y", ["A filialı"])]);
  assert.deepEqual(placed.byUnit.get("a").map((p) => p.id), ["y"]);
  assert.deepEqual(placed.byUnit.get("b").map((p) => p.id), ["x"]);
  const loose = assignPeople(units, [person("z", [])]);
  assert.equal(loose.unplaced.length, 0);
  const sum = summarize(units, [person("x", ["B filialı"])]);
  assert.deepEqual(sum.rows.map((r) => [r.id, r.filled]), [["a", 0], ["b", 1]]);
});
