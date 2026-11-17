// The text of the note about candidates who wait for an answer too long (pure; the job that sends it is in ats-digest.ts).
export type AtsDigestStats = { stale: number; oldestDays: number; unanswered: number };
export function atsDigestText(stats: AtsDigestStats): { title: string; body: string } | null {
  if (stats.stale <= 0) return null;
  const lines = [`${stats.stale} namizəd 7 gündən çoxdur hərəkətsiz qalıb (ən köhnəsi ${stats.oldestDays} gün).`];
  if (stats.unanswered > 0) lines.push(`Onlardan ${stats.unanswered} nəfərin müraciətinə hələ baxılmayıb.`);
  lines.push("«İşə qəbul analitikası» bölməsində dayanmış namizədləri görün.");
  return { title: "Namizədlər cavab gözləyir", body: lines.join(" ") };
}
