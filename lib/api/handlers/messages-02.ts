// messages: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { EMAIL_CATEGORIES, sanitizeEmailOff } from "@/lib/notification-prefs";
import { HttpError, jsonBody, str } from "@/lib/server";
import { assertMessageRate, blockedBetween, hasUnreadFrom, notify, notifyNewMessage, senderLabel } from "@/lib/api-core";
import { formatPublicCode, generatePublicCode } from "@/lib/public-code";
import { quiet } from "@/lib/quiet";
import { createSupportThread, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_messages_02(c: Pick<RouteCtx, "accountRole" | "db" | "id" | "path" | "request" | "requestUrl" | "userId">): Promise<Response | undefined> {
  const { accountRole, db, id, path, request, requestUrl, userId } = c;
  if (path.startsWith("messages/templates")) {
    if (accountRole !== "company")
      throw new HttpError(403, "Mesaj şablonları şirkət hesabı üçündür.");
    if (request.method === "GET" && path === "messages/templates") {
      const rows = await db
        .prepare(
          "SELECT id,body FROM message_templates WHERE company_id=? ORDER BY created DESC LIMIT 30",
        )
        .bind(id)
        .all<{ id: string; body: string }>();
      return ok({ templates: rows.results });
    }
    if (request.method === "POST" && path === "messages/templates/save") {
      const b = await jsonBody(request);
      const body = str(b.body, 1000);
      if (body.length < 5)
        throw new HttpError(400, "Şablon mətni çox qısadır.");
      const count = await db
        .prepare(
          "SELECT COUNT(*) AS n FROM message_templates WHERE company_id=?",
        )
        .bind(id)
        .first<{ n: number }>();
      if ((Number(count?.n) || 0) >= 30)
        throw new HttpError(409, "Ən çoxu 30 şablon saxlamaq olar.");
      const same = await db
        .prepare(
          "SELECT 1 FROM message_templates WHERE company_id=? AND body=?",
        )
        .bind(id, body)
        .first();
      if (!same)
        await db
          .prepare(
            "INSERT INTO message_templates(id,company_id,body,created_by,created) VALUES(?,?,?,?,?)",
          )
          .bind(crypto.randomUUID(), id, body, userId, new Date().toISOString())
          .run();
      return ok({ ok: true }, 201);
    }
    if (request.method === "POST" && path === "messages/templates/delete") {
      const b = await jsonBody(request);
      await db
        .prepare("DELETE FROM message_templates WHERE id=? AND company_id=?")
        .bind(str(b.id, 100), id)
        .run();
      return ok({ ok: true });
    }
  }
  if (request.method === "GET" && path === "messages/attachment") {
    const row = await db
      .prepare(
        `SELECT m.attachment_name,m.attachment_type,m.attachment_data FROM messages m JOIN message_threads t ON t.id=m.thread_id
        WHERE m.id=? AND (t.company_id=? OR t.candidate_id=?)`,
      )
      .bind(str(requestUrl.searchParams.get("id"), 100), id, id)
      .first<{
        attachment_name: string;
        attachment_type: string;
        attachment_data: string;
      }>();
    if (!row?.attachment_data) throw new HttpError(404, "Fayl tapılmadı.");
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
  if (request.method === "POST" && path === "messages/archive") {
    if (accountRole === "admin")
      throw new HttpError(
        403,
        "Bu əməliyyat yalnız namizəd və şirkət üçündür.",
      );
    const b = await jsonBody(request);
    const column =
      accountRole === "company" ? "company_archived" : "candidate_archived";
    const result = await db
      .prepare(
        `UPDATE message_threads SET ${column}=? WHERE id=? AND ${accountRole === "company" ? "company_id" : "candidate_id"}=?`,
      )
      .bind(b.archived === false ? 0 : 1, str(b.threadId, 100), id)
      .run();
    if (!result.meta.changes) throw new HttpError(404, "Yazışma tapılmadı.");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "messages/report") {
    if (accountRole === "admin")
      throw new HttpError(
        403,
        "Bu əməliyyat yalnız namizəd və şirkət üçündür.",
      );
    const b = await jsonBody(request);
    const thread = await db
      .prepare(
        "SELECT t.id,t.company_id,t.candidate_id,COALESCE(o.name,'') AS other_name FROM message_threads t LEFT JOIN accounts o ON o.id=CASE WHEN t.company_id=? THEN t.candidate_id ELSE t.company_id END WHERE t.id=? AND (t.company_id=? OR t.candidate_id=?)",
      )
      .bind(id, str(b.threadId, 100), id, id)
      .first<{
        id: string;
        company_id: string;
        candidate_id: string;
        other_name: string;
      }>();
    if (!thread) throw new HttpError(404, "Yazışma tapılmadı.");
    const reason = str(b.reason, 1000);
    if (reason.length < 5)
      throw new HttpError(400, "Şikayətin səbəbini yazın.");
    const recent = await db
      .prepare(
        "SELECT COUNT(*) AS count FROM support_threads WHERE user_id=? AND topic='complaint' AND created>=datetime('now','-1 day')",
      )
      .bind(id)
      .first<{ count: number }>();
    if (Number(recent?.count) >= 5)
      throw new HttpError(429, "Gündə ən çox 5 şikayət göndərmək olar.");
    await createSupportThread(db, {
      userId: id,
      role: accountRole,
      topic: "complaint",
      subject: `Yazışma şikayəti: ${thread.other_name || "istifadəçi"}`.slice(
        0,
        160,
      ),
      body: reason,
      meta: {
        threadId: thread.id,
        reportedUser:
          thread.company_id === id ? thread.candidate_id : thread.company_id,
      },
    });
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "messages/assign") {
    if (accountRole !== "company")
      throw new HttpError(403, "Yazışmanı yalnız şirkət təyin edə bilər.");
    const b = await jsonBody(request);
    const thread = await db
      .prepare(
        "SELECT id,candidate_id FROM message_threads WHERE id=? AND company_id=?",
      )
      .bind(str(b.threadId, 100), id)
      .first<{ id: string; candidate_id: string }>();
    if (!thread) throw new HttpError(404, "Yazışma tapılmadı.");
    const assignee = str(b.userId, 100);
    if (assignee && assignee !== id) {
      const member = await db
        .prepare(
          "SELECT 1 FROM company_members WHERE company_id=? AND user_id=? AND status='active'",
        )
        .bind(id, assignee)
        .first();
      if (!member) throw new HttpError(400, "Bu şəxs komanda üzvü deyil.");
    }
    await db
      .prepare("UPDATE message_threads SET assignee_id=? WHERE id=?")
      .bind(assignee, thread.id)
      .run();
    if (assignee && assignee !== userId)
      await notify(db, {
        userId: assignee,
        type: "message",
        title: "Sizə yazışma təyin edildi",
        body: "Namizədlə yazışmaya siz baxırsınız.",
        link: "hr-messages",
      });
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "messages/send") {
    // Larger body than usual: a message may carry one small document or image.
    const rawBody = await request.text();
    if (rawBody.length > 900_000)
      throw new HttpError(413, "Fayl çox böyükdür (maksimum 500 KB).");
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      throw new HttpError(400, "Sorğu məlumatları oxunmadı.");
    }
    const text = str(body.body, 4000);
    const file = body.attachment as
      { name?: unknown; type?: unknown; data?: unknown } | undefined;
    const fileType = str(file?.type, 80);
    const fileData = str(file?.data, 700_000);
    if (
      file &&
      (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        fileType,
      ) ||
        !fileData ||
        !/^[A-Za-z0-9+/=]+$/.test(fileData))
    )
      throw new HttpError(400, "Fayl PDF, PNG, JPG və ya WEBP olmalıdır.");
    if (!text && !file) throw new HttpError(400, "Mesajı yazın.");
    const thread = await db
      .prepare(
        "SELECT id,company_id FROM message_threads WHERE id=? AND (company_id=? OR candidate_id=?)",
      )
      .bind(str(body.threadId, 100), id, id)
      .first<{ id: string; company_id: string }>();
    if (!thread) throw new HttpError(404, "Yazışma tapılmadı.");
    const other = await db
      .prepare(
        "SELECT CASE WHEN company_id=? THEN candidate_id ELSE company_id END AS other FROM message_threads WHERE id=?",
      )
      .bind(id, thread.id)
      .first<{ other: string }>();
    if (other && (await blockedBetween(db, id, other.other)))
      throw new HttpError(403, "Bu istifadəçi ilə yazışma bloklanıb.");
    const now = new Date().toISOString();
    // A reply may only quote a message of the same conversation.
    const quoted = str(body.replyTo, 100)
      ? await db
          .prepare("SELECT id FROM messages WHERE id=? AND thread_id=?")
          .bind(str(body.replyTo, 100), thread.id)
          .first<{ id: string }>()
      : null;
    const replyTo = quoted?.id || "";
    await assertMessageRate(db, userId);
    const unreadBefore = await hasUnreadFrom(db, thread.id, id);
    await db.batch([
      db
        .prepare(
          "INSERT INTO messages(id,thread_id,sender_id,sender_role,body,reply_to,author_id,attachment_name,attachment_type,attachment_data,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          thread.id,
          id,
          accountRole,
          text,
          replyTo,
          userId,
          file ? str(file.name, 160) || "fayl" : "",
          file ? fileType : "",
          file ? fileData : "",
          now,
        ),
      db
        .prepare(
          `UPDATE message_threads SET updated=?,${thread.company_id === id ? "company_read" : "candidate_read"}=?,${thread.company_id === id ? "candidate_archived" : "company_archived"}=0 WHERE id=?`,
        )
        .bind(now, now, thread.id),
    ]);
    if (other)
      await notifyNewMessage(db, {
        threadId: thread.id,
        recipientId: other.other,
        senderName: await senderLabel(db, accountRole, id, userId),
        unreadBefore,
        preview: text || `📎 ${str(file?.name, 80)}`,
      });
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "messages/unread") {
    if (accountRole === "admin") {
      const open = await db
        .prepare(
          "SELECT COUNT(*) AS count FROM support_threads WHERE status='new'",
        )
        .first<{ count: number }>();
      return ok({ messages: 0, support: Number(open?.count) || 0 });
    }
    const readCol =
      accountRole === "company" ? "company_read" : "candidate_read";
    const mine = accountRole === "company" ? "company_id" : "candidate_id";
    const unread = await db
      .prepare(
        `SELECT COUNT(*) AS count FROM messages m JOIN message_threads t ON t.id=m.thread_id
        WHERE t.${mine}=? AND m.sender_id<>? AND m.created>t.${readCol}`,
      )
      .bind(id, id)
      .first<{ count: number }>();
    const support = await db
      .prepare(
        `SELECT COUNT(*) AS count FROM support_threads t WHERE t.user_id=?
        AND EXISTS(SELECT 1 FROM support_messages m WHERE m.thread_id=t.id AND m.author_role='admin' AND m.created>t.user_read)`,
      )
      .bind(id)
      .first<{ count: number }>();
    return ok({
      messages: Number(unread?.count) || 0,
      support: Number(support?.count) || 0,
    });
  }
  if (path === "notification-prefs") {
    if (request.method === "GET") {
      const row = await db
        .prepare("SELECT email_off FROM notification_prefs WHERE user_id=?")
        .bind(id)
        .first<{ email_off: string }>()
        .catch(() => null);
      let off: string[] = [];
      try {
        off = row ? sanitizeEmailOff(JSON.parse(row.email_off)) : [];
      } catch {
        off = [];
      }
      return ok({
        emailOff: off,
        categories: EMAIL_CATEGORIES.map(({ id: key, label }) => ({
          id: key,
          label,
        })),
      });
    }
    if (request.method === "POST") {
      const b = await jsonBody(request);
      await db
        .prepare(
          "INSERT INTO notification_prefs(user_id,email_off,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET email_off=excluded.email_off,updated=excluded.updated",
        )
        .bind(
          id,
          JSON.stringify(sanitizeEmailOff(b.emailOff)),
          new Date().toISOString(),
        )
        .run();
      return ok({ ok: true });
    }
  }
  if (request.method === "GET" && path === "account/code") {
    let row = await db.prepare("SELECT public_code FROM accounts WHERE id=?").bind(userId).first<{ public_code: string | null }>();
    if (row && !row.public_code) {
      for (let attempt = 0; attempt < 5 && !row?.public_code; attempt++) {
        const code = generatePublicCode();
        await db.prepare("UPDATE accounts SET public_code=? WHERE id=? AND public_code IS NULL").bind(code, userId).run().catch((error) => quiet("route-best-effort", error));
        row = await db.prepare("SELECT public_code FROM accounts WHERE id=?").bind(userId).first<{ public_code: string | null }>();
      }
    }
    return ok({ code: formatPublicCode(row?.public_code || "") });
  }
  if (request.method === "GET" && path === "account/export") {
    if (accountRole !== "candidate")
      throw new HttpError(403, "Məlumat ixracı iş axtaran hesabı üçündür.");
    const rows = async (sql: string, ...bind: unknown[]) =>
      (
        await db
          .prepare(sql)
          .bind(...bind)
          .all()
      ).results;
    const parse = (value: unknown) => {
      try {
        return JSON.parse(String(value));
      } catch {
        return value;
      }
    };
    const account = await db
      .prepare(
        "SELECT a.id,a.name,a.role,a.created,p.email FROM accounts a LEFT JOIN password_accounts p ON p.user_id=a.id WHERE a.id=?",
      )
      .bind(id)
      .first();
    const profile = await db
      .prepare("SELECT data,updated FROM profiles WHERE user_id=?")
      .bind(id)
      .first<{ data: string; updated: string }>();
    const applications = (
      await rows(
        "SELECT a.id,a.job_id,a.status,a.stage,a.created,a.updated,a.auto,a.source,a.data,json_extract(j.data,'$.title') AS job_title,json_extract(j.data,'$.company') AS company FROM applications a LEFT JOIN jobs j ON j.id=a.job_id WHERE a.candidate_id=? ORDER BY a.created DESC",
        id,
      )
    ).map((a) => ({ ...a, data: parse(a.data) }));
    const exportData = {
      exportedAt: new Date().toISOString(),
      note: "Bu fayl JobMatch-də sizin haqqınızda saxlanan məlumatlardır. Yüklənmiş sənəd faylları daxil edilmir, yalnız adları göstərilir.",
      account,
      profile: profile ? { ...profile, data: parse(profile.data) } : null,
      applications,
      applicationEvents: await rows(
        "SELECT e.application_id,e.type,e.actor_role,e.from_value,e.to_value,e.note,e.created FROM application_events e WHERE e.application_id IN (SELECT id FROM applications WHERE candidate_id=?) ORDER BY e.created",
        id,
      ),
      savedJobs: await rows("SELECT job_id FROM saved WHERE user_id=?", id),
      jobAlerts: (
        await rows(
          "SELECT name,filters,created FROM job_alerts WHERE user_id=?",
          id,
        )
      ).map((r) => ({ ...r, filters: parse(r.filters) })),
      interviews: await rows(
        "SELECT scheduled_at,duration_min,kind,location,note,status,candidate_note,created FROM interviews WHERE candidate_id=?",
        id,
      ),
      offers: (
        await rows(
          "SELECT data,status,created,updated FROM offers WHERE candidate_id=?",
          id,
        )
      ).map((r) => ({ ...r, data: parse(r.data) })),
      tests: await rows(
        "SELECT assigned_at,started_at,submitted_at,status,score,max_score,answers FROM assessment_assignments WHERE candidate_id=?",
        id,
      ),
      messages: await rows(
        "SELECT m.created,m.sender_role,m.body,m.attachment_name FROM messages m JOIN message_threads t ON t.id=m.thread_id WHERE t.candidate_id=? ORDER BY m.created",
        id,
      ),
      notifications: await rows(
        "SELECT type,title,body,created FROM notifications WHERE user_id=? ORDER BY created DESC LIMIT 500",
        id,
      ),
      follows: await rows(
        "SELECT target_id,kind,created FROM relations WHERE actor_id=?",
        id,
      ),
      documentChecks: await rows(
        "SELECT kind,item_label,doc_name,status,created FROM verifications WHERE user_id=?",
        id,
      ),
      support: await rows(
        "SELECT t.subject,t.topic,t.status,t.created FROM support_threads t WHERE t.user_id=?",
        id,
      ),
      aiConversations: await rows(
        "SELECT id,title,context_type,created FROM ai_conversations WHERE user_id=?",
        id,
      ),
    };
    await db
      .prepare(
        "INSERT INTO privacy_requests(id,kind,role,created) VALUES(?,'export',?,?)",
      )
      .bind(crypto.randomUUID(), accountRole, new Date().toISOString())
      .run()
      .catch((error) => quiet("route-best-effort", error));
    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="joblink-melumatlarim-${new Date().toISOString().slice(0, 10)}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  }
  if (request.method === "GET" && path === "notifications") {
    // Company members see the shared company inbox and their own notifications.
    const rows = await db
      .prepare(
        "SELECT id,type,title,body,link,read,created FROM notifications WHERE user_id=? OR user_id=? ORDER BY created DESC LIMIT 50",
      )
      .bind(id, userId)
      .all<{ read: number }>();
    return ok({
      notifications: rows.results,
      unread: rows.results.filter((n) => !n.read).length,
    });
  }
  if (request.method === "POST" && path === "notifications/read") {
    const body = await jsonBody(request);
    if (body.all === true)
      await db
        .prepare("UPDATE notifications SET read=1 WHERE user_id=? OR user_id=?")
        .bind(id, userId)
        .run();
    else
      await db
        .prepare(
          "UPDATE notifications SET read=1 WHERE id=? AND (user_id=? OR user_id=?)",
        )
        .bind(str(body.id, 100), id, userId)
        .run();
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "relations") {
    const rows = await db
      .prepare("SELECT target_id,kind FROM relations WHERE actor_id=?")
      .bind(id)
      .all<{ target_id: string; kind: string }>();
    const followers = await db
      .prepare(
        "SELECT COUNT(*) AS count FROM relations WHERE target_id=? AND kind='follow'",
      )
      .bind(id)
      .first<{ count: number }>();
    return ok({
      following: rows.results
        .filter((r) => r.kind === "follow")
        .map((r) => r.target_id),
      blocked: rows.results
        .filter((r) => r.kind === "block")
        .map((r) => r.target_id),
      followers: Number(followers?.count) || 0,
    });
  }
  return undefined;
}
