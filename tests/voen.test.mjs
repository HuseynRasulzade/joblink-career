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
