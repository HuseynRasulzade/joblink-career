// Shared helpers of the API route: notifications and e-mail, audit trail, application events,
// message bookkeeping and the closing of expired employer tests.
import { runtime, HttpError } from "./server";
import type { Job } from "./model";
import { AUTO_EMAIL_TYPES, emailAllowedFor, sanitizeEmailOff } from "./notification-prefs";
import { planOf } from "./plan-service";
import { providerFor } from "./payments";
import type { University } from "./university-catalog";
import type { Major } from "./major-catalog";
import { can, type CompanyPermission } from "./company";
import { GRACE_MS, cleanAnswers, combinedScore, outcomeTarget, parseSnapshot, type Question } from "./assessments";
export async function recordApplicationEvent(
  db: D1Database,
  event: { applicationId: string; actorId: string; actorRole: string; type: string; from?: string; to?: string; note?: string },
) {
  await db
    .prepare("INSERT INTO application_events(id,application_id,actor_id,actor_role,type,from_value,to_value,note,created) VALUES(?,?,?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), event.applicationId, event.actorId, event.actorRole, event.type, event.from || "", event.to || "", event.note || "", new Date().toISOString())
    .run();
}
// Either side blocking the other stops messages, applications and visibility.
export async function blockedBetween(db: D1Database, a: string, b: string) {
  try {
    return !!(await db
      .prepare("SELECT 1 FROM relations WHERE kind='block' AND ((actor_id=? AND target_id=?) OR (actor_id=? AND target_id=?))")
      .bind(a, b, b, a)
      .first());
  } catch {
    return false;
  }
}
export async function sendUserEmail(db: D1Database, userId: string, subject: string, text: string, type = "") {
  const settings = runtime();
  if (!settings.EMAIL || !settings.EMAIL_FROM) return;
  // The person may have switched this category of e-mail off.
  if (type) {
    const prefs = await db.prepare("SELECT email_off FROM notification_prefs WHERE user_id=?").bind(userId).first<{ email_off: string }>().catch(() => null);
    let off: string[] = [];
    try { off = prefs ? sanitizeEmailOff(JSON.parse(prefs.email_off)) : []; } catch { off = []; }
    if (!emailAllowedFor(off, type)) return;
  }
  const account = await db.prepare("SELECT email FROM password_accounts WHERE user_id=?").bind(userId).first<{ email: string }>();
  if (!account?.email) return;
  try {
    await settings.EMAIL.send({ to: [account.email], from: { email: settings.EMAIL_FROM, name: "Joblink" }, subject, text });
  } catch {
    // E-mail is best-effort; the in-app notification is the record.
  }
}
export async function notify(
  db: D1Database,
  input: { userId: string; type: string; title: string; body?: string; link?: string },
) {
  try {
    await db
      .prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)")
      .bind(crypto.randomUUID(), input.userId, input.type, input.title.slice(0, 200), (input.body || "").slice(0, 600), input.link || "", new Date().toISOString())
      .run();
  } catch {
    // Notifications are best-effort.
  }
  // Status, offer, test, billing and review notifications also go out by e-mail.
  if (AUTO_EMAIL_TYPES.has(input.type)) await sendUserEmail(db, input.userId, input.title, `${input.body || input.title}\n\nJoblink-də baxın.`, input.type);
}
// Followers hear about new vacancies (in-app; e-mail when configured).
export async function notifyFollowers(db: D1Database, companyId: string, j: Job) {
  const followerRows = await db
    .prepare("SELECT actor_id FROM relations WHERE target_id=? AND kind='follow' LIMIT 500")
    .bind(companyId)
    .all<{ actor_id: string }>()
    .catch(() => ({ results: [] as { actor_id: string }[] }));
  const enforced = runtime().BILLING_ENFORCED === "1";
  for (const follower of followerRows.results) {
    await notify(db, { userId: follower.actor_id, type: "followed-job", title: `${j.company}: yeni vakansiya — ${j.title}`, link: "jobs" });
    // With packages, e-mails about followed companies are part of the paid packages.
    if (enforced && !(await planOf(db, follower.actor_id, providerFor(runtime().PAYMENT_PROVIDER))).limits.digestEmail) continue;
    await sendUserEmail(db, follower.actor_id, `${j.company}: yeni vakansiya — ${j.title}`, `İzlədiyiniz ${j.company} şirkəti yeni vakansiya paylaşdı: ${j.title} (${j.city}). Joblink-də baxın.`, "followed-job");
  }
}
// Universities and programmes the administrator added from candidates' requests.
export async function readCustomEducation(db: D1Database) {
  const rows = await db
    .prepare("SELECT id,kind,label,label_en,label_ru,extra,aliases FROM custom_education_items ORDER BY created DESC")
    .all<{ id: string; kind: string; label: string; label_en: string; label_ru: string; extra: string; aliases: string }>()
    .catch(() => ({ results: [] as { id: string; kind: string; label: string; label_en: string; label_ru: string; extra: string; aliases: string }[] }));
  const universities: University[] = [];
  const majors: Major[] = [];
  for (const r of rows.results) {
    const aliases = (() => {
      try {
        return (JSON.parse(r.aliases) as unknown[]).filter((a): a is string => typeof a === "string");
      } catch {
        return [];
      }
    })();
    const names = [r.label, r.label_en || r.label, r.label_ru || r.label];
    if (r.kind === "university") universities.push({ id: `custom:${r.id}`, label: r.label, labelEn: names[1], labelRu: names[2], country: r.extra, aliases: [...names, ...aliases] });
    else if (r.kind === "major") majors.push({ id: `custom:${r.id}`, label: r.label, labelEn: names[1], labelRu: names[2], field: r.extra, aliases: [...names, ...aliases] });
  }
  return { universities, majors };
}
// Company-side records of who did what (team, approvals, salaries, files).
export async function companyAudit(db: D1Database, companyId: string, actorId: string, action: string, target = "", detail = "") {
  try {
    await db
      .prepare("INSERT INTO company_audit(id,company_id,actor_id,action,target,detail,created) VALUES(?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), companyId, actorId, action, target, detail.slice(0, 500), new Date().toISOString())
      .run();
  } catch {
    // Audit is best-effort before migration 0019 is applied.
  }
}
// Team members holding a permission (the account owner always counts).
export async function companyUsersWith(db: D1Database, companyId: string, permission: CompanyPermission) {
  const rows = await db
    .prepare("SELECT user_id,role FROM company_members WHERE company_id=? AND status='active'")
    .bind(companyId)
    .all<{ user_id: string; role: string }>()
    .catch(() => ({ results: [] as { user_id: string; role: string }[] }));
  return [companyId, ...rows.results.filter((r) => can(r.role, permission)).map((r) => r.user_id)];
}
export async function notifyCompanyRoles(db: D1Database, companyId: string, permission: CompanyPermission, input: { type: string; title: string; body?: string; link?: string }) {
  // Notifications for the company are read from the company inbox; members
  // with the permission also get an e-mail when sending is configured.
  await notify(db, { userId: companyId, ...input });
  for (const user of (await companyUsersWith(db, companyId, permission)).slice(1))
    await sendUserEmail(db, user, input.title, `${input.body || input.title}\n\nJoblink-də baxın.`, input.type);
}
// A test that was started but not handed in by its deadline (plus one minute) is
// closed with the answers saved so far, instead of staying "in progress" forever.
// Moves the application after a fully graded test when the test was set up to do so (once per attempt).
export async function applyTestOutcome(db: D1Database, assignmentId: string) {
  const row = await db
    .prepare(`SELECT s.id,s.application_id,s.snapshot,s.score,s.max_score,s.review_status,s.outcome_applied,a.status,a.candidate_id,
        json_extract(j.data,'$.title') AS title,json_extract(j.data,'$.company') AS company
      FROM assessment_assignments s JOIN applications a ON a.id=s.application_id JOIN jobs j ON j.id=a.job_id WHERE s.id=?`)
    .bind(assignmentId)
    .first<{ id: string; application_id: string; snapshot: string; score: number; max_score: number; review_status: string; outcome_applied: number; status: string; candidate_id: string; title: string; company: string }>()
    .catch(() => null);
  const copy = row && parseSnapshot(row.snapshot);
  if (!row || !copy || row.outcome_applied || row.review_status === "pending") return;
  const claimed = await db.prepare("UPDATE assessment_assignments SET outcome_applied=1 WHERE id=? AND outcome_applied=0").bind(row.id).run();
  if (!claimed.meta.changes) return;
  const target = outcomeTarget(copy, row.score, row.max_score, row.status);
  if (!target) return;
  const pendingOffer = await db.prepare("SELECT id FROM offers WHERE application_id=? AND status='sent'").bind(row.application_id).first().catch(() => null);
  if (pendingOffer) return;
  await db.prepare("UPDATE applications SET status=?,stage='',updated=? WHERE id=?").bind(target, new Date().toISOString(), row.application_id).run();
  await recordApplicationEvent(db, { applicationId: row.application_id, actorId: "", actorRole: "system", type: "status", from: row.status, to: target, note: `test nəticəsi: ${copy.title}` });
  await notify(db, { userId: row.candidate_id, type: "application-status", title: `${row.title}: ${target}`, body: `${row.company} müraciətinizin statusunu yenilədi.`, link: "applications" });
}
export async function closeExpiredAssignments(db: D1Database, where: { companyId?: string; candidateId?: string; assignmentId?: string }) {
  const filters = [where.companyId ? "s.company_id=?" : "", where.candidateId ? "s.candidate_id=?" : "", where.assignmentId ? "s.id=?" : ""].filter(Boolean);
  const rows = await db
    .prepare(`SELECT s.id,s.application_id,s.company_id,s.deadline_at,s.answers,s.snapshot,t.questions,t.title FROM assessment_assignments s
      JOIN assessments t ON t.id=s.assessment_id
      WHERE s.status='started' AND s.deadline_at<>'' AND s.deadline_at<? ${filters.map((f) => `AND ${f}`).join(" ")} LIMIT 100`)
    .bind(new Date(Date.now() - GRACE_MS).toISOString(), ...[where.companyId, where.candidateId, where.assignmentId].filter((v): v is string => !!v))
    .all<{ id: string; application_id: string; company_id: string; deadline_at: string; answers: string; snapshot: string; questions: string; title: string }>()
    .catch(() => ({ results: [] as { id: string; application_id: string; company_id: string; deadline_at: string; answers: string; snapshot: string; questions: string; title: string }[] }));
  for (const row of rows.results) {
    const snapshot = parseSnapshot(row.snapshot);
    const questions = snapshot?.questions || (JSON.parse(row.questions) as Question[]);
    let saved: unknown = {};
    try {
      saved = JSON.parse(row.answers);
    } catch {
      saved = {};
    }
    const answers = cleanAnswers(questions, saved);
    const result = combinedScore(questions, answers, {});
    const updated = await db
      .prepare("UPDATE assessment_assignments SET status='expired',submitted_at=?,answers=?,score=?,max_score=?,review_status=? WHERE id=? AND status='started'")
      .bind(row.deadline_at, JSON.stringify(answers), result.score, result.max, result.state, row.id)
      .run();
    if (!updated.meta.changes) continue;
    await recordApplicationEvent(db, { applicationId: row.application_id, actorId: row.company_id, actorRole: "company", type: "test", to: `${row.title}: vaxt bitdi` });
    await applyTestOutcome(db, row.id);
    await notify(db, { userId: row.company_id, type: "test", title: `Testin vaxtı bitdi: ${row.title}`, body: result.max ? `Son yadda saxlanmış cavablarla avtomatik bal: ${result.score}/${result.max}` : "", link: "hr-tests" });
  }
}
export async function hasUnreadFrom(db: D1Database, threadId: string, senderId: string) {
  const row = await db
    .prepare(`SELECT 1 AS x FROM messages m JOIN message_threads t ON t.id=m.thread_id
      WHERE m.thread_id=? AND m.sender_id=? AND m.created > CASE WHEN t.company_id=? THEN t.candidate_read ELSE t.company_read END LIMIT 1`)
    .bind(threadId, senderId, senderId)
    .first();
  return !!row;
}
export async function senderLabel(db: D1Database, accountRole: string, accountId: string, userId: string) {
  const row = await db.prepare("SELECT name FROM accounts WHERE id=?").bind(accountRole === "company" ? accountId : userId).first<{ name: string }>();
  return row?.name || "Joblink";
}
// At most 20 messages per five minutes for each real sender, so one account
// cannot flood a conversation.
export async function assertMessageRate(db: D1Database, authorId: string) {
  const since = new Date(Date.now() - 5 * 60_000).toISOString();
  const row = await db.prepare("SELECT COUNT(*) AS n FROM messages WHERE author_id=? AND created>?").bind(authorId, since).first<{ n: number }>().catch(() => null);
  if (Number(row?.n) >= 20) throw new HttpError(429, "Çox mesaj göndərdiniz. Bir neçə dəqiqə gözləyin.");
}
// The other side gets one notification for a run of unread messages, not one per message.
export async function notifyNewMessage(db: D1Database, input: { threadId: string; recipientId: string; senderName: string; unreadBefore: boolean; preview: string }) {
  if (input.unreadBefore) return;
  await notify(db, { userId: input.recipientId, type: "message", title: `Yeni mesaj: ${input.senderName}`, body: input.preview.slice(0, 120), link: "messages" });
}
