// offers: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_offers_01(c: Pick<RouteCtx, "db" | "id" | "offerTemplateDenied" | "path" | "request" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { db, id, offerTemplateDenied, path, request, requirePermission, userId } = c;
  if (request.method === "GET" && path === "offers/templates") {
    requirePermission("offers", offerTemplateDenied);
    const rows = await db
      .prepare(
        "SELECT id,name,data,updated FROM offer_templates WHERE company_id=? ORDER BY name",
      )
      .bind(id)
      .all<{ id: string; name: string; data: string; updated: string }>();
    return ok({
      templates: rows.results.flatMap((r) => {
        try {
          return [
            {
              id: r.id,
              name: r.name,
              updated: r.updated,
              data: JSON.parse(r.data),
            },
          ];
        } catch {
          return [];
        }
      }),
    });
  }
  if (request.method === "POST" && path === "offers/templates/save") {
    requirePermission("offers", offerTemplateDenied);
    const b = await jsonBody(request);
    const name = str(b.name, 80);
    if (name.length < 3) throw new HttpError(400, "Şablonun adını yazın.");
    const d = (b.data && typeof b.data === "object" ? b.data : {}) as Record<
      string,
      unknown
    >;
    // Person-specific values (amount, start date, signer of one offer) are not kept in a template.
    const data = {
      contractType: ["Müddətsiz", "Müddətli", "Mülki-hüquqi"].includes(
        String(d.contractType),
      )
        ? d.contractType
        : "Müddətsiz",
      probationMonths: Math.max(
        0,
        Math.min(6, Math.round(Number(d.probationMonths) || 0)),
      ),
      workSchedule: str(d.workSchedule, 200),
      location: str(d.location, 200),
      benefits: str(d.benefits, 1000),
      message: str(d.message, 2000),
      signerName: str(d.signerName, 120),
      signerTitle: str(d.signerTitle, 120),
      validDays: Math.max(
        1,
        Math.min(60, Math.round(Number(d.validDays) || 7)),
      ),
    };
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM offer_templates WHERE company_id=?")
      .bind(id)
      .first<{ n: number }>();
    const existing = await db
      .prepare("SELECT id FROM offer_templates WHERE company_id=? AND name=?")
      .bind(id, name)
      .first<{ id: string }>();
    if (!existing && (Number(count?.n) || 0) >= 30)
      throw new HttpError(409, "Ən çoxu 30 şablon saxlamaq olar.");
    const now = new Date().toISOString();
    if (existing)
      await db
        .prepare("UPDATE offer_templates SET data=?,updated=? WHERE id=?")
        .bind(JSON.stringify(data), now, existing.id)
        .run();
    else
      await db
        .prepare(
          "INSERT INTO offer_templates(id,company_id,name,data,created_by,updated) VALUES(?,?,?,?,?,?)",
        )
        .bind(crypto.randomUUID(), id, name, JSON.stringify(data), userId, now)
        .run();
    await companyAudit(db, id, userId, "offer-template-saved", name);
    return ok({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "offers/templates/delete") {
    requirePermission("offers", offerTemplateDenied);
    const b = await jsonBody(request);
    await db
      .prepare("DELETE FROM offer_templates WHERE id=? AND company_id=?")
      .bind(str(b.id, 100), id)
      .run();
    return ok({ ok: true });
  }
  return undefined;
}
