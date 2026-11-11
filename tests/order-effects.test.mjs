import test from "node:test";
import assert from "node:assert/strict";
import { beforeOf, hasEffect, planOrderEffect } from "../lib/order-effects.ts";

const card = { name: "Aysel Məmmədova", position: "Mühasib", department: "Maliyyə", section: "Mühasibat", salaryCents: 150000, salaryType: "gross", status: "active", endDate: "", exitType: "", exitReason: "", probationEnd: "2026-05-01", contractEnd: "2026-12-31", workMode: "" };

test("a transfer changes position, department and pay, and remembers what was there", () => {
  const plan = planOrderEffect("transfer", { from: "2026-04-01", newPosition: "Baş mühasib", newDepartment: "Maliyyə", salary: "2000" }, card, "2026-03-20");
  assert.deepEqual(plan.patch, { position: "Baş mühasib", salaryCents: 200000 });
  assert.equal(plan.effectiveDate, "2026-04-01");
  assert.equal(plan.summary.length, 2);
  assert.deepEqual(beforeOf(card, plan.patch), { position: "Mühasib", salaryCents: 150000 });
  assert.equal(planOrderEffect("transfer", { newPosition: "Mühasib" }, card, "2026-03-20"), null); // nothing changes
});

test("termination and reduction put the card in the leaver state", () => {
  const t = planOrderEffect("termination", { from: "2026-06-30" }, card, "2026-06-01");
  assert.deepEqual([t.patch.status, t.patch.endDate, t.patch.exitType], ["left", "2026-06-30", "other"]);
  const r = planOrderEffect("reduction", { from: "2026-06-30" }, card, "2026-06-01");
  assert.deepEqual([r.patch.exitType, r.patch.exitReason], ["dismissal", "restructuring"]);
  assert.equal(planOrderEffect("termination", { from: "2026-06-30" }, { ...card, status: "left", endDate: "2026-06-30" }, "2026-06-01"), null);
});

test("name, salary, probation, suspension and bonus orders", () => {
  assert.equal(planOrderEffect("name", { newName: "Aysel Əliyeva" }, card, "2026-03-01").patch.name, "Aysel Əliyeva");
  assert.equal(planOrderEffect("salary", { from: "2026-07-01", salary: "1800,50" }, card, "2026-06-01").patch.salaryCents, 180050);
  assert.equal(planOrderEffect("probation", { result: "Sınaqdan keçdi" }, card, "2026-05-01").patch.probationEnd, "");
  assert.equal(planOrderEffect("probation", { result: "Sınaqdan keçmədi" }, card, "2026-05-01"), null);
  const s = planOrderEffect("suspension", { from: "2026-03-02", to: "2026-03-04" }, card, "2026-03-01");
  assert.deepEqual(s.marks, { from: "2026-03-02", to: "2026-03-04", code: "suspension" });
  const b = planOrderEffect("bonus", { salary: "250" }, card, "2026-03-15");
  assert.deepEqual(b.bonus, { amount: 250, month: "2026-03" });
});

test("kinds without an effect on the card are left alone", () => {
  for (const kind of ["hire", "vacation", "trip", "overtime"]) assert.equal(hasEffect(kind), false, kind);
  assert.equal(planOrderEffect("vacation", { from: "2026-03-02" }, card, "2026-03-01"), null);
});

test("discipline, extension, substitution and schedule orders leave a line in the card history", () => {
  const card = { name: "A", position: "Mühasib", department: "Maliyyə", section: "", salaryCents: 100000, salaryType: "gross", status: "active", endDate: "", exitType: "", exitReason: "", probationEnd: "", contractEnd: "", workMode: "" };
  const d = planOrderEffect("discipline", { penalty: "Töhmət", basis: "Gecikmə" }, card, "2026-11-03");
  assert.deepEqual(d.patch, {});
  assert.equal(d.events[0].type, "discipline");
  assert.equal(d.events[0].to, "Töhmət");
  assert.equal(planOrderEffect("extend", { to: "2027-12-31" }, card, "2026-11-03").events[0].type, "contract");
  assert.equal(planOrderEffect("substitute", { newPosition: "Baş mühasib", from: "2026-12-01", to: "2026-12-31" }, card, "2026-11-03").events[0].to, "Baş mühasib");
  assert.equal(planOrderEffect("schedule", { schedule: "5/2, 10:00-19:00" }, card, "2026-11-03").events[0].to, "5/2, 10:00-19:00");
});

test("a contract extension moves the end date on the card and a schedule order sets the work regime", () => {
  const c = { name: "A", position: "Mühasib", department: "Maliyyə", salaryCents: 100000, salaryType: "gross", status: "active", endDate: "", exitType: "", exitReason: "", probationEnd: "", contractEnd: "2026-12-31", workMode: "" };
  const e = planOrderEffect("extend", { to: "2027-12-31" }, c, "2026-11-03");
  assert.equal(e.patch.contractEnd, "2027-12-31");
  assert.match(e.summary[0], /31\.12\.2026 → 31\.12\.2027/);
  assert.equal(planOrderEffect("extend", { to: "2026-12-31" }, c, "2026-11-03").patch.contractEnd, undefined);
  const s = planOrderEffect("schedule", { schedule: "Natamam iş vaxtı, 4 saat" }, c, "2026-11-03");
  assert.equal(s.patch.workMode, "Natamam iş vaxtı, 4 saat");
  assert.deepEqual(beforeOf(c, s.patch), { workMode: "" });
});

test("a transfer to another branch, department and section is one plan: the card fields, the branch move and the pay", () => {
  const plan = planOrderEffect("transfer", { from: "2026-03-16", newPosition: "Baş mühasib", newBranch: "B filialı", newDepartment: "Satış", newSection: "Hesabat", salary: 2000 }, { ...card, branches: ["A filialı"] }, "2026-03-10");
  assert.equal(plan.patch.position, "Baş mühasib");
  assert.equal(plan.patch.department, "Satış");
  assert.equal(plan.patch.section, "Hesabat");
  assert.equal(plan.patch.salaryCents, 200000);
  assert.deepEqual(plan.branchMove, { branch: "B filialı", department: "Satış", section: "Hesabat", role: "Baş mühasib" });
  assert.equal(plan.effectiveDate, "2026-03-16");
  assert.ok(plan.summary.some((l) => l.startsWith("Filial: A filialı → B filialı")));
});
test("a transfer into the branch the person already works in only (and nothing else) changes nothing", () => {
  assert.equal(planOrderEffect("transfer", { from: "2026-03-16", newBranch: "a FİLİALI" }, { ...card, branches: ["A filialı"] }, "2026-03-10"), null);
});
