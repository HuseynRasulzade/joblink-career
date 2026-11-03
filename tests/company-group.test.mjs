import test from "node:test";
import assert from "node:assert/strict";
import { groupTotals, snapshotTotals, turnoverPercent } from "../lib/company-group.ts";

const m = (over) => ({ companyId: "a", name: "A", isHead: false, headcount: 10, onLeave: 1, joiners12: 2, leavers12: 1, pendingOrders: 0, openJobs: 0, departments: { Satış: 6, Maliyyə: 4 }, pay: null, paySharing: false, ...over });

test("group totals add the companies and merge departments by name", () => {
  const t = groupTotals([m({}), m({ companyId: "b", name: "B", headcount: 5, departments: { Satış: 5 }, pay: { month: "2026-10", gross: 5000, net: 4000, cost: 6000 } })]);
  assert.equal(t.headcount, 15);
  assert.deepEqual(t.departments[0], { name: "Satış", count: 11 });
  assert.deepEqual(t.pay, { gross: 5000, net: 4000, cost: 6000, companies: 1, of: 2 });
});

test("turnover is leavers against everyone who worked in the year", () => {
  assert.equal(turnoverPercent(90, 10), 10);
  assert.equal(turnoverPercent(0, 0), 0);
});

test("a month's snapshot gives the totals, a broken one gives nothing", () => {
  const snap = JSON.stringify({ rows: [{ result: { gross: 1000, net: 800, superGross: 1220 } }, { result: { gross: 500, net: 410 } }] });
  assert.deepEqual(snapshotTotals(snap), { gross: 1500, net: 1210, cost: 1720 });
  assert.equal(snapshotTotals("not json"), null);
  assert.equal(snapshotTotals("{}"), null);
});
