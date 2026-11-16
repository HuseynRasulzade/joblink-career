// hr: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { ACTIVE_INTERVIEW, INTERVIEW_STATUS_LABEL, type InterviewInput, type PanelStatus, bakuLocal, icsFor, panelState, sanitizeFeedback, sanitizeGuideQuestions, sanitizeInterview, staggerStarts, toIso } from "@/lib/interviews";
import { type FeedbackRow, compareInterviews } from "@/lib/interview-compare";
import { type Guide, guideFor } from "@/lib/interview-guide";
import { HttpError, jsonBody, str } from "@/lib/server";
import { STAGE_CATALOG, WITHDRAWN_STATUS, sanitizeStages } from "@/lib/recruitment";
import { can } from "@/lib/company";
import { companyAudit, notify, recordApplicationEvent, sendUserEmail } from "@/lib/api-core";
import { completePastInterviews } from "@/lib/interview-auto";
import { quiet } from "@/lib/quiet";
import { InterviewRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_hr_04(c: Pick<RouteCtx, "INTERVIEW_COLUMNS" | "accountRole" | "askParticipants" | "conflictsOf" | "db" | "failOnConflicts" | "id" | "interviewKindText" | "interviewScope" | "inviteCandidate" | "loadGuideTemplates" | "loadPeople" | "memberGrants" | "memberRole" | "path" | "pickParticipants" | "request" | "requestUrl" | "scheduleFor" | "syncApplicationStatus" | "userId">): Promise<Response | undefined> {
  const { INTERVIEW_COLUMNS, accountRole, askParticipants, conflictsOf, db, failOnConflicts, id, interviewKindText, interviewScope, inviteCandidate, loadGuideTemplates, loadPeople, memberGrants, memberRole, path, pickParticipants, request, requestUrl, scheduleFor, syncApplicationStatus, userId } = c;
  if (request.method === "GET" && path === "hr/interviews") {
    // Interviews whose time is over close by themselves (and the opinion is asked for).
    await completePastInterviews(db, id).catch((error) => quiet("route-best-effort", error));
    const jobIds = await interviewScope();
    const rows = await db
      .prepare(
        `SELECT ${INTERVIEW_COLUMNS} FROM interviews i JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.candidate_id LEFT JOIN applications a ON a.id=i.application_id
        WHERE i.company_id=? AND i.job_id IN (SELECT value FROM json_each(?)) AND i.scheduled_at>=? ORDER BY i.scheduled_at LIMIT 300`,
      )
      .bind(
        id,
        JSON.stringify(jobIds),
        new Date(Date.now() - 45 * 86400000).toISOString(),
      )
      .all<InterviewRow>();
    // Candidates the company invited to the interview stage who have no time yet: they wait here until a time is set.
    type WaitingRow = { application_id: string; job_id: string; candidate_id: string; stage: string; updated: string; candidate: string; job_title: string };
    const waiting = (
      await db
        .prepare(
          `SELECT a.id AS application_id,a.job_id,a.candidate_id,a.stage,a.updated,COALESCE(c.name,json_extract(a.data,'$.name'),'') AS candidate,COALESCE(json_extract(j.data,'$.title'),'') AS job_title
          FROM applications a JOIN jobs j ON j.id=a.job_id LEFT JOIN accounts c ON c.id=a.candidate_id
          WHERE j.owner=? AND a.job_id IN (SELECT value FROM json_each(?)) AND a.status='Müsahibə'
            AND NOT EXISTS (SELECT 1 FROM interviews i WHERE i.application_id=a.id AND (i.status IN ('scheduled','confirmed','pending_panel','panel_declined') OR (i.status='completed' AND i.scheduled_at>=a.updated)))
          ORDER BY a.updated DESC LIMIT 200`,
        )
        .bind(id, JSON.stringify(jobIds))
        .all<WaitingRow>()
        .catch((e: unknown) => { console.error("interviews waiting", e); return { results: [] as WaitingRow[] }; })
    ).results;
    const appIds = [...new Set([...rows.results.map((r) => r.application_id).filter(Boolean), ...waiting.map((w) => w.application_id)])].slice(0, 400) as string[];
    // The latest test sent to each of them, so the interviewer sees at a glance whether a test is pending or passed.
    const tests: Record<string, { status: string; score: number | null; maxScore: number | null; title: string }> = {};
    if (appIds.length) {
      type AsgRow = { application_id: string; status: string; score: number | null; max_score: number | null; title: string };
      const asg = (
        await db
          .prepare(
            `SELECT x.application_id,x.status,x.score,x.max_score,COALESCE(t.title,'') AS title FROM assessment_assignments x LEFT JOIN assessments t ON t.id=x.assessment_id
            WHERE x.company_id=? AND x.application_id IN (SELECT value FROM json_each(?)) ORDER BY x.assigned_at`,
          )
          .bind(id, JSON.stringify(appIds))
          .all<AsgRow>()
          .catch(() => ({ results: [] as AsgRow[] }))
      ).results;
      for (const a of asg) tests[a.application_id] = { status: a.status, score: a.score, maxScore: a.max_score, title: a.title };
    }
    // The questions of each vacancy that has an interview or a waiting candidate.
    const guideJobIds = [...new Set([...rows.results.map((r) => r.job_id), ...waiting.map((w) => w.job_id)])];
    const guides: Record<string, Guide> = {};
    if (guideJobIds.length) {
      const jobsData = (await db.prepare("SELECT id,COALESCE(json_extract(data,'$.title'),'') AS title,COALESCE(json_extract(data,'$.skills'),'[]') AS skills FROM jobs WHERE id IN (SELECT value FROM json_each(?))").bind(JSON.stringify(guideJobIds)).all<{ id: string; title: string; skills: string }>()).results;
      const tpls = await loadGuideTemplates();
      for (const j of jobsData) {
        let skills: string[] = [];
        try { skills = (JSON.parse(j.skills) as unknown[]).map(String); } catch { /* a vacancy without readable skills gets the general questions */ }
        guides[j.id] = guideFor({ id: j.id, title: j.title, skills }, tpls);
      }
    }
    // The colleagues of each interview and their answers, and the requests that wait for my own answer.
    type PartRow = { interview_id: string; user_id: string; name: string; role: string; status: string; note: string };
    const parts: Record<string, { userId: string; name: string; role: string; status: string; note: string }[]> = {};
    const ids = rows.results.map((r) => r.id);
    if (ids.length)
      for (const p of (await db.prepare("SELECT interview_id,user_id,name,role,status,note FROM interview_participants WHERE company_id=? AND interview_id IN (SELECT value FROM json_each(?)) ORDER BY created").bind(id, JSON.stringify(ids)).all<PartRow>()).results)
        (parts[p.interview_id] ||= []).push({ userId: p.user_id, name: p.name, role: p.role, status: p.status, note: p.note });
    const mine = (
      await db
        .prepare(
          `SELECT i.id,i.scheduled_at,i.duration_min,i.kind,i.location,i.note,i.round,i.questions,p.role,COALESCE(json_extract(j.data,'$.title'),'') AS job_title,COALESCE(c.name,'') AS candidate
          FROM interview_participants p JOIN interviews i ON i.id=p.interview_id JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.candidate_id
          WHERE p.company_id=? AND p.user_id=? AND p.status='pending' AND i.status='pending_panel' ORDER BY i.scheduled_at LIMIT 50`,
        )
        .bind(id, userId)
        .all()
        .catch(() => ({ results: [] }))
    ).results;
    return ok({
      interviews: rows.results.map((r) => ({
        ...r,
        participants: parts[r.id] || [],
        questions: sanitizeGuideQuestions((() => { try { return JSON.parse(r.questions || "[]"); } catch { return []; } })()),
        slots: (() => {
          try {
            return JSON.parse(r.slots || "[]") as string[];
          } catch {
            return [] as string[];
          }
        })(),
      })),
      waiting,
      tests,
      guides,
      mine,
      me: userId,
      statusLabels: INTERVIEW_STATUS_LABEL,
    });
  }
  if (request.method === "GET" && path === "hr/interviews/people") {
    // For one vacancy: its own selection stages, the tests that may be sent and the question list that opens for it.
    const jobId = str(new URL(request.url).searchParams.get("jobId"), 100);
    let stages: string[] = [];
    let tests: { id: string; title: string; question_count: number; duration_min: number }[] = [];
    let guide: Guide | null = null;
    if (jobId && (await interviewScope()).includes(jobId)) {
      const job = await db.prepare("SELECT data FROM jobs WHERE id=? AND owner=?").bind(jobId, id).first<{ data: string }>();
      if (job) {
        const data = JSON.parse(job.data) as { title?: string; skills?: string[]; stages?: string[] };
        stages = sanitizeStages(data.stages);
        guide = guideFor({ id: jobId, title: data.title || "", skills: Array.isArray(data.skills) ? data.skills.map(String) : [] }, await loadGuideTemplates());
      }
      if (accountRole === "company" && can(memberRole, "tests", memberGrants))
        tests = (await db.prepare("SELECT id,title,duration_min,json_array_length(questions) AS question_count FROM assessments WHERE company_id=? AND (job_id='' OR job_id IS NULL OR job_id=?) ORDER BY updated DESC").bind(id, jobId).all<{ id: string; title: string; question_count: number; duration_min: number }>()).results;
    }
    return ok({ people: await loadPeople(), rounds: ["HR müsahibəsi", "Texniki müsahibə", "Rəhbər müsahibəsi", "Yekun müsahibə"], stages, tests, guide, catalog: STAGE_CATALOG, canTests: accountRole === "company" && can(memberRole, "tests", memberGrants) });
  }
  if (request.method === "POST" && path === "hr/interviews/check") {
    const b = await jsonBody(request);
    const jobIds = await interviewScope();
    const jobId = str(b.jobId, 100);
    if (!jobIds.includes(jobId)) throw new HttpError(404, "Vakansiya tapılmadı.");
    const at = toIso(b.scheduledAt);
    if (!at) return ok({ conflicts: [] });
    let candidateId = str(b.candidateId, 100);
    if (!candidateId && b.applicationId) candidateId = (await db.prepare("SELECT candidate_id FROM applications WHERE id=?").bind(str(b.applicationId, 100)).first<{ candidate_id: string }>())?.candidate_id || "";
    const userIds = (Array.isArray(b.participants) ? (b.participants as unknown[]) : []).map((x: unknown) => str((x as { userId?: unknown })?.userId ?? x, 100)).filter(Boolean);
    const count = Math.max(1, Math.min(30, Math.round(Number(b.count) || 1)));
    const duration = Math.max(15, Math.min(240, Math.round(Number(b.durationMin) || 45)));
    const starts = staggerStarts(Date.parse(at), count, duration);
    const found: { kind: string; withId: string; message: string }[] = [];
    for (const st of starts.slice(0, 5)) found.push(...(await conflictsOf({ scheduledAt: new Date(st).toISOString(), durationMin: duration, jobId, candidateId: count > 1 ? "" : candidateId, userIds, ignoreId: str(b.ignoreId, 100) })));
    return ok({ conflicts: found.filter((c, i) => found.findIndex((x) => x.message === c.message) === i) });
  }
  if (request.method === "POST" && path === "hr/interviews/panel-respond") {
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        `SELECT i.id,i.application_id,i.candidate_id,i.job_id,i.scheduled_at,i.duration_min,i.kind,i.location,i.panel,i.slots,i.status,i.created_by,i.round,COALESCE(json_extract(j.data,'$.title'),'') AS title,COALESCE(c.name,'') AS candidate
        FROM interviews i JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.candidate_id WHERE i.id=? AND i.company_id=?`,
      )
      .bind(str(b.id, 100), id)
      .first<{ id: string; application_id: string; candidate_id: string; job_id: string; scheduled_at: string; duration_min: number; kind: string; location: string; panel: string; slots: string; status: string; created_by: string; round: string; title: string; candidate: string }>();
    if (!row) throw new HttpError(404, "Müsahibə tapılmadı.");
    const me = await db.prepare("SELECT id,status,name FROM interview_participants WHERE interview_id=? AND user_id=?").bind(row.id, userId).first<{ id: string; status: string; name: string }>();
    if (!me) throw new HttpError(403, "Bu müsahibədə iştirakçı deyilsiniz.");
    if (row.status !== "pending_panel") throw new HttpError(409, "Bu müsahibə artıq iştirakçı təsdiqi mərhələsində deyil.");
    const accept = b.accept === true;
    const note = str(b.note, 300);
    const now = new Date().toISOString();
    await db.prepare("UPDATE interview_participants SET status=?,note=?,responded=? WHERE id=?").bind(accept ? "accepted" : "declined", note, now, me.id).run();
    const all = (await db.prepare("SELECT status FROM interview_participants WHERE interview_id=?").bind(row.id).all<{ status: PanelStatus }>()).results.map((r) => r.status);
    const state = panelState(all);
    const who = me.name || "İştirakçı";
    if (state === "declined") {
      await db.prepare("UPDATE interviews SET status='panel_declined',updated=? WHERE id=?").bind(now, row.id).run();
      await notify(db, { userId: row.created_by, type: "interview", title: `İştirakçı imtina etdi: ${row.title}`, body: `${who} ${row.candidate} ilə ${bakuLocal(row.scheduled_at)} müsahibəsində iştirak edə bilmir${note ? `: ${note}` : ""}. Namizədə heç nə göndərilməyib. Vaxtı və ya iştirakçıları dəyişin.`, link: "hr-interviews" });
      await recordApplicationEvent(db, { applicationId: row.application_id, actorId: userId, actorRole: "company", type: "interview", to: `iştirakçı imtina etdi: ${who}` });
    } else if (state === "accepted") {
      await db.prepare("UPDATE interviews SET status='scheduled',updated=? WHERE id=?").bind(now, row.id).run();
      await inviteCandidate({ ...row, title: row.title });
      await notify(db, { userId: row.created_by, type: "interview", title: `Hamı təsdiqlədi: ${row.title}`, body: `${row.candidate} ilə ${bakuLocal(row.scheduled_at)} müsahibəsini bütün iştirakçılar təsdiqlədi. Dəvət namizədə göndərildi.`, link: "hr-interviews" });
      await recordApplicationEvent(db, { applicationId: row.application_id, actorId: userId, actorRole: "company", type: "interview", to: "iştirakçılar təsdiqlədi, namizədə göndərildi" });
    } else if (row.created_by !== userId) {
      await notify(db, { userId: row.created_by, type: "interview", title: `${who} təsdiqlədi: ${row.title}`, body: `${row.candidate} müsahibəsi: digər iştirakçıların cavabı gözlənilir.`, link: "hr-interviews" });
    }
    await companyAudit(db, id, userId, accept ? "interview-panel-accept" : "interview-panel-decline", row.application_id, bakuLocal(row.scheduled_at));
    return ok({ ok: true, state });
  }
  if (request.method === "GET" && path === "hr/interviews/compare") {
    const jobIds = await interviewScope();
    const rows = await db
      .prepare(
        `SELECT i.application_id,i.job_id,COALESCE(json_extract(j.data,'$.title'),'') AS job_title,COALESCE(c.name,'') AS candidate,
          COALESCE(a.status,'') AS application_status,i.scheduled_at,i.status,i.rating,i.feedback,i.decision
        FROM interviews i JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.candidate_id LEFT JOIN applications a ON a.id=i.application_id
        WHERE i.company_id=? AND i.job_id IN (SELECT value FROM json_each(?)) ORDER BY i.scheduled_at LIMIT 2000`,
      )
      .bind(id, JSON.stringify(jobIds))
      .all<FeedbackRow>();
    return ok({ jobs: compareInterviews(rows.results) });
  }
  if (request.method === "POST" && path === "hr/interviews/invite") {
    const b = await jsonBody(request);
    const jobIds = await interviewScope();
    const jobId = str(b.jobId, 100);
    if (!jobIds.includes(jobId)) throw new HttpError(404, "Vakansiya tapılmadı.");
    const job = await db.prepare("SELECT json_extract(data,'$.title') AS title FROM jobs WHERE id=? AND owner=?").bind(jobId, id).first<{ title: string }>();
    if (!job) throw new HttpError(404, "Vakansiya tapılmadı.");
    const appIds = (Array.isArray(b.applicationIds) ? b.applicationIds : []).map((x: unknown) => str(x, 100)).filter(Boolean);
    const candIds = (Array.isArray(b.candidateIds) ? b.candidateIds : []).map((x: unknown) => str(x, 100)).filter(Boolean);
    if (!appIds.length && !candIds.length) throw new HttpError(400, "Namizəd seçin.");
    if (appIds.length + candIds.length > 30) throw new HttpError(400, "Bir dəfəyə ən çoxu 30 namizəd dəvət etmək olar.");
    const timed = typeof b.scheduledAt === "string" && b.scheduledAt.trim() !== "";
    let input: InterviewInput | null = null;
    if (timed) {
      const parsed = sanitizeInterview(b);
      if ("error" in parsed) throw new HttpError(400, parsed.error);
      input = parsed;
    }
    const people = await pickParticipants(b.participants);
    const round = str(b.round, 80);
    const questions = sanitizeGuideQuestions(b.questions);
    const stageName = str(b.stage, 60);
    const company = await db.prepare("SELECT name FROM accounts WHERE id=?").bind(id).first<{ name: string }>();
    const results: { name: string; ok: boolean; reason?: string; applicationId?: string }[] = [];
    const targets: { appId: string; name: string }[] = [];
    for (const appId of appIds) {
      const row = await db.prepare("SELECT a.id,COALESCE(json_extract(a.data,'$.name'),'') AS name FROM applications a WHERE a.id=? AND a.job_id=?").bind(appId, jobId).first<{ id: string; name: string }>();
      if (row) targets.push({ appId: row.id, name: row.name });
    }
    for (const candId of candIds) {
      const prof = await db
        .prepare(
          `SELECT p.data FROM profiles p LEFT JOIN accounts a ON a.id=p.user_id WHERE p.user_id=? AND p.active='1' AND COALESCE(a.status,'active')='active' AND COALESCE(a.role,'candidate')='candidate'
          AND NOT EXISTS(SELECT 1 FROM relations r WHERE r.kind='block' AND ((r.actor_id=? AND r.target_id=p.user_id) OR (r.actor_id=p.user_id AND r.target_id=?)))`,
        )
        .bind(candId, id, id)
        .first<{ data: string }>();
      if (!prof) { results.push({ name: candId, ok: false, reason: "Profil tapılmadı və ya əlçatmazdır" }); continue; }
      const name = (JSON.parse(prof.data) as { name?: string }).name || "";
      const existing = await db.prepare("SELECT id FROM applications WHERE job_id=? AND candidate_id=?").bind(jobId, candId).first<{ id: string }>();
      if (existing) { targets.push({ appId: existing.id, name }); continue; }
      const newId = crypto.randomUUID();
      await db
        .prepare("INSERT INTO applications(id,job_id,candidate_id,data,status,created,auto,source,updated) VALUES(?,?,?,?,'Göndərildi',?,0,'company-invite',?)")
        .bind(newId, jobId, candId, prof.data, new Date().toISOString(), new Date().toISOString())
        .run();
      await recordApplicationEvent(db, { applicationId: newId, actorId: userId, actorRole: "company", type: "applied", to: "Göndərildi" });
      targets.push({ appId: newId, name });
    }
    // Several candidates of one vacancy get back-to-back times: two meetings of one vacancy may not overlap.
    const starts = input ? staggerStarts(Date.parse(input.scheduledAt), targets.length, input.durationMin) : [];
    let n = -1;
    for (const t of targets) {
      n += 1;
      const app = await db.prepare("SELECT id,status,candidate_id,job_id FROM applications WHERE id=?").bind(t.appId).first<{ id: string; status: string; candidate_id: string; job_id: string }>();
      if (!app) continue;
      if (["Uyğun deyil", "İşə qəbul edildi", WITHDRAWN_STATUS].includes(app.status)) { results.push({ name: t.name, ok: false, reason: "Bu müraciət üçün müsahibə təyin etmək olmaz" }); continue; }
      const active = await db.prepare("SELECT id FROM interviews WHERE application_id=? AND status IN ('scheduled','confirmed','pending_panel','panel_declined') AND scheduled_at>?").bind(app.id, new Date().toISOString()).first();
      if (active) { results.push({ name: t.name, ok: false, reason: "Aktiv müsahibəsi var" }); continue; }
      if (input) {
        const mine = targets.length > 1 ? { ...input, scheduledAt: new Date(starts[n]).toISOString(), slots: [] } : input;
        try {
          await scheduleFor({ ...app, title: job.title }, mine, { participants: people, round, candidateName: t.name, questions });
        } catch (e) {
          if (e instanceof HttpError && e.status === 409) { results.push({ name: t.name, ok: false, reason: e.message.replace(/^Vaxt üst-üstə düşür: /, "Vaxt üst-üstə düşür, ") }); continue; }
          throw e;
        }
      } else if (app.status !== "Müsahibə") {
        const now = new Date().toISOString();
        await db.prepare("UPDATE applications SET status='Müsahibə',updated=? WHERE id=?").bind(now, app.id).run();
        await recordApplicationEvent(db, { applicationId: app.id, actorId: userId, actorRole: "company", type: "status", from: app.status, to: "Müsahibə" });
        await notify(db, {
          userId: app.candidate_id,
          type: "interview",
          title: `Müsahibə dəvəti: ${job.title}`,
          body: `${company?.name || "Şirkət"} sizi "${job.title}" vakansiyası üzrə müsahibəyə dəvət edir. Müsahibənin vaxtı təyin ediləndə bildiriş alacaqsınız.`,
          link: "applications",
        });
      }
      if (stageName) await db.prepare("UPDATE applications SET stage=?,updated=? WHERE id=?").bind(stageName, new Date().toISOString(), app.id).run();
      results.push({ name: t.name, ok: true, applicationId: app.id });
    }
    await companyAudit(db, id, userId, "interview-invite", jobId, `${results.filter((r) => r.ok).length}/${results.length}`);
    return ok({ ok: true, invited: results.filter((r) => r.ok).length, results }, 201);
  }
  if (request.method === "POST" && path === "hr/interviews/create") {
    const b = await jsonBody(request);
    const input = sanitizeInterview(b);
    if ("error" in input) throw new HttpError(400, input.error);
    const jobIds = await interviewScope();
    const app = await db
      .prepare(
        `SELECT a.id,a.status,a.candidate_id,a.job_id,json_extract(j.data,'$.title') AS title FROM applications a JOIN jobs j ON j.id=a.job_id
        WHERE a.id=? AND j.owner=? AND j.id IN (SELECT value FROM json_each(?))`,
      )
      .bind(str(b.applicationId, 100), id, JSON.stringify(jobIds))
      .first<{
        id: string;
        status: string;
        candidate_id: string;
        job_id: string;
        title: string;
      }>();
    if (!app) throw new HttpError(404, "Müraciət tapılmadı.");
    if (
      ["Uyğun deyil", "İşə qəbul edildi", WITHDRAWN_STATUS].includes(app.status)
    )
      throw new HttpError(409, "Bu müraciət üçün müsahibə təyin etmək olmaz.");
    const people = await pickParticipants(b.participants);
    const candName = (await db.prepare("SELECT name FROM accounts WHERE id=?").bind(app.candidate_id).first<{ name: string }>())?.name || "";
    const interviewId = await scheduleFor(app, input, { participants: people, round: str(b.round, 80), candidateName: candName, questions: sanitizeGuideQuestions(b.questions) });
    return ok({ ok: true, id: interviewId, waitingForPanel: people.some((p) => p.userId !== userId) }, 201);
  }
  if (request.method === "POST" && path === "hr/interviews/update") {
    const b = await jsonBody(request);
    const jobIds = await interviewScope();
    const row = await db
      .prepare(
        `SELECT ${INTERVIEW_COLUMNS} FROM interviews i JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.candidate_id LEFT JOIN applications a ON a.id=i.application_id
        WHERE i.id=? AND i.company_id=? AND i.job_id IN (SELECT value FROM json_each(?))`,
      )
      .bind(str(b.id, 100), id, JSON.stringify(jobIds))
      .first<InterviewRow>();
    if (!row) throw new HttpError(404, "Müsahibə tapılmadı.");
    const action = str(b.action, 20);
    const now = new Date().toISOString();
    const isActive = ACTIVE_INTERVIEW.includes(row.status as never);
    if (action === "reschedule") {
      if (!isActive && row.status !== "declined")
        throw new HttpError(409, "Bu müsahibənin vaxtını dəyişmək olmaz.");
      const input = sanitizeInterview({
        kind: row.kind,
        location: row.location,
        durationMin: row.duration_min,
        note: row.note,
        panel: row.panel,
        ...b,
      });
      if ("error" in input) throw new HttpError(400, input.error);
      const existingPeople = (await db.prepare("SELECT user_id,name,role FROM interview_participants WHERE interview_id=?").bind(row.id).all<{ user_id: string; name: string; role: string }>()).results.map((p) => ({ userId: p.user_id, name: p.name, role: p.role }));
      const people = Array.isArray(b.participants) ? await pickParticipants(b.participants) : existingPeople;
      await failOnConflicts({ scheduledAt: input.scheduledAt, durationMin: input.durationMin, jobId: row.job_id, candidateId: row.candidate_id, userIds: people.map((p) => p.userId), ignoreId: row.id });
      const round = typeof b.round === "string" ? str(b.round, 80) : row.round;
      const panelText = people.length ? people.map((p) => p.name).join(", ") : input.panel;
      const waitForPanel = people.some((p) => p.userId !== userId);
      await db
        .prepare(
          "UPDATE interviews SET scheduled_at=?,duration_min=?,kind=?,location=?,note=?,panel=?,slots=?,round=?,questions=?,status=?,candidate_note='',reminded_at='',updated=? WHERE id=?",
        )
        .bind(
          input.scheduledAt,
          input.durationMin,
          input.kind,
          input.location,
          input.note,
          panelText,
          JSON.stringify(input.slots),
          round,
          Array.isArray(b.questions) || typeof b.questions === "string" ? JSON.stringify(sanitizeGuideQuestions(b.questions)) : row.questions || "[]",
          waitForPanel ? "pending_panel" : "scheduled",
          now,
          row.id,
        )
        .run();
      if (people.length) await askParticipants(row.id, people, { title: row.job_title, candidate: row.candidate, scheduledAt: input.scheduledAt, durationMin: input.durationMin, round, kindText: interviewKindText(input) });
      else await db.prepare("DELETE FROM interview_participants WHERE interview_id=?").bind(row.id).run();
      if (waitForPanel) {
        // The candidate keeps no stale time: they hear again once the colleagues agree to the new one.
        if (row.status === "scheduled" || row.status === "confirmed" || row.status === "declined")
          await notify(db, { userId: row.candidate_id, type: "interview", title: `Müsahibə vaxtı dəyişir: ${row.job_title}`, body: "Müsahibənin vaxtı dəyişdirilir. Yeni vaxt təsdiqlənən kimi sizə bildiriş göndəriləcək.", link: "applications" });
      } else {
        await inviteCandidate({ id: row.id, application_id: row.application_id, candidate_id: row.candidate_id, scheduled_at: input.scheduledAt, duration_min: input.durationMin, kind: input.kind, location: input.location, panel: panelText, slots: JSON.stringify(input.slots), title: row.job_title });
      }
      await recordApplicationEvent(db, {
        applicationId: row.application_id,
        actorId: userId,
        actorRole: "company",
        type: "interview",
        to: `vaxt dəyişdi: ${bakuLocal(input.scheduledAt)}`,
      });
    } else if (action === "cancel") {
      if (!isActive) throw new HttpError(409, "Bu müsahibə artıq aktiv deyil.");
      await db
        .prepare(
          "UPDATE interviews SET status='cancelled',updated=? WHERE id=?",
        )
        .bind(now, row.id)
        .run();
      for (const p of (await db.prepare("SELECT user_id FROM interview_participants WHERE interview_id=?").bind(row.id).all<{ user_id: string }>()).results)
        if (p.user_id !== userId) await notify(db, { userId: p.user_id, type: "interview", title: `Müsahibə ləğv edildi: ${row.job_title}`, body: `${row.candidate || "Namizəd"} ilə ${bakuLocal(row.scheduled_at)} müsahibəsi ləğv edildi.`, link: "hr-interviews" });
      if (row.status !== "pending_panel" && row.status !== "panel_declined")
      await notify(db, {
        userId: row.candidate_id,
        type: "interview",
        title: `Müsahibə ləğv edildi: ${row.job_title}`,
        body: str(b.reason, 300),
        link: "applications",
      });
      if (row.status !== "pending_panel" && row.status !== "panel_declined")
      await sendUserEmail(
        db,
        row.candidate_id,
        `Müsahibə ləğv edildi: ${row.job_title}`,
        str(b.reason, 300) || "Müsahibə ləğv edildi.",
        "interview",
      );
      await recordApplicationEvent(db, {
        applicationId: row.application_id,
        actorId: userId,
        actorRole: "company",
        type: "interview",
        to: "ləğv edildi",
      });
      await syncApplicationStatus(row.application_id, "interview-cancelled", userId, "company");
    } else if (action === "complete" || action === "no_show") {
      // An interview closed by itself can still be marked «did not come» until its opinion is written.
      const reopened = action === "no_show" && row.status === "completed" && !(row as { rating?: number | null }).rating;
      if ((!isActive && !reopened) || row.status === "pending_panel" || row.status === "panel_declined") throw new HttpError(409, "İştirakçıların təsdiqi tamamlanmayıb və ya müsahibə aktiv deyil.");
      if (Date.parse(row.scheduled_at) > Date.now() + 15 * 60000)
        throw new HttpError(409, "Müsahibə vaxtı hələ çatmayıb.");
      await db
        .prepare("UPDATE interviews SET status=?,updated=? WHERE id=?")
        .bind(action === "complete" ? "completed" : "no_show", now, row.id)
        .run();
      await recordApplicationEvent(db, {
        applicationId: row.application_id,
        actorId: userId,
        actorRole: "company",
        type: "interview",
        to: action === "complete" ? "keçirildi" : "namizəd gəlmədi",
      });
      if (action === "no_show") await syncApplicationStatus(row.application_id, "interview-no-show", userId, "company");
      // A held interview waits for the opinion: the owner and the person who set it up are reminded.
      if (action === "complete") {
        const who = new Set([id, row.created_by].filter((x): x is string => !!x));
        for (const target of who)
          await notify(db, { userId: target, type: "interview", title: `Müsahibə keçirildi: rəy yazın`, body: `${row.candidate || "Namizəd"} · ${row.job_title}. Qiymət və qərar yazılana qədər müraciət “Müsahibə” mərhələsində qalır.`, link: "hr-interviews" }).catch((error) => quiet("route-best-effort", error));
      }
    } else throw new HttpError(400, "Əməliyyat yanlışdır.");
    await companyAudit(
      db,
      id,
      userId,
      `interview-${action}`,
      row.application_id,
      bakuLocal(row.scheduled_at),
    );
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "hr/interviews/feedback") {
    const b = await jsonBody(request);
    const jobIds = await interviewScope();
    const row = await db
      .prepare(
        "SELECT i.id,i.status,i.scheduled_at,i.application_id FROM interviews i WHERE i.id=? AND i.company_id=? AND i.job_id IN (SELECT value FROM json_each(?))",
      )
      .bind(str(b.id, 100), id, JSON.stringify(jobIds))
      .first<{
        id: string;
        status: string;
        scheduled_at: string;
        application_id: string;
      }>();
    if (!row) throw new HttpError(404, "Müsahibə tapılmadı.");
    if (row.status !== "completed")
      throw new HttpError(
        409,
        "Rəy yalnız keçirilmiş müsahibə üçün yazılır. Əvvəl müsahibəni “keçirildi” kimi qeyd edin.",
      );
    const fb = sanitizeFeedback(b);
    if ("error" in fb) throw new HttpError(400, fb.error);
    await db
      .prepare(
        "UPDATE interviews SET rating=?,feedback=?,decision=?,updated=? WHERE id=?",
      )
      .bind(
        fb.rating,
        fb.feedback,
        fb.decision,
        new Date().toISOString(),
        row.id,
      )
      .run();
    await recordApplicationEvent(db, {
      applicationId: row.application_id,
      actorId: userId,
      actorRole: "company",
      type: "interview",
      to: `rəy: ${fb.rating}/5`,
    });
    if (fb.decision === "reject") await syncApplicationStatus(row.application_id, "feedback-reject", userId, "company");
    // «Advance»: the next step is the offer; the owner and the one who set the interview up are told to prepare it.
    if (fb.decision === "advance") {
      await recordApplicationEvent(db, { applicationId: row.application_id, actorId: userId, actorRole: "company", type: "interview", to: "irəli çəkildi (təklif mərhələsi)" });
      const creator = (await db.prepare("SELECT created_by FROM interviews WHERE id=?").bind(row.id).first<{ created_by: string }>().catch(() => null))?.created_by;
      for (const target of new Set([id, creator].filter((x): x is string => !!x)))
        await notify(db, { userId: target, type: "interview", title: "Namizəd irəli çəkildi: təklif hazırlayın", body: "Müsahibənin nəticəsi müsbətdir. Namizədə iş təklifi göndərin (Müraciət edənlər → ⋮ → İş təklifi et).", link: "hr-candidates" }).catch((error) => quiet("route-best-effort", error));
    }
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "hr/interviews/ics") {
    const jobIds = await interviewScope();
    const row = await db
      .prepare(
        `SELECT ${INTERVIEW_COLUMNS} FROM interviews i JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.candidate_id LEFT JOIN applications a ON a.id=i.application_id
        WHERE i.id=? AND i.company_id=? AND i.job_id IN (SELECT value FROM json_each(?))`,
      )
      .bind(
        str(requestUrl.searchParams.get("id"), 100),
        id,
        JSON.stringify(jobIds),
      )
      .first<InterviewRow>();
    if (!row) throw new HttpError(404, "Müsahibə tapılmadı.");
    const body = icsFor({
      id: row.id,
      scheduledAt: row.scheduled_at,
      durationMin: row.duration_min,
      title: `Müsahibə: ${row.candidate} (${row.job_title})`,
      location: row.location,
      description: [
        row.note,
        row.panel ? `Müsahibə aparanlar: ${row.panel}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="musahibe.ics"',
        "Cache-Control": "private, no-store",
      },
    });
  }
  return undefined;
}
