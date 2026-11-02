// A business trip: days away, the allowance, the expenses and what is left to pay or take back.
export const STATUS_TEXT: Record<string, string> = { requested: "Təsdiq gözləyir", approved: "Təsdiqlənib", rejected: "Rədd edilib", reported: "Hesabat verilib", settled: "Hesablaşılıb" };
export function tripDays(start: string, end: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || end < start) return 0;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}
export function settleTrip(input: { dailyCents: number; days: number; expensesCents: number; advanceCents: number }) {
  const perDiem = Math.max(0, input.dailyCents) * Math.max(0, input.days);
  const total = perDiem + Math.max(0, input.expensesCents);
  // Positive: the company owes the employee; negative: the employee returns the unspent advance.
  return { perDiem, expenses: Math.max(0, input.expensesCents), total, advance: Math.max(0, input.advanceCents), balance: total - Math.max(0, input.advanceCents) };
}
