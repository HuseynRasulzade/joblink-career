// Pure helpers for the employer dashboard: trend, period comparison, funnel and source split.
export const HIRED_STATUS = "İşə qəbul edildi";
export const FUNNEL_STAGES = ["Göndərildi", "Baxışda", "Müsahibə", "Təklif edildi", HIRED_STATUS];

export type AppLite = { status: string; created: string; updated: string | null; auto: number };
export type TrendMonth = { month: string; applications: number; hires: number; avgDaysToHire: number | null };

const DAY = 86400000;
const monthOf = (iso: string) => iso.slice(0, 7);

// The last `months` calendar months ending with the month of `endIso`.
export function monthlyTrend(apps: AppLite[], endIso: string, months = 6): TrendMonth[] {
  const end = new Date(`${endIso.slice(0, 7)}-01T00:00:00Z`);
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) keys.push(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1)).toISOString().slice(0, 7));
  return keys.map((month) => {
    const hires = apps.filter((a) => a.status === HIRED_STATUS && a.updated && monthOf(a.updated) === month);
    const days = hires.map((a) => (Date.parse(a.updated!) - Date.parse(a.created)) / DAY);
    return {
      month,
      applications: apps.filter((a) => monthOf(a.created) === month).length,
      hires: hires.length,
      avgDaysToHire: days.length ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null,
    };
  });
}

// Applications are counted at the furthest stage they reached: an applicant who is hired
// also passed screening, interview and offer. Rejected ones have no known stage and are left out.
export function reachedFunnel(byStatus: Record<string, number>) {
  const counts = FUNNEL_STAGES.map((stage) => byStatus[stage] || 0);
  const reached = counts.map((_, i) => counts.slice(i).reduce((s, n) => s + n, 0));
  return FUNNEL_STAGES.map((stage, i) => ({
    stage,
    reached: reached[i],
    fromPrevious: i > 0 && reached[i - 1] > 0 ? Math.round((reached[i] / reached[i - 1]) * 100) : null,
  }));
}

export function sourceSplit(apps: { auto: number }[]) {
  const auto = apps.filter((a) => a.auto === 1).length;
  return { candidate: apps.length - auto, auto };
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
// The selected period, or the last 30 days, and the equally long period right before it.
export function comparePeriods(from: string, to: string, today = isoDay(Date.now())) {
  const end = to || today;
  const start = from || isoDay(Date.parse(end) - 29 * DAY);
  const length = Math.round((Date.parse(end) - Date.parse(start)) / DAY) + 1;
  const prevEnd = isoDay(Date.parse(start) - DAY);
  const prevStart = isoDay(Date.parse(prevEnd) - (length - 1) * DAY);
  return { current: { from: start, to: end }, previous: { from: prevStart, to: prevEnd }, days: length };
}

export const inPeriod = (iso: string, period: { from: string; to: string }) => iso.slice(0, 10) >= period.from && iso.slice(0, 10) <= period.to;

export function pctChange(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}
