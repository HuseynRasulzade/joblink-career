// interviews: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { ACTIVE_INTERVIEW, bakuLocal, icsFor } from "@/lib/interviews";
import { HttpError, jsonBody, runtime, str } from "@/lib/server";
import { PLANS } from "@/lib/plans";
import { type Question, cleanAnswers, combinedScore, isExpired, parseSnapshot, percentOf, publicQuestions, resultState, shuffleQuestions } from "@/lib/assessments";
import { applyTestOutcome, closeExpiredAssignments, notify, recordApplicationEvent } from "@/lib/api-core";
import { monthPeriodKey, monthStartNext, tokensLeft, windowKey, windowResetAt } from "@/lib/ai-tokens";
import { paymentsOpen } from "@/lib/payments";
import { quota, syncSubscription, usedToday } from "@/lib/plan-service";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_interviews_01(c: Pick<RouteCtx, "billingEnforced" | "db" | "id" | "path" | "paymentProvider" | "request" | "requestUrl" | "syncApplicationStatus">): Promise<Response | undefined> {
  const { billingEnforced, db, id, path, paymentProvider, request, requestUrl, syncApplicationStatus } = c;
  if (request.method === "POST" && path === "interviews/respond") {
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        `SELECT i.id,i.status,i.scheduled_at,i.slots,i.company_id,i.created_by,i.application_id,COALESCE(json_extract(j.data,'$.title'),'') AS job_title FROM interviews i JOIN jobs j ON j.id=i.job_id
        WHERE i.id=? AND i.candidate_id=?`,
      )
      .bind(str(b.id, 100), id)
      .first<{
        id: string;
        status: string;
        scheduled_at: string;
        slots: string;
        company_id: string;
        created_by: string;
        application_id: string;
        job_title: string;
      }>();
    if (!row || row.status === "pending_panel" || row.status === "panel_declined") throw new HttpError(404, "Müsahibə tapılmadı.");
    let offered: string[] = [];
    try {
      offered = JSON.parse(row.slots || "[]") as string[];
    } catch {
      offered = [];
    }
    const lastTime = offered.length
      ? offered[offered.length - 1]
      : row.scheduled_at;
    if (
      !ACTIVE_INTERVIEW.includes(row.status as never) ||
      Date.parse(lastTime) < Date.now()
    )
      throw new HttpError(409, "Bu müsahibəyə artıq cavab vermək olmaz.");
    const action = str(b.action, 10);
    if (action !== "confirm" && action !== "decline")
      throw new HttpError(400, "Cavab yanlışdır.");
    const note = str(b.note, 300);
    // With several offered times the candidate must pick one of them; the pick becomes the interview time.
    if (action === "confirm" && offered.length) {
      const picked =
        typeof b.slot === "string" ? new Date(b.slot).toISOString() : "";
      if (!offered.includes(picked))
        throw new HttpError(400, "Təklif olunan vaxtlardan birini seçin.");
      if (Date.parse(picked) < Date.now())
        throw new HttpError(409, "Bu vaxt keçib. Şirkətdən yeni vaxt istəyin.");
      row.scheduled_at = picked;
    }
    await db
      .prepare(
        "UPDATE interviews SET status=?,candidate_note=?,scheduled_at=?,slots=?,updated=? WHERE id=?",
      )
      .bind(
        action === "confirm" ? "confirmed" : "declined",
        note,
        row.scheduled_at,
        action === "confirm" ? "[]" : row.slots,
        new Date().toISOString(),
        row.id,
      )
      .run();
    const title =
      action === "confirm"
        ? `Namizəd müsahibəni təsdiqlədi: ${row.job_title}`
        : `Namizəd müsahibədən imtina etdi: ${row.job_title}`;
    const body = `${bakuLocal(row.scheduled_at)}${note ? ` · ${note}` : ""}`;
    await notify(db, {
      userId: row.company_id,
      type: "interview",
      title,
      body,
      link: "hr-interviews",
      email: true,
    });
    if (row.created_by && row.created_by !== row.company_id)
      await notify(db, {
        userId: row.created_by,
        type: "interview",
        title,
        body,
        link: "hr-interviews",
        email: true,
      });
    await recordApplicationEvent(db, {
      applicationId: row.application_id,
      actorId: id,
      actorRole: "candidate",
      type: "interview",
      to: action === "confirm" ? "namizəd təsdiqlədi" : "namizəd imtina etdi",
    });
    if (action !== "confirm") await syncApplicationStatus(row.application_id, "interview-declined", id, "candidate");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "interviews/ics") {
    const row = await db
      .prepare(
        `SELECT i.id,i.scheduled_at,i.duration_min,i.location,i.note,COALESCE(json_extract(j.data,'$.title'),'') AS job_title,COALESCE(c.name,'') AS company
        FROM interviews i JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.company_id WHERE i.id=? AND i.candidate_id=?`,
      )
      .bind(str(requestUrl.searchParams.get("id"), 100), id)
      .first<{
        id: string;
        scheduled_at: string;
        duration_min: number;
        location: string;
        note: string;
        job_title: string;
        company: string;
      }>();
    if (!row) throw new HttpError(404, "Müsahibə tapılmadı.");
    const body = icsFor({
      id: row.id,
      scheduledAt: row.scheduled_at,
      durationMin: row.duration_min,
      title: `Müsahibə: ${row.company} (${row.job_title})`,
      location: row.location,
      description: row.note,
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="musahibe.ics"',
        "Cache-Control": "private, no-store",
      },
    });
  }
  if (request.method === "GET" && path === "exams") {
    await closeExpiredAssignments(db, { candidateId: id });
    const rows = await db
      .prepare(
        `SELECT s.id,s.application_id,s.status,s.assigned_at,s.started_at,s.deadline_at,s.submitted_at,s.score,s.max_score,s.review_status,s.snapshot,
          t.title,t.duration_min,t.instructions,COALESCE(c.name,'') AS company
        FROM assessment_assignments s JOIN assessments t ON t.id=s.assessment_id LEFT JOIN accounts c ON c.id=s.company_id
        WHERE s.candidate_id=? AND s.status<>'cancelled' ORDER BY s.assigned_at DESC`,
      )
      .bind(id)
      .all<Record<string, unknown> & { snapshot: string }>();
    return ok({
      exams: rows.results.map(({ snapshot, ...row }) => {
        const copy = parseSnapshot(snapshot);
        const { score, max_score, review_status, ...rest } = row as Record<
          string,
          unknown
        > & {
          score: number;
          max_score: number;
          review_status: string;
          status: string;
        };
        // The result is shown only when the employer allowed it and every answer is graded.
        const percent = percentOf(score, max_score);
        const result =
          copy?.showResult &&
          ["submitted", "expired"].includes(rest.status) &&
          review_status !== "pending" &&
          percent !== null
            ? {
                score,
                max: max_score,
                percent,
                passed: percent >= copy.passingScore,
              }
            : null;
        return {
          ...rest,
          result,
          ...(copy
            ? {
                title: copy.title,
                instructions: copy.instructions,
                duration_min: copy.durationMin,
              }
            : {}),
        };
      }),
    });
  }
  if (request.method === "POST" && path === "exams/start") {
    const b = await jsonBody(request);
    await closeExpiredAssignments(db, {
      candidateId: id,
      assignmentId: str(b.id, 100),
    });
    const row = await db
      .prepare(
        `SELECT s.id,s.status,s.started_at,s.deadline_at,s.answers,s.snapshot,t.title,t.instructions,t.duration_min,t.questions,
          CASE WHEN t.attachment_data<>'' THEN 1 ELSE 0 END AS has_attachment, t.attachment_type
        FROM assessment_assignments s JOIN assessments t ON t.id=s.assessment_id WHERE s.id=? AND s.candidate_id=?`,
      )
      .bind(str(b.id, 100), id)
      .first<{
        id: string;
        status: string;
        started_at: string;
        deadline_at: string;
        answers: string;
        snapshot: string;
        title: string;
        instructions: string;
        duration_min: number;
        questions: string;
        has_attachment: number;
        attachment_type: string;
      }>();
    if (!row || row.status === "cancelled")
      throw new HttpError(404, "Test tapılmadı.");
    if (row.status === "submitted")
      throw new HttpError(409, "Bu test artıq təhvil verilib.");
    if (row.status === "expired")
      throw new HttpError(409, "Testin vaxtı bitib.");
    // The employer's copy taken at send time is what the candidate sees.
    const copy = parseSnapshot(row.snapshot);
    const title = copy?.title ?? row.title;
    const instructions = copy?.instructions ?? row.instructions;
    const durationMin = copy?.durationMin ?? row.duration_min;
    const questions =
      copy?.questions ?? (JSON.parse(row.questions) as Question[]);
    let deadline = row.deadline_at;
    if (row.status === "assigned") {
      // The timer runs on the server from the first start.
      const now = new Date();
      deadline = new Date(now.getTime() + durationMin * 60000).toISOString();
      await db
        .prepare(
          "UPDATE assessment_assignments SET status='started',started_at=?,deadline_at=? WHERE id=?",
        )
        .bind(now.toISOString(), deadline, row.id)
        .run();
    } else if (isExpired(deadline)) {
      throw new HttpError(409, "Testin vaxtı bitib.");
    }
    let saved: unknown = {};
    try {
      saved = JSON.parse(row.answers);
    } catch {
      saved = {};
    }
    return ok({
      title,
      instructions,
      deadline,
      serverNow: new Date().toISOString(),
      questions: shuffleQuestions(publicQuestions(questions), row.id),
      saved: row.status === "started" ? saved : {},
      hasAttachment: row.has_attachment === 1,
      attachmentType: row.attachment_type,
    });
  }
  if (request.method === "POST" && path === "exams/save") {
    // Autosave: keeps the answers so a crash or a closed tab does not lose them.
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        `SELECT s.id,s.status,s.deadline_at,s.snapshot,t.questions FROM assessment_assignments s
        JOIN assessments t ON t.id=s.assessment_id WHERE s.id=? AND s.candidate_id=?`,
      )
      .bind(str(b.id, 100), id)
      .first<{
        id: string;
        status: string;
        deadline_at: string;
        snapshot: string;
        questions: string;
      }>();
    if (!row || row.status !== "started")
      throw new HttpError(409, "Test başlamayıb və ya artıq bağlanıb.");
    if (isExpired(row.deadline_at))
      throw new HttpError(409, "Testin vaxtı bitib.");
    const questions =
      parseSnapshot(row.snapshot)?.questions ??
      (JSON.parse(row.questions) as Question[]);
    await db
      .prepare(
        "UPDATE assessment_assignments SET answers=?,autosaved_at=? WHERE id=?",
      )
      .bind(
        JSON.stringify(cleanAnswers(questions, b.answers)),
        new Date().toISOString(),
        row.id,
      )
      .run();
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "exams/file") {
    const row = await db
      .prepare(
        `SELECT s.status,s.deadline_at,t.attachment_type,t.attachment_data FROM assessment_assignments s
        JOIN assessments t ON t.id=s.assessment_id WHERE s.id=? AND s.candidate_id=?`,
      )
      .bind(str(requestUrl.searchParams.get("id"), 100), id)
      .first<{
        status: string;
        deadline_at: string;
        attachment_type: string;
        attachment_data: string;
      }>();
    // The document is available only during the candidate's own test session.
    if (
      !row?.attachment_data ||
      row.status !== "started" ||
      isExpired(row.deadline_at)
    )
      throw new HttpError(403, "Fayl yalnız test zamanı açıqdır.");
    return new Response(
      Uint8Array.from(atob(row.attachment_data), (c) => c.charCodeAt(0)),
      {
        headers: {
          "Content-Type": row.attachment_type,
          "Content-Disposition": "inline",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  if (request.method === "POST" && path === "exams/violation") {
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        "SELECT violations,status FROM assessment_assignments WHERE id=? AND candidate_id=?",
      )
      .bind(str(b.id, 100), id)
      .first<{ violations: string; status: string }>();
    if (!row || row.status !== "started") return ok({ ok: true });
    const list = JSON.parse(row.violations) as { type: string; at: string }[];
    if (list.length < 300)
      list.push({ type: str(b.type, 40), at: new Date().toISOString() });
    await db
      .prepare("UPDATE assessment_assignments SET violations=? WHERE id=?")
      .bind(JSON.stringify(list), str(b.id, 100))
      .run();
    return ok({ ok: true, count: list.length });
  }
  if (request.method === "POST" && path === "exams/submit") {
    const b = await jsonBody(request);
    await closeExpiredAssignments(db, {
      candidateId: id,
      assignmentId: str(b.id, 100),
    });
    const row = await db
      .prepare(
        `SELECT s.id,s.status,s.deadline_at,s.company_id,s.application_id,s.snapshot,t.questions,t.title FROM assessment_assignments s
        JOIN assessments t ON t.id=s.assessment_id WHERE s.id=? AND s.candidate_id=?`,
      )
      .bind(str(b.id, 100), id)
      .first<{
        id: string;
        status: string;
        deadline_at: string;
        company_id: string;
        application_id: string;
        snapshot: string;
        questions: string;
        title: string;
      }>();
    if (row?.status === "expired")
      throw new HttpError(
        409,
        "Testin vaxtı bitib. Son yadda saxlanmış cavablarınız qəbul edildi.",
      );
    if (!row || row.status !== "started")
      throw new HttpError(409, "Test başlamayıb və ya artıq təhvil verilib.");
    // Past the deadline (plus the grace period) the final answers are refused.
    if (isExpired(row.deadline_at))
      throw new HttpError(409, "Testin vaxtı bitib.");
    const copy = parseSnapshot(row.snapshot);
    const questions =
      copy?.questions ?? (JSON.parse(row.questions) as Question[]);
    const clean = cleanAnswers(questions, b.answers);
    const { score, max, state } = combinedScore(questions, clean, {});
    const now = new Date().toISOString();
    await db
      .prepare(
        "UPDATE assessment_assignments SET status='submitted',submitted_at=?,answers=?,score=?,max_score=?,review_status=?,late=0 WHERE id=? AND status='started'",
      )
      .bind(now, JSON.stringify(clean), score, max, state, row.id)
      .run();
    const title = copy?.title ?? row.title;
    await recordApplicationEvent(db, {
      applicationId: row.application_id,
      actorId: id,
      actorRole: "candidate",
      type: "test",
      to: `${title}: təhvil verildi`,
    });
    await applyTestOutcome(db, row.id);
    await notify(db, {
      userId: row.company_id,
      type: "test",
      title: `Test təhvil verildi: ${title}`,
      body: max
        ? `Avtomatik bal: ${score}/${max}${state === "pending" ? " (açıq suallar yoxlanmalıdır)" : resultState({ status: "submitted", score, max_score: max, review_status: state, passingScore: copy?.passingScore ?? 0 }) === "passed" ? " — keçid balını topladı" : " — keçid balına çatmadı"}`
        : "",
      link: "hr-tests",
    });
    return ok({ ok: true, late: false });
  }
  if (request.method === "GET" && path === "plan/me") {
    const sub = await syncSubscription(db, id, paymentProvider);
    const q = async (feature: "cv-analysis" | "cv-fix" | "auto-apply") => ({
      used: await usedToday(db, id, feature),
    });
    const plan = (await quota(db, id, "cv-analysis", true, paymentProvider))
      .plan!;
    const methods = await db
      .prepare(
        "SELECT id,brand,last4,exp_month,exp_year,is_default FROM payment_methods WHERE account_id=? ORDER BY is_default DESC,created DESC",
      )
      .bind(id)
      .all<{
        id: string;
        brand: string;
        last4: string;
        exp_month: number;
        exp_year: number;
        is_default: number;
      }>();
    const payments = await db
      .prepare(
        "SELECT plan_id,amount_cents,status,method_label,period_start,period_end,error,created FROM plan_payments WHERE account_id=? ORDER BY created DESC LIMIT 30",
      )
      .bind(id)
      .all();
    const contracts = await db
      .prepare(
        "SELECT id,number,title,created FROM contracts WHERE account_id=? ORDER BY created DESC LIMIT 20",
      )
      .bind(id)
      .all();
    // The AI allowance: tokens left in this 5-hour balance and in the month.
    const nowAt = new Date();
    const tokenRows = await db
      .prepare("SELECT period,tokens FROM ai_token_usage WHERE user_id=? AND period IN (?,?)")
      .bind(id, windowKey(nowAt), monthPeriodKey(nowAt))
      .all<{ period: string; tokens: number }>()
      .catch(() => ({ results: [] as { period: string; tokens: number }[] }));
    const tokensUsed = {
      window: tokenRows.results.find((r) => r.period === windowKey(nowAt))?.tokens || 0,
      month: tokenRows.results.find((r) => r.period === monthPeriodKey(nowAt))?.tokens || 0,
    };
    const tokenLimits = { window: plan.limits.aiTokensWindow, month: plan.limits.aiTokensMonth };
    return ok({
      paymentsOpen: paymentsOpen(runtime().PAYMENT_PROVIDER),
      aiTokens: {
        ...tokensLeft(tokenLimits, tokensUsed),
        windowTotal: tokenLimits.window,
        monthTotal: tokenLimits.month,
        windowResetAt: windowResetAt(nowAt),
        monthResetAt: monthStartNext(nowAt),
      },
      enforced: billingEnforced,
      provider: paymentProvider?.name || "",
      plans: PLANS,
      plan: plan.id,
      subscription:
        sub &&
        sub.status !== "expired" &&
        Date.parse(sub.periodEnd) > Date.now()
          ? {
              planId: sub.planId,
              status: sub.status,
              periodStart: sub.periodStart,
              periodEnd: sub.periodEnd,
              autoRenew: sub.autoRenew,
              methodId: sub.methodId,
            }
          : null,
      usage: {
        cvAnalyses: {
          ...(await q("cv-analysis")),
          limit: plan.limits.cvAnalysesPerDay,
        },
        cvFixes: { ...(await q("cv-fix")), limit: plan.limits.cvFixesPerDay },
        aiApply: {
          ...(await q("auto-apply")),
          limit: plan.limits.aiApplyPerDay,
        },
      },
      methods: methods.results.map((m) => ({
        id: m.id,
        brand: m.brand,
        last4: m.last4,
        expMonth: m.exp_month,
        expYear: m.exp_year,
        isDefault: m.is_default === 1,
      })),
      payments: payments.results,
      contracts: contracts.results,
    });
  }
  return undefined;
}
