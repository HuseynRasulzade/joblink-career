/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { runDeadlineReminders, runPayrollReminders } from "../lib/payroll-reminders.ts";
import { purgeOldJobViews, runApprovalReminders, runDigests, runInterviewReminders, runInvoiceReminders, runJobAlerts, runPlanReminders, runProbationReminders, runTestReminders, type Mailer } from "../lib/digest-job.ts";
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
  async scheduled(_controller: unknown, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(Promise.all([runDigests(env.DB, mailerOf(env), env.EMAIL_FROM), runInterviewReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runTestReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runProbationReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runJobAlerts(env.DB, mailerOf(env), env.EMAIL_FROM), runPlanReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runInvoiceReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runApprovalReminders(env.DB, mailerOf(env), env.EMAIL_FROM), runPayrollReminders(env.DB), runDeadlineReminders(env.DB), purgeOldJobViews(env.DB)]));
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

  return handler.fetch(request, env, ctx);
}

export default worker;
