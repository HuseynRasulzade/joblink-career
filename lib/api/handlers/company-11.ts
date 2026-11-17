// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { RATING_TEXT, bandOf, cleanScore, cycleScore } from "@/lib/performance";
import { companyAudit } from "@/lib/api-core";
import { deadlinesOf } from "@/lib/hr-deadlines";
import { matchEmployee, parsePerfGoals } from "@/lib/sheet-imports";
import { parseProfile } from "@/lib/employee-profile";
import { loadPlanData, ok } from "@/lib/api/shared";
import { assignPeople, bandConflicts, summarize } from "@/lib/staff-plan";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_11(c: Pick<RouteCtx, "dateOk" | "db" | "employeeRefs" | "id" | "path" | "request" | "requestUrl" | "requesterName" | "requirePermission" | "skillMatrix" | "tellEmployee" | "userId">): Promise<Response | undefined> {
  const { dateOk, db, employeeRefs, id, path, request, requestUrl, requesterName, requirePermission, skillMatrix, tellEmployee, userId } = c;
  if (request.method === "GET" && path === "company/performance") {
    requirePermission("salaries", "Performans bölməsini yalnız kadr işçisi görə bilər.");
    const cycles = (await db.prepare("SELECT id,name,start_date,end_date,status FROM perf_cycles WHERE company_id=? ORDER BY start_date DESC LIMIT 30").bind(id).all<{ id: string; name: string; start_date: string; end_date: string; status: string }>()).results;
    const wanted = str(requestUrl.searchParams.get("cycle"), 100) || cycles[0]?.id || "";
    const people = (await db.prepare("SELECT id,name,position,department FROM company_employees WHERE company_id=? AND status IN ('active','leave') ORDER BY department,name").bind(id).all<{ id: string; name: string; position: string; department: string }>()).results;
    let rows: unknown[] = [];
    if (wanted) {
      const [goals, reviews] = await Promise.all([
        db.prepare("SELECT id,employee_id,title,target,weight,progress,self_note,manager_note,score,proposed_by FROM perf_goals WHERE company_id=? AND cycle_id=? ORDER BY created").bind(id, wanted).all<{ id: string; employee_id: string; title: string; target: string; weight: number; progress: number; self_note: string; manager_note: string; score: number | null; proposed_by: string }>(),
        db.prepare("SELECT employee_id,self_score,self_comment,manager_score,manager_comment,reviewer_name,status,acknowledged_at,raise_type,raise_percent,raise_note,raise_applied FROM perf_reviews WHERE company_id=? AND cycle_id=?").bind(id, wanted).all<{ employee_id: string; self_score: number | null; self_comment: string; manager_score: number | null; manager_comment: string; reviewer_name: string; status: string; acknowledged_at: string; raise_type: string; raise_percent: number; raise_note: string; raise_applied: string }>(),
      ]);
      rows = people.map((p) => {
        const mine = goals.results.filter((g) => g.employee_id === p.id);
        const review = reviews.results.find((r) => r.employee_id === p.id);
        const result = cycleScore(mine.map((g) => ({ weight: g.weight, progress: g.progress, score: g.score })));
        return {
          ...p,
          goals: mine.map((g) => ({ id: g.id, title: g.title, target: g.target, weight: g.weight, progress: g.progress, selfNote: g.self_note, managerNote: g.manager_note, score: g.score, proposedBy: g.proposed_by })),
          goalScore: result.score, band: bandOf(review?.manager_score ?? result.score),
          review: review ? { raise: { type: review.raise_type, percent: review.raise_percent, note: review.raise_note, applied: review.raise_applied }, selfScore: review.self_score, selfComment: review.self_comment, managerScore: review.manager_score, managerComment: review.manager_comment, reviewer: review.reviewer_name, status: review.status, acknowledgedAt: review.acknowledged_at } : null,
        };
      });
    }
    return ok({ cycles: cycles.map((c) => ({ id: c.id, name: c.name, start: c.start_date, end: c.end_date, status: c.status })), cycle: wanted, rating: RATING_TEXT, employees: rows });
  }
  if (request.method === "POST" && path === "company/performance/cycle") {
    requirePermission("salaries", "Dövrü yalnız kadr işçisi yarada bilər.");
    const b = await jsonBody(request);
    const name = str(b.name, 120);
    if (name.length < 3) throw new HttpError(400, "Dövrün adını yazın.");
    if (!dateOk(str(b.start, 10)) || !dateOk(str(b.end, 10)) || str(b.end, 10) < str(b.start, 10)) throw new HttpError(400, "Tarixləri düzgün yazın.");
    const status = b.status === "closed" ? "closed" : "open";
    if (str(b.id, 100)) await db.prepare("UPDATE perf_cycles SET name=?,start_date=?,end_date=?,status=? WHERE id=? AND company_id=?").bind(name, str(b.start, 10), str(b.end, 10), status, str(b.id, 100), id).run();
    else await db.prepare("INSERT INTO perf_cycles(id,company_id,name,start_date,end_date,status,created) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, name, str(b.start, 10), str(b.end, 10), status, new Date().toISOString()).run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/performance/goal") {
    requirePermission("salaries", "Məqsədi yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const cycle = await db.prepare("SELECT id,status FROM perf_cycles WHERE id=? AND company_id=?").bind(str(b.cycleId, 100), id).first<{ id: string; status: string }>();
    const employee = await db.prepare("SELECT id FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.employeeId, 100), id).first<{ id: string }>();
    if (!cycle || !employee) throw new HttpError(404, "Dövr və ya işçi tapılmadı.");
    if (cycle.status === "closed") throw new HttpError(409, "Dövr bağlanıb.");
    const title = str(b.title, 200);
    if (title.length < 3) throw new HttpError(400, "Məqsədi yazın.");
    const weight = Math.max(1, Math.min(10, Math.round(Number(b.weight) || 1)));
    const count = Number((await db.prepare("SELECT COUNT(*) AS n FROM perf_goals WHERE company_id=? AND cycle_id=? AND employee_id=?").bind(id, cycle.id, employee.id).first<{ n: number }>())?.n || 0);
    if (str(b.id, 100)) {
      await db.prepare("UPDATE perf_goals SET title=?,target=?,weight=? WHERE id=? AND company_id=?").bind(title, str(b.target, 300), weight, str(b.id, 100), id).run();
      return ok({ ok: true });
    }
    if (count >= 12) throw new HttpError(409, "Bir işçi üçün ən çox 12 məqsəd yazılır.");
    await db.prepare("INSERT INTO perf_goals(id,company_id,cycle_id,employee_id,title,target,weight,created) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, cycle.id, employee.id, title, str(b.target, 300), weight, new Date().toISOString()).run();
    await tellEmployee(employee.id, "Sizə yeni məqsəd yazıldı", title);
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/performance/goals-import") {
    requirePermission("salaries", "Məqsədi yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const parsed = parsePerfGoals((Array.isArray(b.rows) ? b.rows : []).slice(0, 2001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda məqsəd tapılmadı.");
    const cycles = (await db.prepare("SELECT id,name,status FROM perf_cycles WHERE company_id=? ORDER BY start_date DESC").bind(id).all<{ id: string; name: string; status: string }>()).results;
    const open = cycles.filter((c) => c.status === "open");
    const defaultCycle = str(b.cycleId, 100) ? cycles.find((c) => c.id === str(b.cycleId, 100)) : open.length === 1 ? open[0] : undefined;
    const refs = await employeeRefs();
    const counts = new Map<string, number>();
    const seen = new Set<string>();
    for (const g of (await db.prepare("SELECT cycle_id,employee_id,title FROM perf_goals WHERE company_id=?").bind(id).all<{ cycle_id: string; employee_id: string; title: string }>()).results) {
      counts.set(`${g.cycle_id}|${g.employee_id}`, (counts.get(`${g.cycle_id}|${g.employee_id}`) || 0) + 1);
      seen.add(`${g.cycle_id}|${g.employee_id}|${g.title.toLocaleLowerCase("az")}`);
    }
    const issues = [...parsed.issues];
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];
    const told = new Map<string, number>();
    let created = 0;
    for (const row of parsed.rows) {
      const cycle = row.cycle ? cycles.find((c) => c.name.toLocaleLowerCase("az") === row.cycle.toLocaleLowerCase("az")) : defaultCycle;
      if (!cycle) {
        issues.push({ line: row.line, reason: row.cycle ? `${row.name}: “${row.cycle}” adlı dövr tapılmadı.` : `${row.name}: dövr seçilməyib (açıq dövr bir deyil): Dövr sütununu doldurun.` });
        continue;
      }
      if (cycle.status === "closed") {
        issues.push({ line: row.line, reason: `${row.name}: “${cycle.name}” dövrü bağlanıb.` });
        continue;
      }
      const found = matchEmployee(refs, { name: row.name, email: row.email, fin: row.fin });
      if ("error" in found) {
        issues.push({ line: row.line, reason: found.error });
        continue;
      }
      const key = `${cycle.id}|${found.id}`;
      if (seen.has(`${key}|${row.title.toLocaleLowerCase("az")}`)) {
        issues.push({ line: row.line, reason: `${row.name}: “${row.title}” məqsədi artıq yazılıb.` });
        continue;
      }
      if ((counts.get(key) || 0) >= 12) {
        issues.push({ line: row.line, reason: `${row.name}: bir işçi üçün ən çox 12 məqsəd yazılır.` });
        continue;
      }
      counts.set(key, (counts.get(key) || 0) + 1);
      seen.add(`${key}|${row.title.toLocaleLowerCase("az")}`);
      statements.push(db.prepare("INSERT INTO perf_goals(id,company_id,cycle_id,employee_id,title,target,weight,created) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, cycle.id, found.id, row.title, row.target, row.weight, now));
      told.set(found.id, (told.get(found.id) || 0) + 1);
      created++;
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    for (const [employeeId, n] of told) await tellEmployee(employeeId, n === 1 ? "Sizə yeni məqsəd yazıldı" : `Sizə ${n} yeni məqsəd yazıldı`, "İş yerim → Performans bölməsində baxın.");
    await companyAudit(db, id, userId, "perf-goals-imported", "", `${created} məqsəd Excel faylından yükləndi`);
    return ok({ created, issues });
  }
  if (request.method === "POST" && path === "company/performance/goal/delete") {
    requirePermission("salaries", "Məqsədi yalnız kadr işçisi silə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM perf_goals WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/performance/goal-score") {
    requirePermission("salaries", "Qiymətləndirməni yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const res = await db.prepare("UPDATE perf_goals SET score=?,manager_note=? WHERE id=? AND company_id=?").bind(cleanScore(b.score), str(b.note, 500), str(b.id, 100), id).run();
    if (!res.meta.changes) throw new HttpError(404, "Məqsəd tapılmadı.");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/performance/review") {
    requirePermission("salaries", "Qiymətləndirməni yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const cycle = await db.prepare("SELECT id FROM perf_cycles WHERE id=? AND company_id=?").bind(str(b.cycleId, 100), id).first<{ id: string }>();
    const employee = await db.prepare("SELECT id,name FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.employeeId, 100), id).first<{ id: string; name: string }>();
    if (!cycle || !employee) throw new HttpError(404, "Dövr və ya işçi tapılmadı.");
    const score = cleanScore(b.managerScore);
    if (score === null) throw new HttpError(400, "Ümumi qiyməti 1–5 arası seçin.");
    const now = new Date().toISOString();
    await db
      .prepare("INSERT INTO perf_reviews(id,company_id,cycle_id,employee_id,manager_score,manager_comment,reviewer_name,status,updated) VALUES(?,?,?,?,?,?,?,'manager-done',?) ON CONFLICT(cycle_id,employee_id) DO UPDATE SET manager_score=excluded.manager_score,manager_comment=excluded.manager_comment,reviewer_name=excluded.reviewer_name,status='manager-done',acknowledged_at='',updated=excluded.updated")
      .bind(crypto.randomUUID(), id, cycle.id, employee.id, score, str(b.managerComment, 1000), await requesterName(), now)
      .run();
    await companyAudit(db, id, userId, "performance-reviewed", employee.id, `${employee.name}: ${score}`);
    await tellEmployee(employee.id, "Performans qiymətləndirməniz hazırdır", `Ümumi qiymət: ${score} / 5 — ${RATING_TEXT[score]}. İş yerim → Performans bölməsində tanış olub təsdiqləyin.`);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/today") {
    requirePermission("salaries", "Bu günün işlərini yalnız kadr işçisi görə bilər.");
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
    const count = async (query: string, ...binds: unknown[]) => Number((await db.prepare(query).bind(...binds).first<{ n: number }>())?.n || 0);
    const [apps, overdue, managerWaiting, changes, trips, plans, approvals, probation, contracts, people, docs, certs] = await Promise.all([
      count("SELECT COUNT(*) AS n FROM employee_requests WHERE company_id=? AND status='new' AND manager_status IN ('','approved')", id),
      count("SELECT COUNT(*) AS n FROM employee_requests WHERE company_id=? AND status='new' AND manager_status IN ('','approved') AND created<?", id, new Date(Date.now() - 3 * 86_400_000).toISOString()),
      count("SELECT COUNT(*) AS n FROM employee_requests WHERE company_id=? AND status='new' AND manager_status='pending' AND created<?", id, new Date(Date.now() - 2 * 86_400_000).toISOString()),
      count("SELECT COUNT(*) AS n FROM profile_changes WHERE company_id=? AND status='new'", id),
      count("SELECT COUNT(*) AS n FROM trips WHERE company_id=? AND status='requested' AND manager_status<>'pending'", id),
      count("SELECT COUNT(*) AS n FROM leave_schedule WHERE company_id=? AND status='proposed'", id),
      count("SELECT COUNT(*) AS n FROM approval_requests WHERE company_id=? AND status IN ('pending','info')", id),
      db.prepare("SELECT name,probation_end FROM company_employees WHERE company_id=? AND status='active' AND probation_end<>'' AND probation_end BETWEEN ? AND ? ORDER BY probation_end").bind(id, today, soon).all<{ name: string; probation_end: string }>(),
      db.prepare("SELECT name,contract_end FROM company_employees WHERE company_id=? AND status='active' AND contract_end<>'' AND contract_end<=? ORDER BY contract_end LIMIT 50").bind(id, new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).all<{ name: string; contract_end: string }>().catch(() => ({ results: [] as { name: string; contract_end: string }[] })),
      db.prepare("SELECT id,name,profile FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; name: string; profile: string }>(),
      db.prepare("SELECT id,employee_id,subtype,name,expires FROM employee_documents WHERE company_id=? AND expires<>''").bind(id).all<{ id: string; employee_id: string; subtype: string; name: string; expires: string }>(),
      db.prepare("SELECT p.training_id,p.employee_id,t.title,p.valid_until FROM training_participants p JOIN trainings t ON t.id=p.training_id WHERE p.company_id=? AND p.valid_until<>''").bind(id).all<{ training_id: string; employee_id: string; title: string; valid_until: string }>(),
    ]);
    const parsed = people.results.map((p) => ({ id: p.id, name: p.name, profile: parseProfile(p.profile) }));
    const deadlines = deadlinesOf(parsed, [...docs.results.map((d) => ({ id: d.id, employeeId: d.employee_id, label: d.subtype || d.name, expires: d.expires })), ...certs.results.map((c) => ({ id: `cert-${c.training_id}-${c.employee_id}`, employeeId: c.employee_id, label: `Sertifikat: ${c.title}`, expires: c.valid_until }))], today, 30);
    const md = today.slice(5);
    const upcoming = parsed.filter((p) => /^\d{4}-\d{2}-\d{2}$/.test(p.profile.birthDate || "")).map((p) => ({ name: p.name, md: p.profile.birthDate.slice(5) })).filter((p) => (soon.slice(5) >= md ? p.md >= md && p.md <= soon.slice(5) : p.md >= md || p.md <= soon.slice(5))).sort((a, b) => a.md.localeCompare(b.md));
    const item = (key: string, label: string, n: number, link: string, level: "red" | "amber" | "info", detail: string[] = []) => ({ key, label, count: n, link, level, detail });
    const items = [
      item("apps", "İşçi ərizəsi cavab gözləyir", apps, "hr-orders", overdue ? "red" : "amber", overdue ? [`3 gündən çox gözləyən: ${overdue}`] : []),
      item("manager", "Rəhbərdə 2 gündən çox gözləyən ərizə", managerWaiting, "hr-orders", "amber"),
      item("changes", "Məlumat dəyişikliyi sorğusu", changes, "hr-approvals", "amber"),
      item("trips", "Ezamiyyət sorğusu HR qərarını gözləyir", trips, "hr-approvals", "amber"),
      item("plans", "Təklif olunmuş məzuniyyət qrafiki", plans, "hr-approvals", "info"),
      item("approvals", "Direktor/HR təsdiqi gözləyən sorğu", approvals, "hr-approvals", "amber"),
      item("probation", "Sınaq müddəti 14 gün ərzində bitir", probation.results.length, "hr-employees", "amber", probation.results.slice(0, 5).map((p) => `${p.name}: ${p.probation_end}`)),
      item("contracts", "Əmək müqaviləsi 30 gün ərzində bitir", contracts.results.length, "hr-employees", contracts.results.some((c) => c.contract_end < today) ? "red" : "amber", contracts.results.slice(0, 5).map((c) => `${c.name}: ${c.contract_end}${c.contract_end < today ? " (bitib)" : ""}`)),
      item("deadlines", "Sənəd və sertifikat müddəti 30 gün ərzində bitir", deadlines.length, "hr-people-ops", deadlines.some((d) => d.days < 0) ? "red" : "amber", deadlines.slice(0, 5).map((d) => `${d.employeeName}: ${d.what} — ${d.days < 0 ? "müddəti bitib" : `${d.days} gün`}`)),
      item("birthdays", "Yaxınlaşan ad günləri (14 gün)", upcoming.length, "hr-employees", "info", upcoming.slice(0, 6).map((p) => `${p.name}: ${p.md.slice(3)}.${p.md.slice(0, 2)}`)),
    ].filter((i) => i.count > 0);
    // The plan: people with no place, pay outside a band, temporary places that ended, free places with no vacancy, requests out of the plan.
    const month = today.slice(0, 7);
    const plan = await loadPlanData(db, id);
    if (plan.units.length) {
      const summary = summarize(plan.units, plan.people);
      const conflicts = bandConflicts(plan.units, plan.people);
      const assigned = assignPeople(plan.units, plan.people);
      const ended = plan.units.filter((u) => u.endMonth && u.endMonth < month && (assigned.byUnit.get(u.id)?.length || 0) > 0);
      const openVacancies = new Map(((await db.prepare("SELECT lower(COALESCE(json_extract(data,'$.department'),'')) AS department, COUNT(*) AS n FROM jobs WHERE owner=? AND status IN ('published','pending_approval') GROUP BY 1").bind(id).all<{ department: string; n: number }>()).results || []).map((r) => [r.department, Number(r.n)]));
      const idle = summary.departments.filter((d) => d.free > 0 && !(openVacancies.get(d.department.toLocaleLowerCase("az")) || 0));
      const exceptions = (await db.prepare("SELECT subject FROM approval_requests WHERE company_id=? AND status IN ('pending','info') AND payload LIKE '%\"exception\"%' ORDER BY created DESC LIMIT 5").bind(id).all<{ subject: string }>()).results;
      const exceptionCount = await count("SELECT COUNT(*) AS n FROM approval_requests WHERE company_id=? AND status IN ('pending','info') AND payload LIKE '%\"exception\"%'", id);
      const year = today.slice(0, 4);
      const planStatus = (await db.prepare("SELECT status FROM plan_year_state WHERE company_id=? AND year=?").bind(id, year).first<{ status: string }>().catch(() => null))?.status || "draft";
      const planOpen = planStatus === "draft";
      const lowPay = plan.units.filter((u) => u.salaryMax > 0 && u.salaryMin > 0 && u.salaryMin < 400);
      items.push(
        ...[
          item("unplaced", "Ştatda yeri olmayan işçi", summary.unplaced.length, "hr-planfact", "amber", summary.unplaced.slice(0, 5).map((p) => `${(p as { name?: string }).name || ""}: ${[p.department, p.position].filter(Boolean).join(" / ") || "departamentsiz"}`)),
          item("band", "Maaşı ştat həddindən kənar işçi", conflicts.length, "hr-planfact", "red", conflicts.slice(0, 5).map((c) => `${(c.person as { name?: string }).name || ""}: ${c.side === "above" ? "həddən yuxarı" : "həddən aşağı"}`)),
          item("ended-units", "Müddəti bitmiş müvəqqəti yerdə işçi var", ended.length, "hr-planfact", "amber", ended.slice(0, 5).map((u) => `${u.position || u.department}: ${u.endMonth} ayında bitib`)),
          item("idle-places", "Boş ştat yeri var, vakansiya açılmayıb", idle.length, "hr-jobs", "info", idle.slice(0, 5).map((d) => `${d.department || "Departamentsiz"}: ${d.free} boş yer`)),
          item("plan-requests", "Plandan kənar sorğu və ya departament təklifi gözləyir", exceptionCount, "hr-approvals", "amber", exceptions.map((e) => e.subject)),
          item("plan-draft", `${year} planı təsdiqlənməyib`, planOpen ? 1 : 0, "hr-planfact", "info", ["Plan təsdiqlənməyənədək qrafikdə plan xətti görünmür."]),
          item("low-pay", "Maaş həddi ölkə minimumundan aşağı olan ştat sətri", lowPay.length, "hr-planfact", "amber", lowPay.slice(0, 5).map((u) => `${u.position || u.department}: ${u.salaryMin} AZN`)),
        ].filter((i) => i.count > 0),
      );
    }
    return ok({ today, items });
  }
  if (request.method === "GET" && path === "company/skill-matrix") {
    requirePermission("salaries", "Bacarıq matrisini yalnız kadr işçisi görə bilər.");
    const people = (await db.prepare("SELECT id,name,position,department FROM company_employees WHERE company_id=? AND status IN ('active','leave') ORDER BY department,name").bind(id).all<{ id: string; name: string; position: string; department: string }>()).results;
    const planned = (await db.prepare("SELECT id,title,start_date,skill_id,skill_level FROM trainings WHERE company_id=? AND skill_id<>'' AND status='planned' ORDER BY start_date").bind(id).all<{ id: string; title: string; start_date: string; skill_id: string; skill_level: number }>()).results;
    return ok({ employees: people, ...(await skillMatrix(id, people.map((p) => p.id))), trainings: planned.map((t) => ({ id: t.id, title: t.title, start: t.start_date, skillId: t.skill_id, level: t.skill_level })) });
  }
  return undefined;
}
