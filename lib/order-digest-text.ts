// The text of the note about orders that wait for a signature too long (pure; the job that sends it is in order-digest.ts).
export type OrderDigestStats = { stale: number; oldestDays: number; returned: number };
export function orderDigestText(stats: OrderDigestStats): { title: string; body: string } | null {
  if (stats.stale <= 0 && stats.returned <= 0) return null;
  const lines: string[] = [];
  if (stats.stale > 0) lines.push(`${stats.stale} əmr 3 gündən çoxdur imza gözləyir (ən köhnəsi ${stats.oldestDays} gündür).`);
  if (stats.returned > 0) lines.push(`${stats.returned} əmr geri qaytarılıb və düzəliş gözləyir.`);
  return { title: "Əmrlər reyestri: gözləyən əmrlər", body: lines.join(" ") };
}
