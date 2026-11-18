import test from "node:test";
import assert from "node:assert/strict";
import { PLANS, planById } from "../lib/plans.ts";
import { COMPANY_AI_PACKAGES, packageById } from "../lib/ai-packages.ts";
import { applyPackageOverrides, normalizeOverrides } from "../lib/package-limits.ts";

test("admin limits are applied over the defaults, in place, and can be undone", () => {
  const before = planById("plus-7").limits.cvAnalysesPerDay;
  applyPackageOverrides({ candidate: { "plus-7": { cvAnalysesPerDay: 9, aiApplyPerDay: 8 } }, company: { standard: { fullPerMonth: 1234 } } });
  const plan = planById("plus-7");
  assert.equal(plan.limits.cvAnalysesPerDay, 9);
  assert.equal(plan.limits.aiApplyPerDay, 8);
  // the package texts quote the limits
  assert.ok(plan.features.some((f) => f.includes("Gündə 9 AI CV analizi")));
  assert.ok(plan.features.some((f) => f.includes("günlük 8 şirkətə")));
  assert.equal(packageById("standard").fullPerMonth, 1234);
  // a limit that was not touched keeps its default
  assert.equal(planById("plus-10").limits.cvAnalysesPerDay, 20);
  applyPackageOverrides(null);
  assert.equal(planById("plus-7").limits.cvAnalysesPerDay, before);
  assert.ok(planById("plus-7").features.some((f) => f.includes("Gündə 5 AI CV analizi")));
  assert.equal(packageById("standard").fullPerMonth, 2800);
});

test("unknown packages, unknown limits and bad numbers are dropped", () => {
  const ov = normalizeOverrides({ candidate: { nope: { cvAnalysesPerDay: 3 }, free: { cvAnalysesPerDay: -1, aiTokensMonth: "x", aiApplyPerDay: 4.6, hack: 1 } }, company: { big: { rankPerMonth: 1e12 } } });
  assert.deepEqual(ov, { candidate: { free: { aiApplyPerDay: 5 } } });
  assert.equal(PLANS.length, 6);
  assert.equal(COMPANY_AI_PACKAGES.length, 5);
});

test("the monthly analyses in the package text follow the token limit", () => {
  applyPackageOverrides({ candidate: { premium: { aiTokensMonth: 3800 * 100 } } });
  assert.ok(planById("premium").features.some((f) => f.includes("Ayda təxminən 100 tam AI CV analizi")));
  applyPackageOverrides(null);
  assert.ok(planById("premium").features.some((f) => f.includes("Ayda təxminən 550 tam AI CV analizi")));
});
