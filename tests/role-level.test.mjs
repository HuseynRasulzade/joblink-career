// Position level and duties next to skills when a CV is matched with a vacancy.
import assert from "node:assert/strict";
import test from "node:test";
import { blankProfile, match } from "../lib/model.ts";
import { candidateLevel, dutyFit, levelFit, titleLevel } from "../lib/role-level.ts";

test("title levels follow the hierarchy in Azerbaijani and English", () => {
  const level = (title) => titleLevel(title);
  assert.equal(level("Mühasib operator"), 1);
  assert.equal(level("Mühasib köməkçisi"), 1);
  assert.equal(level("Mühasib"), 2);
  assert.equal(level("Senior Accountant"), 3);
  assert.equal(level("Baş mühasib"), 4);
  assert.equal(level("Maliyyə meneceri"), 4);
  assert.equal(level("Şöbə müdiri"), 5);
  assert.equal(level("Head of Finance"), 5);
  assert.equal(level("Maliyyə direktoru"), 6);
  assert.equal(level("Təcrübəçi mühasib"), 0);
  assert.equal(level(""), null);
});

test("level fit drops sharply from three steps apart", () => {
  assert.equal(levelFit(2, 2).fit, 1);
  assert.equal(levelFit(2, 3).fit, 1);
  assert.ok(levelFit(4, 2).fit < 1);
  assert.ok(levelFit(4, 1).fit < levelFit(4, 2).fit);
  assert.equal(levelFit(null, 3).fit, 1);
});

test("the candidate level is taken from current and recent roles", () => {
  const now = new Date("2026-10-24");
  const roles = [
    { title: "Direktor", current: false, end: "2015-05" },
    { title: "Mühasib", current: true, end: "" },
  ];
  assert.equal(candidateLevel(roles, "", now), 2);
  assert.equal(candidateLevel([{ title: "Direktor", current: false, end: "2015-05" }], "", now), 6);
});

test("duties that the person has really performed raise the duty fit", () => {
  const vacancy = "İlkin sənədlərin daxil edilməsi, qaimə-fakturaların uçotu, kassa əməliyyatları, bank çıxarışlarının işlənməsi, debitor borcların izlənməsi";
  const operator = "İlkin sənədlərin işlənməsi, qaimə-fakturaların daxil edilməsi, kassa əməliyyatları, bank çıxarışlarının uçotu, debitor borcların nəzarəti";
  const manager = "Strategiyanın hazırlanması, komandanın idarə edilməsi, investisiya layihələrinin qiymətləndirilməsi, rəhbərliyə təqdimatlar, risklərin idarəsi";
  assert.ok(dutyFit(vacancy, operator) > dutyFit(vacancy, manager));
  assert.equal(dutyFit("qısa", "mətn"), null);
});

const vacancy = (title, description) => ({
  id: "job", owner: "company", title, company: "Test MMC", city: "Bakı", mode: "Ofisdə", type: "Tam ştat",
  category: "Maliyyə, bankçılıq və sığorta", minSalary: 0, maxSalary: 0, minYears: 1, maxYears: 3,
  skills: ["Microsoft Excel", "Debitor və kreditor uçotu"], description, requirements: "", status: "published",
});
const person = (title, description) => ({
  ...blankProfile, city: "Bakı", mode: "Ofisdə", title, skills: ["Microsoft Excel", "Debitor və kreditor uçotu"],
  experiences: [{ id: "1", title, company: "X", employmentType: "", start: "2016-01", end: "", current: true, description }],
});

test("matching: a finance manager is not a good fit for an accountant-operator vacancy", () => {
  const job = vacancy("Mühasib operator", "İlkin sənədlərin daxil edilməsi, kassa əməliyyatları, qaimə-fakturaların uçotu");
  const manager = match(person("Maliyyə meneceri", "Büdcənin hazırlanması, komandanın idarə edilməsi, maliyyə hesabatları"), job);
  const operator = match(person("Mühasib operator", "İlkin sənədlərin daxil edilməsi, kassa əməliyyatları, qaimə-fakturaların uçotu"), job);
  assert.ok(manager.caps.includes("overqualified-level"));
  assert.ok(manager.score <= 55, `manager ${manager.score}`);
  assert.ok(operator.score > manager.score + 15, `operator ${operator.score} vs manager ${manager.score}`);
});

test("matching: someone at the vacancy's own level has no level penalty", () => {
  const job = vacancy("Mühasib", "Hesabatların hazırlanması");
  const r = match(person("Mühasib", "Hesabatların hazırlanması və uçot"), job);
  assert.equal(r.levelFit.factor, 1);
  assert.ok(!r.caps.includes("overqualified-level"));
});
