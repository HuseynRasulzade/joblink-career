// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { can, needsDirector, salaryChangePercent } from "@/lib/company";
import { canonicalOrg } from "@/lib/staff-db";
import { checkSalary } from "@/lib/staff-plan";
import { companyAudit } from "@/lib/api-core";
import { employeePay } from "@/lib/payroll";
import { excelDateSerial } from "@/lib/xlsx";
import { exitTypeLabel, normalizeExit } from "@/lib/workforce";
import { parseProfile } from "@/lib/employee-profile";
import { quiet } from "@/lib/quiet";
import { taxReduction } from "@/lib/employee-rights";
import { vatParts } from "@/lib/vat";
import { loadPlanData, ok, resolvePosition } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_34(c: Pick<RouteCtx, "approvalRules" | "canAct" | "db" | "id" | "memberGrants" | "memberRole" | "path" | "queueApproval" | "request" | "requirePermission" | "salaryChange" | "userId">): Promise<Response | undefined> {
  const { approvalRules, canAct, db, id, memberGrants, memberRole, path, queueApproval, request, requirePermission, salaryChange, userId } = c;
  if (request.method === "POST" && path === "company/employees/save") {
    requirePermission(
      "salaries",
      "İşçi məlumatlarını yalnız HR, direktor və hesab sahibi dəyişə bilər.",
    );
    const b = await jsonBody(request);
    const name = str(b.name, 120);
    if (name.length < 2) throw new HttpError(400, "İşçinin adını yazın.");
    let salary = Math.max(0, Math.min(1_000_000, Number(b.salary) || 0));
    // Someone who may edit employee cards but not see pay keeps the pay as it is.
    if (!can(memberRole, "salaries", memberGrants)) {
      const prev = str(b.id, 100)
        ? await db
            .prepare("SELECT salary_cents,salary_type,sector FROM company_employees WHERE id=? AND company_id=?")
            .bind(str(b.id, 100), id)
            .first<{ salary_cents: number; salary_type: string; sector: string }>()
        : null;
      salary = (prev?.salary_cents || 0) / 100;
      b.salaryType = prev?.salary_type || "gross";
      b.sector = prev?.sector || "private";
    }
    let status = ["active", "leave", "left"].includes(str(b.status, 10))
      ? str(b.status, 10)
      : "active";
    const position = (await resolvePosition(db, id, str(b.position, 120))).name,
      department = await canonicalOrg(db, id, "department", str(b.department, 120)),
      email = str(b.email, 160),
      phone = str(b.phone, 40),
      startDate = str(b.startDate, 10);
    const probationRaw = str(b.probationEnd, 10);
    const probationEnd =
      excelDateSerial(probationRaw) !== null ? probationRaw : "";
    if (probationEnd && startDate && probationEnd < startDate)
      throw new HttpError(
        400,
        "Sınaq müddətinin sonu işə başlama tarixindən əvvəl ola bilməz.",
      );
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    let exit = normalizeExit(
      {
        status,
        endDate: b.endDate,
        exitType: b.exitType,
        exitReason: b.exitReason,
        exitNote: b.exitNote,
      },
      startDate,
      today,
    );
    if (exit.error) throw new HttpError(400, exit.error);
    const existingId = str(b.id, 100);
    // Nobody is paid above or below the band the staff table names for their position.
    if (status !== "left" && salary > 0) {
      const own = existingId ? await db.prepare("SELECT profile FROM company_employees WHERE id=? AND company_id=?").bind(existingId, id).first<{ profile: string }>() : null;
      const gross = employeePay(salary, b.salaryType === "net" ? "net" : "gross", b.sector === "public" ? "public" : "private", taxReduction(parseProfile(own?.profile), today)).gross;
      const plan = await loadPlanData(db, id);
      const problem = checkSalary(plan.units, { id: existingId, department, section: str(b.section, 120), position }, gross);
      if (problem) throw new HttpError(409, problem);
    }
    const sectionName = await canonicalOrg(db, id, "section", str(b.section, 120), department);
    // Section, whether the pay is gross or net, the tax sector and the leave figures.
    const saveEmployeeExtras = (employeeId: string) =>
      db
        .prepare("UPDATE company_employees SET section=?,salary_type=?,sector=?,vacation_days=?,vacation_used=? WHERE id=? AND company_id=?")
        .bind(
          sectionName,
          b.salaryType === "net" ? "net" : "gross",
          b.sector === "public" ? "public" : "private",
          Math.max(0, Math.min(365, Math.round(Number(b.vacationDays ?? 21)))),
          Math.max(0, Math.min(3650, Math.round(Number(b.vacationUsed ?? 0)))),
          employeeId,
          id,
        )
        .run();
    const event = (
      employeeId: string,
      type: string,
      from: string,
      to: string,
      note: string,
      date: string,
    ) =>
      db
        .prepare(
          "INSERT INTO employee_events(id,company_id,employee_id,type,from_value,to_value,note,actor_id,event_date,created) VALUES(?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          employeeId,
          type,
          from,
          to,
          note,
          userId,
          date,
          now,
        );
    if (existingId) {
      const old = await db
        .prepare("SELECT * FROM company_employees WHERE id=? AND company_id=?")
        .bind(existingId, id)
        .first<{
          salary_cents: number;
          position: string;
          department: string;
          status: string;
          end_date: string;
          exit_type: string;
          exit_reason: string;
          exit_note: string;
        }>();
      if (!old) throw new HttpError(404, "İşçi tapılmadı.");
      // With the salary rule on, a raise or cut by anyone but a director waits for approval;
      // the other changes in the form are saved now.
      let salaryRequested = false;
      if (
        old.salary_cents !== Math.round(salary * 100) &&
        needsDirector(
          await approvalRules(),
          "salary",
          canAct("approve-director"),
          salaryChangePercent(old.salary_cents / 100, salary),
        )
      ) {
        await queueApproval(
          "salary",
          `${name}: ${old.salary_cents / 100} → ${salary} AZN`,
          { employeeId: existingId, salary },
        );
        salary = old.salary_cents / 100;
        salaryRequested = true;
      }
      // Leaving needs approval too when that rule is on; the rest of the form is saved.
      let exitRequested = false;
      if (
        status === "left" &&
        old.status !== "left" &&
        needsDirector(await approvalRules(), "exit", canAct("approve-director"))
      ) {
        await queueApproval("exit", `${name}: işdən çıxarılma (${exitTypeLabel(exit.exitType)})`, {
          employeeId: existingId,
          endDate: exit.endDate,
          exitType: exit.exitType,
          exitReason: exit.exitReason,
          exitNote: exit.exitNote,
        });
        status = old.status;
        exit = { ...exit, endDate: old.end_date, exitType: old.exit_type, exitReason: old.exit_reason, exitNote: old.exit_note };
        exitRequested = true;
      }
      const events = [];
      if (old.status !== status) {
        if (status === "left")
          events.push(
            event(
              existingId,
              "left",
              old.status,
              exit.exitType,
              exit.exitReason,
              exit.endDate,
            ),
          );
        else if (old.status === "left")
          events.push(event(existingId, "returned", "left", status, "", today));
        else
          events.push(
            event(
              existingId,
              status === "leave" ? "leave-start" : "leave-end",
              old.status,
              status,
              "",
              today,
            ),
          );
      }
      if (old.position !== position)
        events.push(
          event(existingId, "position", old.position, position, "", today),
        );
      if (old.department !== department)
        events.push(
          event(
            existingId,
            "department",
            old.department,
            department,
            "",
            today,
          ),
        );
      // The amounts stay in the audit log, which only HR, the director and the owner can read.
      if (old.salary_cents !== Math.round(salary * 100))
        events.push(event(existingId, "salary", "", "", "", today));
      // Someone who leaves gets an offboarding checklist, once.
      if (status === "left" && old.status !== "left")
        await db.prepare("INSERT OR IGNORE INTO offboarding_cases(id,company_id,employee_id,status,planned_end,created) VALUES(?,?,?,'open',?,?)").bind(crypto.randomUUID(), id, existingId, exit.endDate || today, now).run();
      const salaryStatements = await salaryChange(existingId, old.salary_cents, String((old as { salary_type?: string }).salary_type || "gross"), Math.round(salary * 100), b.salaryType === "net" ? "net" : "gross", str(b.salaryFrom, 10), userId);
      if (salaryStatements.length) await db.batch(salaryStatements);
      await db.batch([
        db
          .prepare(
            "UPDATE company_employees SET name=?,position=?,department=?,email=?,phone=?,start_date=?,salary_cents=?,status=?,end_date=?,exit_type=?,exit_reason=?,exit_note=?,probation_end=?,probation_reminded=CASE WHEN probation_end<>? THEN 0 ELSE probation_reminded END,updated=? WHERE id=? AND company_id=?",
          )
          .bind(
            name,
            position,
            department,
            email,
            phone,
            startDate,
            Math.round(salary * 100),
            status,
            exit.endDate,
            exit.exitType,
            exit.exitReason,
            exit.exitNote,
            probationEnd,
            probationEnd,
            now,
            existingId,
            id,
          ),
        ...events,
      ]);
      if (old.salary_cents !== Math.round(salary * 100))
        await companyAudit(
          db,
          id,
          userId,
          "salary-changed",
          existingId,
          `${name}: ${old.salary_cents / 100} → ${salary} AZN`,
        );
      if (old.status !== status && status === "left")
        await companyAudit(
          db,
          id,
          userId,
          "employee-left",
          existingId,
          `${name}: ${exitTypeLabel(exit.exitType)}`,
        );
      await saveEmployeeExtras(existingId);
      return ok({
        ok: true,
        id: existingId,
        salaryPending: salaryRequested,
        exitPending: exitRequested,
      });
    }
    const newId = crypto.randomUUID();
    const events = [
      event(newId, "hired", "", "", "manual", startDate || today),
    ];
    if (status === "left")
      events.push(
        event(
          newId,
          "left",
          "active",
          exit.exitType,
          exit.exitReason,
          exit.endDate,
        ),
      );
    await db.batch([
      db
        .prepare(
          "INSERT INTO company_employees(id,company_id,name,position,department,email,phone,start_date,salary_cents,status,source,application_id,end_date,exit_type,exit_reason,exit_note,job_id,probation_end,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,'manual','',?,?,?,?,'',?,?,?)",
        )
        .bind(
          newId,
          id,
          name,
          position,
          department,
          email,
          phone,
          startDate,
          Math.round(salary * 100),
          status,
          exit.endDate,
          exit.exitType,
          exit.exitReason,
          exit.exitNote,
          probationEnd,
          now,
          now,
        ),
      ...events,
    ]);
    await saveEmployeeExtras(newId);
    await companyAudit(db, id, userId, "employee-added", newId, name);
    return ok({ ok: true, id: newId }, 201);
  }
  if (request.method === "POST" && path === "company/employees/remove") {
    requirePermission(
      "salaries",
      "İşçi məlumatlarını yalnız HR, direktor və hesab sahibi dəyişə bilər.",
    );
    const b = await jsonBody(request);
    const result = await db
      .prepare(
        "UPDATE company_employees SET status='removed',updated=? WHERE id=? AND company_id=?",
      )
      .bind(new Date().toISOString(), str(b.id, 100), id)
      .run();
    if (!result.meta.changes) throw new HttpError(404, "İşçi tapılmadı.");
    // Personal documents are deleted together with the employee entry.
    await db
      .prepare(
        "DELETE FROM employee_documents WHERE employee_id=? AND company_id=?",
      )
      .bind(str(b.id, 100), id)
      .run();
    await db
      .prepare("DELETE FROM employee_tasks WHERE employee_id=? AND company_id=?")
      .bind(str(b.id, 100), id)
      .run();
    await db.prepare("DELETE FROM employee_orders WHERE employee_id=? AND company_id=?").bind(str(b.id, 100), id).run();
    await db.prepare("DELETE FROM attendance_marks WHERE employee_id=? AND company_id=?").bind(str(b.id, 100), id).run();
    // A removed person no longer works in a branch (the link would otherwise block deleting the branch).
    await db.prepare("DELETE FROM employee_branches WHERE employee_id=? AND company_id=?").bind(str(b.id, 100), id).run().catch((error) => quiet("route-best-effort", error));
    await companyAudit(db, id, userId, "employee-removed", str(b.id, 100));
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/billing") {
    requirePermission(
      "billing",
      "Hesab-fakturaları yalnız HR, direktor və hesab sahibi görə bilər.",
    );
    const invoices = await db
      .prepare(
        `SELECT bi.id,bi.description,bi.amount_cents,bi.currency,bi.vat_percent,bi.due_date,bi.status,bi.created,
          COALESCE((SELECT SUM(bp.amount_cents) FROM billing_payments bp WHERE bp.invoice_id=bi.id),0) AS paid_cents
        FROM billing_invoices bi WHERE bi.account_id=? ORDER BY bi.created DESC LIMIT 200`,
      )
      .bind(id)
      .all<{
        id: string;
        description: string;
        amount_cents: number;
        currency: string;
        vat_percent: number;
        due_date: string;
        status: string;
        created: string;
        paid_cents: number;
      }>();
    const payments = await db
      .prepare(
        `SELECT bp.id,bp.invoice_id,bp.amount_cents,bp.currency,bp.method,bp.reference,bp.paid_at,bi.description
        FROM billing_payments bp LEFT JOIN billing_invoices bi ON bi.id=bp.invoice_id WHERE bp.account_id=? ORDER BY bp.paid_at DESC LIMIT 200`,
      )
      .bind(id)
      .all();
    const today = new Date().toISOString().slice(0, 10);
    const list = invoices.results.map((i) => ({
      ...i,
      vat_cents: vatParts(i.amount_cents, i.vat_percent).vat,
      outstanding_cents:
        i.status === "cancelled"
          ? 0
          : Math.max(0, i.amount_cents - i.paid_cents),
      state:
        i.status === "cancelled"
          ? "cancelled"
          : i.paid_cents >= i.amount_cents
            ? "paid"
            : i.due_date < today
              ? "overdue"
              : "open",
    }));
    return ok({
      invoices: list,
      payments: payments.results,
      summary: {
        billed:
          list
            .filter((i) => i.state !== "cancelled")
            .reduce((sum, i) => sum + i.amount_cents, 0) / 100,
        paid:
          list.reduce(
            (sum, i) => sum + (i.state === "cancelled" ? 0 : i.paid_cents),
            0,
          ) / 100,
        outstanding:
          list.reduce((sum, i) => sum + i.outstanding_cents, 0) / 100,
        overdue: list.filter((i) => i.state === "overdue").length,
      },
    });
  }
  return undefined;
}
