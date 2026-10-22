// Workforce flow: headcount, hires, exits and turnover for the employer's
// own employee list. Pure functions, used by the API and the tests.
export type EmployeeStatus = "active" | "leave" | "left";

export const EXIT_TYPES: { id: string; label: string }[] = [
  { id: "resignation", label: "İstefa" },
  { id: "dismissal", label: "İşdən çıxarılma" },
  { id: "contract-end", label: "Müqavilənin bitməsi" },
  { id: "mutual", label: "Tərəflərin razılığı" },
  { id: "retirement", label: "Təqaüd" },
  { id: "other", label: "Digər" },
];
export const EXIT_REASONS: { id: string; label: string }[] = [
  { id: "salary", label: "Əmək haqqı" },
  { id: "better-offer", label: "Başqa təklif" },
  { id: "career", label: "Karyera imkanı" },
  { id: "management", label: "Rəhbərlik və iş mühiti" },
  { id: "workload", label: "İş yükü və qrafik" },
  { id: "relocation", label: "Köçmə" },
  { id: "personal", label: "Şəxsi və ailə səbəbləri" },
  { id: "performance", label: "Performans" },
  { id: "restructuring", label: "Ştat ixtisarı" },
  { id: "other", label: "Digər" },
];
export const exitTypeLabel = (id: string) => EXIT_TYPES.find((t) => t.id === id)?.label || "";
export const exitReasonLabel = (id: string) => EXIT_REASONS.find((r) => r.id === id)?.label || "";

export type EmployeeRow = {
  department: string;
  startDate: string; // YYYY-MM-DD, may be empty
  endDate: string; // YYYY-MM-DD, set for people who left
  status: EmployeeStatus;
  exitType: string;
  exitReason: string;
  source: string;
};
export type VacancyRow = { created: string; reason: string };

export type WorkforceMetrics = {
  from: string;
  to: string;
  headcountStart: number;
  headcountEnd: number;
  hires: number;
  exits: number;
  net: number;
  turnoverPercent: number | null; // exits / average headcount, for the period
  turnoverAnnualPercent: number | null;
  earlyExits: number; // left within 90 days of starting
  earlyExitPercent: number | null;
  avgTenureMonths: number | null; // current employees at the end of the period
  avgLeaverTenureMonths: number | null;
  months: { month: string; hires: number; exits: number; headcount: number }[];
  departments: { name: string; headcount: number; hires: number; exits: number; turnoverPercent: number | null }[];
  exitTypes: { id: string; count: number }[];
  exitReasons: { id: string; count: number }[] | null; // null when the viewer may not see them
  vacancyReasons: { reason: string; count: number }[];
  replacementOpened: number;
  insights: { level: "good" | "info" | "warn"; text: string }[];
};

const DAY = 86_400_000;
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const ms = (s: string) => Date.parse(`${s}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDays = (s: string, n: number) => iso(ms(s) + n * DAY);
export const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY);
const round1 = (n: number) => Math.round(n * 10) / 10;

// Employees are counted from their start date until the day before they left.
const present = (e: EmployeeRow, day: string) =>
  (e.startDate || "0000-01-01") <= day && (e.status !== "left" || !isDate(e.endDate) || e.endDate > day);
const inPeriod = (date: string, from: string, to: string) => isDate(date) && date >= from && date <= to;

export function monthsOf(from: string, to: string) {
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const end = to.slice(0, 7);
  for (let guard = 0; guard < 120; guard++) {
    const label = `${y}-${String(m).padStart(2, "0")}`;
    out.push(label);
    if (label >= end) break;
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}
const monthEnd = (month: string) => {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return iso(Date.UTC(y, m, 0));
};

export function computeWorkforce(
  employees: EmployeeRow[],
  vacancies: VacancyRow[],
  from: string,
  to: string,
  options: { includeReasons: boolean },
): WorkforceMetrics {
  const dayBefore = addDays(from, -1);
  const headcountStart = employees.filter((e) => present(e, dayBefore)).length;
  const headcountEnd = employees.filter((e) => present(e, to)).length;
  const hired = employees.filter((e) => inPeriod(e.startDate, from, to));
  const left = employees.filter((e) => e.status === "left" && inPeriod(e.endDate, from, to));
  const averageHeadcount = (headcountStart + headcountEnd) / 2;
  const days = Math.max(1, daysBetween(from, to) + 1);
  const turnover = averageHeadcount > 0 ? (left.length / averageHeadcount) * 100 : null;
  const tenureDays = (e: EmployeeRow) => (e.startDate ? daysBetween(e.startDate, e.endDate) : null);
  const early = left.filter((e) => {
    const d = tenureDays(e);
    return d !== null && d <= 90;
  });
  const monthsOfTenure = (list: number[]) => (list.length ? round1(list.reduce((a, b) => a + b, 0) / list.length / 30.44) : null);
  const current = employees.filter((e) => present(e, to) && e.startDate);
  const leaverTenures = left.map(tenureDays).filter((d): d is number => d !== null && d >= 0);

  const months = monthsOf(from, to).map((month) => {
    const start = month > from.slice(0, 7) ? `${month}-01` : from;
    const endOfMonth = monthEnd(month);
    const end = endOfMonth < to ? endOfMonth : to;
    return {
      month,
      hires: employees.filter((e) => inPeriod(e.startDate, start, end)).length,
      exits: employees.filter((e) => e.status === "left" && inPeriod(e.endDate, start, end)).length,
      headcount: employees.filter((e) => present(e, end)).length,
    };
  });

  const names = [...new Set(employees.map((e) => e.department.trim()))];
  const departments = names
    .map((name) => {
      const mine = employees.filter((e) => e.department.trim() === name);
      const start = mine.filter((e) => present(e, dayBefore)).length;
      const end = mine.filter((e) => present(e, to)).length;
      const exits = mine.filter((e) => e.status === "left" && inPeriod(e.endDate, from, to)).length;
      const avg = (start + end) / 2;
      return {
        name: name || "Təyin edilməyib",
        headcount: end,
        hires: mine.filter((e) => inPeriod(e.startDate, from, to)).length,
        exits,
        // A percentage on fewer than three people on average says little.
        turnoverPercent: avg >= 3 ? round1((exits / avg) * 100) : null,
      };
    })
    .filter((d) => d.headcount || d.hires || d.exits)
    .sort((a, b) => b.headcount - a.headcount || a.name.localeCompare(b.name, "az"));

  const count = (values: string[]) => {
    const map = new Map<string, number>();
    for (const v of values) map.set(v, (map.get(v) || 0) + 1);
    return [...map].map(([key, n]) => ({ key, n })).sort((a, b) => b.n - a.n);
  };
  const exitTypes = count(left.map((e) => e.exitType || "other")).map(({ key, n }) => ({ id: key, count: n }));
  const exitReasons = options.includeReasons
    ? count(left.map((e) => e.exitReason || "other")).map(({ key, n }) => ({ id: key, count: n }))
    : null;

  const opened = vacancies.filter((v) => inPeriod(v.created.slice(0, 10), from, to));
  const vacancyReasons = count(opened.map((v) => v.reason || "other")).map(({ key, n }) => ({ reason: key, count: n }));
  const replacementOpened = opened.filter((v) => v.reason === "replacement-exit").length;

  const annual = turnover === null ? null : round1((turnover * 365) / days);
  const insights: WorkforceMetrics["insights"] = [];
  if (left.length >= 3 && annual !== null && annual > 25)
    insights.push({ level: "warn", text: `İllik hesabla dövriyyə ${annual}%-dir. Bu, yüksək göstəricidir, ayrılma səbəblərinə baxın.` });
  else if (annual !== null && averageHeadcount >= 5 && annual <= 10)
    insights.push({ level: "good", text: `İllik hesabla dövriyyə ${annual}%-dir, komanda sabitdir.` });
  if (left.length >= 3 && early.length / left.length >= 0.3)
    insights.push({ level: "warn", text: `Ayrılanların ${early.length}-i (${Math.round((early.length / left.length) * 100)}%) işə başladıqdan sonra 90 gün ərzində gedib. İşə qəbul və adaptasiya prosesini yoxlayın.` });
  if (exitReasons && left.length >= 3 && exitReasons[0] && exitReasons[0].count / left.length >= 0.4)
    insights.push({ level: "info", text: `Ən çox rast gəlinən ayrılma səbəbi: ${exitReasonLabel(exitReasons[0].id) || "digər"} (${exitReasons[0].count}/${left.length}).` });
  const worst = departments.filter((d) => d.exits >= 3 && d.turnoverPercent !== null && turnover !== null && d.turnoverPercent > turnover * 2)[0];
  if (worst) insights.push({ level: "warn", text: `“${worst.name}” şöbəsində dövriyyə ${worst.turnoverPercent}%, şirkət ortalamasından iki dəfədən çoxdur.` });
  if (left.length >= 2 && replacementOpened < left.length)
    insights.push({ level: "info", text: `Dövr ərzində ${left.length} işçi ayrılıb, “işçinin çıxması ilə əlaqədar” səbəbi ilə ${replacementOpened} vakansiya açılıb.` });
  if (headcountEnd !== headcountStart)
    insights.push({ level: "info", text: `İşçi sayı ${headcountStart} nəfərdən ${headcountEnd} nəfərə ${headcountEnd > headcountStart ? "artıb" : "azalıb"}.` });

  return {
    from,
    to,
    headcountStart,
    headcountEnd,
    hires: hired.length,
    exits: left.length,
    net: headcountEnd - headcountStart,
    turnoverPercent: turnover === null ? null : round1(turnover),
    turnoverAnnualPercent: annual,
    earlyExits: early.length,
    earlyExitPercent: left.length ? round1((early.length / left.length) * 100) : null,
    avgTenureMonths: monthsOfTenure(current.map((e) => daysBetween(e.startDate, to))),
    avgLeaverTenureMonths: monthsOfTenure(leaverTenures),
    months,
    departments,
    exitTypes,
    exitReasons,
    vacancyReasons,
    replacementOpened,
    insights,
  };
}

// Normalizes the fields posted when an employee leaves.
export function normalizeExit(input: { status: string; endDate: unknown; exitType: unknown; exitReason: unknown; exitNote: unknown }, startDate: string, today: string) {
  if (input.status !== "left") return { endDate: "", exitType: "", exitReason: "", exitNote: "", error: "" };
  const endDate = typeof input.endDate === "string" && isDate(input.endDate) ? input.endDate : today;
  const exitType = EXIT_TYPES.some((t) => t.id === input.exitType) ? String(input.exitType) : "";
  const exitReason = EXIT_REASONS.some((r) => r.id === input.exitReason) ? String(input.exitReason) : "";
  const note = typeof input.exitNote === "string" ? input.exitNote.trim().slice(0, 1000) : "";
  let error = "";
  if (!exitType) error = "Ayrılma növünü seçin.";
  else if (!exitReason) error = "Ayrılma səbəbini seçin.";
  else if (startDate && isDate(startDate) && endDate < startDate) error = "Ayrılma tarixi işə başlama tarixindən əvvəl ola bilməz.";
  return { endDate, exitType, exitReason, exitNote: note, error };
}
