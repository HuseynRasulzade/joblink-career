// How often the AI is right: employers mark an AI evaluation "right" or "wrong"
// (and may say what the result should have been); these functions turn those
// marks into the numbers used to decide what to change in the AI's instructions.
export const AI_DECISIONS = ["interview", "consider", "reject"] as const;
export type AiDecision = (typeof AI_DECISIONS)[number];
export type FeedbackKind = "rank" | "fit-review";

export type FeedbackRow = {
  kind: FeedbackKind;
  ai_score: number;
  rule_score: number;
  ai_recommendation: string;
  verdict: "right" | "wrong";
  hr_decision: string;
  hr_score: number | null;
  note: string;
  created: string;
};

// The recommendation an evaluation implies when it only has a score.
export const recommendationForScore = (score: number): AiDecision =>
  score >= 75 ? "interview" : score >= 55 ? "consider" : "reject";

export const normalizeDecision = (value: unknown): AiDecision | "" =>
  AI_DECISIONS.includes(value as AiDecision) ? (value as AiDecision) : "";

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : null);

export function summarizeFeedback(rows: FeedbackRow[]) {
  const right = rows.filter((r) => r.verdict === "right").length;
  const byRecommendation = Object.fromEntries(
    AI_DECISIONS.map((rec) => {
      const own = rows.filter((r) => r.ai_recommendation === rec);
      const ok = own.filter((r) => r.verdict === "right").length;
      return [rec, { total: own.length, right: ok, agreement: pct(ok, own.length) }];
    }),
  );
  // What the AI said against what the employer decided (only where the employer said).
  const confusion: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const hr = r.verdict === "right" ? r.ai_recommendation : r.hr_decision;
    if (!AI_DECISIONS.includes(r.ai_recommendation as AiDecision) || !AI_DECISIONS.includes(hr as AiDecision)) continue;
    confusion[r.ai_recommendation] ||= {};
    confusion[r.ai_recommendation][hr] = (confusion[r.ai_recommendation][hr] || 0) + 1;
  }
  const scored = rows.filter((r) => typeof r.hr_score === "number");
  const diffs = scored.map((r) => (r.hr_score as number) - r.ai_score);
  const ruleDiffs = scored.map((r) => (r.hr_score as number) - r.rule_score);
  const mean = (list: number[]) => (list.length ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10 : null);
  const meanAbs = (list: number[]) => mean(list.map(Math.abs));
  return {
    total: rows.length,
    right,
    wrong: rows.length - right,
    agreement: pct(right, rows.length),
    byKind: Object.fromEntries(
      (["rank", "fit-review"] as const).map((kind) => {
        const own = rows.filter((r) => r.kind === kind);
        return [kind, { total: own.length, agreement: pct(own.filter((r) => r.verdict === "right").length, own.length) }];
      }),
    ),
    byRecommendation,
    confusion,
    // Positive = the employer would give more than the AI did.
    scoreError: { n: scored.length, aiMeanAbs: meanAbs(diffs), aiMeanSigned: mean(diffs), ruleMeanAbs: meanAbs(ruleDiffs) },
    // Whether the AI beats the plain rules where the employer gave a score.
    aiBeatsRules: scored.length ? (meanAbs(diffs) as number) < (meanAbs(ruleDiffs) as number) : null,
    recentWrong: rows
      .filter((r) => r.verdict === "wrong")
      .sort((a, b) => (a.created < b.created ? 1 : -1))
      .slice(0, 20)
      .map((r) => ({ kind: r.kind, aiScore: r.ai_score, aiRecommendation: r.ai_recommendation, hrDecision: r.hr_decision, hrScore: r.hr_score, note: r.note, created: r.created })),
  };
}

export const feedbackCsv = (rows: (FeedbackRow & { job_id: string; candidate_id: string })[]) => {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["kind", "job_id", "candidate_id", "ai_score", "rule_score", "ai_recommendation", "verdict", "hr_decision", "hr_score", "note", "created"];
  return [head.join(","), ...rows.map((r) => head.map((h) => cell((r as Record<string, unknown>)[h])).join(","))].join("\n");
};
