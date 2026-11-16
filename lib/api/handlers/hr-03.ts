// hr: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { type Question, combinedScore, parseSnapshot, sanitizeGrades, textQuestions } from "@/lib/assessments";
import { applyTestOutcome, closeExpiredAssignments, notify, recordApplicationEvent } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_hr_03(c: Pick<RouteCtx, "assignTest" | "db" | "id" | "path" | "request" | "requestUrl" | "requirePermission" | "testsDenied" | "userId">): Promise<Response | undefined> {
  const { assignTest, db, id, path, request, requestUrl, requirePermission, testsDenied, userId } = c;
  if (request.method === "POST" && path === "hr/assessments/assign") {
    requirePermission("tests", testsDenied);
    const b = await jsonBody(request);
    const assessment = await db
      .prepare(
        "SELECT id,title,instructions,duration_min,passing_score,show_result,on_pass,on_fail,questions FROM assessments WHERE id=? AND company_id=?",
      )
      .bind(str(b.assessmentId, 100), id)
      .first<{
        id: string;
        title: string;
        instructions: string;
        duration_min: number;
        passing_score: number;
        show_result: number;
        on_pass: string;
        on_fail: string;
        questions: string;
      }>();
    const application = await db
      .prepare(
        "SELECT a.id,a.candidate_id,a.status FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND j.owner=?",
      )
      .bind(str(b.applicationId, 100), id)
      .first<{ id: string; candidate_id: string; status: string }>();
    if (!assessment || !application)
      throw new HttpError(404, "Test və ya müraciət tapılmadı.");
    const problem = await assignTest(assessment, application);
    if (problem)
      throw new HttpError(
        409,
        problem === "test artıq göndərilib"
          ? "Bu test artıq namizədə göndərilib."
          : "Bu müraciət bağlanıb.",
      );
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "hr/assessments/grade") {
    requirePermission("tests", testsDenied);
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        `SELECT s.id,s.status,s.answers,s.snapshot,s.manual_scores,s.assessment_id,s.application_id,t.questions,t.title FROM assessment_assignments s
        JOIN assessments t ON t.id=s.assessment_id WHERE s.id=? AND s.company_id=?`,
      )
      .bind(str(b.assignmentId, 100), id)
      .first<{
        id: string;
        status: string;
        answers: string;
        snapshot: string;
        manual_scores: string;
        assessment_id: string;
        application_id: string;
        questions: string;
        title: string;
      }>();
    if (!row) throw new HttpError(404, "Test nəticəsi tapılmadı.");
    if (!["submitted", "expired"].includes(row.status))
      throw new HttpError(
        409,
        "Qiymətləndirmə yalnız təhvil verilmiş və ya vaxtı bitmiş test üçündür.",
      );
    const questions =
      parseSnapshot(row.snapshot)?.questions ||
      (JSON.parse(row.questions) as Question[]);
    if (!textQuestions(questions).length)
      throw new HttpError(400, "Bu testdə açıq sual yoxdur.");
    const manual = {
      ...(JSON.parse(row.manual_scores || "{}") as Record<string, number>),
      ...sanitizeGrades(questions, b.grades),
    };
    const result = combinedScore(
      questions,
      JSON.parse(row.answers || "{}"),
      manual,
    );
    const now = new Date().toISOString();
    await db.batch([
      db
        .prepare(
          "UPDATE assessment_assignments SET manual_scores=?,score=?,max_score=?,review_status=?,reviewed_by=?,reviewed_at=? WHERE id=?",
        )
        .bind(
          JSON.stringify(manual),
          result.score,
          result.max,
          result.state,
          userId,
          now,
          row.id,
        ),
      db
        .prepare(
          "INSERT INTO assessment_revisions(id,assessment_id,actor_id,action,reason,summary,created) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          row.assessment_id,
          userId,
          "graded",
          str(b.note, 500),
          `Açıq suallar: ${result.state === "done" ? `yekun bal ${result.score}/${result.max}` : "qismən yoxlanıb"}`,
          now,
        ),
    ]);
    await recordApplicationEvent(db, {
      applicationId: row.application_id,
      actorId: id,
      actorRole: "company",
      type: "test",
      to: `${row.title}: qiymətləndirildi`,
    });
    await applyTestOutcome(db, row.id);
    return ok({
      ok: true,
      score: result.score,
      max: result.max,
      reviewStatus: result.state,
    });
  }
  if (request.method === "POST" && path === "hr/assessments/extend") {
    requirePermission("tests", testsDenied);
    const b = await jsonBody(request);
    const minutes = Math.max(
      5,
      Math.min(120, Math.round(Number(b.minutes) || 0)),
    );
    await closeExpiredAssignments(db, { companyId: id });
    const row = await db
      .prepare(
        "SELECT id,status,deadline_at,assessment_id,candidate_id FROM assessment_assignments WHERE id=? AND company_id=?",
      )
      .bind(str(b.assignmentId, 100), id)
      .first<{
        id: string;
        status: string;
        deadline_at: string;
        assessment_id: string;
        candidate_id: string;
      }>();
    if (!row) throw new HttpError(404, "Test nəticəsi tapılmadı.");
    if (!["started", "expired"].includes(row.status))
      throw new HttpError(
        409,
        "Vaxt yalnız davam edən və ya vaxtı bitmiş test üçün uzadılır.",
      );
    const now = new Date();
    const deadline = new Date(
      (row.status === "started" ? Date.parse(row.deadline_at) : now.getTime()) +
        minutes * 60000,
    ).toISOString();
    await db.batch([
      db
        .prepare(
          "UPDATE assessment_assignments SET status='started',deadline_at=?,submitted_at='',review_status='' WHERE id=?",
        )
        .bind(deadline, row.id),
      db
        .prepare(
          "INSERT INTO assessment_revisions(id,assessment_id,actor_id,action,reason,summary,created) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          row.assessment_id,
          userId,
          "extended",
          str(b.reason, 500),
          `+${minutes} dəq${row.status === "expired" ? " (yenidən açıldı)" : ""}`,
          now.toISOString(),
        ),
    ]);
    await notify(db, {
      userId: row.candidate_id,
      type: "test",
      title: "Testə əlavə vaxt verildi",
      body: `${minutes} dəqiqə əlavə edildi. Testə davam edə bilərsiniz.`,
      link: "applications",
    });
    return ok({ ok: true, deadline });
  }
  if (request.method === "POST" && path === "hr/assessments/cancel") {
    requirePermission("tests", testsDenied);
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        "SELECT id,status,assessment_id,candidate_id FROM assessment_assignments WHERE id=? AND company_id=?",
      )
      .bind(str(b.assignmentId, 100), id)
      .first<{
        id: string;
        status: string;
        assessment_id: string;
        candidate_id: string;
      }>();
    if (!row) throw new HttpError(404, "Test nəticəsi tapılmadı.");
    if (!["assigned", "started"].includes(row.status))
      throw new HttpError(
        409,
        "Yalnız göndərilmiş və ya davam edən test ləğv edilə bilər.",
      );
    await db.batch([
      db
        .prepare(
          "UPDATE assessment_assignments SET status='cancelled' WHERE id=?",
        )
        .bind(row.id),
      db
        .prepare(
          "INSERT INTO assessment_revisions(id,assessment_id,actor_id,action,reason,summary,created) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          row.assessment_id,
          userId,
          "cancelled",
          str(b.reason, 500),
          "Namizədə göndərilmiş test ləğv edildi",
          new Date().toISOString(),
        ),
    ]);
    await notify(db, {
      userId: row.candidate_id,
      type: "test",
      title: "Test ləğv edildi",
      link: "applications",
    });
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "hr/assessment-file") {
    requirePermission("tests", testsDenied);
    const assessmentId = str(requestUrl.searchParams.get("id"), 100);
    const row = await db
      .prepare(
        "SELECT attachment_name,attachment_type,attachment_data FROM assessments WHERE id=? AND company_id=?",
      )
      .bind(assessmentId, id)
      .first<{
        attachment_name: string;
        attachment_type: string;
        attachment_data: string;
      }>();
    if (!row?.attachment_data) throw new HttpError(404, "Fayl tapılmadı.");
    // Who opened the confidential file, and when, stays in the test's history.
    await db
      .prepare(
        "INSERT INTO assessment_revisions(id,assessment_id,actor_id,action,reason,summary,created) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        assessmentId,
        userId,
        "file-viewed",
        "",
        row.attachment_name,
        new Date().toISOString(),
      )
      .run();
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
  return undefined;
}
