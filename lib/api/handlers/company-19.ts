// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_IDS, type ExpenseStatus, PAY_METHODS, budgetProblem, canMove } from "@/lib/hr-expenses";
import { ORDER_COLUMNS as EXPENSE_ORDER_COLUMNS, integrationSetting, logIntegration, orderExpense, pushWebhook, recordPaid } from "@/lib/expense-ops";
import { HttpError, jsonBody, str } from "@/lib/server";
import { type OrderRow } from "@/lib/integration";
import { companyAudit } from "@/lib/api-core";
import { ExpenseDbRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_19(c: Pick<RouteCtx, "canAct" | "categoryLabel" | "db" | "expenseRow" | "heldBudget" | "id" | "path" | "request" | "requestUrl" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { canAct, categoryLabel, db, expenseRow, heldBudget, id, path, request, requestUrl, requirePermission, userId } = c;
  if (request.method === "GET" && path === "company/hr-expenses") {
    requirePermission("salaries", "HR xərclərini yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const y = str(requestUrl.searchParams.get("year"), 4);
    const year = /^\d{4}$/.test(y) ? y : new Date().toISOString().slice(0, 4);
    const rows = (await db.prepare("SELECT * FROM hr_expenses WHERE company_id=? AND expense_date LIKE ? ORDER BY expense_date DESC, created DESC LIMIT 1000").bind(id, `${year}-%`).all<ExpenseDbRow>().catch(() => ({ results: [] as ExpenseDbRow[] }))).results;
    const budgets = (await db.prepare("SELECT category,SUM(amount) AS s FROM budget_lines WHERE company_id=? AND month LIKE ? AND kind='budget' GROUP BY category").bind(id, `${year}-%`).all<{ category: string; s: number }>().catch(() => ({ results: [] as { category: string; s: number }[] }))).results;
    const categories = EXPENSE_CATEGORIES.map((c) => {
      const mine = rows.filter((r) => r.category === c.id);
      const budget = Number(budgets.find((b) => b.category === c.id)?.s) || 0;
      const held = mine.filter((r) => r.status !== "cancelled").reduce((t, r) => t + r.amount, 0);
      const sum = (status: string) => Math.round(mine.filter((r) => r.status === status).reduce((t, r) => t + r.amount, 0) * 100) / 100;
      return { id: c.id, label: c.label, hint: c.hint, budget, held: Math.round(held * 100) / 100, paid: sum("paid"), ordered: sum("ordered"), left: Math.round((budget - held) * 100) / 100 };
    });
    const people = (await db.prepare("SELECT id,name,department FROM company_employees WHERE company_id=? AND status IN ('active','leave') ORDER BY name").bind(id).all<{ id: string; name: string; department: string }>()).results;
    const departments = [...new Set([...people.map((p) => p.department).filter(Boolean), ...rows.map((r) => r.department).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "az"));
    return ok({ year, expenses: rows.map(expenseRow), categories, employees: people, departments, canApprove: canAct("approve-director"), ordersEnabled: (await integrationSetting(db, id, "orders_enabled")) === "1" });
  }
  if (request.method === "POST" && path === "company/hr-expenses/save") {
    requirePermission("salaries", "HR xərcini yalnız əmək haqqı icazəsi olan şəxs yaza bilər.");
    const b = await jsonBody(request);
    const expenseId = str(b.id, 100);
    const category = String(b.category ?? "");
    if (!EXPENSE_CATEGORY_IDS.includes(category)) throw new HttpError(400, "Xərc növü tanınmadı.");
    const title = str(b.title, 200).trim();
    if (!title) throw new HttpError(400, "Xərcin adını yazın.");
    const amount = Math.round((Number(b.amount) || 0) * 100) / 100;
    if (!(amount > 0) || amount > 1e9) throw new HttpError(400, "Məbləğ müsbət rəqəm olmalıdır.");
    const date = str(b.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Xərcin tarixini seçin.");
    const existing = expenseId ? await db.prepare("SELECT status FROM hr_expenses WHERE id=? AND company_id=?").bind(expenseId, id).first<{ status: string }>() : null;
    if (expenseId && !existing) throw new HttpError(404, "Xərc tapılmadı.");
    if (existing && existing.status !== "planned") throw new HttpError(409, "Yalnız “planlaşdırılıb” vəziyyətindəki xərci dəyişmək olar.");
    const year = date.slice(0, 4);
    const fit = budgetProblem(categoryLabel(category), year, ...(await (async () => { const h = await heldBudget(category, year, expenseId); return [h.budget, h.held, amount] as const; })()));
    if (fit) throw new HttpError(409, fit);
    const employeeId = str(b.employeeId, 100);
    if (employeeId && !(await db.prepare("SELECT 1 AS x FROM company_employees WHERE id=? AND company_id=?").bind(employeeId, id).first())) throw new HttpError(404, "İşçi tapılmadı.");
    const now = new Date().toISOString();
    const row = [category, title, str(b.department, 120).trim(), employeeId, amount, date, str(b.payee, 200).trim(), str(b.note, 500).trim()] as const;
    if (existing) {
      await db.prepare("UPDATE hr_expenses SET category=?,title=?,department=?,employee_id=?,amount=?,expense_date=?,payee=?,note=?,updated=? WHERE id=? AND company_id=?").bind(...row, now, expenseId, id).run();
      await companyAudit(db, id, userId, "hr-expense", expenseId, `${title}: ${amount}`);
      return ok({ ok: true, id: expenseId });
    }
    const created = crypto.randomUUID();
    await db.prepare("INSERT INTO hr_expenses(id,company_id,category,title,department,employee_id,amount,expense_date,payee,note,status,created_by,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,'planned',?,?,?)").bind(created, id, ...row, userId, now, now).run();
    await companyAudit(db, id, userId, "hr-expense", created, `${title}: ${amount}`);
    return ok({ ok: true, id: created });
  }
  if (request.method === "POST" && path === "company/hr-expenses/move") {
    requirePermission("salaries", "HR xərcini yalnız əmək haqqı icazəsi olan şəxs idarə edə bilər.");
    const b = await jsonBody(request);
    const expenseId = str(b.id, 100);
    const to = String(b.to ?? "") as ExpenseStatus;
    const row = await db.prepare("SELECT * FROM hr_expenses WHERE id=? AND company_id=?").bind(expenseId, id).first<ExpenseDbRow>();
    if (!row) throw new HttpError(404, "Xərc tapılmadı.");
    if (!canMove(row.status as ExpenseStatus, to)) throw new HttpError(409, "Bu vəziyyətdən həmin vəziyyətə keçmək olmaz.");
    const now = new Date().toISOString();
    let event = "";
    if (to === "approved" && row.status === "planned") {
      if (!canAct("approve-director")) throw new HttpError(403, "Xərci yalnız direktor (təsdiq səlahiyyəti olan şəxs) təsdiqləyir.");
      const h = await heldBudget(row.category, row.expense_date.slice(0, 4), expenseId);
      const fit = budgetProblem(categoryLabel(row.category), row.expense_date.slice(0, 4), h.budget, h.held, row.amount);
      if (fit) throw new HttpError(409, fit);
      await db.prepare("UPDATE hr_expenses SET status='approved',approved_by=?,updated=? WHERE id=? AND company_id=?").bind(userId, now, expenseId, id).run();
      // Where an outside program is connected, the approved expense drops into it as an order at once.
      if ((await integrationSetting(db, id, "orders_enabled")) === "1") {
        await orderExpense(db, id, expenseId);
        event = "order.created";
      }
    } else if (to === "ordered") {
      await orderExpense(db, id, expenseId);
      event = "order.created";
    } else if (to === "paid") {
      const paidOn = str(b.paidOn, 10);
      const method = String(b.method ?? "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) throw new HttpError(400, "Ödəniş tarixini seçin.");
      if (!(PAY_METHODS as readonly string[]).includes(method)) throw new HttpError(400, "Ödəniş üsulunu seçin.");
      await recordPaid(db, id, expenseId, { paidOn, method, payFrom: str(b.payFrom, 200).trim(), payRef: str(b.payRef, 200).trim() });
      event = row.order_no ? "order.paid" : "";
    } else if (to === "approved" && row.status === "paid") {
      if (!canAct("approve-director")) throw new HttpError(403, "Ödənişi yalnız direktor geri qaytara bilər.");
      // A paid order goes back to “ordered”; an expense that never had an order goes back to “approved”.
      await db.prepare("UPDATE hr_expenses SET status=?,paid_on='',pay_method='',pay_from='',pay_ref='',updated=? WHERE id=? AND company_id=?").bind(row.order_no ? "ordered" : "approved", now, expenseId, id).run();
      event = row.order_no ? "order.payment_reverted" : "";
    } else if (to === "approved" && row.status === "ordered") {
      await db.prepare("UPDATE hr_expenses SET status='approved',ordered_at='',updated=? WHERE id=? AND company_id=?").bind(now, expenseId, id).run();
      event = "order.withdrawn";
    } else if (to === "planned" && row.status === "cancelled") {
      const h = await heldBudget(row.category, row.expense_date.slice(0, 4), expenseId);
      const fit = budgetProblem(categoryLabel(row.category), row.expense_date.slice(0, 4), h.budget, h.held, row.amount);
      if (fit) throw new HttpError(409, fit);
      await db.prepare("UPDATE hr_expenses SET status='planned',updated=? WHERE id=? AND company_id=?").bind(now, expenseId, id).run();
    } else {
      await db.prepare("UPDATE hr_expenses SET status=?,approved_by=CASE WHEN ?='planned' THEN '' ELSE approved_by END,updated=? WHERE id=? AND company_id=?").bind(to, to, now, expenseId, id).run();
      event = to === "cancelled" && row.order_no ? "order.cancelled" : "";
    }
    await companyAudit(db, id, userId, "hr-expense-status", expenseId, `${row.title}: ${row.status} → ${to}`);
    // Telling the outside program is best effort: a failure is logged and never undoes the change.
    if (event) {
      try {
        const changed = await db.prepare(`SELECT ${EXPENSE_ORDER_COLUMNS} FROM hr_expenses WHERE id=? AND company_id=?`).bind(expenseId, id).first<OrderRow>();
        if (changed) await pushWebhook(db, id, event, changed);
      } catch (error) {
        await logIntegration(db, id, "out", "webhook", event, row.order_no, false, error instanceof Error ? `${error.message} ${String(error.stack || "").slice(0, 160)}` : "Göndərilmədi");
      }
    }
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/hr-expenses/delete") {
    requirePermission("salaries", "HR xərcini yalnız əmək haqqı icazəsi olan şəxs silə bilər.");
    const b = await jsonBody(request);
    const expenseId = str(b.id, 100);
    const row = await db.prepare("SELECT title,status FROM hr_expenses WHERE id=? AND company_id=?").bind(expenseId, id).first<{ title: string; status: string }>();
    if (!row) throw new HttpError(404, "Xərc tapılmadı.");
    if (row.status !== "planned" && row.status !== "cancelled") throw new HttpError(409, "Yalnız planlaşdırılmış və ya ləğv edilmiş xərci silmək olar. Təsdiqlənmiş xərci əvvəl ləğv edin.");
    await db.prepare("DELETE FROM hr_expenses WHERE id=? AND company_id=?").bind(expenseId, id).run();
    await companyAudit(db, id, userId, "hr-expense-deleted", expenseId, row.title);
    return ok({ ok: true });
  }
  return undefined;
}
