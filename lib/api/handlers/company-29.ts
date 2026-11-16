// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, runtime, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { isApplicationKind, requestProblems, requestWarnings } from "@/lib/requests";
import { mailConfigured, sendMail } from "@/lib/mail";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_29(c: Pick<RouteCtx, "db" | "id" | "leaveChecks" | "path" | "request" | "requestRow" | "requesterName" | "requirePermission" | "tellEmployee" | "userId">): Promise<Response | undefined> {
  const { db, id, leaveChecks, path, request, requestRow, requesterName, requirePermission, tellEmployee, userId } = c;
  if (request.method === "GET" && path === "company/applications") {
    requirePermission("salaries", "Ərizələri yalnız əmr icazəsi olan şəxs görə bilər.");
    const rows = await db
      .prepare(
        `SELECT q.id,q.employee_id,q.kind,q.data,q.status,q.order_id,q.decision,q.source,q.created_by_name,q.created,q.manager_status,q.manager_name,q.manager_note,e.department AS dept_raw,
          e.name AS employee_name,e.position AS employee_position,e.department AS employee_department,e.section AS employee_section,e.start_date AS employee_start,e.end_date AS employee_end,e.salary_cents AS employee_salary,e.salary_type AS employee_salary_type,e.probation_end AS employee_probation,
          o.number AS order_number,o.status AS order_status
         FROM employee_requests q JOIN company_employees e ON e.id=q.employee_id LEFT JOIN employee_orders o ON o.id=q.order_id
         WHERE q.company_id=? ORDER BY CASE q.status WHEN 'new' THEN 0 ELSE 1 END,q.created DESC LIMIT 500`,
      )
      .bind(id)
      .all<Parameters<typeof requestRow>[0]>();
    // How fast the applications are answered: the average time to an answer and the ones waiting more than 3 days.
    const times = (await db.prepare("SELECT status,created,updated FROM employee_requests WHERE company_id=? AND created>?").bind(id, new Date(Date.now() - 90 * 86_400_000).toISOString()).all<{ status: string; created: string; updated: string }>()).results;
    const answered = times.filter((t) => t.status !== "new" && t.status !== "withdrawn");
    const waiting = times.filter((t) => t.status === "new");
    const hours = answered.map((t) => (Date.parse(t.updated) - Date.parse(t.created)) / 3_600_000).filter((h) => Number.isFinite(h) && h >= 0);
    const stats = {
      answered: answered.length,
      waiting: waiting.length,
      overdue: waiting.filter((t) => Date.now() - Date.parse(t.created) > 3 * 86_400_000).length,
      averageHours: hours.length ? Math.round((hours.reduce((t, h) => t + h, 0) / hours.length) * 10) / 10 : null,
    };
    const list = rows.results.map(requestRow);
    // Clashes for the applications still open, so HR sees them before the order.
    const withChecks = await Promise.all(list.slice(0, 80).map(async (r, i) => ({ ...r, checks: r.status === "new" ? await leaveChecks(id, { id: r.employee.id, department: r.employee.department }, r.kind, r.data, r.id) : [], _i: i })));
    return ok({ requests: [...withChecks.map((row) => { const { _i: order, ...rest } = row; void order; return rest; }), ...list.slice(80)], stats });
  }
  if (request.method === "POST" && path === "company/applications/save") {
    requirePermission("salaries", "Ərizələri yalnız əmr icazəsi olan şəxs qeyd edə bilər.");
    const b = await jsonBody(request);
    const employee = await db
      .prepare("SELECT id,name FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'")
      .bind(str(b.employeeId, 100), id)
      .first<{ id: string; name: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const kind = str(b.kind, 20);
    if (!isApplicationKind(kind)) throw new HttpError(400, "Ərizənin növü düzgün deyil.");
    const raw = (b.data && typeof b.data === "object" ? b.data : {}) as Record<string, unknown>;
    const data = { from: str(raw.from, 10), to: str(raw.to, 10), quantity: Math.max(0, Math.min(3650, Number(raw.quantity) || 0)), reason: str(raw.reason, 500), basis: str(raw.basis, 300) };
    const problems = requestProblems(kind, data);
    if (problems.length) throw new HttpError(400, problems[0]);
    const open = await db.prepare("SELECT COUNT(*) AS n FROM employee_requests WHERE company_id=? AND status='new'").bind(id).first<{ n: number }>();
    if (Number(open?.n) >= 300) throw new HttpError(409, "Cavablandırılmamış ərizə sayı 300-ü keçib: əvvəlcə mövcud ərizələrə əmr yaradın və ya rədd edin.");
    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db
      .prepare("INSERT INTO employee_requests(id,company_id,employee_id,kind,data,status,created_by,created_by_name,created,updated) VALUES(?,?,?,?,?,'new',?,?,?,?)")
      .bind(requestId, id, employee.id, kind, JSON.stringify(data), userId, await requesterName(), now, now)
      .run();
    await companyAudit(db, id, userId, "request-recorded", employee.id, `${employee.name}: ${kind}`);
    return ok({ ok: true, id: requestId, warnings: requestWarnings(kind, data, now.slice(0, 10)) }, 201);
  }
  if (request.method === "POST" && path === "company/applications/reject") {
    requirePermission("salaries", "Ərizələri yalnız əmr icazəsi olan şəxs rədd edə bilər.");
    const b = await jsonBody(request);
    const reason = str(b.reason, 300);
    if (reason.length < 3) throw new HttpError(400, "Rədd səbəbini yazın.");
    const result = await db
      .prepare("UPDATE employee_requests SET status='rejected',decision=?,updated=? WHERE id=? AND company_id=? AND status='new'")
      .bind(reason, new Date().toISOString(), str(b.id, 100), id)
      .run();
    if (!result.meta.changes) throw new HttpError(409, "Ərizə artıq cavablandırılıb və ya tapılmadı.");
    await companyAudit(db, id, userId, "request-rejected", str(b.id, 100), reason);
    const rejected = await db.prepare("SELECT employee_id FROM employee_requests WHERE id=?").bind(str(b.id, 100)).first<{ employee_id: string }>();
    if (rejected) await tellEmployee(rejected.employee_id, "Ərizəniz rədd edildi", reason.slice(0, 200));
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/applications/answer") {
    requirePermission("salaries", "Ərizələri yalnız əmr icazəsi olan şəxs cavablandıra bilər.");
    const b = await jsonBody(request);
    const reply = str(b.reply, 1000);
    if (reply.length < 3) throw new HttpError(400, "Cavabı yazın.");
    const row = await db.prepare("SELECT id,employee_id,kind FROM employee_requests WHERE id=? AND company_id=? AND status='new'").bind(str(b.id, 100), id).first<{ id: string; employee_id: string; kind: string }>();
    if (!row) throw new HttpError(409, "Ərizə artıq cavablandırılıb və ya tapılmadı.");
    await db.prepare("UPDATE employee_requests SET status='answered',decision=?,updated=? WHERE id=?").bind(reply, new Date().toISOString(), row.id).run();
    await companyAudit(db, id, userId, "application-answered", row.employee_id, reply.slice(0, 200));
    await tellEmployee(row.employee_id, "Ərizənizə cavab verildi", reply.slice(0, 200));
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/applications/delete") {
    requirePermission("salaries", "Ərizələri yalnız əmr icazəsi olan şəxs silə bilər.");
    const b = await jsonBody(request);
    const result = await db.prepare("DELETE FROM employee_requests WHERE id=? AND company_id=? AND status<>'ordered'").bind(str(b.id, 100), id).run();
    if (!result.meta.changes) throw new HttpError(409, "Əmr yaradılmış ərizə silinə bilməz: əvvəlcə əmri silin.");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/employees/send-offer") {
    requirePermission("salaries", "İşçiyə təklifi yalnız HR, direktor və hesab sahibi göndərə bilər.");
    const b = await jsonBody(request);
    const employee = await db
      .prepare("SELECT id,name,email FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'")
      .bind(str(b.employeeId, 100), id)
      .first<{ id: string; name: string; email: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee.email))
      throw new HttpError(400, "İşçinin e-poçt ünvanı yoxdur. Onu işçi kartında yazın.");
    // A job offer belongs to a vacancy whose selection is finished: a candidate has passed every stage.
    const offerJob = await db
      .prepare("SELECT data FROM jobs WHERE id=? AND owner=?")
      .bind(str(b.jobId, 100), id)
      .first<{ data: string }>();
    if (!offerJob) throw new HttpError(400, "İş təklifi vakansiyaya bağlı olmalıdır. Vakansiyanı seçin.");
    const offerStages = (JSON.parse(offerJob.data) as { stages?: string[] }).stages || [];
    const lastStage = offerStages.length ? offerStages[offerStages.length - 1] : "";
    const finished = await db
      .prepare("SELECT 1 AS yes FROM applications WHERE job_id=? AND status='Müsahibə' AND (?='' OR stage=?) LIMIT 1")
      .bind(str(b.jobId, 100), lastStage, lastStage)
      .first();
    if (!finished)
      throw new HttpError(409, lastStage ? `İş təklifi yalnız seçim mərhələləri tamamlanandan sonra göndərilir: heç bir namizəd son mərhələyə (“${lastStage}”) çatmayıb.` : "İş təklifi yalnız müsahibə mərhələsindən sonra göndərilir.");
    const settings = runtime();
    if (!mailConfigured(settings))
      throw new HttpError(409, "E-poçt göndərişi hələ qurulmayıb. Məktubu çap edin, Word kimi yükləyin və ya “Poçt proqramında aç” düyməsini işlədin.");
    const subject = str(b.subject, 200);
    const text = str(b.text, 6000);
    if (subject.length < 3 || text.length < 20) throw new HttpError(400, "Mövzu və məktub mətni boş ola bilməz.");
    await sendMail(settings, { to: employee.email, subject, text });
    await companyAudit(db, id, userId, "employee-offer-sent", employee.id, `${employee.name}: ${subject}`);
    return ok({ ok: true });
  }
  return undefined;
}
