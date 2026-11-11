// The calculation workbook (Excel) of the month: pay, timesheet, leave and absences, bonuses, additions, deductions,
// extra hours, business trips. It carries live formulas, so the accountant can work in Excel alone; the inputs
// (leave and absence ranges, bonuses / additions / deductions, hours, trips) go back into the platform from the same file.
// The "Hesablama" sheet follows the platform's own rules (lib/payroll-calc.ts); the tests recalculate the file with
// LibreOffice and compare it with the platform, so the formulas cannot drift from the rules.
import { ATTENDANCE_CODES } from "./calendar-az.ts";
import { computePay, dayStatus, isInsuredCode, isVacationCode, vacationCalendarDays, type DayStatus } from "./payroll-calc.ts";
import { BENEFIT_CAP_FACTOR, BENEFIT_MIN_INSURANCE_MONTHS, MATERNITY_BENEFIT_PERCENT, SICK_BENEFIT_PERCENT } from "./hr-calc.ts";
import { DEPENDENTS_REDUCTION, TAX_BENEFITS } from "./employee-rights.ts";
import { FOREIGN_NORMS } from "./trip-norms-data.ts";
import { DOMESTIC_NORMS, DOMESTIC_OTHER, lookupNorm } from "./trip-norms.ts";
import { OTHER_DOMESTIC } from "./trip-places.ts";
import type { XlsxCell, XlsxSheet } from "./xlsx.ts";
import { excelDateSerial } from "./xlsx.ts";
import { bonusesOf, daysOfLink, sharesOf, type AllocationMode, type BranchLink, type BranchRule, type BranchSales } from "./branches.ts";

export const WB = {
  guide: "Təlimat",
  staff: "İşçilər",
  leaves: "Azad olmalar",
  sheet: "Tabel",
  adds: "Əlavə-Tutulma",
  hours: "Saatlar",
  trips: "Ezamiyyət",
  calc: "Hesablama",
  params: "Parametrlər",
  norms: "Normlar",
  fx: "Məzənnə",
  codes: "Kodlar",
  benefits: "Güzəştlər",
  helper: "Köməkçi",
  branches: "Filiallar",
  branchPeople: "İşçi-filial",
} as const;

export type WorkbookEmployee = {
  name: string;
  fin: string;
  position: string;
  department: string;
  salary: number; // gross, AZN a month
  sector: "private" | "public";
  taxReduction: number;
  weekHours: number;
  averageMonthly: number; // the 12-month average for leave pay; 0 = the current salary
  nightPercent: number;
  leaveCompDays: number; // unused leave paid when the contract ends (Labor Code 143), in days
  benefitEligible: boolean; // 6 months of insurance record (Law on Social Insurance, art. 6)
  newSalary: number; // a pay change inside the month: the new gross pay …
  salaryChangeFrom: string; // … and the day it starts
  taxBenefit: string; // a tax benefit chosen in the workbook (short name); empty = the reduction typed above
  dependents3: boolean;
  start: string;
  end: string;
};
// Branches in the workbook: each branch with its sales limit, sales and bonus rule, and who works in which of them.
export type WorkbookBranches = {
  mode: AllocationMode;
  branches: { name: string; code: string; city: string; active: boolean; target: number; sales: number; kind: "fixed" | "salary_percent"; value: number; ruleActive: boolean }[];
  links: { name: string; fin: string; branch: string; role: string; sharePct: number; bonusEligible: boolean; from: string; to: string }[];
};
export type WorkbookInput = {
  month: string;
  branches?: WorkbookBranches;
  days: { date: string; off: "" | "weekend" | "holiday" | "transfer" | "company" }[];
  employees: WorkbookEmployee[];
  leaves: { name: string; code: string; from: string; to: string; note: string }[];
  adds: { name: string; kind: "Mükafat" | "Əlavə" | "Tutulma" | "Avans"; label: string; amount: number; deductionKind: "Ümumi" | "İcra sənədi" | "Aliment" }[];
  hours: { name: string; overtime: number; restDay: number; night: number }[];
  trips: { name: string; destination: string; place: string; start: string; end: string; purpose: string; advance: number; other: number; daily?: number }[];
  rates: { USD: number; EUR: number; GBP: number; JPY: number };
  ratesDate: string;
  benefit: { sickPercent: number; maternityPercent: number; minPension: number };
};

const q = (sheet: string) => `'${sheet}'!`;
const L = (index: number) => {
  // 1-based column number → letters
  let n = index;
  let out = "";
  while (n > 0) {
    out = String.fromCharCode(65 + ((n - 1) % 26)) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
};
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const serial = (iso: string) => excelDateSerial(iso) ?? 0;
const labelOf = (id: string) => (ATTENDANCE_CODES.find((c) => c.id === id)?.label || "").replace(/\s*\(.*\)\s*/, "");
const shortOf = (id: string) => ATTENDANCE_CODES.find((c) => c.id === id)?.short || "";

// Which marks count as what (the same split as dayStatus in lib/payroll-calc.ts).
const groupOf = (id: string): "work" | "paid" | "vacation" | "downtime" | "benefit" | "unpaid" => {
  const status = dayStatus(id);
  if (status === "work") return "work";
  if (status === "twothirds") return "downtime";
  if (status === "benefit") return "benefit";
  if (status === "unpaid") return "unpaid";
  return isVacationCode(id) ? "vacation" : "paid";
};
const GROUP_NAME = { work: "İşdə", paid: "Ödənişli icazə", vacation: "Məzuniyyət (orta əmək haqqı)", downtime: "Boşdayanma (2/3)", benefit: "Sığorta müavinəti", unpaid: "Ödənişsiz" } as const;
const shortsOf = (group: ReturnType<typeof groupOf>) => ATTENDANCE_CODES.filter((c) => groupOf(c.id) === group).map((c) => c.short);
const arrayOf = (shorts: string[]) => `{${shorts.map((s) => `"${s}"`).join(",")}}`;

const SECTOR_LABEL = { private: "Özəl", public: "Dövlət" } as const;
const KIND_LABEL = { "Ümumi": "general", "İcra sənədi": "writ", "Aliment": "alimony" } as const;

// Parameter rows of the "Parametrlər" sheet (column B), used by every formula.
const PR = { month: 3, calendarDays: 4, workingDays: 5, dayHours: 6, meanMonth: 7, taxFree: 8, tier1: 9, tier2: 10, rate1: 11, rate2: 12, rate3: 13, base2: 14, base3: 15, pubRate1: 16, pubRate2: 17, pubBase: 18, socLow: 19, socHigh: 20, socLimit: 21, unemp: 22, medLow: 23, medHigh: 24, medLimit: 25, medBase: 26, erLow: 27, erMid: 28, erHigh: 29, erLimit: 30, capGeneral: 31, capWrit: 32, capAlimony: 33, minWage: 34, sickPct: 35, maternityPct: 36, minPension: 37, capFactor: 38, minInsurance: 39, dependents: 40 } as const;
const PV: Record<keyof typeof PR, number | string> = { month: "", calendarDays: 0, workingDays: 0, dayHours: 8, meanMonth: 30.4, taxFree: 200, tier1: 2500, tier2: 8000, rate1: 0.03, rate2: 0.1, rate3: 0.14, base2: 75, base3: 625, pubRate1: 0.14, pubRate2: 0.25, pubBase: 350, socLow: 0.03, socHigh: 0.1, socLimit: 200, unemp: 0.005, medLow: 0.02, medHigh: 0.005, medLimit: 2500, medBase: 50, erLow: 0.22, erMid: 0.15, erHigh: 0.11, erLimit: 8000, capGeneral: 0.2, capWrit: 0.5, capAlimony: 0.7, minWage: 400, sickPct: SICK_BENEFIT_PERCENT, maternityPct: MATERNITY_BENEFIT_PERCENT, minPension: 0, capFactor: BENEFIT_CAP_FACTOR, minInsurance: BENEFIT_MIN_INSURANCE_MONTHS, dependents: DEPENDENTS_REDUCTION };
const PLABEL: Record<keyof typeof PR, string> = {
  month: "Hesablama ayı",
  calendarDays: "Ayın təqvim günü sayı",
  workingDays: "Ayın iş günü sayı (norma)",
  dayHours: "Gündəlik iş saatı (40 saatlıq həftə)",
  meanMonth: "Orta aylıq təqvim günü (Əmək M. 140)",
  taxFree: "Vergidən azad məbləğ (özəl sektor, AZN)",
  tier1: "Gəlir vergisi: 1-ci pillənin həddi (AZN)",
  tier2: "Gəlir vergisi: 2-ci pillənin həddi (AZN)",
  rate1: "Gəlir vergisi: 1-ci pillə faizi (özəl)",
  rate2: "Gəlir vergisi: 2-ci pillə faizi (özəl)",
  rate3: "Gəlir vergisi: 3-cü pillə faizi (özəl)",
  base2: "2-ci pillədə sabit hissə (AZN)",
  base3: "3-cü pillədə sabit hissə (AZN)",
  pubRate1: "Dövlət/neft sektoru: 2500-dək faiz",
  pubRate2: "Dövlət/neft sektoru: 2500-dən artıq faiz",
  pubBase: "Dövlət/neft sektoru: sabit hissə (AZN)",
  socLow: "DSMF (işçi): 200-dək faiz",
  socHigh: "DSMF (işçi): 200-dən artıq faiz",
  socLimit: "DSMF həddi (AZN)",
  unemp: "İşsizlikdən sığorta (işçi və işəgötürən)",
  medLow: "İcbari tibbi sığorta: 2500-dək faiz",
  medHigh: "İcbari tibbi sığorta: 2500-dən artıq faiz",
  medLimit: "İcbari tibbi sığorta həddi (AZN)",
  medBase: "İcbari tibbi sığorta: sabit hissə (AZN)",
  erLow: "DSMF (işəgötürən): 200-dək faiz",
  erMid: "DSMF (işəgötürən): 200–8000 faiz",
  erHigh: "DSMF (işəgötürən): 8000-dən artıq faiz",
  erLimit: "DSMF (işəgötürən) yuxarı hədd (AZN)",
  capGeneral: "Tutulma həddi: ümumi (Əmək M. 175)",
  capWrit: "Tutulma həddi: icra sənədi",
  capAlimony: "Tutulma həddi: aliment",
  minWage: "Minimum aylıq əmək haqqı (AZN)",
  sickPct: "Xəstəlik müavinəti: orta əmək haqqının faizi (%)",
  maternityPct: "Analıq müavinəti: orta əmək haqqının faizi (%)",
  minPension: "Minimum əmək pensiyası (AZN; müavinət həddi üçün, 0 = hədd yoxdur)",
  capFactor: "Aylıq müavinət həddi: minimum pensiyanın neçə qatı",
  minInsurance: "Müavinət üçün minimum sığorta stajı (ay)",
  dependents: "3-dən çox himayədə olan: vergi azaldılması (AZN/ay)",
};

export function buildPayrollWorkbook(raw: WorkbookInput): XlsxSheet[] {
  // A trip's place is one of the law's places; any other place inside the country is "other" with its name beside it.
  const input: WorkbookInput = {
    ...raw,
    benefit: raw.benefit || { sickPercent: SICK_BENEFIT_PERCENT, maternityPercent: MATERNITY_BENEFIT_PERCENT, minPension: 0 },
    employees: raw.employees.map((e) => ({ ...e, leaveCompDays: e.leaveCompDays ?? 0, benefitEligible: e.benefitEligible ?? true, newSalary: e.newSalary ?? 0, salaryChangeFrom: e.salaryChangeFrom ?? "", taxBenefit: e.taxBenefit ?? "", dependents3: e.dependents3 ?? false })),
    trips: raw.trips.map((t) => {
      const found = lookupNorm(t.destination, false);
      if (found && (found.kind === "foreign" || DOMESTIC_NORMS.some((d) => d.label === found.label))) return { ...t, destination: found.label };
      return { ...t, destination: OTHER_DOMESTIC, place: t.place || t.destination };
    }),
  };
  const days = input.days;
  const N = days.length;
  const staffCount = input.employees.length;
  const spare = 20;
  const staffRows = staffCount + spare;
  const S0 = 4; // first employee row in "İşçilər", "Saatlar", "Hesablama" (Tabel starts at 5)
  const T0 = 5;
  const LEAVE_ROWS = Math.max(150, input.leaves.length + 60);
  const ADD_ROWS = Math.max(150, input.adds.length + 60);
  const TRIP_ROWS = Math.max(60, input.trips.length + 30);
  const workingDays = days.filter((d) => !d.off).length;
  const P = (key: keyof typeof PR) => `${q(WB.params)}$B$${PR[key]}`;
  const dayType = (d: WorkbookInput["days"][number]) => (d.off === "" ? "iş" : d.off === "weekend" ? "istirahət" : d.off === "company" ? "qeyri-iş" : "bayram");
  const DC = 3; // first day column of the timesheet: A = name, B = FİN, then the days
  const firstDay = L(DC);
  const lastDay = L(N + DC - 1);
  const range = (row: number) => `$${firstDay}${row}:$${lastDay}${row}`;
  const rowCells = (row: number) => `${firstDay}${row}:${lastDay}${row}`;
  const typeRow = `$${firstDay}$4:$${lastDay}$4`;
  const dateRow = `$${firstDay}$3:$${lastDay}$3`;

  // ---- Branches: the layout of the two sheets and the values their formulas give ----
  const BRI = input.branches;
  const BR_FIRST = 5;
  const BR_LAST = BR_FIRST + Math.max(30, (BRI?.branches.length || 0) + 20) - 1;
  const LK_FIRST = 4;
  const LK_LAST = LK_FIRST + Math.max(60, (BRI?.links.length || 0) + 40) - 1;
  const FBR = (col: string) => `${q(WB.branches)}$${col}$${BR_FIRST}:$${col}$${BR_LAST}`;
  const LKR = (col: string) => `${q(WB.branchPeople)}$${col}$${LK_FIRST}:$${col}$${LK_LAST}`;
  const MODE_CELL = `${q(WB.branches)}$B$3`;
  const MODE_TEXT = { equal: "Bərabər", sales: "Satışa görə" } as const;
  // The share and the bonus of every link of one employee, the way the formulas give them (and the platform: lib/branches.ts).
  const branchValues = (name: string, salary: number) => {
    const activeBranches = new Map((BRI?.branches || []).filter((b) => b.active).map((b) => [b.name, b]));
    const mine = (BRI?.links || []).filter((l) => l.name === name && activeBranches.has(l.branch));
    const links: BranchLink[] = mine.map((l) => ({ employeeId: name, branchId: l.branch, role: l.role, sharePct: l.sharePct, bonusEligible: l.bonusEligible, from: l.from || "", to: l.to || "" }));
    const sales: BranchSales[] = [...activeBranches.values()].map((b) => ({ branchId: b.name, month: input.month, target: b.target, sales: b.sales }));
    const rules: BranchRule[] = [...activeBranches.values()].filter((b) => b.value > 0).map((b) => ({ branchId: b.name, kind: b.kind, value: b.value, active: b.ruleActive }));
    const shares = sharesOf(links, BRI?.mode || "equal", (id) => activeBranches.get(id)?.sales || 0, input.days.filter((d) => d.off === "").map((d) => d.date));
    const bonuses = bonusesOf({ links, shares, grossSalary: salary, rules, sales, nameOf: (id) => id });
    return { shares, bonusOf: (branch: string) => r2(bonuses.filter((b) => b.branchId === branch).reduce((t, b) => t + b.amount, 0)), total: r2(bonuses.reduce((t, b) => t + b.amount, 0)) };
  };

  // ---- The values the formulas give (shown before the program recalculates; computePay is the platform's own function) ----
  type Calc = ReturnType<typeof computeEmployee>;
  const codeOn = (e: WorkbookEmployee, date: string, type: string): string => {
    if ((e.start && date < e.start) || (e.end && date > e.end)) return "X";
    if (type !== "iş") return "";
    let found = "";
    for (const l of input.leaves) if (l.name === e.name && l.from <= date && l.to >= date && l.code) found = shortOf(l.code);
    return found;
  };
  function computeEmployee(e: WorkbookEmployee) {
    const types = days.map(dayType);
    const marks = days.map((d, i) => codeOn(e, d.date, types[i]));
    const idOf = (short: string) => ATTENDANCE_CODES.find((c) => c.short === short)?.id || "";
    const statuses: DayStatus[] = [];
    const vacMask: boolean[] = [];
    days.forEach((d, i) => {
      if (types[i] !== "iş") return;
      const m = marks[i];
      statuses.push(m === "X" ? "outside" : dayStatus(idOf(m)));
      vacMask.push(m !== "X" && isVacationCode(idOf(m)));
    });
    // Marked working days by group, and the calendar days of each stretch: the platform's own rule (lib/payroll-calc.ts).
    const flagsOf = (pred: (id: string) => boolean) => days.map((_, i) => types[i] === "iş" && marks[i] !== "X" && marks[i] !== "" && pred(idOf(marks[i])));
    const vacFlags = flagsOf(isVacationCode);
    const benFlags = flagsOf(isInsuredCode);
    const flagOf = (flags: boolean[]) => (date: string) => flags[days.findIndex((d) => d.date === date)] === true;
    const dayList = days.map((d) => ({ date: d.date, off: d.off }));
    const vacWork = vacFlags.filter(Boolean).length;
    const vacCal = vacationCalendarDays(dayList, flagOf(vacFlags)).calendarDays;
    const benWork = benFlags.filter(Boolean).length;
    const benCal = vacationCalendarDays(dayList, flagOf(benFlags), true).calendarDays;
    const maternity = marks.includes("AN");
    const total = statuses.length;
    const count = (kinds: DayStatus[]) => statuses.filter((s) => kinds.includes(s)).length;
    // A pay change inside the month: each working day is paid at the pay in force that day, so the month's pay is the day-weighted mean.
    const changed = e.newSalary > 0 && !!e.salaryChangeFrom && total > 0;
    const before = changed ? days.filter((d, i) => types[i] === "iş" && d.date < e.salaryChangeFrom).length : 0;
    const salary = changed ? (e.salary * before + e.newSalary * (total - before)) / total : e.salary;
    const benefitDef = TAX_BENEFITS.find((b) => b.short === e.taxBenefit);
    const reduction = e.taxBenefit ? (benefitDef?.amount || 0) + (e.dependents3 ? DEPENDENTS_REDUCTION : 0) : e.taxReduction;
    const mine = input.adds.filter((a) => a.name === e.name);
    const sum = (kind: string) => r2(mine.filter((a) => a.kind === kind).reduce((t, a) => t + a.amount, 0));
    const hours = input.hours.find((h) => h.name === e.name);
    const cap = input.benefit.minPension > 0 ? input.benefit.minPension * BENEFIT_CAP_FACTOR : null;
    const pay = computePay({
      monthlySalary: salary,
      statuses,
      weekHours: e.weekHours,
      sector: e.sector,
      taxReduction: reduction,
      inputs: {
        bonus: r2(sum("Mükafat") + branchValues(e.name, salary).total),
        allowance: sum("Əlavə"),
        overtimeHours: hours?.overtime || 0,
        restDayHours: hours?.restDay || 0,
        nightHours: hours?.night || 0,
        nightPercent: e.nightPercent,
        deductions: mine.filter((a) => a.kind === "Tutulma" && a.amount > 0).map((a) => ({ label: a.label, amount: a.amount, kind: KIND_LABEL[a.deductionKind] || "general" })),
      },
      annual: vacWork ? { mask: vacMask, calendarDays: vacCal, averageMonthly: e.averageMonthly || salary } : undefined,
      leaveCompensation: e.leaveCompDays > 0 ? { days: e.leaveCompDays, averageMonthly: e.averageMonthly || salary } : undefined,
      insured: benWork ? { averageMonthly: e.averageMonthly || salary, calendarDays: benCal, percent: maternity ? input.benefit.maternityPercent : input.benefit.sickPercent, eligible: e.benefitEligible, cap } : undefined,
      advances: sum("Avans"),
    });
    const line = (id: string) => pay.lines.find((l) => l.id === id)?.amount || 0;
    return {
      marks,
      types,
      vacFlags,
      benFlags,
      norm: statuses.filter((s) => s !== "outside").length,
      total,
      salary,
      reduction,
      worked: count(["work"]),
      paidOther: count(["paid"]) - vacWork,
      vacWork,
      vacCal,
      benCal,
      maternity,
      downtime: count(["twothirds"]),
      benefit: count(["benefit"]),
      unpaid: count(["unpaid"]),
      pay,
      line,
      allowance: sum("Əlavə"),
      bonus: r2(sum("Mükafat") + branchValues(e.name, salary).total),
      deducted: r2(mine.filter((a) => a.kind === "Tutulma").reduce((t, a) => t + a.amount, 0)),
      advance: sum("Avans"),
      trips: r2(input.trips.filter((t) => t.name === e.name && (tripNorm(t.destination) || t.daily)).reduce((s, t) => s + tripTotal(t) + t.other - t.advance, 0)),
    };
  }
  const tripNorm = (place: string) => {
    if (DOMESTIC_NORMS.some((d) => d.label === place)) return { norm: DOMESTIC_NORMS.find((d) => d.label === place)!.norm, currency: "AZN" };
    if (place === OTHER_DOMESTIC) return { norm: DOMESTIC_OTHER, currency: "AZN" };
    for (const n of FOREIGN_NORMS) {
      if (n.country === place) return { norm: n.norm, currency: n.currency };
      const city = n.cities.find((c) => `${n.country}, ${c.name}` === place);
      if (city) return { norm: city.norm, currency: n.currency };
    }
    return null;
  };
  const tripDays = (t: { start: string; end: string }) => (t.start && t.end ? Math.round((Date.parse(`${t.end}T00:00:00Z`) - Date.parse(`${t.start}T00:00:00Z`)) / 86_400_000) + 1 : 0);
  const tripDaily = (t: { destination: string; daily?: number }) => {
    if (t.daily && t.daily > 0) return t.daily;
    const n = tripNorm(t.destination);
    if (!n) return 0;
    const rate = n.currency === "AZN" ? 1 : input.rates[n.currency as keyof WorkbookInput["rates"]] || 0;
    return r2(n.norm * rate);
  };
  const tripTotal = (t: { destination: string; start: string; end: string; daily?: number }) => r2(tripDays(t) * tripDaily(t));

  const calcs: Calc[] = input.employees.map(computeEmployee);
  const finOfName = new Map(input.employees.map((e) => [e.name, e.fin || ""]));

  // ---- Parametrlər ----
  const holidayDates = days.filter((d) => d.off && d.off !== "weekend").map((d) => serial(d.date));
  const params: XlsxCell[][] = [["Parametrlər"].map((v) => ({ v, s: "title" as const }))];
  params.push([{ v: "Sarı xanaları dəyişə bilərsiniz (məsələn, minimum əmək haqqı və ya vergi dərəcələri dəyişəndə). Bütün hesablamalar bu xanalardan oxunur.", s: "note" }]);
  const pvalue = (key: keyof typeof PR): XlsxCell => {
    const v = key === "month" ? input.month : key === "calendarDays" ? N : key === "workingDays" ? workingDays : PV[key];
    if (key === "month" || key === "calendarDays" || key === "workingDays") return { v, s: "label" };
    return { v, s: typeof v === "number" && v >= 1 && key !== "dayHours" ? "inputMoney" : "input" };
  };
  const keys = Object.keys(PR) as (keyof typeof PR)[];
  for (const key of keys) {
    const row: XlsxCell[] = [{ v: PLABEL[key], s: "cell" }, pvalue(key)];
    params[PR[key] - 1] = row;
  }
  for (let i = 0; i < params.length; i++) params[i] ||= [];
  // Holidays and company days off that fall on weekdays (column E), for the working-day counts of the leave sheet.
  params[2][3] = { v: "Həftə içi qeyri-iş günləri", s: "label" };
  holidayDates.forEach((d, i) => {
    const r = 3 + i;
    params[r] ||= [];
    params[r][3] = { v: d, s: "inputDate" };
  });
  const paramsSheet: XlsxSheet = { name: WB.params, headers: [], rows: params, free: true, widths: [52, 14, 4, 26], freeze: { rows: 0, cols: 0 } };

  // ---- İşçilər ----
  const staffHeader = ["Ad Soyad", "FİN", "Vəzifə", "Şöbə", "Aylıq maaş (gross, AZN)", "Sektor", "Vergi azaldılması (AZN/ay)", "Həftəlik saat", "12 aylıq orta əmək haqqı (məzuniyyət üçün)", "Gecə əlavəsi (%)", "İşə başlama", "İşdən çıxma", "Xitamda məzuniyyət kompensasiyası (gün)", "Yeni maaş (ay ərzində dəyişmə)", "Dəyişmə tarixi", "Vergi güzəşti (növ)", "3-dən çox himayə", "Müavinət hüququ (6 ay sığorta stajı)"];
  const staffRowsOut: XlsxCell[][] = [
    [{ v: `Əmək haqqı hesablama iş kitabı: ${input.month}`, s: "title" }],
    [{ v: "İşçilər. Sarı xanalar doldurulur. Maaş gross (vergidən əvvəl) yazılır. 12 aylıq orta əmək haqqı boş qalsa məzuniyyət haqqı cari maaşdan hesablanır.", s: "note" }],
    staffHeader.map((v) => ({ v, s: "head" as const })),
  ];
  for (let i = 0; i < staffRows; i++) {
    const e = input.employees[i];
    staffRowsOut.push([
      { v: e?.name ?? "", s: "input" },
      { v: e?.fin ?? "", s: "input" },
      { v: e?.position ?? "", s: "input" },
      { v: e?.department ?? "", s: "input" },
      { v: e ? e.salary : null, s: "inputMoney" },
      { v: e ? SECTOR_LABEL[e.sector] : "Özəl", s: "input" },
      { v: e ? e.taxReduction : null, s: "inputMoney" },
      { v: e ? e.weekHours : 40, s: "inputInt" },
      { v: e && e.averageMonthly ? e.averageMonthly : null, s: "inputMoney" },
      { v: e ? e.nightPercent : null, s: "inputInt" },
      { v: e?.start ? serial(e.start) : null, s: "inputDate" },
      { v: e?.end ? serial(e.end) : null, s: "inputDate" },
      { v: e && e.leaveCompDays ? e.leaveCompDays : null, s: "inputMoney" },
      { v: e && e.newSalary ? e.newSalary : null, s: "inputMoney" },
      { v: e?.salaryChangeFrom ? serial(e.salaryChangeFrom) : null, s: "inputDate" },
      { v: e?.taxBenefit ?? "", s: "input" },
      { v: e ? (e.dependents3 ? "Bəli" : "Xeyr") : "Xeyr", s: "input" },
      { v: e ? (e.benefitEligible ? "Bəli" : "Xeyr") : "Bəli", s: "input" },
    ]);
  }
  const staffNames = `${q(WB.staff)}$A$${S0}:$A$${S0 + staffRows - 1}`;
  const staffSheet: XlsxSheet = {
    name: WB.staff,
    headers: [],
    rows: staffRowsOut,
    free: true,
    widths: [30, 12, 26, 22, 18, 10, 18, 12, 22, 14, 14, 14, 24, 18, 14, 34, 14, 22],
    freeze: { rows: 3, cols: 1 },
    lists: [
      { ref: `F${S0}:F${S0 + staffRows - 1}`, items: ["Özəl", "Dövlət"] },
      { ref: `P${S0}:P${S0 + staffRows - 1}`, source: `${q(WB.benefits)}$A$4:$A$${3 + TAX_BENEFITS.length}` },
      { ref: `Q${S0}:R${S0 + staffRows - 1}`, items: ["Bəli", "Xeyr"] },
    ],
  };
  const benefitRows: XlsxCell[][] = [
    [{ v: "Vergi güzəştləri (Vergi Məcəlləsi, md. 102)", s: "title" }],
    [{ v: "İşçilər vərəqində “Vergi güzəşti (növ)” seçilərsə, aylıq vergi azaldılması buradakı məbləğdən (və 3-dən çox himayə varsa əlavə məbləğdən) götürülür; boş qalarsa “Vergi azaldılması” xanasındakı rəqəm işlənir. Güzəştdən yalnız əsas iş yerində istifadə olunur.", s: "note" }],
    ["Güzəşt", "Aylıq azaldılma (AZN)", "Maddə", "Tam ad"].map((v) => ({ v, s: "head" as const })),
    ...TAX_BENEFITS.map((b): XlsxCell[] => [{ v: b.short, s: "cell" }, { v: b.amount, s: "money" }, { v: b.article, s: "cell" }, { v: b.label, s: "cell" }]),
  ];
  const benefitsSheet: XlsxSheet = { name: WB.benefits, headers: [], rows: benefitRows, free: true, widths: [40, 20, 12, 110], freeze: { rows: 3, cols: 0 } };

  const staffFins = `${q(WB.staff)}$B$${S0}:$B$${S0 + staffRows - 1}`;
  // The FİN of the person named in column A, looked up in "İşçilər" (so it follows a name picked from the list).
  const finByName = (r: number, cached: string): XlsxCell => ({ f: `IF(A${r}="","",IFERROR(INDEX(${staffFins},MATCH(A${r},${staffNames},0)),""))`, v: cached, s: "cell" });

  // ---- Kodlar ----
  const codeRows: XlsxCell[][] = [[{ v: "Davamiyyət kodları", s: "title" }], [{ v: "Azad olmalar vərəqində “Növ” bu siyahıdan seçilir, tabeldə qısa kod görünür.", s: "note" }], ["Ad", "Qısa kod", "Hesablamada", "Qrup"].map((v) => ({ v, s: "head" as const }))];
  for (const c of ATTENDANCE_CODES) codeRows.push([{ v: labelOf(c.id), s: "cell" }, { v: c.short, s: "cell" }, { v: GROUP_NAME[groupOf(c.id)], s: "cell" }, { v: c.group, s: "cell" }]);
  const codeCount = ATTENDANCE_CODES.length;
  codeRows.push([{ v: "İşdə deyil (işə qəbuldan əvvəl / çıxışdan sonra)", s: "cell" }, { v: "X", s: "cell" }, { v: "Norma günündən çıxarılır", s: "cell" }, { v: "Avtomatik", s: "cell" }]);
  const codesSheet: XlsxSheet = { name: WB.codes, headers: [], rows: codeRows, free: true, widths: [58, 12, 32, 28], freeze: { rows: 3, cols: 0 } };
  const codeLabels = `${q(WB.codes)}$A$4:$A$${3 + codeCount}`;
  const codeShorts = `${q(WB.codes)}$B$4:$B$${3 + codeCount}`;

  // ---- Azad olmalar ----
  const leaveRows: XlsxCell[][] = [
    [{ v: "Azad olmalar, məzuniyyət və qeyri-iş günləri (aralıq üzrə)", s: "title" }],
    [{ v: "Hər sətir bir aralıqdır: işçi, növ, başlama və bitmə tarixi. Tabel bu cədvəldən avtomatik doldurulur. Eyni gün iki aralıqda olarsa, aşağıdakı sətir üstünlük təşkil edir. Platformaya yükləmədə yalnız bu vərəq (aralıqlar) oxunur.", s: "note" }],
    ["Ad Soyad", "FİN", "Növ", "Qısa kod", "Başlama", "Bitmə", "İş günü", "Təqvim günü", "Qeyd"].map((v) => ({ v, s: "head" as const })),
  ];
  const leaveFirst = 4;
  const leaveLast = leaveFirst + LEAVE_ROWS - 1;
  for (let i = 0; i < LEAVE_ROWS; i++) {
    const r = leaveFirst + i;
    const l = input.leaves[i];
    const days_ = l ? Math.round((Date.parse(`${l.to}T00:00:00Z`) - Date.parse(`${l.from}T00:00:00Z`)) / 86_400_000) + 1 : null;
    const work_ = l ? days.filter((d) => !d.off && d.date >= l.from && d.date <= l.to).length : null;
    leaveRows.push([
      { v: l?.name ?? "", s: "input" },
      finByName(r, l ? finOfName.get(l.name) || "" : ""),
      { v: l ? labelOf(l.code) : "", s: "input" },
      { f: `IF(C${r}="","",IFERROR(INDEX(${codeShorts},MATCH(C${r},${codeLabels},0)),""))`, v: l ? shortOf(l.code) : "", s: "cell" },
      { v: l ? serial(l.from) : null, s: "inputDate" },
      { v: l ? serial(l.to) : null, s: "inputDate" },
      { f: `IF(OR(E${r}="",F${r}=""),"",NETWORKDAYS(E${r},F${r},${q(WB.params)}$D$4:$D$60))`, v: work_ ?? "", s: "int" },
      { f: `IF(OR(E${r}="",F${r}=""),"",F${r}-E${r}+1)`, v: days_ ?? "", s: "int" },
      { v: l?.note ?? "", s: "input" },
    ]);
  }
  const leaveSheet: XlsxSheet = {
    name: WB.leaves,
    headers: [],
    rows: leaveRows,
    free: true,
    widths: [30, 12, 44, 10, 14, 14, 10, 12, 30],
    freeze: { rows: 3, cols: 0 },
    lists: [
      { ref: `A${leaveFirst}:A${leaveLast}`, source: staffNames },
      { ref: `C${leaveFirst}:C${leaveLast}`, source: codeLabels },
    ],
  };
  const LA = (col: string) => `${q(WB.leaves)}$${col}$${leaveFirst}:$${col}$${leaveLast}`;

  // ---- Tabel ----
  const sumStart = N + DC; // first summary column (1-based)
  const SUM = { norm: sumStart, worked: sumStart + 1, paid: sumStart + 2, vac: sumStart + 3, down: sumStart + 4, benefit: sumStart + 5, unpaid: sumStart + 6, vacCal: sumStart + 7, benCal: sumStart + 8, mat: sumStart + 9 };
  const tabelRows: XlsxCell[][] = [
    [{ v: `Davamiyyət cədvəli (tabel): ${input.month}`, s: "title" }],
    [{ v: "Tabel “Azad olmalar” vərəqindən avtomatik doldurulur: boş xana işdə deyil, işlənib deməkdir; qısa kod həmin günün azad olma növüdür; X işçinin işə qəbuldan əvvəl və ya çıxışdan sonra günüdür.", s: "note" }],
    [
      { v: "Ad Soyad", s: "head" },
      { v: "FİN", s: "head" },
      ...days.map((d) => ({ v: serial(d.date), s: "dayhead" as const })),
      ...["Norma günü", "İşləyib", "Digər ödənişli", "Məzuniyyət (iş günü)", "Boşdayanma", "Müavinətlə (SS)", "Ödənişsiz", "Məzuniyyət (təqvim günü)", "Müavinət (təqvim günü)", "Analıq günü"].map((v) => ({ v, s: "head" as const })),
    ],
    [
      { v: "gün növü", s: "label" },
      { v: "", s: "label" },
      ...days.map((d) => ({ v: dayType(d), s: d.off === "" ? ("cell" as const) : d.off === "weekend" || d.off === "company" ? ("weekend" as const) : ("holiday" as const) })),
    ],
  ];
  // The calendar days of a leave or sickness stretch follow the platform's rule: a weekend or company day off counts when the
  // nearest working day before and after it is marked too (holidays count as well for sickness). The "Köməkçi" sheet does it
  // in four steps per employee: the marked working days, the state of the nearest marked day before, the one after, the count.
  const HB = staffRows + 2;
  const hrow = (set: number, block: number, i: number) => 5 + (set * 4 + block) * HB + i;
  const chainOf = (flags: boolean[], types: string[], includeHolidays: boolean) => {
    const mark = flags.map((f) => (f ? 1 : 0));
    const prev: number[] = [];
    const next: number[] = [];
    flags.forEach((_, j) => {
      prev[j] = j === 0 ? 0 : types[j - 1] === "iş" ? mark[j - 1] : prev[j - 1];
    });
    for (let j = flags.length - 1; j >= 0; j--) next[j] = j === flags.length - 1 ? 0 : types[j + 1] === "iş" ? mark[j + 1] : next[j + 1];
    const count = flags.map((_, j) => (types[j] === "iş" ? mark[j] : includeHolidays || types[j] === "istirahət" || types[j] === "qeyri-iş" ? prev[j] * next[j] : 0));
    return { mark, prev, next, count };
  };
  const helperRows: XlsxCell[][] = [];
  const putHelper = (row: number, cells: XlsxCell[]) => {
    while (helperRows.length < row) helperRows.push([]);
    helperRows[row - 1] = cells;
  };
  const SET_TITLE = ["Məzuniyyət", "Sığorta müavinəti (xəstəlik, analıq)"];
  const BLOCK_TITLE = ["işarələnmiş iş günü", "əvvəlki işarəli iş günü", "sonrakı işarəli iş günü", "təqvim günü sayı"];
  for (let i = 0; i < staffRows; i++) {
    const r = T0 + i;
    const ir = S0 + i;
    const c = calcs[i];
    const dayCells: XlsxCell[] = days.map((_, j) => {
      const col = L(DC + j);
      const staff = q(WB.staff);
      const match = `SUMPRODUCT(MAX((${LA("A")}=$A${r})*(${LA("E")}<=${col}$3)*(${LA("F")}>=${col}$3)*(${LA("D")}<>"")*(ROW(${LA("A")})-${leaveFirst - 1})))`;
      const f = `IF($A${r}="","",IF(OR(AND(${staff}$K${ir}<>"",${col}$3<${staff}$K${ir}),AND(${staff}$L${ir}<>"",${col}$3>${staff}$L${ir})),"X",IF(${col}$4<>"iş","",IF(${match}=0,"",INDEX(${LA("D")},${match})))))`;
      return { f, v: c ? c.marks[j] : "", s: days[j].off === "" ? ("cell" as const) : days[j].off === "weekend" || days[j].off === "company" ? ("weekend" as const) : ("holiday" as const) };
    });
    const cells = rowCells(r);
    const inWork = `(${typeRow}="iş")*(${cells}<>"X")`;
    const cnt = (shorts: string[]) => `SUMPRODUCT(${inWork}*ISNUMBER(MATCH(${cells},${arrayOf(shorts)},0)))`;
    const sumCells: XlsxCell[] = [
      { f: `IF($A${r}="","",SUMPRODUCT(${inWork}))`, v: c ? c.norm : "", s: "int" },
      { f: `IF($A${r}="","",SUMPRODUCT(${inWork}*((${cells}="")+ISNUMBER(MATCH(${cells},${arrayOf(shortsOf("work"))},0)))))`, v: c ? c.worked : "", s: "int" },
      { f: `IF($A${r}="","",${cnt(shortsOf("paid"))})`, v: c ? c.paidOther : "", s: "int" },
      { f: `IF($A${r}="","",${cnt(shortsOf("vacation"))})`, v: c ? c.vacWork : "", s: "int" },
      { f: `IF($A${r}="","",${cnt(shortsOf("downtime"))})`, v: c ? c.downtime : "", s: "int" },
      { f: `IF($A${r}="","",${cnt(shortsOf("benefit"))})`, v: c ? c.benefit : "", s: "int" },
      { f: `IF($A${r}="","",${cnt(shortsOf("unpaid"))})`, v: c ? c.unpaid : "", s: "int" },
      { f: `IF($A${r}="","",SUM(${q(WB.helper)}${firstDay}${hrow(0, 3, i)}:${lastDay}${hrow(0, 3, i)}))`, v: c ? c.vacCal : "", s: "int" },
      { f: `IF($A${r}="","",SUM(${q(WB.helper)}${firstDay}${hrow(1, 3, i)}:${lastDay}${hrow(1, 3, i)}))`, v: c ? c.benCal : "", s: "int" },
      { f: `IF($A${r}="","",COUNTIF(${cells},"AN"))`, v: c ? (c.maternity ? 1 : 0) * c.marks.filter((m) => m === "AN").length : "", s: "int" },
    ];
    tabelRows.push([{ f: `IF(${q(WB.staff)}A${ir}="","",${q(WB.staff)}A${ir})`, v: input.employees[i]?.name ?? "", s: "cell" }, { f: `IF(${q(WB.staff)}A${ir}="","",${q(WB.staff)}B${ir})`, v: input.employees[i]?.fin ?? "", s: "cell" }, ...dayCells, ...sumCells]);
    for (let set = 0; set < 2; set++) {
      const codes = arrayOf(shortsOf(set === 0 ? "vacation" : "benefit"));
      const values = c ? chainOf(set === 0 ? c.vacFlags : c.benFlags, c.types, set === 1) : null;
      for (let block = 0; block < 4; block++) {
        const hr = hrow(set, block, i);
        const nameCell: XlsxCell = { f: `IF(${q(WB.sheet)}$A${r}="","",${q(WB.sheet)}$A${r})`, v: input.employees[i]?.name ?? "", s: "cell" };
        const cells: XlsxCell[] = days.map((_, j) => {
          const col = L(DC + j);
          const type = `${q(WB.sheet)}${col}$4`;
          const own = `${q(WB.sheet)}${col}${r}`;
          const markRef = (c2: string) => `${c2}${hrow(set, 0, i)}`;
          let f = "";
          let v = 0;
          if (block === 0) {
            f = `IF($A${hr}="",0,IF(AND(${type}="iş",${own}<>"X",ISNUMBER(MATCH(${own},${codes},0))),1,0))`;
            v = values ? values.mark[j] : 0;
          } else if (block === 1) {
            f = j === 0 ? "0" : `IF(${q(WB.sheet)}${L(DC - 1 + j)}$4="iş",${markRef(L(1 + j))},${L(DC - 1 + j)}${hr})`;
            v = values ? values.prev[j] : 0;
          } else if (block === 2) {
            f = j === N - 1 ? "0" : `IF(${q(WB.sheet)}${L(DC + 1 + j)}$4="iş",${markRef(L(3 + j))},${L(DC + 1 + j)}${hr})`;
            v = values ? values.next[j] : 0;
          } else {
            const both = `${col}${hrow(set, 1, i)}*${col}${hrow(set, 2, i)}`;
            f = set === 0 ? `IF(${type}="iş",${markRef(col)},IF(OR(${type}="istirahət",${type}="qeyri-iş"),${both},0))` : `IF(${type}="iş",${markRef(col)},${both})`;
            v = values ? values.count[j] : 0;
          }
          return { f, v, s: "int" as const };
        });
        putHelper(hr, [nameCell, { v: "", s: "cell" }, ...cells]);
      }
    }
  }
  const tabelSheet: XlsxSheet = { name: WB.sheet, headers: [], rows: tabelRows, free: true, widths: [30, 12, ...days.map(() => 4.2), 11, 10, 13, 15, 12, 14, 11, 16, 16, 11], freeze: { rows: 4, cols: 2 } };
  const TB = (key: keyof typeof SUM, r: number) => `${q(WB.sheet)}${L(SUM[key])}${r}`;
  for (let set = 0; set < 2; set++)
    for (let block = 0; block < 4; block++) {
      putHelper(hrow(set, block, 0) - 1, [{ v: `${SET_TITLE[set]}: ${BLOCK_TITLE[block]}`, s: "label" }]);
    }
  helperRows[0] = [{ v: "Köməkçi hesablamalar (təqvim günləri)", s: "title" }];
  helperRows[1] = [{ v: "Bu vərəq Tabeldəki məzuniyyət və müavinət günlərinin təqvim sayını platformanın qaydası ilə çıxarır. Burada heç nə əl ilə yazılmır.", s: "note" }];
  for (let k = 0; k < helperRows.length; k++) helperRows[k] ||= [];
  const helperSheet: XlsxSheet = { name: WB.helper, headers: [], rows: helperRows, free: true, widths: [30, 12, ...days.map(() => 4.2)], freeze: { rows: 2, cols: 1 } };

  // ---- Əlavə-Tutulma ----
  const addRows: XlsxCell[][] = [
    [{ v: "Mükafat, əlavə, tutulma və avans", s: "title" }],
    [{ v: "Hər sətir bir maddədir. Növ: Mükafat, Əlavə, Tutulma (tutulma növü: Ümumi / İcra sənədi / Aliment) və ya Avans. Tutulmalar qanuni həddə (20 / 50 / 70%) endirilir. Platformada artıq qeyd olunmuş avanslar tarixsiz görünür. Platformaya yeni avans yazmaq üçün “Avansın ödəniş tarixi”ni doldurun (avans günü və limitlər platformada yoxlanır).", s: "note" }],
    ["Ad Soyad", "FİN", "Növ", "Ad / səbəb", "Məbləğ (AZN)", "Tutulma növü", "Qeyd", "Avansın ödəniş tarixi"].map((v) => ({ v, s: "head" as const })),
  ];
  const addFirst = 4;
  const addLast = addFirst + ADD_ROWS - 1;
  for (let i = 0; i < ADD_ROWS; i++) {
    const a = input.adds[i];
    addRows.push([
      { v: a?.name ?? "", s: "input" },
      finByName(addFirst + i, a ? finOfName.get(a.name) || "" : ""),
      { v: a?.kind ?? "", s: "input" },
      { v: a?.label ?? "", s: "input" },
      { v: a ? a.amount : null, s: "inputMoney" },
      { v: a?.kind === "Tutulma" ? a.deductionKind : "", s: "input" },
      { v: "", s: "input" },
      { v: null, s: "inputDate" },
    ]);
  }
  const addsSheet: XlsxSheet = {
    name: WB.adds,
    headers: [],
    rows: addRows,
    free: true,
    widths: [30, 12, 14, 34, 16, 16, 30, 20],
    freeze: { rows: 3, cols: 0 },
    lists: [
      { ref: `A${addFirst}:A${addLast}`, source: staffNames },
      { ref: `C${addFirst}:C${addLast}`, items: ["Mükafat", "Əlavə", "Tutulma", "Avans"] },
      { ref: `F${addFirst}:F${addLast}`, items: ["Ümumi", "İcra sənədi", "Aliment"] },
    ],
  };
  const AD = (col: string) => `${q(WB.adds)}$${col}$${addFirst}:$${col}$${addLast}`;

  // ---- Saatlar ----
  const hourRows: XlsxCell[][] = [
    [{ v: "Əlavə saatlar (ay yekunu)", s: "title" }],
    [{ v: "İş vaxtından artıq iş 2 qat (md. 165), istirahət və bayram günü işi 1 qat (md. 164, norma daxilində), gecə işi gecə əlavəsi faizi ilə (md. 166) ödənilir. Saatlar platformaya ay yekunu kimi yazılır.", s: "note" }],
    ["Ad Soyad", "FİN", "Artıq iş saatı", "İstirahət / bayram günü saatı", "Gecə saatı"].map((v) => ({ v, s: "head" as const })),
  ];
  for (let i = 0; i < staffRows; i++) {
    const ir = S0 + i;
    const h = input.hours.find((x) => x.name === input.employees[i]?.name);
    hourRows.push([
      { f: `IF(${q(WB.staff)}A${ir}="","",${q(WB.staff)}A${ir})`, v: input.employees[i]?.name ?? "", s: "cell" },
      { f: `IF(${q(WB.staff)}A${ir}="","",${q(WB.staff)}B${ir})`, v: input.employees[i]?.fin ?? "", s: "cell" },
      { v: h?.overtime || null, s: "inputMoney" },
      { v: h?.restDay || null, s: "inputMoney" },
      { v: h?.night || null, s: "inputMoney" },
    ]);
  }
  const hoursSheet: XlsxSheet = { name: WB.hours, headers: [], rows: hourRows, free: true, widths: [30, 12, 18, 28, 14], freeze: { rows: 3, cols: 1 } };

  // ---- Normlar, Məzənnə ----
  const normRows: XlsxCell[][] = [
    [{ v: "Ezamiyyət gündəlik normaları", s: "title" }],
    [{ v: "Azərbaycan Respublikası Nazirlər Kabinetinin 25.01.2008-ci il tarixli 14 nömrəli qərarı (26.10.2026-cı il dəyişikliklərinədək). Norma 1 gün üçündür, valyuta sütununda göstərilən valyutadadır.", s: "note" }],
    ["Yer", "Norma", "Valyuta", "Növ"].map((v) => ({ v, s: "head" as const })),
  ];
  for (const d of DOMESTIC_NORMS) normRows.push([{ v: d.label, s: "cell" }, { v: d.norm, s: "money" }, { v: "AZN", s: "cell" }, { v: "Daxili", s: "cell" }]);
  normRows.push([{ v: OTHER_DOMESTIC, s: "cell" }, { v: DOMESTIC_OTHER, s: "money" }, { v: "AZN", s: "cell" }, { v: "Daxili", s: "cell" }]);
  for (const n of FOREIGN_NORMS) {
    normRows.push([{ v: n.country, s: "cell" }, { v: n.norm, s: "money" }, { v: n.currency, s: "cell" }, { v: "Xarici", s: "cell" }]);
    for (const c of n.cities) normRows.push([{ v: `${n.country}, ${c.name}`, s: "cell" }, { v: c.norm, s: "money" }, { v: n.currency, s: "cell" }, { v: "Xarici", s: "cell" }]);
  }
  const normFirst = 4;
  const normLast = 3 + normRows.length - 3;
  const normsSheet: XlsxSheet = { name: WB.norms, headers: [], rows: normRows, free: true, widths: [62, 10, 10, 10], freeze: { rows: 3, cols: 0 } };
  const fxRows: XlsxCell[][] = [
    [{ v: "Mərkəzi Bankın rəsmi məzənnəsi", s: "title" }],
    [{ v: `Mənbə: cbar.az, ${input.ratesDate} tarixli bülleten. Ezamiyyətin başlama gününə rəsmi məzənnəni bu xanalara yazın (1 vahid xarici valyuta neçə AZN). Platformaya yüklənəndə məzənnə ezamiyyətin başlama gününə görə avtomatik götürülür.`, s: "note" }],
    ["Valyuta", "1 vahid = AZN", "Qeyd"].map((v) => ({ v, s: "head" as const })),
    [{ v: "USD", s: "cell" }, { v: input.rates.USD, s: "inputMoney" }, { v: "ABŞ dolları", s: "cell" }],
    [{ v: "EUR", s: "cell" }, { v: input.rates.EUR, s: "inputMoney" }, { v: "Avro", s: "cell" }],
    [{ v: "GBP", s: "cell" }, { v: input.rates.GBP, s: "inputMoney" }, { v: "İngilis funt sterlinqi", s: "cell" }],
    [{ v: "JPY", s: "cell" }, { v: input.rates.JPY, s: "inputMoney" }, { v: "Yapon yeni (1 yen)", s: "cell" }],
  ];
  const fxSheet: XlsxSheet = { name: WB.fx, headers: [], rows: fxRows, free: true, widths: [12, 16, 32], freeze: { rows: 3, cols: 0 } };

  // ---- Ezamiyyət ----
  const tripRows: XlsxCell[][] = [
    [{ v: "Ezamiyyətlər və gündəlik hesabı", s: "title" }],
    [{ v: "Təyinat qanunun cədvəlindən seçilir. Daxili “digər” yer üçün yerin adını ayrıca sütunda yazın. Gündəlik = norma × məzənnə × gün. Ezamiyyət ödənişi əmək haqqına daxil deyil, ayrıca ödənilir.", s: "note" }],
    ["Ad Soyad", "FİN", "Təyinat (qanunun cədvəlindən)", "Yerin adı (yalnız “digər” üçün)", "Başlama", "Bitmə", "Məqsəd", "Gün", "Norma", "Valyuta", "Məzənnə", "Gündəlik (AZN)", "Gündəlik cəmi (AZN)", "Avans (AZN)", "Digər xərclər (AZN)", "Ödəniləcək qalıq (AZN)", "Gündəlik (əl ilə, AZN)"].map((v) => ({ v, s: "head" as const })),
  ];
  const tripFirst = 4;
  const tripLast = tripFirst + TRIP_ROWS - 1;
  const NR = `${q(WB.norms)}$A$${normFirst}:$C$${normLast}`;
  for (let i = 0; i < TRIP_ROWS; i++) {
    const r = tripFirst + i;
    const t = input.trips[i];
    const norm = t ? tripNorm(t.destination) : null;
    const rate = norm ? (norm.currency === "AZN" ? 1 : input.rates[norm.currency as keyof WorkbookInput["rates"]]) : "";
    const d = t ? tripDays(t) : "";
    const daily = t && (norm || t.daily) ? tripDaily(t) : "";
    tripRows.push([
      { v: t?.name ?? "", s: "input" },
      finByName(r, t ? finOfName.get(t.name) || "" : ""),
      { v: t?.destination ?? "", s: "input" },
      { v: t?.place ?? "", s: "input" },
      { v: t?.start ? serial(t.start) : null, s: "inputDate" },
      { v: t?.end ? serial(t.end) : null, s: "inputDate" },
      { v: t?.purpose ?? "", s: "input" },
      { f: `IF(OR(E${r}="",F${r}=""),"",F${r}-E${r}+1)`, v: d, s: "int" },
      { f: `IF(C${r}="","",IFERROR(VLOOKUP(C${r},${NR},2,FALSE),""))`, v: norm ? norm.norm : "", s: "money" },
      { f: `IF(C${r}="","",IFERROR(VLOOKUP(C${r},${NR},3,FALSE),""))`, v: norm ? norm.currency : "", s: "cell" },
      { f: `IF(J${r}="","",IF(J${r}="AZN",1,IFERROR(VLOOKUP(J${r},${q(WB.fx)}$A$4:$B$12,2,FALSE),"")))`, v: rate, s: "money" },
      { f: `IF(Q${r}<>"",Q${r},IF(OR(I${r}="",K${r}=""),"",ROUND(I${r}*K${r},2)))`, v: daily, s: "money" },
      { f: `IF(OR(H${r}="",L${r}=""),"",ROUND(H${r}*L${r},2))`, v: t && (norm || t.daily) ? tripTotal(t) : "", s: "money" },
      { v: t ? t.advance : null, s: "inputMoney" },
      { v: t ? t.other : null, s: "inputMoney" },
      { f: `IF(M${r}="","",ROUND(M${r}+O${r}-N${r},2))`, v: t && (norm || t.daily) ? r2(tripTotal(t) + t.other - t.advance) : "", s: "total" },
      { v: t && t.daily ? t.daily : null, s: "inputMoney" },
    ]);
  }
  const tripsSheet: XlsxSheet = {
    name: WB.trips,
    headers: [],
    rows: tripRows,
    free: true,
    widths: [30, 12, 48, 26, 13, 13, 26, 7, 10, 9, 10, 14, 16, 13, 16, 18, 18],
    freeze: { rows: 3, cols: 1 },
    lists: [
      { ref: `A${tripFirst}:A${tripLast}`, source: staffNames },
      { ref: `C${tripFirst}:C${tripLast}`, source: `${q(WB.norms)}$A$${normFirst}:$A$${normLast}` },
    ],
  };
  const TR = (col: string) => `${q(WB.trips)}$${col}$${tripFirst}:$${col}$${tripLast}`;

  // ---- Hesablama ----
  const order = ["name", "fin", "salary", "reduction", "week", "norm", "worked", "paid", "vacWork", "vacCal", "down", "benefit", "unpaid", "benCal", "day", "hour", "payWorked", "payPaid", "payVac", "comp", "payDown", "over", "rest", "night", "allow", "bonus", "gross", "base", "tax", "soc", "unemp", "med", "net", "dedAsk", "share", "dedApplied", "advance", "toPay", "excess", "erSoc", "erUnemp", "erMed", "cost", "benefitAmt", "trips"] as const;
  const H = Object.fromEntries(order.map((k, i) => [k, i + 1])) as Record<(typeof order)[number], number>;
  const HEAD = ["Ad Soyad", "FİN", "Aylıq maaş (hesablama üçün)", "Vergi azaldılması", "Həftəlik saat", "Norma günü", "İşləyib", "Digər ödənişli", "Məzuniyyət (iş günü)", "Məzuniyyət (təqvim)", "Boşdayanma", "Müavinətlə (SS)", "Ödənişsiz", "Müavinət (təqvim)", "Gün haqqı", "Saat haqqı", "İşlənmiş günlər", "Digər ödənişli günlər", "Məzuniyyət haqqı", "Məzuniyyət kompensasiyası", "Boşdayanma (2/3)", "Artıq iş (×2)", "İstirahət günü işi", "Gecə əlavəsi", "Əlavə", "Mükafat", "Hesablanmış (gross)", "Vergi bazası", "Gəlir vergisi", "DSMF (işçi)", "İşsizlik (işçi)", "İTS (işçi)", "Xalis (net)", "Tutulma (istənilən)", "Tutulma həddi", "Tutulma (tətbiq)", "Avans", "Ödəniləcək", "Avans artığı", "DSMF (işəgötürən)", "İşsizlik (işəgötürən)", "İTS (işəgötürən)", "İşəgötürən xərci", "Sığorta müavinəti (SS ödəyir)", "Ezamiyyət (ayrıca)"];
  const groups: [number, number, string][] = [[H.norm, H.benCal, "Tabeldən (gün)"], [H.day, H.hour, "Tarif"], [H.payWorked, H.gross, "Hesablanır"], [H.base, H.net, "Vergi və sığorta (işçi)"], [H.dedAsk, H.excess, "Tutulma, avans, ödəniş"], [H.erSoc, H.benefitAmt, "İşəgötürən və müavinət"]];
  const calcRows: XlsxCell[][] = [
    [{ v: `Əmək haqqı hesablaması: ${input.month}`, s: "title" }],
    [{ v: "Hər sətir bir işçidir. Rəqəmlər İşçilər, Tabel, Əlavə-Tutulma, Saatlar və Ezamiyyət vərəqlərindən formullarla hesablanır; burada heç nə əl ilə yazılmır. Rəsmi hesablama və təsdiq platformadadır: bu iş kitabı eyni qaydaları Excel-də görməyə imkan verir.", s: "note" }],
    HEAD.map((_, i) => {
      const g = groups.find((x) => i + 1 >= x[0] && i + 1 <= x[1]);
      return { v: g && g[0] === i + 1 ? g[2] : "", s: "label" as const };
    }),
    HEAD.map((v) => ({ v, s: "head" as const })),
  ];
  const C0 = 5;
  for (let i = 0; i < staffRows; i++) {
    const r = C0 + i;
    const ir = S0 + i;
    const tr = T0 + i;
    const st = q(WB.staff);
    const c = calcs[i];
    const e = input.employees[i];
    const a = (key: keyof typeof H) => `${L(H[key])}${r}`;
    const empty = `$A${r}=""`;
    const pay = c?.pay;
    const line = (id: string) => c?.line(id) ?? 0;
    const f = (formula: string, v: number | string, s: "int" | "money" | "total" | "cell" | "pct"): XlsxCell => ({ f: `IF(${empty},"",${formula})`, v: c ? v : "", s });
    const advanceF = `SUMIFS(${AD("E")},${AD("A")},$A${r},${AD("C")},"Avans")`;
    const taxBase = `MAX(0,${a("gross")}-${a("reduction")})`;
    const dedCount = (kind: string) => `COUNTIFS(${AD("A")},$A${r},${AD("C")},"Tutulma",${AD("F")},"${kind}")`;
    const dedRows = pay?.otherDeductions || [];
    const applied = dedRows.reduce((t, d) => t + d.applied, 0);
    calcRows.push([
      { f: `IF(${st}A${ir}="","",${st}A${ir})`, v: e?.name ?? "", s: "cell" },
      f(`${st}B${ir}`, e?.fin ?? "", "cell"),
      f(`IF(AND(${st}N${ir}<>"",${st}O${ir}<>""),(${st}E${ir}*SUMPRODUCT((${q(WB.sheet)}${typeRow}="iş")*(${q(WB.sheet)}${dateRow}<${st}O${ir}))+${st}N${ir}*(${P("workingDays")}-SUMPRODUCT((${q(WB.sheet)}${typeRow}="iş")*(${q(WB.sheet)}${dateRow}<${st}O${ir}))))/${P("workingDays")},${st}E${ir})`, c?.salary ?? 0, "money"),
      f(`IF(${st}P${ir}="",${st}G${ir},IFERROR(VLOOKUP(${st}P${ir},${q(WB.benefits)}$A$4:$B$${3 + TAX_BENEFITS.length},2,FALSE),0)+IF(${st}Q${ir}="Bəli",${P("dependents")},0))`, c?.reduction ?? 0, "money"),
      f(`${st}H${ir}`, e?.weekHours ?? 40, "int"),
      f(TB("norm", tr), c?.norm ?? 0, "int"),
      f(TB("worked", tr), c?.worked ?? 0, "int"),
      f(TB("paid", tr), c?.paidOther ?? 0, "int"),
      f(TB("vac", tr), c?.vacWork ?? 0, "int"),
      f(TB("vacCal", tr), c?.vacCal ?? 0, "int"),
      f(TB("down", tr), c?.downtime ?? 0, "int"),
      f(TB("benefit", tr), c?.benefit ?? 0, "int"),
      f(TB("unpaid", tr), c?.unpaid ?? 0, "int"),
      f(TB("benCal", tr), c?.benCal ?? 0, "int"),
      f(`${a("salary")}/${P("workingDays")}`, e ? e.salary / (c?.total || 1) : 0, "money"),
      f(`${a("salary")}/(${P("workingDays")}*IF(${a("week")}<40,${a("week")}/5,${P("dayHours")}))`, pay?.hourly ?? 0, "money"),
      f(`ROUND(${a("day")}*${a("worked")},2)`, line("worked"), "money"),
      f(`ROUND(${a("day")}*${a("paid")},2)`, line("paid-leave"), "money"),
      f(`ROUND(IF(${st}I${ir}="",${a("salary")},${st}I${ir})/${P("meanMonth")}*${a("vacCal")},2)`, line("vacation"), "money"),
      f(`ROUND(IF(${st}I${ir}="",${a("salary")},${st}I${ir})/${P("meanMonth")}*N(${st}M${ir}),2)`, line("leave-compensation"), "money"),
      f(`ROUND(${a("day")}*${a("down")}*2/3,2)`, line("downtime"), "money"),
      f(`ROUND(${a("hour")}*2*${q(WB.hours)}C${ir},2)`, line("overtime"), "money"),
      f(`ROUND(${a("hour")}*${q(WB.hours)}D${ir},2)`, line("rest-day"), "money"),
      f(`ROUND(${a("hour")}*${st}J${ir}*${q(WB.hours)}E${ir}/100,2)`, line("night"), "money"),
      f(`ROUND(SUMIFS(${AD("E")},${AD("A")},$A${r},${AD("C")},"Əlavə"),2)`, c?.allowance ?? 0, "money"),
      f(`ROUND(SUMIFS(${AD("E")},${AD("A")},$A${r},${AD("C")},"Mükafat")+SUMIFS(${LKR("M")},${LKR("B")},$A${r}),2)`, c?.bonus ?? 0, "money"),
      f(`ROUND(SUM(${L(H.payWorked)}${r}:${L(H.bonus)}${r}),2)`, pay?.gross ?? 0, "total"),
      f(taxBase, Math.max(0, (pay?.gross ?? 0) - (c?.reduction ?? 0)), "money"),
      f(`IF(${st}F${ir}="Dövlət",IF(${a("base")}<=${P("tier1")},${a("base")}*${P("pubRate1")},${P("pubBase")}+(${a("base")}-${P("tier1")})*${P("pubRate2")}),IF(${a("base")}<=${P("tier1")},MAX(0,${a("base")}-${P("taxFree")})*${P("rate1")},IF(${a("base")}<=${P("tier2")},${P("base2")}+(${a("base")}-${P("tier1")})*${P("rate2")},${P("base3")}+(${a("base")}-${P("tier2")})*${P("rate3")})))`, pay?.incomeTax ?? 0, "money"),
      f(`IF(${st}F${ir}="Dövlət",${a("gross")}*${P("socLow")},IF(${a("gross")}<=${P("socLimit")},${a("gross")}*${P("socLow")},${P("socLimit")}*${P("socLow")}+(${a("gross")}-${P("socLimit")})*${P("socHigh")}))`, pay?.employeeSocial ?? 0, "money"),
      f(`${a("gross")}*${P("unemp")}`, pay?.employeeUnemployment ?? 0, "money"),
      f(`IF(${a("gross")}<=${P("medLimit")},${a("gross")}*${P("medLow")},${P("medBase")}+(${a("gross")}-${P("medLimit")})*${P("medHigh")})`, pay?.employeeMedical ?? 0, "money"),
      f(`ROUND(${a("gross")}-SUM(${L(H.tax)}${r}:${L(H.med)}${r}),2)`, pay?.net ?? 0, "total"),
      f(`ROUND(SUMIFS(${AD("E")},${AD("A")},$A${r},${AD("C")},"Tutulma"),2)`, c?.deducted ?? 0, "money"),
      f(`IF(${a("dedAsk")}=0,0,IF(${dedCount("Aliment")}>0,${P("capAlimony")},IF(${dedCount("İcra sənədi")}>0,${P("capWrit")},${P("capGeneral")})))`, pay?.deductionCapShare ?? 0, "pct"),
      f(`ROUND(MIN(${a("dedAsk")},${a("net")}*${a("share")}),2)`, applied, "money"),
      f(`ROUND(${advanceF},2)`, c?.advance ?? 0, "money"),
      f(`MAX(0,ROUND(${a("net")}-${a("dedApplied")}-${a("advance")},2))`, pay?.toPay ?? 0, "total"),
      f(`MAX(0,ROUND(${a("advance")}-(${a("net")}-${a("dedApplied")}),2))`, pay?.advanceExcess ?? 0, "money"),
      f(`IF(${st}F${ir}="Dövlət",${a("gross")}*${P("erLow")},IF(${a("gross")}<=${P("socLimit")},${a("gross")}*${P("erLow")},IF(${a("gross")}<=${P("erLimit")},${P("socLimit")}*${P("erLow")}+(${a("gross")}-${P("socLimit")})*${P("erMid")},${P("socLimit")}*${P("erLow")}+(${P("erLimit")}-${P("socLimit")})*${P("erMid")}+(${a("gross")}-${P("erLimit")})*${P("erHigh")})))`, pay?.employerSocial ?? 0, "money"),
      f(`${a("gross")}*${P("unemp")}`, pay?.employerUnemployment ?? 0, "money"),
      f(`IF(${a("gross")}<=${P("medLimit")},${a("gross")}*${P("medLow")},${P("medBase")}+(${a("gross")}-${P("medLimit")})*${P("medHigh")})`, pay?.employerMedical ?? 0, "money"),
      f(`ROUND(${a("gross")}+SUM(${L(H.erSoc)}${r}:${L(H.erMed)}${r}),2)`, pay?.employerCost ?? 0, "total"),
      f(`IF(${a("benCal")}=0,0,IF(${st}R${ir}="Xeyr",0,ROUND(MIN(IF(${P("minPension")}>0,${P("minPension")}*${P("capFactor")},1E+99),IF(${st}I${ir}="",${a("salary")},${st}I${ir})/${P("meanMonth")}*IF(${TB("mat", tr)}>0,${P("maternityPct")},${P("sickPct")})/100*${a("benCal")}),2)))`, pay?.benefitAmount ?? 0, "money"),
      f(`ROUND(SUMIFS(${TR("P")},${TR("A")},$A${r}),2)`, c?.trips ?? 0, "money"),
    ]);
  }
  const totalRow = C0 + staffRows;
  const sums: XlsxCell[] = HEAD.map((_, i) => {
    const col = i + 1;
    if (col === 1) return { v: "Cəmi", s: "label" as const };
    if (col < H.payWorked && col !== H.salary) return { v: "", s: "label" as const };
    if (col === H.week || col === H.share) return { v: "", s: "label" as const };
    const cached = calcRows.slice(4).reduce((t, row) => {
      const cell = row[i];
      return t + (cell && typeof cell === "object" && typeof cell.v === "number" ? cell.v : 0);
    }, 0);
    return { f: `SUM(${L(col)}${C0}:${L(col)}${totalRow - 1})`, v: r2(cached), s: "total" as const };
  });
  calcRows.push(sums);
  const calcSheet: XlsxSheet = { name: WB.calc, headers: [], rows: calcRows, free: true, widths: [30, ...HEAD.slice(1).map(() => 13)], freeze: { rows: 4, cols: 1 } };

  // ---- Filiallar: branches with their sales limit, sales and bonus rule ----
  const branchRows: XlsxCell[][] = [
    [{ v: "Filiallar, satış limiti və bonus qaydası", s: "title" }],
    [{ v: "Hər filialın satış limiti, satışı və bonus qaydası. Satış limitə çatanda (və ya keçəndə) filialın işçilərinə bonus avtomatik hesablanır: sabit məbləğ (hər işçiyə) və ya filiala düşən maaşın faizi (100 = maaşın özü qədər). Bonus «Hesablama» vərəqində «Mükafat»a əlavə olunur.", s: "note" }],
    [{ v: "Bölgü rejimi", s: "label" }, { v: BRI ? MODE_TEXT[BRI.mode] : MODE_TEXT.equal, s: "input" }, { v: "Bir neçə filialda işləyən işçinin maaşı: Bərabər (filial sayına görə) və ya Satışa görə. Pay % yazılıbsa o üstündür.", s: "note" }],
    ["Filial", "Kod", "Şəhər", "Aktiv", "Satış limiti", "Satış", "Bonus növü", "Bonus dəyəri", "Qayda aktiv", "Limit çatıb"].map((v) => ({ v, s: "head" as const })),
  ];
  for (let i = 0; i < BR_LAST - BR_FIRST + 1; i++) {
    const b = BRI?.branches[i];
    const r = BR_FIRST + i;
    const reached = !!b && b.target > 0 && b.sales >= b.target;
    branchRows.push([
      { v: b?.name ?? "", s: "input" },
      { v: b?.code ?? "", s: "input" },
      { v: b?.city ?? "", s: "input" },
      { v: b ? (b.active ? "Bəli" : "Xeyr") : "", s: "input" },
      { v: b && b.target ? b.target : null, s: "inputMoney" },
      { v: b && b.sales ? b.sales : null, s: "inputMoney" },
      { v: b ? (b.kind === "fixed" ? "Sabit məbləğ" : "Maaşın %") : "", s: "input" },
      { v: b && b.value ? b.value : null, s: "inputMoney" },
      { v: b ? (b.ruleActive ? "Bəli" : "Xeyr") : "", s: "input" },
      { f: `IF(A${r}="","",IF(AND(N(E${r})>0,N(F${r})>=N(E${r})),"Bəli","Xeyr"))`, v: b ? (reached ? "Bəli" : "Xeyr") : "", s: "cell" },
    ]);
  }
  const branchSheet: XlsxSheet = {
    name: WB.branches,
    headers: [],
    rows: branchRows,
    free: true,
    widths: [26, 10, 16, 10, 16, 16, 18, 14, 12, 12],
    freeze: { rows: 4, cols: 1 },
    lists: [
      { ref: "B3", items: ["Bərabər", "Satışa görə"] },
      { ref: `D${BR_FIRST}:D${BR_LAST}`, items: ["Bəli", "Xeyr"] },
      { ref: `G${BR_FIRST}:G${BR_LAST}`, items: ["Sabit məbləğ", "Maaşın %"] },
      { ref: `I${BR_FIRST}:I${BR_LAST}`, items: ["Bəli", "Xeyr"] },
    ],
  };

  // ---- İşçi-filial: who works in which branch, the share of the pay and the bonus ----
  const salaryOfName = new Map(input.employees.map((e, i) => [e.name, calcs[i]?.salary ?? e.salary]));
  const branchByName = new Map((BRI?.branches || []).map((b) => [b.name, b]));
  const linkCached = new Map<string, ReturnType<typeof branchValues>>();
  const linkRows: XlsxCell[][] = [
    [{ v: "İşçilərin filiallara bölgüsü", s: "title" }],
    [{ v: "Hər sətir bir işçinin bir filialdakı işidir; eyni işçi bir neçə sətirdə (bir neçə filialda) ola bilər. Pay % boşdursa maaş «Bölgü rejimi»nə görə bölünür; yazılıbsa həmin faizlə. Sağdakı xanalar hesablanır (filiala düşən pay və bonus).", s: "note" }],
    ["FİN", "Ad Soyad", "Filial", "Vəzifə (filialda)", "Pay %", "Bonus alır", "Başlama", "Bitmə", "Pay (hesablanan)", "Filialın satışı", "Filial aktiv", "Aylıq maaş", "Filial bonusu", "Filialda iş günü"].map((v) => ({ v, s: "head" as const })),
  ];
  const LKB = LKR("B");
  const LKK = LKR("K");
  for (let i = 0; i < LK_LAST - LK_FIRST + 1; i++) {
    const l = BRI?.links[i];
    const r = LK_FIRST + i;
    const br = l ? branchByName.get(l.branch) : undefined;
    if (l && !linkCached.has(l.name)) linkCached.set(l.name, branchValues(l.name, salaryOfName.get(l.name) ?? 0));
    const cache = l ? linkCached.get(l.name) : undefined;
    const active = !!br && br.active;
    const share = l && active ? cache?.shares.get(l.branch) ?? 0 : 0;
    const m = `MATCH(C${r},${FBR("A")},0)`;
    const manual = `SUMIFS(${LKR("E")},${LKB},B${r},${LKK},"Bəli")`;
    const salesTotal = `SUMIFS(${LKR("J")},${LKB},B${r},${LKK},"Bəli")`;
    linkRows.push([
      { f: `IF(B${r}="","",IFERROR(INDEX(${staffFins},MATCH(B${r},${staffNames},0)),""))`, v: l ? l.fin : "", s: "cell" },
      { v: l?.name ?? "", s: "input" },
      { v: l?.branch ?? "", s: "input" },
      { v: l?.role ?? "", s: "input" },
      { v: l && l.sharePct ? l.sharePct : null, s: "inputMoney" },
      { v: l ? (l.bonusEligible ? "Bəli" : "Xeyr") : "", s: "input" },
      { v: l?.from ? l.from : null, s: "inputDate" },
      { v: l?.to ? l.to : null, s: "inputDate" },
      { f: `IF(B${r}="","",IF(K${r}<>"Bəli",0,IF(${manual}>0,N(E${r})/${manual},IF(AND(COUNTIFS(${LKB},B${r},${LKK},"Bəli",${LKR("N")},"<"&${P("workingDays")})>0,SUMIFS(${LKR("N")},${LKB},B${r},${LKK},"Bəli")>0),N(N${r})/SUMIFS(${LKR("N")},${LKB},B${r},${LKK},"Bəli"),IF(AND(${MODE_CELL}="Satışa görə",${salesTotal}>0),J${r}/${salesTotal},1/COUNTIFS(${LKB},B${r},${LKK},"Bəli"))))))`, v: l ? share : "", s: "pct" },
      { f: `IF(C${r}="","",IFERROR(INDEX(${FBR("F")},${m}),0))`, v: l ? (br ? br.sales : 0) : "", s: "money" },
      { f: `IF(C${r}="","",IFERROR(INDEX(${FBR("D")},${m}),"Xeyr"))`, v: l ? (br ? (br.active ? "Bəli" : "Xeyr") : "Xeyr") : "", s: "cell" },
      { f: `IF(B${r}="","",IFERROR(INDEX(${q(WB.calc)}$${L(H.salary)}$${C0}:$${L(H.salary)}$${C0 + staffRows - 1},MATCH(B${r},${q(WB.calc)}$A$${C0}:$A$${C0 + staffRows - 1},0)),0))`, v: l ? salaryOfName.get(l.name) ?? 0 : "", s: "money" },
      { f: `IF(B${r}="","",ROUND(IF(OR(K${r}<>"Bəli",F${r}="Xeyr"),0,IFERROR(IF(AND(INDEX(${FBR("I")},${m})<>"Xeyr",INDEX(${FBR("J")},${m})="Bəli",N(INDEX(${FBR("H")},${m}))>0),IF(INDEX(${FBR("G")},${m})="Sabit məbləğ",INDEX(${FBR("H")},${m}),L${r}*I${r}*INDEX(${FBR("H")},${m})/100),0),0)),2))`, v: l ? (active && l.bonusEligible ? cache?.bonusOf(l.branch) ?? 0 : 0) : "", s: "money" },
      { f: `IF(B${r}="","",COUNTIFS(${q(WB.sheet)}${typeRow},"iş",${q(WB.sheet)}${dateRow},">="&IF(G${r}="",0,G${r}),${q(WB.sheet)}${dateRow},"<="&IF(H${r}="",99999,H${r})))`, v: l ? daysOfLink({ from: l.from || "", to: l.to || "" }, input.days.filter((d) => d.off === "").map((d) => d.date)) : "", s: "cell" },
    ]);
  }
  const peopleSheet: XlsxSheet = {
    name: WB.branchPeople,
    headers: [],
    rows: linkRows,
    free: true,
    widths: [12, 30, 24, 26, 10, 12, 14, 14, 14, 16, 12, 14, 16, 14],
    freeze: { rows: 3, cols: 2 },
    lists: [
      { ref: `B${LK_FIRST}:B${LK_LAST}`, source: staffNames },
      { ref: `C${LK_FIRST}:C${LK_LAST}`, source: FBR("A") },
      { ref: `F${LK_FIRST}:F${LK_LAST}`, items: ["Bəli", "Xeyr"] },
    ],
  };

  // ---- Təlimat ----
  const guideRows: XlsxCell[][] = [
    [{ v: `Əmək haqqı hesablama iş kitabı: ${input.month}`, s: "title" }],
    [{ v: "Bu fayl JobMatch platformasından yüklənib. Excel-də formullarla hesablama aparır və doldurduğunuz məlumatı platformaya geri yükləməyə imkan verir.", s: "note" }],
    [],
    [{ v: "Vərəqlər", s: "label" }],
    ["İşçilər", "İşçi siyahısı, maaş, sektor, vergi güzəşti, müavinət hüququ. Platformadan doldurulub; Excel-də hesablama üçün dəyişə bilərsiniz. Yalnız “Yeni maaş” + “Dəyişmə tarixi” platformaya əmr kimi yüklənir."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Azad olmalar", "Məzuniyyət, xəstəlik, ezamiyyət, icazə və s. aralıqlar. Platformaya yüklənir (davamiyyət)."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Tabel", "Davamiyyət cədvəli: “Azad olmalar” vərəqindən avtomatik doldurulur, gün sayları çıxarılır. Burada əl ilə yazılmır."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Əlavə-Tutulma", "Mükafat, əlavə, tutulma, avans. Hamısı platformaya yüklənir (avans yalnız ödəniş tarixi yazılıbsa)."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Filiallar", "Filiallar, aylıq satış limiti, satış və bonus qaydası. Satış limitə çatanda filial bonusu avtomatik hesablanır. Platformaya yüklənir."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["İşçi-filial", "Hansı işçi hansı filialda (bir neçə filialda da) hansı vəzifədə işləyir; maaş filiallara bölünür. Ay ərzində filial dəyişibsə (Başlama/Bitmə tarixləri), maaş hər filialda işlənən iş gününə görə bölünür (məsələn 20 iş gününün 15-i A-da, 5-i B-də: 75% / 25%). Platformaya yüklənir."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Saatlar", "Artıq iş, istirahət günü və gecə saatları (ay yekunu). Platformaya yüklənir."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Ezamiyyət", "Ezamiyyətlər, qanunun gündəlik normaları və Mərkəzi Bankın məzənnəsi ilə gündəlik hesabı. Platformaya yüklənir."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Hesablama", "Hər işçi üçün gross, vergi və sığorta, xalis, tutulma, ödəniləcək məbləğ və işəgötürən xərci. Formullarla hesablanır."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Parametrlər, Normlar, Məzənnə, Güzəştlər, Kodlar, Köməkçi", "Vergi dərəcələri və müavinət faizləri, ezamiyyət normaları, məzənnə, vergi güzəştləri, davamiyyət kodları və köməkçi hesablamalar. Dəyişiklik lazım olsa, sarı xanaları düzəldin."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    [],
    [{ v: "İş qaydası", s: "label" }],
    [{ v: "1. “Azad olmalar”da məzuniyyət və yoxluqları aralıq kimi yazın; “Əlavə-Tutulma” və “Saatlar”ı, ezamiyyətləri doldurun.", s: "text" }],
    [{ v: "2. “Hesablama” vərəqində nəticəni görün. Formulları pozmayın: sarı xanalar daxil edilir, qalanı hesablanır.", s: "text" }],
    [{ v: "3. Platformada: Əmək haqqı → “Excel iş kitabından yüklə” düyməsi ilə faylı seçin, nəyin yüklənəcəyini önizləmədə görün və təsdiqləyin.", s: "text" }],
    [{ v: "4. Yüklənən məlumat platformanın öz qaydalarına görə yoxlanır (qanuni hədlər, ezamiyyət normaları, təsdiqlənmiş ay). Rəsmi hesablama və təsdiq platformada aparılır.", s: "text" }],
    [],
    [{ v: "Nəzərə alın", s: "label" }],
    [{ v: "• Məzuniyyət haqqı 12 aylıq orta əmək haqqından (÷ 30,4) hesablanır; İşçilər vərəqində həmin orta xanası boşdursa cari maaş götürülür. Məzuniyyət və müavinət günlərinin təqvim sayı platformanın qaydası ilə çıxarılır (Köməkçi vərəqi).", s: "text" }],
    [{ v: "• Sığorta müavinəti (xəstəlik, analıq) sığortaçı tərəfindən ödənilir və əmək haqqına daxil deyil; Hesablama vərəqində ayrıca göstərilir (orta əmək haqqı × faiz ÷ 30,4 × təqvim günü, minimum pensiyanın 25 qatı ilə məhdud, 6 aylıq sığorta stajı olmayana verilmir).", s: "text" }],
    [{ v: "• Ay ərzində maaş dəyişikliyi: İşçilər vərəqində “Yeni maaş” və “Dəyişmə tarixi” yazın; ay iş günlərinə görə çəkili orta ilə hesablanır. Platformaya yüklənəndə bu, imzaya gedən əmr olaraq yaradılır.", s: "text" }],
    [{ v: "• Vergi güzəşti: “Vergi güzəşti (növ)” siyahıdan seçilir (Güzəştlər vərəqi), 3-dən çox himayə varsa 50 AZN əlavə olunur; seçilməzsə “Vergi azaldılması” xanasındakı rəqəm işlənir.", s: "text" }],
    [{ v: "• Xitamda istifadə olunmamış məzuniyyət kompensasiyası İşçilər vərəqindəki gün sayı ilə hesablanır (platforma həmin günü özü tapır).", s: "text" }],
    [{ v: "• Platformaya yüklənənlər: azad olmalar, mükafat/əlavə (adları ilə)/tutulma, saatlar, ezamiyyətlər (əl ilə yazılmış gündəliklə), tarixi doldurulmuş yeni avanslar və maaş dəyişikliyi əmrləri. Təyinat qanunun cədvəlində olmayan sətir yüklənmir.", s: "text" }],
    [{ v: "• İşçi adları iş kitabında və platformada eyni olmalıdır; eyni adlı iki işçi varsa platformada FİN ilə tapılır.", s: "text" }],
  ];
  const guideSheet: XlsxSheet = { name: WB.guide, headers: [], rows: guideRows, free: true, widths: [34, 130], freeze: { rows: 0, cols: 0 } };

  // The note under each title runs across the sheet instead of wrapping inside the first column.
  const list = [guideSheet, staffSheet, leaveSheet, tabelSheet, addsSheet, branchSheet, peopleSheet, hoursSheet, tripsSheet, calcSheet, paramsSheet, normsSheet, fxSheet, benefitsSheet, codesSheet, helperSheet];
  for (const sheet of list) {
    const width = Math.max(...sheet.rows.map((r) => r.length), 1);
    const span = sheet === guideSheet ? 2 : sheet === tabelSheet ? Math.min(width, 18) : Math.min(width, sheet === paramsSheet ? 2 : 9);
    sheet.merges = [...(sheet.merges || []), `A2:${L(span)}2`];
    sheet.rowHeights = { ...(sheet.rowHeights || {}), 2: sheet === guideSheet ? 34 : 48 };
  }
  return list;
}
