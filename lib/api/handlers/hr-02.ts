// hr: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { sanitizeQuestions } from "@/lib/assessments";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_hr_02(c: Pick<RouteCtx, "db" | "id" | "path" | "request" | "requirePermission" | "testsDenied" | "userId">): Promise<Response | undefined> {
  const { db, id, path, request, requirePermission, testsDenied, userId } = c;
  if (request.method === "POST" && path === "hr/assessments/save") {
    requirePermission("tests", testsDenied);
    // Larger body than usual: the test may carry a document (up to ~1 MB).
    const raw = await request.text();
    if (raw.length > 1_600_000)
      throw new HttpError(413, "Fayl çox böyükdür (maksimum 1 MB).");
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Məlumat oxunmadı.");
    }
    const title = str(b.title, 160);
    const questions = sanitizeQuestions(b.questions);
    const attachment = b.attachment as
      { name?: unknown; type?: unknown; data?: unknown } | undefined;
    const attachmentType = str(attachment?.type, 80);
    const attachmentData = str(attachment?.data, 1_500_000);
    if (
      attachment &&
      !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        attachmentType,
      )
    )
      throw new HttpError(400, "Fayl PDF, PNG, JPG və ya WEBP olmalıdır.");
    if (title.length < 3) throw new HttpError(400, "Testin adını yazın.");
    if (!questions.length && !attachmentData)
      throw new HttpError(400, "Ən azı bir sual və ya test faylı əlavə edin.");
    const jobId = str(b.jobId, 100);
    if (
      jobId &&
      !(await db
        .prepare("SELECT 1 FROM jobs WHERE id=? AND owner=?")
        .bind(jobId, id)
        .first())
    )
      throw new HttpError(400, "Vakansiya tapılmadı.");
    const now = new Date().toISOString();
    const fields = {
      title,
      instructions: str(b.instructions, 3000),
      duration: Math.max(
        5,
        Math.min(240, Math.round(Number(b.durationMin) || 30)),
      ),
      passing: Math.max(
        0,
        Math.min(100, Math.round(Number(b.passingScore) || 0)),
      ),
      showResult: b.showResult === true ? 1 : 0,
      onPass: b.onPass === "review" ? "review" : "",
      onFail: b.onFail === "reject" ? "reject" : "",
    };
    const existingId = str(b.id, 100);
    if (existingId) {
      const current = await db
        .prepare(
          "SELECT title,questions,duration_min,attachment_name FROM assessments WHERE id=? AND company_id=?",
        )
        .bind(existingId, id)
        .first<{
          title: string;
          questions: string;
          duration_min: number;
          attachment_name: string;
        }>();
      if (!current) throw new HttpError(404, "Test tapılmadı.");
      // Every change keeps a reason in the test's history.
      const reason = str(b.reason, 500);
      if (reason.length < 5)
        throw new HttpError(
          400,
          "Dəyişikliyin səbəbini yazın (ən azı 5 simvol).",
        );
      // The document is read live during every exam, so it cannot change once the test was sent.
      if (attachmentData || b.removeAttachment === true) {
        const sent = await db
          .prepare(
            "SELECT COUNT(*) AS n FROM assessment_assignments WHERE assessment_id=?",
          )
          .bind(existingId)
          .first<{ n: number }>();
        if ((sent?.n || 0) > 0)
          throw new HttpError(
            409,
            "Namizədlərə göndərilmiş testin faylını dəyişmək olmaz. Yeni test yaradın. Suallar, ad və müddət dəyişdirilə bilər, göndərilmiş testlər dəyişməz qalır.",
          );
      }
      const changes = [
        current.title !== title ? "ad" : "",
        current.questions !== JSON.stringify(questions) ? "suallar" : "",
        current.duration_min !== fields.duration ? "müddət" : "",
        attachmentData || b.removeAttachment === true ? "fayl" : "",
      ].filter(Boolean);
      await db.batch([
        db
          .prepare(
            `UPDATE assessments SET title=?,instructions=?,duration_min=?,passing_score=?,show_result=?,on_pass=?,on_fail=?,questions=?,job_id=?,updated=?
            ${attachmentData ? ",attachment_name=?,attachment_type=?,attachment_data=?" : b.removeAttachment === true ? ",attachment_name='',attachment_type='',attachment_data=''" : ""}
            WHERE id=? AND company_id=?`,
          )
          .bind(
            ...[
              fields.title,
              fields.instructions,
              fields.duration,
              fields.passing,
              fields.showResult,
              fields.onPass,
              fields.onFail,
              JSON.stringify(questions),
              jobId,
              now,
              ...(attachmentData
                ? [str(attachment?.name, 160), attachmentType, attachmentData]
                : []),
              existingId,
              id,
            ],
          ),
        db
          .prepare(
            "INSERT INTO assessment_revisions(id,assessment_id,actor_id,action,reason,summary,created) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            existingId,
            userId,
            "updated",
            reason,
            changes.length
              ? `Dəyişdi: ${changes.join(", ")}`
              : "Dəyişiklik yoxdur",
            now,
          ),
      ]);
      return ok({ ok: true, id: existingId });
    }
    const newId = crypto.randomUUID();
    await db.batch([
      db
        .prepare(
          `INSERT INTO assessments(id,company_id,job_id,title,instructions,duration_min,passing_score,show_result,on_pass,on_fail,questions,attachment_name,attachment_type,attachment_data,created_by,created,updated)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .bind(
          newId,
          id,
          jobId,
          fields.title,
          fields.instructions,
          fields.duration,
          fields.passing,
          fields.showResult,
          fields.onPass,
          fields.onFail,
          JSON.stringify(questions),
          attachmentData ? str(attachment?.name, 160) : "",
          attachmentData ? attachmentType : "",
          attachmentData,
          userId,
          now,
          now,
        ),
      db
        .prepare(
          "INSERT INTO assessment_revisions(id,assessment_id,actor_id,action,reason,summary,created) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          newId,
          userId,
          "created",
          str(b.reason, 500),
          `${questions.length} sual${attachmentData ? ", fayl" : ""}`,
          now,
        ),
    ]);
    return ok({ ok: true, id: newId }, 201);
  }
  if (request.method === "POST" && path === "hr/assessments/delete") {
    requirePermission("tests", testsDenied);
    const b = await jsonBody(request);
    const assessmentId = str(b.id, 100);
    const used = await db
      .prepare(
        "SELECT COUNT(*) AS count FROM assessment_assignments WHERE assessment_id=? AND company_id=?",
      )
      .bind(assessmentId, id)
      .first<{ count: number }>();
    if (Number(used?.count) > 0)
      throw new HttpError(409, "Namizədlərə göndərilmiş test silinə bilməz.");
    await db
      .prepare("DELETE FROM assessments WHERE id=? AND company_id=?")
      .bind(assessmentId, id)
      .run();
    return ok({ ok: true });
  }
  return undefined;
}
