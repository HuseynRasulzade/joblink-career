// Prints how often the AI was right, from the CSV exported in the admin panel
// ("AI istifadə və xərc" → "Rəyləri CSV kimi yüklə").
//   node --experimental-strip-types scripts/ai-eval.mjs ai-feedback-2026-11-01.csv
import { readFileSync } from "node:fs";
import { summarizeFeedback } from "../lib/ai-eval.ts";

const file = process.argv[2];
if (!file) {
  console.error("İstifadə: node --experimental-strip-types scripts/ai-eval.mjs <fayl.csv>");
  process.exit(1);
}
// Minimal CSV reader for the quoted format the export writes.
function parse(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const [head, ...body] = parse(readFileSync(file, "utf8").replace(/^﻿/, ""));
const rows = body.filter((r) => r.length === head.length).map((r) => {
  const o = Object.fromEntries(head.map((h, i) => [h, r[i]]));
  return { ...o, ai_score: Number(o.ai_score), rule_score: Number(o.rule_score), hr_score: o.hr_score === "" ? null : Number(o.hr_score) };
});
const s = summarizeFeedback(rows);
console.log(`Rəy: ${s.total}, AI düz deyib: ${s.agreement ?? "—"}%`);
for (const [rec, v] of Object.entries(s.byRecommendation)) console.log(`  ${rec.padEnd(10)} ${v.total} rəy, uyğunluq ${v.agreement ?? "—"}%`);
console.log("Qarışıqlıq cədvəli (AI → işəgötürən):", JSON.stringify(s.confusion));
console.log(`Bal səhvi: AI ${s.scoreError.aiMeanAbs ?? "—"}, qaydalar ${s.scoreError.ruleMeanAbs ?? "—"} (${s.scoreError.n} bal)`);
if (s.aiBeatsRules !== null) console.log(s.aiBeatsRules ? "AI qaydalardan dəqiqdir." : "Qaydalar AI-dən dəqiqdir: AI təlimatını yoxlayın.");
console.log("Son yanlışlar:");
for (const w of s.recentWrong.slice(0, 10)) console.log(`  AI ${w.aiRecommendation}/${w.aiScore} → ${w.hrDecision || "?"}${w.hrScore !== null ? "/" + w.hrScore : ""}: ${w.note}`);
