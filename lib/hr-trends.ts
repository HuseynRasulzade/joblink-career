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
