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

test("admin prices are applied in place, bad prices are dropped, and they can be undone", async () => {
  const { HR_PRICES, hrModulePriceFor } = await import("../lib/ai-packages.ts");
  applyPackageOverrides({ prices: { candidate: { "plus-7": 9.5 }, company: { start: 59 }, hrAlone: 160, hrBundle: 130 } });
  assert.equal(planById("plus-7").priceAzn, 9.5);
  assert.equal(packageById("start").priceAzn, 59);
  assert.equal(hrModulePriceFor(0), 160);
  assert.equal(hrModulePriceFor(59), 130);
  assert.equal(HR_PRICES.alone, 160);
  // untouched packages keep their price
  assert.equal(planById("plus-10").priceAzn, 10);
  assert.equal(packageById("standard").priceAzn, 149);
  applyPackageOverrides(null);
  assert.equal(planById("plus-7").priceAzn, 7);
  assert.equal(packageById("start").priceAzn, 49);
  assert.equal(hrModulePriceFor(0), 150);
  assert.equal(hrModulePriceFor(49), 120);
  // a paid package cannot be made free, the free one stays free, unknown ids and bad numbers are dropped, the bundle price cannot beat the alone price
  const ov = normalizeOverrides({ prices: { candidate: { "plus-7": 0, free: 0, nope: 5, basic: "x" }, company: { big: -3, pro: 250.456 }, hrAlone: 100, hrBundle: 120 } });
  assert.deepEqual(ov, { prices: { candidate: { free: 0 }, company: { pro: 250.46 }, hrAlone: 100 } });
});
