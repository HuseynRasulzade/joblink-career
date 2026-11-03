// Holding (group) overview: totals of the member companies. Only counts and sums leave a company, never a person's data;
// the pay figures leave only when the member company agreed to share them.
export type MemberFigures = {
  companyId: string;
  name: string;
  isHead: boolean;
  headcount: number;
  onLeave: number;
  joiners12: number;
  leavers12: number;
  pendingOrders: number;
  openJobs: number;
  departments: Record<string, number>;
  pay: { month: string; gross: number; net: number; cost: number } | null; // null: not shared or no approved month
  paySharing: boolean;
};

// Leavers of the last 12 months against the people who were there during the year.
export const turnoverPercent = (headcount: number, leavers12: number) => {
  const base = headcount + leavers12;
  return base > 0 ? Math.round((leavers12 / base) * 1000) / 10 : 0;
};

export function groupTotals(members: MemberFigures[]) {
  const departments = new Map<string, number>();
  let headcount = 0, onLeave = 0, joiners12 = 0, leavers12 = 0, pendingOrders = 0, openJobs = 0;
  const pay = { gross: 0, net: 0, cost: 0, companies: 0 };
  for (const m of members) {
    headcount += m.headcount;
    onLeave += m.onLeave;
    joiners12 += m.joiners12;
    leavers12 += m.leavers12;
    pendingOrders += m.pendingOrders;
    openJobs += m.openJobs;
    for (const [name, n] of Object.entries(m.departments)) departments.set(name, (departments.get(name) || 0) + n);
    if (m.pay) {
      pay.gross += m.pay.gross;
      pay.net += m.pay.net;
      pay.cost += m.pay.cost;
      pay.companies++;
    }
  }
  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    headcount, onLeave, joiners12, leavers12, pendingOrders, openJobs,
    turnover: turnoverPercent(headcount, leavers12),
    departments: [...departments].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "az")),
    pay: { gross: round(pay.gross), net: round(pay.net), cost: round(pay.cost), companies: pay.companies, of: members.length },
  };
}

// Sums the rows of an approved month's snapshot (gross, net and the employer's total cost).
export function snapshotTotals(snapshot: string): { gross: number; net: number; cost: number } | null {
  try {
    const rows = (JSON.parse(snapshot) as { rows?: { result?: { gross?: number; net?: number; superGross?: number } }[] }).rows || [];
    if (!rows.length) return null;
    let gross = 0, net = 0, cost = 0;
    for (const r of rows) {
      gross += Number(r.result?.gross) || 0;
      net += Number(r.result?.net) || 0;
      cost += Number(r.result?.superGross) || Number(r.result?.gross) || 0;
    }
    return { gross: Math.round(gross * 100) / 100, net: Math.round(net * 100) / 100, cost: Math.round(cost * 100) / 100 };
  } catch {
    return null;
  }
}
