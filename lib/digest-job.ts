// The daily job that sends the scheduled summaries. It is called by the Worker's cron trigger
// and by the admin "send now" action.
import { jobMatchesAlert, sanitizeAlertFilters, type AlertJob } from "./job-alerts.ts";
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
      WHERE i.status IN ('scheduled','confirmed') AND i.reminded_at='' AND i.slots='[]' AND i.scheduled_at>? AND i.scheduled_at<=?`)
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

// A candidate who has not started a test two days after it was sent gets one reminder.
export async function runTestReminders(db: D1Database, mail: Mailer, fromEmail: string | undefined, now = new Date()) {
  const rows = await db
    .prepare(`SELECT s.id,s.candidate_id,COALESCE(json_extract(s.snapshot,'$.title'),t.title) AS title,COALESCE(c.name,'') AS company
      FROM assessment_assignments s JOIN assessments t ON t.id=s.assessment_id LEFT JOIN accounts c ON c.id=s.company_id
      WHERE s.status='assigned' AND s.reminded_at='' AND s.assigned_at<? AND s.assigned_at>? LIMIT 200`)
    .bind(new Date(now.getTime() - 2 * DAY).toISOString(), new Date(now.getTime() - 14 * DAY).toISOString())
    .all<{ id: string; candidate_id: string; title: string; company: string }>()
    .catch(() => ({ results: [] as { id: string; candidate_id: string; title: string; company: string }[] }));
  let sent = 0;
  for (const row of rows.results) {
    try {
      const claimed = await db.prepare("UPDATE assessment_assignments SET reminded_at=? WHERE id=? AND reminded_at='' AND status='assigned'").bind(now.toISOString(), row.id).run();
      if (!claimed.meta.changes) continue;
      const text = `${row.company ? `${row.company} sizə` : "Sizə"} “${row.title}” testi göndərib. Test hələ başlanmayıb; platformada “Testlər” bölməsindən verə bilərsiniz.`;
      await db
        .prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)")
        .bind(crypto.randomUUID(), row.candidate_id, "test", `Test xatırlatması: ${row.title}`, text.slice(0, 600), "applications", now.toISOString())
        .run();
      if (mail && fromEmail) {
        const account = await db.prepare("SELECT email FROM password_accounts WHERE user_id=?").bind(row.candidate_id).first<{ email: string }>();
        if (account?.email) await mail.send({ to: [account.email], from: { email: fromEmail, name: "Joblink" }, subject: `Test xatırlatması: ${row.title}`, text }).catch(() => {});
      }
      sent++;
    } catch {
      // One failing reminder must not stop the others.
    }
  }
  return sent;
}

// One reminder to the company when an employee's probation ends within a week.
export async function runProbationReminders(db: D1Database, mail: Mailer, fromEmail: string | undefined, now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const rows = await db
    .prepare("SELECT id,company_id,name,position,probation_end FROM company_employees WHERE status='active' AND probation_reminded=0 AND probation_end<>'' AND probation_end<=? LIMIT 200")
    .bind(new Date(now.getTime() + 7 * DAY).toISOString().slice(0, 10))
    .all<{ id: string; company_id: string; name: string; position: string; probation_end: string }>()
    .catch(() => ({ results: [] as { id: string; company_id: string; name: string; position: string; probation_end: string }[] }));
  let sent = 0;
  for (const row of rows.results) {
    try {
      const claimed = await db.prepare("UPDATE company_employees SET probation_reminded=1 WHERE id=? AND probation_reminded=0").bind(row.id).run();
      if (!claimed.meta.changes) continue;
      const ended = row.probation_end < today;
      const text = `${row.name}${row.position ? ` (${row.position})` : ""} üçün sınaq müddəti ${ended ? "bitib" : "bitir"}: ${row.probation_end}. Qərarı (davam, uzatma və ya xitam) verin.`;
      await db
        .prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)")
        .bind(crypto.randomUUID(), row.company_id, "employee", `Sınaq müddəti: ${row.name}`, text.slice(0, 600), "hr-employees", now.toISOString())
        .run();
      if (mail && fromEmail) {
        const account = await db.prepare("SELECT email FROM password_accounts WHERE user_id=?").bind(row.company_id).first<{ email: string }>();
        if (account?.email) await mail.send({ to: [account.email], from: { email: fromEmail, name: "Joblink" }, subject: `Sınaq müddəti: ${row.name}`, text }).catch(() => {});
      }
      sent++;
    } catch {
      // One failing reminder must not stop the others.
    }
  }
  return sent;
}

// Tells each candidate about vacancies published since their alert last ran (at most 5 titles per alert).
export async function runJobAlerts(db: D1Database, mail: Mailer, fromEmail: string | undefined, now = new Date()) {
  const alerts = await db
    .prepare("SELECT id,user_id,name,filters,seen FROM job_alerts LIMIT 2000")
    .all<{ id: string; user_id: string; name: string; filters: string; seen: string }>()
    .catch(() => ({ results: [] as { id: string; user_id: string; name: string; filters: string; seen: string }[] }));
  if (!alerts.results.length) return 0;
  const jobs = await db
    .prepare("SELECT id,owner,created,data FROM jobs WHERE status='published' AND created>? ORDER BY created DESC LIMIT 1000")
    .bind(new Date(now.getTime() - 45 * DAY).toISOString())
    .all<{ id: string; owner: string; created: string; data: string }>()
    .catch(() => ({ results: [] as { id: string; owner: string; created: string; data: string }[] }));
  const today = now.toISOString().slice(0, 10);
  const parsed = jobs.results.flatMap((r) => {
    try {
      const d = JSON.parse(r.data) as AlertJob & { deadline?: string; demo?: boolean };
      if (d.demo || (d.deadline && d.deadline < today)) return [];
      return [{ id: r.id, owner: r.owner, created: r.created, job: { ...d, skills: Array.isArray(d.skills) ? d.skills : [] } }];
    } catch {
      return [];
    }
  });
  let sent = 0;
  for (const alert of alerts.results) {
    try {
      const filters = sanitizeAlertFilters(JSON.parse(alert.filters));
      const blocked = await db.prepare("SELECT target_id FROM relations WHERE kind='block' AND actor_id=?").bind(alert.user_id).all<{ target_id: string }>().catch(() => ({ results: [] as { target_id: string }[] }));
      const hidden = new Set(blocked.results.map((b) => b.target_id));
      let seen: string[] = [];
      try { seen = JSON.parse(alert.seen) as string[]; } catch { seen = []; }
      const known = new Set(seen);
      const fresh = parsed.filter((p) => !known.has(p.id) && p.owner !== alert.user_id && !hidden.has(p.owner) && jobMatchesAlert(p.job, filters));
      await db.prepare("UPDATE job_alerts SET last_check=?,seen=? WHERE id=?").bind(now.toISOString(), JSON.stringify([...fresh.map((p) => p.id), ...seen].slice(0, 300)), alert.id).run();
      if (!fresh.length) continue;
      const titles = fresh.slice(0, 5).map((p) => `${p.job.title} — ${p.job.company}${p.job.city ? ` (${p.job.city})` : ""}`);
      const text = `“${alert.name}” xəbərdarlığınıza uyğun ${fresh.length} yeni vakansiya var:\n${titles.join("\n")}${fresh.length > 5 ? `\n… və daha ${fresh.length - 5} vakansiya` : ""}\n\nJoblink-də baxın.`;
      await db
        .prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)")
        .bind(crypto.randomUUID(), alert.user_id, "job-alert", `Yeni vakansiya: ${alert.name}`, text.slice(0, 600), "jobs", now.toISOString())
        .run();
      if (mail && fromEmail) {
        const account = await db.prepare("SELECT email FROM password_accounts WHERE user_id=?").bind(alert.user_id).first<{ email: string }>();
        if (account?.email) await mail.send({ to: [account.email], from: { email: fromEmail, name: "Joblink" }, subject: `Yeni vakansiya: ${alert.name}`, text }).catch(() => {});
      }
      sent++;
    } catch {
      // One failing alert must not stop the others.
    }
  }
  return sent;
}

// One reminder three days before a paid plan period ends.
export async function runPlanReminders(db: D1Database, mail: Mailer, fromEmail: string | undefined, now = new Date()) {
  const rows = await db
    .prepare("SELECT s.id,s.account_id,s.plan_id,s.period_end,s.auto_renew,COALESCE(a.role,'candidate') AS role FROM subscriptions s LEFT JOIN accounts a ON a.id=s.account_id WHERE s.status='active' AND s.renewal_reminded=0 AND s.period_end>? AND s.period_end<=? LIMIT 500")
    .bind(now.toISOString(), new Date(now.getTime() + 3 * DAY).toISOString())
    .all<{ id: string; account_id: string; plan_id: string; period_end: string; auto_renew: number; role: string }>()
    .catch(() => ({ results: [] as { id: string; account_id: string; plan_id: string; period_end: string; auto_renew: number; role: string }[] }));
  let sent = 0;
  for (const row of rows.results) {
    try {
      const claimed = await db.prepare("UPDATE subscriptions SET renewal_reminded=1 WHERE id=? AND renewal_reminded=0").bind(row.id).run();
      if (!claimed.meta.changes) continue;
      const text = `Paketinizin dövrü ${row.period_end.slice(0, 10)} tarixində bitir. ${row.auto_renew ? "Avtomatik yenilənmə aktivdir, kartınızdan ödəniş götürüləcək." : "Avtomatik yenilənmə söndürülüdür; davam etmək üçün paketi yeniləyin."}`;
      await db
        .prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)")
        .bind(crypto.randomUUID(), row.account_id, "plan", "Paketin müddəti bitir", text, row.role === "company" ? "hr-billing" : "packages", now.toISOString())
        .run();
      if (mail && fromEmail) {
        const account = await db.prepare("SELECT email FROM password_accounts WHERE user_id=?").bind(row.account_id).first<{ email: string }>();
        if (account?.email) await mail.send({ to: [account.email], from: { email: fromEmail, name: "Joblink" }, subject: "Joblink: paketin müddəti bitir", text }).catch(() => {});
      }
      sent++;
    } catch {
      // One failing reminder must not stop the others.
    }
  }
  return sent;
}

// Vacancy views are kept for a limited time only.
export async function purgeOldJobViews(db: D1Database, now = new Date()) {
  const cutoff = new Date(now.getTime() - 180 * DAY).toISOString().slice(0, 10);
  const result = await db.prepare("DELETE FROM job_views WHERE day<?").bind(cutoff).run().catch(() => null);
  return result?.meta?.changes || 0;
}
