// attendance: locking a month of the sheet (the payroll approval locks it too).
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { can } from "@/lib/company";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_attendance_01(c: Pick<RouteCtx, "accountRole" | "db" | "id" | "memberGrants" | "memberRole" | "path" | "request" | "requestUrl" | "requesterName" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { accountRole, db, id, memberGrants, memberRole, path, request, requestUrl, requesterName, requirePermission, userId } = c;
  if (path !== "company/attendance/locks" && path !== "company/attendance/lock") return undefined;
  if (accountRole !== "company") throw new HttpError(403, "Bu bölmə yalnız şirkət hesabı üçündür.");
  if (request.method === "GET" && path === "company/attendance/locks") {
    requirePermission("salaries", "Davamiyyət kilidlərini yalnız davamiyyət icazəsi olan şəxs görür.");
    const year = str(requestUrl.searchParams.get("year"), 4) || String(new Date().getUTCFullYear());
    const rows = await db.prepare("SELECT month,locked_by,reason,locked_at FROM attendance_locks WHERE company_id=? AND month LIKE ? ORDER BY month").bind(id, `${year}-%`).all<{ month: string; locked_by: string; reason: string; locked_at: string }>();
    return ok({ locks: rows.results.map((r) => ({ month: r.month, by: r.locked_by, reason: r.reason, at: r.locked_at })), canUnlock: can(memberRole, "approve-director", memberGrants) });
  }
  if (request.method === "POST" && path === "company/attendance/lock") {
    requirePermission("salaries", "Davamiyyət kilidini yalnız davamiyyət icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const month = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, "Ayı düzgün seçin.");
    if (b.locked === false) {
      if (!can(memberRole, "approve-director", memberGrants)) throw new HttpError(403, "Kilidi yalnız direktor və ya hesab sahibi aça bilər.");
      const reason = str(b.reason, 200).trim();
      if (reason.length < 3) throw new HttpError(400, "Kilidi açmaq üçün səbəbi yazın.");
      await db.prepare("DELETE FROM attendance_locks WHERE company_id=? AND month=?").bind(id, month).run();
      await companyAudit(db, id, userId, "attendance-unlock", month, reason);
      return ok({ ok: true });
    }
    const by = await requesterName();
    await db.prepare("INSERT INTO attendance_locks(company_id,month,locked_by,reason,locked_at) VALUES(?,?,?,?,?) ON CONFLICT(company_id,month) DO NOTHING").bind(id, month, by, str(b.reason, 200), new Date().toISOString()).run();
    await companyAudit(db, id, userId, "attendance-lock", month, "");
    return ok({ ok: true });
  }
  return undefined;
}
