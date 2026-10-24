import test from "node:test";
import assert from "node:assert/strict";
import { parseSkillCsv } from "../lib/skill-import.ts";

test("skills are read from semicolon lines with a header allowed", () => {
  const { rows, issues } = parseSkillCsv("Ad;Name;Kateqoriya;Category;Sinonimlər\nPython;Python;Proqramlaşdırma;Programming;py|python3\nSQL;SQL;Verilənlər;Data;\n\nQeyri-tam;;Maliyyə;Finance\nPython;Python;X;Y\n");
  assert.deepEqual(rows.map((r) => [r.line, r.label, r.aliases]), [[2, "Python", ["py", "python3"]], [3, "SQL", []]]);
  assert.deepEqual(issues.map((i) => [i.line, i.reason.slice(0, 12)]), [[5, "Ad və kateqo"], [6, "Faylda təkra"]]);
});

test("a long sentence is not a skill and the limit is respected", () => {
  assert.match(parseSkillCsv("Şirkətin bütün mühasibat uçotunu tam şəkildə aparmaq və idarə etmək;x;a;b").issues[0].reason, /qısa/);
  const many = Array.from({ length: 400 }, (_, i) => `Bacarıq ${i};Skill ${i};K;C`).join("\n");
  assert.equal(parseSkillCsv(many).rows.length, 300);
});
