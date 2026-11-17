
import { store, optionalIdentity, HttpError, str, runtime } from "@/lib/server";
import { type Job } from "@/lib/model";

import { normalizeSkillKey } from "@/lib/skill-catalog";

import { workplaceMailMuted } from "@/lib/notification-prefs";

import { setCustomCertifications } from "@/lib/certification-catalog";
import { setCustomJobTitles } from "@/lib/job-title-catalog";

import { WITHDRAWN_STATUS } from "@/lib/recruitment";
import { APPROVAL_KIND_LABEL, normalizeApprovalRules, requestAmount, type ApprovalKind, normalizeGrants, can, canDecide, companyDetailsInput, pendingStep, permissionsOf, permissionForPath, type CompanyPermission, type JobApproval } from "@/lib/company";

import { mailConfigured, sendMail } from "@/lib/mail";
import { greetingFor } from "@/lib/mail-copy";

import { siteUrl } from "@/lib/seo";

import { type CatalogEntry } from "@/lib/catalog-check";

import { sanitizeGuideQuestions, INTERVIEW_KINDS, bakuLocal, findConflicts, type BusySlot, type InterviewInput } from "@/lib/interviews";

import { sanitizeTags } from "@/lib/talent";
import { draftFromContent } from "@/lib/job-templates";

import { quiet } from "@/lib/quiet";
import { latestSubscription } from "@/lib/plan-service";
import { addPeriod, azn as aznCents, planById } from "@/lib/plans";
import { providerFor } from "@/lib/payments";
import { buildServiceContract } from "@/lib/contracts";
import { quota } from "@/lib/plan-service";
import { exitTypeLabel } from "@/lib/workforce";
import { recordApplicationEvent, sendUserEmail, notify, companyAudit, companyDisplayName, notifyCompanyRoles } from "@/lib/api-core";

import { pickSigners, sameName } from "@/lib/order-signers";

import { ORDER_KINDS, signedOrderNotice } from "@/lib/orders";

import { packageById, monthKey, quotaLeft } from "@/lib/ai-packages";

import { statusAfter, type ApplicationFlowEvent } from "@/lib/application-flow";
import { daysOff, monthDays, summarize as summarizeAttendance, type CalendarOverride } from "@/lib/calendar-az";
import { normalizeFlow, startFlow, type FlowEvent, type FlowHolder, type FlowSigner, type FlowState } from "@/lib/order-flow";

import { assignPeople, bandConflicts, normalizeRate, summarize, unitActive, type PlanPerson } from "@/lib/staff-plan";

import { REQUEST_KINDS } from "@/lib/requests";

import { resolveCatalogSkill, type CatalogSkill } from "@/lib/skill-matrix";
import { parsePhotoDataUrl } from "@/lib/photo";
import { fetchCbarRates, perUnitRates } from "@/lib/cbar";
import { azNPerDay, lookupNorm, type NormCurrency } from "@/lib/trip-norms";
import { GEO_MODES, validPoint, type GeoMode, type Office } from "@/lib/geofence";
import { type GuideTemplate } from "@/lib/interview-guide";

import { upcomingCelebrations } from "@/lib/celebrations";

import { revealProfile, sealProfile } from "@/lib/secure-profile";
import { maskCard, normalizeProfile, parseProfile, type EmployeeProfile } from "@/lib/employee-profile";
import { BATCH_STATUS, batchTotal, type BatchKind, buildTransfers, type TransferItem, type TransferSkip } from "@/lib/bank-transfer";
import { taxBenefit, taxReduction, weeklyHours } from "@/lib/employee-rights";
import { EMPTY_INPUTS, MINIMUM_WAGE, availableAdvance, cleanInputs, computePay, dayStatus, isInsuredCode, payWarnings, isVacationCode, paymentDate, scheduleProblem, vacationCalendarDays, type DayStatus, type PayInputs } from "@/lib/payroll-calc";

import { STATUS_TEXT as TRIP_STATUS, settleTrip, tripDays } from "@/lib/trips";

import { STATUS_TEXT as LEAVE_STATUS, scheduleWarnings, type ScheduleEntry } from "@/lib/leave-schedule";
import { chooseHours, type HoursByDay } from "@/lib/hours";
import { checkCoverage, checkShifts, AWAY_LABEL as SHIFT_AWAY_LABEL, type ShiftWarning } from "@/lib/shift-rules";
import { beforeOf, hasEffect, planOrderEffect, type CardPatch, type CardSnapshot } from "@/lib/order-effects";
import { DEFAULT_CLOCK, bakuNow, validTime as validClockTime, type ClockRules } from "@/lib/clock";
import { vacationDaysBetween } from "@/lib/hr-calc";
import { BENEFIT_CAP_FACTOR, BENEFIT_MIN_INSURANCE_MONTHS, MATERNITY_BENEFIT_PERCENT, SICK_BENEFIT_PERCENT, averageMonthlyForLeave, unusedLeaveCompensation } from "@/lib/hr-calc";

import { bonusesOf, linkActiveIn, normalizeMode, sharesOf } from "@/lib/branches";

import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_IDS } from "@/lib/hr-expenses";
import { employeePay, vacationBalance } from "@/lib/payroll";
import { absorbLegacyHeadcount, escoSkillDefinition, loadPlanData, loadPlatformCalendar, logError, normalizedJobRecord, ok, readCustomSkills, searchWorldSkills, sharedLists } from "@/lib/api/shared";
import type { BankAccountRow, BatchRow, BranchCtx, EffectRow, EscoSkillRow, ExpenseDbRow, InvApp, LeaveRow, LedgerOp, OrderDbRow, PayrollShared, Person, SwapRow, TripRow } from "@/lib/api/shared";
import { handle_auth_01 } from "@/lib/api/handlers/auth-01";
import { handle_admin_01 } from "@/lib/api/handlers/admin-01";
import { handle_certifications_01 } from "@/lib/api/handlers/certifications-01";
import { handle_misc_01 } from "@/lib/api/handlers/misc-01";
import { handle_skills_01 } from "@/lib/api/handlers/skills-01";
import { handle_messages_01 } from "@/lib/api/handlers/messages-01";
import { handle_messages_02 } from "@/lib/api/handlers/messages-02";
import { handle_relations_01 } from "@/lib/api/handlers/relations-01";
import { handle_support_01 } from "@/lib/api/handlers/support-01";
import { handle_misc_02 } from "@/lib/api/handlers/misc-02";
import { handle_company_01 } from "@/lib/api/handlers/company-01";
import { handle_company_02 } from "@/lib/api/handlers/company-02";
import { handle_company_03 } from "@/lib/api/handlers/company-03";
import { handle_company_04 } from "@/lib/api/handlers/company-04";
import { handle_employee_01 } from "@/lib/api/handlers/employee-01";
import { handle_company_05 } from "@/lib/api/handlers/company-05";
import { handle_company_06 } from "@/lib/api/handlers/company-06";
import { handle_employee_02 } from "@/lib/api/handlers/employee-02";
import { handle_employee_03 } from "@/lib/api/handlers/employee-03";
import { handle_employee_04 } from "@/lib/api/handlers/employee-04";
import { handle_company_07 } from "@/lib/api/handlers/company-07";
import { handle_company_08 } from "@/lib/api/handlers/company-08";
import { handle_company_09 } from "@/lib/api/handlers/company-09";
import { handle_company_10 } from "@/lib/api/handlers/company-10";
import { handle_company_11 } from "@/lib/api/handlers/company-11";
import { handle_company_12 } from "@/lib/api/handlers/company-12";
import { handle_company_13 } from "@/lib/api/handlers/company-13";
import { handle_company_14 } from "@/lib/api/handlers/company-14";
import { handle_company_15 } from "@/lib/api/handlers/company-15";
import { handle_company_16 } from "@/lib/api/handlers/company-16";
import { handle_company_17 } from "@/lib/api/handlers/company-17";
import { handle_company_18 } from "@/lib/api/handlers/company-18";
import { handle_company_19 } from "@/lib/api/handlers/company-19";
import { handle_company_20 } from "@/lib/api/handlers/company-20";
import { handle_company_21 } from "@/lib/api/handlers/company-21";
import { handle_company_22 } from "@/lib/api/handlers/company-22";
import { handle_company_23 } from "@/lib/api/handlers/company-23";
import { handle_company_24 } from "@/lib/api/handlers/company-24";
import { handle_company_25 } from "@/lib/api/handlers/company-25";
import { handle_company_26 } from "@/lib/api/handlers/company-26";
import { handle_company_27 } from "@/lib/api/handlers/company-27";
import { handle_company_28 } from "@/lib/api/handlers/company-28";
import { handle_company_29 } from "@/lib/api/handlers/company-29";
import { handle_company_30 } from "@/lib/api/handlers/company-30";
import { handle_company_31 } from "@/lib/api/handlers/company-31";
import { handle_company_32 } from "@/lib/api/handlers/company-32";
import { handle_company_33 } from "@/lib/api/handlers/company-33";
import { handle_reports_01 } from "@/lib/api/handlers/reports-01";
import { handle_employees_01 } from "@/lib/api/handlers/employees-01";
import { handle_attendance_01 } from "@/lib/api/handlers/attendance-01";
import { handle_interviews_02 } from "@/lib/api/handlers/interviews-02";
import { handle_ats_01 } from "@/lib/api/handlers/ats-01";
import { lockedProblem } from "@/lib/attendance-lock";
import { activeGrants } from "@/lib/grants-expiry";
import { handle_company_34 } from "@/lib/api/handlers/company-34";
import { handle_company_35 } from "@/lib/api/handlers/company-35";
import { handle_company_36 } from "@/lib/api/handlers/company-36";
import { handle_company_37 } from "@/lib/api/handlers/company-37";
import { handle_interviews_01 } from "@/lib/api/handlers/interviews-01";
import { handle_plan_01 } from "@/lib/api/handlers/plan-01";
import { handle_plan_02 } from "@/lib/api/handlers/plan-02";
import { handle_parse_cv_01 } from "@/lib/api/handlers/parse-cv-01";
import { handle_analyze_01 } from "@/lib/api/handlers/analyze-01";
import { handle_cv_01 } from "@/lib/api/handlers/cv-01";
import { handle_draft_01 } from "@/lib/api/handlers/draft-01";
import { handle_fit_review_01 } from "@/lib/api/handlers/fit-review-01";
import { handle_application_status_01 } from "@/lib/api/handlers/application-status-01";
import { handle_offers_01 } from "@/lib/api/handlers/offers-01";
import { handle_offers_02 } from "@/lib/api/handlers/offers-02";
import { handle_company_38 } from "@/lib/api/handlers/company-38";
import { handle_offers_03 } from "@/lib/api/handlers/offers-03";
import { handle_hr_01 } from "@/lib/api/handlers/hr-01";
import { handle_hr_02 } from "@/lib/api/handlers/hr-02";
import { handle_hr_03 } from "@/lib/api/handlers/hr-03";
import { handle_hr_04 } from "@/lib/api/handlers/hr-04";
import { handle_hr_05 } from "@/lib/api/handlers/hr-05";
import { handle_hr_06 } from "@/lib/api/handlers/hr-06";
import { handle_hr_07 } from "@/lib/api/handlers/hr-07";
import { handle_job_status_01 } from "@/lib/api/handlers/job-status-01";
import { handle_admin_02 } from "@/lib/api/handlers/admin-02";
import { handle_admin_03 } from "@/lib/api/handlers/admin-03";
import { handle_admin_04 } from "@/lib/api/handlers/admin-04";
import { handle_admin_05 } from "@/lib/api/handlers/admin-05";
import { handle_admin_06 } from "@/lib/api/handlers/admin-06";
import { handle_admin_07 } from "@/lib/api/handlers/admin-07";

async function route(request: Request) {
  const requestUrl = new URL(request.url);
  const path = requestUrl.pathname.split("/api/joblink/")[1];
    {
    const r = await handle_auth_01({ path, request });
    if (r) return r;
  }
  const db = await store();
  // The three shared lists and the session are read together: each D1 round trip is slow.
  // The three shared lists change rarely (only the admin edits them): they are kept for half a minute in the instance, so most requests
  // do not read them from the database again. Any admin write drops the copy at once.
    {
    const r = await handle_admin_01({ path, request });
    if (r) return r;
  }
  const [shared, user] = await Promise.all([sharedLists(db), optionalIdentity(request), loadPlatformCalendar(db)]);
  const { customSkills, customCerts, customTitles } = shared;
  const customSkillLabels = customSkills.map((skill) => skill.label);
  setCustomCertifications(customCerts);
  setCustomJobTitles(customTitles);
    {
    const r = await handle_certifications_01({ customCerts, customSkillLabels, customSkills, customTitles, db, path, request, requestUrl, user });
    if (r) return r;
  }
  // The signed-in person; for a company team member, `id` below is the company.
  if (!user) throw new HttpError(401, "Davam etmək üçün hesabınıza daxil olun.");
  const userId = user;
  let id = userId;
  // The account's role, its membership in a company, a suspension and lent approval rights are independent reads: they go to the
  // database in one round trip (a batch) instead of one after another.
  const [roleRows, membershipRows, suspendedRows, lentRows] =
    runtime().EXTERNAL_AUTH === "password"
      ? await db.batch([
          db.prepare("SELECT COALESCE(role,'candidate') AS role FROM accounts WHERE id=?").bind(userId),
          db.prepare("SELECT m.company_id,m.role,m.grants,m.grants_until FROM company_members m JOIN accounts c ON c.id=m.company_id WHERE m.user_id=? AND m.status='active'").bind(userId),
          db.prepare("SELECT 1 AS yes FROM company_members WHERE user_id=? AND status='suspended'").bind(userId),
          db.prepare("SELECT company_id,from_user FROM approval_delegates WHERE to_user=? AND until>=?").bind(userId, new Date().toISOString().slice(0, 10)),
        ])
      : [null, null, null, null];
  const accountRole = (roleRows?.results?.[0] as { role: string } | undefined)?.role || "candidate";
  let memberRole = "";
  let memberGrants: string[] = [];
  // Approval rights lent by a colleague who is away (valid until the date they set).
  const delegated: CompanyPermission[] = [];
  // The colleagues whose approval rights this person holds for now (named substitutes).
  const lentFrom: string[] = [];
  if (accountRole === "company") {
    const membership = (membershipRows?.results?.[0] as { company_id: string; role: string; grants: string; grants_until?: string } | undefined) || null;
    const suspended = suspendedRows?.results?.[0] || null;
    const lentAll = { results: ((lentRows?.results as { company_id: string; from_user: string }[] | undefined) || []) };
    if (membership) {
      id = membership.company_id;
      memberRole = membership.role;
      // Extra permissions the owner gave to this person (column added by migration 0025).
      try {
        memberGrants = activeGrants(normalizeGrants(JSON.parse(membership.grants || "[]")), membership.grants_until || "");
      } catch {
        memberGrants = [];
      }
    } else {
      // A suspended member must not fall back to an empty company of their own.
      if (
        suspended &&
        path !== "state" &&
        !path.startsWith("auth/") &&
        path !== "account/export"
      )
        throw new HttpError(
          403,
          "Şirkət hesabındakı girişiniz müvəqqəti dayandırılıb. Hesab sahibi ilə əlaqə saxlayın.",
        );
      memberRole = "owner";
    }
    for (const row of lentAll.results.filter((r) => r.company_id === id)) {
      lentFrom.push(row.from_user);
      const from =
        row.from_user === id
          ? "owner"
          : (
              await db
                .prepare(
                  "SELECT role FROM company_members WHERE company_id=? AND user_id=? AND status='active'",
                )
                .bind(id, row.from_user)
                .first<{ role: string }>()
                .catch(() => null)
            )?.role;
      if (!from) continue;
      for (const permission of permissionsOf(from) as CompanyPermission[])
        if (
          (permission === "approve-hr" || permission === "approve-director") &&
          !delegated.includes(permission)
        )
          delegated.push(permission);
    }
  }
  const canAct = (permission: CompanyPermission) =>
    accountRole === "company" &&
    (can(memberRole, permission, memberGrants) ||
      delegated.includes(permission));
  const canDecideStep = (step: ReturnType<typeof pendingStep>) =>
    !!step &&
    (canDecide(memberRole, step) ||
      delegated.includes(
        step.role === "hr" ? "approve-hr" : "approve-director",
      ));
  const approvalRules = async () => {
    const row = await db
      .prepare("SELECT approval_rules FROM company_profiles WHERE company_id=?")
      .bind(id)
      .first<{ approval_rules: string }>()
      .catch(() => null);
    try {
      return normalizeApprovalRules(JSON.parse(row?.approval_rules || "{}"));
    } catch {
      return normalizeApprovalRules({});
    }
  };
  const requesterName = async () =>
    (
      await db
        .prepare("SELECT name FROM accounts WHERE id=?")
        .bind(userId)
        .first<{ name: string }>()
    )?.name || "";
  // The employer's AI package and what is left of it this month (full analyses and cheap rankings).
  const aiQuota = async () => {
    const plan = await db.prepare("SELECT plan_id FROM company_ai_plans WHERE company_id=?").bind(id).first<{ plan_id: string }>().catch(() => null);
    const pkg = packageById(plan?.plan_id || "free");
    const row = await db
      .prepare("SELECT full_used,rank_used FROM company_ai_usage WHERE company_id=? AND month=?")
      .bind(id, monthKey())
      .first<{ full_used: number; rank_used: number }>()
      .catch(() => null);
    const used = { full: row?.full_used || 0, rank: row?.rank_used || 0 };
    return { pkg, used, left: quotaLeft(pkg, used) };
  };
  const chargeAi = async (kind: "full" | "rank", count: number) => {
    if (count <= 0) return;
    await db
      .prepare(
        `INSERT INTO company_ai_usage(company_id,month,full_used,rank_used) VALUES(?,?,?,?)
         ON CONFLICT(company_id,month) DO UPDATE SET full_used=full_used+excluded.full_used,rank_used=rank_used+excluded.rank_used`,
      )
      .bind(id, monthKey(), kind === "full" ? count : 0, kind === "rank" ? count : 0)
      .run()
      .catch((error) => quiet("route-best-effort", error));
  };
  // The application follows what happens to it (an interview falls through, a «reject» opinion, a new application is opened).
  const syncApplicationStatus = async (applicationId: string, event: ApplicationFlowEvent, actorId: string, actorRole: string) => {
    const app = await db
      .prepare("SELECT a.status,a.candidate_id,j.data FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=?")
      .bind(applicationId)
      .first<{ status: string; candidate_id: string; data: string }>();
    if (!app) return;
    let jobTitle = "";
    try {
      jobTitle = String(JSON.parse(app.data)?.title || "");
    } catch {
      jobTitle = "";
    }
    const interviews = (await db.prepare("SELECT status FROM interviews WHERE application_id=?").bind(applicationId).all<{ status: string }>()).results;
    const pendingOffer = !!(await db.prepare("SELECT 1 AS x FROM offers WHERE application_id=? AND status='sent'").bind(applicationId).first().catch(() => null));
    const target = statusAfter(event, app.status, {
      activeInterviews: interviews.filter((i) => ["scheduled", "confirmed", "pending_panel", "panel_declined"].includes(i.status)).length,
      completedInterviews: interviews.filter((i) => i.status === "completed").length,
      pendingOffer,
    });
    if (!target) return;
    await db.prepare("UPDATE applications SET status=?,stage='',updated=? WHERE id=?").bind(target, new Date().toISOString(), applicationId).run();
    await recordApplicationEvent(db, { applicationId, actorId, actorRole, type: "status", from: app.status, to: target, note: "avtomatik" });
    await notify(db, { userId: app.candidate_id, type: "application-status", title: `${jobTitle}: ${target}`, body: `Müraciətinizin statusu avtomatik yeniləndi: ${target}.`, link: "applications" }).catch((error) => quiet("route-best-effort", error));
  };
  // A notification for the employee's own account, when the employee record is linked to one.
  const tellEmployee = async (employeeId: string, title: string, body: string) => {
    const row = await db.prepare("SELECT user_id FROM company_employees WHERE id=? AND company_id=?").bind(employeeId, id).first<{ user_id: string }>().catch(() => null);
    if (row?.user_id) await notify(db, { userId: row.user_id, type: "application", title, body, link: "workplace" }).catch((error) => quiet("route-best-effort", error));
  };
  // A pay change is kept with its date, and the first one also keeps the earlier pay, so months already worked keep their pay.
  const salaryChange = async (employeeId: string, oldCents: number, oldType: string, newCents: number, newType: string, from: string, actor: string) => {
    if (oldCents === newCents && oldType === newType) return [] as D1PreparedStatement[];
    const day = /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const has = await db.prepare("SELECT 1 AS n FROM employee_salary_history WHERE employee_id=? AND company_id=? LIMIT 1").bind(employeeId, id).first();
    const insert = (effective: string, cents: number, type: string, note: string) =>
      db
        .prepare("INSERT INTO employee_salary_history(id,company_id,employee_id,effective_from,salary_cents,salary_type,note,created_by,created) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(employee_id,effective_from) DO UPDATE SET salary_cents=excluded.salary_cents,salary_type=excluded.salary_type,note=excluded.note")
        .bind(crypto.randomUUID(), id, employeeId, effective, cents, type === "net" ? "net" : "gross", note, actor, now);
    return [...(has || oldCents <= 0 ? [] : [insert("0000-01-01", oldCents, oldType, "Əvvəlki maaş")]), insert(day, newCents, newType, "")];
  };
  const tripView = (t: TripRow, name: string, expenses: { id: string; label: string; amount_cents: number; day: string }[]) => {
    const days = tripDays(t.start_date, t.end_date);
    const calc = settleTrip({ dailyCents: t.daily_cents, days, expensesCents: expenses.reduce((sum, e) => sum + e.amount_cents, 0), advanceCents: t.advance_cents });
    return { id: t.id, employeeId: t.employee_id, name, destination: t.destination, purpose: t.purpose, start: t.start_date, end: t.end_date, days, daily: t.daily_cents / 100, advance: t.advance_cents / 100, status: t.status, statusText: TRIP_STATUS[t.status] || t.status, requestedBy: t.requested_by, decidedBy: t.decided_by_name, expenses: expenses.map((e) => ({ id: e.id, label: e.label, amount: e.amount_cents / 100, day: e.day })), calc: { perDiem: calc.perDiem / 100, expenses: calc.expenses / 100, total: calc.total / 100, advance: calc.advance / 100, balance: calc.balance / 100 }, settled: t.settled_cents / 100, abroad: !!t.abroad, manager: t.manager_status ? { status: t.manager_status, name: t.manager_name, note: t.manager_note } : null };
  };
  // Personal data sealed at rest: opened only here, with the DATA_KEY secret.
  const dataKey = () => runtime().DATA_KEY;
  const reveal = (raw: string | null | undefined) => revealProfile(raw, dataKey());
  const revealAll = async (rows: { id: string; profile?: string }[]) => new Map(await Promise.all(rows.map(async (r) => [r.id, (await reveal(r.profile)).profile] as const)));
  // Who looked at pay and personal data: kept in the audit log, once per person and subject within a quarter of an hour.
  const auditView = async (action: string, target = "", detail = "") => {
    try {
      const recent = await db
        .prepare("SELECT 1 AS n FROM company_audit WHERE company_id=? AND actor_id=? AND action=? AND target=? AND created>? LIMIT 1")
        .bind(id, userId, action, target, new Date(Date.now() - 15 * 60_000).toISOString())
        .first();
      if (!recent) await companyAudit(db, id, userId, action, target, detail);
    } catch (error) {
      // Viewing is never blocked by the log.
      quiet("route-catch", error);
    }
  };
  // Tells employees whose record is linked to an account (in the app) and, for the pay slip, those with an e-mail address.
  // The text carries no amounts: the figures are only in the employee's own page.
  const tellPayroll = async (employeeIds: string[] | null, title: string, body: string, mail = false) => {
    try {
      const rows = (await db.prepare("SELECT id,user_id,email,name FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; user_id: string; email: string; name: string }>()).results;
      const wanted = new Set(employeeIds || rows.map((r) => r.id));
      const list = rows.filter((r) => wanted.has(r.id)).slice(0, 400);
      const settings = runtime();
      const send = mail && mailConfigured(settings);
      // A person who switched off the e-mail of their own page does not get the pay slip mail either.
      const mutedUsers = new Set<string>();
      if (send)
        for (const r of list.filter((x) => x.user_id)) {
          const prefs = await db.prepare("SELECT email_off FROM notification_prefs WHERE user_id=?").bind(r.user_id).first<{ email_off: string }>().catch(() => null);
          if (workplaceMailMuted(prefs?.email_off)) mutedUsers.add(r.user_id);
        }
      for (let i = 0; i < list.length; i += 20)
        await Promise.allSettled(
          list.slice(i, i + 20).flatMap((r) => [
            r.user_id ? notify(db, { userId: r.user_id, type: "application", title, body, link: "workplace", email: send && r.email ? false : undefined }) : Promise.resolve(),
            send && r.email && !mutedUsers.has(r.user_id) ? sendMail(settings, { to: r.email, subject: title, text: body, greeting: greetingFor(r.name), eyebrow: "İş yerim", action: { label: "İş yerimə keç", url: `${siteUrl(settings.SITE_URL)}/#workplace` } }) : Promise.resolve(),
          ]),
        );
    } catch (error) {
      // A notice that does not go out never stops the payroll work.
      quiet("route-catch", error);
    }
  };
  // The plan is a draft until the director approves it; after that a change to it needs the director.
  const planStatus = async () =>
    (await db.prepare("SELECT status FROM staff_plan_state WHERE company_id=?").bind(id).first<{ status: string }>())?.status || "draft";
  // The section of the staff row each employee sits in: shown where the employee has no section of their own.
  let sectionCache: Promise<Map<string, string>> | null = null;
  const staffSections = () => {
    sectionCache ||= (async () => {
      const map = new Map<string, string>();
      try {
        const planData = await loadPlanData(db, id);
        const placed = assignPeople(planData.units, planData.people);
        for (const [unitId, list] of placed.byUnit) {
          const unit = planData.units.find((u) => u.id === unitId);
          if (unit?.section) for (const p of list) map.set(p.id, unit.section);
        }
      } catch (error) {
        // Without the staff plan the sections stay as the employees have them.
        quiet("route-catch", error);
      }
      return map;
    })();
    return sectionCache;
  };
  const planLocked = async () => {
    if (canAct("approve-director")) return false;
    return (await approvalRules()).headcount || (await planStatus()) === "approved";
  };
  const queueApproval = async (
    kind: ApprovalKind,
    subject: string,
    payload: unknown,
  ) => {
    const requestId = crypto.randomUUID();
    await db
      .prepare(
        "INSERT INTO approval_requests(id,company_id,kind,subject,payload,requested_by,requested_by_name,created) VALUES(?,?,?,?,?,?,?,?)",
      )
      .bind(
        requestId,
        id,
        kind,
        subject.slice(0, 200),
        JSON.stringify(payload),
        userId,
        await requesterName(),
        new Date().toISOString(),
      )
      .run();
    await companyAudit(
      db,
      id,
      userId,
      "approval-requested",
      requestId,
      `${APPROVAL_KIND_LABEL[kind]}: ${subject}`,
    );
    const named = (await approvalRules()).approvers[kind];
    if (named.length) {
      // Only the people named for this kind (within their limit) hear about it, and the account owner.
      const amount = requestAmount(kind, payload);
      const people = new Set<string>([id, ...named.filter((a) => a.limit <= 0 || amount === null || amount <= a.limit).map((a) => a.userId)]);
      for (const person of people)
        if (person !== userId)
          await notify(db, { userId: person, type: "approval", title: `Təsdiq gözləyir: ${APPROVAL_KIND_LABEL[kind]}`, body: subject, link: "hr-approvals" });
    } else
    await notifyCompanyRoles(db, id, "approve-director", {
      type: "approval",
      title: `Təsdiq gözləyir: ${APPROVAL_KIND_LABEL[kind]}`,
      body: subject,
      link: "hr-approvals",
    });
    return requestId;
  };
  // Every approval of the company in one list: vacancies and requests, with the time each took.
  const approvalHistory = async () => {
    type Row = {
      kind: string;
      subject: string;
      requestedBy: string;
      requested: string;
      decidedBy: string;
      decision: string;
      decided: string;
      note: string;
    };
    const rows: Row[] = [];
    const requests = await db
      .prepare("SELECT kind,subject,requested_by_name,created,decided_by_name,status,decided,note FROM approval_requests WHERE company_id=? ORDER BY created DESC LIMIT 500")
      .bind(id)
      .all<{ kind: string; subject: string; requested_by_name: string; created: string; decided_by_name: string; status: string; decided: string; note: string }>()
      .catch(() => ({ results: [] }));
    for (const r of requests.results)
      rows.push({
        kind: APPROVAL_KIND_LABEL[r.kind as ApprovalKind] || r.kind,
        subject: r.subject,
        requestedBy: r.requested_by_name,
        requested: r.created,
        decidedBy: r.decided_by_name,
        decision: r.status,
        decided: r.decided,
        note: r.note,
      });
    const jobs = await db
      .prepare("SELECT status,data FROM jobs WHERE owner=? AND json_extract(data,'$.approval') IS NOT NULL ORDER BY created DESC LIMIT 500")
      .bind(id)
      .all<{ status: string; data: string }>()
      .catch(() => ({ results: [] }));
    for (const r of jobs.results) {
      const job = JSON.parse(r.data) as Job & { approval?: JobApproval };
      const steps = job.approval?.steps || [];
      const last = [...steps].reverse().find((step) => step.decision);
      rows.push({
        kind: "Vakansiya",
        subject: job.title,
        requestedBy: job.approval?.requestedByName || "",
        requested: job.approval?.requestedAt || "",
        decidedBy: last ? `${last.byName} (${last.role === "hr" ? "HR" : "direktor"})` : "",
        decision: r.status === "pending_approval" ? "pending" : last?.decision === "rejected" ? "rejected" : last ? "approved" : "pending",
        decided: last?.at || "",
        note: last?.note || "",
      });
    }
    return rows;
  };
  const hoursBetween = (from: string, to: string) =>
    from && to ? Math.max(0, Math.round(((Date.parse(to) - Date.parse(from)) / 3_600_000) * 10) / 10) : null;
  const requirePermission = (
    permission: CompanyPermission,
    message = "Bu əməliyyat üçün rolunuzun icazəsi yoxdur.",
  ) => {
    // The broad "salaries" check of the HR endpoints becomes the permission of the section the path belongs to.
    const needed = permission === "salaries" ? permissionForPath(path) : permission;
    if (accountRole !== "company" || !can(memberRole, needed, memberGrants))
      throw new HttpError(403, message);
  };
  // The auditor does not see the bank details and FİN codes of people, and gets no bank or Excel files that carry them.
  const auditorOnly = memberRole === "auditor";
    {
    const r = await handle_misc_01({ accountRole, auditorOnly, memberRole, path, request });
    if (r) return r;
  }
  // Package limits apply only when BILLING_ENFORCED=1; until then everyone has full access.
  const billingEnforced = runtime().BILLING_ENFORCED === "1";
  const paymentProvider = providerFor(runtime().PAYMENT_PROVIDER);
  const requireAiAccess = async () => {
    if (!billingEnforced || accountRole === "company") return;
    const plan = (await quota(db, id, "cv-analysis", true, paymentProvider))
      .plan!;
    if (!plan.limits.aiAccess)
      throw new HttpError(
        402,
        "Bu funksiya Plus paketlərə daxildir. “Paketlər” bölməsindən paket seçin.",
      );
  };
    {
    const r = await handle_skills_01({ accountRole, customSkillLabels, customSkills, customTitles, db, id, path, request, requestUrl, requireAiAccess });
    if (r) return r;
  }
    {
    const r = await handle_messages_01({ accountRole, db, id, path, request, requestUrl, userId });
    if (r) return r;
  }
  // ---- Message templates: ready replies the company's team shares ----
    {
    const r = await handle_messages_02({ accountRole, db, id, path, request, requestUrl, userId });
    if (r) return r;
  }
    {
    const r = await handle_relations_01({ accountRole, db, id, path, request });
    if (r) return r;
  }
  // One small PDF or image may be attached to a request or a reply.
  const supportFile = (value: unknown) => {
    const file = value as
      { name?: unknown; type?: unknown; data?: unknown } | undefined;
    if (!file) return undefined;
    const type = str(file.type, 80);
    const data = str(file.data, 700_000);
    if (
      !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        type,
      ) ||
      !data ||
      !/^[A-Za-z0-9+/=]+$/.test(data)
    )
      throw new HttpError(400, "Fayl PDF, PNG, JPG və ya WEBP olmalıdır.");
    return { name: str(file.name, 160) || "fayl", type, data };
  };
  const supportBody = async () => {
    const raw = await request.text();
    if (raw.length > 900_000)
      throw new HttpError(413, "Fayl çox böyükdür (maksimum 500 KB).");
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new HttpError(400, "Sorğu məlumatları oxunmadı.");
    }
  };
    {
    const r = await handle_support_01({ accountRole, db, id, path, request, requestUrl, supportBody, supportFile });
    if (r) return r;
  }
  if (accountRole === "admin") {
        {
      const r = await handle_admin_02({ db, id, path, request, requestUrl });
      if (r) return r;
    }
    // Moves the listed vacancies to a real company account (for example a test
    // company): they become its own vacancies, keeping the source and the
    // original employer's name in the text.
        {
      const r = await handle_admin_03({ db, id, path, request, requestUrl });
      if (r) return r;
    }
    // ---- Catalog upkeep: translation check, duplicates, merging, imports, backup ----
    const readJsonList = (value: unknown) => {
      try {
        const list = JSON.parse(String(value || "[]"));
        return Array.isArray(list) ? list.filter((x) => typeof x === "string") : [];
      } catch {
        return [];
      }
    };
    const catalogEntries = async (): Promise<CatalogEntry[]> => {
      const [skills, titles, certs, items] = await Promise.all([
        db.prepare("SELECT id,label,label_en,aliases FROM custom_skills").all<Record<string, string>>(),
        db.prepare("SELECT id,label,label_en,aliases FROM custom_job_titles").all<Record<string, string>>(),
        db.prepare("SELECT id,name,aliases FROM custom_certifications").all<Record<string, string>>(),
        db.prepare("SELECT id,kind,label,label_en,label_ru,aliases FROM custom_education_items").all<Record<string, string>>(),
      ]);
      return [
        ...skills.results.map((r) => ({ kind: "skill" as const, id: String(r.id), label: String(r.label), labelEn: String(r.label_en), aliases: readJsonList(r.aliases) })),
        ...titles.results.map((r) => ({ kind: "job-title" as const, id: String(r.id), label: String(r.label), labelEn: String(r.label_en), aliases: readJsonList(r.aliases) })),
        ...certs.results.map((r) => ({ kind: "certification" as const, id: String(r.id), label: String(r.name), aliases: readJsonList(r.aliases) })),
        ...items.results.map((r) => ({ kind: (r.kind === "major" ? "major" : "university") as "major" | "university", id: String(r.id), label: String(r.label), labelEn: String(r.label_en), labelRu: String(r.label_ru), aliases: readJsonList(r.aliases) })),
      ];
    };
        {
      const r = await handle_admin_04({ catalogEntries, customSkills, db, id, path, request, requestUrl });
      if (r) return r;
    }
        {
      const r = await handle_admin_05({ customCerts, customSkillLabels, customSkills, customTitles, db, id, path, request });
      if (r) return r;
    }
        {
      const r = await handle_admin_06({ customSkillLabels, db, id, path, request, requestUrl });
      if (r) return r;
    }
        {
      const r = await handle_admin_07({ db, id, path, request, requestUrl });
      if (r) return r;
    }
    throw new HttpError(
      403,
      "Administrator hesabı yalnız idarəetmə panelindən istifadə edə bilər.",
    );
  }
  const candidatePaths = new Set([
    "alerts",
    "alerts/save",
    "alerts/delete",
    "profile",
    "save",
    "apply",
    "auto-apply",
    "ocr-cv",
    "parse-cv-file",
    "parse-cv",
    "analyze",
    "career-advice",
    "rank-jobs",
    "upload",
    "withdraw",
    "profile/summary",
    "cv/rewrite",
    "offers/respond",
    "exams",
    "exams/start",
    "exams/save",
    "interviews",
    "jobs/view",
    "interviews/respond",
    "interviews/ics",
    "exams/file",
    "exams/violation",
    "exams/submit",
    "verifications",
    "verifications/submit",
    "verifications/delete",
    "verifications/doc",
    "plan/me",
    "plan/subscribe",
    "plan/checkout",
    "plan/checkout/status",
    "pay/sandbox",
    "pay/sandbox/decide",
    "plan/cancel",
    "plan/auto-renew",
    "plan/methods/add",
    "plan/methods/remove",
    "plan/methods/default",
    "plan/contract",
  ]);
  const companyPaths = new Set([
    "draft",
    "publish",
    "hr",
    "application-status",
    "job-status",
    "hr/rank-candidates",
    "hr/ai-feedback",
    "hr/application-events",
    "hr/application-viewed",
    "offers/create",
    "offers/withdraw",
    "hr/assessments",
    "hr/assessment",
    "hr/assessments/save",
    "hr/assessments/delete",
    "hr/assessments/assign",
    "hr/assessment-file",
    "hr/assessment-export",
    "hr/assessments/grade",
    "hr/assessments/extend",
    "hr/assessments/cancel",
    "hr/test-results",
    "hr/question-bank",
    "hr/question-bank/add",
    "hr/question-bank/delete",
    "hr/assessments/ai-parse",
    "hr/interviews",
    "hr/interviews/create",
    "hr/interviews/invite",
    "hr/interviews/people",
    "hr/interviews/check",
    "hr/interviews/panel-respond",
    "hr/interviews/update",
    "hr/interviews/feedback",
    "hr/interviews/ics",
    "hr/talent",
    "hr/talent/save",
    "hr/talent/remove",
    "hr/candidate-notes",
    "hr/candidate-notes/save",
    "hr/candidate-notes/delete",
    "hr/applications/bulk",
    "hr/job-duplicate",
    "hr/job-templates",
    "hr/job-templates/save",
    "hr/job-templates/use",
    "hr/job-templates/delete",
    "hr/job-update",
    "hr/job-views",
    "hr/job-repost",
    "hr/saved-searches",
    "hr/saved-searches/save",
    "hr/saved-searches/delete",
    "hr/interview-templates",
    "hr/interview-templates/save",
    "hr/interview-templates/delete",
  ]);
  if (accountRole === "company" && candidatePaths.has(path))
    throw new HttpError(403, "Bu əməliyyat iş axtaran hesabı üçündür.");
  if (accountRole !== "company" && companyPaths.has(path))
    throw new HttpError(403, "Bu əməliyyat şirkət hesabı üçündür.");
    {
    const r = await handle_misc_02({ accountRole, canAct, db, id, memberGrants, memberRole, path, request, requirePermission, userId });
    if (r) return r;
  }
    {
    const r = await handle_company_01({ approvalRules, canDecideStep, customSkillLabels, db, id, memberRole, path, request, requirePermission, userId });
    if (r) return r;
  }
    {
    const r = await handle_company_02({ auditView, dataKey, db, id, memberGrants, memberRole, path, planLocked, queueApproval, request, requestUrl, requesterName, requirePermission, reveal, revealAll, salaryChange, userId });
    if (r) return r;
  }
  // ---- Attendance (tabel): how each day of each employee is marked, with the holidays of the Labor Code ----
  const attendanceMonth = () => {
    const raw = str(requestUrl.searchParams.get("month"), 7) || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) throw new HttpError(400, "Ayı düzgün seçin (YYYY-AA).");
    return { raw, year: Number(raw.slice(0, 4)), month: Number(raw.slice(5, 7)) };
  };
  // Marks that rest on an order of the employer (sickness rests on the e-certificate, not on an order).
  const ORDER_REQUIRED = new Set(["annual", "addleave", "creative", "unpaid", "study", "maternity", "childcare", "paternity", "donor", "medical", "summons", "military", "downtime", "remote", "trip"]);
  const attendanceData = async () => {
    const { raw, year, month } = attendanceMonth();
    const first = `${raw}-01`;
    const last = `${raw}-31`;
    const [overrides, people, marks] = await Promise.all([
      db.prepare("SELECT day,kind,label FROM company_calendar WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, first, last).all<CalendarOverride>(),
      db
        .prepare(
          "SELECT id,name,position,department,section,start_date,end_date,status,profile FROM company_employees WHERE company_id=? AND status<>'removed' AND (start_date='' OR start_date<=?) AND (status<>'left' OR end_date='' OR end_date>=?) ORDER BY department,section,name",
        )
        .bind(id, last, first)
        .all<{ id: string; name: string; position: string; department: string; section: string; start_date: string; end_date: string; status: string; profile: string }>(),
      db.prepare("SELECT employee_id,day,code,note FROM attendance_marks WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, first, last).all<{ employee_id: string; day: string; code: string; note: string }>(),
    ]);
    const days = monthDays(year, month, overrides.results);
    const byEmployee = new Map<string, Record<string, string>>();
    const notes = new Map<string, Record<string, string>>();
    for (const m of marks.results) {
      byEmployee.set(m.employee_id, { ...(byEmployee.get(m.employee_id) || {}), [m.day]: m.code });
      if (m.note) notes.set(m.employee_id, { ...(notes.get(m.employee_id) || {}), [m.day]: m.note });
    }
    const sectionFor = await staffSections();
    const employees = people.results.map((p) => {
      const mine = byEmployee.get(p.id) || {};
      const employed = { start: p.start_date, end: p.status === "left" ? p.end_date : "" };
      // A shorter working week (24 or 36 hours) by age or disability; the reason is shown only to those who may see personal data.
      const week = weeklyHours(parseProfile(p.profile), first);
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        department: p.department,
        section: p.section || sectionFor.get(p.id) || "",
        startDate: p.start_date,
        endDate: employed.end,
        status: p.status,
        marks: mine,
        notes: notes.get(p.id) || {},
        weekHours: week.hours,
        weekReason: week.hours < 40 ? (can(memberRole, "personal-data", memberGrants) ? week.reason : "qısaldılmış iş vaxtı (Əmək Məcəlləsi, 91-ci maddə)") : "",
        summary: summarizeAttendance(days, mine, employed, week.hours),
        // Leave marked by hand: the days no order stands behind (a signed order writes "Əmr № …" into the note).
        noOrder: Object.entries(mine).filter(([day, code]) => ORDER_REQUIRED.has(code) && !(notes.get(p.id)?.[day] || "").startsWith("Əmr")).map(([day]) => day),
      };
    });
    return { month: raw, days, employees, overrides: overrides.results };
  };
    {
    const r = await handle_company_03({ attendanceData, path, request, requirePermission });
    if (r) return r;
  }
  // Marks the days from..to of an employee with a code (or clears them), counting annual leave without holidays.
  // "manual" changes (the sheet, the Excel import) are refused in a locked month; orders and trips are legal facts and always write.
  const markAttendance = async (employeeId: string, from: string, to: string, code: string, note: string, manual = false) => {
    if (manual) {
      const locks = await db.prepare("SELECT month FROM attendance_locks WHERE company_id=? AND month BETWEEN ? AND ?").bind(id, from.slice(0, 7), to.slice(0, 7)).all<{ month: string }>().catch(() => ({ results: [] as { month: string }[] }));
      const problem = lockedProblem(locks.results.map((r) => r.month), from, to);
      if (problem) throw new HttpError(409, problem);
    }
    const length = Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1;
    const now = new Date().toISOString();
    const overrides = await db.prepare("SELECT day,kind,label FROM company_calendar WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, from, to).all<CalendarOverride>();
    const own = new Map(overrides.results.map((o) => [o.day, o.kind]));
    const statements: D1PreparedStatement[] = [];
    let marked = 0;
    for (let i = 0; i < length; i++) {
      const date = new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
      if (!code) {
        statements.push(db.prepare("DELETE FROM attendance_marks WHERE company_id=? AND employee_id=? AND day=?").bind(id, employeeId, date));
        continue;
      }
      if (code === "annual" && (daysOff(Number(date.slice(0, 4))).has(date) || own.get(date) === "off")) continue;
      statements.push(
        db
          .prepare("INSERT INTO attendance_marks(company_id,employee_id,day,code,note,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(company_id,employee_id,day) DO UPDATE SET code=excluded.code,note=excluded.note,updated=excluded.updated")
          .bind(id, employeeId, date, code, note, now),
      );
      marked++;
    }
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    return marked;
  };
  // The production calendar of a year: working and rest days, holidays and hours, with the company's own changes.
  const calendarYear = () => {
    const year = Number(str(requestUrl.searchParams.get("year"), 4) || new Date().getFullYear());
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new HttpError(400, "İli düzgün seçin.");
    return year;
  };
    {
    const r = await handle_company_04({ calendarYear, db, id, markAttendance, path, request, requirePermission, userId });
    if (r) return r;
  }
  // ---- The employee's own profile: link with a code, see the workplace, write applications to the company ----
  // One-to-one meetings: topics, decisions and the next step; a note can be kept private to the managers.
  const oneOnOneRows = async (companyId: string, employeeId: string, onlyShared: boolean) =>
    (await db.prepare(`SELECT id,day,topics,decisions,next_step,shared,author_kind,author_name FROM one_on_ones WHERE company_id=? AND employee_id=?${onlyShared ? " AND shared=1" : ""} ORDER BY day DESC,created DESC LIMIT 50`).bind(companyId, employeeId).all<{ id: string; day: string; topics: string; decisions: string; next_step: string; shared: number; author_kind: string; author_name: string }>()).results.map((r) => ({ id: r.id, day: r.day, topics: r.topics, decisions: r.decisions, nextStep: r.next_step, shared: !!r.shared, authorKind: r.author_kind, author: r.author_name }));
  const saveOneOnOne = async (companyId: string, employeeId: string, b: Record<string, unknown>, authorKind: string, authorName: string) => {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(str(b.day, 10)) ? str(b.day, 10) : new Date().toISOString().slice(0, 10);
    const topics = str(b.topics, 2000);
    if (topics.length < 3) throw new HttpError(400, "Müzakirə mövzusunu yazın.");
    await db.prepare("INSERT INTO one_on_ones(id,company_id,employee_id,day,topics,decisions,next_step,shared,author_kind,author_name,created) VALUES(?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), companyId, employeeId, day, topics, str(b.decisions, 2000), str(b.nextStep, 500), b.shared === false ? 0 : 1, authorKind, authorName, new Date().toISOString()).run();
  };
  // Details of the employee card an employee may ask to change themselves; HR approves and the card is updated.
  const PROFILE_CHANGE_FIELDS: Record<string, string> = { iban: "IBAN", bankName: "Bank adı", accountNumber: "Hesab nömrəsi", cardNumber: "Əmək haqqı kartı", cardHolder: "Kart sahibinin adı", address: "Yaşayış ünvanı", registeredAddress: "Qeydiyyat ünvanı", emergencyName: "Yaxın şəxsin adı", emergencyPhone: "Yaxın şəxsin telefonu" };
  const SECRET_FIELDS = new Set(["iban", "accountNumber", "cardNumber"]);
  const changeValue = async (payload: string, field: string) => String(((await reveal(payload)).profile as unknown as Record<string, unknown>)[field] ?? "");
  const maskedValue = (field: string, value: string) => (field === "cardNumber" ? maskCard(value) : SECRET_FIELDS.has(field) && value.length > 8 ? `${value.slice(0, 4)}…${value.slice(-4)}` : value);
  const SWAP_STATUS: Record<string, string> = { asked: "Kolleqanın cavabını gözləyir", accepted: "Kolleqa razıdır, təsdiq gözləyir", declined: "Kolleqa razı olmadı", approved: "Təsdiqlənib, qrafik dəyişdi", rejected: "Rədd edilib", cancelled: "Ləğv edilib" };
  const swapSelect = "SELECT s.id,s.day,s.from_employee,s.to_employee,s.note,s.status,s.decided_by_name,s.created,a.name AS from_name,b.name AS to_name,(SELECT t.name FROM shift_assignments x JOIN shift_types t ON t.id=x.shift_id WHERE x.company_id=s.company_id AND x.employee_id=s.from_employee AND x.day=s.day) AS from_shift,(SELECT t.name FROM shift_assignments x JOIN shift_types t ON t.id=x.shift_id WHERE x.company_id=s.company_id AND x.employee_id=s.to_employee AND x.day=s.day) AS to_shift FROM shift_swaps s JOIN company_employees a ON a.id=s.from_employee JOIN company_employees b ON b.id=s.to_employee";
  const swapView = (r: SwapRow) => ({ id: r.id, day: r.day, from: r.from_name, fromId: r.from_employee, to: r.to_name, toId: r.to_employee, fromShift: r.from_shift || "", toShift: r.to_shift || "", note: r.note, status: r.status, statusText: SWAP_STATUS[r.status] || r.status, decidedBy: r.decided_by_name, created: r.created });
  const swapList = async () => (await db.prepare(`${swapSelect} WHERE s.company_id=? AND (s.status IN ('asked','accepted') OR s.created>?) ORDER BY s.created DESC LIMIT 60`).bind(id, new Date(Date.now() - 30 * 86_400_000).toISOString()).all<SwapRow>()).results.map(swapView);
  const applySwap = async (companyId: string, swapId: string, decider: string) => {
    const swap = await db.prepare("SELECT id,day,from_employee,to_employee FROM shift_swaps WHERE id=? AND company_id=? AND status='accepted'").bind(swapId, companyId).first<{ id: string; day: string; from_employee: string; to_employee: string }>();
    if (!swap) throw new HttpError(404, "Təsdiq gözləyən dəyişdirmə tapılmadı.");
    const rows = (await db.prepare("SELECT employee_id,shift_id FROM shift_assignments WHERE company_id=? AND day=? AND employee_id IN (?,?)").bind(companyId, swap.day, swap.from_employee, swap.to_employee).all<{ employee_id: string; shift_id: string }>()).results;
    const a = rows.find((r) => r.employee_id === swap.from_employee);
    const b = rows.find((r) => r.employee_id === swap.to_employee);
    if (!a || !b) throw new HttpError(409, "Qrafik bu arada dəyişib: iki işçinin də həmin gün növbəsi olmalıdır.");
    await db.batch([
      db.prepare("UPDATE shift_assignments SET shift_id=? WHERE company_id=? AND employee_id=? AND day=?").bind(b.shift_id, companyId, swap.from_employee, swap.day),
      db.prepare("UPDATE shift_assignments SET shift_id=? WHERE company_id=? AND employee_id=? AND day=?").bind(a.shift_id, companyId, swap.to_employee, swap.day),
      db.prepare("UPDATE shift_swaps SET status='approved',decided_by_name=? WHERE id=?").bind(decider, swap.id),
    ]);
    for (const e of [swap.from_employee, swap.to_employee]) {
      const u = await db.prepare("SELECT user_id FROM company_employees WHERE id=?").bind(e).first<{ user_id: string }>();
      if (u?.user_id) await notify(db, { userId: u.user_id, type: "application", title: "Növbə dəyişdirilməsi təsdiqləndi", body: `${swap.day} tarixli növbələr dəyişdi. İş yerim → Növbəm bölməsinə baxın.`, link: "workplace" }).catch((error) => quiet("route-best-effort", error));
    }
  };
  // A light 360° round: colleagues are asked to rate a person in the open cycle; the person sees only the average and unsigned comments.
  const askFeedback = async (companyId: string, cycleId: string, subjectId: string, giverIds: string[]) => {
    const valid = new Set((await db.prepare("SELECT id,user_id FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(companyId).all<{ id: string; user_id: string }>()).results.map((r) => r.id));
    const subject = await db.prepare("SELECT name FROM company_employees WHERE id=? AND company_id=?").bind(subjectId, companyId).first<{ name: string }>();
    const cycle = await db.prepare("SELECT name FROM perf_cycles WHERE id=? AND company_id=? AND status='open'").bind(cycleId, companyId).first<{ name: string }>();
    if (!subject || !cycle) throw new HttpError(404, "İşçi və ya açıq dövr tapılmadı.");
    const givers = [...new Set(giverIds)].filter((g) => g !== subjectId && valid.has(g)).slice(0, 12);
    if (!givers.length) throw new HttpError(400, "Rəy verəcək kolleqaları seçin.");
    let added = 0;
    for (const g of givers) {
      const res = await db.prepare("INSERT OR IGNORE INTO perf_feedback(id,company_id,cycle_id,subject_id,giver_id,status,created) VALUES(?,?,?,?,?,'asked',?)").bind(crypto.randomUUID(), companyId, cycleId, subjectId, g, new Date().toISOString()).run();
      if (!res.meta.changes) continue;
      added++;
      const u = await db.prepare("SELECT user_id FROM company_employees WHERE id=?").bind(g).first<{ user_id: string }>();
      if (u?.user_id) await notify(db, { userId: u.user_id, type: "application", title: `Kolleqa rəyi istənilir: ${subject.name}`, body: `${cycle.name}. İş yerim → Performans bölməsində cavab verin (rəyiniz adsız göstərilir).`, link: "workplace" }).catch((error) => quiet("route-best-effort", error));
    }
    return added;
  };
  const feedbackSummary = async (companyId: string, cycleId: string, subjectIds: string[]) => {
    if (!subjectIds.length) return new Map<string, { asked: number; count: number; average: number | null; comments: string[] }>();
    const rows = (await db.prepare(`SELECT subject_id,status,score,comment FROM perf_feedback WHERE company_id=? AND cycle_id=? AND subject_id IN (${subjectIds.map(() => "?").join(",")})`).bind(companyId, cycleId, ...subjectIds).all<{ subject_id: string; status: string; score: number | null; comment: string }>()).results;
    const out = new Map<string, { asked: number; count: number; average: number | null; comments: string[] }>();
    for (const sid of subjectIds) {
      const mine = rows.filter((r) => r.subject_id === sid);
      const done = mine.filter((r) => r.status === "done" && r.score !== null);
      out.set(sid, { asked: mine.length, count: done.length, average: done.length ? Math.round((done.reduce((t, r) => t + (r.score || 0), 0) / done.length) * 10) / 10 : null, comments: done.map((r) => r.comment).filter(Boolean) });
    }
    return out;
  };
  // The skill matrix: the skills of the company, the level of every employee (0–4) and the level the job needs.
  const skillMatrix = async (companyId: string, employeeIds: string[]) => {
    const skills = (await db.prepare("SELECT id,name FROM skill_defs WHERE company_id=? ORDER BY name").bind(companyId).all<{ id: string; name: string }>()).results;
    const cells = employeeIds.length ? (await db.prepare(`SELECT employee_id,skill_id,level,target FROM employee_skills WHERE company_id=? AND employee_id IN (${employeeIds.map(() => "?").join(",")})`).bind(companyId, ...employeeIds).all<{ employee_id: string; skill_id: string; level: number; target: number }>()).results : [];
    return { skills, cells: cells.map((c) => ({ employeeId: c.employee_id, skillId: c.skill_id, level: c.level, target: c.target })) };
  };
  const setSkillLevel = async (companyId: string, employeeId: string, skillId: string, level: number | null, target: number | null) => {
    const skill = await db.prepare("SELECT id FROM skill_defs WHERE id=? AND company_id=?").bind(skillId, companyId).first<{ id: string }>();
    if (!skill) throw new HttpError(404, "Bacarıq tapılmadı.");
    const clamp = (v: number | null) => (v === null ? null : Math.max(0, Math.min(4, Math.round(v))));
    const l = clamp(level);
    const t = clamp(target);
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO employee_skills(company_id,employee_id,skill_id,level,target,updated) VALUES(?,?,?,?,?,?) ON CONFLICT(company_id,employee_id,skill_id) DO UPDATE SET level=CASE WHEN ? IS NULL THEN employee_skills.level ELSE ? END,target=CASE WHEN ? IS NULL THEN employee_skills.target ELSE ? END,updated=excluded.updated").bind(companyId, employeeId, skill.id, l ?? 0, t ?? 0, now, l, l, t, t).run();
  };
  // The people an Excel row can mean, with the FİN code of the identity card (it tells two people with one name apart).
  const employeeRefs = async () => {
    const rows = (await db.prepare("SELECT id,name,email,profile FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ id: string; name: string; email: string; profile: string }>()).results;
    const opened = await revealAll(rows);
    return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, fin: opened.get(r.id)?.fin || "", shift: !!opened.get(r.id)?.shiftWork }));
  };
  // One detail of an employee card changed by HR (the card stays sealed when encryption is on).
  const patchProfile = async (employeeId: string, patch: Partial<EmployeeProfile>) => {
    const row = await db.prepare("SELECT profile FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(employeeId, id).first<{ profile: string }>();
    if (!row) return false;
    const opened = await reveal(row.profile);
    if (opened.locked) throw new HttpError(409, "Bu işçinin şifrələnmiş məlumatı açıla bilmir: dəyişiklik tətbiq edilmədi.");
    const { profile } = normalizeProfile({ ...opened.profile, ...patch });
    await db.prepare("UPDATE company_employees SET profile=?,updated=? WHERE id=? AND company_id=?").bind(await sealProfile(profile, dataKey()), new Date().toISOString(), employeeId, id).run();
    return true;
  };
  const CARD_COLUMN: Record<keyof CardSnapshot, string> = { name: "name", position: "position", department: "department", section: "section", salaryCents: "salary_cents", salaryType: "salary_type", status: "status", endDate: "end_date", exitType: "exit_type", exitReason: "exit_reason", probationEnd: "probation_end", contractEnd: "contract_end", workMode: "work_mode" };
  const cardOf = async (employeeId: string): Promise<CardSnapshot | null> => {
    const r = await db.prepare("SELECT name,position,department,section,salary_cents,salary_type,status,end_date,exit_type,exit_reason,probation_end,contract_end,work_mode FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(employeeId, id).first<{ name: string; position: string; department: string; section: string; salary_cents: number; salary_type: string; status: string; end_date: string; exit_type: string; exit_reason: string; probation_end: string; contract_end: string; work_mode: string }>();
    return r ? { name: r.name, position: r.position, department: r.department, section: r.section || "", salaryCents: r.salary_cents, salaryType: r.salary_type || "gross", status: r.status, endDate: r.end_date || "", exitType: r.exit_type || "", exitReason: r.exit_reason || "", probationEnd: r.probation_end || "", contractEnd: r.contract_end || "", workMode: r.work_mode || "" } : null;
  };
  const writeCard = (employeeId: string, patch: CardPatch) => {
    const keys = Object.keys(patch) as (keyof CardSnapshot)[];
    return db.prepare(`UPDATE company_employees SET ${keys.map((k) => `${CARD_COLUMN[k]}=?`).join(",")}${keys.length ? "," : ""}updated=? WHERE id=? AND company_id=?`).bind(...keys.map((k) => patch[k]), new Date().toISOString(), employeeId, id);
  };
  const cardEvent = (employeeId: string, type: string, from: string, to: string, note: string, date: string) =>
    db.prepare("INSERT INTO employee_events(id,company_id,employee_id,type,from_value,to_value,note,actor_id,event_date,created) VALUES(?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(), id, employeeId, type, from, to, note, userId, date, new Date().toISOString());
  const payrollMonthLocked = async (month: string) => (await db.prepare("SELECT status FROM payroll_runs WHERE company_id=? AND month=?").bind(id, month).first<{ status: string }>())?.status === "approved";
  const addToBonus = async (employeeId: string, month: string, delta: number) => {
    const row = await db.prepare("SELECT data FROM payroll_inputs WHERE company_id=? AND month=? AND employee_id=?").bind(id, month, employeeId).first<{ data: string }>();
    let current: PayInputs = { ...EMPTY_INPUTS };
    try { current = cleanInputs(JSON.parse(row?.data || "{}")); } catch { /* an unreadable earlier value is replaced */ }
    const next = cleanInputs({ ...current, bonus: Math.max(0, Math.round((current.bonus + delta) * 100) / 100) });
    await db.prepare("INSERT INTO payroll_inputs(company_id,month,employee_id,data,updated) VALUES(?,?,?,?,?) ON CONFLICT(company_id,month,employee_id) DO UPDATE SET data=excluded.data,updated=excluded.updated").bind(id, month, employeeId, JSON.stringify(next), new Date().toISOString()).run();
  };
  // Applies the effect of a signed order (once): the card changes at once, or on its date when that is still to come.
  const applyOrderEffect = async (orderId: string, force = false, immediate = false): Promise<{ status: string; summary: string } | null> => {
    const order = await db.prepare("SELECT id,employee_id,kind,number,order_date,input,status FROM employee_orders WHERE id=? AND company_id=?").bind(orderId, id).first<{ id: string; employee_id: string; kind: string; number: string; order_date: string; input: string; status: string }>();
    if (!order || order.status !== "signed" || !hasEffect(order.kind)) return null;
    const existing = await db.prepare("SELECT * FROM order_effects WHERE order_id=?").bind(orderId).first<EffectRow>();
    if (existing && (!force || existing.status === "applied")) return { status: existing.status, summary: existing.summary };
    if (existing) await db.prepare("DELETE FROM order_effects WHERE id=?").bind(existing.id).run();
    const card = await cardOf(order.employee_id);
    if (!card) return null;
    let input: Record<string, unknown> = {};
    try { input = JSON.parse(order.input || "{}"); } catch { /* an order without readable fields has no effect */ }
    const today = new Date().toISOString().slice(0, 10);
    const effectId = crypto.randomUUID();
    const now = new Date().toISOString();
    const nowBranches = await db.prepare("SELECT b.name AS name FROM employee_branches l JOIN branches b ON b.id=l.branch_id WHERE l.employee_id=? AND l.company_id=? AND (l.to_date='' OR l.to_date>=?) AND (l.from_date='' OR l.from_date<=?)").bind(order.employee_id, id, today, today).all<{ name: string }>().catch(() => ({ results: [] as { name: string }[] }));
    const plan = planOrderEffect(order.kind, input, { ...card, branches: nowBranches.results.map((b) => b.name) }, order.order_date);
    const note = `Əmr № ${order.number || "—"}`;
    const store = async (status: string, summary: string, before: Record<string, unknown>, effective: string) => {
      await db.prepare("INSERT INTO order_effects(id,company_id,order_id,employee_id,kind,effective_date,status,plan,before,summary,applied_at,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(effectId, id, orderId, order.employee_id, order.kind, effective, status, JSON.stringify(plan || {}), JSON.stringify(before), summary, status === "applied" ? now : "", now).run();
      return { status, summary };
    };
    if (!plan) return store("skipped", "Kartda dəyişiklik yoxdur: məlumat artıq əmrdəki kimidir.", {}, order.order_date);
    // A move to another branch needs a branch that exists in the staff table (a branch is born there only).
    let moveTarget: { id: string; name: string } | undefined;
    if (plan.branchMove) {
      const all = await db.prepare("SELECT id,name FROM branches WHERE company_id=?").bind(id).all<{ id: string; name: string }>();
      moveTarget = all.results.find((b) => b.name.trim().toLocaleLowerCase("az") === plan.branchMove!.branch.trim().toLocaleLowerCase("az"));
      if (!moveTarget) return store("skipped", `“${plan.branchMove.branch}” filialı ştat cədvəlində yoxdur: filial dəyişmədi. Filial yalnız ştat cədvəlindən gəlir; onu ştatda yazıb əmri yenidən tətbiq edin.`, {}, order.order_date);
    }
    const changesCard = Object.keys(plan.patch).length > 0;
    if ((changesCard || plan.branchMove || plan.events?.length) && plan.effectiveDate > today && !immediate) return store("scheduled", plan.summary.join("; "), {}, plan.effectiveDate);
    const before: Record<string, unknown> = { ...beforeOf(card, plan.patch) };
    const statements: D1PreparedStatement[] = [];
    if (changesCard) {
      statements.push(writeCard(order.employee_id, plan.patch));
      if (plan.patch.salaryCents !== undefined) statements.push(...(await salaryChange(order.employee_id, card.salaryCents, card.salaryType, plan.patch.salaryCents, card.salaryType, plan.effectiveDate, userId)));
      if (plan.patch.position !== undefined) statements.push(cardEvent(order.employee_id, "position", card.position, plan.patch.position, note, plan.effectiveDate));
      if (plan.patch.department !== undefined) statements.push(cardEvent(order.employee_id, "department", card.department, plan.patch.department, note, plan.effectiveDate));
      if (plan.patch.section !== undefined) statements.push(cardEvent(order.employee_id, "section", card.section, plan.patch.section, note, plan.effectiveDate));
      if (plan.patch.salaryCents !== undefined) statements.push(cardEvent(order.employee_id, "salary", "", "", note, plan.effectiveDate));
      if (plan.patch.status === "left") statements.push(cardEvent(order.employee_id, "left", card.status, plan.patch.exitType || "", plan.patch.exitReason || "", plan.effectiveDate));
    }
    if (plan.branchMove && moveTarget) {
      // The old links end the day before the move; the new one starts on that day. The pay of the month then follows the working days of each branch.
      const dayBefore = new Date(Date.parse(`${plan.effectiveDate}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
      const rows = await db.prepare("SELECT branch_id,role,share_pct,bonus_eligible,from_date,to_date,department,section FROM employee_branches WHERE employee_id=? AND company_id=?").bind(order.employee_id, id).all<{ branch_id: string; role: string; share_pct: number; bonus_eligible: number; from_date: string; to_date: string; department: string; section: string }>();
      const touched = rows.results.filter((l) => l.branch_id === moveTarget!.id || !l.to_date || l.to_date >= plan.effectiveDate);
      before._branchRows = touched;
      before._branchOpened = moveTarget.id;
      for (const l of touched) {
        if (l.branch_id === moveTarget.id) continue;
        if (l.from_date && l.from_date >= plan.effectiveDate) statements.push(db.prepare("DELETE FROM employee_branches WHERE employee_id=? AND branch_id=? AND company_id=?").bind(order.employee_id, l.branch_id, id));
        else statements.push(db.prepare("UPDATE employee_branches SET to_date=? WHERE employee_id=? AND branch_id=? AND company_id=?").bind(dayBefore, order.employee_id, l.branch_id, id));
      }
      statements.push(db.prepare("INSERT INTO employee_branches(company_id,employee_id,branch_id,role,share_pct,bonus_eligible,from_date,to_date,department,section) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(employee_id,branch_id) DO UPDATE SET role=excluded.role,share_pct=0,from_date=excluded.from_date,to_date='',department=excluded.department,section=excluded.section").bind(id, order.employee_id, moveTarget.id, plan.branchMove.role, 0, 1, plan.effectiveDate, "", plan.branchMove.department, plan.branchMove.section));
      statements.push(cardEvent(order.employee_id, "branch", (nowBranches.results.map((b) => b.name)).join(", "), moveTarget.name, note, plan.effectiveDate));
    }
    if (plan.bonus) {
      if (await payrollMonthLocked(plan.bonus.month)) return store("skipped", `${plan.bonus.month} ayı təsdiqlənib: mükafatı əmək haqqında əllə yazın.`, {}, order.order_date);
      before._bonus = { month: plan.bonus.month, amount: plan.bonus.amount };
    }
    for (const e of plan.events || []) statements.push(cardEvent(order.employee_id, e.type, e.from, e.to, e.note || note, plan.effectiveDate));
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    if (plan.patch.status === "left") {
      const caseId = crypto.randomUUID();
      const res = await db.prepare("INSERT OR IGNORE INTO offboarding_cases(id,company_id,employee_id,status,planned_end,created) VALUES(?,?,?,'open',?,?)").bind(caseId, id, order.employee_id, plan.effectiveDate, now).run();
      if (res.meta.changes) before._offboardingCase = caseId;
    }
    if (plan.marks) await markAttendance(order.employee_id, plan.marks.from, plan.marks.to, plan.marks.code, note);
    if (plan.bonus) await addToBonus(order.employee_id, plan.bonus.month, plan.bonus.amount);
    const result = await store("applied", plan.summary.join("; "), before, plan.effectiveDate);
    await companyAudit(db, id, userId, "order-effect-applied", order.employee_id, `${note}: ${plan.summary.join("; ")}`);
    return result;
  };
  // Takes the effect back: the card gets its earlier values (the pay change is a new line in the pay history).
  const revertOrderEffect = async (orderId: string, by: string) => {
    const effect = await db.prepare("SELECT * FROM order_effects WHERE order_id=? AND company_id=?").bind(orderId, id).first<EffectRow>();
    if (!effect || effect.status === "reverted") throw new HttpError(404, "Geri qaytarılacaq tətbiq tapılmadı.");
    const order = await db.prepare("SELECT number FROM employee_orders WHERE id=?").bind(orderId).first<{ number: string }>();
    const note = `Əmr № ${order?.number || "—"} geri qaytarıldı`;
    const today = new Date().toISOString().slice(0, 10);
    if (effect.status === "scheduled" || effect.status === "skipped") {
      await db.prepare("UPDATE order_effects SET status='reverted',reverted_at=?,reverted_by=? WHERE id=?").bind(new Date().toISOString(), by, effect.id).run();
      return;
    }
    const before = JSON.parse(effect.before || "{}") as Record<string, unknown>;
    const plan = JSON.parse(effect.plan || "{}") as { patch?: CardPatch; marks?: { from: string; to: string; code: string }; events?: { type: string }[] };
    const card = await cardOf(effect.employee_id);
    if (!card) throw new HttpError(404, "İşçi tapılmadı.");
    const restore: CardPatch = {};
    for (const key of Object.keys(CARD_COLUMN) as (keyof CardSnapshot)[]) if (key in before) (restore as Record<string, unknown>)[key] = before[key];
    const statements: D1PreparedStatement[] = [];
    if (Object.keys(restore).length) {
      statements.push(writeCard(effect.employee_id, restore));
      if (restore.salaryCents !== undefined) {
        statements.push(...(await salaryChange(effect.employee_id, card.salaryCents, card.salaryType, restore.salaryCents, card.salaryType, today, userId)));
        statements.push(cardEvent(effect.employee_id, "salary", "", "", note, today));
      }
      if (restore.position !== undefined) statements.push(cardEvent(effect.employee_id, "position", card.position, restore.position, note, today));
      if (restore.department !== undefined) statements.push(cardEvent(effect.employee_id, "department", card.department, restore.department, note, today));
      if (restore.section !== undefined) statements.push(cardEvent(effect.employee_id, "section", card.section, restore.section, note, today));
      if (restore.status !== undefined && restore.status !== "left") statements.push(cardEvent(effect.employee_id, "returned", "left", restore.status, note, today));
    }
    // A branch move is taken back: the new link goes (or gets its earlier values) and the old links get their dates back.
    const movedRows = before._branchRows as { branch_id: string; role: string; share_pct: number; bonus_eligible: number; from_date: string; to_date: string; department: string; section: string }[] | undefined;
    const openedId = before._branchOpened as string | undefined;
    if (openedId) {
      const had = movedRows?.find((l) => l.branch_id === openedId);
      if (!had) statements.push(db.prepare("DELETE FROM employee_branches WHERE employee_id=? AND branch_id=? AND company_id=?").bind(effect.employee_id, openedId, id));
      for (const l of movedRows || []) statements.push(db.prepare("INSERT INTO employee_branches(company_id,employee_id,branch_id,role,share_pct,bonus_eligible,from_date,to_date,department,section) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(employee_id,branch_id) DO UPDATE SET role=excluded.role,share_pct=excluded.share_pct,bonus_eligible=excluded.bonus_eligible,from_date=excluded.from_date,to_date=excluded.to_date,department=excluded.department,section=excluded.section").bind(id, effect.employee_id, l.branch_id, l.role, l.share_pct, l.bonus_eligible, l.from_date, l.to_date, l.department, l.section));
      statements.push(cardEvent(effect.employee_id, "reverted", "branch", "", note, today));
    }
    for (const e of plan.events || []) statements.push(cardEvent(effect.employee_id, "reverted", e.type, "", note, today));
    for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    if (plan.marks) await markAttendance(effect.employee_id, plan.marks.from, plan.marks.to, "", note);
    const bonus = before._bonus as { month: string; amount: number } | undefined;
    if (bonus) {
      if (await payrollMonthLocked(bonus.month)) throw new HttpError(409, `${bonus.month} ayı təsdiqlənib: mükafatı əmək haqqında əllə silin.`);
      await addToBonus(effect.employee_id, bonus.month, -bonus.amount);
    }
    const caseId = before._offboardingCase as string | undefined;
    if (caseId) {
      const c = await db.prepare("SELECT checklist,exit_interview FROM offboarding_cases WHERE id=? AND company_id=?").bind(caseId, id).first<{ checklist: string; exit_interview: string }>();
      if (c && (!c.checklist || c.checklist === "{}") && (!c.exit_interview || c.exit_interview === "{}")) await db.prepare("DELETE FROM offboarding_cases WHERE id=?").bind(caseId).run();
    }
    await db.prepare("UPDATE order_effects SET status='reverted',reverted_at=?,reverted_by=? WHERE id=?").bind(new Date().toISOString(), by, effect.id).run();
    await companyAudit(db, id, userId, "order-effect-reverted", effect.employee_id, note);
  };
  // Effects with a date that has come (a transfer or a termination that starts later) are applied when HR next looks.
  const applyDueOrderEffects = async () => {
    const due = (await db.prepare("SELECT order_id FROM order_effects WHERE company_id=? AND status='scheduled' AND effective_date<=? LIMIT 50").bind(id, new Date().toISOString().slice(0, 10)).all<{ order_id: string }>()).results;
    for (const d of due) await applyOrderEffect(d.order_id, true).catch((error) => quiet("route-best-effort", error));
  };
  const withEffects = async <T extends { id: string; kind: string; status?: string }>(orders: T[]) => {
    const ids = orders.map((o) => o.id).slice(0, 500);
    const rows = ids.length ? (await db.prepare(`SELECT order_id,status,summary,effective_date,applied_at FROM order_effects WHERE company_id=? AND order_id IN (${ids.map(() => "?").join(",")})`).bind(id, ...ids).all<{ order_id: string; status: string; summary: string; effective_date: string; applied_at: string }>()).results : [];
    return orders.map((o) => ({ ...o, effect: { supported: hasEffect(o.kind), ...(rows.find((r) => r.order_id === o.id) ? { status: rows.find((r) => r.order_id === o.id)!.status, summary: rows.find((r) => r.order_id === o.id)!.summary, effectiveDate: rows.find((r) => r.order_id === o.id)!.effective_date } : {}) } }));
  };
  // Leave kinds that take the employee away from work: they go to the direct manager first and are checked for clashes.
  const AWAY_KINDS = ["vacation", "addleave", "creative", "study", "unpaid", "childcare", "maternity", "paternity", "donor", "medical", "remote", "postpone", "extendleave"];
  const AWAY_CODES = ["annual", "addleave", "creative", "unpaid", "study", "maternity", "childcare", "paternity", "donor", "medical", "sick", "injury", "trip", "summons", "military", "downtime"];
  const dataOf = (text: string): { from?: string; to?: string } => {
    try {
      return JSON.parse(text);
    } catch {
      return {};
    }
  };
  // What to look at before a leave is approved: clashes with the employee's own leave and with colleagues of the department.
  const leaveChecks = async (companyId: string, emp: { id: string; department: string }, kind: string, data: { from?: string; to?: string }, selfId = ""): Promise<string[]> => {
    if (!AWAY_KINDS.includes(kind) || !/^\d{4}-\d{2}-\d{2}$/.test(data.from || "") || !/^\d{4}-\d{2}-\d{2}$/.test(data.to || "")) return [];
    const from = data.from as string;
    const to = data.to as string;
    const out: string[] = [];
    // The balance: the days asked for against the days left (art. 114.6 holidays are not counted).
    if (kind === "vacation") {
      const person = await db.prepare("SELECT start_date,vacation_days,vacation_used FROM company_employees WHERE id=?").bind(emp.id).first<{ start_date: string; vacation_days: number; vacation_used: number }>();
      if (person) {
        const used = Number((await db.prepare("SELECT COUNT(*) AS n FROM attendance_marks WHERE employee_id=? AND code='annual'").bind(emp.id).first<{ n: number }>())?.n || 0);
        const left = vacationBalance({ start: person.start_date, end: "", entitlement: person.vacation_days ?? 21, used: (person.vacation_used ?? 0) + used }, new Date().toISOString().slice(0, 10)).remaining;
        const asked = vacationDaysBetween(from, to);
        if (asked > left + 0.001) out.push(`Ərizədə ${asked} məzuniyyət günü var, qalıq isə ${left} gündür (qazanılmış günlərə görə). Qalıqdan artıq məzuniyyət əvvəlcədən verilmiş sayılır: razılıq lazımdır.`);
      }
    }
    const marks = await db.prepare(`SELECT COUNT(*) AS n FROM attendance_marks WHERE company_id=? AND employee_id=? AND day BETWEEN ? AND ? AND code IN (${AWAY_CODES.map(() => "?").join(",")})`).bind(companyId, emp.id, from, to, ...AWAY_CODES).first<{ n: number }>();
    if (Number(marks?.n) > 0) out.push(`Bu tarixlərdə cədvəldə artıq ${marks?.n} gün məzuniyyət/icazə/xəstəlik qeydi var.`);
    const open = (await db.prepare("SELECT id,employee_id,kind,data FROM employee_requests WHERE company_id=? AND status IN ('new','ordered') AND id<>?").bind(companyId, selfId).all<{ id: string; employee_id: string; kind: string; data: string }>()).results.filter((r) => AWAY_KINDS.includes(r.kind) && !["postpone", "extendleave"].includes(r.kind));
    const clash = (r: { data: string }) => {
      const d = dataOf(r.data);
      return !!d.from && !!d.to && d.from <= to && from <= d.to;
    };
    if (open.some((r) => r.employee_id === emp.id && clash(r))) out.push("İşçinin bu tarixlərə düşən başqa açıq ərizəsi və ya əmri var.");
    if (emp.department && ["vacation", "addleave", "creative"].includes(kind)) {
      const people = (await db.prepare("SELECT id,name,department FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(companyId).all<{ id: string; name: string; department: string }>()).results;
      const plan = (await db.prepare("SELECT id,employee_id,start_date,end_date,days,status FROM leave_schedule WHERE company_id=? AND status<>'rejected' AND start_date<=? AND end_date>=?").bind(companyId, to, from).all<{ id: string; employee_id: string; start_date: string; end_date: string; days: number; status: string }>()).results;
      const others: ScheduleEntry[] = [
        ...plan.filter((r) => r.employee_id !== emp.id).map((r) => ({ id: r.id, employeeId: r.employee_id, start: r.start_date, end: r.end_date, days: r.days, status: r.status })),
        ...open.filter((r) => r.employee_id !== emp.id && ["vacation", "addleave", "creative"].includes(r.kind) && clash(r)).map((r) => ({ id: r.id, employeeId: r.employee_id, start: dataOf(r.data).from as string, end: dataOf(r.data).to as string, days: 0, status: "proposed" })),
      ];
      out.push(...scheduleWarnings({ employeeId: emp.id, start: from, end: to, days: 0 }, others, people, { remaining: 9999 }).filter((w) => w.includes("eyni vaxtda")));
    }
    return out;
  };
  const clockSettings = async (companyId: string) => {
    const rows = (await db.prepare("SELECT key,value FROM hr_settings WHERE company_id=? AND key IN ('work_start','work_end','break_minutes','grace_minutes','overtime_approval','self_clock','office_lat','office_lng','office_radius','clock_location')").bind(companyId).all<{ key: string; value: string }>()).results;
    const get = (k: string) => rows.find((r) => r.key === k)?.value;
    const rules: ClockRules = {
      start: validClockTime(get("work_start") || "") ? get("work_start")! : DEFAULT_CLOCK.start,
      end: validClockTime(get("work_end") || "") ? get("work_end")! : DEFAULT_CLOCK.end,
      breakMinutes: get("break_minutes") !== undefined && Number.isFinite(Number(get("break_minutes"))) ? Number(get("break_minutes")) : DEFAULT_CLOCK.breakMinutes,
      graceMinutes: get("grace_minutes") !== undefined && Number.isFinite(Number(get("grace_minutes"))) ? Number(get("grace_minutes")) : DEFAULT_CLOCK.graceMinutes,
    };
    const lat = Number(get("office_lat"));
    const lng = Number(get("office_lng"));
    const radius = Math.max(20, Math.min(5000, Math.round(Number(get("office_radius")) || 150)));
    const office: Office | null = validPoint(lat, lng) && get("office_lat") !== undefined ? { lat, lng, radius } : null;
    const mode: GeoMode = GEO_MODES.includes(get("clock_location") as GeoMode) && office ? (get("clock_location") as GeoMode) : "off";
    return { rules, overtimeApproval: get("overtime_approval") === "1", selfClock: get("self_clock") !== "0", office, locationMode: mode };
  };
  const ownWorkplace = async (employeeId: string) => {
    if (accountRole === "company") throw new HttpError(403, "İşçi profili yalnız şəxsi hesab üçündür.");
    const row = await db
      .prepare("SELECT id,company_id,name,position,department,section,start_date,status,vacation_days,vacation_used FROM company_employees WHERE id=? AND user_id=? AND status IN ('active','leave')")
      .bind(employeeId, userId)
      .first<{ id: string; company_id: string; name: string; position: string; department: string; section: string; start_date: string; status: string; vacation_days: number; vacation_used: number }>();
    if (!row) throw new HttpError(404, "Bu iş yeri profilinizə qoşulmayıb.");
    return row;
  };
  const REQUEST_KINDS_FOR_EMPLOYEE = REQUEST_KINDS.filter((k) => k.id !== "compensation").map((k) => ({ id: k.id, label: k.label, hint: k.hint }));
  const APPLICATION_STATUS_TEXT: Record<string, string> = { new: "Baxılır", ordered: "Əmr hazırlanıb", rejected: "Rədd edilib", answered: "Cavablandırılıb", withdrawn: "Geri götürülüb" };
    {
    const r = await handle_employee_01({ accountRole, db, employeeRefs, id, ownWorkplace, path, request, requestUrl, requirePermission, userId });
    if (r) return r;
  }
  // ---- Birthdays and work anniversaries: shown to colleagues and greeted on the day, only when the company switches it on ----
  const celebrationsOn = async (companyId: string) => (await db.prepare("SELECT value FROM hr_settings WHERE company_id=? AND key='celebrations'").bind(companyId).first<{ value: string }>())?.value === "on";
  const celebrationList = async (companyId: string, withinDays: number) => {
    const rows = (await db.prepare("SELECT id,name,start_date,profile FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(companyId).all<{ id: string; name: string; start_date: string; profile: string }>()).results;
    const opened = await revealAll(rows);
    return upcomingCelebrations(rows.map((r) => ({ id: r.id, name: r.name, birthDate: opened.get(r.id)?.birthDate || "", startDate: r.start_date })), new Date().toISOString().slice(0, 10), withinDays);
  };
    {
    const r = await handle_company_05({ celebrationList, celebrationsOn, db, id, ownWorkplace, path, request, requestUrl, requirePermission, tellEmployee, userId });
    if (r) return r;
  }
  // ---- The photo of an employee: set by HR or by the employee, removed by either ----
  const photoOf = async (companyId: string, employeeId: string) => {
    const row = await db.prepare("SELECT mime,data FROM employee_photos WHERE employee_id=? AND company_id=?").bind(employeeId, companyId).first<{ mime: string; data: string }>();
    return row ? `data:${row.mime};base64,${row.data}` : "";
  };
  const savePhoto = async (companyId: string, employeeId: string, image: unknown, by: string) => {
    const parsed = parsePhotoDataUrl(image);
    if (!parsed.ok) throw new HttpError(400, parsed.error);
    await db.prepare("INSERT INTO employee_photos(employee_id,company_id,mime,data,size,updated,updated_by) VALUES(?,?,?,?,?,?,?) ON CONFLICT(employee_id) DO UPDATE SET mime=excluded.mime,data=excluded.data,size=excluded.size,updated=excluded.updated,updated_by=excluded.updated_by").bind(employeeId, companyId, parsed.mime, parsed.base64, parsed.bytes, new Date().toISOString(), by).run();
  };
    {
    const r = await handle_company_06({ db, id, ownWorkplace, path, photoOf, request, requestUrl, requirePermission, savePhoto, userId });
    if (r) return r;
  }
  // ── The employee's own growth: goals and review, training, shifts, trips, announcements and surveys ──
  const tellCompany = async (companyId: string, title: string, body: string, link: string) => {
    await notify(db, { userId: companyId, type: "employee", title, body, link }).catch((error) => quiet("route-best-effort", error));
  };
    {
    const r = await handle_employee_02({ db, ownWorkplace, path, request, requestUrl, tellCompany });
    if (r) return r;
  }
  // The direct manager's view: their people, leave applications waiting for them, and who is away.
  // Is the employee away on a day (leave, sickness, a trip…): the base of the manager's stand-in.
  const awayOn = async (companyId: string, employeeId: string, day: string) =>
    !!(await db.prepare(`SELECT 1 AS n FROM attendance_marks WHERE company_id=? AND employee_id=? AND day=? AND code IN (${AWAY_CODES.map(() => "?").join(",")})`).bind(companyId, employeeId, day, ...AWAY_CODES).first());
  // The people of a manager; a deputy also gets the people of the manager he or she stands in for while that manager is away.
  const teamOf = async (manager: { id: string; company_id: string }) => {
    const rows = (await db.prepare("SELECT id,name,position,department,user_id,profile,vacation_days,vacation_used,start_date FROM company_employees WHERE company_id=? AND status IN ('active','leave') AND id<>?").bind(manager.company_id, manager.id).all<{ id: string; name: string; position: string; department: string; user_id: string; profile: string; vacation_days: number; vacation_used: number; start_date: string }>()).results;
    const today = bakuNow().date;
    const standingFor = new Set<string>();
    for (const r of rows) if (parseProfile(r.profile).deputyId === manager.id && (await awayOn(manager.company_id, r.id, today))) standingFor.add(r.id);
    return rows.filter((r) => { const m = parseProfile(r.profile).managerId; return m === manager.id || standingFor.has(m); });
  };
  // Who decides the leave or trip of an employee: the manager; while the manager is away the deputy; with nobody, HR directly.
  const approverOf = async (companyId: string, employeeProfile: string, onDay: string) => {
    const profile = parseProfile(employeeProfile);
    const find = (cardId: string) => (cardId ? db.prepare("SELECT id,name,user_id FROM company_employees WHERE id=? AND company_id=? AND status IN ('active','leave') AND user_id<>''").bind(cardId, companyId).first<{ id: string; name: string; user_id: string }>() : Promise.resolve(null));
    const manager = await find(profile.managerId);
    if (!manager) return { approver: null, note: "" };
    const days = [bakuNow().date, /^\d{4}-\d{2}-\d{2}$/.test(onDay) ? onDay : ""].filter(Boolean);
    let away = false;
    for (const d of days) if (await awayOn(companyId, manager.id, d)) away = true;
    if (!away) return { approver: manager, note: "" };
    const deputyCard = (await db.prepare("SELECT profile FROM company_employees WHERE id=?").bind(manager.id).first<{ profile: string }>());
    const deputy = await find(parseProfile(deputyCard?.profile || "").deputyId);
    return deputy ? { approver: deputy, note: `Rəhbəriniz (${manager.name}) yoxdur: ərizə əvəzedicisinə (${deputy.name}) göndərildi.` } : { approver: null, note: `Rəhbəriniz (${manager.name}) yoxdur: ərizə birbaşa HR-a göndərildi.` };
  };
    {
    const r = await handle_employee_03({ AWAY_CODES, PROFILE_CHANGE_FIELDS, applySwap, approverOf, askFeedback, changeValue, clockSettings, dataKey, dataOf, db, feedbackSummary, leaveChecks, maskedValue, oneOnOneRows, ownWorkplace, path, request, requestUrl, saveOneOnOne, setSkillLevel, skillMatrix, swapSelect, swapView, teamOf, tellCompany, tripView, userId });
    if (r) return r;
  }
  // The employee's own pay slips: only months the company has approved, and only the employee's own figures.
  const approvedSlipOf = async (employee: { id: string; company_id: string }, month: string) => {
    const run = await db.prepare("SELECT snapshot,approved_at FROM payroll_runs WHERE company_id=? AND month=? AND status='approved'").bind(employee.company_id, month).first<{ snapshot: string; approved_at: string }>();
    if (!run?.snapshot) return null;
    try {
      const mine = (JSON.parse(run.snapshot) as { rows?: { employeeId: string; result: ReturnType<typeof computePay> }[] }).rows?.find((r) => r.employeeId === employee.id);
      return mine ? { result: mine.result, approvedAt: run.approved_at } : null;
    } catch {
      return null;
    }
  };
    {
    const r = await handle_employee_04({ APPLICATION_STATUS_TEXT, AWAY_KINDS, REQUEST_KINDS_FOR_EMPLOYEE, accountRole, approvedSlipOf, approverOf, db, id, leaveChecks, ownWorkplace, path, request, requestUrl, requirePermission, reveal, userId });
    if (r) return r;
  }
  // ---- Payroll: monthly pay, advances, payments, pay slips ----
  const payrollMonth = () => {
    const raw = str(requestUrl.searchParams.get("month"), 7) || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) throw new HttpError(400, "Ayı düzgün seçin (YYYY-AA).");
    return { raw, year: Number(raw.slice(0, 4)), month: Number(raw.slice(5, 7)) };
  };
  const approvedGross = (shared: PayrollShared, since: string, before: string) => {
    // A shared load covers every approved month from `grossSince` on; a lone month loads just the 12 it needs.
    const covering = shared.gross && shared.grossSince !== undefined && shared.grossSince <= since;
    if (!covering) {
      shared.grossSince = since;
      shared.gross = (async () => {
        const out = new Map<string, Map<string, number>>();
        const past = await db.prepare("SELECT month,snapshot FROM payroll_runs WHERE company_id=? AND status='approved' AND month>=? AND month<?").bind(id, since, before).all<{ month: string; snapshot: string }>();
        for (const run of past.results) {
          const gross = new Map<string, number>();
          try {
            for (const r of (JSON.parse(run.snapshot) as { rows?: { employeeId: string; result: { gross: number } }[] }).rows || []) gross.set(r.employeeId, r.result.gross);
          } catch (error) {
            // A broken snapshot gives no history for that month.
            quiet("route-catch", error);
          }
          out.set(run.month, gross);
        }
        return out;
      })();
    }
    return shared.gross!;
  };
  const branchContext = async (monthRaw: string): Promise<BranchCtx> => {
    const [b, l, r, sl, m] = await Promise.all([
      db.prepare("SELECT id,name,code,city,active FROM branches WHERE company_id=? ORDER BY name").bind(id).all<{ id: string; name: string; code: string; city: string; active: number }>().catch(() => ({ results: [] as { id: string; name: string; code: string; city: string; active: number }[] })),
      db.prepare("SELECT employee_id,branch_id,role,share_pct,bonus_eligible,from_date,to_date,department,section FROM employee_branches WHERE company_id=?").bind(id).all<{ employee_id: string; branch_id: string; role: string; share_pct: number; bonus_eligible: number; from_date: string; to_date: string; department: string; section: string }>().catch(() => ({ results: [] as { employee_id: string; branch_id: string; role: string; share_pct: number; bonus_eligible: number; from_date: string; to_date: string; department: string; section: string }[] })),
      db.prepare("SELECT branch_id,kind,value,active FROM branch_bonus_rules WHERE company_id=?").bind(id).all<{ branch_id: string; kind: string; value: number; active: number }>().catch(() => ({ results: [] as { branch_id: string; kind: string; value: number; active: number }[] })),
      db.prepare("SELECT branch_id,month,target,sales FROM branch_sales WHERE company_id=? AND month=?").bind(id, monthRaw).all<{ branch_id: string; month: string; target: number; sales: number }>().catch(() => ({ results: [] as { branch_id: string; month: string; target: number; sales: number }[] })),
      db.prepare("SELECT value FROM hr_settings WHERE company_id=? AND key='branch_alloc_mode'").bind(id).first<{ value: string }>().catch(() => null),
    ]);
    return {
      branches: b.results.map((x) => ({ id: x.id, name: x.name, code: x.code, city: x.city, active: !!x.active })),
      links: l.results.map((x) => ({ employeeId: x.employee_id, branchId: x.branch_id, role: x.role, sharePct: x.share_pct, bonusEligible: !!x.bonus_eligible, from: x.from_date, to: x.to_date, department: x.department, section: x.section })),
      rules: r.results.map((x) => ({ branchId: x.branch_id, kind: x.kind === "salary_percent" ? "salary_percent" : "fixed", value: x.value, active: !!x.active })),
      sales: sl.results.map((x) => ({ branchId: x.branch_id, month: x.month, target: x.target, sales: x.sales })),
      mode: normalizeMode(m?.value),
    };
  };
  const payrollRows = async (monthRaw: string, shared: PayrollShared = {}) => {
    const year = Number(monthRaw.slice(0, 4));
    const month = Number(monthRaw.slice(5, 7));
    const first = `${monthRaw}-01`;
    const last = `${monthRaw}-31`;
    const todayIso = new Date().toISOString().slice(0, 10);
    const [people, overrides, marks, inputs, payments, run, settings] = await Promise.all([
      db
        .prepare(
          "SELECT id,name,position,department,section,start_date,end_date,status,salary_cents,salary_type,sector,profile,vacation_days,vacation_used FROM company_employees WHERE company_id=? AND status<>'removed' AND (start_date='' OR start_date<=?) AND (status<>'left' OR end_date='' OR end_date>=?) ORDER BY department,section,name",
        )
        .bind(id, last, first)
        .all<{ id: string; name: string; position: string; department: string; section: string; start_date: string; end_date: string; status: string; salary_cents: number; salary_type: string; sector: string; profile: string; vacation_days: number; vacation_used: number }>(),
      db.prepare("SELECT day,kind,label FROM company_calendar WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, first, last).all<CalendarOverride>(),
      db.prepare("SELECT employee_id,day,code FROM attendance_marks WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, first, last).all<{ employee_id: string; day: string; code: string }>(),
      db.prepare("SELECT employee_id,data FROM payroll_inputs WHERE company_id=? AND month=?").bind(id, monthRaw).all<{ employee_id: string; data: string }>(),
      db.prepare("SELECT id,employee_id,kind,amount_cents,paid_on,method,note,title,reversed_at,reversed_by_name,reverse_reason,batch_id FROM payroll_payments WHERE company_id=? AND month=? ORDER BY paid_on,created").bind(id, monthRaw).all<{ id: string; employee_id: string; kind: string; amount_cents: number; paid_on: string; method: string; note: string; title: string; reversed_at: string; reversed_by_name: string; reverse_reason: string; batch_id: string }>(),
      db.prepare("SELECT status,snapshot,approved_by_name,approved_at FROM payroll_runs WHERE company_id=? AND month=?").bind(id, monthRaw).first<{ status: string; snapshot: string; approved_by_name: string; approved_at: string }>(),
      db.prepare("SELECT advance_day,pay_day,dual_threshold FROM payroll_settings WHERE company_id=?").bind(id).first<{ advance_day: number; pay_day: number; dual_threshold: number }>(),
    ]);
    const days = monthDays(year, month, overrides.results);
    const working = days.filter((d) => !d.off);
    // The pay in force on each working day: an employee whose pay changed in the month is paid each part at its own rate.
    const salaryHistory = new Map<string, { from: string; cents: number; type: string }[]>();
    shared.salaryHistory ||= db.prepare("SELECT employee_id,effective_from,salary_cents,salary_type FROM employee_salary_history WHERE company_id=? ORDER BY effective_from").bind(id).all<{ employee_id: string; effective_from: string; salary_cents: number; salary_type: string }>().then((r) => r.results);
    for (const h of await shared.salaryHistory)
      salaryHistory.set(h.employee_id, [...(salaryHistory.get(h.employee_id) || []), { from: h.effective_from, cents: h.salary_cents, type: h.salary_type }]);
    // Art. 140: vacation pay comes from the 12 months before; approved months give the real gross pay, other months the current salary.
    const priorMonths = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(Date.UTC(year, month - 1 - (12 - i), 1));
      return d.toISOString().slice(0, 7);
    });
    const leavers = people.results.filter((p) => p.status === "left" && (p.end_date || "").startsWith(monthRaw));
    const wantsHistory = leavers.length > 0 || marks.results.some((m) => isVacationCode(m.code) || isInsuredCode(m.code));
    const history = new Map<string, Map<string, number>>();
    if (wantsHistory) {
      const past = await approvedGross(shared, priorMonths[0], monthRaw);
      for (const [pastMonth, grossBy] of past) {
        if (pastMonth < priorMonths[0] || pastMonth >= monthRaw) continue;
        for (const [employeeId, gross] of grossBy) history.set(employeeId, (history.get(employeeId) || new Map()).set(pastMonth, gross));
      }
    }
    const behind = working.filter((d) => d.date <= todayIso).length;
    const markBy = new Map<string, Map<string, string>>();
    for (const m of marks.results) markBy.set(m.employee_id, (markBy.get(m.employee_id) || new Map()).set(m.day, m.code));
    const inputBy = new Map(inputs.results.map((r) => [r.employee_id, (() => { try { return cleanInputs(JSON.parse(r.data)); } catch { return { ...EMPTY_INPUTS }; } })()]));
    // The share of the average pay paid as sickness and maternity benefit: the company sets what the law says.
    shared.rates ||= db.prepare("SELECT key,value FROM hr_settings WHERE company_id=? AND key IN ('benefit_sick_percent','benefit_maternity_percent','benefit_min_pension','benefit_payer','overtime_approval','tax_confirmed_year','tax_confirmed_by','tax_confirmed_at')").bind(id).all<{ key: string; value: string }>().then((x) => x.results);
    const rateRows = await shared.rates;
    const rateOf = (key: string, fallback: number) => {
      const n = Number(rateRows.find((r) => r.key === key)?.value);
      return Number.isFinite(n) && n >= 0 && n <= 100 && rateRows.some((r) => r.key === key) ? n : fallback;
    };
    const sickPercent = rateOf("benefit_sick_percent", SICK_BENEFIT_PERCENT);
    const maternityPercent = rateOf("benefit_maternity_percent", MATERNITY_BENEFIT_PERCENT);
    // Art. 6: the monthly benefit is at most 25 times the minimum labour pension (entered by the company); art. 17: the insurer pays it directly unless the company says it pays.
    const minPension = Math.max(0, Number(rateRows.find((r) => r.key === "benefit_min_pension")?.value) || 0);
    const benefitPayer = rateRows.find((r) => r.key === "benefit_payer")?.value === "employer" ? "employer" : "insurer";
    // Standing additions and deductions of the month, and what the previous month could not deduct.
    const recurring = (await db.prepare("SELECT id,employee_id,type,label,amount_cents,deduction_kind FROM payroll_recurring WHERE company_id=? AND from_month<=? AND (to_month='' OR to_month>=?)").bind(id, monthRaw, monthRaw).all<{ id: string; employee_id: string; type: string; label: string; amount_cents: number; deduction_kind: string }>()).results;
    const carries = (await db.prepare("SELECT id,employee_id,label,amount_cents,deduction_kind,from_month FROM payroll_carry WHERE company_id=? AND month=?").bind(id, monthRaw).all<{ id: string; employee_id: string; label: string; amount_cents: number; deduction_kind: string; from_month: string }>()).results;
    // Hours worked on each day, when the company keeps them: extra, rest-day and night hours come from here.
    const hoursBy = new Map<string, HoursByDay>();
    // With the approval rule on, extra and rest-day hours count only when the employer has approved them (arts. 99, 105).
    const overtimeApproval = rateRows.find((r) => r.key === "overtime_approval")?.value === "1";
    const approvedBy = new Map<string, Set<string>>();
    const approveDay = (employeeId: string, day: string) => approvedBy.set(employeeId, (approvedBy.get(employeeId) || new Set()).add(day));
    const monthTotals = new Map((await db.prepare("SELECT employee_id,overtime,rest_day,night,status FROM attendance_hours_month WHERE company_id=? AND month=?").bind(id, monthRaw).all<{ employee_id: string; overtime: number; rest_day: number; night: number; status: string }>()).results.map((r) => [r.employee_id, { overtime: r.overtime, restDay: r.rest_day, night: r.night, status: r.status }]));
    const orderedEmployees = new Set<string>();
    for (const o of (await db.prepare("SELECT employee_id,day FROM overtime_orders WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, first, last).all<{ employee_id: string; day: string }>()).results) {
      approveDay(o.employee_id, o.day);
      orderedEmployees.add(o.employee_id);
    }
    for (const h of (await db.prepare("SELECT employee_id,day,hours,night_hours,overtime_status FROM attendance_hours WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, first, last).all<{ employee_id: string; day: string; hours: number; night_hours: number; overtime_status: string }>()).results) {
      hoursBy.set(h.employee_id, (hoursBy.get(h.employee_id) || new Map()).set(h.day, { hours: h.hours, night: h.night_hours }));
      if (h.overtime_status === "approved") approveDay(h.employee_id, h.day);
    }
    const withStanding = (manual: PayInputs, employeeId: string): PayInputs => {
      const adds = recurring.filter((r) => r.employee_id === employeeId && r.type === "addition").reduce((t, r) => t + r.amount_cents / 100, 0);
      const deds = [
        ...recurring.filter((r) => r.employee_id === employeeId && r.type === "deduction").map((r) => ({ label: r.label, amount: r.amount_cents / 100, kind: (["writ", "alimony"].includes(r.deduction_kind) ? r.deduction_kind : "general") as "general" | "writ" | "alimony" })),
        ...carries.filter((c) => c.employee_id === employeeId).map((c) => ({ label: `${c.label} (${c.from_month} ayından qalıq)`, amount: c.amount_cents / 100, kind: (["writ", "alimony"].includes(c.deduction_kind) ? c.deduction_kind : "general") as "general" | "writ" | "alimony" })),
      ];
      return adds || deds.length ? { ...manual, allowance: Math.round((manual.allowance + adds) * 100) / 100, deductions: [...manual.deductions, ...deds] } : manual;
    };
    const advanceDay = settings?.advance_day || 0;
    const payDay = settings?.pay_day || 28;
    const advanceDate = advanceDay ? paymentDate(year, month, advanceDay) : "";
    const payDate = paymentDate(year, month, payDay);
    const frozen: { rows?: { employeeId: string; result: ReturnType<typeof computePay> }[] } | null = run?.status === "approved" && run.snapshot ? (() => { try { return JSON.parse(run.snapshot); } catch { return null; } })() : null;
    const sectionFor = await staffSections();
    const profiles = await revealAll(people.results);
    const bctx = await branchContext(monthRaw);
    const branchName = new Map(bctx.branches.map((x) => [x.id, x.name]));
    const activeBranch = new Set(bctx.branches.filter((x) => x.active).map((x) => x.id));
    // The gross pay of the last approved month, to point out a sudden change.
    const previousMonth = new Date(Date.UTC(year, month - 2, 1)).toISOString().slice(0, 7);
    const previousGross = new Map<string, number>();
    // The month before is read from the same frozen snapshots; a lone month asks for just that one.
    const priorGross = await approvedGross(shared, shared.grossSince !== undefined && shared.grossSince <= previousMonth ? shared.grossSince : previousMonth, monthRaw);
    for (const [employeeId, gross] of priorGross.get(previousMonth) || []) previousGross.set(employeeId, gross);
    // Leave days already taken by those whose contract ends this month.
    const leaverLeave = new Map<string, number>();
    if (leavers.length) {
      const counted = await db.prepare("SELECT employee_id,COUNT(*) AS n FROM attendance_marks WHERE company_id=? AND code='annual' GROUP BY employee_id").bind(id).all<{ employee_id: string; n: number }>();
      for (const r of counted.results) leaverLeave.set(r.employee_id, Number(r.n));
    }
    const rows = people.results.map((p) => {
      const profile = profiles.get(p.id) || parseProfile(p.profile);
      const reduction = taxReduction(profile, todayIso);
      const week = weeklyHours(profile, first);
      const payOf = (cents: number, type: string) => (cents > 0 ? employeePay(cents / 100, type === "net" ? "net" : "gross", p.sector === "public" ? "public" : "private", reduction) : null);
      let pay = payOf(p.salary_cents, p.salary_type);
      const own = salaryHistory.get(p.id);
      if (own && own.length && working.length) {
        // Gross pay on every working day, averaged over the month's working days.
        const grossOn = (date: string) => {
          let current = own[0];
          for (const h of own) if (h.from <= date) current = h;
          return payOf(current.cents, current.type)?.gross || 0;
        };
        const mean = working.reduce((t, d) => t + grossOn(d.date), 0) / working.length;
        if (mean > 0 && pay) pay = { ...pay, gross: Math.round(mean * 100) / 100 };
        else if (mean > 0) pay = payOf(Math.round(mean * 100), "gross");
      }
      // The branches the employee works in this month: his pay is shared between them, and a branch that reached its sales limit gives a bonus.
      const myLinks = bctx.links.filter((l) => l.employeeId === p.id && activeBranch.has(l.branchId) && linkActiveIn(l, monthRaw));
      const branchShares = sharesOf(myLinks, bctx.mode, (branchId) => bctx.sales.find((x) => x.branchId === branchId)?.sales || 0, working.map((d) => d.date));
      const branchBonus = bonusesOf({ links: myLinks, shares: branchShares, grossSalary: pay?.gross || 0, rules: bctx.rules, sales: bctx.sales, nameOf: (branchId) => branchName.get(branchId) || "" });
      const branchBonusTotal = Math.round(branchBonus.reduce((t, x) => t + x.amount, 0) * 100) / 100;
      const marksOf = markBy.get(p.id) || new Map<string, string>();
      const statuses: DayStatus[] = working.map((d) => ((p.start_date && d.date < p.start_date) || (p.status === "left" && p.end_date && d.date > p.end_date) ? "outside" : dayStatus(marksOf.get(d.date) || "")));
      const mine = payments.results.filter((x) => x.employee_id === p.id);
      // Reversed payments stay in the history but count for nothing.
      const live = mine.filter((x) => !x.reversed_at);
      const sumOf = (kinds: string[]) => live.filter((x) => kinds.includes(x.kind)).reduce((sum, x) => sum + x.amount_cents, 0) / 100;
      const advances = sumOf(["advance"]);
      const vacationPaid = sumOf(["vacation"]);
      const salaryPaid = sumOf(["salary", "vacation"]);
      const benefitPaid = sumOf(["benefit"]);
      const extraPaid = sumOf(["extra"]);
      const inputsOf = inputBy.get(p.id) || { ...EMPTY_INPUTS };
      // One source: the daily entries of Saat uçotu when there are any, otherwise its month total. The two are never added.
      const chosen = chooseHours({ days, daily: hoursBy.get(p.id), total: monthTotals.get(p.id), weekHours: week.hours, needsApproval: overtimeApproval, approvedDays: approvedBy.get(p.id) || new Set(), totalCoveredByOrder: orderedEmployees.has(p.id) });
      const hoursAuto = chosen.summary;
      const vacationOf = (date: string) => isVacationCode(marksOf.get(date) || "");
      const vacation = vacationCalendarDays(days, vacationOf);
      const insuredOf = (date: string) => isInsuredCode(marksOf.get(date) || "");
      const insuredDays = vacationCalendarDays(days, insuredOf, true);
      let annual: { mask: boolean[]; calendarDays: number; averageMonthly: number } | undefined;
      let annualInfo: { months: number; estimated: boolean; averageMonthly: number; calendarDays: number } | null = null;
      let insured: { averageMonthly: number; calendarDays: number; percent: number; eligible?: boolean | null; cap?: number | null } | undefined;
      const leaving = p.status === "left" && (p.end_date || "").startsWith(monthRaw);
      let leaveCompensation: { days: number; averageMonthly: number } | undefined;
      if (vacation.workingDays > 0 || insuredDays.workingDays > 0 || leaving) {
        // The 12 months before: real gross pay of approved months, the current salary for the others.
        const mine = history.get(p.id);
        const earnings: number[] = [];
        let estimated = false;
        for (const m of priorMonths) {
          if (p.start_date && `${m}-01` < p.start_date) continue;
          const real = mine?.get(m);
          if (real === undefined) estimated = true;
          earnings.push(real ?? (pay?.gross || 0));
        }
        const avg = earnings.length ? averageMonthlyForLeave(earnings).averageMonthly : pay?.gross || 0;
        if (!earnings.length) estimated = true;
        if (vacation.workingDays > 0) {
          annual = { mask: working.map((d) => vacationOf(d.date)), calendarDays: vacation.calendarDays, averageMonthly: avg };
          annualInfo = { months: earnings.length, estimated, averageMonthly: avg, calendarDays: vacation.calendarDays };
        }
        if (leaving) {
          // Art. 143: unused main leave is paid when the contract ends, from the average pay (art. 140).
          const usedBefore = leaverLeave.get(p.id) || 0;
          const unused = unusedLeaveCompensation({ hireDate: p.start_date || p.end_date, endDate: p.end_date, mainLeaveDays: p.vacation_days ?? 21, usedDays: (p.vacation_used ?? 0) + usedBefore, monthlyEarnings: earnings.length ? earnings : [pay?.gross || 0] });
          if (unused && unused.unusedDays > 0) leaveCompensation = { days: unused.unusedDays, averageMonthly: avg };
        }
        if (insuredDays.workingDays > 0) {
          const maternity = [...marksOf.values()].includes("maternity");
          // Art. 6: at least 6 months of insurance record (months here plus the record before this job).
          let eligible: boolean | null = null;
          if (p.start_date) {
            const from = new Date(`${p.start_date}T00:00:00Z`);
            const to = new Date(`${monthRaw}-01T00:00:00Z`);
            const here = Math.max(0, (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + to.getUTCMonth() - from.getUTCMonth() - (to.getUTCDate() < from.getUTCDate() ? 1 : 0));
            eligible = here + Math.max(0, Number(profile.insuranceBefore) || 0) >= BENEFIT_MIN_INSURANCE_MONTHS;
          }
          insured = { averageMonthly: avg, calendarDays: insuredDays.calendarDays, percent: maternity ? maternityPercent : sickPercent, eligible, cap: minPension > 0 ? minPension * BENEFIT_CAP_FACTOR : null };
        }
      }
      const base = { monthlySalary: pay?.gross || 0, statuses, weekHours: week.hours, sector: (p.sector === "public" ? "public" : "private") as "public" | "private", taxReduction: reduction, inputs: (() => {
          const merged = withStanding(inputsOf, p.id);
          // The hours come only from Saat uçotu; the night supplement is a term of the contract, kept on the employee card.
          return { ...merged, bonus: Math.round((merged.bonus + branchBonusTotal) * 100) / 100, overtimeHours: hoursAuto.overtime, restDayHours: hoursAuto.restDay, nightHours: hoursAuto.night, nightPercent: Number(profile.nightPercent) || merged.nightPercent };
        })(), annual, insured, leaveCompensation };
      const result = frozen?.rows?.find((r) => r.employeeId === p.id)?.result || computePay({ ...base, advances });
      const upTo = month === Number(todayIso.slice(5, 7)) && year === Number(todayIso.slice(0, 4)) ? behind : todayIso > `${monthRaw}-31` ? statuses.length : 0;
      const available = availableAdvance(base, Math.min(statuses.length, upTo), advances);
      const outstanding = Math.max(0, Math.round((result.toPay - salaryPaid) * 100) / 100);
      const lastPaid = live.filter((x) => x.kind !== "advance").map((x) => x.paid_on).sort().pop() || "";
      // The net share of the vacation pay, which can be paid on its own, 3 days before the vacation (art. 140.5).
      const vacationLine = result.lines.find((l) => l.id === "vacation")?.amount || 0;
      const vacationDue = result.gross > 0 ? Math.round(((result.net * vacationLine) / result.gross) * 100) / 100 : 0;
      const vacationOutstanding = Math.max(0, Math.min(Math.round((vacationDue - vacationPaid) * 100) / 100, outstanding));
      const benefitDue = result.benefitAmount || 0;
      // Paid by the insurer directly (art. 17) unless the company pays it itself: then nothing is owed through payroll.
      const benefitOutstanding = benefitPayer === "employer" ? Math.max(0, Math.round((benefitDue - benefitPaid) * 100) / 100) : 0;
      return {
        employeeId: p.id,
        name: p.name,
        position: p.position,
        department: p.department,
        section: p.section || sectionFor.get(p.id) || "",
        status: p.status,
        salaryType: p.salary_type === "net" ? "net" : "gross",
        monthlySalary: pay?.gross || 0,
        weekHours: week.hours,
        iban: profile.iban,
        fin: profile.fin,
        bankName: profile.bankName,
        bankCode: profile.bankCode,
        accountNumber: profile.accountNumber,
        card: maskCard(profile.cardNumber),
        payMethod: profile.payMethod,
        ssn: profile.ssn,
        voen: profile.voen,
        startDate: p.start_date,
        sector: p.sector === "public" ? "public" : "private",
        benefit: profile.taxBenefit ? taxBenefit(profile.taxBenefit)?.short || taxBenefit(profile.taxBenefit)?.label || "" : "",
        taxReduction: reduction,
        annual: annualInfo,
        warnings: [...payWarnings({ gross: pay?.gross || 0, weekHours: week.hours, workedAll: result.workedDays + result.paidLeaveDays >= result.normDays && result.normDays > 0, hasIban: !!profile.iban || !!profile.cardNumber, cashPay: profile.payMethod === "cash", advanceExcess: result.advanceExcess, earned: result.gross, previousEarned: previousGross.get(p.id) }), ...(result.benefitCalendarDays > 0 && !inputsOf.benefitDoc ? ["Xəstəlik/analıq günləri var, e-bülleten nömrəsi yazılmayıb (əlavələr və tutulmalar pəncərəsində)."] : [])],
        inputs: inputsOf,
        branches: myLinks.map((l) => ({ branchId: l.branchId, name: branchName.get(l.branchId) || "", role: l.role, share: Math.round((branchShares.get(l.branchId) || 0) * 10000) / 10000 })),
        branchBonuses: branchBonus.map((x) => ({ branchId: x.branchId, label: x.label, amount: x.amount })),
        branchBonusTotal,
        hours: hoursAuto,
        hoursSource: chosen.source,
        nightPercent: Number(profile.nightPercent) || inputsOf.nightPercent || 0,
        hoursWaiting: chosen.waiting,
        recurring: recurring.filter((x) => x.employee_id === p.id).map((x) => ({ id: x.id, type: x.type, label: x.label, amount: x.amount_cents / 100 })),
        carries: carries.filter((x) => x.employee_id === p.id).map((x) => ({ label: x.label, amount: x.amount_cents / 100, from: x.from_month })),
        result,
        advances,
        salaryPaid,
        vacationDue,
        vacationPaid,
        vacationOutstanding,
        benefitDue,
        benefitPaid,
        benefitOutstanding,
        extraPaid,
        outstanding,
        availableAdvance: available.available,
        earnedToDate: available.earned,
        lastPaid,
        payments: mine.map((x) => ({ id: x.id, kind: x.kind, amount: x.amount_cents / 100, paidOn: x.paid_on, method: x.method, note: x.note, title: x.title, batchId: x.batch_id, reversed: !!x.reversed_at, reversedBy: x.reversed_by_name, reverseReason: x.reverse_reason })),
      };
    });
    const sum = (pick: (r: (typeof rows)[number]) => number) => Math.round(rows.reduce((t, r) => t + pick(r), 0) * 100) / 100;
    return {
      month: monthRaw,
      status: run?.status || "draft",
      approvedBy: run?.approved_by_name || "",
      approvedAt: run?.approved_at || "",
      settings: { advanceDay, payDay, dualThreshold: (settings?.dual_threshold || 0) / 100, benefitSick: sickPercent, benefitMaternity: maternityPercent, benefitMinPension: minPension, benefitPayer: benefitPayer, taxCheck: { year: monthRaw.slice(0, 4), confirmed: rateRows.find((r) => r.key === "tax_confirmed_year")?.value === monthRaw.slice(0, 4), by: rateRows.find((r) => r.key === "tax_confirmed_by")?.value || "", at: rateRows.find((r) => r.key === "tax_confirmed_at")?.value || "", params: [`Minimum aylıq əmək haqqı: ${MINIMUM_WAGE} AZN`, "Gəlir vergisi (qeyri-dövlət, qeyri-neft): 2500 AZN-dək 200 AZN-dən yuxarı hissənin 3%-i; 2500–8000: 75 + 10%; 8000-dən yuxarı: 625 + 14%", "Gəlir vergisi (dövlət və neft-qaz): 2500 AZN-dək 14%, yuxarısı 350 + 25%", "DSMF (özəl): işçi 200-dək 3%, yuxarısı 10%; işəgötürən 200-dək 22%, 200–8000 15%, yuxarısı 11%. Dövlət/neft-qaz: işçi 3%, işəgötürən 22%", "İcbari tibbi sığorta: hər tərəf 2500 AZN-dək 2%, yuxarısı 0,5%", "İşsizlik sığortası: işçi 0,5%, işəgötürən 0,5%"] }, problem: scheduleProblem(advanceDay, payDay) },
      schedule: { advanceDate, payDate },
      workingDays: working.length,
      rows,
      totals: {
        employees: rows.length,
        gross: sum((r) => r.result.gross),
        incomeTax: sum((r) => r.result.incomeTax),
        employeeInsurance: sum((r) => r.result.employeeSocial + r.result.employeeUnemployment + r.result.employeeMedical),
        net: sum((r) => r.result.net),
        advances: sum((r) => r.advances),
        toPay: sum((r) => r.result.toPay),
        outstanding: sum((r) => r.outstanding),
        employerContributions: sum((r) => r.result.employerSocial + r.result.employerUnemployment + r.result.employerMedical),
        employerCost: sum((r) => r.result.employerCost),
      },
    };
  };
  const payrollLocked = async (monthRaw: string) =>
    (await db.prepare("SELECT status FROM payroll_runs WHERE company_id=? AND month=?").bind(id, monthRaw).first<{ status: string }>())?.status === "approved";
  // A payment taken back: it stays in the history with the reason and counts for nothing. An advance of an approved month
  // is part of the frozen pay, so the month has to be reopened first.
  const reversePayments = async (list: { id: string; month: string; kind: string }[], reason: string) => {
    const me = await requesterName();
    const now = new Date().toISOString();
    for (const pay of list) {
      if (pay.kind === "advance" && (await payrollLocked(pay.month))) throw new HttpError(409, "Təsdiqlənmiş ayın avansı geri çəkilmir: əvvəlcə təsdiqi geri çəkin (direktor).");
    }
    for (let i = 0; i < list.length; i += 50)
      await db.batch(list.slice(i, i + 50).map((pay) => db.prepare("UPDATE payroll_payments SET reversed_at=?,reversed_by_name=?,reverse_reason=? WHERE id=? AND company_id=? AND reversed_at=''").bind(now, me, reason, pay.id, id)));
  };
  // ── Hours worked per day: kept by the company, they give the extra, rest-day and night hours of the payroll ──
  const hoursMonth = () => {
    const raw = str(requestUrl.searchParams.get("month"), 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw)) throw new HttpError(400, "Ayı düzgün seçin.");
    return raw;
  };
    {
    const r = await handle_company_07({ clockSettings, db, employeeRefs, hoursMonth, id, path, payrollLocked, request, requirePermission, userId });
    if (r) return r;
  }
  // An approved line of the leave plan is also an application for the order: HR makes the order from it, nobody types it again.
  const requestFromPlan = async (employeeId: string, start: string, end: string, days: number, by: string) => {
    const same = (await db.prepare("SELECT data FROM employee_requests WHERE company_id=? AND employee_id=? AND kind='vacation' AND status IN ('new','ordered')").bind(id, employeeId).all<{ data: string }>()).results.some((r) => { try { const d = JSON.parse(r.data) as { from?: string; to?: string }; return d.from === start && d.to === end; } catch { return false; } });
    const ordered = await db.prepare("SELECT 1 AS n FROM employee_orders WHERE company_id=? AND employee_id=? AND kind IN ('vacation','addleave') AND json_extract(input,'$.from')=? AND json_extract(input,'$.to')=?").bind(id, employeeId, start, end).first();
    if (same || ordered) return false;
    const now = new Date().toISOString();
    await db.prepare("INSERT INTO employee_requests(id,company_id,employee_id,kind,data,status,source,created_by,created_by_name,created,updated) VALUES(?,?,?,'vacation',?,'new','plan',?,?,?,?)").bind(crypto.randomUUID(), id, employeeId, JSON.stringify({ from: start, to: end, quantity: days, reason: "İllik məzuniyyət qrafikinə əsasən", basis: "" }), userId, by, now, now).run();
    return true;
  };
  const leaveYear = () => (/^\d{4}$/.test(str(requestUrl.searchParams.get("year"), 4)) ? Number(str(requestUrl.searchParams.get("year"), 4)) : new Date().getUTCFullYear());
  const leavePeople = async () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const people = (await db.prepare("SELECT id,name,position,department,start_date,vacation_days,vacation_used FROM company_employees WHERE company_id=? AND status IN ('active','leave') ORDER BY department,name").bind(id).all<{ id: string; name: string; position: string; department: string; start_date: string; vacation_days: number; vacation_used: number }>()).results;
    const annual = new Map((await db.prepare("SELECT employee_id,COUNT(*) AS n FROM attendance_marks WHERE company_id=? AND code='annual' GROUP BY employee_id").bind(id).all<{ employee_id: string; n: number }>().catch(() => ({ results: [] as { employee_id: string; n: number }[] }))).results.map((r) => [r.employee_id, Number(r.n)]));
    return people.map((p) => ({ ...p, balance: vacationBalance({ start: p.start_date, end: "", entitlement: p.vacation_days ?? 21, used: (p.vacation_used ?? 0) + (annual.get(p.id) || 0) }, todayIso) }));
  };
  const leaveView = (r: LeaveRow, names: Map<string, string>) => ({ id: r.id, employeeId: r.employee_id, name: names.get(r.employee_id) || "", start: r.start_date, end: r.end_date, days: r.days, status: r.status, statusText: LEAVE_STATUS[r.status] || r.status, proposedBy: r.proposed_by, note: r.note, decidedBy: r.decided_by_name, decidedAt: r.decided_at });
  const leaveEntries = async (year: number) =>
    (await db.prepare("SELECT id,employee_id,year,start_date,end_date,days,status,proposed_by,note,decided_by_name,decided_at FROM leave_schedule WHERE company_id=? AND year=? ORDER BY start_date").bind(id, year).all<LeaveRow>()).results;
  const toEntry = (r: LeaveRow): ScheduleEntry => ({ id: r.id, employeeId: r.employee_id, start: r.start_date, end: r.end_date, days: r.days, status: r.status });
    {
    const r = await handle_company_08({ db, employeeRefs, id, leaveEntries, leavePeople, leaveView, leaveYear, path, request, requestFromPlan, requestUrl, requesterName, requirePermission, tellEmployee, toEntry, userId });
    if (r) return r;
  }
  const parseJson = <T,>(text: string, fallback: T): T => {
    try {
      return JSON.parse(text) as T;
    } catch {
      return fallback;
    }
  };
    {
    const r = await handle_company_09({ db, id, parseJson, path, request, requesterName, requirePermission, userId });
    if (r) return r;
  }
    {
    const r = await handle_company_10({ db, id, path, request, requestUrl, requirePermission, tellEmployee, userId });
    if (r) return r;
  }

  // ── Performance: cycles, goals, the employee's own view and the manager's score ──
  const dateOk = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
    {
    const r = await handle_company_11({ dateOk, db, employeeRefs, id, path, request, requestUrl, requesterName, requirePermission, skillMatrix, tellEmployee, userId });
    if (r) return r;
  }
  // The skills of the matrix come only from the platform catalog the admin panel keeps (built-in and admin-added skills).
  const catalogSkills = async (): Promise<CatalogSkill[]> => (await readCustomSkills(db)).map((c) => ({ id: c.id, label: c.label, category: c.category, aliases: [c.label, c.labelEn, ...c.aliases].filter(Boolean) }));
  // Skills of the matrix: the platform catalog first, then the ESCO table and the O*NET names that the skill picker uses.
  const resolveAnySkill = async (input: string, custom: CatalogSkill[]): Promise<CatalogSkill | null> => {
    const curated = resolveCatalogSkill(input, custom);
    if (curated) return curated;
    const key = normalizeSkillKey(str(input, 120));
    if (key.length < 2) return null;
    const row = await db
      .prepare("SELECT uri,label_en,normalized_label,alternative_labels,description_en,skill_type,reuse_level FROM esco_skills WHERE normalized_label=? OR (' | ' || normalized_alternatives || ' | ') LIKE ? LIMIT 1")
      .bind(key, `% | ${key} | %`)
      .first<EscoSkillRow>()
      .catch(() => null);
    if (row) {
      const d = escoSkillDefinition(row);
      return { id: d.id, label: d.label, category: "ESCO", aliases: [] };
    }
    const world = searchWorldSkills(key, 3).find((w) => normalizeSkillKey(w.label) === key);
    return world ? { id: world.id, label: world.label, category: "O*NET", aliases: [] } : null;
  };
  const SKILL_LIMIT = 100;
  const ensureSkillDef = async (skill: CatalogSkill): Promise<string> => {
    const existing = await db.prepare("SELECT id FROM skill_defs WHERE company_id=? AND (catalog_id=? OR name=?)").bind(id, skill.id, skill.label).first<{ id: string }>();
    if (existing) return existing.id;
    const count = Number((await db.prepare("SELECT COUNT(*) AS n FROM skill_defs WHERE company_id=?").bind(id).first<{ n: number }>())?.n || 0);
    if (count >= SKILL_LIMIT) throw new HttpError(409, `Matrisdə ən çox ${SKILL_LIMIT} bacarıq saxlamaq olar.`);
    const defId = crypto.randomUUID();
    await db.prepare("INSERT INTO skill_defs(id,company_id,name,created,catalog_id) VALUES(?,?,?,?,?)").bind(defId, id, skill.label, new Date().toISOString(), skill.id).run();
    return defId;
  };
    {
    const r = await handle_company_12({ PROFILE_CHANGE_FIELDS, addToBonus, askFeedback, catalogSkills, changeValue, clockSettings, dataKey, db, employeeRefs, ensureSkillDef, feedbackSummary, id, maskedValue, memberGrants, memberRole, oneOnOneRows, path, payrollMonthLocked, request, requestUrl, requesterName, requirePermission, resolveAnySkill, reveal, salaryChange, saveOneOnOne, setSkillLevel, swapList, tellEmployee, userId });
    if (r) return r;
  }

  // ── Training plan and budget ──
  const trainingYear = () => (/^\d{4}$/.test(str(requestUrl.searchParams.get("year"), 4)) ? str(requestUrl.searchParams.get("year"), 4) : String(new Date().getUTCFullYear()));
    {
    const r = await handle_company_13({ catalogSkills, dateOk, db, employeeRefs, ensureSkillDef, id, path, request, requirePermission, resolveAnySkill, setSkillLevel, tellPayroll, trainingYear, userId });
    if (r) return r;
  }

  // ── Shifts ──
  const addDay = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
  // The usual shifts exist from the start: a company that has none gets the four common ones (it can change or add).
  const STANDARD_SHIFTS: [string, string, string][] = [["Səhər", "08:00", "16:00"], ["Gündüz", "09:00", "18:00"], ["Axşam", "16:00", "00:00"], ["Gecə", "22:00", "06:00"]];
  const ensureShiftTypes = async () => {
    const have = Number((await db.prepare("SELECT COUNT(*) AS n FROM shift_types WHERE company_id=?").bind(id).first<{ n: number }>())?.n || 0);
    if (have > 0) return;
    const now = new Date().toISOString();
    await db.batch(STANDARD_SHIFTS.map(([name, start, end]) => db.prepare("INSERT INTO shift_types(id,company_id,name,start_time,end_time,created) VALUES(?,?,?,?,?,?)").bind(crypto.randomUUID(), id, name, start, end, now)));
  };
  // The limits the schedule is checked against: settings of the company (the rest between shifts is an internal rule).
  const shiftRules = async () => {
    const rows = (await db.prepare("SELECT key,value FROM hr_settings WHERE company_id=? AND (key IN ('shift_min_rest_hours','shift_max_consecutive') OR key LIKE 'shift_min_cover:%')").bind(id).all<{ key: string; value: string }>()).results;
    const get = (k: string, d: number) => { const n = Number(rows.find((r) => r.key === k)?.value); return Number.isFinite(n) && rows.some((r) => r.key === k) ? n : d; };
    const cover: Record<string, number> = {};
    for (const r of rows) if (r.key.startsWith("shift_min_cover:") && Number(r.value) > 0) cover[r.key.slice("shift_min_cover:".length)] = Number(r.value);
    return { minRestHours: get("shift_min_rest_hours", 11), maxConsecutive: get("shift_max_consecutive", 6), cover };
  };
  const shiftWarnings = async (from: string, to: string, onlyEmployees?: string[]) => {
    const rules = await shiftRules();
    const [rows, types, people, marks] = await Promise.all([
      db.prepare("SELECT employee_id,day,shift_id FROM shift_assignments WHERE company_id=? AND day BETWEEN ? AND ?").bind(id, addDay(from, -8), addDay(to, 8)).all<{ employee_id: string; day: string; shift_id: string }>(),
      db.prepare("SELECT id,start_time,end_time FROM shift_types WHERE company_id=?").bind(id).all<{ id: string; start_time: string; end_time: string }>(),
      db.prepare("SELECT id,name FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; name: string }>(),
      db.prepare(`SELECT employee_id,day,code FROM attendance_marks WHERE company_id=? AND day BETWEEN ? AND ? AND code IN (${Object.keys(SHIFT_AWAY_LABEL).map(() => "?").join(",")})`).bind(id, from, to, ...Object.keys(SHIFT_AWAY_LABEL)).all<{ employee_id: string; day: string; code: string }>(),
    ]);
    const type = new Map(types.results.map((t) => [t.id, { start: t.start_time, end: t.end_time }]));
    const assignments = new Map<string, Map<string, { start: string; end: string }>>();
    for (const r of rows.results) {
      if (onlyEmployees && !onlyEmployees.includes(r.employee_id)) continue;
      const t = type.get(r.shift_id);
      if (t) assignments.set(r.employee_id, (assignments.get(r.employee_id) || new Map()).set(r.day, t));
    }
    const away = new Map<string, Map<string, string>>();
    for (const m of marks.results) away.set(m.employee_id, (away.get(m.employee_id) || new Map()).set(m.day, m.code));
    const base = checkShifts({ assignments, away, names: new Map(people.results.map((p) => [p.id, p.name])), minRestHours: rules.minRestHours, maxConsecutive: rules.maxConsecutive });
    // Enough people on every planned day (only for departments with a minimum).
    let cover: ShiftWarning[] = [];
    if (Object.keys(rules.cover).length && !onlyEmployees) {
      const staff = (await db.prepare("SELECT id,department FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; department: string }>()).results;
      const days: string[] = [];
      for (let d = from; d <= to; d = addDay(d, 1)) days.push(d);
      const assignedDays = new Map<string, Set<string>>();
      for (const [emp, byDay] of assignments) assignedDays.set(emp, new Set(byDay.keys()));
      cover = checkCoverage({ days, staff, assigned: assignedDays, away, minByDepartment: new Map(Object.entries(rules.cover)) });
    }
    return [...base, ...cover].filter((w) => w.day >= from && w.day <= to);
  };
    {
    const r = await handle_company_14({ addDay, applySwap, dateOk, db, employeeRefs, ensureShiftTypes, id, memberRole, patchProfile, path, request, requestUrl, requesterName, requirePermission, revealAll, shiftRules, shiftWarnings, swapList, userId });
    if (r) return r;
  }
    {
    const r = await handle_company_15({ db, id, path, request, requirePermission, tripView });
    if (r) return r;
  }
  // An approved trip becomes an order (the signers of the employee's section and the director) and marks the days "on a trip".
  const createTripOrder = async (tripId: string) => {
    const trip = await db.prepare("SELECT id,employee_id,destination,purpose,start_date,end_date,order_id FROM trips WHERE id=? AND company_id=?").bind(tripId, id).first<{ id: string; employee_id: string; destination: string; purpose: string; start_date: string; end_date: string; order_id: string }>();
    if (!trip || trip.order_id) return "";
    const employee = await db.prepare("SELECT id,name,department,section,position FROM company_employees WHERE id=? AND company_id=?").bind(trip.employee_id, id).first<{ id: string; name: string; department: string; section: string; position: string }>();
    if (!employee) return "";
    const people = (await db.prepare("SELECT id,name,position,department,section,status FROM company_employees WHERE company_id=? AND status IN ('active','leave')").bind(id).all<{ id: string; name: string; position: string; department: string; section: string; status: string }>()).results;
    const profile = await db.prepare("SELECT data FROM company_profiles WHERE company_id=?").bind(id).first<{ data: string }>();
    const companyDetails = companyDetailsInput(profile ? JSON.parse(profile.data) : {});
    const picked = pickSigners(employee, people, companyDetails.director);
    const signers: FlowSigner[] = [picked.head, picked.director].filter((x): x is NonNullable<typeof x> => !!x && !!x.name).map((x) => ({ role: x.role, title: x.title, name: x.name }));
    const now = new Date().toISOString();
    const flow = startFlow(signers, "Sistem (ezamiyyət təsdiqi)", now);
    const orderId = crypto.randomUUID();
    await db.prepare("INSERT INTO employee_orders(id,company_id,employee_id,kind,number,order_date,input,signers,status,holder,history,created_by,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(orderId, id, employee.id, "trip", "", now.slice(0, 10), JSON.stringify({ kind: "trip", number: "", date: now.slice(0, 10), city: "Bakı", company: { name: companyDetails.legalName || (await db.prepare("SELECT name FROM accounts WHERE id=?").bind(id).first<{ name: string }>())?.name || "", voen: companyDetails.voen, director: companyDetails.director, directorTitle: "Direktor" }, employee: { name: employee.name, position: employee.position, department: employee.department, section: employee.section }, from: trip.start_date, to: trip.end_date, place: trip.destination, basis: `ezamiyyət sorğusu${trip.purpose ? `: ${trip.purpose}` : ""}` }).slice(0, 8000), JSON.stringify(flow.signers), flow.status, flow.holder, JSON.stringify(flow.history), userId, now, now).run();
    await db.prepare("UPDATE trips SET order_id=? WHERE id=?").bind(orderId, trip.id).run();
    // No signer is needed (a small company): the order stands at once and the days are marked.
    if (flow.status === "signed") await markAttendance(employee.id, trip.start_date, trip.end_date, "trip", "Ezamiyyət əmri");
    await tellCompany(id, `Ezamiyyət əmri hazırlandı: ${employee.name}`, `${trip.destination}, ${trip.start_date} – ${trip.end_date}. Əmrlər reyestrində nömrə verib imzalamağa göndərin.`, "hr-orders");
    return orderId;
  };
  // The per-diem of a trip when nobody types one: the official norm of the decision No. 14 for the destination; a foreign norm
  // is in foreign currency and needs the rate the company set; with no match the general norm of the company is used.
  const FX: NormCurrency[] = ["USD", "EUR", "GBP", "JPY"];
  // The rate of 1 unit of each currency in AZN: the official rate of the Central Bank for the trip day (today when no day
  // is given), fetched live; the rate the company typed is only the fallback for when the bank site cannot be reached.
  const tripRates = async (day = ""): Promise<Partial<Record<NormCurrency, number>>> => {
    const official = perUnitRates(await fetchCbarRates(/^\d{4}-\d{2}-\d{2}$/.test(day) ? day : new Date().toISOString().slice(0, 10)).catch(() => null), FX);
    const rows = (await db.prepare("SELECT key,value FROM hr_settings WHERE company_id=? AND key LIKE 'trip_fx_%'").bind(id).all<{ key: string; value: string }>()).results;
    const out: Partial<Record<NormCurrency, number>> = {};
    for (const c of FX) {
      const typed = Number(rows.find((r) => r.key === `trip_fx_${c}`)?.value);
      const v = official[c] || (typed > 0 ? typed : 0);
      if (v > 0) out[c] = v;
    }
    return out;
  };
  const defaultDaily = async (destination: string, abroad: boolean, day = ""): Promise<{ amount: number; source: string }> => {
    const found = lookupNorm(destination, abroad);
    if (found) {
      const azn = azNPerDay(found, await tripRates(day));
      if (azn !== null) return { amount: azn, source: found.kind === "domestic" ? `rəsmi norma: ${found.label}` : `rəsmi norma: ${found.label} (${found.amount} ${found.currency})` };
    }
    const own = await db.prepare("SELECT value FROM hr_settings WHERE company_id=? AND key=?").bind(id, abroad ? "trip_daily_abroad" : "trip_daily_domestic").first<{ value: string }>();
    return { amount: Number(own?.value) > 0 ? Number(own!.value) : 0, source: "şirkətin ümumi normu" };
  };
  // The official rates of the Central Bank for a day (today by default): the button on the norms window and the check of the page.
    {
    const r = await handle_company_16({ FX, createTripOrder, dateOk, db, defaultDaily, employeeRefs, id, parseJson, path, request, requestUrl, requesterName, requirePermission, tellEmployee, tellPayroll, tripRates, userId });
    if (r) return r;
  }
  const referralBonus = async () => Number((await db.prepare("SELECT value FROM hr_settings WHERE company_id=? AND key='referral_bonus'").bind(id).first<{ value: string }>())?.value || 0) / 100;
    {
    const r = await handle_company_17({ db, id, parseJson, path, referralBonus, request, requesterName, requirePermission, tellEmployee, userId });
    if (r) return r;
  }

  // ── HR and pay-fund report: headcount, plan, budget against the actual fund, vacation liability and turnover per department ──
  const hrFundReport = async () => {
    const year = (/^\d{4}$/.test(str(requestUrl.searchParams.get("year"), 4)) ? str(requestUrl.searchParams.get("year"), 4) : new Date().toISOString().slice(0, 4));
    const todayIso = new Date().toISOString().slice(0, 10);
    const money = (v: number) => Math.round(v * 100) / 100;
    const [people, plan, runs] = await Promise.all([
      db
        .prepare("SELECT id,name,position,department,section,start_date,end_date,status,exit_type,salary_cents,salary_type,sector,vacation_days,vacation_used,profile FROM company_employees WHERE company_id=? AND status<>'removed'")
        .bind(id)
        .all<{ id: string; name: string; position: string; department: string; section: string; start_date: string; end_date: string; status: string; exit_type: string; salary_cents: number; salary_type: string; sector: string; vacation_days: number; vacation_used: number; profile: string }>(),
      loadPlanData(db, id),
      db.prepare("SELECT month,snapshot FROM payroll_runs WHERE company_id=? AND status='approved' AND month LIKE ?").bind(id, `${year}-%`).all<{ month: string; snapshot: string }>(),
    ]);
    const annual = await db
      .prepare("SELECT employee_id,COUNT(*) AS n FROM attendance_marks WHERE company_id=? AND code='annual' GROUP BY employee_id")
      .bind(id)
      .all<{ employee_id: string; n: number }>()
      .catch(() => ({ results: [] as { employee_id: string; n: number }[] }));
    const annualBy = new Map(annual.results.map((r) => [r.employee_id, Number(r.n)]));
    const key = (v: string) => (v || "").trim().toLocaleLowerCase("az");
    type Dep = { department: string; headcount: number; planned: number; fte: number; budget: number; fund: number; vacationDays: number; vacationLiability: number; hires: number; exits: number; actualGross: number; actualNet: number; actualTax: number; actualInsurance: number; actualEmployerCost: number; months: number; leavers: Record<string, number> };
    const deps = new Map<string, Dep>();
    const dep = (name: string) => {
      const k = key(name) || "—";
      if (!deps.has(k)) deps.set(k, { department: name || "Departamentsiz", headcount: 0, planned: 0, fte: 0, budget: 0, fund: 0, vacationDays: 0, vacationLiability: 0, hires: 0, exits: 0, actualGross: 0, actualNet: 0, actualTax: 0, actualInsurance: 0, actualEmployerCost: 0, months: 0, leavers: {} });
      return deps.get(k)!;
    };
    const summary = summarize(plan.units, plan.people);
    for (const r of summary.rows) {
      const d = dep(r.department);
      d.planned += r.planned;
      d.fte += r.fte;
      d.budget += r.budget;
    }
    const deptOf = new Map<string, string>();
    for (const p of people.results) {
      const d = dep(p.department);
      deptOf.set(p.id, p.department);
      const profile = parseProfile(p.profile);
      if (p.status !== "left") {
        d.headcount += 1;
        const gross = p.salary_cents > 0 ? employeePay(p.salary_cents / 100, p.salary_type === "net" ? "net" : "gross", p.sector === "public" ? "public" : "private", taxReduction(profile, todayIso))?.gross || 0 : 0;
        d.fund += gross;
        const balance = vacationBalance({ start: p.start_date, end: "", entitlement: p.vacation_days ?? 21, used: (p.vacation_used ?? 0) + (annualBy.get(p.id) || 0) }, todayIso);
        d.vacationDays += balance.remaining;
        // A day of unused leave is worth the average daily pay (the salary over 30,4 days, art. 140).
        d.vacationLiability += Math.max(0, balance.remaining) * (gross / 30.4);
      }
      if (p.start_date.startsWith(year)) d.hires += 1;
      if (p.status === "left" && (p.end_date || "").startsWith(year)) {
        d.exits += 1;
        const type = exitTypeLabel(p.exit_type) || "Qeyd edilməyib";
        d.leavers[type] = (d.leavers[type] || 0) + 1;
      }
    }
    // What was really paid in the approved months of the year, by the employee's department.
    const months: { month: string; gross: number; net: number; employerCost: number }[] = [];
    const monthly = new Map<string, number>();
    for (const run of runs.results.sort((a, b) => a.month.localeCompare(b.month))) {
      let gross = 0;
      let net = 0;
      let cost = 0;
      try {
        for (const r of (JSON.parse(run.snapshot) as { rows?: { employeeId: string; result: ReturnType<typeof computePay> }[] }).rows || []) {
          const d = dep(deptOf.get(r.employeeId) || "");
          d.actualGross += r.result.gross;
          monthly.set(`${run.month}|${d.department}`, (monthly.get(`${run.month}|${d.department}`) || 0) + r.result.gross);
          d.actualNet += r.result.net;
          d.actualTax += r.result.incomeTax;
          d.actualInsurance += r.result.employeeSocial + r.result.employeeUnemployment + r.result.employeeMedical;
          d.actualEmployerCost += r.result.employerCost;
          gross += r.result.gross;
          net += r.result.net;
          cost += r.result.employerCost;
        }
      } catch (error) {
        // A broken snapshot adds nothing for that month.
        quiet("route-catch", error);
      }
      months.push({ month: run.month, gross: money(gross), net: money(net), employerCost: money(cost) });
    }
    const monthCount = months.length;
    const list = [...deps.values()]
      .filter((d) => d.headcount || d.planned || d.hires || d.exits || d.actualGross)
      .map((d) => {
        const avg = d.headcount + d.exits ? (d.headcount + (d.headcount + d.exits - d.hires)) / 2 : 0;
        return {
          department: d.department, headcount: d.headcount, planned: d.planned, free: Math.max(0, d.planned - d.headcount), over: Math.max(0, d.headcount - d.planned), fte: money(d.fte),
          monthlyBudget: money(d.budget), monthlyFund: money(d.fund), monthlyVariance: money(d.budget - d.fund), avgSalary: d.headcount ? money(d.fund / d.headcount) : 0,
          vacationDays: money(d.vacationDays), vacationLiability: money(d.vacationLiability),
          hires: d.hires, exits: d.exits, turnover: avg > 0 ? money((d.exits / avg) * 100) : 0, leavers: d.leavers,
          actualGross: money(d.actualGross), actualNet: money(d.actualNet), actualTax: money(d.actualTax), actualInsurance: money(d.actualInsurance), actualEmployerCost: money(d.actualEmployerCost),
          budgetForPeriod: money(d.budget * monthCount), periodVariance: money(d.budget * monthCount - d.actualGross),
        };
      })
      .sort((a, b) => b.monthlyFund - a.monthlyFund);
    const sum = (pick: (d: (typeof list)[number]) => number) => money(list.reduce((t, d) => t + pick(d), 0));
    return {
      year, approvedMonths: monthCount, months, monthly: [...monthly].map(([k, v]) => ({ month: k.split("|")[0], department: k.slice(k.indexOf("|") + 1), gross: money(v) })), departments: list,
      totals: {
        headcount: sum((d) => d.headcount), planned: sum((d) => d.planned), free: sum((d) => d.free), monthlyBudget: sum((d) => d.monthlyBudget), monthlyFund: sum((d) => d.monthlyFund), monthlyVariance: sum((d) => d.monthlyVariance),
        vacationDays: sum((d) => d.vacationDays), vacationLiability: sum((d) => d.vacationLiability), hires: sum((d) => d.hires), exits: sum((d) => d.exits),
        turnover: (() => { const avg = list.reduce((t, d) => t + d.headcount, 0) + list.reduce((t, d) => t + d.exits, 0) - list.reduce((t, d) => t + d.hires, 0); const mean = (list.reduce((t, d) => t + d.headcount, 0) + Math.max(0, avg)) / 2; return mean > 0 ? money((list.reduce((t, d) => t + d.exits, 0) / mean) * 100) : 0; })(),
        actualGross: sum((d) => d.actualGross), actualNet: sum((d) => d.actualNet), actualEmployerCost: sum((d) => d.actualEmployerCost), budgetForPeriod: sum((d) => d.budgetForPeriod), periodVariance: sum((d) => d.periodVariance),
      },
    };
  };
  // The yearly budget of the company: pay, hiring and training, per month and per department, against the actual.
  // Pay and training facts come from the platform itself; the hiring cost is typed (nothing else knows it).
  const BUDGET_CATEGORIES = ["payroll", "training", ...EXPENSE_CATEGORY_IDS];
  // The plan of a year (headcount per month and the budget) is one thing with one status: draft → pending → approved.
  // While it waits for approval or is approved it cannot be changed; the director opens it again.
  const yearPlanState = async (year: string) => {
    const row = await db.prepare("SELECT status,updated_by,updated FROM plan_year_state WHERE company_id=? AND year=?").bind(id, year).first<{ status: string; updated_by: string; updated: string }>().catch(() => null);
    return { year, status: (row?.status || "draft") as "draft" | "pending" | "approved", by: row?.updated_by || "", at: row?.updated || "" };
  };
  const setYearPlan = async (year: string, status: "draft" | "pending" | "approved", by: string) => {
    await db.prepare("INSERT INTO plan_year_state(company_id,year,status,updated_by,updated) VALUES(?,?,?,?,?) ON CONFLICT(company_id,year) DO UPDATE SET status=excluded.status,updated_by=excluded.updated_by,updated=excluded.updated").bind(id, year, status, by, new Date().toISOString()).run();
    // The first approval of a year keeps the BASELINE (what was planned); every approval refreshes the revised plan next to it.
    if (status === "approved") {
      const units = await db.prepare("SELECT branch,department,section,position,planned,rate,salary_cents,salary_max_cents,start_month,end_month FROM staff_units WHERE company_id=?").bind(id).all<{ planned: number }>();
      const data = JSON.stringify({ planned: units.results.reduce((sum, u) => sum + Number(u.planned || 0), 0), units: units.results });
      const at = new Date().toISOString();
      await db.prepare("INSERT OR IGNORE INTO plan_snapshots(company_id,year,kind,data,created) VALUES(?,?,'baseline',?,?)").bind(id, year, data, at).run().catch(() => {});
      await db.prepare("INSERT INTO plan_snapshots(company_id,year,kind,data,created) VALUES(?,?,'revised',?,?) ON CONFLICT(company_id,year,kind) DO UPDATE SET data=excluded.data,created=excluded.created").bind(id, year, data, at).run().catch(() => {});
    }
  };
  const assertYearOpen = async (year: string) => {
    const st = await yearPlanState(year);
    if (st.status === "approved") throw new HttpError(409, `${year} planı təsdiqlənib. Dəyişmək üçün direktor əvvəl «Redaktə üçün aç» düyməsini basmalıdır.`);
    if (st.status === "pending") throw new HttpError(409, `${year} planı təsdiqə göndərilib. Təsdiq gözlənilir.`);
  };
    {
    const r = await handle_company_18({ BUDGET_CATEGORIES, assertYearOpen, canAct, db, hrFundReport, id, path, queueApproval, request, requestUrl, requirePermission, setYearPlan, userId, yearPlanState });
    if (r) return r;
  }
  const expenseRow = (r: ExpenseDbRow) => ({
    id: r.id, category: r.category, title: r.title, department: r.department, employeeId: r.employee_id, amount: r.amount, date: r.expense_date, payee: r.payee, note: r.note,
    status: r.status, paidOn: r.paid_on, method: r.pay_method, payFrom: r.pay_from, payRef: r.pay_ref, approvedBy: r.approved_by, createdBy: r.created_by,
    orderNo: r.order_no, orderedAt: r.ordered_at, externalId: r.external_id, source: r.source,
  });
  const categoryLabel = (c: string) => EXPENSE_CATEGORIES.find((x) => x.id === c)?.label || c;
  // What the year's budget of a kind holds: planned, approved and paid expenses (cancelled ones free the money).
  const heldBudget = async (category: string, year: string, exceptId: string) => {
    const [budget, held] = await Promise.all([
      db.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM budget_lines WHERE company_id=? AND month LIKE ? AND category=? AND kind='budget'").bind(id, `${year}-%`, category).first<{ s: number }>(),
      db.prepare("SELECT COALESCE(SUM(amount),0) AS s FROM hr_expenses WHERE company_id=? AND expense_date LIKE ? AND category=? AND status<>'cancelled' AND id<>?").bind(id, `${year}-%`, category, exceptId).first<{ s: number }>(),
    ]);
    return { budget: Number(budget?.s) || 0, held: Number(held?.s) || 0 };
  };
    {
    const r = await handle_company_19({ canAct, categoryLabel, db, expenseRow, heldBudget, id, path, request, requestUrl, requirePermission, userId });
    if (r) return r;
  }
  // ---- Branches: where each employee works, the sales limit and bonus rule of each branch ----
  const monthOf = (value: string | null) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || "")) ? String(value) : new Date().toISOString().slice(0, 7));
  const monthApproved = async (month: string) => (await db.prepare("SELECT status FROM payroll_runs WHERE company_id=? AND month=?").bind(id, month).first<{ status: string }>().catch(() => null))?.status === "approved";
    {
    const r = await handle_company_20({ auditView, branchContext, canAct, db, employeeRefs, expenseRow, heldBudget, hrFundReport, id, monthApproved, monthOf, path, payrollMonth, payrollRows, planLocked, queueApproval, request, requestUrl, requirePermission, revealAll, userId, yearPlanState });
    if (r) return r;
  }
  // ── Settlement report: per employee what was accrued, what was paid and for what, and who owes whom ──
  const reportMonths = () => {
    const todayMonth = new Date().toISOString().slice(0, 7);
    const valid = (v: string | null) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(v || "") ? (v as string) : "");
    let to = valid(requestUrl.searchParams.get("to")) || todayMonth;
    let from = valid(requestUrl.searchParams.get("from")) || `${to.slice(0, 4)}-01`;
    if (from > to) [from, to] = [to, from];
    const list: string[] = [];
    for (let cursor = from; cursor <= to && list.length < 13; ) {
      list.push(cursor);
      const d = new Date(Date.UTC(Number(cursor.slice(0, 4)), Number(cursor.slice(5, 7)), 1));
      cursor = d.toISOString().slice(0, 7);
    }
    if (list.length > 12) throw new HttpError(400, "Hesabat ən çox 12 ay üçün hazırlanır.");
    return { from, to, list };
  };
  const METHOD_LABEL: Record<string, string> = { bank: "bank", card: "kart", cash: "nağd", other: "digər" };
  const PAY_LABEL: Record<string, string> = { advance: "Avans", salary: "Əmək haqqı", vacation: "Məzuniyyət haqqı", benefit: "Sosial sığorta müavinəti", extra: "Digər ödəniş" };
  const settlementReport = async () => {
    const { from, to, list } = reportMonths();
    const approvedOnly = requestUrl.searchParams.get("approvedOnly") === "1";
    const money = (v: number) => Math.round(v * 100) / 100;
    type MonthRow = {
      month: string; status: string; normDays: number; workedDays: number; paidLeaveDays: number; benefitDays: number; unpaidDays: number;
      gross: number; incomeTax: number; employeeSocial: number; employeeUnemployment: number; employeeMedical: number; employerSocial: number; employerUnemployment: number; employerMedical: number; employerCost: number;
      net: number; deductions: number; deductionsAsked: number; due: number; lines: Record<string, number>;
      advance: number; salary: number; vacation: number; benefit: number; extra: number; outstanding: number; benefitDue: number; benefitOutstanding: number; employeeOwes: number; lastPaid: string; reversed: number;
    };
    type Acc = {
      employeeId: string; name: string; position: string; department: string; section: string; fin: string; iban: string; startDate: string;
      gross: number; tax: number; insurance: number; net: number; deductions: number; deductionsAsked: number; due: number; dueApproved: number; vacation: number; benefitDue: number;
      employerCost: number; lines: Record<string, number>;
      paid: Record<string, number>; companyOwes: number; pendingOwes: number; benefitOwes: number; employeeOwes: number;
      months: MonthRow[];
      payments: { month: string; paidOn: string; kind: string; label: string; title: string; amount: number; method: string; note: string; batchId: string; reversed: boolean; reverseReason: string; reversedBy: string }[];
      ops: LedgerOp[];
    };
    const by = new Map<string, Acc>();
    const status: { month: string; status: string }[] = [];
    // The months are worked out side by side; the report waits for all of them.
    const shared: PayrollShared = {};
    // The 12 months before the first one also feed the vacation pay average, so they are read once, ahead of the months.
    const firstPrior = new Date(Date.UTC(Number(list[0].slice(0, 4)), Number(list[0].slice(5, 7)) - 13, 1)).toISOString().slice(0, 7);
    void approvedGross(shared, firstPrior, `${list[list.length - 1]}-32`);
    const sheets = await Promise.all(list.map((m) => payrollRows(m, shared)));
    for (const [monthIndex, m] of list.entries()) {
      const sheet = sheets[monthIndex];
      if (approvedOnly && sheet.status !== "approved") continue;
      const isApproved = sheet.status === "approved";
      status.push({ month: m, status: sheet.status });
      for (const r of sheet.rows) {
        const x = r.result;
        const a: Acc = by.get(r.employeeId) || { employeeId: r.employeeId, name: r.name, position: r.position, department: r.department, section: r.section, fin: r.fin, iban: r.iban, startDate: r.startDate, gross: 0, tax: 0, insurance: 0, net: 0, deductions: 0, deductionsAsked: 0, due: 0, dueApproved: 0, vacation: 0, benefitDue: 0, employerCost: 0, lines: {}, paid: { advance: 0, salary: 0, vacation: 0, benefit: 0, extra: 0 }, companyOwes: 0, pendingOwes: 0, benefitOwes: 0, employeeOwes: 0, months: [], payments: [], ops: [] };
        const applied = x.otherDeductions.reduce((t, d) => t + d.applied, 0);
        const asked = x.otherDeductions.reduce((t, d) => t + d.amount, 0);
        const live = r.payments.filter((p) => !p.reversed);
        const sum = (k: string) => live.filter((p) => p.kind === k).reduce((t, p) => t + p.amount, 0);
        const lines: Record<string, number> = {};
        for (const l of x.lines) {
          lines[l.id] = money((lines[l.id] || 0) + l.amount);
          a.lines[l.id] = money((a.lines[l.id] || 0) + l.amount);
        }
        a.gross += x.gross;
        a.tax += x.incomeTax;
        a.insurance += x.employeeSocial + x.employeeUnemployment + x.employeeMedical;
        a.net += x.net;
        a.deductions += applied;
        a.deductionsAsked += asked;
        a.due += x.net - applied;
        if (isApproved) a.dueApproved += x.net - applied;
        a.vacation += lines.vacation || 0;
        a.benefitDue += r.benefitDue;
        a.employerCost += x.employerCost;
        for (const k of Object.keys(a.paid)) a.paid[k] += sum(k);
        // Only approved months are a debt of the company; the others are what is expected once they are approved.
        if (isApproved) {
          a.companyOwes += r.outstanding;
          a.benefitOwes += r.benefitOutstanding;
        } else a.pendingOwes += r.outstanding;
        a.employeeOwes += x.advanceExcess;
        a.months.push({
          month: m, status: sheet.status, normDays: x.normDays, workedDays: x.workedDays, paidLeaveDays: x.paidLeaveDays, benefitDays: x.benefitDays, unpaidDays: x.unpaidDays,
          gross: x.gross, incomeTax: x.incomeTax, employeeSocial: x.employeeSocial, employeeUnemployment: x.employeeUnemployment, employeeMedical: x.employeeMedical,
          employerSocial: x.employerSocial, employerUnemployment: x.employerUnemployment, employerMedical: x.employerMedical, employerCost: x.employerCost,
          net: x.net, deductions: money(applied), deductionsAsked: money(asked), due: money(x.net - applied), lines,
          advance: sum("advance"), salary: sum("salary"), vacation: sum("vacation"), benefit: sum("benefit"), extra: sum("extra"),
          outstanding: r.outstanding, benefitDue: r.benefitDue, benefitOutstanding: r.benefitOutstanding, employeeOwes: x.advanceExcess, lastPaid: r.lastPaid, reversed: r.payments.filter((p) => p.reversed).length,
        });
        for (const p of r.payments) a.payments.push({ month: m, paidOn: p.paidOn, kind: p.kind, label: PAY_LABEL[p.kind] || p.kind, title: p.title, amount: p.amount, method: p.method, note: p.note, batchId: p.batchId, reversed: p.reversed, reverseReason: p.reverseReason, reversedBy: p.reversedBy });
        // The account of the month: what was earned, what was taken off, what was paid and taken back.
        const monthEnd = `${m}-${String(new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0)).getUTCDate()).padStart(2, "0")}`;
        const push = (date: string, type: string, title: string, amount: number, counts: boolean, note = "") => {
          if (Math.abs(amount) >= 0.005 || type === "info") a.ops.push({ month: m, monthStatus: sheet.status, date, type, title, amount: Math.round(amount * 100) / 100, balance: 0, counts, note });
        };
        for (const l of x.lines) push(monthEnd, "accrual", `${l.label} (${l.article})`, l.amount, true);
        push(monthEnd, "tax", "Gəlir vergisi", -x.incomeTax, true, x.taxReduction ? `vergi güzəşti ${x.taxReduction} AZN` : "");
        push(monthEnd, "insurance", "DSMF (işçi payı)", -x.employeeSocial, true);
        push(monthEnd, "insurance", "İşsizlik sığortası (işçi)", -x.employeeUnemployment, true);
        push(monthEnd, "insurance", "İcbari tibbi sığorta (işçi)", -x.employeeMedical, true);
        for (const d of x.otherDeductions) push(monthEnd, "deduction", `Tutulma: ${d.label || "digər"}`, -d.applied, true, d.applied < d.amount ? `tələb ${d.amount} AZN, həddə görə ${d.applied} AZN tutuldu, qalıq növbəti aya keçir` : "");
        if (r.benefitDue > 0) push(monthEnd, "benefit", "Sosial sığorta müavinəti (xəstəlik/analıq, ayrıca)", r.benefitDue, true, r.inputs.benefitDoc ? `e-bülleten № ${r.inputs.benefitDoc}` : "e-bülleten nömrəsi yazılmayıb");
        for (const c of r.carries) push(monthEnd, "info", `Əvvəlki aydan keçən tutulma: ${c.label} (${c.from})`, 0, false, `${c.amount} AZN növbəti hesablamaya daxil edilib`);
        for (const pay of [...r.payments].sort((p1, p2) => p1.paidOn.localeCompare(p2.paidOn))) {
          const name = `${PAY_LABEL[pay.kind] || pay.kind}${pay.title ? `: ${pay.title}` : ""} (${METHOD_LABEL[pay.method] || pay.method || "—"})`;
          const note = [pay.batchId ? "bank sənədi" : "", pay.note].filter(Boolean).join(" · ");
          const inPool = pay.kind !== "extra";
          push(pay.paidOn, "payment", name, -pay.amount, inPool, inPool ? note : `${note ? `${note} · ` : ""}borca təsir etmir`);
          if (pay.reversed) push(pay.paidOn, "reversal", `Geri çəkildi: ${name}`, pay.amount, inPool, `${pay.reverseReason} (${pay.reversedBy})`);
        }
        by.set(r.employeeId, a);
      }
    }
    // Running balance per employee, month after month: positive is what the company owes.
    for (const a of by.values()) {
      let running = 0;
      for (const op of a.ops) {
        if (op.counts && op.monthStatus === "approved") running = Math.round((running + op.amount) * 100) / 100;
        op.balance = running;
      }
    }
    const employees = [...by.values()]
      .map((a) => {
        const paidTotal = Object.values(a.paid).reduce((t, v) => t + v, 0);
        return {
          ...a,
          gross: money(a.gross), tax: money(a.tax), insurance: money(a.insurance), net: money(a.net), deductions: money(a.deductions), deductionsAsked: money(a.deductionsAsked), due: money(a.due), dueApproved: money(a.dueApproved), vacation: money(a.vacation), benefitDue: money(a.benefitDue), employerCost: money(a.employerCost),
          paid: Object.fromEntries(Object.entries(a.paid).map(([k, v]) => [k, money(v)])) as Record<string, number>,
          paidTotal: money(paidTotal), companyOwes: money(a.companyOwes), pendingOwes: money(a.pendingOwes), benefitOwes: money(a.benefitOwes), employeeOwes: money(a.employeeOwes),
          balance: money(a.companyOwes + a.benefitOwes - a.employeeOwes), // positive: the company owes the employee (approved months only)
          payments: a.payments.sort((x, y) => x.paidOn.localeCompare(y.paidOn)),
        };
      })
      .sort((x, y) => x.name.localeCompare(y.name));
    const total = (pick: (e: (typeof employees)[number]) => number) => money(employees.reduce((t, e) => t + pick(e), 0));
    return {
      from, to, approvedOnly, months: status, employees,
      totals: {
        employees: employees.length, gross: total((e) => e.gross), tax: total((e) => e.tax), insurance: total((e) => e.insurance), net: total((e) => e.net), deductions: total((e) => e.deductions), due: total((e) => e.due), dueApproved: total((e) => e.dueApproved),
        paidTotal: total((e) => e.paidTotal), advance: total((e) => e.paid.advance), salary: total((e) => e.paid.salary), vacation: total((e) => e.paid.vacation), benefit: total((e) => e.paid.benefit), extra: total((e) => e.paid.extra),
        companyOwes: total((e) => e.companyOwes), pendingOwes: total((e) => e.pendingOwes), benefitOwes: total((e) => e.benefitOwes), employeeOwes: total((e) => e.employeeOwes), balance: total((e) => e.balance), employerCost: total((e) => e.employerCost),
      },
    };
  };
    {
    const r = await handle_company_21({ auditView, auditorOnly, db, id, path, request, requestUrl, requirePermission, settlementReport, userId });
    if (r) return r;
  }
  const bankAccounts = async () =>
    (await db.prepare("SELECT id,label,bank_name,bank_code,swift,iban,account_number,voen,holder,currency,auto,is_default FROM payroll_bank_accounts WHERE company_id=? ORDER BY is_default DESC,created").bind(id).all<BankAccountRow>()).results;
  const batchView = (b: BatchRow, withItems = true) => ({
    id: b.id, month: b.month, kind: b.kind, accountId: b.account_id, status: b.status, statusText: BATCH_STATUS[b.status] || b.status, source: b.source, total: b.total_cents / 100, count: b.item_count, note: b.note,
    createdBy: b.created_by_name, approvedBy: b.approved_by_name, firstApprovedBy: b.first_approved_name, approvedAt: b.approved_at, sentAt: b.sent_at, paidAt: b.paid_at, created: b.created,
    items: withItems ? (JSON.parse(b.items || "[]") as TransferItem[]).map((it) => ({ ...it, card: maskCard(it.card) })) : undefined,
    skipped: JSON.parse(b.skipped || "[]") as TransferSkip[],
  });
  const batchColumns = "id,month,kind,account_id,status,source,total_cents,item_count,items,skipped,note,created_by_name,approved_by_name,approved_at,sent_at,paid_at,created,first_approved_name,first_approved_by";
  // Builds the order for a month: advances up to what is earned, salary up to what is still owed.
  const createBatch = async (monthRaw: string, kind: BatchKind, accountId: string, source: "manual" | "auto", createdBy: string) => {
    const sheet = await payrollRows(monthRaw);
    if (kind !== "advance" && sheet.status !== "approved") throw new HttpError(409, "Ödəniş sənədi hazırlamazdan əvvəl ayı təsdiqləyin.");
    if (kind === "advance" && sheet.status === "approved") throw new HttpError(409, "Ay təsdiqlənib: avans artıq verilmir.");
    if (kind === "advance" && !sheet.settings.advanceDay) throw new HttpError(409, "Əvvəlcə ödəniş ayarlarında avans gününü seçin.");
    const open = await db.prepare("SELECT id FROM payroll_batches WHERE company_id=? AND month=? AND kind=? AND status IN ('draft','approved','sent') LIMIT 1").bind(id, monthRaw, kind).first();
    if (open) throw new HttpError(409, "Bu ay üçün açıq ödəniş sənədi var: onu tamamlayın və ya ləğv edin.");
    const profiles = await db.prepare("SELECT id,profile FROM company_employees WHERE company_id=? AND status<>'removed'").bind(id).all<{ id: string; profile: string }>();
    const opened = await revealAll(profiles.results);
    const cards = new Map(profiles.results.map((p) => [p.id, opened.get(p.id)?.cardNumber || ""]));
    const { items, skipped } = buildTransfers(
      sheet.rows.map((r) => ({ employeeId: r.employeeId, name: r.name, fin: r.fin, iban: r.iban, cardNumber: cards.get(r.employeeId) || "", payMethod: (r.payMethod || "") as "" | "bank" | "card" | "cash", amount: kind === "advance" ? r.availableAdvance : kind === "vacation" ? r.vacationOutstanding : kind === "benefit" ? r.benefitOutstanding : r.outstanding })),
    );
    if (!items.length) throw new HttpError(409, skipped.length ? `Köçürüləcək işçi yoxdur: ${skipped.length} işçinin hesab məlumatı çatışmır və ya maaşı nağd verilir.` : kind === "advance" ? "Bu gün üçün verilə bilən avans yoxdur." : "Bu növ üzrə ödəniləcək qalıq yoxdur.");
    const batchId = crypto.randomUUID();
    await db
      .prepare("INSERT INTO payroll_batches(id,company_id,month,kind,account_id,status,source,total_cents,item_count,items,skipped,created_by_name,created) VALUES(?,?,?,?,?,'draft',?,?,?,?,?,?,?)")
      .bind(batchId, id, monthRaw, kind, accountId, source, batchTotal(items), items.length, JSON.stringify(items), JSON.stringify(skipped), createdBy, new Date().toISOString())
      .run();
    return batchId;
  };
    {
    const r = await handle_company_22({ bankAccounts, batchColumns, batchView, canAct, createBatch, db, id, memberRole, path, payrollMonth, payrollRows, request, requesterName, requirePermission, userId });
    if (r) return r;
  }
  const batchOf = async (batchId: string) => {
    const batch = await db.prepare(`SELECT ${batchColumns} FROM payroll_batches WHERE id=? AND company_id=?`).bind(batchId, id).first<BatchRow>();
    if (!batch) throw new HttpError(404, "Ödəniş sənədi tapılmadı.");
    return batch;
  };
    {
    const r = await handle_company_23({ batchOf, canAct, db, id, path, request, requesterName, requirePermission, userId });
    if (r) return r;
  }
  // The bank has paid: the payments are recorded for every employee in the order, never above what is still owed.
  // The bank has paid an order: a payment for each employee in it, never above what is still owed.
  const settleBatch = async (batch: BatchRow, paidOn: string) => {
    const sheet = await payrollRows(batch.month);
    const items = JSON.parse(batch.items || "[]") as TransferItem[];
    const kind = (["advance", "vacation", "benefit"] as const).find((k) => k === batch.kind) || "salary";
    const now = new Date().toISOString();
    const inserts: ReturnType<typeof db.prepare>[] = [];
    let recorded = 0;
    for (const it of items) {
      const row = sheet.rows.find((r) => r.employeeId === it.employeeId);
      if (!row) continue;
      const room = kind === "advance" ? row.availableAdvance : kind === "vacation" ? row.vacationOutstanding : kind === "benefit" ? row.benefitOutstanding : row.outstanding;
      const amount = Math.min(it.amountCents / 100, Math.max(0, room));
      if (amount <= 0) continue;
      recorded += Math.round(amount * 100);
      inserts.push(
        db
          .prepare("INSERT INTO payroll_payments(id,company_id,employee_id,month,kind,amount_cents,paid_on,method,note,batch_id,created_by,created) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")
          .bind(crypto.randomUUID(), id, it.employeeId, batch.month, kind, Math.round(amount * 100), paidOn, it.method === "card" ? "card" : "bank", `Bank sənədi ${batch.id.slice(0, 8)}`, batch.id, userId, now),
      );
    }
    for (let i = 0; i < inserts.length; i += 50) await db.batch(inserts.slice(i, i + 50));
    await db.prepare("UPDATE payroll_batches SET status='paid',paid_at=? WHERE id=? AND company_id=?").bind(now, batch.id, id).run();
    await companyAudit(db, id, userId, "payroll-batch-paid", batch.id, `${batch.month}: ${recorded / 100} AZN, ${inserts.length} işçi`);
    await tellPayroll(items.map((it) => it.employeeId), "Ödəniş edildi", `${batch.month} ayı üçün ${({ advance: "avans", salary: "əmək haqqı", vacation: "məzuniyyət haqqı", benefit: "müavinət" } as Record<string, string>)[kind]} bank vasitəsilə ödənildi. Təfərrüat: İş yerim → Əmək haqqı.`);
    return { paid: inserts.length, amount: recorded / 100 };
  };
    {
    const r = await handle_company_24({ applyDueOrderEffects, auditView, auditorOnly, batchColumns, batchOf, branchContext, db, employeeRefs, id, path, payrollLocked, payrollMonth, payrollRows, request, requestUrl, requirePermission, reversePayments, settleBatch, tripRates, userId });
    if (r) return r;
  }
  // Postings of a month for the accountant: one table that goes into 1C or any ledger. The account codes are the company's own.
  const ACCOUNT_KEYS: [string, string][] = [
    ["wageExpense", "Əmək haqqı xərcləri"],
    ["socialExpense", "İşəgötürənin sosial sığorta xərcləri"],
    ["payroll", "İşçi heyəti ilə hesablaşmalar (əmək haqqı üzrə öhdəlik)"],
    ["incomeTax", "Gəlir vergisi üzrə öhdəlik"],
    ["insurance", "Sosial sığorta, işsizlik və tibbi sığorta üzrə öhdəlik"],
    ["otherPayable", "Digər tutulmalar üzrə hesablaşmalar"],
    ["bank", "Bank hesabı"],
    ["cash", "Kassa"],
  ];
  const accountMap = async () => {
    const rows = (await db.prepare("SELECT key,value FROM hr_settings WHERE company_id=? AND key LIKE 'acct_%'").bind(id).all<{ key: string; value: string }>()).results;
    return Object.fromEntries(ACCOUNT_KEYS.map(([k]) => [k, rows.find((r) => r.key === `acct_${k}`)?.value || ""])) as Record<string, string>;
  };
    {
    const r = await handle_company_25({ ACCOUNT_KEYS, PAY_LABEL, accountMap, canAct, db, id, path, payrollLocked, payrollMonth, payrollRows, request, requesterName, requirePermission, reversePayments, tellPayroll, userId });
    if (r) return r;
  }
  // ---- Excel: attendance marks, calendar days, personal data ----
  const sheetRows = (value: unknown) =>
    (Array.isArray(value) ? value : []).slice(0, 1001).map((row: unknown) => (Array.isArray(row) ? row.map((c) => String(c ?? "")) : []));
    {
    const r = await handle_company_26({ dataKey, db, employeeRefs, id, markAttendance, path, request, requestUrl, requirePermission, reveal, sheetRows, userId });
    if (r) return r;
  }
  const orderRow = (r: OrderDbRow) => {
    const flow = normalizeFlow({
      signers: JSON.parse(r.signers || "[]") as FlowSigner[],
      status: r.status as FlowState["status"],
      holder: (r.holder || "") as FlowHolder,
      history: JSON.parse(r.history || "[]") as FlowEvent[],
    });
    return { id: r.id, employeeId: r.employee_id || "", kind: r.kind, number: r.number, date: r.order_date, created: r.created, input: JSON.parse(r.input || "{}"), ...flow };
  };
  const ORDER_COLUMNS = "o.id,o.employee_id,o.kind,o.number,o.order_date,o.input,o.signers,o.status,o.holder,o.history,o.created_by,o.created";
  const saveFlow = (orderId: string, flow: FlowState, at: string) =>
    db
      .prepare("UPDATE employee_orders SET signers=?,status=?,holder=?,history=?,updated=? WHERE id=? AND company_id=?")
      .bind(JSON.stringify(flow.signers), flow.status, flow.holder, JSON.stringify(flow.history), at, orderId, id)
      .run();
  const loadOrder = async (orderId: string) => {
    const row = await db
      .prepare(`SELECT ${ORDER_COLUMNS} FROM employee_orders o WHERE o.id=? AND o.company_id=?`)
      .bind(orderId, id)
      .first<OrderDbRow>();
    if (!row) throw new HttpError(404, "Əmr tapılmadı.");
    return orderRow(row);
  };
  // Who may act for the holder: the named person, or HR/director/owner (the director's step needs a director).
  const mayActFor = async (role: string, name: string) => {
    const who = await requesterName();
    const allowed = sameName(who, name) || (role === "director" ? canAct("approve-director") : canAct("approve-hr") || canAct("approve-director"));
    if (!allowed)
      throw new HttpError(403, role === "director" ? "Direktorun addan əməliyyatı yalnız direktor və ya hesab sahibi edə bilər." : "Şöbə rəhbərinin addan əməliyyatı yalnız o, HR, direktor və ya hesab sahibi edə bilər.");
    return who;
  };
  const cleanSigners = (value: unknown): FlowSigner[] =>
    (Array.isArray(value) ? value : [])
      .slice(0, 2)
      .map((x: { role?: unknown; title?: unknown; name?: unknown }): FlowSigner => ({ role: x.role === "director" ? "director" : "head", title: str(x.title, 60), name: str(x.name, 120) }))
      .filter((x) => x.name)
      .sort((x, y) => (x.role === y.role ? 0 : x.role === "head" ? -1 : 1));
  const orderKinds: string[] = ORDER_KINDS.map((k) => k.id);
  const flowFail = <T,>(run: () => T): T => {
    try {
      return run();
    } catch (error) {
      throw new HttpError(409, error instanceof Error ? error.message : "Əməliyyat alınmadı.");
    }
  };
  // Everything a signed order sets going: the marked days, the approved extra hours, the leave plan, the change of the card.
  const afterSigned = async (order: { id: string; employeeId: string; kind: string; number: string; input: unknown }) => {
    let marked = 0;
    const leaveCode = ORDER_KINDS.find((k) => k.id === order.kind)?.leaveCode;
    const range = (order.input || {}) as { from?: string; to?: string };
    const isDay = (v?: string) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");
    if (leaveCode && isDay(range.from) && isDay(range.to) && (range.to as string) >= (range.from as string))
      marked = await markAttendance(order.employeeId, range.from as string, range.to as string, leaveCode, `Əmr № ${order.number}`);
    // A signed order for extra or rest-day work approves the hours of those days (arts. 99, 105).
    if ((order.kind === "overtime" || order.kind === "restday") && isDay(range.from)) {
      const from = range.from as string;
      const to = isDay(range.to) && (range.to as string) >= from && order.kind === "overtime" ? (range.to as string) : from;
      const length = Math.min(62, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000) + 1);
      const statements: D1PreparedStatement[] = [];
      for (let i = 0; i < length; i++) {
        const day = new Date(Date.parse(`${from}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10);
        statements.push(db.prepare("INSERT OR REPLACE INTO overtime_orders(company_id,employee_id,day,order_id,order_number) VALUES(?,?,?,?,?)").bind(id, order.employeeId, day, order.id, String(order.number || "")));
      }
      for (let i = 0; i < statements.length; i += 50) await db.batch(statements.slice(i, i + 50));
    }
    // A signed annual leave is "taken" in the leave plan: the planned stretch is marked, or a new line is added.
    if (["vacation", "addleave", "creative"].includes(order.kind) && isDay(range.from) && isDay(range.to) && (range.to as string) >= (range.from as string)) {
      const from = range.from as string;
      const to = range.to as string;
      const planned = (await db.prepare("SELECT id FROM leave_schedule WHERE company_id=? AND employee_id=? AND status IN ('proposed','approved') AND start_date<=? AND end_date>=?").bind(id, order.employeeId, to, from).all<{ id: string }>()).results;
      if (planned.length) await db.batch(planned.map((p) => db.prepare("UPDATE leave_schedule SET status='taken',start_date=?,end_date=?,days=?,note=CASE WHEN note='' THEN ? ELSE note END WHERE id=?").bind(from, to, vacationDaysBetween(from, to), `Əmr № ${order.number}`, p.id)));
      else await db.prepare("INSERT INTO leave_schedule(id,company_id,employee_id,year,start_date,end_date,days,status,proposed_by,note,decided_by_name,decided_at,created) VALUES(?,?,?,?,?,?,?,'taken','order',?,?,?,?)").bind(crypto.randomUUID(), id, order.employeeId, Number(from.slice(0, 4)), from, to, vacationDaysBetween(from, to), `Əmr № ${order.number}`, "", "", new Date().toISOString()).run();
    }
    await applyOrderEffect(order.id).catch((error) => quiet("route-best-effort", error));
    // The employee whose order it is hears of it (in the app and by e-mail); the text carries no details.
    try {
      const person = await db.prepare("SELECT user_id FROM company_employees WHERE id=? AND company_id=?").bind(order.employeeId, id).first<{ user_id: string }>();
      if (person?.user_id)
        await notify(db, { userId: person.user_id, ...signedOrderNotice(order) });
    } catch (error) {
      // A notice that does not go out never stops the signing.
      quiet("route-catch", error);
    }
    return marked;
  };
    {
    const r = await handle_company_27({ ORDER_COLUMNS, applyDueOrderEffects, db, id, orderRow, path, request, requestUrl, requirePermission, withEffects });
    if (r) return r;
  }
  // The register of all orders, with the filters of the page and of the Excel report.
  const registryRows = async () => {
    const status = str(requestUrl.searchParams.get("status"), 20);
    const orderKind = str(requestUrl.searchParams.get("orderKind"), 20);
    const from = str(requestUrl.searchParams.get("from"), 10);
    const to = str(requestUrl.searchParams.get("to"), 10);
    const query = str(requestUrl.searchParams.get("q"), 80).toLocaleLowerCase("az");
    const rows = await db
      .prepare(
        `SELECT ${ORDER_COLUMNS},e.name AS employee_name,e.position AS employee_position,e.department AS employee_department,e.section AS employee_section,e.start_date AS employee_start,e.end_date AS employee_end,e.salary_cents AS employee_salary,e.salary_type AS employee_salary_type,e.probation_end AS employee_probation
        FROM employee_orders o JOIN company_employees e ON e.id=o.employee_id WHERE o.company_id=? ORDER BY o.order_date DESC,o.created DESC LIMIT 1000`,
      )
      .bind(id)
      .all<OrderDbRow & { employee_name: string; employee_position: string; employee_department: string; employee_section: string; employee_start: string; employee_end: string; employee_salary: number; employee_salary_type: string; employee_probation: string }>();
    return rows.results
      .map((r) => ({
        ...orderRow(r),
        employee: {
          id: r.employee_id || "",
          name: r.employee_name,
          position: r.employee_position,
          department: r.employee_department,
          section: r.employee_section,
          startDate: r.employee_start,
          endDate: r.employee_end,
          salary: can(memberRole, "salaries", memberGrants) ? r.employee_salary / 100 : 0,
          salaryType: r.employee_salary_type === "net" ? "net" : "gross",
          probationEnd: r.employee_probation,
        },
      }))
      .filter((r) => (!status || (status === "signed" ? r.status === "signed" : status === "open" ? r.status !== "signed" : r.status === status)) && (!orderKind || r.kind === orderKind) && (!from || r.date >= from) && (!to || r.date <= to))
      .filter((r) => !query || `${r.number} ${r.employee.name} ${r.employee.department} ${r.employee.section} ${r.employee.position}`.toLocaleLowerCase("az").includes(query));
  };
    {
    const r = await handle_company_28({ afterSigned, applyDueOrderEffects, applyOrderEffect, cleanSigners, db, flowFail, id, loadOrder, mayActFor, orderKinds, path, registryRows, request, requesterName, requirePermission, revertOrderEffect, saveFlow, tellEmployee, userId, withEffects });
    if (r) return r;
  }
  // ---- Employee applications (ərizə): recorded here, the order is drawn up from them ----
  const requestRow = (r: { id: string; employee_id: string; kind: string; data: string; status: string; order_id: string; decision: string; source: string; created_by_name: string; created: string; employee_name: string; employee_position: string; employee_department: string; employee_section: string; employee_start: string; employee_end: string; employee_salary: number; employee_salary_type: string; employee_probation: string; order_number: string | null; order_status: string | null }) => ({
    id: r.id,
    kind: r.kind,
    data: (() => {
      try {
        return JSON.parse(r.data);
      } catch {
        return {};
      }
    })(),
    status: r.status,
    orderId: r.order_id,
    orderNumber: r.order_number || "",
    orderStatus: r.order_status || "",
    decision: r.decision,
    source: r.source === "employee" ? "employee" : r.source === "plan" ? "plan" : "hr",
    by: r.created_by_name,
    created: r.created,
    manager: (r as { manager_status?: string }).manager_status ? { status: (r as { manager_status?: string }).manager_status, name: (r as { manager_name?: string }).manager_name || "", note: (r as { manager_note?: string }).manager_note || "" } : null,
    employee: {
      id: r.employee_id,
      name: r.employee_name,
      position: r.employee_position,
      department: r.employee_department,
      section: r.employee_section,
      startDate: r.employee_start,
      endDate: r.employee_end,
      salary: can(memberRole, "salaries", memberGrants) ? r.employee_salary / 100 : 0,
      salaryType: r.employee_salary_type === "net" ? "net" : "gross",
      probationEnd: r.employee_probation,
    },
  });
    {
    const r = await handle_company_29({ db, id, leaveChecks, path, request, requestRow, requesterName, requirePermission, tellEmployee, userId });
    if (r) return r;
  }
  // ---- Staff table: places per department, section and position ----
  const staffOverview = async () => {
    await absorbLegacyHeadcount(db, id);
    const [plan, open, pending] = await Promise.all([
      loadPlanData(db, id),
      db
        .prepare("SELECT lower(COALESCE(json_extract(data,'$.department'),'')) AS department, COUNT(*) AS n FROM jobs WHERE owner=? AND status IN ('published','pending_approval') GROUP BY 1")
        .bind(id)
        .all<{ department: string; n: number }>(),
      db
        .prepare("SELECT id,subject,requested_by_name,created FROM approval_requests WHERE company_id=? AND kind='headcount' AND status='pending' ORDER BY created DESC LIMIT 20")
        .bind(id)
        .all<{ id: string; subject: string; requested_by_name: string; created: string }>(),
    ]);
    const openBy = new Map(open.results.map((row) => [row.department, Number(row.n)]));
    const summary = summarize(plan.units, plan.people);
    const placedBy = new Map<string, { id: string; name: string }[]>();
    const assigned = assignPeople(plan.units, plan.people);
    const conflicts = new Map(bandConflicts(plan.units, plan.people).map((c) => [c.person.id, c.side]));
    const mayPay = can(memberRole, "salaries", memberGrants);
    for (const [unitId, list] of assigned.byUnit)
      placedBy.set(
        unitId,
        list.map((p) => ({ id: p.id, name: (p as PlanPerson & { name: string }).name, gross: mayPay ? p.gross || 0 : null, outside: conflicts.get(p.id) || "" })),
      );
    const noteBy = new Map(plan.units.map((u) => [u.id, u.note]));
    // What the places cost the employer a month (gross plus the employer's own contributions), in this month's open places.
    const thisMonth = new Date().toISOString().slice(0, 7);
    const employerCost = (gross: number) => (gross > 0 ? employeePay(gross, "gross", "private").employerCost : 0);
    const rows = summary.rows.map((row) => {
      const active = unitActive(row, thisMonth);
      const share = row.planned * (row.rate || 1);
      const hi = row.salaryMax || row.salaryMin;
      return {
        ...row,
        note: noteBy.get(row.id) || "",
        people: placedBy.get(row.id) || [],
        active,
        costMin: active ? Math.round(employerCost(row.salaryMin) * share) : 0,
        costMax: active ? Math.round(employerCost(hi) * share) : 0,
      };
    });
    const factCost = Math.round(plan.people.reduce((sum, p) => sum + employerCost(p.gross || 0), 0));
    const departments = summary.departments.map((d) => ({ ...d, openVacancies: openBy.get(d.department.toLocaleLowerCase("az")) || 0 }));
    const payroll = plan.people.reduce((sum, p) => sum + (p.gross || 0), 0);
    return {
      rows,
      departments,
      unplaced: summary.unplaced.map((p) => ({ id: p.id, name: (p as PlanPerson & { name: string }).name, department: p.department, section: p.section, position: p.position })),
      total: { ...summary.total, payroll: Math.round(payroll * 100) / 100, planCostMin: rows.reduce((a, r) => a + r.costMin, 0), planCostMax: rows.reduce((a, r) => a + r.costMax, 0), factCost },
      pending: pending.results,
      mismatches: conflicts.size,
      locked: await planLocked(),
      planStatus: await planStatus(),
    };
  };
    {
    const r = await handle_company_30({ db, id, path, request, requestUrl, requirePermission, staffOverview });
    if (r) return r;
  }
  const unitInput = (b: Record<string, unknown>) => ({
    branch: str(b.branch, 120).trim(),
    department: str(b.department, 120),
    section: str(b.section, 120),
    position: str(b.position, 120),
    planned: Math.max(0, Math.min(10000, Math.round(Number(b.planned ?? 1)))),
    rate: normalizeRate(b.rate),
    salaryCents: Math.max(0, Math.round((Number(b.salaryMin ?? b.salary) || 0) * 100)),
    salaryMaxCents: Math.max(0, Math.round((Number(b.salaryMax) || 0) * 100)),
    note: str(b.note, 300),
    level: str(b.level, 40).trim(),
    startMonth: /^\d{4}-(0[1-9]|1[0-2])$/.test(str(b.startMonth, 7)) ? str(b.startMonth, 7) : "",
    endMonth: /^\d{4}-(0[1-9]|1[0-2])$/.test(str(b.endMonth, 7)) ? str(b.endMonth, 7) : "",
  });
  // A vacancy needs a place the plan does not have: an extra place of the row (or a new row) goes to approval.
  // The director's own request is approved on the spot; nobody else can add a place by themselves.
    {
    const r = await handle_company_31({ accountRole, canAct, db, id, memberRole, path, planLocked, queueApproval, request, requestUrl, requesterName, requirePermission, unitInput, userId });
    if (r) return r;
  }
  // ---- Company structure: departments and their sections ----
  const structureDb = async <T,>(run: () => Promise<T>) => {
    try {
      return await run();
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status) throw new HttpError(status, (error as Error).message);
      throw error;
    }
  };
    {
    const r = await handle_company_32({ canAct, dataKey, db, id, path, planLocked, queueApproval, request, requirePermission, reveal, structureDb, userId });
    if (r) return r;
  }
  // ---- Employee document folder (contracts, orders, IDs): HR, director and owner only ----
  const EMPLOYEE_DOC_CATEGORIES = [
    "contract",
    "order",
    "id",
    "diploma",
    "medical",
    "other",
  ];
  const employeeDocsDenied =
    "İşçi sənədlərini yalnız HR, direktor və hesab sahibi idarə edə bilər.";
    {
    const r = await handle_company_33({ AWAY_CODES, EMPLOYEE_DOC_CATEGORIES, assertYearOpen, auditView, canAct, db, employeeDocsDenied, id, memberGrants, memberRole, path, request, requestUrl, requirePermission, userId, yearPlanState });
    if (r) return r;
  }
  {
    const r = await handle_reports_01({ accountRole, db, hrFundReport, id, memberRole, path, request, requestUrl, requirePermission, userId });
    if (r) return r;
  }
  {
    const r = await handle_employees_01({ accountRole, afterSigned, auditView, db, id, memberGrants, memberRole, path, request, requestUrl, requesterName, requirePermission, revealAll, userId });
    if (r) return r;
  }
  {
    const r = await handle_attendance_01({ accountRole, db, id, memberGrants, memberRole, path, request, requestUrl, requesterName, requirePermission, userId });
    if (r) return r;
  }
  {
    const r = await handle_interviews_02({ accountRole, db, id, memberGrants, memberRole, path, request, userId });
    if (r) return r;
  }
  {
    const r = await handle_ats_01({ accountRole, db, id, memberRole, path, request, requestUrl });
    if (r) return r;
  }
    {
    const r = await handle_company_34({ approvalRules, canAct, db, id, memberGrants, memberRole, path, queueApproval, request, requirePermission, salaryChange, userId });
    if (r) return r;
  }
  // Date range, one vacancy and "own vacancies only" for roles that cannot publish.
  const reportScope = async () => {
    const day = (key: string) => {
      const v = str(requestUrl.searchParams.get(key), 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
    };
    const from = day("from");
    const to = day("to");
    if (from && to && from > to)
      throw new HttpError(
        400,
        "Başlanğıc tarixi son tarixdən böyük ola bilməz.",
      );
    const jobFilter = str(requestUrl.searchParams.get("jobId"), 100);
    const ownOnly = !can(memberRole, "publish");
    const all = await db
      .prepare(
        "SELECT id,json_extract(data,'$.createdBy') AS created_by FROM jobs WHERE owner=?",
      )
      .bind(id)
      .all<{ id: string; created_by: string | null }>();
    const jobIds = all.results
      .filter(
        (j) =>
          (!ownOnly || j.created_by === userId) &&
          (!jobFilter || j.id === jobFilter),
      )
      .map((j) => j.id);
    return {
      from,
      to,
      ownOnly,
      jobIds,
      jobIdsJson: JSON.stringify(jobIds),
      inRange: (iso: string) =>
        (!from || iso.slice(0, 10) >= from) && (!to || iso.slice(0, 10) <= to),
    };
  };
    {
    const r = await handle_company_35({ canAct, canDecideStep, customSkillLabels, db, id, memberGrants, memberRole, path, reportScope, request, requestUrl, requirePermission, userId });
    if (r) return r;
  }
    {
    const r = await handle_company_36({ approvalHistory, attendanceData, calendarYear, db, hoursBetween, id, memberRole, path, registryRows, reportScope, request, requestUrl, requirePermission, staffOverview, userId });
    if (r) return r;
  }
  // How active each member was: number of logged actions per person in the last days.
    {
    const r = await handle_company_37({ customSkillLabels, db, id, path, request, requestUrl, requirePermission, userId });
    if (r) return r;
  }
    {
    const r = await handle_interviews_01({ billingEnforced, db, id, path, paymentProvider, request, requestUrl, syncApplicationStatus });
    if (r) return r;
  }
    {
    const r = await handle_plan_01({ db, id, path, paymentProvider, request });
    if (r) return r;
  }
  // ---- Payment on the bank's own page (hosted checkout) ----
  // The package is bought on the bank's page: an order is made here, the buyer is sent to the bank, and the package starts only when the
  // bank's answer is «paid». The card never touches this site. Until the real bank is set up, the test bank (a page of ours) is used.
  const payOrder = async (orderId: string) =>
    db
      .prepare("SELECT id,account_id,plan_id,amount_cents,status,provider,auto_renew FROM payment_orders WHERE id=?")
      .bind(orderId)
      .first<{ id: string; account_id: string; plan_id: string; amount_cents: number; status: string; provider: string; auto_renew: number }>();
  // Starts the package of a paid order (a new package replaces the running one at once) and writes the payment and the contract.
  const activatePaidOrder = async (order: { id: string; account_id: string; plan_id: string; amount_cents: number; provider: string; auto_renew: number }, providerRef: string) => {
    const plan = planById(order.plan_id);
    if (!plan) return;
    const now = new Date();
    const at = now.toISOString();
    const periodEnd = addPeriod(now);
    const subId = crypto.randomUUID();
    const current = await latestSubscription(db, order.account_id);
    const active = current && current.status !== "expired" && Date.parse(current.periodEnd) > now.getTime() ? current : null;
    const account = await db
      .prepare("SELECT a.name,p.email FROM accounts a LEFT JOIN password_accounts p ON p.user_id=a.id WHERE a.id=?")
      .bind(order.account_id)
      .first<{ name: string; email: string | null }>();
    const settings = runtime();
    const contract = buildServiceContract({
      id: subId,
      date: at.slice(0, 10),
      party: { kind: "candidate", name: account?.name || "", email: account?.email || "" },
      plan,
      operator: { name: settings.PLATFORM_LEGAL_NAME || "", voen: settings.PLATFORM_VOEN || "", address: settings.PLATFORM_ADDRESS || "", email: settings.PLATFORM_EMAIL || settings.ADMIN_EMAIL || "" },
      autoRenew: order.auto_renew === 1,
      periodStart: at.slice(0, 10),
      periodEnd: periodEnd.slice(0, 10),
    });
    await db.batch([
      ...(active ? [db.prepare("UPDATE subscriptions SET status='expired',auto_renew=0,period_end=?,updated=? WHERE id=?").bind(at, at, active.id)] : []),
      db
        .prepare("INSERT INTO subscriptions(id,account_id,plan_id,status,period_start,period_end,auto_renew,method_id,created,updated) VALUES(?,?,?,'active',?,?,?,?,?,?)")
        .bind(subId, order.account_id, plan.id, at, periodEnd, 0, "", at, at),
      db
        .prepare("INSERT INTO plan_payments(id,account_id,subscription_id,plan_id,amount_cents,currency,status,method_label,provider,provider_ref,period_start,period_end,error,created) VALUES(?,?,?,?,?,'AZN','paid',?,?,?,?,?,'',?)")
        .bind(crypto.randomUUID(), order.account_id, subId, plan.id, order.amount_cents, "Bank səhifəsi", order.provider, providerRef, at, periodEnd, at),
      db
        .prepare("INSERT INTO contracts(id,account_id,subscription_id,plan_id,number,title,body,created) VALUES(?,?,?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), order.account_id, subId, plan.id, contract.number, contract.title, contract.text, at),
      db.prepare("UPDATE payment_orders SET status='paid',provider_ref=?,updated=? WHERE id=?").bind(providerRef, at, order.id),
    ]);
    await notify(db, { userId: order.account_id, type: "plan", title: `${plan.name} paketi aktivdir`, body: `${aznCents(order.amount_cents)} ödənildi. Müqavilə № ${contract.number}.`, link: "packages" });
  };
  // Step 1: the buyer chose a package; an order is made and the address of the bank's page is returned.
    {
    const r = await handle_plan_02({ activatePaidOrder, billingEnforced, customSkillLabels, db, id, path, payOrder, paymentProvider, request, requestUrl });
    if (r) return r;
  }
    {
    const r = await handle_parse_cv_01({ id, path, request });
    if (r) return r;
  }
    {
    const r = await handle_analyze_01({ billingEnforced, customSkillLabels, db, id, path, paymentProvider, request, requireAiAccess });
    if (r) return r;
  }
    {
    const r = await handle_cv_01({ billingEnforced, customSkillLabels, db, id, path, paymentProvider, request, requireAiAccess });
    if (r) return r;
  }
    {
    const r = await handle_draft_01({ accountRole, approvalRules, customSkillLabels, db, id, memberRole, path, request, userId });
    if (r) return r;
  }
    {
    const r = await handle_fit_review_01({ accountRole, aiQuota, chargeAi, customSkillLabels, db, id, path, request, requestUrl, requireAiAccess, userId });
    if (r) return r;
  }
    {
    const r = await handle_application_status_01({ customSkillLabels, db, id, path, request, userId });
    if (r) return r;
  }
  // ---- Offer templates: the terms a company repeats (contract, probation, schedule, benefits, wording) ----
  const offerTemplateDenied =
    "Təklif şablonlarını yalnız HR, direktor və ya hesab sahibi idarə edə bilər.";
    {
    const r = await handle_offers_01({ db, id, offerTemplateDenied, path, request, requirePermission, userId });
    if (r) return r;
  }
  // An offer follows the last selection stage of the vacancy and needs no other open offer.
  const loadOfferTarget = async (applicationId: string) => {
    const row = await db
      .prepare(
        `SELECT a.id,a.status,a.stage,a.candidate_id,a.job_id,j.data AS job_data FROM applications a
        JOIN jobs j ON j.id=a.job_id WHERE a.id=? AND j.owner=?`,
      )
      .bind(applicationId, id)
      .first<{
        id: string;
        status: string;
        stage: string;
        candidate_id: string;
        job_id: string;
        job_data: string;
      }>();
    if (!row) throw new HttpError(404, "Müraciət tapılmadı.");
    const job = normalizedJobRecord(
      JSON.parse(row.job_data),
      customSkillLabels,
    );
    const stages = job.stages || [];
    const reachedLast =
      row.status === "Müsahibə" &&
      (!stages.length || row.stage === stages[stages.length - 1]);
    if (!reachedLast)
      throw new HttpError(
        409,
        stages.length
          ? `İş təklifi yalnız son mərhələdən (“${stages[stages.length - 1]}”) sonra göndərilə bilər.`
          : "İş təklifi yalnız müsahibə mərhələsindən sonra göndərilə bilər.",
      );
    const active = await db
      .prepare("SELECT 1 FROM offers WHERE application_id=? AND status='sent'")
      .bind(row.id)
      .first();
    if (active)
      throw new HttpError(
        409,
        "Bu namizədə artıq cavab gözləyən təklif göndərilib.",
      );
    return { row, job };
  };
  const deliverOffer = async (
    row: { id: string; status: string; candidate_id: string; job_id: string },
    data: { position: string; company: string; [key: string]: unknown },
  ) => {
    const now = new Date().toISOString();
    const offerId = crypto.randomUUID();
    await db.batch([
      db
        .prepare(
          "INSERT INTO offers(id,application_id,job_id,company_id,candidate_id,data,status,created,updated) VALUES(?,?,?,?,?,?,'sent',?,?)",
        )
        .bind(
          offerId,
          row.id,
          row.job_id,
          id,
          row.candidate_id,
          JSON.stringify(data),
          now,
          now,
        ),
      db
        .prepare(
          "UPDATE applications SET status='Təklif edildi',updated=? WHERE id=?",
        )
        .bind(now, row.id),
    ]);
    await recordApplicationEvent(db, {
      applicationId: row.id,
      actorId: id,
      actorRole: "company",
      type: "offer",
      from: row.status,
      to: "göndərildi",
    });
    await recordApplicationEvent(db, {
      applicationId: row.id,
      actorId: id,
      actorRole: "company",
      type: "status",
      from: row.status,
      to: "Təklif edildi",
    });
    await notify(db, {
      userId: row.candidate_id,
      type: "offer",
      title: `İş təklifi: ${data.position}`,
      body: `${data.company} sizə iş təklifi göndərdi.`,
      link: "applications",
    });
    return offerId;
  };
    {
    const r = await handle_offers_02({ approvalRules, canAct, db, deliverOffer, id, loadOfferTarget, path, queueApproval, request, requirePermission });
    if (r) return r;
  }
  // Who can be named to decide: the account owner and the active members, by name.
  const approverPeople = async (): Promise<{ userId: string; name: string; role: string }[]> => {
    const owner = await db.prepare("SELECT name FROM accounts WHERE id=?").bind(id).first<{ name: string }>();
    const members = await db
      .prepare("SELECT m.user_id,m.role,COALESCE(a.name,m.email) AS name FROM company_members m LEFT JOIN accounts a ON a.id=m.user_id WHERE m.company_id=? AND m.status='active' AND m.user_id<>''")
      .bind(id)
      .all<{ user_id: string; role: string; name: string }>()
      .catch(() => ({ results: [] as { user_id: string; role: string; name: string }[] }));
    const ROLE: Record<string, string> = { director: "Direktor", hr: "HR meneceri", manager: "Şöbə rəhbəri", recruiter: "Rekruter", auditor: "Auditor" };
    return [{ userId: id, name: owner?.name || "Hesab sahibi", role: "Hesab sahibi" }, ...members.results.map((m) => ({ userId: m.user_id, name: m.name || "Üzv", role: ROLE[m.role] || m.role }))];
  };
  // Only the account owner and directors hold the director right, so only they can be named to decide these requests.
  const approverCandidates = async () => (await approverPeople()).filter((p) => p.role === "Hesab sahibi" || p.role === "Direktor");
    {
    const r = await handle_company_38({ approvalHistory, approvalRules, approverCandidates, approverPeople, auditView, canAct, db, deliverOffer, hoursBetween, id, lentFrom, loadOfferTarget, memberGrants, memberRole, path, request, requesterName, salaryChange, setYearPlan, userId });
    if (r) return r;
  }
    {
    const r = await handle_offers_03({ db, id, path, request });
    if (r) return r;
  }
  const testsDenied =
    "Testləri yalnız HR, direktor, hesab sahibi və ya bu icazə verilmiş şəxs idarə edə bilər.";
  // Test results of some applications side by side (used by the candidate comparison table).
    {
    const r = await handle_hr_01({ db, id, path, request, requestUrl, requirePermission, testsDenied, userId });
    if (r) return r;
  }
    {
    const r = await handle_hr_02({ db, id, path, request, requirePermission, testsDenied, userId });
    if (r) return r;
  }
  // Sends a copy of the test to one application; returns a reason when it cannot be sent.
  const assignTest = async (
    assessment: {
      id: string;
      title: string;
      instructions: string;
      duration_min: number;
      passing_score: number;
      show_result: number;
      on_pass: string;
      on_fail: string;
      questions: string;
    },
    application: { id: string; candidate_id: string; status: string },
  ): Promise<string> => {
    if (["Uyğun deyil", WITHDRAWN_STATUS].includes(application.status))
      return "müraciət bağlanıb";
    const open = await db
      .prepare(
        "SELECT 1 FROM assessment_assignments WHERE assessment_id=? AND application_id=? AND status IN ('assigned','started')",
      )
      .bind(assessment.id, application.id)
      .first();
    if (open) return "test artıq göndərilib";
    const now = new Date().toISOString();
    // The candidate gets a copy: later edits of the test do not reach this attempt.
    const snapshot = JSON.stringify({
      title: assessment.title,
      instructions: assessment.instructions,
      durationMin: assessment.duration_min,
      passingScore: assessment.passing_score,
      showResult: assessment.show_result === 1,
      onPass: assessment.on_pass,
      onFail: assessment.on_fail,
      questions: JSON.parse(assessment.questions),
    });
    await db
      .prepare(
        "INSERT INTO assessment_assignments(id,assessment_id,application_id,candidate_id,company_id,status,assigned_at,snapshot) VALUES(?,?,?,?,?,'assigned',?,?)",
      )
      .bind(
        crypto.randomUUID(),
        assessment.id,
        application.id,
        application.candidate_id,
        id,
        now,
        snapshot,
      )
      .run();
    await recordApplicationEvent(db, {
      applicationId: application.id,
      actorId: id,
      actorRole: "company",
      type: "test",
      to: assessment.title,
    });
    await notify(db, {
      userId: application.candidate_id,
      type: "test",
      title: `Test: ${assessment.title}`,
      body: `${assessment.duration_min} dəqiqəlik test göndərildi. Platformada verə bilərsiniz.`,
      link: "applications",
    });
    return "";
  };
    {
    const r = await handle_hr_03({ assignTest, db, id, path, request, requestUrl, requirePermission, testsDenied, userId });
    if (r) return r;
  }
  const INTERVIEW_COLUMNS = `i.id,i.application_id,i.job_id,i.company_id,i.candidate_id,i.scheduled_at,i.duration_min,i.kind,i.location,i.note,i.panel,i.slots,i.status,i.candidate_note,i.created_by,i.rating,i.feedback,i.decision,i.scores,i.round,i.questions,i.created,
      COALESCE(json_extract(j.data,'$.title'),'') AS job_title,COALESCE(c.name,'') AS candidate,COALESCE(a.status,'') AS application_status,COALESCE((SELECT name FROM accounts WHERE id=i.created_by),'') AS created_by_name`;
  const interviewKindText = (row: { kind: string; location: string }) =>
    `${INTERVIEW_KINDS.find((k) => k.id === row.kind)?.label || row.kind}${row.location ? `: ${row.location}` : ""}`;
  // Roles without "publish" see and schedule interviews only for vacancies they created.
  const interviewScope = async () => (await reportScope()).jobIds;
  const loadGuideTemplates = async (): Promise<GuideTemplate[]> =>
    (await db.prepare("SELECT id,name,questions,job_id FROM interview_templates WHERE company_id=? ORDER BY name").bind(id).all<{ id: string; name: string; questions: string; job_id: string }>()).results.map((r) => ({
      id: r.id,
      name: r.name,
      jobId: r.job_id || "",
      questions: sanitizeGuideQuestions((() => { try { return JSON.parse(r.questions); } catch { return []; } })()),
    }));
  // The people of the company who may take part in an interview: the account owner and the active members.
  const loadPeople = async (): Promise<Person[]> => {
    const owner = await db.prepare("SELECT name FROM accounts WHERE id=?").bind(id).first<{ name: string }>();
    const members = await db
      .prepare(
        `SELECT m.user_id,m.role,COALESCE(a.name,m.email) AS name FROM company_members m LEFT JOIN accounts a ON a.id=m.user_id
        WHERE m.company_id=? AND m.status='active' AND m.user_id<>''`,
      )
      .bind(id)
      .all<{ user_id: string; role: string; name: string }>()
      .catch(() => ({ results: [] as { user_id: string; role: string; name: string }[] }));
    const ROLE: Record<string, string> = { owner: "Hesab sahibi", director: "Direktor", hr: "HR meneceri", manager: "Şöbə rəhbəri", recruiter: "Rekruter", auditor: "Auditor" };
    return [{ userId: id, name: owner?.name || "Şirkət", role: "Hesab sahibi" }, ...members.results.map((m) => ({ userId: m.user_id, name: m.name || "Üzv", role: ROLE[m.role] || m.role }))];
  };
  // [{userId, role}] from the form, kept only if the person belongs to the company.
  const pickParticipants = async (raw: unknown): Promise<Person[]> => {
    const list = Array.isArray(raw) ? raw : [];
    if (!list.length) return [];
    const people = await loadPeople();
    const out: Person[] = [];
    for (const item of list.slice(0, 10)) {
      const rec = (item && typeof item === "object" ? item : { userId: item }) as { userId?: unknown; role?: unknown };
      const who = people.find((p) => p.userId === str(rec.userId, 100));
      if (!who) throw new HttpError(400, "İştirakçı komandanızda tapılmadı.");
      if (!out.some((o) => o.userId === who.userId)) out.push({ ...who, role: str(rec.role, 60) || who.role });
    }
    return out;
  };
  // Interviews that block the time around a moment, with their participants, for the overlap check.
  const conflictsOf = async (q: { scheduledAt: string; durationMin: number; jobId: string; candidateId: string; userIds: string[]; ignoreId?: string }) => {
    const start = Date.parse(q.scheduledAt);
    const rows = await db
      .prepare(
        `SELECT i.id,i.job_id,i.candidate_id,i.scheduled_at,i.duration_min,COALESCE(c.name,'') AS cand,COALESCE(json_extract(j.data,'$.title'),'') AS title
        FROM interviews i JOIN jobs j ON j.id=i.job_id LEFT JOIN accounts c ON c.id=i.candidate_id
        WHERE i.company_id=? AND i.status IN ('scheduled','confirmed','pending_panel') AND i.scheduled_at>=? AND i.scheduled_at<=?`,
      )
      .bind(id, new Date(start - 86400000).toISOString(), new Date(start + 86400000).toISOString())
      .all<{ id: string; job_id: string; candidate_id: string; scheduled_at: string; duration_min: number; cand: string; title: string }>();
    const parts = rows.results.length
      ? (await db.prepare("SELECT interview_id,user_id FROM interview_participants WHERE company_id=? AND interview_id IN (SELECT value FROM json_each(?))").bind(id, JSON.stringify(rows.results.map((r) => r.id))).all<{ interview_id: string; user_id: string }>()).results
      : [];
    const people = await loadPeople();
    const slots: BusySlot[] = rows.results.map((r) => ({
      id: r.id,
      start: Date.parse(r.scheduled_at),
      end: Date.parse(r.scheduled_at) + r.duration_min * 60000,
      jobId: r.job_id,
      candidateId: r.candidate_id,
      people: parts.filter((x) => x.interview_id === r.id).map((x) => x.user_id),
      label: `${r.cand || "namizəd"} · ${r.title}`,
    }));
    return findConflicts(
      { start, end: start + q.durationMin * 60000, jobId: q.jobId, candidateId: q.candidateId, people: q.userIds, ignoreId: q.ignoreId },
      slots,
      (u) => people.find((p) => p.userId === u)?.name || "İştirakçı",
    );
  };
  const failOnConflicts = async (q: Parameters<typeof conflictsOf>[0]) => {
    const found = await conflictsOf(q);
    if (found.length) throw new HttpError(409, `Vaxt üst-üstə düşür: ${found.map((c) => c.message).join(" ")}`);
  };
  // The invitation the candidate sees, sent once the colleagues (if any) have confirmed.
  const inviteCandidate = async (row: { id: string; application_id: string; candidate_id: string; scheduled_at: string; duration_min: number; kind: string; location: string; panel: string; slots: string; title: string }) => {
    const company = await db.prepare("SELECT name FROM accounts WHERE id=?").bind(id).first<{ name: string }>();
    const slots = (() => { try { return JSON.parse(row.slots || "[]") as string[]; } catch { return [] as string[]; } })();
    const when = slots.length ? `vaxt variantları: ${slots.map(bakuLocal).join(" / ")} (Bakı vaxtı)` : `${bakuLocal(row.scheduled_at)} (Bakı vaxtı)`;
    const message = `${company?.name || "Şirkət"} sizi "${row.title}" vakansiyası üzrə müsahibəyə dəvət edir: ${when}, ${row.duration_min} dəq. ${interviewKindText(row)}${row.panel ? `. Müsahibə aparanlar: ${row.panel}` : ""}. Müraciətlərim bölməsində ${slots.length ? "sizə uyğun vaxtı seçib təsdiqləyin" : "təsdiqləyin"} və ya imtina edin.`;
    await notify(db, { userId: row.candidate_id, type: "interview", title: `Müsahibə dəvəti: ${row.title}`, body: message, link: "applications" });
    await sendUserEmail(db, row.candidate_id, `Müsahibə dəvəti: ${row.title}`, message, "interview");
  };
  // Ask the chosen colleagues first; the candidate hears nothing until all of them agree.
  const askParticipants = async (interviewId: string, people: Person[], info: { title: string; candidate: string; scheduledAt: string; durationMin: number; round: string; kindText: string }) => {
    const now = new Date().toISOString();
    await db.prepare("DELETE FROM interview_participants WHERE interview_id=?").bind(interviewId).run();
    for (const p of people) {
      await db
        .prepare("INSERT INTO interview_participants(id,interview_id,company_id,user_id,name,role,status,note,responded,created) VALUES(?,?,?,?,?,?,'pending','','',?)")
        .bind(crypto.randomUUID(), interviewId, id, p.userId, p.name, p.role, now)
        .run();
      if (p.userId !== userId)
        await notify(db, {
          userId: p.userId,
          type: "interview",
          title: `Müsahibədə iştirakınız lazımdır: ${info.title}`,
          body: `${info.candidate || "Namizəd"} ilə ${info.round ? `${info.round}, ` : ""}${bakuLocal(info.scheduledAt)} (Bakı vaxtı), ${info.durationMin} dəq. ${info.kindText}. Rolunuz: ${p.role}. Müsahibələr bölməsində təsdiqləyin və ya imtina edin.`,
          link: "hr-interviews",
          email: true,
        });
    }
    // The person who set it up needs no second question: their own answer is "accepted" at once.
    await db.prepare("UPDATE interview_participants SET status='accepted',responded=? WHERE interview_id=? AND user_id=?").bind(now, interviewId, userId).run();
  };
  const scheduleFor = async (app: InvApp, input: InterviewInput, opts: { participants?: Person[]; round?: string; candidateName?: string; questions?: string[] } = {}): Promise<string> => {
    const active = await db
      .prepare(
        `SELECT id FROM interviews WHERE application_id=? AND status IN ('scheduled','confirmed','pending_panel','panel_declined') AND scheduled_at>?`,
      )
      .bind(app.id, new Date().toISOString())
      .first();
    if (active)
      throw new HttpError(
        409,
        "Bu müraciət üçün aktiv müsahibə var. Onu dəyişdirin və ya ləğv edin.",
      );
    const people = opts.participants || [];
    await failOnConflicts({ scheduledAt: input.scheduledAt, durationMin: input.durationMin, jobId: app.job_id, candidateId: app.candidate_id, userIds: people.map((p) => p.userId) });
    const now = new Date().toISOString();
    const interviewId = crypto.randomUUID();
    const panelText = people.length ? people.map((p) => p.name).join(", ") : input.panel;
    // With colleagues to ask the interview first waits for them; otherwise the candidate is asked at once.
    const status = people.some((p) => p.userId !== userId) ? "pending_panel" : "scheduled";
    await db
      .prepare(
        `INSERT INTO interviews(id,application_id,job_id,company_id,candidate_id,scheduled_at,duration_min,kind,location,note,panel,slots,round,questions,status,created_by,created,updated)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .bind(
        interviewId,
        app.id,
        app.job_id,
        id,
        app.candidate_id,
        input.scheduledAt,
        input.durationMin,
        input.kind,
        input.location,
        input.note,
        panelText,
        JSON.stringify(input.slots),
        opts.round || "",
        JSON.stringify(opts.questions || []),
        status,
        userId,
        now,
        now,
      )
      .run();
    if (["Göndərildi", "Baxışda"].includes(app.status)) {
      await db
        .prepare(
          "UPDATE applications SET status='Müsahibə',updated=? WHERE id=?",
        )
        .bind(now, app.id)
        .run();
      await recordApplicationEvent(db, {
        applicationId: app.id,
        actorId: userId,
        actorRole: "company",
        type: "status",
        from: app.status,
        to: "Müsahibə",
      });
    }
    await recordApplicationEvent(db, {
      applicationId: app.id,
      actorId: userId,
      actorRole: "company",
      type: "interview",
      to: `${opts.round ? `${opts.round}: ` : ""}${bakuLocal(input.scheduledAt)} · ${interviewKindText(input)}`,
    });
    if (people.length) await askParticipants(interviewId, people, { title: app.title, candidate: opts.candidateName || "", scheduledAt: input.scheduledAt, durationMin: input.durationMin, round: opts.round || "", kindText: interviewKindText(input) });
    if (status === "scheduled") await inviteCandidate({ id: interviewId, application_id: app.id, candidate_id: app.candidate_id, scheduled_at: input.scheduledAt, duration_min: input.durationMin, kind: input.kind, location: input.location, panel: panelText, slots: JSON.stringify(input.slots), title: app.title });
    await companyAudit(
      db,
      id,
      userId,
      "interview-scheduled",
      app.id,
      bakuLocal(input.scheduledAt),
    );
    return interviewId;
  };
    {
    const r = await handle_hr_04({ INTERVIEW_COLUMNS, accountRole, askParticipants, conflictsOf, db, failOnConflicts, id, interviewKindText, interviewScope, inviteCandidate, loadGuideTemplates, loadPeople, memberGrants, memberRole, path, pickParticipants, request, requestUrl, scheduleFor, syncApplicationStatus, userId });
    if (r) return r;
  }
  // ---- Interview question guides: question lists a team reuses for one role or stage ----
    {
    const r = await handle_hr_05({ db, id, interviewScope, path, request, userId });
    if (r) return r;
  }
  // ---- Talent pool and bulk actions on applications ----
  // The candidate may be saved when they applied to one of the company's vacancies or keep an open profile.
  const savableCandidate = async (candidateId: string) => {
    const applied = await db
      .prepare(
        "SELECT a.job_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.candidate_id=? AND j.owner=? ORDER BY a.created DESC LIMIT 1",
      )
      .bind(candidateId, id)
      .first<{ job_id: string }>();
    if (applied) return { ok: true, jobId: applied.job_id };
    const open = await db
      .prepare(
        "SELECT 1 AS x FROM profiles p LEFT JOIN accounts a ON a.id=p.user_id WHERE p.user_id=? AND p.active='1' AND COALESCE(a.status,'active')='active'",
      )
      .bind(candidateId)
      .first();
    return { ok: !!open, jobId: "" };
  };
  const poolUpsert = async (
    candidateId: string,
    tags: string[],
    note: string,
    sourceJobId: string,
    merge: boolean,
  ) => {
    const now = new Date().toISOString();
    const existing = await db
      .prepare(
        "SELECT id,tags,note FROM talent_pool WHERE company_id=? AND candidate_id=?",
      )
      .bind(id, candidateId)
      .first<{ id: string; tags: string; note: string }>();
    if (existing) {
      let oldTags: string[] = [];
      try {
        oldTags = JSON.parse(existing.tags) as string[];
      } catch {
        oldTags = [];
      }
      const nextTags = merge ? sanitizeTags([...oldTags, ...tags]) : tags;
      await db
        .prepare("UPDATE talent_pool SET tags=?,note=?,updated=? WHERE id=?")
        .bind(
          JSON.stringify(nextTags),
          merge && !note ? existing.note : note,
          now,
          existing.id,
        )
        .run();
    } else {
      await db
        .prepare(
          "INSERT INTO talent_pool(id,company_id,candidate_id,tags,note,source_job_id,added_by,created,updated) VALUES(?,?,?,?,?,?,?,?,?)",
        )
        .bind(
          crypto.randomUUID(),
          id,
          candidateId,
          JSON.stringify(tags),
          note,
          sourceJobId,
          userId,
          now,
          now,
        )
        .run();
    }
  };
    {
    const r = await handle_hr_06({ assignTest, customSkillLabels, db, id, path, poolUpsert, reportScope, request, requestUrl, requesterName, requirePermission, savableCandidate, testsDenied, userId });
    if (r) return r;
  }
  // ---- Vacancy copy and templates ----
  const newDraftFrom = async (content: Partial<Job>) => {
    const draft = draftFromContent(content, {
      id: crypto.randomUUID(),
      owner: id,
      now: new Date().toISOString(),
    });
    if (!draft.company.trim()) draft.company = await companyDisplayName(db, id);
    await db
      .prepare("INSERT INTO drafts(id,owner,data,status) VALUES(?,?,?,'draft')")
      .bind(draft.id, id, JSON.stringify(draft))
      .run();
    return draft;
  };
    {
    const r = await handle_hr_07({ aiQuota, approvalRules, customSkillLabels, db, id, memberRole, newDraftFrom, path, reportScope, request, requestUrl, requirePermission, syncApplicationStatus, userId });
    if (r) return r;
  }
    {
    const r = await handle_job_status_01({ customSkillLabels, db, id, memberRole, path, request });
    if (r) return r;
  }
  throw new HttpError(404, "Səhifə tapılmadı.");
}
async function handle(request: Request) {
  try {
    return await route(request);
  } catch (e) {
    if (e instanceof HttpError) return ok({ error: e.message }, e.status);
    console.error(
      "JobMatch API failure",
      e instanceof Error ? e.message : "Unknown",
    );
    await logError(
      "server",
      e instanceof Error ? e.message : "Unknown",
      new URL(request.url).pathname,
    );
    return ok(
      { error: "Sorğu tamamlanmadı. Bir az sonra yenidən cəhd edin." },
      500,
    );
  }
}
export const GET = handle;
export const POST = handle;
