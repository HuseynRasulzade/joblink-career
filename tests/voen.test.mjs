import test from "node:test";
import assert from "node:assert/strict";
import { validVoen, voenType } from "../lib/company.ts";

test("VÖEN must be exactly 10 digits", () => {
  assert.equal(validVoen("1701332401"), true);
  for (const bad of ["", "170133240", "17013324011", "17013324a1", " 1701332401"]) assert.equal(validVoen(bad), false);
});
test("the last digit gives the taxpayer type (needs e-taxes confirmation)", () => {
  assert.equal(voenType("1701332401"), "legal");
  assert.equal(voenType("1234567892"), "individual");
  assert.equal(voenType("1234567893"), "unknown");
  assert.equal(voenType("abc"), "unknown");
});

import { sanitizeTaxCheck, taxNameMatches } from "../lib/company.ts";

test("the registered name matches the declared name ignoring quotes, case and legal form", () => {
  assert.equal(taxNameMatches("FBCO MMC", "\"FBCO\" MƏHDUD MƏSULİYYƏTLİ CƏMİYYƏTİ"), true);
  assert.equal(taxNameMatches("fbco", "\"FBCO\" MMC"), true);
  assert.equal(taxNameMatches("Alfa MMC", "\"FBCO\" MƏHDUD MƏSULİYYƏTLİ CƏMİYYƏTİ"), false);
  assert.equal(taxNameMatches("", "FBCO"), false);
});
test("a tax check needs a valid VÖEN and a name, and keeps only known fields", () => {
  const ok = sanitizeTaxCheck({ payerType: "legal", name: "\"FBCO\" MMC", active: true, vat: true, risky: false, debt: "0", extra: "x" }, "1701332401", "admin1", "2026-10-23T00:00:00Z");
  assert.deepEqual(ok, { payerType: "legal", voen: "1701332401", name: "\"FBCO\" MMC", active: true, vat: true, risky: false, debt: 0, checkedAt: "2026-10-23T00:00:00Z", checkedBy: "admin1", source: "manual" });
  assert.equal(sanitizeTaxCheck({ name: "X" }, "123", "a"), null);
  assert.equal(sanitizeTaxCheck({ name: "" }, "1701332401", "a"), null);
  assert.equal(sanitizeTaxCheck({ name: "FBCO", debt: -5 }, "1701332401", "a").debt, 0);
});
