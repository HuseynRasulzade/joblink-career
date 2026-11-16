// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { type CalendarOverride, monthDays } from "@/lib/calendar-az";
import { type EmployeeProfile, normalizeProfile, parseProfile } from "@/lib/employee-profile";
import { HttpError, jsonBody, str } from "@/lib/server";
import { bandOf, cycleScore } from "@/lib/performance";
import { can } from "@/lib/company";
import { companyAudit } from "@/lib/api-core";
import { createXlsxBook } from "@/lib/xlsx";
import { dailyNorm } from "@/lib/hours";
import { matchEmployee, parseSkillMatrix } from "@/lib/sheet-imports";
import { normalizeSkillKey } from "@/lib/skill-catalog";
import { sealProfile } from "@/lib/secure-profile";
import { searchCatalog } from "@/lib/skill-matrix";
import { weeklyHours } from "@/lib/employee-rights";
import { ok, searchEscoSkills } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_12(c: Pick<RouteCtx, "PROFILE_CHANGE_FIELDS" | "addToBonus" | "askFeedback" | "catalogSkills" | "changeValue" | "clockSettings" | "dataKey" | "db" | "employeeRefs" | "ensureSkillDef" | "feedbackSummary" | "id" | "maskedValue" | "memberGrants" | "memberRole" | "oneOnOneRows" | "path" | "payrollMonthLocked" | "request" | "requestUrl" | "requesterName" | "requirePermission" | "resolveAnySkill" | "reveal" | "salaryChange" | "saveOneOnOne" | "setSkillLevel" | "swapList" | "tellEmployee" | "userId">): Promise<Response | undefined> {
  const { PROFILE_CHANGE_FIELDS, addToBonus, askFeedback, catalogSkills, changeValue, clockSettings, dataKey, db, employeeRefs, ensureSkillDef, feedbackSummary, id, maskedValue, memberGrants, memberRole, oneOnOneRows, path, payrollMonthLocked, request, requestUrl, requesterName, requirePermission, resolveAnySkill, reveal, salaryChange, saveOneOnOne, setSkillLevel, swapList, tellEmployee, userId } = c;
  if (request.method === "GET" && path === "company/skill-matrix/catalog") {
    requirePermission("salaries", "Bacarıq kataloqunu yalnız kadr işçisi görə bilər.");
    const taken = (await db.prepare("SELECT name FROM skill_defs WHERE company_id=?").bind(id).all<{ name: string }>()).results.map((r) => r.name);
    const q = str(requestUrl.searchParams.get("q"), 80);
    const own = searchCatalog(q, await catalogSkills(), taken, 12).map((s) => ({ id: s.id, label: s.label, category: s.category }));
    const have = new Set([...taken, ...own.map((o) => o.label)].map((v) => normalizeSkillKey(v)));
    const more = own.length >= 12 ? [] : (await searchEscoSkills(db, q, 12 - own.length).catch(() => [])).filter((e) => !have.has(normalizeSkillKey(e.label))).map((e) => ({ id: e.id, label: e.label, category: e.category }));
    return ok({ items: [...own, ...more].slice(0, 12) });
  }
  if (request.method === "POST" && path === "company/skill-matrix/skill") {
    requirePermission("salaries", "Bacarığı yalnız kadr işçisi əlavə edə bilər.");
    const b = await jsonBody(request);
    const name = str(b.name, 120);
    if (name.length < 2) throw new HttpError(400, "Bacarığı kataloqdan seçin.");
    const skill = await resolveAnySkill(name, await catalogSkills());
    if (!skill) throw new HttpError(400, "Bu bacarıq nə admin panelindəki kataloqda, nə də ESCO siyahısında yoxdur. Bacarıqlar yalnız bu siyahılardan seçilir; yenisi lazımdırsa admin kataloqa əlavə etməlidir.");
    if (await db.prepare("SELECT 1 AS yes FROM skill_defs WHERE company_id=? AND (catalog_id=? OR name=?)").bind(id, skill.id, skill.label).first()) throw new HttpError(409, "Bu bacarıq artıq var.");
    await ensureSkillDef(skill);
    await companyAudit(db, id, userId, "skill-added", "", skill.label);
    return ok({ ok: true, label: skill.label }, 201);
  }
  if (request.method === "POST" && path === "company/skill-matrix/import") {
    requirePermission("salaries", "Bacarıq səviyyəsini yalnız kadr işçisi yükləyə bilər.");
    const b = await jsonBody(request);
    const parsed = parseSkillMatrix((Array.isArray(b.rows) ? b.rows : []).slice(0, 2001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda sətir tapılmadı.");
    const refs = await employeeRefs();
    const custom = await catalogSkills();
    const issues = [...parsed.issues];
    const defIds = new Map<string, string>();
    let applied = 0;
    const added = new Set<string>();
    for (const row of parsed.rows) {
      const found = matchEmployee(refs, { name: row.name, email: row.email, fin: row.fin });
      if ("error" in found) {
        issues.push({ line: row.line, reason: found.error });
        continue;
      }
      const skill = await resolveAnySkill(row.skill, custom);
      if (!skill) {
        issues.push({ line: row.line, reason: `“${row.skill}” bacarıq kataloqunda və ESCO siyahısında tapılmadı (admin panelindəki kataloqa baxın).` });
        continue;
      }
      try {
        let defId = defIds.get(skill.id);
        if (!defId) {
          defId = await ensureSkillDef(skill);
          defIds.set(skill.id, defId);
          added.add(skill.label);
        }
        await setSkillLevel(id, found.id, defId, row.level, row.target);
        applied++;
      } catch (error) {
        issues.push({ line: row.line, reason: `${row.name}: ${(error as Error).message}` });
      }
    }
    await companyAudit(db, id, userId, "skill-matrix-imported", "", `${applied} səviyyə Excel faylından yükləndi`);
    return ok({ applied, skills: added.size, issues });
  }
  if (request.method === "POST" && path === "company/skill-matrix/skill/delete") {
    requirePermission("salaries", "Bacarığı yalnız kadr işçisi silə bilər.");
    const b = await jsonBody(request);
    await db.batch([db.prepare("DELETE FROM employee_skills WHERE company_id=? AND skill_id=?").bind(id, str(b.id, 100)), db.prepare("DELETE FROM skill_defs WHERE id=? AND company_id=?").bind(str(b.id, 100), id)]);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/skill-matrix/set") {
    requirePermission("salaries", "Bacarıq səviyyəsini yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const employee = await db.prepare("SELECT id FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.employeeId, 100), id).first<{ id: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    await setSkillLevel(id, employee.id, str(b.skillId, 100), b.level === undefined || b.level === null || b.level === "" ? null : Number(b.level), b.target === undefined || b.target === null || b.target === "" ? null : Number(b.target));
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/inbox") {
    requirePermission("salaries", "Gözləyən təsdiqləri yalnız kadr işçisi görə bilər.");
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = today.slice(0, 7);
    const lastMonth = new Date(Date.UTC(Number(thisMonth.slice(0, 4)), Number(thisMonth.slice(5, 7)) - 2, 1)).toISOString().slice(0, 7);
    const clock = await clockSettings(id);
    const names = new Map((await db.prepare("SELECT id,name,profile FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; name: string; profile: string }>()).results.map((p) => [p.id, p]));
    const overtime: { employeeId: string; name: string; kind: "day" | "month"; day: string; extra: number }[] = [];
    if (clock.overtimeApproval) {
      const locked = new Set((await db.prepare("SELECT month FROM payroll_runs WHERE company_id=? AND status='approved'").bind(id).all<{ month: string }>()).results.map((r) => r.month));
      for (const month of [lastMonth, thisMonth]) {
        if (locked.has(month)) continue;
        const calendar = (await db.prepare("SELECT day,kind,label FROM company_calendar WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, `${month}-01`, `${month}-31`).all<CalendarOverride>()).results;
        const info = new Map(monthDays(Number(month.slice(0, 4)), Number(month.slice(5, 7)), calendar).map((d) => [d.date, d]));
        const ordered = new Set((await db.prepare("SELECT employee_id,day FROM overtime_orders WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, `${month}-01`, `${month}-31`).all<{ employee_id: string; day: string }>()).results.map((o) => `${o.employee_id}|${o.day}`));
        const rows = (await db.prepare("SELECT employee_id,day,hours,overtime_status FROM attendance_hours WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, `${month}-01`, `${month}-31`).all<{ employee_id: string; day: string; hours: number; overtime_status: string }>()).results;
        const withDaily = new Set(rows.map((r) => r.employee_id));
        for (const h of rows) {
          const person = names.get(h.employee_id);
          if (!person || h.overtime_status === "approved" || ordered.has(`${h.employee_id}|${h.day}`)) continue;
          const d = info.get(h.day);
          const week = weeklyHours(parseProfile(person.profile), `${month}-01`).hours;
          const extra = Math.round((d && d.off !== "" ? h.hours : Math.max(0, h.hours - dailyNorm(week, !!d?.short))) * 100) / 100;
          if (extra > 0) overtime.push({ employeeId: h.employee_id, name: person.name, kind: "day", day: h.day, extra });
        }
        for (const m of (await db.prepare("SELECT employee_id,overtime,rest_day,status FROM attendance_hours_month WHERE company_id=? AND month=?").bind(id, month).all<{ employee_id: string; overtime: number; rest_day: number; status: string }>()).results) {
          const person = names.get(m.employee_id);
          if (person && !withDaily.has(m.employee_id) && m.status !== "approved" && m.overtime + m.rest_day > 0) overtime.push({ employeeId: m.employee_id, name: person.name, kind: "month", day: month, extra: Math.round((m.overtime + m.rest_day) * 100) / 100 });
        }
      }
    }
    const swaps = (await swapList()).filter((x) => x.status === "accepted");
    const trips = (await db.prepare("SELECT id,employee_id,destination,start_date,end_date,abroad FROM trips WHERE company_id=? AND status='requested' AND manager_status<>'pending' ORDER BY start_date LIMIT 30").bind(id).all<{ id: string; employee_id: string; destination: string; start_date: string; end_date: string; abroad: number }>()).results.map((t) => ({ id: t.id, name: names.get(t.employee_id)?.name || "", destination: t.destination, start: t.start_date, end: t.end_date, abroad: !!t.abroad }));
    const plans = (await db.prepare("SELECT id,employee_id,start_date,end_date,days FROM leave_schedule WHERE company_id=? AND status='proposed' ORDER BY start_date LIMIT 30").bind(id).all<{ id: string; employee_id: string; start_date: string; end_date: string; days: number }>()).results.map((p) => ({ id: p.id, name: names.get(p.employee_id)?.name || "", start: p.start_date, end: p.end_date, days: p.days }));
    const batches = (await db.prepare("SELECT id,month,kind,status,total_cents,item_count FROM payroll_batches WHERE company_id=? AND status IN ('draft','approved') ORDER BY created DESC LIMIT 20").bind(id).all<{ id: string; month: string; kind: string; status: string; total_cents: number; item_count: number }>()).results.map((b) => ({ id: b.id, month: b.month, kind: b.kind, status: b.status, total: b.total_cents / 100, count: b.item_count }));
    const applications = Number((await db.prepare("SELECT COUNT(*) AS n FROM employee_requests WHERE company_id=? AND status='new' AND manager_status IN ('','approved')").bind(id).first<{ n: number }>())?.n || 0);
    const showValues = can(memberRole, "personal-data", memberGrants);
    const changes = await Promise.all((await db.prepare("SELECT id,employee_id,field,payload FROM profile_changes WHERE company_id=? AND status='new' ORDER BY created LIMIT 30").bind(id).all<{ id: string; employee_id: string; field: string; payload: string }>()).results.map(async (c) => { const value = await changeValue(c.payload, c.field); return { id: c.id, name: names.get(c.employee_id)?.name || "", label: PROFILE_CHANGE_FIELDS[c.field] || c.field, value: showValues ? value : maskedValue(c.field, value) }; }));
    return ok({ overtime, swaps, trips, plans, batches, applications, changes });
  }
  if (request.method === "GET" && path === "company/profile-changes") {
    requirePermission("salaries", "Məlumat dəyişikliyi sorğularını yalnız şəxsi məlumat icazəsi olan şəxs görə bilər.");
    const rows = (await db.prepare("SELECT c.id,c.employee_id,c.field,c.payload,c.status,c.reason,c.decided_by_name,c.created,e.name FROM profile_changes c JOIN company_employees e ON e.id=c.employee_id WHERE c.company_id=? ORDER BY CASE c.status WHEN 'new' THEN 0 ELSE 1 END,c.created DESC LIMIT 100").bind(id).all<{ id: string; employee_id: string; field: string; payload: string; status: string; reason: string; decided_by_name: string; created: string; name: string }>()).results;
    const show = can(memberRole, "personal-data", memberGrants);
    return ok({ items: await Promise.all(rows.map(async (r) => { const value = await changeValue(r.payload, r.field); return { id: r.id, employeeId: r.employee_id, name: r.name, field: r.field, label: PROFILE_CHANGE_FIELDS[r.field] || r.field, value: show ? value : maskedValue(r.field, value), status: r.status, reason: r.reason, decidedBy: r.decided_by_name, created: r.created }; })) });
  }
  if (request.method === "POST" && path === "company/profile-changes/decide") {
    requirePermission("salaries", "Məlumat dəyişikliyini yalnız şəxsi məlumat icazəsi olan şəxs təsdiq edə bilər.");
    if (!can(memberRole, "personal-data", memberGrants)) throw new HttpError(403, "Şəxsi məlumatları dəyişmək üçün şəxsi məlumat icazəsi lazımdır.");
    const b = await jsonBody(request);
    const row = await db.prepare("SELECT id,employee_id,field,payload FROM profile_changes WHERE id=? AND company_id=? AND status='new'").bind(str(b.id, 100), id).first<{ id: string; employee_id: string; field: string; payload: string }>();
    if (!row) throw new HttpError(404, "Gözləyən sorğu tapılmadı.");
    const me = await requesterName();
    const now = new Date().toISOString();
    if (b.decision === "approve") {
      const stored = await db.prepare("SELECT profile FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(row.employee_id, id).first<{ profile: string }>();
      if (!stored) throw new HttpError(404, "İşçi tapılmadı.");
      const opened = await reveal(stored.profile);
      if (opened.locked) throw new HttpError(409, "Bu işçinin şifrələnmiş məlumatı açıla bilmir: dəyişiklik tətbiq edilmədi.");
      const { profile, issues } = normalizeProfile({ ...opened.profile, [row.field]: await changeValue(row.payload, row.field) });
      if (issues.length) throw new HttpError(400, issues[0]);
      await db.batch([
        db.prepare("UPDATE company_employees SET profile=?,updated=? WHERE id=? AND company_id=?").bind(await sealProfile(profile, dataKey()), now, row.employee_id, id),
        db.prepare("UPDATE profile_changes SET status='applied',decided_by_name=?,decided_at=?,payload=? WHERE id=?").bind(me, now, await sealProfile({ [row.field]: "" } as unknown as EmployeeProfile, dataKey()), row.id),
      ]);
      await companyAudit(db, id, userId, "profile-change-applied", row.employee_id, PROFILE_CHANGE_FIELDS[row.field] || row.field);
      await tellEmployee(row.employee_id, "Məlumat dəyişikliyi təsdiqləndi", `${PROFILE_CHANGE_FIELDS[row.field] || row.field} kartınızda yeniləndi.`);
    } else {
      const reason = str(b.reason, 300);
      if (reason.length < 5) throw new HttpError(400, "Rədd səbəbini yazın.");
      await db.prepare("UPDATE profile_changes SET status='rejected',reason=?,decided_by_name=?,decided_at=? WHERE id=?").bind(reason, me, now, row.id).run();
      await tellEmployee(row.employee_id, "Məlumat dəyişikliyi sorğunuz rədd edildi", reason);
    }
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/one-on-ones") {
    requirePermission("salaries", "1:1 qeydlərini yalnız kadr işçisi görə bilər.");
    const employeeId = str(requestUrl.searchParams.get("employeeId"), 100);
    return ok({ items: await oneOnOneRows(id, employeeId, false) });
  }
  if (request.method === "POST" && path === "company/one-on-ones/save") {
    requirePermission("salaries", "1:1 qeydini yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const employee = await db.prepare("SELECT id,name FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.employeeId, 100), id).first<{ id: string; name: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    await saveOneOnOne(id, employee.id, b, "hr", await requesterName());
    await companyAudit(db, id, userId, "one-on-one-saved", employee.id, employee.name);
    if (b.shared !== false) await tellEmployee(employee.id, "1:1 görüş qeydi əlavə olundu", "İş yerim → Performans bölməsində görüşün nəticələrinə baxın.");
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/one-on-ones/delete") {
    requirePermission("salaries", "1:1 qeydini yalnız kadr işçisi sil bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM one_on_ones WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/performance/feedback-request") {
    requirePermission("salaries", "Kolleqa rəyini yalnız kadr işçisi istəyə bilər.");
    const b = await jsonBody(request);
    const added = await askFeedback(id, str(b.cycleId, 100), str(b.employeeId, 100), Array.isArray(b.giverIds) ? (b.giverIds as unknown[]).map((x) => String(x)) : []);
    await companyAudit(db, id, userId, "feedback-requested", str(b.employeeId, 100), `${added} kolleqa`);
    return ok({ ok: true, asked: added }, 201);
  }
  if (request.method === "GET" && path === "company/performance/feedback") {
    requirePermission("salaries", "Kolleqa rəylərini yalnız kadr işçisi görə bilər.");
    const summary = await feedbackSummary(id, str(requestUrl.searchParams.get("cycleId"), 100), [str(requestUrl.searchParams.get("employeeId"), 100)]);
    return ok(summary.get(str(requestUrl.searchParams.get("employeeId"), 100)) || { asked: 0, count: 0, average: null, comments: [] });
  }
  if (request.method === "POST" && path === "company/performance/raise") {
    requirePermission("salaries", "Tövsiyəni yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const type = ["", "raise", "bonus", "promotion", "plan"].includes(str(b.type, 12)) ? str(b.type, 12) : "";
    const percent = type === "raise" ? Math.max(0, Math.min(100, Math.round((Number(b.percent) || 0) * 10) / 10)) : 0;
    if (type === "raise" && !(percent > 0)) throw new HttpError(400, "Maaş artımının faizini yazın.");
    const res = await db.prepare("UPDATE perf_reviews SET raise_type=?,raise_percent=?,raise_note=? WHERE cycle_id=? AND employee_id=? AND company_id=? AND raise_applied=''").bind(type, percent, str(b.note, 300), str(b.cycleId, 100), str(b.employeeId, 100), id).run();
    if (!res.meta.changes) throw new HttpError(409, "Əvvəlcə ümumi qiymət yazılmalıdır (və ya artım artıq tətbiq olunub).");
    await companyAudit(db, id, userId, "performance-recommendation", str(b.employeeId, 100), `${type || "yoxdur"} ${percent ? `${percent}%` : ""}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/performance/raise/apply") {
    requirePermission("salaries", "Maaş artımını yalnız əmək haqqı icazəsi olan şəxs tətbiq edə bilər.");
    if (!can(memberRole, "payroll", memberGrants)) throw new HttpError(403, "Maaş dəyişikliyi üçün əmək haqqı icazəsi lazımdır.");
    const b = await jsonBody(request);
    const review = await db.prepare("SELECT raise_type,raise_percent FROM perf_reviews WHERE cycle_id=? AND employee_id=? AND company_id=? AND raise_applied=''").bind(str(b.cycleId, 100), str(b.employeeId, 100), id).first<{ raise_type: string; raise_percent: number }>();
    if (!review || review.raise_type !== "raise" || !(review.raise_percent > 0)) throw new HttpError(409, "Tətbiq ediləcək maaş artımı tövsiyəsi yoxdur.");
    const from = /^\d{4}-\d{2}-\d{2}$/.test(str(b.effectiveFrom, 10)) ? str(b.effectiveFrom, 10) : "";
    if (!from) throw new HttpError(400, "Yeni maaşın qüvvəyə minmə tarixini yazın.");
    const emp = await db.prepare("SELECT id,name,salary_cents,salary_type FROM company_employees WHERE id=? AND company_id=? AND status IN ('active','leave')").bind(str(b.employeeId, 100), id).first<{ id: string; name: string; salary_cents: number; salary_type: string }>();
    if (!emp || !(emp.salary_cents > 0)) throw new HttpError(404, "İşçi tapılmadı və ya maaşı yazılmayıb.");
    const cents = Math.round((emp.salary_cents * (100 + review.raise_percent)) / 100);
    await db.batch([
      ...(await salaryChange(emp.id, emp.salary_cents, emp.salary_type, cents, emp.salary_type, from, userId)),
      db.prepare("UPDATE company_employees SET salary_cents=?,updated=? WHERE id=? AND company_id=?").bind(cents, new Date().toISOString(), emp.id, id),
      db.prepare("UPDATE perf_reviews SET raise_applied=? WHERE cycle_id=? AND employee_id=? AND company_id=?").bind(from, str(b.cycleId, 100), emp.id, id),
    ]);
    await companyAudit(db, id, userId, "raise-applied", emp.id, `${emp.name}: +${review.raise_percent}% (${emp.salary_cents / 100} → ${cents / 100}) ${from}-dən`);
    await tellEmployee(emp.id, "Maaşınız yenilənir", `${from} tarixindən maaşınız qiymətləndirmə nəticəsinə görə dəyişir. Ətraflı: İş yerim → Əmək haqqı.`);
    return ok({ ok: true, from, salary: cents / 100 });
  }
  if (request.method === "POST" && path === "company/performance/bonus/apply") {
    requirePermission("salaries", "Mükafatı əmək haqqına yalnız əmək haqqı icazəsi olan şəxs yaza bilər.");
    if (!can(memberRole, "payroll", memberGrants)) throw new HttpError(403, "Mükafat üçün əmək haqqı icazəsi lazımdır.");
    const b = await jsonBody(request);
    const review = await db.prepare("SELECT raise_type FROM perf_reviews WHERE cycle_id=? AND employee_id=? AND company_id=? AND raise_applied=''").bind(str(b.cycleId, 100), str(b.employeeId, 100), id).first<{ raise_type: string }>();
    if (!review || review.raise_type !== "bonus") throw new HttpError(409, "Tətbiq ediləcək mükafat tövsiyəsi yoxdur.");
    const amount = Math.round((Number(b.amount) || 0) * 100) / 100;
    if (!(amount > 0) || amount > 1_000_000) throw new HttpError(400, "Mükafatın məbləğini yazın.");
    const month = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, "Ayı düzgün seçin.");
    if (await payrollMonthLocked(month)) throw new HttpError(409, `${month} ayı təsdiqlənib: başqa ay seçin.`);
    await addToBonus(str(b.employeeId, 100), month, amount);
    await db.prepare("UPDATE perf_reviews SET raise_applied=?,raise_percent=? WHERE cycle_id=? AND employee_id=? AND company_id=?").bind(month, amount, str(b.cycleId, 100), str(b.employeeId, 100), id).run();
    await companyAudit(db, id, userId, "performance-bonus-applied", str(b.employeeId, 100), `${amount} AZN → ${month}`);
    await tellEmployee(str(b.employeeId, 100), "Mükafat təyin olundu", `${month} ayının əmək haqqına ${amount} AZN mükafat əlavə edildi (performans qiymətləndirməsinə görə).`);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/performance/export") {
    requirePermission("salaries", "Hesabatı yalnız kadr işçisi yükləyə bilər.");
    const cycleId = str(requestUrl.searchParams.get("cycle"), 100);
    const cycle = await db.prepare("SELECT name FROM perf_cycles WHERE id=? AND company_id=?").bind(cycleId, id).first<{ name: string }>();
    if (!cycle) throw new HttpError(404, "Dövr tapılmadı.");
    const [goals, reviews, people] = await Promise.all([
      db.prepare("SELECT employee_id,title,target,weight,progress,score,manager_note FROM perf_goals WHERE company_id=? AND cycle_id=? ORDER BY created").bind(id, cycleId).all<{ employee_id: string; title: string; target: string; weight: number; progress: number; score: number | null; manager_note: string }>(),
      db.prepare("SELECT employee_id,self_score,manager_score,manager_comment,reviewer_name,status FROM perf_reviews WHERE company_id=? AND cycle_id=?").bind(id, cycleId).all<{ employee_id: string; self_score: number | null; manager_score: number | null; manager_comment: string; reviewer_name: string; status: string }>(),
      db.prepare("SELECT id,name,position,department FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ id: string; name: string; position: string; department: string }>(),
    ]);
    const by = new Map(people.results.map((p) => [p.id, p]));
    const summary: (string | number)[][] = people.results.filter((p) => goals.results.some((g) => g.employee_id === p.id) || reviews.results.some((r) => r.employee_id === p.id)).map((p) => {
      const r = reviews.results.find((x) => x.employee_id === p.id);
      const c = cycleScore(goals.results.filter((g) => g.employee_id === p.id).map((g) => ({ weight: g.weight, progress: g.progress, score: g.score })));
      return [p.name, p.position, p.department, c.score ?? "", r?.self_score ?? "", r?.manager_score ?? "", bandOf(r?.manager_score ?? c.score), r?.reviewer_name || "", r?.manager_comment || "", r?.status || ""];
    });
    const goalRows: (string | number)[][] = goals.results.map((g) => [by.get(g.employee_id)?.name || "", g.title, g.target, g.weight, g.progress, g.score ?? "", g.manager_note]);
    const book = createXlsxBook([
      { name: "Nəticələr", headers: ["İşçi", "Vəzifə", "Departament", "Məqsədlər üzrə orta", "Özünüqiymət", "Rəhbər qiyməti", "Dərəcə", "Qiymətləndirən", "Rəy", "Vəziyyət"], rows: summary },
      { name: "Məqsədlər", headers: ["İşçi", "Məqsəd", "Hədəf", "Çəki", "İcra %", "Qiymət", "Rəhbərin qeydi"], rows: goalRows },
    ]);
    return new Response(Uint8Array.from(book).buffer, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="performans-${cycleId.slice(0, 8)}.xlsx"`, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
  }
  return undefined;
}
