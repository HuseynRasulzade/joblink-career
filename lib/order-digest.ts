// Twice a week (Monday and Thursday) the people who handle orders get a note when orders wait too long; nothing is sent when none do.
import { notifyCompanyRoles } from "./api-core";
import { orderDigestText } from "./order-digest-text.ts";

export async function runOrderDigest(db: D1Database, now = new Date(), force = false) {
  const day = now.getUTCDay();
  if (day !== 1 && day !== 4 && !force) return 0;
  const cutoff = new Date(now.getTime() - 3 * 86_400_000).toISOString();
  const rows = await db
    .prepare("SELECT company_id,SUM(CASE WHEN status='pending' AND updated<? THEN 1 ELSE 0 END) AS stale,SUM(CASE WHEN status='returned' THEN 1 ELSE 0 END) AS returned,MIN(CASE WHEN status='pending' AND updated<? THEN updated END) AS oldest FROM employee_orders WHERE status<>'signed' GROUP BY company_id")
    .bind(cutoff, cutoff)
    .all<{ company_id: string; stale: number; returned: number; oldest: string | null }>()
    .catch(() => ({ results: [] as { company_id: string; stale: number; returned: number; oldest: string | null }[] }));
  let sent = 0;
  for (const r of rows.results) {
    try {
      const oldestDays = r.oldest ? Math.max(0, Math.floor((now.getTime() - Date.parse(r.oldest)) / 86_400_000)) : 0;
      const text = orderDigestText({ stale: Number(r.stale) || 0, oldestDays, returned: Number(r.returned) || 0 });
      if (!text) continue;
      await notifyCompanyRoles(db, r.company_id, "orders", { type: "order_digest", title: text.title, body: text.body, link: "hr-orders" });
      sent += 1;
    } catch {
      // one company's failure must not stop the others
    }
  }
  return sent;
}
