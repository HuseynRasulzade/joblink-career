// The text of the weekly plan note (pure; the job that sends it is in plan-digest.ts).
export type PlanDigestStats = { planned: number; filled: number; pending: number };

// The text of the note, or null when there is nothing to say.
export function planDigestText(stats: PlanDigestStats): { title: string; body: string } | null {
  const diff = stats.filled - stats.planned;
  const tolerance = Math.max(1, Math.round(stats.planned * 0.05));
  const lines: string[] = [];
  if (diff > tolerance) lines.push(`Faktiki işçi sayı plandan ${diff} nəfər çoxdur (${stats.filled} / ${stats.planned}).`);
  else if (-diff > tolerance) lines.push(`${-diff} yer boşdur (${stats.filled} / ${stats.planned}); doldurulmamış yerlər üçün vakansiya açmaq olar.`);
  if (stats.pending > 0) lines.push(`${stats.pending} plan və ya maaş sorğusu təsdiqinizi gözləyir.`);
  if (!lines.length) return null;
  return { title: "Plan və fakt: həftəlik xülasə", body: lines.join(" ") };
}

