// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { ATTENDANCE_CODES, type CalendarOverride, HOURS_PER_DAY, attendanceCode, yearCalendar } from "@/lib/calendar-az";
import { HOLDER_LABEL } from "@/lib/order-flow";
import { HttpError, str } from "@/lib/server";
import { type Job, type Profile } from "@/lib/model";
import { ORDER_KINDS } from "@/lib/orders";
import { VACANCY_REASONS } from "@/lib/recruitment";
import { addDays, computeWorkforce, daysBetween, exitReasonLabel, exitTypeLabel } from "@/lib/workforce";
import { can } from "@/lib/company";
import { companyAudit } from "@/lib/api-core";
import { conversionPercent } from "@/lib/job-views";
import { createXlsx } from "@/lib/xlsx";
import { employeePay, tenure, vacationBalance } from "@/lib/payroll";
import { loadStructure } from "@/lib/staff-db";
import { parseProfile } from "@/lib/employee-profile";
import { parseSnapshot } from "@/lib/assessments";
import { taxReduction } from "@/lib/employee-rights";

import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_36(c: Pick<RouteCtx, "approvalHistory" | "attendanceData" | "calendarYear" | "db" | "hoursBetween" | "id" | "memberRole" | "path" | "registryRows" | "reportScope" | "request" | "requestUrl" | "requirePermission" | "staffOverview" | "userId">): Promise<Response | undefined> {
  const { approvalHistory, attendanceData, calendarYear, db, hoursBetween, id, memberRole, path, registryRows, reportScope, request, requestUrl, requirePermission, staffOverview, userId } = c;
  if (request.method === "GET" && path === "company/report") {
    requirePermission("reports");
    const kind = str(requestUrl.searchParams.get("kind"), 20);
    const scope = await reportScope();
    if (
      scope.ownOnly &&
      [
        "employees",
        "staff",
        "orders",
        "attendance",
        "calendar",
        "workforce",
        "exits",
        "invoices",
        "tests",
        "offers",
        "approvals",
      ].includes(kind)
    )
      throw new HttpError(
        403,
        "Bu hesabatı yalnız HR, direktor və hesab sahibi ixrac edə bilər.",
      );
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    if (kind === "applications") {
      const result = await db
        .prepare(
          `SELECT a.status,a.stage,a.created,a.updated,a.auto,a.data,json_extract(j.data,'$.title') AS title FROM applications a
          JOIN jobs j ON j.id=a.job_id WHERE j.owner=? AND j.id IN (SELECT value FROM json_each(?))
          AND (?='' OR substr(a.created,1,10)>=?) AND (?='' OR substr(a.created,1,10)<=?) ORDER BY a.created DESC`,
        )
        .bind(id, scope.jobIdsJson, scope.from, scope.from, scope.to, scope.to)
        .all<{
          status: string;
          stage: string;
          created: string;
          updated: string | null;
          auto: number;
          data: string;
          title: string;
        }>();
      headers = [
        "Vakansiya",
        "Namizəd",
        "Peşə",
        "E-poçt",
        "Telefon",
        "Status",
        "Mərhələ",
        "Müraciət tarixi",
        "Son dəyişiklik",
        "Mənbə",
      ];
      rows = result.results.map((r) => {
        const p = JSON.parse(r.data) as Profile;
        return [
          r.title,
          p.name,
          p.title,
          p.email,
          p.phone || "",
          r.status,
          r.stage || "",
          r.created.slice(0, 10),
          (r.updated || "").slice(0, 10),
          r.auto ? "AI avtomatik" : "Namizəd",
        ];
      });
    } else if (kind === "jobs") {
      const result = await db
        .prepare(
          `SELECT j.status,j.created,j.data,(SELECT COUNT(*) FROM applications a WHERE a.job_id=j.id) AS apps,
            (SELECT COUNT(DISTINCT v.viewer) FROM job_views v WHERE v.job_id=j.id) AS viewers,
            (SELECT COUNT(*) FROM applications a WHERE a.job_id=j.id AND a.status='İşə qəbul edildi') AS hired
          FROM jobs j WHERE j.owner=? AND j.id IN (SELECT value FROM json_each(?))
          AND (?='' OR substr(j.created,1,10)>=?) AND (?='' OR substr(j.created,1,10)<=?) ORDER BY j.created DESC`,
        )
        .bind(id, scope.jobIdsJson, scope.from, scope.from, scope.to, scope.to)
        .all<{
          status: string;
          created: string;
          data: string;
          apps: number;
          viewers: number;
          hired: number;
        }>();
      headers = [
        "Vakansiya",
        "Şəhər",
        "Status",
        "Yaradılıb",
        "Son tarix",
        "Maaş (min)",
        "Maaş (maks)",
        "Baxan namizəd",
        "Müraciət",
        "Konversiya, %",
        "İşə qəbul",
      ];
      rows = result.results.map((r) => {
        const j = JSON.parse(r.data) as Job;
        return [
          j.title,
          j.city,
          r.status,
          r.created.slice(0, 10),
          j.deadline || "",
          j.minSalary || 0,
          j.maxSalary || 0,
          Number(r.viewers),
          Number(r.apps),
          conversionPercent(Number(r.apps), Number(r.viewers)) ?? "",
          Number(r.hired),
        ];
      });
    } else if (kind === "calendar") {
      const year = calendarYear();
      const own = await db
        .prepare("SELECT day,kind,label FROM company_calendar WHERE company_id=? AND day BETWEEN ? AND ?")
        .bind(id, `${year}-01-01`, `${year}-12-31`)
        .all<CalendarOverride>();
      const months = yearCalendar(year, own.results);
      const names = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
      headers = [`${year}-ci il`, "Təqvim günü", "İş günü", "İstirahət günü", "Bayram və köçürülmüş gün", "Qısaldılmış gün (bayram ərəfəsi)", `İş saatı (faktiki, gündə ${HOURS_PER_DAY} saat, ərəfədə 1 saat az)`, `Ödənilən saat (qısaldılmış gün tam ödənilir)`, "Bayram və qeyri-iş günləri"];
      rows = months.map((m) => [
        names[m.month - 1],
        m.calendarDays,
        m.workDays,
        m.restDays,
        m.holidayDays,
        m.shortDays,
        m.hours,
        m.paidHours,
        m.days.filter((d) => d.off && d.off !== "weekend" && d.label).map((d) => `${d.date.slice(8)} — ${d.label}`).join("; "),
      ]);
      rows.push(["İl üzrə cəmi", months.reduce((x, m) => x + m.calendarDays, 0), months.reduce((x, m) => x + m.workDays, 0), months.reduce((x, m) => x + m.restDays, 0), months.reduce((x, m) => x + m.holidayDays, 0), months.reduce((x, m) => x + m.shortDays, 0), months.reduce((x, m) => x + m.hours, 0), months.reduce((x, m) => x + m.paidHours, 0), ""]);
    } else if (kind === "attendance") {
      const sheet = await attendanceData();
      headers = ["Ad Soyad", "Vəzifə", "Departament", "Şöbə", "Həftəlik norma (saat)", "İş günü norması", "İşlənmiş gün", "İşlənmiş saat", "Ödənilən saat", ...ATTENDANCE_CODES.filter((c) => c.id !== "work").map((c) => `${c.short} (${c.label})`), ...sheet.days.map((d) => d.date.slice(8))];
      rows = sheet.employees.map((e) => [
        e.name,
        e.position,
        e.department,
        e.section,
        e.weekHours,
        e.summary.norm,
        e.summary.worked,
        e.summary.hours,
        e.summary.paidHours,
        ...ATTENDANCE_CODES.filter((c) => c.id !== "work").map((c) => e.summary.byCode[c.id] || 0),
        ...sheet.days.map((d) => {
          const code = e.marks[d.date];
          if (code) return attendanceCode(code)?.short || code;
          return d.off === "weekend" ? "İ.g." : d.off ? "B" : "";
        }),
      ]);
    } else if (kind === "orders") {
      const list = await registryRows();
      const KIND_LABEL: Record<string, string> = Object.fromEntries(ORDER_KINDS.map((k) => [k.id, k.label.replace(/ haqqında əmr$/, "")]));
      const STATUS_LABEL: Record<string, string> = { pending: "İmza gözləyir", returned: "Geri qaytarılıb", signed: "İmzalanıb" };
      const approval = (o: (typeof list)[number], role: string) => {
        const signer = o.signers.find((x) => x.role === role);
        return signer ? `${signer.name}${signer.approvedAt ? ` (${signer.approvedAt.slice(0, 10)})` : " (gözləyir)"}` : "";
      };
      headers = ["№", "Tarix", "Növ", "İşçi", "Vəzifə", "Departament", "Şöbə", "Status", "İndi kimdədir", "Şöbə rəhbəri", "Direktor", "Son geri göndərmə səbəbi", "Yaradılma"];
      rows = list.map((o) => [
        o.number,
        o.date,
        KIND_LABEL[o.kind] || o.kind,
        o.employee.name,
        o.employee.position,
        o.employee.department,
        o.employee.section,
        STATUS_LABEL[o.status] || o.status,
        HOLDER_LABEL[o.holder] || "",
        approval(o, "head"),
        approval(o, "director"),
        [...o.history].reverse().find((e) => e.type === "returned")?.note || "",
        o.created.slice(0, 10),
      ]);
    } else if (kind === "staff") {
      const overview = await staffOverview();
      // The first twelve columns are those of the import template, so the file can be edited and loaded back.
      headers = ["Filial", "Departament", "Şöbə", "Vəzifə", "Pillə", "Ştat sayı", "Ştat dərəcəsi", "Əmək haqqı", "Maksimum əmək haqqı", "Başlanğıc ay", "Son ay", "Qeyd", "İşləyir", "Boş yer", "Ştat vahidi (FTE)", "Aylıq xərc (maks., işəgötürən payları ilə)"];
      const rateWord: Record<number, string> = { 1: "tam", 0.75: "3/4", 0.5: "yarım", 0.25: "1/4" };
      rows = overview.rows.map((r) => [r.branch || "", r.department, r.section, r.position, r.level || "", r.planned, rateWord[r.rate] || "tam", r.salaryMin || "", r.salaryMax > r.salaryMin ? r.salaryMax : "", r.startMonth || "", r.endMonth || "", r.note, r.filled, r.free, r.fte, r.costMax || ""]);
    } else if (kind === "structure") {
      headers = ["Departament", "Şöbə", "Ştat sətri", "İşçi"];
      const structure = await loadStructure(db, id);
      rows = structure.departments.flatMap((d) =>
        d.sections.length ? d.sections.map((sec) => [d.name, sec.name, sec.units, sec.people]) : [[d.name, "", d.units, d.people]],
      );
      // With branches the file follows the same tree as the screen: branch → department → section → position.
      const branchRows = await db.prepare("SELECT branch,department,section,position,planned FROM staff_units WHERE company_id=? ORDER BY branch,department,section,position").bind(id).all<{ branch: string; department: string; section: string; position: string; planned: number }>().catch(() => ({ results: [] as { branch: string; department: string; section: string; position: string; planned: number }[] }));
      if (branchRows.results.some((r) => r.branch)) {
        headers = ["Filial", "Departament", "Şöbə", "Vəzifə", "Ştat sayı"];
        rows = branchRows.results.map((r) => [r.branch, r.department, r.section, r.position, r.planned]);
      }
    } else if (kind === "employees") {
      const showSalary = can(memberRole, "salaries");
      const result = await db
        .prepare(
          "SELECT * FROM company_employees WHERE company_id=? AND status<>'removed' ORDER BY name",
        )
        .bind(id)
        .all<{
          name: string;
          position: string;
          department: string;
          section: string;
          email: string;
          phone: string;
          start_date: string;
          end_date: string;
          salary_cents: number;
          salary_type: string;
          sector: string;
          vacation_days: number;
          vacation_used: number;
          status: string;
        }>();
      const today = new Date().toISOString().slice(0, 10);
      // Contacts and pay are personal data: only roles with the salaries permission get them.
      headers = [
        "Ad Soyad",
        "Vəzifə",
        "Departament",
        "Şöbə",
        ...(showSalary ? ["E-poçt", "Telefon"] : []),
        "İşə başlama",
        "İşləyib",
        "Status",
        ...(showSalary
          ? [
              "Maaş növü",
              "Net (AZN)",
              "Gross / əmək haqqı (AZN)",
              "Super-gross (AZN)",
              "Gəlir vergisi",
              "DSMF (işçi)",
              "İşsizlik sığortası (işçi)",
              "İcbari tibbi sığorta (işçi)",
              "DSMF (işəgötürən)",
              "İşsizlik sığortası (işəgötürən)",
              "İcbari tibbi sığorta (işəgötürən)",
              "Məzuniyyət (il üçün)",
              "Qazanılmış məzuniyyət",
              "İstifadə olunmuş",
              "Qalan məzuniyyət",
            ]
          : []),
      ];
      rows = result.results.map((r) => {
        const worked = tenure(r.start_date, r.status === "left" ? r.end_date : "", today)?.text || "";
        const pay = showSalary && r.salary_cents > 0 ? employeePay(r.salary_cents / 100, r.salary_type === "net" ? "net" : "gross", r.sector === "public" ? "public" : "private", taxReduction(parseProfile((r as { profile?: string }).profile), today)) : null;
        const leave = vacationBalance({ start: r.start_date, end: r.status === "left" ? r.end_date : "", entitlement: r.vacation_days, used: r.vacation_used }, today);
        return [
          r.name,
          r.position,
          r.department,
          r.section,
          ...(showSalary ? [r.email, r.phone] : []),
          r.start_date,
          worked,
          r.status,
          ...(showSalary
            ? [
                r.salary_type === "net" ? "net" : "gross",
                pay?.net ?? "",
                pay?.gross ?? "",
                pay?.superGross ?? "",
                pay?.incomeTax ?? "",
                pay?.employeeSocial ?? "",
                pay?.employeeUnemployment ?? "",
                pay?.employeeMedical ?? "",
                pay?.employerSocial ?? "",
                pay?.employerUnemployment ?? "",
                pay?.employerMedical ?? "",
                leave.entitlement,
                leave.accrued,
                leave.used,
                leave.remaining,
              ]
            : []),
        ];
      });
    } else if (kind === "invoices") {
      requirePermission(
        "billing",
        "Hesab-fakturaları yalnız HR, direktor və hesab sahibi görə bilər.",
      );
      const result = await db
        .prepare(
          `SELECT bi.description,bi.amount_cents,bi.due_date,bi.status,bi.created,
            COALESCE((SELECT SUM(bp.amount_cents) FROM billing_payments bp WHERE bp.invoice_id=bi.id),0) AS paid_cents
          FROM billing_invoices bi WHERE bi.account_id=? ORDER BY bi.created DESC`,
        )
        .bind(id)
        .all<{
          description: string;
          amount_cents: number;
          due_date: string;
          status: string;
          created: string;
          paid_cents: number;
        }>();
      headers = [
        "Təsvir",
        "Məbləğ (AZN)",
        "Ödənilib (AZN)",
        "Qalıq (AZN)",
        "Son ödəniş tarixi",
        "Status",
        "Yaradılıb",
      ];
      rows = result.results.map((r) => [
        r.description,
        r.amount_cents / 100,
        r.paid_cents / 100,
        Math.max(0, r.amount_cents - r.paid_cents) / 100,
        r.due_date,
        r.status,
        r.created.slice(0, 10),
      ]);
    } else if (kind === "workforce") {
      const to = new Date().toISOString().slice(0, 10);
      const employees = await db
        .prepare(
          "SELECT department,start_date,end_date,status,exit_type,exit_reason,source FROM company_employees WHERE company_id=? AND status<>'removed'",
        )
        .bind(id)
        .all<{
          department: string;
          start_date: string;
          end_date: string;
          status: "active" | "leave" | "left";
          exit_type: string;
          exit_reason: string;
          source: string;
        }>();
      const metrics = computeWorkforce(
        employees.results.map((e) => ({
          department: e.department,
          startDate: e.start_date,
          endDate: e.end_date,
          status: e.status,
          exitType: e.exit_type,
          exitReason: e.exit_reason,
          source: e.source,
        })),
        [],
        addDays(to, -364),
        to,
        { includeReasons: false },
      );
      headers = ["Ay", "İşə qəbul", "Ayrılan", "İşçi sayı (ayın sonu)"];
      rows = metrics.months.map((m) => [
        m.month,
        m.hires,
        m.exits,
        m.headcount,
      ]);
      rows.push([
        "Cəmi / dövrün sonu",
        metrics.hires,
        metrics.exits,
        metrics.headcountEnd,
      ]);
      rows.push(["Dövriyyə, % (dövr)", metrics.turnoverPercent ?? "", "", ""]);
    } else if (kind === "exits") {
      requirePermission(
        "salaries",
        "Ayrılan işçilərin siyahısını yalnız HR, direktor və hesab sahibi ixrac edə bilər.",
      );
      const result = await db
        .prepare(
          "SELECT name,position,department,start_date,end_date,exit_type,exit_reason,exit_note FROM company_employees WHERE company_id=? AND status='left' ORDER BY end_date DESC",
        )
        .bind(id)
        .all<{
          name: string;
          position: string;
          department: string;
          start_date: string;
          end_date: string;
          exit_type: string;
          exit_reason: string;
          exit_note: string;
        }>();
      headers = [
        "Ad Soyad",
        "Vəzifə",
        "Şöbə",
        "İşə başlama",
        "Ayrılma tarixi",
        "Staj (gün)",
        "Ayrılma növü",
        "Ayrılma səbəbi",
        "Qeyd",
      ];
      rows = result.results.map((r) => [
        r.name,
        r.position,
        r.department,
        r.start_date,
        r.end_date,
        r.start_date && r.end_date ? daysBetween(r.start_date, r.end_date) : "",
        exitTypeLabel(r.exit_type),
        exitReasonLabel(r.exit_reason),
        r.exit_note,
      ]);
    } else if (kind === "funnel") {
      const result = await db
        .prepare(
          `SELECT json_extract(j.data,'$.title') AS title,json_extract(j.data,'$.reason') AS reason,j.created,a.status
          FROM jobs j LEFT JOIN applications a ON a.job_id=j.id WHERE j.owner=? AND j.id IN (SELECT value FROM json_each(?))
          AND (?='' OR substr(j.created,1,10)>=?) AND (?='' OR substr(j.created,1,10)<=?) ORDER BY j.created DESC`,
        )
        .bind(id, scope.jobIdsJson, scope.from, scope.from, scope.to, scope.to)
        .all<{
          title: string;
          reason: string | null;
          created: string;
          status: string | null;
        }>();
      const order: string[] = [];
      const byJob = new Map<
        string,
        {
          title: string;
          reason: string;
          created: string;
          counts: Record<string, number>;
        }
      >();
      for (const r of result.results) {
        const key = `${r.title}|${r.created}`;
        if (!byJob.has(key)) {
          byJob.set(key, {
            title: r.title,
            reason: r.reason || "",
            created: r.created,
            counts: {},
          });
          order.push(key);
        }
        if (r.status)
          byJob.get(key)!.counts[r.status] =
            (byJob.get(key)!.counts[r.status] || 0) + 1;
      }
      const stages = [
        "Göndərildi",
        "Baxışda",
        "Müsahibə",
        "Təklif edildi",
        "İşə qəbul edildi",
        "Uyğun deyil",
      ];
      headers = [
        "Vakansiya",
        "Yaradılma səbəbi",
        "Yaradılıb",
        "Müraciət (cəmi)",
        ...stages,
      ];
      rows = order.map((key) => {
        const v = byJob.get(key)!;
        const total = Object.values(v.counts).reduce((a, b) => a + b, 0);
        return [
          v.title,
          VACANCY_REASONS.find((x) => x.id === v.reason)?.label || "",
          v.created.slice(0, 10),
          total,
          ...stages.map((st) => v.counts[st] || 0),
        ];
      });
    } else if (kind === "reasons") {
      const result = await db
        .prepare(
          `SELECT json_extract(j.data,'$.reason') AS reason,COUNT(DISTINCT j.id) AS jobs,COUNT(a.id) AS apps,
            SUM(CASE WHEN a.status='İşə qəbul edildi' THEN 1 ELSE 0 END) AS hired
          FROM jobs j LEFT JOIN applications a ON a.job_id=j.id WHERE j.owner=? AND j.id IN (SELECT value FROM json_each(?))
          AND (?='' OR substr(j.created,1,10)>=?) AND (?='' OR substr(j.created,1,10)<=?) GROUP BY 1 ORDER BY jobs DESC`,
        )
        .bind(id, scope.jobIdsJson, scope.from, scope.from, scope.to, scope.to)
        .all<{
          reason: string | null;
          jobs: number;
          apps: number;
          hired: number | null;
        }>();
      headers = ["Yaradılma səbəbi", "Vakansiya", "Müraciət", "İşə qəbul"];
      rows = result.results.map((r) => [
        VACANCY_REASONS.find((x) => x.id === (r.reason || ""))?.label ||
          "Göstərilməyib",
        Number(r.jobs),
        Number(r.apps),
        Number(r.hired || 0),
      ]);
    } else if (kind === "tests") {
      requirePermission(
        "tests",
        "Test hesabatını yalnız HR, direktor, hesab sahibi və ya bu icazə verilmiş şəxs ixrac edə bilər.",
      );
      const result = await db
        .prepare(
          `SELECT s.status,s.assigned_at,s.submitted_at,s.score,s.max_score,s.review_status,s.snapshot,t.title,COALESCE(c.name,'') AS candidate,
            COALESCE(json_extract(j.data,'$.title'),'') AS job_title
          FROM assessment_assignments s JOIN assessments t ON t.id=s.assessment_id
          LEFT JOIN accounts c ON c.id=s.candidate_id
          LEFT JOIN applications a ON a.id=s.application_id LEFT JOIN jobs j ON j.id=a.job_id
          WHERE s.company_id=? AND (?='' OR substr(s.assigned_at,1,10)>=?) AND (?='' OR substr(s.assigned_at,1,10)<=?)
          ORDER BY s.assigned_at DESC`,
        )
        .bind(id, scope.from, scope.from, scope.to, scope.to)
        .all<{
          status: string;
          assigned_at: string;
          submitted_at: string;
          score: number;
          max_score: number;
          review_status: string;
          snapshot: string;
          title: string;
          candidate: string;
          job_title: string;
        }>();
      const statusLabel: Record<string, string> = {
        assigned: "Göndərilib",
        started: "Davam edir",
        submitted: "Təhvil verilib",
        expired: "Vaxt bitib",
        cancelled: "Ləğv edilib",
      };
      headers = [
        "Test",
        "Vakansiya",
        "Namizəd",
        "Status",
        "Göndərilib",
        "Təhvil",
        "Bal",
        "Maksimum",
        "Nəticə, %",
        "Keçid balı, %",
        "Yoxlama",
      ];
      rows = result.results.map((r) => {
        const copy = parseSnapshot(r.snapshot);
        const percent = r.max_score
          ? Math.round((r.score / r.max_score) * 100)
          : "";
        return [
          copy?.title || r.title,
          r.job_title,
          r.candidate,
          statusLabel[r.status] || r.status,
          r.assigned_at.slice(0, 10),
          (r.submitted_at || "").slice(0, 10),
          r.max_score ? r.score : "",
          r.max_score || "",
          percent,
          copy?.passingScore ?? "",
          r.review_status === "pending"
            ? "açıq suallar yoxlanmalıdır"
            : r.review_status === "done"
              ? "yoxlanılıb"
              : "",
        ];
      });
    } else if (kind === "offers") {
      requirePermission("offers");
      const result = await db
        .prepare(
          `SELECT o.status,o.created,o.signed_at,o.data,COALESCE(c.name,'') AS candidate,COALESCE(json_extract(j.data,'$.title'),'') AS job_title
          FROM offers o LEFT JOIN accounts c ON c.id=o.candidate_id LEFT JOIN jobs j ON j.id=o.job_id
          WHERE o.company_id=? AND (?='' OR substr(o.created,1,10)>=?) AND (?='' OR substr(o.created,1,10)<=?) ORDER BY o.created DESC`,
        )
        .bind(id, scope.from, scope.from, scope.to, scope.to)
        .all<{
          status: string;
          created: string;
          signed_at: string;
          data: string;
          candidate: string;
          job_title: string;
        }>();
      const label: Record<string, string> = {
        sent: "Cavab gözlənilir",
        accepted: "Qəbul edilib",
        declined: "Rədd edilib",
        withdrawn: "Geri götürülüb",
      };
      headers = [
        "Vakansiya",
        "Namizəd",
        "Status",
        "Maaş (AZN)",
        "Göndərilib",
        "Cavab tarixi",
      ];
      rows = result.results.map((r) => {
        let salary: number | string = "";
        try {
          salary =
            Number((JSON.parse(r.data) as { salary?: number }).salary) || "";
        } catch {
          salary = "";
        }
        return [
          r.job_title,
          r.candidate,
          label[r.status] || r.status,
          salary,
          r.created.slice(0, 10),
          (r.signed_at || "").slice(0, 10),
        ];
      });
    } else if (kind === "approvals") {
      const STATUS: Record<string, string> = { pending: "Gözləyir", info: "Məlumat istənilib", approved: "Təsdiqləndi", rejected: "Rədd edildi" };
      headers = ["Növ", "Mövzu", "Göndərən", "Göndərilmə vaxtı", "Qərar verən", "Qərar", "Qərar vaxtı", "Saat", "Qeyd"];
      rows = (await approvalHistory()).map((r) => [
        r.kind,
        r.subject,
        r.requestedBy,
        r.requested,
        r.decidedBy,
        STATUS[r.decision] || r.decision,
        r.decided,
        hoursBetween(r.requested, r.decided) ?? "",
        r.note,
      ]);
    } else throw new HttpError(400, "Hesabat növü yanlışdır.");
    await companyAudit(db, id, userId, "report-exported", kind);
    const workbook = createXlsx(headers, rows, kind);
    return new Response(Uint8Array.from(workbook).buffer, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="joblink-${kind}-${new Date().toISOString().slice(0, 10)}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  }
  return undefined;
}
