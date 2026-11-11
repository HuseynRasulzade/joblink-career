// Branches (filiallar): an employee can work in several, with a position of his own in each. His pay is shared between them
// (equally, by the sales of each branch, or by percentages written by hand), and a branch that reaches its sales limit
// gives its people a bonus (a fixed amount, or a percentage of the pay that falls on that branch: 100% = the pay itself).
export type Branch = { id: string; name: string; code: string; city: string; active: boolean };
export type BranchLink = { employeeId: string; branchId: string; role: string; sharePct: number; bonusEligible: boolean; from: string; to: string };
export type BranchRule = { branchId: string; kind: "fixed" | "salary_percent"; value: number; active: boolean };
export type BranchSales = { branchId: string; month: string; target: number; sales: number };
export type AllocationMode = "equal" | "sales";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
export const normalizeMode = (value: unknown): AllocationMode => (value === "sales" ? "sales" : "equal");
export const MODE_LABEL: Record<AllocationMode, string> = { equal: "Filial sayına görə bərabər", sales: "Filialların satışına görə" };
export const RULE_LABEL: Record<BranchRule["kind"], string> = { fixed: "Sabit məbləğ", salary_percent: "Maaşın faizi" };

const monthStart = (month: string) => `${month}-01`;
const monthEnd = (month: string) => `${month}-31`;
// A link counts in a month when its dates (either may be empty) overlap the month.
export const linkActiveIn = (link: Pick<BranchLink, "from" | "to">, month: string) => (!link.from || link.from <= monthEnd(month)) && (!link.to || link.to >= monthStart(month));

// The shares (summing to 1) of one employee's pay over his active branches. Percentages written by hand win; otherwise
// the branches share it equally, or by their sales of the month (no sales at all falls back to equal).
export function sharesOf(links: Pick<BranchLink, "branchId" | "sharePct">[], mode: AllocationMode, salesOf: (branchId: string) => number): Map<string, number> {
  const out = new Map<string, number>();
  if (!links.length) return out;
  const manual = links.filter((l) => l.sharePct > 0);
  if (manual.length) {
    const total = manual.reduce((t, l) => t + l.sharePct, 0);
    for (const l of manual) out.set(l.branchId, l.sharePct / total);
    return out;
  }
  if (mode === "sales") {
    const total = links.reduce((t, l) => t + Math.max(0, salesOf(l.branchId)), 0);
    if (total > 0) {
      for (const l of links) out.set(l.branchId, Math.max(0, salesOf(l.branchId)) / total);
      return out;
    }
  }
  for (const l of links) out.set(l.branchId, 1 / links.length);
  return out;
}

export const limitReached = (s: Pick<BranchSales, "target" | "sales"> | undefined) => !!s && s.target > 0 && s.sales >= s.target;

export type BranchBonusLine = { branchId: string; label: string; amount: number; reached: true };
// The bonus of one employee: every branch he works in that reached its limit and has an active rule.
export function bonusesOf(args: {
  links: BranchLink[]; // the employee's links, already limited to the month
  shares: Map<string, number>;
  grossSalary: number;
  rules: BranchRule[];
  sales: BranchSales[];
  nameOf: (branchId: string) => string;
}): BranchBonusLine[] {
  const out: BranchBonusLine[] = [];
  for (const link of args.links) {
    if (!link.bonusEligible) continue;
    const rule = args.rules.find((r) => r.branchId === link.branchId && r.active);
    const sales = args.sales.find((s) => s.branchId === link.branchId);
    if (!rule || !limitReached(sales) || !(rule.value > 0)) continue;
    const share = args.shares.get(link.branchId) ?? 0;
    const amount = rule.kind === "fixed" ? rule.value : args.grossSalary * share * (rule.value / 100);
    if (amount <= 0) continue;
    const kind = rule.kind === "fixed" ? `${r2(rule.value)} AZN` : `maaşın ${rule.value}%-i`;
    out.push({ branchId: link.branchId, label: `Filial bonusu: ${args.nameOf(link.branchId)} (satış ${r2(sales!.sales)} / limit ${r2(sales!.target)}; ${kind})`, amount: r2(amount), reached: true });
  }
  return out;
}

// Pay of one employee shared over his branches; the last branch takes the cent that rounding leaves.
export function splitAmount(total: number, shares: Map<string, number>): Map<string, number> {
  const ids = [...shares.keys()];
  const out = new Map<string, number>();
  let used = 0;
  ids.forEach((id, i) => {
    const part = i === ids.length - 1 ? r2(total - used) : r2(total * (shares.get(id) || 0));
    used = r2(used + part);
    out.set(id, part);
  });
  return out;
}
