// Database side of the exchange with the outside programs, used by the platform's own pages and by the integration address:
// order numbers, ordering an approved expense, recording its payment, the log of calls and the web address that is told about changes.
import { EXPENSE_CATEGORIES } from "./hr-expenses.ts";
import { orderNumber, orderView, parseOrderNumber, safeWebhookUrl, signBody, type OrderRow } from "./integration.ts";

export const categoryLabel = (id: string) => EXPENSE_CATEGORIES.find((c) => c.id === id)?.label || id;
export const ORDER_COLUMNS = "id,order_no,status,category,title,department,amount,expense_date,payee,note,ordered_at,paid_on,pay_method,pay_ref,external_id";

export async function integrationSetting(db: D1Database, companyId: string, key: string): Promise<string> {
  const row = await db.prepare("SELECT value FROM hr_settings WHERE company_id=? AND key=?").bind(companyId, `integration_${key}`).first<{ value: string }>().catch(() => null);
  return row?.value || "";
}
export async function setIntegrationSetting(db: D1Database, companyId: string, key: string, value: string) {
  await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(companyId, `integration_${key}`, value).run();
}

export async function logIntegration(db: D1Database, companyId: string, direction: "in" | "out", actor: string, action: string, ref: string, ok: boolean, message = "") {
  try {
    await db.prepare("INSERT INTO integration_log(id,company_id,at,direction,actor,action,ref,ok,message) VALUES(?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), companyId, new Date().toISOString(), direction, actor.slice(0, 80), action.slice(0, 60), ref.slice(0, 80), ok ? 1 : 0, message.slice(0, 300)).run();
    await db.prepare("DELETE FROM integration_log WHERE company_id=? AND at<?").bind(companyId, new Date(Date.now() - 60 * 86_400_000).toISOString()).run();
  } catch {
    // The log never breaks the work.
  }
}

async function nextOrderNo(db: D1Database, companyId: string, year: string): Promise<string> {
  const last = await db.prepare("SELECT order_no FROM hr_expenses WHERE company_id=? AND order_no LIKE ? ORDER BY order_no DESC LIMIT 1").bind(companyId, `JL-${year}-%`).first<{ order_no: string }>();
  return orderNumber(year, (parseOrderNumber(last?.order_no || "")?.sequence || 0) + 1);
}

// An approved expense becomes an order of the outside program (it keeps its number if it had one).
export async function orderExpense(db: D1Database, companyId: string, expenseId: string): Promise<OrderRow> {
  const row = await db.prepare(`SELECT ${ORDER_COLUMNS} FROM hr_expenses WHERE id=? AND company_id=?`).bind(expenseId, companyId).first<OrderRow>();
  if (!row) throw new Error("Xərc tapılmadı.");
  const now = new Date().toISOString();
  for (let attempt = 0; attempt < 3; attempt++) {
    const no = row.order_no || (await nextOrderNo(db, companyId, row.expense_date.slice(0, 4)));
    try {
      await db.prepare("UPDATE hr_expenses SET status='ordered',order_no=?,ordered_at=?,updated=? WHERE id=? AND company_id=?").bind(no, now, now, expenseId, companyId).run();
      return { ...row, status: "ordered", order_no: no, ordered_at: now };
    } catch (error) {
      if (attempt === 2) throw error;
      row.order_no = "";
    }
  }
  return row;
}

// The web address (when the company set one) is told about a change; a failure is logged and never stops the work.
export async function pushWebhook(db: D1Database, companyId: string, event: string, row: OrderRow): Promise<void> {
  const url = safeWebhookUrl(await integrationSetting(db, companyId, "webhook_url"));
  if (!url) return;
  const secret = await integrationSetting(db, companyId, "webhook_secret");
  const body = JSON.stringify({ event, at: new Date().toISOString(), order: orderView(row, categoryLabel) });
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", "x-joblink-event": event, ...(secret ? { "x-joblink-signature": `sha256=${await signBody(secret, body)}` } : {}) },
      body,
      signal: AbortSignal.timeout(5000),
      redirect: "manual",
    });
    await logIntegration(db, companyId, "out", "webhook", event, row.order_no, response.ok, response.ok ? "" : `HTTP ${response.status}`);
  } catch (error) {
    await logIntegration(db, companyId, "out", "webhook", event, row.order_no, false, error instanceof Error ? error.message : "Göndərilmədi");
  }
}

export type PaidReport = { paidOn: string; method: string; payFrom: string; payRef: string };
export async function recordPaid(db: D1Database, companyId: string, expenseId: string, report: PaidReport): Promise<void> {
  const now = new Date().toISOString();
  await db.prepare("UPDATE hr_expenses SET status='paid',paid_on=?,pay_method=?,pay_from=?,pay_ref=?,updated=? WHERE id=? AND company_id=?").bind(report.paidOn, report.method, report.payFrom, report.payRef, now, expenseId, companyId).run();
}
