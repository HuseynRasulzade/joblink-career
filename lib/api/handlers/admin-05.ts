// admin: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { CERTIFICATION_CATALOG } from "@/lib/certification-catalog";
import { HttpError, jsonBody, runtime, str } from "@/lib/server";
import { JOB_TITLE_CATALOG } from "@/lib/job-title-catalog";
import { SKILL_CATALOG, normalizeSkillKey } from "@/lib/skill-catalog";
import { accountSignals } from "@/lib/account-signals";
import { createXlsx } from "@/lib/xlsx";
import { jobSpamSignals } from "@/lib/job-spam";
import { mailConfigured } from "@/lib/mail";
import { parseSkillCsv } from "@/lib/skill-import";
import { Row, normalizedJobRecord, ok, readSkillSections } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_admin_05(c: Pick<RouteCtx, "customCerts" | "customSkillLabels" | "customSkills" | "customTitles" | "db" | "id" | "path" | "request">): Promise<Response | undefined> {
  const { customCerts, customSkillLabels, customSkills, customTitles, db, id, path, request } = c;
  if (request.method === "GET" && path === "admin") {
      const metrics = await db
        .prepare(
          `SELECT
          (SELECT COUNT(*) FROM accounts) AS total_users,
          (SELECT COUNT(*) FROM accounts WHERE role='candidate') AS candidates,
          (SELECT COUNT(*) FROM accounts WHERE role='company') AS companies,
          (SELECT COUNT(*) FROM accounts WHERE status='suspended') AS suspended_users,
          (SELECT COUNT(*) FROM profiles WHERE active='1') AS active_profiles,
          (SELECT COUNT(*) FROM jobs WHERE status='published') AS published_jobs,
          (SELECT COUNT(*) FROM jobs WHERE status='paused') AS paused_jobs,
          (SELECT COUNT(*) FROM applications) AS applications,
          (SELECT COUNT(*) FROM applications WHERE created>=datetime('now','-30 days')) AS applications_30d`,
        )
        .first<Record<string, number>>();
      const userRows = await db
        .prepare(
          `SELECT a.id,a.name,a.role,COALESCE(a.status,'active') AS status,a.created,
          COALESCE(p.email,'') AS email,
          CASE WHEN pr.user_id IS NULL THEN 0 ELSE 1 END AS has_profile,
          COALESCE(json_extract(pr.data,'$.title'),'') AS title,
          (SELECT COUNT(*) FROM jobs j WHERE j.owner=a.id) AS jobs_count,
          (SELECT COUNT(*) FROM applications ap WHERE ap.candidate_id=a.id) AS applications_count,
          CASE WHEN (SELECT verification_status FROM company_profiles cp WHERE cp.company_id=a.id)='verified' THEN 1 ELSE 0 END AS verified
          FROM accounts a
          LEFT JOIN password_accounts p ON p.user_id=a.id
          LEFT JOIN profiles pr ON pr.user_id=a.id
          ORDER BY a.created DESC LIMIT 200`,
        )
        .all<Record<string, unknown>>();
      const jobRows = await db
        .prepare(
          `SELECT j.*,COALESCE(a.name,'Naməlum şirkət') AS owner_name,
          (SELECT COUNT(*) FROM applications ap WHERE ap.job_id=j.id) AS applications_count
          FROM jobs j LEFT JOIN accounts a ON a.id=j.owner
          ORDER BY j.created DESC LIMIT 200`,
        )
        .all<Row & { owner_name: string; applications_count: number }>();
      const applicationRows = await db
        .prepare(
          `SELECT ap.id,ap.job_id,ap.candidate_id,ap.status,ap.created,ap.auto,
          COALESCE(json_extract(ap.data,'$.name'),'Namizəd') AS candidate_name,
          COALESCE(json_extract(ap.data,'$.title'),'') AS candidate_title,
          COALESCE(json_extract(j.data,'$.title'),'Vakansiya') AS job_title,
          COALESCE(json_extract(j.data,'$.company'),'') AS company
          FROM applications ap LEFT JOIN jobs j ON j.id=ap.job_id
          ORDER BY ap.created DESC LIMIT 200`,
        )
        .all<Record<string, unknown>>();
      const auditRows = await db
        .prepare(
          `SELECT l.id,l.action,l.entity_type,l.entity_id,l.details,l.created,
          COALESCE(a.name,'Administrator') AS admin_name
          FROM admin_audit_logs l LEFT JOIN accounts a ON a.id=l.admin_id
          ORDER BY l.created DESC LIMIT 100`,
        )
        .all<Record<string, unknown>>();
      const billingSummary = await db
        .prepare(
          `SELECT
          COALESCE((SELECT SUM(amount_cents) FROM billing_invoices WHERE status<>'cancelled'),0) AS billed_cents,
          COALESCE((SELECT SUM(bp.amount_cents) FROM billing_payments bp JOIN billing_invoices bi ON bi.id=bp.invoice_id WHERE bi.status<>'cancelled'),0) AS paid_cents,
          COALESCE((SELECT SUM(amount_cents) FROM billing_invoices WHERE status<>'cancelled'),0)
            - COALESCE((SELECT SUM(bp.amount_cents) FROM billing_payments bp JOIN billing_invoices bi ON bi.id=bp.invoice_id WHERE bi.status<>'cancelled'),0) AS outstanding_cents,
          (SELECT COUNT(*) FROM billing_invoices bi WHERE bi.status='open' AND bi.due_date<date('now')
            AND bi.amount_cents>COALESCE((SELECT SUM(bp.amount_cents) FROM billing_payments bp WHERE bp.invoice_id=bi.id),0)) AS overdue_count,
          (SELECT COUNT(*) FROM billing_invoices WHERE status<>'cancelled') AS invoice_count`,
        )
        .first<Record<string, number>>();
      const invoiceRows = await db
        .prepare(
          `SELECT bi.id,bi.account_id,bi.description,bi.amount_cents,bi.currency,bi.due_date,bi.status,bi.created,
          COALESCE(a.name,'Naməlum hesab') AS account_name,COALESCE(pa.email,'') AS account_email,
          COALESCE((SELECT SUM(bp.amount_cents) FROM billing_payments bp WHERE bp.invoice_id=bi.id),0) AS paid_cents
          FROM billing_invoices bi
          LEFT JOIN accounts a ON a.id=bi.account_id
          LEFT JOIN password_accounts pa ON pa.user_id=bi.account_id
          ORDER BY CASE WHEN bi.status='open' AND bi.due_date<date('now') THEN 0 ELSE 1 END,bi.due_date ASC,bi.created DESC
          LIMIT 500`,
        )
        .all<Record<string, unknown>>();
      const paymentRows = await db
        .prepare(
          `SELECT bp.id,bp.invoice_id,bp.account_id,bp.amount_cents,bp.currency,bp.method,bp.reference,bp.note,bp.paid_at,bp.created,
          COALESCE(a.name,'Naməlum hesab') AS account_name,COALESCE(bi.description,'Hesab-faktura') AS invoice_description
          FROM billing_payments bp
          LEFT JOIN accounts a ON a.id=bp.account_id
          LEFT JOIN billing_invoices bi ON bi.id=bp.invoice_id
          ORDER BY bp.paid_at DESC,bp.created DESC LIMIT 500`,
        )
        .all<Record<string, unknown>>();
      const escoSkillCount = await db
        .prepare("SELECT COUNT(*) AS count FROM esco_skills")
        .first<{ count: number }>();
      const skillSections = await readSkillSections(db, customSkills);
      const certProfileRows = await db
        .prepare(
          `SELECT json_extract(c.value,'$.id') AS id,COUNT(*) AS count
          FROM profiles p, json_each(p.data,'$.certifications') c GROUP BY 1`,
        )
        .all<{ id: string; count: number }>();
      const certJobRows = await db
        .prepare(
          `SELECT json_extract(c.value,'$.id') AS id,COUNT(*) AS count,
          SUM(CASE WHEN json_extract(c.value,'$.required') THEN 1 ELSE 0 END) AS required
          FROM jobs j, json_each(j.data,'$.certifications') c WHERE j.status='published' GROUP BY 1`,
        )
        .all<{ id: string; count: number; required: number }>();
      const skillRequestRows = await db
        .prepare(
          `SELECT sr.*,
        COALESCE(a.name,'İstifadəçi') AS user_name
        FROM skill_requests sr LEFT JOIN accounts a ON a.id=sr.user_id
        ORDER BY sr.created DESC LIMIT 100`,
        )
        .all<Record<string, unknown>>();
      return ok({
        metrics: metrics || {},
        users: userRows.results.map((u) => ({
          ...u,
          signals: accountSignals({
            name: String(u.name || ""),
            email: String(u.email || ""),
            role: String(u.role),
            jobsCount: Number(u.jobs_count) || 0,
            applicationsCount: Number(u.applications_count) || 0,
            created: String(u.created || ""),
            verified: u.verified === 1,
          }),
        })),
        jobs: (() => {
          const parsed = jobRows.results.map((row) => ({
            row,
            job: normalizedJobRecord(JSON.parse(row.data), customSkillLabels),
          }));
          const repeats = new Map<string, number>();
          for (const { job } of parsed)
            repeats.set(
              `${job.owner}|${job.title.toLowerCase()}`,
              (repeats.get(`${job.owner}|${job.title.toLowerCase()}`) || 0) + 1,
            );
          return parsed.map(({ row, job }) => ({
            ...job,
            status: row.status,
            ownerName: row.owner_name,
            applicationsCount: Number(row.applications_count) || 0,
            signals: jobSpamSignals(
              job,
              repeats.get(`${job.owner}|${job.title.toLowerCase()}`) || 0,
            ),
          }));
        })(),
        applications: applicationRows.results,
        audit: auditRows.results.map((row) => ({
          ...row,
          details: (() => {
            try {
              return JSON.parse(String(row.details || "{}"));
            } catch {
              return {};
            }
          })(),
        })),
        billing: {
          summary: billingSummary || {},
          invoices: invoiceRows.results.map((row) => ({
            ...row,
            outstanding_cents: Math.max(
              0,
              Number(row.amount_cents) - Number(row.paid_cents),
            ),
            payment_status:
              row.status === "cancelled"
                ? "cancelled"
                : Number(row.paid_cents) >= Number(row.amount_cents)
                  ? "paid"
                  : Number(row.paid_cents) > 0
                    ? "partial"
                    : String(row.due_date) <
                        new Date().toISOString().slice(0, 10)
                      ? "overdue"
                      : "unpaid",
          })),
          payments: paymentRows.results,
        },
        skills: [
          ...SKILL_CATALOG.map((skill) => ({
            ...skill,
            source: "system" as const,
          })),
          ...customSkills,
        ],
        escoSkillCount: Number(escoSkillCount?.count) || 0,
        skillSections,
        skillRequests: skillRequestRows.results,
        relations: (
          await db
            .prepare(
              `SELECT r.kind,r.actor_role,r.target_role,r.created,COALESCE(a.name,'') AS actor_name,COALESCE(t.name,'') AS target_name
            FROM relations r LEFT JOIN accounts a ON a.id=r.actor_id LEFT JOIN accounts t ON t.id=r.target_id
            ORDER BY r.created DESC LIMIT 300`,
            )
            .all()
            .catch(() => ({ results: [] }))
        ).results,
        jobTitles: {
          custom: customTitles,
          total: JOB_TITLE_CATALOG.length + customTitles.length,
        },
        certifications: {
          custom: customCerts,
          total: CERTIFICATION_CATALOG.length + customCerts.length,
          usage: Object.fromEntries(
            [
              ...new Set(
                [...certProfileRows.results, ...certJobRows.results].map(
                  (row) => row.id,
                ),
              ),
            ].map((certId) => [
              certId,
              {
                profiles:
                  Number(
                    certProfileRows.results.find((row) => row.id === certId)
                      ?.count,
                  ) || 0,
                jobs:
                  Number(
                    certJobRows.results.find((row) => row.id === certId)?.count,
                  ) || 0,
                requiredJobs:
                  Number(
                    certJobRows.results.find((row) => row.id === certId)
                      ?.required,
                  ) || 0,
              },
            ]),
          ),
        },
        system: {
          aiEnabled:
            runtime().AI_PROVIDER === "openai"
              ? !!runtime().OPENAI_API_KEY
              : !!(runtime().DEEPSEEK_API_KEY || runtime().OPENAI_API_KEY),
          aiProvider:
            runtime().AI_PROVIDER === "openai" ? "OpenAI" : "DeepSeek",
          authentication: runtime().EXTERNAL_AUTH || "chatgpt",
          cvStorage: runtime().CV_STORAGE || "r2",
          environment: "production",
          skillEmailConfigured: mailConfigured(runtime()),
        },
      });
    }
  if (request.method === "POST" && path === "admin/skills") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new HttpError(403, "Bu sorğuya icazə verilmir.");
      const body = await jsonBody(request);
      const label = str(body.label, 70).replace(/\s+/g, " ");
      const labelEn = str(body.labelEn, 70).replace(/\s+/g, " ");
      const category = str(body.category, 60).replace(/\s+/g, " ");
      const categoryEn = str(body.categoryEn, 60).replace(/\s+/g, " ");
      const aliases = (
        Array.isArray(body.aliases)
          ? body.aliases
          : str(body.aliases, 500).split(/[,;\n]/)
      )
        .map((value: unknown) => str(value, 70).replace(/\s+/g, " "))
        .filter(Boolean)
        .slice(0, 20);
      if (
        !label ||
        !labelEn ||
        !category ||
        !categoryEn ||
        label.length < 2 ||
        labelEn.length < 2
      )
        throw new HttpError(
          400,
          "Bacarıq adı və kateqoriya hər iki dildə tələb olunur.",
        );
      if (label.split(/\s+/).length > 8 || labelEn.split(/\s+/).length > 8)
        throw new HttpError(
          400,
          "Bacarıq qısa və axtarış üçün yararlı olmalıdır; vəzifə cümləsi yazmayın.",
        );
      const candidateKeys = new Set(
        [label, labelEn, ...aliases].map(normalizeSkillKey),
      );
      const allExisting = [...SKILL_CATALOG, ...customSkills];
      const duplicate = allExisting.find((skill) =>
        [skill.label, skill.labelEn, ...skill.aliases].some((value) =>
          candidateKeys.has(normalizeSkillKey(value)),
        ),
      );
      if (duplicate)
        throw new HttpError(
          409,
          `Bu bacarıq və ya sinonimi artıq mövcuddur: ${duplicate.label}.`,
        );
      const skillId = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.batch([
        db
          .prepare(
            "INSERT INTO custom_skills(id,label,label_en,category,category_en,aliases,created_by,created) VALUES(?,?,?,?,?,?,?,?)",
          )
          .bind(
            skillId,
            label,
            labelEn,
            category,
            categoryEn,
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
            "skill-created",
            "skill",
            skillId,
            JSON.stringify({ label, labelEn, category }),
            now,
          ),
      ]);
      return ok(
        {
          ok: true,
          skill: {
            id: `admin:${skillId}`,
            label,
            labelEn,
            category,
            categoryEn,
            aliases,
            source: "admin",
            created: now,
          },
        },
        201,
      );
    }
  if (request.method === "POST" && path === "admin/skills/import") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new HttpError(403, "Bu sorğuya icazə verilmir.");
      const raw = await request.text();
      if (raw.length > 400_000) throw new HttpError(413, "Fayl çox böyükdür.");
      let csv = "";
      try {
        csv = String((JSON.parse(raw) as { csv?: unknown }).csv || "");
      } catch {
        throw new HttpError(400, "Məlumat oxunmadı.");
      }
      const { rows, issues } = parseSkillCsv(csv);
      if (!rows.length && !issues.length)
        throw new HttpError(400, "Faylda sətir tapılmadı.");
      const known = [...SKILL_CATALOG, ...customSkills];
      const keys = new Set(
        known.flatMap((skill) =>
          [skill.label, skill.labelEn, ...skill.aliases].map(normalizeSkillKey),
        ),
      );
      const now = new Date().toISOString();
      let added = 0;
      for (const row of rows) {
        const candidateKeys = [row.label, row.labelEn, ...row.aliases].map(
          normalizeSkillKey,
        );
        if (candidateKeys.some((key) => keys.has(key))) {
          issues.push({
            line: row.line,
            label: row.label,
            reason: "Artıq mövcuddur (ad və ya sinonim)",
          });
          continue;
        }
        try {
          await db
            .prepare(
              "INSERT INTO custom_skills(id,label,label_en,category,category_en,aliases,created_by,created) VALUES(?,?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              row.label,
              row.labelEn,
              row.category,
              row.categoryEn,
              JSON.stringify(row.aliases),
              id,
              now,
            )
            .run();
          candidateKeys.forEach((key) => keys.add(key));
          added++;
        } catch {
          issues.push({
            line: row.line,
            label: row.label,
            reason: "Yazıla bilmədi (təkrar ad)",
          });
        }
      }
      if (added)
        await db
          .prepare(
            "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            "skills-imported",
            "skill",
            "bulk",
            JSON.stringify({ added, skipped: issues.length }),
            now,
          )
          .run();
      return ok({
        ok: true,
        added,
        issues: issues.sort((a, b) => a.line - b.line),
      });
    }
  if (request.method === "GET" && path === "admin/certifications/export") {
      const usageRows = await db
        .prepare(
          `SELECT json_extract(c.value,'$.id') AS id,COUNT(*) AS count
          FROM profiles p, json_each(p.data,'$.certifications') c GROUP BY 1`,
        )
        .all<{ id: string; count: number }>();
      const usage = new Map(
        usageRows.results.map((row) => [row.id, Number(row.count) || 0]),
      );
      const workbook = createXlsx(
        [
          "Sertifikat",
          "Təşkilat",
          "Bölmə",
          "Category",
          "Səviyyələr",
          "Sübut etdiyi bacarıqlar",
          "Sinonimlər",
          "Mənbə",
          "Profillərdə",
        ],
        [...CERTIFICATION_CATALOG, ...customCerts].map((definition) => [
          definition.name,
          definition.issuer,
          definition.category,
          definition.categoryEn,
          definition.scale
            ? `${definition.scale.min}–${definition.scale.max}`
            : (definition.levels || []).join("; "),
          definition.skills
            .map(
              (id) =>
                SKILL_CATALOG.find((skill) => skill.id === id)?.label || id,
            )
            .join("; "),
          definition.aliases.slice(1).join("; "),
          definition.id.startsWith("admin:") ? "Admin" : "JobMatch",
          usage.get(definition.id) || 0,
        ]),
        "Sertifikatlar",
      );
      return new Response(Uint8Array.from(workbook).buffer, {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition":
            'attachment; filename="joblink-certifications.xlsx"',
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }
  return undefined;
}
