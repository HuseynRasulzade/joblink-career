// interviews: the criteria of the scorecard (a company's own list, or the defaults).
import { HttpError, jsonBody } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { can } from "@/lib/company";
import { DEFAULT_CRITERIA, sanitizeCriteria } from "@/lib/interview-scorecard";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_interviews_02(c: Pick<RouteCtx, "accountRole" | "db" | "id" | "memberGrants" | "memberRole" | "path" | "request" | "userId">): Promise<Response | undefined> {
  const { accountRole, db, id, memberGrants, memberRole, path, request, userId } = c;
  if (path !== "hr/interviews/criteria") return undefined;
  if (accountRole !== "company") throw new HttpError(403, "Bu bölmə yalnız şirkət hesabı üçündür.");
  if (request.method === "GET") {
    const rows = await db.prepare("SELECT id,label,weight FROM interview_criteria WHERE company_id=? ORDER BY position,created").bind(id).all<{ id: string; label: string; weight: number }>().catch(() => ({ results: [] as { id: string; label: string; weight: number }[] }));
    return ok({ criteria: rows.results.length ? rows.results : DEFAULT_CRITERIA, custom: rows.results.length > 0, canEdit: can(memberRole, "approve-hr", memberGrants) });
  }
  if (request.method === "POST") {
    if (!can(memberRole, "approve-hr", memberGrants)) throw new HttpError(403, "Kriteriyaları yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const list = sanitizeCriteria(b.criteria);
    if ("error" in list) throw new HttpError(400, list.error);
    // An empty list returns the company to the defaults; old scores keep their criteria ids, so rows with a known id are kept by id.
    const now = new Date().toISOString();
    const existing = new Set((await db.prepare("SELECT id FROM interview_criteria WHERE company_id=?").bind(id).all<{ id: string }>()).results.map((r) => r.id));
    const keep = list.map((x) => ({ ...x, id: x.id && existing.has(x.id) ? x.id : crypto.randomUUID() }));
    const statements = [db.prepare("DELETE FROM interview_criteria WHERE company_id=? AND id NOT IN (SELECT value FROM json_each(?))").bind(id, JSON.stringify(keep.map((x) => x.id)))];
    keep.forEach((x, i) => statements.push(db.prepare("INSERT INTO interview_criteria(id,company_id,label,weight,position,created) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,weight=excluded.weight,position=excluded.position").bind(x.id, id, x.label, x.weight, i, now)));
    await db.batch(statements);
    await companyAudit(db, id, userId, "interview-criteria", "", `${keep.length} kriteriya`);
    return ok({ ok: true, criteria: keep.length ? keep : DEFAULT_CRITERIA });
  }
  return undefined;
}
