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
