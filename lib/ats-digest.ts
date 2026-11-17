// Twice a week (Tuesday and Friday) the hiring team gets a note when candidates have not moved for a week; nothing is sent when none wait.
import { notifyCompanyRoles } from "./api-core";
import { atsDigestText } from "./ats-digest-text.ts";

export async function runAtsDigest(db: D1Database, now = new Date(), force = false) {
  const day = now.getUTCDay();
  if (day !== 2 && day !== 5 && !force) return 0;
  const cutoff = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const rows = await db
    .prepare("SELECT j.owner AS company_id,COUNT(*) AS stale,SUM(CASE WHEN a.status='Göndərildi' THEN 1 ELSE 0 END) AS unanswered,MIN(COALESCE(NULLIF(a.updated,''),a.created)) AS oldest FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.status='published' AND j.owner NOT LIKE 'external-%' AND a.status IN ('Göndərildi','Baxışda','Müsahibə','Təklif edildi') AND COALESCE(NULLIF(a.updated,''),a.created)<? GROUP BY j.owner")
    .bind(cutoff)
    .all<{ company_id: string; stale: number; unanswered: number; oldest: string }>()
    .catch(() => ({ results: [] as { company_id: string; stale: number; unanswered: number; oldest: string }[] }));
  let sent = 0;
  for (const r of rows.results) {
    try {
      const oldestDays = Math.max(0, Math.floor((now.getTime() - Date.parse(r.oldest)) / 86_400_000));
      const text = atsDigestText({ stale: Number(r.stale) || 0, oldestDays, unanswered: Number(r.unanswered) || 0 });
      if (!text) continue;
      await notifyCompanyRoles(db, r.company_id, "approve-hr", { type: "ats_digest", title: text.title, body: text.body, link: "hr-ats" });
      sent += 1;
    } catch {
      // one company's failure must not stop the others
    }
  }
  return sent;
}
