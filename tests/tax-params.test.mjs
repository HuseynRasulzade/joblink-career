import test from "node:test";
import assert from "node:assert/strict";
import { calculateFromGross as legacyGross, calculateFromNet as legacyNet, superGrossParts as legacySuper } from "./fixtures/salary-legacy.ts";
import { DEFAULT_TAX_PARAMS, calculateFromGross, calculateFromNet, minimumWageAt, normalizeTaxParams, setExtraTaxParams, superGrossParts, taxParamsFor } from "../lib/salary.ts";

const GROSSES = [0, 1, 50, 199.99, 200, 201, 500, 1000, 1500, 2499.99, 2500, 2500.01, 2700, 3200, 5000, 7999, 8000, 8001, 12000, 50000];

test("the parameter-set calculation gives exactly the numbers of the old fixed one", () => {
  for (const sector of ["private", "public"]) {
    for (const reduction of [0, 100, 400]) {
      for (const g of GROSSES) {
        assert.deepEqual(calculateFromGross(g, sector, { reduction }), legacyGross(g, sector, { reduction }), `gross ${g} ${sector} reduction ${reduction}`);
      }
    }
    for (const net of [0, 100, 399, 1000, 2400, 6000, 20000]) assert.deepEqual(calculateFromNet(net, sector), legacyNet(net, sector), `net ${net} ${sector}`);
    for (const g of GROSSES) {
      const a = superGrossParts(g, sector);
      const b = legacySuper(g, sector);
      assert.equal(a.total, b.total);
      assert.equal(a.shareOfGross, b.shareOfGross);
      assert.deepEqual(a.lines.map((l) => [l.amount, l.tiers.map((t) => t.amount)]), b.lines.map((l) => [l.amount, l.tiers.map((t) => t.amount)]));
    }
  }
  assert.equal(minimumWageAt(), 400);
});

test("a set added by the admin takes effect on its day and not before", () => {
  const next = normalizeTaxParams({ ...DEFAULT_TAX_PARAMS, effectiveFrom: "2027-01-01", note: "2027", minimumWage: 450, taxFreeAmount: 250, medical: [{ upTo: null, rate: 0.03 }] });
  setExtraTaxParams([next]);
  try {
    assert.equal(taxParamsFor("2026-12-31").effectiveFrom, "2026-01-01");
    assert.equal(taxParamsFor("2027-01-01").effectiveFrom, "2027-01-01");
    assert.equal(taxParamsFor("2027-03").minimumWage, 450); // a month means its first day
    assert.equal(minimumWageAt("2026-06"), 400);
    // the same salary is calculated with the rates of its own month
    const before = calculateFromGross(1000, "private", { asOf: "2026-12" });
    const after = calculateFromGross(1000, "private", { asOf: "2027-01" });
    assert.deepEqual(before, legacyGross(1000, "private"));
    assert.equal(after.employeeMedical, 30);
    assert.equal(after.incomeTax, 22.5); // (1000 - 250 exemption) x 3%
  } finally {
    setExtraTaxParams([]);
  }
  assert.equal(taxParamsFor("2027-03").effectiveFrom, "2026-01-01");
});

test("bad sets are refused with a readable message", () => {
  const ok = { ...DEFAULT_TAX_PARAMS, effectiveFrom: "2027-01-01" };
  assert.throws(() => normalizeTaxParams({ ...ok, effectiveFrom: "2027-13-40" }), /tarixi/);
  assert.throws(() => normalizeTaxParams({ ...ok, minimumWage: 0 }), /minimum/);
  assert.throws(() => normalizeTaxParams({ ...ok, medical: [{ upTo: 100, rate: 0.02 }] }), /yuxarı/); // the last row must be unlimited
  assert.throws(() => normalizeTaxParams({ ...ok, medical: [{ upTo: 8000, rate: 0.02 }, { upTo: 5000, rate: 0.01 }, { upTo: null, rate: 0.005 }] }), /artan/);
  assert.throws(() => normalizeTaxParams({ ...ok, unemployment: { employee: 0.9, employer: 0.005 } }), /İşsizlik/);
  assert.equal(normalizeTaxParams(ok).minimumWage, 400);
});
