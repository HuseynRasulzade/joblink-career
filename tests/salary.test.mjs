import test from "node:test";
import assert from "node:assert/strict";
import { calculateFromGross, calculateFromNet } from "../lib/salary.ts";

test("private 1000 AZN gross", () => {
  const r = calculateFromGross(1000);
  assert.equal(r.incomeTax, 24); // 3% of (1000 - 200)
  assert.equal(r.employeeSocial, 6 + 80);
  assert.equal(r.employeeMedical, 20);
  assert.equal(r.employeeUnemployment, 5);
  assert.equal(r.net, 1000 - 24 - 86 - 20 - 5);
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

test("private income tax brackets and the 200 AZN amount", () => {
  assert.equal(calculateFromGross(150).incomeTax, 0);
  assert.equal(calculateFromGross(200).incomeTax, 0);
  assert.equal(calculateFromGross(2500).incomeTax, 69);
  assert.equal(calculateFromGross(3000).incomeTax, 125);
  assert.equal(calculateFromGross(8000).incomeTax, 625);
  assert.equal(calculateFromGross(10000).incomeTax, 625 + 280);
});
test("private employer contributions use the 22/15/11 tiers", () => {
  assert.equal(calculateFromGross(150).employerSocial, 33);
  assert.equal(calculateFromGross(2000).employerSocial, 44 + 270);
  assert.equal(calculateFromGross(10000).employerSocial, 44 + 1170 + 220);
});
test("medical insurance is 2% up to 2,500 and 0.5% above, on each side", () => {
  const r = calculateFromGross(3000);
  assert.equal(r.employeeMedical, 50 + 2.5);
  assert.equal(r.employerMedical, 50 + 2.5);
  assert.equal(r.employeeUnemployment, 15);
  assert.equal(r.employerUnemployment, 15);
});
test("state sector: 3% and 22% social insurance on the whole salary", () => {
  const r = calculateFromGross(1000, "public");
  assert.equal(r.incomeTax, 140);
  assert.equal(r.employeeSocial, 30);
  assert.equal(r.employerSocial, 220);
  const big = calculateFromGross(5000, "public");
  assert.equal(big.employeeSocial, 150);
  assert.equal(big.employerSocial, 1100);
  assert.equal(big.incomeTax, 350 + 625);
});
