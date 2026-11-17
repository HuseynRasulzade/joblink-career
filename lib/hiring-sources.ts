// Which sources bring the candidates that go on: per source, how many applied and how many reached each later stage.
export type SourceApp = { id: string; source: string; reached: string[] };
export type SourceRow = { source: string; applied: number; interview: number; offer: number; hired: number; interviewRate: number; hireRate: number };
const rate = (n: number, of: number) => (of ? Math.round((n / of) * 1000) / 10 : 0);

export function sourceFunnel(apps: SourceApp[]): SourceRow[] {
  const by = new Map<string, SourceRow>();
  for (const a of apps) {
    const key = a.source || "platform";
    const row = by.get(key) || { source: key, applied: 0, interview: 0, offer: 0, hired: 0, interviewRate: 0, hireRate: 0 };
    row.applied += 1;
    if (a.reached.includes("Müsahibə")) row.interview += 1;
    if (a.reached.includes("Təklif edildi")) row.offer += 1;
    if (a.reached.includes("İşə qəbul edildi")) row.hired += 1;
    by.set(key, row);
  }
  return [...by.values()].map((r) => ({ ...r, interviewRate: rate(r.interview, r.applied), hireRate: rate(r.hired, r.applied) })).sort((a, b) => b.applied - a.applied);
}
