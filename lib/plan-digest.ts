// A weekly note (Mondays) to the people who may approve as a director: how far the headcount is from the plan, how many places are free,
// and how many requests wait. Nothing is sent when everything is in order.
import { notifyCompanyRoles } from "./api-core";

import { planDigestText } from "./plan-digest-text.ts";

export async function runPlanDigest(db: D1Database, now = new Date()) {
  if (now.getUTCDay() !== 1) return 0;
  const companies = await db.prepare("SELECT DISTINCT company_id FROM staff_units").all<{ company_id: string }>().catch(() => ({ results: [] as { company_id: string }[] }));
  const month = now.toISOString().slice(0, 7);
  let sent = 0;
  for (const { company_id } of companies.results) {
    try {
      const [units, people, pending] = await Promise.all([
        db.prepare("SELECT planned,start_month,end_month FROM staff_units WHERE company_id=?").bind(company_id).all<{ planned: number; start_month: string; end_month: string }>(),
        db.prepare("SELECT COUNT(*) AS n FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(company_id).first<{ n: number }>(),
        db.prepare("SELECT COUNT(*) AS n FROM approval_requests WHERE company_id=? AND status='pending' AND kind IN ('headcount','salary')").bind(company_id).first<{ n: number }>(),
      ]);
      const planned = units.results.filter((u) => (!u.start_month || u.start_month <= month) && (!u.end_month || month <= u.end_month)).reduce((sum, u) => sum + Number(u.planned || 0), 0);
      const text = planDigestText({ planned, filled: Number(people?.n) || 0, pending: Number(pending?.n) || 0 });
      if (!text) continue;
      await notifyCompanyRoles(db, company_id, "approve-director", { type: "plan_digest", title: text.title, body: text.body, link: "hr-planfact" });
      sent += 1;
    } catch {
      // one company's failure must not stop the others
    }
  }
  return sent;
}
