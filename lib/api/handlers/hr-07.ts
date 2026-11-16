// hr: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { APPLICATION_STATUSES, VACANCY_REASONS, WITHDRAWN_STATUS } from "@/lib/recruitment";
import { ATTENDANCE_CODES } from "@/lib/calendar-az";
import { COMPANY_AI_PACKAGES, monthKey } from "@/lib/ai-packages";
import { HttpError, jobInput, jsonBody, str } from "@/lib/server";
import { type Job } from "@/lib/model";
import { TEMPLATE_LIMIT, cleanTemplateName, copyableJob } from "@/lib/job-templates";
import { can, firstApprover, newApproval } from "@/lib/company";
import { changedFields, describeMaterialChanges, isEditableStatus, isEndedJob, pickEditable, repostedJob, validDeadline } from "@/lib/job-edit";
import { companyAudit, notify, notifyCompanyRoles, notifyFollowers } from "@/lib/api-core";
import { Row, allowedEscoLabels, assertVacancyPlan, normalizedJobRecord, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_hr_07(c: Pick<RouteCtx, "aiQuota" | "approvalRules" | "customSkillLabels" | "db" | "id" | "memberRole" | "newDraftFrom" | "path" | "reportScope" | "request" | "requestUrl" | "requirePermission" | "syncApplicationStatus" | "userId">): Promise<Response | undefined> {
  const { aiQuota, approvalRules, customSkillLabels, db, id, memberRole, newDraftFrom, path, reportScope, request, requestUrl, requirePermission, syncApplicationStatus, userId } = c;
  if (request.method === "POST" && path === "hr/job-duplicate") {
    const b = await jsonBody(request);
    const jobIds = (await reportScope()).jobIds;
    const row = await db
      .prepare(
        "SELECT data FROM jobs WHERE id=? AND owner=? AND id IN (SELECT value FROM json_each(?))",
      )
      .bind(str(b.jobId, 100), id, JSON.stringify(jobIds))
      .first<Row>();
    if (!row) throw new HttpError(404, "Vakansiya tapılmadı.");
    const draft = await newDraftFrom(
      normalizedJobRecord(JSON.parse(row.data), customSkillLabels),
    );
    await companyAudit(
      db,
      id,
      userId,
      "job-duplicated",
      str(b.jobId, 100),
      String(draft.title),
    );
    return ok({ draft }, 201);
  }
  if (request.method === "GET" && path === "hr/job-templates") {
    const rows = await db
      .prepare(
        `SELECT t.id,t.name,t.data,t.created_by,t.updated,COALESCE(a.name,'') AS author FROM job_templates t LEFT JOIN accounts a ON a.id=t.created_by
        WHERE t.company_id=? ORDER BY t.updated DESC LIMIT 100`,
      )
      .bind(id)
      .all<{
        id: string;
        name: string;
        data: string;
        created_by: string;
        updated: string;
        author: string;
      }>();
    return ok({
      templates: rows.results.map((r) => {
        const content = JSON.parse(r.data) as Partial<Job>;
        return {
          id: r.id,
          name: r.name,
          title: content.title || "",
          city: content.city || "",
          updated: r.updated,
          author: r.author,
          canDelete: r.created_by === userId || can(memberRole, "publish"),
        };
      }),
    });
  }
  if (request.method === "POST" && path === "hr/job-templates/save") {
    const b = await jsonBody(request);
    const name = cleanTemplateName(b.name);
    if (name.length < 3)
      throw new HttpError(400, "Şablonun adını yazın (ən azı 3 simvol).");
    let content: Partial<Job>;
    if (b.jobId) {
      const jobIds = (await reportScope()).jobIds;
      const row = await db
        .prepare(
          "SELECT data FROM jobs WHERE id=? AND owner=? AND id IN (SELECT value FROM json_each(?))",
        )
        .bind(str(b.jobId, 100), id, JSON.stringify(jobIds))
        .first<Row>();
      if (!row) throw new HttpError(404, "Vakansiya tapılmadı.");
      content = copyableJob(
        normalizedJobRecord(JSON.parse(row.data), customSkillLabels),
      );
    } else {
      // A draft from the AI page: validated like a published vacancy so the template is complete.
      const escoLabels = await allowedEscoLabels(db, b.job?.skills);
      // The internal reason is not part of a template, so it must not block saving one.
      content = copyableJob(
        jobInput({ ...(b.job || {}), reason: VACANCY_REASONS[0].id }, [
          ...customSkillLabels,
          ...escoLabels,
        ]),
      );
    }
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM job_templates WHERE company_id=?")
      .bind(id)
      .first<{ n: number }>();
    // SQLite's lower() only handles ASCII, so names are compared with Azerbaijani-aware lower-casing.
    const names = await db
      .prepare("SELECT id,name FROM job_templates WHERE company_id=?")
      .bind(id)
      .all<{ id: string; name: string }>();
    const same = names.results.find(
      (t) => t.name.toLocaleLowerCase("az") === name.toLocaleLowerCase("az"),
    );
    if (!same && (Number(count?.n) || 0) >= TEMPLATE_LIMIT)
      throw new HttpError(
        409,
        `Ən çoxu ${TEMPLATE_LIMIT} şablon saxlamaq olar. Lazımsızı silin.`,
      );
    if (same && b.replace !== true)
      throw new HttpError(
        409,
        "Bu adla şablon var. Başqa ad yazın və ya üzərinə yazmaq üçün təsdiq edin.",
      );
    const now = new Date().toISOString();
    if (same)
      await db
        .prepare("UPDATE job_templates SET data=?,updated=? WHERE id=?")
        .bind(JSON.stringify(content), now, same.id)
        .run();
    else
      await db
        .prepare(
          "INSERT INTO job_templates(id,company_id,name,data,created_by,created,updated) VALUES(?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          name,
          JSON.stringify(content),
          userId,
          now,
          now,
        )
        .run();
    await companyAudit(db, id, userId, "template-saved", name);
    return ok({ ok: true, replaced: !!same }, 201);
  }
  if (request.method === "POST" && path === "hr/job-templates/use") {
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        "SELECT name,data FROM job_templates WHERE id=? AND company_id=?",
      )
      .bind(str(b.id, 100), id)
      .first<{ name: string; data: string }>();
    if (!row) throw new HttpError(404, "Şablon tapılmadı.");
    const draft = await newDraftFrom(JSON.parse(row.data) as Partial<Job>);
    await companyAudit(db, id, userId, "template-used", row.name);
    return ok({ draft }, 201);
  }
  if (request.method === "POST" && path === "hr/job-templates/delete") {
    const b = await jsonBody(request);
    const row = await db
      .prepare(
        "SELECT id,name,created_by FROM job_templates WHERE id=? AND company_id=?",
      )
      .bind(str(b.id, 100), id)
      .first<{ id: string; name: string; created_by: string }>();
    if (!row) throw new HttpError(404, "Şablon tapılmadı.");
    if (row.created_by !== userId && !can(memberRole, "publish"))
      throw new HttpError(403, "Şablonu yalnız yaradan və ya HR silə bilər.");
    await db.prepare("DELETE FROM job_templates WHERE id=?").bind(row.id).run();
    await companyAudit(db, id, userId, "template-deleted", row.name);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "hr/application-viewed") {
    const b = await jsonBody(request);
    const applicationId = str(b.id, 100);
    const own = await db.prepare("SELECT 1 FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND j.owner=?").bind(applicationId, id).first();
    if (!own) throw new HttpError(404, "Müraciət tapılmadı.");
    await syncApplicationStatus(applicationId, "viewed", userId, "company");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/ai-plan") {
    const quota = await aiQuota();
    return ok({
      current: quota.pkg,
      used: quota.used,
      left: quota.left,
      month: monthKey(),
      packages: COMPANY_AI_PACKAGES,
    });
  }
  if (request.method === "GET" && path === "hr/application-events") {
    const applicationId = str(requestUrl.searchParams.get("id"), 100);
    const own = await db
      .prepare(
        "SELECT 1 FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND j.owner=?",
      )
      .bind(applicationId, id)
      .first();
    if (!own) throw new HttpError(404, "Müraciət tapılmadı.");
    const rows = await db
      .prepare(
        "SELECT type,actor_role,from_value,to_value,note,created FROM application_events WHERE application_id=? ORDER BY created",
      )
      .bind(applicationId)
      .all();
    return ok({ events: rows.results });
  }
  if (request.method === "GET" && path === "company/overview-charts") {
    const jobIds = (await reportScope()).jobIds;
    const list = JSON.stringify(jobIds);
    const DAY = 86400000;
    const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    const now = Date.now();
    // Weeks start on Monday; twelve of them, the last one is the current week.
    const dow = (new Date(now).getUTCDay() + 6) % 7;
    const thisMonday = Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate()) - dow * DAY;
    const weeks = Array.from({ length: 12 }, (_, i) => ({ start: isoDay(thisMonday - (11 - i) * 7 * DAY), apps: 0, views: 0 }));
    const weekOf = (day: string) => {
      const t = Date.parse(day.slice(0, 10));
      const idx = 11 - Math.floor((thisMonday - (t - ((new Date(t).getUTCDay() + 6) % 7) * DAY)) / (7 * DAY));
      return idx >= 0 && idx < 12 ? idx : -1;
    };
    const apps = (await db.prepare("SELECT a.created,a.status FROM applications a WHERE a.job_id IN (SELECT value FROM json_each(?)) ORDER BY a.created DESC LIMIT 5000").bind(list).all<{ created: string; status: string }>().catch(() => ({ results: [] as { created: string; status: string }[] }))).results;
    const statusCount = new Map<string, number>();
    let apps30 = 0;
    let appsPrev30 = 0;
    for (const a of apps) {
      statusCount.set(a.status, (statusCount.get(a.status) || 0) + 1);
      const w = weekOf(a.created);
      if (w >= 0) weeks[w].apps += 1;
      const age = (now - Date.parse(a.created)) / DAY;
      if (age <= 30) apps30 += 1;
      else if (age <= 60) appsPrev30 += 1;
    }
    const views = (await db.prepare("SELECT day,COUNT(*) AS n FROM job_views WHERE job_id IN (SELECT value FROM json_each(?)) AND day>=? GROUP BY day").bind(list, weeks[0].start).all<{ day: string; n: number }>().catch(() => ({ results: [] as { day: string; n: number }[] }))).results;
    let viewsTotal = 0;
    for (const v of views) {
      const w = weekOf(v.day);
      if (w >= 0) weeks[w].views += v.n;
      viewsTotal += v.n;
    }
    const interviews14 = Number((await db.prepare("SELECT COUNT(*) AS n FROM interviews WHERE company_id=? AND status IN ('scheduled','confirmed','pending_panel') AND scheduled_at>=? AND scheduled_at<=?").bind(id, new Date(now).toISOString(), new Date(now + 14 * DAY).toISOString()).first<{ n: number }>().catch(() => ({ n: 0 })))?.n || 0);
    const activeJobs = Number((await db.prepare("SELECT COUNT(*) AS n FROM jobs WHERE owner=? AND status='published'").bind(id).first<{ n: number }>().catch(() => ({ n: 0 })))?.n || 0);
    // The workforce: headcount by department, length of service and how many were away on each weekday of the last four weeks.
    const people = (await db.prepare("SELECT id,department,start_date FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; department: string; start_date: string }>().catch(() => ({ results: [] as { id: string; department: string; start_date: string }[] }))).results;
    const byDept = new Map<string, number>();
    const tenure = [{ label: "1 ilə qədər", count: 0 }, { label: "1–3 il", count: 0 }, { label: "3–5 il", count: 0 }, { label: "5 ildən çox", count: 0 }];
    for (const p of people) {
      byDept.set(p.department || "Departamentsiz", (byDept.get(p.department || "Departamentsiz") || 0) + 1);
      const years = p.start_date ? (now - Date.parse(p.start_date)) / (365.25 * DAY) : 0;
      tenure[years < 1 ? 0 : years < 3 ? 1 : years < 5 ? 2 : 3].count += 1;
    }
    const since = isoDay(thisMonday - 3 * 7 * DAY);
    const marks = (await db.prepare("SELECT day,code FROM attendance_marks WHERE company_id=? AND day>=?").bind(id, since).all<{ day: string; code: string }>().catch(() => ({ results: [] as { day: string; code: string }[] }))).results;
    const away = new Map<string, number>();
    const marked = new Set<string>();
    for (const m of marks) {
      marked.add(m.day);
      if (ATTENDANCE_CODES.find((c) => c.id === m.code)?.counts !== "work") away.set(m.day, (away.get(m.day) || 0) + 1);
    }
    const heat = Array.from({ length: 4 }, (_, w) => ({
      start: isoDay(thisMonday - (3 - w) * 7 * DAY),
      days: Array.from({ length: 5 }, (_, d) => {
        const day = isoDay(thisMonday - (3 - w) * 7 * DAY + d * DAY);
        if (day > isoDay(now) || !marked.size || !people.length) return null;
        return Math.max(0, Math.round((1 - (away.get(day) || 0) / people.length) * 100));
      }),
    }));
    return ok({
      tiles: { jobs: activeJobs, applications: apps.length, apps30, appsPrev30, interviews14, views: viewsTotal, hired: statusCount.get("İşə qəbul edildi") || 0, employees: people.length },
      weeks,
      statuses: APPLICATION_STATUSES.map((status) => ({ status, count: statusCount.get(status) || 0 })),
      departments: [...byDept.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count })),
      tenure,
      heat,
      hasAttendance: marked.size > 0,
    });
  }
  if (request.method === "GET" && path === "hr/job-views") {
    const jobIds = (await reportScope()).jobIds;
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 6 * 86400000)
      .toISOString()
      .slice(0, 10);
    const rows = await db
      .prepare(
        `SELECT job_id,COUNT(*) AS views,COUNT(DISTINCT viewer) AS uniq,SUM(CASE WHEN day>=? AND day<=? THEN 1 ELSE 0 END) AS last7
        FROM job_views WHERE job_id IN (SELECT value FROM json_each(?)) GROUP BY job_id`,
      )
      .bind(weekAgo, today, JSON.stringify(jobIds))
      .all<{
        job_id: string;
        views: number;
        uniq: number;
        last7: number | null;
      }>()
      .catch(() => ({
        results: [] as {
          job_id: string;
          views: number;
          uniq: number;
          last7: number | null;
        }[],
      }));
    return ok({
      views: Object.fromEntries(
        rows.results.map((r) => [
          r.job_id,
          {
            views: Number(r.views) || 0,
            unique: Number(r.uniq) || 0,
            last7: Number(r.last7) || 0,
          },
        ]),
      ),
    });
  }
  if (request.method === "POST" && path === "hr/job-repost") {
    // One click: an ended vacancy (closed or past its deadline) is published again as a new opening.
    const b = await jsonBody(request);
    const jobIds = (await reportScope()).jobIds;
    const row = await db
      .prepare(
        "SELECT id,data,status FROM jobs WHERE id=? AND owner=? AND id IN (SELECT value FROM json_each(?))",
      )
      .bind(str(b.jobId, 100), id, JSON.stringify(jobIds))
      .first<Row>();
    if (!row) throw new HttpError(404, "Vakansiya tapılmadı.");
    const current = JSON.parse(String(row.data)) as Job & {
      moderated?: boolean;
    };
    const today = new Date().toISOString().slice(0, 10);
    if (!isEndedJob(String(row.status), current.deadline, today))
      throw new HttpError(
        409,
        "Təkrar yayım yalnız bağlanmış və ya müddəti bitmiş vakansiya üçündür.",
      );
    if (current.moderated)
      throw new HttpError(
        403,
        "Bu vakansiya administrator tərəfindən dayandırılıb. Dəstək ilə əlaqə saxlayın.",
      );
    const now = new Date().toISOString();
    const fresh = repostedJob(normalizedJobRecord(current, customSkillLabels), {
      id: crypto.randomUUID(),
      owner: id,
      createdBy: userId,
      now,
      today,
      days: Number(b.days),
    });
    // The new opening takes a place of the plan again; the ended one no longer holds it.
    await assertVacancyPlan(db, id, { ...fresh, id: String(current.id || "") });
    const original = {
      ...current,
      status: "archived",
      closeReason:
        (current as Job & { closeReason?: string }).closeReason || "reposted",
      closeNote:
        (current as Job & { closeNote?: string }).closeNote ||
        "Təkrar yayımlandı",
      closedAt: (current as Job & { closedAt?: string }).closedAt || now,
    };
    if (!can(memberRole, "publish")) {
      // Roles without "publish" send the new opening for HR and director approval, like any new vacancy.
      const me = await db
        .prepare("SELECT name FROM accounts WHERE id=?")
        .bind(userId)
        .first<{ name: string }>();
      const pending = {
        ...fresh,
        status: "pending_approval",
        approval: newApproval(userId, me?.name || "", (await approvalRules()).chain),
      };
      await db
        .prepare(
          "INSERT INTO jobs(id,owner,data,status,created) VALUES(?,?,?,'pending_approval',?)",
        )
        .bind(fresh.id, id, JSON.stringify(pending), now)
        .run();
      await companyAudit(
        db,
        id,
        userId,
        "job-reposted",
        String(row.id),
        `${fresh.title} (təsdiqə göndərildi)`,
      );
      await notifyCompanyRoles(db, id, firstApprover((await approvalRules()).chain), {
        type: "approval",
        title: `Təsdiq gözləyir: ${fresh.title}`,
        body: `${me?.name || ""} vakansiyanı təkrar yayım üçün təsdiqə göndərdi.`,
        link: "hr-approvals",
      });
      return ok({ job: pending, pendingApproval: true }, 201);
    }
    await db.batch([
      db
        .prepare(
          "INSERT INTO jobs(id,owner,data,status,created) VALUES(?,?,?,'published',?)",
        )
        .bind(fresh.id, id, JSON.stringify(fresh), now),
      // The old opening is closed so the same vacancy is not listed twice.
      db
        .prepare("UPDATE jobs SET status='archived',data=? WHERE id=?")
        .bind(JSON.stringify(original), row.id),
    ]);
    await companyAudit(
      db,
      id,
      userId,
      "job-reposted",
      String(row.id),
      `${fresh.title}, son tarix ${fresh.deadline}`,
    );
    await notifyFollowers(db, id, fresh);
    return ok({ job: fresh }, 201);
  }
  if (request.method === "POST" && path === "hr/job-update") {
    requirePermission(
      "publish",
      "Vakansiyanı redaktə etmək üçün HR və ya direktor icazəsi lazımdır.",
    );
    const b = await jsonBody(request);
    const row = await db
      .prepare("SELECT id,data,status FROM jobs WHERE id=? AND owner=?")
      .bind(str(b.jobId, 100), id)
      .first<Row>();
    if (!row) throw new HttpError(404, "Vakansiya tapılmadı.");
    if (!isEditableStatus(String(row.status)))
      throw new HttpError(
        409,
        "Yalnız yayımlanmış və ya dayandırılmış vakansiya redaktə olunur. Bağlanmış elan üçün kopyalayıb yenisini yaradın.",
      );
    const current = JSON.parse(String(row.data)) as Job;
    const changes =
      b.changes && typeof b.changes === "object"
        ? (b.changes as Record<string, unknown>)
        : {};
    if ("deadline" in changes && !validDeadline(changes.deadline))
      throw new HttpError(
        400,
        "Son tarix düzgün tarix olmalı və keçmişdə ola bilməz.",
      );
    const escoLabels = await allowedEscoLabels(
      db,
      changes.skills ?? current.skills,
    );
    const next = jobInput(
      { ...current, ...pickEditable(changes as Partial<Job>) },
      [...customSkillLabels, ...escoLabels],
    );
    const merged = { ...current, ...pickEditable(next) } as Job;
    const fields = changedFields(current, merged);
    if (!fields.length) return ok({ ok: true, changed: [] });
    // A change of the place, the position or the pay must still fit the staff plan.
    if (fields.some((f) => ["branch", "department", "section", "title", "minSalary", "maxSalary", "salaryKind", "reason"].includes(String(f)))) await assertVacancyPlan(db, id, { ...merged, id: String(row.id) });
    await db
      .prepare("UPDATE jobs SET data=? WHERE id=?")
      .bind(JSON.stringify(merged), row.id)
      .run();
    await companyAudit(
      db,
      id,
      userId,
      "job-updated",
      String(row.id),
      `${merged.title}: ${fields.join(", ")}`,
    );
    // Important changes (pay, place, schedule, deadline) are sent to people who already applied.
    const lines = describeMaterialChanges(current, merged);
    let notified = 0;
    if (lines.length && b.notifyApplicants !== false) {
      const applicants = await db
        .prepare(
          "SELECT DISTINCT candidate_id FROM applications WHERE job_id=? AND status NOT IN ('Uyğun deyil','İşə qəbul edildi',?) LIMIT 500",
        )
        .bind(row.id, WITHDRAWN_STATUS)
        .all<{ candidate_id: string }>();
      for (const a of applicants.results) {
        await notify(db, {
          userId: a.candidate_id,
          type: "job-update",
          title: `${merged.title}: vakansiya şərtləri yeniləndi`,
          body: lines.join("; "),
          link: "applications",
        });
        notified++;
      }
    }
    return ok({ ok: true, changed: fields, changes: lines, notified });
  }
  return undefined;
}
