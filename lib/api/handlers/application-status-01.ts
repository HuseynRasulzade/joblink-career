// application-status: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { APPLICATION_STATUSES, WITHDRAWN_STATUS, sanitizeRejection } from "@/lib/recruitment";
import { HttpError, jsonBody, str } from "@/lib/server";
import { addHiredEmployee } from "@/lib/api-matching";
import { manualStatusMove } from "@/lib/application-flow";
import { notify, recordApplicationEvent } from "@/lib/api-core";
import { assertStaffPlace, normalizedJobRecord, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_application_status_01(c: Pick<RouteCtx, "customSkillLabels" | "db" | "id" | "path" | "request" | "userId">): Promise<Response | undefined> {
  const { customSkillLabels, db, id, path, request, userId } = c;
  if (request.method === "POST" && path === "application-status") {
    const b = await jsonBody(request);
    if (!APPLICATION_STATUSES.includes(b.status))
      throw new HttpError(400, "Status yanlışdır.");
    const row = await db
      .prepare(
        "SELECT a.id,a.status,a.stage,a.candidate_id,j.data AS job_data FROM applications a JOIN jobs j ON a.job_id=j.id WHERE a.id=? AND j.owner=?",
      )
      .bind(str(b.id, 100), id)
      .first<{
        id: string;
        status: string;
        stage: string;
        candidate_id: string;
        job_data: string;
      }>();
    if (!row) throw new HttpError(403, "Bu müraciəti dəyişə bilməzsiniz.");
    if (row.status === WITHDRAWN_STATUS)
      throw new HttpError(409, "Namizəd bu müraciəti geri götürüb.");
    // The statuses follow the stages and documents: an offer, an interview or a hire is reached through its own action.
    const move = manualStatusMove(row.status, b.status);
    if (!move.ok) throw new HttpError(409, move.message);
    // Hiring straight from the interview phase needs proof that a stage took place: a held interview or a submitted test.
    // (An accepted offer hires through its own path.)
    if (b.status === "İşə qəbul edildi" && row.status === "Müsahibə") {
      const held = await db
        .prepare(
          "SELECT (SELECT COUNT(*) FROM interviews WHERE application_id=? AND status='completed') + (SELECT COUNT(*) FROM assessment_assignments WHERE application_id=? AND status IN ('submitted','expired')) AS n",
        )
        .bind(row.id, row.id)
        .first<{ n: number }>();
      if (!held || Number(held.n) < 1)
        throw new HttpError(409, "İşə qəbul üçün müsahibə keçirilməli (və ya test təhvil verilməli) idi. Müsahibə vaxtı gələndən sonra o avtomatik tamamlanır.");
    }
    const job = normalizedJobRecord(
      JSON.parse(row.job_data),
      customSkillLabels,
    );
    // A stage belongs to the interview phase and must be one of the vacancy's stages.
    const stage =
      b.status === "Müsahibə" && (job.stages || []).includes(str(b.stage, 60))
        ? str(b.stage, 60)
        : "";
    // An offer that waits for the candidate's answer decides the outcome: hiring
    // is not allowed until it is accepted (which hires automatically with the
    // offer's salary), and rejecting the candidate withdraws it.
    const pendingOffer =
      row.status !== b.status &&
      (b.status === "İşə qəbul edildi" || b.status === "Uyğun deyil")
        ? await db
            .prepare(
              "SELECT id FROM offers WHERE application_id=? AND status='sent'",
            )
            .bind(row.id)
            .first<{ id: string }>()
            .catch(() => null)
        : null;
    if (pendingOffer && b.status === "İşə qəbul edildi")
      throw new HttpError(
        409,
        "Namizədin iş təklifinə cavabı gözlənilir. Namizəd təklifi qəbul edəndə işə qəbul avtomatik tamamlanır. Gözləmək istəmirsinizsə, əvvəlcə təklifi geri çəkin.",
      );
    // Taking the person on needs a free place in the staff table for the vacancy's position.
    if (b.status === "İşə qəbul edildi" && row.status !== b.status)
      await assertStaffPlace(db, id, { branch: job.branch, department: job.department || "", section: job.section || "", position: job.title || "" });
    await db
      .prepare("UPDATE applications SET status=?,stage=?,updated=? WHERE id=?")
      .bind(b.status, stage, new Date().toISOString(), row.id)
      .run();
    if (pendingOffer) {
      await db
        .prepare("UPDATE offers SET status='withdrawn',updated=? WHERE id=?")
        .bind(new Date().toISOString(), pendingOffer.id)
        .run();
      await recordApplicationEvent(db, {
        applicationId: row.id,
        actorId: id,
        actorRole: "company",
        type: "offer",
        to: "geri götürüldü",
      });
    }
    if (row.status !== b.status)
      await recordApplicationEvent(db, {
        applicationId: row.id,
        actorId: id,
        actorRole: "company",
        type: "status",
        from: row.status,
        to: b.status,
      });
    // The reason stays inside the company unless the employer chose to share it with the candidate.
    const rejection =
      row.status !== b.status && b.status === "Uyğun deyil"
        ? sanitizeRejection({
            reason: b.rejectionReason,
            note: b.rejectionNote,
            share: b.shareReason,
          })
        : null;
    if (rejection?.reason)
      await recordApplicationEvent(db, {
        applicationId: row.id,
        actorId: userId,
        actorRole: "company",
        type: "rejection",
        to: rejection.label,
        note: `${rejection.share ? "shared" : "private"}${rejection.share && rejection.note ? `: ${rejection.note}` : ""}`,
      });
    if (row.status !== b.status && b.status === "İşə qəbul edildi")
      await addHiredEmployee(db, row.id);
    if (stage && stage !== row.stage)
      await recordApplicationEvent(db, {
        applicationId: row.id,
        actorId: id,
        actorRole: "company",
        type: "stage",
        from: row.stage,
        to: stage,
      });
    if (row.status !== b.status || (stage && stage !== row.stage))
      await notify(db, {
        userId: row.candidate_id,
        type: "application-status",
        title: `${job.title}: ${stage || b.status}`,
        body: rejection?.share
          ? `${job.company} müraciətinizin statusunu yenilədi. Səbəb: ${rejection.label}${rejection.note ? ` — ${rejection.note}` : ""}`
          : b.status === "Müsahibə" && row.status !== "Müsahibə"
            ? `${job.company} sizi müsahibəyə dəvət edir. Müsahibənin vaxtı təyin ediləndə bildiriş alacaqsınız.`
            : `${job.company} müraciətinizin statusunu yenilədi.`,
        link: "applications",
      });
    return ok({ ok: true });
  }
  return undefined;
}
