// Azerbaijan 2026 payroll taxes. Every rate and limit is read from config/tax_az_2026.json.
import config from "../config/tax_az_2026.json" with { type: "json" };

export type JobType = "main" | "additional";
export type TaxConfig = typeof config;
type Tier = { up_to: number | null; rate: number };

export type TaxBreakdown = {
  gross: number;
  incomeTax: number;
  employeeDsmf: number;
  employeeUnemployment: number;
  employeeMedical: number;
  net: number;
  employerDsmf: number;
  employerUnemployment: number;
  employerMedical: number;
  employerCost: number;
  effectiveTaxPercent: number;
  jobType: JobType;
  profile: string;
  notes: string[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function taxNotes(cfg: TaxConfig = config): string[] {
  return [`${cfg.disclaimer} (konfiq ${cfg.year}, versiya ${cfg.version}, status: ${cfg.status === "assumptions" ? "fərziyyələrə əsaslanır" : cfg.status})`];
}

// Progressive tiers: each rate applies only to the part of the amount inside its tier.
function tiered(amount: number, tiers: Tier[]) {
  let total = 0;
  let from = 0;
  for (const tier of tiers) {
    const to = tier.up_to ?? Infinity;
    if (amount > from) total += (Math.min(amount, to) - from) * tier.rate;
    from = to;
    if (amount <= to) break;
  }
  return total;
}

function assertAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${label} sıfırdan böyük olmalıdır.`);
}

function profileOf(cfg: TaxConfig, name: string) {
  const profile = (cfg.profiles as Record<string, unknown>)[name] as TaxConfig["profiles"]["private"] | undefined;
  if (!profile) throw new RangeError("Naməlum vergi profili.");
  if (!profile.confirmed || !profile.income_tax)
    throw new RangeError((profile as unknown as { warning?: string }).warning || "Bu vergi profili təsdiqlənməyib.");
  return profile;
}

function incomeTaxOf(gross: number, profile: TaxConfig["profiles"]["private"], jobType: JobType, cfg: TaxConfig) {
  const deductionOn = cfg.assumptions.deduction_applies_to === "main_only" ? jobType === "main" : true;
  const rule = profile.income_tax;
  const inclusive = cfg.assumptions.first_bracket_boundary_inclusive;
  const bracket =
    rule.brackets.find((b) => b.up_to === null || (inclusive ? gross <= b.up_to : gross < b.up_to)) ||
    rule.brackets[rule.brackets.length - 1];
  const deductible = "deduction_eligible" in bracket && bracket.deduction_eligible && deductionOn ? rule.first_bracket_deduction : 0;
  return bracket.base + Math.max(0, gross - bracket.from - deductible) * bracket.rate;
}

export function grossToNet(
  grossInput: number,
  options: { profile?: string; jobType?: JobType; config?: TaxConfig } = {},
): TaxBreakdown {
  const cfg = options.config || config;
  const jobType = options.jobType || "main";
  const name = options.profile || "private";
  assertAmount(grossInput, "Gross maaş");
  if (cfg.assumptions.bracket_basis !== "per_job") throw new RangeError("Yalnız iş yeri üzrə (per_job) pillə bazası dəstəklənir.");
  const profile = profileOf(cfg, name);
  const gross = grossInput;
  const incomeTax = incomeTaxOf(gross, profile, jobType, cfg);
  const employeeDsmf = tiered(gross, profile.employee_dsmf);
  const employeeUnemployment = gross * profile.unemployment.employee;
  const employeeMedical = tiered(gross, profile.medical);
  const employerDsmf = tiered(gross, profile.employer_dsmf);
  const employerUnemployment = gross * profile.unemployment.employer;
  const employerMedical = tiered(gross, profile.medical);
  const deductions = incomeTax + employeeDsmf + employeeUnemployment + employeeMedical;
  const employerTotal = employerDsmf + employerUnemployment + employerMedical;
  const notes = taxNotes(cfg);
  if (!options.jobType) notes.push("İş yeri növü göstərilməyib, əsas iş yeri qəbul edildi.");
  return {
    gross: r2(gross),
    incomeTax: r2(incomeTax),
    employeeDsmf: r2(employeeDsmf),
    employeeUnemployment: r2(employeeUnemployment),
    employeeMedical: r2(employeeMedical),
    net: r2(gross - deductions),
    employerDsmf: r2(employerDsmf),
    employerUnemployment: r2(employerUnemployment),
    employerMedical: r2(employerMedical),
    employerCost: r2(gross + employerTotal),
    effectiveTaxPercent: r2(((deductions + employerTotal) / (gross + employerTotal)) * 10000) / 100,
    jobType,
    profile: name,
    notes,
  };
}

export type NetToGross = { gross: number; candidates: number[]; notes: string[] };

// The main-job net is not monotonic at the 2,500 boundary, so the inverse is solved
// separately inside every segment between the configured limits.
export function netToGross(
  netInput: number,
  options: { profile?: string; jobType?: JobType; config?: TaxConfig } = {},
): NetToGross {
  const cfg = options.config || config;
  assertAmount(netInput, "Net maaş");
  const profile = profileOf(cfg, options.profile || "private");
  const f = (g: number) => grossToNet(g, { ...options, config: cfg, jobType: options.jobType || "main" }).net;
  const limits = new Set<number>();
  for (const list of [profile.employee_dsmf, profile.employer_dsmf, profile.medical]) for (const t of list) if (t.up_to) limits.add(t.up_to);
  for (const b of profile.income_tax.brackets) if (b.up_to) limits.add(b.up_to);
  const edges = [0, ...[...limits].sort((a, b) => a - b), Math.max(netInput * 4, 1e7)];
  const found: number[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i] + (i === 0 ? 1e-6 : 1e-6);
    const hi = edges[i + 1];
    if (f(lo) > netInput + 1e-9 || f(hi) < netInput - 1e-9) continue;
    let a = lo;
    let b = hi;
    for (let k = 0; k < 100; k++) {
      const mid = (a + b) / 2;
      if (f(mid) < netInput) a = mid;
      else b = mid;
    }
    const g = r2((a + b) / 2);
    if (Math.abs(f(g) - netInput) < 0.02 && !found.some((x) => Math.abs(x - g) < 0.02)) found.push(g);
  }
  found.sort((x, y) => x - y);
  if (!found.length) throw new RangeError("Bu net məbləğ üçün gross tapılmadı.");
  const notes = taxNotes(cfg);
  if (found.length > 1) notes.push(`Bu net məbləğ iki gross dəyərinə uyğundur: ${found.join(" və ")}. Aşağı olanı göstərilir.`);
  return { gross: found[0], candidates: found, notes };
}

export type SalaryKind = "gross" | "net" | "unknown";
export type NormalizedSalary = {
  kind: SalaryKind;
  gross: number | null;
  net: number | null;
  scenarios: { asGross: { gross: number; net: number }; asNet: { gross: number; net: number } } | null;
  notes: string[];
};

export function normalizeSalary(input: {
  value: number;
  kind?: SalaryKind;
  period?: "month" | "year";
  currency?: string;
  jobType?: JobType;
  profile?: string;
  config?: TaxConfig;
}): NormalizedSalary {
  const cfg = input.config || config;
  const currency = (input.currency || cfg.currency).toUpperCase();
  if (currency !== cfg.currency) throw new RangeError(`Valyuta ${cfg.currency} olmalıdır (konvertasiya yoxdur).`);
  assertAmount(input.value, "Maaş");
  const monthly = input.period === "year" ? input.value / 12 : input.value;
  const kind = input.kind === "gross" || input.kind === "net" ? input.kind : "unknown";
  const opts = { jobType: input.jobType, profile: input.profile, config: cfg };
  const notes: string[] = [];
  if (input.period === "year") notes.push("İllik məbləğ 12-yə bölündü.");
  if (kind === "gross") return { kind, gross: r2(monthly), net: grossToNet(monthly, opts).net, scenarios: null, notes };
  if (kind === "net") {
    const inverse = netToGross(monthly, opts);
    return { kind, gross: inverse.gross, net: r2(monthly), scenarios: null, notes: [...notes, ...inverse.notes.slice(1)] };
  }
  // Unknown kind is never guessed: both readings are returned.
  const asGross = { gross: r2(monthly), net: grossToNet(monthly, opts).net };
  const asNet = { gross: netToGross(monthly, opts).gross, net: r2(monthly) };
  return { kind, gross: null, net: null, scenarios: { asGross, asNet }, notes: [...notes, "Gross/net göstərilməyib, hər iki ssenari verilir."] };
}

export type SalaryComparison = {
  status: "meets" | "partial" | "below" | "unclear";
  differenceNet: number | null;
  expectationNet: [number, number] | null;
  offerNet: [number, number] | null;
  notes: string[];
};

// Both sides are compared on net pay. A range of net values covers an unknown gross/net kind.
export function compareSalary(
  expectation: { value: number; kind?: SalaryKind; period?: "month" | "year"; currency?: string; jobType?: JobType },
  offer: { value: number; kind?: SalaryKind; period?: "month" | "year"; currency?: string; jobType?: JobType },
  cfg: TaxConfig = config,
): SalaryComparison {
  const range = (s: NormalizedSalary): [number, number] =>
    s.net !== null ? [s.net, s.net] : [Math.min(s.scenarios!.asGross.net, s.scenarios!.asNet.net), Math.max(s.scenarios!.asGross.net, s.scenarios!.asNet.net)];
  const exp = normalizeSalary({ ...expectation, config: cfg });
  const off = normalizeSalary({ ...offer, config: cfg });
  const e = range(exp);
  const o = range(off);
  const notes = [...exp.notes, ...off.notes];
  const certain = exp.net !== null && off.net !== null;
  if (!certain && o[1] >= e[0] && o[0] < e[1]) return { status: "unclear", differenceNet: null, expectationNet: e, offerNet: o, notes: [...notes, "Gross/net göstərilmədiyi üçün nəticə dəqiq deyil."] };
  const diff = r2(o[0] - e[1]);
  const status = o[0] >= e[1] ? "meets" : o[1] >= e[1] * cfg.compare.partial_ratio ? "partial" : "below";
  return { status: !certain && status === "meets" ? "meets" : status, differenceNet: certain ? r2(off.net! - exp.net!) : diff, expectationNet: e, offerNet: o, notes };
}
