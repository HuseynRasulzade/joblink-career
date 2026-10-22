// Monthly salary calculator for Azerbaijan, 2026 rules.
// Estimates only: actual payroll depends on sector, deductions and benefits.
export type Sector = "private" | "public";

export type SalaryBreakdown = {
  gross: number;
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

function incomeTax(taxable: number, sector: Sector) {
  if (sector === "public") return taxable <= 2500 ? taxable * 0.14 : 350 + (taxable - 2500) * 0.25;
  if (taxable <= 2500) return taxable * 0.03;
  if (taxable <= 8000) return 75 + (taxable - 2500) * 0.1;
  return 75 + 550 + (taxable - 8000) * 0.14;
}

function social(gross: number, side: "employee" | "employer") {
  const [low, mid, high] = side === "employee" ? [0.03, 0.1, 0.1] : [0.22, 0.15, 0.11];
  if (gross <= 200) return gross * low;
  if (gross <= 8000) return 200 * low + (gross - 200) * mid;
  return 200 * low + 7800 * mid + (gross - 8000) * high;
}

// Medical insurance: 2% up to 2,500, 0.5% above, paid by each side.
function medical(gross: number) {
  return gross <= 2500 ? gross * 0.02 : 50 + (gross - 2500) * 0.005;
}

export function calculateFromGross(grossInput: number, sector: Sector = "private"): SalaryBreakdown {
  const gross = Math.max(0, Number(grossInput) || 0);
  const employeeSocial = social(gross, "employee");
  const employeeUnemployment = gross * 0.005;
  const employeeMedical = medical(gross);
  const tax = incomeTax(gross, sector);
  const employerSocial = social(gross, "employer");
  const employerUnemployment = gross * 0.005;
  const employerMedical = medical(gross);
  const deductions = tax + employeeSocial + employeeUnemployment + employeeMedical;
  const contributions = employerSocial + employerUnemployment + employerMedical;
  return {
    gross: r2(gross),
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
export function calculateFromNet(netInput: number, sector: Sector = "private"): SalaryBreakdown {
  const net = Math.max(0, Number(netInput) || 0);
  let lo = net;
  let hi = Math.max(net * 2, 100);
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (calculateFromGross(mid, sector).net < net) lo = mid;
    else hi = mid;
  }
  return calculateFromGross(hi, sector);
}
