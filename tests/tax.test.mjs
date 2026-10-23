// 2026 payroll tax module: reference values, boundaries, inverse and comparison.
import test from "node:test";
import assert from "node:assert/strict";
import config from "../config/tax_az_2026.json" with { type: "json" };
import { grossToNet, netToGross, normalizeSalary, compareSalary } from "../lib/tax.ts";

const near = (a, b, eps = 0.011) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test("main job reference values", () => {
  assert.equal(grossToNet(150).incomeTax, 0);
  const a = grossToNet(1000);
  assert.deepEqual([a.incomeTax, a.employeeDsmf, a.employeeUnemployment, a.employeeMedical, a.net, a.employerDsmf], [24, 86, 5, 20, 865, 164]);
  const b = grossToNet(2500);
  assert.deepEqual([b.incomeTax, b.employeeDsmf, b.employeeUnemployment, b.employeeMedical, b.net], [69, 236, 12.5, 50, 2132.5]);
  const c = grossToNet(5000);
  assert.deepEqual([c.incomeTax, c.employeeDsmf, c.employeeUnemployment, c.employeeMedical, c.net, c.employerDsmf], [325, 486, 25, 62.5, 4101.5, 764]);
  const d = grossToNet(10000);
  assert.deepEqual([d.incomeTax, d.employeeDsmf, d.employeeUnemployment, d.employeeMedical, d.net], [905, 986, 50, 87.5, 7971.5]);
});
test("the 2,500 boundary jumps from 69 to 75 on purpose", () => {
  assert.equal(grossToNet(2500).incomeTax, 69);
  near(grossToNet(2500.01).incomeTax, 75);
  near(grossToNet(2500.01).net, 2126.51);
});
test("additional job has no 200 AZN deduction", () => {
  assert.equal(grossToNet(150, { jobType: "additional" }).incomeTax, 4.5);
  const a = grossToNet(1000, { jobType: "additional" });
  assert.equal(a.incomeTax, 30);
  assert.equal(a.net, 859);
  assert.equal(grossToNet(2500, { jobType: "additional" }).incomeTax, 75);
  for (const g of [150, 1000, 2500, 5000, 9000]) assert.ok(grossToNet(g, { jobType: "additional" }).net <= grossToNet(g).net);
});
test("bracket limits 200, 2500 and 8000 behave", () => {
  assert.equal(grossToNet(200).employeeDsmf, 6);
  assert.equal(grossToNet(8000).incomeTax, 625);
  near(grossToNet(8000.01).incomeTax, 625.0014);
  assert.equal(grossToNet(8000).employerDsmf, 44 + 15 * 78);
});
test("zero, negative and invalid input is rejected", () => {
  for (const bad of [0, -5, NaN]) {
    assert.throws(() => grossToNet(bad), RangeError);
    assert.throws(() => netToGross(bad), RangeError);
  }
});
test("net to gross to net round trip", () => {
  for (const net of [100, 865, 2000, 4101.5, 7971.5, 20000]) {
    for (const jobType of ["main", "additional"]) {
      const { gross } = netToGross(net, { jobType });
      near(grossToNet(gross, { jobType }).net, net);
    }
  }
});
test("a net inside the jump maps to two gross values", () => {
  const r = netToGross(2130);
  assert.equal(r.candidates.length, 2);
  assert.ok(r.candidates[0] < 2500 && r.candidates[1] > 2500);
  assert.equal(r.gross, r.candidates[0]);
  assert.ok(r.notes.some((n) => n.includes("iki gross")));
  for (const g of r.candidates) near(grossToNet(g).net, 2130, 0.02);
});
test("unknown kind is never guessed", () => {
  const s = normalizeSalary({ value: 1000, kind: "unknown" });
  assert.equal(s.gross, null);
  assert.equal(s.net, null);
  assert.equal(s.scenarios.asGross.net, 865);
  assert.equal(s.scenarios.asNet.net, 1000);
  assert.throws(() => normalizeSalary({ value: 1000, kind: "gross", currency: "USD" }), RangeError);
  assert.equal(normalizeSalary({ value: 12000, kind: "gross", period: "year" }).gross, 1000);
});
test("comparison runs on net pay", () => {
  assert.equal(compareSalary({ value: 865, kind: "net" }, { value: 1000, kind: "gross" }).status, "meets");
  assert.equal(compareSalary({ value: 1000, kind: "net" }, { value: 1000, kind: "gross" }).status, "below");
  assert.equal(compareSalary({ value: 900, kind: "net" }, { value: 1000, kind: "gross" }).status, "partial");
  const unclear = compareSalary({ value: 900, kind: "net" }, { value: 1000, kind: "unknown" });
  assert.equal(unclear.status, "unclear");
});
test("every result carries the assumptions note and unconfirmed profile is refused", () => {
  assert.ok(grossToNet(1000).notes[0].includes("fərziyyələrə"));
  assert.ok(grossToNet(1000).notes.some((n) => n.includes("əsas iş yeri")));
  assert.equal(grossToNet(1000, { jobType: "main" }).notes.some((n) => n.includes("əsas iş yeri")), false);
  assert.throws(() => grossToNet(1000, { profile: "public" }), /hesablama aparılmır/);
});
test("changing the config changes the result (no hard-coded rates)", () => {
  const changed = structuredClone(config);
  changed.profiles.private.income_tax.brackets[0].rate = 0.05;
  assert.ok(grossToNet(1000, { config: changed }).incomeTax > grossToNet(1000).incomeTax);
  const noDeduction = structuredClone(config);
  noDeduction.profiles.private.income_tax.first_bracket_deduction = 0;
  assert.equal(grossToNet(1000, { config: noDeduction }).incomeTax, 30);
});
