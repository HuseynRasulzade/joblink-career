import test from "node:test";
import assert from "node:assert/strict";
import { EMPTY_PROFILE, normalizeProfile } from "../lib/employee-profile.ts";
import { TAX_BENEFITS, taxReduction, suggestedBenefits, employeeRights, taxBenefit } from "../lib/employee-rights.ts";
import { calculateFromGross, calculateFromNet } from "../lib/salary.ts";
import { employeePay } from "../lib/payroll.ts";

const profile = (extra) => ({ ...EMPTY_PROFILE, ...extra });
const TODAY = "2026-06-15";

test("the benefit list follows article 102 of the Tax Code", () => {
  const amounts = Object.fromEntries(TAX_BENEFITS.map((b) => [b.id, b.amount]));
  assert.equal(amounts["martyr-family"], 800);
  for (const id of ["hero-patriotic-war", "war-disabled-12", "war-veteran", "chernobyl-radiation"]) assert.equal(amounts[id], 400, id);
  for (const id of ["disabled-61-100", "carer-permanent"]) assert.equal(amounts[id], 200, id);
  for (const id of ["carer-degree1", "idp", "fallen-parent"]) assert.equal(amounts[id], 100, id);
  assert.equal(new Set(TAX_BENEFITS.map((b) => b.id)).size, TAX_BENEFITS.length);
  assert.ok(TAX_BENEFITS.every((b) => /^102\./.test(b.article)));
});

test("the reduction is the one chosen benefit plus 50 for three dependents, only at the main job and from its date", () => {
  assert.equal(taxReduction(profile({}), TODAY), 0);
  assert.equal(taxReduction(profile({ taxBenefit: "disabled-61-100" }), TODAY), 200);
  assert.equal(taxReduction(profile({ taxBenefit: "disabled-61-100", dependents3: true }), TODAY), 250);
  assert.equal(taxReduction(profile({ dependents3: true }), TODAY), 50);
  assert.equal(taxReduction(profile({ taxBenefit: "war-veteran", taxBenefitFrom: "2026-07-01" }), TODAY), 0);
  assert.equal(taxReduction(profile({ taxBenefit: "war-veteran", taxBenefitFrom: "2026-06-01" }), TODAY), 400);
  assert.equal(taxReduction(profile({ taxBenefit: "war-veteran", mainJob: false }), TODAY), 0);
  assert.equal(taxReduction(profile({ taxBenefit: "unknown" }), TODAY), 0);
});

test("the personal data suggests the benefit it entitles to", () => {
  assert.deepEqual(suggestedBenefits(profile({ disability: "p61_80" })).map((b) => b.id), ["disabled-61-100"]);
  assert.deepEqual(suggestedBenefits(profile({ disability: "under61" })), []);
  // a war-related disability of group I or II gives 400, not the general 200 (102.3 leaves war-related disability out)
  assert.deepEqual(suggestedBenefits(profile({ disability: "p81_100", disabilityWar: true, disabilityDegree: "I" })).map((b) => b.id), ["war-disabled-12"]);
  assert.deepEqual(suggestedBenefits(profile({ disability: "p81_100", disabilityWar: true })).map((b) => b.id), []);
  assert.deepEqual(suggestedBenefits(profile({ careDependent: "adult81" })).map((b) => b.id), ["carer-permanent"]);
  assert.deepEqual(suggestedBenefits(profile({ careDependent: "degree1" })).map((b) => b.id), ["carer-degree1"]);
  assert.equal(taxBenefit("carer-degree1").amount, 100);
});

test("rights follow the Labor Code", () => {
  const ids = (p) => employeeRights(p, TODAY).map((r) => r.id);
  assert.ok(ids(profile({ disability: "p81_100" })).includes("short-week"));
  assert.ok(!ids(profile({ disability: "under61" })).includes("short-week"));
  assert.ok(ids(profile({ disability: "under61" })).includes("leave-time"));
  assert.deepEqual(ids(profile({})), []);
  const minor = ids(profile({ disability: "p61_80", birthDate: "2009-01-01" }));
  assert.ok(minor.includes("leave-42") && minor.includes("unpaid-month"));
  assert.ok(!ids(profile({ disability: "p61_80", birthDate: "1990-01-01" })).includes("leave-42"));
  const mother = ids(profile({ gender: "female", disabledChildren: 1 }));
  for (const id of ["unpaid-14", "retention", "extra-leave-5", "no-night"]) assert.ok(mother.includes(id), id);
  const father = ids(profile({ gender: "male", disabledChildren: 1 }));
  assert.ok(father.includes("unpaid-14") && !father.includes("extra-leave-5"));
  const text = employeeRights(profile({ taxBenefit: "disabled-61-100", dependents3: true }), TODAY).map((r) => r.text).join(" ");
  assert.match(text, /200 AZN/);
  assert.match(text, /50 AZN/);
  assert.ok(employeeRights(profile({ disability: "p61_80" }), TODAY).every((r) => r.article.length > 3));
});

test("a reduction lowers only the income tax", () => {
  const plain = calculateFromGross(1000);
  const reduced = calculateFromGross(1000, "private", { reduction: 200 });
  assert.equal(plain.incomeTax, 24);
  assert.equal(reduced.incomeTax, 18);
  assert.equal(reduced.net, Math.round((plain.net + 6) * 100) / 100);
  assert.equal(reduced.employeeSocial, plain.employeeSocial);
  assert.equal(reduced.employerCost, plain.employerCost);
  assert.equal(reduced.taxReduction, 200);
  assert.equal(calculateFromGross(100, "private", { reduction: 800 }).incomeTax, 0);
  assert.equal(calculateFromGross(1000, "private", { reduction: 0 }).net, plain.net);
  // from net back to gross with a reduction
  const back = calculateFromNet(reduced.net, "private", { reduction: 200 });
  assert.ok(Math.abs(back.gross - 1000) < 0.02);
  assert.equal(employeePay(1000, "gross", "private", 200).net, reduced.net);
  assert.equal(employeePay(1000, "gross", "private").net, plain.net);
});

test("old and new disability data are kept together", () => {
  assert.equal(normalizeProfile({ hasDisabledChild: true }).profile.disabledChildren, 1);
  assert.equal(normalizeProfile({ disabledChildren: 2 }).profile.hasDisabledChild, true);
  const { profile: p, issues } = normalizeProfile({ disability: "p61_80", disabilityDegree: "II", disabilityWar: true, disabilityUntil: "2027-01-01", careDependent: "adult81", taxBenefit: "war-veteran", taxBenefitFrom: "2026-03-01", dependents3: true, mainJob: false });
  assert.deepEqual(issues, []);
  assert.deepEqual([p.disability, p.disabilityDegree, p.disabilityWar, p.careDependent, p.dependents3, p.mainJob], ["p61_80", "II", true, "adult81", true, false]);
  assert.equal(normalizeProfile({ disability: "bogus", careDependent: "x" }).profile.disability, "");
  assert.equal(normalizeProfile({}).profile.mainJob, true);
  assert.equal(normalizeProfile({ disabilityUntil: "no" }).issues.length, 1);
});
