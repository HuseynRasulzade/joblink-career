// offers: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { notify, recordApplicationEvent } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_offers_03(c: Pick<RouteCtx, "db" | "id" | "path" | "request">): Promise<Response | undefined> {
  const { db, id, path, request } = c;
  if (request.method === "POST" && path === "offers/withdraw") {
    const b = await jsonBody(request);
    const offer = await db
      .prepare(
        "SELECT id,application_id,candidate_id FROM offers WHERE id=? AND company_id=? AND status='sent'",
      )
      .bind(str(b.id, 100), id)
      .first<{ id: string; application_id: string; candidate_id: string }>();
    if (!offer) throw new HttpError(404, "Cavab gözləyən təklif tapılmadı.");
    const now = new Date().toISOString();
    await db.batch([
      db
        .prepare("UPDATE offers SET status='withdrawn',updated=? WHERE id=?")
        .bind(now, offer.id),
      db
        .prepare(
          "UPDATE applications SET status='Müsahibə',updated=? WHERE id=?",
        )
        .bind(now, offer.application_id),
    ]);
    await recordApplicationEvent(db, {
      applicationId: offer.application_id,
      actorId: id,
      actorRole: "company",
      type: "offer",
      to: "geri götürüldü",
    });
    await notify(db, {
      userId: offer.candidate_id,
      type: "offer",
      title: "İş təklifi geri götürüldü",
      link: "applications",
    });
    return ok({ ok: true });
  }
  return undefined;
}
