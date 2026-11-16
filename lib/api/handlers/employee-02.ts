// employee: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { RATING_TEXT, cleanScore, cycleScore } from "@/lib/performance";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_employee_02(c: Pick<RouteCtx, "db" | "ownWorkplace" | "path" | "request" | "requestUrl" | "tellCompany">): Promise<Response | undefined> {
  const { db, ownWorkplace, path, request, requestUrl, tellCompany } = c;
  if (request.method === "GET" && path === "employee/performance") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const cycle = await db.prepare("SELECT id,name,start_date,end_date,status FROM perf_cycles WHERE company_id=? ORDER BY (status='open') DESC,start_date DESC LIMIT 1").bind(employee.company_id).first<{ id: string; name: string; start_date: string; end_date: string; status: string }>();
    if (!cycle) return ok({ cycle: null, goals: [], review: null, rating: RATING_TEXT });
    const [goals, review] = await Promise.all([
      db.prepare("SELECT id,title,target,weight,progress,self_note,manager_note,score,proposed_by FROM perf_goals WHERE company_id=? AND cycle_id=? AND employee_id=? ORDER BY created").bind(employee.company_id, cycle.id, employee.id).all<{ id: string; title: string; target: string; weight: number; progress: number; self_note: string; manager_note: string; score: number | null; proposed_by: string }>(),
      db.prepare("SELECT self_score,self_comment,manager_score,manager_comment,reviewer_name,status,acknowledged_at FROM perf_reviews WHERE cycle_id=? AND employee_id=?").bind(cycle.id, employee.id).first<{ self_score: number | null; self_comment: string; manager_score: number | null; manager_comment: string; reviewer_name: string; status: string; acknowledged_at: string }>(),
    ]);
    const result = cycleScore(goals.results.map((g) => ({ weight: g.weight, progress: g.progress, score: g.score })));
    return ok({
      cycle: { id: cycle.id, name: cycle.name, start: cycle.start_date, end: cycle.end_date, status: cycle.status },
      goals: goals.results.map((g) => ({ id: g.id, title: g.title, target: g.target, weight: g.weight, progress: g.progress, selfNote: g.self_note, managerNote: g.manager_note, score: g.score, proposedBy: g.proposed_by })),
      goalScore: result.score,
      review: review ? { selfScore: review.self_score, selfComment: review.self_comment, managerScore: review.manager_score, managerComment: review.manager_comment, reviewer: review.reviewer_name, status: review.status, acknowledgedAt: review.acknowledged_at } : null,
      rating: RATING_TEXT,
    });
  }
  if (request.method === "POST" && path === "employee/performance/goal") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const cycle = await db.prepare("SELECT id,status FROM perf_cycles WHERE id=? AND company_id=?").bind(str(b.cycleId, 100), employee.company_id).first<{ id: string; status: string }>();
    if (!cycle || cycle.status !== "open") throw new HttpError(409, "Açıq dövr yoxdur.");
    const title = str(b.title, 200);
    if (title.length < 3) throw new HttpError(400, "Məqsədi yazın.");
    const count = Number((await db.prepare("SELECT COUNT(*) AS n FROM perf_goals WHERE company_id=? AND cycle_id=? AND employee_id=?").bind(employee.company_id, cycle.id, employee.id).first<{ n: number }>())?.n || 0);
    if (count >= 12) throw new HttpError(409, "Ən çox 12 məqsəd yazılır.");
    await db.prepare("INSERT INTO perf_goals(id,company_id,cycle_id,employee_id,title,target,weight,proposed_by,created) VALUES(?,?,?,?,?,?,1,'employee',?)").bind(crypto.randomUUID(), employee.company_id, cycle.id, employee.id, title, str(b.target, 300), new Date().toISOString()).run();
    await tellCompany(employee.company_id, `${employee.name} məqsəd təklif etdi`, title, "hr-growth");
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "employee/performance/progress") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const res = await db.prepare("UPDATE perf_goals SET progress=?,self_note=? WHERE id=? AND company_id=? AND employee_id=? AND cycle_id IN (SELECT id FROM perf_cycles WHERE company_id=? AND status='open')").bind(Math.max(0, Math.min(100, Math.round(Number(b.progress) || 0))), str(b.note, 500), str(b.goalId, 100), employee.company_id, employee.id, employee.company_id).run();
    if (!res.meta.changes) throw new HttpError(404, "Məqsəd tapılmadı və ya dövr bağlanıb.");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/performance/self") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const cycle = await db.prepare("SELECT id,status FROM perf_cycles WHERE id=? AND company_id=?").bind(str(b.cycleId, 100), employee.company_id).first<{ id: string; status: string }>();
    if (!cycle || cycle.status !== "open") throw new HttpError(409, "Açıq dövr yoxdur.");
    const score = cleanScore(b.selfScore);
    if (score === null) throw new HttpError(400, "Özünüqiyməti 1–5 arası seçin.");
    await db.prepare("INSERT INTO perf_reviews(id,company_id,cycle_id,employee_id,self_score,self_comment,status,updated) VALUES(?,?,?,?,?,?,'self-done',?) ON CONFLICT(cycle_id,employee_id) DO UPDATE SET self_score=excluded.self_score,self_comment=excluded.self_comment,status=CASE WHEN perf_reviews.status='manager-done' THEN perf_reviews.status ELSE 'self-done' END,updated=excluded.updated").bind(crypto.randomUUID(), employee.company_id, cycle.id, employee.id, score, str(b.comment, 1000), new Date().toISOString()).run();
    await tellCompany(employee.company_id, `${employee.name} özünüqiymətləndirməni doldurdu`, `Özünüqiymət: ${score} / 5`, "hr-growth");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/performance/ack") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const res = await db.prepare("UPDATE perf_reviews SET status='acknowledged',acknowledged_at=? WHERE cycle_id=? AND employee_id=? AND company_id=? AND status='manager-done'").bind(new Date().toISOString(), str(b.cycleId, 100), employee.id, employee.company_id).run();
    if (!res.meta.changes) throw new HttpError(404, "Təsdiq ediləcək qiymətləndirmə yoxdur.");
    await tellCompany(employee.company_id, `${employee.name} qiymətləndirmə ilə tanış oldu`, "İşçi qiymətləndirməni təsdiqlədi.", "hr-growth");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "employee/training") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const rows = await db.prepare("SELECT t.id,t.title,t.provider,t.kind,t.start_date,t.end_date,t.hours,t.status AS training_status,p.status,p.result,p.certificate_no,p.valid_until FROM training_participants p JOIN trainings t ON t.id=p.training_id WHERE p.company_id=? AND p.employee_id=? ORDER BY t.start_date DESC").bind(employee.company_id, employee.id).all<{ id: string; title: string; provider: string; kind: string; start_date: string; end_date: string; hours: number; training_status: string; status: string; result: string; certificate_no: string; valid_until: string }>();
    return ok({ items: rows.results.map((r) => ({ id: r.id, title: r.title, provider: r.provider, kind: r.kind, start: r.start_date, end: r.end_date, hours: r.hours, trainingStatus: r.training_status, status: r.status, result: r.result, certificateNo: r.certificate_no, validUntil: r.valid_until })) });
  }
  if (request.method === "POST" && path === "employee/training/respond") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const status = b.status === "declined" ? "declined" : "attending";
    const res = await db.prepare("UPDATE training_participants SET status=? WHERE training_id=? AND employee_id=? AND company_id=? AND status IN ('invited','attending','declined')").bind(status, str(b.trainingId, 100), employee.id, employee.company_id).run();
    if (!res.meta.changes) throw new HttpError(404, "Dəvət tapılmadı.");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "employee/shifts") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 20 * 86_400_000).toISOString().slice(0, 10);
    const rows = await db.prepare("SELECT a.day,t.name,t.start_time,t.end_time FROM shift_assignments a JOIN shift_types t ON t.id=a.shift_id WHERE a.company_id=? AND a.employee_id=? AND a.day BETWEEN ? AND ? ORDER BY a.day").bind(employee.company_id, employee.id, from, to).all<{ day: string; name: string; start_time: string; end_time: string }>();
    return ok({ items: rows.results.map((r) => ({ day: r.day, name: r.name, start: r.start_time, end: r.end_time })) });
  }
  return undefined;
}
