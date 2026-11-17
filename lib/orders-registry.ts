// Helpers of the orders registry: how long an order has been waiting, duplicate numbers, the quick filters.
export type RegistryOrder = {
  id: string; number: string; date: string; kind: string; status: "pending" | "returned" | "signed"; created: string;
  history: { at?: string; type?: string }[];
  effect?: { supported: boolean; status?: string };
};
const DAY = 86_400_000;

// Days since the order last moved (created, approved, returned, edited); a signed order does not wait.
export function waitingDays(order: Pick<RegistryOrder, "status" | "created" | "history">, now = Date.now()): number {
  if (order.status === "signed") return 0;
  const times = [order.created, ...order.history.map((h) => h.at || "")].map((t) => Date.parse(t)).filter((t) => Number.isFinite(t));
  if (!times.length) return 0;
  return Math.max(0, Math.floor((now - Math.max(...times)) / DAY));
}

// Numbers used by more than one order of the same year: the register must not carry two orders under one number.
export function duplicateNumbers(orders: Pick<RegistryOrder, "number" | "date">[]): Set<string> {
  const seen = new Map<string, number>();
  for (const o of orders) {
    const number = o.number.trim();
    if (!number) continue;
    const key = `${o.date.slice(0, 4)}|${number.toLocaleLowerCase("az")}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  return new Set([...seen].filter(([, n]) => n > 1).map(([key]) => key));
}
export const duplicateKey = (o: Pick<RegistryOrder, "number" | "date">) => `${o.date.slice(0, 4)}|${o.number.trim().toLocaleLowerCase("az")}`;

export type QuickFilter = "" | "pending" | "returned" | "signed" | "stale" | "unapplied" | "duplicate";
// A signed order that changes the card but has not been applied to it yet.
export const effectWaiting = (o: Pick<RegistryOrder, "status" | "effect">) => o.status === "signed" && !!o.effect?.supported && (!o.effect.status || o.effect.status === "scheduled");

export function matchesQuick(o: RegistryOrder, filter: QuickFilter, duplicates: Set<string>, staleDays = 3, now = Date.now()): boolean {
  if (!filter) return true;
  if (filter === "pending" || filter === "returned" || filter === "signed") return o.status === filter;
  if (filter === "stale") return o.status !== "signed" && waitingDays(o, now) >= staleDays;
  if (filter === "unapplied") return effectWaiting(o);
  return duplicates.has(duplicateKey(o));
}
