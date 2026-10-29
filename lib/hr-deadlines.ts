// Dates that run out for an employee: an identity card, a medical paper, a certificate, a disability decision.
// The registry lists them and the daily job reminds the company a month ahead.
export type Deadline = { key: string; employeeId: string; employeeName: string; what: string; date: string; days: number; source: "profile" | "document" };

const DAY = 86_400_000;
export const daysLeft = (date: string, today: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY);

export function deadlinesOf(
  people: { id: string; name: string; profile: { idExpires?: string; disabilityUntil?: string; taxBenefitFrom?: string } }[],
  documents: { id: string; employeeId: string; label: string; expires: string }[],
  today: string,
  withinDays = 30,
): Deadline[] {
  const names = new Map(people.map((p) => [p.id, p.name]));
  const out: Deadline[] = [];
  const add = (key: string, employeeId: string, what: string, date: string | undefined, source: Deadline["source"]) => {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const days = daysLeft(date, today);
    if (days <= withinDays) out.push({ key, employeeId, employeeName: names.get(employeeId) || "", what, date, days, source });
  };
  for (const p of people) {
    add(`id-${p.id}-${p.profile.idExpires}`, p.id, "Şəxsiyyət vəsiqəsi", p.profile.idExpires, "profile");
    add(`dis-${p.id}-${p.profile.disabilityUntil}`, p.id, "Əlillik qərarı", p.profile.disabilityUntil, "profile");
  }
  for (const d of documents) add(`doc-${d.id}-${d.expires}`, d.employeeId, d.label, d.expires, "document");
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
