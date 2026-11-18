// ai-billing: the company chooses its AI package and buys extra analyses itself. Every paid change makes an open invoice
// (VAT included) that appears in «Hesablar və ödənişlər»; the payment is recorded there (bank transfer), there is no card gateway yet.
import { HttpError, jsonBody, str } from "@/lib/server";
import { AI_TOPUPS, COMPANY_AI_PACKAGES, monthKey, packageById, topupById } from "@/lib/ai-packages";
import { companyAudit } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_ai_billing_01(c: Pick<RouteCtx, "accountRole" | "aiQuota" | "db" | "id" | "path" | "request" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { accountRole, aiQuota, db, id, path, request, requirePermission, userId } = c;
  if (!path.startsWith("company/ai-account") && path !== "company/ai-plan/change" && path !== "company/ai-topup") return undefined;
  if (accountRole !== "company") throw new HttpError(403, "Bu bölmə yalnız şirkət hesabı üçündür.");
  const invoice = async (description: string, priceAzn: number) => {
    const now = new Date();
    const due = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const invoiceId = crypto.randomUUID();
    await db
      .prepare("INSERT INTO billing_invoices(id,account_id,description,amount_cents,currency,vat_percent,due_date,status,created_by,created,updated) VALUES(?,?,?,?,?,?,?,'open',?,?,?)")
      .bind(invoiceId, id, description, Math.round(priceAzn * 100), "AZN", 18, due, userId, now.toISOString(), now.toISOString())
      .run();
    return { invoiceId, due };
  };

  if (request.method === "GET" && path === "company/ai-account") {
    requirePermission("billing", "AI paketini yalnız HR, direktor və hesab sahibi görür.");
    const q = await aiQuota();
    const topups = await db
      .prepare("SELECT id,pack_id,full_count,rank_count,price_cents,invoice_id,created FROM company_ai_topups WHERE company_id=? ORDER BY created DESC LIMIT 20")
      .bind(id)
      .all<{ id: string; pack_id: string; full_count: number; rank_count: number; price_cents: number; invoice_id: string; created: string }>()
      .catch(() => ({ results: [] as { id: string; pack_id: string; full_count: number; rank_count: number; price_cents: number; invoice_id: string; created: string }[] }));
    return ok({ month: monthKey(), current: q.pkg, used: q.used, monthly: q.monthly, credits: q.credits, left: q.left, packages: COMPANY_AI_PACKAGES, topupPacks: AI_TOPUPS, purchases: topups.results });
  }

  if (request.method === "POST" && path === "company/ai-plan/change") {
    requirePermission("billing", "AI paketini yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const next = COMPANY_AI_PACKAGES.find((p) => p.id === str(b.planId, 20));
    if (!next) throw new HttpError(400, "Paket düzgün deyil.");
    const current = (await aiQuota()).pkg;
    if (next.id === current.id) throw new HttpError(409, "Bu paket artıq aktivdir.");
    const at = new Date().toISOString();
    let invoiceNote = "";
    // A paid package is billed by an invoice for 30 days; a cheaper or free one applies at once, without a refund.
    if (next.priceAzn > 0 && next.priceAzn > current.priceAzn) {
      const inv = await invoice(`AI paketi: ${next.name} (30 gün)`, next.priceAzn);
      invoiceNote = ` Hesab-faktura yaradıldı (${next.priceAzn} ₼, ƏDV daxil), son ödəniş tarixi ${inv.due}.`;
    }
    await db
      .prepare("INSERT INTO company_ai_plans(company_id,plan_id,started,updated) VALUES(?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET plan_id=excluded.plan_id,updated=excluded.updated")
      .bind(id, next.id, at, at)
      .run();
    await companyAudit(db, id, userId, "ai-plan-changed", `${current.name} → ${next.name}`);
    return ok({ ok: true, package: packageById(next.id), message: `Paket dəyişdi: ${next.name}.${invoiceNote}${next.priceAzn < current.priceAzn ? " Ödənilmiş məbləğ geri qaytarılmır." : ""}` });
  }

  if (request.method === "POST" && path === "company/ai-topup") {
    requirePermission("billing", "Əlavə analiz paketini yalnız HR, direktor və hesab sahibi ala bilər.");
    const b = await jsonBody(request);
    const pack = topupById(str(b.packId, 30));
    if (!pack) throw new HttpError(400, "Əlavə paket düzgün deyil.");
    const inv = await invoice(`Əlavə AI analizi: ${pack.name} (${pack.full} tam + ${pack.rank} reytinq)`, pack.priceAzn);
    const at = new Date().toISOString();
    await db.batch([
      db
        .prepare("INSERT INTO company_ai_credits(company_id,full_left,rank_left,updated) VALUES(?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET full_left=full_left+excluded.full_left,rank_left=rank_left+excluded.rank_left,updated=excluded.updated")
        .bind(id, pack.full, pack.rank, at),
      db
        .prepare("INSERT INTO company_ai_topups(id,company_id,pack_id,full_count,rank_count,price_cents,invoice_id,created) VALUES(?,?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), id, pack.id, pack.full, pack.rank, Math.round(pack.priceAzn * 100), inv.invoiceId, at),
    ]);
    await companyAudit(db, id, userId, "ai-topup", `${pack.name}: +${pack.full} tam, +${pack.rank} reytinq`);
    return ok({ ok: true, message: `${pack.full} tam analiz və ${pack.rank} reytinq əlavə olundu. Hesab-faktura yaradıldı (${pack.priceAzn} ₼, ƏDV daxil), son ödəniş tarixi ${inv.due}.` });
  }
  return undefined;
}
