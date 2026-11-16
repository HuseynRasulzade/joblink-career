// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { quiet } from "@/lib/quiet";
import { validIban } from "@/lib/employee-profile";
import { BatchRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_22(c: Pick<RouteCtx, "bankAccounts" | "batchColumns" | "batchView" | "canAct" | "createBatch" | "db" | "id" | "memberRole" | "path" | "payrollMonth" | "payrollRows" | "request" | "requesterName" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { bankAccounts, batchColumns, batchView, canAct, createBatch, db, id, memberRole, path, payrollMonth, payrollRows, request, requesterName, requirePermission, userId } = c;
  if (request.method === "GET" && path === "company/payroll/bank") {
    requirePermission("salaries", "Bank bölməsini yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const monthRaw = payrollMonth().raw;
    const accounts = await bankAccounts();
    // Accounts set to prepare orders automatically get a draft on the advance day and on the pay day.
    const auto = accounts.find((a) => a.auto === "prepare");
    const todayIso = new Date().toISOString().slice(0, 10);
    if (auto && memberRole !== "auditor" && monthRaw === todayIso.slice(0, 7)) {
      const sheet = await payrollRows(monthRaw);
      const done = async (kind: string) => !!(await db.prepare("SELECT id FROM payroll_batches WHERE company_id=? AND month=? AND kind=? AND status<>'cancelled' LIMIT 1").bind(id, monthRaw, kind).first());
      try {
        if (sheet.status === "approved" && sheet.schedule.payDate <= todayIso && sheet.totals.outstanding > 0 && !(await done("salary"))) await createBatch(monthRaw, "salary", auto.id, "auto", "Avtomatik");
        else if (sheet.status !== "approved" && sheet.schedule.advanceDate && sheet.schedule.advanceDate <= todayIso && !(await done("advance"))) await createBatch(monthRaw, "advance", auto.id, "auto", "Avtomatik");
      } catch (error) {
        // Nothing to prepare today (no one to pay or no account data); the list stays as it is.
        quiet("route-catch", error);
      }
    }
    const batches = (await db.prepare(`SELECT ${batchColumns} FROM payroll_batches WHERE company_id=? AND month=? ORDER BY created DESC`).bind(id, monthRaw).all<BatchRow>()).results;
    return ok({
      month: monthRaw,
      accounts: accounts.map((a) => ({ id: a.id, label: a.label, bankName: a.bank_name, bankCode: a.bank_code, swift: a.swift, iban: a.iban, accountNumber: a.account_number, voen: a.voen, holder: a.holder, currency: a.currency, auto: a.auto, isDefault: !!a.is_default })),
      batches: batches.map((b) => batchView(b)),
      canManage: canAct("approve-director"),
    });
  }
  if (request.method === "POST" && path === "company/payroll/bank/account") {
    requirePermission("salaries", "Bank hesabını yalnız əmək haqqı icazəsi olan şəxs dəyişə bilər.");
    if (!canAct("approve-director")) throw new HttpError(403, "Şirkətin bank hesabını yalnız direktor və ya hesab sahibi əlavə edə və ya dəyişə bilər.");
    const b = await jsonBody(request);
    const bankName = str(b.bankName, 80);
    const iban = str(b.iban, 40).replace(/\s+/g, "").toUpperCase();
    if (!bankName) throw new HttpError(400, "Bankın adını yazın.");
    if (!validIban(iban)) throw new HttpError(400, "Şirkətin IBAN-ı düzgün deyil.");
    const voen = str(b.voen, 12).replace(/\s+/g, "");
    if (voen && !/^\d{10}$/.test(voen)) throw new HttpError(400, "VÖEN 10 rəqəmdən ibarət olmalıdır.");
    const auto = b.auto === "prepare" ? "prepare" : "off";
    const existing = str(b.id, 100) ? await db.prepare("SELECT id FROM payroll_bank_accounts WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ id: string }>() : null;
    const count = (await db.prepare("SELECT COUNT(*) AS n FROM payroll_bank_accounts WHERE company_id=?").bind(id).first<{ n: number }>())?.n || 0;
    if (!existing && count >= 5) throw new HttpError(409, "Ən çox 5 bank hesabı saxlanılır.");
    const accountId = existing?.id || crypto.randomUUID();
    const makeDefault = b.isDefault === true || count === 0;
    if (makeDefault) await db.prepare("UPDATE payroll_bank_accounts SET is_default=0 WHERE company_id=?").bind(id).run();
    if (auto === "prepare") await db.prepare("UPDATE payroll_bank_accounts SET auto='off' WHERE company_id=? AND id<>?").bind(id, accountId).run();
    if (existing)
      await db
        .prepare("UPDATE payroll_bank_accounts SET label=?,bank_name=?,bank_code=?,swift=?,iban=?,account_number=?,voen=?,holder=?,auto=?,is_default=CASE WHEN ? THEN 1 ELSE is_default END WHERE id=? AND company_id=?")
        .bind(str(b.label, 60), bankName, str(b.bankCode, 12), str(b.swift, 12).toUpperCase(), iban, str(b.accountNumber, 30), voen, str(b.holder, 120), auto, makeDefault ? 1 : 0, accountId, id)
        .run();
    else
      await db
        .prepare("INSERT INTO payroll_bank_accounts(id,company_id,label,bank_name,bank_code,swift,iban,account_number,voen,holder,currency,auto,is_default,created) VALUES(?,?,?,?,?,?,?,?,?,?,'AZN',?,?,?)")
        .bind(accountId, id, str(b.label, 60), bankName, str(b.bankCode, 12), str(b.swift, 12).toUpperCase(), iban, str(b.accountNumber, 30), voen, str(b.holder, 120), auto, makeDefault ? 1 : 0, new Date().toISOString())
        .run();
    await companyAudit(db, id, userId, "payroll-bank-account", accountId, `${bankName} ${iban}`);
    return ok({ ok: true, id: accountId });
  }
  if (request.method === "POST" && path === "company/payroll/bank/account/delete") {
    requirePermission("salaries", "Bank hesabını yalnız əmək haqqı icazəsi olan şəxs silə bilər.");
    if (!canAct("approve-director")) throw new HttpError(403, "Şirkətin bank hesabını yalnız direktor və ya hesab sahibi silə bilər.");
    const b = await jsonBody(request);
    const open = await db.prepare("SELECT id FROM payroll_batches WHERE company_id=? AND account_id=? AND status IN ('draft','approved','sent') LIMIT 1").bind(id, str(b.id, 100)).first();
    if (open) throw new HttpError(409, "Bu hesabla açıq ödəniş sənədi var: əvvəl onu tamamlayın və ya ləğv edin.");
    await db.prepare("DELETE FROM payroll_bank_accounts WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    await companyAudit(db, id, userId, "payroll-bank-account-removed", str(b.id, 100), "");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/payroll/bank/batch") {
    requirePermission("salaries", "Ödəniş sənədini yalnız əmək haqqı icazəsi olan şəxs hazırlaya bilər.");
    const b = await jsonBody(request);
    const monthRaw = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw)) throw new HttpError(400, "Ayı düzgün seçin.");
    const account = await db.prepare("SELECT id FROM payroll_bank_accounts WHERE id=? AND company_id=?").bind(str(b.accountId, 100), id).first<{ id: string }>();
    if (!account) throw new HttpError(400, "Əvvəlcə şirkətin bank hesabını əlavə edin və seçin.");
    const batchId = await createBatch(monthRaw, (["advance", "vacation", "benefit"] as const).find((k) => k === b.kind) || "salary", account.id, "manual", await requesterName());
    await companyAudit(db, id, userId, "payroll-batch-created", batchId, monthRaw);
    return ok({ ok: true, id: batchId }, 201);
  }
  return undefined;
}
