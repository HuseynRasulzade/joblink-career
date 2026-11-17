// The e-mails of the scheduled reports (set up in Hesabatlar): each due one is built from the live data and sent to the person who set it up.
import { employeePay } from "./payroll.ts";
import { nextRunAfter, planReportText, type PlanLine } from "./report-text.ts";
import { loadPlanData } from "./api/shared.ts";
import { summarize, unitActive } from "./staff-plan.ts";
import type { Mailer } from "./digest-job.ts";

export async function runReportSchedules(db: D1Database, mail: Mailer, fromEmail: string | undefined, now = new Date()) {
  if (!mail || !fromEmail) return 0;
  const today = now.toISOString().slice(0, 10);
  const due = await db.prepare("SELECT id,company_id,user_id,report_id,frequency FROM report_schedules WHERE next_run<=? LIMIT 200").bind(today).all<{ id: string; company_id: string; user_id: string; report_id: string; frequency: string }>().catch(() => ({ results: [] as { id: string; company_id: string; user_id: string; report_id: string; frequency: string }[] }));
  let sent = 0;
  for (const s of due.results) {
    try {
      // The next date moves first, so a failing send is not retried every day.
      await db.prepare("UPDATE report_schedules SET next_run=?,last_run=? WHERE id=?").bind(nextRunAfter(s.frequency, now), today, s.id).run();
      if (s.report_id !== "staff-plan") continue;
      const [email, company, plan] = await Promise.all([
        db.prepare("SELECT email FROM password_accounts WHERE user_id=?").bind(s.user_id).first<{ email: string }>(),
        db.prepare("SELECT name FROM accounts WHERE id=?").bind(s.company_id).first<{ name: string }>(),
        loadPlanData(db, s.company_id),
      ]);
      if (!email?.email || !plan.units.length) continue;
      const month = today.slice(0, 7);
      const summary = summarize(plan.units, plan.people);
      const cost = (g: number) => (g > 0 ? employeePay(g, "gross", "private").employerCost : 0);
      const lines: PlanLine[] = summary.departments.map((d) => ({ department: d.department, planned: d.planned, filled: d.filled, free: d.free }));
      const costMax = plan.units.filter((u) => unitActive(u, month)).reduce((t, u) => t + cost(u.salaryMax || u.salaryMin) * u.planned * (u.rate || 1), 0);
      const factCost = plan.people.reduce((t, p) => t + cost(p.gross || 0), 0);
      const text = planReportText(company?.name || "Şirkət", lines, { planned: summary.total.planned, filled: summary.total.filled, costMax, factCost }, today);
      await mail.send({ to: [email.email], from: { email: fromEmail, name: "JobMatch" }, subject: text.subject, text: text.text });
      sent += 1;
    } catch {
      // one failing e-mail must not stop the others
    }
  }
  return sent;
}
