// Big reports prepared in the background: the request only writes a job; the Worker builds it after the answer is sent (waitUntil), stores the
// result for a week and tells the person. If nothing picked the job up (local run), the first look at it builds it.
import { notify } from "./api-core.ts";
import { employeePay } from "./payroll.ts";
import { exitTypeLabel } from "./workforce.ts";
import { loadPlanData } from "./api/shared.ts";
import { RATE_LABEL, summarize, unitActive } from "./staff-plan.ts";

export type JobCell = string | number;
export type JobResult = { columns: string[]; rows: JobCell[][]; totals?: JobCell[]; note?: string };
type Filters = Record<string, string>;
type Options = { salaries: boolean };

const money = (v: number) => Math.round((v || 0) * 100) / 100;
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");
const months = (a: string, b: string) => {
  const x = new Date(`${a}T00:00:00Z`), y = new Date(`${b}T00:00:00Z`);
  return Math.max(0, (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + y.getUTCMonth() - x.getUTCMonth() - (y.getUTCDate() < x.getUTCDate() ? 1 : 0));
};
export const MAX_JOB_ROWS = 20000;

// Which permission each background report needs, and its title.
export const JOB_REPORTS: Record<string, { title: string; need: "salaries" | "employees" | "audit" }> = {
  "staff-plan": { title: "Ştat planı sətir-sətir", need: "salaries" },
  "employees-register": { title: "İşçi reyestri", need: "employees" },
  turnover: { title: "Dövriyyə: səbəb və staj üzrə", need: "employees" },
  "plan-exits": { title: "Gözlənilən çıxışlar", need: "employees" },
  "plan-fill": { title: "Yerin dolma müddəti", need: "employees" },
  "company-audit": { title: "Şirkət əməliyyat jurnalı (tam)", need: "audit" },
};

const BUILDERS: Record<string, (db: D1Database, companyId: string, f: Filters, o: Options) => Promise<JobResult>> = {
  "staff-plan": async (db, companyId, f) => {
    const plan = await loadPlanData(db, companyId);
    const summary = summarize(plan.units, plan.people);
    const month = new Date().toISOString().slice(0, 7);
    const cost = (gross: number) => (gross > 0 ? employeePay(gross, "gross", "private").employerCost : 0);
    const rows = summary.rows.filter((r) => (!f.department || r.department === f.department) && (!f.state || (f.state === "free" ? r.free > 0 : f.state === "full" ? r.free <= 0 : !unitActive(r, month))));
    return {
      columns: ["Filial", "Departament", "Şöbə", "Vəzifə", "Pillə", "Ştat növü", "Plan", "Faktiki", "Boş", "Dövr", "Maaş həddi (min)", "Maaş həddi (maks)", "Aylıq xərc (maks.)"],
      rows: rows.map((r) => [r.branch || "Baş ofis", r.department, r.section, r.position, r.level || "", RATE_LABEL[r.rate] || "Tam ştat", r.planned, r.filled, Math.max(0, r.free), r.startMonth || r.endMonth ? `${r.startMonth || "…"} – ${r.endMonth || "…"}` : "il boyu", money(r.salaryMin), money(r.salaryMax || r.salaryMin), unitActive(r, month) ? Math.round(cost(r.salaryMax || r.salaryMin) * r.planned * (r.rate || 1)) : 0]),
    };
  },
  "employees-register": async (db, companyId, f, o) => {
    const list = await db.prepare("SELECT name,position,department,section,status,start_date,end_date,probation_end,contract_end,work_mode,email,phone,salary_cents,salary_type,sector FROM company_employees WHERE company_id=? AND status<>'removed' ORDER BY department,name LIMIT ?").bind(companyId, MAX_JOB_ROWS + 1).all<{ name: string; position: string; department: string; section: string; status: string; start_date: string; end_date: string; probation_end: string; contract_end: string; work_mode: string; email: string; phone: string; salary_cents: number; salary_type: string; sector: string }>();
    const today = new Date().toISOString().slice(0, 10);
    const status: Record<string, string> = { active: "İşləyir", leave: "Məzuniyyətdə", left: "İşdən çıxıb" };
    const rows = list.results.filter((r) => (!f.department || r.department === f.department) && (!f.status || r.status === f.status));
    const columns = ["Ad Soyad", "Vəzifə", "Departament", "Şöbə", "Status", "İşə başlama", "Çıxış", "Staj (ay)", "Sınaq sonu", "Müqavilə sonu", "İş rejimi", "E-poçt", "Telefon", ...(o.salaries ? ["Gross maaş"] : [])];
    return {
      columns,
      rows: rows.map((r) => [r.name, r.position, r.department, r.section, status[r.status] || r.status, dmy(r.start_date), dmy(r.end_date), r.start_date ? months(r.start_date, r.status === "left" && r.end_date ? r.end_date : today) : "", dmy(r.probation_end), dmy(r.contract_end), r.work_mode, r.email, r.phone, ...(o.salaries ? [r.salary_cents > 0 ? money(employeePay(r.salary_cents / 100, r.salary_type === "net" ? "net" : "gross", r.sector === "public" ? "public" : "private").gross) : ""] : [])]),
    };
  },
  turnover: async (db, companyId, f) => {
    const rows = await db.prepare("SELECT name,department,position,start_date,end_date,exit_type,exit_reason FROM company_employees WHERE company_id=? AND status='left' AND end_date<>'' AND (?='' OR end_date>=?) AND (?='' OR end_date<=?) ORDER BY end_date DESC LIMIT ?").bind(companyId, f.from || "", f.from || "", f.to || "", f.to || "", MAX_JOB_ROWS + 1).all<{ name: string; department: string; position: string; start_date: string; end_date: string; exit_type: string; exit_reason: string }>();
    const list = rows.results.filter((r) => !f.department || r.department === f.department);
    const firstYear = list.filter((r) => r.start_date && months(r.start_date, r.end_date) < 12).length;
    return {
      note: list.length ? `${list.length} çıxış; ilk ilində çıxan: ${firstYear} (${Math.round((firstYear / list.length) * 100)}%).` : undefined,
      columns: ["İşçi", "Departament", "Vəzifə", "İşə başlama", "Çıxış", "Staj (ay)", "Çıxışın növü", "Səbəb"],
      rows: list.map((r) => [r.name, r.department, r.position, dmy(r.start_date), dmy(r.end_date), r.start_date ? months(r.start_date, r.end_date) : "", exitTypeLabel(r.exit_type) || r.exit_type || "", r.exit_reason]),
    };
  },
  "plan-exits": async (db, companyId, f) => {
    const today = new Date().toISOString().slice(0, 10);
    const limit = new Date(Date.now() + Number(f.within || "90") * 86400000).toISOString().slice(0, 10);
    const rows = await db.prepare("SELECT name,department,position,end_date,contract_end FROM company_employees WHERE company_id=? AND status IN ('active','leave') AND ((end_date<>'' AND end_date>=?) OR (contract_end<>'' AND contract_end>=?)) ORDER BY COALESCE(NULLIF(end_date,''),contract_end) LIMIT ?").bind(companyId, today, today, MAX_JOB_ROWS + 1).all<{ name: string; department: string; position: string; end_date: string; contract_end: string }>();
    const list = rows.results.filter((r) => (r.end_date || r.contract_end) <= limit && (!f.department || r.department === f.department));
    return { columns: ["İşçi", "Departament", "Vəzifə", "Tarix", "Səbəb"], rows: list.map((r) => [r.name, r.department, r.position, dmy(r.end_date || r.contract_end), r.end_date ? "Təyin olunmuş çıxış tarixi" : "Müddətli müqavilənin sonu"]) };
  },
  "plan-fill": async (db, companyId, f) => {
    const rows = await db.prepare("SELECT e.name,e.department,e.position,substr(j.created,1,10) AS opened,substr(e.created,1,10) AS hired,CAST(julianday(substr(e.created,1,10))-julianday(substr(j.created,1,10)) AS INTEGER) AS days FROM company_employees e JOIN jobs j ON j.id=e.job_id WHERE e.company_id=? AND e.source='hired' ORDER BY e.created DESC LIMIT ?").bind(companyId, MAX_JOB_ROWS + 1).all<{ name: string; department: string; position: string; opened: string; hired: string; days: number }>();
    const list = rows.results.filter((r) => !f.department || r.department === f.department);
    const avg = list.length ? Math.round(list.reduce((t, r) => t + Math.max(0, Number(r.days) || 0), 0) / list.length) : 0;
    return { note: list.length ? `Orta müddət: ${avg} gün (${list.length} işə qəbul).` : undefined, columns: ["İşçi", "Departament", "Vəzifə", "Vakansiya açıldı", "İşə qəbul", "Gün"], rows: list.map((r) => [r.name, r.department, r.position, dmy(r.opened), dmy(r.hired), Math.max(0, Number(r.days) || 0)]) };
  },
  "company-audit": async (db, companyId, f) => {
    const rows = await db.prepare("SELECT c.action,c.target,c.detail,c.created,COALESCE(a.name,'') AS actor FROM company_audit c LEFT JOIN accounts a ON a.id=c.actor_id WHERE c.company_id=? ORDER BY c.created DESC LIMIT 5000").bind(companyId).all<{ action: string; detail: string; created: string; actor: string }>();
    const q = (f.q || "").toLowerCase();
    const list = rows.results.filter((e) => !q || `${e.action} ${e.detail} ${e.actor}`.toLowerCase().includes(q));
    return { columns: ["Tarix", "Kim", "Əməliyyat", "Təfərrüat"], rows: list.map((e) => [dmy(e.created), e.actor, e.action, e.detail]) };
  },
};

// Builds one waiting job: claims it first (so two runners never do it twice), stores the result and tells the person.
export async function runReportJob(db: D1Database, jobId: string): Promise<void> {
  const claim = await db.prepare("UPDATE report_jobs SET status='running' WHERE id=? AND status='queued'").bind(jobId).run();
  if (!claim.meta.changes) return;
  const job = await db.prepare("SELECT company_id,user_id,report_id,title,filters FROM report_jobs WHERE id=?").bind(jobId).first<{ company_id: string; user_id: string; report_id: string; title: string; filters: string }>();
  if (!job) return;
  const finish = async (status: "done" | "failed", rows: number, result: string, error: string) => {
    await db.prepare("UPDATE report_jobs SET status=?,row_count=?,result=?,error=?,finished=? WHERE id=?").bind(status, rows, result, error, new Date().toISOString(), jobId).run();
  };
  try {
    const build = BUILDERS[job.report_id];
    if (!build) throw new Error("Bu hesabat arxa planda hazırlanmır.");
    let filters: Filters = {};
    try { filters = JSON.parse(job.filters) as Filters; } catch { filters = {}; }
    const member = await db.prepare("SELECT role FROM company_members WHERE company_id=? AND user_id=? AND status='active'").bind(job.company_id, job.user_id).first<{ role: string }>().catch(() => null);
    const salaries = job.user_id === job.company_id || ["owner", "director", "hr"].includes(member?.role || "");
    const result = await build(db, job.company_id, filters, { salaries });
    if (result.rows.length > MAX_JOB_ROWS) throw new Error(`Hesabat ${MAX_JOB_ROWS} sətirdən çoxdur: süzgəclə (departament, tarix) daraldın.`);
    const text = JSON.stringify(result);
    if (text.length > 4_000_000) throw new Error("Hesabat çox böyükdür: süzgəclə daraldın.");
    await finish("done", result.rows.length, text, "");
    await notify(db, { userId: job.user_id, type: "report_ready", title: `Hesabat hazırdır: ${job.title}`, body: `${result.rows.length} sətir. «Hesabatlar → Hazır hesabatlar» bölməsindən açın.`, link: "hr-reports" });
  } catch (error) {
    await finish("failed", 0, "", (error as Error).message || "Hesabat hazırlanmadı.");
    await notify(db, { userId: job.user_id, type: "report_ready", title: `Hesabat hazırlanmadı: ${job.title}`, body: (error as Error).message || "", link: "hr-reports" });
  }
}

// Jobs older than a week are removed (the result is a copy of the data of that day).
export async function purgeOldReportJobs(db: D1Database): Promise<void> {
  await db.prepare("DELETE FROM report_jobs WHERE created<?").bind(new Date(Date.now() - 7 * 86400000).toISOString()).run().catch(() => undefined);
}
