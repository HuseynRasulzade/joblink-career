// Employer tests: snapshots, answers, manual review and expiry.
import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanAnswers,
  combinedScore,
  isExpired,
  parseSnapshot,
  reviewState,
  sanitizeGrades,
  scoreAnswers,
  sanitizeQuestions,
} from "../lib/assessments.ts";

const questions = sanitizeQuestions([
  { id: "q1", type: "single", text: "Aktiv hansıdır?", options: ["Kassa", "Kredit borcu"], correct: [0], points: 2 },
  { id: "q2", type: "multiple", text: "Hansılar aktivdir?", options: ["Kassa", "Debitor", "Kredit"], correct: [0, 1], points: 3 },
  { id: "q3", type: "text", text: "1C-də nə edirsiniz?", points: 5 },
  { id: "q4", type: "text", text: "Öz sözlərinizlə izah edin", points: 2 },
]);

test("answers are cleaned to the shape each question expects", () => {
  const raw = { q1: "1", q2: [0, 1, 9, "x"], q3: "  uçot  ", q4: 42, other: "ignored" };
  assert.deepEqual(cleanAnswers(questions, raw), { q1: 1, q2: [0, 1], q3: "uçot", q4: "" });
  assert.deepEqual(cleanAnswers(questions, null), { q1: -1, q2: [], q3: "", q4: "" });
  assert.equal(cleanAnswers(questions, { q3: "a".repeat(5000) }).q3.length, 4000);
});

test("choice questions are scored at once and unanswered ones score nothing", () => {
  assert.deepEqual(scoreAnswers(questions, cleanAnswers(questions, { q1: 0, q2: [0, 1] })), { score: 5, max: 5 });
  assert.deepEqual(scoreAnswers(questions, cleanAnswers(questions, { q1: 1, q2: [0] })), { score: 0, max: 5 });
  assert.deepEqual(scoreAnswers(questions, cleanAnswers(questions, {})), { score: 0, max: 5 });
});

test("grades stay within each open question's points and only cover open questions", () => {
  assert.deepEqual(sanitizeGrades(questions, { q3: 4, q4: 9, q1: 2, nope: 1 }), { q3: 4, q4: 2 });
  assert.deepEqual(sanitizeGrades(questions, { q3: -3 }), { q3: 0 });
  assert.deepEqual(sanitizeGrades(questions, { q3: "" }), {});
  assert.deepEqual(sanitizeGrades(questions, null), {});
});

test("review state and the combined score", () => {
  const answers = cleanAnswers(questions, { q1: 0, q2: [0, 1], q3: "x", q4: "y" });
  assert.equal(reviewState(questions, {}), "pending");
  assert.equal(reviewState(questions, { q3: 4 }), "pending");
  assert.equal(reviewState(questions, { q3: 4, q4: 1 }), "done");
  assert.deepEqual(combinedScore(questions, answers, {}), { score: 5, max: 5, state: "pending" });
  assert.deepEqual(combinedScore(questions, answers, { q3: 4 }), { score: 5, max: 5, state: "pending" });
  assert.deepEqual(combinedScore(questions, answers, { q3: 4, q4: 1 }), { score: 10, max: 12, state: "done" });
  const choiceOnly = questions.filter((q) => q.type !== "text");
  assert.equal(reviewState(choiceOnly, {}), "");
  assert.deepEqual(combinedScore(choiceOnly, cleanAnswers(choiceOnly, { q1: 0, q2: [0, 1] }), {}), { score: 5, max: 5, state: "" });
});

test("a snapshot survives edits of the original and unreadable ones are ignored", () => {
  const snapshot = { title: "T", instructions: "", durationMin: 10, passingScore: 50, questions };
  const stored = JSON.stringify(snapshot);
  questions[0].correct = [1]; // the employer edits the live test afterwards
  const parsed = parseSnapshot(stored);
  assert.deepEqual(parsed.questions[0].correct, [0]);
  assert.equal(parseSnapshot(""), null);
  assert.equal(parseSnapshot("{broken"), null);
  assert.equal(parseSnapshot('{"title":"x"}'), null);
  questions[0].correct = [0];
});

test("a test is closed one minute after its deadline", () => {
  const deadline = "2026-11-10T12:00:00.000Z";
  assert.equal(isExpired(deadline, Date.parse("2026-11-10T12:00:59Z")), false);
  assert.equal(isExpired(deadline, Date.parse("2026-11-10T12:01:01Z")), true);
  assert.equal(isExpired("", Date.now()), false);
});
