// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { createXlsxBook } from "@/lib/xlsx";
import { scheduleProblem } from "@/lib/payroll-calc";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_25(c: Pick<RouteCtx, "ACCOUNT_KEYS" | "PAY_LABEL" | "accountMap" | "canAct" | "db" | "id" | "path" | "payrollLocked" | "payrollMonth" | "payrollRows" | "request" | "requesterName" | "requirePermission" | "reversePayments" | "tellPayroll" | "userId">): Promise<Response | undefined> {
  const { ACCOUNT_KEYS, PAY_LABEL, accountMap, canAct, db, id, path, payrollLocked, payrollMonth, payrollRows, request, requesterName, requirePermission, reversePayments, tellPayroll, userId } = c;
  if (request.method === "GET" && path === "company/payroll/accounting-map") {
    requirePermission("salaries", "Hesab planını yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    return ok({ map: await accountMap(), labels: Object.fromEntries(ACCOUNT_KEYS) });
  }
  if (request.method === "POST" && path === "company/payroll/accounting-map") {
    requirePermission("salaries", "Hesab planını yalnız əmək haqqı icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const given = (b.map && typeof b.map === "object" ? b.map : {}) as Record<string, unknown>;
    for (const [k] of ACCOUNT_KEYS)
      await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, `acct_${k}`, str(given[k], 20)).run();
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/payroll/accounting") {
    requirePermission("salaries", "Mühasibat jurnalını yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const sheet = await payrollRows(payrollMonth().raw);
    if (sheet.status !== "approved") throw new HttpError(409, "Mühasibat jurnalı yalnız təsdiqlənmiş ay üçün hazırlanır.");
    const map = await accountMap();
    const names = Object.fromEntries(ACCOUNT_KEYS);
    const monthEnd = `${sheet.month}-${String(new Date(Date.UTC(Number(sheet.month.slice(0, 4)), Number(sheet.month.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0")}`;
    const money = (v: number) => Math.round(v * 100) / 100;
    const rows: (string | number)[][] = [];
    const post = (date: string, debit: string, credit: string, amount: number, text: string, note = "") => {
      if (amount > 0.004) rows.push([date, map[debit] || "", names[debit], map[credit] || "", names[credit], money(amount), text, note]);
    };
    const byDepartment = new Map<string, { gross: number; employer: number }>();
    let tax = 0;
    let insurance = 0;
    let other = 0;
    for (const r of sheet.rows) {
      const x = r.result;
      const d = byDepartment.get(r.department || "Departamentsiz") || { gross: 0, employer: 0 };
      d.gross += x.gross;
      d.employer += x.employerSocial + x.employerUnemployment + x.employerMedical;
      byDepartment.set(r.department || "Departamentsiz", d);
      tax += x.incomeTax;
      insurance += x.employeeSocial + x.employeeUnemployment + x.employeeMedical;
      other += x.otherDeductions.reduce((t, o) => t + o.applied, 0);
    }
    for (const [department, d] of byDepartment) {
      post(monthEnd, "wageExpense", "payroll", d.gross, `${sheet.month} ayı üçün əmək haqqı hesablanıb`, department);
      post(monthEnd, "socialExpense", "insurance", d.employer, `${sheet.month}: işəgötürən sığorta payı`, department);
    }
    post(monthEnd, "payroll", "incomeTax", tax, `${sheet.month}: gəlir vergisi tutulub`);
    post(monthEnd, "payroll", "insurance", insurance, `${sheet.month}: işçi sığorta payı tutulub`);
    post(monthEnd, "payroll", "otherPayable", other, `${sheet.month}: digər tutulmalar`);
    for (const r of sheet.rows)
      for (const pay of r.payments)
        if (!pay.reversed && pay.kind !== "extra") post(pay.paidOn, "payroll", pay.method === "cash" ? "cash" : "bank", pay.amount, `${PAY_LABEL[pay.kind] || pay.kind}: ${r.name}`, pay.note);
    const total = money(rows.reduce((t, r) => t + Number(r[5]), 0));
    const book = createXlsxBook([
      { name: "Mühasibat jurnalı", headers: ["Tarix", "Debet hesab", "Debet adı", "Kredit hesab", "Kredit adı", "Məbləğ (AZN)", "İzah", "Qeyd (departament / ödəniş)"], rows },
      { name: "Hesab planı", headers: ["Açar", "Ad", "Hesab kodu (şirkətin)"], rows: ACCOUNT_KEYS.map(([k, label]) => [k, label, map[k] || "doldurulmayıb"]) },
    ]);
    await companyAudit(db, id, userId, "payroll-accounting-exported", sheet.month, `${rows.length} sətir, ${total} AZN`);
    return new Response(Uint8Array.from(book).buffer, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="muhasibat-jurnali-${sheet.month}.xlsx"`, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
  }
  if (request.method === "GET" && path === "company/payroll/benefits") {
    requirePermission("salaries", "Müavinət uçotunu yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const monthRaw = payrollMonth().raw;
    const sheet = await payrollRows(monthRaw);
    const receipts = (await db.prepare("SELECT id,month,amount_cents,received_on,reference,note,created_by_name FROM insurer_receipts WHERE company_id=? AND month=? ORDER BY received_on").bind(id, monthRaw).all<{ id: string; month: string; amount_cents: number; received_on: string; reference: string; note: string; created_by_name: string }>()).results;
    const people = sheet.rows.filter((r) => r.benefitDue > 0).map((r) => ({ employeeId: r.employeeId, name: r.name, days: r.result.benefitCalendarDays || 0, amount: r.benefitDue, doc: r.inputs.benefitDoc || "", eligible: r.result.benefitEligible, capped: !!r.result.benefitCapped }));
    const expected = Math.round(people.reduce((t, p) => t + p.amount, 0) * 100) / 100;
    const received = Math.round(receipts.reduce((t, r) => t + r.amount_cents, 0)) / 100;
    const earlier = (await db.prepare("SELECT month,SUM(amount_cents) AS total FROM insurer_receipts WHERE company_id=? GROUP BY month ORDER BY month DESC LIMIT 12").bind(id).all<{ month: string; total: number }>()).results;
    return ok({ month: monthRaw, payer: sheet.settings.benefitPayer, expected, received, difference: Math.round((expected - received) * 100) / 100, people, receipts: receipts.map((r) => ({ id: r.id, amount: r.amount_cents / 100, receivedOn: r.received_on, reference: r.reference, note: r.note, by: r.created_by_name })), months: earlier.map((m) => ({ month: m.month, received: m.total / 100 })) });
  }
  if (request.method === "POST" && path === "company/payroll/benefits/receipt") {
    requirePermission("salaries", "Müavinət uçotunu yalnız əmək haqqı icazəsi olan şəxs apara bilər.");
    const b = await jsonBody(request);
    const month = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, "Ayı düzgün seçin.");
    const amount = Math.round((Number(b.amount) || 0) * 100);
    if (!(amount > 0) || amount > 1_000_000_000) throw new HttpError(400, "Məbləği düzgün yazın.");
    const day = /^\d{4}-\d{2}-\d{2}$/.test(str(b.receivedOn, 10)) ? str(b.receivedOn, 10) : new Date().toISOString().slice(0, 10);
    await db.prepare("INSERT INTO insurer_receipts(id,company_id,month,amount_cents,received_on,reference,note,created_by_name,created) VALUES(?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, month, amount, day, str(b.reference, 80), str(b.note, 200), await requesterName(), new Date().toISOString()).run();
    await companyAudit(db, id, userId, "insurer-receipt", month, `${amount / 100} AZN`);
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/payroll/benefits/receipt/delete") {
    requirePermission("salaries", "Müavinət uçotunu yalnız əmək haqqı icazəsi olan şəxs apara bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM insurer_receipts WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/payroll/tax-confirm") {
    requirePermission("salaries", "Vergi parametrlərini yalnız əmək haqqı icazəsi olan şəxs təsdiq edə bilər.");
    const b = await jsonBody(request);
    const year = str(b.year, 4);
    if (!/^20\d{2}$/.test(year)) throw new HttpError(400, "İli düzgün yazın.");
    const me = await requesterName();
    const put = async (key: string, value: string) => {
      await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, key, value).run();
    };
    await put("tax_confirmed_year", year);
    await put("tax_confirmed_by", me);
    await put("tax_confirmed_at", new Date().toISOString());
    await companyAudit(db, id, userId, "tax-params-confirmed", year, me);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/payroll/settings") {
    requirePermission("salaries", "Əmək haqqı ayarlarını yalnız əmək haqqı icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const advanceDay = Math.max(0, Math.min(28, Math.round(Number(b.advanceDay) || 0)));
    const payDay = Math.max(1, Math.min(31, Math.round(Number(b.payDay) || 28)));
    const problem = scheduleProblem(advanceDay, payDay);
    if (problem) throw new HttpError(400, problem);
    // The amount from which a transfer order needs two directors' approvals; only a director sets it.
    const current = await db.prepare("SELECT dual_threshold FROM payroll_settings WHERE company_id=?").bind(id).first<{ dual_threshold: number }>();
    let dual = current?.dual_threshold || 0;
    if (b.dualThreshold !== undefined) {
      const wanted = Math.max(0, Math.round((Number(b.dualThreshold) || 0) * 100));
      if (wanted !== dual) {
        if (!canAct("approve-director")) throw new HttpError(403, "İkinci təsdiq həddini yalnız direktor və ya hesab sahibi dəyişə bilər.");
        dual = wanted;
      }
    }
    for (const [field, key] of [["benefitSick", "benefit_sick_percent"], ["benefitMaternity", "benefit_maternity_percent"]] as const) {
      if (b[field] === undefined) continue;
      const wanted = Math.max(0, Math.min(100, Number(b[field]) || 0));
      const old = await db.prepare("SELECT value FROM hr_settings WHERE company_id=? AND key=?").bind(id, key).first<{ value: string }>();
      if (String(wanted) === (old?.value ?? "")) continue;
      if (!canAct("approve-director")) throw new HttpError(403, "Müavinət faizlərini yalnız direktor və ya hesab sahibi dəyişə bilər.");
      await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, key, String(wanted)).run();
      await companyAudit(db, id, userId, "benefit-rate-set", key, `${wanted}%`);
    }
    for (const [field, key] of [["benefitMinPension", "benefit_min_pension"], ["benefitPayer", "benefit_payer"]] as const) {
      if (b[field] === undefined) continue;
      const wanted = field === "benefitPayer" ? (b[field] === "employer" ? "employer" : "insurer") : String(Math.max(0, Math.round((Number(b[field]) || 0) * 100) / 100));
      const old = await db.prepare("SELECT value FROM hr_settings WHERE company_id=? AND key=?").bind(id, key).first<{ value: string }>();
      if (wanted === (old?.value ?? (field === "benefitPayer" ? "insurer" : "0"))) continue;
      if (!canAct("approve-director")) throw new HttpError(403, "Bu ayarı yalnız direktor və ya hesab sahibi dəyişə bilər.");
      await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, key, wanted).run();
      await companyAudit(db, id, userId, "benefit-setting-set", key, wanted);
    }
    await db
      .prepare("INSERT INTO payroll_settings(company_id,advance_day,pay_day,dual_threshold,updated) VALUES(?,?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET advance_day=excluded.advance_day,pay_day=excluded.pay_day,dual_threshold=excluded.dual_threshold,updated=excluded.updated")
      .bind(id, advanceDay, payDay, dual, new Date().toISOString())
      .run();
    await companyAudit(db, id, userId, "payroll-settings", "", `avans ${advanceDay || "yoxdur"}, ödəniş ${payDay}, ikinci təsdiq ${dual ? `${dual / 100} AZN-dən` : "yoxdur"}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/payroll/pay") {
    requirePermission("salaries", "Ödənişləri yalnız əmək haqqı icazəsi olan şəxs qeyd edə bilər.");
    const b = await jsonBody(request);
    const monthRaw = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw)) throw new HttpError(400, "Ayı düzgün seçin.");
    const kind = (["advance", "vacation", "benefit", "extra"] as const).find((k) => k === b.kind) || "salary";
    const amount = Math.round((Number(b.amount) || 0) * 100) / 100;
    if (!(amount > 0)) throw new HttpError(400, "Məbləği yazın.");
    const title = str(b.title, 120);
    if (kind === "extra" && title.length < 3) throw new HttpError(400, "Digər ödənişin adını yazın (məsələn: ezamiyyət xərci, maddi yardım).");
    if (amount > 1_000_000) throw new HttpError(400, "Məbləğ çox böyükdür.");
    const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(str(b.paidOn, 10)) ? str(b.paidOn, 10) : new Date().toISOString().slice(0, 10);
    const sheet = await payrollRows(monthRaw);
    const row = sheet.rows.find((r) => r.employeeId === str(b.employeeId, 100));
    if (!row) throw new HttpError(404, "İşçi bu ay üçün siyahıda yoxdur.");
    if (kind === "advance") {
      if (!sheet.settings.advanceDay) throw new HttpError(409, "Avans verməzdən əvvəl ayarlarda avans gününü seçin: aylıq əmək haqqı tərəflərin razılığı ilə ayda iki dəfə verilir (Əmək M. 172.1).");
      if (sheet.status === "approved") throw new HttpError(409, "Bu ay təsdiqlənib: avans artıq verilmir.");
      if (amount > row.availableAdvance + 0.005 && !canAct("approve-director"))
        throw new HttpError(409, `Bu işçi bu günədək ${row.availableAdvance} AZN qazanıb (avans: ${row.advances} AZN). Daha çox avansı yalnız direktor verə bilər.`);
    } else if (kind === "extra") {
      // Payments that are not pay: a trip's costs, material aid, a refund. They are recorded and paid on their own.
    } else {
      if (sheet.status !== "approved") throw new HttpError(409, "Ödənişi qeyd etməzdən əvvəl ayı təsdiqləyin.");
      if (kind === "benefit") {
        if (row.benefitOutstanding <= 0 && row.benefitDue > 0) throw new HttpError(409, "Müavinət sığortaçı tərəfindən birbaşa ödənilir (Sosial Sığorta Qanunu, md. 17). Şirkət özü ödəyirsə, ayarlarda «Müavinəti şirkət ödəyir» seçin.");
        if (amount > row.benefitOutstanding + 0.005) throw new HttpError(409, `Bu işçiyə ödəniləcək müavinət qalığı ${row.benefitOutstanding} AZN-dir.`);
      } else if (kind === "vacation") {
        if (amount > row.vacationOutstanding + 0.005) throw new HttpError(409, `Ödənilməmiş məzuniyyət haqqı ${row.vacationOutstanding} AZN-dir.`);
      } else if (amount > row.outstanding + 0.005) throw new HttpError(409, `Bu işçiyə ödəniləcək qalıq ${row.outstanding} AZN-dir.`);
    }
    const paymentId = crypto.randomUUID();
    await db
      .prepare("INSERT INTO payroll_payments(id,company_id,employee_id,month,kind,amount_cents,paid_on,method,note,title,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(paymentId, id, row.employeeId, monthRaw, kind, Math.round(amount * 100), paidOn, str(b.method, 40), str(b.note, 200), title, userId, new Date().toISOString())
      .run();
    await companyAudit(db, id, userId, kind === "advance" ? "payroll-advance" : "payroll-paid", row.employeeId, `${row.name}: ${amount} AZN (${monthRaw}, ${kind}${title ? `, ${title}` : ""})`);
    await tellPayroll([row.employeeId], kind === "advance" ? "Avansınız ödənildi" : "Ödəniş edildi", `${monthRaw} ayı üçün ${({ advance: "avans", salary: "əmək haqqı", vacation: "məzuniyyət haqqı", benefit: "müavinət", extra: title || "digər ödəniş" } as Record<string, string>)[kind]} ödənişi qeyd edildi (${amount.toFixed(2)} AZN, ${paidOn}). Təfərrüat: İş yerim → Əmək haqqı.`);
    return ok({ ok: true, id: paymentId }, 201);
  }
  if (request.method === "POST" && path === "company/payroll/pay-all") {
    requirePermission("salaries", "Ödənişləri yalnız əmək haqqı icazəsi olan şəxs qeyd edə bilər.");
    const b = await jsonBody(request);
    const monthRaw = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw)) throw new HttpError(400, "Ayı düzgün seçin.");
    const sheet = await payrollRows(monthRaw);
    if (sheet.status !== "approved") throw new HttpError(409, "Əvvəlcə ayı təsdiqləyin.");
    const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(str(b.paidOn, 10)) ? str(b.paidOn, 10) : new Date().toISOString().slice(0, 10);
    const due = sheet.rows.filter((r) => r.outstanding > 0);
    const now = new Date().toISOString();
    for (let i = 0; i < due.length; i += 50)
      await db.batch(
        due.slice(i, i + 50).map((r) =>
          db
            .prepare("INSERT INTO payroll_payments(id,company_id,employee_id,month,kind,amount_cents,paid_on,method,note,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
            .bind(crypto.randomUUID(), id, r.employeeId, monthRaw, "salary", Math.round(r.outstanding * 100), paidOn, str(b.method, 40) || "bank", "", userId, now),
        ),
      );
    await companyAudit(db, id, userId, "payroll-paid", "", `${monthRaw}: ${due.length} işçi`);
    await tellPayroll(due.map((r) => r.employeeId), "Əmək haqqınız ödənildi", `${monthRaw} ayının əmək haqqı ödənişi qeyd edildi. Təfərrüat: İş yerim → Əmək haqqı.`);
    return ok({ ok: true, paid: due.length });
  }
  if (request.method === "POST" && path === "company/payroll/payment/reverse") {
    requirePermission("salaries", "Ödənişi yalnız əmək haqqı icazəsi olan şəxs geri çəkə bilər.");
    const b = await jsonBody(request);
    const reason = str(b.reason, 200);
    if (reason.length < 3) throw new HttpError(400, "Geri çəkmə səbəbini yazın.");
    const row = await db.prepare("SELECT id,month,kind,amount_cents,reversed_at FROM payroll_payments WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ id: string; month: string; kind: string; amount_cents: number; reversed_at: string }>();
    if (!row) throw new HttpError(404, "Ödəniş tapılmadı.");
    if (row.reversed_at) throw new HttpError(409, "Bu ödəniş artıq geri çəkilib.");
    await reversePayments([row], reason);
    await companyAudit(db, id, userId, "payroll-payment-reversed", row.id, `${row.month}: ${row.amount_cents / 100} AZN — ${reason}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/payroll/payment/delete") {
    requirePermission("salaries", "Ödənişləri yalnız əmək haqqı icazəsi olan şəxs silə bilər.");
    const b = await jsonBody(request);
    const row = await db.prepare("SELECT month,kind FROM payroll_payments WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ month: string; kind: string }>();
    if (!row) throw new HttpError(404, "Ödəniş tapılmadı.");
    if (row.kind === "advance" && (await payrollLocked(row.month))) throw new HttpError(409, "Təsdiqlənmiş ayın avansı silinə bilməz.");
    await db.prepare("DELETE FROM payroll_payments WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    await companyAudit(db, id, userId, "payroll-payment-removed", str(b.id, 100), row.month);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/payroll/approve") {
    requirePermission("salaries", "Ayı yalnız əmək haqqı icazəsi olan şəxs təsdiqləyə bilər.");
    const b = await jsonBody(request);
    const monthRaw = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw)) throw new HttpError(400, "Ayı düzgün seçin.");
    if (await payrollLocked(monthRaw)) throw new HttpError(409, "Bu ay artıq təsdiqlənib.");
    const sheet = await payrollRows(monthRaw);
    if (!sheet.rows.length) throw new HttpError(400, "Bu ay üçün işçi yoxdur.");
    const noPay = sheet.rows.filter((r) => r.monthlySalary <= 0);
    if (noPay.length) throw new HttpError(409, `Maaşı daxil edilməyən işçilər var: ${noPay.slice(0, 5).map((r) => r.name).join(", ")}. Əvvəl işçi kartında maaşı yazın.`);
    const excess = sheet.rows.filter((r) => r.result.advanceExcess > 0);
    if (excess.length) throw new HttpError(409, `Avansı hesablanmış əmək haqqından çox olan işçilər var: ${excess.slice(0, 5).map((r) => `${r.name} (${r.result.advanceExcess} AZN artıq)`).join(", ")}. Avansı silin və ya düzəldin.`);
    const me = await requesterName();
    const now = new Date().toISOString();
    await db
      .prepare("INSERT INTO payroll_runs(company_id,month,status,snapshot,approved_by,approved_by_name,approved_at,updated) VALUES(?,?,'approved',?,?,?,?,?) ON CONFLICT(company_id,month) DO UPDATE SET status='approved',snapshot=excluded.snapshot,approved_by=excluded.approved_by,approved_by_name=excluded.approved_by_name,approved_at=excluded.approved_at,updated=excluded.updated")
      .bind(id, monthRaw, JSON.stringify({ rows: sheet.rows.map((r) => ({ employeeId: r.employeeId, result: r.result })) }), userId, me, now, now)
      .run();
    // The attendance of an approved month is locked: later changes by hand need the director to open it.
    await db.prepare("INSERT INTO attendance_locks(company_id,month,locked_by,reason,locked_at) VALUES(?,?,?,?,?) ON CONFLICT(company_id,month) DO NOTHING").bind(id, monthRaw, me, "Əmək haqqı təsdiqləndi", now).run().catch(() => undefined);
    await companyAudit(db, id, userId, "payroll-approved", "", `${monthRaw}: ${sheet.rows.length} işçi, ödəniləcək ${sheet.totals.toPay} AZN`);
    // Deductions cut down to the legal limit are carried to the next month, so the debt is not lost.
    const nextMonth = new Date(Date.UTC(Number(monthRaw.slice(0, 4)), Number(monthRaw.slice(5, 7)), 1)).toISOString().slice(0, 7);
    const carryRows: D1PreparedStatement[] = [db.prepare("DELETE FROM payroll_carry WHERE company_id=? AND from_month=?").bind(id, monthRaw)];
    for (const r of sheet.rows)
      for (const d of r.result.otherDeductions)
        if (d.amount - d.applied > 0.005)
          carryRows.push(db.prepare("INSERT INTO payroll_carry(id,company_id,employee_id,month,label,amount_cents,deduction_kind,from_month,created) VALUES(?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, r.employeeId, nextMonth, (d.label || "Tutulma").replace(/ \(\d{4}-\d{2} ayından qalıq\)$/, ""), Math.round((d.amount - d.applied) * 100), d.kind, monthRaw, now));
    for (let i = 0; i < carryRows.length; i += 50) await db.batch(carryRows.slice(i, i + 50));
    await tellPayroll(sheet.rows.map((r) => r.employeeId), `${monthRaw} ayı üçün haqq-hesab vərəqəniz hazırdır`, `${monthRaw} ayının əmək haqqı hesablaması təsdiqləndi. Vərəqəni JobMatch hesabınızda “İş yerim” → “Əmək haqqı” bölməsində görə və çap edə bilərsiniz.`, true);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/payroll/reopen") {
    requirePermission("salaries", "Təsdiqi yalnız əmək haqqı icazəsi olan şəxs geri çəkə bilər.");
    if (!canAct("approve-director")) throw new HttpError(403, "Təsdiqi yalnız direktor və ya hesab sahibi geri çəkə bilər.");
    const b = await jsonBody(request);
    const monthRaw = str(b.month, 7);
    const paid = await db.prepare("SELECT COUNT(*) AS n FROM payroll_payments WHERE company_id=? AND month=? AND kind='salary'").bind(id, monthRaw).first<{ n: number }>();
    if (Number(paid?.n) > 0) throw new HttpError(409, "Bu ay üçün əmək haqqı ödənişi qeyd edilib: əvvəlcə ödənişləri silin.");
    await db.prepare("UPDATE payroll_runs SET status='draft',snapshot='',updated=? WHERE company_id=? AND month=?").bind(new Date().toISOString(), id, monthRaw).run();
    await db.prepare("DELETE FROM payroll_carry WHERE company_id=? AND from_month=?").bind(id, monthRaw).run();
    await companyAudit(db, id, userId, "payroll-reopened", "", monthRaw);
    return ok({ ok: true });
  }
  return undefined;
}
