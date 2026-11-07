// The exchange with outside programs (1C, SAP, any ERP or accounting system), authorised by the company's own API key:
//   Authorization: Bearer jl_…
//   GET  /api/integration/v1/ping
//   GET  /api/integration/v1/orders?status=ordered|approved|paid|all&since=ISO&limit=
//   GET  /api/integration/v1/orders/{orderNo | externalId}
//   POST /api/integration/v1/orders/{orderNo | externalId}/paid     {paidOn, amount?, method?, payFrom?, ref?}
//   POST /api/integration/v1/orders/{orderNo}/reject                {reason}
//   POST /api/integration/v1/expenses                               {externalId, category, title, amount, date, paidOn?, …}
//   GET  /api/integration/v1/budget?year=
import { runtime } from "@/lib/server";
import { EXPENSE_CATEGORY_IDS, PAY_METHODS } from "@/lib/hr-expenses";
import { hashApiKey, looksLikeApiKey, orderView, paidReportProblem, type OrderRow } from "@/lib/integration";
import { ORDER_COLUMNS, categoryLabel, logIntegration, recordPaid } from "@/lib/expense-ops";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status: number, message: string) => json({ error: message }, status);
const money = (v: unknown) => Math.round((Number(v) || 0) * 100) / 100;
const date = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");

async function handle(request: Request): Promise<Response> {
  const db = runtime().DB;
  if (!db) return fail(503, "Məlumat bazası hazır deyil.");
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/integration\/v1\/?/, "").replace(/\/+$/, "");
  if (!url.pathname.startsWith("/api/integration/v1")) return fail(404, "Ünvan tapılmadı. /api/integration/v1/… istifadə edin.");

  const bearer = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") || "")?.[1] || "";
  if (!looksLikeApiKey(bearer)) return fail(401, "Açar yoxdur və ya yanlışdır (Authorization: Bearer jl_…).");
  const key = await db.prepare("SELECT id,company_id,name,system,revoked FROM integration_keys WHERE key_hash=?").bind(await hashApiKey(bearer)).first<{ id: string; company_id: string; name: string; system: string; revoked: string }>();
  if (!key || key.revoked) return fail(401, "Açar yoxdur və ya yanlışdır (Authorization: Bearer jl_…).");
  const companyId = key.company_id;
  const actor = `${key.name} (${key.system})`;
  const minute = new Date(Date.now() - 60_000).toISOString();
  const recent = await db.prepare("SELECT COUNT(*) AS n FROM integration_log WHERE company_id=? AND direction='in' AND actor=? AND at>=?").bind(companyId, actor, minute).first<{ n: number }>();
  if (Number(recent?.n) >= 120) return fail(429, "Dəqiqədə ən çox 120 sorğu. Bir az gözləyin.");
  await db.prepare("UPDATE integration_keys SET last_used=? WHERE id=?").bind(new Date().toISOString(), key.id).run();

  const view = (r: OrderRow) => orderView(r, categoryLabel);
  const find = async (ref: string) =>
    db.prepare(`SELECT ${ORDER_COLUMNS} FROM hr_expenses WHERE company_id=? AND (order_no=? OR (external_id<>'' AND external_id=?))`).bind(companyId, ref.toUpperCase(), ref).first<OrderRow>();
  const body = async () => {
    try {
      const data = (await request.json()) as unknown;
      return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  };
  const log = (action: string, ref: string, ok: boolean, message = "") => logIntegration(db, companyId, "in", actor, action, ref, ok, message);

  if (request.method === "GET" && path === "ping") {
    await log("ping", "", true);
    return json({ ok: true, system: key.system, time: new Date().toISOString() });
  }
  if (request.method === "GET" && path === "orders") {
    const status = url.searchParams.get("status") || "ordered";
    if (!["ordered", "approved", "paid", "all"].includes(status)) return fail(400, "status: ordered, approved, paid və ya all.");
    const since = url.searchParams.get("since") || "";
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get("limit")) || 200));
    const rows = (await db.prepare(`SELECT ${ORDER_COLUMNS} FROM hr_expenses WHERE company_id=? AND source<>'erp' AND order_no<>'' AND (?='all' OR status=?) AND updated>=? ORDER BY order_no LIMIT ?`).bind(companyId, status, status, since, limit).all<OrderRow>()).results;
    await log("orders.list", status, true, `${rows.length}`);
    return json({ orders: rows.map(view) });
  }
  const one = /^orders\/([^/]+)(?:\/(paid|reject))?$/.exec(path);
  if (one) {
    const ref = decodeURIComponent(one[1]);
    const action = one[2] || "";
    const order = await find(ref);
    if (!order) {
      await log(`orders.${action || "get"}`, ref, false, "tapılmadı");
      return fail(404, "Sifariş tapılmadı.");
    }
    if (request.method === "GET" && !action) {
      await log("orders.get", ref, true);
      return json({ order: view(order) });
    }
    if (request.method === "POST" && action === "paid") {
      const b = await body();
      const problem = paidReportProblem(order, b);
      if (problem) {
        await log("orders.paid", ref, false, problem);
        return fail(409, problem);
      }
      const method = (PAY_METHODS as readonly string[]).includes(String(b.method)) ? String(b.method) : "bank";
      await recordPaid(db, companyId, order.id, { paidOn: String(b.paidOn), method, payFrom: String(b.payFrom ?? actor).slice(0, 200), payRef: String(b.ref ?? "").slice(0, 200) });
      await log("orders.paid", ref, true, String(b.paidOn));
      return json({ ok: true, order: view({ ...order, status: "paid", paid_on: String(b.paidOn), pay_method: method, pay_ref: String(b.ref ?? "") }) });
    }
    if (request.method === "POST" && action === "reject") {
      const b = await body();
      if (order.status !== "ordered") {
        await log("orders.reject", ref, false, "vəziyyət");
        return fail(409, "Yalnız sifarişdə olan sifariş geri qaytarıla bilər.");
      }
      const reason = String(b.reason ?? "").slice(0, 300);
      await db.prepare("UPDATE hr_expenses SET status='approved',ordered_at='',note=CASE WHEN ?<>'' THEN substr(note || ' [' || ? || ': imtina — ' || ? || ']',1,500) ELSE note END,updated=? WHERE id=? AND company_id=?").bind(reason, key.name, reason, new Date().toISOString(), order.id, companyId).run();
      await log("orders.reject", ref, true, reason);
      return json({ ok: true });
    }
    return fail(405, "Bu ünvan üçün metod düzgün deyil.");
  }
  // A cost that was born in the outside program: written as an expense with its own number there.
  if (request.method === "POST" && path === "expenses") {
    const b = await body();
    const externalId = String(b.externalId ?? "").trim().slice(0, 100);
    const category = String(b.category ?? "");
    const title = String(b.title ?? "").trim().slice(0, 200);
    const amount = money(b.amount);
    const day = date(b.date);
    const paidOn = b.paidOn ? date(b.paidOn) : "";
    const reason = !externalId ? "externalId yazılmayıb." : !EXPENSE_CATEGORY_IDS.includes(category) ? `category: ${EXPENSE_CATEGORY_IDS.join(", ")}.` : !title ? "title yazılmayıb." : !(amount > 0) ? "amount müsbət rəqəm olmalıdır." : !day ? "date YYYY-MM-DD olmalıdır." : b.paidOn && !paidOn ? "paidOn YYYY-MM-DD olmalıdır." : "";
    if (reason) {
      await log("expenses.create", externalId, false, reason);
      return fail(400, reason);
    }
    const existing = await find(externalId);
    if (existing) {
      await log("expenses.create", externalId, true, "təkrar");
      return json({ ok: true, created: false, order: view(existing) });
    }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const status = paidOn ? "paid" : "ordered";
    await db.prepare("INSERT INTO hr_expenses(id,company_id,category,title,department,employee_id,amount,expense_date,payee,note,status,paid_on,pay_method,pay_from,pay_ref,approved_by,created_by,created,updated,external_id,source,ordered_at) VALUES(?,?,?,?,?,'',?,?,?,?,?,?,?,?,?,'',?,?,?,?,'erp',?)")
      .bind(id, companyId, category, title, String(b.department ?? "").trim().slice(0, 120), amount, day, String(b.payee ?? "").trim().slice(0, 200), String(b.note ?? "").trim().slice(0, 500), status, paidOn, paidOn ? (PAY_METHODS as readonly string[]).includes(String(b.method)) ? String(b.method) : "bank" : "", String(b.payFrom ?? actor).slice(0, 200), String(b.ref ?? "").slice(0, 200), actor, now, now, externalId, paidOn ? "" : now)
      .run();
    await log("expenses.create", externalId, true, status);
    const row = (await find(externalId)) as OrderRow;
    return json({ ok: true, created: true, order: view(row) }, 201);
  }
  if (request.method === "GET" && path === "budget") {
    const y = url.searchParams.get("year") || "";
    const year = /^\d{4}$/.test(y) ? y : new Date().toISOString().slice(0, 4);
    const [lines, spent] = await Promise.all([
      db.prepare("SELECT month,department,category,amount FROM budget_lines WHERE company_id=? AND month LIKE ? AND kind='budget' ORDER BY category,month").bind(companyId, `${year}-%`).all<{ month: string; department: string; category: string; amount: number }>(),
      db.prepare("SELECT category,substr(expense_date,1,7) AS month,status,SUM(amount) AS amount FROM hr_expenses WHERE company_id=? AND expense_date LIKE ? AND status IN ('approved','ordered','paid') GROUP BY 1,2,3").bind(companyId, `${year}-%`).all<{ category: string; month: string; status: string; amount: number }>(),
    ]);
    await log("budget", year, true);
    return json({ year, currency: "AZN", note: "Əmək haqqı və təlimin faktı burada yoxdur; HR xərcləri üçün paid = real xərc, ordered = sifarişdə.", budgets: lines.results, expenses: spent.results.map((r) => ({ category: r.category, month: r.month, status: r.status, amount: money(r.amount) })) });
  }
  return fail(404, "Ünvan tapılmadı.");
}

export const GET = handle;
export const POST = handle;
