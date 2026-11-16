// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_23(c: Pick<RouteCtx, "batchOf" | "canAct" | "db" | "id" | "path" | "request" | "requesterName" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { batchOf, canAct, db, id, path, request, requesterName, requirePermission, userId } = c;
  if (request.method === "POST" && path === "company/payroll/bank/batch/approve") {
    requirePermission("salaries", "Ödəniş sənədini yalnız əmək haqqı icazəsi olan şəxs təsdiqləyə bilər.");
    if (!canAct("approve-director")) throw new HttpError(403, "Pulun köçürülməsinə yalnız direktor icazə verə bilər.");
    const batch = await batchOf(str((await jsonBody(request)).id, 100));
    if (batch.status !== "draft") throw new HttpError(409, "Yalnız layihə halındakı sənəd təsdiqlənir.");
    const threshold = (await db.prepare("SELECT dual_threshold FROM payroll_settings WHERE company_id=?").bind(id).first<{ dual_threshold: number }>())?.dual_threshold || 0;
    const me = await requesterName();
    const now = new Date().toISOString();
    // From the set amount two different people must approve: the first only marks it, the second releases it.
    if (threshold > 0 && batch.total_cents >= threshold && !batch.first_approved_by) {
      await db.prepare("UPDATE payroll_batches SET first_approved_by=?,first_approved_name=? WHERE id=? AND company_id=?").bind(userId, me, batch.id, id).run();
      await companyAudit(db, id, userId, "payroll-batch-first-approval", batch.id, `${batch.month}: ${batch.total_cents / 100} AZN`);
      return ok({ ok: true, needsSecond: true });
    }
    if (threshold > 0 && batch.total_cents >= threshold && batch.first_approved_by === userId) throw new HttpError(409, "Bu məbləğ üçün ikinci təsdiqi başqa şəxs verməlidir.");
    await db.prepare("UPDATE payroll_batches SET status='approved',approved_by=?,approved_by_name=?,approved_at=? WHERE id=? AND company_id=?").bind(userId, me, now, batch.id, id).run();
    await companyAudit(db, id, userId, "payroll-batch-approved", batch.id, `${batch.month}: ${batch.total_cents / 100} AZN`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/payroll/bank/batch/sent") {
    requirePermission("salaries", "Ödəniş sənədini yalnız əmək haqqı icazəsi olan şəxs dəyişə bilər.");
    const batch = await batchOf(str((await jsonBody(request)).id, 100));
    if (batch.status !== "approved") throw new HttpError(409, "Sənəd təsdiqlənməyib.");
    await db.prepare("UPDATE payroll_batches SET status='sent',sent_at=? WHERE id=? AND company_id=?").bind(new Date().toISOString(), batch.id, id).run();
    await companyAudit(db, id, userId, "payroll-batch-sent", batch.id, batch.month);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/payroll/bank/batch/cancel") {
    requirePermission("salaries", "Ödəniş sənədini yalnız əmək haqqı icazəsi olan şəxs ləğv edə bilər.");
    const batch = await batchOf(str((await jsonBody(request)).id, 100));
    if (batch.status === "paid" || batch.status === "cancelled") throw new HttpError(409, "Bu sənəd artıq bağlanıb.");
    await db.prepare("UPDATE payroll_batches SET status='cancelled' WHERE id=? AND company_id=?").bind(batch.id, id).run();
    await companyAudit(db, id, userId, "payroll-batch-cancelled", batch.id, batch.month);
    return ok({ ok: true });
  }
  return undefined;
}
