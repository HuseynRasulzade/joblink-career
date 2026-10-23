// The daily job that sends the scheduled summaries. It is called by the Worker's cron trigger
// and by the admin "send now" action.
import { digestSubject, digestText, isDue, normalizeFrequency, type DigestData } from "./digest.ts";

export type Mailer = { send(message: { to: string[]; from: { email: string; name: string }; subject: string; text: string }): Promise<unknown> } | null | undefined;

const DAY = 86400000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function count(db: D1Database, sql: string, ...bind: unknown[]) {
  const row = await db.prepare(sql).bind(...bind).first<{ n: number }>().catch(() => null);
  return Number(row?.n) || 0;
}

export async function buildDigest(db: D1Database, companyId: string, frequency: "weekly" | "monthly", now: Date): Promise<DigestData> {
  const days = frequency === "monthly" ? 30 : 7;
  const to = isoDay(now.getTime() - DAY);
  const from = isoDay(now.getTime() - days * DAY);
  const prevTo = isoDay(now.getTime() - (days + 1) * DAY);
  const prevFrom = isoDay(now.getTime() - (2 * days) * DAY);
  const apps = (a: string, b: string) =>
    count(db, "SELECT COUNT(*) AS n FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.owner=? AND substr(a.created,1,10)>=? AND substr(a.created,1,10)<=?", companyId, a, b);
  const company = await db.prepare("SELECT name FROM accounts WHERE id=?").bind(companyId).first<{ name: string }>().catch(() => null);
  const weekAhead = isoDay(now.getTime() + 7 * DAY);
  const attention = [
    { label: "vakansiya təsdiq gözləyir", count: await count(db, "SELECT COUNT(*) AS n FROM jobs WHERE owner=? AND status='pending_approval'", companyId) },
    { label: "müraciətə 2 gündən çoxdur baxılmayıb", count: await count(db, "SELECT COUNT(*) AS n FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.owner=? AND a.status='Göndərildi' AND a.created<?", companyId, new Date(now.getTime() - 2 * DAY).toISOString()) },
    { label: "test nəticəsinin açıq cavabları yoxlanmalıdır", count: await count(db, "SELECT COUNT(*) AS n FROM assessment_assignments WHERE company_id=? AND review_status='pending' AND status IN ('submitted','expired')", companyId) },
    { label: "təklifə 5 gündən çoxdur cavab verilməyib", count: await count(db, "SELECT COUNT(*) AS n FROM offers WHERE company_id=? AND status='sent' AND created<?", companyId, new Date(now.getTime() - 5 * DAY).toISOString()) },
    { label: "vakansiyanın son tarixinə 7 gündən az qalıb", count: await count(db, "SELECT COUNT(*) AS n FROM jobs WHERE owner=? AND status='published' AND json_extract(data,'$.deadline')<>'' AND json_extract(data,'$.deadline')>=? AND json_extract(data,'$.deadline')<=?", companyId, isoDay(now.getTime()), weekAhead) },
  ].filter((item) => item.count > 0);
  return {
    companyName: company?.name || "Şirkət",
    frequency,
    from,
    to,
    applications: await apps(from, to),
    previousApplications: await apps(prevFrom, prevTo),
    hires: await count(db, "SELECT COUNT(*) AS n FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.owner=? AND a.status='İşə qəbul edildi' AND substr(a.updated,1,10)>=? AND substr(a.updated,1,10)<=?", companyId, from, to),
    attention,
  };
}

// Sends every digest that is due (or all of them with `force`). Returns how many were sent.
export async function runDigests(db: D1Database, mail: Mailer, fromEmail: string | undefined, now = new Date(), force = false) {
  const subs = await db
    .prepare("SELECT user_id,company_id,frequency,last_sent FROM digest_subscriptions WHERE frequency<>'off'")
    .all<{ user_id: string; company_id: string; frequency: string; last_sent: string }>()
    .catch(() => ({ results: [] as { user_id: string; company_id: string; frequency: string; last_sent: string }[] }));
  let sent = 0;
  for (const sub of subs.results) {
    const frequency = normalizeFrequency(sub.frequency);
    if (frequency === "off" || (!force && !isDue(frequency, sub.last_sent, now))) continue;
    try {
      const data = await buildDigest(db, sub.company_id, frequency, now);
      const subject = digestSubject(data);
      const text = digestText(data);
      await db
        .prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)")
        .bind(crypto.randomUUID(), sub.user_id, "digest", subject.slice(0, 200), text.slice(0, 600), "hr-reports", now.toISOString())
        .run();
      if (mail && fromEmail) {
        const account = await db.prepare("SELECT email FROM password_accounts WHERE user_id=?").bind(sub.user_id).first<{ email: string }>();
        if (account?.email) await mail.send({ to: [account.email], from: { email: fromEmail, name: "Joblink" }, subject, text }).catch(() => {});
      }
      await db.prepare("UPDATE digest_subscriptions SET last_sent=? WHERE user_id=?").bind(now.toISOString(), sub.user_id).run();
      sent++;
    } catch {
      // One failing subscription must not stop the others.
    }
  }
  return sent;
}

// Reminds both sides about interviews in the next 30 hours (the job runs once a day).
export async function runInterviewReminders(db: D1Database, mail: Mailer, fromEmail: string | undefined, now = new Date()) {
  const rows = await db
    .prepare(`SELECT i.id,i.scheduled_at,i.kind,i.location,i.company_id,i.candidate_id,i.created_by,COALESCE(json_extract(j.data,'$.title'),'') AS job_title,COALESCE(c.name,'') AS company
      FROM interviews i JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.company_id
      WHERE i.status IN ('scheduled','confirmed') AND i.reminded_at='' AND i.scheduled_at>? AND i.scheduled_at<=?`)
    .bind(now.toISOString(), new Date(now.getTime() + 30 * 3600000).toISOString())
    .all<{ id: string; scheduled_at: string; kind: string; location: string; company_id: string; candidate_id: string; created_by: string; job_title: string; company: string }>()
    .catch(() => ({ results: [] as { id: string; scheduled_at: string; kind: string; location: string; company_id: string; candidate_id: string; created_by: string; job_title: string; company: string }[] }));
  let sent = 0;
  for (const row of rows.results) {
    try {
      const local = new Date(Date.parse(row.scheduled_at) + 4 * 3600000).toISOString().slice(0, 16).replace("T", " ");
      const where = row.location ? `: ${row.location}` : "";
      const text = `Xatırlatma: "${row.job_title}" müsahibəsi ${local} (Bakı vaxtı)${where}.`;
      const targets = [
        { userId: row.candidate_id, link: "applications" },
        { userId: row.created_by || row.company_id, link: "hr-interviews" },
      ];
      for (const target of targets) {
        await db
          .prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)")
          .bind(crypto.randomUUID(), target.userId, "interview", `Müsahibə xatırlatması: ${row.job_title}`, text.slice(0, 600), target.link, now.toISOString())
          .run();
        if (mail && fromEmail) {
          const account = await db.prepare("SELECT email FROM password_accounts WHERE user_id=?").bind(target.userId).first<{ email: string }>();
          if (account?.email) await mail.send({ to: [account.email], from: { email: fromEmail, name: "Joblink" }, subject: `Müsahibə xatırlatması: ${row.job_title}`, text }).catch(() => {});
        }
      }
      await db.prepare("UPDATE interviews SET reminded_at=? WHERE id=?").bind(now.toISOString(), row.id).run();
      sent++;
    } catch {
      // One failing reminder must not stop the others.
    }
  }
  return sent;
}
