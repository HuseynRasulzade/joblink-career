// Measuring the AI from employer feedback.
import assert from "node:assert/strict";
import test from "node:test";
import { feedbackCsv, normalizeDecision, recommendationForScore, summarizeFeedback } from "../lib/ai-eval.ts";

const row = (extra) => ({
  kind: "rank", ai_score: 80, rule_score: 70, ai_recommendation: "interview", verdict: "right",
  hr_decision: "", hr_score: null, note: "", created: "2026-10-27T10:00:00Z", ...extra,
});

test("agreement is the share of evaluations marked right, in total and per recommendation", () => {
  const s = summarizeFeedback([
    row({}),
    row({}),
    row({ verdict: "wrong", hr_decision: "reject", note: "Sahə uyğun deyil", created: "2026-10-28T10:00:00Z" }),
    row({ ai_recommendation: "reject", ai_score: 20 }),
  ]);
  assert.equal(s.total, 4);
  assert.equal(s.agreement, 75);
  assert.equal(s.byRecommendation.interview.total, 3);
  assert.equal(s.byRecommendation.interview.agreement, 67);
  assert.equal(s.byRecommendation.reject.agreement, 100);
  assert.equal(s.byRecommendation.consider.agreement, null);
  assert.equal(s.recentWrong[0].note, "Sahə uyğun deyil");
});

test("the confusion table counts what the employer decided against what the AI said", () => {
  const s = summarizeFeedback([
    row({}),
    row({ verdict: "wrong", hr_decision: "reject" }),
    row({ verdict: "wrong", hr_decision: "reject" }),
    row({ verdict: "wrong", hr_decision: "" }),
  ]);
  assert.deepEqual(s.confusion, { interview: { interview: 1, reject: 2 } });
});

test("score errors compare the AI and the plain rules with the employer's own score", () => {
  const s = summarizeFeedback([
    row({ verdict: "wrong", ai_score: 80, rule_score: 60, hr_score: 70 }),
    row({ verdict: "wrong", ai_score: 40, rule_score: 80, hr_score: 50 }),
  ]);
  assert.equal(s.scoreError.n, 2);
  assert.equal(s.scoreError.aiMeanAbs, 10);
  assert.equal(s.scoreError.ruleMeanAbs, 20);
  assert.equal(s.aiBeatsRules, true);
  assert.equal(summarizeFeedback([row({})]).aiBeatsRules, null);
});

test("an evaluation with only a score implies a recommendation, and decisions are checked", () => {
  assert.equal(recommendationForScore(80), "interview");
  assert.equal(recommendationForScore(60), "consider");
  assert.equal(recommendationForScore(30), "reject");
  assert.equal(normalizeDecision("interview"), "interview");
  assert.equal(normalizeDecision("hire"), "");
});

test("the export is CSV with quoted text", () => {
  const csv = feedbackCsv([{ ...row({ note: 'Dedi: "yox"' }), job_id: "j1", candidate_id: "c1" }]);
  assert.ok(csv.split("\n")[0].startsWith("kind,job_id,candidate_id"));
  assert.ok(csv.includes('"Dedi: ""yox"""'));
});
