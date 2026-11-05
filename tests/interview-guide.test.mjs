import test from "node:test";
import assert from "node:assert/strict";
import { generatedQuestions, guideFor } from "../lib/interview-guide.ts";

const job = { id: "j1", title: "Baş mühasib", skills: ["Excel", "1C", "Hesabatlılıq"] };
const templates = [
  { id: "t1", name: "Satış meneceri suallar", jobId: "", questions: ["S1"] },
  { id: "t2", name: "Baş mühasib — texniki müsahibə", jobId: "", questions: ["M1", "M2"] },
  { id: "t3", name: "Xüsusi siyahı", jobId: "j1", questions: ["X1"] },
];

test("the list written for the vacancy wins, then a list named after the title, then generated questions", () => {
  assert.deepEqual([guideFor(job, templates).source, guideFor(job, templates).questions], ["linked", ["X1"]]);
  assert.deepEqual([guideFor(job, templates.slice(0, 2)).source, guideFor(job, templates.slice(0, 2)).questions], ["matched", ["M1", "M2"]]);
  const g = guideFor({ id: "j9", title: "Hüquqşünas", skills: ["Müqavilə"] }, templates);
  assert.equal(g.source, "generated");
  assert.ok(g.questions.length >= 5);
});

test("generated questions use the vacancy's skills and never run empty", () => {
  const q = generatedQuestions("Operator", ["Excel", "", "SAP"]);
  assert.ok(q.some((x) => x.includes("«Excel»")) && q.some((x) => x.includes("«SAP»")));
  assert.ok(generatedQuestions("Operator", []).length >= 5);
  assert.equal(q.filter((x) => x.includes("«»")).length, 0);
});
