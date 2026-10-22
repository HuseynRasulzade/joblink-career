import test from "node:test";
import assert from "node:assert/strict";
import { calculateFromGross, calculateFromNet } from "../lib/salary.ts";

test("private 1000 AZN gross", () => {
  const r = calculateFromGross(1000);
  assert.equal(r.incomeTax, 30);
  assert.equal(r.employeeSocial, 6 + 80);
  assert.equal(r.employeeMedical, 20);
  assert.equal(r.employeeUnemployment, 5);
  assert.equal(r.net, 1000 - 30 - 86 - 20 - 5);
});
test("net to gross round trip", () => {
  for (const gross of [500, 1200, 3000, 9000]) {
    const net = calculateFromGross(gross).net;
    assert.ok(Math.abs(calculateFromNet(net).gross - gross) < 0.05);
  }
});
test("employer cost exceeds gross", () => {
  const r = calculateFromGross(2000);
  assert.ok(r.employerCost > r.gross);
  assert.equal(r.employerSocial, 44 + 270);
});
test("public sector uses 14/25 brackets", () => {
  assert.equal(calculateFromGross(3000, "public").incomeTax, 350 + 125);
});
