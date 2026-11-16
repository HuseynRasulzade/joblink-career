// hr: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { sanitizeGuideQuestions } from "@/lib/interviews";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_hr_05(c: Pick<RouteCtx, "db" | "id" | "interviewScope" | "path" | "request" | "userId">): Promise<Response | undefined> {
  const { db, id, interviewScope, path, request, userId } = c;
  if (request.method === "GET" && path === "hr/interview-templates") {
    const rows = await db
      .prepare(
        "SELECT id,name,questions,job_id FROM interview_templates WHERE company_id=? ORDER BY name",
      )
      .bind(id)
      .all<{ id: string; name: string; questions: string; job_id: string }>();
    const scope = await interviewScope();
    const jobs = (await db.prepare("SELECT id,COALESCE(json_extract(data,'$.title'),'') AS title FROM jobs WHERE id IN (SELECT value FROM json_each(?)) ORDER BY title").bind(JSON.stringify(scope)).all<{ id: string; title: string }>()).results;
    return ok({
      jobs,
      templates: rows.results.map((r) => ({
        id: r.id,
        name: r.name,
        jobId: r.job_id || "",
        questions: sanitizeGuideQuestions(
          (() => {
            try {
              return JSON.parse(r.questions);
            } catch {
              return [];
            }
          })(),
        ),
      })),
    });
  }
  if (request.method === "POST" && path === "hr/interview-templates/save") {
    const b = await jsonBody(request);
    const name = str(b.name, 80);
    const questions = sanitizeGuideQuestions(b.questions);
    if (name.length < 3) throw new HttpError(400, "Şablonun adını yazın.");
    if (!questions.length) throw new HttpError(400, "Ən azı bir sual yazın.");
    const jobId = str(b.jobId, 100);
    if (jobId && !(await interviewScope()).includes(jobId)) throw new HttpError(404, "Vakansiya tapılmadı.");
    const existing = await db
      .prepare(
        "SELECT id FROM interview_templates WHERE company_id=? AND (id=? OR name=?)",
      )
      .bind(id, str(b.id, 100), name)
      .first<{ id: string }>();
    const count = await db
      .prepare(
        "SELECT COUNT(*) AS n FROM interview_templates WHERE company_id=?",
      )
      .bind(id)
      .first<{ n: number }>();
    if (!existing && (Number(count?.n) || 0) >= 30)
      throw new HttpError(409, "Ən çoxu 30 şablon saxlamaq olar.");
    const now = new Date().toISOString();
    if (existing)
      await db
        .prepare(
          "UPDATE interview_templates SET name=?,questions=?,updated=?,job_id=? WHERE id=?",
        )
        .bind(name, JSON.stringify(questions), now, jobId, existing.id)
        .run();
    else
      await db
        .prepare(
          "INSERT INTO interview_templates(id,company_id,name,questions,created_by,updated,job_id) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          name,
          JSON.stringify(questions),
          userId,
          now,
          jobId,
        )
        .run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "hr/interview-templates/delete") {
    const b = await jsonBody(request);
    await db
      .prepare("DELETE FROM interview_templates WHERE id=? AND company_id=?")
      .bind(str(b.id, 100), id)
      .run();
    return ok({ ok: true });
  }
  return undefined;
}
