// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { type CalendarOverride, HOURS_PER_DAY, attendanceCode, knownReligiousYears, yearCalendar } from "@/lib/calendar-az";
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_04(c: Pick<RouteCtx, "calendarYear" | "db" | "id" | "markAttendance" | "path" | "request" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { calendarYear, db, id, markAttendance, path, request, requirePermission, userId } = c;
  if (request.method === "GET" && path === "company/calendar") {
    requirePermission("salaries", "İstehsalat təqvimini yalnız HR, direktor və hesab sahibi görə bilər.");
    const year = calendarYear();
    const overrides = await db
      .prepare("SELECT day,kind,label FROM company_calendar WHERE company_id=? AND day BETWEEN ? AND ? ORDER BY day")
      .bind(id, `${year}-01-01`, `${year}-12-31`)
      .all<CalendarOverride>();
    return ok({ year, overrides: overrides.results, months: yearCalendar(year, overrides.results), religiousYears: knownReligiousYears(), hoursPerDay: HOURS_PER_DAY });
  }
  if (request.method === "POST" && path === "company/attendance/set") {
    requirePermission("salaries", "Davamiyyəti yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const employee = await db
      .prepare("SELECT id,name FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'")
      .bind(str(b.employeeId, 100), id)
      .first<{ id: string; name: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const code = str(b.code, 20);
    if (code && !attendanceCode(code)) throw new HttpError(400, "Davamiyyət kodu düzgün deyil.");
    const from = str(b.from, 10);
    const to = str(b.to, 10) || from;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) throw new HttpError(400, "Tarixləri düzgün yazın.");
    const length = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
    if (length > 366) throw new HttpError(400, "Bir dəfəyə ən çox 366 gün qeyd etmək olar.");
    const marked = await markAttendance(employee.id, from, to, code, str(b.note, 200), true);
    await companyAudit(db, id, userId, "attendance-set", employee.id, `${employee.name}: ${code || "silindi"} ${from}–${to}`);
    return ok({ ok: true, marked });
  }
  if (request.method === "POST" && path === "company/attendance/calendar") {
    requirePermission("salaries", "Şirkət təqvimini yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const day = str(b.day, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new HttpError(400, "Tarixi düzgün yazın.");
    const kind = str(b.kind, 10);
    if (!kind) await db.prepare("DELETE FROM company_calendar WHERE company_id=? AND day=?").bind(id, day).run();
    else {
      if (!["off", "work", "short"].includes(kind)) throw new HttpError(400, "Növ düzgün deyil.");
      await db
        .prepare("INSERT INTO company_calendar(company_id,day,kind,label) VALUES(?,?,?,?) ON CONFLICT(company_id,day) DO UPDATE SET kind=excluded.kind,label=excluded.label")
        .bind(id, day, kind, str(b.label, 100))
        .run();
    }
    return ok({ ok: true });
  }
  return undefined;
}
