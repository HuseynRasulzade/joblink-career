import test from "node:test";
import assert from "node:assert/strict";
import { assignPeople, summarize, salaryBand, checkSalary, normalizeRate } from "../lib/staff-plan.ts";

const unit = (id, department, section, position, planned, extra = {}) => ({ id, department, section, position, planned, rate: 1, salaryMin: 0, salaryMax: 0, ...extra });
const person = (id, department, section, position, extra = {}) => ({ id, department, section, position, status: "active", ...extra });

test("every person sits in exactly one row", () => {
  const units = [unit("a", "Maliyyə", "Mühasibat", "Mühasib", 1), unit("b", "Maliyyə", "Mühasibat", "Mühasib", 2)];
  const people = [person("1", "maliyyə", "mühasibat", "mühasib"), person("2", "Maliyyə", "Mühasibat", "Mühasib"), person("3", "Maliyyə", "", "Mühasib")];
  const r = assignPeople(units, people);
  assert.equal(r.byUnit.get("a").length + r.byUnit.get("b").length, 3);
  assert.equal(r.unplaced.length, 0);
  assert.equal(r.byUnit.get("a").length, 1);
});

test("people without a row are listed, not counted in the rows", () => {
  const units = [unit("a", "Maliyyə", "", "Mühasib", 2)];
  const people = [person("1", "Maliyyə", "", "Baş mühasib"), person("2", "Maliyyə", "", "Mühasib"), person("3", "IT", "", "Proqramçı"), person("4", "Maliyyə", "", "Mühasib", { status: "left" })];
  const s = summarize(units, people);
  assert.equal(s.total.filled, 1);
  assert.equal(s.total.unplaced, 2);
  assert.deepEqual(s.unplaced.map((p) => p.id).sort(), ["1", "3"]);
  const fin = s.departments.find((d) => d.department === "Maliyyə");
  assert.equal(fin.filled, 1);
  assert.equal(fin.unplaced, 1);
  assert.equal(fin.free, 1);
});

test("department totals equal the sum of its rows", () => {
  const units = [unit("a", "Satış", "", "Menecer", 3, { rate: 0.5, salaryMax: 1000 }), unit("b", "Satış", "", "Kassir", 2, { salaryMin: 500, salaryMax: 600 })];
  const s = summarize(units, [person("1", "Satış", "", "Menecer"), person("2", "Satış", "", "Kassir")]);
  const d = s.departments[0];
  assert.equal(d.planned, 5);
  assert.equal(d.filled, 2);
  assert.equal(d.fte, 3 * 0.5 + 2);
  assert.equal(d.budget, 3 * 1000 + 2 * 600);
  assert.equal(s.total.planned, d.planned);
});

test("a row without a position takes the people no other row names", () => {
  const units = [unit("a", "Hüquq", "", "", 2)];
  const s = summarize(units, [person("1", "Hüquq", "", "Vəkil")]);
  assert.equal(s.total.filled, 1);
  assert.equal(s.total.unplaced, 0);
});

test("pay band", () => {
  assert.equal(salaryBand({ salaryMin: 0, salaryMax: 0 }), null);
  assert.deepEqual(salaryBand({ salaryMin: 1000, salaryMax: 0 }), [1000, 1000]);
  assert.deepEqual(salaryBand({ salaryMin: 1000, salaryMax: 1500 }), [1000, 1500]);
  const units = [unit("a", "Maliyyə", "", "Mühasib", 1, { salaryMin: 1000, salaryMax: 1500 })];
  const p = person("1", "Maliyyə", "", "Mühasib");
  assert.equal(checkSalary(units, p, 1200), "");
  assert.match(checkSalary(units, p, 1800), /1000–1500 AZN/);
  assert.match(checkSalary(units, p, 900), /təyin etmək olmaz/);
  assert.equal(checkSalary(units, person("2", "Maliyyə", "", "Kuryer"), 300), "");
  assert.equal(checkSalary(units, p, 0), "");
  const fixed = [unit("a", "Maliyyə", "", "Mühasib", 1, { salaryMin: 1000 })];
  assert.match(checkSalary(fixed, p, 1100), /1000 AZN/);
});

test("rate", () => {
  assert.equal(normalizeRate(0.5), 0.5);
  assert.equal(normalizeRate(0.3), 1);
  assert.equal(normalizeRate("0.25"), 0.25);
});

import { parseStaffRows, parseStructureRows, parseRateCell, STAFF_TEMPLATE_HEADERS, STAFF_TEMPLATE_EXAMPLE } from "../lib/staff-import.ts";
test("staff rows carry the rate and the pay band", () => {
  assert.equal(parseRateCell(""), 1);
  assert.equal(parseRateCell("yarım"), 0.5);
  assert.equal(parseRateCell("1/4"), 0.25);
  assert.equal(parseRateCell("0,75"), 0.75);
  assert.equal(parseRateCell("50%"), 0.5);
  assert.equal(parseRateCell("0.3"), 0);
  const r = parseStaffRows([STAFF_TEMPLATE_HEADERS, STAFF_TEMPLATE_EXAMPLE, ["IT", "", "Proqramçı", "2", "yarım", "1000", "", ""], ["IT", "", "Test", "1", "0.3", "", "", ""]]);
  assert.equal(r.rows.length, 2);
  assert.deepEqual([r.rows[0].rate, r.rows[0].salary, r.rows[0].salaryMax], [1, 2500, 3000]);
  assert.deepEqual([r.rows[1].rate, r.rows[1].salary, r.rows[1].salaryMax], [0.5, 1000, 1000]);
  assert.equal(r.issues.length, 1);
});
test("structure rows", () => {
  const r = parseStructureRows([["Departament", "Şöbə"], ["Maliyyə", "Mühasibat"], ["Maliyyə", ""], ["", "Boş"]]);
  assert.equal(r.rows.length, 2);
  assert.equal(r.issues.length, 1);
});

import { bandConflicts, conflictMessage } from "../lib/staff-plan.ts";
test("people paid outside the band of their row are found, with a message that names them", () => {
  const units = [unit("a", "Maliyyə", "Müasibtliq", "Baş mühasib", 1, { salaryMin: 3500 }), unit("b", "Maliyyə", "", "Mühasib", 2, { salaryMin: 1000, salaryMax: 1500 })];
  const people = [
    person("1", "Maliyyə", "Müasibtliq", "Baş mühasib", { name: "Aysel", gross: 2800 }),
    person("2", "Maliyyə", "Müasibtliq", "Baş mühasib", { name: "Nəmizəd", gross: 2500 }),
    person("3", "Maliyyə", "", "Mühasib", { name: "Orxan", gross: 1200 }),
    person("4", "Maliyyə", "", "Mühasib", { name: "Nigar", gross: 2000 }),
    person("5", "IT", "", "Proqramçı", { name: "Kənar", gross: 99999 }),
  ];
  const found = bandConflicts(units, people);
  assert.deepEqual(found.map((c) => [c.person.id, c.side]).sort(), [["1", "below"], ["2", "below"], ["4", "above"]]);
  const text = conflictMessage(found.filter((c) => c.unit.id === "a"));
  assert.match(text, /Baş mühasib/);
  assert.match(text, /3500 AZN/);
  assert.match(text, /Aysel — 2800 AZN \(həddən aşağı\)/);
  assert.deepEqual(bandConflicts([unit("a", "X", "", "Y", 1)], [person("1", "X", "", "Y", { gross: 5 })]), []);
});
