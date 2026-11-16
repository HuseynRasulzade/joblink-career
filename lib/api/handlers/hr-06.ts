// hr: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { WITHDRAWN_STATUS } from "@/lib/recruitment";
import { analyze } from "@/lib/model";
import { blockedBetween, companyAudit, hasUnreadFrom, notify, notifyNewMessage, recordApplicationEvent, senderLabel } from "@/lib/api-core";
import { matchesTalent, sanitizeNote, sanitizeTags } from "@/lib/talent";
import { normalizedProfileRecord, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_hr_06(c: Pick<RouteCtx, "assignTest" | "customSkillLabels" | "db" | "id" | "path" | "poolUpsert" | "reportScope" | "request" | "requestUrl" | "requesterName" | "requirePermission" | "savableCandidate" | "testsDenied" | "userId">): Promise<Response | undefined> {
  const { assignTest, customSkillLabels, db, id, path, poolUpsert, reportScope, request, requestUrl, requesterName, requirePermission, savableCandidate, testsDenied, userId } = c;
  if (request.method === "GET" && path === "hr/talent") {
    const rows = await db
      .prepare(
        `SELECT t.id,t.candidate_id,t.tags,t.note,t.created,t.updated,COALESCE(a.name,'') AS account_name,p.data AS profile_data,COALESCE(p.active,'0') AS active,
          (SELECT COUNT(*) FROM applications ap JOIN jobs j ON j.id=ap.job_id WHERE ap.candidate_id=t.candidate_id AND j.owner=t.company_id) AS applications
        FROM talent_pool t LEFT JOIN accounts a ON a.id=t.candidate_id LEFT JOIN profiles p ON p.user_id=t.candidate_id
        WHERE t.company_id=? ORDER BY t.updated DESC LIMIT 500`,
      )
      .bind(id)
      .all<{
        id: string;
        candidate_id: string;
        tags: string;
        note: string;
        created: string;
        updated: string;
        account_name: string;
        profile_data: string | null;
        active: string;
        applications: number;
      }>();
    const q = str(requestUrl.searchParams.get("q"), 80);
    const tag = str(requestUrl.searchParams.get("tag"), 40);
    const allTags = new Set<string>();
    const entries = rows.results.map((r) => {
      const tags = (() => {
        try {
          return sanitizeTags(JSON.parse(r.tags));
        } catch {
          return [] as string[];
        }
      })();
      tags.forEach((t) => allTags.add(t));
      const profile = r.profile_data
        ? normalizedProfileRecord(JSON.parse(r.profile_data), customSkillLabels)
        : null;
      // A profile the candidate has hidden is shown only to a company they applied to.
      const visible = !!profile && (r.active === "1" || r.applications > 0);
      return {
        id: r.id,
        candidateId: r.candidate_id,
        name: visible ? profile!.name : r.account_name || "Namizəd",
        title: visible ? profile!.title : "",
        city: visible ? profile!.city : "",
        skills: visible ? profile!.skills.slice(0, 8) : [],
        years: visible ? analyze(profile!).years : 0,
        profileHidden: !visible,
        applications: r.applications,
        tags,
        note: r.note,
        created: r.created,
        updated: r.updated,
      };
    });
    return ok({
      tags: [...allTags].sort((a, b) => a.localeCompare(b, "az")),
      entries: entries.filter((e) =>
        matchesTalent(
          {
            name: e.name,
            title: e.title,
            skills: e.skills,
            tags: e.tags,
            note: e.note,
          },
          { q, tag },
        ),
      ),
      total: entries.length,
    });
  }
  if (request.method === "POST" && path === "hr/talent/save") {
    const b = await jsonBody(request);
    const candidateId = str(b.candidateId, 100);
    const check = await savableCandidate(candidateId);
    if (!check.ok)
      throw new HttpError(
        404,
        "Bu namizədi bazaya əlavə etmək olmaz: müraciət etməyib və profili açıq deyil.",
      );
    await poolUpsert(
      candidateId,
      sanitizeTags(b.tags),
      sanitizeNote(b.note),
      check.jobId,
      false,
    );
    await companyAudit(db, id, userId, "talent-saved", candidateId);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "hr/candidate-notes") {
    const candidateId = str(requestUrl.searchParams.get("candidateId"), 100);
    const rows = await db
      .prepare("SELECT id,author_id,author_name,text,created FROM candidate_notes WHERE company_id=? AND candidate_id=? ORDER BY created DESC LIMIT 100")
      .bind(id, candidateId)
      .all();
    return ok({ notes: rows.results });
  }
  if (request.method === "POST" && path === "hr/candidate-notes/save") {
    const b = await jsonBody(request);
    const candidateId = str(b.candidateId, 100);
    const text = str(b.text, 2000).trim();
    if (!candidateId || !text) throw new HttpError(400, "Qeyd boş ola bilməz.");
    const known = await db.prepare("SELECT 1 AS x FROM accounts WHERE id=? AND role='candidate'").bind(candidateId).first();
    if (!known) throw new HttpError(404, "Namizəd tapılmadı.");
    const noteId = crypto.randomUUID();
    await db
      .prepare("INSERT INTO candidate_notes(id,company_id,candidate_id,author_id,author_name,text,created) VALUES(?,?,?,?,?,?,?)")
      .bind(noteId, id, candidateId, userId, await requesterName(), text, new Date().toISOString())
      .run();
    await companyAudit(db, id, userId, "candidate-note", candidateId);
    return ok({ ok: true, id: noteId });
  }
  if (request.method === "POST" && path === "hr/candidate-notes/delete") {
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM candidate_notes WHERE id=? AND company_id=?").bind(str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "hr/talent/remove") {
    const b = await jsonBody(request);
    await db
      .prepare("DELETE FROM talent_pool WHERE company_id=? AND candidate_id=?")
      .bind(id, str(b.candidateId, 100))
      .run();
    await companyAudit(
      db,
      id,
      userId,
      "talent-removed",
      str(b.candidateId, 100),
    );
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "hr/applications/bulk") {
    const b = await jsonBody(request);
    const ids = [
      ...new Set(
        (Array.isArray(b.ids) ? b.ids : [])
          .map((x: unknown) => str(x, 100))
          .filter(Boolean),
      ),
    ].slice(0, 50) as string[];
    if (!ids.length) throw new HttpError(400, "Müraciət seçilməyib.");
    const action = str(b.action, 12);
    if (!["status", "message", "pool", "test"].includes(action))
      throw new HttpError(400, "Əməliyyat yanlışdır.");
    const jobIds = (await reportScope()).jobIds;
    const rows = await db
      .prepare(
        `SELECT a.id,a.status,a.stage,a.candidate_id,a.job_id,json_extract(j.data,'$.title') AS title,json_extract(j.data,'$.company') AS company,COALESCE(ac.name,'') AS name
        FROM applications a JOIN jobs j ON j.id=a.job_id LEFT JOIN accounts ac ON ac.id=a.candidate_id
        WHERE a.id IN (SELECT value FROM json_each(?)) AND j.owner=? AND j.id IN (SELECT value FROM json_each(?))`,
      )
      .bind(JSON.stringify(ids), id, JSON.stringify(jobIds))
      .all<{
        id: string;
        status: string;
        stage: string;
        candidate_id: string;
        job_id: string;
        title: string;
        company: string;
        name: string;
      }>();
    const found = new Map(rows.results.map((r) => [r.id, r]));
    const skipped: { id: string; name: string; reason: string }[] = [];
    let done = 0;
    for (const appId of ids)
      if (!found.has(appId))
        skipped.push({
          id: appId,
          name: "",
          reason: "tapılmadı və ya sizə aid deyil",
        });
    const now = new Date().toISOString();
    if (action === "status") {
      const status = str(b.status, 30);
      // Hiring and offers keep their own flow (offer, acceptance); bulk only moves people to review or rejects them.
      if (!["Baxışda", "Uyğun deyil"].includes(status))
        throw new HttpError(
          400,
          "Toplu rejimdə yalnız “Baxışda” və “Uyğun deyil” statusları verilir.",
        );
      for (const r of rows.results) {
        if (r.status === WITHDRAWN_STATUS) {
          skipped.push({
            id: r.id,
            name: r.name,
            reason: "namizəd müraciəti geri götürüb",
          });
          continue;
        }
        if (r.status === status) {
          skipped.push({
            id: r.id,
            name: r.name,
            reason: "artıq bu statusdadır",
          });
          continue;
        }
        if (r.status === "İşə qəbul edildi") {
          skipped.push({
            id: r.id,
            name: r.name,
            reason: "artıq işə qəbul edilib",
          });
          continue;
        }
        if (status === "Baxışda" && r.status !== "Göndərildi") {
          skipped.push({
            id: r.id,
            name: r.name,
            reason: `hazırda “${r.status}” mərhələsindədir`,
          });
          continue;
        }
        const pendingOffer = await db
          .prepare(
            "SELECT id FROM offers WHERE application_id=? AND status='sent'",
          )
          .bind(r.id)
          .first()
          .catch(() => null);
        if (pendingOffer) {
          skipped.push({
            id: r.id,
            name: r.name,
            reason: "cavab gözləyən təklif var",
          });
          continue;
        }
        await db
          .prepare(
            "UPDATE applications SET status=?,stage='',updated=? WHERE id=?",
          )
          .bind(status, now, r.id)
          .run();
        await recordApplicationEvent(db, {
          applicationId: r.id,
          actorId: userId,
          actorRole: "company",
          type: "status",
          from: r.status,
          to: status,
          note: "toplu əməliyyat",
        });
        await notify(db, {
          userId: r.candidate_id,
          type: "application-status",
          title: `${r.title}: ${status}`,
          body: `${r.company} müraciətinizin statusunu yenilədi.`,
          link: "applications",
        });
        done++;
      }
    } else if (action === "message") {
      const text = str(b.body, 4000);
      if (!text) throw new HttpError(400, "Mesajı yazın.");
      if (rows.results.length > 20)
        throw new HttpError(
          400,
          "Bir dəfəyə ən çoxu 20 namizədə mesaj göndərmək olar.",
        );
      const since = new Date(Date.now() - 5 * 60_000).toISOString();
      const recent = await db
        .prepare(
          "SELECT COUNT(*) AS n FROM messages WHERE author_id=? AND created>?",
        )
        .bind(userId, since)
        .first<{ n: number }>()
        .catch(() => null);
      if ((Number(recent?.n) || 0) + rows.results.length > 40)
        throw new HttpError(
          429,
          "Çox mesaj göndərdiniz. Bir neçə dəqiqə gözləyin.",
        );
      const sender = await senderLabel(db, "company", id, userId);
      for (const r of rows.results) {
        if (await blockedBetween(db, id, r.candidate_id)) {
          skipped.push({ id: r.id, name: r.name, reason: "yazışma bloklanıb" });
          continue;
        }
        let thread = await db
          .prepare(
            "SELECT id FROM message_threads WHERE company_id=? AND candidate_id=? AND job_id=?",
          )
          .bind(id, r.candidate_id, r.job_id)
          .first<{ id: string }>();
        if (!thread) {
          thread = { id: crypto.randomUUID() };
          await db
            .prepare(
              "INSERT INTO message_threads(id,company_id,candidate_id,job_id,company_read,candidate_read,created,updated) VALUES(?,?,?,?,?,?,?,?)",
            )
            .bind(thread.id, id, r.candidate_id, r.job_id, now, "", now, now)
            .run();
        }
        const unreadBefore = await hasUnreadFrom(db, thread.id, id);
        await db.batch([
          db
            .prepare(
              "INSERT INTO messages(id,thread_id,sender_id,sender_role,body,author_id,created) VALUES(?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              thread.id,
              id,
              "company",
              text,
              userId,
              now,
            ),
          db
            .prepare(
              "UPDATE message_threads SET updated=?,company_read=? WHERE id=?",
            )
            .bind(now, now, thread.id),
        ]);
        await notifyNewMessage(db, {
          threadId: thread.id,
          recipientId: r.candidate_id,
          senderName: sender,
          unreadBefore,
          preview: text,
        });
        done++;
      }
    } else if (action === "test") {
      requirePermission("tests", testsDenied);
      const assessment = await db
        .prepare(
          "SELECT id,title,instructions,duration_min,passing_score,show_result,questions FROM assessments WHERE id=? AND company_id=?",
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
      if (!assessment) throw new HttpError(404, "Test tapılmadı.");
      for (const r of rows.results) {
        const problem = await assignTest(assessment, {
          id: r.id,
          candidate_id: r.candidate_id,
          status: r.status,
        });
        if (problem) skipped.push({ id: r.id, name: r.name, reason: problem });
        else done++;
      }
    } else {
      const tags = sanitizeTags(b.tags);
      for (const r of rows.results) {
        await poolUpsert(
          r.candidate_id,
          tags,
          sanitizeNote(b.note),
          r.job_id,
          true,
        );
        done++;
      }
    }
    await companyAudit(
      db,
      id,
      userId,
      `bulk-${action}`,
      "",
      `${done}/${ids.length}`,
    );
    return ok({ ok: true, done, skipped });
  }
  return undefined;
}
