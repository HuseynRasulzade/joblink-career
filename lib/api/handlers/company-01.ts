// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { GALLERY_LIMIT, INVITE_DAYS, type JobApproval, VERIFICATION_STATUS, can, canDecide, companyDetailsInput, firstApprover, inviteExpired, newApproval, pendingStep, roleLabel, validVoen } from "@/lib/company";
import { HttpError, jobInput, jsonBody, str } from "@/lib/server";
import { type Job } from "@/lib/model";
import { companyAudit, notify, notifyCompanyRoles, notifyFollowers } from "@/lib/api-core";
import { Row, allowedEscoLabels, ok, sendAdminEmail } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_01(c: Pick<RouteCtx, "approvalRules" | "canDecideStep" | "customSkillLabels" | "db" | "id" | "memberRole" | "path" | "request" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { approvalRules, canDecideStep, customSkillLabels, db, id, memberRole, path, request, requirePermission, userId } = c;
  if (request.method === "POST" && path === "company/invites/respond") {
    const b = await jsonBody(request);
    const me = await db
      .prepare("SELECT email FROM password_accounts WHERE user_id=?")
      .bind(userId)
      .first<{ email: string }>();
    const invite = me
      ? await db
          .prepare(
            "SELECT id,company_id,role FROM company_members WHERE id=? AND email=? AND status='invited'",
          )
          .bind(str(b.id, 100), me.email)
          .first<{ id: string; company_id: string; role: string }>()
      : null;
    if (!invite) throw new HttpError(404, "Dəvət tapılmadı.");
    const sent = await db
      .prepare("SELECT updated FROM company_members WHERE id=?")
      .bind(invite.id)
      .first<{ updated: string }>();
    if (sent && inviteExpired(sent.updated))
      throw new HttpError(
        410,
        `Dəvətin ${INVITE_DAYS} günlük müddəti bitib. Şirkətdən yenidən göndərməsini xahiş edin.`,
      );
    const now = new Date().toISOString();
    if (b.accept !== true) {
      await db
        .prepare(
          "UPDATE company_members SET status='removed',updated=? WHERE id=?",
        )
        .bind(now, invite.id)
        .run();
      return ok({ ok: true });
    }
    if (userId !== id)
      throw new HttpError(409, "Siz artıq başqa şirkətin komandasındasınız.");
    const ownJobs = await db
      .prepare("SELECT COUNT(*) AS n FROM jobs WHERE owner=?")
      .bind(userId)
      .first<{ n: number }>();
    if (Number(ownJobs?.n) > 0)
      throw new HttpError(
        409,
        "Bu hesabın öz vakansiyaları var. Komandaya qoşulmaq üçün ayrıca hesabla daxil olun.",
      );
    await db
      .prepare(
        "UPDATE company_members SET status='active',user_id=?,updated=? WHERE id=?",
      )
      .bind(userId, now, invite.id)
      .run();
    await companyAudit(
      db,
      invite.company_id,
      userId,
      "member-joined",
      me!.email,
      roleLabel(invite.role),
    );
    await notify(db, {
      userId: invite.company_id,
      type: "team",
      title: `${me!.email} komandaya qoşuldu (${roleLabel(invite.role)})`,
      link: "hr-team",
    });
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/leave") {
    if (userId === id) throw new HttpError(400, "Siz hesab sahibisiniz.");
    await db
      .prepare(
        "UPDATE company_members SET status='removed',updated=? WHERE company_id=? AND user_id=? AND status='active'",
      )
      .bind(new Date().toISOString(), id, userId)
      .run();
    await companyAudit(db, id, userId, "member-left");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/approvals") {
    const rows = await db
      .prepare(
        "SELECT id,data,status,created FROM jobs WHERE owner=? AND status IN ('pending_approval','rejected') ORDER BY created DESC LIMIT 100",
      )
      .bind(id)
      .all<Row>();
    return ok({
      jobs: rows.results.map((r) => {
        const job = JSON.parse(r.data) as Job & { approval?: JobApproval };
        // The approver sees the whole vacancy, not only its title.
        return {
          id: r.id,
          status: r.status,
          title: job.title,
          company: job.company,
          city: job.city,
          reason: job.reason,
          created: r.created,
          approval: job.approval,
          category: job.category,
          mode: job.mode,
          type: job.type,
          workSchedule: job.workSchedule,
          benefits: job.benefits,
          reasonNote: job.reasonNote,
          certifications: job.certifications,
          minYears: job.minYears,
          maxYears: job.maxYears,
          minSalary: job.minSalary,
          maxSalary: job.maxSalary,
          skills: job.skills,
          description: job.description,
          requirements: job.requirements,
          deadline: job.deadline,
          canDecide:
            r.status === "pending_approval" &&
            canDecideStep(pendingStep(job.approval)),
          canResubmit:
            r.status === "rejected" &&
            (job.approval?.requestedBy === userId ||
              can(memberRole, "approve-hr")),
        };
      }),
    });
  }
  if (request.method === "POST" && path === "company/approve") {
    const b = await jsonBody(request);
    const decision =
      b.decision === "approve"
        ? "approved"
        : b.decision === "reject"
          ? "rejected"
          : "";
    if (!decision) throw new HttpError(400, "Qərar yanlışdır.");
    const note = str(b.note, 500);
    if (decision === "rejected" && note.length < 5)
      throw new HttpError(400, "Rədd səbəbini yazın.");
    const row = await db
      .prepare(
        "SELECT id,data FROM jobs WHERE id=? AND owner=? AND status='pending_approval'",
      )
      .bind(str(b.jobId, 100), id)
      .first<Row>();
    if (!row) throw new HttpError(404, "Təsdiq gözləyən vakansiya tapılmadı.");
    const job = JSON.parse(row.data) as Job & {
      approval?: JobApproval;
      status?: string;
    };
    const step = pendingStep(job.approval);
    if (!step || !canDecideStep(step))
      throw new HttpError(
        403,
        "Bu mərhələni təsdiqləmək sizin rolunuza aid deyil.",
      );
    if (job.approval?.requestedBy === userId && memberRole !== "owner")
      throw new HttpError(
        403,
        "Öz göndərdiyiniz vakansiyanı təsdiqləyə bilməzsiniz.",
      );
    const me = await db
      .prepare("SELECT name FROM accounts WHERE id=?")
      .bind(userId)
      .first<{ name: string }>();
    // Deciding with a colleague's lent rights is marked, so the history shows it.
    const substitute = !canDecide(memberRole, step);
    Object.assign(step, {
      decision,
      by: userId,
      byName: `${me?.name || ""}${substitute ? " (əvəzedici)" : ""}`,
      at: new Date().toISOString(),
      note,
    });
    const finished = decision === "rejected" || !pendingStep(job.approval);
    const status =
      decision === "rejected"
        ? "rejected"
        : finished
          ? "published"
          : "pending_approval";
    if (
      status === "published" &&
      job.deadline &&
      job.deadline < new Date().toISOString().slice(0, 10)
    )
      throw new HttpError(
        409,
        "Vakansiyanın son tarixi keçib. Yeni tarixlə yenidən göndərin.",
      );
    const next = { ...job, status };
    await db
      .prepare("UPDATE jobs SET status=?,data=? WHERE id=?")
      .bind(status, JSON.stringify(next), row.id)
      .run();
    await companyAudit(
      db,
      id,
      userId,
      `job-${decision}`,
      row.id,
      `${job.title}${note ? ` — ${note}` : ""}`,
    );
    if (job.approval?.requestedBy && job.approval.requestedBy !== id)
      await notify(db, {
        userId: job.approval.requestedBy,
        type: "approval",
        title: `${job.title}: ${status === "published" ? "təsdiqləndi və yayımlandı" : status === "rejected" ? "rədd edildi" : "bir mərhələ təsdiqləndi"}`,
        body: note,
        link: "hr-approvals",
      });
    if (job.approval?.requestedBy)
      await notify(db, {
        userId: id,
        type: "approval",
        title: `${job.title}: ${status === "published" ? "təsdiqləndi və yayımlandı" : status === "rejected" ? "rədd edildi" : `${step.role === "hr" ? "HR" : "direktor"} təsdiqlədi`}`,
        body: note,
        link: "hr-approvals",
      });
    if (status === "pending_approval")
      await notifyCompanyRoles(db, id, "approve-director", {
        type: "approval",
        title: `Direktor təsdiqi gözləyir: ${job.title}`,
        link: "hr-approvals",
      });
    if (status === "published") await notifyFollowers(db, id, next);
    return ok({ ok: true, status });
  }
  if (request.method === "POST" && path === "company/approvals/resubmit") {
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        "SELECT id,data FROM jobs WHERE id=? AND owner=? AND status='rejected'",
      )
      .bind(str(b.jobId, 100), id)
      .first<Row>();
    if (!row) throw new HttpError(404, "Rədd edilmiş vakansiya tapılmadı.");
    const old = JSON.parse(row.data) as Job & {
      approval?: JobApproval;
      createdBy?: string;
    };
    if (old.approval?.requestedBy !== userId && !can(memberRole, "approve-hr"))
      throw new HttpError(
        403,
        "Yenidən göndərmək yalnız vakansiyanı göndərən və ya HR üçün mümkündür.",
      );
    const escoLabels = await allowedEscoLabels(db, b.job?.skills);
    const edited =
      b.job && typeof b.job === "object"
        ? jobInput({ ...old, ...b.job }, [...customSkillLabels, ...escoLabels])
        : null;
    const me = await db
      .prepare("SELECT name FROM accounts WHERE id=?")
      .bind(userId)
      .first<{ name: string }>();
    // The previous decisions stay in the history; a fresh two-step approval starts.
    const history = [
      ...((old as { approvalHistory?: unknown[] }).approvalHistory || []),
      old.approval,
    ]
      .filter(Boolean)
      .slice(-10);
    const next = {
      ...old,
      ...(edited
        ? {
            ...edited,
            id: old.id,
            owner: id,
            created: old.created,
            createdBy: old.createdBy || userId,
          }
        : {}),
      status: "pending_approval",
      approval: newApproval(userId, me?.name || "", (await approvalRules()).chain),
      approvalHistory: history,
    };
    if (next.deadline && next.deadline < new Date().toISOString().slice(0, 10))
      throw new HttpError(
        400,
        "Müraciət üçün son tarix keçmiş tarix ola bilməz.",
      );
    await db
      .prepare("UPDATE jobs SET status='pending_approval',data=? WHERE id=?")
      .bind(JSON.stringify(next), row.id)
      .run();
    await companyAudit(
      db,
      id,
      userId,
      "job-resubmitted",
      row.id,
      String(next.title),
    );
    await notifyCompanyRoles(db, id, firstApprover((await approvalRules()).chain), {
      type: "approval",
      title: `Yenidən təsdiqə göndərildi: ${next.title}`,
      body: `${me?.name || ""} düzəlişlərlə təkrar göndərdi.`,
      link: "hr-approvals",
    });
    return ok({ ok: true, status: "pending_approval" });
  }
  if (request.method === "GET" && path === "company/profile") {
    const row = await db
      .prepare(
        "SELECT data,doc_name,verification_status,verification_note,submitted_at,reviewed_at,CASE WHEN COALESCE(logo_data,'')<>'' THEN 1 ELSE 0 END AS has_logo FROM company_profiles WHERE company_id=?",
      )
      .bind(id)
      .first<{
        data: string;
        doc_name: string;
        verification_status: string;
        verification_note: string;
        submitted_at: string;
        reviewed_at: string;
        has_logo: number;
      }>();
    return ok({
      hasLogo: row?.has_logo === 1,
      details: companyDetailsInput(row ? JSON.parse(row.data) : {}),
      docName: row?.doc_name || "",
      verification: row?.verification_status || "none",
      verificationLabel:
        VERIFICATION_STATUS[row?.verification_status || "none"],
      note: row?.verification_note || "",
      submittedAt: row?.submitted_at || "",
      reviewedAt: row?.reviewed_at || "",
      canEdit: can(memberRole, "company-profile"),
    });
  }
  if (request.method === "POST" && path === "company/logo") {
    requirePermission("company-profile");
    const raw = await request.text();
    if (raw.length > 450_000)
      throw new HttpError(413, "Loqo 300 KB-dan böyük olmamalıdır.");
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Məlumat oxunmadı.");
    }
    const type = str(b.type, 40);
    const data = str(b.data, 450_000);
    if (b.remove === true) {
      await db
        .prepare(
          "UPDATE company_profiles SET logo_type='',logo_data='' WHERE company_id=?",
        )
        .bind(id)
        .run();
      return ok({ ok: true });
    }
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(type) ||
      !data ||
      !/^[A-Za-z0-9+/=]+$/.test(data)
    )
      throw new HttpError(400, "Loqo PNG, JPG və ya WEBP olmalıdır.");
    await db
      .prepare(
        `INSERT INTO company_profiles(company_id,data,verification_status,updated,logo_type,logo_data) VALUES(?,?,?,?,?,?)
        ON CONFLICT(company_id) DO UPDATE SET logo_type=excluded.logo_type,logo_data=excluded.logo_data`,
      )
      .bind(id, "{}", "none", new Date().toISOString(), type, data)
      .run();
    await companyAudit(db, id, userId, "company-logo", "");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/gallery") {
    const rows = await db
      .prepare(
        "SELECT id FROM company_images WHERE company_id=? ORDER BY position,created",
      )
      .bind(id)
      .all<{ id: string }>();
    return ok({ images: rows.results.map((r) => r.id), limit: GALLERY_LIMIT });
  }
  if (request.method === "POST" && path === "company/gallery") {
    requirePermission("company-profile");
    const raw = await request.text();
    if (raw.length > 450_000)
      throw new HttpError(413, "Şəkil 300 KB-dan böyük olmamalıdır.");
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Məlumat oxunmadı.");
    }
    const type = str(b.type, 40);
    const data = str(b.data, 450_000);
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(type) ||
      !data ||
      !/^[A-Za-z0-9+/=]+$/.test(data)
    )
      throw new HttpError(400, "Şəkil PNG, JPG və ya WEBP olmalıdır.");
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM company_images WHERE company_id=?")
      .bind(id)
      .first<{ n: number }>();
    if (Number(count?.n) >= GALLERY_LIMIT)
      throw new HttpError(
        409,
        `Qalereyada ən çox ${GALLERY_LIMIT} şəkil ola bilər.`,
      );
    const imageId = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO company_images(id,company_id,type,data,position,created) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        imageId,
        id,
        type,
        data,
        Number(count?.n) || 0,
        new Date().toISOString(),
      )
      .run();
    await companyAudit(db, id, userId, "company-gallery", "added");
    return ok({ id: imageId }, 201);
  }
  if (request.method === "POST" && path === "company/gallery/delete") {
    requirePermission("company-profile");
    const b = await jsonBody(request);
    await db
      .prepare("DELETE FROM company_images WHERE id=? AND company_id=?")
      .bind(str(b.id, 100), id)
      .run();
    await companyAudit(db, id, userId, "company-gallery", "removed");
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/profile") {
    requirePermission("company-profile");
    // Up to ~1 MB for the e-taxes registration certificate.
    const raw = await request.text();
    if (raw.length > 1_600_000)
      throw new HttpError(413, "Fayl çox böyükdür (maksimum 1 MB).");
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(raw);
    } catch {
      throw new HttpError(400, "Məlumat oxunmadı.");
    }
    const details = companyDetailsInput(b.details);
    if (details.voen && !validVoen(details.voen))
      throw new HttpError(400, "VÖEN 10 rəqəmdən ibarət olmalıdır.");
    const now = new Date().toISOString();
    const current = await db
      .prepare(
        "SELECT data,verification_status FROM company_profiles WHERE company_id=?",
      )
      .bind(id)
      .first<{ data: string; verification_status: string }>();
    const previous = companyDetailsInput(
      current ? JSON.parse(current.data) : {},
    );
    // Changing the legal identity after verification needs a new review.
    const identityChanged =
      previous.voen !== details.voen ||
      previous.legalName !== details.legalName;
    let status = current?.verification_status || "none";
    if (identityChanged && status === "verified") status = "none";
    await db
      .prepare(
        `INSERT INTO company_profiles(company_id,data,verification_status,updated) VALUES(?,?,?,?)
        ON CONFLICT(company_id) DO UPDATE SET data=excluded.data,verification_status=excluded.verification_status,updated=excluded.updated`,
      )
      .bind(id, JSON.stringify(details), status, now)
      .run();
    const doc = b.document as
      { name?: unknown; type?: unknown; data?: unknown } | undefined;
    if (doc && typeof doc.data === "string") {
      const type = str(doc.type, 60);
      if (
        !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
          type,
        )
      )
        throw new HttpError(400, "Yalnız PDF və ya şəkil yükləyin.");
      if (doc.data.length > 1_400_000)
        throw new HttpError(413, "Fayl 1 MB-dan böyük olmamalıdır.");
      if (!validVoen(details.voen) || !details.legalName)
        throw new HttpError(400, "Yoxlama üçün hüquqi ad və VÖEN-i doldurun.");
      await db
        .prepare(
          "UPDATE company_profiles SET doc_name=?,doc_type=?,doc_data=?,verification_status='pending',verification_note='',submitted_at=? WHERE company_id=?",
        )
        .bind(str(doc.name, 160), type, doc.data, now, id)
        .run();
      status = "pending";
      await companyAudit(
        db,
        id,
        userId,
        "verification-submitted",
        details.voen,
        str(doc.name, 160),
      );
      await sendAdminEmail(
        "Şirkət yoxlaması gözləyir",
        `${details.legalName} (VÖEN ${details.voen}) e-taxes qeydiyyat sənədini yüklədi. Admin paneldə "Şirkət yoxlaması" bölməsinə baxın.`,
      );
    }
    await companyAudit(
      db,
      id,
      userId,
      "company-profile",
      "",
      identityChanged ? "hüquqi məlumat dəyişdi" : "",
    );
    return ok({ ok: true, verification: status });
  }
  return undefined;
}
