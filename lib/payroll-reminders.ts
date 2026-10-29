// The daily job: tells a company when an advance day is near, when a month's pay is not yet approved close to the pay day,
// and when a past month was never approved. Each reminder is sent once.
import { paymentDate } from "./payroll-calc.ts";
import { deadlinesOf } from "./hr-deadlines.ts";

const DAY = 86_400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

export function dueReminders(input: { today: string; advanceDay: number; payDay: number; currentApproved: boolean; previousApproved: boolean; hasPrevious: boolean }) {
  const year = Number(input.today.slice(0, 4));
  const month = Number(input.today.slice(5, 7));
  const key = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
  const current = key(year, month);
  const prev = month === 1 ? key(year - 1, 12) : key(year, month - 1);
  const out: { key: string; title: string; body: string }[] = [];
  const t = Date.parse(`${input.today}T00:00:00Z`);
  const advanceDate = input.advanceDay ? paymentDate(year, month, input.advanceDay) : "";
  if (advanceDate && iso(new Date(t + DAY)) === advanceDate) {
    out.push({ key: `${current}-advance`, title: "Sabah avans günüdür", body: "Avans üçün ödəniş sənədini hazırlayın və direktora təsdiqə göndərin: Əmək haqqı → Bank və ödəniş sənədləri." });
  }
  const payDate = paymentDate(year, month, input.payDay || 28);
  const daysToPay = Math.round((Date.parse(`${payDate}T00:00:00Z`) - t) / DAY);
  if (!input.currentApproved && daysToPay >= 0 && daysToPay <= 3) {
    out.push({ key: `${current}-approve`, title: "Əmək haqqı cədvəli təsdiqlənməyib", body: `Ödəniş günü ${payDate}. ${current} ayının cədvəlini yoxlayıb təsdiqləyin ki, ödəniş vaxtında olsun (Əmək M. 172).` });
  }
  if (input.hasPrevious && !input.previousApproved && Number(input.today.slice(8, 10)) >= 3) {
    out.push({ key: `${prev}-late`, title: "Əvvəlki ayın cədvəli təsdiqlənməyib", body: `${prev} ayı üçün əmək haqqı cədvəli hələ təsdiqlənməyib. Gecikmə işçilərin hüququnu pozur.` });
  }
  return out;
}

export async function runPayrollReminders(db: D1Database, now = new Date()) {
  const today = iso(now);
  const month = today.slice(0, 7);
  const prev = iso(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 2, 1))).slice(0, 7);
  const companies = await db
    .prepare("SELECT DISTINCT company_id FROM company_employees WHERE status IN ('active','leave') AND salary_cents>0 LIMIT 2000")
    .all<{ company_id: string }>()
    .catch(() => ({ results: [] as { company_id: string }[] }));
  let sent = 0;
  for (const { company_id } of companies.results) {
    try {
      const [settings, runs, first] = await Promise.all([
        db.prepare("SELECT advance_day,pay_day FROM payroll_settings WHERE company_id=?").bind(company_id).first<{ advance_day: number; pay_day: number }>(),
        db.prepare("SELECT month FROM payroll_runs WHERE company_id=? AND status='approved' AND month IN (?,?)").bind(company_id, month, prev).all<{ month: string }>(),
        db.prepare("SELECT MIN(start_date) AS d FROM company_employees WHERE company_id=? AND status<>'removed' AND start_date<>''").bind(company_id).first<{ d: string }>(),
      ]);
      const approved = new Set(runs.results.map((r) => r.month));
      const due = dueReminders({
        today,
        advanceDay: settings?.advance_day || 0,
        payDay: settings?.pay_day || 28,
        currentApproved: approved.has(month),
        previousApproved: approved.has(prev),
        hasPrevious: !!first?.d && first.d.slice(0, 7) <= prev,
      });
      for (const item of due) {
        const claimed = await db.prepare("INSERT OR IGNORE INTO payroll_reminders(company_id,key,created) VALUES(?,?,?)").bind(company_id, item.key, now.toISOString()).run();
        if (!claimed.meta.changes) continue;
        await db
          .prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)")
          .bind(crypto.randomUUID(), company_id, "payroll", item.title, item.body, "hr-payroll", now.toISOString())
          .run();
        sent++;
      }
    } catch {
      // One company's failure does not stop the others.
    }
  }
  return sent;
}

// A month ahead of a document or identity card running out the company is told once.
export async function runDeadlineReminders(db: D1Database, now = new Date()) {
  const today = iso(now);
  let sent = 0;
  const companies = await db
    .prepare("SELECT DISTINCT company_id FROM company_employees WHERE status IN ('active','leave') LIMIT 2000")
    .all<{ company_id: string }>()
    .catch(() => ({ results: [] as { company_id: string }[] }));
  for (const { company_id } of companies.results) {
    try {
      const [people, docs] = await Promise.all([
        db.prepare("SELECT id,name,profile FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(company_id).all<{ id: string; name: string; profile: string }>(),
        db.prepare("SELECT id,employee_id,subtype,name,expires FROM employee_documents WHERE company_id=? AND expires<>''").bind(company_id).all<{ id: string; employee_id: string; subtype: string; name: string; expires: string }>(),
      ]);
      const parsed = people.results.map((p) => {
        let profile: { idExpires?: string; disabilityUntil?: string } = {};
        try {
          profile = JSON.parse(p.profile || "{}");
        } catch {
          // A broken profile has no dates.
        }
        return { id: p.id, name: p.name, profile };
      });
      const due = deadlinesOf(parsed, docs.results.map((d) => ({ id: d.id, employeeId: d.employee_id, label: d.subtype || d.name, expires: d.expires })), today, 30);
      for (const item of due) {
        const claimed = await db.prepare("INSERT OR IGNORE INTO payroll_reminders(company_id,key,created) VALUES(?,?,?)").bind(company_id, item.key, now.toISOString()).run();
        if (!claimed.meta.changes) continue;
        await db
          .prepare("INSERT INTO notifications(id,user_id,type,title,body,link,read,created) VALUES(?,?,?,?,?,?,0,?)")
          .bind(crypto.randomUUID(), company_id, "employee", `${item.employeeName}: ${item.what} ${item.days < 0 ? "müddəti bitib" : `${item.days} gün sonra bitir`}`, `Müddət: ${item.date}. Sənəd reyestrində yeniləyin.`, "hr-people-ops", now.toISOString())
          .run();
        sent++;
      }
    } catch {
      // One company's failure does not stop the others.
    }
  }
  return sent;
}
