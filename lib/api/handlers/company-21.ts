// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { companyAudit } from "@/lib/api-core";
import { createXlsxBook } from "@/lib/xlsx";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_21(c: Pick<RouteCtx, "auditView" | "auditorOnly" | "db" | "id" | "path" | "request" | "requestUrl" | "requirePermission" | "settlementReport" | "userId">): Promise<Response | undefined> {
  const { auditView, auditorOnly, db, id, path, request, requestUrl, requirePermission, settlementReport, userId } = c;
  if (request.method === "GET" && path === "company/payroll/report") {
    requirePermission("salaries", "Hesablaşma hesabatını yalnız əmək haqqı icazəsi olan şəxs görə bilər.");
    await auditView("view-settlement-report", "", `${requestUrl.searchParams.get("from") || ""} – ${requestUrl.searchParams.get("to") || ""}`);
    const report = await settlementReport();
    return ok(auditorOnly ? { ...report, employees: report.employees.map((e) => ({ ...e, iban: e.iban ? "••••" : "", fin: "" })) } : report);
  }
  if (request.method === "GET" && path === "company/payroll/report/export") {
    requirePermission("salaries", "Hesabatı yalnız əmək haqqı icazəsi olan şəxs yükləyə bilər.");
    const report = await settlementReport();
    const detailed = requestUrl.searchParams.get("mode") === "monthly";
    const money = (v: number) => Math.round(v * 100) / 100;
    const methodText: Record<string, string> = { bank: "Bank köçürməsi", card: "Kart", cash: "Nağd", other: "Digər" };
    const stateOf = (e: { balance: number }) => (e.balance > 0.005 ? "Şirkət işçiyə borcludur" : e.balance < -0.005 ? "İşçi şirkətə borcludur" : "Hesablaşma bağlıdır");
    const summary: (string | number)[][] = report.employees.map((e, i) => [i + 1, e.name, e.fin, e.position, e.department, e.section, e.gross, e.tax, e.insurance, e.net, e.deductions, e.due, e.vacation, e.benefitDue, e.paid.advance, e.paid.salary, e.paid.vacation, e.paid.benefit, e.paid.extra, e.paidTotal, e.companyOwes, e.benefitOwes, e.pendingOwes, e.employeeOwes, e.balance, stateOf(e)]);
    const t = report.totals;
    summary.push(["", "CƏMİ", "", "", "", "", t.gross, t.tax, t.insurance, t.net, t.deductions, t.due, "", "", t.advance, t.salary, t.vacation, t.benefit, t.extra, t.paidTotal, t.companyOwes, t.benefitOwes, t.pendingOwes, t.employeeOwes, t.balance, ""]);
    const payments: (string | number)[][] = report.employees.flatMap((e) => e.payments.map((p): (string | number)[] => [p.paidOn, p.month, e.name, e.fin, p.label, p.title, p.amount, methodText[p.method] || p.method, p.note, p.batchId ? "Bank sənədi" : "Əl ilə", p.reversed ? `Geri çəkilib: ${p.reverseReason} (${p.reversedBy})` : "Qüvvədədir"])).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
    const debts: (string | number)[][] = report.employees.filter((e) => Math.abs(e.balance) > 0.005 || e.employeeOwes > 0 || e.pendingOwes > 0).map((e) => [e.name, e.fin, e.companyOwes, e.benefitOwes, e.pendingOwes, e.employeeOwes, e.balance, e.employeeOwes > 0 ? "Avans hesablanmış məbləğdən artıq verilib: işçidən geri alınmalıdır və ya növbəti ayın əmək haqqından tutulmalıdır." : e.pendingOwes > 0 ? "Təsdiqlənməmiş aylar üzrə gözlənilən məbləğ də var." : ""]);
    const monthlyHeaders = ["Ay", "Ayın vəziyyəti", "Ad Soyad", "FİN", "Vəzifə", "Departament", "Norma günü", "İşlənmiş gün", "Ödənişli məzuniyyət/icazə günü", "Müavinət günü", "Ödənişsiz gün", "İşlənmiş günlərə görə", "Məzuniyyət haqqı", "Məzuniyyət kompensasiyası (çıxış)", "Artıq iş", "İstirahət/bayram işi", "Gecə işi", "Əlavələr", "Mükafat", "Hesablanıb (gross)", "Gəlir vergisi", "DSMF (işçi)", "İşsizlik (işçi)", "Tibbi (işçi)", "Net", "Digər tutulmalar", "Ödəniləcək", "Avans", "Əmək haqqı", "Məzuniyyət", "Müavinət (ödənilib)", "Digər ödəniş", "Əmək haqqı qalığı", "Müavinət hesablanıb", "Müavinət qalığı", "İşçinin borcu", "İşəgötürən sığortası", "İşəgötürənin ümumi xərci", "Son ödəniş", "Geri çəkilmiş ödəniş sayı"];
    const monthly: (string | number)[][] = report.employees.flatMap((e) =>
      e.months.map((m): (string | number)[] => [m.month, m.status === "approved" ? "Təsdiqlənib" : "Layihə", e.name, e.fin, e.position, e.department, m.normDays, m.workedDays, m.paidLeaveDays, m.benefitDays, m.unpaidDays, m.lines.worked || 0, (m.lines.vacation || 0) + (m.lines["paid-leave"] || 0), m.lines["leave-compensation"] || 0, m.lines.overtime || 0, m.lines["rest-day"] || 0, m.lines.night || 0, m.lines.allowance || 0, m.lines.bonus || 0, m.gross, m.incomeTax, m.employeeSocial, m.employeeUnemployment, m.employeeMedical, m.net, m.deductions, m.due, m.advance, m.salary, m.vacation, m.benefit, m.extra, m.outstanding, m.benefitDue, m.benefitOutstanding, m.employeeOwes, money(m.employerSocial + m.employerUnemployment + m.employerMedical), m.employerCost, m.lastPaid, m.reversed]),
    );
    // Employees down, months across: what is still owed after every month.
    const matrixHeaders = ["Ad Soyad", "FİN", ...report.months.flatMap((m) => [`${m.month} ödəniləcək`, `${m.month} ödənilib`, `${m.month} qalıq`]), "Cəmi ödəniləcək", "Cəmi ödənilib", "Cəmi qalıq (təsdiqlənmiş)"];
    const matrix: (string | number)[][] = report.employees.map((e) => {
      const cells = report.months.flatMap((m): (string | number)[] => {
        const row = e.months.find((x) => x.month === m.month);
        return row ? [row.due, money(row.advance + row.salary + row.vacation), row.outstanding] : ["", "", ""];
      });
      return [e.name, e.fin, ...cells, e.due, money(e.paid.advance + e.paid.salary + e.paid.vacation), e.companyOwes];
    });
    const TYPE_TEXT: Record<string, string> = { accrual: "Hesablama", tax: "Vergi", insurance: "Sığorta", deduction: "Tutulma", benefit: "Müavinət", payment: "Ödəniş", reversal: "Geri çəkmə", info: "Qeyd" };
    const journal: (string | number)[][] = report.employees.flatMap((e) => e.ops.map((op): (string | number)[] => [e.name, e.fin, op.month, op.monthStatus === "approved" ? "Təsdiqlənib" : "Layihə", /^\d{4}-\d{2}-\d{2}$/.test(op.date) ? op.date : "", TYPE_TEXT[op.type] || op.type, op.title, op.type === "info" ? "" : op.amount, op.monthStatus === "approved" ? op.balance : "", op.counts ? "" : "borca təsir etmir", op.note]));
    await companyAudit(db, id, userId, "payroll-report-exported", detailed ? "monthly" : "summary", `${report.from} – ${report.to}`);
    const sheets = [
      { name: "İşçilər üzrə yekun", headers: ["№", "Ad Soyad", "FİN", "Vəzifə", "Departament", "Şöbə", "Hesablanıb (gross)", "Gəlir vergisi", "Sığorta (işçi)", "Net", "Digər tutulmalar", "Ödəniləcək cəmi", "o cümlədən məzuniyyət haqqı", "Müavinət (ayrıca)", "Ödənilib: avans", "Ödənilib: əmək haqqı", "Ödənilib: məzuniyyət", "Ödənilib: müavinət", "Ödənilib: digər", "Cəmi ödənilib", "Şirkətin borcu (təsdiqlənmiş aylar, əmək haqqı)", "Şirkətin borcu (müavinət)", "Gözlənilən (təsdiqlənməmiş aylar)", "İşçinin şirkətə borcu", "Xalis qalıq (+ şirkət borclu, − işçi borclu)", "Vəziyyət"], rows: summary },
      ...(detailed
        ? [
            { name: "Aylar üzrə (ətraflı)", headers: monthlyHeaders, rows: monthly },
            { name: "Ay matrisi", headers: matrixHeaders, rows: matrix },
            { name: "Əməliyyatlar jurnalı", headers: ["İşçi", "FİN", "Ay", "Ayın vəziyyəti", "Tarix", "Əməliyyat", "Təsvir", "Məbləğ (+ borc artır, − azalır)", "Şirkətin borcu (qalıq)", "Təsir", "Qeyd"], rows: journal },
          ]
        : []),
      { name: "Ödənişlər (nəyə görə)", headers: ["Tarix", "Ay", "Ad Soyad", "FİN", "Ödənişin növü", "Ödənişin adı", "Məbləğ (AZN)", "Üsul", "Qeyd", "Mənbə", "Vəziyyət"], rows: payments },
      { name: "Borclar", headers: ["Ad Soyad", "FİN", "Şirkətin borcu (əmək haqqı)", "Şirkətin borcu (müavinət)", "Gözlənilən (layihə aylar)", "İşçinin şirkətə borcu", "Xalis qalıq", "Qeyd"], rows: debts },
    ];
    const book = createXlsxBook(sheets);
    return new Response(Uint8Array.from(book).buffer, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="hesablasma-hesabati-${detailed ? "aylar-uzre-" : ""}${report.from}-${report.to}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  }
  return undefined;
}
