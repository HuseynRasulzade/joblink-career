// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { companyDetailsInput } from "@/lib/company";
import { matchEmployee, parseAttendanceRows, parseCalendarRows, parseProfileRows } from "@/lib/sheet-imports";
import { normalizeProfile } from "@/lib/employee-profile";
import { pickSigners } from "@/lib/order-signers";
import { sealProfile } from "@/lib/secure-profile";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_26(c: Pick<RouteCtx, "dataKey" | "db" | "employeeRefs" | "id" | "markAttendance" | "path" | "request" | "requestUrl" | "requirePermission" | "reveal" | "sheetRows" | "userId">): Promise<Response | undefined> {
  const { dataKey, db, employeeRefs, id, markAttendance, path, request, requestUrl, requirePermission, reveal, sheetRows, userId } = c;
  if (request.method === "POST" && path === "company/attendance/import") {
    requirePermission("salaries", "Davamiyyəti yalnız davamiyyət icazəsi olan şəxs yükləyə bilər.");
    const b = await jsonBody(request);
    const parsed = parseAttendanceRows(sheetRows(b.rows));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda davamiyyət sətri tapılmadı.");
    const people = await employeeRefs();
    const issues = [...parsed.issues];
    let applied = 0;
    let days = 0;
    for (const row of parsed.rows) {
      const found = matchEmployee(people, row);
      if ("error" in found) {
        issues.push({ line: row.line, reason: found.error });
        continue;
      }
      try {
        days += await markAttendance(found.id, row.from, row.to, row.code, row.note, true);
        applied += 1;
      } catch (error) {
        // A locked month does not stop the other rows: the line is reported.
        if (!(error instanceof HttpError)) throw error;
        issues.push({ line: row.line, reason: error.message });
      }
    }
    await companyAudit(db, id, userId, "attendance-imported", "", `${applied} sətir, ${days} gün`);
    return ok({ applied, days, issues });
  }
  if (request.method === "POST" && path === "company/calendar/import") {
    requirePermission("salaries", "Təqvimi yalnız davamiyyət icazəsi olan şəxs yükləyə bilər.");
    const b = await jsonBody(request);
    const parsed = parseCalendarRows(sheetRows(b.rows));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda təqvim günü tapılmadı.");
    const statements = parsed.rows.map((row) =>
      row.kind
        ? db
            .prepare("INSERT INTO company_calendar(company_id,day,kind,label) VALUES(?,?,?,?) ON CONFLICT(company_id,day) DO UPDATE SET kind=excluded.kind,label=excluded.label")
            .bind(id, row.day, row.kind, row.label)
        : db.prepare("DELETE FROM company_calendar WHERE company_id=? AND day=?").bind(id, row.day),
    );
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "calendar-imported", "", `${parsed.rows.length} gün`);
    return ok({ applied: parsed.rows.length, issues: parsed.issues });
  }
  if (request.method === "POST" && path === "company/employees/profile-import") {
    requirePermission("salaries", "Şəxsi məlumatları yalnız şəxsi məlumat icazəsi olan şəxs yükləyə bilər.");
    const b = await jsonBody(request);
    const parsed = parseProfileRows(sheetRows(b.rows));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda işçi tapılmadı.");
    const people = await employeeRefs();
    const issues = [...parsed.issues];
    const statements: D1PreparedStatement[] = [];
    let applied = 0;
    for (const row of parsed.rows) {
      const found = matchEmployee(people, { name: row.name, email: row.email });
      if ("error" in found) {
        issues.push({ line: row.line, reason: found.error });
        continue;
      }
      const current = await db.prepare("SELECT profile FROM company_employees WHERE id=? AND company_id=?").bind(found.id, id).first<{ profile: string }>();
      const opened = await reveal(current?.profile);
      if (opened.locked) {
        issues.push({ line: row.line, reason: `${row.name}: şifrələnmiş məlumat açıla bilmir (açar yoxdur və ya səhvdir), dəyişdirilmədi.` });
        continue;
      }
      const merged = normalizeProfile({ ...opened.profile, ...row.profile });
      if (merged.issues.length) {
        issues.push({ line: row.line, reason: `${row.name}: ${merged.issues[0]}` });
        continue;
      }
      statements.push(db.prepare("UPDATE company_employees SET profile=?,updated=? WHERE id=? AND company_id=?").bind(await sealProfile(merged.profile, dataKey()), new Date().toISOString(), found.id, id));
      applied += 1;
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "employee-profile-imported", "", `${applied} işçi`);
    return ok({ applied, issues });
  }
  if (request.method === "GET" && path === "company/order-signers") {
    requirePermission("salaries", "Əmrləri yalnız HR, direktor və hesab sahibi hazırlaya bilər.");
    const employee = await db
      .prepare("SELECT id,name,department,section,position FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'")
      .bind(str(requestUrl.searchParams.get("employeeId"), 100), id)
      .first<{ id: string; name: string; department: string; section: string; position: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const people = await db
      .prepare("SELECT id,name,position,department,section,status FROM company_employees WHERE company_id=? AND status IN ('active','leave')")
      .bind(id)
      .all<{ id: string; name: string; position: string; department: string; section: string; status: string }>();
    const profile = await db.prepare("SELECT data FROM company_profiles WHERE company_id=?").bind(id).first<{ data: string }>();
    const details = companyDetailsInput(profile ? JSON.parse(profile.data) : {});
    return ok({
      employee: { name: employee.name, department: employee.department, section: employee.section, position: employee.position },
      people: people.results.filter((p) => p.id !== employee.id).map((p) => ({ name: p.name, position: p.position, department: p.department })),
      ...pickSigners(employee, people.results, details.director),
    });
  }
  return undefined;
}
