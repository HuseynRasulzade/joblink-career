// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { EXIT_QUESTIONS, OFFBOARDING_ITEMS, checklistProgress, cleanChecklist, cleanAnswers as cleanExitAnswers } from "@/lib/offboarding";
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { employeePay } from "@/lib/payroll";
import { exitReasonLabel, exitTypeLabel } from "@/lib/workforce";
import { parseProfile } from "@/lib/employee-profile";
import { taxReduction } from "@/lib/employee-rights";
import { unusedLeaveCompensation } from "@/lib/hr-calc";
import { CaseRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_09(c: Pick<RouteCtx, "db" | "id" | "parseJson" | "path" | "request" | "requesterName" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { db, id, parseJson, path, request, requesterName, requirePermission, userId } = c;
  if (request.method === "GET" && path === "company/offboarding") {
    requirePermission("salaries", "Çıxış prosesini yalnız kadr işçisi görə bilər.");
    const cases = (await db.prepare("SELECT id,employee_id,status,planned_end,checklist,exit_interview,note,created,closed_at FROM offboarding_cases WHERE company_id=? ORDER BY status,created DESC LIMIT 300").bind(id).all<CaseRow>()).results;
    const people = new Map((await db.prepare("SELECT id,name,position,department,status,end_date,exit_type,exit_reason FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ id: string; name: string; position: string; department: string; status: string; end_date: string; exit_type: string; exit_reason: string }>()).results.map((p) => [p.id, p]));
    const held = new Map((await db.prepare("SELECT employee_id,COUNT(*) AS n FROM asset_assignments WHERE company_id=? AND returned_on='' GROUP BY employee_id").bind(id).all<{ employee_id: string; n: number }>()).results.map((r) => [r.employee_id, Number(r.n)]));
    const exitOrders = new Map<string, { number: string; status: string; kind: string }>();
    for (const o of (await db.prepare("SELECT employee_id,kind,number,status FROM employee_orders WHERE company_id=? AND kind IN ('termination','reduction') ORDER BY created").bind(id).all<{ employee_id: string; kind: string; number: string; status: string }>()).results) exitOrders.set(o.employee_id, { number: o.number, status: o.status, kind: o.kind });
    const bondRows = (await db.prepare("SELECT p.employee_id,t.title,p.bond_until,p.bond_cost_cents FROM training_participants p JOIN trainings t ON t.id=p.training_id WHERE p.company_id=? AND p.bond_until<>''").bind(id).all<{ employee_id: string; title: string; bond_until: string; bond_cost_cents: number }>()).results;
    const withoutCase = [...people.values()].filter((p) => p.status === "left" && !cases.some((c) => c.employee_id === p.id));
    // The last pay in advance: the unused main leave paid out when the contract ends (art. 143), worked out from the card.
    const payRows = cases.length ? (await db.prepare("SELECT id,start_date,end_date,vacation_days,vacation_used,salary_cents,salary_type,sector,profile FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ id: string; start_date: string; end_date: string; vacation_days: number; vacation_used: number; salary_cents: number; salary_type: string; sector: string; profile: string }>()).results : [];
    const finalPays = new Map<string, { unusedDays: number; dailyRate: number; compensation: number }>();
    const todayIso = new Date().toISOString().slice(0, 10);
    for (const c of cases) {
      const p = payRows.find((r) => r.id === c.employee_id);
      if (!p || !(p.salary_cents > 0)) continue;
      const gross = employeePay(p.salary_cents / 100, p.salary_type === "net" ? "net" : "gross", p.sector === "public" ? "public" : "private", taxReduction(parseProfile(p.profile), todayIso)).gross;
      const end = p.end_date || c.planned_end || todayIso;
      const unused = unusedLeaveCompensation({ hireDate: p.start_date || end, endDate: end, mainLeaveDays: p.vacation_days ?? 21, usedDays: p.vacation_used ?? 0, monthlyEarnings: [gross] });
      if (unused) finalPays.set(c.employee_id, { unusedDays: unused.unusedDays, dailyRate: unused.dailyRate, compensation: unused.compensation });
    }
    return ok({
      items: OFFBOARDING_ITEMS,
      questions: EXIT_QUESTIONS,
      cases: cases.map((c) => {
        const p = people.get(c.employee_id);
        const state = cleanChecklist(parseJson(c.checklist, {}));
        const endOf = p?.end_date || c.planned_end || new Date().toISOString().slice(0, 10);
        const bonds = bondRows.filter((x) => x.employee_id === c.employee_id && x.bond_until > endOf).map((x) => ({ title: x.title, until: x.bond_until, cost: x.bond_cost_cents / 100 }));
        return { exitOrder: exitOrders.get(c.employee_id) || null, finalPay: finalPays.get(c.employee_id) || null, bonds, id: c.id, employeeId: c.employee_id, name: p?.name || "", position: p?.position || "", department: p?.department || "", employeeStatus: p?.status || "", endDate: p?.end_date || c.planned_end, exitType: p?.exit_type ? exitTypeLabel(p.exit_type) : "", exitReason: p?.exit_reason ? exitReasonLabel(p.exit_reason) : "", status: c.status, plannedEnd: c.planned_end, checklist: state, progress: checklistProgress(state), answers: parseJson(c.exit_interview, {}), note: c.note, heldAssets: held.get(c.employee_id) || 0, closedAt: c.closed_at };
      }),
      withoutCase: withoutCase.map((p) => ({ id: p.id, name: p.name, position: p.position, department: p.department, endDate: p.end_date })),
      active: [...people.values()].filter((p) => p.status !== "left" && !cases.some((c) => c.employee_id === p.id && c.status === "open")).map((p) => ({ id: p.id, name: p.name, department: p.department })),
    });
  }
  if (request.method === "POST" && path === "company/offboarding/start") {
    requirePermission("salaries", "Çıxış prosesini yalnız kadr işçisi başlada bilər.");
    const b = await jsonBody(request);
    const employee = await db.prepare("SELECT id,name,end_date FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.employeeId, 100), id).first<{ id: string; name: string; end_date: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const planned = /^\d{4}-\d{2}-\d{2}$/.test(str(b.plannedEnd, 10)) ? str(b.plannedEnd, 10) : employee.end_date || "";
    const res = await db.prepare("INSERT OR IGNORE INTO offboarding_cases(id,company_id,employee_id,status,planned_end,created) VALUES(?,?,?,'open',?,?)").bind(crypto.randomUUID(), id, employee.id, planned, new Date().toISOString()).run();
    if (!res.meta.changes) throw new HttpError(409, "Bu işçi üçün çıxış prosesi artıq var.");
    await companyAudit(db, id, userId, "offboarding-started", employee.id, employee.name);
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/offboarding/check") {
    requirePermission("salaries", "Çıxış siyahısını yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const row = await db.prepare("SELECT id,checklist,status FROM offboarding_cases WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ id: string; checklist: string; status: string }>();
    if (!row) throw new HttpError(404, "Proses tapılmadı.");
    if (row.status === "closed") throw new HttpError(409, "Proses bağlanıb.");
    const item = str(b.item, 30);
    if (!OFFBOARDING_ITEMS.some((i) => i.id === item)) throw new HttpError(400, "Maddə tanınmadı.");
    const state = cleanChecklist(parseJson(row.checklist, {}));
    if (b.done === true) state[item] = { done: true, at: new Date().toISOString().slice(0, 10), by: await requesterName() };
    else delete state[item];
    await db.prepare("UPDATE offboarding_cases SET checklist=? WHERE id=? AND company_id=?").bind(JSON.stringify(state), row.id, id).run();
    return ok({ ok: true, progress: checklistProgress(state) });
  }
  if (request.method === "POST" && path === "company/offboarding/interview") {
    requirePermission("salaries", "Çıxış müsahibəsini yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const answers = cleanExitAnswers(b.answers);
    const res = await db.prepare("UPDATE offboarding_cases SET exit_interview=?,note=CASE WHEN ?<>'' THEN ? ELSE note END WHERE id=? AND company_id=?").bind(JSON.stringify(answers), str(b.note, 500), str(b.note, 500), str(b.id, 100), id).run();
    if (!res.meta.changes) throw new HttpError(404, "Proses tapılmadı.");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/offboarding/close") {
    requirePermission("salaries", "Çıxış prosesini yalnız kadr işçisi bağlaya bilər.");
    const b = await jsonBody(request);
    const row = await db.prepare("SELECT id,employee_id,checklist FROM offboarding_cases WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ id: string; employee_id: string; checklist: string }>();
    if (!row) throw new HttpError(404, "Proses tapılmadı.");
    const held = Number((await db.prepare("SELECT COUNT(*) AS n FROM asset_assignments WHERE company_id=? AND employee_id=? AND returned_on=''").bind(id, row.employee_id).first<{ n: number }>())?.n || 0);
    if (held > 0 && b.force !== true) throw new HttpError(409, `İşçidə ${held} şirkət əmlakı qalıb: əvvəl qaytarın və ya bağlamağı təsdiq edin.`);
    const progress = checklistProgress(cleanChecklist(parseJson(row.checklist, {})));
    if (progress.done < progress.total && b.force !== true) throw new HttpError(409, `Siyahının ${progress.total - progress.done} maddəsi tamamlanmayıb. Yenə də bağlamaq üçün təsdiq edin.`);
    await db.prepare("UPDATE offboarding_cases SET status='closed',closed_at=? WHERE id=? AND company_id=?").bind(new Date().toISOString(), row.id, id).run();
    await companyAudit(db, id, userId, "offboarding-closed", row.employee_id, "");
    return ok({ ok: true });
  }
  return undefined;
}
