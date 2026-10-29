// The annual leave schedule: who goes on leave when, checked against how many of a department are away at once.
import { vacationDates } from "./hr-calc.ts";

export type ScheduleEntry = { id: string; employeeId: string; start: string; end: string; days: number; status: string };
export type SchedulePerson = { id: string; name: string; department: string };

export const STATUS_TEXT: Record<string, string> = { proposed: "Təklif", approved: "Təsdiqlənib", rejected: "Rədd edilib", taken: "İstifadə olunub" };

// The days a leave takes: holidays inside it are not counted and push the end date (art. 114.6).
export function planLeave(start: string, days: number) {
  const dates = vacationDates(start, days);
  if (!dates) return null;
  return { start: dates.start, end: dates.end, returnDate: dates.returnDate, days: dates.vacationDays, calendarDays: dates.calendarDays, holidays: dates.holidays };
}

const overlaps = (a: { start: string; end: string }, b: { start: string; end: string }) => a.start <= b.end && b.start <= a.end;

// How many people of one department are on leave on the busiest day of a stretch.
export function peakAway(entries: ScheduleEntry[], people: SchedulePerson[], department: string, from: string, to: string) {
  const members = new Set(people.filter((p) => p.department === department).map((p) => p.id));
  const mine = entries.filter((e) => members.has(e.employeeId) && e.status !== "rejected" && overlaps(e, { start: from, end: to }));
  let peak = 0;
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    peak = Math.max(peak, mine.filter((e) => e.start <= day && day <= e.end).length);
  }
  return { peak, size: members.size };
}

// Warnings for a leave about to be saved. `others` are the other entries of the year.
export function scheduleWarnings(entry: { employeeId: string; start: string; end: string; days: number }, others: ScheduleEntry[], people: SchedulePerson[], balance: { remaining: number }, maxShare = 0.34): string[] {
  const out: string[] = [];
  const me = people.find((p) => p.id === entry.employeeId);
  if (!me) return out;
  const same = others.filter((o) => o.employeeId === entry.employeeId && o.status !== "rejected" && overlaps(o, entry));
  if (same.length) out.push("Bu işçinin həmin günlərdə başqa məzuniyyəti də planlaşdırılıb.");
  if (me.department) {
    const { peak, size } = peakAway([...others.filter((o) => o.employeeId !== entry.employeeId), { id: "new", employeeId: entry.employeeId, start: entry.start, end: entry.end, days: entry.days, status: "proposed" }], people, me.department, entry.start, entry.end);
    const allowed = Math.max(1, Math.floor(size * maxShare));
    if (size > 1 && peak > allowed) out.push(`${me.department} departamentində eyni vaxtda ${peak} nəfər məzuniyyətdə olacaq (${size} nəfərdən; tövsiyə olunan ən çox ${allowed}).`);
  }
  if (entry.days > balance.remaining + 0.001) out.push(`Planlaşdırılan ${entry.days} gün qalan məzuniyyətdən (${balance.remaining} gün) çoxdur.`);
  return out;
}

// Leave load per month: for each department the number of people with leave in that month.
export function monthlyLoad(entries: ScheduleEntry[], people: SchedulePerson[], year: number) {
  const departments = [...new Set(people.map((p) => p.department || "Departamentsiz"))].sort();
  return departments.map((department) => ({
    department,
    size: people.filter((p) => (p.department || "Departamentsiz") === department).length,
    months: Array.from({ length: 12 }, (_, m) => {
      const from = `${year}-${String(m + 1).padStart(2, "0")}-01`;
      const to = new Date(Date.UTC(year, m + 1, 0)).toISOString().slice(0, 10);
      const ids = new Set(people.filter((p) => (p.department || "Departamentsiz") === department).map((p) => p.id));
      return new Set(entries.filter((e) => ids.has(e.employeeId) && e.status !== "rejected" && overlaps(e, { start: from, end: to })).map((e) => e.employeeId)).size;
    }),
  }));
}
