import test from "node:test";
import assert from "node:assert/strict";
import { bandOf, cleanScore, cycleScore, progressScore } from "../lib/performance.ts";
import { shiftHours, validTime } from "../lib/shifts.ts";
import { settleTrip, tripDays } from "../lib/trips.ts";
import { cleanQuestions, cleanSurveyAnswers, enps } from "../lib/survey.ts";

test("cycle score is the weighted mean, progress standing in for a missing score", () => {
  assert.equal(cleanScore("4"), 4);
  assert.equal(cleanScore("9"), null);
  assert.equal(progressScore(100), 5);
  assert.equal(progressScore(0), 1);
  const r = cycleScore([{ weight: 3, progress: 100, score: 4 }, { weight: 1, progress: 50, score: null }]);
  assert.equal(r.score, Math.round(((3 * 4 + 1 * 3) / 4) * 100) / 100);
  assert.equal(r.scored, 1);
  assert.equal(bandOf(4.6), "Əla");
  assert.equal(bandOf(null), "");
});
test("shift length and night part, also across midnight", () => {
  assert.deepEqual(shiftHours("09:00", "18:00"), { hours: 9, night: 0 });
  assert.deepEqual(shiftHours("22:00", "06:00"), { hours: 8, night: 8 });
  assert.deepEqual(shiftHours("18:00", "02:00"), { hours: 8, night: 4 });
  assert.equal(validTime("25:00"), false);
});
test("a trip is settled from the allowance, the expenses and the advance", () => {
  assert.equal(tripDays("2026-03-02", "2026-03-04"), 3);
  assert.equal(tripDays("2026-03-04", "2026-03-02"), 0);
  assert.deepEqual(settleTrip({ dailyCents: 5000, days: 3, expensesCents: 20000, advanceCents: 40000 }), { perDiem: 15000, expenses: 20000, total: 35000, advance: 40000, balance: -5000 });
});
test("eNPS and survey answers", () => {
  assert.deepEqual(enps([10, 9, 8, 6, 2]), { count: 5, promoters: 2, passives: 1, detractors: 2, score: 0 });
  assert.equal(enps([]).score, null);
  const qs = cleanQuestions([{ label: "Rəhbər kömək edir?", kind: "yesno" }, { label: "x", kind: "text" }]);
  assert.equal(qs.length, 1);
  assert.deepEqual(cleanSurveyAnswers(qs, { q1: "yes", q2: "no" }), { q1: "yes" });
});

import { cleanReferenceAnswers, referenceScore } from "../lib/references.ts";
test("a reference check is scored from the 1–5 answers", () => {
  const a = cleanReferenceAnswers({ results: "5", teamwork: "4", reliability: "9", rehire: "yes", strengths: "  çalışqan  ", x: "1" });
  assert.deepEqual(a, { results: "5", teamwork: "4", rehire: "yes", strengths: "çalışqan" });
  assert.deepEqual(referenceScore(a), { score: 4.5, reading: "Müsbət rəy" });
  assert.match(referenceScore({ results: "5", rehire: "no" }).reading, /işə götürməzdi/);
  assert.equal(referenceScore({}).score, null);
});
