import test from "node:test";
import assert from "node:assert/strict";
import { staffPlanCsv, tokenHash, newFeedToken } from "../lib/report-feed.ts";

const unit = (id, extra = {}) => ({ id, branch: "", department: "Maliyyə", section: "Mühasibat", position: "Mühasib", planned: 2, rate: 1, salaryMin: 800, salaryMax: 1200, level: "", startMonth: "", endMonth: "", ...extra });

test("the feed CSV has the plan rows, the free places, no names, and quotes what needs quoting", () => {
  const csv = staffPlanCsv([unit("a"), unit("b", { position: "Baş, mühasib", level: "Böyük (Senior)", startMonth: "2027-03", planned: 1 })], [{ id: "p1", name: "Gizli Ad", department: "Maliyyə", section: "Mühasibat", position: "Mühasib", gross: 900, status: "active" }], "2026-11");
  const lines = csv.replace("﻿", "").trim().split("\r\n");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^Filial,Departament/);
  assert.match(lines[1], /Baş ofis,Maliyyə,Mühasibat,Mühasib,,Tam ştat,2,,,800,1200,1,1,\d+,bəli$/);
  assert.match(lines[2], /"Baş, mühasib"/);
  assert.match(lines[2], /xeyr$/); // starts in 2027-03: not active in 2026-11
  assert.ok(!csv.includes("Gizli Ad") && !csv.includes("900"));
});
test("a token is long, unique and stored only as a hash", async () => {
  const a = newFeedToken(), b = newFeedToken();
  assert.ok(a.startsWith("jmr_") && a.length > 40 && a !== b);
  const h = await tokenHash(a);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(h, await tokenHash(a));
  assert.ok(!h.includes(a));
});
