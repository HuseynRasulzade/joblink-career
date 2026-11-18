// team: the history of who gave which role and permission to whom; calculations a person saved on the account.
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

const MEMBER_ACTIONS = ["member-invited", "member-joined", "member-left", "member-role", "member-invite-resent", "member-suspended", "member-reactivated", "member-removed", "attendance-unlock"];
export const MEMBER_ACTION_LABEL: Record<string, string> = { "member-invited": "dəvət göndərildi", "member-joined": "dəvəti qəbul etdi", "member-left": "komandadan ayrıldı", "member-role": "rol / icazə dəyişdi", "member-invite-resent": "dəvət təkrar göndərildi", "member-suspended": "hesab dayandırıldı", "member-reactivated": "hesab bərpa edildi", "member-removed": "komandadan çıxarıldı", "attendance-unlock": "davamiyyət kilidi açıldı" };

export async function handle_team_01(c: Pick<RouteCtx, "accountRole" | "db" | "id" | "path" | "request" | "requestUrl" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { accountRole, db, id, path, request, requestUrl, requirePermission, userId } = c;
  if (path !== "company/team/history" && !path.startsWith("company/calc-saves")) return undefined;
  if (accountRole !== "company") throw new HttpError(403, "Bu bölmə yalnız şirkət hesabı üçündür.");

  // ---- who changed whose role or permissions ----
  if (request.method === "GET" && path === "company/team/history") {
    requirePermission("team", "Rol və icazə tarixçəsini yalnız komanda idarəçiləri görür.");
    const limit = Math.min(300, Math.max(10, Number(str(requestUrl.searchParams.get("limit"), 4)) || 100));
    const marks = MEMBER_ACTIONS.map(() => "?").join(",");
    const rows = await db
      .prepare(`SELECT c.action,c.target,c.detail,c.created,COALESCE(a.name,'') AS actor FROM company_audit c LEFT JOIN accounts a ON a.id=c.actor_id WHERE c.company_id=? AND c.action IN (${marks}) ORDER BY c.created DESC LIMIT ?`)
      .bind(id, ...MEMBER_ACTIONS, limit)
      .all<{ action: string; target: string; detail: string; created: string; actor: string }>();
    return ok({ events: rows.results });
  }

  // ---- calculations kept on the account (the calculators are open to the whole HR team) ----
  if (path === "company/calc-saves") {
    if (request.method === "GET") {
      requirePermission("employees", "Saxlanmış hesablamaları yalnız işçi məlumatlarına icazəsi olan şəxs görür.");
      const rows = await db.prepare("SELECT id,title,employee,inputs,results,basis,created FROM calc_saves WHERE company_id=? ORDER BY created DESC LIMIT 100").bind(id).all<{ id: string; title: string; employee: string; inputs: string; results: string; basis: string; created: string }>();
      const parse = (v: string) => { try { return JSON.parse(v) as [string, string][]; } catch { return []; } };
      return ok({ items: rows.results.map((r) => ({ id: r.id, title: r.title, employee: r.employee, inputs: parse(r.inputs), results: parse(r.results), basis: r.basis, created: r.created })) });
    }
    if (request.method === "POST") {
      requirePermission("employees", "Hesablamanı yalnız işçi məlumatlarına icazəsi olan şəxs saxlaya bilər.");
      const b = await jsonBody(request);
      const pairs = (v: unknown) => (Array.isArray(v) ? v.slice(0, 80).map((x) => (Array.isArray(x) ? [String(x[0] ?? "").slice(0, 120), String(x[1] ?? "").slice(0, 200)] : ["", ""])) : []);
      const title = str(b.title, 120).trim();
      if (!title) throw new HttpError(400, "Hesablamanın adı yoxdur.");
      const count = await db.prepare("SELECT COUNT(*) AS n FROM calc_saves WHERE company_id=?").bind(id).first<{ n: number }>();
      if (Number(count?.n) >= 300) throw new HttpError(409, "Ən çoxu 300 hesablama saxlamaq olar. Köhnələrini silin.");
      await db.prepare("INSERT INTO calc_saves(id,company_id,user_id,title,employee,inputs,results,basis,created) VALUES(?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, userId, title, str(b.employee, 200), JSON.stringify(pairs(b.inputs)), JSON.stringify(pairs(b.results)), str(b.basis, 300), new Date().toISOString()).run();
      return ok({ ok: true }, 201);
    }
  }
  if (request.method === "POST" && path === "company/calc-saves/delete") {
    requirePermission("employees", "Saxlanmış hesablamanı yalnız işçi məlumatlarına icazəsi olan şəxs silə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM calc_saves WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    await companyAudit(db, id, userId, "calc-save-deleted", str(b.id, 100), "").catch(() => undefined);
    return ok({ ok: true });
  }
  return undefined;
}
