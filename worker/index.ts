/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { runDeadlineReminders, runPayrollReminders } from "../lib/payroll-reminders.ts";
import { runSurveyRecurrence } from "../lib/survey-recurrence.ts";
import { runBankDrafts, runCelebrations, runDueOrderEffects } from "../lib/cron-bank-drafts.ts";
import { purgeOldJobViews, runApprovalReminders, runDigests, runInterviewReminders, runInvoiceReminders, runJobAlerts, runPlanReminders, runProbationReminders, runTestReminders, type Mailer } from "../lib/digest-job.ts";
import { completePastInterviews } from "../lib/interview-auto.ts";
import { runTraced, serverTiming } from "../lib/d1-trace.ts";
import { recordServerError, purgeOldServerErrors } from "../lib/alerts.ts";
import { runPlanDigest } from "../lib/plan-digest.ts";
import { runReportSchedules } from "../lib/report-schedules.ts";
import { purgeOldReportJobs, runReportJob } from "../lib/report-jobs.ts";
import { mailerOf } from "../lib/mail.ts";
import { cacheable, edgeCacheSeconds } from "../lib/edge-cache.ts";
import { withSecurityHeaders } from "../lib/security-headers.ts";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  EMAIL?: Mailer;
  EMAIL_FROM?: string;
  RESEND_API_KEY?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return withSecurityHeaders(await respond(request, env, ctx));
  },
  // Daily cron: sends the weekly and monthly summaries that are due and interview reminders.
  async scheduled(controller: { cron?: string }, env: Env, ctx: ExecutionContext) {
    // The half-hourly run only closes interviews whose time is over (and asks for their opinion); the daily run does everything.
    if (controller?.cron === "*/30 * * * *") {
      ctx.waitUntil(completePastInterviews(env.DB));
      return;
    }
    ctx.waitUntil(Promise.all([completePastInterviews(env.DB), runDigests(env.DB, mailerOf(env), env.EMAIL_FROM), runInterviewReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runTestReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runProbationReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runJobAlerts(env.DB, mailerOf(env), env.EMAIL_FROM), runPlanReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runInvoiceReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runApprovalReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runPayrollReminders(env.DB), runDeadlineReminders(env.DB), runSurveyRecurrence(env.DB), runBankDrafts(env.DB, (request) => handler.fetch(request, env, ctx)), runDueOrderEffects(env.DB, (request) => handler.fetch(request, env, ctx)), runCelebrations(env.DB, (request) => handler.fetch(request, env, ctx)), purgeOldJobViews(env.DB), purgeOldServerErrors(env.DB), runPlanDigest(env.DB), runReportSchedules(env.DB, mailerOf(env), env.EMAIL_FROM), purgeOldReportJobs(env.DB)]));
  },
};

async function respond(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/_vinext/image") {
    const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
    return handleImageOptimization(request, {
      fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
      transformImage: async (body, { width, format, quality }) => {
        const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
        return result.response();
      },
    }, allowedWidths);
  }

  // Public pages come from the edge cache when it can store them (custom domain).
  const ttl = edgeCacheSeconds(request.method, url.pathname, url.search);
  const edge = ttl && typeof caches !== "undefined" ? (caches as unknown as { default: Cache }).default : null;
  if (edge) {
    const key = new Request(url.origin + url.pathname, { method: "GET" });
    try {
      const hit = await edge.match(key);
      if (hit) return hit;
    } catch {
      /* the cache is only an optimization */
    }
    const response = await handler.fetch(request, env, ctx);
    if (!cacheable(response)) return response;
    const shared = new Response(response.body, response);
    shared.headers.set("Cache-Control", `public, max-age=60, s-maxage=${ttl}`);
    ctx.waitUntil(edge.put(key, shared.clone()).catch(() => {}));
    return shared;
  }

  // API requests are counted: the number of database queries and their time go out in the Server-Timing header, and a slow or
  // failed request is written to the Worker log (the log is on in the Worker settings).
  if (url.pathname === "/api/csp-report" && request.method === "POST") {
    const text = (await request.text().catch(() => "")).slice(0, 600);
    console.warn(JSON.stringify({ csp: true, report: text }));
    return new Response(null, { status: 204 });
  }
  if (url.pathname.startsWith("/api/")) {
    const started = Date.now();
    const { result, trace } = await runTraced(() => handler.fetch(request, env, ctx));
    const total = Date.now() - started;
    if (total > 2500 || trace.queries > 25 || result.status >= 500)
      console.warn(JSON.stringify({ slow: total > 2500, status: result.status, path: url.pathname.slice(0, 80), ms: total, queries: trace.queries, dbMs: trace.ms, slowest: trace.slowest }));
    if (result.status >= 500) ctx.waitUntil(recordServerError(env.DB, url.pathname, result.status));
    // A big report is built after the answer has gone: the person does not wait for it.
    if (request.method === "POST" && url.pathname === "/api/joblink/company/reports/jobs" && result.status === 201) {
      ctx.waitUntil(result.clone().json().then((b) => runReportJob(env.DB, String((b as { id?: string }).id || ""))).catch(() => undefined));
    }
    const out = new Response(result.body, result);
    out.headers.set("Server-Timing", serverTiming(trace, total));
    return out;
  }
  return handler.fetch(request, env, ctx);
}

export default worker;
