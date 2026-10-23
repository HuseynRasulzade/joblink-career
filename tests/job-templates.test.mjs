import test from "node:test";
import assert from "node:assert/strict";
import { cleanTemplateName, copyableJob, draftFromContent } from "../lib/job-templates.ts";

const job = {
  id: "old", owner: "c1", title: "Mühasib", company: "FBCO", city: "Bakı", mode: "Ofisdə", type: "Tam ştat", category: "Maliyyə",
  minSalary: 1200, maxSalary: 1800, minYears: 2, maxYears: 5, skills: ["Excel", "1C"], description: "Təsvir", requirements: "Tələblər",
  deadline: "2026-12-31", created: "2026-01-01", status: "published", demo: false, reason: "replacement", reasonNote: "Ayrılan işçi",
  stages: ["HR", "Texniki"], companyVerified: true, approval: { requestedBy: "u1" }, createdBy: "u1",
};

test("only reusable content is copied", () => {
  const copy = copyableJob(job);
  assert.equal(copy.title, "Mühasib");
  assert.deepEqual(copy.stages, ["HR", "Texniki"]);
  for (const key of ["id", "owner", "deadline", "created", "status", "reason", "reasonNote", "companyVerified", "approval", "createdBy"]) assert.equal(key in copy, false, key);
});
test("the copy does not share arrays with the original", () => {
  const copy = copyableJob(job);
  copy.skills.push("SAP");
  assert.deepEqual(job.skills, ["Excel", "1C"]);
});
test("a draft gets a new id, no deadline and no reason", () => {
  const d = draftFromContent(job, { id: "new", owner: "c1", now: "2026-10-23T00:00:00Z" });
  assert.equal(d.id, "new");
  assert.equal(d.status, "draft");
  assert.equal(d.deadline, "");
  assert.equal(d.reason, "");
  assert.equal(d.created, "2026-10-23T00:00:00Z");
  assert.equal(d.title, "Mühasib");
  assert.equal(d.demo, false);
});
test("template names are trimmed and limited", () => {
  assert.equal(cleanTemplateName("  Satış   meneceri "), "Satış meneceri");
  assert.equal(cleanTemplateName("x".repeat(200)).length, 80);
  assert.equal(cleanTemplateName(null), "");
});
