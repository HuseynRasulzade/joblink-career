// support: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, str } from "@/lib/server";
import { SUPPORT_STATUSES, SUPPORT_TOPICS, supportSla } from "@/lib/support-topics";
import { createSupportThread, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_support_01(c: Pick<RouteCtx, "accountRole" | "db" | "id" | "path" | "request" | "requestUrl" | "supportBody" | "supportFile">): Promise<Response | undefined> {
  const { accountRole, db, id, path, request, requestUrl, supportBody, supportFile } = c;
  if (request.method === "GET" && path === "support/attachment") {
    const row = await db
      .prepare(
        "SELECT m.attachment_name,m.attachment_type,m.attachment_data,t.user_id FROM support_messages m JOIN support_threads t ON t.id=m.thread_id WHERE m.id=?",
      )
      .bind(str(requestUrl.searchParams.get("id"), 100))
      .first<{
        attachment_name: string;
        attachment_type: string;
        attachment_data: string;
        user_id: string;
      }>();
    if (
      !row?.attachment_data ||
      (accountRole !== "admin" && row.user_id !== id)
    )
      throw new HttpError(404, "Fayl tapılmadı.");
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
  if (request.method === "POST" && path === "support/create") {
    const body = await supportBody();
    const topic = SUPPORT_TOPICS.some((t) => t.id === body.topic)
      ? String(body.topic)
      : "other";
    const subject = str(body.subject, 160).replace(/\s+/g, " ");
    const text = str(body.body, 4000);
    if (subject.length < 2 || text.length < 2)
      throw new HttpError(400, "Mövzunu və mesajı yazın.");
    const recent = await db
      .prepare(
        "SELECT COUNT(*) AS count FROM support_threads WHERE user_id=? AND created>=datetime('now','-1 day')",
      )
      .bind(id)
      .first<{ count: number }>();
    if (Number(recent?.count) >= 20)
      throw new HttpError(429, "Gündə ən çox 20 sorğu göndərmək olar.");
    const meta =
      body.meta && typeof body.meta === "object" && !Array.isArray(body.meta)
        ? Object.fromEntries(
            Object.entries(body.meta as Record<string, unknown>)
              .slice(0, 10)
              .map(([k, v]) => [str(k, 40), str(v, 300)]),
          )
        : {};
    const threadId = await createSupportThread(db, {
      userId: id,
      role: accountRole,
      topic,
      subject,
      body: text,
      meta,
      attachment: supportFile(body.attachment),
    });
    return ok({ ok: true, id: threadId }, 201);
  }
  if (request.method === "GET" && path === "support") {
    const where = accountRole === "admin" ? "" : "WHERE t.user_id=?";
    const statement =
      db.prepare(`SELECT t.*,COALESCE(a.name,'İstifadəçi') AS user_name,
      (SELECT body FROM support_messages m WHERE m.thread_id=t.id ORDER BY created DESC LIMIT 1) AS last_message,
      (SELECT COUNT(*) FROM support_messages m WHERE m.thread_id=t.id) AS message_count,
      (SELECT COUNT(*) FROM support_messages m WHERE m.thread_id=t.id AND m.author_role='admin' AND m.created>t.user_read) AS unread_replies
      FROM support_threads t LEFT JOIN accounts a ON a.id=t.user_id ${where} ORDER BY t.updated DESC LIMIT 300`);
    const rows =
      accountRole === "admin"
        ? await statement.all()
        : await statement.bind(id).all();
    // Admin sees how fast requests of the last 30 days got their first answer.
    const sla =
      accountRole === "admin"
        ? supportSla(
            (
              await db
                .prepare(
                  `SELECT t.created,(SELECT MIN(m.created) FROM support_messages m WHERE m.thread_id=t.id AND m.author_role='admin') AS firstReply
          FROM support_threads t WHERE t.created>=?`,
                )
                .bind(new Date(Date.now() - 30 * 86400000).toISOString())
                .all<{ created: string; firstReply: string | null }>()
            ).results,
          )
        : null;
    return ok({
      threads: rows.results,
      topics: SUPPORT_TOPICS,
      statuses: SUPPORT_STATUSES,
      sla,
    });
  }
  if (request.method === "GET" && path === "support/thread") {
    const threadId = str(requestUrl.searchParams.get("id"), 100);
    const thread = await db
      .prepare("SELECT * FROM support_threads WHERE id=?")
      .bind(threadId)
      .first<{ user_id: string; status: string }>();
    if (!thread || (accountRole !== "admin" && thread.user_id !== id))
      throw new HttpError(404, "Sorğu tapılmadı.");
    if (accountRole === "admin" && thread.status === "new")
      await db
        .prepare(
          "UPDATE support_threads SET status='read',updated=? WHERE id=?",
        )
        .bind(new Date().toISOString(), threadId)
        .run();
    if (accountRole !== "admin")
      await db
        .prepare("UPDATE support_threads SET user_read=? WHERE id=?")
        .bind(new Date().toISOString(), threadId)
        .run();
    const messages = await db
      .prepare(
        "SELECT id,thread_id,author_id,author_role,body,created,attachment_name,attachment_type FROM support_messages WHERE thread_id=? ORDER BY created",
      )
      .bind(threadId)
      .all();
    return ok({
      thread: {
        ...thread,
        status:
          accountRole === "admin" && thread.status === "new"
            ? "read"
            : thread.status,
      },
      messages: messages.results,
    });
  }
  if (request.method === "POST" && path === "support/reply") {
    const body = await supportBody();
    const threadId = str(body.id, 100);
    const text = str(body.body, 4000);
    const attachment = supportFile(body.attachment);
    if (!text && !attachment) throw new HttpError(400, "Mesajı yazın.");
    const thread = await db
      .prepare("SELECT user_id,status FROM support_threads WHERE id=?")
      .bind(threadId)
      .first<{ user_id: string; status: string }>();
    if (!thread || (accountRole !== "admin" && thread.user_id !== id))
      throw new HttpError(404, "Sorğu tapılmadı.");
    const now = new Date().toISOString();
    const nextStatus =
      accountRole === "admin"
        ? SUPPORT_STATUSES[str(body.status, 20)]
          ? str(body.status, 20)
          : thread.status === "new"
            ? "read"
            : thread.status
        : thread.status === "done" || thread.status === "rejected"
          ? "new"
          : thread.status;
    await db.batch([
      db
        .prepare(
          "INSERT INTO support_messages(id,thread_id,author_id,author_role,body,attachment_name,attachment_type,attachment_data,created) VALUES(?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          threadId,
          id,
          accountRole,
          text,
          attachment?.name || "",
          attachment?.type || "",
          attachment?.data || "",
          now,
        ),
      db
        .prepare("UPDATE support_threads SET status=?,updated=? WHERE id=?")
        .bind(nextStatus, now, threadId),
    ]);
    return ok({ ok: true, status: nextStatus });
  }
  return undefined;
}
