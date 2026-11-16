// admin: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { CERTIFICATION_CATEGORIES, canonicalCertification } from "@/lib/certification-catalog";
import { HttpError, jsonBody, str } from "@/lib/server";
import { SKILL_CATALOG, normalizeSkillKey } from "@/lib/skill-catalog";
import { normalizeVat, vatParts } from "@/lib/vat";
import { notify } from "@/lib/api-core";
import { Row, normalizedJobRecord, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_admin_06(c: Pick<RouteCtx, "customSkillLabels" | "db" | "id" | "path" | "request" | "requestUrl">): Promise<Response | undefined> {
  const { customSkillLabels, db, id, path, request, requestUrl } = c;
  if (request.method === "POST" && path === "admin/certifications") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new HttpError(403, "Bu sorğuya icazə verilmir.");
      const body = await jsonBody(request);
      const name = str(body.name, 120).replace(/\s+/g, " ");
      const issuer = str(body.issuer, 160).replace(/\s+/g, " ");
      const category = str(body.category, 80);
      const split = (value: unknown, max: number) =>
        (Array.isArray(value) ? value : str(value, 1000).split(/[,;\n]/))
          .map((item: unknown) => str(item, 80).replace(/\s+/g, " "))
          .filter(Boolean)
          .slice(0, max);
      const aliases = split(body.aliases, 15);
      const levels = split(body.levels, 10);
      const skills = split(body.skills, 10)
        .map(
          (label: string) =>
            SKILL_CATALOG.find(
              (skill) =>
                skill.id === label ||
                normalizeSkillKey(skill.label) === normalizeSkillKey(label),
            )?.id,
        )
        .filter((id: string | undefined): id is string => !!id);
      if (
        name.length < 2 ||
        issuer.length < 2 ||
        !CERTIFICATION_CATEGORIES[category]
      )
        throw new HttpError(
          400,
          "Sertifikatın adı, verən təşkilat və bölmə tələb olunur.",
        );
      const duplicate = [name, ...aliases]
        .map((value) => canonicalCertification(value))
        .find(Boolean);
      if (duplicate)
        throw new HttpError(
          409,
          `Bu sertifikat və ya sinonimi artıq mövcuddur: ${duplicate.name}.`,
        );
      const certId = crypto.randomUUID();
      const now = new Date().toISOString();
      try {
        await db.batch([
          db
            .prepare(
              "INSERT INTO custom_certifications(id,name,issuer,category,aliases,skills,levels,created_by,created) VALUES(?,?,?,?,?,?,?,?,?)",
            )
            .bind(
              certId,
              name,
              issuer,
              category,
              JSON.stringify(aliases),
              JSON.stringify(skills),
              JSON.stringify(levels),
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
              "certification-created",
              "certification",
              certId,
              JSON.stringify({ name, issuer, category }),
              now,
            ),
        ]);
      } catch {
        throw new HttpError(409, "Bu adda sertifikat artıq mövcuddur.");
      }
      return ok(
        {
          ok: true,
          certification: {
            id: `admin:${certId}`,
            name,
            issuer,
            category,
            categoryEn: CERTIFICATION_CATEGORIES[category],
            aliases: [name, ...aliases],
            skills,
            ...(levels.length ? { levels } : {}),
          },
        },
        201,
      );
    }
  if (request.method === "POST" && path === "admin/billing/invoice") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new HttpError(403, "Bu sorğuya icazə verilmir.");
      const body = await jsonBody(request);
      const accountId = str(body.accountId, 100);
      const description = str(body.description, 160);
      const amountCents = Math.round(Number(body.amountCents));
      const dueDate = str(body.dueDate, 10);
      if (
        !accountId ||
        !description ||
        !Number.isInteger(amountCents) ||
        amountCents <= 0 ||
        amountCents > 100000000
      )
        throw new HttpError(400, "Hesab-faktura məlumatları düzgün deyil.");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
        !Number.isFinite(new Date(`${dueDate}T00:00:00Z`).getTime())
      )
        throw new HttpError(400, "Son ödəniş tarixini düzgün seçin.");
      const target = await db
        .prepare("SELECT role FROM accounts WHERE id=? AND status='active'")
        .bind(accountId)
        .first<{ role: string }>();
      if (!target || target.role === "admin")
        throw new HttpError(
          400,
          "Ödəniş üçün aktiv istifadəçi və ya şirkət seçin.",
        );
      const invoiceId = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.batch([
        db
          .prepare(
            "INSERT INTO billing_invoices(id,account_id,description,amount_cents,currency,vat_percent,due_date,status,created_by,created,updated) VALUES(?,?,?,?,?,?,?,'open',?,?,?)",
          )
          .bind(
            invoiceId,
            accountId,
            description,
            amountCents,
            "AZN",
            normalizeVat(body.vatPercent),
            dueDate,
            id,
            now,
            now,
          ),
        db
          .prepare(
            "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            "invoice-created",
            "invoice",
            invoiceId,
            JSON.stringify({ accountId, amountCents, dueDate }),
            now,
          ),
      ]);
      // The account is told about the invoice right away, by e-mail too when sending is configured.
      const parts = vatParts(amountCents, normalizeVat(body.vatPercent));
      const invoiceText = `${description}: ${(amountCents / 100).toFixed(2)} AZN${parts.vat ? ` (o cümlədən ƏDV ${(parts.vat / 100).toFixed(2)} AZN)` : ""}. Son ödəniş tarixi: ${dueDate}.`;
      await notify(db, {
        userId: accountId,
        type: "billing",
        title: "Yeni hesab-faktura",
        body: invoiceText,
        link: "hr-billing",
      });
      return ok({ ok: true, id: invoiceId }, 201);
    }
  if (request.method === "POST" && path === "admin/billing/payment") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new HttpError(403, "Bu sorğuya icazə verilmir.");
      const body = await jsonBody(request);
      const invoiceId = str(body.invoiceId, 100);
      const amountCents = Math.round(Number(body.amountCents));
      const method = str(body.method, 20);
      const reference = str(body.reference, 100);
      const note = str(body.note, 300);
      const paidAt = str(body.paidAt, 10);
      if (
        !invoiceId ||
        !Number.isInteger(amountCents) ||
        amountCents <= 0 ||
        !["bank", "card", "cash", "other"].includes(method)
      )
        throw new HttpError(400, "Ödəniş məlumatları düzgün deyil.");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(paidAt) ||
        !Number.isFinite(new Date(`${paidAt}T00:00:00Z`).getTime())
      )
        throw new HttpError(400, "Ödəniş tarixini düzgün seçin.");
      const invoice = await db
        .prepare(
          `SELECT bi.account_id,bi.amount_cents,bi.status,
        COALESCE((SELECT SUM(amount_cents) FROM billing_payments WHERE invoice_id=bi.id),0) AS paid_cents
        FROM billing_invoices bi WHERE bi.id=?`,
        )
        .bind(invoiceId)
        .first<{
          account_id: string;
          amount_cents: number;
          status: string;
          paid_cents: number;
        }>();
      if (!invoice || invoice.status !== "open")
        throw new HttpError(404, "Aktiv hesab-faktura tapılmadı.");
      const outstanding =
        Number(invoice.amount_cents) - Number(invoice.paid_cents);
      if (amountCents > outstanding)
        throw new HttpError(
          400,
          `Ödəniş qalıq borcdan çox ola bilməz: ${(outstanding / 100).toFixed(2)} AZN.`,
        );
      const paymentId = crypto.randomUUID();
      const now = new Date().toISOString();
      await db.batch([
        db
          .prepare(
            "INSERT INTO billing_payments(id,invoice_id,account_id,amount_cents,currency,method,reference,note,paid_at,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
          )
          .bind(
            paymentId,
            invoiceId,
            invoice.account_id,
            amountCents,
            "AZN",
            method,
            reference,
            note,
            paidAt,
            id,
            now,
          ),
        db
          .prepare("UPDATE billing_invoices SET updated=? WHERE id=?")
          .bind(now, invoiceId),
        db
          .prepare(
            "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            id,
            "payment-recorded",
            "payment",
            paymentId,
            JSON.stringify({ invoiceId, amountCents, method }),
            now,
          ),
      ]);
      return ok({ ok: true, id: paymentId }, 201);
    }
  if (request.method === "POST" && path === "admin/jobs/bulk") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new HttpError(403, "Bu sorğuya icazə verilmir.");
      const body = await jsonBody(request);
      const action =
        body.action === "archive"
          ? "archive"
          : body.action === "pause"
            ? "pause"
            : "";
      if (!action) throw new HttpError(400, "Əməliyyat yanlışdır.");
      const ids = [
        ...new Set(
          (Array.isArray(body.ids) ? body.ids : [])
            .map((x: unknown) => str(x, 100))
            .filter(Boolean),
        ),
      ].slice(0, 100) as string[];
      if (!ids.length) throw new HttpError(400, "Vakansiya seçilməyib.");
      const status = action === "pause" ? "paused" : "archived";
      const note = str(body.note, 200);
      const now = new Date().toISOString();
      let done = 0;
      for (const jobId of ids) {
        const job = await db
          .prepare("SELECT data FROM jobs WHERE id=?")
          .bind(jobId)
          .first<Row>();
        if (!job) continue;
        const data = {
          ...normalizedJobRecord(JSON.parse(job.data), customSkillLabels),
          status,
          moderated: true,
        };
        await db.batch([
          db
            .prepare("UPDATE jobs SET status=?,data=? WHERE id=?")
            .bind(status, JSON.stringify(data), jobId),
          db
            .prepare(
              "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
            )
            .bind(
              crypto.randomUUID(),
              id,
              action,
              "job",
              jobId,
              JSON.stringify({ source: "bulk", note }),
              now,
            ),
        ]);
        done++;
      }
      return ok({ ok: true, done });
    }
  if (request.method === "POST" && path === "admin/action") {
      const origin = request.headers.get("origin");
      if (origin && origin !== new URL(request.url).origin)
        throw new HttpError(403, "Bu sorğuya icazə verilmir.");
      const body = await jsonBody(request);
      const entityType = str(body.entityType, 30);
      const entityId = str(body.entityId, 100);
      const action = str(body.action, 30);
      if (entityType === "user") {
        if (!["activate", "suspend"].includes(action))
          throw new HttpError(400, "İstifadəçi əməliyyatı yanlışdır.");
        if (entityId === id)
          throw new HttpError(
            400,
            "Öz administrator hesabınızı dayandıra bilməzsiniz.",
          );
        const target = await db
          .prepare("SELECT role FROM accounts WHERE id=?")
          .bind(entityId)
          .first<{ role: string }>();
        if (!target) throw new HttpError(404, "İstifadəçi tapılmadı.");
        if (target.role === "admin")
          throw new HttpError(
            403,
            "Başqa administrator hesabı bu paneldən dəyişdirilə bilməz.",
          );
        await db
          .prepare("UPDATE accounts SET status=? WHERE id=?")
          .bind(action === "suspend" ? "suspended" : "active", entityId)
          .run();
        if (action === "suspend")
          await db
            .prepare("DELETE FROM sessions WHERE user_id=?")
            .bind(entityId)
            .run();
      } else if (entityType === "job") {
        if (!["publish", "pause", "archive"].includes(action))
          throw new HttpError(400, "Vakansiya əməliyyatı yanlışdır.");
        const job = await db
          .prepare("SELECT data FROM jobs WHERE id=?")
          .bind(entityId)
          .first<Row>();
        if (!job) throw new HttpError(404, "Vakansiya tapılmadı.");
        const status =
          action === "publish"
            ? "published"
            : action === "pause"
              ? "paused"
              : "archived";
        // Remember moderation so the company cannot silently republish it.
        const data = {
          ...normalizedJobRecord(JSON.parse(job.data), customSkillLabels),
          status,
          moderated: action !== "publish",
        };
        await db
          .prepare("UPDATE jobs SET status=?,data=? WHERE id=?")
          .bind(status, JSON.stringify(data), entityId)
          .run();
      } else if (entityType === "invoice") {
        if (action !== "cancel")
          throw new HttpError(400, "Hesab-faktura əməliyyatı yanlışdır.");
        const invoice = await db
          .prepare(
            `SELECT status,(SELECT COUNT(*) FROM billing_payments WHERE invoice_id=billing_invoices.id) AS payment_count FROM billing_invoices WHERE id=?`,
          )
          .bind(entityId)
          .first<{ status: string; payment_count: number }>();
        if (!invoice) throw new HttpError(404, "Hesab-faktura tapılmadı.");
        if (Number(invoice.payment_count) > 0)
          throw new HttpError(
            400,
            "Ödənişi olan hesab-faktura ləğv edilə bilməz.",
          );
        await db
          .prepare(
            "UPDATE billing_invoices SET status='cancelled',updated=? WHERE id=?",
          )
          .bind(new Date().toISOString(), entityId)
          .run();
      } else {
        throw new HttpError(400, "İdarəetmə obyekti yanlışdır.");
      }
      await db
        .prepare(
          "INSERT INTO admin_audit_logs(id,admin_id,action,entity_type,entity_id,details,created) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          action,
          entityType,
          entityId,
          JSON.stringify({ source: "admin-panel" }),
          new Date().toISOString(),
        )
        .run();
      return ok({ ok: true });
    }
  if (request.method === "GET" && path === "admin/verifications") {
      const rows = await db
        .prepare(
          `SELECT v.id,v.user_id,v.kind,v.item_label,v.doc_name,v.status,v.ai_result,v.admin_note,v.updated,COALESCE(a.name,'') AS user_name
          FROM verifications v LEFT JOIN accounts a ON a.id=v.user_id
          ORDER BY CASE WHEN v.status IN ('pending','ai_consistent','ai_issue') THEN 0 ELSE 1 END, v.updated DESC LIMIT 300`,
        )
        .all<{ ai_result: string }>();
      return ok({
        verifications: rows.results.map((r) => ({
          ...r,
          ai_result: r.ai_result ? JSON.parse(r.ai_result) : null,
        })),
      });
    }
  if (request.method === "GET" && path === "admin/verification-doc") {
      const row = await db
        .prepare("SELECT doc_type,doc_data FROM verifications WHERE id=?")
        .bind(str(requestUrl.searchParams.get("id"), 100))
        .first<{ doc_type: string; doc_data: string }>();
      if (!row?.doc_data) throw new HttpError(404, "Sənəd yoxdur.");
      return new Response(
        Uint8Array.from(atob(row.doc_data), (c) => c.charCodeAt(0)),
        {
          headers: {
            "Content-Type": row.doc_type,
            "Content-Disposition": "inline",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    }
  if (request.method === "POST" && path === "admin/verification-decide") {
      const b = await jsonBody(request);
      const decision =
        b.decision === "verified"
          ? "verified"
          : b.decision === "rejected"
            ? "rejected"
            : "";
      if (!decision) throw new HttpError(400, "Qərar yanlışdır.");
      const note = str(b.note, 500);
      if (decision === "rejected" && note.length < 5)
        throw new HttpError(400, "Rədd səbəbini yazın.");
      const row = await db
        .prepare("SELECT user_id,item_label FROM verifications WHERE id=?")
        .bind(str(b.id, 100))
        .first<{ user_id: string; item_label: string }>();
      if (!row) throw new HttpError(404, "Yoxlama tapılmadı.");
      await db
        .prepare(
          "UPDATE verifications SET status=?,admin_note=?,reviewed_by=?,reviewed_at=?,updated=? WHERE id=?",
        )
        .bind(
          decision,
          note,
          id,
          new Date().toISOString(),
          new Date().toISOString(),
          str(b.id, 100),
        )
        .run();
      await notify(db, {
        userId: row.user_id,
        type: "verification",
        title: `${row.item_label}: ${decision === "verified" ? "təsdiqləndi" : "rədd edildi"}`,
        body: note,
        link: "profile",
      });
      return ok({ ok: true });
    }
  return undefined;
}
