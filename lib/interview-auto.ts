// A held interview is closed by itself: once its time (and a short grace) is over, an interview that was planned or confirmed
// becomes «completed», the application's history says so, and the owner and the person who set it up are asked for the opinion.
// Nobody has to mark it by hand; a candidate who did not come can still be marked as such until the opinion is written.
const GRACE_MINUTES = 30;

export async function completePastInterviews(db: D1Database, companyId = ""): Promise<number> {
  const rows = (
    await db
      .prepare(
        `SELECT i.id,i.application_id,i.company_id,i.created_by,COALESCE(c.name,'') AS candidate,COALESCE(json_extract(j.data,'$.title'),'') AS title
         FROM interviews i JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.candidate_id
         WHERE i.status IN ('scheduled','confirmed')
           AND datetime(i.scheduled_at,'+' || (COALESCE(i.duration_min,60) + ?) || ' minutes') < datetime('now')
           AND (?='' OR i.company_id=?)
         LIMIT 200`,
      )
      .bind(GRACE_MINUTES, companyId, companyId)
      .all<{ id: string; application_id: string; company_id: string; created_by: string; candidate: string; title: string }>()
      .catch(() => ({ results: [] as { id: string; application_id: string; company_id: string; created_by: string; candidate: string; title: string }[] }))
  ).results;
  const now = new Date().toISOString();
  let done = 0;
  for (const row of rows) {
    // The status is claimed first, so two requests at once cannot send the reminder twice.
    const claimed = await db.prepare("UPDATE interviews SET status='completed',updated=? WHERE id=? AND status IN ('scheduled','confirmed')").bind(now, row.id).run();
    if (!claimed.meta.changes) continue;
    done += 1;
    await db
      .prepare("INSERT INTO application_events(id,application_id,actor_id,actor_role,type,from_value,to_value,note,created) VALUES(?,?,?,?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), row.application_id, "", "system", "interview", "", "keçirildi (avtomatik)", "", now)
      .run()
      .catch(() => undefined);
    for (const userId of new Set([row.company_id, row.created_by].filter(Boolean))) {
      await db
        .prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)")
        .bind(crypto.randomUUID(), userId, "interview", "Müsahibə keçirildi: rəy yazın", `${row.candidate || "Namizəd"} · ${row.title}. Rəy yazılana qədər müraciət “Müsahibə” mərhələsində qalır. Namizəd gəlməyibsə, müsahibədə “gəlmədi” qeyd edin.`.slice(0, 600), "hr-interviews", now)
        .run()
        .catch(() => undefined);
    }
  }
  return done;
}
