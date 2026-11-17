// The hiring analytics of a company: the funnel, the time spent, the sources, the reasons for rejection and the candidates who stand still.
import { sourceFunnel, type SourceRow } from "./hiring-sources.ts";

export const FUNNEL_STEPS = ["Göndərildi", "Baxışda", "Müsahibə", "Təklif edildi", "İşə qəbul edildi"] as const;
const REJECTED = "Uyğun deyil";
const WITHDRAWN = "Geri götürülüb";
const DAY = 86_400_000;

export type AtsEvent = { type: string; from: string; to: string; created: string };
export type AtsApp = { id: string; jobId: string; candidate: string; source: string; status: string; stage: string; created: string; updated: string; events: AtsEvent[] };
export type AtsJob = { id: string; title: string; status: string; created: string };

const days = (a: string | number, b: string | number) => Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / DAY);
const round1 = (n: number) => Math.round(n * 10) / 10;
export function median(values: number[]): number | null {
  const list = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!list.length) return null;
  const mid = Math.floor(list.length / 2);
  return round1(list.length % 2 ? list[mid] : (list[mid - 1] + list[mid]) / 2);
}

// The steps of the funnel an application has been through (events first, the current status counts too: older data has no events).
export function reachedSteps(app: Pick<AtsApp, "status" | "events">): string[] {
  const seen = new Set<string>(["Göndərildi"]);
  for (const e of app.events) if (e.type === "status" && (FUNNEL_STEPS as readonly string[]).includes(e.to)) seen.add(e.to);
  const index = (FUNNEL_STEPS as readonly string[]).indexOf(app.status);
  if (index >= 0) for (let i = 0; i <= index; i++) seen.add(FUNNEL_STEPS[i]);
  // Whoever was hired went through the steps between: the funnel never narrows backwards.
  const top = Math.max(...[...seen].map((s) => (FUNNEL_STEPS as readonly string[]).indexOf(s)));
  for (let i = 0; i <= top; i++) seen.add(FUNNEL_STEPS[i]);
  return FUNNEL_STEPS.filter((s) => seen.has(s));
}

export type AtsReport = {
  total: number;
  open: number;
  funnel: { step: string; count: number; fromPrevious: number | null; fromStart: number | null }[];
  rejected: number;
  withdrawn: number;
  timeToHire: { hired: number; medianDays: number | null; averageDays: number | null };
  timeInStep: { step: string; medianDays: number | null; samples: number }[];
  rejections: { reason: string; count: number }[];
  sources: SourceRow[];
  stale: { applicationId: string; candidate: string; jobTitle: string; status: string; stage: string; idleDays: number }[];
  jobs: { jobId: string; title: string; applied: number; interview: number; offer: number; hired: number; openDays: number }[];
};

export function buildAtsReport(apps: AtsApp[], jobs: AtsJob[], now = Date.now(), staleDays = 7): AtsReport {
  const jobTitle = new Map(jobs.map((j) => [j.id, j.title]));
  const reached = new Map(apps.map((a) => [a.id, reachedSteps(a)]));
  const funnelCounts = FUNNEL_STEPS.map((step) => apps.filter((a) => reached.get(a.id)!.includes(step)).length);
  const funnel = FUNNEL_STEPS.map((step, i) => ({
    step,
    count: funnelCounts[i],
    fromPrevious: i === 0 ? null : funnelCounts[i - 1] ? round1((funnelCounts[i] / funnelCounts[i - 1]) * 100) : null,
    fromStart: i === 0 || !funnelCounts[0] ? null : round1((funnelCounts[i] / funnelCounts[0]) * 100),
  }));
  // Time to hire: from the application to the moment the status became "hired".
  const hireDays: number[] = [];
  for (const a of apps) {
    if (a.status !== "İşə qəbul edildi") continue;
    const hire = [...a.events].reverse().find((e) => e.type === "status" && e.to === "İşə qəbul edildi");
    hireDays.push(days(a.created, hire?.created || a.updated || a.created));
  }
  // Time in each step: from the event that moved the application into the step to the next move.
  const dwell = new Map<string, number[]>();
  for (const a of apps) {
    const moves = [{ to: "Göndərildi", at: a.created }, ...a.events.filter((e) => e.type === "status").map((e) => ({ to: e.to, at: e.created }))].sort((x, y) => x.at.localeCompare(y.at));
    for (let i = 0; i < moves.length - 1; i++) {
      if (!(FUNNEL_STEPS as readonly string[]).includes(moves[i].to)) continue;
      dwell.set(moves[i].to, [...(dwell.get(moves[i].to) || []), days(moves[i].at, moves[i + 1].at)]);
    }
  }
  const reasons = new Map<string, number>();
  for (const a of apps) for (const e of a.events) if (e.type === "rejection" && e.to) reasons.set(e.to, (reasons.get(e.to) || 0) + 1);
  const activeStatus = new Set(["Göndərildi", "Baxışda", "Müsahibə", "Təklif edildi"]);
  const stale = apps
    .filter((a) => activeStatus.has(a.status))
    .map((a) => {
      const last = Math.max(new Date(a.updated || a.created).getTime(), new Date(a.created).getTime(), ...a.events.map((e) => new Date(e.created).getTime()));
      return { applicationId: a.id, candidate: a.candidate, jobTitle: jobTitle.get(a.jobId) || "", status: a.status, stage: a.stage, idleDays: Math.floor((now - last) / DAY) };
    })
    .filter((s) => s.idleDays >= staleDays)
    .sort((x, y) => y.idleDays - x.idleDays)
    .slice(0, 50);
  const perJob = jobs
    .map((j) => {
      const mine = apps.filter((a) => a.jobId === j.id);
      const has = (step: string) => mine.filter((a) => reached.get(a.id)!.includes(step)).length;
      return { jobId: j.id, title: j.title, applied: mine.length, interview: has("Müsahibə"), offer: has("Təklif edildi"), hired: has("İşə qəbul edildi"), openDays: Math.floor((now - new Date(j.created).getTime()) / DAY) };
    })
    .filter((j) => j.applied > 0)
    .sort((x, y) => y.applied - x.applied);
  return {
    total: apps.length,
    open: apps.filter((a) => activeStatus.has(a.status)).length,
    funnel,
    rejected: apps.filter((a) => a.status === REJECTED).length,
    withdrawn: apps.filter((a) => a.status === WITHDRAWN).length,
    timeToHire: { hired: hireDays.length, medianDays: median(hireDays), averageDays: hireDays.length ? round1(hireDays.reduce((s, d) => s + d, 0) / hireDays.length) : null },
    timeInStep: FUNNEL_STEPS.slice(0, 4).map((step) => ({ step, medianDays: median(dwell.get(step) || []), samples: (dwell.get(step) || []).length })),
    rejections: [...reasons].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
    sources: sourceFunnel(apps.map((a) => ({ id: a.id, source: a.source, reached: reached.get(a.id)! }))),
    stale,
    jobs: perJob,
  };
}
