// An interview scorecard: the company's criteria (with weights) are scored 1-5; the weighted mean becomes the interview rating.
export type Criterion = { id: string; label: string; weight: number };
export const DEFAULT_CRITERIA: Criterion[] = [
  { id: "default-skills", label: "Peşəkar bilik və təcrübə", weight: 3 },
  { id: "default-problem", label: "Problem həlli", weight: 2 },
  { id: "default-communication", label: "Ünsiyyət", weight: 2 },
  { id: "default-team", label: "Komandada işləmə", weight: 1 },
  { id: "default-motivation", label: "Motivasiya və uyğunluq", weight: 1 },
];
export const MAX_CRITERIA = 12;

// The criteria a company sends: a clean list (label 2-60 characters, weight 1-5), or an error text.
export function sanitizeCriteria(input: unknown): { id: string; label: string; weight: number }[] | { error: string } {
  if (!Array.isArray(input)) return { error: "Kriteriyalar siyahısı düzgün deyil." };
  if (input.length > MAX_CRITERIA) return { error: `Ən çoxu ${MAX_CRITERIA} kriteriya ola bilər.` };
  const out: { id: string; label: string; weight: number }[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
    const label = typeof r.label === "string" ? r.label.replace(/\s+/g, " ").trim().slice(0, 60) : "";
    if (!label) continue;
    if (label.length < 2) return { error: "Kriteriyanın adı ən azı 2 simvol olmalıdır." };
    const key = label.toLocaleLowerCase("az");
    if (seen.has(key)) return { error: `«${label}» iki dəfə yazılıb.` };
    seen.add(key);
    const weight = Math.round(Number(r.weight));
    out.push({ id: typeof r.id === "string" ? r.id.slice(0, 80) : "", label, weight: Number.isFinite(weight) ? Math.min(5, Math.max(1, weight)) : 1 });
  }
  return out;
}

// Scores of the form {criterionId: 1..5}: only known criteria and whole numbers 1-5 are kept.
export function sanitizeScores(criteria: Criterion[], input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!input || typeof input !== "object") return out;
  for (const c of criteria) {
    const v = Number((input as Record<string, unknown>)[c.id]);
    if (Number.isInteger(v) && v >= 1 && v <= 5) out[c.id] = v;
  }
  return out;
}

// Weighted mean over the criteria that were scored (an unscored criterion does not pull the result down), or null.
export function weightedScore(criteria: Criterion[], scores: Record<string, number>): number | null {
  let sum = 0;
  let weights = 0;
  for (const c of criteria) {
    const v = scores[c.id];
    if (!v) continue;
    sum += v * c.weight;
    weights += c.weight;
  }
  return weights ? Math.round((sum / weights) * 10) / 10 : null;
}
// The whole-number rating (1-5) the interview carries.
export const ratingOf = (mean: number | null) => (mean === null ? null : Math.min(5, Math.max(1, Math.round(mean))));
