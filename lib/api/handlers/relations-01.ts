// relations: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { addHiredEmployee } from "@/lib/api-matching";
import { notify, recordApplicationEvent } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_relations_01(c: Pick<RouteCtx, "accountRole" | "db" | "id" | "path" | "request">): Promise<Response | undefined> {
  const { accountRole, db, id, path, request } = c;
  if (
    request.method === "POST" &&
    (path === "relations/follow" || path === "relations/block")
  ) {
    const body = await jsonBody(request);
    const kind = path === "relations/follow" ? "follow" : "block";
    const targetId = str(body.targetId, 100);
    const target = await db
      .prepare("SELECT id,name,role FROM accounts WHERE id=?")
      .bind(targetId)
      .first<{ id: string; name: string; role: string }>();
    // Candidates follow or block companies; companies follow or block candidates.
    const allowed =
      (accountRole === "candidate" && target?.role === "company") ||
      (accountRole === "company" && target?.role === "candidate");
    if (!target || !allowed)
      throw new HttpError(400, "Bu istifadəçi üçün əməliyyat mümkün deyil.");
    const me = await db
      .prepare("SELECT name FROM accounts WHERE id=?")
      .bind(id)
      .first<{ name: string }>();
    if (body.on === false) {
      await db
        .prepare(
          "DELETE FROM relations WHERE actor_id=? AND target_id=? AND kind=?",
        )
        .bind(id, targetId, kind)
        .run();
      return ok({ ok: true, on: false });
    }
    await db
      .prepare(
        "INSERT OR IGNORE INTO relations(id,actor_id,actor_role,target_id,target_role,kind,note,created) VALUES(?,?,?,?,?,?,?,?)",
      )
      .bind(
        crypto.randomUUID(),
        id,
        accountRole,
        targetId,
        target.role,
        kind,
        str(body.note, 300),
        new Date().toISOString(),
      )
      .run();
    if (kind === "block")
      await db
        .prepare(
          "DELETE FROM relations WHERE actor_id=? AND target_id=? AND kind='follow'",
        )
        .bind(id, targetId)
        .run();
    // Who is told: a company learns it gained a follower; a candidate learns
    // that a company follows or blocked them. A company is not told that a
    // candidate blocked it.
    if (kind === "follow" && accountRole === "candidate")
      await notify(db, {
        userId: targetId,
        type: "follow",
        title: `${me?.name || "Namizəd"} şirkətinizi izləyir`,
        link: "hr-overview",
      });
    if (accountRole === "company")
      await notify(db, {
        userId: targetId,
        type: kind,
        title:
          kind === "follow"
            ? `${me?.name || "Şirkət"} profilinizi izləməyə başladı`
            : `${me?.name || "Şirkət"} sizi blokladı`,
        body:
          kind === "follow"
            ? "Şirkət gələcək vakansiyalar üçün sizi nəzərə almaq istəyir."
            : "Bu şirkətin vakansiyaları və mesajları sizə göstərilməyəcək.",
        link: "overview",
      });
    return ok({ ok: true, on: true });
  }
  if (request.method === "GET" && path === "offers") {
    if (accountRole === "admin") return ok({ offers: [] });
    const column = accountRole === "company" ? "company_id" : "candidate_id";
    const rows = await db
      .prepare(
        `SELECT o.*,COALESCE(c.name,'') AS candidate_name FROM offers o LEFT JOIN accounts c ON c.id=o.candidate_id
        WHERE o.${column}=? ORDER BY o.created DESC LIMIT 200`,
      )
      .bind(id)
      .all<Record<string, unknown> & { data: string }>();
    return ok({
      offers: rows.results.map((row) => ({
        ...row,
        data: JSON.parse(row.data),
      })),
    });
  }
  if (request.method === "POST" && path === "offers/respond") {
    const b = await jsonBody(request);
    const offer = await db
      .prepare(
        "SELECT id,application_id,company_id,data FROM offers WHERE id=? AND candidate_id=? AND status='sent'",
      )
      .bind(str(b.id, 100), id)
      .first<{
        id: string;
        application_id: string;
        company_id: string;
        data: string;
      }>();
    if (!offer) throw new HttpError(404, "Cavab gözləyən təklif tapılmadı.");
    const data = JSON.parse(offer.data) as {
      position: string;
      validUntil?: string;
    };
    const now = new Date().toISOString();
    if (data.validUntil && data.validUntil < now.slice(0, 10))
      throw new HttpError(409, "Təklifin qüvvədə olma müddəti bitib.");
    if (b.action === "accept") {
      const account = await db
        .prepare("SELECT name FROM accounts WHERE id=?")
        .bind(id)
        .first<{ name: string }>();
      const signature = str(b.signatureName, 120).replace(/\s+/g, " ");
      const expected = (account?.name || "").replace(/\s+/g, " ").trim();
      // Electronic acceptance: the candidate types their full name as registered.
      if (
        !signature ||
        signature.toLocaleLowerCase("az") !== expected.toLocaleLowerCase("az")
      )
        throw new HttpError(
          400,
          `Təsdiq üçün adınızı qeydiyyatdakı kimi yazın: ${expected}`,
        );
      if (b.agree !== true)
        throw new HttpError(
          400,
          "Təklifin şərtləri ilə tanış olduğunuzu təsdiqləyin.",
        );
      await db.batch([
        db
          .prepare(
            "UPDATE offers SET status='accepted',signature_name=?,signed_at=?,signed_ip=?,updated=? WHERE id=?",
          )
          .bind(
            signature,
            now,
            request.headers.get("cf-connecting-ip") || "",
            now,
            offer.id,
          ),
        db
          .prepare(
            "UPDATE applications SET status='İşə qəbul edildi',updated=? WHERE id=?",
          )
          .bind(now, offer.application_id),
      ]);
      await recordApplicationEvent(db, {
        applicationId: offer.application_id,
        actorId: id,
        actorRole: "candidate",
        type: "offer",
        to: "qəbul edildi",
      });
      await recordApplicationEvent(db, {
        applicationId: offer.application_id,
        actorId: id,
        actorRole: "candidate",
        type: "status",
        from: "Təklif edildi",
        to: "İşə qəbul edildi",
      });
      await addHiredEmployee(db, offer.application_id);
      await notify(db, {
        userId: offer.company_id,
        type: "offer",
        title: `Təklif qəbul edildi: ${data.position}`,
        link: "hr-candidates",
      });
      return ok({ ok: true, status: "accepted" });
    }
    if (b.action === "decline") {
      const note = str(b.reason, 500);
      await db.batch([
        db
          .prepare(
            "UPDATE offers SET status='declined',response_note=?,updated=? WHERE id=?",
          )
          .bind(note, now, offer.id),
        db
          .prepare(
            "UPDATE applications SET status='Uyğun deyil',updated=? WHERE id=?",
          )
          .bind(now, offer.application_id),
      ]);
      await recordApplicationEvent(db, {
        applicationId: offer.application_id,
        actorId: id,
        actorRole: "candidate",
        type: "offer",
        to: "rədd edildi",
        note,
      });
      await notify(db, {
        userId: offer.company_id,
        type: "offer",
        title: `Təklif rədd edildi: ${data.position}`,
        body: note,
        link: "hr-candidates",
      });
      return ok({ ok: true, status: "declined" });
    }
    throw new HttpError(400, "Əməliyyat yanlışdır.");
  }
  return undefined;
}
