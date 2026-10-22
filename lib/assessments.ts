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
