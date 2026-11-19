// ai-billing: the company chooses its AI package and buys extra analyses itself. Every paid change makes an open invoice
// (price + 18% VAT) that appears in «Hesablar və ödənişlər»; the payment is recorded there (bank transfer), there is no card gateway yet.
import { HttpError, jsonBody, str } from "@/lib/server";
import { AI_TOPUPS, COMPANY_AI_PACKAGES, HR_MODULE_DAYS, HR_PRICES, hrModuleOpen, hrModulePriceFor, hrUntilAfter, monthKey, packageById, topupById } from "@/lib/ai-packages";
import { companyAudit } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import { PACKAGE_VAT_PERCENT, grossCents, withVatAzn } from "@/lib/vat";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_ai_billing_01(c: Pick<RouteCtx, "accountRole" | "aiQuota" | "db" | "id" | "path" | "request" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { accountRole, aiQuota, db, id, path, request, requirePermission, userId } = c;
  if (!path.startsWith("company/ai-account") && path !== "company/ai-plan/change" && path !== "company/ai-topup") return undefined;
  if (accountRole !== "company") throw new HttpError(403, "Bu bölmə yalnız şirkət hesabı üçündür.");
  // The price is without VAT; the invoice total is the price plus 18% VAT.
  const invoice = async (description: string, priceAzn: number) => {
    const now = new Date();
    const due = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const invoiceId = crypto.randomUUID();
    await db
      .prepare("INSERT INTO billing_invoices(id,account_id,description,amount_cents,currency,vat_percent,due_date,status,created_by,created,updated) VALUES(?,?,?,?,?,?,?,'open',?,?,?)")
      .bind(invoiceId, id, description, grossCents(priceAzn), "AZN", PACKAGE_VAT_PERCENT, due, userId, now.toISOString(), now.toISOString())
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
    const hrRow = await db.prepare("SELECT a.created,p.hr_module,p.hr_until FROM accounts a LEFT JOIN company_ai_plans p ON p.company_id=a.id WHERE a.id=?").bind(id).first<{ created: string; hr_module: number | null; hr_until: string | null }>().catch(() => null);
    const hrBought = !!hrRow?.hr_module && (!hrRow.hr_until || hrRow.hr_until > new Date().toISOString());
    return ok({ month: monthKey(), hrModule: hrBought, hrUntil: hrRow?.hr_until || null, hrExpired: !!hrRow?.hr_module && !hrBought, hrFree: !!hrRow && !hrBought && hrModuleOpen(hrRow.created, false), hrModulePriceAzn: HR_PRICES.alone, hrModuleBundlePriceAzn: HR_PRICES.bundle, vatPercent: PACKAGE_VAT_PERCENT, current: q.pkg, used: q.used, monthly: q.monthly, credits: q.credits, left: q.left, packages: COMPANY_AI_PACKAGES, topupPacks: AI_TOPUPS, purchases: topups.results });
  }

  if (request.method === "POST" && path === "company/ai-plan/change") {
    requirePermission("billing", "AI paketini yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const next = COMPANY_AI_PACKAGES.find((p) => p.id === str(b.planId, 20));
    if (!next) throw new HttpError(400, "Paket düzgün deyil.");
    const current = (await aiQuota()).pkg;
    // The HR (Kadr) module is an add-on on top of any package: ticking it adds its monthly price to the bill.
    const hrRow = await db.prepare("SELECT hr_module,hr_until FROM company_ai_plans WHERE company_id=?").bind(id).first<{ hr_module: number; hr_until: string | null }>().catch(() => null);
    const at = new Date().toISOString();
    // A bought module lasts 30 days: after that it is closed until it is bought again; it can be renewed before the end.
    const hrNow = !!hrRow?.hr_module && (!hrRow.hr_until || hrRow.hr_until > at);
    const renew = b.renewHr === true;
    const wantHr = renew ? true : b.hrModule === undefined ? hrNow : b.hrModule === true;
    if (next.id === current.id && wantHr === hrNow && !renew) throw new HttpError(409, "Bu paket artıq aktivdir.");
    const money = (net: number) => `${net} ₼ + ${PACKAGE_VAT_PERCENT}% ƏDV = ${withVatAzn(net)} ₼`;
    // A paid package is billed by an invoice for 30 days; a cheaper or free one applies at once, without a refund.
    const packageNet = next.priceAzn > 0 && next.priceAzn > current.priceAzn ? next.priceAzn : 0;
    // Together with a paid AI package the HR module is 120 AZN, alone 150 AZN.
    const hrNet = wantHr && (!hrNow || renew) ? hrModulePriceFor(next.priceAzn) : 0;
    let invoiceNote = "";
    if (packageNet + hrNet > 0) {
      const parts = [packageNet ? `AI paketi: ${next.name}` : "", hrNet ? "Kadr modulu" : ""].filter(Boolean).join(" + ");
      const inv = await invoice(`${parts} (30 gün)`, packageNet + hrNet);
      invoiceNote = ` Hesab-faktura yaradıldı (${money(packageNet + hrNet)}), son ödəniş tarixi ${inv.due}.`;
    }
    await db
      .prepare("INSERT INTO company_ai_plans(company_id,plan_id,hr_module,hr_until,started,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET plan_id=excluded.plan_id,hr_module=excluded.hr_module,hr_until=excluded.hr_until,updated=excluded.updated")
      .bind(id, next.id, wantHr ? 1 : 0, !wantHr ? null : !hrNow || renew ? hrUntilAfter(HR_MODULE_DAYS, hrRow?.hr_until, at) : hrRow?.hr_until || null, at, at)
      .run();
    await companyAudit(db, id, userId, "ai-plan-changed", `${current.name} → ${next.name}${wantHr !== hrNow ? (wantHr ? " + Kadr modulu" : " − Kadr modulu") : ""}`);
    const changed = next.id !== current.id ? `Paket dəyişdi: ${next.name}.` : renew ? `Kadr modulu ${HR_MODULE_DAYS} gün uzadıldı.` : wantHr ? "Kadr modulu əlavə olundu." : "Kadr modulu söndürüldü.";
    return ok({ ok: true, package: packageById(next.id), hrModule: wantHr, message: `${changed}${invoiceNote}${next.priceAzn < current.priceAzn ? " Ödənilmiş məbləğ geri qaytarılmır." : ""}` });
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
    return ok({ ok: true, message: `${pack.full} tam analiz və ${pack.rank} reytinq əlavə olundu. Hesab-faktura yaradıldı (${pack.priceAzn} ₼ + ${PACKAGE_VAT_PERCENT}% ƏDV = ${withVatAzn(pack.priceAzn)} ₼), son ödəniş tarixi ${inv.due}.` });
  }
  return undefined;
}
