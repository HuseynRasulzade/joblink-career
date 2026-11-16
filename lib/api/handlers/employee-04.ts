// employee: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { EMPTY_INPUTS, cleanInputs, computePay, paymentDate } from "@/lib/payroll-calc";
import { HttpError, jsonBody, str } from "@/lib/server";
import { LINK_ATTEMPTS_PER_HOUR, formatLinkCode, generateLinkCode, hashLinkCode, linkExpired, linkExpiry, normalizeLinkCode, validLinkCode } from "@/lib/employee-link";
import { OTHER_REQUEST, isApplicationKind, requestKindLabel, requestProblems, requestWarnings } from "@/lib/requests";
import { type SlipFigures, explainChange } from "@/lib/payroll-explain";
import { companyAudit, notify, notifyCompanyRoles } from "@/lib/api-core";
import { employeePay } from "@/lib/payroll";
import { quiet } from "@/lib/quiet";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_employee_04(c: Pick<RouteCtx, "APPLICATION_STATUS_TEXT" | "AWAY_KINDS" | "REQUEST_KINDS_FOR_EMPLOYEE" | "accountRole" | "approvedSlipOf" | "approverOf" | "db" | "id" | "leaveChecks" | "ownWorkplace" | "path" | "request" | "requestUrl" | "requirePermission" | "reveal" | "userId">): Promise<Response | undefined> {
  const { APPLICATION_STATUS_TEXT, AWAY_KINDS, REQUEST_KINDS_FOR_EMPLOYEE, accountRole, approvedSlipOf, approverOf, db, id, leaveChecks, ownWorkplace, path, request, requestUrl, requirePermission, reveal, userId } = c;
  if (request.method === "GET" && path === "employee/payslips") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const runs = await db.prepare("SELECT month,snapshot,approved_at FROM payroll_runs WHERE company_id=? AND status='approved' ORDER BY month DESC LIMIT 24").bind(employee.company_id).all<{ month: string; snapshot: string; approved_at: string }>();
    const pays = await db.prepare("SELECT month,kind,amount_cents FROM payroll_payments WHERE company_id=? AND employee_id=? AND reversed_at=''").bind(employee.company_id, employee.id).all<{ month: string; kind: string; amount_cents: number }>();
    const figuresOf = (month: string, r: ReturnType<typeof computePay>): SlipFigures => ({ month, gross: r.gross, net: r.net, incomeTax: r.incomeTax, insurance: r.employeeSocial + r.employeeUnemployment + r.employeeMedical, deductions: r.otherDeductions.reduce((t, d) => t + d.applied, 0), workedDays: r.workedDays + r.paidLeaveDays, normDays: r.normDays, lines: r.lines, toPay: r.toPay });
    const mineBy = new Map<string, ReturnType<typeof computePay>>();
    for (const run of runs.results) {
      try {
        const mine = (JSON.parse(run.snapshot) as { rows?: { employeeId: string; result: ReturnType<typeof computePay> }[] }).rows?.find((r) => r.employeeId === employee.id);
        if (mine) mineBy.set(run.month, mine.result);
      } catch (error) {
        // A broken snapshot gives no figures for that month.
        quiet("route-catch", error);
      }
    }
    const ordered = [...mineBy.keys()].sort();
    const months = runs.results.flatMap((run) => {
      try {
        const mine = (JSON.parse(run.snapshot) as { rows?: { employeeId: string; result: ReturnType<typeof computePay> }[] }).rows?.find((r) => r.employeeId === employee.id);
        if (!mine) return [];
        const previousMonth = ordered[ordered.indexOf(run.month) - 1];
        const paid = pays.results.filter((p) => p.month === run.month);
        const sum = (kinds: string[]) => paid.filter((p) => kinds.includes(p.kind)).reduce((t, p) => t + p.amount_cents, 0) / 100;
        const salaryPaid = sum(["salary", "vacation"]);
        return [{ month: run.month, gross: mine.result.gross, net: mine.result.net, toPay: mine.result.toPay, advances: mine.result.advances, paid: sum(["advance", "salary", "vacation", "benefit"]), outstanding: Math.max(0, Math.round((mine.result.toPay - salaryPaid) * 100) / 100), benefit: mine.result.benefitAmount || 0, explain: explainChange(previousMonth ? figuresOf(previousMonth, mineBy.get(previousMonth)!) : null, figuresOf(run.month, mine.result)) }];
      } catch {
        return [];
      }
    });
    return ok({ months });
  }
  if (request.method === "GET" && path === "employee/payslip") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const month = str(requestUrl.searchParams.get("month"), 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, "Ayı düzgün seçin.");
    const slip = await approvedSlipOf(employee, month);
    if (!slip) throw new HttpError(404, "Bu ay üçün təsdiqlənmiş haqq-hesab vərəqəsi yoxdur.");
    const [company, profileRow, payments, settings, inputs] = await Promise.all([
      db.prepare("SELECT name FROM accounts WHERE id=?").bind(employee.company_id).first<{ name: string }>(),
      db.prepare("SELECT salary_cents,salary_type,sector,profile FROM company_employees WHERE id=?").bind(employee.id).first<{ salary_cents: number; salary_type: string; sector: string; profile: string }>(),
      db.prepare("SELECT kind,amount_cents,paid_on,method,note,title FROM payroll_payments WHERE company_id=? AND employee_id=? AND month=? AND reversed_at='' ORDER BY paid_on,created").bind(employee.company_id, employee.id, month).all<{ kind: string; amount_cents: number; paid_on: string; method: string; note: string; title: string }>(),
      db.prepare("SELECT pay_day FROM payroll_settings WHERE company_id=?").bind(employee.company_id).first<{ pay_day: number }>(),
      db.prepare("SELECT data FROM payroll_inputs WHERE company_id=? AND month=? AND employee_id=?").bind(employee.company_id, month, employee.id).first<{ data: string }>(),
    ]);
    const profile = (await reveal(profileRow?.profile)).profile;
    const paid = (kinds: string[]) => payments.results.filter((p) => kinds.includes(p.kind)).reduce((t, p) => t + p.amount_cents, 0) / 100;
    const salaryPaid = paid(["salary", "vacation"]);
    let inputData = { ...EMPTY_INPUTS };
    try {
      inputData = cleanInputs(JSON.parse(inputs?.data || "{}"));
    } catch (error) {
      // No extra inputs saved for the month.
      quiet("route-catch", error);
    }
    return ok({
      company: company?.name || "",
      month,
      approved: true,
      payDate: paymentDate(Number(month.slice(0, 4)), Number(month.slice(5, 7)), settings?.pay_day || 28),
      row: {
        name: employee.name, position: employee.position, department: employee.department, section: employee.section, startDate: employee.start_date,
        fin: profile.fin, ssn: profile.ssn, iban: profile.iban, benefit: "", monthlySalary: profileRow && profileRow.salary_cents > 0 ? employeePay(profileRow.salary_cents / 100, profileRow.salary_type === "net" ? "net" : "gross", profileRow.sector === "public" ? "public" : "private", slip.result.taxReduction)?.gross || 0 : 0, weekHours: 40,
        advances: paid(["advance"]), salaryPaid, outstanding: Math.max(0, Math.round((slip.result.toPay - salaryPaid) * 100) / 100),
        annual: null, inputs: inputData, result: slip.result,
        payments: payments.results.map((p) => ({ kind: p.kind, amount: p.amount_cents / 100, paidOn: p.paid_on, method: p.method, note: p.note, title: p.title })),
      },
    });
  }
  if (request.method === "POST" && path === "employee/link") {
    if (accountRole === "company") throw new HttpError(403, "İşçi profili yalnız şəxsi hesab üçündür.");
    const b = await jsonBody(request);
    const failed = await db
      .prepare("SELECT COUNT(*) AS n FROM employee_link_attempts WHERE user_id=? AND created>=?")
      .bind(userId, new Date(Date.now() - 3_600_000).toISOString())
      .first<{ n: number }>();
    if (Number(failed?.n) >= LINK_ATTEMPTS_PER_HOUR) throw new HttpError(429, "Çox sayda yanlış kod yazdınız. Bir saatdan sonra yenidən cəhd edin.");
    const code = normalizeLinkCode(str(b.code, 40));
    const miss = async () => {
      await db.prepare("INSERT INTO employee_link_attempts(user_id,created) VALUES(?,?)").bind(userId, new Date().toISOString()).run();
      throw new HttpError(404, "Kod yanlışdır, istifadə olunub və ya müddəti bitib. Şirkətin HR-dan yeni kod istəyin.");
    };
    if (!validLinkCode(code)) return miss();
    const hash = await hashLinkCode(code);
    const row = await db
      .prepare("SELECT id,company_id,name,user_id,link_expires FROM company_employees WHERE link_hash=? AND status IN ('active','leave')")
      .bind(hash)
      .first<{ id: string; company_id: string; name: string; user_id: string; link_expires: string }>();
    if (!row || row.user_id || linkExpired(row.link_expires, new Date())) return miss();
    const claimed = await db
      .prepare("UPDATE company_employees SET user_id=?,link_hash='',link_expires='',updated=? WHERE id=? AND link_hash=? AND user_id=''")
      .bind(userId, new Date().toISOString(), row.id, hash)
      .run();
    if (!claimed.meta.changes) return miss();
    await companyAudit(db, row.company_id, userId, "employee-linked", row.id, `${row.name}: işçi profili qoşuldu`);
    await notify(db, { userId: row.company_id, type: "employee", title: `${row.name} işçi profilini qoşdu`, body: "İşçi artıq öz profilindən ərizə göndərə bilər.", link: "hr-employees" }).catch((error) => quiet("route-best-effort", error));
    return ok({ ok: true, employeeId: row.id });
  }
  if (request.method === "GET" && path === "employee/applications") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const rows = await db
      .prepare(
        `SELECT q.id,q.kind,q.data,q.status,q.decision,q.source,q.created,q.manager_status,q.manager_name,q.manager_note,o.number AS order_number,o.status AS order_status
         FROM employee_requests q LEFT JOIN employee_orders o ON o.id=q.order_id
         WHERE q.employee_id=? AND q.company_id=? ORDER BY q.created DESC LIMIT 200`,
      )
      .bind(employee.id, employee.company_id)
      .all<{ id: string; kind: string; data: string; status: string; decision: string; source: string; created: string; manager_status: string; manager_name: string; manager_note: string; order_number: string | null; order_status: string | null }>();
    return ok({
      applications: rows.results.map((r) => ({
        id: r.id,
        kind: r.kind,
        label: requestKindLabel(r.kind),
        data: (() => {
          try {
            return JSON.parse(r.data);
          } catch {
            return {};
          }
        })(),
        status: r.status,
        statusText: APPLICATION_STATUS_TEXT[r.status] || r.status,
        reply: r.decision,
        manager: r.manager_status ? { status: r.manager_status, name: r.manager_name, note: r.manager_note } : null,
        source: r.source === "employee" ? "employee" : r.source === "plan" ? "plan" : "hr",
        orderNumber: r.order_number || "",
        orderStatus: r.order_status || "",
        created: r.created,
      })),
      kinds: [...REQUEST_KINDS_FOR_EMPLOYEE, { id: OTHER_REQUEST.id, label: OTHER_REQUEST.label, hint: OTHER_REQUEST.hint }],
    });
  }
  if (request.method === "POST" && path === "employee/applications/save") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const kind = str(b.kind, 20);
    if (!isApplicationKind(kind)) throw new HttpError(400, "Ərizənin növü düzgün deyil.");
    if (kind === "compensation") throw new HttpError(400, "İstifadə edilməmiş məzuniyyətin kompensasiyası yalnız əmək müqaviləsinə xitam verilərkən HR tərəfindən hazırlanır.");
    const raw = (b.data && typeof b.data === "object" ? b.data : {}) as Record<string, unknown>;
    const data = { from: str(raw.from, 10), to: str(raw.to, 10), quantity: Math.max(0, Math.min(3650, Number(raw.quantity) || 0)), reason: str(raw.reason, 1000), basis: str(raw.basis, 300) };
    const problems = requestProblems(kind, data);
    if (problems.length) throw new HttpError(400, problems[0]);
    const open = await db.prepare("SELECT COUNT(*) AS n FROM employee_requests WHERE employee_id=? AND status='new'").bind(employee.id).first<{ n: number }>();
    if (Number(open?.n) >= 10) throw new HttpError(409, "Cavab gözləyən 10 ərizəniz var. Cavab gəldikdən sonra yenisini yaza bilərsiniz.");
    const requestId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db
      .prepare("INSERT INTO employee_requests(id,company_id,employee_id,kind,data,status,source,created_by,created_by_name,created,updated) VALUES(?,?,?,?,?,'new','employee',?,?,?,?)")
      .bind(requestId, employee.company_id, employee.id, kind, JSON.stringify(data), userId, employee.name, now, now)
      .run();
    await companyAudit(db, employee.company_id, userId, "application-from-employee", employee.id, `${employee.name}: ${kind}`);
    // Leave goes to the direct manager first; HR sees it, but draws the order up only after the manager answered.
    let managerNote = "";
    if (AWAY_KINDS.includes(kind)) {
      const mine = await db.prepare("SELECT profile FROM company_employees WHERE id=?").bind(employee.id).first<{ profile: string }>();
      const { approver, note } = await approverOf(employee.company_id, mine?.profile || "", data.from);
      if (approver && approver.id !== employee.id) {
        await db.prepare("UPDATE employee_requests SET manager_status='pending' WHERE id=?").bind(requestId).run();
        await notify(db, { userId: approver.user_id, type: "application", title: `Komandanızdan ərizə: ${employee.name}`, body: requestKindLabel(kind), link: "workplace" }).catch((error) => quiet("route-best-effort", error));
        managerNote = note || `Ərizə əvvəlcə birbaşa rəhbərinizə (${approver.name}) göndərildi.`;
      } else if (note) managerNote = note;
    }
    const checks = await leaveChecks(employee.company_id, { id: employee.id, department: employee.department }, kind, data, requestId);
    if (!managerNote) await notifyCompanyRoles(db, employee.company_id, "orders", { type: "application", title: `İşçi ərizəsi: ${employee.name}`, body: requestKindLabel(kind), link: "hr-orders" }).catch((error) => quiet("route-best-effort", error));
    return ok({ ok: true, id: requestId, warnings: [...requestWarnings(kind, data, now.slice(0, 10)), ...checks, ...(managerNote ? [managerNote] : [])] }, 201);
  }
  if (request.method === "POST" && path === "employee/applications/withdraw") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const result = await db
      .prepare("UPDATE employee_requests SET status='withdrawn',updated=? WHERE id=? AND employee_id=? AND source='employee' AND status='new'")
      .bind(new Date().toISOString(), str(b.id, 100), employee.id)
      .run();
    if (!result.meta.changes) throw new HttpError(409, "Yalnız cavab gözləyən öz ərizənizi geri götürə bilərsiniz.");
    await companyAudit(db, employee.company_id, userId, "application-withdrawn", employee.id, "");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/employees/link-code") {
    requirePermission("salaries", "Qoşulma kodunu yalnız işçi kartı icazəsi olan şəxs yarada bilər.");
    const b = await jsonBody(request);
    const employee = await db.prepare("SELECT id,name,user_id,status FROM company_employees WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ id: string; name: string; user_id: string; status: string }>();
    if (!employee || employee.status === "removed" || employee.status === "left") throw new HttpError(404, "İşçi tapılmadı.");
    if (employee.user_id) throw new HttpError(409, "Bu işçi artıq öz profilini qoşub. Yenisini qoşmaq üçün əvvəl qoşulmanı ləğv edin.");
    const code = generateLinkCode();
    const expires = linkExpiry(new Date());
    await db.prepare("UPDATE company_employees SET link_hash=?,link_expires=?,updated=? WHERE id=? AND company_id=?").bind(await hashLinkCode(code), expires, new Date().toISOString(), employee.id, id).run();
    await companyAudit(db, id, userId, "employee-link-code", employee.id, employee.name);
    return ok({ code: formatLinkCode(code), expires });
  }
  if (request.method === "POST" && path === "company/employees/link-codes") {
    requirePermission("salaries", "Qoşulma kodlarını yalnız işçi kartı icazəsi olan şəxs yarada bilər.");
    const b = await jsonBody(request);
    const again = b.includeActive === true;
    const wanted = Array.isArray(b.ids) ? new Set(b.ids.map((x: unknown) => str(x, 100))) : null;
    const rows = await db
      .prepare("SELECT id,name,position,department,email,link_hash,link_expires FROM company_employees WHERE company_id=? AND status IN ('active','leave') AND user_id='' ORDER BY name LIMIT 1000")
      .bind(id)
      .all<{ id: string; name: string; position: string; department: string; email: string; link_hash: string; link_expires: string }>();
    const now = new Date();
    const eligible = rows.results.filter((r) => (!wanted || wanted.has(r.id)) && (again || !r.link_hash || linkExpired(r.link_expires, now)));
    if (eligible.length > 500) throw new HttpError(400, "Bir dəfəyə ən çox 500 işçi üçün kod yaradıla bilər. İşçiləri seçib bölün.");
    const expires = linkExpiry(now);
    const items: { id: string; name: string; position: string; department: string; email: string; code: string; expires: string }[] = [];
    const statements: D1PreparedStatement[] = [];
    for (const r of eligible) {
      const code = generateLinkCode();
      items.push({ id: r.id, name: r.name, position: r.position, department: r.department, email: r.email, code: formatLinkCode(code), expires });
      statements.push(db.prepare("UPDATE company_employees SET link_hash=?,link_expires=?,updated=? WHERE id=? AND company_id=? AND user_id=''").bind(await hashLinkCode(code), expires, now.toISOString(), r.id, id));
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    if (items.length) await companyAudit(db, id, userId, "employee-link-codes", "", `${items.length} işçi üçün qoşulma kodu yaradıldı`);
    return ok({ items, created: items.length, skipped: rows.results.length - eligible.length });
  }
  if (request.method === "POST" && path === "company/employees/unlink") {
    requirePermission("salaries", "Qoşulmanı yalnız işçi kartı icazəsi olan şəxs ləğv edə bilər.");
    const b = await jsonBody(request);
    const done = await db.prepare("UPDATE company_employees SET user_id='',link_hash='',link_expires='',updated=? WHERE id=? AND company_id=?").bind(new Date().toISOString(), str(b.id, 100), id).run();
    if (!done.meta.changes) throw new HttpError(404, "İşçi tapılmadı.");
    await companyAudit(db, id, userId, "employee-unlinked", str(b.id, 100), "");
    return ok({ ok: true });
  }
  return undefined;
}
