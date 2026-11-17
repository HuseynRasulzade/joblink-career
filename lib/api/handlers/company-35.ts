// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { type Job, match } from "@/lib/model";
import { type JobApproval, can, pendingStep } from "@/lib/company";
import { WITHDRAWN_STATUS } from "@/lib/recruitment";
import { companyAudit } from "@/lib/api-core";
import { comparePeriods, inPeriod, monthlyTrend, pctChange, reachedFunnel } from "@/lib/dashboard-stats";
import { conversionPercent } from "@/lib/job-views";
import { normalizeFrequency } from "@/lib/digest";
import { sourceBreakdown } from "@/lib/sources";
import { loadPlanData, normalizedJobRecord, normalizedProfileRecord, ok } from "@/lib/api/shared";
import { summarize } from "@/lib/staff-plan";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_35(c: Pick<RouteCtx, "canAct" | "canDecideStep" | "customSkillLabels" | "db" | "id" | "memberGrants" | "memberRole" | "path" | "reportScope" | "request" | "requestUrl" | "requirePermission" | "userId">): Promise<Response | undefined> {
  const { canAct, canDecideStep, customSkillLabels, db, id, memberGrants, memberRole, path, reportScope, request, requestUrl, requirePermission, userId } = c;
  if (request.method === "GET" && path === "company/digest") {
    requirePermission("reports");
    const row = await db
      .prepare(
        "SELECT frequency,last_sent FROM digest_subscriptions WHERE user_id=?",
      )
      .bind(userId)
      .first<{ frequency: string; last_sent: string }>()
      .catch(() => null);
    return ok({
      frequency: normalizeFrequency(row?.frequency),
      lastSent: row?.last_sent || "",
      allowed: can(memberRole, "publish"),
    });
  }
  if (request.method === "POST" && path === "company/digest") {
    requirePermission("reports");
    // The summary is company-wide, so only members who see the whole company may subscribe.
    if (!can(memberRole, "publish"))
      throw new HttpError(
        403,
        "Avtomatik hesabat yalnız bütün şirkəti görən rollar üçündür.",
      );
    const b = await jsonBody(request);
    const frequency = normalizeFrequency(b.frequency);
    await db
      .prepare(
        `INSERT INTO digest_subscriptions(user_id,company_id,frequency,created) VALUES(?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET company_id=excluded.company_id,frequency=excluded.frequency`,
      )
      .bind(userId, id, frequency, new Date().toISOString())
      .run();
    await companyAudit(db, id, userId, "digest-set", "", frequency);
    return ok({ ok: true, frequency });
  }
  if (request.method === "GET" && path === "company/attention") {
    const scope = await reportScope();
    const today = new Date().toISOString().slice(0, 10);
    const weekAhead = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .slice(0, 10);
    const items: { key: string; count: number; label: string; link: string }[] =
      [];
    const add = (key: string, count: number, label: string, link: string) =>
      count > 0 && items.push({ key, count, label, link });
    type Count = { n: number } | null;
    const counted = (sql: string, ...bind: unknown[]): Promise<Count> =>
      db
        .prepare(sql)
        .bind(...bind)
        .first<{ n: number }>()
        .catch(() => null);
    const skip: Promise<Count> = Promise.resolve(null);
    // The checks do not depend on each other, so they run together.
    const [pending, waiting, late, stale, review, offers, probation, expiring, profile] =
      await Promise.all([
        db
          .prepare("SELECT data FROM jobs WHERE owner=? AND status='pending_approval'")
          .bind(id)
          .all<{ data: string }>(),
        canAct("approve-director")
          ? counted(
              "SELECT COUNT(*) AS n FROM approval_requests WHERE company_id=? AND status='pending' AND (requested_by<>? OR ?='owner')",
              id,
              userId,
              memberRole,
            )
          : skip,
        can(memberRole, "salaries")
          ? counted(
              "SELECT COUNT(*) AS n FROM employee_tasks WHERE company_id=? AND done=0 AND due<>'' AND due<?",
              id,
              today,
            )
          : skip,
        counted(
          "SELECT COUNT(*) AS n FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.owner=? AND j.id IN (SELECT value FROM json_each(?)) AND a.status='Göndərildi' AND a.created<?",
          id,
          scope.jobIdsJson,
          new Date(Date.now() - 2 * 86400000).toISOString(),
        ),
        can(memberRole, "tests", memberGrants)
          ? counted(
              "SELECT COUNT(*) AS n FROM assessment_assignments WHERE company_id=? AND review_status='pending' AND status IN ('submitted','expired')",
              id,
            )
          : skip,
        can(memberRole, "offers", memberGrants)
          ? counted(
              "SELECT COUNT(*) AS n FROM offers WHERE company_id=? AND status='sent' AND created<?",
              id,
              new Date(Date.now() - 5 * 86400000).toISOString(),
            )
          : skip,
        can(memberRole, "salaries", memberGrants)
          ? counted(
              "SELECT COUNT(*) AS n FROM company_employees WHERE company_id=? AND status='active' AND probation_end<>'' AND probation_end<=?",
              id,
              weekAhead,
            )
          : skip,
        counted(
          "SELECT COUNT(*) AS n FROM jobs WHERE owner=? AND id IN (SELECT value FROM json_each(?)) AND status='published' AND json_extract(data,'$.deadline')<>'' AND json_extract(data,'$.deadline')>=? AND json_extract(data,'$.deadline')<=?",
          id,
          scope.jobIdsJson,
          today,
          weekAhead,
        ),
        can(memberRole, "company-profile", memberGrants)
          ? db
              .prepare("SELECT verification_status FROM company_profiles WHERE company_id=?")
              .bind(id)
              .first<{ verification_status: string }>()
              .catch(() => null)
          : skip,
      ]);
    // Vacancies waiting for this member's approval.
    const toDecide = pending.results.filter((r) => {
      const job = JSON.parse(r.data) as { approval?: JobApproval };
      return (
        canDecideStep(pendingStep(job.approval)) &&
        (job.approval?.requestedBy !== userId || memberRole === "owner")
      );
    }).length;
    add("approvals", toDecide, "vakansiya sizin təsdiqinizi gözləyir", "hr-approvals");
    // Offers and salary changes waiting for a director's decision.
    add("approval-requests", Number(waiting?.n) || 0, "təklif və ya maaş dəyişikliyi sizin təsdiqinizi gözləyir", "hr-approvals");
    // Onboarding tasks of new employees that are past their date.
    add("onboarding", Number(late?.n) || 0, "adaptasiya tapşırığının vaxtı keçib", "hr-employees");
    // New applications nobody has looked at for two days.
    add("new-applications", Number(stale?.n) || 0, "müraciətə 2 gündən çoxdur baxılmayıb", "hr-candidates");
    add("tests", Number(review?.n) || 0, "test nəticəsinin açıq cavabları yoxlanmalıdır", "hr-tests");
    add("offers", Number(offers?.n) || 0, "təklifə 5 gündən çoxdur cavab verilməyib", "hr-candidates");
    add("probation", Number(probation?.n) || 0, "işçinin sınaq müddəti 7 gündən az qalıb və ya bitib", "hr-employees");
    add("expiring", Number(expiring?.n) || 0, "vakansiyanın son tarixinə 7 gündən az qalıb", "hr-jobs");
    if (can(memberRole, "company-profile", memberGrants) && (profile as { verification_status: string } | null)?.verification_status !== "verified")
      add(
        "verification",
        1,
        (profile as { verification_status: string } | null)?.verification_status === "pending"
          ? "şirkət yoxlaması gözlənilir"
          : "şirkəti təsdiqləyin (VÖEN sənədi)",
        "hr-company",
      );
    // The staff table has free places but no vacancy is open for them: the recruiter's to-do.
    if (can(memberRole, "staff", memberGrants) || can(memberRole, "salaries", memberGrants)) {
      const plan = await loadPlanData(db, id);
      if (plan.units.length) {
        const open = new Map(((await db.prepare("SELECT lower(COALESCE(json_extract(data,'$.department'),'')) AS department, COUNT(*) AS n FROM jobs WHERE owner=? AND status IN ('published','pending_approval') GROUP BY 1").bind(id).all<{ department: string; n: number }>().catch(() => ({ results: [] as { department: string; n: number }[] }))).results).map((r) => [r.department, Number(r.n)]));
        const idle = summarize(plan.units, plan.people).departments.filter((d) => d.free > 0 && !(open.get(d.department.toLocaleLowerCase("az")) || 0));
        add("idle-places", idle.length, `departamentdə boş ştat yeri var, amma vakansiya açılmayıb (${idle.slice(0, 3).map((d) => d.department || "departamentsiz").join(", ")})`, "hr-jobs");
      }
    }
    return ok({ items });
  }
  if (request.method === "GET" && path === "company/dashboard") {
    const scope = await reportScope();
    type AppRow = {
      id: string;
      job_id: string;
      status: string;
      created: string;
      updated: string | null;
      auto: number;
      source: string;
    };
    // Offers, tests and employees are company-wide, so a role limited to its own vacancies does not see them.
    const empty = { results: [] as { status: string }[] };
    // The five reads do not depend on each other, so they run together.
    const [jobs, allApps, offers, tests, employees] = await Promise.all([
      db
        .prepare(
          "SELECT id,status,created,json_extract(data,'$.title') AS title FROM jobs WHERE owner=? AND id IN (SELECT value FROM json_each(?))",
        )
        .bind(id, scope.jobIdsJson)
        .all<{ id: string; status: string; created: string; title: string }>(),
      db
        .prepare(
          "SELECT a.id,a.job_id,a.status,a.created,a.updated,a.auto,a.source FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.owner=? AND j.id IN (SELECT value FROM json_each(?))",
        )
        .bind(id, scope.jobIdsJson)
        .all<AppRow>(),
      scope.ownOnly
        ? empty
        : db
            .prepare(
              "SELECT status FROM offers WHERE company_id=? AND (?='' OR substr(created,1,10)>=?) AND (?='' OR substr(created,1,10)<=?)",
            )
            .bind(id, scope.from, scope.from, scope.to, scope.to)
            .all<{ status: string }>()
            .catch(() => empty),
      scope.ownOnly
        ? empty
        : db
            .prepare(
              "SELECT status FROM assessment_assignments WHERE company_id=? AND (?='' OR substr(assigned_at,1,10)>=?) AND (?='' OR substr(assigned_at,1,10)<=?)",
            )
            .bind(id, scope.from, scope.from, scope.to, scope.to)
            .all<{ status: string }>()
            .catch(() => empty),
      scope.ownOnly
        ? null
        : db
            .prepare(
              "SELECT COUNT(*) AS n FROM company_employees WHERE company_id=? AND status='active'",
            )
            .bind(id)
            .first<{ n: number }>()
            .catch(() => null),
    ]);
    const apps = {
      results: allApps.results.filter((a) => scope.inRange(a.created)),
    };
    const byStatus: Record<string, number> = {};
    for (const a of apps.results)
      byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    const hired = apps.results.filter(
      (a) => a.status === "İşə qəbul edildi" && a.updated,
    );
    const avgDaysToHire = hired.length
      ? Math.round(
          hired.reduce(
            (sum, a) =>
              sum + (Date.parse(a.updated!) - Date.parse(a.created)) / 86400000,
            0,
          ) / hired.length,
        )
      : null;
    // Applications per day for the last 30 days.
    const days: { date: string; count: number }[] = [];
    const dayCount =
      scope.from && scope.to
        ? Math.max(
            1,
            Math.min(
              120,
              Math.round(
                (Date.parse(scope.to) - Date.parse(scope.from)) / 86400000,
              ) + 1,
            ),
          )
        : 30;
    const lastDay = scope.to ? Date.parse(scope.to) : Date.now();
    for (let i = dayCount - 1; i >= 0; i--) {
      const date = new Date(lastDay - i * 86400000).toISOString().slice(0, 10);
      days.push({
        date,
        count: apps.results.filter((a) => a.created.slice(0, 10) === date)
          .length,
      });
    }
    // Distinct candidates who looked at each vacancy in the selected period.
    const viewRows = await db
      .prepare(
        "SELECT job_id,COUNT(DISTINCT viewer) AS uniq FROM job_views WHERE job_id IN (SELECT value FROM json_each(?)) AND (?='' OR day>=?) AND (?='' OR day<=?) GROUP BY job_id",
      )
      .bind(scope.jobIdsJson, scope.from, scope.from, scope.to, scope.to)
      .all<{ job_id: string; uniq: number }>()
      .catch(() => ({ results: [] as { job_id: string; uniq: number }[] }));
    const viewers = new Map(
      viewRows.results.map((r) => [r.job_id, Number(r.uniq) || 0]),
    );
    const perJob = jobs.results
      .map((j) => {
        const list = apps.results.filter((a) => a.job_id === j.id);
        return {
          id: j.id,
          title: j.title,
          status: j.status,
          created: j.created,
          viewers: viewers.get(j.id) || 0,
          conversion: conversionPercent(list.length, viewers.get(j.id) || 0),
          applications: list.length,
          interview: list.filter((a) => a.status === "Müsahibə").length,
          offered: list.filter((a) => a.status === "Təklif edildi").length,
          hired: list.filter((a) => a.status === "İşə qəbul edildi").length,
        };
      })
      .sort((a, b) => b.applications - a.applications);
    const sentOffers = offers.results.filter((o) => o.status !== "withdrawn");
    // Share of applicants whose profile fits the vacancy well (rule-based score of 70 or more).
    const scoredRows = await db
      .prepare(
        "SELECT a.data,j.id AS job_id,j.data AS job_data FROM applications a JOIN jobs j ON j.id=a.job_id WHERE j.owner=? AND a.status<>? AND j.id IN (SELECT value FROM json_each(?)) AND (?='' OR substr(a.created,1,10)>=?) AND (?='' OR substr(a.created,1,10)<=?) ORDER BY a.created DESC LIMIT 500",
      )
      .bind(
        id,
        WITHDRAWN_STATUS,
        scope.jobIdsJson,
        scope.from,
        scope.from,
        scope.to,
        scope.to,
      )
      .all<{ data: string; job_id: string; job_data: string }>()
      .catch(() => ({
        results: [] as { data: string; job_id: string; job_data: string }[],
      }));
    const jobCache = new Map<string, Job>();
    let strongApplicants = 0;
    for (const r of scoredRows.results) {
      let job = jobCache.get(r.job_id);
      if (!job) {
        job = normalizedJobRecord(JSON.parse(r.job_data), customSkillLabels);
        jobCache.set(r.job_id, job);
      }
      if (
        match(
          normalizedProfileRecord(JSON.parse(r.data), customSkillLabels),
          job,
        ).score >= 70
      )
        strongApplicants++;
    }
    return ok({
      totals: {
        strongApplicants,
        scoredApplicants: scoredRows.results.length,
        activeJobs: jobs.results.filter((j) => j.status === "published").length,
        pendingJobs: jobs.results.filter((j) => j.status === "pending_approval")
          .length,
        applications: apps.results.length,
        autoApplications: apps.results.filter((a) => a.auto).length,
        hired: byStatus["İşə qəbul edildi"] || 0,
        employees: Number(employees?.n) || 0,
        offerAcceptance: sentOffers.length
          ? Math.round(
              (sentOffers.filter((o) => o.status === "accepted").length /
                sentOffers.length) *
                100,
            )
          : null,
        testsSubmitted: tests.results.filter(
          (t) => t.status === "submitted" || t.status === "expired",
        ).length,
        testsAssigned: tests.results.length,
        avgDaysToHire,
      },
      byStatus,
      days,
      perJob,
      funnel: reachedFunnel(byStatus),
      sources: sourceBreakdown(apps.results),
      trend: monthlyTrend(
        allApps.results,
        (scope.to || new Date().toISOString()).slice(0, 10),
        6,
      ),
      delta: (() => {
        const p = comparePeriods(scope.from, scope.to);
        const inCur = allApps.results.filter((a) =>
          inPeriod(a.created, p.current),
        );
        const inPrev = allApps.results.filter((a) =>
          inPeriod(a.created, p.previous),
        );
        const hires = (list: typeof inCur) =>
          list.filter((a) => a.status === "İşə qəbul edildi").length;
        return {
          period: p,
          applications: {
            current: inCur.length,
            previous: inPrev.length,
            change: pctChange(inCur.length, inPrev.length),
          },
          hired: {
            current: hires(inCur),
            previous: hires(inPrev),
            change: pctChange(hires(inCur), hires(inPrev)),
          },
        };
      })(),
      scope: {
        from: scope.from,
        to: scope.to,
        jobId: str(requestUrl.searchParams.get("jobId"), 100),
        ownOnly: scope.ownOnly,
      },
      jobsList: jobs.results.map((j) => ({ id: j.id, title: j.title })),
    });
  }
  return undefined;
}
