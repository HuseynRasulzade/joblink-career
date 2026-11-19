// Monthly salary calculator for Azerbaijan, 2026 rules.
// Estimates only: actual payroll depends on sector, deductions and benefits.
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

// Rates: Vergilər Nazirliyinin 2026 cədvəli (non-state, non-oil sector):
//   income tax  up to 2,500 AZN: 3% of the amount above 200 AZN
//               2,500 - 8,000:  75 + 10% of the amount above 2,500
//               above 8,000:    625 + 14% of the amount above 8,000
// State and oil-and-gas sector: 14% up to 2,500, then 350 + 25%.
// Tax Code 102.1.6: for the main workplace, 200 AZN of the monthly income is exempt when the income is up to 2,500 AZN (both sectors).
// Tax Code 101.1 (state, oil-gas) and 101.1-1.1 (private non-oil, 2026) tables are applied to what is left after the exemption and the reduction.
const TAX_FREE_AMOUNT = 200;
const TAX_FREE_LIMIT = 2500;
function incomeTax(gross: number, reduction: number, sector: Sector) {
  const taxable = Math.max(0, gross - reduction - (gross <= TAX_FREE_LIMIT ? TAX_FREE_AMOUNT : 0));
  if (sector === "public") return taxable <= 2500 ? taxable * 0.14 : 350 + (taxable - 2500) * 0.25;
  if (taxable <= 2500) return taxable * 0.03;
  if (taxable <= 8000) return 75 + (taxable - 2500) * 0.1;
  return 75 + 550 + (taxable - 8000) * 0.14;
}

// Private sector DSMF: employee 3% up to 200 and 10% above; employer 22% up to
// 200, 15% from 200 to 8,000 and 11% above. State and oil-and-gas sector:
// employee 3% and employer 22% of the whole salary.
function social(gross: number, side: "employee" | "employer", sector: Sector) {
  if (sector === "public") return gross * (side === "employee" ? 0.03 : 0.22);
  const [low, mid, high] = side === "employee" ? [0.03, 0.1, 0.1] : [0.22, 0.15, 0.11];
  if (gross <= 200) return gross * low;
  if (gross <= 8000) return 200 * low + (gross - 200) * mid;
  return 200 * low + 7800 * mid + (gross - 8000) * high;
}

// Medical insurance: 2% up to 8,000, 0.5% above, paid by each side.
function medical(gross: number) {
  return gross <= 8000 ? gross * 0.02 : 160 + (gross - 8000) * 0.005;
}

// `reduction` is the monthly amount the taxable wage is reduced by (Tax Code 102.1-1, 102.2, 102.3, 102.4, 102.5):
// only the income tax changes, the insurance contributions stay on the whole wage.
export type TaxOptions = { reduction?: number };
export function calculateFromGross(grossInput: number, sector: Sector = "private", options: TaxOptions = {}): SalaryBreakdown {
  const gross = Math.max(0, Number(grossInput) || 0);
  const reduction = Math.max(0, Number(options.reduction) || 0);
  const employeeSocial = social(gross, "employee", sector);
  const employeeUnemployment = gross * 0.005;
  const employeeMedical = medical(gross);
  const tax = incomeTax(gross, reduction, sector);
  const employerSocial = social(gross, "employer", sector);
  const employerUnemployment = gross * 0.005;
  const employerMedical = medical(gross);
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
export function superGrossParts(grossInput: number, sector: Sector = "private"): SuperGrossParts {
  const gross = Math.max(0, Number(grossInput) || 0);
  const pct = (n: number) => `${String(Math.round(n * 1000) / 10).replace(".", ",")}%`;
  const tier = (from: number, to: number, rate: number) => {
    const part = Math.max(0, Math.min(gross, to) - from);
    return part > 0 ? { text: `${from === 0 ? "" : `${from.toLocaleString("az-AZ")}-dən `}${Number.isFinite(to) ? `${to.toLocaleString("az-AZ")}-dək` : "yuxarı"} olan ${part.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} × ${pct(rate)}`, amount: r2(part * rate) } : null;
  };
  const compact = (items: ({ text: string; amount: number } | null)[]) => items.filter((x): x is { text: string; amount: number } => !!x);
  const socialTiers = sector === "public" ? compact([tier(0, Infinity, 0.22)]) : compact([tier(0, 200, 0.22), tier(200, 8000, 0.15), tier(8000, Infinity, 0.11)]);
  const medicalTiers = compact([tier(0, 8000, 0.02), tier(8000, Infinity, 0.005)]);
  const b = calculateFromGross(gross, sector);
  const lines: SuperGrossLine[] = [
    { label: "DSMF (dövlət sosial sığorta), işəgötürən payı", amount: b.employerSocial, rule: sector === "public" ? "Dövlət və neft-qaz sektoru: bütün maaşdan 22%." : "Qeyri-dövlət sektoru: 200 AZN-dək 22%, 200–8 000 AZN arası 15%, 8 000-dən yuxarı 11%.", tiers: socialTiers },
    { label: "İşsizlikdən sığorta, işəgötürən payı", amount: b.employerUnemployment, rule: "Bütün maaşdan 0,5%.", tiers: compact([tier(0, Infinity, 0.005)]) },
    { label: "İcbari tibbi sığorta, işəgötürən payı", amount: b.employerMedical, rule: "8 000 AZN-dək 2%, yuxarı hissədən 0,5%.", tiers: medicalTiers },
  ];
  return { gross: b.gross, lines, total: b.employerCost, shareOfGross: b.gross ? r2((b.employerTotalContributions / b.gross) * 100) : 0 };
}
