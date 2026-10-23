import test from "node:test";
import assert from "node:assert/strict";
import { alertIsEmpty, describeAlert, jobMatchesAlert, sanitizeAlertFilters } from "../lib/job-alerts.ts";

const job = { title: "Baş mühasib", company: "Alfa MMC", city: "Bakı", mode: "Ofisdə", category: "Maliyyə", type: "Tam ştat", minSalary: 1500, maxSalary: 2500, skills: ["Excel", "1C"] };

test("filters are cleaned", () => {
  const f = sanitizeAlertFilters({ query: "  mühasib   excel ", minSalary: "1200.4", city: "Bakı", extra: "x" });
  assert.deepEqual(f, { query: "mühasib excel", city: "Bakı", mode: "", category: "", type: "", minSalary: 1200 });
  assert.equal(alertIsEmpty(sanitizeAlertFilters(null)), true);
  assert.equal(alertIsEmpty(f), false);
});

test("a vacancy matches when every given filter fits", () => {
  const f = (o) => sanitizeAlertFilters(o);
  assert.equal(jobMatchesAlert(job, f({ query: "MÜHASİB excel" })), true);
  assert.equal(jobMatchesAlert(job, f({ query: "proqramçı" })), false);
  assert.equal(jobMatchesAlert(job, f({ city: "Gəncə" })), false);
  assert.equal(jobMatchesAlert(job, f({ city: "Bakı", mode: "Ofisdə", category: "Maliyyə", type: "Tam ştat" })), true);
  assert.equal(jobMatchesAlert(job, f({ minSalary: 2000 })), true);
  assert.equal(jobMatchesAlert(job, f({ minSalary: 3000 })), false);
  assert.equal(jobMatchesAlert({ ...job, minSalary: 0, maxSalary: 0 }, f({ minSalary: 3000 })), true);
});

test("describeAlert names the filters", () => {
  assert.equal(describeAlert(sanitizeAlertFilters({ query: "excel", city: "Bakı", minSalary: 1000 })), "excel · Bakı · 1000+ AZN");
  assert.equal(describeAlert(sanitizeAlertFilters({})), "Bütün vakansiyalar");
});
