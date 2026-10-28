// HR calculations from the Labor Code (Əmək Məcəlləsi) and the Tax Code (Vergi Məcəlləsi).
// Pure functions with no screen or database code, so the calculators page, the employee card and the
// future payroll section all use the same rules. Every result carries the article it comes from.
//
// Not in the two codes (so not here): sick-leave and maternity benefits (Social Insurance Law), the
// vacation-pay coefficient (set by the executive authority, Labor Code art. 139.2 and 140.7), the night-work
// supplement (art. 166 leaves the amount to the contract).
import { daysOff } from "./calendar-az.ts";

export const MEAN_MONTH_DAYS = 30.4; // art. 140.3: the yearly average of calendar days in a month
export const HOURS_PER_DAY = 8; // art. 89.2
export const WEEK_HOURS = 40; // art. 89.3

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (n: unknown) => (Number.isFinite(Number(n)) ? Number(n) : 0);
const pos = (n: unknown) => Math.max(0, num(n));

export type Cited<T> = T & { articles: string[]; notes: string[] };

// ── Vacation ────────────────────────────────────────────────────────────────

export type VacationEntitlementInput = {
  // Art. 114.3: managers, specialists, doctors and others get 30 days; everyone else 21.
  extendedMain?: boolean;
  tenureYears: number;
  // Art. 117: a woman, a single father or an adopter with children under 14.
  childrenUnder14?: number;
  hasDisabledChild?: boolean;
  eligibleForChildLeave?: boolean;
  // Art. 115: harmful or heavy conditions, at least 6 days; the list and length are set by the authority.
  harmfulConditionsDays?: number;
};
export type VacationEntitlement = Cited<{
  main: number;
  byTenure: number;
  byChildren: number;
  harmful: number;
  total: number;
}>;

export function tenureLeaveDays(tenureYears: number) {
  const years = pos(tenureYears);
  if (years > 15) return 6;
  if (years >= 10) return 4;
  if (years >= 5) return 2;
  return 0;
}

export function vacationEntitlement(input: VacationEntitlementInput): VacationEntitlement {
  const main = input.extendedMain ? 30 : 21;
  const byTenure = tenureLeaveDays(input.tenureYears);
  const kids = Math.floor(pos(input.childrenUnder14));
  const byChildren = !input.eligibleForChildLeave ? 0 : input.hasDisabledChild || kids >= 3 ? 5 : kids === 2 ? 2 : 0;
  const harmful = Math.floor(pos(input.harmfulConditionsDays));
  const notes = [
    "Əsas məzuniyyət təqvim günü ilə sayılır.",
    "Pedaqoji, elmi, tibbi, teatr və s. işçilərin müddətləri 118–121-ci maddələrlə ayrıca müəyyən edilir.",
  ];
  if (harmful) notes.push("Zərərli şərait üçün əlavə məzuniyyət azı 6 gün olmalıdır; siyahı və müddət müvafiq orqan tərəfindən təsdiq edilir.");
  return {
    main,
    byTenure,
    byChildren,
    harmful,
    total: main + byTenure + byChildren + harmful,
    articles: ["114", "115", "116", "117"],
    notes,
  };
}

const parse = (date: string) => new Date(`${date}T00:00:00Z`);
const fmt = (date: Date) => date.toISOString().slice(0, 10);
const addDays = (date: string, n: number) => fmt(new Date(parse(date).getTime() + n * 86_400_000));

export type VacationDates = Cited<{
  start: string;
  end: string;
  returnDate: string;
  vacationDays: number; // days that are counted and paid
  calendarDays: number; // days between the first and the last day, holidays included
  holidays: { date: string; label: string }[];
}>;

// Art. 114.6: holidays and the day of mourning that fall inside the vacation are not counted and not paid,
// the vacation is extended by their number.
export function vacationDates(start: string, days: number): VacationDates | null {
  const count = Math.floor(pos(days));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || count < 1) return null;
  const years = new Map<number, ReturnType<typeof daysOff>>();
  const off = (date: string) => {
    const year = Number(date.slice(0, 4));
    if (!years.has(year)) years.set(year, daysOff(year));
    return years.get(year)!.get(date);
  };
  const holidays: { date: string; label: string }[] = [];
  let counted = 0;
  let cursor = start;
  let last = start;
  while (counted < count) {
    const day = off(cursor);
    if (day) holidays.push({ date: cursor, label: day.label });
    else counted += 1;
    last = cursor;
    cursor = addDays(cursor, 1);
  }
  return {
    start,
    end: last,
    returnDate: cursor,
    vacationDays: count,
    calendarDays: count + holidays.length,
    holidays,
    articles: ["114.6", "138"],
    notes: [
      "Bayram və hüzn günləri məzuniyyət gününə daxil edilmir və ödənilmir, məzuniyyət onların sayı qədər uzanır.",
      "Qurban və Ramazan bayramı başqa bayram gününə təsadüf edərsə, üst-üstə düşən günlər bir gün sayılır.",
      "Məzuniyyət haqqında əmr başlanmasına azı 5 gün qalmış verilməlidir.",
    ],
  };
}

export type AverageMonthly = Cited<{
  months: number;
  averageMonthly: number;
  dailyRate: number; // average monthly pay / 30.4
}>;

// Art. 140: the vacation pay comes from the 12 calendar months before the month the vacation is given.
// Under 12 months of work the full months actually worked count (art. 140.2).
export function averageMonthlyForLeave(monthlyEarnings: number[]): AverageMonthly {
  const list = monthlyEarnings.map(pos).slice(-12);
  const total = list.reduce((sum, v) => sum + v, 0);
  const months = list.length;
  const averageMonthly = months ? total / months : 0;
  return {
    months,
    averageMonthly: r2(averageMonthly),
    dailyRate: r2(averageMonthly / MEAN_MONTH_DAYS),
    articles: ["139", "140.1", "140.2", "140.3"],
    notes: [
      "Yalnız əmək haqqı anlayışına daxil olan ödənişlər (maaş, əlavə, mükafat) nəzərə alınır; əməyin ödənilməsi sisteminə daxil olmayan birdəfəlik ödənişlər nəzərə alınmır.",
      "Qismən ödənişli sosial məzuniyyətdə, işçinin təşəbbüsü olmayan ödənişsiz məzuniyyətdə olduğu və ya təqsiri olmadan boşdayanma səbəbindən tam işlənməyən aylar ən yaxın tam işlənən ayla əvəz edilir.",
      "Məzuniyyət pulu qanunvericilikdə nəzərdə tutulmuş əmsallaşdırma qaydası ilə ödənilməlidir (140.7) — bu kalkulyatora daxil deyil.",
    ],
  };
}

export type VacationPay = Cited<AverageMonthly & { days: number; pay: number; payBy: string }>;

export function vacationPay(monthlyEarnings: number[], days: number, startDate?: string): VacationPay {
  const avg = averageMonthlyForLeave(monthlyEarnings);
  const count = Math.floor(pos(days));
  const payBy = startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? addDays(startDate, -3) : "";
  return {
    ...avg,
    days: count,
    pay: r2(avg.dailyRate * count),
    payBy,
    articles: [...avg.articles, "140.5"],
    notes: [...avg.notes, "Məzuniyyət pulu məzuniyyətin başlanmasına ən geci 3 gün qalmış ödənilir."],
  };
}

export type UnusedLeave = Cited<{
  fullYears: number;
  partialDays: number;
  earnedDays: number;
  usedDays: number;
  unusedDays: number;
  compensation: number;
  dailyRate: number;
}>;

// Art. 143–144 and 140.4: on termination every unused main vacation of all work years is paid out with the
// vacation-pay rule. Additional leaves (115–117, 118-1) and educational or social leaves are not paid.
// The part of the unfinished last year is counted in proportion to the days worked in it — the code does not
// give this proportion in words, so it is shown as an estimate.
export function unusedLeaveCompensation(input: {
  hireDate: string;
  endDate: string;
  mainLeaveDays: number;
  usedDays: number;
  monthlyEarnings: number[];
}): UnusedLeave | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.hireDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) return null;
  const from = parse(input.hireDate);
  const to = parse(input.endDate);
  if (to < from) return null;
  let fullYears = to.getUTCFullYear() - from.getUTCFullYear();
  const anniversary = new Date(Date.UTC(from.getUTCFullYear() + fullYears, from.getUTCMonth(), from.getUTCDate()));
  if (anniversary > to) fullYears -= 1;
  const anchor = new Date(Date.UTC(from.getUTCFullYear() + fullYears, from.getUTCMonth(), from.getUTCDate()));
  const days = Math.round((to.getTime() - anchor.getTime()) / 86_400_000) + 1;
  const main = pos(input.mainLeaveDays);
  const partialDays = r2(Math.min(main, (main * days) / 365));
  const earnedDays = r2(fullYears * main + partialDays);
  const usedDays = pos(input.usedDays);
  const unusedDays = Math.max(0, r2(earnedDays - usedDays));
  const avg = averageMonthlyForLeave(input.monthlyEarnings);
  return {
    fullYears,
    partialDays,
    earnedDays,
    usedDays,
    unusedDays,
    dailyRate: avg.dailyRate,
    compensation: r2(unusedDays * avg.dailyRate),
    articles: ["143", "144", "140.4"],
    notes: [
      "Əmək müqaviləsinə xitam verilmə səbəbindən asılı olmayaraq istifadə edilməmiş əsas məzuniyyətə görə kompensasiya ödənilir.",
      "Əlavə (115–117), təhsil, yaradıcılıq və sosial məzuniyyətlərə görə kompensasiya verilmir.",
      "İş ili başa çatmamış hissə işlənmiş günlərə mütənasib sayılır — bu hesablama təxminidir.",
      "İşçi iş ili bitməmiş artıq məzuniyyət götürübsə, ödənilmiş məzuniyyət pulunun müvafiq hissəsi tutula bilər (144.4, 175.2ç).",
    ],
  };
}

// ── Average pay ─────────────────────────────────────────────────────────────

export type AverageDaily = Cited<{
  dailyRate: number;
  paidDays: number;
  pay: number;
  floorApplied: boolean;
}>;

// Art. 177: outside vacation, the average pay is the earnings of the two calendar months before the payment
// divided by the working days of those months, times the working days that keep the pay (business trip,
// donor day, court summons, study leave and so on, art. 179). Under two months, the earnings of the days
// really worked are divided by those days.
export function averageDailyEarnings(input: {
  earnings: number;
  workingDays: number;
  paidDays: number;
  lastDailyPay?: number;
  floorToLastDay?: boolean;
}): AverageDaily {
  const workingDays = pos(input.workingDays);
  const raw = workingDays ? pos(input.earnings) / workingDays : 0;
  const last = pos(input.lastDailyPay);
  const floorApplied = Boolean(input.floorToLastDay && last > raw);
  const dailyRate = floorApplied ? last : raw;
  const paidDays = pos(input.paidDays);
  return {
    dailyRate: r2(dailyRate),
    paidDays,
    pay: r2(dailyRate * paidDays),
    floorApplied,
    articles: ["177", "179"],
    notes: [
      "Əmək məzuniyyəti pulu bu qayda ilə yox, 140-cı maddə ilə hesablanır.",
      "Qismən ödənişli sosial məzuniyyətdə, işəgötürənin təşəbbüsü ilə ödənişsiz məzuniyyətdə və ya təqsirsiz boşdayanmada olan işçi üçün bir günlük məbləğ sonuncu bir günlük əmək haqqından az ola bilməz (177.3-1).",
      "Əməyin ödənilməsinə aid bütün ödənclər nəzərə alınır (177.4).",
    ],
  };
}

// ── Termination ─────────────────────────────────────────────────────────────

export function noticeWeeks(tenureYears: number) {
  const years = pos(tenureYears);
  if (years > 10) return 9;
  if (years >= 5) return 6;
  if (years >= 1) return 4;
  return 2;
}

export function severanceMultiplier(tenureYears: number) {
  const years = pos(tenureYears);
  if (years > 10) return 2;
  if (years >= 5) return 1.7;
  if (years >= 1) return 1.4;
  return 1;
}

export type TerminationReason = "reduction" | "liquidation" | "other";
export type Termination = Cited<{
  noticeWeeks: number;
  severanceMultiplier: number;
  severance: number;
  noticePay: number; // lump sum instead of notice, only with the employee's consent
  noticeMultiplier: number;
  searchDayPerWeek: boolean;
}>;

const NOTICE_MULTIPLIER = [
  [2, 0.5],
  [4, 0.9],
  [6, 1.4],
  [9, 2],
] as const;

// Art. 77: staff reduction (70-ci maddənin "b" bəndi) and liquidation ("a") — a warning period and a severance
// of 1, 1.4, 1.7 or 2 average monthly pays by tenure; with the employee's consent the warning can be paid
// out at 0.5, 0.9, 1.4 or 2 average monthly pays.
export function termination(input: { tenureYears: number; averageMonthly: number; reason: TerminationReason }): Termination {
  const average = pos(input.averageMonthly);
  const weeks = noticeWeeks(input.tenureYears);
  const notice = NOTICE_MULTIPLIER.find(([w]) => w === weeks)?.[1] ?? 0.5;
  const entitled = input.reason === "reduction" || input.reason === "liquidation";
  const multiplier = severanceMultiplier(input.tenureYears);
  return {
    noticeWeeks: entitled ? weeks : 0,
    severanceMultiplier: entitled ? multiplier : 0,
    severance: entitled ? r2(average * multiplier) : 0,
    noticePay: entitled ? r2(average * notice) : 0,
    noticeMultiplier: entitled ? notice : 0,
    searchDayPerWeek: entitled,
    articles: ["77", "70", "176"],
    notes: entitled
      ? [
          "Xəbərdarlıq müddətində hər iş həftəsi azı bir iş günü orta əmək haqqı saxlanılmaqla iş axtarmaq üçün işdən azad edilir (77.2).",
          "İşdənçıxarma müavinəti ödənilir; kollektiv və ya əmək müqaviləsi daha yüksək məbləğ nəzərdə tuta bilər (77.6).",
          "Müavinətdən məbləğlər tutulmur (175.4) və qanunla gəlir vergisindən azaddır (Vergi Məcəlləsi 102.1.4).",
          "Qeyd: 77.3 məbləği 'azı' ifadəsi ilə verir — bu, qanundakı minimumdur.",
        ]
      : ["Bu səbəblə xitamda 77.3 müavinəti nəzərdə tutulmayıb. Digər hallar (məsələn, vəfat, 77.7) üçün məbləğ ayrıca hesablanır."],
  };
}

// Art. 77.7: some terminations pay at least two (or three) average monthly pays.
export function minimumBenefit(averageMonthly: number, kind: "two" | "three") {
  return r2(pos(averageMonthly) * (kind === "three" ? 3 : 2));
}

// Art. 69.1: an employee who resigns gives one calendar month of written notice.
export function resignationDate(noticeDate: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(noticeDate)) return null;
  const d = parse(noticeDate);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
  if (target.getUTCMonth() !== (d.getUTCMonth() + 1) % 12) {
    // 31 January + 1 month → the last day of February
    return fmt(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 0)));
  }
  return fmt(target);
}

// Art. 51.1: probation is at most two weeks for contracts up to six months, otherwise three months.
export function probationLimit(contractMonths: number | null): { value: number; unit: "həftə" | "ay"; article: string } {
  return contractMonths !== null && contractMonths > 0 && contractMonths <= 6
    ? { value: 2, unit: "həftə", article: "51.1" }
    : { value: 3, unit: "ay", article: "51.1" };
}

// ── Working time and pay for extra work ────────────────────────────────────

export type HourlyRate = { hourly: number; daily: number };

// The code does not fix how a monthly salary is split into an hour. The payroll practice is the monthly
// salary divided by the monthly norm of the production calendar.
export function hourlyRate(monthlySalary: number, normHours: number, normDays?: number): HourlyRate {
  const hours = pos(normHours);
  const hourly = hours ? pos(monthlySalary) / hours : 0;
  const days = pos(normDays) || hours / HOURS_PER_DAY;
  return { hourly: r2(hourly), daily: r2(days ? pos(monthlySalary) / days : 0) };
}

export type ExtraPay = Cited<{ rate: HourlyRate; hours: number; extra: number; total: number; formula: string }>;

// Art. 165: every overtime hour is paid at least twice the hourly tariff (time-rate system).
// Overtime may not be replaced by an extra rest day (165.3); limits: 4 hours over two days in a row (100.1).
export function overtimePay(input: { monthlySalary: number; normHours: number; hours: number }): ExtraPay {
  const rate = hourlyRate(input.monthlySalary, input.normHours);
  const hours = pos(input.hours);
  const total = r2(rate.hourly * 2 * hours);
  return {
    rate,
    hours,
    extra: total,
    total,
    formula: "saatlıq maaş × 2 × saat",
    articles: ["165", "99", "100"],
    notes: [
      "İş vaxtından artıq iş işəgötürənin əmri və işçinin razılığı ilə görülür (99.1).",
      "Ardıcıl iki iş günü ərzində 4 saatdan, zərərli/ağır şəraitdə 2 saatdan çox artıq işə cəlb edilə bilməz (100.1).",
      "Artıq iş əlavə istirahət günü ilə əvəz edilə bilməz (165.3).",
      "Hamilə, 14 yaşınadək uşağı olan qadınlar və 18 yaşınadək işçilər artıq işə cəlb edilmir (242, 254).",
    ],
  };
}

// Art. 164: work on a rest day, a public holiday or a day of mourning.
// Time rate: at least twice the daily (hourly) tariff. A monthly-salaried employee whose work fits the monthly
// norm gets the daily rate on top of the salary; above the norm — twice the daily rate on top.
export function restDayPay(input: {
  monthlySalary: number;
  normHours: number;
  hours: number;
  withinMonthlyNorm: boolean;
}): ExtraPay {
  const rate = hourlyRate(input.monthlySalary, input.normHours);
  const hours = pos(input.hours);
  const factor = input.withinMonthlyNorm ? 1 : 2;
  const extra = r2(rate.hourly * factor * hours);
  return {
    rate,
    hours,
    extra,
    total: extra,
    formula: input.withinMonthlyNorm
      ? "maaşa əlavə: saatlıq (gündəlik) maaş × saat"
      : "maaşa əlavə: saatlıq (gündəlik) maaş × 2 × saat",
    articles: ["164", "107", "109"],
    notes: [
      "Aylıq maaş alan işçiyə iş aylıq iş vaxtı norması daxilində görülübsə, maaşdan əlavə bir günlük (saatlıq) məbləğ, normadan artıq görülübsə iki qat məbləğ ödənilir.",
      "Vaxtamuzd sistemdə ayrıca hesablanırsa, gündəlik (saatlıq) tarif maaşının iki mislindən az olmamalıdır.",
      "İşçinin arzusu ilə əmək haqqı əvəzinə başqa istirahət günü verilə bilər (164.2).",
    ],
  };
}

export type NightPay = Cited<{ rate: HourlyRate; hours: number; supplementPercent: number; extra: number }>;

// Art. 97 and 166: 22:00–06:00 is night time; the supplement must not be lower than the authority's minimum and
// its amount is set by the contract. The percent is therefore an input, not a value of the code.
export function nightPay(input: { monthlySalary: number; normHours: number; nightHours: number; supplementPercent: number }): NightPay {
  const rate = hourlyRate(input.monthlySalary, input.normHours);
  const hours = pos(input.nightHours);
  const percent = pos(input.supplementPercent);
  return {
    rate,
    hours,
    supplementPercent: percent,
    extra: r2((rate.hourly * percent * hours) / 100),
    articles: ["97", "166"],
    notes: [
      "22:00-dan 06:00-dək gecə vaxtı sayılır (97.1).",
      "Gecə işinə əlavənin faizi qanunda yazılmayıb: əmək və ya kollektiv müqavilə ilə, müvafiq orqanın müəyyən etdiyi həddən aşağı olmamaqla təyin edilir.",
    ],
  };
}

export type PartialPay = Cited<{ amount: number; ratio: number }>;

// Art. 167, 168, 169: the pay for an unfulfilled output norm, defective goods or downtime that is not the
// employee's fault is at least two thirds of the tariff (position) salary.
export function twoThirdsPay(tariffSalary: number, kind: "downtime" | "norm" | "defect"): PartialPay {
  const article = kind === "downtime" ? "169" : kind === "norm" ? "167" : "168";
  return {
    amount: r2((pos(tariffSalary) * 2) / 3),
    ratio: 2 / 3,
    articles: [article],
    notes: [
      kind === "downtime"
        ? "İşçi boşdayanmanın başlanması haqqında işəgötürənə xəbərdarlıq etməlidir; işçinin təqsiri üzündən boşdayanma ödənilmir (169.2)."
        : "İşçinin təqsiri olmadan; aylıq əmək haqqı tarif (vəzifə) maaşının üçdə iki hissəsindən az olmamalıdır.",
    ],
  };
}

// Proportional salary for part of a month (art. 171): the salary times worked days over the norm days.
export function proratedSalary(monthlySalary: number, workedDays: number, normDays: number) {
  const norm = pos(normDays);
  return norm ? r2((pos(monthlySalary) * Math.min(pos(workedDays), norm)) / norm) : 0;
}

// Art. 155.3: for the full monthly norm the pay cannot be lower than the minimum wage; the amount is set by
// the authority and is not in the code, so it is an input.
export function belowMinimumWage(monthlySalary: number, minimumWage: number) {
  return pos(monthlySalary) < pos(minimumWage);
}

// ── Deductions ─────────────────────────────────────────────────────────────

export type DeductionKind = "general" | "writ" | "alimony";

// Art. 176: all deductions at one pay-out are at most 20% of the pay due, 50% where the law allows it, and 70% for
// alimony, damage to health, loss of the breadwinner and crime damage; with several writs 50% stays with the worker.
export function deductionLimit(payDue: number, kind: DeductionKind) {
  const share = kind === "general" ? 0.2 : kind === "writ" ? 0.5 : 0.7;
  const due = pos(payDue);
  return {
    share,
    maximum: r2(due * share),
    left: r2(due - due * share),
    articles: ["175", "176"],
    notes: [
      "Əmək haqqından tutulmalar yalnız 175-ci maddədəki hallarda mümkündür.",
      "Zərər işçinin təqsiri ilə vurulubsa, tutulan məbləğ onun orta aylıq əmək haqqından çox ola bilməz (175.2c).",
      "İşdənçıxarma müavinətindən tutulma olmaz (175.4).",
    ],
  };
}

// ── Taxes of the Tax Code (non-payroll) ─────────────────────────────────────

export const VAT_RATE = 0.18; // art. 173.1

export function vat(amount: number, mode: "add" | "extract") {
  const value = pos(amount);
  if (mode === "add") {
    const tax = value * VAT_RATE;
    return { net: r2(value), vat: r2(tax), gross: r2(value + tax), articles: ["173.1"], notes: [] as string[] };
  }
  const net = value / (1 + VAT_RATE);
  return { net: r2(net), vat: r2(value - net), gross: r2(value), articles: ["173.1"], notes: [] as string[] };
}

export const SIMPLIFIED_RATE = 0.02; // art. 220.1 (Baku and other regions: 2%; 6–8% for the cases of 220.1-1)
export function simplifiedTax(turnover: number, ratePercent = SIMPLIFIED_RATE * 100) {
  const value = pos(turnover);
  return { tax: r2((value * pos(ratePercent)) / 100), ratePercent: pos(ratePercent), articles: ["220"], notes: [] as string[] };
}

// Art. 101.3: an individual entrepreneur without a legal entity pays 20% of the taxable income.
export function entrepreneurIncomeTax(taxableIncome: number) {
  return { tax: r2(pos(taxableIncome) * 0.2), articles: ["101.3"] };
}
