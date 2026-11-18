// plan: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { grossCents } from "@/lib/vat";
import { HttpError, jsonBody, runtime, str } from "@/lib/server";
import { addPeriod, azn as aznCents, planById } from "@/lib/plans";
import { buildServiceContract } from "@/lib/contracts";
import { cardLabel, parseCard } from "@/lib/payments";
import { notify } from "@/lib/api-core";
import { syncSubscription } from "@/lib/plan-service";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_plan_01(c: Pick<RouteCtx, "db" | "id" | "path" | "paymentProvider" | "request">): Promise<Response | undefined> {
  const { db, id, path, paymentProvider, request } = c;
  if (request.method === "POST" && path === "plan/methods/add") {
    if (!paymentProvider)
      throw new HttpError(503, "Ödəniş provayderi qurulmayıb.");
    const b = await jsonBody(request);
    const parsed = parseCard({
      number: String(b.number || ""),
      expMonth: Number(b.expMonth),
      expYear: Number(b.expYear),
      holder: str(b.holder, 80),
    });
    if (!parsed.card) throw new HttpError(400, parsed.error);
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM payment_methods WHERE account_id=?")
      .bind(id)
      .first<{ n: number }>();
    if ((count?.n || 0) >= 5)
      throw new HttpError(
        409,
        "Ən çoxu 5 ödəniş vasitəsi saxlamaq olar. Əvvəlcə birini silin.",
      );
    const makeDefault = b.makeDefault === true || !(count?.n || 0);
    const methodId = crypto.randomUUID();
    // Only the brand, the last four digits, the expiry and the provider token are stored.
    const statements = [
      db
        .prepare(
          "INSERT INTO payment_methods(id,account_id,brand,last4,exp_month,exp_year,holder,token,provider,is_default,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          methodId,
          id,
          parsed.card.brand,
          parsed.card.last4,
          parsed.card.expMonth,
          parsed.card.expYear,
          str(b.holder, 80),
          paymentProvider.tokenize(parsed.card),
          paymentProvider.name,
          makeDefault ? 1 : 0,
          new Date().toISOString(),
        ),
    ];
    if (makeDefault)
      statements.unshift(
        db
          .prepare("UPDATE payment_methods SET is_default=0 WHERE account_id=?")
          .bind(id),
      );
    await db.batch(statements);
    return ok({ ok: true, id: methodId }, 201);
  }
  if (request.method === "POST" && path === "plan/methods/default") {
    const b = await jsonBody(request);
    const mine = await db
      .prepare("SELECT 1 FROM payment_methods WHERE id=? AND account_id=?")
      .bind(str(b.id, 100), id)
      .first();
    if (!mine) throw new HttpError(404, "Ödəniş vasitəsi tapılmadı.");
    await db.batch([
      db
        .prepare("UPDATE payment_methods SET is_default=0 WHERE account_id=?")
        .bind(id),
      db
        .prepare(
          "UPDATE payment_methods SET is_default=1 WHERE id=? AND account_id=?",
        )
        .bind(str(b.id, 100), id),
    ]);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "plan/methods/remove") {
    const b = await jsonBody(request);
    const methodId = str(b.id, 100);
    const mine = await db
      .prepare(
        "SELECT is_default FROM payment_methods WHERE id=? AND account_id=?",
      )
      .bind(methodId, id)
      .first<{ is_default: number }>();
    if (!mine) throw new HttpError(404, "Ödəniş vasitəsi tapılmadı.");
    const sub = await syncSubscription(db, id, paymentProvider);
    if (
      sub &&
      sub.status === "active" &&
      sub.autoRenew &&
      sub.methodId === methodId
    )
      throw new HttpError(
        409,
        "Avtomatik ödəniş bu kartdan istifadə edir. Əvvəlcə avtomatik ödənişi söndürün və ya başqa kart seçin.",
      );
    await db
      .prepare("DELETE FROM payment_methods WHERE id=? AND account_id=?")
      .bind(methodId, id)
      .run();
    if (mine.is_default) {
      const next = await db
        .prepare(
          "SELECT id FROM payment_methods WHERE account_id=? ORDER BY created DESC LIMIT 1",
        )
        .bind(id)
        .first<{ id: string }>();
      if (next)
        await db
          .prepare("UPDATE payment_methods SET is_default=1 WHERE id=?")
          .bind(next.id)
          .run();
    }
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "plan/subscribe") {
    const b = await jsonBody(request);
    const plan = planById(str(b.planId, 30));
    if (!plan) throw new HttpError(400, "Paket tapılmadı.");
    const now = new Date();
    const at = now.toISOString();
    const current = await syncSubscription(db, id, paymentProvider, now);
    const active =
      current &&
      current.status !== "expired" &&
      Date.parse(current.periodEnd) > now.getTime()
        ? current
        : null;
    // Choosing the free plan ends the subscription at the end of the paid period.
    if (plan.priceAzn === 0) {
      if (active)
        await db
          .prepare(
            "UPDATE subscriptions SET status='cancelled',auto_renew=0,cancelled_at=?,updated=? WHERE id=?",
          )
          .bind(at, at, active.id)
          .run();
      return ok({
        ok: true,
        plan: plan.id,
        activeUntil: active?.periodEnd || "",
      });
    }
    if (!paymentProvider)
      throw new HttpError(503, "Ödəniş provayderi qurulmayıb.");
    if (active && active.planId === plan.id && active.status === "active")
      throw new HttpError(409, "Bu paket artıq aktivdir.");
    const method = await db
      .prepare(
        str(b.methodId, 100)
          ? "SELECT id,brand,last4,token FROM payment_methods WHERE id=? AND account_id=?"
          : "SELECT id,brand,last4,token FROM payment_methods WHERE account_id=? AND is_default=1",
      )
      .bind(...(str(b.methodId, 100) ? [str(b.methodId, 100), id] : [id]))
      .first<{ id: string; brand: string; last4: string; token: string }>();
    if (!method)
      throw new HttpError(400, "Ödəniş üçün kart seçin və ya əlavə edin.");
    const subId = crypto.randomUUID();
    const periodEnd = addPeriod(now);
    const charge = paymentProvider.charge({
      token: method.token,
      amountCents: grossCents(plan.priceAzn),
      currency: "AZN",
      description: `JobMatch ${plan.name}`,
    });
    await db
      .prepare(
        "INSERT INTO plan_payments(id,account_id,subscription_id,plan_id,amount_cents,currency,status,method_label,provider,provider_ref,period_start,period_end,error,created) VALUES(?,?,?,?,?,'AZN',?,?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        id,
        subId,
        plan.id,
        grossCents(plan.priceAzn),
        charge.ok ? "paid" : "failed",
        cardLabel(method),
        paymentProvider.name,
        charge.providerRef,
        at,
        periodEnd,
        charge.error,
        at,
      )
      .run();
    if (!charge.ok)
      throw new HttpError(402, `${charge.error} Başqa kartla cəhd edin.`);
    // A new package replaces the running one at once; the unused days are not refunded.
    const autoRenew = b.autoRenew === true;
    const account = await db
      .prepare(
        "SELECT a.name,p.email FROM accounts a LEFT JOIN password_accounts p ON p.user_id=a.id WHERE a.id=?",
      )
      .bind(id)
      .first<{ name: string; email: string | null }>();
    const settings = runtime();
    const contract = buildServiceContract({
      id: subId,
      date: at.slice(0, 10),
      party: {
        kind: "candidate",
        name: account?.name || "",
        email: account?.email || "",
      },
      plan,
      operator: {
        name: settings.PLATFORM_LEGAL_NAME || "",
        voen: settings.PLATFORM_VOEN || "",
        address: settings.PLATFORM_ADDRESS || "",
        email: settings.PLATFORM_EMAIL || settings.ADMIN_EMAIL || "",
      },
      autoRenew,
      periodStart: at.slice(0, 10),
      periodEnd: periodEnd.slice(0, 10),
    });
    const contractId = crypto.randomUUID();
    await db.batch([
      ...(active
        ? [
            db
              .prepare(
                "UPDATE subscriptions SET status='expired',auto_renew=0,period_end=?,updated=? WHERE id=?",
              )
              .bind(at, at, active.id),
          ]
        : []),
      db
        .prepare(
          "INSERT INTO subscriptions(id,account_id,plan_id,status,period_start,period_end,auto_renew,method_id,created,updated) VALUES(?,?,?,'active',?,?,?,?,?,?)",
        )
        .bind(
          subId,
          id,
          plan.id,
          at,
          periodEnd,
          autoRenew ? 1 : 0,
          method.id,
          at,
          at,
        ),
      db
        .prepare(
          "INSERT INTO contracts(id,account_id,subscription_id,plan_id,number,title,body,created) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(
          contractId,
          id,
          subId,
          plan.id,
          contract.number,
          contract.title,
          contract.text,
          at,
        ),
    ]);
    await notify(db, {
      userId: id,
      type: "plan",
      title: `${plan.name} paketi aktivdir`,
      body: `${aznCents(grossCents(plan.priceAzn))} ödənildi. Müqavilə № ${contract.number}.`,
      link: "packages",
    });
    return ok(
      { ok: true, plan: plan.id, activeUntil: periodEnd, contractId },
      201,
    );
  }
  return undefined;
}
