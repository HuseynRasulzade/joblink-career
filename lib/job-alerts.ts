// Job alerts: a candidate keeps a filter set and is told when new vacancies match it.
export type AlertFilters = { query: string; city: string; mode: string; category: string; type: string; minSalary: number };
export type AlertJob = { title: string; company: string; city: string; mode: string; category: string; type: string; minSalary: number; maxSalary: number; skills: string[] };

const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");
export function sanitizeAlertFilters(input: unknown): AlertFilters {
  const v = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    query: text(v.query, 100),
    city: text(v.city, 60),
    mode: text(v.mode, 40),
    category: text(v.category, 80),
    type: text(v.type, 40),
    minSalary: Math.max(0, Math.min(100000, Math.round(Number(v.minSalary) || 0))),
  };
}
export const alertIsEmpty = (f: AlertFilters) => !f.query && !f.city && !f.mode && !f.category && !f.type && !f.minSalary;

const fold = (value: string) => value.toLocaleLowerCase("az");
export function jobMatchesAlert(job: AlertJob, f: AlertFilters) {
  if (f.city && job.city !== f.city) return false;
  if (f.mode && job.mode !== f.mode) return false;
  if (f.category && job.category !== f.category) return false;
  if (f.type && job.type !== f.type) return false;
  // A vacancy without a stated salary is not excluded; one that states a ceiling below the wish is.
  if (f.minSalary && job.maxSalary && job.maxSalary < f.minSalary) return false;
  if (f.query) {
    const haystack = fold(`${job.title} ${job.company} ${job.skills.join(" ")}`);
    if (!fold(f.query).split(/\s+/).every((word) => haystack.includes(word))) return false;
  }
  return true;
}

export function describeAlert(f: AlertFilters) {
  return [f.query, f.city, f.mode, f.category, f.type, f.minSalary ? `${f.minSalary}+ AZN` : ""].filter(Boolean).join(" · ") || "Bütün vakansiyalar";
}
