import assert from "node:assert/strict";
import test from "node:test";
import { skillsInText } from "../lib/cv-skills.ts";

test("skills named in CV duties are found in the catalog", () => {
  const found = skillsInText(
    "Büdcələşdirmənin aparılması, debitor və kreditor uçotu, 1C 8.3 proqramında işləmək, Excel-də pivot cədvəllər, SQL sorğuları, Power BI dashboardlar.",
  );
  for (const skill of ["Büdcələşdirmə", "Debitor və kreditor uçotu", "1C", "Microsoft Excel", "SQL", "Power BI"])
    assert.ok(found.includes(skill), `${skill} in ${found.join(", ")}`);
});

test("plans to learn a skill and look-alike words are not evidence", () => {
  const found = skillsInText("Planlaşdırıram SAP öyrənmək. Email yazışmaları, mail göndərmək, mailing siyahısı.");
  assert.ok(!found.includes("SAP"));
  assert.ok(!found.includes("Süni intellekt"));
});
