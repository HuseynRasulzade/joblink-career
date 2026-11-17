// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { type CalendarOverride, monthDays } from "@/lib/calendar-az";
import { EMPTY_INPUTS, type PayInputs, type PayItem, cleanInputs } from "@/lib/payroll-calc";
import { HttpError, jsonBody, str } from "@/lib/server";
import { MATERNITY_BENEFIT_PERCENT, SICK_BENEFIT_PERCENT } from "@/lib/hr-calc";
import { TRANSFER_HEADERS, type TransferItem, batchTotal, matchStatement, parseBankStatement, transferFileRows, transferPurpose } from "@/lib/bank-transfer";
import { companyAudit } from "@/lib/api-core";
import { createXlsx, createXlsxBook } from "@/lib/xlsx";
import { linkActiveIn } from "@/lib/branches";
import { matchEmployee, parsePayrollRows } from "@/lib/sheet-imports";
import { quiet } from "@/lib/quiet";
import { BatchRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_24(c: Pick<RouteCtx, "applyDueOrderEffects" | "auditView" | "auditorOnly" | "batchColumns" | "batchOf" | "branchContext" | "db" | "employeeRefs" | "id" | "path" | "payrollLocked" | "payrollMonth" | "payrollRows" | "request" | "requestUrl" | "requirePermission" | "reversePayments" | "settleBatch" | "tripRates" | "userId">): Promise<Response | undefined> {
  const { applyDueOrderEffects, auditView, auditorOnly, batchColumns, batchOf, branchContext, db, employeeRefs, id, path, payrollLocked, payrollMonth, payrollRows, request, requestUrl, requirePermission, reversePayments, settleBatch, tripRates, userId } = c;
  if (request.method === "POST" && path === "company/payroll/bank/batch/paid") {
    requirePermission("salaries", "Ödənişi yalnız əmək haqqı icazəsi olan şəxs qeyd edə bilər.");
    const b = await jsonBody(request);
    const batch = await batchOf(str(b.id, 100));
    if (batch.status !== "approved" && batch.status !== "sent") throw new HttpError(409, "Sənəd təsdiqlənməyib: əvvəl direktor təsdiq etməlidir.");
    const paidOn = /^\d{4}-\d{2}-\d{2}$/.test(str(b.paidOn, 10)) ? str(b.paidOn, 10) : new Date().toISOString().slice(0, 10);
    return ok({ ok: true, ...(await settleBatch(batch, paidOn)) });
  }
  if (request.method === "POST" && path === "company/payroll/bank/reconcile") {
    requirePermission("salaries", "Bank çıxarışını yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const b = await jsonBody(request);
    const statement = parseBankStatement((Array.isArray(b.rows) ? b.rows : []).slice(0, 2001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!statement.rows.length) throw new HttpError(400, statement.issues[0]?.reason || "Çıxarışda sətir tapılmadı.");
    const open = (await db.prepare(`SELECT ${batchColumns} FROM payroll_batches WHERE company_id=? AND status IN ('approved','sent') ORDER BY created`).bind(id).all<BatchRow>()).results;
    const used = new Set<number>();
    const result = open.map((batch) => {
      const items = JSON.parse(batch.items || "[]") as TransferItem[];
      const matched = matchStatement(items, statement.rows, used);
      return { batch, matched };
    });
    const apply = b.apply === true;
    const out: { id: string; month: string; kind: string; total: number; found: number; count: number; missing: string[]; paid: boolean }[] = [];
    for (const { batch, matched } of result) {
      const full = matched.missing.length === 0 && matched.found > 0;
      let paid = false;
      if (apply && full) {
        await settleBatch(batch, matched.lastDate || new Date().toISOString().slice(0, 10));
        paid = true;
      }
      out.push({ id: batch.id, month: batch.month, kind: batch.kind, total: batch.total_cents / 100, found: matched.found, count: batch.item_count, missing: matched.missing, paid });
    }
    return ok({ rows: statement.rows.length, unmatchedRows: statement.rows.filter((_, i) => !used.has(i)).length, issues: statement.issues, batches: out });
  }
  if (request.method === "POST" && path === "company/payroll/bank/batch/revert") {
    requirePermission("salaries", "Ödənişi yalnız əmək haqqı icazəsi olan şəxs geri çəkə bilər.");
    const b = await jsonBody(request);
    const reason = str(b.reason, 200);
    if (reason.length < 3) throw new HttpError(400, "Geri çəkmə səbəbini yazın.");
    const batch = await batchOf(str(b.id, 100));
    if (batch.status !== "paid") throw new HttpError(409, "Yalnız ödənilmiş sənədin ödənişləri geri çəkilir.");
    const list = (await db.prepare("SELECT id,month,kind FROM payroll_payments WHERE company_id=? AND batch_id=? AND reversed_at=''").bind(id, batch.id).all<{ id: string; month: string; kind: string }>()).results;
    await reversePayments(list, reason);
    await db.prepare("UPDATE payroll_batches SET status='approved',paid_at='' WHERE id=? AND company_id=?").bind(batch.id, id).run();
    await companyAudit(db, id, userId, "payroll-batch-reverted", batch.id, `${batch.month}: ${list.length} ödəniş — ${reason}`);
    return ok({ ok: true, reversed: list.length });
  }
  if (request.method === "GET" && path === "company/payroll/bank/batch/file") {
    requirePermission("salaries", "Faylı yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const batch = await batchOf(str(requestUrl.searchParams.get("id"), 100));
    if (batch.status === "draft") throw new HttpError(409, "Bank faylı üçün sənədi əvvəl direktor təsdiqləməlidir.");
    if (batch.status === "cancelled") throw new HttpError(409, "Sənəd ləğv edilib.");
    const account = await db.prepare("SELECT bank_name,iban,holder,voen,currency FROM payroll_bank_accounts WHERE id=? AND company_id=?").bind(batch.account_id, id).first<{ bank_name: string; iban: string; holder: string; voen: string; currency: string }>();
    if (!account) throw new HttpError(404, "Göndərən bank hesabı silinib.");
    const items = JSON.parse(batch.items || "[]") as TransferItem[];
    const rows = transferFileRows(items, { bankName: account.bank_name, iban: account.iban, holder: account.holder, voen: account.voen, currency: account.currency }, transferPurpose(batch.month, (["advance", "vacation", "benefit"] as const).find((k) => k === batch.kind) || "salary"));
    rows.push(["", "CƏMİ", "", "", "", batchTotal(items) / 100, "", "", ""]);
    await companyAudit(db, id, userId, "payroll-batch-file", batch.id, batch.month);
    return new Response(Uint8Array.from(createXlsx(TRANSFER_HEADERS, rows, "Köçürmə siyahısı")).buffer, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="bank-kocurme-${batch.kind}-${batch.month}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  }
  if (request.method === "GET" && path === "company/payroll") {
    requirePermission("salaries", "Əmək haqqı cədvəlini yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    await applyDueOrderEffects();
    await auditView("view-payroll", payrollMonth().raw);
    const sheet = await payrollRows(payrollMonth().raw);
    return ok(auditorOnly ? { ...sheet, rows: sheet.rows.map((r) => ({ ...r, iban: r.iban ? "••••" : "", fin: "", cardNumber: "" })) } : sheet);
  }
  // The year at a glance: for every approved month, what each employee earned and paid in tax and insurance.
  if (request.method === "GET" && path === "company/payroll/annual") {
    requirePermission("salaries", "İllik yekunu yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const year = Number(str(requestUrl.searchParams.get("year"), 4)) || new Date().getUTCFullYear();
    if (year < 2000 || year > 2100) throw new HttpError(400, "İli düzgün seçin.");
    await auditView("view-payroll-annual", String(year));
    const last = year === new Date().getUTCFullYear() ? new Date().getUTCMonth() + 1 : 12;
    const months = Array.from({ length: last }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
    const sheets = await Promise.all(months.map((m) => payrollRows(m).then((sheet) => ({ month: m, sheet })).catch(() => null)));
    const approvedMonths: string[] = [];
    const people = new Map<string, { id: string; name: string; position: string; department: string; months: Record<string, { gross: number; incomeTax: number; insurance: number; net: number }> }>();
    for (const item of sheets) {
      if (!item || item.sheet.status !== "approved") continue;
      approvedMonths.push(item.month);
      for (const r of item.sheet.rows) {
        const person = people.get(r.employeeId) || { id: r.employeeId, name: r.name, position: r.position, department: r.department, months: {} };
        person.months[item.month] = { gross: r.result.gross, incomeTax: r.result.incomeTax, insurance: Math.round((r.result.employeeSocial + r.result.employeeUnemployment + r.result.employeeMedical) * 100) / 100, net: r.result.net };
        people.set(r.employeeId, person);
      }
    }
    return ok({ year, months: approvedMonths, notApproved: months.filter((m) => !approvedMonths.includes(m)), employees: [...people.values()].sort((a, b) => a.name.localeCompare(b.name, "az")) });
  }
  if (request.method === "GET" && path === "company/payroll/workbook") {
    requirePermission("salaries", "Hesablama iş kitabını yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const { raw: monthRaw, year, month } = payrollMonth();
    await applyDueOrderEffects();
    await auditView("view-payroll-workbook", monthRaw);
    const sheet = await payrollRows(monthRaw);
    const first = `${monthRaw}-01`;
    const last = `${monthRaw}-31`;
    const ends = new Map((await db.prepare("SELECT id,end_date FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ id: string; end_date: string }>()).results.map((r) => [r.id, r.end_date || ""]));
    const nameOf = new Map(sheet.rows.map((r) => [r.employeeId, r.name]));
    const days = monthDays(year, month, (await db.prepare("SELECT day,kind,label FROM company_calendar WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, first, last).all<CalendarOverride>()).results).map((d) => ({ date: d.date, off: d.off }));
    // Marks of the month become ranges: the same employee and code on following days is one line.
    const marks = (await db.prepare("SELECT employee_id,day,code FROM attendance_marks WHERE company_id=? AND day BETWEEN ? AND ? ORDER BY employee_id,day").bind(id, first, last).all<{ employee_id: string; day: string; code: string }>()).results;
    const leaves: { name: string; code: string; from: string; to: string; note: string }[] = [];
    for (const m of marks) {
      const name = nameOf.get(m.employee_id);
      if (!name || !m.code || m.code === "work") continue;
      const previous = leaves[leaves.length - 1];
      const nextDay = previous ? new Date(Date.parse(`${previous.to}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10) : "";
      if (previous && previous.name === name && previous.code === m.code && nextDay === m.day) previous.to = m.day;
      else leaves.push({ name, code: m.code, from: m.day, to: m.day, note: "" });
    }
    const KIND_TEXT = { general: "Ümumi", writ: "İcra sənədi", alimony: "Aliment" } as const;
    const adds: { name: string; kind: "Mükafat" | "Əlavə" | "Tutulma" | "Avans"; label: string; amount: number; deductionKind: "Ümumi" | "İcra sənədi" | "Aliment" }[] = [];
    for (const r of sheet.rows) {
      // The named lines when the month has them (and they add up to the totals); otherwise one line per total.
      const lines = (kind: "bonus" | "allowance", total: number) => {
        const named = (r.inputs.items || []).filter((x: PayItem) => x.kind === kind);
        const sum = Math.round(named.reduce((t: number, x: PayItem) => t + x.amount, 0) * 100) / 100;
        return named.length && Math.abs(sum - total) < 0.005 ? named.map((x: PayItem) => ({ label: x.label || (kind === "bonus" ? "Mükafat" : "Əlavə"), amount: x.amount })) : total > 0 ? [{ label: kind === "bonus" ? "Mükafat" : "Əlavə", amount: total }] : [];
      };
      for (const l of lines("bonus", r.inputs.bonus)) adds.push({ name: r.name, kind: "Mükafat", label: l.label, amount: l.amount, deductionKind: "Ümumi" });
      for (const l of lines("allowance", r.inputs.allowance)) adds.push({ name: r.name, kind: "Əlavə", label: l.label, amount: l.amount, deductionKind: "Ümumi" });
      for (const d of r.inputs.deductions) adds.push({ name: r.name, kind: "Tutulma", label: d.label || "Tutulma", amount: d.amount, deductionKind: KIND_TEXT[d.kind] || "Ümumi" });
      if (r.result.advances > 0) adds.push({ name: r.name, kind: "Avans", label: "Avans", amount: r.result.advances, deductionKind: "Ümumi" });
    }
    const trips = (await db.prepare("SELECT t.employee_id,t.destination,t.purpose,t.start_date,t.end_date,t.advance_cents,t.daily_cents FROM trips t WHERE t.company_id=? AND t.start_date<=? AND t.end_date>=? AND t.status NOT IN ('rejected','cancelled') ORDER BY t.start_date").bind(id, last, first).all<{ employee_id: string; destination: string; purpose: string; start_date: string; end_date: string; advance_cents: number; daily_cents: number }>()).results
      .filter((t) => nameOf.has(t.employee_id))
      .map((t) => ({ name: nameOf.get(t.employee_id) as string, destination: t.destination, place: "", start: t.start_date, end: t.end_date, purpose: t.purpose, advance: t.advance_cents / 100, other: 0, daily: t.daily_cents / 100 }));
    const rateDay = `${monthRaw}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;
    const rates = await tripRates(rateDay);
    const benefitRows = (await db.prepare("SELECT key,value FROM hr_settings WHERE company_id=? AND key IN ('benefit_sick_percent','benefit_maternity_percent','benefit_min_pension')").bind(id).all<{ key: string; value: string }>()).results;
    const benefitRate = (key: string, fallback: number) => {
      const n = Number(benefitRows.find((x) => x.key === key)?.value);
      return Number.isFinite(n) && n >= 0 && n <= 100 && benefitRows.some((x) => x.key === key) ? n : fallback;
    };
    // The branches of the month: limits, sales, rules and who works where (only links that count in this month).
    const wbBranches = await branchContext(monthRaw);
    const empByWb = new Map(sheet.rows.map((r) => [r.employeeId, r]));
    return ok({
      month: monthRaw,
      branches: {
        mode: wbBranches.mode,
        branches: wbBranches.branches.map((b) => {
          const sales = wbBranches.sales.find((x) => x.branchId === b.id);
          const rule = wbBranches.rules.find((x) => x.branchId === b.id);
          return { name: b.name, code: b.code, city: b.city, active: b.active, target: sales?.target || 0, sales: sales?.sales || 0, kind: rule?.kind || "fixed", value: rule?.value || 0, ruleActive: rule ? rule.active : true };
        }),
        links: wbBranches.links
          .filter((l) => empByWb.has(l.employeeId) && linkActiveIn(l, monthRaw))
          .map((l) => ({ name: empByWb.get(l.employeeId)?.name || "", fin: empByWb.get(l.employeeId)?.fin || "", branch: wbBranches.branches.find((b) => b.id === l.branchId)?.name || "", role: l.role, sharePct: l.sharePct, bonusEligible: l.bonusEligible, from: l.from, to: l.to })),
      },
      days,
      employees: sheet.rows.map((r) => ({
        name: r.name,
        fin: r.fin || "",
        position: r.position,
        department: r.department,
        salary: r.monthlySalary,
        sector: r.sector,
        taxReduction: r.taxReduction,
        weekHours: r.weekHours,
        averageMonthly: r.annual?.averageMonthly || (r.result.leaveCompensationDays > 0 ? Math.round(((r.result.lines.find((l: { id: string }) => l.id === "leave-compensation")?.amount || 0) * 30.4 / r.result.leaveCompensationDays) * 100) / 100 : 0),
        leaveCompDays: r.result.leaveCompensationDays || 0,
        benefitEligible: r.result.benefitEligible !== false,
        nightPercent: r.nightPercent || 0,
        start: r.startDate || "",
        end: ends.get(r.employeeId) || "",
      })),
      leaves,
      adds,
      hours: sheet.rows.filter((r) => r.hours.overtime || r.hours.restDay || r.hours.night).map((r) => ({ name: r.name, overtime: r.hours.overtime, restDay: r.hours.restDay, night: r.hours.night })),
      trips,
      rates: { USD: rates.USD || 0, EUR: rates.EUR || 0, GBP: rates.GBP || 0, JPY: rates.JPY || 0 },
      ratesDate: rateDay,
      benefit: { sickPercent: benefitRate("benefit_sick_percent", SICK_BENEFIT_PERCENT), maternityPercent: benefitRate("benefit_maternity_percent", MATERNITY_BENEFIT_PERCENT), minPension: Math.max(0, Number(benefitRows.find((x) => x.key === "benefit_min_pension")?.value) || 0) },
    });
  }
  if (request.method === "GET" && path === "company/payroll/export") {
    requirePermission("salaries", "Cədvəli yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const sheet = await payrollRows(payrollMonth().raw);
    const kindRaw = str(requestUrl.searchParams.get("kind"), 12);
    const kind = kindRaw === "bank" ? "bank" : kindRaw === "declaration" ? "declaration" : "sheet";
    const money = (v: number) => Math.round(v * 100) / 100;
    const METHOD_TEXT: Record<string, string> = { bank: "Bank hesabına", card: "Maaş kartına", cash: "Nağd" };
    const line = (r: (typeof sheet.rows)[number], lineId: string) => r.result.lines.find((l) => l.id === lineId)?.amount || 0;
    let book: Uint8Array;
    if (kind === "declaration") {
      // One row per employee with the bases and contributions a monthly tax and insurance return asks for.
      const header = ["№", "Ad Soyad", "FİN", "SSN", "VÖEN", "Sektor", "İşlənmiş gün", "Hesablanmış əmək haqqı (gross)", "Vergi güzəşti", "Gəlir vergisi", "DSMF işçi", "DSMF işəgötürən", "İşsizlik işçi", "İşsizlik işəgötürən", "Tibbi işçi", "Tibbi işəgötürən", "Cəmi sığorta", "Net"];
      const lines = sheet.rows.map((r, i) => {
        const x = r.result;
        return [i + 1, r.name, r.fin, r.ssn, r.voen, r.sector === "public" ? "Dövlət" : "Qeyri-dövlət", x.workedDays + x.paidLeaveDays + x.downtimeDays, x.gross, x.taxReduction, x.incomeTax, x.employeeSocial, x.employerSocial, x.employeeUnemployment, x.employerUnemployment, x.employeeMedical, x.employerMedical, money(x.employeeSocial + x.employerSocial + x.employeeUnemployment + x.employerUnemployment + x.employeeMedical + x.employerMedical), x.net];
      });
      lines.push(["", "CƏMİ", "", "", "", "", "", ...header.slice(7).map((_, c) => money(lines.reduce((t, row) => t + (Number(row[c + 7]) || 0), 0)))]);
      book = createXlsxBook([{ name: "Bəyannamə", headers: header, rows: lines }]);
    } else if (kind === "bank") {
      const due = sheet.rows.filter((r) => r.outstanding > 0);
      const rows: (string | number)[][] = due.map((r, i) => [i + 1, r.name, r.fin, r.iban || "IBAN yoxdur", r.position, r.department, r.result.toPay, r.advances, r.salaryPaid, r.outstanding, `${sheet.month} ayı üçün əmək haqqı`]);
      rows.push(["", "CƏMİ", "", "", "", "", money(due.reduce((t, r) => t + r.result.toPay, 0)), money(due.reduce((t, r) => t + r.advances, 0)), money(due.reduce((t, r) => t + r.salaryPaid, 0)), money(due.reduce((t, r) => t + r.outstanding, 0)), ""]);
      book = createXlsxBook([{ name: "Bank reyestri", headers: ["№", "Ad Soyad", "FİN", "IBAN", "Vəzifə", "Departament", "Ödəniləcək (net − avans)", "Verilmiş avans", "Artıq ödənilib", "Köçürüləcək məbləğ (AZN)", "Təyinat"], rows }]);
    } else {
      const headers = [
        "№", "Ad Soyad", "FİN", "SSN", "VÖEN", "Vəzifə", "Departament", "Şöbə", "İşə qəbul tarixi", "Status", "Sektor", "Maaş növü (razılaşdırılmış)", "Həftəlik saat", "Vergi güzəşti", "Güzəşt məbləği (AZN)",
        "Aylıq maaş (gross)", "Saatlıq tarif", "Norma günü", "İşlənmiş gün", "Ödənişli məzuniyyət/icazə günü", "Boşdayanma günü", "Müavinət günü", "Ödənişsiz gün",
        "İşlənmiş günlərə görə", "Məzuniyyət/icazə haqqı", "Boşdayanma haqqı (2/3)", "Artıq iş saatı", "Artıq iş haqqı", "İstirahət/bayram günü saatı", "İstirahət/bayram günü haqqı", "Gecə saatı", "Gecə əlavəsi", "Əlavələr", "Mükafat",
        "Cəmi hesablanıb (gross)", "Gəlir vergisi", "DSMF (işçi)", "İşsizlik sığortası (işçi)", "İcbari tibbi sığorta (işçi)", "Cəmi qanuni tutulmalar", "Net (vergilərdən sonra)",
        "Digər tutulmalar (tətbiq edilən)", "Digər tutulmalar (tələb edilən)", "Verilmiş avans", "Ödəniləcək", "Faktiki ödənilib", "Qalıq borc", "Son ödəniş tarixi", "Avans həddi (indiyədək qazanılan)",
        "DSMF (işəgötürən)", "İşsizlik (işəgötürən)", "Tibbi sığorta (işəgötürən)", "İşəgötürən üzrə cəmi sığorta", "İşəgötürənin ümumi xərci", "Ödəniş üsulu", "Bank", "Bank kodu", "IBAN", "Hesab nömrəsi", "Maaş kartı", "Əmək məzuniyyəti haqqı (md. 140)", "Orta aylıq (əvvəlki 12 ay)", "Orta gündəlik (÷ 30,4)", "Məzuniyyət təqvim günü", "Müavinət təqvim günü (xəstəlik/analıq)", "Müavinət (DSMF, ayrıca ödənilir)", "Qeyd",
      ];
      const status = (v: string) => (v === "left" ? "İşdən çıxıb" : "İşləyir");
      const body: (string | number)[][] = sheet.rows.map((r, i) => {
        const x = r.result;
        const legal = money(x.incomeTax + x.employeeSocial + x.employeeUnemployment + x.employeeMedical);
        const otherApplied = money(x.otherDeductions.reduce((t, d) => t + d.applied, 0));
        const otherAsked = money(x.otherDeductions.reduce((t, d) => t + d.amount, 0));
        const employer = money(x.employerSocial + x.employerUnemployment + x.employerMedical);
        return [
          i + 1, r.name, r.fin, r.ssn, r.voen, r.position, r.department, r.section || "", r.startDate, status(r.status), r.sector === "public" ? "Dövlət" : "Qeyri-dövlət", r.salaryType === "net" ? "Net" : "Gross", r.weekHours, r.benefit, x.taxReduction,
          r.monthlySalary, x.hourly, x.normDays, x.workedDays, x.paidLeaveDays, x.downtimeDays, x.benefitDays, x.unpaidDays,
          line(r, "worked"), line(r, "paid-leave"), line(r, "downtime"), r.inputs.overtimeHours, line(r, "overtime"), r.inputs.restDayHours, line(r, "rest-day"), r.inputs.nightHours, line(r, "night"), line(r, "allowance"), line(r, "bonus"),
          x.gross, x.incomeTax, x.employeeSocial, x.employeeUnemployment, x.employeeMedical, legal, x.net,
          otherApplied, otherAsked, r.advances, x.toPay, r.salaryPaid, r.outstanding, r.lastPaid, r.availableAdvance,
          x.employerSocial, x.employerUnemployment, x.employerMedical, employer, x.employerCost, METHOD_TEXT[r.payMethod] || "—", r.bankName, r.bankCode, r.iban, r.accountNumber, r.card, line(r, "vacation"), r.annual?.averageMonthly || 0, r.annual ? Math.round((r.annual.averageMonthly / 30.4) * 100) / 100 : 0, r.result.vacationDays, r.result.benefitCalendarDays, r.result.benefitAmount, [r.inputs.note, r.annual?.estimated ? `Orta əmək haqqı təxminidir (${r.annual.months} ay, təsdiqlənmiş ay yoxdur)` : "", ...x.notes].filter(Boolean).join(" | "),
        ];
      });
      // Totals for the money and quantity columns; text columns stay empty.
      const textColumns = new Set(headers.map((h, c) => (/^(Orta|Saatlıq|Həftəlik|Aylıq maaş|Norma)/.test(h) || body.some((row) => typeof row[c] === "string" && row[c] !== "") ? c : -1)).filter((c) => c >= 0));
      const totals: (string | number)[] = headers.map((_, c) => (c === 1 ? "CƏMİ" : textColumns.has(c) ? "" : money(body.reduce((t, row) => t + (Number(row[c]) || 0), 0))));
      body.push(totals);
      const deductionRows: (string | number)[][] = [];
      for (const r of sheet.rows) for (const d of r.result.otherDeductions) deductionRows.push([r.name, r.fin, d.label || "Digər tutulma", d.kind === "writ" ? "İcra sənədi (50%-dək)" : d.kind === "alimony" ? "Aliment və s. (70%-dək)" : "Ümumi (20%-dək)", d.amount, d.applied, money(d.amount - d.applied)]);
      const methodText: Record<string, string> = { bank: "Bank köçürməsi", card: "Kart", cash: "Nağd", other: "Digər" };
      const kindText = (pay: { kind: string; title: string }) => ({ advance: "Avans", salary: "Əmək haqqı", vacation: "Məzuniyyət haqqı", benefit: "Sosial sığorta müavinəti" } as Record<string, string>)[pay.kind] || `Digər${pay.title ? `: ${pay.title}` : ""}`;
      const paymentRows: (string | number)[][] = [];
      for (const r of sheet.rows) {
        // Running balance per employee: what is still owed after each payment of the pay itself.
        let left = r.result.net - r.result.otherDeductions.reduce((t, d) => t + d.applied, 0);
        for (const pay of [...r.payments].sort((a, b) => a.paidOn.localeCompare(b.paidOn))) {
          const counts = !pay.reversed && (pay.kind === "advance" || pay.kind === "salary" || pay.kind === "vacation");
          if (counts) left = money(left - pay.amount);
          paymentRows.push([pay.paidOn, r.name, r.fin, kindText(pay), pay.amount, counts ? left : "", pay.reversed ? `Geri çəkilib: ${pay.reverseReason} (${pay.reversedBy})` : "Qüvvədədir", methodText[pay.method] || pay.method, r.iban, pay.note]);
        }
      }
      paymentRows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      const balanceRows: (string | number)[][] = sheet.rows.map((r, i) => {
        const due = money(r.result.net - r.result.otherDeductions.reduce((t, d) => t + d.applied, 0));
        const paid = money(r.advances + r.salaryPaid);
        const left = money(Math.max(0, due - paid));
        return [i + 1, r.name, r.fin, r.position, r.department, due, r.advances, r.salaryPaid, paid, left, due > 0 ? Math.min(100, Math.round((paid / due) * 100)) : 0, left <= 0.005 && due > 0 ? "Tam ödənilib" : paid > 0 ? "Qismən ödənilib" : "Ödənilməyib", r.lastPaid, r.payments.filter((x) => !x.reversed).length, METHOD_TEXT[r.payMethod] || "—", r.iban || r.card || "", r.vacationDue, r.vacationPaid, r.benefitDue, r.benefitPaid, r.extraPaid, r.payments.filter((x) => x.reversed).length];
      });
      balanceRows.push(["", "CƏMİ", "", "", "", ...[5, 6, 7, 8, 9].map((c) => money(balanceRows.reduce((t, row) => t + (Number(row[c]) || 0), 0))), "", "", "", "", "", "", "", "", ...[16, 17, 18, 19, 20, 21].map((c) => money(balanceRows.reduce((t, row) => t + (Number(row[c]) || 0), 0)))]);
      const unitRows = [...new Set(sheet.rows.map((r) => r.department || "Departamentsiz"))].sort().map((dep) => {
        const group = sheet.rows.filter((r) => (r.department || "Departamentsiz") === dep);
        const total = (pick: (r: (typeof group)[number]) => number) => money(group.reduce((t, r) => t + pick(r), 0));
        return [dep, group.length, total((r) => r.result.gross), total((r) => r.result.incomeTax), total((r) => r.result.employeeSocial + r.result.employeeUnemployment + r.result.employeeMedical), total((r) => r.result.net), total((r) => r.advances), total((r) => r.result.toPay), total((r) => r.outstanding), total((r) => r.result.employerSocial + r.result.employerUnemployment + r.result.employerMedical), total((r) => r.result.employerCost)];
      });
      book = createXlsxBook([
        { name: "Əmək haqqı", headers, rows: body },
        { name: "Departamentlər üzrə", headers: ["Departament", "İşçi sayı", "Gross", "Gəlir vergisi", "İşçi sığortası", "Net", "Avans", "Ödəniləcək", "Qalıq borc", "İşəgötürən sığortası", "İşəgötürənin ümumi xərci"], rows: unitRows },
        { name: "Tutulmalar", headers: ["Ad Soyad", "FİN", "Tutulmanın adı", "Növü", "Tələb edilən", "Tətbiq edilən", "Növbəti aya qalan"], rows: deductionRows },
        { name: "Ödəniş balansı", headers: ["№", "Ad Soyad", "FİN", "Vəzifə", "Departament", "Ödəniləcək cəmi (net − tutulmalar)", "Avans", "Maaş ödənişi", "Cəmi ödənilib", "Qalıq", "Ödənilmə %", "Vəziyyət", "Son ödəniş", "Ödəniş sayı", "Ödəniş üsulu", "Hesab/kart", "Məzuniyyət haqqı (ayrıca ödənilə bilən hissə)", "Məzuniyyət haqqı ödənilib", "Müavinət hesablanıb", "Müavinət ödənilib", "Digər ödənişlər", "Geri çəkilmiş ödəniş sayı"], rows: balanceRows },
        { name: "Ödənişlər", headers: ["Tarix", "Ad Soyad", "FİN", "Növ", "Məbləğ (AZN)", "Ödənişdən sonra qalıq", "Vəziyyət", "Üsul", "IBAN", "Qeyd"], rows: paymentRows },
      ]);
    }
    await companyAudit(db, id, userId, "payroll-exported", kind, sheet.month);
    return new Response(Uint8Array.from(book).buffer, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="emek-haqqi-${kind === "bank" ? "bank" : kind === "declaration" ? "beyanname" : "cedvel"}-${sheet.month}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  }
  if (request.method === "GET" && path === "company/payroll/payslip") {
    requirePermission("salaries", "Haqq-hesab vərəqəsini yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const sheet = await payrollRows(payrollMonth().raw);
    const row = sheet.rows.find((r) => r.employeeId === str(requestUrl.searchParams.get("employeeId"), 100));
    if (!row) throw new HttpError(404, "İşçi bu ay üçün siyahıda yoxdur.");
    await auditView("view-payslip", row.employeeId, `${row.name} ${sheet.month}`);
    const company = await db.prepare("SELECT name FROM accounts WHERE id=?").bind(id).first<{ name: string }>();
    return ok({ month: sheet.month, status: sheet.status, company: company?.name || "", schedule: sheet.schedule, row });
  }
  if (request.method === "POST" && path === "company/payroll/input") {
    requirePermission("salaries", "Əmək haqqı məlumatlarını yalnız əmək haqqı icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const monthRaw = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw)) throw new HttpError(400, "Ayı düzgün seçin.");
    if (await payrollLocked(monthRaw)) throw new HttpError(409, "Bu ay təsdiqlənib: dəyişmək üçün əvvəlcə təsdiqi geri çəkin (direktor).");
    const employee = await db.prepare("SELECT id FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.employeeId, 100), id).first<{ id: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const clean: PayInputs = cleanInputs(b.inputs);
    await db
      .prepare("INSERT INTO payroll_inputs(company_id,month,employee_id,data,updated) VALUES(?,?,?,?,?) ON CONFLICT(company_id,month,employee_id) DO UPDATE SET data=excluded.data,updated=excluded.updated")
      .bind(id, monthRaw, employee.id, JSON.stringify(clean), new Date().toISOString())
      .run();
    await companyAudit(db, id, userId, "payroll-input", employee.id, monthRaw);
    return ok({ ok: true, inputs: clean });
  }
  if (request.method === "GET" && path === "company/payroll/recurring") {
    requirePermission("salaries", "Təkrarlanan maddələri yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    const rows = await db
      .prepare("SELECT id,type,label,amount_cents,deduction_kind,from_month,to_month FROM payroll_recurring WHERE company_id=? AND employee_id=? ORDER BY from_month DESC")
      .bind(id, str(requestUrl.searchParams.get("employeeId"), 100))
      .all<{ id: string; type: string; label: string; amount_cents: number; deduction_kind: string; from_month: string; to_month: string }>();
    return ok({ items: rows.results.map((r) => ({ id: r.id, type: r.type, label: r.label, amount: r.amount_cents / 100, kind: r.deduction_kind, from: r.from_month, to: r.to_month })) });
  }
  if (request.method === "POST" && path === "company/payroll/recurring") {
    requirePermission("salaries", "Təkrarlanan maddələri yalnız əmək haqqı icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const monthOk = (v: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
    const from = str(b.from, 7);
    const to = str(b.to, 7);
    const label = str(b.label, 120);
    const amount = Math.round((Number(b.amount) || 0) * 100);
    if (label.length < 2) throw new HttpError(400, "Maddənin adını yazın.");
    if (!(amount > 0) || amount > 100_000_000) throw new HttpError(400, "Məbləği düzgün yazın.");
    if (!monthOk(from)) throw new HttpError(400, "Başlanğıc ayı seçin.");
    if (to && (!monthOk(to) || to < from)) throw new HttpError(400, "Son ay başlanğıcdan əvvəl ola bilməz.");
    const employee = await db.prepare("SELECT id FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.employeeId, 100), id).first<{ id: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const type = b.type === "deduction" ? "deduction" : "addition";
    const kind = ["writ", "alimony"].includes(str(b.kind, 10)) ? str(b.kind, 10) : "general";
    const count = (await db.prepare("SELECT COUNT(*) AS n FROM payroll_recurring WHERE company_id=? AND employee_id=?").bind(id, employee.id).first<{ n: number }>())?.n || 0;
    if (count >= 20) throw new HttpError(409, "Bir işçi üçün ən çox 20 təkrarlanan maddə saxlanılır.");
    const itemId = crypto.randomUUID();
    await db
      .prepare("INSERT INTO payroll_recurring(id,company_id,employee_id,type,label,amount_cents,deduction_kind,from_month,to_month,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
      .bind(itemId, id, employee.id, type, label, amount, kind, from, to, userId, new Date().toISOString())
      .run();
    await companyAudit(db, id, userId, "payroll-recurring-added", employee.id, `${type}: ${label} ${amount / 100} AZN, ${from}–${to || "…"}`);
    return ok({ ok: true, id: itemId }, 201);
  }
  if (request.method === "POST" && path === "company/payroll/recurring/delete") {
    requirePermission("salaries", "Təkrarlanan maddələri yalnız əmək haqqı icazəsi olan şəxs silə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM payroll_recurring WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    await companyAudit(db, id, userId, "payroll-recurring-removed", str(b.id, 100), "");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/payroll/inputs-import") {
    requirePermission("salaries", "Əmək haqqı məlumatlarını yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const b = await jsonBody(request);
    const monthRaw = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw)) throw new HttpError(400, "Ayı düzgün seçin.");
    if (await payrollLocked(monthRaw)) throw new HttpError(409, "Bu ay təsdiqlənib: dəyişmək üçün əvvəlcə təsdiqi geri çəkin (direktor).");
    const parsed = parsePayrollRows((Array.isArray(b.rows) ? b.rows : []).slice(0, 501).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda sətir tapılmadı.");
    // Named bonus / allowance lines (calculation workbook), grouped by the employee's name.
    const itemsBy = new Map<string, PayItem[]>();
    for (const raw of (Array.isArray(b.items) ? b.items : []).slice(0, 2000)) {
      const it = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const key = str(it.name, 120);
      if (!key) continue;
      itemsBy.set(key, [...(itemsBy.get(key) || []), { kind: it.kind === "allowance" ? "allowance" : "bonus", label: str(it.label, 80), amount: Number(it.amount) || 0 }]);
    }
    const people = await employeeRefs();
    const existing = new Map((await db.prepare("SELECT employee_id,data FROM payroll_inputs WHERE company_id=? AND month=?").bind(id, monthRaw).all<{ employee_id: string; data: string }>()).results.map((r) => [r.employee_id, r.data]));
    const issues = [...parsed.issues];
    const statements: D1PreparedStatement[] = [];
    const now = new Date().toISOString();
    let applied = 0;
    for (const row of parsed.rows) {
      const found = matchEmployee(people, { name: row.name, email: row.email, fin: row.fin });
      if ("error" in found) {
        issues.push({ line: row.line, reason: found.error });
        continue;
      }
      let current: PayInputs = { ...EMPTY_INPUTS };
      try {
        current = cleanInputs(JSON.parse(existing.get(found.id) || "{}"));
      } catch (error) {
        // Unreadable earlier data is replaced.
        quiet("route-catch", error);
      }
      const has = (f: string) => row.present.includes(f);
      // The named lines of the calculation workbook; the totals above stay the numbers the pay is calculated from.
      const named = itemsBy.get(row.name) || [];
      const next: PayInputs = {
        ...current,
        ...(named.length && has("bonus") ? { items: named } : {}),
        bonus: has("bonus") ? row.bonus : current.bonus,
        allowance: has("allowance") ? row.allowance : current.allowance,
        note: has("note") && row.note ? row.note : current.note,
        deductions: has("deductionAmount") ? (row.deductionAmount > 0 ? [...current.deductions.filter((d) => d.label !== row.deductionLabel), { label: row.deductionLabel, amount: row.deductionAmount, kind: row.deductionKind }] : current.deductions) : current.deductions,
      };
      statements.push(
        db
          .prepare("INSERT INTO payroll_inputs(company_id,month,employee_id,data,updated) VALUES(?,?,?,?,?) ON CONFLICT(company_id,month,employee_id) DO UPDATE SET data=excluded.data,updated=excluded.updated")
          .bind(id, monthRaw, found.id, JSON.stringify(cleanInputs(next)), now),
      );
      applied++;
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "payroll-inputs-imported", "", `${monthRaw}: ${applied} işçi`);
    return ok({ ok: true, applied, created: applied, issues });
  }
  return undefined;
}
