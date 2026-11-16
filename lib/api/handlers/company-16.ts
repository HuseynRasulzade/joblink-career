// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { CBAR_PAGE, fetchCbarRates, perUnitRates } from "@/lib/cbar";
import { CURRENCY_NAME, DOMESTIC_NORMS, DOMESTIC_OTHER, FOREIGN_NORMS, HOTEL_SHARE, NORMS_SOURCE, NO_RECEIPT_HOTEL_PART, azNPerDay, lookupNorm } from "@/lib/trip-norms";
import { ENPS_QUESTIONS, type SurveyQuestion, cleanQuestions, enps } from "@/lib/survey";
import { HttpError, jsonBody, str } from "@/lib/server";
import { checkDestination } from "@/lib/trip-places";
import { companyAudit } from "@/lib/api-core";
import { matchEmployee, parseAnnouncements, parseSurveys, parseTrips } from "@/lib/sheet-imports";
import { settleTrip, tripDays } from "@/lib/trips";
import { TripRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_16(c: Pick<RouteCtx, "FX" | "createTripOrder" | "dateOk" | "db" | "defaultDaily" | "employeeRefs" | "id" | "parseJson" | "path" | "request" | "requestUrl" | "requesterName" | "requirePermission" | "tellEmployee" | "tellPayroll" | "tripRates" | "userId">): Promise<Response | undefined> {
  const { FX, createTripOrder, dateOk, db, defaultDaily, employeeRefs, id, parseJson, path, request, requestUrl, requesterName, requirePermission, tellEmployee, tellPayroll, tripRates, userId } = c;
  if (request.method === "GET" && path === "company/trips/cbar") {
    requirePermission("salaries", "Məzənnəni yalnız kadr işçisi görə bilər.");
    const asked = str(requestUrl.searchParams.get("date"), 10) || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asked)) throw new HttpError(400, "Tarixi düzgün yazın.");
    const bulletin = await fetchCbarRates(asked).catch(() => null);
    if (!bulletin) throw new HttpError(502, "Mərkəzi Bankın saytından məzənnə alına bilmədi. Bir az sonra yenidən cəhd edin və ya əl ilə yazın.");
    return ok({ asked, date: bulletin.date, rates: bulletin.rates, perUnit: perUnitRates(bulletin, FX), source: CBAR_PAGE });
  }
  if (request.method === "GET" && path === "company/trips/norm") {
    requirePermission("salaries", "Gündəlik normanı yalnız kadr işçisi görə bilər.");
    const destination = str(requestUrl.searchParams.get("destination"), 160);
    const abroad = requestUrl.searchParams.get("abroad") === "1";
    const found = lookupNorm(destination, abroad);
    const rates = await tripRates(str(requestUrl.searchParams.get("date"), 10));
    const azn = found ? azNPerDay(found, rates) : null;
    return ok({ found, azn, needsRate: !!found && found.kind === "foreign" && azn === null, rates, source: NORMS_SOURCE });
  }
  if (request.method === "GET" && path === "company/trips/norm-table") {
    requirePermission("salaries", "Gündəlik normanı yalnız kadr işçisi görə bilər.");
    return ok({ source: NORMS_SOURCE, hotelShare: HOTEL_SHARE, noReceiptHotelPart: NO_RECEIPT_HOTEL_PART, domestic: [...DOMESTIC_NORMS.map((d) => ({ label: d.label, norm: d.norm })), { label: "Digər şəhərlər, rayon mərkəzləri, qəsəbələr və kəndlər", norm: DOMESTIC_OTHER }], foreign: FOREIGN_NORMS, currencies: CURRENCY_NAME });
  }
  if (request.method === "POST" && path === "company/trips/save") {
    requirePermission("salaries", "Ezamiyyəti yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const employee = await db.prepare("SELECT id,name FROM company_employees WHERE id=? AND company_id=? AND status IN ('active','leave')").bind(str(b.employeeId, 100), id).first<{ id: string; name: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const start = str(b.start, 10);
    const end = str(b.end, 10);
    if (!tripDays(start, end)) throw new HttpError(400, "Tarixləri düzgün yazın.");
    const destination = str(b.destination, 160);
    const place = checkDestination(destination, b.abroad === true);
    if (!place.ok) throw new HttpError(400, place.error);
    b.abroad = place.abroad;
    const values = [destination, str(b.purpose, 300), start, end, Math.max(0, Math.round((Number(b.daily) || 0) * 100)), Math.max(0, Math.round((Number(b.advance) || 0) * 100))];
    const tripId = crypto.randomUUID();
    await db.prepare("INSERT INTO trips(id,company_id,employee_id,destination,purpose,start_date,end_date,daily_cents,advance_cents,status,requested_by,decided_by_name,created) VALUES(?,?,?,?,?,?,?,?,?,?,'hr',?,?)").bind(tripId, id, employee.id, ...values, b.approve === true ? "approved" : "requested", b.approve === true ? await requesterName() : "", new Date().toISOString()).run();
    // The foreign flag picks the per-diem norm; with no daily amount typed, the norm of the company is used right away.
    const fallback = await defaultDaily(destination, b.abroad === true, start);
    await db.prepare("UPDATE trips SET abroad=?,daily_cents=CASE WHEN daily_cents=0 THEN ? ELSE daily_cents END WHERE id=?").bind(b.abroad === true ? 1 : 0, Math.round(fallback.amount * 100), tripId).run();
    if (b.approve === true) await createTripOrder(tripId).catch(() => "");
    if (b.approve === true) await tellEmployee(employee.id, "Ezamiyyətiniz təsdiqləndi", `${destination}, ${start} – ${end}.`);
    return ok({ ok: true, id: tripId }, 201);
  }
  if (request.method === "POST" && path === "company/trips/import") {
    requirePermission("salaries", "Ezamiyyəti yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const parsed = parseTrips((Array.isArray(b.rows) ? b.rows : []).slice(0, 501).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda ezamiyyət tapılmadı.");
    const refs = await employeeRefs();
    const issues = [...parsed.issues];
    const have = new Set((await db.prepare("SELECT employee_id,destination,start_date,end_date FROM trips WHERE company_id=? AND status<>'rejected'").bind(id).all<{ employee_id: string; destination: string; start_date: string; end_date: string }>()).results.map((t) => `${t.employee_id}|${t.destination.toLocaleLowerCase("az")}|${t.start_date}|${t.end_date}`));
    let created = 0;
    const told = new Map<string, string>();
    for (const row of parsed.rows) {
      const found = matchEmployee(refs, { name: row.name, email: row.email, fin: row.fin });
      if ("error" in found) {
        issues.push({ line: row.line, reason: found.error });
        continue;
      }
      const key = `${found.id}|${row.destination.toLocaleLowerCase("az")}|${row.start}|${row.end}`;
      if (have.has(key)) {
        issues.push({ line: row.line, reason: `${row.name || row.fin}: bu ezamiyyət artıq yazılıb.` });
        continue;
      }
      const place = checkDestination(row.destination, row.abroad);
      if (!place.ok) {
        issues.push({ line: row.line, reason: `${row.name || row.fin}: ${place.error}` });
        continue;
      }
      row.abroad = place.abroad;
      const tripId = crypto.randomUUID();
      const daily = row.daily > 0 ? row.daily : (await defaultDaily(row.destination, row.abroad, row.start)).amount;
      await db.prepare("INSERT INTO trips(id,company_id,employee_id,destination,purpose,start_date,end_date,daily_cents,advance_cents,status,requested_by,decided_by_name,abroad,created) VALUES(?,?,?,?,?,?,?,?,?,'requested','hr','',?,?)")
        .bind(tripId, id, found.id, row.destination, row.purpose, row.start, row.end, Math.round(daily * 100), Math.round(row.advance * 100), row.abroad ? 1 : 0, new Date().toISOString())
        .run();
      have.add(key);
      created++;
      if (daily === 0) issues.push({ line: row.line, reason: `${row.name || row.fin}: ezamiyyət yazıldı, amma gündəlik hesablanmadı (${row.abroad ? "xarici norma üçün “Gündəlik normalar və məzənnə”də məzənnəni yazın" : "norma tapılmadı"}); təsdiq zamanı əl ilə yazın.` });
      told.set(found.id, `${row.destination}, ${row.start} – ${row.end}`);
    }
    for (const [employeeId, text] of told) await tellEmployee(employeeId, "Ezamiyyət sorğusu yazıldı", `${text}. Təsdiqdən sonra əmr hazırlanacaq.`);
    await companyAudit(db, id, userId, "trips-imported", "", `${created} ezamiyyət Excel faylından yüklənib`);
    return ok({ created, issues });
  }
  if (request.method === "GET" && path === "company/trips/norms") {
    requirePermission("salaries", "Gündəlik normanı yalnız kadr işçisi görə bilər.");
    const rows = (await db.prepare("SELECT key,value FROM hr_settings WHERE company_id=? AND key IN ('trip_daily_domestic','trip_daily_abroad')").bind(id).all<{ key: string; value: string }>()).results;
    const typedRows = (await db.prepare("SELECT key,value FROM hr_settings WHERE company_id=? AND key LIKE 'trip_fx_%'").bind(id).all<{ key: string; value: string }>()).results;
    const typed: Record<string, number> = {};
    for (const c of FX) {
      const v = Number(typedRows.find((r) => r.key === `trip_fx_${c}`)?.value);
      if (v > 0) typed[c] = v;
    }
    const bulletin = await fetchCbarRates(new Date().toISOString().slice(0, 10)).catch(() => null);
    return ok({ domestic: Number(rows.find((r) => r.key === "trip_daily_domestic")?.value || 0), abroad: Number(rows.find((r) => r.key === "trip_daily_abroad")?.value || 0), fx: typed, official: bulletin ? { date: bulletin.date, perUnit: perUnitRates(bulletin, FX) } : null, source: CBAR_PAGE });
  }
  if (request.method === "POST" && path === "company/trips/norms") {
    requirePermission("salaries", "Gündəlik normanı yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    const put = async (key: string, v: unknown) => { await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, key, String(Math.max(0, Math.min(10000, Number(v) || 0)))).run(); };
    await put("trip_daily_domestic", b.domestic);
    await put("trip_daily_abroad", b.abroad);
    const fx = (b.fx && typeof b.fx === "object" ? b.fx : {}) as Record<string, unknown>;
    for (const c of FX) {
      if (fx[c] === undefined) continue;
      const v = Number(fx[c]);
      if (fx[c] !== "" && fx[c] !== null && !(v > 0 && v < 1000)) throw new HttpError(400, `${c} məzənnəsi 0-dan böyük rəqəm olmalıdır.`);
      await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,?,?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, `trip_fx_${c}`, fx[c] === "" || fx[c] === null ? "" : String(v)).run();
    }
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/trips/decide") {
    requirePermission("salaries", "Ezamiyyəti yalnız kadr işçisi təsdiqləyə bilər.");
    const b = await jsonBody(request);
    const t = await db.prepare("SELECT id,employee_id,destination,start_date,end_date,status FROM trips WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ id: string; employee_id: string; destination: string; start_date: string; end_date: string; status: string }>();
    if (!t) throw new HttpError(404, "Ezamiyyət tapılmadı.");
    if (t.status !== "requested") throw new HttpError(409, "Bu ezamiyyət artıq həll olunub.");
    const gate = await db.prepare("SELECT manager_status,abroad FROM trips WHERE id=?").bind(t.id).first<{ manager_status: string; abroad: number }>();
    if (gate?.manager_status === "pending") throw new HttpError(409, "Sorğu hələ birbaşa rəhbərin təsdiqini gözləyir.");
    const approve = b.decision === "approve";
    // When no daily amount is typed, the company's per-diem norm for domestic or foreign trips applies.
    if (approve && !(Number(b.daily) > 0)) {
      const fallback = await defaultDaily(t.destination, !!gate?.abroad, t.start_date);
      if (fallback.amount > 0) b.daily = fallback.amount;
    }
    await db.prepare("UPDATE trips SET status=?,decided_by_name=?,daily_cents=CASE WHEN ? THEN ? ELSE daily_cents END,advance_cents=CASE WHEN ? THEN ? ELSE advance_cents END WHERE id=? AND company_id=?").bind(approve ? "approved" : "rejected", await requesterName(), approve && b.daily !== undefined ? 1 : 0, Math.max(0, Math.round((Number(b.daily) || 0) * 100)), approve && b.advance !== undefined ? 1 : 0, Math.max(0, Math.round((Number(b.advance) || 0) * 100)), t.id, id).run();
    if (approve) await createTripOrder(t.id).catch(() => "");
    await tellEmployee(t.employee_id, approve ? "Ezamiyyətiniz təsdiqləndi" : "Ezamiyyət sorğunuz rədd edildi", `${t.destination}, ${t.start_date} – ${t.end_date}${str(b.note, 300) ? `. ${str(b.note, 300)}` : ""}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/trips/expense") {
    requirePermission("salaries", "Xərci yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const t = await db.prepare("SELECT id,status FROM trips WHERE id=? AND company_id=?").bind(str(b.tripId, 100), id).first<{ id: string; status: string }>();
    if (!t) throw new HttpError(404, "Ezamiyyət tapılmadı.");
    if (t.status === "settled") throw new HttpError(409, "Ezamiyyətlə hesablaşılıb.");
    if (b.remove === true) {
      await db.prepare("DELETE FROM trip_expenses WHERE id=? AND trip_id=? AND company_id=?").bind(str(b.expenseId, 100), t.id, id).run();
      return ok({ ok: true });
    }
    const amount = Math.round((Number(b.amount) || 0) * 100);
    if (!(amount > 0) || amount > 100_000_000) throw new HttpError(400, "Məbləği düzgün yazın.");
    const label = str(b.label, 160);
    if (label.length < 2) throw new HttpError(400, "Xərcin adını yazın.");
    await db.prepare("INSERT INTO trip_expenses(id,trip_id,company_id,label,amount_cents,day) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), t.id, id, label, amount, dateOk(str(b.day, 10)) ? str(b.day, 10) : "").run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/trips/settle") {
    requirePermission("salaries", "Ezamiyyətlə yalnız əmək haqqı icazəsi olan şəxs hesablaşa bilər.");
    const b = await jsonBody(request);
    const t = await db.prepare("SELECT id,employee_id,destination,start_date,end_date,daily_cents,advance_cents,status,requested_by,decided_by_name,settled_cents,purpose FROM trips WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<TripRow>();
    if (!t) throw new HttpError(404, "Ezamiyyət tapılmadı.");
    if (t.status === "settled") throw new HttpError(409, "Artıq hesablaşılıb.");
    if (t.status === "requested" || t.status === "rejected") throw new HttpError(409, "Ezamiyyət təsdiqlənməyib.");
    const expenses = (await db.prepare("SELECT id,label,amount_cents,day FROM trip_expenses WHERE trip_id=? AND company_id=?").bind(t.id, id).all<{ id: string; label: string; amount_cents: number; day: string }>()).results;
    const calc = settleTrip({ dailyCents: t.daily_cents, days: tripDays(t.start_date, t.end_date), expensesCents: expenses.reduce((sum, e) => sum + e.amount_cents, 0), advanceCents: t.advance_cents });
    const now = new Date().toISOString();
    const statements = [db.prepare("UPDATE trips SET status='settled',settled_cents=? WHERE id=? AND company_id=?").bind(calc.balance, t.id, id)];
    if (calc.balance > 0)
      statements.push(db.prepare("INSERT INTO payroll_payments(id,company_id,employee_id,month,kind,amount_cents,paid_on,method,note,title,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, t.employee_id, now.slice(0, 7), "extra", calc.balance, now.slice(0, 10), "bank", `Ezamiyyət ${t.start_date} – ${t.end_date}`, `Ezamiyyət: ${t.destination}`, userId, now));
    await db.batch(statements);
    await companyAudit(db, id, userId, "trip-settled", t.employee_id, `${t.destination}: ${calc.balance / 100} AZN`);
    await tellEmployee(t.employee_id, "Ezamiyyətlə hesablaşıldı", calc.balance > 0 ? `${(calc.balance / 100).toFixed(2)} AZN sizə ödənildi.` : calc.balance < 0 ? `Avansın ${(-calc.balance / 100).toFixed(2)} AZN artıq hissəsi geri qaytarılmalıdır.` : "Avans xərclərə bərabər oldu.");
    return ok({ ok: true, balance: calc.balance / 100 });
  }
  if (request.method === "GET" && path === "company/announcements") {
    requirePermission("salaries", "Elanları yalnız kadr işçisi görə bilər.");
    const rows = await db.prepare("SELECT id,title,body,audience,pinned,expires,author,created,requires_ack,allow_comments FROM announcements WHERE company_id=? ORDER BY pinned DESC,created DESC LIMIT 100").bind(id).all<{ id: string; title: string; body: string; audience: string; pinned: number; expires: string; author: string; created: string; requires_ack: number; allow_comments: number }>();
    const comments = (await db.prepare("SELECT id,announcement_id,author_name,body,created,employee_id FROM announcement_comments WHERE company_id=? ORDER BY created DESC LIMIT 300").bind(id).all<{ id: string; announcement_id: string; author_name: string; body: string; created: string; employee_id: string }>()).results;
    const departments = (await db.prepare("SELECT DISTINCT department FROM company_employees WHERE company_id=? AND status IN ('active','leave') AND department<>''").bind(id).all<{ department: string }>()).results.map((r) => r.department);
    const staff = (await db.prepare("SELECT id,name,department FROM company_employees WHERE company_id=? AND status IN ('active','leave') AND user_id<>''").bind(id).all<{ id: string; name: string; department: string }>()).results;
    const reads = (await db.prepare("SELECT announcement_id,employee_id,acked_at FROM announcement_reads WHERE company_id=?").bind(id).all<{ announcement_id: string; employee_id: string; acked_at: string }>()).results;
    return ok({ departments, items: rows.results.map((r) => {
      // Who the announcement is meant for: everybody with a linked profile, or one department.
      const audience = staff.filter((p) => !r.audience || p.department === r.audience);
      const mine = reads.filter((x) => x.announcement_id === r.id);
      const read = new Set(mine.map((x) => x.employee_id));
      const acked = new Set(mine.filter((x) => x.acked_at).map((x) => x.employee_id));
      return { id: r.id, title: r.title, body: r.body, audience: r.audience, pinned: !!r.pinned, expires: r.expires, author: r.author, created: r.created, requiresAck: !!r.requires_ack, allowComments: !!r.allow_comments, comments: comments.filter((c) => c.announcement_id === r.id).slice(0, 20).map((c) => ({ id: c.id, author: c.author_name, body: c.body, created: c.created, hr: !c.employee_id })), reach: { total: audience.length, read: audience.filter((p) => read.has(p.id)).length, acked: audience.filter((p) => acked.has(p.id)).length, waiting: (r.requires_ack ? audience.filter((p) => !acked.has(p.id)) : []).map((p) => p.name).slice(0, 30) } };
    }) });
  }
  if (request.method === "POST" && path === "company/announcements/save") {
    requirePermission("salaries", "Elanı yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const title = str(b.title, 160);
    const body = str(b.body, 3000);
    if (title.length < 3 || body.length < 3) throw new HttpError(400, "Başlıq və mətni yazın.");
    const expires = dateOk(str(b.expires, 10)) ? str(b.expires, 10) : "";
    if (str(b.id, 100)) await db.prepare("UPDATE announcements SET title=?,body=?,audience=?,pinned=?,expires=?,requires_ack=?,allow_comments=? WHERE id=? AND company_id=?").bind(title, body, str(b.audience, 120), b.pinned === true ? 1 : 0, expires, b.requiresAck === true ? 1 : 0, b.allowComments === true ? 1 : 0, str(b.id, 100), id).run();
    else {
      await db.prepare("INSERT INTO announcements(id,company_id,title,body,audience,pinned,expires,author,created,requires_ack,allow_comments) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, title, body, str(b.audience, 120), b.pinned === true ? 1 : 0, expires, await requesterName(), new Date().toISOString(), b.requiresAck === true ? 1 : 0, b.allowComments === true ? 1 : 0).run();
      if (b.notify === true) {
        const audience = str(b.audience, 120);
        const rows = (await db.prepare("SELECT id,department FROM company_employees WHERE company_id=? AND status IN ('active','leave') AND user_id<>''").bind(id).all<{ id: string; department: string }>()).results.filter((r) => !audience || r.department === audience);
        await tellPayroll(rows.map((r) => r.id), `Elan: ${title}`, body.slice(0, 200));
      }
    }
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/announcements/import") {
    requirePermission("salaries", "Elanı yalnız kadr işçisi yaza bilər.");
    const b = await jsonBody(request);
    const parsed = parseAnnouncements((Array.isArray(b.rows) ? b.rows : []).slice(0, 201).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda elan tapılmadı.");
    const issues = [...parsed.issues];
    const have = new Set((await db.prepare("SELECT title FROM announcements WHERE company_id=?").bind(id).all<{ title: string }>()).results.map((r) => r.title.toLocaleLowerCase("az")));
    const author = await requesterName();
    let created = 0;
    for (const row of parsed.rows) {
      if (have.has(row.title.toLocaleLowerCase("az"))) {
        issues.push({ line: row.line, reason: `${row.title}: bu başlıqlı elan artıq var.` });
        continue;
      }
      await db.prepare("INSERT INTO announcements(id,company_id,title,body,audience,pinned,expires,author,created,requires_ack,allow_comments) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, row.title, row.body, row.audience, row.pinned ? 1 : 0, row.expires, author, new Date().toISOString(), row.requiresAck ? 1 : 0, row.allowComments ? 1 : 0).run();
      have.add(row.title.toLocaleLowerCase("az"));
      created++;
    }
    await companyAudit(db, id, userId, "announcements-imported", "", `${created} elan Excel faylından yüklənib`);
    return ok({ created, issues });
  }
  if (request.method === "POST" && path === "company/announcements/comment") {
    requirePermission("salaries", "Elana yalnız kadr işçisi cavab yaza bilər.");
    const b = await jsonBody(request);
    const row = await db.prepare("SELECT id FROM announcements WHERE id=? AND company_id=?").bind(str(b.id, 100), id).first<{ id: string }>();
    if (!row) throw new HttpError(404, "Elan tapılmadı.");
    if (b.remove === true) {
      await db.prepare("DELETE FROM announcement_comments WHERE id=? AND announcement_id=? AND company_id=?").bind(str(b.commentId, 100), row.id, id).run();
      return ok({ ok: true });
    }
    const body = str(b.body, 600);
    if (body.length < 2) throw new HttpError(400, "Cavabı yazın.");
    await db.prepare("INSERT INTO announcement_comments(id,announcement_id,company_id,employee_id,author_name,body,created) VALUES(?,?,?,'',?,?,?)").bind(crypto.randomUUID(), row.id, id, `${await requesterName()} (HR)`, body, new Date().toISOString()).run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "company/announcements/delete") {
    requirePermission("salaries", "Elanı yalnız kadr işçisi silə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM announcements WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/surveys") {
    requirePermission("salaries", "Sorğuları yalnız kadr işçisi görə bilər.");
    const surveys = (await db.prepare("SELECT id,title,kind,questions,anonymous,status,created,repeat_months FROM surveys WHERE company_id=? ORDER BY created DESC LIMIT 50").bind(id).all<{ repeat_months: number; id: string; title: string; kind: string; questions: string; anonymous: number; status: string; created: string }>()).results;
    const responses = (await db.prepare("SELECT survey_id,department,answers FROM survey_responses WHERE company_id=?").bind(id).all<{ survey_id: string; department: string; answers: string }>()).results;
    const size = Number((await db.prepare("SELECT COUNT(*) AS n FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).first<{ n: number }>())?.n || 0);
    return ok({
      employees: size,
      surveys: surveys.map((sv) => {
        const questions = parseJson<SurveyQuestion[]>(sv.questions, []);
        const mine = responses.filter((r) => r.survey_id === sv.id).map((r) => ({ department: r.department, answers: parseJson<Record<string, string>>(r.answers, {}) }));
        const scaleOf = (q: SurveyQuestion) => {
          const values = mine.map((m) => Number(m.answers[q.id])).filter((n) => Number.isFinite(n));
          return values.length ? Math.round((values.reduce((t, n) => t + n, 0) / values.length) * 100) / 100 : null;
        };
        const nps = questions.find((q) => q.kind === "scale10");
        // A department is shown only when at least 5 people of it answered, so nobody can be picked out.
        const byDepartment = nps ? [...new Set(mine.map((m) => m.department).filter(Boolean))].map((d) => ({ department: d, ...enps(mine.filter((m) => m.department === d).map((m) => Number(m.answers[nps.id]))) })).filter((d) => d.count >= 5) : [];
        return {
          id: sv.id, title: sv.title, kind: sv.kind, anonymous: !!sv.anonymous, status: sv.status, created: sv.created, repeatMonths: sv.repeat_months, questions, responses: mine.length,
          enps: nps ? enps(mine.map((m) => Number(m.answers[nps.id]))) : null, byDepartment,
          averages: questions.filter((q) => q.kind === "scale5" || q.kind === "scale10").map((q) => ({ id: q.id, label: q.label, average: scaleOf(q) })),
          yesno: questions.filter((q) => q.kind === "yesno").map((q) => ({ id: q.id, label: q.label, yes: mine.filter((m) => m.answers[q.id] === "yes").length, no: mine.filter((m) => m.answers[q.id] === "no").length })),
          comments: mine.length >= 5 ? questions.filter((q) => q.kind === "text").map((q) => ({ id: q.id, label: q.label, items: mine.map((m) => m.answers[q.id]).filter(Boolean).slice(0, 50) })) : [],
        };
      }),
    });
  }
  if (request.method === "POST" && path === "company/surveys/save") {
    requirePermission("salaries", "Sorğunu yalnız kadr işçisi yarada bilər.");
    const b = await jsonBody(request);
    const title = str(b.title, 160);
    if (title.length < 3) throw new HttpError(400, "Sorğunun adını yazın.");
    const kind = b.kind === "custom" ? "custom" : "enps";
    const questions = kind === "enps" ? ENPS_QUESTIONS : cleanQuestions(b.questions);
    if (!questions.length) throw new HttpError(400, "Ən azı bir sual yazın.");
    const surveyId = crypto.randomUUID();
    const repeat = [1, 3, 6, 12].includes(Number(b.repeatMonths)) ? Number(b.repeatMonths) : 0;
    await db.prepare("INSERT INTO surveys(id,company_id,title,kind,questions,anonymous,status,created,repeat_months,series_id) VALUES(?,?,?,?,?,?,'open',?,?,?)").bind(surveyId, id, title, kind, JSON.stringify(questions), b.anonymous === false ? 0 : 1, new Date().toISOString(), repeat, surveyId).run();
    await tellPayroll(null, `Yeni sorğu: ${title}`, "Fikrinizi bildirmək üçün İş yerim → Elanlar və sorğular bölməsinə baxın.");
    return ok({ ok: true, id: surveyId }, 201);
  }
  if (request.method === "POST" && path === "company/surveys/import") {
    requirePermission("salaries", "Sorğunu yalnız kadr işçisi yarada bilər.");
    const b = await jsonBody(request);
    const parsed = parseSurveys((Array.isArray(b.rows) ? b.rows : []).slice(0, 201).map((row: unknown) => (Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])));
    if (!parsed.rows.length) throw new HttpError(400, parsed.issues[0]?.reason || "Faylda sual tapılmadı.");
    const issues = [...parsed.issues];
    const open = new Set((await db.prepare("SELECT title FROM surveys WHERE company_id=? AND status='open'").bind(id).all<{ title: string }>()).results.map((r) => r.title.toLocaleLowerCase("az")));
    const groups = new Map<string, typeof parsed.rows>();
    for (const row of parsed.rows) groups.set(row.survey.toLocaleLowerCase("az"), [...(groups.get(row.survey.toLocaleLowerCase("az")) || []), row]);
    let created = 0;
    let questions = 0;
    for (const [key, rows] of groups) {
      const title = rows[0].survey;
      if (open.has(key)) {
        issues.push({ line: rows[0].line, reason: `${title}: bu adlı açıq sorğu artıq var.` });
        continue;
      }
      const list = cleanQuestions(rows.map((r) => ({ label: r.question, kind: r.kind })));
      if (!list.length) continue;
      const surveyId = crypto.randomUUID();
      await db.prepare("INSERT INTO surveys(id,company_id,title,kind,questions,anonymous,status,created,repeat_months,series_id) VALUES(?,?,?,'custom',?,?,'open',?,?,?)").bind(surveyId, id, title, JSON.stringify(list), rows[0].anonymous ? 1 : 0, new Date().toISOString(), rows[0].repeatMonths, surveyId).run();
      open.add(key);
      created++;
      questions += list.length;
    }
    if (created) await tellPayroll(null, `Yeni sorğu${created > 1 ? "lar" : ""}`, "Fikrinizi bildirmək üçün İş yerim → Elanlar və sorğular bölməsinə baxın.");
    await companyAudit(db, id, userId, "surveys-imported", "", `${created} sorğu, ${questions} sual Excel faylından yüklənib`);
    return ok({ created, questions, issues });
  }
  if (request.method === "POST" && path === "company/surveys/close") {
    requirePermission("salaries", "Sorğunu yalnız kadr işçisi bağlaya bilər.");
    const b = await jsonBody(request);
    await db.prepare("UPDATE surveys SET status=? WHERE id=? AND company_id=?").bind(b.reopen === true ? "open" : "closed", str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  return undefined;
}
