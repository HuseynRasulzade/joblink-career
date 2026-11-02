// Hours worked on each day against the norm: what is extra work (art. 165), work on rest days and holidays (art. 164)
// and night hours (art. 166). The pay of these hours is worked out in lib/payroll-calc.ts.
export type HourDay = { date: string; off: "" | "weekend" | "holiday" | "transfer" | "company"; short: boolean };
export type HoursByDay = Map<string, { hours: number; night: number }>;
export type HoursSummary = { days: number; worked: number; overtime: number; restDay: number; night: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

// Daily norm: a fifth of the weekly hours; the eve of a holiday is an hour shorter.
export const dailyNorm = (weekHours: number, short: boolean) => Math.max(0, (weekHours > 0 ? weekHours : 40) / 5 - (short ? 1 : 0));

export function summarizeHours(days: HourDay[], hours: HoursByDay, weekHours: number): HoursSummary {
  const out: HoursSummary = { days: 0, worked: 0, overtime: 0, restDay: 0, night: 0 };
  for (const day of days) {
    const entry = hours.get(day.date);
    if (!entry || entry.hours <= 0) continue;
    out.days += 1;
    out.worked += entry.hours;
    out.night += Math.min(entry.night, entry.hours);
    if (day.off !== "") out.restDay += entry.hours;
    else out.overtime += Math.max(0, entry.hours - dailyNorm(weekHours, day.short));
  }
  return { days: out.days, worked: r2(out.worked), overtime: r2(out.overtime), restDay: r2(out.restDay), night: r2(out.night) };
}

export type HoursImportRow = { line: number; name: string; email: string; fin: string; day: string; hours: number; night: number; note: string };
const fold = (v: string) => v.toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/[^a-z0-9]+/g, " ").trim();
const numberOf = (text: string) => Number(text.replace(/\s/g, "").replace(",", "."));
const dateOf = (text: string) => {
  const t = text.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = t.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  return dmy ? `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}` : "";
};

export function parseHoursRows(rows: string[][], limit = 3000): { rows: HoursImportRow[]; issues: { line: number; reason: string }[] } {
  const headerIndex = rows.findIndex((r) => r.some((c) => /^(ad soyad|isci|ad|fin|fin kod|fin kodu)$/.test(fold(c))));
  if (headerIndex < 0) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” və ya “FİN” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const head = rows[headerIndex].map(fold);
  const find = (re: RegExp) => head.findIndex((h) => re.test(h));
  const col = { name: find(/^(ad soyad|isci|ad)$/), fin: find(/^fin( kod| kodu)?$/), email: find(/poct|email/), day: find(/tarix|gun|date/), hours: find(/^(saat|isleyib|isleniles|hours)/), night: find(/gece|night/), note: find(/qeyd|izah|note/) };
  if (col.day < 0 || col.hours < 0) return { rows: [], issues: [{ line: headerIndex + 1, reason: "“Tarix” və “Saat” sütunları lazımdır." }] };
  const out: HoursImportRow[] = [];
  const issues: { line: number; reason: string }[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.every((c) => !String(c ?? "").trim())) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir yüklənir.` });
      break;
    }
    const at = (c: number) => (c >= 0 ? String(row[c] ?? "") : "");
    const fin = at(col.fin).trim().toUpperCase().replace(/\s+/g, "").slice(0, 10);
    const name = at(col.name).trim().slice(0, 120) || fin;
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad və ya FİN yoxdur." });
      continue;
    }
    const day = dateOf(at(col.day));
    if (!day) {
      issues.push({ line, reason: `${name}: tarix oxunmadı: “${at(col.day)}”.` });
      continue;
    }
    const hours = numberOf(at(col.hours) || "0");
    const night = numberOf(at(col.night) || "0");
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      issues.push({ line, reason: `${name}: saat 0–24 arası olmalıdır (“${at(col.hours)}”).` });
      continue;
    }
    if (!Number.isFinite(night) || night < 0 || night > hours) {
      issues.push({ line, reason: `${name}: gecə saatı işlənən saatdan çox ola bilməz.` });
      continue;
    }
    out.push({ line, name, email: at(col.email).trim().slice(0, 160), fin, day, hours, night, note: at(col.note).trim().slice(0, 200) });
  }
  return { rows: out, issues };
}

// ── Month totals: some companies keep the tabel as one figure per month, not per day ──────────

export type HoursTotalsRow = { line: number; name: string; email: string; fin: string; month: string; overtime: number; restDay: number; night: number; note: string };
export type HoursMonthTotal = { overtime: number; restDay: number; night: number; status: string };
const monthOf = (text: string) => {
  const t = text.trim();
  const iso = t.match(/^(\d{4})-(\d{2})/);
  if (iso && Number(iso[2]) >= 1 && Number(iso[2]) <= 12) return `${iso[1]}-${iso[2]}`;
  const dmy = t.match(/^(\d{1,2})[./](\d{4})$/);
  return dmy && Number(dmy[1]) >= 1 && Number(dmy[1]) <= 12 ? `${dmy[2]}-${dmy[1].padStart(2, "0")}` : "";
};

export function parseHoursTotals(rows: string[][], defaultMonth = "", limit = 1000): { rows: HoursTotalsRow[]; issues: { line: number; reason: string }[] } {
  const headerIndex = rows.findIndex((r) => r.some((c) => /^(ad soyad|isci|ad|fin|fin kod|fin kodu)$/.test(fold(c))));
  if (headerIndex < 0) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” və ya “FİN” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const head = rows[headerIndex].map(fold);
  const find = (re: RegExp) => head.findIndex((h) => re.test(h));
  const col = { name: find(/^(ad soyad|isci|ad)$/), fin: find(/^fin( kod| kodu)?$/), email: find(/poct|email/), month: find(/^(ay|dovr|month)$/), overtime: find(/^artiq is/), restDay: find(/istirahet|bayram/), night: find(/^gece/), note: find(/qeyd|izah|note/) };
  if (col.overtime < 0 && col.restDay < 0 && col.night < 0) return { rows: [], issues: [{ line: headerIndex + 1, reason: "“Artıq iş saatı”, “İstirahət günü saatı” və ya “Gecə saatı” sütunlarından biri lazımdır." }] };
  if (col.month < 0 && !defaultMonth) return { rows: [], issues: [{ line: headerIndex + 1, reason: "“Ay” sütunu lazımdır (məsələn 2026-03)." }] };
  const out: HoursTotalsRow[] = [];
  const issues: { line: number; reason: string }[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.every((c) => !String(c ?? "").trim())) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir yüklənir.` });
      break;
    }
    const at = (c: number) => (c >= 0 ? String(row[c] ?? "") : "");
    const fin = at(col.fin).trim().toUpperCase().replace(/\s+/g, "").slice(0, 10);
    const name = at(col.name).trim().slice(0, 120) || fin;
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad və ya FİN yoxdur." });
      continue;
    }
    const month = col.month >= 0 ? monthOf(at(col.month)) : defaultMonth;
    if (!month) {
      issues.push({ line, reason: `${name}: ay oxunmadı: “${at(col.month)}”.` });
      continue;
    }
    const nums = [col.overtime, col.restDay, col.night].map((c) => (c >= 0 && at(c).trim() ? numberOf(at(c)) : 0));
    if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 400)) {
      issues.push({ line, reason: `${name}: saat 0–400 arası rəqəm olmalıdır.` });
      continue;
    }
    out.push({ line, name, email: at(col.email).trim().slice(0, 160), fin, month, overtime: r2(nums[0]), restDay: r2(nums[1]), night: r2(nums[2]), note: at(col.note).trim().slice(0, 200) });
  }
  return { rows: out, issues };
}

// What the payroll counts for one employee and month: the daily entries when there are any, otherwise the month total.
// The two are never added together. `approvedDays` are days covered by an order; without the approval rule everything counts.
export type HoursSource = "daily" | "month" | "none";
export function chooseHours(input: {
  days: HourDay[]; daily?: HoursByDay; total?: HoursMonthTotal; weekHours: number;
  needsApproval: boolean; approvedDays: Set<string>; totalCoveredByOrder: boolean;
}): { summary: HoursSummary; source: HoursSource; waiting: number } {
  const { days, daily, total, weekHours, needsApproval, approvedDays } = input;
  if (daily && daily.size > 0) {
    if (!needsApproval) return { summary: summarizeHours(days, daily, weekHours), source: "daily", waiting: 0 };
    const counted: HoursByDay = new Map();
    let waiting = 0;
    const info = new Map(days.map((d) => [d.date, d]));
    for (const [day, e] of daily) {
      if (approvedDays.has(day)) { counted.set(day, e); continue; }
      const d = info.get(day);
      const norm = d && d.off === "" ? dailyNorm(weekHours, d.short) : 0;
      const hours = d && d.off === "" ? Math.min(e.hours, norm) : 0;
      waiting += Math.max(0, e.hours - hours);
      counted.set(day, { hours, night: Math.min(e.night, hours) });
    }
    return { summary: summarizeHours(days, counted, weekHours), source: "daily", waiting: r2(waiting) };
  }
  if (total && (total.overtime > 0 || total.restDay > 0 || total.night > 0)) {
    const ok = !needsApproval || total.status === "approved" || input.totalCoveredByOrder;
    const waiting = ok ? 0 : r2(total.overtime + total.restDay);
    return { summary: { days: 0, worked: 0, overtime: ok ? total.overtime : 0, restDay: ok ? total.restDay : 0, night: total.night }, source: "month", waiting };
  }
  return { summary: { days: 0, worked: 0, overtime: 0, restDay: 0, night: 0 }, source: "none", waiting: 0 };
}
