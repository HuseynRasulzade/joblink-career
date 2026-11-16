// employee: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { type CalendarOverride, monthDays } from "@/lib/calendar-az";
import { type EmployeeProfile, parseProfile, validCard, validIban } from "@/lib/employee-profile";
import { HttpError, jsonBody, str } from "@/lib/server";
import { REFERRAL_STATUS } from "@/lib/references";
import { type SurveyQuestion, cleanSurveyAnswers } from "@/lib/survey";
import { bakuNow, earlyLeaveMinutes, hoursFromClock, lateMinutes } from "@/lib/clock";
import { checkDestination } from "@/lib/trip-places";
import { checkLocation } from "@/lib/geofence";
import { companyAudit, notify, notifyCompanyRoles } from "@/lib/api-core";
import { dailyNorm } from "@/lib/hours";
import { quiet } from "@/lib/quiet";
import { requestKindLabel } from "@/lib/requests";
import { sealProfile } from "@/lib/secure-profile";
import { tripDays } from "@/lib/trips";
import { vacationBalance } from "@/lib/payroll";
import { weeklyHours } from "@/lib/employee-rights";
import { SwapRow, TripRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_employee_03(c: Pick<RouteCtx, "AWAY_CODES" | "PROFILE_CHANGE_FIELDS" | "applySwap" | "approverOf" | "askFeedback" | "changeValue" | "clockSettings" | "dataKey" | "dataOf" | "db" | "feedbackSummary" | "leaveChecks" | "maskedValue" | "oneOnOneRows" | "ownWorkplace" | "path" | "request" | "requestUrl" | "saveOneOnOne" | "setSkillLevel" | "skillMatrix" | "swapSelect" | "swapView" | "teamOf" | "tellCompany" | "tripView" | "userId">): Promise<Response | undefined> {
  const { AWAY_CODES, PROFILE_CHANGE_FIELDS, applySwap, approverOf, askFeedback, changeValue, clockSettings, dataKey, dataOf, db, feedbackSummary, leaveChecks, maskedValue, oneOnOneRows, ownWorkplace, path, request, requestUrl, saveOneOnOne, setSkillLevel, skillMatrix, swapSelect, swapView, teamOf, tellCompany, tripView, userId } = c;
  if (request.method === "GET" && path === "employee/team") {
    const manager = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const people = await teamOf(manager);
    if (!people.length) return ok({ people: [], requests: [], away: [], perf: null, trips: [], shifts: [], swaps: [], overtime: [], skills: { skills: [], cells: [] } });
    const ids = people.map((p) => p.id);
    const marks = ids.length ? (await db.prepare(`SELECT employee_id,day,code FROM attendance_marks WHERE company_id=? AND employee_id IN (${ids.map(() => "?").join(",")}) AND day BETWEEN ? AND ? AND code IN (${AWAY_CODES.map(() => "?").join(",")}) ORDER BY day`).bind(manager.company_id, ...ids, bakuNow().date, new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10), ...AWAY_CODES).all<{ employee_id: string; day: string; code: string }>()).results : [];
    const reqs = (await db.prepare(`SELECT id,employee_id,kind,data,status,manager_status,manager_name,manager_note,manager_at,created FROM employee_requests WHERE company_id=? AND employee_id IN (${ids.map(() => "?").join(",")}) AND manager_status<>'' ORDER BY CASE manager_status WHEN 'pending' THEN 0 ELSE 1 END, created DESC LIMIT 60`).bind(manager.company_id, ...ids).all<{ id: string; employee_id: string; kind: string; data: string; status: string; manager_status: string; manager_name: string; manager_note: string; manager_at: string; created: string }>()).results;
    const byId = new Map(people.map((p) => [p.id, p]));
    const today = bakuNow().date;
    const requests = [];
    for (const r of reqs) {
      const p = byId.get(r.employee_id)!;
      const d = dataOf(r.data);
      requests.push({
        id: r.id, employeeId: r.employee_id, name: p.name, position: p.position, kind: r.kind, label: requestKindLabel(r.kind), from: d.from || "", to: d.to || "", reason: (d as { reason?: string }).reason || "",
        status: r.manager_status, note: r.manager_note, decidedAt: r.manager_at, created: r.created,
        checks: r.manager_status === "pending" ? await leaveChecks(manager.company_id, { id: p.id, department: p.department }, r.kind, d, r.id) : [],
        balance: ["vacation", "addleave"].includes(r.kind) ? vacationBalance({ start: p.start_date, end: "", entitlement: p.vacation_days ?? 21, used: p.vacation_used ?? 0 }, today).remaining : null,
      });
    }
    // The open performance cycle with the review state of each person, the trips waiting for the manager and the coming shifts.
    const cycle = await db.prepare("SELECT id,name,end_date FROM perf_cycles WHERE company_id=? AND status='open' ORDER BY start_date DESC LIMIT 1").bind(manager.company_id).first<{ id: string; name: string; end_date: string }>();
    const reviews = cycle ? (await db.prepare(`SELECT employee_id,self_score,manager_score,manager_comment,status FROM perf_reviews WHERE cycle_id=? AND employee_id IN (${ids.map(() => "?").join(",")})`).bind(cycle.id, ...ids).all<{ employee_id: string; self_score: number | null; manager_score: number | null; manager_comment: string; status: string }>()).results : [];
    const goals = cycle ? (await db.prepare(`SELECT employee_id,title,weight,progress,score FROM perf_goals WHERE cycle_id=? AND employee_id IN (${ids.map(() => "?").join(",")})`).bind(cycle.id, ...ids).all<{ employee_id: string; title: string; weight: number; progress: number; score: number | null }>()).results : [];
    const tripRows = (await db.prepare(`SELECT id,employee_id,destination,purpose,start_date,end_date,status,manager_status,abroad FROM trips WHERE company_id=? AND employee_id IN (${ids.map(() => "?").join(",")}) AND (manager_status='pending' OR (status='approved' AND end_date>=?)) ORDER BY start_date LIMIT 40`).bind(manager.company_id, ...ids, today).all<{ id: string; employee_id: string; destination: string; purpose: string; start_date: string; end_date: string; status: string; manager_status: string; abroad: number }>()).results;
    const shiftRows = (await db.prepare(`SELECT a.employee_id,a.day,t.name,t.start_time,t.end_time FROM shift_assignments a JOIN shift_types t ON t.id=a.shift_id WHERE a.company_id=? AND a.employee_id IN (${ids.map(() => "?").join(",")}) AND a.day BETWEEN ? AND ? ORDER BY a.day`).bind(manager.company_id, ...ids, today, new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)).all<{ employee_id: string; day: string; name: string; start_time: string; end_time: string }>()).results;
    // Extra and rest-day hours of the team that still wait for approval in this month.
    const hoursMonth = today.slice(0, 7);
    const calendar = (await db.prepare("SELECT day,kind,label FROM company_calendar WHERE company_id=? AND day BETWEEN ? AND ?").bind(manager.company_id, `${hoursMonth}-01`, `${hoursMonth}-31`).all<CalendarOverride>()).results;
    const monthDaysList = monthDays(Number(hoursMonth.slice(0, 4)), Number(hoursMonth.slice(5, 7)), calendar);
    const dayInfo = new Map(monthDaysList.map((d) => [d.date, d]));
    const ordered = new Set((await db.prepare(`SELECT employee_id,day FROM overtime_orders WHERE company_id=? AND employee_id IN (${ids.map(() => "?").join(",")}) AND day BETWEEN ? AND ?`).bind(manager.company_id, ...ids, `${hoursMonth}-01`, `${hoursMonth}-31`).all<{ employee_id: string; day: string }>()).results.map((o) => `${o.employee_id}|${o.day}`));
    const hourRows = (await db.prepare(`SELECT employee_id,day,hours,overtime_status FROM attendance_hours WHERE company_id=? AND employee_id IN (${ids.map(() => "?").join(",")}) AND day BETWEEN ? AND ?`).bind(manager.company_id, ...ids, `${hoursMonth}-01`, `${hoursMonth}-31`).all<{ employee_id: string; day: string; hours: number; overtime_status: string }>()).results;
    const monthRows = (await db.prepare(`SELECT employee_id,overtime,rest_day,night,status FROM attendance_hours_month WHERE company_id=? AND employee_id IN (${ids.map(() => "?").join(",")}) AND month=?`).bind(manager.company_id, ...ids, hoursMonth).all<{ employee_id: string; overtime: number; rest_day: number; night: number; status: string }>()).results;
    const overtime: { personId: string; name: string; kind: "day" | "month"; day: string; extra: number; status: string }[] = [];
    for (const h of hourRows) {
      const info = dayInfo.get(h.day);
      const week = weeklyHours(parseProfile(byId.get(h.employee_id)!.profile), `${hoursMonth}-01`).hours;
      const extra = Math.round((info && info.off !== "" ? h.hours : Math.max(0, h.hours - dailyNorm(week, !!info?.short))) * 100) / 100;
      if (extra > 0 && h.overtime_status !== "approved" && !ordered.has(`${h.employee_id}|${h.day}`)) overtime.push({ personId: h.employee_id, name: byId.get(h.employee_id)!.name, kind: "day", day: h.day, extra, status: h.overtime_status });
    }
    for (const m of monthRows) if (!hourRows.some((h) => h.employee_id === m.employee_id) && m.overtime + m.rest_day > 0 && m.status !== "approved") overtime.push({ personId: m.employee_id, name: byId.get(m.employee_id)!.name, kind: "month", day: hoursMonth, extra: Math.round((m.overtime + m.rest_day) * 100) / 100, status: m.status });
    const feedback = cycle ? await feedbackSummary(manager.company_id, cycle.id, ids) : new Map<string, { asked: number; count: number; average: number | null; comments: string[] }>();
    return ok({
      perf: cycle ? { cycleId: cycle.id, name: cycle.name, end: cycle.end_date, people: people.map((p) => { const r = reviews.find((x) => x.employee_id === p.id); return { feedback: feedback.get(p.id) || null, employeeId: p.id, name: p.name, selfScore: r?.self_score ?? null, managerScore: r?.manager_score ?? null, managerComment: r?.manager_comment || "", status: r?.status || "open", goals: goals.filter((g) => g.employee_id === p.id).map((g) => ({ title: g.title, weight: g.weight, progress: g.progress, score: g.score })) }; }) } : null,
      trips: tripRows.map((t) => ({ id: t.id, employeeId: t.employee_id, name: byId.get(t.employee_id)?.name || "", destination: t.destination, purpose: t.purpose, start: t.start_date, end: t.end_date, abroad: !!t.abroad, waiting: t.manager_status === "pending" })),
      skills: await skillMatrix(manager.company_id, ids),
      overtime,
      swaps: (await db.prepare(`${swapSelect} WHERE s.company_id=? AND s.status='accepted' AND s.from_employee IN (${ids.map(() => "?").join(",")}) ORDER BY s.day LIMIT 20`).bind(manager.company_id, ...ids).all<SwapRow>()).results.map(swapView),
      shifts: shiftRows.map((r) => ({ employeeId: r.employee_id, name: byId.get(r.employee_id)?.name || "", day: r.day, shift: r.name, start: r.start_time, end: r.end_time })),
      people: people.map((p) => ({ id: p.id, name: p.name, position: p.position, department: p.department, away: marks.find((m) => m.employee_id === p.id && m.day === today)?.code || "" })),
      requests,
      away: marks.reduce<{ name: string; from: string; to: string; code: string }[]>((acc, m) => {
        const last = acc[acc.length - 1];
        const name = byId.get(m.employee_id)!.name;
        if (last && last.name === name && last.code === m.code && Date.parse(m.day) - Date.parse(last.to) <= 3 * 86_400_000) last.to = m.day;
        else acc.push({ name, from: m.day, to: m.day, code: m.code });
        return acc;
      }, []),
    });
  }
  if (request.method === "GET" && path === "employee/profile-changes") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const rows = (await db.prepare("SELECT id,field,payload,status,reason,created FROM profile_changes WHERE company_id=? AND employee_id=? ORDER BY created DESC LIMIT 20").bind(employee.company_id, employee.id).all<{ id: string; field: string; payload: string; status: string; reason: string; created: string }>()).results;
    return ok({ fields: PROFILE_CHANGE_FIELDS, items: await Promise.all(rows.map(async (r) => ({ id: r.id, field: r.field, label: PROFILE_CHANGE_FIELDS[r.field] || r.field, value: maskedValue(r.field, await changeValue(r.payload, r.field)), status: r.status, reason: r.reason, created: r.created }))) });
  }
  if (request.method === "POST" && path === "employee/profile-changes") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const field = str(b.field, 30);
    if (!PROFILE_CHANGE_FIELDS[field]) throw new HttpError(400, "Bu məlumatı sorğu ilə dəyişmək olmur.");
    const value = field === "iban" ? str(b.value, 40).replace(/\s+/g, "").toUpperCase() : field === "cardNumber" ? str(b.value, 30).replace(/[\s-]+/g, "") : str(b.value, 200);
    if (!value) throw new HttpError(400, "Yeni məlumatı yazın.");
    if (field === "iban" && !validIban(value)) throw new HttpError(400, "IBAN düzgün deyil (Azərbaycan IBAN-ı AZ ilə başlayır və 28 simvoldur).");
    if (field === "cardNumber" && !validCard(value)) throw new HttpError(400, "Kart nömrəsi düzgün deyil.");
    const open = await db.prepare("SELECT COUNT(*) AS n FROM profile_changes WHERE employee_id=? AND status='new'").bind(employee.id).first<{ n: number }>();
    if (Number(open?.n) >= 5) throw new HttpError(409, "Cavab gözləyən 5 sorğunuz var.");
    await db.prepare("INSERT INTO profile_changes(id,company_id,employee_id,field,payload,status,created) VALUES(?,?,?,?,?,'new',?)").bind(crypto.randomUUID(), employee.company_id, employee.id, field, await sealProfile({ [field]: value } as unknown as EmployeeProfile, dataKey()), new Date().toISOString()).run();
    await notifyCompanyRoles(db, employee.company_id, "employees", { type: "application", title: `Məlumat dəyişikliyi sorğusu: ${employee.name}`, body: PROFILE_CHANGE_FIELDS[field], link: "hr-orders" }).catch((error) => quiet("route-best-effort", error));
    return ok({ ok: true }, 201);
  }
  if (request.method === "GET" && path === "employee/shift-swaps") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const rows = (await db.prepare(`${swapSelect} WHERE s.company_id=? AND (s.from_employee=? OR s.to_employee=?) ORDER BY s.created DESC LIMIT 30`).bind(employee.company_id, employee.id, employee.id).all<SwapRow>()).results;
    const colleagues = (await db.prepare("SELECT id,name FROM company_employees WHERE company_id=? AND status IN ('active','leave') AND id<>? ORDER BY name").bind(employee.company_id, employee.id).all<{ id: string; name: string }>()).results;
    return ok({ items: rows.map(swapView), colleagues });
  }
  if (request.method === "POST" && path === "employee/shift-swaps/request") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const day = str(b.day, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < new Date().toISOString().slice(0, 10)) throw new HttpError(400, "Keçmiş tarix üçün dəyişdirmə olmur.");
    const other = await db.prepare("SELECT id,name,user_id FROM company_employees WHERE id=? AND company_id=? AND status IN ('active','leave') AND id<>?").bind(str(b.toEmployeeId, 100), employee.company_id, employee.id).first<{ id: string; name: string; user_id: string }>();
    if (!other) throw new HttpError(404, "Kolleqa tapılmadı.");
    const mine = await db.prepare("SELECT shift_id FROM shift_assignments WHERE company_id=? AND employee_id=? AND day=?").bind(employee.company_id, employee.id, day).first<{ shift_id: string }>();
    const theirs = await db.prepare("SELECT shift_id FROM shift_assignments WHERE company_id=? AND employee_id=? AND day=?").bind(employee.company_id, other.id, day).first<{ shift_id: string }>();
    if (!mine || !theirs) throw new HttpError(409, "İkinizin də həmin gün növbəsi olmalıdır.");
    if (mine.shift_id === theirs.shift_id) throw new HttpError(409, "İkinizin növbəsi eynidir: dəyişdirməyə ehtiyac yoxdur.");
    const open = await db.prepare("SELECT 1 AS n FROM shift_swaps WHERE company_id=? AND day=? AND status IN ('asked','accepted') AND (from_employee IN (?,?) OR to_employee IN (?,?))").bind(employee.company_id, day, employee.id, other.id, employee.id, other.id).first();
    if (open) throw new HttpError(409, "Bu gün üçün açıq dəyişdirmə sorğusu var.");
    await db.prepare("INSERT INTO shift_swaps(id,company_id,day,from_employee,to_employee,note,status,created) VALUES(?,?,?,?,?,?,'asked',?)").bind(crypto.randomUUID(), employee.company_id, day, employee.id, other.id, str(b.note, 200), new Date().toISOString()).run();
    if (other.user_id) await notify(db, { userId: other.user_id, type: "application", title: `${employee.name} növbə dəyişdirməyi xahiş edir`, body: `${day} tarixi. İş yerim → Növbəm bölməsində cavab verin.`, link: "workplace" }).catch((error) => quiet("route-best-effort", error));
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "employee/shift-swaps/respond") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const swap = await db.prepare("SELECT id,day,from_employee FROM shift_swaps WHERE id=? AND company_id=? AND to_employee=? AND status='asked'").bind(str(b.id, 100), employee.company_id, employee.id).first<{ id: string; day: string; from_employee: string }>();
    if (!swap) throw new HttpError(404, "Cavab gözləyən sorğu tapılmadı.");
    const accept = b.accept === true;
    await db.prepare("UPDATE shift_swaps SET status=? WHERE id=?").bind(accept ? "accepted" : "declined", swap.id).run();
    const asker = await db.prepare("SELECT name,user_id,profile FROM company_employees WHERE id=?").bind(swap.from_employee).first<{ name: string; user_id: string; profile: string }>();
    if (asker?.user_id) await notify(db, { userId: asker.user_id, type: "application", title: accept ? "Kolleqa növbə dəyişdirməyə razıdır" : "Kolleqa növbə dəyişdirməkdən imtina etdi", body: `${swap.day}. ${accept ? "İndi təsdiq gözlənilir." : ""}`, link: "workplace" }).catch((error) => quiet("route-best-effort", error));
    if (accept) {
      const managerId = parseProfile(asker?.profile || "").managerId;
      const manager = managerId ? await db.prepare("SELECT user_id FROM company_employees WHERE id=? AND company_id=? AND user_id<>''").bind(managerId, employee.company_id).first<{ user_id: string }>() : null;
      if (manager) await notify(db, { userId: manager.user_id, type: "application", title: `Növbə dəyişdirmə təsdiqinizi gözləyir: ${asker?.name || ""}`, body: `${swap.day}. İş yerim → Komandam.`, link: "workplace" }).catch((error) => quiet("route-best-effort", error));
      await tellCompany(employee.company_id, "Növbə dəyişdirmə sorğusu təsdiq gözləyir", `${asker?.name || ""} ↔ ${employee.name}, ${swap.day}`, "hr-growth");
    }
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/team/overtime") {
    const b = await jsonBody(request);
    const manager = await ownWorkplace(str(b.employeeId, 100));
    const person = (await teamOf(manager)).find((p) => p.id === str(b.personId, 100));
    if (!person) throw new HttpError(404, "İşçi sizin komandanızda deyil.");
    const status = b.status === "approved" ? "approved" : b.status === "rejected" ? "rejected" : "";
    const when = str(b.day, 10);
    const month = (when || "").slice(0, 7);
    if (!/^\d{4}-\d{2}/.test(month)) throw new HttpError(400, "Tarixi düzgün yazın.");
    const locked = (await db.prepare("SELECT status FROM payroll_runs WHERE company_id=? AND month=?").bind(manager.company_id, month).first<{ status: string }>())?.status === "approved";
    if (locked) throw new HttpError(409, "Bu ay təsdiqlənib: artıq iş dəyişdirilmir.");
    const now = new Date().toISOString();
    const res = b.kind === "month"
      ? await db.prepare("UPDATE attendance_hours_month SET status=?,updated=? WHERE company_id=? AND employee_id=? AND month=?").bind(status, now, manager.company_id, person.id, month).run()
      : await db.prepare("UPDATE attendance_hours SET overtime_status=?,updated=? WHERE company_id=? AND employee_id=? AND day=?").bind(status, now, manager.company_id, person.id, when).run();
    if (!res.meta.changes) throw new HttpError(404, "Saat qeydi tapılmadı.");
    await companyAudit(db, manager.company_id, userId, "overtime-decision-by-manager", person.id, `${when}: ${status || "gözləyir"} (${manager.name})`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/team/swap") {
    const b = await jsonBody(request);
    const manager = await ownWorkplace(str(b.employeeId, 100));
    const people = await teamOf(manager);
    const swap = await db.prepare("SELECT id,from_employee FROM shift_swaps WHERE id=? AND company_id=? AND status='accepted'").bind(str(b.id, 100), manager.company_id).first<{ id: string; from_employee: string }>();
    if (!swap || !people.some((p) => p.id === swap.from_employee)) throw new HttpError(404, "Bu sorğu sizin təsdiqinizi gözləmir.");
    if (b.approve === true) await applySwap(manager.company_id, swap.id, manager.name);
    else await db.prepare("UPDATE shift_swaps SET status='rejected',decided_by_name=? WHERE id=?").bind(manager.name, swap.id).run();
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "employee/feedback") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const rows = (await db.prepare("SELECT f.id,e.name,c.name AS cycle FROM perf_feedback f JOIN company_employees e ON e.id=f.subject_id JOIN perf_cycles c ON c.id=f.cycle_id WHERE f.company_id=? AND f.giver_id=? AND f.status='asked' AND c.status='open' ORDER BY f.created").bind(employee.company_id, employee.id).all<{ id: string; name: string; cycle: string }>()).results;
    return ok({ items: rows.map((r) => ({ id: r.id, subject: r.name, cycle: r.cycle })) });
  }
  if (request.method === "POST" && path === "employee/feedback/submit") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const score = Math.round(Number(b.score));
    if (!(score >= 1 && score <= 5)) throw new HttpError(400, "Qiyməti 1–5 arası seçin.");
    const res = await db.prepare("UPDATE perf_feedback SET status='done',score=?,comment=?,answered=? WHERE id=? AND company_id=? AND giver_id=? AND status='asked'").bind(score, str(b.comment, 600), new Date().toISOString(), str(b.id, 100), employee.company_id, employee.id).run();
    if (!res.meta.changes) throw new HttpError(404, "Cavab gözləyən sorğu tapılmadı.");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/team/feedback-request") {
    const b = await jsonBody(request);
    const manager = await ownWorkplace(str(b.employeeId, 100));
    const person = (await teamOf(manager)).find((p) => p.id === str(b.personId, 100));
    if (!person) throw new HttpError(404, "İşçi sizin komandanızda deyil.");
    return ok({ ok: true, asked: await askFeedback(manager.company_id, str(b.cycleId, 100), person.id, Array.isArray(b.giverIds) ? (b.giverIds as unknown[]).map((x) => String(x)) : []) });
  }
  if (request.method === "GET" && path === "employee/skills") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const m = await skillMatrix(employee.company_id, [employee.id]);
    return ok({ skills: m.skills, cells: m.cells });
  }
  if (request.method === "POST" && path === "employee/team/skills") {
    const b = await jsonBody(request);
    const manager = await ownWorkplace(str(b.employeeId, 100));
    const person = (await teamOf(manager)).find((p) => p.id === str(b.personId, 100));
    if (!person) throw new HttpError(404, "İşçi sizin komandanızda deyil.");
    await setSkillLevel(manager.company_id, person.id, str(b.skillId, 100), b.level === undefined || b.level === "" ? null : Number(b.level), b.target === undefined || b.target === "" ? null : Number(b.target));
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/team/review") {
    const b = await jsonBody(request);
    const manager = await ownWorkplace(str(b.employeeId, 100));
    const person = (await teamOf(manager)).find((p) => p.id === str(b.personId, 100));
    const cycle = await db.prepare("SELECT id FROM perf_cycles WHERE id=? AND company_id=? AND status='open'").bind(str(b.cycleId, 100), manager.company_id).first<{ id: string }>();
    if (!person || !cycle) throw new HttpError(404, "İşçi və ya açıq dövr tapılmadı.");
    const score = Math.round(Number(b.score));
    if (!(score >= 1 && score <= 5)) throw new HttpError(400, "Ümumi qiyməti 1–5 arası seçin.");
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO perf_reviews(id,company_id,cycle_id,employee_id,manager_score,manager_comment,reviewer_name,status,updated) VALUES(?,?,?,?,?,?,?,'manager-done',?) ON CONFLICT(cycle_id,employee_id) DO UPDATE SET manager_score=excluded.manager_score,manager_comment=excluded.manager_comment,reviewer_name=excluded.reviewer_name,status=CASE WHEN perf_reviews.status='acknowledged' THEN 'acknowledged' ELSE 'manager-done' END,updated=excluded.updated").bind(crypto.randomUUID(), manager.company_id, cycle.id, person.id, score, str(b.comment, 1000), manager.name, now).run();
    await companyAudit(db, manager.company_id, userId, "performance-reviewed-by-manager", person.id, `${person.name}: ${score}`);
    if (person.user_id) await notify(db, { userId: person.user_id, type: "application", title: "Performans qiymətləndirməniz hazırdır", body: `Rəhbəriniz ${manager.name} qiymət yazdı. İş yerim → Performans bölməsində tanış olun.`, link: "workplace" }).catch((error) => quiet("route-best-effort", error));
    await tellCompany(manager.company_id, `Rəhbər qiymətləndirdi: ${person.name}`, `${manager.name}: ${score}/5`, "hr-growth");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/team/trip") {
    const b = await jsonBody(request);
    const manager = await ownWorkplace(str(b.employeeId, 100));
    const people = await teamOf(manager);
    const trip = await db.prepare("SELECT id,employee_id,destination,start_date,end_date FROM trips WHERE id=? AND company_id=? AND manager_status='pending' AND status='requested'").bind(str(b.tripId, 100), manager.company_id).first<{ id: string; employee_id: string; destination: string; start_date: string; end_date: string }>();
    const person = trip && people.find((p) => p.id === trip.employee_id);
    if (!trip || !person) throw new HttpError(404, "Bu sorğu sizin təsdiqinizi gözləmir.");
    const approve = b.decision === "approve";
    const note = str(b.note, 300);
    if (!approve && note.length < 5) throw new HttpError(400, "Rədd səbəbini yazın.");
    if (approve) await db.prepare("UPDATE trips SET manager_status='approved',manager_name=?,manager_note=? WHERE id=?").bind(manager.name, note, trip.id).run();
    else await db.prepare("UPDATE trips SET manager_status='rejected',manager_name=?,manager_note=?,status='rejected',decided_by_name=? WHERE id=?").bind(manager.name, note, manager.name, trip.id).run();
    if (person.user_id) await notify(db, { userId: person.user_id, type: "application", title: approve ? "Rəhbəriniz ezamiyyət sorğusunu təsdiq etdi" : "Rəhbəriniz ezamiyyət sorğusunu rədd etdi", body: `${trip.destination}, ${trip.start_date} – ${trip.end_date}${note ? `. ${note}` : ""}`, link: "workplace" }).catch((error) => quiet("route-best-effort", error));
    if (approve) await tellCompany(manager.company_id, `Rəhbər ezamiyyəti təsdiqlədi: ${person.name}`, `${trip.destination}, ${trip.start_date} – ${trip.end_date}`, "hr-growth");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "employee/team/one-on-ones") {
    const manager = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const person = (await teamOf(manager)).find((p) => p.id === str(requestUrl.searchParams.get("personId"), 100));
    if (!person) throw new HttpError(404, "İşçi sizin komandanızda deyil.");
    return ok({ items: await oneOnOneRows(manager.company_id, person.id, false) });
  }
  if (request.method === "POST" && path === "employee/team/one-on-ones") {
    const b = await jsonBody(request);
    const manager = await ownWorkplace(str(b.employeeId, 100));
    const person = (await teamOf(manager)).find((p) => p.id === str(b.personId, 100));
    if (!person) throw new HttpError(404, "İşçi sizin komandanızda deyil.");
    await saveOneOnOne(manager.company_id, person.id, b, "manager", manager.name);
    if (b.shared !== false && person.user_id) await notify(db, { userId: person.user_id, type: "application", title: "1:1 görüş qeydi əlavə olundu", body: "İş yerim → Performans bölməsində görüşün nəticələrinə baxın.", link: "workplace" }).catch((error) => quiet("route-best-effort", error));
    return ok({ ok: true }, 201);
  }
  if (request.method === "GET" && path === "employee/one-on-ones") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    return ok({ items: await oneOnOneRows(employee.company_id, employee.id, true) });
  }
  if (request.method === "POST" && path === "employee/team/decide") {
    const b = await jsonBody(request);
    const manager = await ownWorkplace(str(b.employeeId, 100));
    const people = await teamOf(manager);
    const row = await db.prepare("SELECT id,employee_id,kind,data FROM employee_requests WHERE id=? AND company_id=? AND manager_status='pending' AND status='new'").bind(str(b.requestId, 100), manager.company_id).first<{ id: string; employee_id: string; kind: string; data: string }>();
    const person = row && people.find((p) => p.id === row.employee_id);
    if (!row || !person) throw new HttpError(404, "Bu ərizə sizin təsdiqinizi gözləmir.");
    const approve = b.decision === "approve";
    const note = str(b.note, 300);
    if (!approve && note.length < 5) throw new HttpError(400, "Rədd səbəbini yazın.");
    const now = new Date().toISOString();
    if (approve) await db.prepare("UPDATE employee_requests SET manager_status='approved',manager_name=?,manager_note=?,manager_at=?,updated=? WHERE id=?").bind(manager.name, note, now, now, row.id).run();
    else await db.prepare("UPDATE employee_requests SET manager_status='rejected',manager_name=?,manager_note=?,manager_at=?,status='rejected',decision=?,updated=? WHERE id=?").bind(manager.name, note, now, `Birbaşa rəhbər (${manager.name}) razı olmadı: ${note}`, now, row.id).run();
    await companyAudit(db, manager.company_id, userId, approve ? "manager-approved" : "manager-rejected", person.id, `${person.name}: ${row.kind}`);
    if (person.user_id) await notify(db, { userId: person.user_id, type: "application", title: approve ? "Rəhbəriniz ərizənizi təsdiq etdi" : "Rəhbəriniz ərizənizlə razılaşmadı", body: approve ? "İndi HR əmri hazırlayır." : note, link: "workplace" }).catch((error) => quiet("route-best-effort", error));
    if (approve) await notifyCompanyRoles(db, manager.company_id, "orders", { type: "application", title: `Rəhbər təsdiqlədi: ${person.name}`, body: requestKindLabel(row.kind), link: "hr-orders" }).catch((error) => quiet("route-best-effort", error));
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "employee/clock") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const now = bakuNow();
    const setting = await clockSettings(employee.company_id);
    const rows = await db.prepare("SELECT day,hours,clock_in,clock_out,overtime_status FROM attendance_hours WHERE company_id=? AND employee_id=? AND day>=? ORDER BY day DESC LIMIT 14").bind(employee.company_id, employee.id, new Date(Date.now() - 20 * 86_400_000).toISOString().slice(0, 10)).all<{ day: string; hours: number; clock_in: string; clock_out: string; overtime_status: string }>();
    return ok({
      enabled: setting.selfClock,
      locationMode: setting.locationMode,
      today: now.date,
      now: now.time,
      start: setting.rules.start,
      end: setting.rules.end,
      items: rows.results.map((r) => ({ day: r.day, hours: r.hours, clockIn: r.clock_in, clockOut: r.clock_out, late: r.clock_in ? lateMinutes(r.clock_in, setting.rules) : 0, early: r.clock_out ? earlyLeaveMinutes(r.clock_out, setting.rules) : 0, overtimeStatus: r.overtime_status })),
    });
  }
  if (request.method === "POST" && path === "employee/clock") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const setting = await clockSettings(employee.company_id);
    if (!setting.selfClock) throw new HttpError(403, "Şirkət giriş-çıxış qeydini işçilər üçün açmayıb.");
    const now = bakuNow();
    const locked = (await db.prepare("SELECT status FROM payroll_runs WHERE company_id=? AND month=?").bind(employee.company_id, now.date.slice(0, 7)).first<{ status: string }>())?.status === "approved";
    if (locked) throw new HttpError(409, "Bu ay təsdiqlənib: giriş-çıxış qeydi artıq dəyişmir. HR ilə əlaqə saxlayın.");
    // At the office? Only the distance is kept (as a note when it is outside); the person's coordinates are not stored.
    const geo = checkLocation(setting.locationMode, setting.office, b.lat !== undefined ? { lat: b.lat, lng: b.lng } : null);
    if (!geo.allowed) throw new HttpError(403, geo.error);
    const current = await db.prepare("SELECT clock_in,clock_out,source FROM attendance_hours WHERE company_id=? AND employee_id=? AND day=?").bind(employee.company_id, employee.id, now.date).first<{ clock_in: string; clock_out: string; source: string }>();
    const stamp = new Date().toISOString();
    if (b.action === "in") {
      if (current?.clock_in) throw new HttpError(409, `Bu gün giriş artıq ${current.clock_in}-də qeyd olunub.`);
      await db.prepare("INSERT INTO attendance_hours(company_id,employee_id,day,hours,night_hours,note,updated,clock_in,clock_out,source) VALUES(?,?,?,0,0,'',?,?,'','self') ON CONFLICT(company_id,employee_id,day) DO UPDATE SET clock_in=excluded.clock_in,updated=excluded.updated,source='self'").bind(employee.company_id, employee.id, now.date, stamp, now.time).run();
      if (geo.note) await db.prepare("UPDATE attendance_hours SET note=CASE WHEN note='' THEN ? ELSE note||' · '||? END WHERE company_id=? AND employee_id=? AND day=?").bind(`Giriş: ${geo.note}`, `Giriş: ${geo.note}`, employee.company_id, employee.id, now.date).run();
      return ok({ ok: true, time: now.time, late: lateMinutes(now.time, setting.rules), outside: geo.outside });
    }
    if (b.action === "out") {
      // A night shift ends after midnight: the open arrival of yesterday is closed in the morning.
      let day = now.date;
      let open = current;
      if (!open?.clock_in || open.clock_out) {
        const yesterday = new Date(new Date(`${now.date}T00:00:00Z`).getTime() - 86_400_000).toISOString().slice(0, 10);
        const prev = await db.prepare("SELECT clock_in,clock_out,source FROM attendance_hours WHERE company_id=? AND employee_id=? AND day=?").bind(employee.company_id, employee.id, yesterday).first<{ clock_in: string; clock_out: string; source: string }>();
        if (!open?.clock_in && prev?.clock_in && !prev.clock_out && now.time < "12:00") {
          day = yesterday;
          open = prev;
        }
      }
      if (!open?.clock_in) throw new HttpError(409, "Əvvəlcə giriş qeyd edin.");
      if (open.clock_out) throw new HttpError(409, `Bu gün çıxış artıq ${open.clock_out}-də qeyd olunub.`);
      const calc = hoursFromClock(open.clock_in, now.time, setting.rules.breakMinutes);
      if (day === now.date && now.time < open.clock_in) throw new HttpError(409, "Çıxış saatı giriş saatından əvvəl ola bilməz.");
      await db.prepare("UPDATE attendance_hours SET clock_out=?,hours=?,night_hours=?,updated=? WHERE company_id=? AND employee_id=? AND day=?").bind(now.time, calc?.hours || 0, calc?.night || 0, stamp, employee.company_id, employee.id, day).run();
      if (geo.note) await db.prepare("UPDATE attendance_hours SET note=CASE WHEN note='' THEN ? ELSE note||' · '||? END WHERE company_id=? AND employee_id=? AND day=?").bind(`Çıxış: ${geo.note}`, `Çıxış: ${geo.note}`, employee.company_id, employee.id, day).run();
      return ok({ ok: true, time: now.time, hours: calc?.hours || 0, outside: geo.outside });
    }
    throw new HttpError(400, "Əməliyyat «giriş» və ya «çıxış» olmalıdır.");
  }
  if (request.method === "GET" && path === "employee/trips") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const [trips, expenses] = await Promise.all([
      db.prepare("SELECT id,employee_id,destination,purpose,start_date,end_date,daily_cents,advance_cents,status,requested_by,decided_by_name,settled_cents,abroad,manager_status,manager_name,manager_note FROM trips WHERE company_id=? AND employee_id=? ORDER BY start_date DESC LIMIT 50").bind(employee.company_id, employee.id).all<TripRow>(),
      db.prepare("SELECT id,trip_id,label,amount_cents,day FROM trip_expenses WHERE company_id=? AND trip_id IN (SELECT id FROM trips WHERE company_id=? AND employee_id=?)").bind(employee.company_id, employee.company_id, employee.id).all<{ id: string; trip_id: string; label: string; amount_cents: number; day: string }>(),
    ]);
    return ok({ trips: trips.results.map((t) => tripView(t, employee.name, expenses.results.filter((e) => e.trip_id === t.id))) });
  }
  if (request.method === "POST" && path === "employee/trips/request") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const start = str(b.start, 10);
    const end = str(b.end, 10);
    if (!tripDays(start, end)) throw new HttpError(400, "Tarixləri düzgün yazın.");
    const destination = str(b.destination, 160);
    const place = checkDestination(destination, b.abroad === true);
    if (!place.ok) throw new HttpError(400, place.error);
    b.abroad = place.abroad;
    await db.prepare("INSERT INTO trips(id,company_id,employee_id,destination,purpose,start_date,end_date,status,requested_by,created) VALUES(?,?,?,?,?,?,?,'requested','employee',?)").bind(crypto.randomUUID(), employee.company_id, employee.id, destination, str(b.purpose, 300), start, end, new Date().toISOString()).run();
    // A trip goes to the direct manager first, then to HR; "abroad" picks the per-diem norm of foreign trips.
    const tripId = (await db.prepare("SELECT id FROM trips WHERE company_id=? AND employee_id=? ORDER BY created DESC LIMIT 1").bind(employee.company_id, employee.id).first<{ id: string }>())?.id || "";
    const mine = await db.prepare("SELECT profile FROM company_employees WHERE id=?").bind(employee.id).first<{ profile: string }>();
    const { approver, note } = await approverOf(employee.company_id, mine?.profile || "", start);
    const manager = approver && approver.id !== employee.id ? approver : null;
    await db.prepare("UPDATE trips SET abroad=?,manager_status=? WHERE id=?").bind(b.abroad === true ? 1 : 0, manager ? "pending" : "", tripId).run();
    if (manager) await notify(db, { userId: manager.user_id, type: "application", title: `Komandanızdan ezamiyyət sorğusu: ${employee.name}`, body: `${destination}, ${start} – ${end}${note ? ` (${note})` : ""}`, link: "workplace" }).catch((error) => quiet("route-best-effort", error));
    else await tellCompany(employee.company_id, `${employee.name} ezamiyyət sorğusu göndərdi`, `${destination}, ${start} – ${end}${note ? `. ${note}` : ""}`, "hr-growth");
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "employee/trips/expense") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const trip = await db.prepare("SELECT id,status FROM trips WHERE id=? AND company_id=? AND employee_id=?").bind(str(b.tripId, 100), employee.company_id, employee.id).first<{ id: string; status: string }>();
    if (!trip || !["approved", "reported"].includes(trip.status)) throw new HttpError(409, "Xərc yalnız təsdiqlənmiş ezamiyyətə yazılır.");
    const amount = Math.round((Number(b.amount) || 0) * 100);
    if (!(amount > 0) || amount > 100_000_000) throw new HttpError(400, "Məbləği düzgün yazın.");
    const label = str(b.label, 160);
    if (label.length < 2) throw new HttpError(400, "Xərcin adını yazın.");
    await db.prepare("INSERT INTO trip_expenses(id,trip_id,company_id,label,amount_cents,day) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), trip.id, employee.company_id, label, amount, /^\d{4}-\d{2}-\d{2}$/.test(str(b.day, 10)) ? str(b.day, 10) : "").run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "employee/trips/report") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const res = await db.prepare("UPDATE trips SET status='reported' WHERE id=? AND company_id=? AND employee_id=? AND status='approved'").bind(str(b.tripId, 100), employee.company_id, employee.id).run();
    if (!res.meta.changes) throw new HttpError(404, "Hesabat veriləcək ezamiyyət tapılmadı.");
    await tellCompany(employee.company_id, `${employee.name} ezamiyyət hesabatını verdi`, "Hesablaşma üçün Ezamiyyətlər bölməsinə baxın.", "hr-growth");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/announcements/read") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const row = await db.prepare("SELECT id FROM announcements WHERE id=? AND company_id=?").bind(str(b.id, 100), employee.company_id).first<{ id: string }>();
    if (!row) throw new HttpError(404, "Elan tapılmadı.");
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO announcement_reads(announcement_id,company_id,employee_id,read_at,acked_at) VALUES(?,?,?,?,?) ON CONFLICT(announcement_id,employee_id) DO UPDATE SET acked_at=CASE WHEN ?<>'' AND announcement_reads.acked_at='' THEN ? ELSE announcement_reads.acked_at END").bind(row.id, employee.company_id, employee.id, now, b.ack === true ? now : "", b.ack === true ? now : "", now).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/announcements/comment") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const row = await db.prepare("SELECT id,title,allow_comments FROM announcements WHERE id=? AND company_id=?").bind(str(b.id, 100), employee.company_id).first<{ id: string; title: string; allow_comments: number }>();
    if (!row || !row.allow_comments) throw new HttpError(404, "Bu elana şərh yazmaq olmur.");
    const body = str(b.body, 600);
    if (body.length < 2) throw new HttpError(400, "Şərhi yazın.");
    const recent = await db.prepare("SELECT COUNT(*) AS n FROM announcement_comments WHERE announcement_id=? AND employee_id=? AND created>?").bind(row.id, employee.id, new Date(Date.now() - 3_600_000).toISOString()).first<{ n: number }>();
    if (Number(recent?.n) >= 5) throw new HttpError(429, "Bir saatda ən çox 5 şərh yazmaq olar.");
    await db.prepare("INSERT INTO announcement_comments(id,announcement_id,company_id,employee_id,author_name,body,created) VALUES(?,?,?,?,?,?,?)").bind(crypto.randomUUID(), row.id, employee.company_id, employee.id, employee.name, body, new Date().toISOString()).run();
    await tellCompany(employee.company_id, `Elana şərh: ${row.title}`, `${employee.name}: ${body.slice(0, 120)}`, "hr-growth");
    return ok({ ok: true }, 201);
  }
  if (request.method === "GET" && path === "employee/engage") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const today = new Date().toISOString().slice(0, 10);
    const [news, surveys] = await Promise.all([
      db.prepare("SELECT id,title,body,audience,pinned,expires,author,created,requires_ack,allow_comments FROM announcements WHERE company_id=? ORDER BY pinned DESC,created DESC LIMIT 40").bind(employee.company_id).all<{ id: string; title: string; body: string; audience: string; pinned: number; expires: string; author: string; created: string; requires_ack: number; allow_comments: number }>(),
      db.prepare("SELECT id,title,questions,anonymous FROM surveys WHERE company_id=? AND status='open' ORDER BY created DESC").bind(employee.company_id).all<{ id: string; title: string; questions: string; anonymous: number }>(),
    ]);
    const digest = async (surveyId: string) => {
      const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${surveyId}:${userId}`)));
      return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
    };
    const open: { id: string; title: string; anonymous: boolean; questions: unknown }[] = [];
    for (const sv of surveys.results) {
      const done = await db.prepare("SELECT 1 AS n FROM survey_responses WHERE survey_id=? AND respondent=?").bind(sv.id, await digest(sv.id)).first();
      if (!done) open.push({ id: sv.id, title: sv.title, anonymous: !!sv.anonymous, questions: JSON.parse(sv.questions || "[]") });
    }
    const allComments = (await db.prepare("SELECT id,announcement_id,author_name,body,created,employee_id FROM announcement_comments WHERE company_id=? ORDER BY created DESC LIMIT 300").bind(employee.company_id).all<{ id: string; announcement_id: string; author_name: string; body: string; created: string; employee_id: string }>()).results;
    const mineReads = (await db.prepare("SELECT announcement_id,acked_at FROM announcement_reads WHERE company_id=? AND employee_id=?").bind(employee.company_id, employee.id).all<{ announcement_id: string; acked_at: string }>()).results;
    return ok({ news: news.results.filter((n) => (!n.audience || n.audience === employee.department) && (!n.expires || n.expires >= today)).map((n) => ({ id: n.id, title: n.title, body: n.body, pinned: !!n.pinned, author: n.author, created: n.created, requiresAck: !!n.requires_ack, allowComments: !!n.allow_comments, comments: allComments.filter((c) => c.announcement_id === n.id).slice(0, 15).map((c) => ({ id: c.id, author: c.author_name, body: c.body, created: c.created, mine: c.employee_id === employee.id, hr: !c.employee_id })), read: mineReads.some((r) => r.announcement_id === n.id), acked: mineReads.some((r) => r.announcement_id === n.id && !!r.acked_at) })), surveys: open });
  }
  if (request.method === "POST" && path === "employee/survey/respond") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const survey = await db.prepare("SELECT id,questions,anonymous FROM surveys WHERE id=? AND company_id=? AND status='open'").bind(str(b.surveyId, 100), employee.company_id).first<{ id: string; questions: string; anonymous: number }>();
    if (!survey) throw new HttpError(404, "Sorğu tapılmadı və ya bağlanıb.");
    const answers = cleanSurveyAnswers(JSON.parse(survey.questions || "[]") as SurveyQuestion[], b.answers);
    if (!Object.keys(answers).length) throw new HttpError(400, "Ən azı bir suala cavab verin.");
    const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${survey.id}:${userId}`)));
    const respondent = [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
    const res = await db.prepare("INSERT OR IGNORE INTO survey_responses(id,survey_id,company_id,respondent,employee_id,department,answers,created) VALUES(?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), survey.id, employee.company_id, respondent, survey.anonymous ? "" : employee.id, employee.department, JSON.stringify(answers), new Date().toISOString()).run();
    if (!res.meta.changes) throw new HttpError(409, "Bu sorğuya artıq cavab vermisiniz.");
    return ok({ ok: true }, 201);
  }
  if (request.method === "GET" && path === "employee/docs-to-sign") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const rows = await db.prepare("SELECT id,subtype,doc_number,doc_date,ack_at,data FROM employee_documents WHERE company_id=? AND employee_id=? AND ack_required=1 AND type LIKE 'text/plain%' ORDER BY created DESC").bind(employee.company_id, employee.id).all<{ id: string; subtype: string; doc_number: string; doc_date: string; ack_at: string; data: string }>();
    return ok({ items: rows.results.map((r) => ({ id: r.id, title: r.subtype, number: r.doc_number, date: r.doc_date, ackAt: r.ack_at, text: new TextDecoder().decode(Uint8Array.from(atob(r.data), (c) => c.charCodeAt(0))) })) });
  }
  if (request.method === "POST" && path === "employee/docs/ack") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const doc = await db.prepare("SELECT id,subtype,data,ack_at FROM employee_documents WHERE id=? AND company_id=? AND employee_id=? AND ack_required=1").bind(str(b.docId, 100), employee.company_id, employee.id).first<{ id: string; subtype: string; data: string; ack_at: string }>();
    if (!doc) throw new HttpError(404, "Sənəd tapılmadı.");
    if (doc.ack_at) throw new HttpError(409, "Bu sənədlə artıq tanış olduğunuzu təsdiq etmisiniz.");
    const hash = [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(doc.data)))].map((x) => x.toString(16).padStart(2, "0")).join("");
    await db.prepare("UPDATE employee_documents SET ack_at=?,ack_hash=? WHERE id=? AND company_id=?").bind(new Date().toISOString(), hash, doc.id, employee.company_id).run();
    await tellCompany(employee.company_id, `${employee.name} sənədlə tanış oldu`, `${doc.subtype}: işçi təsdiq etdi.`, "hr-people-ops");
    await companyAudit(db, employee.company_id, userId, "doc-acknowledged", employee.id, `${doc.subtype} · ${hash.slice(0, 12)}`);
    return ok({ ok: true, hash: hash.slice(0, 16) });
  }
  if (request.method === "GET" && path === "employee/referrals") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const [jobs, mine, bonus] = await Promise.all([
      db.prepare("SELECT id,json_extract(data,'$.title') AS title FROM jobs WHERE owner=? AND status='published' ORDER BY created DESC LIMIT 100").bind(employee.company_id).all<{ id: string; title: string }>(),
      db.prepare("SELECT id,job_title,candidate_name,status,bonus_cents,bonus_paid_at,created FROM referrals WHERE company_id=? AND employee_id=? ORDER BY created DESC LIMIT 100").bind(employee.company_id, employee.id).all<{ id: string; job_title: string; candidate_name: string; status: string; bonus_cents: number; bonus_paid_at: string; created: string }>(),
      db.prepare("SELECT value FROM hr_settings WHERE company_id=? AND key='referral_bonus'").bind(employee.company_id).first<{ value: string }>(),
    ]);
    return ok({ bonus: Number(bonus?.value || 0) / 100, statusText: REFERRAL_STATUS, jobs: jobs.results.map((j) => ({ id: j.id, title: j.title || "" })), items: mine.results.map((r) => ({ id: r.id, jobTitle: r.job_title, name: r.candidate_name, status: r.status, bonus: r.bonus_cents / 100, paid: !!r.bonus_paid_at, created: r.created })) });
  }
  if (request.method === "POST" && path === "employee/referrals/submit") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const name = str(b.name, 120);
    const phone = str(b.phone, 40);
    const email = str(b.email, 160);
    if (name.length < 2) throw new HttpError(400, "Tövsiyə etdiyiniz şəxsin adını yazın.");
    if (!phone && !email) throw new HttpError(400, "Telefon və ya e-poçt yazın ki, onunla əlaqə saxlanıla bilsin.");
    const job = str(b.jobId, 100) ? await db.prepare("SELECT id,json_extract(data,'$.title') AS title FROM jobs WHERE id=? AND owner=? AND status='published'").bind(str(b.jobId, 100), employee.company_id).first<{ id: string; title: string }>() : null;
    const open = Number((await db.prepare("SELECT COUNT(*) AS n FROM referrals WHERE company_id=? AND employee_id=? AND status IN ('new','contacted','interview')").bind(employee.company_id, employee.id).first<{ n: number }>())?.n || 0);
    if (open >= 20) throw new HttpError(409, "Cavab gözləyən 20 tövsiyəniz var.");
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO referrals(id,company_id,employee_id,job_id,job_title,candidate_name,candidate_phone,candidate_email,note,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), employee.company_id, employee.id, job?.id || "", job?.title || str(b.jobTitle, 120), name, phone, email, str(b.note, 500), now, now).run();
    await tellCompany(employee.company_id, `${employee.name} namizəd tövsiyə etdi`, `${name}${job?.title ? ` — ${job.title}` : ""}`, "hr-people-ops");
    return ok({ ok: true }, 201);
  }
  return undefined;
}
