// Monthly pay of an employee from the production calendar, the attendance marks, one-off additions and
// deductions, with the taxes of lib/salary.ts. Pure functions for the payroll page, the pay slip and the tests.
// Rules: Labor Code 154–176 (pay, additions, payment terms, pay slip, deductions), 164–166 (extra work), 169 (downtime).
import { calculateFromGross, type Sector } from "./salary.ts";
import { deductionLimit, HOURS_PER_DAY, type DeductionKind } from "./hr-calc.ts";
import { daysOff } from "./calendar-az.ts";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const pos = (n: unknown) => Math.max(0, Number(n) || 0);

// How a working day counts in the month's pay.
export type DayStatus =
  | "outside" // before hire or after leaving
  | "work" // worked (also remote, trip, training)
  | "paid" // leave or absence the employer pays in full (annual, study, donor day, medical check, summons ...)
  | "twothirds" // downtime without the employee's fault: two thirds of the salary (169)
  | "benefit" // paid by social insurance (maternity, childcare, paternity, sick leave): not by the payroll
  | "unpaid"; // unpaid leave and absence

const PAID = new Set(["annual", "addleave", "study", "creative", "donor", "medical", "summons", "military"]);
const BENEFIT = new Set(["maternity", "childcare", "paternity", "sick", "injury"]);

export function dayStatus(code: string): Exclude<DayStatus, "outside"> {
  if (!code || code === "work" || code === "remote" || code === "trip" || code === "training") return "work";
  if (PAID.has(code)) return "paid";
  if (code === "downtime") return "twothirds";
  if (BENEFIT.has(code)) return "benefit";
  return "unpaid"; // unpaid, permission, family, suspension, absent
}
const WEIGHT: Record<DayStatus, number> = { outside: 0, work: 1, paid: 1, twothirds: 2 / 3, benefit: 0, unpaid: 0 };

export type OtherDeduction = { label: string; amount: number; kind: DeductionKind };
export type PayInputs = {
  bonus: number;
  allowance: number;
  overtimeHours: number;
  restDayHours: number;
  restDayWithinNorm: boolean;
  nightHours: number;
  nightPercent: number;
  deductions: OtherDeduction[];
  note: string;
};
export const EMPTY_INPUTS: PayInputs = { bonus: 0, allowance: 0, overtimeHours: 0, restDayHours: 0, restDayWithinNorm: true, nightHours: 0, nightPercent: 0, deductions: [], note: "" };
export function cleanInputs(raw: unknown): PayInputs {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(o.deductions) ? o.deductions : [];
  return {
    bonus: r2(Math.min(pos(o.bonus), 1_000_000)),
    allowance: r2(Math.min(pos(o.allowance), 1_000_000)),
    overtimeHours: r2(Math.min(pos(o.overtimeHours), 400)),
    restDayHours: r2(Math.min(pos(o.restDayHours), 400)),
    restDayWithinNorm: o.restDayWithinNorm !== false,
    nightHours: r2(Math.min(pos(o.nightHours), 400)),
    nightPercent: r2(Math.min(pos(o.nightPercent), 300)),
    deductions: list
      .slice(0, 20)
      .map((d) => {
        const item = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
        const kind: DeductionKind = item.kind === "writ" || item.kind === "alimony" ? item.kind : "general";
        return { label: String(item.label ?? "").trim().slice(0, 120), amount: r2(Math.min(pos(item.amount), 1_000_000)), kind };
      })
      .filter((d) => d.amount > 0),
    note: String(o.note ?? "").trim().slice(0, 300),
  };
}

export type PayInput = {
  monthlySalary: number; // gross, AZN a month for the full norm
  statuses: DayStatus[]; // one per working day of the month, in order
  weekHours?: number; // 40, 36 or 24
  sector?: Sector;
  taxReduction?: number;
  inputs?: Partial<PayInputs>;
  advances?: number; // paid in advance this month
  asOf?: number; // count only the first N working days (the rest are assumed worked, for the advance)
};

export type PayResult = {
  normDays: number;
  workedDays: number;
  paidLeaveDays: number;
  downtimeDays: number;
  benefitDays: number;
  unpaidDays: number;
  hourly: number;
  lines: { id: string; label: string; amount: number; article: string }[];
  gross: number;
  incomeTax: number;
  employeeSocial: number;
  employeeUnemployment: number;
  employeeMedical: number;
  employerSocial: number;
  employerUnemployment: number;
  employerMedical: number;
  employerCost: number;
  net: number;
  taxReduction: number;
  otherDeductions: { label: string; amount: number; kind: DeductionKind; applied: number }[];
  deductionCapShare: number;
  deductionsCapped: boolean;
  advances: number;
  toPay: number; // net less other deductions and the advances; 0 when the advances are larger
  advanceExcess: number; // advances above what is due, to be taken back
  notes: string[];
};

export function computePay(input: PayInput): PayResult {
  const weekHours = input.weekHours && input.weekHours < 40 ? input.weekHours : 40;
  const dailyHours = weekHours === 40 ? HOURS_PER_DAY : weekHours / 5;
  const extra = { ...EMPTY_INPUTS, ...input.inputs };
  const salary = pos(input.monthlySalary);
  const normDays = input.statuses.filter((s) => s !== "outside").length;
  const total = input.statuses.length || 1;
  // Statuses counted for the month: all of them, or the first `asOf` ones with the rest taken as worked.
  const counted = input.statuses.map((s, i) => (input.asOf !== undefined && i >= input.asOf && s !== "outside" ? ("work" as DayStatus) : s));
  const count = (kinds: DayStatus[]) => counted.filter((s) => kinds.includes(s)).length;
  const worked = count(["work"]);
  const paidLeave = count(["paid"]);
  const downtime = count(["twothirds"]);
  const benefit = count(["benefit"]);
  const unpaid = count(["unpaid"]);
  const perDay = salary / total;
  const hourly = salary > 0 && total > 0 ? salary / (total * dailyHours) : 0;
  const lines: PayResult["lines"] = [];
  const add = (id: string, label: string, amount: number, article: string) => {
    if (amount > 0) lines.push({ id, label, amount: r2(amount), article });
  };
  add("worked", `İşlənmiş günlər (${worked} / ${normDays})`, perDay * worked, "Əmək M. 154, 171");
  add("paid-leave", `Ödənişli məzuniyyət və icazə günləri (${paidLeave})`, perDay * paidLeave, "Əmək M. 139–140, 179");
  add("downtime", `Boşdayanma, tarif maaşının 2/3 hissəsi (${downtime})`, perDay * downtime * (2 / 3), "Əmək M. 169");
  add("overtime", `İş vaxtından artıq iş (${extra.overtimeHours} saat × 2)`, hourly * 2 * extra.overtimeHours, "Əmək M. 165");
  add("rest-day", `İstirahət və bayram günü işi (${extra.restDayHours} saat × ${extra.restDayWithinNorm ? 1 : 2})`, hourly * (extra.restDayWithinNorm ? 1 : 2) * extra.restDayHours, "Əmək M. 164");
  add("night", `Gecə işinə əlavə (${extra.nightHours} saat × ${extra.nightPercent}%)`, (hourly * extra.nightPercent * extra.nightHours) / 100, "Əmək M. 166");
  add("allowance", "Əlavələr", extra.allowance, "Əmək M. 157");
  add("bonus", "Mükafat", extra.bonus, "Əmək M. 157.6");
  const gross = r2(lines.reduce((s, l) => s + l.amount, 0));
  const taxed = calculateFromGross(gross, input.sector || "private", { reduction: pos(input.taxReduction) });
  // Other deductions: all together at most 20% of the pay due (50% for writs, 70% for alimony), art. 175–176.
  const present = extra.deductions.filter((d) => d.amount > 0);
  const share = present.length ? Math.max(...present.map((d) => deductionLimit(1, d.kind).maxShare)) : 0;
  let room = r2(taxed.net * share);
  const other = present.map((d) => {
    const applied = Math.min(d.amount, room);
    room = r2(room - applied);
    return { ...d, applied: r2(applied) };
  });
  const appliedTotal = r2(other.reduce((s, d) => s + d.applied, 0));
  const advances = r2(pos(input.advances));
  const afterDeductions = r2(taxed.net - appliedTotal);
  const notes: string[] = [];
  if (benefit) notes.push(`${benefit} gün müavinətlə ödənilir (Sosial Sığorta): əmək haqqına daxil deyil, müavinəti ayrıca hesablayın.`);
  if (unpaid) notes.push(`${unpaid} gün ödənişsizdir (ödənişsiz məzuniyyət, üzrsüz yoxluq və s.).`);
  if (other.some((d) => d.applied < d.amount)) notes.push("Tutulmalar Əmək Məcəlləsinin 176-cı maddəsindəki həddə endirildi; qalıq növbəti aya keçirilməlidir.");
  if (paidLeave) notes.push("Məzuniyyət günləri aylıq maaşın gün payı ilə hesablanıb; 140-cı maddə ilə dəqiq məbləğ əvvəlki 12 ayın orta əmək haqqından tapılır.");
  return {
    normDays,
    workedDays: worked,
    paidLeaveDays: paidLeave,
    downtimeDays: downtime,
    benefitDays: benefit,
    unpaidDays: unpaid,
    hourly: r2(hourly),
    lines,
    gross,
    incomeTax: taxed.incomeTax,
    employeeSocial: taxed.employeeSocial,
    employeeUnemployment: taxed.employeeUnemployment,
    employeeMedical: taxed.employeeMedical,
    employerSocial: taxed.employerSocial,
    employerUnemployment: taxed.employerUnemployment,
    employerMedical: taxed.employerMedical,
    employerCost: taxed.employerCost,
    net: taxed.net,
    taxReduction: taxed.taxReduction,
    otherDeductions: other,
    deductionCapShare: share,
    deductionsCapped: other.some((d) => d.applied < d.amount),
    advances,
    toPay: Math.max(0, r2(afterDeductions - advances)),
    advanceExcess: Math.max(0, r2(advances - afterDeductions)),
    notes,
  };
}

// How much an employee could be paid in advance on a day: the net pay of the days counted up to that day
// (the rest of the month taken as worked) less what was already paid in advance. Never below zero.
export function availableAdvance(input: Omit<PayInput, "asOf" | "advances">, upToDay: number, alreadyPaid: number): { available: number; earned: number; share: number } {
  const full = computePay({ ...input, advances: 0 });
  // Pay for the days already behind: the days counted to the day over the month's payable days.
  const behind = input.statuses.slice(0, upToDay).map((s) => WEIGHT[s]).reduce((a, b) => a + b, 0);
  const payable = input.statuses.map((s) => WEIGHT[s]).reduce((a, b) => a + b, 0) || 1;
  const share = Math.min(1, behind / payable);
  const earned = r2(full.net * share);
  return { available: Math.max(0, r2(earned - pos(alreadyPaid))), earned, share: r2(share * 100) / 100 };
}

// The day the pay is due: a day off moves it to the working day before (Labor Code 172.3).
export function paymentDate(year: number, month: number, day: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let d = new Date(Date.UTC(year, month - 1, Math.min(Math.max(1, Math.round(day)), last)));
  const off = daysOff(year);
  const isOff = (date: Date) => {
    const iso = date.toISOString().slice(0, 10);
    const weekday = date.getUTCDay();
    return weekday === 0 || weekday === 6 || off.has(iso);
  };
  for (let i = 0; i < 10 && isOff(d); i++) d = new Date(d.getTime() - 86_400_000);
  return d.toISOString().slice(0, 10);
}

// Two payments in a month need a gap of at most 16 days (Labor Code 172.1).
export function scheduleProblem(advanceDay: number, payDay: number): string {
  if (!advanceDay) return "";
  if (payDay <= advanceDay) return "Əmək haqqı günü avans günündən sonra olmalıdır.";
  if (payDay - advanceDay > 16) return "Avans və əmək haqqının qalan hissəsi arasında fasilə 16 gündən çox ola bilməz (Əmək M. 172.1).";
  return "";
}

// A pay that is late through the employer's fault earns the employee at least 1% of the pay for each day (172.5).
export function latePenalty(due: string, paidOn: string, unpaidAmount: number): { days: number; amount: number } {
  if (!due || !paidOn || paidOn <= due || unpaidAmount <= 0) return { days: 0, amount: 0 };
  const days = Math.round((Date.parse(`${paidOn}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`)) / 86_400_000);
  return { days, amount: r2(unpaidAmount * 0.01 * days) };
}
