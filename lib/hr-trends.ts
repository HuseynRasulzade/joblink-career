// Headcount over the months, a simple forecast and a plan-against-fact check of the staff table.
export type TrendPerson = { startDate: string; endDate: string; status: string };
export type MonthPoint = { month: string; headcount: number; joined: number; left: number; turnover: number };

const isDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");
export const monthKey = (iso: string) => iso.slice(0, 7);
const addMonth = (month: string, n: number) => {
  const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};
const monthEnd = (month: string) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);

// Month by month for the `months` months ending with `lastMonth`: people at the end of the month, those who joined, those who left.
export function monthSeries(people: TrendPerson[], lastMonth: string, months = 12): MonthPoint[] {
  const out: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = addMonth(lastMonth, -i);
    const end = monthEnd(month);
    const first = `${month}-01`;
    let headcount = 0, joined = 0, left = 0;
    for (const p of people) {
      const start = isDate(p.startDate) ? p.startDate : "";
      const gone = p.status === "left" && isDate(p.endDate) ? p.endDate : "";
      if (start && start > end) continue;
      if (gone && gone <= end) {
        if (gone >= first) left++;
      } else headcount++;
      if (start && start >= first && start <= end) joined++;
    }
    // People who left in the month were there during it: the turnover is against the average of both ends.
    const base = headcount + left / 2;
    out.push({ month, headcount, joined, left, turnover: base > 0 ? Math.round((left / base) * 1000) / 10 : 0 });
  }
  return out;
}

// The next months from the average joining and leaving of the last `window` months: a plain trend, not a promise.
export function forecast(series: MonthPoint[], ahead = 3, window = 6): { month: string; headcount: number }[] {
  if (!series.length) return [];
  const recent = series.slice(-window);
  const net = recent.reduce((s, p) => s + p.joined - p.left, 0) / recent.length;
  const out: { month: string; headcount: number }[] = [];
  let value = series[series.length - 1].headcount;
  for (let i = 1; i <= ahead; i++) {
    value = Math.max(0, value + net);
    out.push({ month: addMonth(series[series.length - 1].month, i), headcount: Math.round(value * 10) / 10 });
  }
  return out;
}

export type PlanFactRow = { department: string; planned: number; filled: number; unplaced: number };
export type PlanFactAlert = { level: "red" | "amber"; text: string };
// Over the plan is a problem (people with no place in the staff table); a large free share is a hiring signal.
export function planFactAlerts(rows: PlanFactRow[]): PlanFactAlert[] {
  const out: PlanFactAlert[] = [];
  for (const r of rows) {
    if (r.filled > r.planned && r.planned > 0) out.push({ level: "red", text: `${r.department}: ştat ${r.planned}, faktiki ${r.filled} — ştatdan ${r.filled - r.planned} nəfər artıqdır.` });
    if (r.unplaced > 0) out.push({ level: "red", text: `${r.department}: ${r.unplaced} işçi ştat cədvəlində yerə uyğun gəlmir.` });
    const free = r.planned - r.filled;
    if (r.planned > 0 && free > 0 && free / r.planned >= 0.25) out.push({ level: "amber", text: `${r.department}: ${r.planned} ştatdan ${free} yer boşdur (${Math.round((free / r.planned) * 100)}%).` });
  }
  return out.sort((a, b) => (a.level === b.level ? 0 : a.level === "red" ? -1 : 1));
}

// The months from `fromMonth` to `toMonth` with the figure moving in a straight line from `start` to `end`, rounded to whole people.
export function linearTargets(start: number, end: number, fromMonth: string, toMonth: string): { month: string; target: number }[] {
  const months: string[] = [];
  for (let m = fromMonth; m <= toMonth && months.length < 60; m = addMonth(m, 1)) months.push(m);
  if (!months.length) return [];
  const steps = Math.max(1, months.length - 1);
  return months.map((month, i) => ({ month, target: Math.max(0, Math.round(start + ((end - start) * i) / steps)) }));
}

// How far the last months are from the plan: under the plan is a hiring need, over the plan is a cost problem.
export function targetAlerts(series: MonthPoint[], targets: Record<string, number>, last = 3): PlanFactAlert[] {
  const out: PlanFactAlert[] = [];
  for (const p of series.slice(-last)) {
    const target = targets[p.month];
    if (target === undefined) continue;
    const diff = p.headcount - target;
    const allowed = Math.max(1, Math.round(target * 0.05));
    if (Math.abs(diff) <= allowed) continue;
    out.push(diff < 0 ? { level: "amber", text: `${p.month}: plan ${target}, faktiki ${p.headcount} — plandan ${-diff} nəfər azdır (işə qəbul lazım ola bilər).` } : { level: "red", text: `${p.month}: plan ${target}, faktiki ${p.headcount} — plandan ${diff} nəfər artıqdır.` });
  }
  return out;
}
