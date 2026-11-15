import test from "node:test";
import assert from "node:assert/strict";
import { COMPANY_AI_PACKAGES, packageById, worstCaseCost, worstCaseNetShare, quotaLeft, monthKey } from "../lib/ai-packages.ts";

test("every paid package keeps its target net profit even when the whole quota is used on OpenAI", () => {
  for (const p of COMPANY_AI_PACKAGES.filter((x) => x.priceAzn > 0)) {
    assert.ok(worstCaseNetShare(p) >= p.target - 0.005, `${p.id}: ${worstCaseNetShare(p).toFixed(3)} < ${p.target}`);
  }
});

test("the packages are ordered by price and by quota", () => {
  const list = COMPANY_AI_PACKAGES;
  for (let i = 1; i < list.length; i++) {
    assert.ok(list[i].priceAzn > list[i - 1].priceAzn && list[i].fullPerMonth > list[i - 1].fullPerMonth && list[i].rankPerMonth > list[i - 1].rankPerMonth, list[i].id);
  }
  assert.equal(packageById("pro").fullPerMonth, 5000);
  assert.equal(packageById("pro").priceAzn, 239);
  assert.equal(packageById("nope").id, "free");
});

test("the free package costs little and the quota left never goes below zero", () => {
  assert.ok(worstCaseCost(packageById("free")) < 1.5);
  assert.deepEqual(quotaLeft(packageById("pro"), { full: 120, rank: 25000 }), { full: 4880, rank: 0 });
  assert.match(monthKey(new Date("2026-11-15T10:00:00Z")), /^2026-11$/);
});
