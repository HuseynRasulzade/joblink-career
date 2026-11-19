// admin: site notice (a message for everybody), system health and the revenue / funnel numbers.
import { COMPANY_AI_PACKAGES, hrModulePriceFor } from "@/lib/ai-packages";
import { mailConfigured } from "@/lib/mail";
import { PLANS } from "@/lib/plans";
import { jsonBody, runtime, str } from "@/lib/server";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export const SITE_NOTICE_KEY = "site_notice";
export type SiteNotice = { text: string; level: "info" | "warning"; audience: "all" | "company" | "candidate"; until: string; active: boolean; updated: string };

// What the page may show: only an active, not expired notice.
export function publicNotice(raw: string | null | undefined, now = new Date().toISOString().slice(0, 10)): (SiteNotice & { id: string }) | null {
  if (!raw) return null;
  try {
    const n = JSON.parse(raw) as SiteNotice;
    if (!n.active || !n.text || (n.until && n.until < now)) return null;
    return { ...n, id: n.updated };
  } catch {
    return null;
  }
}

// A read that may fail (a table that is not there yet) gives the fallback instead of breaking the whole page.
const safe = async <T,>(promise: Promise<T>, fallback: unknown): Promise<T> => promise.catch(() => fallback as T);
const num = (v: unknown) => Number(v) || 0;

export async function handle_admin_08(c: Pick<RouteCtx, "db" | "id" | "path" | "request">): Promise<Response | undefined> {
  const { db, id, path, request } = c;

  // ---- notice for everybody (a strip above the panels) ----
  if (path === "admin/notice") {
    if (request.method === "POST") {
      const body = await jsonBody(request);
      const text = str(body.text, 400);
      const until = /^\d{4}-\d{2}-\d{2}$/.test(str(body.until, 10)) ? str(body.until, 10) : "";
      const notice: SiteNotice = {
        text,
        level: body.level === "warning" ? "warning" : "info",
        audience: body.audience === "company" || body.audience === "candidate" ? body.audience : "all",
        until,
        active: body.active !== false && !!text,
        updated: new Date().toISOString(),
      };
      await db
        .prepare("INSERT INTO app_settings(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated")
        .bind(SITE_NOTICE_KEY, JSON.stringify(notice), notice.updated)
        .run();
      await db
        .prepare("INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), id, "site-notice", "settings", SITE_NOTICE_KEY, JSON.stringify({ active: notice.active, audience: notice.audience }), notice.updated)
        .run()
        .catch(() => undefined);
    }
    const row = await safe(db.prepare("SELECT value FROM app_settings WHERE key=?").bind(SITE_NOTICE_KEY).first<{ value: string }>(), null);
    let notice: SiteNotice | null = null;
    try {
      notice = row ? (JSON.parse(row.value) as SiteNotice) : null;
    } catch {
      notice = null;
    }
    return ok({ notice });
  }

  // ---- system health ----
  if (request.method === "GET" && path === "admin/health") {
    const env = runtime() as unknown as Record<string, string | undefined> & Parameters<typeof mailConfigured>[0];
    const started = Date.now();
    const ping = await safe(db.prepare("SELECT 1 AS x").first<{ x: number }>(), null);
    const dbMs = Date.now() - started;
    const migration = await safe(db.prepare("SELECT COUNT(*) AS n,MAX(name) AS last FROM d1_migrations").first<{ n: number; last: string | null }>(), null);
    const cron = await safe(db.prepare("SELECT value,updated FROM app_settings WHERE key='cron_last'").first<{ value: string; updated: string }>(), null);
    const since = new Date(Date.now() - 86400000).toISOString();
    const errors = await safe(db.prepare("SELECT COUNT(*) AS n FROM error_log WHERE created>=?").bind(since).first<{ n: number }>(), null);
    const topErrors = await safe(
      db.prepare("SELECT message,COUNT(*) AS n FROM error_log WHERE created>=? GROUP BY fingerprint ORDER BY n DESC LIMIT 5").bind(since).all<{ message: string; n: number }>(),
      { results: [] },
    );
    const today = new Date().toISOString().slice(0, 10);
    const ai = await safe(db.prepare("SELECT COALESCE(SUM(calls),0) AS calls,COALESCE(SUM(errors),0) AS errors FROM ai_usage WHERE day=?").bind(today).first<{ calls: number; errors: number }>(), null);
    const overdue = await safe(db.prepare("SELECT COUNT(*) AS n FROM billing_invoices WHERE status!='paid' AND due_date<?").bind(today).first<{ n: number }>(), null);
    const cronAge = cron ? (Date.now() - new Date(cron.updated).getTime()) / 3600000 : null;
    type Check = { id: string; label: string; state: "ok" | "warn" | "bad"; detail: string };
    const mailOk = mailConfigured(env);
    const checks: Check[] = [
      { id: "db", label: "Verilənlər bazası", state: ping ? (dbMs < 800 ? "ok" : "warn") : "bad", detail: ping ? `cavab ${dbMs} ms` : "cavab vermir" },
      { id: "migrations", label: "Miqrasiyalar", state: migration ? "ok" : "warn", detail: migration ? `${migration.n} tətbiq olunub, sonuncu: ${migration.last}` : "oxunmadı" },
      { id: "mail", label: "E-poçt göndərilməsi", state: mailOk ? "ok" : "bad", detail: mailOk ? "qurulub" : "EMAIL_FROM / RESEND_API_KEY yoxdur: təsdiq kodu və bildirişlər göndərilmir" },
      { id: "ai", label: "AI təminatçısı", state: env.OPENAI_API_KEY || env.DEEPSEEK_API_KEY ? "ok" : "warn", detail: env.OPENAI_API_KEY ? "OpenAI açarı var" : env.DEEPSEEK_API_KEY ? "DeepSeek açarı var" : "AI açarı yoxdur: AI funksiyaları və şəkil oxuması işləmir" },
      { id: "ai-today", label: "Bu günkü AI çağırışları", state: ai && ai.calls > 0 && ai.errors / ai.calls > 0.2 ? "warn" : "ok", detail: ai ? `${num(ai.calls)} çağırış, ${num(ai.errors)} xəta` : "məlumat yoxdur" },
      { id: "turnstile", label: "Robot yoxlaması (Turnstile)", state: env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY ? "ok" : "warn", detail: env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY ? "qurulub" : "qurulmayıb" },
      { id: "payment", label: "Onlayn ödəniş", state: env.PAYMENT_PROVIDER ? "ok" : "warn", detail: env.PAYMENT_PROVIDER ? `provayder: ${env.PAYMENT_PROVIDER}` : "bağlı deyil: paketlər dəstək və admin vasitəsilə aktivləşir" },
      { id: "encryption", label: "Məlumat şifrələmə açarı", state: env.DATA_KEY ? "ok" : "warn", detail: env.DATA_KEY ? "qoyulub" : "DATA_KEY yoxdur: şəxsi məlumat sahələri şifrələnmir" },
      { id: "site", label: "Sayt ünvanı (SITE_URL)", state: env.SITE_URL ? "ok" : "warn", detail: env.SITE_URL || "qurulmayıb" },
      { id: "cron", label: "Gündəlik iş (cron)", state: cronAge === null ? "warn" : cronAge < 30 ? "ok" : "bad", detail: cron ? `son işləmə: ${cron.updated.slice(0, 16).replace("T", " ")} UTC` : "hələ qeyd yoxdur (cron işləməyib və ya bu versiyadan əvvəl idi)" },
      { id: "errors", label: "Son 24 saatın xətaları", state: !errors ? "warn" : errors.n === 0 ? "ok" : errors.n < 20 ? "warn" : "bad", detail: errors ? `${errors.n} xəta` : "oxunmadı" },
      { id: "invoices", label: "Vaxtı keçmiş hesab-fakturalar", state: !overdue ? "warn" : overdue.n === 0 ? "ok" : "warn", detail: overdue ? `${overdue.n} ədəd` : "oxunmadı" },
    ];
    return ok({ checks, topErrors: topErrors.results, at: new Date().toISOString() });
  }

  // ---- revenue and funnel ----
  if (request.method === "GET" && path === "admin/metrics") {
    const now = new Date();
    const day = (offset: number) => new Date(now.getTime() - offset * 86400000).toISOString().slice(0, 10);
    const since30 = day(29);
    const regs = await safe(
      db.prepare("SELECT substr(created,1,10) AS d,role,COUNT(*) AS n FROM accounts WHERE created>=? AND role IN ('company','candidate') GROUP BY d,role").bind(since30).all<{ d: string; role: string; n: number }>(),
      { results: [] },
    );
    const perDay = Array.from({ length: 30 }, (_, i) => {
      const d = day(29 - i);
      const row = (role: string) => num(regs.results.find((r) => r.d === d && r.role === role)?.n);
      return { day: d, company: row("company"), candidate: row("candidate") };
    });
    const one = async (sql: string, ...args: unknown[]) => num((await safe(db.prepare(sql).bind(...args).first<{ n: number }>(), { n: 0 }))?.n);
    const companies = await one("SELECT COUNT(*) AS n FROM accounts WHERE role='company'");
    const candidates = await one("SELECT COUNT(*) AS n FROM accounts WHERE role='candidate'");
    const companiesWithJob = await one("SELECT COUNT(DISTINCT j.owner) AS n FROM jobs j JOIN accounts a ON a.id=j.owner WHERE a.role='company'");
    const companiesWithPaid = await one("SELECT COUNT(DISTINCT account_id) AS n FROM billing_invoices WHERE status='paid'");
    const companiesOnPackage = await one("SELECT COUNT(*) AS n FROM company_ai_plans WHERE plan_id!='free' OR hr_module=1");
    const candidatesWithProfile = await one("SELECT COUNT(*) AS n FROM profiles");
    const candidatesApplied = await one("SELECT COUNT(DISTINCT candidate_id) AS n FROM applications");
    const candidatesOnPlan = await one("SELECT COUNT(DISTINCT account_id) AS n FROM subscriptions WHERE status='active' AND period_end>?", now.toISOString());
    // Invoices by month (with VAT) and what was paid.
    const inv = await safe(
      db.prepare("SELECT substr(created,1,7) AS m,SUM(amount_cents) AS issued,SUM(CASE WHEN status='paid' THEN amount_cents ELSE 0 END) AS paid,COUNT(*) AS n FROM billing_invoices GROUP BY m ORDER BY m DESC LIMIT 12").all<{ m: string; issued: number; paid: number; n: number }>(),
      { results: [] },
    );
    // Monthly recurring revenue, estimated from the packages in force (without VAT).
    const plans = await safe(db.prepare("SELECT plan_id,hr_module,hr_until FROM company_ai_plans").all<{ plan_id: string; hr_module: number; hr_until: string | null }>(), { results: [] });
    let companyMrr = 0;
    const byPackage: Record<string, number> = {};
    let hrActive = 0;
    for (const p of plans.results) {
      const pkg = COMPANY_AI_PACKAGES.find((x) => x.id === p.plan_id);
      companyMrr += pkg?.priceAzn || 0;
      byPackage[p.plan_id] = (byPackage[p.plan_id] || 0) + 1;
      if (p.hr_module && (!p.hr_until || p.hr_until > now.toISOString())) {
        hrActive += 1;
        companyMrr += hrModulePriceFor(pkg?.priceAzn || 0);
      }
    }
    const subs = await safe(
      db.prepare("SELECT plan_id,COUNT(*) AS n FROM subscriptions WHERE status='active' AND period_end>? GROUP BY plan_id").bind(now.toISOString()).all<{ plan_id: string; n: number }>(),
      { results: [] },
    );
    let candidateMrr = 0;
    const byPlan: Record<string, number> = {};
    for (const s of subs.results) {
      candidateMrr += (PLANS.find((p) => p.id === s.plan_id)?.priceAzn || 0) * s.n;
      byPlan[s.plan_id] = s.n;
    }
    return ok({
      perDay,
      totals: { companies, candidates },
      funnel: {
        company: [
          { label: "Qeydiyyatdan keçən şirkət", n: companies },
          { label: "Vakansiya yerləşdirən", n: companiesWithJob },
          { label: "Ödənişli paket və ya Kadr modulu olan", n: companiesOnPackage },
          { label: "Ödənilmiş hesab-fakturası olan", n: companiesWithPaid },
        ],
        candidate: [
          { label: "Qeydiyyatdan keçən namizəd", n: candidates },
          { label: "Profil yaradan", n: candidatesWithProfile },
          { label: "Müraciət göndərən", n: candidatesApplied },
          { label: "Ödənişli paketi olan", n: candidatesOnPlan },
        ],
      },
      invoices: inv.results.map((r) => ({ month: r.m, count: num(r.n), issuedAzn: num(r.issued) / 100, paidAzn: num(r.paid) / 100 })),
      mrr: { companyAzn: Math.round(companyMrr * 100) / 100, candidateAzn: Math.round(candidateMrr * 100) / 100, hrActive, byPackage, byPlan, note: "Aktiv paketlərin ƏDV-siz qiymətləri cəmi (təxmini); ödəniş inteqrasiyası olmadığı üçün həqiqi daxilolma deyil." },
    });
  }
  return undefined;
}
