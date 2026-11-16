// employee: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { BRIEFING_KINDS, INCIDENT_KINDS, INCIDENT_STATUS, MEDICAL_KINDS, MEDICAL_RESULTS, RETENTION_CATEGORIES, cleanOhs, dueState, retentionEnd, retentionYears, textHash } from "@/lib/ohs";
import { HttpError, jsonBody, str } from "@/lib/server";
import { STATUS_TEXT as LEAVE_STATUS, planLeave } from "@/lib/leave-schedule";
import { companyAudit, notify } from "@/lib/api-core";
import { matchEmployee, parseOhsRows } from "@/lib/sheet-imports";
import { quiet } from "@/lib/quiet";
import { tenure, vacationBalance } from "@/lib/payroll";
import { LeaveRow, ok, resolvePosition } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_employee_01(c: Pick<RouteCtx, "accountRole" | "db" | "employeeRefs" | "id" | "ownWorkplace" | "path" | "request" | "requestUrl" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { accountRole, db, employeeRefs, id, ownWorkplace, path, request, requestUrl, requirePermission, userId } = c;
  if (request.method === "GET" && path === "employee/workplaces") {
    if (accountRole === "company") return ok({ workplaces: [] });
    const rows = await db
      .prepare(
        `SELECT e.id,e.name,e.position,e.department,e.section,e.start_date,e.status,e.vacation_days,e.vacation_used,c.name AS company,
          (SELECT COUNT(*) FROM attendance_marks m WHERE m.employee_id=e.id AND m.code='annual') AS annual_marks,
          (SELECT COUNT(*) FROM company_employees r WHERE r.company_id=e.company_id AND r.status IN ('active','leave') AND (CASE WHEN json_valid(r.profile) THEN json_extract(r.profile,'$.managerId') END)=e.id) + (SELECT COUNT(*) FROM company_employees d WHERE d.company_id=e.company_id AND d.status IN ('active','leave') AND (CASE WHEN json_valid(d.profile) THEN json_extract(d.profile,'$.deputyId') END)=e.id) AS team
         FROM company_employees e JOIN accounts c ON c.id=e.company_id WHERE e.user_id=? AND e.status IN ('active','leave') ORDER BY e.start_date DESC`,
      )
      .bind(userId)
      .all<{ id: string; name: string; position: string; department: string; section: string; start_date: string; status: string; vacation_days: number; vacation_used: number; company: string; annual_marks: number; team: number }>();
    const todayIso = new Date().toISOString().slice(0, 10);
    return ok({
      workplaces: rows.results.map((r) => ({
        id: r.id,
        company: r.company,
        name: r.name,
        position: r.position,
        department: r.department,
        section: r.section,
        startDate: r.start_date,
        status: r.status,
        team: Number(r.team) || 0,
        tenure: tenure(r.start_date, "", todayIso)?.text || "",
        vacation: vacationBalance({ start: r.start_date, end: "", entitlement: r.vacation_days ?? 21, used: (r.vacation_used ?? 0) + Number(r.annual_marks || 0) }, todayIso),
      })),
    });
  }
  if (request.method === "GET" && path === "employee/leave-schedule") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const year = /^\d{4}$/.test(str(requestUrl.searchParams.get("year"), 4)) ? Number(str(requestUrl.searchParams.get("year"), 4)) : new Date().getUTCFullYear();
    const rows = (await db.prepare("SELECT id,employee_id,year,start_date,end_date,days,status,proposed_by,note,decided_by_name,decided_at FROM leave_schedule WHERE company_id=? AND employee_id=? AND year=? ORDER BY start_date").bind(employee.company_id, employee.id, year).all<LeaveRow>()).results;
    const annual = Number((await db.prepare("SELECT COUNT(*) AS n FROM attendance_marks WHERE employee_id=? AND code='annual'").bind(employee.id).first<{ n: number }>())?.n || 0);
    const balance = vacationBalance({ start: employee.start_date, end: "", entitlement: employee.vacation_days ?? 21, used: (employee.vacation_used ?? 0) + annual }, new Date().toISOString().slice(0, 10));
    return ok({ year, balance, entries: rows.map((r) => ({ id: r.id, employeeId: r.employee_id, name: employee.name, start: r.start_date, end: r.end_date, days: r.days, status: r.status, statusText: LEAVE_STATUS[r.status] || r.status, proposedBy: r.proposed_by, note: r.note, decidedBy: r.decided_by_name, decidedAt: r.decided_at })) });
  }
  if (request.method === "POST" && path === "employee/leave-schedule/propose") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const plan = planLeave(str(b.start, 10), Number(b.days));
    if (!plan) throw new HttpError(400, "Başlama tarixini və gün sayını düzgün yazın.");
    if (plan.days > 60) throw new HttpError(400, "Bir təklif 60 gündən uzun ola bilməz: hissələrə bölün.");
    if (plan.start < new Date().toISOString().slice(0, 10)) throw new HttpError(400, "Keçmiş tarix üçün təklif verilmir.");
    const count = Number((await db.prepare("SELECT COUNT(*) AS n FROM leave_schedule WHERE company_id=? AND employee_id=? AND status='proposed'").bind(employee.company_id, employee.id).first<{ n: number }>())?.n || 0);
    if (count >= 5) throw new HttpError(409, "Cavab gözləyən 5 təklifiniz var: əvvəl onlar həll olunmalıdır.");
    const entryId = crypto.randomUUID();
    await db.prepare("INSERT INTO leave_schedule(id,company_id,employee_id,year,start_date,end_date,days,status,proposed_by,note,created) VALUES(?,?,?,?,?,?,?,'proposed','employee',?,?)").bind(entryId, employee.company_id, employee.id, Number(plan.start.slice(0, 4)), plan.start, plan.end, plan.days, str(b.note, 300), new Date().toISOString()).run();
    await notify(db, { userId: employee.company_id, type: "employee", title: `${employee.name} məzuniyyət təklif etdi`, body: `${plan.start} – ${plan.end} (${plan.days} gün). Məzuniyyət qrafikində təsdiqləyin.`, link: "hr-people-ops" }).catch((error) => quiet("route-best-effort", error));
    await companyAudit(db, employee.company_id, userId, "leave-proposed-by-employee", employee.id, `${plan.start} – ${plan.end}`);
    return ok({ ok: true, id: entryId, plan }, 201);
  }
  if (request.method === "POST" && path === "employee/leave-schedule/withdraw") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const res = await db.prepare("DELETE FROM leave_schedule WHERE id=? AND company_id=? AND employee_id=? AND status='proposed'").bind(str(b.id, 100), employee.company_id, employee.id).run();
    if (!res.meta.changes) throw new HttpError(404, "Yalnız cavab gözləyən təklif geri götürülür.");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/ohs") {
    requirePermission("salaries", "Əməyin mühafizəsi qeydlərini yalnız kadr işçisi, direktor və hesab sahibi görə bilər.");
    const rows = (await db.prepare("SELECT o.id,o.type,o.employee_id,o.record_date,o.due_date,o.status,o.data,COALESCE(e.name,'') AS name FROM ohs_records o LEFT JOIN company_employees e ON e.id=o.employee_id WHERE o.company_id=? ORDER BY o.record_date DESC,o.created DESC LIMIT 1000").bind(id).all<{ id: string; type: string; employee_id: string; record_date: string; due_date: string; status: string; data: string; name: string }>()).results;
    const today = new Date().toISOString().slice(0, 10);
    const records = rows.map((r) => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(r.data || "{}"); } catch { /* an unreadable record shows without details */ }
      return { id: r.id, type: r.type, employeeId: r.employee_id, employeeName: r.name, date: r.record_date, due: r.due_date, status: r.status, data };
    });
    // The newest record of each person and kind decides whether the next briefing or examination is late.
    const latest = new Map<string, (typeof records)[number]>();
    for (const r of records) {
      if (r.type === "incident" || !r.employeeId) continue;
      const key = `${r.employeeId}|${r.type}|${r.type === "briefing" ? (r.data.kind === "fire" ? "fire" : "work") : "med"}`;
      if (!latest.has(key) && r.due) latest.set(key, r);
    }
    const due = [...latest.values()].map((r) => ({ ...r, state: dueState(r.due, today) })).filter((r) => r.state === "overdue" || r.state === "soon").sort((a, b) => a.due.localeCompare(b.due));
    return ok({ records, due, labels: { briefing: BRIEFING_KINDS, medical: MEDICAL_KINDS, result: MEDICAL_RESULTS, incident: INCIDENT_KINDS, status: INCIDENT_STATUS } });
  }
  if (request.method === "POST" && path === "company/ohs/save") {
    requirePermission("salaries", "Əməyin mühafizəsi qeydlərini yalnız kadr işçisi, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const checked = cleanOhs(b);
    if (!checked.ok) throw new HttpError(400, checked.error);
    const v = checked.value;
    if (v.employeeId && !(await db.prepare("SELECT 1 AS yes FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(v.employeeId, id).first())) throw new HttpError(404, "İşçi tapılmadı.");
    const now = new Date().toISOString();
    const existing = str(b.id, 100);
    if (existing) {
      const done = await db.prepare("UPDATE ohs_records SET employee_id=?,record_date=?,due_date=?,status=?,data=? WHERE id=? AND company_id=? AND type=?").bind(v.employeeId, v.date, v.due, v.status, JSON.stringify(v.data), existing, id, v.type).run();
      if (!done.meta.changes) throw new HttpError(404, "Qeyd tapılmadı.");
      await companyAudit(db, id, userId, "ohs-updated", v.employeeId, `${v.type} ${v.date}`);
      return ok({ ok: true, id: existing });
    }
    const recordId = crypto.randomUUID();
    await db.prepare("INSERT INTO ohs_records(id,company_id,type,employee_id,record_date,due_date,status,data,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(recordId, id, v.type, v.employeeId, v.date, v.due, v.status, JSON.stringify(v.data), userId, now).run();
    await companyAudit(db, id, userId, "ohs-created", v.employeeId, `${v.type} ${v.date}`);
    return ok({ ok: true, id: recordId, warning: v.data.mustReport && v.data.reported !== true ? "Ağır və ya ölümlə nəticələnən hadisə: dövlət əmək müfəttişliyinə və sığortaçıya bildirmək lazımdır, “bildirilib” qeydini hadisə bildirildikdən sonra işarələyin." : "" }, 201);
  }
  if (request.method === "POST" && path === "company/ohs/import") {
    requirePermission("salaries", "Əməyin mühafizəsi qeydlərini yalnız kadr işçisi, direktor və hesab sahibi yükləyə bilər.");
    const b = await jsonBody(request);
    const parsed = parseOhsRows((Array.isArray(b.rows) ? b.rows : []).slice(0, 1001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda qeyd tapılmadı.");
    const refs = await employeeRefs();
    const issues = [...parsed.issues];
    const warnings: string[] = [];
    const statements: D1PreparedStatement[] = [];
    const now = new Date().toISOString();
    let created = 0;
    for (const row of parsed.rows) {
      let employeeId = "";
      if (row.raw.type !== "incident" || row.name || row.fin) {
        const found = matchEmployee(refs, { name: row.name, email: row.email, fin: row.fin });
        if ("error" in found) {
          issues.push({ line: row.line, reason: found.error });
          continue;
        }
        employeeId = found.id;
      }
      const checked = cleanOhs({ ...row.raw, employeeId });
      if (!checked.ok) {
        issues.push({ line: row.line, reason: `${row.name || "Hadisə"}: ${checked.error}` });
        continue;
      }
      const v = checked.value;
      statements.push(db.prepare("INSERT INTO ohs_records(id,company_id,type,employee_id,record_date,due_date,status,data,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, v.type, v.employeeId, v.date, v.due, v.status, JSON.stringify(v.data), userId, now));
      if (v.data.mustReport && v.data.reported !== true) warnings.push(`${v.date} hadisəsi (${String(v.data.description).slice(0, 40)}): ağır hadisədir, müfəttişliyə və sığortaçıya bildirmək lazımdır.`);
      created++;
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "ohs-imported", "", `${created} qeyd Excel faylından yükləndi`);
    return ok({ created, issues, warnings: warnings.slice(0, 50) });
  }
  if (request.method === "POST" && path === "company/ohs/delete") {
    requirePermission("salaries", "Əməyin mühafizəsi qeydlərini yalnız kadr işçisi, direktor və hesab sahibi silə bilər.");
    const b = await jsonBody(request);
    const done = await db.prepare("DELETE FROM ohs_records WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    if (!done.meta.changes) throw new HttpError(404, "Qeyd tapılmadı.");
    await companyAudit(db, id, userId, "ohs-deleted", "", str(b.id, 100));
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/policies") {
    requirePermission("salaries", "Daxili qaydaları yalnız sənəd icazəsi olan şəxs görə bilər.");
    const docs = (await db.prepare("SELECT d.id,d.kind,d.title,d.position,d.requires_ack,d.current_version,d.retired,v.effective_date,v.created FROM policy_docs d LEFT JOIN policy_versions v ON v.doc_id=d.id AND v.version=d.current_version WHERE d.company_id=? ORDER BY d.retired,d.title").bind(id).all<{ id: string; kind: string; title: string; position: string; requires_ack: number; current_version: number; retired: number; effective_date: string; created: string }>()).results;
    const holders = (await db.prepare("SELECT position,COUNT(*) AS n FROM company_employees WHERE company_id=? AND status IN ('active','leave') GROUP BY lower(position)").bind(id).all<{ position: string; n: number }>()).results;
    const staff = (await db.prepare("SELECT COUNT(*) AS n FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).first<{ n: number }>())?.n || 0;
    const acks = (await db.prepare("SELECT doc_id,version,COUNT(*) AS n,SUM(CASE WHEN withdrawn_at<>'' THEN 1 ELSE 0 END) AS withdrawn FROM policy_acks WHERE company_id=? GROUP BY doc_id,version").bind(id).all<{ doc_id: string; version: number; n: number; withdrawn: number }>()).results;
    return ok({
      staff,
      docs: docs.map((d) => {
        const a = acks.find((x) => x.doc_id === d.id && x.version === d.current_version);
        return { id: d.id, kind: d.kind, title: d.title, position: d.position, audience: d.kind === "jobdesc" ? holders.filter((h) => h.position.toLocaleLowerCase("az") === d.position.toLocaleLowerCase("az")).reduce((t, h) => t + h.n, 0) : staff, requiresAck: !!d.requires_ack, version: d.current_version, retired: !!d.retired, effectiveDate: d.effective_date || "", acked: (a?.n || 0) - (a?.withdrawn || 0), withdrawn: a?.withdrawn || 0 };
      }),
    });
  }
  if (request.method === "GET" && path === "company/policies/detail") {
    requirePermission("salaries", "Daxili qaydaları yalnız sənəd icazəsi olan şəxs görə bilər.");
    const docId = str(requestUrl.searchParams.get("id"), 100);
    const doc = await db.prepare("SELECT id,kind,title,position,requires_ack,current_version,retired FROM policy_docs WHERE id=? AND company_id=?").bind(docId, id).first<{ id: string; kind: string; title: string; position: string; requires_ack: number; current_version: number; retired: number }>();
    if (!doc) throw new HttpError(404, "Sənəd tapılmadı.");
    const versions = (await db.prepare("SELECT version,effective_date,body,change_note,created FROM policy_versions WHERE doc_id=? ORDER BY version DESC").bind(docId).all<{ version: number; effective_date: string; body: string; change_note: string; created: string }>()).results;
    const acks = (await db.prepare("SELECT a.employee_id,a.acked_at,a.withdrawn_at,e.name FROM policy_acks a JOIN company_employees e ON e.id=a.employee_id WHERE a.doc_id=? AND a.version=? ORDER BY e.name").bind(docId, doc.current_version).all<{ employee_id: string; acked_at: string; withdrawn_at: string; name: string }>()).results;
    const seen = new Set(acks.map((a) => a.employee_id));
    const pending = (await db.prepare("SELECT id,name,department,position FROM company_employees WHERE company_id=? AND status IN ('active','leave') ORDER BY name LIMIT 2000").bind(id).all<{ id: string; name: string; department: string; position: string }>()).results.filter((e) => !seen.has(e.id) && (doc.kind !== "jobdesc" || e.position.toLocaleLowerCase("az") === doc.position.toLocaleLowerCase("az")));
    return ok({ doc: { id: doc.id, kind: doc.kind, title: doc.title, position: doc.position, requiresAck: !!doc.requires_ack, version: doc.current_version, retired: !!doc.retired }, versions: versions.map((v) => ({ version: v.version, effectiveDate: v.effective_date, body: v.body, changeNote: v.change_note, created: v.created })), acked: acks.map((a) => ({ employeeId: a.employee_id, name: a.name, at: a.acked_at, withdrawnAt: a.withdrawn_at })), pending: pending.map((e) => ({ employeeId: e.id, name: e.name, department: e.department })) });
  }
  if (request.method === "POST" && path === "company/policies/save") {
    requirePermission("salaries", "Daxili qaydaları yalnız sənəd icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const kind = ["rules", "policy", "consent", "jobdesc", "other"].includes(str(b.kind, 20)) ? str(b.kind, 20) : "rules";
    const title = str(b.title, 160);
    const position = kind === "jobdesc" ? (await resolvePosition(db, id, str(b.position, 120))).name : "";
    if (kind === "jobdesc" && !position) throw new HttpError(400, "Vəzifə təlimatı üçün vəzifəni seçin.");
    const body = String(b.body ?? "").trim().slice(0, 30000);
    if (title.length < 3) throw new HttpError(400, "Sənədin adını yazın.");
    if (body.length < 20) throw new HttpError(400, "Sənədin mətnini yazın (ən azı bir neçə cümlə).");
    const effective = /^\d{4}-\d{2}-\d{2}$/.test(str(b.effectiveDate, 10)) ? str(b.effectiveDate, 10) : new Date().toISOString().slice(0, 10);
    const requiresAck = b.requiresAck === false ? 0 : 1;
    const now = new Date().toISOString();
    const docId = str(b.id, 100);
    if (!docId) {
      const newId = crypto.randomUUID();
      await db.batch([
        db.prepare("INSERT INTO policy_docs(id,company_id,kind,title,position,requires_ack,current_version,retired,created) VALUES(?,?,?,?,?,?,1,0,?)").bind(newId, id, kind, title, position, requiresAck, now),
        db.prepare("INSERT INTO policy_versions(id,doc_id,version,effective_date,body,change_note,created_by,created) VALUES(?,?,1,?,?,?,?,?)").bind(crypto.randomUUID(), newId, effective, body, str(b.changeNote, 300) || "İlk versiya", userId, now),
      ]);
      await companyAudit(db, id, userId, "policy-created", newId, title);
      return ok({ ok: true, id: newId, version: 1 }, 201);
    }
    const doc = await db.prepare("SELECT id,current_version FROM policy_docs WHERE id=? AND company_id=?").bind(docId, id).first<{ id: string; current_version: number }>();
    if (!doc) throw new HttpError(404, "Sənəd tapılmadı.");
    const current = await db.prepare("SELECT body FROM policy_versions WHERE doc_id=? AND version=?").bind(docId, doc.current_version).first<{ body: string }>();
    const changed = (current?.body || "") !== body;
    const version = changed ? doc.current_version + 1 : doc.current_version;
    const statements = [db.prepare("UPDATE policy_docs SET kind=?,title=?,position=?,requires_ack=?,current_version=? WHERE id=? AND company_id=?").bind(kind, title, position, requiresAck, version, docId, id)];
    if (changed) statements.push(db.prepare("INSERT INTO policy_versions(id,doc_id,version,effective_date,body,change_note,created_by,created) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), docId, version, effective, body, str(b.changeNote, 300), userId, now));
    await db.batch(statements);
    await companyAudit(db, id, userId, changed ? "policy-version" : "policy-updated", docId, `${title}: v${version}`);
    return ok({ ok: true, id: docId, version, newVersion: changed });
  }
  if (request.method === "POST" && path === "company/policies/retire") {
    requirePermission("salaries", "Daxili qaydaları yalnız sənəd icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const done = await db.prepare("UPDATE policy_docs SET retired=? WHERE id=? AND company_id=?").bind(b.retired === false ? 0 : 1, str(b.id, 100), id).run();
    if (!done.meta.changes) throw new HttpError(404, "Sənəd tapılmadı.");
    await companyAudit(db, id, userId, "policy-retired", str(b.id, 100), b.retired === false ? "bərpa" : "ləğv");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/retention") {
    requirePermission("salaries", "Saxlama müddətlərini yalnız sənəd icazəsi olan şəxs görə bilər.");
    const custom: Record<string, number> = {};
    for (const r of (await db.prepare("SELECT category,years FROM retention_rules WHERE company_id=?").bind(id).all<{ category: string; years: number }>()).results) custom[r.category] = r.years;
    const today = new Date().toISOString().slice(0, 10);
    const years = retentionYears(custom, "personal");
    const leavers = (await db.prepare("SELECT id,name,end_date FROM company_employees WHERE company_id=? AND status='left' AND end_date<>'' ORDER BY end_date LIMIT 5000").bind(id).all<{ id: string; name: string; end_date: string }>()).results.map((l) => ({ ...l, until: retentionEnd(l.end_date, years) })).filter((l) => l.until);
    return ok({
      categories: RETENTION_CATEGORIES.map((c) => ({ ...c, years: retentionYears(custom, c.id), custom: c.id in custom, defaultYears: c.years })),
      leavers: leavers.length,
      due: leavers.filter((l) => l.until <= today).slice(0, 200).map((l) => ({ employeeId: l.id, name: l.name, endDate: l.end_date, until: l.until })),
      soon: leavers.filter((l) => l.until > today && l.until <= new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10)).length,
    });
  }
  if (request.method === "POST" && path === "company/retention/save") {
    requirePermission("salaries", "Saxlama müddətlərini yalnız sənəd icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const category = str(b.category, 30);
    if (!RETENTION_CATEGORIES.some((c) => c.id === category)) throw new HttpError(400, "Sənəd qrupu düzgün deyil.");
    if (b.years === null || b.years === "") {
      await db.prepare("DELETE FROM retention_rules WHERE company_id=? AND category=?").bind(id, category).run();
    } else {
      const years = Math.round(Number(b.years));
      if (!Number.isFinite(years) || years < 1 || years > 100) throw new HttpError(400, "Müddət 1–100 il arasında olmalıdır.");
      await db.prepare("INSERT INTO retention_rules(company_id,category,years) VALUES(?,?,?) ON CONFLICT(company_id,category) DO UPDATE SET years=excluded.years").bind(id, category, years).run();
    }
    await companyAudit(db, id, userId, "retention-changed", category, String(b.years ?? "ilkin"));
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "employee/policies") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const docs = (await db.prepare("SELECT d.id,d.kind,d.title,d.position,d.requires_ack,d.current_version,v.effective_date,v.body FROM policy_docs d JOIN policy_versions v ON v.doc_id=d.id AND v.version=d.current_version WHERE d.company_id=? AND d.retired=0 ORDER BY d.title").bind(employee.company_id).all<{ id: string; kind: string; title: string; position: string; requires_ack: number; current_version: number; effective_date: string; body: string }>()).results.filter((d) => d.kind !== "jobdesc" || d.position.toLocaleLowerCase("az") === employee.position.toLocaleLowerCase("az"));
    const acks = (await db.prepare("SELECT doc_id,version,acked_at,withdrawn_at FROM policy_acks WHERE company_id=? AND employee_id=?").bind(employee.company_id, employee.id).all<{ doc_id: string; version: number; acked_at: string; withdrawn_at: string }>()).results;
    return ok({
      items: docs.map((d) => {
        const mine = acks.find((a) => a.doc_id === d.id && a.version === d.current_version);
        const earlier = acks.filter((a) => a.doc_id === d.id && a.version < d.current_version).sort((a, b) => b.version - a.version)[0];
        return { id: d.id, kind: d.kind, title: d.title, requiresAck: !!d.requires_ack, version: d.current_version, effectiveDate: d.effective_date, body: d.body, ackedAt: mine?.acked_at || "", withdrawnAt: mine?.withdrawn_at || "", earlierVersion: earlier?.version || 0 };
      }),
    });
  }
  if (request.method === "POST" && path === "employee/policies/ack") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const doc = await db.prepare("SELECT d.id,d.title,d.current_version,v.body FROM policy_docs d JOIN policy_versions v ON v.doc_id=d.id AND v.version=d.current_version WHERE d.id=? AND d.company_id=? AND d.retired=0").bind(str(b.docId, 100), employee.company_id).first<{ id: string; title: string; current_version: number; body: string }>();
    if (!doc) throw new HttpError(404, "Sənəd tapılmadı.");
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO policy_acks(doc_id,version,employee_id,company_id,acked_at,hash,withdrawn_at) VALUES(?,?,?,?,?,?,'') ON CONFLICT(doc_id,version,employee_id) DO UPDATE SET acked_at=excluded.acked_at,hash=excluded.hash,withdrawn_at=''").bind(doc.id, doc.current_version, employee.id, employee.company_id, now, await textHash(doc.body)).run();
    await companyAudit(db, employee.company_id, userId, "policy-acked", doc.id, `${employee.name}: ${doc.title} v${doc.current_version}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/policies/withdraw") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const doc = await db.prepare("SELECT id,kind,title,current_version FROM policy_docs WHERE id=? AND company_id=?").bind(str(b.docId, 100), employee.company_id).first<{ id: string; kind: string; title: string; current_version: number }>();
    if (!doc) throw new HttpError(404, "Sənəd tapılmadı.");
    if (doc.kind !== "consent") throw new HttpError(409, "Yalnız rəzayət geri götürülə bilər; daxili qaydalar işçi üçün məcburidir.");
    const done = await db.prepare("UPDATE policy_acks SET withdrawn_at=? WHERE doc_id=? AND version=? AND employee_id=? AND withdrawn_at=''").bind(new Date().toISOString(), doc.id, doc.current_version, employee.id).run();
    if (!done.meta.changes) throw new HttpError(404, "Verilmiş rəzayət tapılmadı.");
    await companyAudit(db, employee.company_id, userId, "consent-withdrawn", doc.id, `${employee.name}: ${doc.title}`);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "employee/ohs") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const rows = (await db.prepare("SELECT id,type,record_date,due_date,data FROM ohs_records WHERE company_id=? AND employee_id=? AND type IN ('briefing','medical') ORDER BY record_date DESC LIMIT 100").bind(employee.company_id, employee.id).all<{ id: string; type: string; record_date: string; due_date: string; data: string }>()).results;
    const today = new Date().toISOString().slice(0, 10);
    return ok({ items: rows.map((r) => { let data: Record<string, unknown> = {}; try { data = JSON.parse(r.data || "{}"); } catch { /* shown without details */ } return { id: r.id, type: r.type, date: r.record_date, due: r.due_date, state: dueState(r.due_date, today), kind: String(data.kind || ""), result: String(data.result || ""), topic: String(data.topic || "") }; }), labels: { briefing: BRIEFING_KINDS, medical: MEDICAL_KINDS, result: MEDICAL_RESULTS } });
  }
  return undefined;
}
