// employees: timeline, duplicates, bulk change, one-person export, custom fields, succession, salary benchmark, survey profile.
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { can } from "@/lib/company";
import { ok, loadPlanData } from "@/lib/api/shared";
import { placeProblem, checkSalary, type PlanUnit } from "@/lib/staff-plan";
import { duplicateGroups, median, percentile, READINESS } from "@/lib/employee-insight";
import { enps } from "@/lib/survey";
import { createXlsxBook } from "@/lib/xlsx";
import type { RouteCtx } from "@/lib/api/ctx";

type Row = Record<string, unknown>;
const empty = { results: [] as never[] };
const MIN_GROUP = 5; // a group smaller than this is never shown on its own (privacy)

export async function handle_employees_01(c: Pick<RouteCtx, "accountRole" | "afterSigned" | "auditView" | "db" | "id" | "memberGrants" | "memberRole" | "path" | "request" | "requestUrl" | "requesterName" | "requirePermission" | "revealAll" | "userId">): Promise<Response | undefined> {
  const { accountRole, afterSigned, auditView, db, id, memberGrants, memberRole, path, request, requestUrl, requesterName, requirePermission, revealAll, userId } = c;
  if (!path.startsWith("company/employees/") && !path.startsWith("company/succession") && !path.startsWith("company/custom-fields")) return undefined;
  if (accountRole !== "company") throw new HttpError(403, "Bu bölmə yalnız şirkət hesabı üçündür.");
  const isGet = request.method === "GET";
  const today = new Date().toISOString().slice(0, 10);
  // requirePermission("salaries") is remapped to the section of the path (employees here); pay data needs the real salary permission.
  const needSalaries = (message: string) => { if (!can(memberRole, "salaries", memberGrants)) throw new HttpError(403, message); };
  const loadPerson = async (employeeId: string) => {
    const p = await db.prepare("SELECT id,name,position,department,section,email,start_date,end_date,status,salary_cents,salary_type,work_mode,exit_type,exit_reason,contract_end,probation_end FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(employeeId, id).first<Row>();
    if (!p) throw new HttpError(404, "İşçi tapılmadı.");
    return p;
  };

  // ---- 1. timeline: everything that happened to one person, newest first ----
  if (isGet && path === "company/employees/timeline") {
    requirePermission("employees", "Xronologiyanı yalnız işçi məlumatlarına icazəsi olan şəxs görür.");
    const p = await loadPerson(str(requestUrl.searchParams.get("employeeId"), 100));
    const q = (sql: string) => db.prepare(sql).bind(id, p.id).all<Row>().catch(() => empty);
    const [events, orders, leaves, trainings, reviews, changes, docs] = await Promise.all([
      q("SELECT type,from_value,to_value,note,event_date FROM employee_events WHERE company_id=? AND employee_id=? ORDER BY event_date DESC LIMIT 200"),
      q("SELECT kind,number,order_date,status FROM employee_orders WHERE company_id=? AND employee_id=? ORDER BY order_date DESC LIMIT 100"),
      q("SELECT start_date,end_date,days FROM leave_schedule WHERE company_id=? AND employee_id=? AND status='approved' ORDER BY start_date DESC LIMIT 60"),
      q("SELECT t.title,t.start_date,t.status FROM training_participants tp JOIN trainings t ON t.id=tp.training_id WHERE t.company_id=? AND tp.employee_id=? ORDER BY t.start_date DESC LIMIT 60"),
      q("SELECT r.manager_score,r.status,r.updated,c.title FROM perf_reviews r LEFT JOIN perf_cycles c ON c.id=r.cycle_id WHERE r.company_id=? AND r.employee_id=? ORDER BY r.updated DESC LIMIT 30"),
      q("SELECT field,status,created FROM profile_changes WHERE company_id=? AND employee_id=? ORDER BY created DESC LIMIT 60"),
      q("SELECT name,category,created FROM employee_documents WHERE company_id=? AND employee_id=? ORDER BY created DESC LIMIT 60"),
    ]);
    const items: { date: string; kind: string; title: string; detail: string }[] = [];
    if (p.start_date) items.push({ date: String(p.start_date), kind: "hire", title: "İşə qəbul", detail: [p.position, p.department].filter(Boolean).join(" · ") });
    if (p.end_date) items.push({ date: String(p.end_date), kind: "exit", title: "İşdən çıxış", detail: [p.exit_type, p.exit_reason].filter(Boolean).join(" · ") });
    for (const e of events.results) items.push({ date: String(e.event_date), kind: "event", title: String(e.type), detail: [e.from_value && `${e.from_value} → ${e.to_value}`, e.note].filter(Boolean).join(" · ") });
    for (const o of orders.results) items.push({ date: String(o.order_date), kind: "order", title: `Əmr № ${o.number || "—"} (${o.kind})`, detail: String(o.status) });
    for (const l of leaves.results) items.push({ date: String(l.start_date), kind: "leave", title: "Məzuniyyət", detail: `${l.start_date} – ${l.end_date}, ${l.days} gün` });
    for (const t of trainings.results) items.push({ date: String(t.start_date), kind: "training", title: `Təlim: ${t.title}`, detail: String(t.status) });
    for (const r of reviews.results) items.push({ date: String(r.updated).slice(0, 10), kind: "perf", title: `Performans: ${r.title || "dövr"}`, detail: r.manager_score != null ? `Qiymət ${r.manager_score}` : String(r.status) });
    for (const ch of changes.results) items.push({ date: String(ch.created).slice(0, 10), kind: "change", title: `Məlumat dəyişikliyi sorğusu (${ch.field})`, detail: String(ch.status) });
    for (const d of docs.results) items.push({ date: String(d.created).slice(0, 10), kind: "doc", title: `Sənəd: ${d.name}`, detail: String(d.category) });
    items.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return ok({ employee: { id: p.id, name: p.name }, items: items.slice(0, 400) });
  }

  // ---- 4. duplicates (FİN only when the viewer may see personal data) ----
  if (isGet && path === "company/employees/duplicates") {
    requirePermission("employees", "Dublikatları yalnız işçi məlumatlarına icazəsi olan şəxs görür.");
    const rows = (await db.prepare("SELECT id,name,email,start_date,department,profile FROM company_employees WHERE company_id=? AND status<>'removed' LIMIT 5000").bind(id).all<{ id: string; name: string; email: string; start_date: string; department: string; profile: string }>()).results;
    let fins = new Map<string, string>();
    try {
      if (!can(memberRole, "personal-data", memberGrants)) throw new Error("no personal data");
      const revealed = await revealAll(rows.map((r) => ({ id: r.id, profile: r.profile })));
      fins = new Map([...revealed].map(([k, v]) => [k, String(v?.fin || "")]));
      await auditView("duplicates", "", "FİN üzrə dublikat yoxlaması");
    } catch { /* no personal data permission or no key: duplicates by e-mail and name only */ }
    const groups = duplicateGroups(rows.map((r) => ({ id: r.id, name: r.name, email: r.email || "", startDate: r.start_date || "", fin: fins.get(r.id) || "", department: r.department })));
    return ok({ groups: groups.slice(0, 100).map((g) => ({ reason: g.reason, people: g.people.map((p) => ({ id: p.id, name: p.name, email: p.email, startDate: p.startDate, department: p.department })) })), checkedFin: fins.size > 0 });
  }

  // ---- 2. bulk change: department / section through orders that stand at once, work mode on the card ----
  if (request.method === "POST" && path === "company/employees/bulk-update") {
    needSalaries("Kütləvi dəyişikliyi yalnız əmr hazırlamağa icazəsi olan şəxs edə bilər.");
    const b = await jsonBody(request);
    const ids = (Array.isArray(b.ids) ? b.ids : []).map((x: unknown) => str(x, 100)).filter(Boolean).slice(0, 100);
    if (!ids.length) throw new HttpError(400, "İşçi seçilməyib.");
    const department = str(b.department, 120).trim();
    const section = str(b.section, 120).trim();
    const workMode = str(b.workMode, 60).trim();
    if (!department && !section && !workMode) throw new HttpError(400, "Dəyişiklik seçilməyib: departament, şöbə və ya iş rejimi yazın.");
    const date = /^\d{4}-\d{2}-\d{2}$/.test(str(b.date, 10)) ? str(b.date, 10) : today;
    const dry = b.dryRun === true;
    const plan = await loadPlanData(db, id);
    const units: PlanUnit[] = plan.units.map((u) => ({ id: u.id, branch: u.branch, department: u.department, section: u.section, position: u.position, planned: u.planned, rate: u.rate, salaryMin: u.salaryMin, salaryMax: u.salaryMax, level: u.level, startMonth: u.startMonth, endMonth: u.endMonth }));
    const actor = await requesterName();
    const result: { id: string; name: string; status: "done" | "skipped"; reason: string }[] = [];
    let people = plan.people.slice();
    for (const employeeId of ids) {
      const p = await db.prepare("SELECT id,name,position,department,section,work_mode,status FROM company_employees WHERE id=? AND company_id=? AND status IN ('active','leave')").bind(employeeId, id).first<{ id: string; name: string; position: string; department: string; section: string; work_mode: string; status: string }>();
      if (!p) { result.push({ id: employeeId, name: "", status: "skipped", reason: "İşçi tapılmadı və ya artıq işləmir." }); continue; }
      const moveDept = department && department !== p.department;
      const moveSection = section && section !== p.section;
      if (!moveDept && !moveSection && !(workMode && workMode !== p.work_mode)) { result.push({ id: p.id, name: p.name, status: "skipped", reason: "Dəyişiklik yoxdur." }); continue; }
      if (moveDept || moveSection) {
        const candidate = { id: p.id, name: p.name, department: department || p.department, section: moveSection ? section : moveDept ? "" : p.section, position: p.position, status: p.status };
        const rest = people.filter((x) => x.id !== p.id);
        const problem = placeProblem(units, rest, candidate);
        if (problem) { result.push({ id: p.id, name: p.name, status: "skipped", reason: problem }); continue; }
        const me = people.find((x) => x.id === p.id);
        const salaryProblem = me?.gross ? checkSalary(units, candidate, me.gross) : "";
        if (salaryProblem) { result.push({ id: p.id, name: p.name, status: "skipped", reason: salaryProblem }); continue; }
        if (!dry) {
          const input = { newDepartment: department, newSection: moveSection ? section : "", from: date, basis: str(b.basis, 300) || "Kütləvi dəyişiklik" };
          const orderId = crypto.randomUUID();
          const now = new Date().toISOString();
          const number = `KD-${date.replace(/-/g, "")}-${result.length + 1}`;
          await db.prepare("INSERT INTO employee_orders(id,company_id,employee_id,kind,number,order_date,input,signers,status,holder,history,created_by,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(orderId, id, p.id, "transfer", number, date, JSON.stringify(input), "[]", "signed", "", JSON.stringify([{ at: now, by: actor, action: "Kütləvi dəyişiklik" }]), userId, now, now).run();
          await afterSigned({ id: orderId, employeeId: p.id, kind: "transfer", number, input });
          // The old section belongs to the old department: without a new section the card is left with none.
          if (moveDept && !moveSection && p.section) await db.prepare("UPDATE company_employees SET section='',updated=? WHERE id=? AND company_id=?").bind(now, p.id, id).run();
        }
        people = people.map((x) => (x.id === p.id ? { ...x, department: candidate.department, section: candidate.section } : x));
      }
      if (workMode && workMode !== p.work_mode && !dry) {
        const now = new Date().toISOString();
        await db.prepare("UPDATE company_employees SET work_mode=?,updated=? WHERE id=? AND company_id=?").bind(workMode, now, p.id, id).run();
        await db.prepare("INSERT INTO employee_events(id,company_id,employee_id,type,from_value,to_value,note,actor_id,event_date,created) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, p.id, "schedule", p.work_mode || "", workMode, "Kütləvi dəyişiklik", userId, date, now).run();
      }
      result.push({ id: p.id, name: p.name, status: "done", reason: "" });
    }
    if (!dry) await companyAudit(db, id, userId, "employees-bulk-update", String(ids.length), `${result.filter((r) => r.status === "done").length} nəfər: ${[department && `departament ${department}`, section && `şöbə ${section}`, workMode && `rejim ${workMode}`].filter(Boolean).join(", ")}`);
    return ok({ ok: true, dryRun: dry, done: result.filter((r) => r.status === "done").length, items: result });
  }

  // ---- 5. one person's data as Excel (personal data only with that permission) ----
  if (isGet && path === "company/employees/export-one") {
    requirePermission("employees", "Yalnız işçi məlumatlarına icazəsi olan şəxs ixrac edə bilər.");
    const p = await loadPerson(str(requestUrl.searchParams.get("employeeId"), 100));
    const full = await db.prepare("SELECT profile FROM company_employees WHERE id=? AND company_id=?").bind(p.id, id).first<{ profile: string }>();
    let profile: Record<string, unknown> = {};
    const seePersonal = can(memberRole, "personal-data", memberGrants);
    const seeSalary = can(memberRole, "salaries", memberGrants);
    if (seePersonal) try { profile = ((await revealAll([{ id: String(p.id), profile: full?.profile }])).get(String(p.id)) || {}) as Record<string, unknown>; await auditView("export-one", String(p.id), String(p.name)); } catch { /* no personal data */ }
    const timeline = await (await handle_employees_01({ ...c, path: "company/employees/timeline", request: new Request("http://x/", { method: "GET" }), requestUrl: new URL(`http://x/?employeeId=${p.id}`) }))!.json() as { items: { date: string; title: string; detail: string }[] };
    const salaries = !seeSalary ? [] : (await db.prepare("SELECT effective_from,salary_cents,salary_type FROM employee_salary_history WHERE company_id=? AND employee_id=? ORDER BY effective_from").bind(id, p.id).all<Row>().catch(() => empty)).results;
    const bytes = createXlsxBook([
      { name: "Kart", headers: ["Sahə", "Dəyər"], rows: [["Ad", String(p.name)], ["Vəzifə", String(p.position)], ["Departament", String(p.department)], ["Şöbə", String(p.section)], ["E-poçt", String(p.email)], ["İşə başlama", String(p.start_date)], ["Status", String(p.status)], ["İş rejimi", String(p.work_mode || "")], ...(seeSalary ? [["Maaş (AZN)", Number(p.salary_cents) / 100], ["Maaş növü", String(p.salary_type)]] : []), ...Object.entries(profile).filter(([, v]) => typeof v === "string" && v).map(([k, v]) => [`Profil: ${k}`, String(v)])] },
      { name: "Maaş tarixçəsi", headers: ["Tarixdən", "Məbləğ (AZN)", "Növ"], rows: salaries.map((s) => [String(s.effective_from), Number(s.salary_cents) / 100, String(s.salary_type)]) },
      { name: "Xronologiya", headers: ["Tarix", "Hadisə", "Təfərrüat"], rows: timeline.items.map((t) => [t.date, t.title, t.detail]) },
    ]);
    await companyAudit(db, id, userId, "employee-export", String(p.id), String(p.name));
    return new Response(bytes as unknown as BodyInit, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="isci-${String(p.id).slice(0, 8)}.xlsx"` } });
  }

  // ---- 6. custom fields per company ----
  if (isGet && path === "company/custom-fields") {
    const fields = (await db.prepare("SELECT id,label,kind FROM employee_custom_fields WHERE company_id=? ORDER BY position,created").bind(id).all<{ id: string; label: string; kind: string }>()).results;
    const employeeId = str(requestUrl.searchParams.get("employeeId"), 100);
    if (employeeId) requirePermission("employees", "Əlavə sahələrin dəyərini yalnız işçi məlumatlarına icazəsi olan şəxs görür.");
    const values = employeeId ? (await db.prepare("SELECT field_id,value FROM employee_custom_values WHERE company_id=? AND employee_id=?").bind(id, employeeId).all<{ field_id: string; value: string }>()).results : [];
    return ok({ fields, values: Object.fromEntries(values.map((v) => [v.field_id, v.value])) });
  }
  if (request.method === "POST" && path === "company/custom-fields") {
    requirePermission("staff", "Əlavə sahələri yalnız hesab sahibi və direktor dəyişə bilər.");
    const b = await jsonBody(request);
    const label = str(b.label, 60).trim();
    const kind = ["text", "number", "date"].includes(str(b.kind, 10)) ? str(b.kind, 10) : "text";
    if (label.length < 2) throw new HttpError(400, "Sahənin adını yazın.");
    const n = await db.prepare("SELECT COUNT(*) AS n FROM employee_custom_fields WHERE company_id=?").bind(id).first<{ n: number }>();
    if (Number(n?.n) >= 20) throw new HttpError(409, "Ən çoxu 20 əlavə sahə yaratmaq olar.");
    await db.prepare("INSERT INTO employee_custom_fields(id,company_id,label,kind,position,created) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), id, label, kind, Number(n?.n) || 0, new Date().toISOString()).run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/custom-fields/delete") {
    requirePermission("staff", "Əlavə sahələri yalnız hesab sahibi və direktor dəyişə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM employee_custom_values WHERE company_id=? AND field_id=?").bind(id, str(b.id, 100)).run();
    await db.prepare("DELETE FROM employee_custom_fields WHERE company_id=? AND id=?").bind(id, str(b.id, 100)).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/custom-fields/value") {
    requirePermission("employees", "Əlavə sahələri yalnız işçi məlumatlarına icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const p = await loadPerson(str(b.employeeId, 100));
    const field = await db.prepare("SELECT id,kind FROM employee_custom_fields WHERE id=? AND company_id=?").bind(str(b.fieldId, 100), id).first<{ id: string; kind: string }>();
    if (!field) throw new HttpError(404, "Sahə tapılmadı.");
    const value = str(b.value, 300).trim();
    if (value && field.kind === "number" && !Number.isFinite(Number(value.replace(",", ".")))) throw new HttpError(400, "Bu sahə rəqəm tələb edir.");
    if (value && field.kind === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(400, "Tarixi gün-ay-il formatında seçin.");
    await db.prepare("INSERT INTO employee_custom_values(company_id,employee_id,field_id,value,updated) VALUES(?,?,?,?,?) ON CONFLICT(employee_id,field_id) DO UPDATE SET value=excluded.value,updated=excluded.updated").bind(id, p.id, field.id, value, new Date().toISOString()).run();
    return ok({ ok: true });
  }

  // ---- 7. succession: key positions and their successors ----
  if (isGet && path === "company/succession") {
    requirePermission("employees", "Varisliyi yalnız işçi məlumatlarına icazəsi olan şəxs görür.");
    const units = (await db.prepare("SELECT id,branch,department,section,position,level,critical FROM staff_units WHERE company_id=? ORDER BY department,position").bind(id).all<{ id: string; branch: string; department: string; section: string; position: string; level: string; critical: number }>()).results;
    const people = (await db.prepare("SELECT id,name,position,department,section,status,start_date FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; name: string; position: string; department: string; section: string; status: string; start_date: string }>()).results;
    const links = (await db.prepare("SELECT id,unit_id,employee_id,readiness,note FROM succession WHERE company_id=?").bind(id).all<{ id: string; unit_id: string; employee_id: string; readiness: string; note: string }>()).results;
    const nameOf = new Map(people.map((p) => [p.id, p.name]));
    const holders = (u: { department: string; position: string }) => people.filter((p) => p.position.trim().toLocaleLowerCase("az") === u.position.trim().toLocaleLowerCase("az") && p.department.trim().toLocaleLowerCase("az") === u.department.trim().toLocaleLowerCase("az"));
    const items = units.filter((u) => u.critical).map((u) => {
      const h = holders(u);
      const succ = links.filter((l) => l.unit_id === u.id && nameOf.has(l.employee_id)).map((l) => ({ id: l.id, employeeId: l.employee_id, name: nameOf.get(l.employee_id) || "", readiness: l.readiness, readinessLabel: READINESS[l.readiness] || l.readiness, note: l.note }));
      const risk = !h.length ? "Vəzifə boşdur" : !succ.length ? "Varis yoxdur" : succ.every((s) => s.readiness !== "now") ? "Dərhal hazır varis yoxdur" : "";
      return { unitId: u.id, department: u.department, section: u.section, position: u.position, level: u.level, holders: h.map((x) => ({ id: x.id, name: x.name })), successors: succ, risk };
    });
    return ok({ items, candidates: units.filter((u) => !u.critical).map((u) => ({ unitId: u.id, label: [u.department, u.position].filter(Boolean).join(" · ") })), readiness: READINESS, risks: items.filter((i) => i.risk).length });
  }
  if (request.method === "POST" && path === "company/succession/critical") {
    requirePermission("staff", "Əsas vəzifələri yalnız hesab sahibi və direktor dəyişə bilər.");
    const b = await jsonBody(request);
    const r = await db.prepare("UPDATE staff_units SET critical=? WHERE id=? AND company_id=?").bind(b.critical === false ? 0 : 1, str(b.unitId, 100), id).run();
    if (!r.meta.changes) throw new HttpError(404, "Ştat sətri tapılmadı.");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/succession/successor") {
    requirePermission("staff", "Varisləri yalnız hesab sahibi və direktor dəyişə bilər.");
    const b = await jsonBody(request);
    const unit = await db.prepare("SELECT id FROM staff_units WHERE id=? AND company_id=? AND critical=1").bind(str(b.unitId, 100), id).first();
    if (!unit) throw new HttpError(404, "Əsas vəzifə tapılmadı.");
    const p = await loadPerson(str(b.employeeId, 100));
    const readiness = ["now", "year", "later"].includes(str(b.readiness, 10)) ? str(b.readiness, 10) : "later";
    await db.prepare("INSERT INTO succession(id,company_id,unit_id,employee_id,readiness,note,created) VALUES(?,?,?,?,?,?,?) ON CONFLICT(unit_id,employee_id) DO UPDATE SET readiness=excluded.readiness,note=excluded.note").bind(crypto.randomUUID(), id, String(unit.id), p.id, readiness, str(b.note, 200), new Date().toISOString()).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/succession/remove") {
    requirePermission("staff", "Varisləri yalnız hesab sahibi və direktor dəyişə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM succession WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    return ok({ ok: true });
  }

  // ---- 8. salary benchmark: same-position peers in the company, then the platform's published vacancies ----
  if (isGet && path === "company/employees/benchmark") {
    needSalaries("Maaş müqayisəsini yalnız maaşa icazəsi olan şəxs görür.");
    const p = await loadPerson(str(requestUrl.searchParams.get("employeeId"), 100));
    const plan = await loadPlanData(db, id);
    const same = (a: string, b: string) => a.trim().toLocaleLowerCase("az") === b.trim().toLocaleLowerCase("az");
    const me = plan.people.find((x) => x.id === p.id);
    const peers = plan.people.filter((x) => x.id !== p.id && same(x.position, String(p.position)) && (x.gross || 0) > 0).map((x) => x.gross as number);
    const gross = me?.gross || 0;
    const jobs = (await db.prepare("SELECT data FROM jobs WHERE status='published' LIMIT 3000").all<{ data: string }>().catch(() => empty)).results;
    const market: number[] = [];
    for (const j of jobs) {
      try {
        const d = JSON.parse(String((j as { data: string }).data)) as { title?: string; minSalary?: number; maxSalary?: number; salaryKind?: string };
        if (!d.title || !same(d.title, String(p.position)) || d.salaryKind === "net") continue;
        const lo = Number(d.minSalary) || 0, hi = Number(d.maxSalary) || 0;
        if (lo > 0 || hi > 0) market.push(lo && hi ? (lo + hi) / 2 : lo || hi);
      } catch { /* skip */ }
    }
    const stat = (list: number[], min: number) => (list.length >= min ? { count: list.length, median: median(list), p25: percentile(list, 0.25), p75: percentile(list, 0.75) } : { count: list.length, median: null, p25: null, p75: null });
    const peerStat = stat(peers, 3), marketStat = stat(market, 5);
    const diff = (m: number | null) => (m && gross ? Math.round(((gross - m) / m) * 1000) / 10 : null);
    return ok({ position: p.position, gross, peers: { ...peerStat, diffPercent: diff(peerStat.median), note: peerStat.median == null ? "Müqayisə üçün eyni vəzifədə ən azı 3 başqa işçi lazımdır." : "" }, market: { ...marketStat, diffPercent: diff(marketStat.median), note: marketStat.median == null ? "Bazar göstəricisi üçün platformada ən azı 5 elan lazımdır." : "Platformadakı dərc olunmuş elanların orta maaş həddi (təxmini)." } });
  }

  // ---- 9. survey profile: only what cannot point to a person ----
  if (isGet && path === "company/employees/survey-profile") {
    requirePermission("employees", "Sorğu nəticələrini yalnız işçi məlumatlarına icazəsi olan şəxs görür.");
    const p = await loadPerson(str(requestUrl.searchParams.get("employeeId"), 100));
    const surveys = (await db.prepare("SELECT id,title,anonymous FROM surveys WHERE company_id=? AND kind='enps' ORDER BY created DESC LIMIT 12").bind(id).all<{ id: string; title: string; anonymous: number }>().catch(() => empty)).results;
    const items = [];
    for (const s of surveys) {
      const r = (await db.prepare("SELECT employee_id,department,answers FROM survey_responses WHERE survey_id=? AND company_id=?").bind(s.id, id).all<{ employee_id: string; department: string; answers: string }>()).results;
      const active = (await db.prepare("SELECT COUNT(*) AS n FROM company_employees WHERE company_id=? AND department=? AND status IN ('active','leave')").bind(id, p.department).first<{ n: number }>())?.n || 0;
      const scoreOf = (x: { answers: string }) => { try { const a = JSON.parse(x.answers) as Record<string, unknown>; const v = Object.values(a).find((y) => typeof y === "number"); return typeof v === "number" ? v : NaN; } catch { return NaN; } };
      const dept = r.filter((x) => x.department === p.department);
      const deptEnps = dept.length >= MIN_GROUP ? enps(dept.map(scoreOf)) : null;
      // Participation of this very person is shown only for surveys that are not anonymous.
      const took = s.anonymous ? null : r.some((x) => x.employee_id === p.id);
      items.push({ id: s.id, title: s.title, anonymous: Boolean(s.anonymous), took, department: { responses: dept.length, headcount: Number(active), enps: deptEnps ? deptEnps.score : null, hidden: dept.length < MIN_GROUP } });
    }
    return ok({ department: p.department, items, note: `Fərdi cavablar göstərilmir. Departament nəticəsi ən azı ${MIN_GROUP} cavab olanda görünür.` });
  }
  return undefined;
}
