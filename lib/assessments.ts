// Employer tests: question model, sanitizing and scoring (server and UI).
export type QuestionType = "single" | "multiple" | "text";
export type Question = {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correct: number[];
  points: number;
};
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().replace(/\s+\n/g, "\n").slice(0, max) : "";

export function sanitizeQuestions(value: unknown): Question[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 60).flatMap((item, index): Question[] => {
    if (!item || typeof item !== "object") return [];
    const q = item as Record<string, unknown>;
    const type: QuestionType = q.type === "multiple" ? "multiple" : q.type === "text" ? "text" : "single";
    const text = clean(q.text, 1500);
    if (!text) return [];
    const options = type === "text" ? [] : (Array.isArray(q.options) ? q.options : []).map((o) => clean(o, 300)).filter(Boolean).slice(0, 8);
    if (type !== "text" && options.length < 2) return [];
    const correct = type === "text"
      ? []
      : [...new Set((Array.isArray(q.correct) ? q.correct : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < options.length))];
    if (type === "single" && correct.length !== 1) return [];
    if (type === "multiple" && !correct.length) return [];
    return [{
      id: clean(q.id, 60) || `q${index + 1}`,
      type,
      text,
      options,
      correct: type === "single" ? correct.slice(0, 1) : correct,
      points: Math.max(1, Math.min(20, Math.round(Number(q.points) || 1))),
    }];
  });
}

// Questions as shown to a candidate: never include the answer key.
export function publicQuestions(questions: Question[]) {
  return questions.map(({ correct: _correct, ...rest }) => {
    void _correct;
    return rest;
  });
}

// Choice questions are scored automatically; text answers wait for review.
export function scoreAnswers(questions: Question[], answers: Record<string, unknown>) {
  let score = 0;
  let max = 0;
  for (const q of questions) {
    if (q.type === "text") continue;
    max += q.points;
    const given = Array.isArray(answers[q.id]) ? (answers[q.id] as unknown[]).map(Number).sort() : [Number(answers[q.id])];
    const expected = [...q.correct].sort();
    if (given.length === expected.length && given.every((value, i) => value === expected[i])) score += q.points;
  }
  return { score, max };
}

// ---- Snapshot, answers and manual review ----
// A test is copied into the assignment when it is sent, so editing the test
// afterwards never changes what a candidate sees or how it is scored.
export type TestSnapshot = { title: string; instructions: string; durationMin: number; passingScore: number; questions: Question[] };

export function parseSnapshot(raw: string): TestSnapshot | null {
  try {
    const value = JSON.parse(raw) as TestSnapshot;
    return value && Array.isArray(value.questions) ? value : null;
  } catch {
    return null;
  }
}

// Answers as stored: only known question ids, in the shape each question expects.
export function cleanAnswers(questions: Question[], raw: unknown): Record<string, unknown> {
  const answers = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const clean: Record<string, unknown> = {};
  for (const q of questions) {
    const value = answers[q.id];
    clean[q.id] =
      q.type === "text"
        ? clean_text(value)
        : q.type === "multiple"
          ? Array.isArray(value) ? value.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < q.options.length) : []
          : Number.isInteger(Number(value)) && value !== "" && value !== null && value !== undefined ? Number(value) : -1;
  }
  return clean;
}
const clean_text = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 4000) : "");

export const textQuestions = (questions: Question[]) => questions.filter((q) => q.type === "text");

// Points an employer may give to each open question, within the question's own maximum.
export function sanitizeGrades(questions: Question[], grades: unknown): Record<string, number> {
  const given = grades && typeof grades === "object" ? (grades as Record<string, unknown>) : {};
  const out: Record<string, number> = {};
  for (const q of textQuestions(questions)) {
    if (given[q.id] === undefined || given[q.id] === null || given[q.id] === "") continue;
    const n = Math.round(Number(given[q.id]));
    if (Number.isFinite(n)) out[q.id] = Math.max(0, Math.min(q.points, n));
  }
  return out;
}
// "" when there are no open questions, "pending" until every one is graded, then "done".
export function reviewState(questions: Question[], manual: Record<string, number>) {
  const open = textQuestions(questions);
  if (!open.length) return "";
  return open.every((q) => typeof manual[q.id] === "number") ? "done" : "pending";
}
// The recorded score: choice questions at once, open questions once all are graded.
export function combinedScore(questions: Question[], answers: Record<string, unknown>, manual: Record<string, number>) {
  const auto = scoreAnswers(questions, answers);
  const state = reviewState(questions, manual);
  if (state !== "done") return { ...auto, state };
  const text = textQuestions(questions);
  return {
    score: auto.score + text.reduce((sum, q) => sum + (manual[q.id] || 0), 0),
    max: auto.max + text.reduce((sum, q) => sum + q.points, 0),
    state,
  };
}
export const GRACE_MS = 60_000;
export const isExpired = (deadlineAt: string, now = Date.now()) => !!deadlineAt && now > Date.parse(deadlineAt) + GRACE_MS;
