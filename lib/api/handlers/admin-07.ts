// admin: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, runtime, str } from "@/lib/server";
import { type TaxCheck, companyDetailsInput, sanitizeTaxCheck, taxNameMatches } from "@/lib/company";
import { companyAudit, notify, sendUserEmail } from "@/lib/api-core";
import { mailerOf } from "@/lib/mail";
import { purgeOldJobViews, runDigests, runInterviewReminders } from "@/lib/digest-job";
import { ok } from "@/lib/api/shared";
import { runPlanDigest } from "@/lib/plan-digest";
import { runOrderDigest } from "@/lib/order-digest";
import { runAtsDigest } from "@/lib/ats-digest";
import { runReportSchedules } from "@/lib/report-schedules";
import { purgeOldReportJobs } from "@/lib/report-jobs";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_admin_07(c: Pick<RouteCtx, "db" | "id" | "path" | "request" | "requestUrl">): Promise<Response | undefined> {
  const { db, id, path, request, requestUrl } = c;
  if (request.method === "GET" && path === "admin/company-verifications") {
      const rows = await db
        .prepare(
          `SELECT p.company_id,p.data,p.doc_name,p.verification_status,p.verification_note,p.submitted_at,p.reviewed_at,p.tax_check,a.name
          FROM company_profiles p JOIN accounts a ON a.id=p.company_id
          ORDER BY CASE p.verification_status WHEN 'pending' THEN 0 ELSE 1 END, p.submitted_at DESC LIMIT 300`,
        )
        .all<{
          company_id: string;
          data: string;
          doc_name: string;
          verification_status: string;
          verification_note: string;
          submitted_at: string;
          reviewed_at: string;
          tax_check: string;
          name: string;
        }>();
      return ok({
        companies: rows.results.map(({ tax_check, ...r }) => {
          const data = companyDetailsInput(JSON.parse(r.data));
          let taxCheck: TaxCheck | null = null;
          try {
            taxCheck = tax_check ? (JSON.parse(tax_check) as TaxCheck) : null;
          } catch {
            taxCheck = null;
          }
          return {
            ...r,
            data,
            taxCheck,
            // A result recorded for another VÖEN is outdated; the name is compared with the declared legal name.
            taxStale: !!taxCheck && taxCheck.voen !== data.voen,
            taxNameMatch:
              !!taxCheck && taxNameMatches(data.legalName, taxCheck.name),
          };
        }),
      });
    }
  if (request.method === "GET" && path === "admin/company-doc") {
      const row = await db
        .prepare(
          "SELECT doc_type,doc_data FROM company_profiles WHERE company_id=?",
        )
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
  if (request.method === "POST" && path === "admin/run-digests") {
      // Same job the daily cron runs; "force" sends to every subscriber now.
      const body = await jsonBody(request);
      const settings = runtime();
      const sent = await runDigests(
        db,
        mailerOf(settings) as never,
        settings.EMAIL_FROM,
        new Date(),
        body.force === true,
      );
      const reminders = await runInterviewReminders(
        db,
        mailerOf(settings) as never,
        settings.EMAIL_FROM,
        new Date(),
      );
      const purged = await purgeOldJobViews(db);
      // The plan notes and the scheduled report e-mails too. "force" makes every schedule due now and the plan note go out whatever the weekday;
      // "dryRun" builds the report e-mails but sends nothing: the messages come back in the answer (a check for the administrator).
      const captured: { to: string; subject: string; text: string }[] = [];
      const real = mailerOf(settings);
      const mail = body.dryRun === true ? { send: async (m: { to: string[]; subject: string; text: string }) => { captured.push({ to: m.to[0], subject: m.subject, text: m.text }); } } : real;
      if (body.force === true) await db.prepare("UPDATE report_schedules SET next_run=?").bind(new Date(Date.now() - 86400000).toISOString().slice(0, 10)).run().catch(() => undefined);
      const planNotes = body.dryRun === true ? 0 : await runPlanDigest(db, new Date(), body.force === true);
      const orderNotes = body.dryRun === true ? 0 : await runOrderDigest(db, new Date(), body.force === true);
      const atsNotes = body.dryRun === true ? 0 : await runAtsDigest(db, new Date(), body.force === true);
      const reportMails = await runReportSchedules(db, mail as never, settings.EMAIL_FROM || (body.dryRun === true ? "dry-run@local" : undefined));
      await purgeOldReportJobs(db);
      return ok({ sent, reminders, purged, planNotes, orderNotes, atsNotes, reportMails, ...(body.dryRun === true ? { captured } : {}) });
    }
  if (request.method === "POST" && path === "admin/company-tax-check") {
      const b = await jsonBody(request);
      const companyId = str(b.companyId, 100);
      const row = await db
        .prepare("SELECT data FROM company_profiles WHERE company_id=?")
        .bind(companyId)
        .first<{ data: string }>();
      if (!row) throw new HttpError(404, "Şirkət tapılmadı.");
      const details = companyDetailsInput(JSON.parse(row.data));
      const check = sanitizeTaxCheck(b, details.voen, id);
      if (!check)
        throw new HttpError(
          400,
          "VÖEN düzgün deyil və ya vergi ödəyicisinin adı yazılmayıb.",
        );
      await db
        .prepare("UPDATE company_profiles SET tax_check=? WHERE company_id=?")
        .bind(JSON.stringify(check), companyId)
        .run();
      await companyAudit(
        db,
        companyId,
        id,
        "tax-check",
        details.voen,
        `${check.payerType === "legal" ? "hüquqi" : "fiziki"} şəxs · ${check.active ? "aktiv" : "qeyri-aktiv"}`,
      );
      return ok({
        ok: true,
        taxNameMatch: taxNameMatches(details.legalName, check.name),
      });
    }
  if (request.method === "POST" && path === "admin/company-verify") {
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
      const companyId = str(b.companyId, 100);
      const result = await db
        .prepare(
          "UPDATE company_profiles SET verification_status=?,verification_note=?,reviewed_at=?,reviewed_by=? WHERE company_id=? AND doc_data<>''",
        )
        .bind(decision, note, new Date().toISOString(), id, companyId)
        .run();
      if (!result.meta.changes)
        throw new HttpError(404, "Yoxlanacaq sənəd tapılmadı.");
      await notify(db, {
        userId: companyId,
        type: "verification",
        title:
          decision === "verified"
            ? "Şirkətiniz təsdiqləndi"
            : "Şirkət yoxlaması rədd edildi",
        body: note,
        link: "hr-company",
      });
      await sendUserEmail(
        db,
        companyId,
        decision === "verified"
          ? "Şirkətiniz JobMatch-də təsdiqləndi"
          : "Şirkət yoxlaması rədd edildi",
        note || "Şirkət profiliniz təsdiqləndi.",
      );
      return ok({ ok: true });
    }
  return undefined;
}
