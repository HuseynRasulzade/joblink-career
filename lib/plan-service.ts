import { PLAN_PERIOD_DAYS, addPeriod, dueForRenewal, effectivePlan, planById, type Plan, type SubscriptionRow } from "./plans.ts";
import { cardLabel, type PaymentProvider } from "./payments.ts";

// Database side of the packages: subscription state, lazy renewal and daily usage.
export type SubscriptionRecord = SubscriptionRow & { id: string; periodStart: string; methodId: string };
type Row = { id: string; plan_id: string; status: string; period_start: string; period_end: string; auto_renew: number; method_id: string };

const toRecord = (r: Row): SubscriptionRecord => ({
  id: r.id,
  planId: r.plan_id,
  status: r.status,
  periodStart: r.period_start,
  periodEnd: r.period_end,
  autoRenew: r.auto_renew === 1,
  methodId: r.method_id,
});

export async function latestSubscription(db: D1Database, accountId: string) {
  const row = await db
    .prepare("SELECT id,plan_id,status,period_start,period_end,auto_renew,method_id FROM subscriptions WHERE account_id=? ORDER BY created DESC LIMIT 1")
    .bind(accountId)
    .first<Row>();
  return row ? toRecord(row) : null;
}

// Renews an auto-renewing subscription whose period ended and expires one that
// ended without renewal. Called whenever the plan matters (there is no scheduler).
export async function syncSubscription(db: D1Database, accountId: string, provider: PaymentProvider | null, now = new Date()) {
  let sub = await latestSubscription(db, accountId);
  if (!sub) return null;
  const at = now.toISOString();
  if (dueForRenewal(sub, now)) {
    const plan = planById(sub.planId);
    const method = sub.methodId
      ? await db.prepare("SELECT brand,last4,token,provider FROM payment_methods WHERE id=? AND account_id=?").bind(sub.methodId, accountId).first<{ brand: string; last4: string; token: string; provider: string }>()
      : null;
    const charge = plan && method && provider ? provider.charge({ token: method.token, amountCents: plan.priceAzn * 100, currency: "AZN", description: `Joblink ${plan.name}` }) : null;
    const periodStart = sub.periodEnd;
    const periodEnd = addPeriod(periodStart);
    await db.prepare("INSERT INTO plan_payments(id,account_id,subscription_id,plan_id,amount_cents,currency,status,method_label,provider,provider_ref,period_start,period_end,error,created) VALUES(?,?,?,?,?,'AZN',?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), accountId, sub.id, sub.planId, (plan?.priceAzn || 0) * 100, charge?.ok ? "paid" : "failed", method ? cardLabel(method) : "", provider?.name || "", charge?.providerRef || "", periodStart, periodEnd, charge?.ok ? "" : charge?.error || "Ödəniş vasitəsi tapılmadı.", at)
      .run();
    if (charge?.ok) {
      await db.prepare("UPDATE subscriptions SET period_start=?,period_end=?,updated=? WHERE id=?").bind(periodStart, periodEnd, at, sub.id).run();
      sub = { ...sub, periodStart, periodEnd };
    } else {
      await db.prepare("UPDATE subscriptions SET status='expired',auto_renew=0,updated=? WHERE id=?").bind(at, sub.id).run();
      sub = { ...sub, status: "expired", autoRenew: false };
    }
  } else if (sub.status !== "expired" && Date.parse(sub.periodEnd) <= now.getTime()) {
    await db.prepare("UPDATE subscriptions SET status='expired',updated=? WHERE id=?").bind(at, sub.id).run();
    sub = { ...sub, status: "expired" };
  }
  return sub;
}

export async function planOf(db: D1Database, accountId: string, provider: PaymentProvider | null): Promise<Plan> {
  return effectivePlan(await syncSubscription(db, accountId, provider));
}

export type Feature = "cv-analysis" | "cv-fix" | "auto-apply";
const LIMIT_KEY = { "cv-analysis": "cvAnalysesPerDay", "cv-fix": "cvFixesPerDay", "auto-apply": "aiApplyPerDay" } as const;
export const featureLimit = (plan: Plan, feature: Feature) => plan.limits[LIMIT_KEY[feature]];
const today = () => new Date().toISOString().slice(0, 10);

export async function usedToday(db: D1Database, accountId: string, feature: Feature) {
  return (
    (await db.prepare("SELECT count FROM usage_counters WHERE account_id=? AND day=? AND feature=?").bind(accountId, today(), feature).first<{ count: number }>())?.count || 0
  );
}
export async function addUsage(db: D1Database, accountId: string, feature: Feature, by = 1) {
  if (by <= 0) return;
  await db
    .prepare("INSERT INTO usage_counters(account_id,day,feature,count) VALUES(?,?,?,?) ON CONFLICT(account_id,day,feature) DO UPDATE SET count=count+?")
    .bind(accountId, today(), feature, by, by)
    .run();
  // Old days are of no use.
  await db.prepare("DELETE FROM usage_counters WHERE day<?").bind(new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)).run();
}

// What the account may still do today. Without enforcement nothing is limited.
export async function quota(db: D1Database, accountId: string, feature: Feature, enforced: boolean, provider: PaymentProvider | null) {
  if (!enforced) return { enforced, limit: null as number | null, used: 0, remaining: null as number | null, allowed: true, plan: null as Plan | null };
  const plan = await planOf(db, accountId, provider);
  const limit = featureLimit(plan, feature);
  const used = await usedToday(db, accountId, feature);
  return { enforced, limit, used, remaining: Math.max(0, limit - used), allowed: used < limit, plan };
}
export { PLAN_PERIOD_DAYS };
