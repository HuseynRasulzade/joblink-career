// admin: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { ADMIN_HEALTH_TEXT, budgetState, monthSpendByArea, monthSpendUsd, readAiBudget, readAiHealth, readAreaBudget, writeAiBudget, writeAreaBudget } from "@/lib/ai-guard";
import { type FeedbackRow as AiFeedbackRow, feedbackCsv, summarizeFeedback } from "@/lib/ai-eval";
import { COMPANY_AI_PACKAGES, monthKey, worstCaseNetShare } from "@/lib/ai-packages";
import { HttpError, jsonBody, str } from "@/lib/server";
import { PLANS } from "@/lib/plans";
import { rowCost } from "@/lib/ai-cost";
import { readAiPrices } from "@/lib/ai-guard";
import { CANDIDATE_LIMIT_KEYS, COMPANY_LIMIT_KEYS, TOKENS_PER_ANALYSIS, defaultCandidateLimits, defaultCompanyLimits, loadPackageOverrides, savePackageOverrides } from "@/lib/package-limits";
import { type Job } from "@/lib/model";
import { PLATFORM_KINDS, type PlatformDay, RELIGIOUS_YEARS, knownReligiousYears, platformCalendar, yearCalendar } from "@/lib/calendar-az";
import { companyDisplayName } from "@/lib/api-core";
import { PLATFORM_CALENDAR_KEY, loadPlatformCalendar, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_admin_03(c: Pick<RouteCtx, "db" | "id" | "path" | "request" | "requestUrl">): Promise<Response | undefined> {
  const { db, id, path, request, requestUrl } = c;
  if (request.method === "POST" && path === "admin/external-jobs/assign") {
      const body = await jsonBody(request);
      const companyId = str(body.companyId, 100);
      const company = await db
        .prepare("SELECT id FROM accounts WHERE id=? AND role='company'")
        .bind(companyId)
        .first<{ id: string }>();
      if (!company) throw new HttpError(404, "Şirkət tapılmadı.");
      const name = await companyDisplayName(db, companyId);
      const rows = await db
        .prepare("SELECT id,data FROM jobs WHERE owner='external-jobsearch-az'")
        .all<{ id: string; data: string }>();
      let moved = 0;
      for (const row of rows.results) {
        const job = JSON.parse(row.data) as Job;
        const footer = `\n\nMənbə: ${job.external?.source || "jobsearch.az"} · elanı yerləşdirən: ${job.company}${job.external?.url ? `\n${job.external.url}` : ""}`;
        const moved_job: Job = {
          ...job,
          owner: companyId,
          company: name,
          description: `${job.description}${footer}`.slice(0, 6000),
        };
        delete moved_job.external;
        await db
          .prepare("UPDATE jobs SET owner=?,data=? WHERE id=?")
          .bind(companyId, JSON.stringify(moved_job), row.id)
          .run();
        moved++;
      }
      await db
        .prepare(
          "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          "external-jobs-assign",
          "jobs",
          companyId,
          JSON.stringify({ moved }),
          new Date().toISOString(),
        )
        .run();
      return ok({ moved, company: name });
    }
  if (request.method === "POST" && path === "admin/external-jobs/delete") {
      const removed = await db
        .prepare("DELETE FROM jobs WHERE owner='external-jobsearch-az'")
        .run();
      await db
        .prepare(
          "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          "external-jobs-delete",
          "jobs",
          "jobsearch.az",
          JSON.stringify({ removed: removed.meta?.changes || 0 }),
          new Date().toISOString(),
        )
        .run();
      return ok({ removed: removed.meta?.changes || 0 });
    }
  if (path === "admin/company-ai-plans") {
      if (request.method === "POST") {
        const body = await jsonBody(request);
        const companyId = str(body.companyId, 100);
        const planId = str(body.planId, 20);
        if (!COMPANY_AI_PACKAGES.some((p) => p.id === planId)) throw new HttpError(400, "Paket düzgün deyil.");
        const company = await db.prepare("SELECT id FROM accounts WHERE id=? AND role='company'").bind(companyId).first();
        if (!company) throw new HttpError(404, "Şirkət tapılmadı.");
        const at = new Date().toISOString();
        await db
          .prepare("INSERT INTO company_ai_plans(company_id,plan_id,started,updated) VALUES(?,?,?,?) ON CONFLICT(company_id) DO UPDATE SET plan_id=excluded.plan_id,updated=excluded.updated")
          .bind(companyId, planId, at, at)
          .run();
        await db
          .prepare("INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)")
          .bind(crypto.randomUUID(), id, "company-ai-plan", "company", companyId, JSON.stringify({ planId }), at)
          .run();
      }
      const rows = await db
        .prepare(
          `SELECT a.id,a.name,a.created,COALESCE(p.plan_id,'free') AS plan_id,COALESCE(u.full_used,0) AS full_used,COALESCE(u.rank_used,0) AS rank_used
           FROM accounts a LEFT JOIN company_ai_plans p ON p.company_id=a.id LEFT JOIN company_ai_usage u ON u.company_id=a.id AND u.month=?
           WHERE a.role='company' ORDER BY a.created DESC LIMIT 300`,
        )
        .bind(monthKey())
        .all<{ id: string; name: string; created: string; plan_id: string; full_used: number; rank_used: number }>();
      return ok({
        month: monthKey(),
        packages: COMPANY_AI_PACKAGES.map((p) => ({ ...p, worstNetShare: Math.round(worstCaseNetShare(p) * 1000) / 1000 })),
        companies: rows.results,
      });
    }
  // AI limits of every package (candidate and employer) with what the real AI costs of the last 30 days say about them.
  if (path === "admin/package-limits") {
      if (request.method === "POST") {
        const body = await jsonBody(request);
        await savePackageOverrides(db, body.reset ? {} : { candidate: body.candidate, company: body.company });
        await db
          .prepare("INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)")
          .bind(crypto.randomUUID(), id, "package-limits", "settings", "package_limits", JSON.stringify({ reset: !!body.reset }), new Date().toISOString())
          .run()
          .catch(() => undefined);
      } else {
        await loadPackageOverrides(db, true);
      }
      const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const rows = await db
        .prepare("SELECT provider,SUM(calls) AS calls,SUM(chars_in) AS chars_in,SUM(chars_out) AS chars_out,SUM(tokens_in) AS tokens_in,SUM(tokens_out) AS tokens_out,SUM(tokens_cached) AS tokens_cached,SUM(measured) AS measured FROM ai_usage WHERE day>=? AND measured>0 GROUP BY provider")
        .bind(since)
        .all<{ provider: string; calls: number; chars_in: number; chars_out: number; tokens_in: number; tokens_out: number; tokens_cached: number; measured: number }>()
        .catch(() => ({ results: [] as { provider: string; calls: number; chars_in: number; chars_out: number; tokens_in: number; tokens_out: number; tokens_cached: number; measured: number }[] }));
      const prices = await readAiPrices(db);
      // USD per 1M tokens, as the real calls of the last 30 days were priced (input, cached input and output together).
      let cost = 0;
      let tokens = 0;
      for (const r of rows.results) {
        const row = { day: "", feature: "", user_id: "", errors: 0, provider: r.provider, calls: Number(r.measured) || 0, chars_in: 0, chars_out: 0, tokens_in: Number(r.tokens_in) || 0, tokens_out: Number(r.tokens_out) || 0, tokens_cached: Number(r.tokens_cached) || 0, measured: Number(r.measured) || 0 };
        cost += rowCost(row, prices).cost;
        tokens += row.tokens_in + row.tokens_out;
      }
      const real = tokens >= 20_000;
      const blendUsdPerM = real ? (cost / tokens) * 1_000_000 : (prices.openai.input * 0.75 + prices.openai.output * 0.25);
      const AZN_PER_USD = 1.7;
      const aznPerToken = (blendUsdPerM / 1_000_000) * AZN_PER_USD;
      const money = (n: number) => Math.round(n * 100) / 100;
      return ok({
        blend: { usdPerMillion: Math.round(blendUsdPerM * 100) / 100, aznPerUsd: AZN_PER_USD, source: real ? "real" : "default", measuredTokens: tokens },
        tokensPerAnalysis: TOKENS_PER_ANALYSIS,
        candidate: PLANS.map((p) => {
          const worst = p.limits.aiTokensMonth * aznPerToken;
          return {
            id: p.id,
            name: p.name,
            priceAzn: p.priceAzn,
            limits: Object.fromEntries(CANDIDATE_LIMIT_KEYS.map((k) => [k, p.limits[k]])),
            defaults: Object.fromEntries(CANDIDATE_LIMIT_KEYS.map((k) => [k, defaultCandidateLimits(p.id)?.[k]])),
            worstCostAzn: money(worst),
            worstShare: p.priceAzn ? Math.round(((p.priceAzn * 0.95 - worst) / p.priceAzn) * 1000) / 1000 : null,
          };
        }),
        company: COMPANY_AI_PACKAGES.map((p) => {
          const worst = (p.fullPerMonth * TOKENS_PER_ANALYSIS + p.rankPerMonth * 250) * aznPerToken;
          return {
            id: p.id,
            name: p.name,
            priceAzn: p.priceAzn,
            limits: Object.fromEntries(COMPANY_LIMIT_KEYS.map((k) => [k, p[k]])),
            defaults: Object.fromEntries(COMPANY_LIMIT_KEYS.map((k) => [k, defaultCompanyLimits(p.id)?.[k]])),
            worstCostAzn: money(worst),
            worstShare: p.priceAzn ? Math.round(((p.priceAzn * 0.95 - worst) / p.priceAzn) * 1000) / 1000 : null,
          };
        }),
      });
  }
  if (path === "admin/production-calendar") {
      const year = Number(str(requestUrl.searchParams.get("year"), 4) || new Date().getFullYear());
      if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new HttpError(400, "İli düzgün seçin.");
      if (request.method === "POST") {
        const body = await jsonBody(request);
        const store = async (list: PlatformDay[]) => {
          list.sort((x, y) => x.day.localeCompare(y.day));
          await db
            .prepare("INSERT INTO app_settings(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated")
            .bind(PLATFORM_CALENDAR_KEY, JSON.stringify(list), new Date().toISOString())
            .run();
          await loadPlatformCalendar(db, true);
          await db
            .prepare("INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)")
            .bind(crypto.randomUUID(), id, "production-calendar", "settings", PLATFORM_CALENDAR_KEY, JSON.stringify({ days: list.length }), new Date().toISOString())
            .run();
        };
        await loadPlatformCalendar(db, true);
        const list = [...platformCalendar()];
        const days: { day: string; kind: string; label: string }[] = Array.isArray(body.days) ? body.days : [{ day: body.day, kind: body.kind, label: body.label }];
        if (days.length > 400) throw new HttpError(400, "Bir dəfəyə ən çox 400 gün.");
        const next = new Map(list.map((d) => [d.day, d]));
        for (const d of days) {
          const day = str(d.day, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) throw new HttpError(400, "Tarixi düzgün yazın.");
          const kind = str(d.kind, 10);
          if (!kind) next.delete(day);
          else {
            if (!(PLATFORM_KINDS as readonly string[]).includes(kind)) throw new HttpError(400, "Növ düzgün deyil.");
            next.set(day, { day, kind: kind as PlatformDay["kind"], label: str(d.label, 100) });
          }
        }
        await store([...next.values()]);
      } else await loadPlatformCalendar(db, true);
      const mine = platformCalendar().filter((d) => d.day.startsWith(`${year}-`));
      return ok({ year, days: mine, months: yearCalendar(year, []), builtinYears: RELIGIOUS_YEARS, knownYears: knownReligiousYears() });
    }
  if (path === "admin/ai-budget") {
      if (request.method === "POST") {
        const body = await jsonBody(request);
        const audit = (entity: string, details: unknown) =>
          db
            .prepare("INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)")
            .bind(crypto.randomUUID(), id, "ai-budget-set", "settings", entity, JSON.stringify(details), new Date().toISOString())
            .run();
        const money = (value: unknown) => {
          const usd = Number(String(value ?? "").replace(",", "."));
          if (!Number.isFinite(usd) || usd < 0 || usd > 100000) throw new HttpError(400, "Məbləği 0 ilə 100000 dollar arasında yazın (0 = limit yoxdur).");
          return usd;
        };
        // The limit of one area (CV side or vacancy side): {area, areaUsd}; otherwise the overall limit: {monthlyUsd}.
        if (body.area === "cv" || body.area === "vacancy") {
          const usd = money(body.areaUsd);
          await writeAreaBudget(db, body.area, usd);
          await audit(`ai-budget-${body.area}`, { area: body.area, monthlyUsd: usd });
        } else {
          const usd = money(body.monthlyUsd);
          await writeAiBudget(db, usd);
          await audit("ai-budget", { monthlyUsd: usd });
        }
      }
      const [limit, spent, health, cvLimit, vacancyLimit, byArea] = await Promise.all([readAiBudget(db), monthSpendUsd(db), readAiHealth(db), readAreaBudget(db, "cv"), readAreaBudget(db, "vacancy"), monthSpendByArea(db)]);
      return ok({
        areas: { cv: budgetState(cvLimit, byArea.cv), vacancy: budgetState(vacancyLimit, byArea.vacancy), other: Math.round(byArea.other * 100) / 100 },
        budget: budgetState(limit, spent),
        health: { ...health, text: health.state === "ok" ? "" : ADMIN_HEALTH_TEXT[health.state] },
      });
    }
  if (request.method === "GET" && path === "admin/ai-feedback") {
      const rows = await db
        .prepare("SELECT kind,ai_score,rule_score,ai_recommendation,verdict,hr_decision,hr_score,note,created FROM ai_feedback ORDER BY created DESC LIMIT 5000")
        .all<AiFeedbackRow>()
        .catch(() => ({ results: [] as AiFeedbackRow[] }));
      return ok({ summary: summarizeFeedback(rows.results) });
    }
  if (request.method === "POST" && path === "admin/ai-feedback/clear") {
      const removed = await db.prepare("DELETE FROM ai_feedback").run();
      await db
        .prepare("INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), id, "ai-feedback-cleared", "ai-feedback", "all", JSON.stringify({ removed: removed.meta?.changes || 0 }), new Date().toISOString())
        .run();
      return ok({ ok: true, removed: removed.meta?.changes || 0 });
    }
  if (request.method === "GET" && path === "admin/ai-feedback/export") {
      const rows = await db
        .prepare("SELECT kind,job_id,candidate_id,ai_score,rule_score,ai_recommendation,verdict,hr_decision,hr_score,note,created FROM ai_feedback ORDER BY created DESC LIMIT 20000")
        .all<AiFeedbackRow & { job_id: string; candidate_id: string }>()
        .catch(() => ({ results: [] as (AiFeedbackRow & { job_id: string; candidate_id: string })[] }));
      return new Response(`\uFEFF${feedbackCsv(rows.results)}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="ai-feedback-${new Date().toISOString().slice(0, 10)}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }
  return undefined;
}
