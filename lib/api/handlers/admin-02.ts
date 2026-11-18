// admin: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { COUNTRIES, canonicalUniversity, setCustomUniversities } from "@/lib/university-catalog";
import { HttpError, jsonBody, str } from "@/lib/server";
import { JOB_CATEGORIES, type Job } from "@/lib/model";
import { MAJOR_FIELDS, canonicalMajor, setCustomMajors } from "@/lib/major-catalog";
import { MATCHING_KEY, describeSettingChanges, normalizeMatching } from "@/lib/matching-settings";
import { SUPPORT_STATUSES } from "@/lib/support-topics";
import { createXlsx } from "@/lib/xlsx";
import { notify, readCustomEducation } from "@/lib/api-core";
import { quiet } from "@/lib/quiet";
import { planById } from "@/lib/plans";
import { readMatching } from "@/lib/api-matching";
import { summarizeAiUsage } from "@/lib/ai-cost";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_admin_02(c: Pick<RouteCtx, "db" | "id" | "path" | "request" | "requestUrl">): Promise<Response | undefined> {
  const { db, id, path, request, requestUrl } = c;
  if (request.method === "GET" && path === "admin/ops") {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const errors = await db
        .prepare(
          "SELECT source,message,where_at,COUNT(*) AS count,MAX(created) AS last FROM error_log WHERE created>=? GROUP BY fingerprint ORDER BY count DESC,last DESC LIMIT 50",
        )
        .bind(since)
        .all()
        .catch(() => ({ results: [] }));
      const privacy = await db
        .prepare(
          "SELECT kind,role,created FROM privacy_requests ORDER BY created DESC LIMIT 200",
        )
        .all()
        .catch(() => ({ results: [] }));
      const totals = await db
        .prepare(
          "SELECT kind,COUNT(*) AS n FROM privacy_requests GROUP BY kind",
        )
        .all<{ kind: string; n: number }>()
        .catch(() => ({ results: [] as { kind: string; n: number }[] }));
      return ok({
        errors: errors.results,
        privacy: privacy.results,
        privacyTotals: Object.fromEntries(
          totals.results.map((r) => [r.kind, r.n]),
        ),
      });
    }
  if (request.method === "GET" && path === "admin/audit-export") {
      const rows = await db
        .prepare(
          `SELECT l.created,COALESCE(a.name,'Administrator') AS admin_name,l.action,l.entity_type,l.entity_id,l.details
        FROM admin_audit_logs l LEFT JOIN accounts a ON a.id=l.admin_id ORDER BY l.created DESC LIMIT 5000`,
        )
        .all<{
          created: string;
          admin_name: string;
          action: string;
          entity_type: string;
          entity_id: string;
          details: string;
        }>();
      const workbook = createXlsx(
        [
          "Tarix",
          "Administrator",
          "Əməliyyat",
          "Obyekt",
          "Obyekt ID",
          "Təfərrüat",
        ],
        rows.results.map((r) => [
          r.created,
          r.admin_name,
          r.action,
          r.entity_type,
          r.entity_id,
          r.details,
        ]),
        "Audit",
      );
      return new Response(Uint8Array.from(workbook).buffer, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": `attachment; filename="joblink-audit-${new Date().toISOString().slice(0, 10)}.xlsx"`,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }
  if (request.method === "GET" && path === "admin/ai-usage") {
      const days = Math.max(
        1,
        Math.min(
          90,
          Math.round(Number(requestUrl.searchParams.get("days"))) || 30,
        ),
      );
      const since = new Date(Date.now() - days * 86400000)
        .toISOString()
        .slice(0, 10);
      const rows = await db
        .prepare(
          "SELECT day,feature,provider,user_id,calls,chars_in,chars_out,errors FROM ai_usage WHERE day>=?",
        )
        .bind(since)
        .all<{
          day: string;
          feature: string;
          provider: string;
          user_id: string;
          calls: number;
          chars_in: number;
          chars_out: number;
          errors: number;
        }>()
        .catch(() => ({
          results: [] as {
            day: string;
            feature: string;
            provider: string;
            user_id: string;
            calls: number;
            chars_in: number;
            chars_out: number;
            errors: number;
          }[],
        }));
      const names = new Map<string, string>();
      const userIds = [
        ...new Set(rows.results.map((r) => r.user_id).filter(Boolean)),
      ];
      if (userIds.length)
        for (const a of (
          await db
            .prepare(
              "SELECT id,name,role FROM accounts WHERE id IN (SELECT value FROM json_each(?))",
            )
            .bind(JSON.stringify(userIds))
            .all<{ id: string; name: string; role: string }>()
        ).results)
          names.set(
            a.id,
            `${a.name} (${a.role === "company" ? "şirkət" : a.role === "admin" ? "admin" : "namizəd"})`,
          );
      return ok({ days, ...summarizeAiUsage(rows.results, names) });
    }
  if (request.method === "GET" && path === "admin/reviews") {
      const status = ["pending", "approved", "rejected"].includes(
        str(requestUrl.searchParams.get("status"), 10),
      )
        ? str(requestUrl.searchParams.get("status"), 10)
        : "pending";
      const rows = await db
        .prepare(
          `SELECT r.id,r.rating,r.title,r.body,r.status,r.admin_note,r.created,COALESCE(c.name,'') AS company FROM company_reviews r LEFT JOIN accounts c ON c.id=r.company_id WHERE r.status=? ORDER BY r.created DESC LIMIT 200`,
        )
        .bind(status)
        .all();
      return ok({ reviews: rows.results, status });
    }
  if (request.method === "POST" && path === "admin/reviews/decide") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new HttpError(403, "Bu sorğuya icazə verilmir.");
      const body = await jsonBody(request);
      const decision =
        body.decision === "approve"
          ? "approved"
          : body.decision === "reject"
            ? "rejected"
            : "";
      if (!decision) throw new HttpError(400, "Qərar yanlışdır.");
      const note = str(body.note, 300);
      if (decision === "rejected" && note.length < 3)
        throw new HttpError(400, "Rədd səbəbini yazın.");
      const row = await db
        .prepare("SELECT user_id FROM company_reviews WHERE id=?")
        .bind(str(body.id, 100))
        .first<{ user_id: string }>();
      if (!row) throw new HttpError(404, "Rəy tapılmadı.");
      const now = new Date().toISOString();
      await db.batch([
        db
          .prepare(
            "UPDATE company_reviews SET status=?,admin_note=?,reviewed_at=? WHERE id=?",
          )
          .bind(decision, note, now, str(body.id, 100)),
        db
          .prepare(
            "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            `review-${decision}`,
            "review",
            str(body.id, 100),
            JSON.stringify({ note }),
            now,
          ),
      ]);
      await notify(db, {
        userId: row.user_id,
        type: "review",
        title:
          decision === "approved"
            ? "Rəyiniz dərc edildi"
            : "Rəyiniz dərc edilmədi",
        body:
          decision === "approved"
            ? "Şirkət haqqında rəyiniz təsdiqləndi."
            : `Səbəb: ${note}`,
        link: "companies",
      });
      return ok({ ok: true });
    }
  // A package request in the inbox: the admin switches the chosen package on for 30 days (no payment is taken here).
  if (request.method === "POST" && path === "admin/support/grant-plan") {
      const body = await jsonBody(request);
      const thread = await db.prepare("SELECT user_id,meta FROM support_threads WHERE id=?").bind(str(body.id, 100)).first<{ user_id: string; meta: string }>();
      if (!thread) throw new HttpError(404, "Sorğu tapılmadı.");
      let planId = "";
      try { planId = String((JSON.parse(thread.meta || "{}") as { planId?: string }).planId || ""); } catch { /* no plan in the request */ }
      const plan = planById(planId);
      if (!plan || plan.priceAzn <= 0) throw new HttpError(400, "Bu sorğuda paket yoxdur.");
      const now = new Date();
      const at = now.toISOString();
      const end = new Date(now.getTime() + 30 * 86400000).toISOString();
      await db.batch([
        db.prepare("UPDATE subscriptions SET status='expired',auto_renew=0,period_end=?,updated=? WHERE account_id=? AND status IN ('active','cancelled')").bind(at, at, thread.user_id),
        db.prepare("INSERT INTO subscriptions(id,account_id,plan_id,status,period_start,period_end,auto_renew,method_id,created,updated) VALUES(?,?,?,'active',?,?,0,'',?,?)").bind(crypto.randomUUID(), thread.user_id, plan.id, at, end, at, at),
        db.prepare("UPDATE support_threads SET status='done',updated=? WHERE id=?").bind(at, str(body.id, 100)),
        db.prepare("INSERT INTO support_messages(id,thread_id,author_id,author_role,body,created) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), str(body.id, 100), id, "admin", `${plan.name} paketi 30 gün üçün aktivləşdirildi. İndi «Paketlər» bölməsində görə bilərsiniz.`, at),
      ]);
      return ok({ ok: true, plan: plan.id, until: end });
    }
  if (request.method === "POST" && path === "admin/support/status") {
      const body = await jsonBody(request);
      const status = str(body.status, 20);
      if (!SUPPORT_STATUSES[status])
        throw new HttpError(400, "Status yanlışdır.");
      await db
        .prepare("UPDATE support_threads SET status=?,updated=? WHERE id=?")
        .bind(status, new Date().toISOString(), str(body.id, 100))
        .run();
      return ok({ ok: true });
    }
  if (request.method === "GET" && path === "admin/matching-settings") {
      return ok({ settings: await readMatching(db) });
    }
  if (request.method === "POST" && path === "admin/matching-settings") {
      const body = await jsonBody(request);
      const settings = normalizeMatching(body);
      const before = await readMatching(db);
      await db
        .prepare(
          "INSERT INTO app_settings(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated",
        )
        .bind(MATCHING_KEY, JSON.stringify(settings), new Date().toISOString())
        .run();
      const changes = describeSettingChanges(
        before as unknown as Record<string, unknown>,
        settings as unknown as Record<string, unknown>,
      );
      if (changes.length)
        await db
          .prepare(
            "INSERT INTO setting_history(id,key,summary,actor_id,created) VALUES(?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            MATCHING_KEY,
            changes.join("; ").slice(0, 600),
            id,
            new Date().toISOString(),
          )
          .run()
          .catch((error) => quiet("route-best-effort", error));
      return ok({ settings });
    }
  if (request.method === "GET" && path === "admin/matching-history") {
      const rows = await db
        .prepare(
          "SELECT h.summary,h.created,COALESCE(a.name,'Administrator') AS admin_name FROM setting_history h LEFT JOIN accounts a ON a.id=h.actor_id WHERE h.key=? ORDER BY h.created DESC LIMIT 50",
        )
        .bind(MATCHING_KEY)
        .all()
        .catch(() => ({ results: [] }));
      return ok({ history: rows.results });
    }
  if (request.method === "GET" && path === "admin/ai-ratings") {
      const rows = await db
        .prepare(
          `SELECT r.user_id,r.job_id,r.score,r.reason,r.flagged,r.created,COALESCE(json_extract(j.data,'$.title'),'') AS job_title,COALESCE(json_extract(p.data,'$.title'),'') AS candidate_title
        FROM ai_job_ratings r LEFT JOIN jobs j ON j.id=r.job_id LEFT JOIN profiles p ON p.user_id=r.user_id ORDER BY r.created DESC LIMIT 30`,
        )
        .all()
        .catch(() => ({ results: [] }));
      const flagged = await db
        .prepare("SELECT COUNT(*) AS n FROM ai_job_ratings WHERE flagged=1")
        .first<{ n: number }>()
        .catch(() => null);
      const total = await db
        .prepare("SELECT COUNT(*) AS n FROM ai_job_ratings")
        .first<{ n: number }>()
        .catch(() => null);
      return ok({
        ratings: rows.results,
        flagged: Number(flagged?.n) || 0,
        total: Number(total?.n) || 0,
      });
    }
  if (request.method === "POST" && path === "admin/ai-ratings/flag") {
      const body = await jsonBody(request);
      await db
        .prepare(
          "UPDATE ai_job_ratings SET flagged=? WHERE user_id=? AND job_id=?",
        )
        .bind(
          body.flagged === false ? 0 : 1,
          str(body.userId, 100),
          str(body.jobId, 100),
        )
        .run();
      return ok({ ok: true });
    }
  if (request.method === "GET" && path === "admin/education") {
      const education = await readCustomEducation(db);
      return ok({ ...education, countries: COUNTRIES, fields: MAJOR_FIELDS });
    }
  if (request.method === "POST" && path === "admin/education") {
      const body = await jsonBody(request);
      const kind =
        body.kind === "major"
          ? "major"
          : body.kind === "university"
            ? "university"
            : "";
      const label = str(body.label, 160).replace(/\s+/g, " ");
      const labelEn = str(body.labelEn, 160).replace(/\s+/g, " ") || label;
      const labelRu = str(body.labelRu, 160).replace(/\s+/g, " ") || label;
      const extra = str(body.extra, 40);
      const aliases = (
        Array.isArray(body.aliases)
          ? body.aliases
          : str(body.aliases, 800).split(/[,;\n]/)
      )
        .map((value: unknown) => str(value, 160).replace(/\s+/g, " "))
        .filter(Boolean)
        .slice(0, 15);
      if (!kind)
        throw new HttpError(400, "Növü seçin: universitet və ya ixtisas.");
      if (label.length < 2) throw new HttpError(400, "Azərbaycanca adı yazın.");
      if (kind === "university" ? !COUNTRIES[extra] : !MAJOR_FIELDS[extra])
        throw new HttpError(
          400,
          kind === "university" ? "Ölkəni seçin." : "Sahəni seçin.",
        );
      const education = await readCustomEducation(db);
      setCustomUniversities(education.universities);
      setCustomMajors(education.majors);
      const names = [label, labelEn, labelRu, ...aliases];
      const duplicate = names
        .map((value) =>
          kind === "university"
            ? canonicalUniversity(value)
            : canonicalMajor(value),
        )
        .find(Boolean);
      if (duplicate)
        throw new HttpError(
          409,
          `Bu ad artıq siyahıdadır: ${duplicate.label}.`,
        );
      const itemId = crypto.randomUUID();
      const now = new Date().toISOString();
      const threadId = str(body.threadId, 100);
      const statements = [
        db
          .prepare(
            "INSERT INTO custom_education_items(id,kind,label,label_en,label_ru,extra,aliases,created_by,created) VALUES(?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            itemId,
            kind,
            label,
            labelEn,
            labelRu,
            extra,
            JSON.stringify(aliases),
            id,
            now,
          ),
        db
          .prepare(
            "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            `${kind}-created`,
            kind,
            itemId,
            JSON.stringify({ label, labelEn, extra }),
            now,
          ),
      ];
      if (threadId)
        statements.push(
          db
            .prepare(
              "UPDATE support_threads SET status='done',updated=? WHERE id=?",
            )
            .bind(now, threadId),
          db
            .prepare(
              "INSERT INTO support_messages(id,thread_id,author_id,author_role,body,created) VALUES(?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              threadId,
              id,
              "admin",
              `“${label}” siyahıya əlavə edildi. İndi onu siyahıdan seçə bilərsiniz.`,
              now,
            ),
        );
      try {
        await db.batch(statements);
      } catch {
        throw new HttpError(409, "Bu adda qeyd artıq mövcuddur.");
      }
      return ok({ ok: true, id: `custom:${itemId}` }, 201);
    }
  if (request.method === "POST" && path === "admin/education/delete") {
      const body = await jsonBody(request);
      const itemId = str(body.id, 100).replace(/^custom:/, "");
      const result = await db
        .prepare("DELETE FROM custom_education_items WHERE id=?")
        .bind(itemId)
        .run();
      if (!result.meta.changes) throw new HttpError(404, "Qeyd tapılmadı.");
      await db
        .prepare(
          "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          "education-item-deleted",
          "education",
          itemId,
          "{}",
          new Date().toISOString(),
        )
        .run();
      return ok({ ok: true });
    }
  if (request.method === "POST" && path === "admin/external-jobs/import") {
      const body = await jsonBody(request);
      const source = str(body.source, 40);
      if (source !== "jobsearch.az")
        throw new HttpError(400, "Mənbə dəstəklənmir.");
      const list = (Array.isArray(body.jobs) ? body.jobs : []).slice(0, 100);
      const owner = "external-jobsearch-az";
      const now = new Date().toISOString();
      await db
        .prepare(
          "INSERT OR IGNORE INTO accounts(id,name,role,status,created) VALUES(?,?,?,?,?)",
        )
        .bind(owner, "jobsearch.az (xarici mənbə)", "company", "active", now)
        .run();
      let added = 0;
      let skipped = 0;
      for (const raw of list as Record<string, unknown>[]) {
        const url = str(raw.url, 300);
        const externalId = str(raw.externalId, 40).replace(/[^0-9a-z-]/gi, "");
        const title = str(raw.title, 150).replace(/\s+/g, " ");
        const company = str(raw.company, 120).replace(/\s+/g, " ");
        if (
          !externalId ||
          title.length < 3 ||
          !company ||
          !/^https:\/\/jobsearch\.az\//.test(url)
        ) {
          skipped++;
          continue;
        }
        const jobId = `ext-jobsearch-${externalId}`;
        const exists = await db
          .prepare("SELECT 1 AS found FROM jobs WHERE id=?")
          .bind(jobId)
          .first();
        if (exists) {
          skipped++;
          continue;
        }
        const category = (JOB_CATEGORIES as readonly string[]).includes(
          str(raw.category, 80),
        )
          ? str(raw.category, 80)
          : "Biznes, idarəetmə və HR";
        const deadline = /^\d{4}-\d{2}-\d{2}$/.test(str(raw.deadline, 10))
          ? str(raw.deadline, 10)
          : "";
        const job: Job = {
          id: jobId,
          owner,
          title,
          company,
          city: str(raw.city, 60) || "Bakı",
          mode: "Ofisdə",
          type: str(raw.type, 40) || "Tam ştat",
          category,
          minSalary: Math.max(0, Math.round(Number(raw.minSalary)) || 0),
          maxSalary: Math.max(0, Math.round(Number(raw.maxSalary)) || 0),
          minYears: 0,
          maxYears: 0,
          skills: [],
          description: str(raw.description, 6000),
          requirements: str(raw.requirements, 3000),
          deadline,
          created: now,
          demo: false,
          status: "published",
          external: { source, url },
        };
        await db
          .prepare(
            "INSERT INTO jobs(id,owner,data,status,created) VALUES(?,?,?,'published',?)",
          )
          .bind(jobId, owner, JSON.stringify(job), now)
          .run();
        added++;
      }
      await db
        .prepare(
          "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          "external-jobs-import",
          "jobs",
          source,
          JSON.stringify({ added, skipped }),
          now,
        )
        .run();
      return ok({ added, skipped });
    }
  return undefined;
}
