// reports: saved filters, access log, scheduled e-mails, the feed key for Power BI / Excel, and the data of the newer reports.
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { exitTypeLabel } from "@/lib/workforce";
import { newFeedToken, tokenHash } from "@/lib/report-feed";
import { nextRunAfter } from "@/lib/report-text";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

const SCHEDULABLE = ["staff-plan"];
const monthsBetween = (a: string, b: string) => {
  const x = new Date(`${a}T00:00:00Z`), y = new Date(`${b}T00:00:00Z`);
  return Math.max(0, (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + y.getUTCMonth() - x.getUTCMonth() - (y.getUTCDate() < x.getUTCDate() ? 1 : 0));
};

export async function handle_reports_01(c: Pick<RouteCtx, "accountRole" | "db" | "hrFundReport" | "id" | "memberRole" | "path" | "request" | "requestUrl" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { accountRole, db, hrFundReport, id, memberRole, path, request, requestUrl, requirePermission, userId } = c;
  if (!path.startsWith("company/reports/")) return undefined;
  if (accountRole !== "company") throw new HttpError(403, "Hesabatlar yalnız şirkət hesabı üçündür.");
  const isGet = request.method === "GET";

  // ---- saved filters (own, per user) ----
  if (isGet && path === "company/reports/saved") {
    const report = str(requestUrl.searchParams.get("report"), 60);
    const rows = await db.prepare("SELECT id,report_id,name,filters,created FROM report_saved WHERE company_id=? AND user_id=? AND (?='' OR report_id=?) ORDER BY created DESC LIMIT 60").bind(id, userId, report, report).all<{ id: string; report_id: string; name: string; filters: string; created: string }>();
    return ok({ items: rows.results.map((r) => ({ id: r.id, reportId: r.report_id, name: r.name, filters: (() => { try { return JSON.parse(r.filters) as Record<string, string>; } catch { return {}; } })(), created: r.created })) });
  }
  if (request.method === "POST" && path === "company/reports/saved") {
    const b = await jsonBody(request);
    const name = str(b.name, 80).trim();
    const reportId = str(b.reportId, 60);
    if (name.length < 2) throw new HttpError(400, "Saxlanmış hesabata ad verin.");
    if (!reportId) throw new HttpError(400, "Hesabat seçilməyib.");
    const filters = Object.fromEntries(Object.entries((b.filters && typeof b.filters === "object" ? b.filters : {}) as Record<string, unknown>).slice(0, 12).map(([k, v]) => [k.slice(0, 30), String(v ?? "").slice(0, 100)]));
    const count = await db.prepare("SELECT COUNT(*) AS n FROM report_saved WHERE company_id=? AND user_id=?").bind(id, userId).first<{ n: number }>();
    if (Number(count?.n) >= 40) throw new HttpError(409, "Ən çoxu 40 hesabat saxlamaq olar. Köhnələrini silin.");
    await db.prepare("INSERT INTO report_saved(id,company_id,user_id,report_id,name,filters,created) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, userId, reportId, name, JSON.stringify(filters), new Date().toISOString()).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/reports/saved/delete") {
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM report_saved WHERE id=? AND company_id=? AND user_id=?").bind(str(b.id, 100), id, userId).run();
    return ok({ ok: true });
  }

  // ---- who took which report out (export and print only) ----
  if (request.method === "POST" && path === "company/reports/log") {
    const b = await jsonBody(request);
    const action = str(b.action, 10) === "print" ? "print" : "export";
    const filters = JSON.stringify(b.filters && typeof b.filters === "object" ? b.filters : {}).slice(0, 200);
    await companyAudit(db, id, userId, `report-${action}`, str(b.report, 60), `${action === "print" ? "çap" : "Excel"}: ${filters}`);
    return ok({ ok: true });
  }

  // ---- scheduled e-mails (to the sender's own address) ----
  if (isGet && path === "company/reports/schedules") {
    const rows = await db.prepare("SELECT id,report_id,frequency,next_run,last_run FROM report_schedules WHERE company_id=? AND user_id=? ORDER BY created").bind(id, userId).all<{ id: string; report_id: string; frequency: string; next_run: string; last_run: string }>();
    return ok({ items: rows.results.map((r) => ({ id: r.id, reportId: r.report_id, frequency: r.frequency, nextRun: r.next_run, lastRun: r.last_run })), reports: SCHEDULABLE });
  }
  if (request.method === "POST" && path === "company/reports/schedules") {
    requirePermission("payroll", "Hesabatın e-poçtla göndərilməsini yalnız plan və əmək haqqı icazəsi olan şəxs qura bilər.");
    const b = await jsonBody(request);
    const reportId = str(b.reportId, 60);
    const frequency = str(b.frequency, 10) === "monthly" ? "monthly" : "weekly";
    if (!SCHEDULABLE.includes(reportId)) throw new HttpError(400, "Bu hesabat e-poçtla göndərilmir.");
    const email = await db.prepare("SELECT email FROM password_accounts WHERE user_id=?").bind(userId).first<{ email: string }>();
    if (!email?.email) throw new HttpError(409, "Hesabınızda e-poçt ünvanı yoxdur.");
    const count = await db.prepare("SELECT COUNT(*) AS n FROM report_schedules WHERE company_id=? AND user_id=?").bind(id, userId).first<{ n: number }>();
    if (Number(count?.n) >= 5) throw new HttpError(409, "Ən çoxu 5 planlı göndəriş qurmaq olar.");
    const dup = await db.prepare("SELECT id FROM report_schedules WHERE company_id=? AND user_id=? AND report_id=? AND frequency=?").bind(id, userId, reportId, frequency).first();
    if (dup) throw new HttpError(409, "Bu göndəriş artıq qurulub.");
    const nextRun = nextRunAfter(frequency, new Date());
    await db.prepare("INSERT INTO report_schedules(id,company_id,user_id,report_id,frequency,next_run,created) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, userId, reportId, frequency, nextRun, new Date().toISOString()).run();
    await companyAudit(db, id, userId, "report-schedule", reportId, `${frequency === "monthly" ? "aylıq" : "həftəlik"}; ${email.email}`);
    return ok({ ok: true, nextRun });
  }
  if (request.method === "POST" && path === "company/reports/schedules/delete") {
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM report_schedules WHERE id=? AND company_id=? AND user_id=?").bind(str(b.id, 100), id, userId).run();
    return ok({ ok: true });
  }

  // ---- the feed key (one per company; shown once) ----
  if (isGet && path === "company/reports/feed-token") {
    requirePermission("salaries", "Xarici alət açarını yalnız HR, direktor və hesab sahibi görə bilər.");
    const row = await db.prepare("SELECT created,last_used FROM report_tokens WHERE company_id=?").bind(id).first<{ created: string; last_used: string }>();
    return ok({ exists: !!row, created: row?.created || "", lastUsed: row?.last_used || "" });
  }
  if (request.method === "POST" && path === "company/reports/feed-token") {
    requirePermission("salaries", "Xarici alət açarını yalnız HR, direktor və hesab sahibi yarada bilər.");
    if (memberRole !== "owner" && memberRole !== "director" && memberRole !== "hr") throw new HttpError(403, "Bu əməliyyat üçün rolunuzun icazəsi yoxdur.");
    const token = newFeedToken();
    await db.prepare("INSERT INTO report_tokens(company_id,token_hash,created) VALUES(?,?,?) ON CONFLICT(company_id) DO UPDATE SET token_hash=excluded.token_hash,created=excluded.created,last_used=''").bind(id, await tokenHash(token), new Date().toISOString()).run();
    await companyAudit(db, id, userId, "report-feed-key", "", "xarici alət açarı yaradıldı");
    return ok({ token, url: "/api/report-feed/staff-plan" });
  }
  if (request.method === "POST" && path === "company/reports/feed-token/revoke") {
    requirePermission("salaries", "Xarici alət açarını yalnız HR, direktor və hesab sahibi ləğv edə bilər.");
    await db.prepare("DELETE FROM report_tokens WHERE company_id=?").bind(id).run();
    await companyAudit(db, id, userId, "report-feed-key", "", "xarici alət açarı ləğv edildi");
    return ok({ ok: true });
  }

  // ---- data of the newer reports ----
  if (isGet && path === "company/reports/turnover") {
    requirePermission("employees", "Dövriyyə hesabatını (ad və çıxış səbəbi ilə) yalnız işçi məlumatına icazəsi olan şəxs görə bilər.");
    const from = str(requestUrl.searchParams.get("from"), 10);
    const to = str(requestUrl.searchParams.get("to"), 10);
    const rows = await db.prepare("SELECT name,department,position,start_date,end_date,exit_type,exit_reason FROM company_employees WHERE company_id=? AND status='left' AND end_date<>'' AND (?='' OR end_date>=?) AND (?='' OR end_date<=?) ORDER BY end_date DESC LIMIT 500").bind(id, from, from, to, to).all<{ name: string; department: string; position: string; start_date: string; end_date: string; exit_type: string; exit_reason: string }>();
    const active = await db.prepare("SELECT COUNT(*) AS n FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).first<{ n: number }>();
    return ok({ headcount: Number(active?.n) || 0, items: rows.results.map((r) => ({ name: r.name, department: r.department, position: r.position, start: r.start_date, end: r.end_date, tenureMonths: r.start_date ? monthsBetween(r.start_date, r.end_date) : null, exitType: exitTypeLabel(r.exit_type) || r.exit_type || "", reason: r.exit_reason })) });
  }
  if (isGet && path === "company/reports/hiring-flow") {
    requirePermission("reports");
    const events = await db.prepare("SELECT e.application_id AS app,e.to_value AS status,e.created FROM application_events e JOIN applications a ON a.id=e.application_id JOIN jobs j ON j.id=a.job_id WHERE j.owner=? AND e.to_value<>'' ORDER BY e.created LIMIT 20000").bind(id).all<{ app: string; status: string; created: string }>();
    const stages = ["Göndərildi", "Baxışda", "Müsahibə", "Təklif edildi", "İşə qəbul edildi"];
    const first = new Map<string, Map<string, string>>();
    for (const e of events.results) {
      const m = first.get(e.app) || new Map<string, string>();
      if (!m.has(e.status)) m.set(e.status, e.created);
      first.set(e.app, m);
    }
    const days = (a: string, b: string) => Math.max(0, (Date.parse(b) - Date.parse(a)) / 86400000);
    const out = stages.map((stage, i) => {
      let reached = 0, sum = 0, n = 0;
      for (const m of first.values()) {
        if (!m.has(stage)) continue;
        reached++;
        const prev = i > 0 ? m.get(stages[i - 1]) : undefined;
        if (prev) { sum += days(prev, m.get(stage) as string); n++; }
      }
      return { stage, reached, avgDays: n ? Math.round((sum / n) * 10) / 10 : null };
    });
    const offers = await db.prepare("SELECT status,COUNT(*) AS n FROM offers WHERE company_id=? GROUP BY status").bind(id).all<{ status: string; n: number }>().catch(() => ({ results: [] as { status: string; n: number }[] }));
    const by = Object.fromEntries(offers.results.map((r) => [r.status, Number(r.n)]));
    const answered = (by.accepted || 0) + (by.declined || 0) + (by.rejected || 0);
    const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const cost = await db.prepare("SELECT COALESCE(SUM(amount),0) AS total FROM hr_expenses WHERE company_id=? AND category='hiring' AND status IN ('approved','ordered','paid') AND expense_date>=?").bind(id, yearAgo).first<{ total: number }>().catch(() => null);
    const hires = await db.prepare("SELECT COUNT(*) AS n FROM company_employees WHERE company_id=? AND source='hired' AND substr(created,1,10)>=?").bind(id, yearAgo).first<{ n: number }>();
    return ok({ stages: out, offers: { sent: (by.sent || 0), accepted: by.accepted || 0, answered, acceptRate: answered ? Math.round(((by.accepted || 0) / answered) * 100) : null }, hires: Number(hires?.n) || 0, hiringCost: Math.round(Number(cost?.total) || 0) });
  }
  if (isGet && path === "company/reports/fund-change") {
    requirePermission("payroll", "Əmək haqqı fondunun dəyişməsini yalnız plan və əmək haqqı icazəsi olan şəxs görə bilər.");
    const fund = await hrFundReport();
    const year = fund.year;
    const [hires, exits, raises] = await Promise.all([
      db.prepare("SELECT substr(start_date,1,7) AS m,COUNT(*) AS n FROM company_employees WHERE company_id=? AND start_date LIKE ? GROUP BY 1").bind(id, `${year}-%`).all<{ m: string; n: number }>(),
      db.prepare("SELECT substr(end_date,1,7) AS m,COUNT(*) AS n FROM company_employees WHERE company_id=? AND status='left' AND end_date LIKE ? GROUP BY 1").bind(id, `${year}-%`).all<{ m: string; n: number }>(),
      db.prepare("SELECT substr(event_date,1,7) AS m,COUNT(*) AS n FROM employee_events WHERE company_id=? AND type='salary' AND event_date LIKE ? GROUP BY 1").bind(id, `${year}-%`).all<{ m: string; n: number }>().catch(() => ({ results: [] as { m: string; n: number }[] })),
    ]);
    const map = (r: { results: { m: string; n: number }[] }) => new Map(r.results.map((x) => [x.m, Number(x.n)]));
    const h = map(hires), e = map(exits), s = map(raises);
    return ok({ year, months: fund.months.map((m) => ({ ...m, hires: h.get(m.month) || 0, exits: e.get(m.month) || 0, raises: s.get(m.month) || 0 })) });
  }
  return undefined;
}
