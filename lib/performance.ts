// Goals and appraisal: a goal has a weight, a progress and a score from 1 to 5; the cycle score is their weighted mean.
export const RATING_TEXT: Record<number, string> = { 1: "Gözləntidən xeyli aşağı", 2: "Gözləntidən aşağı", 3: "Gözləntiyə uyğun", 4: "Gözləntidən yuxarı", 5: "Əla nəticə" };

export const cleanScore = (v: unknown): number | null => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null;
};

// With no score of the manager yet, the progress stands in for it (100% is a 5).
export const progressScore = (progress: number) => Math.min(5, Math.max(1, Math.round(1 + (Math.max(0, Math.min(100, progress)) / 100) * 4)));

export function cycleScore(goals: { weight: number; progress: number; score: number | null }[]): { score: number | null; scored: number; total: number } {
  const usable = goals.filter((g) => g.weight > 0);
  if (!usable.length) return { score: null, scored: 0, total: 0 };
  const weights = usable.reduce((t, g) => t + g.weight, 0);
  const sum = usable.reduce((t, g) => t + g.weight * (g.score ?? progressScore(g.progress)), 0);
  return { score: Math.round((sum / weights) * 100) / 100, scored: usable.filter((g) => g.score !== null).length, total: usable.length };
}

export const bandOf = (score: number | null) => (score === null ? "" : score >= 4.5 ? "Əla" : score >= 3.5 ? "Yaxşı" : score >= 2.5 ? "Qənaətbəxş" : "Zəif");
