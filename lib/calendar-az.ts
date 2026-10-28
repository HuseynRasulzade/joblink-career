// Non-working days in Azerbaijan: the holidays of the Labor Code (article 105), Novruz and the
// religious holidays named by the Cabinet each year, and the rule that a holiday that falls on a
// weekend, or on a day that is already off, moves a day off to the next working day.
// Days the Cabinet moves in another way (for example a working Saturday) are set by the company
// in its own calendar, which overrides this list.
export type DayOff = { date: string; label: string; kind: "holiday" | "transfer" };

const FIXED: [string, string][] = [
  ["01-01", "Yeni il"],
  ["01-02", "Yeni il"],
  ["01-20", "Ümumxalq hüzn günü"],
  ["03-08", "Beynəlxalq Qadınlar günü"],
  ["05-09", "Faşizm üzərində Qələbə günü"],
  ["05-28", "Müstəqillik günü"],
  ["06-15", "Milli Qurtuluş günü"],
  ["06-26", "Silahlı Qüvvələr günü"],
  ["10-18", "Müstəqilliyin Bərpası günü"],
  ["11-08", "Zəfər günü"],
  ["11-09", "Dövlət Bayrağı günü"],
  ["12-31", "Dünya Azərbaycanlılarının Həmrəyliyi günü"],
];
// Novruz is 20-24 March every year; Ramazan and Qurban move with the moon and are set by the Cabinet.
// 2026: decision no. 362 of 2 December 2025. Other years must be added when the decision comes out.
const RELIGIOUS: Record<number, [string, string][]> = {
  2026: [
    ["03-20", "Ramazan bayramı"],
    ["03-21", "Ramazan bayramı"],
    ["05-27", "Qurban bayramı"],
    ["05-28", "Qurban bayramı"],
  ],
};
export const RELIGIOUS_YEARS = Object.keys(RELIGIOUS).map(Number);

const iso = (date: Date) => date.toISOString().slice(0, 10);
const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));
export const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
const isWeekend = (date: string) => weekdayOf(date) === 0 || weekdayOf(date) === 6;

// All days off of a year: holidays, and the working days that replace the holidays lost to a weekend
// or to another holiday that falls on the same day.
export function daysOff(year: number): Map<string, DayOff> {
  const entries: { date: string; label: string }[] = [];
  for (const [md, label] of FIXED) entries.push({ date: `${year}-${md}`, label });
  for (let day = 20; day <= 24; day++) entries.push({ date: `${year}-03-${day}`, label: "Novruz bayramı" });
  for (const [md, label] of RELIGIOUS[year] || []) entries.push({ date: `${year}-${md}`, label });
  entries.sort((a, b) => a.date.localeCompare(b.date));
  const off = new Map<string, DayOff>();
  const holidayDates = new Set(entries.map((e) => e.date));
  const lost: { date: string; label: string }[] = [];
  for (const entry of entries) {
    if (!off.has(entry.date)) off.set(entry.date, { date: entry.date, label: entry.label, kind: "holiday" });
    else off.set(entry.date, { ...off.get(entry.date)!, label: `${off.get(entry.date)!.label} / ${entry.label}` });
    // The first entry of a working weekday is spent on that day; the others move on.
    const first = entries.find((e) => e.date === entry.date) === entry;
    if (isWeekend(entry.date) || !first) lost.push(entry);
  }
  for (const entry of lost) {
    let cursor = new Date(`${entry.date}T00:00:00Z`);
    for (let guard = 0; guard < 30; guard++) {
      cursor = new Date(cursor.getTime() + 86_400_000);
      const date = iso(cursor);
      if (!isWeekend(date) && !holidayDates.has(date) && !off.has(date)) {
        off.set(date, { date, label: `${entry.label} (iş günü köçürülüb)`, kind: "transfer" });
        break;
      }
    }
  }
  return off;
}

export type CalendarOverride = { day: string; kind: "off" | "work"; label: string };
export type CalendarDay = { date: string; weekday: number; off: "" | "weekend" | "holiday" | "transfer" | "company"; label: string };

// The days of a month with what is off on each: weekends, holidays, moved days and the company's own changes.
export function monthDays(year: number, month: number, overrides: CalendarOverride[] = []): CalendarDay[] {
  const off = daysOff(year);
  const own = new Map(overrides.map((o) => [o.day, o]));
  const last = utc(year, month + 1, 0).getUTCDate();
  const days: CalendarDay[] = [];
  for (let day = 1; day <= last; day++) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekday = weekdayOf(date);
    const holiday = off.get(date);
    const custom = own.get(date);
    let state: CalendarDay["off"] = holiday ? holiday.kind : weekday === 0 || weekday === 6 ? "weekend" : "";
    let label = holiday?.label || "";
    if (custom?.kind === "off") {
      state = "company";
      label = custom.label || "Şirkətin qeyri-iş günü";
    } else if (custom?.kind === "work") {
      state = "";
      label = custom.label || "İş günü (şirkət təqvimi)";
    }
    days.push({ date, weekday, off: state, label });
  }
  return days;
}

// The attendance codes: how a day of an employee is marked.
export const ATTENDANCE_CODES: { id: string; short: string; label: string; counts: "work" | "leave" | "absence" }[] = [
  { id: "work", short: "İ", label: "İşdə", counts: "work" },
  { id: "trip", short: "EZ", label: "Ezamiyyətdə", counts: "work" },
  { id: "annual", short: "ƏM", label: "Əmək məzuniyyəti", counts: "leave" },
  { id: "sick", short: "XS", label: "Xəstəlik (xəstəlik vərəqəsi)", counts: "leave" },
  { id: "maternity", short: "AN", label: "Analıq (hamiləlik və doğuş)", counts: "leave" },
  { id: "childcare", short: "UQ", label: "Uşağa qulluq məzuniyyəti", counts: "leave" },
  { id: "paternity", short: "AT", label: "Atalıq məzuniyyəti", counts: "leave" },
  { id: "study", short: "TM", label: "Təhsil məzuniyyəti", counts: "leave" },
  { id: "unpaid", short: "ÖH", label: "Öz hesabına (ödənişsiz) məzuniyyət", counts: "leave" },
  { id: "absent", short: "GM", label: "İşə gəlməyib (üzrsüz)", counts: "absence" },
];
export const attendanceCode = (id: string) => ATTENDANCE_CODES.find((c) => c.id === id);

export type AttendanceSummary = { norm: number; worked: number; byCode: Record<string, number> };

// Working days an employee should have in the month (employed days that are not off), the days worked
// (those less the days marked as leave or absence) and the marked days by code.
export function summarize(
  days: CalendarDay[],
  marks: Record<string, string>,
  employed: { start: string; end: string },
): AttendanceSummary {
  const byCode: Record<string, number> = {};
  let norm = 0;
  let worked = 0;
  for (const day of days) {
    if ((employed.start && day.date < employed.start) || (employed.end && day.date > employed.end)) continue;
    const code = marks[day.date] || "";
    const kind = attendanceCode(code);
    if (code && code !== "work") byCode[code] = (byCode[code] || 0) + 1;
    if (day.off) {
      // A rest day marked as work (a trip or working on a day off) counts as worked.
      if (kind?.counts === "work") worked += 1;
      continue;
    }
    norm += 1;
    if (!kind || kind.counts === "work") worked += 1;
  }
  return { norm, worked, byCode };
}

// ---- Production calendar of a year: the working days, rest and holiday days and the hours of each month ----
export const HOURS_PER_DAY = 8; // a five-day, 40-hour week

export type MonthSummary = {
  month: number;
  days: CalendarDay[];
  calendarDays: number;
  workDays: number;
  restDays: number; // weekends
  holidayDays: number; // holidays, moved days and the company's own days off that fall on a weekday
  hours: number;
};

export function yearCalendar(year: number, overrides: CalendarOverride[] = []): MonthSummary[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const prefix = `${year}-${String(month).padStart(2, "0")}-`;
    const days = monthDays(year, month, overrides.filter((o) => o.day.startsWith(prefix)));
    const workDays = days.filter((d) => !d.off).length;
    // A holiday on a weekend is a weekend; the day moved in its place counts as a holiday.
    const holidayDays = days.filter((d) => d.off && d.off !== "weekend" && d.weekday !== 0 && d.weekday !== 6).length;
    return {
      month,
      days,
      calendarDays: days.length,
      workDays,
      restDays: days.length - workDays - holidayDays,
      holidayDays,
      hours: workDays * HOURS_PER_DAY,
    };
  });
}
