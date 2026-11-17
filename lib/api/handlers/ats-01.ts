// ats: the hiring analytics of a company (funnel, time, sources, rejection reasons, candidates who stand still).
import { HttpError, str } from "@/lib/server";
import { buildAtsReport, type AtsApp, type AtsJob } from "@/lib/ats-analytics";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_ats_01(c: Pick<RouteCtx, "accountRole" | "db" | "id" | "memberRole" | "path" | "request" | "requestUrl">): Promise<Response | undefined> {
  const { accountRole, db, id, memberRole, path, request, requestUrl } = c;
  if (path !== "hr/ats/analytics" || request.method !== "GET") return undefined;
  if (accountRole !== "company") throw new HttpError(403, "Bu bölmə yalnız şirkət hesabı üçündür.");
  if (!["owner", "director", "hr", "recruiter"].includes(memberRole)) throw new HttpError(403, "İşə qəbul analitikası namizəd adlarını göstərir: yalnız hesab sahibi, direktor, HR və rekruter görə bilər.");
  const range = Math.min(730, Math.max(7, Number(str(requestUrl.searchParams.get("days"), 4)) || 180));
  const staleDays = Math.min(60, Math.max(2, Number(str(requestUrl.searchParams.get("stale"), 3)) || 7));
  const jobFilter = str(requestUrl.searchParams.get("jobId"), 100);
  const since = new Date(Date.now() - range * 86_400_000).toISOString();
  const jobRows = await db.prepare("SELECT id,data,status,created FROM jobs WHERE owner=? ORDER BY created DESC LIMIT 500").bind(id).all<{ id: string; data: string; status: string; created: string }>();
  const jobs: AtsJob[] = jobRows.results.map((j) => {
    let title = "";
    try { title = String((JSON.parse(j.data) as { title?: string }).title || ""); } catch { /* keep empty */ }
    return { id: j.id, title, status: j.status, created: j.created };
  });
  const own = jobFilter ? jobs.filter((j) => j.id === jobFilter) : jobs;
  if (!own.length) return ok({ range, jobs: jobs.map((j) => ({ id: j.id, title: j.title })), report: buildAtsReport([], [], Date.now(), staleDays) });
  const marks = own.map(() => "?").join(",");
  const appRows = await db
    .prepare(`SELECT id,job_id,data,status,stage,source,created,updated FROM applications WHERE job_id IN (${marks}) AND created>=? ORDER BY created DESC LIMIT 4000`)
    .bind(...own.map((j) => j.id), since)
    .all<{ id: string; job_id: string; data: string; status: string; stage: string; source: string; created: string; updated: string }>();
  const events = new Map<string, { type: string; from: string; to: string; created: string }[]>();
  // Events in slices: D1 limits the number of bound parameters of one query.
  const ids = appRows.results.map((a) => a.id);
  for (let i = 0; i < ids.length; i += 80) {
    const slice = ids.slice(i, i + 80);
    const rows = await db.prepare(`SELECT application_id,type,from_value,to_value,created FROM application_events WHERE application_id IN (${slice.map(() => "?").join(",")}) AND type IN ('status','rejection') ORDER BY created`).bind(...slice).all<{ application_id: string; type: string; from_value: string; to_value: string; created: string }>().catch(() => ({ results: [] as { application_id: string; type: string; from_value: string; to_value: string; created: string }[] }));
    for (const e of rows.results) events.set(e.application_id, [...(events.get(e.application_id) || []), { type: e.type, from: e.from_value, to: e.to_value, created: e.created }]);
  }
  const apps: AtsApp[] = appRows.results.map((a) => {
    let name = "";
    try { name = String((JSON.parse(a.data) as { name?: string }).name || ""); } catch { /* unnamed */ }
    return { id: a.id, jobId: a.job_id, candidate: name, source: a.source || "", status: a.status, stage: a.stage || "", created: a.created, updated: a.updated || "", events: events.get(a.id) || [] };
  });
  return ok({ range, truncated: appRows.results.length >= 4000, jobs: jobs.map((j) => ({ id: j.id, title: j.title })), report: buildAtsReport(apps, own, Date.now(), staleDays) });
}
