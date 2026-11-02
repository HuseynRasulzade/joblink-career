// Surveys: eNPS (0–10 "would you recommend") and the questions of a simple survey.
export type SurveyQuestion = { id: string; label: string; kind: "scale10" | "scale5" | "yesno" | "text" };
export const ENPS_QUESTIONS: SurveyQuestion[] = [
  { id: "enps", label: "Şirkəti iş yeri kimi dostunuza nə dərəcədə tövsiyə edərdiniz? (0–10)", kind: "scale10" },
  { id: "why", label: "Bu qiymətin əsas səbəbi nədir?", kind: "text" },
];
export function cleanQuestions(raw: unknown): SurveyQuestion[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .slice(0, 20)
    .map((q, i) => {
      const o = (q && typeof q === "object" ? q : {}) as Record<string, unknown>;
      const kind = ["scale10", "scale5", "yesno", "text"].includes(String(o.kind)) ? (String(o.kind) as SurveyQuestion["kind"]) : "text";
      return { id: `q${i + 1}`, label: String(o.label ?? "").trim().slice(0, 300), kind };
    })
    .filter((q) => q.label.length >= 3);
}
export function cleanSurveyAnswers(questions: SurveyQuestion[], raw: unknown): Record<string, string> {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const q of questions) {
    const v = String(o[q.id] ?? "").trim().slice(0, q.kind === "text" ? 1000 : 10);
    if (!v) continue;
    if (q.kind === "scale10" && !/^(10|\d)$/.test(v)) continue;
    if (q.kind === "scale5" && !/^[1-5]$/.test(v)) continue;
    if (q.kind === "yesno" && !["yes", "no"].includes(v)) continue;
    out[q.id] = v;
  }
  return out;
}
export function enps(scores: number[]) {
  const valid = scores.filter((n) => Number.isFinite(n) && n >= 0 && n <= 10);
  if (!valid.length) return { count: 0, promoters: 0, passives: 0, detractors: 0, score: null as number | null };
  const promoters = valid.filter((n) => n >= 9).length;
  const detractors = valid.filter((n) => n <= 6).length;
  return { count: valid.length, promoters, passives: valid.length - promoters - detractors, detractors, score: Math.round(((promoters - detractors) / valid.length) * 100) };
}
