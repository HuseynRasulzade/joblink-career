// Surveys that repeat (a monthly pulse, a quarterly eNPS): when the interval since the last one has passed, the daily job
// closes the old round and opens a new one with the same questions, and tells the employees.
export const addMonths = (iso: string, months: number) => {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString();
};

export async function runSurveyRecurrence(db: D1Database, now = new Date()) {
  let opened = 0;
  const rows = await db
    .prepare("SELECT id,company_id,title,kind,questions,anonymous,repeat_months,series_id,created FROM surveys WHERE repeat_months>0 ORDER BY created DESC LIMIT 2000")
    .all<{ id: string; company_id: string; title: string; kind: string; questions: string; anonymous: number; repeat_months: number; series_id: string; created: string }>()
    .catch(() => ({ results: [] as never[] }));
  const seen = new Set<string>();
  for (const latest of rows.results) {
    const series = latest.series_id || latest.id;
    if (seen.has(series)) continue; // newest first: the first row of a series is its latest round
    seen.add(series);
    if (addMonths(latest.created, latest.repeat_months) > now.toISOString()) continue;
    try {
      const id = crypto.randomUUID();
      await db.batch([
        db.prepare("UPDATE surveys SET status='closed' WHERE company_id=? AND (series_id=? OR id=?) AND status='open'").bind(latest.company_id, series, series),
        db.prepare("INSERT INTO surveys(id,company_id,title,kind,questions,anonymous,status,created,repeat_months,series_id) VALUES(?,?,?,?,?,?,'open',?,?,?)").bind(id, latest.company_id, latest.title, latest.kind, latest.questions, latest.anonymous, now.toISOString(), latest.repeat_months, series),
        // the repeat setting moves to the new round, so one round of a series repeats
        db.prepare("UPDATE surveys SET repeat_months=0 WHERE company_id=? AND (series_id=? OR id=?) AND id<>?").bind(latest.company_id, series, series, id),
      ]);
      const people = await db.prepare("SELECT user_id FROM company_employees WHERE company_id=? AND status IN ('active','leave') AND user_id<>''").bind(latest.company_id).all<{ user_id: string }>();
      for (const p of people.results.slice(0, 400))
        await db.prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)").bind(crypto.randomUUID(), p.user_id, "application", `Yeni sorğu: ${latest.title}`, "Fikrinizi bildirmək üçün İş yerim → Elanlar və sorğular bölməsinə baxın.", "workplace", now.toISOString()).run();
      opened++;
    } catch {
      // One company's failure does not stop the others.
    }
  }
  return opened;
}
