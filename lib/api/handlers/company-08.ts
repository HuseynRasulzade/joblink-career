// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { DOC_KINDS, normalizeDocType } from "@/lib/employee-docs";
import { HttpError, jsonBody, str } from "@/lib/server";
import { STATUS_TEXT as LEAVE_STATUS, type ScheduleEntry, monthlyLoad, planLeave, scheduleWarnings } from "@/lib/leave-schedule";
import { companyAudit } from "@/lib/api-core";
import { createXlsxBook } from "@/lib/xlsx";
import { daysLeft, deadlinesOf } from "@/lib/hr-deadlines";
import { matchEmployee, parseDocDeadlines, parseLeavePlan, fold as plainFold } from "@/lib/sheet-imports";
import { parseProfile } from "@/lib/employee-profile";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_08(c: Pick<RouteCtx, "db" | "employeeRefs" | "id" | "leaveEntries" | "leavePeople" | "leaveView" | "leaveYear" | "path" | "request" | "requestFromPlan" | "requestUrl" | "requesterName" | "requirePermission" | "tellEmployee" | "toEntry" | "userId">): Promise<Response | undefined> {
  const { db, employeeRefs, id, leaveEntries, leavePeople, leaveView, leaveYear, path, request, requestFromPlan, requestUrl, requesterName, requirePermission, tellEmployee, toEntry, userId } = c;
  if (request.method === "GET" && path === "company/leave-schedule") {
    requirePermission("salaries", "Məzuniyyət qrafikini yalnız kadr işçisi görə bilər.");
    const year = leaveYear();
    const [people, entries] = await Promise.all([leavePeople(), leaveEntries(year)]);
    const names = new Map(people.map((p) => [p.id, p.name]));
    const planned = new Map<string, number>();
    for (const e of entries) if (e.status !== "rejected") planned.set(e.employee_id, (planned.get(e.employee_id) || 0) + e.days);
    return ok({
      year,
      employees: people.map((p) => ({ id: p.id, name: p.name, position: p.position, department: p.department, entitlement: p.balance.entitlement, remaining: p.balance.remaining, planned: planned.get(p.id) || 0 })),
      entries: entries.map((e) => leaveView(e, names)),
      load: monthlyLoad(entries.map(toEntry), people.map((p) => ({ id: p.id, name: p.name, department: p.department })), year),
    });
  }
  if (request.method === "POST" && path === "company/leave-schedule/save") {
    requirePermission("salaries", "Məzuniyyət qrafikini yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const people = await leavePeople();
    const person = people.find((p) => p.id === str(b.employeeId, 100));
    if (!person) throw new HttpError(404, "İşçi tapılmadı.");
    const plan = planLeave(str(b.start, 10), Number(b.days));
    if (!plan) throw new HttpError(400, "Başlama tarixini və gün sayını düzgün yazın.");
    if (plan.days > 90) throw new HttpError(400, "Bir məzuniyyət 90 gündən uzun ola bilməz.");
    const year = Number(plan.start.slice(0, 4));
    const entries = await leaveEntries(year);
    const editingId = str(b.id, 100);
    const others = entries.filter((e) => e.id !== editingId).map(toEntry);
    const warnings = scheduleWarnings({ employeeId: person.id, start: plan.start, end: plan.end, days: plan.days }, others, people.map((p) => ({ id: p.id, name: p.name, department: p.department })), { remaining: person.balance.remaining });
    const now = new Date().toISOString();
    const status = b.approve === true ? "approved" : "proposed";
    const me = await requesterName();
    let entryId = editingId;
    if (editingId) {
      const old = entries.find((e) => e.id === editingId);
      if (!old) throw new HttpError(404, "Qeyd tapılmadı.");
      await db.prepare("UPDATE leave_schedule SET start_date=?,end_date=?,days=?,year=?,note=?,status=?,decided_by_name=?,decided_at=? WHERE id=? AND company_id=?").bind(plan.start, plan.end, plan.days, year, str(b.note, 300), status, status === "approved" ? me : "", status === "approved" ? now : "", editingId, id).run();
    } else {
      entryId = crypto.randomUUID();
      await db.prepare("INSERT INTO leave_schedule(id,company_id,employee_id,year,start_date,end_date,days,status,proposed_by,note,decided_by_name,decided_at,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(entryId, id, person.id, year, plan.start, plan.end, plan.days, status, "hr", str(b.note, 300), status === "approved" ? me : "", status === "approved" ? now : "", now).run();
    }
    await companyAudit(db, id, userId, "leave-schedule-saved", person.id, `${person.name}: ${plan.start} – ${plan.end} (${plan.days} gün)`);
    if (status === "approved") await requestFromPlan(person.id, plan.start, plan.end, plan.days, me).catch(() => false);
    if (status === "approved") await tellEmployee(person.id, "Məzuniyyətiniz qrafikə daxil edildi", `${plan.start} – ${plan.end} (${plan.days} gün) məzuniyyət qrafikdə təsdiqləndi. Qayıdış tarixi: ${plan.returnDate}.`);
    return ok({ ok: true, id: entryId, warnings, plan });
  }
  if (request.method === "POST" && path === "company/leave-schedule/import") {
    requirePermission("salaries", "Məzuniyyət qrafikini yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const parsed = parseLeavePlan((Array.isArray(b.rows) ? b.rows : []).slice(0, 1001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda məzuniyyət sətri tapılmadı.");
    const refs = await employeeRefs();
    const people = await leavePeople();
    const issues = [...parsed.issues];
    const warnings: string[] = [];
    const byYear = new Map<number, ScheduleEntry[]>();
    const me = await requesterName();
    let created = 0;
    for (const row of parsed.rows) {
      const found = matchEmployee(refs, { name: row.name, email: row.email, fin: row.fin });
      if ("error" in found) {
        issues.push({ line: row.line, reason: found.error });
        continue;
      }
      const person = people.find((p) => p.id === found.id);
      if (!person) {
        issues.push({ line: row.line, reason: `${row.name}: işçi hazırda işləmir (məzuniyyət yazıla bilməz).` });
        continue;
      }
      // An end date is turned into the number of leave days: holidays inside the stretch are not counted as leave days.
      let days = row.days;
      if (!days && row.to) {
        for (let d = 1; d <= 90; d++) {
          const p = planLeave(row.from, d);
          if (p && p.end >= row.to) { days = d; break; }
        }
      }
      const plan = days ? planLeave(row.from, days) : null;
      if (!plan) {
        issues.push({ line: row.line, reason: `${row.name}: başlama tarixi və gün sayı düzgün deyil.` });
        continue;
      }
      const year = Number(plan.start.slice(0, 4));
      if (!byYear.has(year)) byYear.set(year, (await leaveEntries(year)).map(toEntry));
      const entries = byYear.get(year)!;
      if (entries.some((e) => e.employeeId === person.id && e.start === plan.start && e.end === plan.end && e.status !== "rejected")) {
        issues.push({ line: row.line, reason: `${person.name}: ${plan.start} – ${plan.end} məzuniyyəti qrafikdə artıq var.` });
        continue;
      }
      const wasWarned = scheduleWarnings({ employeeId: person.id, start: plan.start, end: plan.end, days: plan.days }, entries, people.map((p) => ({ id: p.id, name: p.name, department: p.department })), { remaining: person.balance.remaining });
      for (const w of wasWarned) warnings.push(`${person.name}: ${w}`);
      const now = new Date().toISOString();
      const entryId = crypto.randomUUID();
      await db.prepare("INSERT INTO leave_schedule(id,company_id,employee_id,year,start_date,end_date,days,status,proposed_by,note,decided_by_name,decided_at,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(entryId, id, person.id, year, plan.start, plan.end, plan.days, row.status, "hr", row.note, row.status === "approved" ? me : "", row.status === "approved" ? now : "", now).run();
      entries.push({ id: entryId, employeeId: person.id, start: plan.start, end: plan.end, days: plan.days, status: row.status });
      if (row.status === "approved") {
        await requestFromPlan(person.id, plan.start, plan.end, plan.days, me).catch(() => false);
        await tellEmployee(person.id, "Məzuniyyətiniz qrafikə daxil edildi", `${plan.start} – ${plan.end} (${plan.days} gün) məzuniyyət qrafikdə təsdiqləndi. Qayıdış tarixi: ${plan.returnDate}.`);
      }
      created++;
    }
    await companyAudit(db, id, userId, "leave-schedule-imported", "", `${created} məzuniyyət Excel faylından yükləndi`);
    return ok({ created, issues, warnings: warnings.slice(0, 50) });
  }
  if (request.method === "POST" && path === "company/leave-schedule/decide") {
    requirePermission("salaries", "Məzuniyyət qrafikini yalnız kadr işçisi təsdiqləyə bilər.");
    const b = await jsonBody(request);
    const row = await db.prepare("SELECT id,employee_id,start_date,end_date,days FROM leave_schedule WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ id: string; employee_id: string; start_date: string; end_date: string; days: number }>();
    if (!row) throw new HttpError(404, "Qeyd tapılmadı.");
    const approve = b.decision === "approve";
    await db.prepare("UPDATE leave_schedule SET status=?,decided_by_name=?,decided_at=?,note=CASE WHEN ?<>'' THEN ? ELSE note END WHERE id=? AND company_id=?").bind(approve ? "approved" : "rejected", await requesterName(), new Date().toISOString(), str(b.note, 300), str(b.note, 300), row.id, id).run();
    await companyAudit(db, id, userId, approve ? "leave-schedule-approved" : "leave-schedule-rejected", row.employee_id, `${row.start_date} – ${row.end_date}`);
    if (approve) await requestFromPlan(row.employee_id, row.start_date, row.end_date, row.days, await requesterName()).catch(() => false);
    await tellEmployee(row.employee_id, approve ? "Məzuniyyət təklifiniz təsdiqləndi" : "Məzuniyyət təklifiniz təsdiqlənmədi", `${row.start_date} – ${row.end_date} (${row.days} gün)${str(b.note, 300) ? `. Qeyd: ${str(b.note, 300)}` : ""}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/leave-schedule/delete") {
    requirePermission("salaries", "Məzuniyyət qrafikini yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM leave_schedule WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    await companyAudit(db, id, userId, "leave-schedule-deleted", str(b.id, 100), "");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/leave-schedule/export") {
    requirePermission("salaries", "Məzuniyyət qrafikini yalnız kadr işçisi yükləyə bilər.");
    const year = leaveYear();
    const [people, entries] = await Promise.all([leavePeople(), leaveEntries(year)]);
    const byId = new Map(people.map((p) => [p.id, p]));
    const dmy = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
    const rows: (string | number)[][] = entries.filter((e) => e.status !== "rejected").sort((a, b2) => (byId.get(a.employee_id)?.department || "").localeCompare(byId.get(b2.employee_id)?.department || "") || a.start_date.localeCompare(b2.start_date)).map((e, i) => {
      const p = byId.get(e.employee_id);
      return [i + 1, p?.name || "", p?.position || "", p?.department || "", e.days, dmy(e.start_date), dmy(e.end_date), LEAVE_STATUS[e.status] || e.status, e.note];
    });
    const book = createXlsxBook([{ name: `Məzuniyyət qrafiki ${year}`, headers: ["№", "Ad Soyad", "Vəzifə", "Departament", "Gün", "Başlanğıc", "Bitmə", "Vəziyyət", "Qeyd"], rows }]);
    await companyAudit(db, id, userId, "leave-schedule-exported", "", String(year));
    return new Response(Uint8Array.from(book).buffer, { headers: { "Cache-Control": "private, no-store", "Content-Disposition": `attachment; filename="mezuniyyet-qrafiki-${year}.xlsx"`, "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } });
  }
  if (request.method === "GET" && path === "company/doc-registry") {
    requirePermission("salaries", "Sənəd reyestrini yalnız sənədlərə icazəsi olan şəxs görə bilər.");
    const category = str(requestUrl.searchParams.get("category"), 20);
    const query = str(requestUrl.searchParams.get("q"), 80).toLocaleLowerCase("az");
    const todayIso = new Date().toISOString().slice(0, 10);
    const [docs, people] = await Promise.all([
      db.prepare("SELECT d.id,d.employee_id,d.category,d.subtype,d.doc_number,d.doc_date,d.expires,d.ack_required,d.ack_at,d.name,d.type,d.size,d.created,e.name AS employee FROM employee_documents d JOIN company_employees e ON e.id=d.employee_id WHERE d.company_id=? ORDER BY d.created DESC LIMIT 800").bind(id).all<{ id: string; employee_id: string; category: string; subtype: string; doc_number: string; doc_date: string; expires: string; ack_required: number; ack_at: string; name: string; type: string; size: number; created: string; employee: string }>(),
      db.prepare("SELECT id,name,profile FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; name: string; profile: string }>(),
    ]);
    const rows = docs.results.filter((d) => (!category || d.category === category) && (!query || `${d.employee} ${d.subtype} ${d.name} ${d.doc_number}`.toLocaleLowerCase("az").includes(query)));
    const deadlines = deadlinesOf(
      people.results.map((p) => ({ id: p.id, name: p.name, profile: parseProfile(p.profile) })),
      docs.results.filter((d) => d.expires).map((d) => ({ id: d.id, employeeId: d.employee_id, label: d.subtype || d.name, expires: d.expires })),
      todayIso,
      90,
    );
    return ok({
      categories: Object.keys(DOC_KINDS),
      documents: rows.map((d) => ({ id: d.id, employeeId: d.employee_id, employee: d.employee, category: d.category, subtype: d.subtype, number: d.doc_number, date: d.doc_date, expires: d.expires, ackRequired: !!d.ack_required, ackAt: d.ack_at, name: d.name, type: d.type, size: d.size, created: d.created, daysLeft: d.expires ? daysLeft(d.expires, todayIso) : null })),
      deadlines,
    });
  }
  if (request.method === "POST" && path === "company/doc-registry/expires") {
    requirePermission("salaries", "Sənədin müddətini yalnız sənədlərə icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const date = str(b.expires, 10);
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Tarixi düzgün yazın.");
    const res = await db.prepare("UPDATE employee_documents SET expires=? WHERE id=? AND company_id=?").bind(date, str(b.id, 100), id).run();
    if (!res.meta.changes) throw new HttpError(404, "Sənəd tapılmadı.");
    await companyAudit(db, id, userId, "doc-expiry-set", str(b.id, 100), date);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/doc-registry/expires-import") {
    requirePermission("salaries", "Sənədin müddətini yalnız sənədlərə icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const parsed = parseDocDeadlines((Array.isArray(b.rows) ? b.rows : []).slice(0, 1001).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda sətir tapılmadı.");
    const issues = [...parsed.issues];
    const people = await employeeRefs();
    const docs = (await db.prepare("SELECT id,employee_id,subtype,name,doc_number FROM employee_documents WHERE company_id=?").bind(id).all<{ id: string; employee_id: string; subtype: string; name: string; doc_number: string }>()).results;
    const statements: D1PreparedStatement[] = [];
    let applied = 0;
    for (const row of parsed.rows) {
      const found = matchEmployee(people, { name: row.name, email: row.email, fin: row.fin });
      if ("error" in found) {
        issues.push({ line: row.line, reason: found.error });
        continue;
      }
      const mine = docs.filter((d) => d.employee_id === found.id);
      const type = plainFold(row.docType);
      const byNumber = row.number ? mine.filter((d) => plainFold(d.doc_number) === plainFold(row.number)) : mine;
      const hits = type ? byNumber.filter((d) => plainFold(d.subtype) === type || plainFold(d.name) === type || plainFold(d.subtype).includes(type) || plainFold(d.name).includes(type)) : byNumber;
      const who = row.name || row.fin || row.email;
      if (!hits.length) {
        issues.push({ line: row.line, reason: `${who}: “${row.docType || row.number}” sənədi işçinin qovluğunda tapılmadı. Əvvəl sənədi yükləyin.` });
        continue;
      }
      if (hits.length > 1) {
        issues.push({ line: row.line, reason: `${who}: “${row.docType}” üçün ${hits.length} sənəd var. Sənəd nömrəsini də yazın.` });
        continue;
      }
      statements.push(db.prepare("UPDATE employee_documents SET expires=? WHERE id=? AND company_id=?").bind(row.expires, hits[0].id, id));
      applied++;
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    await companyAudit(db, id, userId, "doc-expiry-imported", "", `${applied} sənədin müddəti Excel faylından yazılıb`);
    return ok({ created: 0, applied, issues });
  }
  if (request.method === "POST" && path === "company/doc-registry/save-generated") {
    requirePermission("salaries", "Sənədi yalnız sənədlərə icazəsi olan şəxs saxlaya bilər.");
    const b = await jsonBody(request);
    const employee = await db.prepare("SELECT id,name FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.employeeId, 100), id).first<{ id: string; name: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const text = str(b.text, 100_000);
    if (text.length < 20) throw new HttpError(400, "Sənədin mətni boşdur.");
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const docType = normalizeDocType(str(b.category, 20), str(b.subtype, 80));
    if (!docType.ok) throw new HttpError(400, "Sənədin növünü seçin.");
    const dateRaw = str(b.date, 10);
    const expiresRaw = str(b.expires, 10);
    const count = Number((await db.prepare("SELECT COUNT(*) AS n FROM employee_documents WHERE company_id=? AND employee_id=?").bind(id, employee.id).first<{ n: number }>())?.n || 0);
    if (count >= 30) throw new HttpError(409, "Bir işçi üçün ən çoxu 30 sənəd saxlamaq olar.");
    const docId = crypto.randomUUID();
    await db
      .prepare("INSERT INTO employee_documents(id,company_id,employee_id,category,subtype,doc_number,doc_date,expires,ack_required,name,type,data,size,uploaded_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(docId, id, employee.id, Object.keys(DOC_KINDS).includes(docType.category) ? docType.category : "other", docType.subtype, str(b.number, 40), /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : "", /^\d{4}-\d{2}-\d{2}$/.test(expiresRaw) ? expiresRaw : "", b.requireAck === true ? 1 : 0, `${str(b.title, 120) || docType.subtype}.txt`, "text/plain; charset=utf-8", btoa(binary), bytes.length, userId, new Date().toISOString())
      .run();
    await companyAudit(db, id, userId, "employee-doc-added", employee.id, `${docType.subtype} (hazırlanmış)`);
    if (b.requireAck === true) await tellEmployee(employee.id, "Tanış olmalı sənəd", `${docType.subtype}${str(b.number, 40) ? ` № ${str(b.number, 40)}` : ""}. İş yerim → Sənədlər bölməsində oxuyub təsdiqləyin.`);
    return ok({ ok: true, id: docId }, 201);
  }
  return undefined;
}
