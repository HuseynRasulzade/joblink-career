import test from "node:test";
import assert from "node:assert/strict";
import { HR_MODULE_BUNDLE_PRICE_AZN, HR_MODULE_PRICE_AZN, hrModulePriceFor } from "../lib/ai-packages.ts";

test("the HR module is 120 beside a paid AI package and 150 alone", () => {
  assert.equal(HR_MODULE_BUNDLE_PRICE_AZN, 120);
  assert.equal(HR_MODULE_PRICE_AZN, 150);
  assert.equal(hrModulePriceFor(0), 150);
  assert.equal(hrModulePriceFor(49), 120);
  assert.equal(hrModulePriceFor(399), 120);
});

import { HR_MODULE_REQUIRED_FROM, hrModuleOpen, hrUntilAfter } from "../lib/ai-packages.ts";

test("a bought HR module closes when its days end; older companies keep it free", () => {
  const newCo = "2026-12-01T00:00:00.000Z";
  const now = "2026-12-10T00:00:00.000Z";
  assert.equal(hrModuleOpen(newCo, false, null, now), false);
  assert.equal(hrModuleOpen(newCo, true, null, now), true); // no end date: an older row, stays open
  assert.equal(hrModuleOpen(newCo, true, "2026-12-20T00:00:00.000Z", now), true);
  assert.equal(hrModuleOpen(newCo, true, "2026-12-09T00:00:00.000Z", now), false); // ended
  // a company older than the rule keeps it free even after a bought period ended
  assert.equal(hrModuleOpen("2026-05-01T00:00:00.000Z", true, "2026-06-01T00:00:00.000Z", now), true);
  assert.ok(HR_MODULE_REQUIRED_FROM.startsWith("2026-11-19"));
});

test("renewing adds days from the current end when it is still ahead, from today otherwise", () => {
  const now = "2026-12-10T00:00:00.000Z";
  assert.equal(hrUntilAfter(30, null, now), "2027-01-09T00:00:00.000Z");
  assert.equal(hrUntilAfter(30, "2026-12-01T00:00:00.000Z", now), "2027-01-09T00:00:00.000Z"); // ended: from today
  assert.equal(hrUntilAfter(30, "2026-12-20T00:00:00.000Z", now), "2027-01-19T00:00:00.000Z"); // still ahead: from the end
});
