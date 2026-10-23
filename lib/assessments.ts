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
export type TestSnapshot = { title: string; instructions: string; durationMin: number; passingScore: number; questions: Question[]; showResult?: boolean; onPass?: string; onFail?: string };

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

// Each candidate gets the questions in a different, but stable, order (seeded by the
// assignment), which makes copying answers between candidates harder.
export function shuffleQuestions<T extends { id: string }>(questions: T[], seed: string): T[] {
  const hash = (text: string) => {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619) >>> 0;
    return h;
  };
  return [...questions].sort((a, b) => hash(seed + a.id) - hash(seed + b.id));
}

// CSV import: type;text;option1|option2;correct (1-based, several separated by |);points
export function parseQuestionCsv(input: string): Question[] {
  const out: Question[] = [];
  for (const line of input.split(/\r?\n/)) {
    const cells = line.split(";").map((c) => c.trim());
    if (cells.length < 2 || !cells[1] || /^(type|tip)$/i.test(cells[0])) continue;
    const kind = cells[0].toLowerCase();
    const type: QuestionType = kind.startsWith("m") ? "multiple" : kind.startsWith("t") || kind.startsWith("a") ? "text" : "single";
    const options = type === "text" ? [] : (cells[2] || "").split("|").map((o) => o.trim()).filter(Boolean);
    const correct = type === "text" ? [] : (cells[3] || "1").split("|").map((n) => Number(n) - 1).filter((n) => Number.isInteger(n) && n >= 0 && n < options.length);
    if (type !== "text" && (options.length < 2 || !correct.length)) continue;
    out.push({ id: crypto.randomUUID().slice(0, 8), type, text: cells[1], options, correct: type === "single" ? correct.slice(0, 1) : correct, points: Math.max(1, Math.min(20, Number(cells[4]) || 1)) });
  }
  return out.slice(0, 60);
}

// ---- Results: percent, pass / fail and a summary for one test ----
// What an application does once a test is fully graded. Both actions are opt-in per test.
export function outcomeTarget(
  copy: { passingScore: number; onPass?: string; onFail?: string },
  score: number,
  max: number,
  status: string,
): string | null {
  const percent = percentOf(score, max);
  if (percent === null) return null;
  if (percent >= copy.passingScore) return copy.onPass === "review" && status === "Göndərildi" ? "Baxışda" : null;
  return copy.onFail === "reject" && ["Göndərildi", "Baxışda"].includes(status) ? "Uyğun deyil" : null;
}

// Which choice questions are missed most: grouped by question text across the finished attempts.
export type QuestionStat = { text: string; attempts: number; correct: number; percent: number };
export function questionStats(attempts: { questions: Question[]; answers: Record<string, unknown> }[]): QuestionStat[] {
  const byText = new Map<string, { attempts: number; correct: number }>();
  for (const attempt of attempts) {
    for (const q of attempt.questions) {
      if (q.type === "text") continue;
      const hit = scoreAnswers([q], attempt.answers).score > 0;
      const entry = byText.get(q.text) || { attempts: 0, correct: 0 };
      entry.attempts += 1;
      entry.correct += hit ? 1 : 0;
      byText.set(q.text, entry);
    }
  }
  return [...byText.entries()]
    .map(([text, v]) => ({ text, ...v, percent: Math.round((v.correct / v.attempts) * 100) }))
    .sort((a, b) => a.percent - b.percent || b.attempts - a.attempts);
}

export const percentOf = (score: number, max: number) => (max > 0 ? Math.round((score / max) * 100) : null);

export type ResultRow = { status: string; score: number; max_score: number; review_status: string; passingScore: number };
// Pass or fail is decided only after open answers are graded and the test was handed in.
export function resultState(row: ResultRow): "pending" | "passed" | "failed" | "none" {
  if (!["submitted", "expired"].includes(row.status)) return "none";
  if (row.review_status === "pending") return "pending";
  const percent = percentOf(row.score, row.max_score);
  if (percent === null) return "none";
  return percent >= row.passingScore ? "passed" : "failed";
}

export function summarizeResults(rows: ResultRow[]) {
  const states = rows.map(resultState);
  const finished = rows.filter((_, i) => states[i] === "passed" || states[i] === "failed");
  const percents = finished.map((r) => percentOf(r.score, r.max_score) as number);
  return {
    assigned: rows.length,
    submitted: rows.filter((r) => ["submitted", "expired"].includes(r.status)).length,
    pending: states.filter((s) => s === "pending").length,
    passed: states.filter((s) => s === "passed").length,
    failed: states.filter((s) => s === "failed").length,
    average: percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : null,
  };
}
