// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { type CalendarOverride, monthDays } from "@/lib/calendar-az";
import { GEO_MODES, type GeoMode, validPoint } from "@/lib/geofence";
import { type HoursByDay, dailyNorm, parseHoursRows, parseHoursTotals, summarizeHours } from "@/lib/hours";
import { HttpError, jsonBody, str } from "@/lib/server";
import { bakuNow, earlyLeaveMinutes, hoursFromClock, lateMinutes, validTime as validClockTime } from "@/lib/clock";
import { companyAudit } from "@/lib/api-core";
import { matchEmployee } from "@/lib/sheet-imports";
import { parseProfile } from "@/lib/employee-profile";
import { weeklyHours } from "@/lib/employee-rights";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_07(c: Pick<RouteCtx, "clockSettings" | "db" | "employeeRefs" | "hoursMonth" | "id" | "path" | "payrollLocked" | "request" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { clockSettings, db, employeeRefs, hoursMonth, id, path, payrollLocked, request, requirePermission, userId } = c;
  if (request.method === "GET" && path === "company/hours") {
    requirePermission("salaries", "Saat uçotunu yalnız davamiyyət icazəsi olan şəxs görə bilər.");
    const monthRaw = hoursMonth();
    const year = Number(monthRaw.slice(0, 4));
    const month = Number(monthRaw.slice(5, 7));
    const [people, overrides, entries] = await Promise.all([
      db.prepare("SELECT id,name,position,department,profile FROM company_employees WHERE company_id=? AND status IN ('active','leave') ORDER BY department,name").bind(id).all<{ id: string; name: string; position: string; department: string; profile: string }>(),
      db.prepare("SELECT day,kind,label FROM company_calendar WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, `${monthRaw}-01`, `${monthRaw}-31`).all<CalendarOverride>(),
      db.prepare("SELECT employee_id,day,hours,night_hours,note,clock_in,clock_out,overtime_status,source FROM attendance_hours WHERE company_id=? AND day BETWEEN ? AND ? ORDER BY day").bind(id, `${monthRaw}-01`, `${monthRaw}-31`).all<{ employee_id: string; day: string; hours: number; night_hours: number; note: string; clock_in: string; clock_out: string; overtime_status: string; source: string }>(),
    ]);
    const days = monthDays(year, month, overrides.results);
    const clock = await clockSettings(id);
    const totalRows = (await db.prepare("SELECT employee_id,overtime,rest_day,night,status,note FROM attendance_hours_month WHERE company_id=? AND month=?").bind(id, monthRaw).all<{ employee_id: string; overtime: number; rest_day: number; night: number; status: string; note: string }>()).results;
    const orderRows = (await db.prepare("SELECT employee_id,day,order_number FROM overtime_orders WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, `${monthRaw}-01`, `${monthRaw}-31`).all<{ employee_id: string; day: string; order_number: string }>()).results;
    const orderOf = new Map(orderRows.map((o) => [`${o.employee_id}|${o.day}`, o.order_number || "—"]));
    const todayBaku = bakuNow().date;
    const by = new Map<string, HoursByDay>();
    for (const e of entries.results) by.set(e.employee_id, (by.get(e.employee_id) || new Map()).set(e.day, { hours: e.hours, night: e.night_hours }));
    const dayOf = new Map(days.map((d) => [d.date, d]));
    return ok({
      month: monthRaw,
      settings: { start: clock.rules.start, end: clock.rules.end, breakMinutes: clock.rules.breakMinutes, graceMinutes: clock.rules.graceMinutes, overtimeApproval: clock.overtimeApproval, selfClock: clock.selfClock, locationMode: clock.locationMode, officeLat: clock.office?.lat ?? "", officeLng: clock.office?.lng ?? "", officeRadius: clock.office?.radius ?? 150 },
      days: days.map((d) => ({ date: d.date, off: d.off, short: d.short, label: d.label })),
      employees: people.results.map((p) => ({
        id: p.id, name: p.name, position: p.position, department: p.department,
        weekHours: weeklyHours(parseProfile(p.profile), `${monthRaw}-01`).hours,
        summary: summarizeHours(days, by.get(p.id) || new Map(), weeklyHours(parseProfile(p.profile), `${monthRaw}-01`).hours),
        entries: entries.results.filter((e) => e.employee_id === p.id).map((e) => {
          const info = dayOf.get(e.day);
          const norm = info && info.off === "" ? dailyNorm(weeklyHours(parseProfile(p.profile), `${monthRaw}-01`).hours, info.short) : 0;
          return { day: e.day, hours: e.hours, night: e.night_hours, note: e.note, clockIn: e.clock_in, clockOut: e.clock_out, source: e.source, late: e.clock_in ? lateMinutes(e.clock_in, clock.rules) : 0, early: e.clock_out ? earlyLeaveMinutes(e.clock_out, clock.rules) : 0, extra: Math.round((info && info.off !== "" ? e.hours : Math.max(0, e.hours - norm)) * 100) / 100, overtimeStatus: e.overtime_status || (orderOf.has(`${p.id}|${e.day}`) ? "approved" : ""), order: orderOf.get(`${p.id}|${e.day}`) || "" };
        }),
        mode: entries.results.some((e) => e.employee_id === p.id) ? "daily" : totalRows.some((t) => t.employee_id === p.id) ? "month" : "none",
        total: (() => {
          const t = totalRows.find((x) => x.employee_id === p.id);
          return t ? { overtime: t.overtime, restDay: t.rest_day, night: t.night, status: t.status || (orderRows.some((o) => o.employee_id === p.id) ? "approved" : ""), note: t.note } : null;
        })(),
        // Working days already behind us with no hours written: the timekeeper has to look at them.
        missing: entries.results.some((e) => e.employee_id === p.id) || by.size ? days.filter((d) => d.off === "" && d.date < todayBaku && !(by.get(p.id) || new Map()).has(d.date)).map((d) => d.date) : [],
      })),
    });
  }
  if (request.method === "POST" && path === "company/hours/save") {
    requirePermission("salaries", "Saat uçotunu yalnız davamiyyət icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const day = str(b.day, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day))) throw new HttpError(400, "Tarixi düzgün yazın.");
    if (await payrollLocked(day.slice(0, 7))) throw new HttpError(409, "Bu ay təsdiqlənib: saatlar dəyişdirilmir.");
    const employee = await db.prepare("SELECT id FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.employeeId, 100), id).first<{ id: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const clockIn = str(b.clockIn, 5);
    const clockOut = str(b.clockOut, 5);
    if ((clockIn && !validClockTime(clockIn)) || (clockOut && !validClockTime(clockOut))) throw new HttpError(400, "Saatı SS:DD formatında yazın.");
    if (!!clockIn !== !!clockOut) throw new HttpError(400, "Giriş və çıxış saatını birlikdə yazın.");
    let hours = Math.round((Number(b.hours) || 0) * 100) / 100;
    let night = Math.round((Number(b.night) || 0) * 100) / 100;
    if (clockIn && clockOut && !hours) {
      const calc = hoursFromClock(clockIn, clockOut, (await clockSettings(id)).rules.breakMinutes);
      hours = calc?.hours || 0;
      night = calc?.night || 0;
    }
    if (hours < 0 || hours > 24) throw new HttpError(400, "Saat 0–24 arası olmalıdır.");
    if (night < 0 || night > hours) throw new HttpError(400, "Gecə saatı işlənən saatdan çox ola bilməz.");
    if (hours === 0) await db.prepare("DELETE FROM attendance_hours WHERE company_id=? AND employee_id=? AND day=?").bind(id, employee.id, day).run();
    else
      await db
        .prepare("INSERT INTO attendance_hours(company_id,employee_id,day,hours,night_hours,note,updated,clock_in,clock_out,source) VALUES(?,?,?,?,?,?,?,?,?,'manual') ON CONFLICT(company_id,employee_id,day) DO UPDATE SET hours=excluded.hours,night_hours=excluded.night_hours,note=excluded.note,updated=excluded.updated,clock_in=excluded.clock_in,clock_out=excluded.clock_out,source='manual'")
        .bind(id, employee.id, day, hours, night, str(b.note, 200), new Date().toISOString(), clockIn, clockOut)
        .run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/hours/approve") {
    requirePermission("salaries", "Artıq işi yalnız davamiyyət icazəsi olan şəxs təsdiq edə bilər.");
    const b = await jsonBody(request);
    const day = str(b.day, 10);
    const status = b.status === "approved" ? "approved" : b.status === "rejected" ? "rejected" : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new HttpError(400, "Tarixi düzgün yazın.");
    if (await payrollLocked(day.slice(0, 7))) throw new HttpError(409, "Bu ay təsdiqlənib: artıq iş dəyişdirilmir.");
    const res = await db.prepare("UPDATE attendance_hours SET overtime_status=?,updated=? WHERE company_id=? AND employee_id=? AND day=?").bind(status, new Date().toISOString(), id, str(b.employeeId, 100), day).run();
    if (!res.meta.changes) throw new HttpError(404, "Bu gün üçün saat qeydi yoxdur.");
    await companyAudit(db, id, userId, "overtime-decision", str(b.employeeId, 100), `${day}: ${status || "gözləyir"}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/hours/settings") {
    requirePermission("salaries", "Davamiyyət ayarlarını yalnız davamiyyət icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const put = async (key: string, value: string) => {
      await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, key, value).run();
    };
    const start = str(b.start, 5);
    const end = str(b.end, 5);
    if (!validClockTime(start) || !validClockTime(end)) throw new HttpError(400, "İş başlama və bitmə saatını SS:DD formatında yazın.");
    await put("work_start", start);
    await put("work_end", end);
    await put("break_minutes", String(Math.max(0, Math.min(240, Math.round(Number(b.breakMinutes) || 0)))));
    await put("grace_minutes", String(Math.max(0, Math.min(120, Math.round(Number(b.graceMinutes) || 0)))));
    await put("overtime_approval", b.overtimeApproval ? "1" : "0");
    await put("self_clock", b.selfClock === false ? "0" : "1");
    const mode = GEO_MODES.includes(b.locationMode as GeoMode) ? (b.locationMode as GeoMode) : "off";
    if (mode !== "off" && !validPoint(b.officeLat, b.officeLng)) throw new HttpError(400, "Məkan yoxlaması üçün ofisin koordinatlarını yazın (və ya “Cari məkanım” düyməsini basın).");
    if (validPoint(b.officeLat, b.officeLng)) {
      await put("office_lat", String(Number(b.officeLat)));
      await put("office_lng", String(Number(b.officeLng)));
    }
    await put("office_radius", String(Math.max(20, Math.min(5000, Math.round(Number(b.officeRadius) || 150)))));
    await put("clock_location", mode);
    await companyAudit(db, id, userId, "attendance-settings", "hours", `${start}–${end}, artıq iş təsdiqi: ${b.overtimeApproval ? "bəli" : "xeyr"}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/hours/month-save") {
    requirePermission("salaries", "Saat uçotunu yalnız davamiyyət icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const monthRaw = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw)) throw new HttpError(400, "Ayı düzgün seçin.");
    if (await payrollLocked(monthRaw)) throw new HttpError(409, "Bu ay təsdiqlənib: saatlar dəyişdirilmir.");
    const employee = await db.prepare("SELECT id FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.employeeId, 100), id).first<{ id: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const daily = await db.prepare("SELECT COUNT(*) AS n FROM attendance_hours WHERE company_id=? AND employee_id=? AND day BETWEEN ? AND ?").bind(id, employee.id, `${monthRaw}-01`, `${monthRaw}-31`).first<{ n: number }>();
    if (Number(daily?.n) > 0) throw new HttpError(409, "Bu işçinin həmin ay üçün gündəlik saatı var: ay yekunu yalnız gündəlik qeyd olmayanda sayılır. Əvvəl gündəlik qeydləri silin.");
    const num = (v: unknown) => Math.round(Math.max(0, Math.min(400, Number(v) || 0)) * 100) / 100;
    const overtime = num(b.overtime);
    const restDay = num(b.restDay);
    const night = num(b.night);
    if (!overtime && !restDay && !night) await db.prepare("DELETE FROM attendance_hours_month WHERE company_id=? AND employee_id=? AND month=?").bind(id, employee.id, monthRaw).run();
    else
      await db
        .prepare("INSERT INTO attendance_hours_month(company_id,employee_id,month,overtime,rest_day,night,status,note,updated) VALUES(?,?,?,?,?,?,'',?,?) ON CONFLICT(company_id,employee_id,month) DO UPDATE SET overtime=excluded.overtime,rest_day=excluded.rest_day,night=excluded.night,status='',note=excluded.note,updated=excluded.updated")
        .bind(id, employee.id, monthRaw, overtime, restDay, night, str(b.note, 200), new Date().toISOString())
        .run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/hours/month-approve") {
    requirePermission("salaries", "Artıq işi yalnız davamiyyət icazəsi olan şəxs təsdiq edə bilər.");
    const b = await jsonBody(request);
    const monthRaw = str(b.month, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthRaw)) throw new HttpError(400, "Ayı düzgün seçin.");
    if (await payrollLocked(monthRaw)) throw new HttpError(409, "Bu ay təsdiqlənib: artıq iş dəyişdirilmir.");
    const status = b.status === "approved" ? "approved" : b.status === "rejected" ? "rejected" : "";
    const res = await db.prepare("UPDATE attendance_hours_month SET status=?,updated=? WHERE company_id=? AND employee_id=? AND month=?").bind(status, new Date().toISOString(), id, str(b.employeeId, 100), monthRaw).run();
    if (!res.meta.changes) throw new HttpError(404, "Bu ay üçün yekun saat qeydi yoxdur.");
    await companyAudit(db, id, userId, "overtime-decision", str(b.employeeId, 100), `${monthRaw} (ay yekunu): ${status || "gözləyir"}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/hours/totals-import") {
    requirePermission("salaries", "Saat uçotunu yalnız davamiyyət icazəsi olan şəxs yükləyə bilər.");
    const b = await jsonBody(request);
    const defaultMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(str(b.month, 7)) ? str(b.month, 7) : "";
    const parsed = parseHoursTotals((Array.isArray(b.rows) ? b.rows : []).slice(0, 1001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])), defaultMonth);
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda sətir tapılmadı.");
    const people = await employeeRefs();
    const locked = new Set((await db.prepare("SELECT month FROM payroll_runs WHERE company_id=? AND status='approved'").bind(id).all<{ month: string }>()).results.map((r) => r.month));
    const dailyHave = new Set((await db.prepare("SELECT DISTINCT employee_id||'|'||substr(day,1,7) AS k FROM attendance_hours WHERE company_id=?").bind(id).all<{ k: string }>()).results.map((r) => r.k));
    const issues = [...parsed.issues];
    const statements: D1PreparedStatement[] = [];
    const now = new Date().toISOString();
    let applied = 0;
    for (const row of parsed.rows) {
      if (locked.has(row.month)) {
        issues.push({ line: row.line, reason: `${row.name}: ${row.month} ayı təsdiqlənib.` });
        continue;
      }
      const found = matchEmployee(people, { name: row.name, email: row.email, fin: row.fin });
      if ("error" in found) {
        issues.push({ line: row.line, reason: found.error });
        continue;
      }
      if (dailyHave.has(`${found.id}|${row.month}`)) {
        issues.push({ line: row.line, reason: `${row.name}: ${row.month} üçün gündəlik saat var, ay yekunu yüklənmədi.` });
        continue;
      }
      statements.push(
        !row.overtime && !row.restDay && !row.night
          ? db.prepare("DELETE FROM attendance_hours_month WHERE company_id=? AND employee_id=? AND month=?").bind(id, found.id, row.month)
          : db
              .prepare("INSERT INTO attendance_hours_month(company_id,employee_id,month,overtime,rest_day,night,status,note,updated) VALUES(?,?,?,?,?,?,'',?,?) ON CONFLICT(company_id,employee_id,month) DO UPDATE SET overtime=excluded.overtime,rest_day=excluded.rest_day,night=excluded.night,status='',note=excluded.note,updated=excluded.updated")
              .bind(id, found.id, row.month, row.overtime, row.restDay, row.night, row.note, now),
      );
      applied++;
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "hours-totals-imported", "", `${applied} sətir`);
    return ok({ ok: true, applied, created: applied, issues });
  }
  if (request.method === "POST" && path === "company/hours/import") {
    requirePermission("salaries", "Saat uçotunu yalnız davamiyyət icazəsi olan şəxs yükləyə bilər.");
    const b = await jsonBody(request);
    const parsed = parseHoursRows((Array.isArray(b.rows) ? b.rows : []).slice(0, 3001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda sətir tapılmadı.");
    const people = await employeeRefs();
    const locked = new Set((await db.prepare("SELECT month FROM payroll_runs WHERE company_id=? AND status='approved'").bind(id).all<{ month: string }>()).results.map((r) => r.month));
    const issues = [...parsed.issues];
    const statements: D1PreparedStatement[] = [];
    const now = new Date().toISOString();
    let applied = 0;
    for (const row of parsed.rows) {
      if (locked.has(row.day.slice(0, 7))) {
        issues.push({ line: row.line, reason: `${row.name}: ${row.day.slice(0, 7)} ayı təsdiqlənib.` });
        continue;
      }
      const found = matchEmployee(people, { name: row.name, email: row.email, fin: row.fin });
      if ("error" in found) {
        issues.push({ line: row.line, reason: found.error });
        continue;
      }
      statements.push(
        row.hours === 0
          ? db.prepare("DELETE FROM attendance_hours WHERE company_id=? AND employee_id=? AND day=?").bind(id, found.id, row.day)
          : db
              .prepare("INSERT INTO attendance_hours(company_id,employee_id,day,hours,night_hours,note,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(company_id,employee_id,day) DO UPDATE SET hours=excluded.hours,night_hours=excluded.night_hours,note=excluded.note,updated=excluded.updated")
              .bind(id, found.id, row.day, row.hours, row.night, row.note, now),
      );
      applied++;
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "hours-imported", "", `${applied} sətir`);
    return ok({ ok: true, applied, created: applied, issues });
  }
  return undefined;
}
