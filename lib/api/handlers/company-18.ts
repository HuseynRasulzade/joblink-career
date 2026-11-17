// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { EXPENSE_CATEGORY_IDS } from "@/lib/hr-expenses";
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_18(c: Pick<RouteCtx, "BUDGET_CATEGORIES" | "assertYearOpen" | "canAct" | "db" | "hrFundReport" | "id" | "path" | "queueApproval" | "request" | "requestUrl" | "requirePermission" | "setYearPlan" | "userId" | "yearPlanState">): Promise<Response | undefined> {
  const { BUDGET_CATEGORIES, assertYearOpen, canAct, db, hrFundReport, id, path, queueApproval, request, requestUrl, requirePermission, setYearPlan, userId, yearPlanState } = c;
  if (request.method === "GET" && path === "company/plan-fact/state") {
    requirePermission("salaries", "Planı yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const y = str(requestUrl.searchParams.get("year"), 4);
    return ok({ ...(await yearPlanState(/^\d{4}$/.test(y) ? y : new Date().toISOString().slice(0, 4))), canApprove: canAct("approve-director") });
  }
  if (request.method === "POST" && path === "company/plan-fact/submit") {
    requirePermission("salaries", "Planı yalnız HR, direktor və hesab sahibi təsdiqə göndərə bilər.");
    const b = await jsonBody(request);
    const year = str(b.year, 4);
    if (!/^\d{4}$/.test(year)) throw new HttpError(400, "İl düzgün deyil.");
    const st = await yearPlanState(year);
    if (st.status !== "draft") throw new HttpError(409, st.status === "approved" ? "Plan artıq təsdiqlənib." : "Plan artıq təsdiqə göndərilib.");
    const counts = await Promise.all([
      db.prepare("SELECT COUNT(*) AS n FROM budget_lines WHERE company_id=? AND month LIKE ? AND kind='budget'").bind(id, `${year}-%`).first<{ n: number }>(),
      db.prepare("SELECT COUNT(*) AS n FROM staff_units WHERE company_id=?").bind(id).first<{ n: number }>().catch(() => ({ n: 0 })),
    ]);
    if (!Number(counts[0]?.n) && !Number(counts[1]?.n)) throw new HttpError(400, `${year} üçün nə büdcə, nə də ştat planı (işçi sayı) yazılıb.`);
    if (canAct("approve-director")) {
      await setYearPlan(year, "approved", userId);
      await companyAudit(db, id, userId, "year-plan-approved", year, `${year} planı təsdiqləndi`);
      return ok({ ok: true, status: "approved" });
    }
    await setYearPlan(year, "pending", userId);
    await queueApproval("headcount", `${year} planının təsdiqi (işçi sayı və büdcə)`, { approveYearPlan: year });
    return ok({ ok: true, status: "pending" });
  }
  if (request.method === "POST" && path === "company/plan-fact/reopen") {
    requirePermission("salaries", "Planı yalnız əmək haqqı icazəsi olan şəxs aça bilər.");
    if (!canAct("approve-director")) throw new HttpError(403, "Təsdiqlənmiş planı yalnız direktor (təsdiq səlahiyyəti olan şəxs) redaktə üçün aça bilər.");
    const b = await jsonBody(request);
    const year = str(b.year, 4);
    if (!/^\d{4}$/.test(year)) throw new HttpError(400, "İl düzgün deyil.");
    await setYearPlan(year, "draft", userId);
    await companyAudit(db, id, userId, "year-plan-reopened", year, `${year} planı redaktə üçün açıldı`);
    return ok({ ok: true, status: "draft" });
  }
  if (request.method === "POST" && path === "company/budget-plan/clear") {
    requirePermission("salaries", "Büdcəni yalnız əmək haqqı icazəsi olan şəxs silə bilər.");
    const b = await jsonBody(request);
    const year = str(b.year, 4);
    const category = String(b.category ?? "");
    if (!/^\d{4}$/.test(year) || !BUDGET_CATEGORIES.includes(category)) throw new HttpError(400, "İl və ya büdcə növü düzgün deyil.");
    await assertYearOpen(year);
    await db.prepare("DELETE FROM budget_lines WHERE company_id=? AND month LIKE ? AND category=?").bind(id, `${year}-%`, category).run();
    await companyAudit(db, id, userId, "budget-plan-cleared", year, `${year}: ${category} büdcəsi silindi`);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/budget-plan") {
    requirePermission("salaries", "Büdcə planını yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const report = (await hrFundReport()) as { year: string; monthly: { month: string; department: string; gross: number }[]; departments: { department: string; monthlyFund: number }[] };
    const year = report.year;
    const nowMonth = new Date().toISOString().slice(0, 7);
    const lines = (await db.prepare("SELECT month,department,category,kind,amount FROM budget_lines WHERE company_id=? AND month LIKE ? ORDER BY month").bind(id, `${year}-%`).all<{ month: string; department: string; category: string; kind: string; amount: number }>().catch(() => ({ results: [] as { month: string; department: string; category: string; kind: string; amount: number }[] }))).results;
    type Fact = { month: string; department: string; amount: number; estimate: boolean; state: "paid" | "ordered" | "approved" | "estimate" };
    const facts: Record<string, Fact[]> = { payroll: [], training: [], ...Object.fromEntries(EXPENSE_CATEGORY_IDS.map((c) => [c, [] as Fact[]])) };
    const approvedMonths = new Set(report.monthly.map((m) => m.month));
    for (const m of report.monthly) facts.payroll.push({ month: m.month, department: m.department, amount: m.gross, estimate: false, state: "paid" });
    // A month that is not approved yet (up to this month) is shown at today's pay fund, marked as an estimate.
    for (let i = 1; i <= 12; i++) {
      const month = `${year}-${String(i).padStart(2, "0")}`;
      if (month > nowMonth || approvedMonths.has(month)) continue;
      for (const d of report.departments) if (d.monthlyFund > 0) facts.payroll.push({ month, department: d.department, amount: Math.round(d.monthlyFund * 100) / 100, estimate: true, state: "estimate" });
    }
    const [tr, parts, emps] = await Promise.all([
      db.prepare("SELECT id,start_date,cost_cents,status FROM trainings WHERE company_id=? AND start_date LIKE ? AND status<>'cancelled'").bind(id, `${year}-%`).all<{ id: string; start_date: string; cost_cents: number; status: string }>(),
      db.prepare("SELECT training_id,employee_id FROM training_participants WHERE company_id=?").bind(id).all<{ training_id: string; employee_id: string }>(),
      db.prepare("SELECT id,department FROM company_employees WHERE company_id=?").bind(id).all<{ id: string; department: string }>(),
    ]);
    const deptOfEmp = new Map(emps.results.map((e) => [e.id, e.department || "Departamentsiz"]));
    const byTraining = new Map<string, string[]>();
    for (const p of parts.results) byTraining.set(p.training_id, [...(byTraining.get(p.training_id) || []), deptOfEmp.get(p.employee_id) || "Departamentsiz"]);
    const trainingSum = new Map<string, Fact>();
    for (const t of tr.results) {
      const month = t.start_date.slice(0, 7);
      const people = byTraining.get(t.id) || [];
      const shares = people.length ? people : [""];
      for (const dept of shares) {
        const k = `${month}|${dept}`;
        const cur = trainingSum.get(k) || { month, department: dept, amount: 0, estimate: false, state: "paid" as const };
        cur.amount += t.cost_cents / 100 / shares.length;
        if (t.status !== "done") {
          cur.estimate = true;
          cur.state = "estimate";
        }
        trainingSum.set(k, cur);
      }
    }
    facts.training = [...trainingSum.values()].map((f) => ({ ...f, amount: Math.round(f.amount * 100) / 100 }));
    // Earlier hand-written hiring actuals still count; every other HR cost comes from the expense register (approved and paid).
    facts.hiring = lines.filter((l) => l.category === "hiring" && l.kind === "actual").map((l) => ({ month: l.month, department: l.department, amount: l.amount, estimate: false, state: "paid" as const }));
    const spent = (await db.prepare("SELECT category,department,expense_date,amount,status FROM hr_expenses WHERE company_id=? AND expense_date LIKE ? AND status IN ('approved','ordered','paid')").bind(id, `${year}-%`).all<{ category: string; department: string; expense_date: string; amount: number; status: string }>().catch(() => ({ results: [] as { category: string; department: string; expense_date: string; amount: number; status: string }[] }))).results;
    for (const e of spent) (facts[e.category] ||= []).push({ month: e.expense_date.slice(0, 7), department: e.department, amount: e.amount, estimate: e.status !== "paid", state: e.status === "paid" ? "paid" : e.status === "ordered" ? "ordered" : "approved" });
    const names = new Set<string>(report.departments.map((d) => d.department));
    for (const l of lines) if (l.department) names.add(l.department);
    return ok({ state: await yearPlanState(year), canApprove: canAct("approve-director"), year, nowMonth, departments: [...names].sort((a, b) => a.localeCompare(b, "az")), budgets: lines.filter((l) => l.kind === "budget"), facts });
  }
  if (request.method === "POST" && path === "company/budget-plan/save") {
    requirePermission("salaries", "Büdcəni yalnız əmək haqqı icazəsi olan şəxs yaza bilər.");
    const b = await jsonBody(request);
    const list = (Array.isArray(b.lines) ? b.lines : []).slice(0, 600) as { month?: unknown; department?: unknown; category?: unknown; kind?: unknown; amount?: unknown }[];
    if (!list.length) throw new HttpError(400, "Büdcə yazılmayıb.");
    for (const y of new Set(list.map((t) => String(t.month ?? "").slice(0, 4)))) if (/^\d{4}$/.test(y)) await assertYearOpen(y);
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];
    for (const t of list) {
      const month = String(t.month ?? "");
      const category = String(t.category ?? "");
      const kind = t.kind === "actual" ? "actual" : "budget";
      const department = str(t.department, 120).trim();
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, `Ay düzgün deyil: “${month}”.`);
      if (!BUDGET_CATEGORIES.includes(category)) throw new HttpError(400, "Büdcə növü tanınmadı.");
      if (kind === "actual" && category !== "hiring") throw new HttpError(400, "Faktı yalnız işə qəbul xərcləri üçün əl ilə yazmaq olar; qalanı platformadan gəlir.");
      if (t.amount === null || t.amount === "") {
        statements.push(db.prepare("DELETE FROM budget_lines WHERE company_id=? AND month=? AND department=? AND category=? AND kind=?").bind(id, month, department, category, kind));
        continue;
      }
      const amount = Math.round(Number(t.amount) * 100) / 100;
      if (!Number.isFinite(amount) || amount < 0 || amount > 1e10) throw new HttpError(400, `${month}: məbləğ düzgün deyil.`);
      statements.push(db.prepare("INSERT INTO budget_lines(company_id,month,department,category,kind,amount,updated,updated_by) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(company_id,month,department,category,kind) DO UPDATE SET amount=excluded.amount,updated=excluded.updated,updated_by=excluded.updated_by").bind(id, month, department, category, kind, amount, now, userId));
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "budget-plan", "", `${list.length} büdcə sətri yazıldı`);
    return ok({ ok: true });
  }
  return undefined;
}
