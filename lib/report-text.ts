// The weekly or monthly e-mail of a report: a plain-text table, and the due date of the next one. Pure functions (the job that sends is report-schedules.ts).
export type PlanLine = { department: string; planned: number; filled: number; free: number };

export function nextRunAfter(frequency: string, from: Date): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  if (frequency === "monthly") {
    d.setUTCMonth(d.getUTCMonth() + 1, 1);
  } else {
    // the next Monday
    const add = ((8 - d.getUTCDay()) % 7) || 7;
    d.setUTCDate(d.getUTCDate() + add);
  }
  return d.toISOString().slice(0, 10);
}

export function planReportText(company: string, lines: PlanLine[], totals: { planned: number; filled: number; costMax: number; factCost: number }, date: string): { subject: string; text: string } {
  const pad = (v: string | number, n: number) => String(v).padEnd(n, " ").slice(0, n);
  const rows = lines.map((l) => `${pad(l.department || "Departamentsiz", 28)} ${pad(l.planned, 6)} ${pad(l.filled, 8)} ${l.free > 0 ? l.free : l.free < 0 ? `+${-l.free} artıq` : "—"}`);
  const money = (v: number) => `${Math.round(v).toLocaleString("az-AZ")} AZN`;
  const text = [
    `${company}: ştat planı və fakt (${date})`,
    "",
    `${pad("Departament", 28)} ${pad("Plan", 6)} ${pad("Faktiki", 8)} Boş`,
    ...rows,
    "",
    `Cəmi: plan ${totals.planned}, faktiki ${totals.filled}, boş ${Math.max(0, totals.planned - totals.filled)}.`,
    totals.costMax ? `Aylıq plan xərci (işəgötürən payları ilə, maks.): ${money(totals.costMax)}; faktiki: ${money(totals.factCost)}.` : "",
    "",
    "Ətraflı hesabat: Hesabatlar → Ştat planı və fakt.",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
  return { subject: `JobMatch: ${company}: ştat planı və fakt`, text };
}
