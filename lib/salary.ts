// Monthly salary calculator for Azerbaijan.
// Estimates only: actual payroll depends on sector, deductions and benefits.
// The rates are a PARAMETER SET with a day it takes effect (`TaxParams`). The 2026 set below is built in; the admin can add a new set
// (a rate or limit changes by law) with its own date, and every calculation uses the set that was in force on its day.
export type Sector = "private" | "public";

export type SalaryBreakdown = {
  gross: number;
  taxReduction: number;
  net: number;
  incomeTax: number;
  employeeSocial: number;
  employeeUnemployment: number;
  employeeMedical: number;
  employerSocial: number;
  employerUnemployment: number;
  employerMedical: number;
  employerCost: number;
  employeeTotalDeductions: number;
  employerTotalContributions: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

// A progressive scale: each part of the amount up to `upTo` (empty = no limit) is taxed at `rate`.
export type Bracket = { upTo: number | null; rate: number };
export type TaxParams = {
  effectiveFrom: string; // YYYY-MM-DD: the first day the set is in force
  note: string;
  taxFreeAmount: number; // Tax Code 102.1.6: exempt part of the monthly income of the main workplace
  taxFreeLimit: number; // ... when the income is up to this
  minimumWage: number; // the minimum monthly wage for full-time work
  incomeTax: { private: Bracket[]; public: Bracket[] }; // applied to what is left after the exemption and the reduction
  social: { private: { employee: Bracket[]; employer: Bracket[] }; public: { employee: Bracket[]; employer: Bracket[] } }; // DSMF
  unemployment: { employee: number; employer: number }; // share of the whole salary
  medical: Bracket[]; // compulsory medical insurance, each side
};

// 2026 rules. Rates: Vergilər Nazirliyinin 2026 cədvəli (non-state, non-oil sector):
//   income tax  up to 2,500 AZN: 3% of the amount above 200 AZN; 2,500 - 8,000: 75 + 10% of the amount above 2,500; above 8,000: 625 + 14% of the amount above 8,000.
// State and oil-and-gas sector: 14% up to 2,500, then 350 + 25%.
// Tax Code 102.1.6: for the main workplace, 200 AZN of the monthly income is exempt when the income is up to 2,500 AZN (both sectors).
// Private sector DSMF: employee 3% up to 200 and 10% above; employer 22% up to 200, 15% from 200 to 8,000 and 11% above. State and oil-and-gas
// sector: employee 3% and employer 22% of the whole salary. Medical insurance: 2% up to 8,000, 0.5% above, paid by each side. Unemployment 0.5% each.
export const DEFAULT_TAX_PARAMS: TaxParams = {
  effectiveFrom: "2026-01-01",
  note: "2026-cı il qaydaları (Vergilər Nazirliyinin cədvəli)",
  taxFreeAmount: 200,
  taxFreeLimit: 2500,
  minimumWage: 400,
  incomeTax: {
    private: [{ upTo: 2500, rate: 0.03 }, { upTo: 8000, rate: 0.1 }, { upTo: null, rate: 0.14 }],
    public: [{ upTo: 2500, rate: 0.14 }, { upTo: null, rate: 0.25 }],
  },
  social: {
    private: {
      employee: [{ upTo: 200, rate: 0.03 }, { upTo: 8000, rate: 0.1 }, { upTo: null, rate: 0.1 }],
      employer: [{ upTo: 200, rate: 0.22 }, { upTo: 8000, rate: 0.15 }, { upTo: null, rate: 0.11 }],
    },
    public: { employee: [{ upTo: null, rate: 0.03 }], employer: [{ upTo: null, rate: 0.22 }] },
  },
  unemployment: { employee: 0.005, employer: 0.005 },
  medical: [{ upTo: 8000, rate: 0.02 }, { upTo: null, rate: 0.005 }],
};

let EXTRA: TaxParams[] = [];
const dayOf = (v?: string) => (/^\d{4}-\d{2}-\d{2}/.test(v || "") ? (v as string).slice(0, 10) : /^\d{4}-\d{2}$/.test(v || "") ? `${v}-01` : new Date().toISOString().slice(0, 10));
// All sets, oldest first (the built-in set has the earliest day unless the admin saved an earlier one).
export const allTaxParams = () => {
  const byDay = new Map<string, TaxParams>([[DEFAULT_TAX_PARAMS.effectiveFrom, DEFAULT_TAX_PARAMS]]);
  for (const p of EXTRA) byDay.set(p.effectiveFrom, p); // a saved set on the same day replaces the built-in one
  return [...byDay.values()].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0));
};
// The sets the admin added (from the database); the built-in one stays.
export function setExtraTaxParams(list: TaxParams[]) {
  EXTRA = list;
}
// The set in force on a day (YYYY-MM-DD or YYYY-MM; today when empty): the latest one that took effect, the earliest when the day is before all.
export function taxParamsFor(asOf?: string): TaxParams {
  const day = dayOf(asOf);
  const sets = allTaxParams();
  let found = sets[0];
  for (const p of sets) if (p.effectiveFrom <= day) found = p;
  return found;
}
export const minimumWageAt = (asOf?: string) => taxParamsFor(asOf).minimumWage;

const cleanRate = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 0.6 ? Math.round(n * 100000) / 100000 : null;
};
const cleanAmount = (v: unknown, max = 10_000_000) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n * 100) / 100 : null;
};
function cleanBrackets(v: unknown, label: string): Bracket[] {
  if (!Array.isArray(v) || !v.length || v.length > 8) throw new Error(`${label}: pillələr düzgün deyil (1–8 sətir).`);
  const out: Bracket[] = [];
  let last = 0;
  v.forEach((raw, i) => {
    const last_row = i === v.length - 1;
    const r = raw as { upTo?: unknown; rate?: unknown };
    const rate = cleanRate(r?.rate);
    if (rate === null) throw new Error(`${label}: faiz 0–60% arası olmalıdır.`);
    if (last_row) {
      if (r?.upTo !== null && r?.upTo !== undefined && r?.upTo !== "") throw new Error(`${label}: sonuncu sətir «yuxarı» (hədsiz) olmalıdır.`);
      out.push({ upTo: null, rate });
      return;
    }
    const upTo = cleanAmount(r?.upTo);
    if (upTo === null || upTo <= last) throw new Error(`${label}: hədlər artan ardıcıllıqla olmalıdır, sonuncu sətir isə «yuxarı» olmalıdır.`);
    last = upTo;
    out.push({ upTo, rate });
  });
  return out;
}
// Checks and cleans a set that comes from the admin page; throws a readable message when something is wrong.
export function normalizeTaxParams(input: unknown): TaxParams {
  const p = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const day = String(p.effectiveFrom || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) throw new Error("Qüvvəyə minmə tarixi düzgün deyil (YYYY-AA-GG).");
  const inc = (p.incomeTax || {}) as Record<string, unknown>;
  const soc = (p.social || {}) as Record<string, Record<string, unknown>>;
  const unemployment = (p.unemployment || {}) as Record<string, unknown>;
  const amounts = { taxFreeAmount: cleanAmount(p.taxFreeAmount), taxFreeLimit: cleanAmount(p.taxFreeLimit), minimumWage: cleanAmount(p.minimumWage, 100000) };
  if (amounts.taxFreeAmount === null || amounts.taxFreeLimit === null || amounts.minimumWage === null || amounts.minimumWage <= 0) throw new Error("Vergidən azad məbləğ, hədd və minimum əmək haqqı düzgün deyil.");
  const ue = cleanRate(unemployment.employee);
  const er = cleanRate(unemployment.employer);
  if (ue === null || er === null) throw new Error("İşsizlik faizləri düzgün deyil.");
  return {
    effectiveFrom: day,
    note: String(p.note || "").slice(0, 300),
    taxFreeAmount: amounts.taxFreeAmount,
    taxFreeLimit: amounts.taxFreeLimit,
    minimumWage: amounts.minimumWage,
    incomeTax: { private: cleanBrackets(inc.private, "Gəlir vergisi (qeyri-dövlət)"), public: cleanBrackets(inc.public, "Gəlir vergisi (dövlət, neft-qaz)") },
    social: {
      private: { employee: cleanBrackets(soc.private?.employee, "DSMF işçi (qeyri-dövlət)"), employer: cleanBrackets(soc.private?.employer, "DSMF işəgötürən (qeyri-dövlət)") },
      public: { employee: cleanBrackets(soc.public?.employee, "DSMF işçi (dövlət)"), employer: cleanBrackets(soc.public?.employer, "DSMF işəgötürən (dövlət)") },
    },
    unemployment: { employee: ue, employer: er },
    medical: cleanBrackets(p.medical, "Tibbi sığorta"),
  };
}

// The tax of `amount` on a progressive scale.
function scale(amount: number, brackets: Bracket[]) {
  let from = 0;
  let sum = 0;
  for (const b of brackets) {
    const to = b.upTo === null ? Infinity : b.upTo;
    sum += Math.max(0, Math.min(amount, to) - from) * b.rate;
    from = to;
    if (amount <= to) break;
  }
  return sum;
}
function incomeTax(gross: number, reduction: number, sector: Sector, p: TaxParams) {
  const taxable = Math.max(0, gross - reduction - (gross <= p.taxFreeLimit ? p.taxFreeAmount : 0));
  return scale(taxable, sector === "public" ? p.incomeTax.public : p.incomeTax.private);
}
const social = (gross: number, side: "employee" | "employer", sector: Sector, p: TaxParams) => scale(gross, p.social[sector === "public" ? "public" : "private"][side]);
const medical = (gross: number, p: TaxParams) => scale(gross, p.medical);

// `reduction` is the monthly amount the taxable wage is reduced by (Tax Code 102.1-1, 102.2, 102.3, 102.4, 102.5):
// only the income tax changes, the insurance contributions stay on the whole wage. `asOf` is the day (or month) the calculation is for:
// it picks the set of rates that was in force then (today when empty).
export type TaxOptions = { reduction?: number; asOf?: string };
export function calculateFromGross(grossInput: number, sector: Sector = "private", options: TaxOptions = {}): SalaryBreakdown {
  const p = taxParamsFor(options.asOf);
  const gross = Math.max(0, Number(grossInput) || 0);
  const reduction = Math.max(0, Number(options.reduction) || 0);
  const employeeSocial = social(gross, "employee", sector, p);
  const employeeUnemployment = gross * p.unemployment.employee;
  const employeeMedical = medical(gross, p);
  const tax = incomeTax(gross, reduction, sector, p);
  const employerSocial = social(gross, "employer", sector, p);
  const employerUnemployment = gross * p.unemployment.employer;
  const employerMedical = medical(gross, p);
  const deductions = tax + employeeSocial + employeeUnemployment + employeeMedical;
  const contributions = employerSocial + employerUnemployment + employerMedical;
  return {
    gross: r2(gross),
    taxReduction: r2(Math.min(reduction, gross)),
    net: r2(gross - deductions),
    incomeTax: r2(tax),
    employeeSocial: r2(employeeSocial),
    employeeUnemployment: r2(employeeUnemployment),
    employeeMedical: r2(employeeMedical),
    employerSocial: r2(employerSocial),
    employerUnemployment: r2(employerUnemployment),
    employerMedical: r2(employerMedical),
    employerCost: r2(gross + contributions),
    employeeTotalDeductions: r2(deductions),
    employerTotalContributions: r2(contributions),
  };
}

// Net pay grows monotonically with gross, so bisection finds the gross.
export function calculateFromNet(netInput: number, sector: Sector = "private", options: TaxOptions = {}): SalaryBreakdown {
  const net = Math.max(0, Number(netInput) || 0);
  let lo = net;
  let hi = Math.max(net * 2, 100);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (calculateFromGross(mid, sector, options).net < net) lo = mid;
    else hi = mid;
  }
  return calculateFromGross(hi, sector, options);
}

// How the employer's total cost (super-gross) is made: gross + the employer's contributions, each with the rule and the tiers that gave the number.
export type SuperGrossLine = { label: string; amount: number; rule: string; tiers: { text: string; amount: number }[] };
export type SuperGrossParts = { gross: number; lines: SuperGrossLine[]; total: number; shareOfGross: number };
export function superGrossParts(grossInput: number, sector: Sector = "private", asOf?: string): SuperGrossParts {
  const p = taxParamsFor(asOf);
  const gross = Math.max(0, Number(grossInput) || 0);
  const pct = (n: number) => `${String(Math.round(n * 1000) / 10).replace(".", ",")}%`;
  const num = (n: number) => n.toLocaleString("az-AZ");
  const tiers = (brackets: Bracket[]) => {
    const out: { text: string; amount: number }[] = [];
    let from = 0;
    for (const b of brackets) {
      const to = b.upTo === null ? Infinity : b.upTo;
      const part = Math.max(0, Math.min(gross, to) - from);
      if (part > 0) out.push({ text: `${from === 0 ? "" : `${num(from)}-dən `}${Number.isFinite(to) ? `${num(to)}-dək` : "yuxarı"} olan ${part.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} × ${pct(b.rate)}`, amount: r2(part * b.rate) });
      from = to;
    }
    return out;
  };
  const ruleOf = (brackets: Bracket[]) => {
    if (brackets.length === 1) return `bütün maaşdan ${pct(brackets[0].rate)}`;
    let from = 0;
    return brackets
      .map((b) => {
        const text = b.upTo === null ? `${num(from)} AZN-dən yuxarı ${pct(b.rate)}` : from === 0 ? `${num(b.upTo)} AZN-dək ${pct(b.rate)}` : `${num(from)}–${num(b.upTo)} AZN arası ${pct(b.rate)}`;
        from = b.upTo ?? from;
        return text;
      })
      .join(", ");
  };
  const employerSocial = p.social[sector === "public" ? "public" : "private"].employer;
  const b = calculateFromGross(gross, sector, { asOf });
  const lines: SuperGrossLine[] = [
    { label: "DSMF (dövlət sosial sığorta), işəgötürən payı", amount: b.employerSocial, rule: `${sector === "public" ? "Dövlət və neft-qaz sektoru" : "Qeyri-dövlət sektoru"}: ${ruleOf(employerSocial)}.`, tiers: tiers(employerSocial) },
    { label: "İşsizlikdən sığorta, işəgötürən payı", amount: b.employerUnemployment, rule: `Bütün maaşdan ${pct(p.unemployment.employer)}.`, tiers: tiers([{ upTo: null, rate: p.unemployment.employer }]) },
    { label: "İcbari tibbi sığorta, işəgötürən payı", amount: b.employerMedical, rule: `${ruleOf(p.medical).replace(/^./, (c) => c.toLocaleUpperCase("az"))}.`, tiers: tiers(p.medical) },
  ];
  return { gross: b.gross, lines, total: b.employerCost, shareOfGross: b.gross ? r2((b.employerTotalContributions / b.gross) * 100) : 0 };
}
