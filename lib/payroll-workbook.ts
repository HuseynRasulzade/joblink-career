// The calculation workbook (Excel) of the month: pay, timesheet, leave and absences, bonuses, additions, deductions,
// extra hours, business trips. It carries live formulas, so the accountant can work in Excel alone; the inputs
// (leave and absence ranges, bonuses / additions / deductions, hours, trips) go back into the platform from the same file.
// The "Hesablama" sheet follows the platform's own rules (lib/payroll-calc.ts); the tests recalculate the file with
// LibreOffice and compare it with the platform, so the formulas cannot drift from the rules.
import { ATTENDANCE_CODES } from "./calendar-az.ts";
import { computePay, dayStatus, isVacationCode, type DayStatus } from "./payroll-calc.ts";
import { FOREIGN_NORMS } from "./trip-norms-data.ts";
import { DOMESTIC_NORMS, DOMESTIC_OTHER } from "./trip-norms.ts";
import { OTHER_DOMESTIC } from "./trip-places.ts";
import type { XlsxCell, XlsxSheet } from "./xlsx.ts";
import { excelDateSerial } from "./xlsx.ts";

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
  start: string;
  end: string;
};
export type WorkbookInput = {
  month: string;
  days: { date: string; off: "" | "weekend" | "holiday" | "transfer" | "company" }[];
  employees: WorkbookEmployee[];
  leaves: { name: string; code: string; from: string; to: string; note: string }[];
  adds: { name: string; kind: "Mükafat" | "Əlavə" | "Tutulma" | "Avans"; label: string; amount: number; deductionKind: "Ümumi" | "İcra sənədi" | "Aliment" }[];
  hours: { name: string; overtime: number; restDay: number; night: number }[];
  trips: { name: string; destination: string; place: string; start: string; end: string; purpose: string; advance: number; other: number }[];
  rates: { USD: number; EUR: number; GBP: number; JPY: number };
  ratesDate: string;
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
const PR = { month: 3, calendarDays: 4, workingDays: 5, dayHours: 6, meanMonth: 7, taxFree: 8, tier1: 9, tier2: 10, rate1: 11, rate2: 12, rate3: 13, base2: 14, base3: 15, pubRate1: 16, pubRate2: 17, pubBase: 18, socLow: 19, socHigh: 20, socLimit: 21, unemp: 22, medLow: 23, medHigh: 24, medLimit: 25, medBase: 26, erLow: 27, erMid: 28, erHigh: 29, erLimit: 30, capGeneral: 31, capWrit: 32, capAlimony: 33, minWage: 34 } as const;
const PV: Record<keyof typeof PR, number | string> = { month: "", calendarDays: 0, workingDays: 0, dayHours: 8, meanMonth: 30.4, taxFree: 200, tier1: 2500, tier2: 8000, rate1: 0.03, rate2: 0.1, rate3: 0.14, base2: 75, base3: 625, pubRate1: 0.14, pubRate2: 0.25, pubBase: 350, socLow: 0.03, socHigh: 0.1, socLimit: 200, unemp: 0.005, medLow: 0.02, medHigh: 0.005, medLimit: 2500, medBase: 50, erLow: 0.22, erMid: 0.15, erHigh: 0.11, erLimit: 8000, capGeneral: 0.2, capWrit: 0.5, capAlimony: 0.7, minWage: 400 };
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
};

export function buildPayrollWorkbook(input: WorkbookInput): XlsxSheet[] {
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
  const firstDay = L(2);
  const lastDay = L(N + 1);
  const range = (row: number) => `$${firstDay}${row}:$${lastDay}${row}`;
  const rowCells = (row: number) => `${firstDay}${row}:${lastDay}${row}`;
  const typeRow = `$${firstDay}$4:$${lastDay}$4`;
  const dateRow = `$${firstDay}$3:$${lastDay}$3`;

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
    const vacWork = vacMask.filter(Boolean).length;
    // Calendar days of the vacation between its first and last marked day (weekends and company days off inside count, holidays do not).
    let vacCal = vacWork;
    if (vacWork) {
      const idx = days.map((_, i) => i).filter((i) => types[i] === "iş" && marks[i] !== "X" && isVacationCode(idOf(marks[i])));
      const a = idx[0];
      const b = idx[idx.length - 1];
      vacCal += days.filter((_, i) => i > a && i < b && (types[i] === "istirahət" || types[i] === "qeyri-iş")).length;
    }
    const total = statuses.length;
    const count = (kinds: DayStatus[]) => statuses.filter((s) => kinds.includes(s)).length;
    const mine = input.adds.filter((a) => a.name === e.name);
    const sum = (kind: string) => r2(mine.filter((a) => a.kind === kind).reduce((t, a) => t + a.amount, 0));
    const hours = input.hours.find((h) => h.name === e.name);
    const pay = computePay({
      monthlySalary: e.salary,
      statuses,
      weekHours: e.weekHours,
      sector: e.sector,
      taxReduction: e.taxReduction,
      inputs: {
        bonus: sum("Mükafat"),
        allowance: sum("Əlavə"),
        overtimeHours: hours?.overtime || 0,
        restDayHours: hours?.restDay || 0,
        nightHours: hours?.night || 0,
        nightPercent: e.nightPercent,
        deductions: mine.filter((a) => a.kind === "Tutulma" && a.amount > 0).map((a) => ({ label: a.label, amount: a.amount, kind: KIND_LABEL[a.deductionKind] || "general" })),
      },
      annual: vacWork ? { mask: vacMask, calendarDays: vacCal, averageMonthly: e.averageMonthly || e.salary } : undefined,
      advances: sum("Avans"),
    });
    const line = (id: string) => pay.lines.find((l) => l.id === id)?.amount || 0;
    return {
      marks,
      norm: statuses.filter((s) => s !== "outside").length,
      total,
      worked: count(["work"]),
      paidOther: count(["paid"]) - vacWork,
      vacWork,
      vacCal,
      downtime: count(["twothirds"]),
      benefit: count(["benefit"]),
      unpaid: count(["unpaid"]),
      pay,
      line,
      allowance: sum("Əlavə"),
      bonus: sum("Mükafat"),
      deducted: r2(mine.filter((a) => a.kind === "Tutulma").reduce((t, a) => t + a.amount, 0)),
      advance: sum("Avans"),
      trips: r2(input.trips.filter((t) => t.name === e.name && tripNorm(t.destination)).reduce((s, t) => s + tripTotal(t) + t.other - t.advance, 0)),
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
  const tripDaily = (t: { destination: string }) => {
    const n = tripNorm(t.destination);
    if (!n) return 0;
    const rate = n.currency === "AZN" ? 1 : input.rates[n.currency as keyof WorkbookInput["rates"]] || 0;
    return r2(n.norm * rate);
  };
  const tripTotal = (t: { destination: string; start: string; end: string }) => r2(tripDays(t) * tripDaily(t));

  const calcs: Calc[] = input.employees.map(computeEmployee);

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
  const staffHeader = ["Ad Soyad", "FİN", "Vəzifə", "Şöbə", "Aylıq maaş (gross, AZN)", "Sektor", "Vergi azaldılması (AZN/ay)", "Həftəlik saat", "12 aylıq orta əmək haqqı (məzuniyyət üçün)", "Gecə əlavəsi (%)", "İşə başlama", "İşdən çıxma"];
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
    ]);
  }
  const staffNames = `${q(WB.staff)}$A$${S0}:$A$${S0 + staffRows - 1}`;
  const staffSheet: XlsxSheet = {
    name: WB.staff,
    headers: [],
    rows: staffRowsOut,
    free: true,
    widths: [30, 12, 26, 22, 18, 10, 18, 12, 22, 14, 14, 14],
    freeze: { rows: 3, cols: 1 },
    lists: [{ ref: `F${S0}:F${S0 + staffRows - 1}`, items: ["Özəl", "Dövlət"] }],
  };

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
    ["Ad Soyad", "Növ", "Qısa kod", "Başlama", "Bitmə", "İş günü", "Təqvim günü", "Qeyd"].map((v) => ({ v, s: "head" as const })),
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
      { v: l ? labelOf(l.code) : "", s: "input" },
      { f: `IF(B${r}="","",IFERROR(INDEX(${codeShorts},MATCH(B${r},${codeLabels},0)),""))`, v: l ? shortOf(l.code) : "", s: "cell" },
      { v: l ? serial(l.from) : null, s: "inputDate" },
      { v: l ? serial(l.to) : null, s: "inputDate" },
      { f: `IF(OR(D${r}="",E${r}=""),"",NETWORKDAYS(D${r},E${r},${q(WB.params)}$D$4:$D$60))`, v: work_ ?? "", s: "int" },
      { f: `IF(OR(D${r}="",E${r}=""),"",E${r}-D${r}+1)`, v: days_ ?? "", s: "int" },
      { v: l?.note ?? "", s: "input" },
    ]);
  }
  const leaveSheet: XlsxSheet = {
    name: WB.leaves,
    headers: [],
    rows: leaveRows,
    free: true,
    widths: [30, 44, 10, 14, 14, 10, 12, 30],
    freeze: { rows: 3, cols: 0 },
    lists: [
      { ref: `A${leaveFirst}:A${leaveLast}`, source: staffNames },
      { ref: `B${leaveFirst}:B${leaveLast}`, source: codeLabels },
    ],
  };
  const LA = (col: string) => `${q(WB.leaves)}$${col}$${leaveFirst}:$${col}$${leaveLast}`;

  // ---- Tabel ----
  const sumStart = N + 2; // first summary column (1-based)
  const SUM = { norm: sumStart, worked: sumStart + 1, paid: sumStart + 2, vac: sumStart + 3, down: sumStart + 4, benefit: sumStart + 5, unpaid: sumStart + 6, vacCal: sumStart + 7 };
  const tabelRows: XlsxCell[][] = [
    [{ v: `Davamiyyət cədvəli (tabel): ${input.month}`, s: "title" }],
    [{ v: "Tabel “Azad olmalar” vərəqindən avtomatik doldurulur: boş xana işdə deyil, işlənib deməkdir; qısa kod həmin günün azad olma növüdür; X işçinin işə qəbuldan əvvəl və ya çıxışdan sonra günüdür.", s: "note" }],
    [
      { v: "Ad Soyad", s: "head" },
      ...days.map((d) => ({ v: serial(d.date), s: "dayhead" as const })),
      ...["Norma günü", "İşləyib", "Digər ödənişli", "Məzuniyyət (iş günü)", "Boşdayanma", "Müavinətlə (SS)", "Ödənişsiz", "Məzuniyyət (təqvim günü)"].map((v) => ({ v, s: "head" as const })),
    ],
    [
      { v: "gün növü", s: "label" },
      ...days.map((d) => ({ v: dayType(d), s: d.off === "" ? ("cell" as const) : d.off === "weekend" || d.off === "company" ? ("weekend" as const) : ("holiday" as const) })),
    ],
  ];
  for (let i = 0; i < staffRows; i++) {
    const r = T0 + i;
    const ir = S0 + i;
    const c = calcs[i];
    const dayCells: XlsxCell[] = days.map((_, j) => {
      const col = L(2 + j);
      const staff = q(WB.staff);
      const match = `SUMPRODUCT(MAX((${LA("A")}=$A${r})*(${LA("D")}<=${col}$3)*(${LA("E")}>=${col}$3)*(${LA("C")}<>"")*(ROW(${LA("A")})-${leaveFirst - 1})))`;
      const f = `IF($A${r}="","",IF(OR(AND(${staff}$K${ir}<>"",${col}$3<${staff}$K${ir}),AND(${staff}$L${ir}<>"",${col}$3>${staff}$L${ir})),"X",IF(${col}$4<>"iş","",IF(${match}=0,"",INDEX(${LA("C")},${match})))))`;
      return { f, v: c ? c.marks[j] : "", s: days[j].off === "" ? ("cell" as const) : days[j].off === "weekend" || days[j].off === "company" ? ("weekend" as const) : ("holiday" as const) };
    });
    const cells = rowCells(r);
    const inWork = `(${typeRow}="iş")*(${cells}<>"X")`;
    const cnt = (shorts: string[]) => `SUMPRODUCT(${inWork}*ISNUMBER(MATCH(${cells},${arrayOf(shorts)},0)))`;
    const vacShorts = arrayOf(shortsOf("vacation"));
    const isVac = `(${typeRow}="iş")*ISNUMBER(MATCH(${cells},${vacShorts},0))`;
    const first = `(1000000-SUMPRODUCT(MAX(${isVac}*(1000000-${dateRow}))))`;
    const last = `SUMPRODUCT(MAX(${isVac}*${dateRow}))`;
    const sumCells: XlsxCell[] = [
      { f: `IF($A${r}="","",SUMPRODUCT(${inWork}))`, v: c ? c.norm : "", s: "int" },
      { f: `IF($A${r}="","",SUMPRODUCT(${inWork}*((${cells}="")+ISNUMBER(MATCH(${cells},${arrayOf(shortsOf("work"))},0)))))`, v: c ? c.worked : "", s: "int" },
      { f: `IF($A${r}="","",${cnt(shortsOf("paid"))})`, v: c ? c.paidOther : "", s: "int" },
      { f: `IF($A${r}="","",${cnt(shortsOf("vacation"))})`, v: c ? c.vacWork : "", s: "int" },
      { f: `IF($A${r}="","",${cnt(shortsOf("downtime"))})`, v: c ? c.downtime : "", s: "int" },
      { f: `IF($A${r}="","",${cnt(shortsOf("benefit"))})`, v: c ? c.benefit : "", s: "int" },
      { f: `IF($A${r}="","",${cnt(shortsOf("unpaid"))})`, v: c ? c.unpaid : "", s: "int" },
      { f: `IF($A${r}="","",IF(${L(SUM.vac)}${r}=0,0,${L(SUM.vac)}${r}+SUMPRODUCT(((${typeRow}="istirahət")+(${typeRow}="qeyri-iş"))*(${dateRow}>${first})*(${dateRow}<${last}))))`, v: c ? c.vacCal : "", s: "int" },
    ];
    tabelRows.push([{ f: `IF(${q(WB.staff)}A${ir}="","",${q(WB.staff)}A${ir})`, v: input.employees[i]?.name ?? "", s: "cell" }, ...dayCells, ...sumCells]);
  }
  const tabelSheet: XlsxSheet = { name: WB.sheet, headers: [], rows: tabelRows, free: true, widths: [30, ...days.map(() => 4.2), 11, 10, 13, 15, 12, 14, 11, 16], freeze: { rows: 4, cols: 1 } };
  const TB = (key: keyof typeof SUM, r: number) => `${q(WB.sheet)}${L(SUM[key])}${r}`;

  // ---- Əlavə-Tutulma ----
  const addRows: XlsxCell[][] = [
    [{ v: "Mükafat, əlavə, tutulma və avans", s: "title" }],
    [{ v: "Hər sətir bir maddədir. Növ: Mükafat, Əlavə, Tutulma (tutulma növü: Ümumi / İcra sənədi / Aliment) və ya Avans. Tutulmalar qanuni həddə (20 / 50 / 70%) endirilir. Avans yalnız bu Excel hesablaması üçündür; platformada avans Əmək haqqı → ödənişlər bölməsində qeyd olunur.", s: "note" }],
    ["Ad Soyad", "Növ", "Ad / səbəb", "Məbləğ (AZN)", "Tutulma növü", "Qeyd"].map((v) => ({ v, s: "head" as const })),
  ];
  const addFirst = 4;
  const addLast = addFirst + ADD_ROWS - 1;
  for (let i = 0; i < ADD_ROWS; i++) {
    const a = input.adds[i];
    addRows.push([
      { v: a?.name ?? "", s: "input" },
      { v: a?.kind ?? "", s: "input" },
      { v: a?.label ?? "", s: "input" },
      { v: a ? a.amount : null, s: "inputMoney" },
      { v: a?.kind === "Tutulma" ? a.deductionKind : "", s: "input" },
      { v: "", s: "input" },
    ]);
  }
  const addsSheet: XlsxSheet = {
    name: WB.adds,
    headers: [],
    rows: addRows,
    free: true,
    widths: [30, 14, 34, 16, 16, 30],
    freeze: { rows: 3, cols: 0 },
    lists: [
      { ref: `A${addFirst}:A${addLast}`, source: staffNames },
      { ref: `B${addFirst}:B${addLast}`, items: ["Mükafat", "Əlavə", "Tutulma", "Avans"] },
      { ref: `E${addFirst}:E${addLast}`, items: ["Ümumi", "İcra sənədi", "Aliment"] },
    ],
  };
  const AD = (col: string) => `${q(WB.adds)}$${col}$${addFirst}:$${col}$${addLast}`;

  // ---- Saatlar ----
  const hourRows: XlsxCell[][] = [
    [{ v: "Əlavə saatlar (ay yekunu)", s: "title" }],
    [{ v: "İş vaxtından artıq iş 2 qat (md. 165), istirahət və bayram günü işi 1 qat (md. 164, norma daxilində), gecə işi gecə əlavəsi faizi ilə (md. 166) ödənilir. Saatlar platformaya ay yekunu kimi yazılır.", s: "note" }],
    ["Ad Soyad", "Artıq iş saatı", "İstirahət / bayram günü saatı", "Gecə saatı"].map((v) => ({ v, s: "head" as const })),
  ];
  for (let i = 0; i < staffRows; i++) {
    const ir = S0 + i;
    const h = input.hours.find((x) => x.name === input.employees[i]?.name);
    hourRows.push([
      { f: `IF(${q(WB.staff)}A${ir}="","",${q(WB.staff)}A${ir})`, v: input.employees[i]?.name ?? "", s: "cell" },
      { v: h?.overtime || null, s: "inputMoney" },
      { v: h?.restDay || null, s: "inputMoney" },
      { v: h?.night || null, s: "inputMoney" },
    ]);
  }
  const hoursSheet: XlsxSheet = { name: WB.hours, headers: [], rows: hourRows, free: true, widths: [30, 18, 28, 14], freeze: { rows: 3, cols: 1 } };

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
    ["Ad Soyad", "Təyinat (qanunun cədvəlindən)", "Yerin adı (yalnız “digər” üçün)", "Başlama", "Bitmə", "Məqsəd", "Gün", "Norma", "Valyuta", "Məzənnə", "Gündəlik (AZN)", "Gündəlik cəmi (AZN)", "Avans (AZN)", "Digər xərclər (AZN)", "Ödəniləcək qalıq (AZN)"].map((v) => ({ v, s: "head" as const })),
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
    const daily = t && norm ? tripDaily(t) : "";
    tripRows.push([
      { v: t?.name ?? "", s: "input" },
      { v: t?.destination ?? "", s: "input" },
      { v: t?.place ?? "", s: "input" },
      { v: t?.start ? serial(t.start) : null, s: "inputDate" },
      { v: t?.end ? serial(t.end) : null, s: "inputDate" },
      { v: t?.purpose ?? "", s: "input" },
      { f: `IF(OR(D${r}="",E${r}=""),"",E${r}-D${r}+1)`, v: d, s: "int" },
      { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},${NR},2,FALSE),""))`, v: norm ? norm.norm : "", s: "money" },
      { f: `IF(B${r}="","",IFERROR(VLOOKUP(B${r},${NR},3,FALSE),""))`, v: norm ? norm.currency : "", s: "cell" },
      { f: `IF(I${r}="","",IF(I${r}="AZN",1,IFERROR(VLOOKUP(I${r},${q(WB.fx)}$A$4:$B$12,2,FALSE),"")))`, v: rate, s: "money" },
      { f: `IF(OR(H${r}="",J${r}=""),"",ROUND(H${r}*J${r},2))`, v: daily, s: "money" },
      { f: `IF(OR(G${r}="",K${r}=""),"",ROUND(G${r}*K${r},2))`, v: t && norm ? tripTotal(t) : "", s: "money" },
      { v: t ? t.advance : null, s: "inputMoney" },
      { v: t ? t.other : null, s: "inputMoney" },
      { f: `IF(L${r}="","",ROUND(L${r}+N${r}-M${r},2))`, v: t && norm ? r2(tripTotal(t) + t.other - t.advance) : "", s: "total" },
    ]);
  }
  const tripsSheet: XlsxSheet = {
    name: WB.trips,
    headers: [],
    rows: tripRows,
    free: true,
    widths: [30, 48, 26, 13, 13, 26, 7, 10, 9, 10, 14, 16, 13, 16, 18],
    freeze: { rows: 3, cols: 1 },
    lists: [
      { ref: `A${tripFirst}:A${tripLast}`, source: staffNames },
      { ref: `B${tripFirst}:B${tripLast}`, source: `${q(WB.norms)}$A$${normFirst}:$A$${normLast}` },
    ],
  };
  const TR = (col: string) => `${q(WB.trips)}$${col}$${tripFirst}:$${col}$${tripLast}`;

  // ---- Hesablama ----
  const H = {
    name: 1, salary: 2, week: 3, norm: 4, worked: 5, paid: 6, vacWork: 7, vacCal: 8, down: 9, benefit: 10, unpaid: 11,
    day: 12, hour: 13, payWorked: 14, payPaid: 15, payVac: 16, payDown: 17, over: 18, rest: 19, night: 20, allow: 21, bonus: 22, gross: 23,
    base: 24, tax: 25, soc: 26, unemp: 27, med: 28, net: 29, dedAsk: 30, share: 31, dedApplied: 32, advance: 33, toPay: 34, excess: 35,
    erSoc: 36, erUnemp: 37, erMed: 38, cost: 39, trips: 40,
  };
  const HEAD = ["Ad Soyad", "Aylıq maaş", "Həftəlik saat", "Norma günü", "İşləyib", "Digər ödənişli", "Məzuniyyət (iş günü)", "Məzuniyyət (təqvim)", "Boşdayanma", "Müavinətlə (SS)", "Ödənişsiz", "Gün haqqı", "Saat haqqı", "İşlənmiş günlər", "Digər ödənişli günlər", "Məzuniyyət haqqı", "Boşdayanma (2/3)", "Artıq iş (×2)", "İstirahət günü işi", "Gecə əlavəsi", "Əlavə", "Mükafat", "Hesablanmış (gross)", "Vergi bazası", "Gəlir vergisi", "DSMF (işçi)", "İşsizlik (işçi)", "İTS (işçi)", "Xalis (net)", "Tutulma (istənilən)", "Tutulma həddi", "Tutulma (tətbiq)", "Avans", "Ödəniləcək", "Avans artığı", "DSMF (işəgötürən)", "İşsizlik (işəgötürən)", "İTS (işəgötürən)", "İşəgötürən xərci", "Ezamiyyət (ayrıca)"];
  const groups: [number, number, string][] = [[H.norm, H.unpaid, "Tabeldən (gün)"], [H.day, H.hour, "Tarif"], [H.payWorked, H.gross, "Hesablanır"], [H.base, H.net, "Vergi və sığorta (işçi)"], [H.dedAsk, H.excess, "Tutulma, avans, ödəniş"], [H.erSoc, H.cost, "İşəgötürən"]];
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
    const advanceF = `SUMIFS(${AD("D")},${AD("A")},$A${r},${AD("B")},"Avans")`;
    const taxBase = `MAX(0,${a("gross")}-${st}$G${ir})`;
    const dedCount = (kind: string) => `COUNTIFS(${AD("A")},$A${r},${AD("B")},"Tutulma",${AD("E")},"${kind}")`;
    const dedRows = pay?.otherDeductions || [];
    const applied = dedRows.reduce((t, d) => t + d.applied, 0);
    calcRows.push([
      { f: `IF(${st}A${ir}="","",${st}A${ir})`, v: e?.name ?? "", s: "cell" },
      f(`${st}E${ir}`, e?.salary ?? 0, "money"),
      f(`${st}H${ir}`, e?.weekHours ?? 40, "int"),
      f(TB("norm", tr), c?.norm ?? 0, "int"),
      f(TB("worked", tr), c?.worked ?? 0, "int"),
      f(TB("paid", tr), c?.paidOther ?? 0, "int"),
      f(TB("vac", tr), c?.vacWork ?? 0, "int"),
      f(TB("vacCal", tr), c?.vacCal ?? 0, "int"),
      f(TB("down", tr), c?.downtime ?? 0, "int"),
      f(TB("benefit", tr), c?.benefit ?? 0, "int"),
      f(TB("unpaid", tr), c?.unpaid ?? 0, "int"),
      f(`${a("salary")}/${P("workingDays")}`, e ? e.salary / (c?.total || 1) : 0, "money"),
      f(`${a("salary")}/(${P("workingDays")}*IF(${a("week")}<40,${a("week")}/5,${P("dayHours")}))`, pay?.hourly ?? 0, "money"),
      f(`ROUND(${a("day")}*${a("worked")},2)`, line("worked"), "money"),
      f(`ROUND(${a("day")}*${a("paid")},2)`, line("paid-leave"), "money"),
      f(`ROUND(IF(${st}I${ir}="",${a("salary")},${st}I${ir})/${P("meanMonth")}*${a("vacCal")},2)`, line("vacation"), "money"),
      f(`ROUND(${a("day")}*${a("down")}*2/3,2)`, line("downtime"), "money"),
      f(`ROUND(${a("hour")}*2*${q(WB.hours)}B${ir},2)`, line("overtime"), "money"),
      f(`ROUND(${a("hour")}*${q(WB.hours)}C${ir},2)`, line("rest-day"), "money"),
      f(`ROUND(${a("hour")}*${st}J${ir}*${q(WB.hours)}D${ir}/100,2)`, line("night"), "money"),
      f(`ROUND(SUMIFS(${AD("D")},${AD("A")},$A${r},${AD("B")},"Əlavə"),2)`, c?.allowance ?? 0, "money"),
      f(`ROUND(SUMIFS(${AD("D")},${AD("A")},$A${r},${AD("B")},"Mükafat"),2)`, c?.bonus ?? 0, "money"),
      f(`ROUND(SUM(${L(H.payWorked)}${r}:${L(H.bonus)}${r}),2)`, pay?.gross ?? 0, "total"),
      f(taxBase, Math.max(0, (pay?.gross ?? 0) - (e?.taxReduction ?? 0)), "money"),
      f(`IF(${st}F${ir}="Dövlət",IF(${a("base")}<=${P("tier1")},${a("base")}*${P("pubRate1")},${P("pubBase")}+(${a("base")}-${P("tier1")})*${P("pubRate2")}),IF(${a("base")}<=${P("tier1")},MAX(0,${a("base")}-${P("taxFree")})*${P("rate1")},IF(${a("base")}<=${P("tier2")},${P("base2")}+(${a("base")}-${P("tier1")})*${P("rate2")},${P("base3")}+(${a("base")}-${P("tier2")})*${P("rate3")})))`, pay?.incomeTax ?? 0, "money"),
      f(`IF(${st}F${ir}="Dövlət",${a("gross")}*${P("socLow")},IF(${a("gross")}<=${P("socLimit")},${a("gross")}*${P("socLow")},${P("socLimit")}*${P("socLow")}+(${a("gross")}-${P("socLimit")})*${P("socHigh")}))`, pay?.employeeSocial ?? 0, "money"),
      f(`${a("gross")}*${P("unemp")}`, pay?.employeeUnemployment ?? 0, "money"),
      f(`IF(${a("gross")}<=${P("medLimit")},${a("gross")}*${P("medLow")},${P("medBase")}+(${a("gross")}-${P("medLimit")})*${P("medHigh")})`, pay?.employeeMedical ?? 0, "money"),
      f(`ROUND(${a("gross")}-SUM(${L(H.tax)}${r}:${L(H.med)}${r}),2)`, pay?.net ?? 0, "total"),
      f(`ROUND(SUMIFS(${AD("D")},${AD("A")},$A${r},${AD("B")},"Tutulma"),2)`, c?.deducted ?? 0, "money"),
      f(`IF(${a("dedAsk")}=0,0,IF(${dedCount("Aliment")}>0,${P("capAlimony")},IF(${dedCount("İcra sənədi")}>0,${P("capWrit")},${P("capGeneral")})))`, pay?.deductionCapShare ?? 0, "pct"),
      f(`ROUND(MIN(${a("dedAsk")},${a("net")}*${a("share")}),2)`, applied, "money"),
      f(`ROUND(${advanceF},2)`, c?.advance ?? 0, "money"),
      f(`MAX(0,ROUND(${a("net")}-${a("dedApplied")}-${a("advance")},2))`, pay?.toPay ?? 0, "total"),
      f(`MAX(0,ROUND(${a("advance")}-(${a("net")}-${a("dedApplied")}),2))`, pay?.advanceExcess ?? 0, "money"),
      f(`IF(${st}F${ir}="Dövlət",${a("gross")}*${P("erLow")},IF(${a("gross")}<=${P("socLimit")},${a("gross")}*${P("erLow")},IF(${a("gross")}<=${P("erLimit")},${P("socLimit")}*${P("erLow")}+(${a("gross")}-${P("socLimit")})*${P("erMid")},${P("socLimit")}*${P("erLow")}+(${P("erLimit")}-${P("socLimit")})*${P("erMid")}+(${a("gross")}-${P("erLimit")})*${P("erHigh")})))`, pay?.employerSocial ?? 0, "money"),
      f(`${a("gross")}*${P("unemp")}`, pay?.employerUnemployment ?? 0, "money"),
      f(`IF(${a("gross")}<=${P("medLimit")},${a("gross")}*${P("medLow")},${P("medBase")}+(${a("gross")}-${P("medLimit")})*${P("medHigh")})`, pay?.employerMedical ?? 0, "money"),
      f(`ROUND(${a("gross")}+SUM(${L(H.erSoc)}${r}:${L(H.erMed)}${r}),2)`, pay?.employerCost ?? 0, "total"),
      f(`ROUND(SUMIFS(${TR("O")},${TR("A")},$A${r}),2)`, c?.trips ?? 0, "money"),
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

  // ---- Təlimat ----
  const guideRows: XlsxCell[][] = [
    [{ v: `Əmək haqqı hesablama iş kitabı: ${input.month}`, s: "title" }],
    [{ v: "Bu fayl Joblink platformasından yüklənib. Excel-də formullarla hesablama aparır və doldurduğunuz məlumatı platformaya geri yükləməyə imkan verir.", s: "note" }],
    [],
    [{ v: "Vərəqlər", s: "label" }],
    ["İşçilər", "İşçi siyahısı, maaş, sektor, vergi azaldılması. Platformadan doldurulub; Excel-də hesablama üçün dəyişə bilərsiniz (platformaya yüklənmir)."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Azad olmalar", "Məzuniyyət, xəstəlik, ezamiyyət, icazə və s. aralıqlar. Platformaya yüklənir (davamiyyət)."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Tabel", "Davamiyyət cədvəli: “Azad olmalar” vərəqindən avtomatik doldurulur, gün sayları çıxarılır. Burada əl ilə yazılmır."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Əlavə-Tutulma", "Mükafat, əlavə, tutulma, avans. Mükafat, əlavə və tutulma platformaya yüklənir."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Saatlar", "Artıq iş, istirahət günü və gecə saatları (ay yekunu). Platformaya yüklənir."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Ezamiyyət", "Ezamiyyətlər, qanunun gündəlik normaları və Mərkəzi Bankın məzənnəsi ilə gündəlik hesabı. Platformaya yüklənir."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Hesablama", "Hər işçi üçün gross, vergi və sığorta, xalis, tutulma, ödəniləcək məbləğ və işəgötürən xərci. Formullarla hesablanır."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    ["Parametrlər, Normlar, Məzənnə, Kodlar", "Vergi dərəcələri, ezamiyyət normaları, məzənnə və davamiyyət kodları. Dəyişiklik lazım olsa, sarı xanaları düzəldin."].map((v, i) => ({ v, s: i ? ("text" as const) : ("label" as const) })),
    [],
    [{ v: "İş qaydası", s: "label" }],
    [{ v: "1. “Azad olmalar”da məzuniyyət və yoxluqları aralıq kimi yazın; “Əlavə-Tutulma” və “Saatlar”ı, ezamiyyətləri doldurun.", s: "text" }],
    [{ v: "2. “Hesablama” vərəqində nəticəni görün. Formulları pozmayın: sarı xanalar daxil edilir, qalanı hesablanır.", s: "text" }],
    [{ v: "3. Platformada: Əmək haqqı → “Excel iş kitabından yüklə” düyməsi ilə faylı seçin, nəyin yüklənəcəyini önizləmədə görün və təsdiqləyin.", s: "text" }],
    [{ v: "4. Yüklənən məlumat platformanın öz qaydalarına görə yoxlanır (qanuni hədlər, ezamiyyət normaları, təsdiqlənmiş ay). Rəsmi hesablama və təsdiq platformada aparılır.", s: "text" }],
    [],
    [{ v: "Nəzərə alın", s: "label" }],
    [{ v: "• Məzuniyyət haqqı 12 aylıq orta əmək haqqından (÷ 30,4) hesablanır; İşçilər vərəqində həmin orta xanası boşdursa cari maaş götürülür. Bir neçə hissəli məzuniyyətdə təqvim gününü platforma dəqiq hesablayır.", s: "text" }],
    [{ v: "• Sığorta müavinəti (xəstəlik, analıq) sığortaçı tərəfindən ödənilir və əmək haqqına daxil deyil; Excel yalnız günləri göstərir.", s: "text" }],
    [{ v: "• Xitam kompensasiyası, maaş dəyişikliyi və şəxsi vergi güzəştlərinin xüsusi halları platformada hesablanır.", s: "text" }],
    [{ v: "• İşçi adları iş kitabında və platformada eyni olmalıdır; eyni adlı iki işçi varsa platformada FİN ilə tapılır.", s: "text" }],
  ];
  const guideSheet: XlsxSheet = { name: WB.guide, headers: [], rows: guideRows, free: true, widths: [34, 130], freeze: { rows: 0, cols: 0 } };

  return [guideSheet, staffSheet, leaveSheet, tabelSheet, addsSheet, hoursSheet, tripsSheet, calcSheet, paramsSheet, normsSheet, fxSheet, codesSheet];
}
