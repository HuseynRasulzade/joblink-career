// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { type EmployeeProfile } from "@/lib/employee-profile";
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { matchEmployee, parseShiftSchedule, parseShiftStaff, fold as plainFold } from "@/lib/sheet-imports";
import { patternDays } from "@/lib/shift-rules";
import { shiftHours, validTime } from "@/lib/shifts";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_14(c: Pick<RouteCtx, "addDay" | "applySwap" | "dateOk" | "db" | "employeeRefs" | "ensureShiftTypes" | "id" | "memberRole" | "patchProfile" | "path" | "request" | "requestUrl" | "requesterName" | "requirePermission" | "revealAll" | "shiftRules" | "shiftWarnings" | "swapList" | "userId">): Promise<Response | undefined> {
  const { addDay, applySwap, dateOk, db, employeeRefs, ensureShiftTypes, id, memberRole, patchProfile, path, request, requestUrl, requesterName, requirePermission, revealAll, shiftRules, shiftWarnings, swapList, userId } = c;
  if (request.method === "POST" && path === "company/shift-swaps/decide") {
    requirePermission("salaries", "Növbə dəyişdirməni yalnız kadr işçisi təsdiq edə bilər.");
    const b = await jsonBody(request);
    if (b.approve === true) await applySwap(id, str(b.id, 100), await requesterName());
    else {
      const res = await db.prepare("UPDATE shift_swaps SET status='rejected',decided_by_name=? WHERE id=? AND company_id=? AND status IN ('asked','accepted')").bind(await requesterName(), str(b.id, 100), id).run();
      if (!res.meta.changes) throw new HttpError(404, "Sorğu tapılmadı.");
    }
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/shifts/types") {
    requirePermission("salaries", "Növbə növlərini yalnız kadr işçisi görə bilər.");
    if (memberRole !== "auditor") await ensureShiftTypes();
    const types = (await db.prepare("SELECT id,name,start_time,end_time FROM shift_types WHERE company_id=? ORDER BY start_time").bind(id).all<{ id: string; name: string; start_time: string; end_time: string }>()).results;
    return ok({ types: types.map((t) => ({ id: t.id, name: t.name, start: t.start_time, end: t.end_time })) });
  }
  if (request.method === "POST" && path === "company/shifts/staff") {
    requirePermission("salaries", "Növbəli rejimi yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const ids = (Array.isArray(b.employeeIds) ? (b.employeeIds as unknown[]) : []).map((x) => String(x)).slice(0, 300);
    if (!ids.length) throw new HttpError(400, "İşçi seçin.");
    const patch: Partial<EmployeeProfile> = { shiftWork: b.shiftWork === true };
    if (typeof b.shiftDefault === "string") patch.shiftDefault = str(b.shiftDefault, 60);
    if (b.work !== undefined) patch.shiftWorkDays = Number(b.work);
    if (b.rest !== undefined) patch.shiftRestDays = Number(b.rest);
    if (b.offset !== undefined) patch.shiftOffset = Number(b.offset);
    let changed = 0;
    for (const e of ids) if (await patchProfile(e, patch)) changed++;
    await companyAudit(db, id, userId, "shift-work-set", "", `${changed} işçi: ${b.shiftWork === true ? "növbəli rejim" : "adi rejim"}`);
    return ok({ ok: true, changed });
  }
  if (request.method === "POST" && path === "company/shifts/autofill") {
    requirePermission("salaries", "Növbə qrafikini yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const from = str(b.from, 10);
    const to = str(b.to, 10);
    if (!dateOk(from) || !dateOk(to) || to < from) throw new HttpError(400, "Tarixləri düzgün yazın.");
    if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 62) throw new HttpError(400, "Bir dəfəyə ən çox 63 gün doldurulur.");
    await ensureShiftTypes();
    const types = (await db.prepare("SELECT id,name FROM shift_types WHERE company_id=?").bind(id).all<{ id: string; name: string }>()).results;
    const typeByName = new Map(types.map((t) => [plainFold(t.name), t.id]));
    const cards = (await db.prepare("SELECT id,name,profile FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; name: string; profile: string }>()).results;
    const opened = await revealAll(cards);
    const existing = new Set((await db.prepare("SELECT employee_id,day FROM shift_assignments WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, from, to).all<{ employee_id: string; day: string }>()).results.map((r) => `${r.employee_id}|${r.day}`));
    const statements: D1PreparedStatement[] = [];
    const skipped: string[] = [];
    const filled = new Set<string>();
    for (const c of cards) {
      const p = opened.get(c.id);
      if (!p?.shiftWork) continue;
      const shiftId = typeByName.get(plainFold(p.shiftDefault));
      if (!shiftId) { skipped.push(`${c.name}: standart növbə seçilməyib`); continue; }
      for (const day of patternDays(from, to, p.shiftWorkDays || 5, p.shiftRestDays ?? 2, p.shiftOffset || 0)) {
        if (existing.has(`${c.id}|${day}`) && b.overwrite !== true) continue;
        statements.push(db.prepare("INSERT INTO shift_assignments(company_id,employee_id,day,shift_id) VALUES(?,?,?,?) ON CONFLICT(company_id,employee_id,day) DO UPDATE SET shift_id=excluded.shift_id").bind(id, c.id, day, shiftId));
        filled.add(c.id);
      }
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    return ok({ ok: true, days: statements.length, employees: filled.size, skipped, warnings: (await shiftWarnings(from, to)).map((w) => w.text).slice(0, 20) });
  }
  if (request.method === "POST" && path === "company/shifts/import") {
    requirePermission("salaries", "Növbə qrafikini yalnız kadr işçisi yükləyə bilər.");
    const b = await jsonBody(request);
    const parsed = parseShiftSchedule((Array.isArray(b.rows) ? b.rows : []).slice(0, 2001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda sətir tapılmadı.");
    await ensureShiftTypes();
    const types = (await db.prepare("SELECT id,name FROM shift_types WHERE company_id=?").bind(id).all<{ id: string; name: string }>()).results;
    const typeByName = new Map(types.map((t) => [plainFold(t.name), t.id]));
    const people = await employeeRefs();
    const issues = [...parsed.issues];
    const statements: D1PreparedStatement[] = [];
    let applied = 0;
    for (const row of parsed.rows) {
      const found = matchEmployee(people, { name: row.name, email: row.email, fin: row.fin });
      if ("error" in found) { issues.push({ line: row.line, reason: found.error }); continue; }
      if (!people.find((p) => p.id === found.id)?.shift) { issues.push({ line: row.line, reason: `${row.name}: işçi kartında «Növbəli rejim» seçilməyib.` }); continue; }
      const shiftId = row.shift ? typeByName.get(plainFold(row.shift)) : "";
      if (row.shift && !shiftId) { issues.push({ line: row.line, reason: `${row.name}: «${row.shift}» adlı növbə növü yoxdur.` }); continue; }
      for (let day = row.from; day <= row.to; day = addDay(day, 1))
        statements.push(shiftId ? db.prepare("INSERT INTO shift_assignments(company_id,employee_id,day,shift_id) VALUES(?,?,?,?) ON CONFLICT(company_id,employee_id,day) DO UPDATE SET shift_id=excluded.shift_id").bind(id, found.id, day, shiftId) : db.prepare("DELETE FROM shift_assignments WHERE company_id=? AND employee_id=? AND day=?").bind(id, found.id, day));
      applied++;
    }
    if (statements.length > 6000) throw new HttpError(400, "Bir dəfəyə çox gün yüklənir: faylı hissələrə bölün.");
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "shifts-imported", "", `${applied} sətir, ${statements.length} gün`);
    return ok({ ok: true, applied, days: statements.length, created: applied, issues });
  }
  if (request.method === "POST" && path === "company/shifts/staff-import") {
    requirePermission("salaries", "Növbəli işçiləri yalnız kadr işçisi yükləyə bilər.");
    const b = await jsonBody(request);
    const parsed = parseShiftStaff((Array.isArray(b.rows) ? b.rows : []).slice(0, 1001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda sətir tapılmadı.");
    await ensureShiftTypes();
    const types = (await db.prepare("SELECT name FROM shift_types WHERE company_id=?").bind(id).all<{ name: string }>()).results;
    const typeNames = new Map(types.map((t) => [plainFold(t.name), t.name]));
    const people = await employeeRefs();
    const issues = [...parsed.issues];
    let applied = 0;
    for (const row of parsed.rows) {
      const found = matchEmployee(people, { name: row.name, email: row.email, fin: row.fin });
      if ("error" in found) { issues.push({ line: row.line, reason: found.error }); continue; }
      const patch: Partial<EmployeeProfile> = { shiftWork: row.shiftWork };
      if (row.shiftDefault) {
        const real = typeNames.get(plainFold(row.shiftDefault));
        if (real) patch.shiftDefault = real;
        else issues.push({ line: row.line, reason: `${row.name}: «${row.shiftDefault}» adlı növbə növü yoxdur (rejim yenə də yazıldı).` });
      }
      if (row.work > 0) patch.shiftWorkDays = row.work;
      if (row.rest >= 0) patch.shiftRestDays = row.rest;
      if (row.present.includes("offset")) patch.shiftOffset = row.offset;
      if (await patchProfile(found.id, patch)) applied++;
    }
    await companyAudit(db, id, userId, "shift-staff-imported", "", `${applied} işçi`);
    return ok({ ok: true, applied, created: applied, issues });
  }
  if (request.method === "POST" && path === "company/shifts/rules") {
    requirePermission("salaries", "Növbə qaydalarını yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const put = async (key: string, value: number) => { await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, key, String(value)).run(); };
    await put("shift_min_rest_hours", Math.max(0, Math.min(24, Number(b.minRestHours) || 0)));
    await put("shift_max_consecutive", Math.max(1, Math.min(14, Math.round(Number(b.maxConsecutive) || 6))));
    // The minimum of people on a shift, per department.
    const cover = (b.cover && typeof b.cover === "object" ? b.cover : {}) as Record<string, unknown>;
    for (const [department, value] of Object.entries(cover).slice(0, 100)) {
      if (!department || department.length > 100) continue;
      const n = Math.max(0, Math.min(500, Math.round(Number(value) || 0)));
      if (n > 0) await put(`shift_min_cover:${department}`, n);
      else await db.prepare("DELETE FROM hr_settings WHERE company_id=? AND key=?").bind(id, `shift_min_cover:${department}`).run();
    }
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/shifts") {
    requirePermission("salaries", "Növbə qrafikini yalnız kadr işçisi görə bilər.");
    if (memberRole !== "auditor") await ensureShiftTypes();
    const from = dateOk(str(requestUrl.searchParams.get("from"), 10)) ? str(requestUrl.searchParams.get("from"), 10) : new Date().toISOString().slice(0, 10);
    const to = addDay(from, 13);
    const [types, assigned, everyone] = await Promise.all([
      db.prepare("SELECT id,name,start_time,end_time FROM shift_types WHERE company_id=? ORDER BY start_time").bind(id).all<{ id: string; name: string; start_time: string; end_time: string }>(),
      db.prepare("SELECT employee_id,day,shift_id FROM shift_assignments WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, from, to).all<{ employee_id: string; day: string; shift_id: string }>(),
      db.prepare("SELECT id,name,department,profile FROM company_employees WHERE company_id=? AND status IN ('active','leave') ORDER BY department,name").bind(id).all<{ id: string; name: string; department: string; profile: string }>(),
    ]);
    // Only people whose card says "works in shifts" are planned here; the others can be switched over from the list below.
    const opened = await revealAll(everyone.results);
    const people = { results: everyone.results.filter((p) => opened.get(p.id)?.shiftWork).map((p) => ({ id: p.id, name: p.name, department: p.department, usual: opened.get(p.id)?.shiftDefault || "", work: opened.get(p.id)?.shiftWorkDays || 0, rest: opened.get(p.id)?.shiftRestDays ?? 0 })) };
    const candidates = everyone.results.filter((p) => !opened.get(p.id)?.shiftWork).map((p) => ({ id: p.id, name: p.name, department: p.department }));
    return ok({
      from, to,
      types: types.results.map((t) => ({ id: t.id, name: t.name, start: t.start_time, end: t.end_time, ...shiftHours(t.start_time, t.end_time) })),
      employees: people.results,
      candidates,
      assignments: assigned.results.filter((a) => people.results.some((p) => p.id === a.employee_id)).map((a) => ({ employeeId: a.employee_id, day: a.day, shiftId: a.shift_id })),
      rules: await shiftRules(),
      warnings: await shiftWarnings(from, to),
      departments: [...new Set(people.results.map((p) => p.department).filter(Boolean))],
      swaps: await swapList(),
    });
  }
  if (request.method === "POST" && path === "company/shifts/type") {
    requirePermission("salaries", "Növbə növünü yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const name = str(b.name, 60);
    if (name.length < 2) throw new HttpError(400, "Növbənin adını yazın.");
    if (!validTime(str(b.start, 5)) || !validTime(str(b.end, 5))) throw new HttpError(400, "Saatı SS:DD formasında yazın.");
    if (str(b.id, 100)) {
      const before = await db.prepare("SELECT name FROM shift_types WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ name: string }>();
      await db.prepare("UPDATE shift_types SET name=?,start_time=?,end_time=? WHERE id=? AND company_id=?").bind(name, str(b.start, 5), str(b.end, 5), str(b.id, 100), id).run();
      // The usual shift of an employee card is kept by name: a renamed shift is renamed there too.
      if (before && before.name !== name) {
        const cards = (await db.prepare("SELECT id,profile FROM company_employees WHERE company_id=? AND status<>'removed' AND profile LIKE '%shiftDefault%'").bind(id).all<{ id: string; profile: string }>()).results;
        const opened = await revealAll(cards);
        for (const c of cards) if (opened.get(c.id)?.shiftDefault === before.name) await patchProfile(c.id, { shiftDefault: name });
      }
    }
    else {
      const count = Number((await db.prepare("SELECT COUNT(*) AS n FROM shift_types WHERE company_id=?").bind(id).first<{ n: number }>())?.n || 0);
      if (count >= 20) throw new HttpError(409, "Ən çox 20 növbə növü saxlanılır.");
      await db.prepare("INSERT INTO shift_types(id,company_id,name,start_time,end_time,created) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), id, name, str(b.start, 5), str(b.end, 5), new Date().toISOString()).run();
    }
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/shifts/type/delete") {
    requirePermission("salaries", "Növbə növünü yalnız kadr işçisi silə bilər.");
    const b = await jsonBody(request);
    const used = await db.prepare("SELECT 1 AS n FROM shift_assignments WHERE company_id=? AND shift_id=? LIMIT 1").bind(id, str(b.id, 100)).first();
    if (used) throw new HttpError(409, "Bu növbə qrafikdə istifadə olunur: əvvəl qrafikdən silin.");
    await db.prepare("DELETE FROM shift_types WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/shifts/assign") {
    requirePermission("salaries", "Növbə qrafikini yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const from = str(b.from, 10);
    const to = str(b.to, 10) || from;
    if (!dateOk(from) || !dateOk(to) || to < from) throw new HttpError(400, "Tarixləri düzgün yazın.");
    if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 62) throw new HttpError(400, "Bir dəfəyə ən çox 63 gün təyin olunur.");
    const shiftId = str(b.shiftId, 100);
    if (shiftId && !(await db.prepare("SELECT 1 AS n FROM shift_types WHERE id=? AND company_id=?").bind(shiftId, id).first())) throw new HttpError(404, "Növbə növü tapılmadı.");
    const refs = await employeeRefs();
    const known = new Set(refs.map((r) => r.id));
    const valid = new Set(refs.filter((r) => r.shift).map((r) => r.id));
    const wanted = (Array.isArray(b.employeeIds) ? (b.employeeIds as unknown[]) : [b.employeeId]).map((x) => String(x ?? "")).filter((x) => known.has(x));
    const ids = wanted.filter((x) => valid.has(x)).slice(0, 300);
    if (wanted.length && !ids.length) throw new HttpError(409, "Növbə yalnız işçi kartında «Növbəli rejim» seçilən işçilərə təyin olunur.");
    if (!ids.length) throw new HttpError(400, "İşçi seçin.");
    const statements: D1PreparedStatement[] = [];
    // A repeating pattern (for example two days on, two off) puts the shift only on its working days.
    const pattern = b.work ? new Set(patternDays(from, to, Number(b.work) || 1, Number(b.rest) || 0, Number(b.offset) || 0)) : null;
    for (let day = from; day <= to; day = addDay(day, 1)) {
      const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
      if (b.weekdaysOnly === true && (weekday === 0 || weekday === 6)) continue;
      if (pattern && !pattern.has(day)) continue;
      for (const e of ids) statements.push(shiftId ? db.prepare("INSERT INTO shift_assignments(company_id,employee_id,day,shift_id) VALUES(?,?,?,?) ON CONFLICT(company_id,employee_id,day) DO UPDATE SET shift_id=excluded.shift_id").bind(id, e, day, shiftId) : db.prepare("DELETE FROM shift_assignments WHERE company_id=? AND employee_id=? AND day=?").bind(id, e, day));
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    return ok({ ok: true, days: statements.length, warnings: shiftId ? await shiftWarnings(from, to, ids) : [] });
  }
  if (request.method === "POST" && path === "company/shifts/copy") {
    requirePermission("salaries", "Növbə qrafikini yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const from = str(b.from, 10);
    const to = str(b.to, 10);
    if (!dateOk(from) || !dateOk(to)) throw new HttpError(400, "Tarixləri düzgün yazın.");
    const source = await db.prepare("SELECT employee_id,day,shift_id FROM shift_assignments WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, from, addDay(from, 6)).all<{ employee_id: string; day: string; shift_id: string }>();
    const offset = Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
    const statements = source.results.map((a) => db.prepare("INSERT INTO shift_assignments(company_id,employee_id,day,shift_id) VALUES(?,?,?,?) ON CONFLICT(company_id,employee_id,day) DO UPDATE SET shift_id=excluded.shift_id").bind(id, a.employee_id, addDay(a.day, offset), a.shift_id));
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    return ok({ ok: true, copied: statements.length });
  }
  if (request.method === "POST" && path === "company/shifts/to-hours") {
    requirePermission("salaries", "Saatları yalnız kadr işçisi köçürə bilər.");
    const b = await jsonBody(request);
    const from = str(b.from, 10);
    const to = str(b.to, 10);
    if (!dateOk(from) || !dateOk(to) || to < from) throw new HttpError(400, "Tarixləri düzgün yazın.");
    const [assigned, types, locked] = await Promise.all([
      db.prepare("SELECT employee_id,day,shift_id FROM shift_assignments WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, from, to).all<{ employee_id: string; day: string; shift_id: string }>(),
      db.prepare("SELECT id,start_time,end_time FROM shift_types WHERE company_id=?").bind(id).all<{ id: string; start_time: string; end_time: string }>(),
      db.prepare("SELECT month FROM payroll_runs WHERE company_id=? AND status='approved'").bind(id).all<{ month: string }>(),
    ]);
    const lockedMonths = new Set(locked.results.map((r) => r.month));
    const length = new Map(types.results.map((t) => [t.id, shiftHours(t.start_time, t.end_time)]));
    const now = new Date().toISOString();
    const statements: D1PreparedStatement[] = [];
    for (const a of assigned.results) {
      const h = length.get(a.shift_id);
      if (!h || lockedMonths.has(a.day.slice(0, 7))) continue;
      statements.push(db.prepare("INSERT INTO attendance_hours(company_id,employee_id,day,hours,night_hours,note,updated) VALUES(?,?,?,?,?,?,?) ON CONFLICT(company_id,employee_id,day) DO UPDATE SET hours=excluded.hours,night_hours=excluded.night_hours,note=excluded.note,updated=excluded.updated").bind(id, a.employee_id, a.day, h.hours, h.night, "Növbə qrafikindən", now));
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "shifts-to-hours", "", `${from} – ${to}: ${statements.length} gün`);
    return ok({ ok: true, days: statements.length });
  }
  return undefined;
}
