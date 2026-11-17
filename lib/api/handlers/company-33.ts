// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { EXIT_REASONS, EXIT_TYPES, addDays, computeWorkforce, daysBetween } from "@/lib/workforce";
import { HttpError, jsonBody, str } from "@/lib/server";
import { attendanceCode } from "@/lib/calendar-az";
import { can } from "@/lib/company";
import { companyAudit } from "@/lib/api-core";
import { forecast, monthSeries, planFactAlerts, targetAlerts } from "@/lib/hr-trends";
import { normalizeDocType } from "@/lib/employee-docs";
import { paymentDate } from "@/lib/payroll-calc";
import { summarize, unitActive } from "@/lib/staff-plan";
import { MINIMUM_WAGE } from "@/lib/payroll-calc";
import { loadPlanData, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_33(c: Pick<RouteCtx, "AWAY_CODES" | "EMPLOYEE_DOC_CATEGORIES" | "assertYearOpen" | "auditView" | "canAct" | "db" | "employeeDocsDenied" | "id" | "memberGrants" | "memberRole" | "path" | "request" | "requestUrl" | "requirePermission" | "userId" | "yearPlanState">): Promise<Response | undefined> {
  const { AWAY_CODES, EMPLOYEE_DOC_CATEGORIES, assertYearOpen, auditView, canAct, db, employeeDocsDenied, id, memberGrants, memberRole, path, request, requestUrl, requirePermission, userId, yearPlanState } = c;
  if (request.method === "GET" && path === "company/employee-docs") {
    requirePermission("salaries", employeeDocsDenied);
    const rows = await db
      .prepare(
        "SELECT id,category,subtype,doc_number AS docNumber,doc_date AS docDate,name,type,size,created FROM employee_documents WHERE company_id=? AND employee_id=? ORDER BY created DESC",
      )
      .bind(id, str(requestUrl.searchParams.get("employeeId"), 100))
      .all();
    return ok({ documents: rows.results, categories: EMPLOYEE_DOC_CATEGORIES });
  }
  if (request.method === "POST" && path === "company/employee-docs/upload") {
    requirePermission("salaries", employeeDocsDenied);
    const raw = await request.text();
    if (raw.length > 1_600_000)
      throw new HttpError(413, "Fayl çox böyükdür (maksimum 1 MB).");
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Məlumat oxunmadı.");
    }
    const employee = await db
      .prepare(
        "SELECT id,name FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'",
      )
      .bind(str(b.employeeId, 100), id)
      .first<{ id: string; name: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const type = str(b.type, 80);
    if (
      !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        type,
      )
    )
      throw new HttpError(400, "Fayl PDF, PNG, JPG və ya WEBP olmalıdır.");
    const data = str(b.data, 1_500_000);
    if (!data || !/^[A-Za-z0-9+/=]+$/.test(data))
      throw new HttpError(400, "Fayl oxunmadı.");
    const count = await db
      .prepare(
        "SELECT COUNT(*) AS n FROM employee_documents WHERE company_id=? AND employee_id=?",
      )
      .bind(id, employee.id)
      .first<{ n: number }>();
    if ((Number(count?.n) || 0) >= 30)
      throw new HttpError(409, "Bir işçi üçün ən çoxu 30 sənəd saxlamaq olar.");
    const name = str(b.name, 160) || "sənəd";
    const docType = normalizeDocType(str(b.category, 20), str(b.subtype, 80));
    if (!docType.ok) throw new HttpError(400, "Sənədin hansı sənəd olduğunu seçin (məsələn, hansı müqavilə).");
    const category = EMPLOYEE_DOC_CATEGORIES.includes(docType.category) ? docType.category : "other";
    const docNumber = str(b.docNumber, 40);
    const docDateRaw = str(b.docDate, 10);
    const docDate = /^\d{4}-\d{2}-\d{2}$/.test(docDateRaw) ? docDateRaw : "";
    await db
      .prepare(
        "INSERT INTO employee_documents(id,company_id,employee_id,category,subtype,doc_number,doc_date,expires,name,type,data,size,uploaded_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        id,
        employee.id,
        category,
        docType.subtype,
        docNumber,
        docDate,
        /^\d{4}-\d{2}-\d{2}$/.test(str(b.expires, 10)) ? str(b.expires, 10) : "",
        name,
        type,
        data,
        Math.floor(data.length * 0.75),
        userId,
        new Date().toISOString(),
      )
      .run();
    await companyAudit(
      db,
      id,
      userId,
      "employee-doc-added",
      employee.id,
      `${employee.name}: ${name}`,
    );
    return ok({ ok: true }, 201);
  }
  if (request.method === "GET" && path === "company/employee-doc") {
    requirePermission("salaries", employeeDocsDenied);
    const row = await db
      .prepare(
        "SELECT employee_id,name,type,data FROM employee_documents WHERE id=? AND company_id=?",
      )
      .bind(str(requestUrl.searchParams.get("id"), 100), id)
      .first<{
        employee_id: string;
        name: string;
        type: string;
        data: string;
      }>();
    if (!row) throw new HttpError(404, "Sənəd tapılmadı.");
    await companyAudit(
      db,
      id,
      userId,
      "employee-doc-viewed",
      row.employee_id,
      row.name,
    );
    return new Response(
      Uint8Array.from(atob(row.data), (c) => c.charCodeAt(0)),
      {
        headers: {
          "Content-Type": row.type,
          "Content-Disposition": "inline",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  if (request.method === "POST" && path === "company/employee-docs/delete") {
    requirePermission("salaries", employeeDocsDenied);
    const b = await jsonBody(request);
    const result = await db
      .prepare("DELETE FROM employee_documents WHERE id=? AND company_id=?")
      .bind(str(b.id, 100), id)
      .run();
    if (!result.meta.changes) throw new HttpError(404, "Sənəd tapılmadı.");
    await companyAudit(db, id, userId, "employee-doc-deleted", str(b.id, 100));
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/employee-events") {
    requirePermission(
      "salaries",
      "İşçinin hərəkət tarixçəsini yalnız HR, direktor və hesab sahibi görə bilər.",
    );
    const rows = await db
      .prepare(
        `SELECT e.type,e.from_value,e.to_value,e.note,e.event_date,e.created,COALESCE(a.name,'') AS actor FROM employee_events e
        LEFT JOIN accounts a ON a.id=e.actor_id WHERE e.company_id=? AND e.employee_id=? ORDER BY e.event_date DESC,e.created DESC LIMIT 100`,
      )
      .bind(id, str(requestUrl.searchParams.get("id"), 100))
      .all();
    return ok({ events: rows.results });
  }
  if (request.method === "GET" && path === "company/ops-overview") {
    requirePermission("salaries", "Kadr ümumi baxışını yalnız kadr işçisi görə bilər.");
    const today = new Date().toISOString().slice(0, 10);
    const in14 = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    const ago30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
    const people = (await db.prepare("SELECT id,name,department,status,start_date,end_date FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ id: string; name: string; department: string; status: string; start_date: string; end_date: string }>()).results;
    const working = people.filter((p) => p.status === "active" || p.status === "leave");
    const nameOf = new Map(people.map((p) => [p.id, p.name]));
    const awayMarks = (await db.prepare(`SELECT employee_id,code FROM attendance_marks WHERE company_id=? AND day=? AND code IN (${AWAY_CODES.map(() => "?").join(",")})`).bind(id, today, ...AWAY_CODES).all<{ employee_id: string; code: string }>()).results;
    const away = awayMarks.filter((m) => nameOf.has(m.employee_id)).map((m) => ({ name: nameOf.get(m.employee_id) as string, reason: (attendanceCode(m.code)?.label || m.code).replace(/\s*\(.*\)\s*/, "") }));
    const byDepartment = new Map<string, number>();
    for (const p of working) byDepartment.set(p.department || "Şöbəsiz", (byDepartment.get(p.department || "Şöbəsiz") || 0) + 1);
    const series = monthSeries(people.map((r) => ({ startDate: r.start_date || "", endDate: r.end_date || "", status: r.status })), today.slice(0, 7), 12);
    const leaves = (await db.prepare("SELECT employee_id,start_date,end_date,days,status FROM leave_schedule WHERE company_id=? AND status IN ('approved','proposed') AND start_date BETWEEN ? AND ? ORDER BY start_date LIMIT 10").bind(id, today, in14).all<{ employee_id: string; start_date: string; end_date: string; days: number; status: string }>().catch(() => ({ results: [] as { employee_id: string; start_date: string; end_date: string; days: number; status: string }[] }))).results;
    const count = async (query: string, ...binds: unknown[]) => Number((await db.prepare(query).bind(...binds).first<{ n: number }>().catch(() => null))?.n || 0);
    const [ordersWaiting, requestsNew, run, settings] = await Promise.all([
      count("SELECT COUNT(*) AS n FROM employee_orders WHERE company_id=? AND status IN ('pending','returned')", id),
      count("SELECT COUNT(*) AS n FROM employee_requests WHERE company_id=? AND status='new' AND manager_status IN ('','approved')", id),
      db.prepare("SELECT status,approved_at FROM payroll_runs WHERE company_id=? AND month=?").bind(id, today.slice(0, 7)).first<{ status: string; approved_at: string }>(),
      db.prepare("SELECT pay_day FROM payroll_settings WHERE company_id=?").bind(id).first<{ pay_day: number }>(),
    ]);
    return ok({
      today,
      headcount: { active: working.length, onLeave: away.length, joined30: working.filter((p) => p.start_date && p.start_date >= ago30 && p.start_date <= today).length, left30: people.filter((p) => p.status === "left" && p.end_date && p.end_date >= ago30 && p.end_date <= today).length },
      away: away.slice(0, 12),
      departments: [...byDepartment].map(([name, n]) => ({ name, count: n })).sort((a, b) => b.count - a.count).slice(0, 8),
      series: series.map((x) => ({ month: x.month, headcount: x.headcount, joined: x.joined, left: x.left })),
      leaves: leaves.filter((l) => nameOf.has(l.employee_id)).map((l) => ({ name: nameOf.get(l.employee_id) as string, from: l.start_date, to: l.end_date, days: l.days, approved: l.status === "approved" })),
      ordersWaiting,
      requestsNew,
      payroll: { month: today.slice(0, 7), approved: run?.status === "approved", payDate: paymentDate(Number(today.slice(0, 4)), Number(today.slice(5, 7)), settings?.pay_day || 28) },
    });
  }
  if (request.method === "GET" && path === "company/hr-trends") {
    requirePermission("reports");
    const today = new Date().toISOString().slice(0, 10);
    const rows = (await db.prepare("SELECT start_date,end_date,status FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ start_date: string; end_date: string; status: string }>()).results;
    const series = monthSeries(rows.map((r) => ({ startDate: r.start_date || "", endDate: r.end_date || "", status: r.status })), today.slice(0, 7), 12);
    const plan = await loadPlanData(db, id);
    const fact = summarize(plan.units, plan.people);
    const planFact = fact.departments.map((d) => ({ department: d.department, planned: d.planned, filled: d.filled, unplaced: d.unplaced }));
    // The plan line of the chart is the headcount of the APPROVED staff plan (budget) of each year: the staff table's total number of places.
    // A year whose plan is not approved has no plan line (nothing is typed by hand any more).
    const targets: Record<string, number> = {};
    const thisYear = new Date().getFullYear();
    // Each month counts the places open in it (a row may start later or end earlier: a project or a temporary place).
    for (const y of [thisYear - 1, thisYear, thisYear + 1])
      if ((await yearPlanState(String(y))).status === "approved")
        for (let m = 1; m <= 12; m++) {
          const month = `${y}-${String(m).padStart(2, "0")}`;
          targets[month] = plan.units.filter((u) => unitActive(u, month)).reduce((sum, u) => sum + u.planned, 0);
        }
    // Who is expected to leave in the next three months (a set end date or the end of a fixed-term contract), and how long a place has taken to fill.
    const horizon = Array.from({ length: 3 }, (_, i) => { const d = new Date(`${today.slice(0, 7)}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + i + 1); return d.toISOString().slice(0, 7); });
    const leaving = (await db.prepare("SELECT end_date,contract_end FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ end_date: string; contract_end: string }>()).results;
    const expectedExits = horizon.map((month) => ({ month, count: leaving.filter((r) => (r.end_date || r.contract_end || "").slice(0, 7) === month && (r.end_date || r.contract_end) > today).length }));
    const fill = await db.prepare("SELECT AVG(julianday(substr(e.created,1,10))-julianday(substr(j.created,1,10))) AS days, COUNT(*) AS n FROM company_employees e JOIN jobs j ON j.id=e.job_id WHERE e.company_id=? AND e.source='hired'").bind(id).first<{ days: number | null; n: number }>().catch(() => null);
    const avgFillDays = fill && Number(fill.n) > 0 && fill.days !== null ? Math.max(0, Math.round(Number(fill.days))) : null;
    const lowPay = plan.units.filter((u) => u.salaryMax > 0 && u.salaryMin > 0 && u.salaryMin < MINIMUM_WAGE).map((u) => ({ level: "amber" as const, text: `“${u.position || u.department}” ştat sətrinin minimum maaşı (${u.salaryMin} AZN) ölkə minimumundan (${MINIMUM_WAGE} AZN) aşağıdır.` }));
    const units = new Map(fact.departments.map((d) => [d.department, d.units]));
    return ok({ series, forecast: forecast(series, 3, 6), planFact: planFact.map((r) => ({ ...r, units: units.get(r.department) || 0 })), alerts: [...targetAlerts(series, targets), ...planFactAlerts(planFact), ...lowPay], expectedExits, avgFillDays, planned: fact.total.planned, filled: fact.total.filled, targets, canPlan: canAct("staff") });
  }
  if (request.method === "POST" && path === "company/hr-trends/targets") {
    requirePermission("salaries", "Plan hədəfini yalnız ştat planı icazəsi olan şəxs yaza bilər.");
    const b = await jsonBody(request);
    const list = (Array.isArray(b.targets) ? b.targets : []).slice(0, 60) as { month?: unknown; target?: unknown }[];
    if (!list.length) throw new HttpError(400, "Plan hədəfi yazılmayıb.");
    for (const y of new Set(list.map((t) => String(t.month ?? "").slice(0, 4)))) if (/^\d{4}$/.test(y)) await assertYearOpen(y);
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];
    for (const t of list) {
      const month = String(t.month ?? "");
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, `Ay düzgün deyil: “${month}”.`);
      if (t.target === null || t.target === "") {
        statements.push(db.prepare("DELETE FROM headcount_targets WHERE company_id=? AND month=?").bind(id, month));
        continue;
      }
      const target = Math.round(Number(t.target));
      if (!Number.isFinite(target) || target < 0 || target > 100000) throw new HttpError(400, `${month}: plan 0–100000 arası olmalıdır.`);
      statements.push(db.prepare("INSERT INTO headcount_targets(company_id,month,target,updated,updated_by) VALUES(?,?,?,?,?) ON CONFLICT(company_id,month) DO UPDATE SET target=excluded.target,updated=excluded.updated,updated_by=excluded.updated_by").bind(id, month, target, now, userId));
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "headcount-targets", "", `${list.length} ay üçün plan yazıldı`);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/workforce") {
    requirePermission("reports");
    const today = new Date().toISOString().slice(0, 10);
    const rawTo = str(requestUrl.searchParams.get("to"), 10);
    const to = /^\d{4}-\d{2}-\d{2}$/.test(rawTo) ? rawTo : today;
    const rawFrom = str(requestUrl.searchParams.get("from"), 10);
    const from = /^\d{4}-\d{2}-\d{2}$/.test(rawFrom)
      ? rawFrom
      : addDays(to, -364);
    if (from > to)
      throw new HttpError(
        400,
        "Başlanğıc tarix son tarixdən sonra ola bilməz.",
      );
    if (daysBetween(from, to) > 366 * 3)
      throw new HttpError(400, "Dövr üç ildən uzun ola bilməz.");
    const employees = await db
      .prepare(
        "SELECT department,start_date,end_date,status,exit_type,exit_reason,source FROM company_employees WHERE company_id=? AND status<>'removed'",
      )
      .bind(id)
      .all<{
        department: string;
        start_date: string;
        end_date: string;
        status: "active" | "leave" | "left";
        exit_type: string;
        exit_reason: string;
        source: string;
      }>();
    const vacancies = await db
      .prepare(
        "SELECT created,json_extract(data,'$.reason') AS reason FROM jobs WHERE owner=?",
      )
      .bind(id)
      .all<{ created: string; reason: string | null }>();
    const metrics = computeWorkforce(
      employees.results.map((e) => ({
        department: e.department,
        startDate: e.start_date,
        endDate: e.end_date,
        status: e.status,
        exitType: e.exit_type,
        exitReason: e.exit_reason,
        source: e.source,
      })),
      vacancies.results.map((v) => ({
        created: v.created,
        reason: v.reason || "",
      })),
      from,
      to,
      { includeReasons: can(memberRole, "salaries") },
    );
    return ok({
      metrics,
      exitTypes: EXIT_TYPES,
      exitReasons: EXIT_REASONS,
      canSeeReasons: can(memberRole, "salaries"),
    });
  }
  if (request.method === "GET" && path === "company/employees/salary-history") {
    requirePermission("salaries", "Maaş tarixçəsini yalnız maaşlara icazəsi olan şəxs görə bilər.");
    if (!can(memberRole, "salaries", memberGrants)) throw new HttpError(403, "Maaş tarixçəsini yalnız maaşlara icazəsi olan şəxs görə bilər.");
    await auditView("view-salary-history", str(requestUrl.searchParams.get("id"), 100));
    const rows = await db
      .prepare("SELECT effective_from,salary_cents,salary_type,note,created FROM employee_salary_history WHERE company_id=? AND employee_id=? ORDER BY effective_from DESC")
      .bind(id, str(requestUrl.searchParams.get("id"), 100))
      .all<{ effective_from: string; salary_cents: number; salary_type: string; note: string; created: string }>();
    return ok({ history: rows.results.map((r) => ({ from: r.effective_from === "0000-01-01" ? "" : r.effective_from, salary: r.salary_cents / 100, type: r.salary_type, note: r.note, created: r.created })) });
  }
  return undefined;
}
