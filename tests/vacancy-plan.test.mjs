import test from "node:test";
import assert from "node:assert/strict";
import { checkVacancyAgainstPlan } from "../lib/vacancy-plan.ts";

const unit = (extra = {}) => ({ id: "u1", department: "Maliyyə", section: "", position: "Mühasib", planned: 3, rate: 1, salaryMin: 1000, salaryMax: 1500, ...extra });
const person = (n, extra = {}) => ({ id: `p${n}`, department: "Maliyyə", section: "", position: "Mühasib", status: "active", ...extra });
const job = (extra = {}) => ({ department: "Maliyyə", section: "", title: "Mühasib", minSalary: 1000, maxSalary: 1400, salaryKind: "gross", ...extra });

test("a free place in the plan lets the vacancy open", () => {
  const r = checkVacancyAgainstPlan([unit()], [person(1), person(2)], [], job());
  assert.equal(r.ok, true);
});
test("three planned, three working: a fourth vacancy is refused", () => {
  const r = checkVacancyAgainstPlan([unit()], [person(1), person(2), person(3)], [], job());
  assert.equal(r.ok, false);
  assert.equal(r.code, "no-place");
});
test("open vacancies take places too", () => {
  const open = [{ department: "Maliyyə", section: "", title: "Mühasib" }];
  assert.equal(checkVacancyAgainstPlan([unit()], [person(1), person(2)], open, job()).ok, false);
  assert.equal(checkVacancyAgainstPlan([unit()], [person(1)], open, job()).ok, true);
});
test("a position or department the plan does not have is refused", () => {
  assert.equal(checkVacancyAgainstPlan([unit()], [], [], job({ title: "Auditor" })).code, "no-position");
  assert.equal(checkVacancyAgainstPlan([unit()], [], [], job({ department: "İT" })).code, "no-department");
});
test("the pay must stay inside the band of the row", () => {
  assert.equal(checkVacancyAgainstPlan([unit()], [], [], job({ minSalary: 800 })).code, "salary");
  assert.equal(checkVacancyAgainstPlan([unit()], [], [], job({ maxSalary: 2000 })).code, "salary");
  assert.equal(checkVacancyAgainstPlan([unit()], [], [], job({ minSalary: 1200, maxSalary: 1500 })).ok, true);
});
test("a net pay is compared as gross", () => {
  const r = checkVacancyAgainstPlan([unit()], [], [], job({ minSalary: 1000, maxSalary: 1200, salaryKind: "net" }), (p) => p, (a, k) => (k === "net" ? a * 1.5 : a));
  assert.equal(r.ok, false);
  assert.equal(r.code, "salary");
});
test("a row without a band does not limit the pay; an empty staff table does not block", () => {
  assert.equal(checkVacancyAgainstPlan([unit({ salaryMin: 0, salaryMax: 0 })], [], [], job({ maxSalary: 9000 })).ok, true);
  const r = checkVacancyAgainstPlan([], [], [], job());
  assert.equal(r.ok, true);
  assert.equal(r.note, "no-table");
});
test("the position is compared through the catalog name", () => {
  const canon = (p) => (p.toLocaleLowerCase("az") === "baş mühasib" ? "Mühasib" : p);
  assert.equal(checkVacancyAgainstPlan([unit()], [], [], job({ title: "Baş mühasib" }), canon).ok, true);
});
test("a temporary cover takes no place of its own", () => {
  const full = [person(1), person(2), person(3)];
  assert.equal(checkVacancyAgainstPlan([unit()], full, [], job({ reason: "temporary" })).ok, true);
  const open = [{ department: "Maliyyə", section: "", title: "Mühasib", reason: "temporary" }];
  assert.equal(checkVacancyAgainstPlan([unit()], [person(1), person(2)], open, job()).ok, true);
});

const A = (extra = {}) => unit({ id: "ua", branch: "A filialı", planned: 1, ...extra });
const B = (extra = {}) => unit({ id: "ub", branch: "B filialı", planned: 1, ...extra });
test("a vacancy of a branch takes the place of that branch only", () => {
  const r = checkVacancyAgainstPlan([A(), B()], [], [], job({ branch: "B filialı" }));
  assert.equal(r.ok, true);
  assert.equal(r.unit.id, "ub");
});
test("the branch's place is full when its own person works there, even if the other branch is free", () => {
  const r = checkVacancyAgainstPlan([A(), B()], [person(1, { branches: ["A filialı"] })], [], job({ branch: "A filialı" }));
  assert.equal(r.ok, false);
  assert.equal(r.code, "no-place");
});
test("an open vacancy of branch A does not use the place of branch B", () => {
  const open = [{ branch: "A filialı", department: "Maliyyə", section: "", title: "Mühasib" }];
  assert.equal(checkVacancyAgainstPlan([A(), B()], [], open, job({ branch: "B filialı" })).ok, true);
  assert.equal(checkVacancyAgainstPlan([A(), B()], [], open, job({ branch: "A filialı" })).ok, false);
});
test("a branch that is not in the staff table is refused", () => {
  const r = checkVacancyAgainstPlan([A()], [], [], job({ branch: "C filialı" }));
  assert.equal(r.ok, false);
  assert.equal(r.code, "no-branch");
});
test("the branch name is compared the Azerbaijani way (İ/ı)", () => {
  assert.equal(checkVacancyAgainstPlan([A()], [], [], job({ branch: "a FİLİALI" })).ok, true);
});
test("a department that exists only in another branch is refused for this branch", () => {
  const r = checkVacancyAgainstPlan([A(), B({ department: "Satış", position: "Menecer" })], [], [], job({ branch: "A filialı", department: "Satış", title: "Menecer" }));
  assert.equal(r.ok, false);
  assert.equal(r.code, "no-department");
});
test("a branch vacancy never takes a row without a branch", () => {
  const r = checkVacancyAgainstPlan([unit({ planned: 5 }), A()], [], [], job({ branch: "C filialı" }));
  assert.equal(r.code, "no-branch");
  assert.equal(checkVacancyAgainstPlan([unit({ planned: 5 }), A()], [], [], job({ branch: "A filialı" })).unit.id, "ua");
});
