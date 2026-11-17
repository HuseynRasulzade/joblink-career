// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, profileInput, str } from "@/lib/server";
import { INTERVIEW_STATUS_LABEL } from "@/lib/interviews";
import { type Job, type Profile, candidateCertifications, sampleJobs } from "@/lib/model";
import { VERIFICATION_LABELS, statusFromAi } from "@/lib/verification";
import { WITHDRAWN_STATUS } from "@/lib/recruitment";
import { blockedBetween, notify, recordApplicationEvent } from "@/lib/api-core";
import { certificationById } from "@/lib/certification-catalog";
import { normalizeExternalSource } from "@/lib/sources";
import { viewerKey } from "@/lib/job-views";
import { OPEN_JOBS_SQL, Row, aiDocumentCheck, allowedEscoLabels, keepProfileVersion, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_37(c: Pick<RouteCtx, "customSkillLabels" | "db" | "id" | "path" | "request" | "requestUrl" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { customSkillLabels, db, id, path, request, requestUrl, requirePermission, userId } = c;
  if (request.method === "GET" && path === "company/audit-summary") {
    requirePermission("audit");
    const days = Math.max(
      1,
      Math.min(
        180,
        Math.round(Number(requestUrl.searchParams.get("days"))) || 30,
      ),
    );
    const rows = await db
      .prepare(
        `SELECT COALESCE(a.name,'') AS actor,c.actor_id,COUNT(*) AS actions,MAX(c.created) AS last,
          COUNT(DISTINCT c.action) AS kinds FROM company_audit c LEFT JOIN accounts a ON a.id=c.actor_id
        WHERE c.company_id=? AND c.created>? GROUP BY c.actor_id ORDER BY actions DESC LIMIT 50`,
      )
      .bind(id, new Date(Date.now() - days * 86400000).toISOString())
      .all<{
        actor: string;
        actor_id: string;
        actions: number;
        last: string;
        kinds: number;
      }>();
    return ok({ days, members: rows.results });
  }
  if (request.method === "GET" && path === "company/audit") {
    requirePermission("audit");
    const rows = await db
      .prepare(
        `SELECT c.action,c.target,c.detail,c.created,COALESCE(a.name,'') AS actor FROM company_audit c LEFT JOIN accounts a ON a.id=c.actor_id
        WHERE c.company_id=? ORDER BY c.created DESC LIMIT 200`,
      )
      .bind(id)
      .all();
    return ok({ events: rows.results });
  }
  if (request.method === "POST" && path === "profile") {
    const body = await jsonBody(request);
    const escoLabels = await allowedEscoLabels(db, body.skills);
    const p = profileInput(body, [...customSkillLabels, ...escoLabels]);
    if (!p.name || !p.email || !p.title)
      throw new HttpError(400, "Ad, e-poçt və ixtisas sahələrini doldurun.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email))
      throw new HttpError(400, "Etibarlı e-poçt ünvanı yazın.");
    await keepProfileVersion(db, id, JSON.stringify(p));
    await db
      .prepare(
        "INSERT INTO profiles (user_id,data,active,updated) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,active=excluded.active,updated=excluded.updated",
      )
      .bind(
        id,
        JSON.stringify(p),
        p.active ? "1" : "0",
        new Date().toISOString(),
      )
      .run();
    return ok({ profile: p });
  }
  if (request.method === "GET" && path === "profile/versions") {
    const rows = await db
      .prepare(
        "SELECT id,data,created FROM profile_versions WHERE user_id=? ORDER BY created DESC LIMIT 10",
      )
      .bind(id)
      .all<{ id: string; data: string; created: string }>()
      .catch(() => ({
        results: [] as { id: string; data: string; created: string }[],
      }));
    return ok({
      versions: rows.results.map((r) => {
        let d: Partial<Profile> = {};
        try {
          d = JSON.parse(r.data);
        } catch {
          d = {};
        }
        return {
          id: r.id,
          created: r.created,
          title: d.title || "",
          skills: (d.skills || []).length,
          experiences: (d.experiences || []).length,
          cvName: d.cvName || "",
        };
      }),
    });
  }
  if (request.method === "POST" && path === "profile/restore") {
    const b = await jsonBody(request);
    const row = await db
      .prepare("SELECT data FROM profile_versions WHERE id=? AND user_id=?")
      .bind(str(b.id, 100), id)
      .first<{ data: string }>();
    if (!row) throw new HttpError(404, "Versiya tapılmadı.");
    const restored = profileInput(JSON.parse(row.data), customSkillLabels, {
      preserveStoredSkills: true,
    });
    await keepProfileVersion(db, id, JSON.stringify(restored), true);
    await db
      .prepare(
        "INSERT INTO profiles (user_id,data,active,updated) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,active=excluded.active,updated=excluded.updated",
      )
      .bind(
        id,
        JSON.stringify(restored),
        restored.active ? "1" : "0",
        new Date().toISOString(),
      )
      .run();
    return ok({ profile: restored });
  }
  if (request.method === "POST" && path === "save") {
    const b = await jsonBody(request);
    const jobId = str(b.jobId, 100);
    const exists =
      sampleJobs.some((j) => j.id === jobId) ||
      (await db.prepare(`${OPEN_JOBS_SQL} AND j.id=?`).bind(jobId).first());
    if (!exists && b.saved === true)
      throw new HttpError(404, "Vakansiya tapılmadı.");
    if (b.saved === true)
      await db
        .prepare("INSERT OR IGNORE INTO saved(id,user_id,job_id) VALUES(?,?,?)")
        .bind(crypto.randomUUID(), id, jobId)
        .run();
    else
      await db
        .prepare("DELETE FROM saved WHERE user_id=? AND job_id=?")
        .bind(id, jobId)
        .run();
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "apply") {
    const b = await jsonBody(request);
    const jobId = str(b.jobId, 100);
    const row = await db
      .prepare("SELECT data FROM profiles WHERE user_id=?")
      .bind(id)
      .first<Row>();
    if (!row)
      throw new HttpError(
        400,
        "Əvvəlcə profilinizi yaradın və yadda saxlayın.",
      );
    const p = JSON.parse(row.data) as Profile;
    if (!p.experiences.length && !p.cvText)
      throw new HttpError(
        400,
        "Müraciətdən əvvəl iş təcrübəsi və ya CV əlavə edin.",
      );
    const found =
      sampleJobs.find((j) => j.id === jobId) ||
      (await db
        .prepare(`${OPEN_JOBS_SQL} AND j.id=?`)
        .bind(jobId)
        .first<Row>());
    if (!found)
      throw new HttpError(
        404,
        "Vakansiya artıq aktiv deyil və ya müraciət müddəti bitib.",
      );
    if (
      typeof (found as Row).data === "string" &&
      (JSON.parse((found as Row).data) as Job).external
    )
      throw new HttpError(
        400,
        "Bu vakansiya başqa saytdan göstərilir. Müraciət üçün “Orijinal elana keç” düyməsindən istifadə edin.",
      );
    if (
      "owner" in found &&
      typeof found.owner === "string" &&
      !sampleJobs.some((sample) => sample.id === jobId) &&
      (await blockedBetween(db, id, found.owner))
    )
      throw new HttpError(
        403,
        "Bu şirkətin vakansiyalarına müraciət etmək mümkün deyil.",
      );
    // Where the candidate came from: a tracking link, an earlier message from the company, or the site itself.
    let source = normalizeExternalSource(b.source);
    if (!source && "owner" in found && typeof found.owner === "string") {
      const invited = await db
        .prepare(
          "SELECT 1 AS x FROM message_threads WHERE company_id=? AND candidate_id=? AND job_id=? LIMIT 1",
        )
        .bind(found.owner, id, jobId)
        .first()
        .catch(() => null);
      source = invited ? "invite" : "platform";
    }
    // A withdrawn application may be resubmitted with the current profile.
    const applyResult = await db
      .prepare(
        `INSERT INTO applications(id,job_id,candidate_id,data,status,created,auto,source) VALUES(?,?,?,?,?,?,0,?)
          ON CONFLICT(job_id,candidate_id) DO UPDATE SET data=excluded.data,status=excluded.status,created=excluded.created,auto=0,source=excluded.source
          WHERE applications.status='${WITHDRAWN_STATUS}'`,
      )
      .bind(
        crypto.randomUUID(),
        jobId,
        id,
        JSON.stringify(p),
        "Göndərildi",
        new Date().toISOString(),
        source || "platform",
      )
      .run();
    if (applyResult.meta.changes > 0) {
      const appRow = await db
        .prepare(
          "SELECT id FROM applications WHERE job_id=? AND candidate_id=?",
        )
        .bind(jobId, id)
        .first<{ id: string }>();
      if (appRow)
        await recordApplicationEvent(db, {
          applicationId: appRow.id,
          actorId: id,
          actorRole: "candidate",
          type: "applied",
          to: "Göndərildi",
        });
      const owner = sampleJobs.some((sample) => sample.id === jobId)
        ? null
        : await db
            .prepare(
              "SELECT owner,json_extract(data,'$.title') AS title,json_extract(data,'$.company') AS company FROM jobs WHERE id=?",
            )
            .bind(jobId)
            .first<{ owner: string; title: string; company: string }>();
      if (owner) {
        await notify(db, {
          userId: owner.owner,
          type: "application",
          title: `Yeni müraciət: ${owner.title}`,
          link: "hr-candidates",
          email: true,
        });
        // The candidate is told at once that the application arrived: silence after applying is what candidates dislike most.
        await notify(db, {
          userId: id,
          type: "application-status",
          title: `Müraciətiniz qəbul olundu: ${owner.title}`,
          body: `${owner.company ? `${owner.company} ` : "İşəgötürən "}müraciətinizə baxacaq. Status dəyişəndə burada və “Müraciətlərim” bölməsində görəcəksiniz.`,
          link: "applications",
          email: true,
        }).catch(() => undefined);
      }
    }
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "withdraw") {
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        "SELECT id,status FROM applications WHERE id=? AND candidate_id=?",
      )
      .bind(str(b.id, 100), id)
      .first<{ id: string; status: string }>();
    if (!row) throw new HttpError(404, "Müraciət tapılmadı.");
    if (
      ["İşə qəbul edildi", "Uyğun deyil", WITHDRAWN_STATUS].includes(row.status)
    )
      throw new HttpError(409, "Bu müraciət artıq yekunlaşıb.");
    await db
      .prepare(
        "UPDATE applications SET status=?,updated=? WHERE id=? AND candidate_id=?",
      )
      .bind(WITHDRAWN_STATUS, new Date().toISOString(), row.id, id)
      .run();
    await recordApplicationEvent(db, {
      applicationId: row.id,
      actorId: id,
      actorRole: "candidate",
      type: "withdrawn",
      from: row.status,
      to: WITHDRAWN_STATUS,
      note: str(b.reason, 200),
    });
    return ok({ ok: true, status: WITHDRAWN_STATUS });
  }
  if (request.method === "GET" && path === "verifications") {
    const rows = await db
      .prepare(
        "SELECT id,kind,item_key,item_label,doc_name,status,ai_result,admin_note,created,updated FROM verifications WHERE user_id=? ORDER BY updated DESC",
      )
      .bind(userId)
      .all<{ ai_result: string }>();
    return ok({
      verifications: rows.results.map((r) => ({
        ...r,
        ai_result: r.ai_result ? JSON.parse(r.ai_result) : null,
      })),
    });
  }
  if (request.method === "POST" && path === "verifications/submit") {
    const raw = await request.text();
    if (raw.length > 1_600_000)
      throw new HttpError(413, "Fayl çox böyükdür (maksimum 1 MB).");
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Məlumat oxunmadı.");
    }
    const kind =
      b.kind === "certification"
        ? "certification"
        : b.kind === "experience"
          ? "experience"
          : "";
    if (!kind) throw new HttpError(400, "Yoxlama növü yanlışdır.");
    const doc = b.document as
      { name?: unknown; type?: unknown; data?: unknown } | undefined;
    const type = str(doc?.type, 60);
    if (
      !doc ||
      typeof doc.data !== "string" ||
      !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        type,
      )
    )
      throw new HttpError(400, "PDF və ya şəkil yükləyin.");
    if (doc.data.length > 1_400_000)
      throw new HttpError(413, "Fayl 1 MB-dan böyük olmamalıdır.");
    const profileRow = await db
      .prepare("SELECT data FROM profiles WHERE user_id=?")
      .bind(userId)
      .first<Row>();
    if (!profileRow)
      throw new HttpError(400, "Əvvəlcə profilinizi yadda saxlayın.");
    const p = JSON.parse(profileRow.data) as Profile;
    const itemKey = str(b.itemKey, 100);
    let label = "";
    let claim = "";
    if (kind === "experience") {
      const e = p.experiences.find((x) => x.id === itemKey);
      if (!e)
        throw new HttpError(
          404,
          "Bu iş təcrübəsi profildə tapılmadı. Əvvəlcə profili yadda saxlayın.",
        );
      label = `${e.title} · ${e.company}`;
      claim = `Person: ${p.name}\nEmployer: ${e.company}\nPosition: ${e.title}\nPeriod: ${e.start} – ${e.current ? "present" : e.end}`;
    } else {
      const c = candidateCertifications(p).find((x) => x.id === itemKey);
      if (!c)
        throw new HttpError(
          404,
          "Bu sertifikat profildə tapılmadı. Əvvəlcə profili yadda saxlayın.",
        );
      const def = certificationById(c.id);
      label = `${def?.name || c.id}${c.level ? ` (${c.level})` : ""}`;
      claim = `Person: ${p.name}\nCertificate: ${def?.name || c.id}${def?.issuer ? ` issued by ${def.issuer}` : ""}${c.level ? `\nLevel or score: ${c.level}` : ""}${c.year ? `\nYear: ${c.year}` : ""}${c.passed?.length ? `\nPassed modules: ${c.passed.join(", ")}` : ""}`;
    }
    const document = { name: str(doc.name, 160), type, data: doc.data };
    const check = await aiDocumentCheck(document, claim);
    const status = statusFromAi(check);
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO verifications(id,user_id,kind,item_key,item_label,doc_name,doc_type,doc_data,status,ai_result,admin_note,reviewed_by,reviewed_at,created,updated)
        VALUES(?,?,?,?,?,?,?,?,?,?,'','','',?,?)
        ON CONFLICT(user_id,kind,item_key) DO UPDATE SET item_label=excluded.item_label,doc_name=excluded.doc_name,doc_type=excluded.doc_type,doc_data=excluded.doc_data,
          status=excluded.status,ai_result=excluded.ai_result,admin_note='',reviewed_by='',reviewed_at='',updated=excluded.updated`,
      )
      .bind(
        crypto.randomUUID(),
        userId,
        kind,
        itemKey,
        label,
        document.name,
        type,
        document.data,
        status,
        check ? JSON.stringify(check) : "",
        now,
        now,
      )
      .run();
    return ok({
      ok: true,
      status,
      label: VERIFICATION_LABELS[status],
      ai: check,
    });
  }
  if (request.method === "POST" && path === "verifications/delete") {
    const b = await jsonBody(request);
    await db
      .prepare("DELETE FROM verifications WHERE id=? AND user_id=?")
      .bind(str(b.id, 100), userId)
      .run();
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "verifications/doc") {
    const row = await db
      .prepare(
        "SELECT doc_type,doc_data FROM verifications WHERE id=? AND user_id=?",
      )
      .bind(str(requestUrl.searchParams.get("id"), 100), userId)
      .first<{ doc_type: string; doc_data: string }>();
    if (!row?.doc_data) throw new HttpError(404, "Sənəd tapılmadı.");
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
  if (request.method === "POST" && path === "jobs/view") {
    // Counts one view per candidate, vacancy and day. Only a one-way hash of the viewer is stored.
    const b = await jsonBody(request);
    const jobId = str(b.jobId, 100);
    const job = await db
      .prepare("SELECT owner FROM jobs WHERE id=? AND status='published'")
      .bind(jobId)
      .first<{ owner: string }>();
    if (!job || job.owner === id) return ok({ ok: true, counted: false });
    const result = await db
      .prepare(
        "INSERT OR IGNORE INTO job_views(job_id,viewer,day) VALUES(?,?,?)",
      )
      .bind(
        jobId,
        await viewerKey(id, jobId),
        new Date().toISOString().slice(0, 10),
      )
      .run()
      .catch(() => null);
    return ok({ ok: true, counted: !!result?.meta?.changes });
  }
  if (request.method === "GET" && path === "interviews") {
    const rows = await db
      .prepare(
        `SELECT i.id,i.scheduled_at,i.duration_min,i.kind,i.location,i.note,i.panel,i.slots,i.status,i.candidate_note,COALESCE(json_extract(j.data,'$.title'),'') AS job_title,COALESCE(c.name,'') AS company
        FROM interviews i JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.company_id
        WHERE i.candidate_id=? AND i.status NOT IN ('pending_panel','panel_declined') AND i.scheduled_at>=? ORDER BY i.scheduled_at LIMIT 100`,
      )
      .bind(id, new Date(Date.now() - 14 * 86400000).toISOString())
      .all();
    return ok({
      interviews: rows.results.map((r) => ({
        ...r,
        slots: (() => {
          try {
            return JSON.parse(
              String((r as { slots?: string }).slots || "[]"),
            ) as string[];
          } catch {
            return [] as string[];
          }
        })(),
      })),
      statusLabels: INTERVIEW_STATUS_LABEL,
    });
  }
  return undefined;
}
