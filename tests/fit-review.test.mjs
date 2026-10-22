import test from "node:test";
import assert from "node:assert/strict";
import { sampleProfile, sampleJobs, match } from "../lib/model.ts";
import { fitFacts, validateFitReview, verdictForScore } from "../lib/fit-review.ts";

const job = sampleJobs[0];
const rule = match(sampleProfile, job);
const facts = fitFacts(sampleProfile, job, rule);
const duty = sampleProfile.experiences.find((e) => e.description)?.description.split("\n")[0] || "";
const answer = (over = {}) => ({
  headline: "Sahəyə uyğun təcrübəli namizəd",
  summary: "Namizədin təcrübəsi vakansiyanın əsas tapşırıqları ilə üst-üstə düşür və əsas bacarıqlar iş təcrübəsində göstərilib.",
  strengths: [{ point: "Uyğun iş təcrübəsi", evidence: sampleProfile.experiences[0].title }],
  gaps: [{ point: "Rəhbərlik təcrübəsi göstərilməyib", severity: "minor", howToClose: "Komanda idarəetməsi təcrübəsi qazanın." }],
  questions: ["Ən böyük layihənizdə rolunuz nə idi?"],
  scoreAdjustment: { points: 0, reason: "" },
  ...over,
});

test("verdict follows the final score", () => {
  assert.equal(verdictForScore(85), "strong");
  assert.equal(verdictForScore(60), "good");
  assert.equal(verdictForScore(40), "partial");
  assert.equal(verdictForScore(39), "weak");
});

test("facts sent to the model contain no personal identifiers", () => {
  const sent = JSON.stringify(facts);
  assert.ok(!sent.includes(sampleProfile.name));
  assert.ok(!sent.includes(sampleProfile.email));
  if (sampleProfile.phone) assert.ok(!sent.includes(sampleProfile.phone));
});

test("a valid answer is accepted and the verdict is derived from the score", () => {
  const review = validateFitReview(answer(), rule, facts);
  assert.ok(review);
  assert.equal(review.score, rule.score);
  assert.equal(review.verdict, verdictForScore(review.score));
});

test("a strength whose quote is not in the candidate data is dropped", () => {
  const review = validateFitReview(
    answer({ strengths: [
      { point: "Real nümunə", evidence: sampleProfile.experiences[0].title },
      { point: "Uydurma iddia", evidence: "Harvard MBA, 15 il CFO" },
    ] }),
    rule,
    facts,
  );
  assert.ok(review);
  assert.equal(review.strengths.length, 1);
  assert.equal(review.strengths[0].point, "Real nümunə");
});

test("a gap that calls an evidenced skill missing is dropped", () => {
  const skill = rule.skillEvidence.find((x) => ["experience", "certified", "declared"].includes(x.level))?.skill;
  assert.ok(skill);
  const review = validateFitReview(
    answer({ gaps: [
      { point: `${skill} bacarığı yoxdur`, severity: "critical", howToClose: "Öyrənin" },
      { point: "Rəhbərlik təcrübəsi göstərilməyib", severity: "minor", howToClose: "" },
    ] }),
    rule,
    facts,
  );
  assert.ok(review);
  assert.ok(review.gaps.every((g) => !g.point.includes(skill)));
});

test("the score adjustment is limited to ±10 and needs a reason to rise", () => {
  const up = validateFitReview(answer({ scoreAdjustment: { points: 40, reason: "Güclü uyğunluq" } }), { ...rule, score: 70, caps: [] }, facts);
  assert.equal(up.score, 80);
  const noReason = validateFitReview(answer({ scoreAdjustment: { points: 8, reason: "" } }), { ...rule, score: 70, caps: [] }, facts);
  assert.equal(noReason.score, 70);
  const down = validateFitReview(answer({ scoreAdjustment: { points: -40, reason: "Dərinlik yoxdur" } }), { ...rule, score: 70, caps: [] }, facts);
  assert.equal(down.score, 60);
});

test("the model cannot raise a score past a platform limit", () => {
  const capped = validateFitReview(
    answer({ scoreAdjustment: { points: 10, reason: "Güclü" } }),
    { ...rule, score: 70, caps: ["missing-certification"] },
    facts,
  );
  assert.equal(capped.score, 70);
});

test("malformed or empty answers are rejected", () => {
  assert.equal(validateFitReview(null, rule, facts), null);
  assert.equal(validateFitReview(answer({ summary: "qısa" }), rule, facts), null);
  assert.equal(validateFitReview(answer({ strengths: [{ point: "x uydurma", evidence: "yoxdur" }], gaps: [] }), rule, facts), null);
});
