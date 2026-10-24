import test from "node:test";
import assert from "node:assert/strict";
import { blankProfile } from "../lib/model.ts";
import { tailorProfile } from "../lib/cv-tailor.ts";

const profile = { ...blankProfile, name: "Aysel", title: "Mühasib", skills: ["Photoshop", "Excel", "1C", "Ünsiyyət"], experiences: [], education: [] };
const job = { id: "j", owner: "o", title: "Mühasib", company: "Alfa", city: "Bakı", mode: "Ofisdə", type: "Tam ştat", category: "Maliyyə", minSalary: 0, maxSalary: 0, minYears: 0, maxYears: 3, skills: ["Excel", "1C", "Vergi uçotu"], description: "x".repeat(80), requirements: "", created: "2026-10-01", demo: false, status: "published" };

test("the vacancy's skills come first and nothing is added or lost", () => {
  const t = tailorProfile(profile, job);
  assert.deepEqual(t.profile.skills.slice(0, 2).sort(), ["1C", "Excel"]);
  assert.deepEqual([...t.profile.skills].sort(), [...profile.skills].sort());
  assert.ok(t.missing.length >= 1);
  assert.equal(t.profile.name, profile.name);
  assert.deepEqual(profile.skills, ["Photoshop", "Excel", "1C", "Ünsiyyət"]);
});
