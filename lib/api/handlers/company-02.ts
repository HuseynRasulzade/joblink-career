// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { EXIT_REASONS, EXIT_TYPES } from "@/lib/workforce";
import { HttpError, jsonBody, str } from "@/lib/server";
import { assignPeople, checkSalary, placeProblem, salaryBand, type PlanPerson } from "@/lib/staff-plan";
import { can } from "@/lib/company";
import { canonicalOrg } from "@/lib/staff-db";
import { companyAudit } from "@/lib/api-core";
import { employeePay, tenure, vacationBalance } from "@/lib/payroll";
import { linkExpired } from "@/lib/employee-link";
import { normalizeProfile, parseProfile } from "@/lib/employee-profile";
import { parseEmployeeRows } from "@/lib/staff-import";
import { finOf as plainFinOf } from "@/lib/sheet-imports";
import { sealProfile } from "@/lib/secure-profile";
import { seedOnboardingTasks, taskSummary } from "@/lib/onboarding";
import { taxReduction } from "@/lib/employee-rights";
import { absorbLegacyHeadcount, loadPlanData, ok, resolvePosition, setDepartmentPlan } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_02(c: Pick<RouteCtx, "auditView" | "dataKey" | "db" | "id" | "memberGrants" | "memberRole" | "path" | "planLocked" | "queueApproval" | "request" | "requestUrl" | "requesterName" | "requirePermission" | "reveal" | "revealAll" | "salaryChange" | "userId">): Promise<Response | undefined> {
  const { auditView, dataKey, db, id, memberGrants, memberRole, path, planLocked, queueApproval, request, requestUrl, requesterName, requirePermission, reveal, revealAll, salaryChange, userId } = c;
  if (request.method === "GET" && path === "company/verification-doc") {
    requirePermission("company-profile");
    const row = await db
      .prepare(
        "SELECT doc_type,doc_data FROM company_profiles WHERE company_id=?",
      )
      .bind(id)
      .first<{ doc_type: string; doc_data: string }>();
    if (!row?.doc_data) throw new HttpError(404, "Sənəd yoxdur.");
    return new Response(
      Uint8Array.from(atob(row.doc_data), (c) => c.charCodeAt(0)),
      {
        headers: {
          "Content-Type": row.doc_type,
          "Content-Disposition": "inline",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  if (request.method === "GET" && path === "company/employees") {
    const showSalary = can(memberRole, "salaries");
    if (showSalary) await auditView("view-salaries");
    if (can(memberRole, "personal-data", memberGrants)) await auditView("view-personal-data");
    const rows = await db
      .prepare(
        "SELECT * FROM company_employees WHERE company_id=? AND status<>'removed' ORDER BY name",
      )
      .bind(id)
      .all<{
        id: string;
        name: string;
        position: string;
        department: string;
        email: string;
        phone: string;
        start_date: string;
        salary_cents: number;
        status: string;
        source: string;
        end_date?: string;
        exit_type?: string;
        exit_reason?: string;
        exit_note?: string;
        probation_end?: string;
        contract_end?: string;
        work_mode?: string;
        section?: string;
        salary_type?: string;
        sector?: string;
        vacation_days?: number;
        vacation_used?: number;
      }>();
    const taskRows = await db
      .prepare("SELECT employee_id,done,due FROM employee_tasks WHERE company_id=?")
      .bind(id)
      .all<{ employee_id: string; done: number; due: string }>()
      .catch(() => ({ results: [] as { employee_id: string; done: number; due: string }[] }));
    const tasksBy = new Map<string, { done: number; due: string }[]>();
    for (const t of taskRows.results) tasksBy.set(t.employee_id, [...(tasksBy.get(t.employee_id) || []), t]);
    const todayIso = new Date().toISOString().slice(0, 10);
    // Annual leave days marked in the attendance sheet are used leave too.
    const annual = await db
      .prepare("SELECT employee_id,COUNT(*) AS n FROM attendance_marks WHERE company_id=? AND code='annual' GROUP BY employee_id")
      .bind(id)
      .all<{ employee_id: string; n: number }>()
      .catch(() => ({ results: [] as { employee_id: string; n: number }[] }));
    const annualBy = new Map(annual.results.map((row) => [row.employee_id, Number(row.n)]));
    // The pay band of the staff row each employee sits in, to show it beside the salary.
    const bandBy = new Map<string, [number, number]>();
    // The section of the staff row an employee sits in shows when the employee has none of their own.
    const sectionBy = new Map<string, string>();
    // The row of the staff table each working employee fills (branch and level), so the list can show it and mark who has none.
    const placeBy = new Map<string, { branch: string; level: string; position: string }>();
    {
      const planData = await loadPlanData(db, id);
      const placed = assignPeople(planData.units, planData.people);
      for (const [unitId, list] of placed.byUnit) {
        const unit = planData.units.find((u) => u.id === unitId)!;
        const band = showSalary ? salaryBand(unit) : null;
        for (const p of list) {
          if (band) bandBy.set(p.id, band);
          if (unit.section) sectionBy.set(p.id, unit.section);
          placeBy.set(p.id, { branch: unit.branch || "", level: unit.level || "", position: unit.position });
        }
      }
    }
    const revealed = can(memberRole, "personal-data", memberGrants) ? await revealAll(rows.results as unknown as { id: string; profile?: string }[]) : new Map<string, ReturnType<typeof parseProfile>>();
    return ok({
      showSalary,
      canEdit: can(memberRole, "employees", memberGrants),
      canStaff: can(memberRole, "staff", memberGrants),
      canOrders: can(memberRole, "orders", memberGrants),
      canDocs: can(memberRole, "documents", memberGrants),
      canPersonal: can(memberRole, "personal-data", memberGrants),
      exitTypes: EXIT_TYPES,
      exitReasons: EXIT_REASONS,
      employees: rows.results.map((r) => ({
        id: r.id,
        name: r.name,
        position: r.position,
        department: r.department,
        email: r.email,
        phone: r.phone,
        startDate: r.start_date,
        status: r.status,
        source: r.source,
        endDate: r.end_date || "",
        probationEnd: r.probation_end || "",
        contractEnd: r.contract_end || "",
        workMode: r.work_mode || "",
        section: r.section || sectionBy.get(r.id) || "",
        place: placeBy.get(r.id) || null,
        placed: placeBy.has(r.id),
        salaryType: r.salary_type === "net" ? "net" : "gross",
        sector: r.sector === "public" ? "public" : "private",
        vacationDays: r.vacation_days ?? 21,
        vacationUsed: r.vacation_used ?? 0,
        staffBand: (() => {
          const band = bandBy.get(r.id);
          if (!band) return null;
          const gross = r.salary_cents > 0 ? employeePay(r.salary_cents / 100, r.salary_type === "net" ? "net" : "gross", r.sector === "public" ? "public" : "private", taxReduction(parseProfile((r as { profile?: string }).profile), todayIso)).gross : 0;
          return { min: band[0], max: band[1], side: gross > 0 && gross < band[0] - 0.005 ? "below" : gross > band[1] + 0.005 ? "above" : "" };
        })(),
        linked: Boolean((r as { user_id?: string }).user_id),
        linkPending: Boolean((r as { link_hash?: string }).link_hash) && !linkExpired(String((r as { link_expires?: string }).link_expires || ""), new Date()),
        profile: can(memberRole, "personal-data", memberGrants) ? revealed.get(r.id) || null : null,
        // Time worked and leave left (leave counts as earned a twelfth per month).
        tenure: tenure(r.start_date, r.status === "left" ? r.end_date || "" : "", todayIso)?.text || "",
        vacation: vacationBalance(
          { start: r.start_date, end: r.status === "left" ? r.end_date || "" : "", entitlement: r.vacation_days ?? 21, used: (r.vacation_used ?? 0) + (annualBy.get(r.id) || 0) },
          todayIso,
        ),
        // Net, gross, super-gross (the employer's total cost), income tax and insurance, from the stored pay.
        pay: showSalary && r.salary_cents > 0
          ? employeePay(r.salary_cents / 100, r.salary_type === "net" ? "net" : "gross", r.sector === "public" ? "public" : "private", taxReduction(parseProfile((r as { profile?: string }).profile), todayIso))
          : null,
        // The monthly income-tax reduction the personal data gives (Tax Code 102), shown beside the pay.
        taxReduction: showSalary ? taxReduction(parseProfile((r as { profile?: string }).profile), todayIso) : 0,
        onboarding: taskSummary(tasksBy.get(r.id) || [], todayIso),
        // Salaries and the way and reason people left stay with HR, the director and the owner.
        exitType: showSalary ? r.exit_type || "" : "",
        exitReason: showSalary ? r.exit_reason || "" : "",
        exitNote: showSalary ? r.exit_note || "" : "",
        salary: showSalary ? r.salary_cents / 100 : null,
      })),
    });
  }
  if (request.method === "GET" && path === "company/employee-tasks") {
    requirePermission("salaries", "Adaptasiya siyahısını yalnız HR, direktor və hesab sahibi görə bilər.");
    const rows = await db
      .prepare("SELECT id,title,due,done,done_at,done_by FROM employee_tasks WHERE company_id=? AND employee_id=? ORDER BY position,created")
      .bind(id, str(requestUrl.searchParams.get("employeeId"), 100))
      .all();
    return ok({ tasks: rows.results });
  }
  if (request.method === "POST" && path === "company/employee-tasks/seed") {
    requirePermission("salaries", "Adaptasiya siyahısını yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const employee = await db
      .prepare("SELECT start_date FROM company_employees WHERE id=? AND company_id=?")
      .bind(str(b.employeeId, 100), id)
      .first<{ start_date: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const added = await seedOnboardingTasks(db, id, str(b.employeeId, 100), employee.start_date);
    if (!added) throw new HttpError(409, "Bu işçinin artıq adaptasiya siyahısı var.");
    return ok({ added }, 201);
  }
  if (request.method === "POST" && path === "company/employee-tasks/add") {
    requirePermission("salaries", "Adaptasiya siyahısını yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const title = str(b.title, 200);
    if (title.length < 3) throw new HttpError(400, "Tapşırığın adını yazın.");
    const employeeId = str(b.employeeId, 100);
    const employee = await db.prepare("SELECT 1 AS yes FROM company_employees WHERE id=? AND company_id=?").bind(employeeId, id).first();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const count = await db.prepare("SELECT COUNT(*) AS n FROM employee_tasks WHERE company_id=? AND employee_id=?").bind(id, employeeId).first<{ n: number }>();
    if (Number(count?.n) >= 40) throw new HttpError(409, "Bir işçi üçün ən çox 40 tapşırıq ola bilər.");
    const due = /^\d{4}-\d{2}-\d{2}$/.test(str(b.due, 10)) ? str(b.due, 10) : "";
    await db
      .prepare("INSERT INTO employee_tasks(id,company_id,employee_id,title,due,position,created) VALUES(?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), id, employeeId, title, due, Number(count?.n) || 0, new Date().toISOString())
      .run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/employee-tasks/toggle") {
    requirePermission("salaries", "Adaptasiya siyahısını yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const done = b.done === true;
    const result = await db
      .prepare("UPDATE employee_tasks SET done=?,done_at=?,done_by=? WHERE id=? AND company_id=?")
      .bind(done ? 1 : 0, done ? new Date().toISOString() : "", done ? await requesterName() : "", str(b.id, 100), id)
      .run();
    if (!result.meta.changes) throw new HttpError(404, "Tapşırıq tapılmadı.");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/employee-tasks/delete") {
    requirePermission("salaries", "Adaptasiya siyahısını yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM employee_tasks WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/headcount") {
    requirePermission("salaries", "Ştat planını yalnız HR, direktor və hesab sahibi görə bilər.");
    await absorbLegacyHeadcount(db, id);
    const [units, actual, open] = await Promise.all([
      db
        .prepare("SELECT department,COUNT(*) AS rows,SUM(planned) AS planned FROM staff_units WHERE company_id=? GROUP BY department")
        .bind(id)
        .all<{ department: string; rows: number; planned: number }>(),
      db
        .prepare("SELECT department,COUNT(*) AS n FROM company_employees WHERE company_id=? AND status IN ('active','leave') GROUP BY department")
        .bind(id)
        .all<{ department: string; n: number }>(),
      db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE owner=? AND status='published'").bind(id).first<{ n: number }>(),
    ]);
    const names = new Set([...units.results.map((u) => u.department), ...actual.results.map((a) => a.department || "")]);
    const rows = [...names]
      .sort((a, b) => a.localeCompare(b, "az"))
      .map((department) => {
        const unit = units.results.find((u) => u.department === department);
        const planned = unit ? Number(unit.planned) : null;
        const current = Number(actual.results.find((a) => (a.department || "") === department)?.n) || 0;
        return { department, planned, current, gap: planned === null ? null : planned - current, units: Number(unit?.rows) || 0 };
      });
    return ok({ rows, openVacancies: Number(open?.n) || 0 });
  }
  if (request.method === "POST" && path === "company/headcount/save") {
    requirePermission("salaries", "Ştat planını yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const department = str(b.department, 120);
    if (!department) throw new HttpError(400, "Departamentin adını yazın.");
    const planned = b.planned === null || b.planned === "" ? null : Math.max(0, Math.min(10000, Math.round(Number(b.planned))));
    if (planned !== null && !Number.isFinite(planned)) throw new HttpError(400, "Say düzgün deyil.");
    if (await planLocked()) {
      await queueApproval("headcount", `${department}: ${planned === null ? "plan silinir" : `${planned} ştat`}`, { department, planned });
      return ok({ ok: true, pending: true });
    }
    await setDepartmentPlan(db, id, department, planned);
    await companyAudit(db, id, userId, "headcount-plan", department, String(planned ?? "silindi"));
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/employees/import") {
    requirePermission("salaries", "İşçiləri yalnız HR, direktor və hesab sahibi əlavə edə bilər.");
    const b = await jsonBody(request);
    const incoming = parseEmployeeRows(
      (Array.isArray(b.rows) ? b.rows : []).slice(0, 501).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])),
    );
    if (!incoming.rows.length)
      throw new HttpError(400, incoming.issues[0]?.reason || "Faylda işçi tapılmadı.");
    const mayPay = can(memberRole, "salaries", memberGrants);
    if (!mayPay && incoming.rows.some((row) => row.salary > 0))
      throw new HttpError(403, "Faylda əmək haqqı sütunu var, amma maaşları dəyişmək üçün “Maaşlar” icazəniz yoxdur. Maaş sütununu silib yenidən yükləyin.");
    for (const row of incoming.rows) {
      row.department = await canonicalOrg(db, id, "department", row.department);
      row.section = await canonicalOrg(db, id, "section", row.section, row.department);
      row.position = (await resolvePosition(db, id, row.position)).name;
    }
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const existing = await db
      .prepare("SELECT id,name,email,start_date,salary_cents,salary_type,position,department,profile FROM company_employees WHERE company_id=? AND status<>'removed'")
      .bind(id)
      .all<{ id: string; name: string; email: string; start_date: string; salary_cents: number; salary_type: string; position: string; department: string; profile: string }>();
    const lower = (value: string) => value.toLocaleLowerCase("az").trim();
    const opened = await revealAll(existing.results);
    const finById = new Map(existing.results.map((e) => [e.id, plainFinOf(opened.get(e.id)?.fin || "")]));
    const byFin = new Map<string, string[]>();
    for (const [empId, fin] of finById) if (fin) byFin.set(fin, [...(byFin.get(fin) || []), empId]);
    const byEmail = new Map(existing.results.filter((e) => e.email).map((e) => [lower(e.email), e.id]));
    const byName = new Map(existing.results.map((e) => [`${lower(e.name)}|${e.start_date}`, e.id]));
    const statements: D1PreparedStatement[] = [];
    const eventLine = (employeeId: string, type: string, from: string, to: string, note: string, date: string) =>
      db.prepare("INSERT INTO employee_events(id,company_id,employee_id,type,from_value,to_value,note,actor_id,event_date,created) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, employeeId, type, from, to, note, userId, date, now);
    let created = 0;
    let updated = 0;
    const plan = await loadPlanData(db, id);
    const seenFin = new Set<string>();
    // People this file adds take places too, so a position cannot be overfilled by one file.
    const addedPeople: PlanPerson[] = [];
    for (const row of incoming.rows) {
      if (row.fin && !/^[A-Z0-9]{7}$/.test(row.fin)) {
        incoming.issues.push({ line: row.line, reason: `${row.name}: FİN kodu 7 simvol olmalıdır (“${row.fin}”).` });
        continue;
      }
      if (row.fin && seenFin.has(row.fin)) {
        incoming.issues.push({ line: row.line, reason: `${row.name}: FİN ${row.fin} faylda iki dəfə yazılıb.` });
        continue;
      }
      if (row.fin) seenFin.add(row.fin);
      // A row paid above or below the band of the staff table is left out and reported.
      const gross = row.salary > 0 ? employeePay(row.salary, row.salaryType, row.sector).gross : 0;
      const problem = checkSalary(plan.units, { id: "", department: row.department, section: row.section, position: row.position }, gross);
      if (problem) {
        incoming.issues.push({ line: row.line, reason: `${row.name}: ${problem}` });
        continue;
      }
      // The FİN tells two people with one name apart; without it the e-mail and then the name and start day are used.
      const finHits = row.fin ? byFin.get(row.fin) || [] : [];
      if (finHits.length > 1) {
        incoming.issues.push({ line: row.line, reason: `${row.name}: FİN ${row.fin} ilə ${finHits.length} işçi var — kartları yoxlayın.` });
        continue;
      }
      const found = finHits[0] || (row.email && byEmail.get(lower(row.email))) || byName.get(`${lower(row.name)}|${row.startDate}`);
      if (!found) {
        const noRoom = placeProblem(plan.units, [...plan.people, ...addedPeople], { id: "", department: row.department, section: row.section, position: row.position });
        if (noRoom) {
          incoming.issues.push({ line: row.line, reason: `${row.name}: ${noRoom}` });
          continue;
        }
        addedPeople.push({ id: `new:${row.line}`, department: row.department, section: row.section, position: row.position });
      }
      if (found) {
        const before = existing.results.find((e) => e.id === found);
        const cardFin = finById.get(found) || "";
        if (row.fin && cardFin && cardFin !== row.fin) {
          incoming.issues.push({ line: row.line, reason: `${row.name}: kartdakı FİN (${cardFin}) fayldakından (${row.fin}) fərqlidir — başqa işçi ola bilər.` });
          continue;
        }
        if (mayPay && before) statements.push(...(await salaryChange(found, before.salary_cents, before.salary_type, Math.round(row.salary * 100), row.salaryType, today, userId)));
        // Every change of position or department stays in the history of the card.
        if (before && row.position && row.position !== before.position) statements.push(eventLine(found, "position", before.position, row.position, "Excel idxalı", today));
        if (before && row.department && row.department !== before.department) statements.push(eventLine(found, "department", before.department, row.department, "Excel idxalı", today));
        if (row.fin && !cardFin) {
          const card = await reveal(before?.profile);
          if (!card.locked) {
            const { profile } = normalizeProfile({ ...card.profile, fin: row.fin });
            statements.push(db.prepare("UPDATE company_employees SET profile=? WHERE id=? AND company_id=?").bind(await sealProfile(profile, dataKey()), found, id));
          }
        }
        statements.push(
          db
            .prepare(
              mayPay
                ? "UPDATE company_employees SET name=?,position=?,department=?,section=?,phone=?,start_date=?,salary_cents=?,salary_type=?,sector=?,vacation_days=?,vacation_used=?,updated=? WHERE id=? AND company_id=?"
                : "UPDATE company_employees SET name=?,position=?,department=?,section=?,phone=?,start_date=?,vacation_days=?,vacation_used=?,updated=? WHERE id=? AND company_id=?",
            )
            .bind(
              ...(mayPay
                ? [row.name, row.position, row.department, row.section, row.phone, row.startDate, Math.round(row.salary * 100), row.salaryType, row.sector, row.vacationDays, row.vacationUsed, now, found, id]
                : [row.name, row.position, row.department, row.section, row.phone, row.startDate, row.vacationDays, row.vacationUsed, now, found, id]),
            ),
        );
        updated++;
        continue;
      }
      const newId = crypto.randomUUID();
      const newProfile = row.fin ? await sealProfile(normalizeProfile({ fin: row.fin }).profile, dataKey()) : "";
      statements.push(
        db
          .prepare(
            "INSERT INTO company_employees(id,company_id,name,position,department,section,email,phone,start_date,salary_cents,salary_type,sector,vacation_days,vacation_used,status,source,created,updated,profile) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,'active','import',?,?,?)",
          )
          .bind(newId, id, row.name, row.position, row.department, row.section, row.email, row.phone, row.startDate, Math.round(row.salary * 100), row.salaryType, row.sector, row.vacationDays, row.vacationUsed, now, now, newProfile || "{}"),
        db
          .prepare(
            "INSERT INTO employee_events(id,company_id,employee_id,type,from_value,to_value,note,actor_id,event_date,created) VALUES(?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(crypto.randomUUID(), id, newId, "hired", "", "", "import", userId, row.startDate || today, now),
      );
      if (row.fin) byFin.set(row.fin, [newId]);
      created++;
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "employees-imported", "", `${created} yeni, ${updated} yenilənən`);
    return ok({ created, updated, issues: incoming.issues });
  }
  return undefined;
}
