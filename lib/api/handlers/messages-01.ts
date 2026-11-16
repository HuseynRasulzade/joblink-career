// messages: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { type AlertJob, alertIsEmpty, describeAlert, jobMatchesAlert, sanitizeAlertFilters } from "@/lib/job-alerts";
import { HttpError, jsonBody, str } from "@/lib/server";
import { assertMessageRate, blockedBetween, hasUnreadFrom, notifyNewMessage, senderLabel } from "@/lib/api-core";
import { formatPublicCode, normalizePublicCode } from "@/lib/public-code";
import { sanitizeReview } from "@/lib/reviews";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_messages_01(c: Pick<RouteCtx, "accountRole" | "db" | "id" | "path" | "request" | "requestUrl" | "userId">): Promise<Response | undefined> {
  const { accountRole, db, id, path, request, requestUrl, userId } = c;
  if (request.method === "GET" && path === "messages/threads") {
    if (accountRole === "admin") return ok({ threads: [] });
    const mine = accountRole === "company" ? "company_id" : "candidate_id";
    const readCol =
      accountRole === "company" ? "company_read" : "candidate_read";
    const rows = await db
      .prepare(
        `SELECT t.id,t.job_id,t.updated,
          CASE WHEN ?='company' THEN t.candidate_id ELSE t.company_id END AS other_id,
          COALESCE(other.name,'İstifadəçi') AS other_name,
          COALESCE(json_extract(j.data,'$.title'),'') AS job_title,
          COALESCE(j.status,'') AS job_status,
          EXISTS(SELECT 1 FROM applications ap WHERE ap.job_id=t.job_id AND ap.candidate_id=t.candidate_id AND t.job_id<>'') AS applied,
          CASE WHEN ?='company' THEN t.company_archived ELSE t.candidate_archived END AS archived,
          CASE WHEN ?='company' THEN t.assignee_id ELSE '' END AS assignee_id,
          CASE WHEN ?='company' THEN COALESCE((SELECT name FROM accounts WHERE id=t.assignee_id),'') ELSE '' END AS assignee_name,
          (SELECT CASE WHEN body<>'' THEN body ELSE '📎 '||attachment_name END FROM messages m WHERE m.thread_id=t.id ORDER BY created DESC LIMIT 1) AS last_message,
          (SELECT COUNT(*) FROM messages m WHERE m.thread_id=t.id AND m.sender_id<>? AND m.created>t.${readCol}) AS unread
        FROM message_threads t
        LEFT JOIN accounts other ON other.id = CASE WHEN ?='company' THEN t.candidate_id ELSE t.company_id END
        LEFT JOIN jobs j ON j.id=t.job_id
        WHERE t.${mine}=? ORDER BY t.updated DESC LIMIT 200`,
      )
      .bind(
        accountRole,
        accountRole,
        accountRole,
        accountRole,
        id,
        accountRole,
        id,
      )
      .all();
    return ok({ threads: rows.results });
  }
  if (request.method === "GET" && path === "messages/thread") {
    const threadId = str(requestUrl.searchParams.get("id"), 100);
    const thread = await db
      .prepare(
        "SELECT * FROM message_threads WHERE id=? AND (company_id=? OR candidate_id=?)",
      )
      .bind(threadId, id, id)
      .first<{
        id: string;
        company_id: string;
        candidate_id: string;
        job_id: string;
      }>();
    if (!thread) throw new HttpError(404, "Yazışma tapılmadı.");
    const now = new Date().toISOString();
    await db
      .prepare(
        `UPDATE message_threads SET ${thread.company_id === id ? "company_read" : "candidate_read"}=? WHERE id=?`,
      )
      .bind(now, threadId)
      .run();
    // Newest page first; older messages load on demand ("before").
    const before = str(requestUrl.searchParams.get("before"), 40);
    const limit = Math.max(
      10,
      Math.min(100, Number(requestUrl.searchParams.get("limit")) || 40),
    );
    const page = await db
      .prepare(
        `SELECT m.id,m.sender_id,m.sender_role,m.body,m.created,m.reply_to,m.attachment_name,m.attachment_type,COALESCE(au.name,'') AS author,
          r.body AS reply_body, r.sender_id AS reply_sender
        FROM messages m LEFT JOIN messages r ON r.id=m.reply_to AND m.reply_to<>''
        LEFT JOIN accounts au ON au.id=m.author_id AND m.author_id<>''
        WHERE m.thread_id=? ${before ? "AND m.created<?" : ""} ORDER BY m.created DESC LIMIT ?`,
      )
      .bind(...(before ? [threadId, before, limit + 1] : [threadId, limit + 1]))
      .all<{
        id: string;
        sender_id: string;
        sender_role: string;
        body: string;
        created: string;
        reply_to: string;
        attachment_name: string;
        attachment_type: string;
        author: string;
        reply_body: string | null;
        reply_sender: string | null;
      }>();
    const hasMore = page.results.length > limit;
    const rows = page.results.slice(0, limit).reverse();
    const otherReadAt =
      (
        thread as {
          company_id: string;
          company_read?: string;
          candidate_read?: string;
        }
      ).company_id === id
        ? (thread as { candidate_read?: string }).candidate_read || ""
        : (thread as { company_read?: string }).company_read || "";
    return ok({
      thread,
      hasMore,
      otherReadAt,
      messages: rows.map((m) => ({
        id: m.id,
        sender_role: m.sender_role,
        body: m.body,
        created: m.created,
        attachment: m.attachment_name
          ? { name: m.attachment_name, type: m.attachment_type }
          : null,
        mine: m.sender_id === id,
        // Which team member wrote it is shown to the company side only.
        author:
          accountRole === "company" && m.sender_role === "company"
            ? m.author
            : "",
        replyTo: m.reply_body
          ? {
              id: m.reply_to,
              body: m.reply_body.slice(0, 160),
              mine: m.reply_sender === id,
            }
          : null,
      })),
    });
  }
  if (request.method === "GET" && path === "messages/search") {
    if (accountRole === "admin") return ok({ results: [] });
    const needle = str(requestUrl.searchParams.get("q"), 80)
      .replace(/[%_\\]/g, " ")
      .trim();
    if (needle.length < 2) return ok({ results: [] });
    const mine = accountRole === "company" ? "company_id" : "candidate_id";
    const rows = await db
      .prepare(
        `SELECT m.id,m.thread_id,m.body,m.created,m.sender_id,
          COALESCE(other.name,'İstifadəçi') AS other_name,
          COALESCE(json_extract(j.data,'$.title'),'') AS job_title
        FROM messages m JOIN message_threads t ON t.id=m.thread_id
        LEFT JOIN accounts other ON other.id = CASE WHEN ?='company' THEN t.candidate_id ELSE t.company_id END
        LEFT JOIN jobs j ON j.id=t.job_id
        WHERE t.${mine}=? AND m.body LIKE ? ORDER BY m.created DESC LIMIT 30`,
      )
      .bind(accountRole, id, `%${needle}%`)
      .all();
    return ok({ results: rows.results });
  }
  if (request.method === "GET" && path === "messages/find-by-code") {
    if (accountRole !== "company") throw new HttpError(403, "Bu əməliyyat mövcud deyil.");
    const code = normalizePublicCode(str(requestUrl.searchParams.get("code"), 40));
    const notFound = new HttpError(404, "Bu kodla yazıla bilən namizəd tapılmadı. Namizəd müraciət etməyibsə və profili təkliflərə açıq deyilsə, ona yazmaq olmaz.");
    if (!code) throw notFound;
    const person = await db
      .prepare("SELECT a.id,a.name,COALESCE(p.data,'{}') AS data,p.active FROM accounts a LEFT JOIN profiles p ON p.user_id=a.id WHERE a.public_code=? AND COALESCE(a.role,'candidate')='candidate' AND COALESCE(a.status,'active')='active'")
      .bind(code)
      .first<{ id: string; name: string; data: string; active: string | number | null }>();
    if (!person) throw notFound;
    const applied = await db
      .prepare("SELECT 1 AS x FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.candidate_id=? AND j.owner=? LIMIT 1")
      .bind(person.id, id)
      .first();
    if (!applied && String(person.active) !== "1") throw notFound;
    if (await blockedBetween(db, id, person.id)) throw notFound;
    let title = "";
    try {
      title = String(JSON.parse(person.data)?.title || "");
    } catch {
      title = "";
    }
    return ok({ candidateId: person.id, name: person.name, title, code: formatPublicCode(code) });
  }
  if (request.method === "POST" && path === "messages/start") {
    const body = await jsonBody(request);
    const text = str(body.body, 4000);
    if (!text) throw new HttpError(400, "Mesajı yazın.");
    let companyId = "",
      candidateId = "",
      jobId = "",
      inviteTitle = "";
    if (accountRole === "company") {
      candidateId = str(body.candidateId, 100);
      jobId = str(body.jobId, 100);
      // Employers may write to applicants of their vacancies or to candidates
      // who opened their profile to offers.
      const applied = jobId
        ? await db
            .prepare(
              "SELECT 1 FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.candidate_id=? AND j.id=? AND j.owner=?",
            )
            .bind(candidateId, jobId, id)
            .first()
        : null;
      const open = await db
        .prepare(
          "SELECT 1 FROM profiles p LEFT JOIN accounts a ON a.id=p.user_id WHERE p.user_id=? AND p.active='1' AND COALESCE(a.status,'active')='active'",
        )
        .bind(candidateId)
        .first();
      if (!applied && !open)
        throw new HttpError(
          403,
          "Bu namizədə yalnız müraciət etdikdə və ya profili təkliflərə açıq olduqda yazmaq olar.",
        );
      if (
        jobId &&
        !(await db
          .prepare("SELECT 1 FROM jobs WHERE id=? AND owner=?")
          .bind(jobId, id)
          .first())
      )
        jobId = "";
      // An invitation to apply needs an open vacancy of this company.
      if (body.invite === true) {
        const open = jobId
          ? await db.prepare("SELECT json_extract(data,'$.title') AS title FROM jobs WHERE id=? AND owner=? AND status='published'").bind(jobId, id).first<{ title: string }>()
          : null;
        if (!open) throw new HttpError(409, "Müraciət dəvəti üçün açıq (yayımlanmış) vakansiya seçilməlidir.");
        inviteTitle = String(open.title || "");
      }
      companyId = id;
    } else if (accountRole === "candidate") {
      const application = await db
        .prepare(
          "SELECT a.job_id,j.owner FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND a.candidate_id=?",
        )
        .bind(str(body.applicationId, 100), id)
        .first<{ job_id: string; owner: string }>();
      if (!application)
        throw new HttpError(
          403,
          "Şirkətə yalnız müraciət etdiyiniz vakansiya üzrə yaza bilərsiniz.",
        );
      companyId = application.owner;
      candidateId = id;
      jobId = application.job_id;
    } else throw new HttpError(403, "Bu əməliyyat mövcud deyil.");
    if (await blockedBetween(db, companyId, candidateId))
      throw new HttpError(403, "Bu istifadəçi ilə yazışma bloklanıb.");
    await assertMessageRate(db, userId);
    const now = new Date().toISOString();
    let thread = await db
      .prepare(
        "SELECT id FROM message_threads WHERE company_id=? AND candidate_id=? AND job_id=?",
      )
      .bind(companyId, candidateId, jobId)
      .first<{ id: string }>();
    if (!thread) {
      thread = { id: crypto.randomUUID() };
      await db
        .prepare(
          "INSERT INTO message_threads(id,company_id,candidate_id,job_id,company_read,candidate_read,created,updated) VALUES(?,?,?,?,?,?,?,?)",
        )
        .bind(
          thread.id,
          companyId,
          candidateId,
          jobId,
          accountRole === "company" ? now : "",
          accountRole === "candidate" ? now : "",
          now,
          now,
        )
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
          accountRole,
          text,
          userId,
          now,
        ),
      db
        .prepare(
          `UPDATE message_threads SET updated=?,${accountRole === "company" ? "company_read" : "candidate_read"}=? WHERE id=?`,
        )
        .bind(now, now, thread.id),
    ]);
    await notifyNewMessage(db, {
      threadId: thread.id,
      recipientId: accountRole === "company" ? candidateId : companyId,
      senderName: await senderLabel(db, accountRole, id, userId),
      unreadBefore,
      preview: inviteTitle ? `Vakansiyaya müraciət dəvəti (${inviteTitle}): ${text}` : text,
    });
    return ok({ ok: true, threadId: thread.id }, 201);
  }
  if (path.startsWith("hr/saved-searches") && accountRole !== "company")
    throw new HttpError(403, "Bu əməliyyat şirkət hesabı üçündür.");
  if (request.method === "GET" && path === "hr/saved-searches") {
    const rows = await db
      .prepare(
        "SELECT id,name,filters FROM saved_searches WHERE company_id=? ORDER BY created DESC LIMIT 30",
      )
      .bind(id)
      .all<{ id: string; name: string; filters: string }>();
    return ok({
      searches: rows.results.flatMap((r) => {
        try {
          return [{ id: r.id, name: r.name, filters: JSON.parse(r.filters) }];
        } catch {
          return [];
        }
      }),
    });
  }
  if (request.method === "POST" && path === "hr/saved-searches/save") {
    const b = await jsonBody(request);
    const name = str(b.name, 60);
    if (name.length < 2) throw new HttpError(400, "Axtarışın adını yazın.");
    const f = (
      b.filters && typeof b.filters === "object" ? b.filters : {}
    ) as Record<string, unknown>;
    const filters = {
      minScore: Math.max(0, Math.min(100, Math.round(Number(f.minScore) || 0))),
      minYears: Math.max(0, Math.min(60, Math.round(Number(f.minYears) || 0))),
      requiredSkills: str(f.requiredSkills, 300),
      certFilter: str(f.certFilter, 100),
      onlyFollowed: f.onlyFollowed === true,
      query: str(f.query, 100),
    };
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM saved_searches WHERE company_id=?")
      .bind(id)
      .first<{ n: number }>();
    const existing = await db
      .prepare("SELECT id FROM saved_searches WHERE company_id=? AND name=?")
      .bind(id, name)
      .first<{ id: string }>();
    if (!existing && (Number(count?.n) || 0) >= 30)
      throw new HttpError(409, "Ən çoxu 30 axtarış saxlamaq olar.");
    if (existing)
      await db
        .prepare("UPDATE saved_searches SET filters=? WHERE id=?")
        .bind(JSON.stringify(filters), existing.id)
        .run();
    else
      await db
        .prepare(
          "INSERT INTO saved_searches(id,company_id,name,filters,created_by,created) VALUES(?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          name,
          JSON.stringify(filters),
          userId,
          new Date().toISOString(),
        )
        .run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "hr/saved-searches/delete") {
    const b = await jsonBody(request);
    await db
      .prepare("DELETE FROM saved_searches WHERE id=? AND company_id=?")
      .bind(str(b.id, 100), id)
      .run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "companies/review") {
    if (accountRole !== "candidate")
      throw new HttpError(403, "Rəyi yalnız iş axtaran hesabı yaza bilər.");
    const b = await jsonBody(request);
    const companyId = str(b.companyId, 100);
    const applied = await db
      .prepare(
        "SELECT 1 FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.candidate_id=? AND j.owner=? LIMIT 1",
      )
      .bind(id, companyId)
      .first();
    if (!applied)
      throw new HttpError(
        403,
        "Rəyi yalnız müraciət etdiyiniz şirkət üçün yaza bilərsiniz.",
      );
    const review = sanitizeReview(b);
    if ("error" in review) throw new HttpError(400, review.error);
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO company_reviews(id,company_id,user_id,rating,title,body,status,created) VALUES(?,?,?,?,?,?,'pending',?)
        ON CONFLICT(company_id,user_id) DO UPDATE SET rating=excluded.rating,title=excluded.title,body=excluded.body,status='pending',admin_note='',created=excluded.created,reviewed_at=''`,
      )
      .bind(
        crypto.randomUUID(),
        companyId,
        id,
        review.rating,
        review.title,
        review.body,
        now,
      )
      .run();
    return ok({ ok: true, status: "pending" }, 201);
  }
  if (path.startsWith("alerts") && accountRole !== "candidate")
    throw new HttpError(
      403,
      "Vakansiya xəbərdarlığı iş axtaran hesabı üçündür.",
    );
  if (request.method === "GET" && path === "alerts") {
    const rows = await db
      .prepare(
        "SELECT id,name,filters FROM job_alerts WHERE user_id=? ORDER BY created DESC",
      )
      .bind(id)
      .all<{ id: string; name: string; filters: string }>();
    return ok({
      alerts: rows.results.map((r) => ({
        id: r.id,
        name: r.name,
        filters: sanitizeAlertFilters(
          (() => {
            try {
              return JSON.parse(r.filters);
            } catch {
              return {};
            }
          })(),
        ),
      })),
    });
  }
  if (request.method === "POST" && path === "alerts/save") {
    const b = await jsonBody(request);
    const filters = sanitizeAlertFilters(b.filters);
    if (alertIsEmpty(filters))
      throw new HttpError(400, "Ən azı bir filtr seçin və ya söz yazın.");
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM job_alerts WHERE user_id=?")
      .bind(id)
      .first<{ n: number }>();
    if ((Number(count?.n) || 0) >= 10)
      throw new HttpError(409, "Ən çoxu 10 xəbərdarlıq saxlamaq olar.");
    const now = new Date().toISOString();
    // Vacancies that already match are marked seen, so the first message is about new ones only.
    const current = await db
      .prepare(
        "SELECT id,data FROM jobs WHERE status='published' AND created>? ORDER BY created DESC LIMIT 1000",
      )
      .bind(new Date(Date.now() - 45 * 86400000).toISOString())
      .all<{ id: string; data: string }>();
    const seen = current.results
      .flatMap((r) => {
        try {
          const d = JSON.parse(r.data) as AlertJob;
          return jobMatchesAlert(
            { ...d, skills: Array.isArray(d.skills) ? d.skills : [] },
            filters,
          )
            ? [r.id]
            : [];
        } catch {
          return [];
        }
      })
      .slice(0, 300);
    await db
      .prepare(
        "INSERT INTO job_alerts(id,user_id,name,filters,last_check,seen,created) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        id,
        str(b.name, 60) || describeAlert(filters).slice(0, 60),
        JSON.stringify(filters),
        now,
        JSON.stringify(seen),
        now,
      )
      .run();
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "alerts/delete") {
    const b = await jsonBody(request);
    await db
      .prepare("DELETE FROM job_alerts WHERE id=? AND user_id=?")
      .bind(str(b.id, 100), id)
      .run();
    return ok({ ok: true });
  }
  return undefined;
}
