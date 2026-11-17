// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { type OrgKind, canonicalOrg, orgNameList } from "@/lib/staff-db";
import { bestCatalogMatch } from "@/lib/job-title-match";
import { canonicalOrgName, cleanOrgName } from "@/lib/org-names";
import { companyAudit } from "@/lib/api-core";
import { loadPlanData, ok, resolvePosition, saveStaffUnit, staffBandProblem } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_31(c: Pick<RouteCtx, "accountRole" | "canAct" | "db" | "id" | "path" | "planLocked" | "queueApproval" | "request" | "requestUrl" | "requesterName" | "requirePermission" | "unitInput" | "userId">): Promise<Response | undefined> {
  const { accountRole, canAct, db, id, path, planLocked, queueApproval, request, requestUrl, requesterName, requirePermission, unitInput, userId } = c;
  if (request.method === "POST" && path === "company/staff/request-place") {
    if (accountRole !== "company") throw new HttpError(403, "Bu əməliyyat üçün rolunuzun icazəsi yoxdur.");
    const b = await jsonBody(request);
    const branch = str(b.branch, 120).trim();
    const department = str(b.department, 120).trim();
    const section = str(b.section, 120).trim();
    const title = str(b.position, 120).trim();
    if (!department || !title) throw new HttpError(400, "Departamenti və vəzifəni yazın.");
    const plan = await loadPlanData(db, id);
    const canon = (v: string) => (bestCatalogMatch(v)?.title.label || v).trim().toLocaleLowerCase("az");
    const row = plan.units.find((u) => (u.branch || "").trim().toLocaleLowerCase("az") === branch.toLocaleLowerCase("az") && u.department.trim().toLocaleLowerCase("az") === department.toLocaleLowerCase("az") && canon(u.position) === canon(title) && (!section || !u.section || u.section.trim().toLocaleLowerCase("az") === section.toLocaleLowerCase("az")));
    const minCents = Math.max(0, Math.round((Number(b.salaryMin) || 0) * 100));
    const maxCents = Math.max(minCents, Math.round((Number(b.salaryMax) || 0) * 100));
    const unit = row
      ? { id: row.id, branch: row.branch, department: row.department, section: row.section, position: row.position, planned: row.planned + 1, rate: row.rate, salaryCents: Math.round(row.salaryMin * 100), salaryMaxCents: Math.round(row.salaryMax * 100), note: str((row as { note?: string }).note, 300) }
      : { id: "", branch, department, section, position: title, planned: 1, rate: 1, salaryCents: minCents, salaryMaxCents: maxCents, note: "Vakansiya üçün əlavə yer" };
    const problem = await staffBandProblem(db, id, [unit]);
    if (problem) throw new HttpError(409, problem);
    const subject = `Plana əlavə yer: ${department} / ${title}: ${unit.planned} ştat (vakansiya üçün)`;
    if (canAct("approve-director")) {
      await saveStaffUnit(db, id, unit.id, unit);
      await companyAudit(db, id, userId, "staff-unit", unit.id, subject);
      return ok({ ok: true, applied: true });
    }
    await queueApproval("headcount", subject, { unit });
    return ok({ ok: true, pending: true });
  }
  // ---- Out-of-plan requests: extra places, a wider pay band, or one person's pay above the band. They always carry a reason; a director
  // applies them at once, everybody else sends them to the approvals. ----
  if (request.method === "POST" && path === "company/staff/exception") {
    requirePermission("salaries", "Plandan kənar sorğunu yalnız HR, direktor və hesab sahibi göndərə bilər.");
    const b = await jsonBody(request);
    const kind = str(b.kind, 20);
    const reason = str(b.reason, 300).trim();
    if (reason.length < 5) throw new HttpError(400, "Səbəbi yazın (ən azı 5 simvol): plandan kənar addım əsaslandırılmalıdır.");
    const director = canAct("approve-director");
    const key = (v: unknown) => String(v || "").trim().toLocaleLowerCase("az");
    const mark = { exception: kind, reason };
    // Directly applied requests are written into the same list (as approved), so the history is in one place.
    const record = async (reqKind: "headcount" | "salary", subject: string, payload: Record<string, unknown>, status: "approved" | "pending") => {
      if (status === "pending") return queueApproval(reqKind, subject, payload);
      const now = new Date().toISOString();
      const name = await requesterName();
      await db.prepare("INSERT INTO approval_requests(id,company_id,kind,subject,payload,requested_by,requested_by_name,status,decided_by,decided_by_name,note,created,decided) VALUES(?,?,?,?,?,?,?,'approved',?,?,?,?,?)")
        .bind(crypto.randomUUID(), id, reqKind, subject.slice(0, 200), JSON.stringify(payload), userId, name, userId, name, "Birbaşa tətbiq olundu", now, now).run();
      return "";
    };
    if (kind === "employee-salary") {
      const emp = await db.prepare("SELECT name,salary_cents FROM company_employees WHERE id=? AND company_id=? AND status IN ('active','leave')").bind(str(b.employeeId, 100), id).first<{ name: string; salary_cents: number }>();
      if (!emp) throw new HttpError(404, "İşçi tapılmadı.");
      const salary = Math.round((Number(b.salary) || 0) * 100) / 100;
      if (!(salary > 0)) throw new HttpError(400, "Yeni maaşı yazın.");
      if (Math.round(salary * 100) === emp.salary_cents) throw new HttpError(400, "Yeni maaş hazırkı maaşla eynidir.");
      // The raise itself is applied by the approval (it does not check the staff band: that is the point of the exception).
      await queueApproval("salary", `${emp.name}: ${emp.salary_cents / 100} → ${salary} AZN (plandan kənar: ${reason})`.slice(0, 200), { employeeId: str(b.employeeId, 100), salary, ...mark });
      await companyAudit(db, id, userId, "staff-exception", str(b.employeeId, 100), `maaş artımı sorğusu: ${reason}`);
      return ok({ ok: true, pending: true });
    }
    const plan = await loadPlanData(db, id);
    let unit: { id: string; branch?: string; department: string; section: string; position: string; planned: number; rate?: number; salaryCents: number; salaryMaxCents?: number; note: string };
    let subject = "";
    if (kind === "places") {
      const input = unitInput(b);
      const extra = Math.max(1, Math.min(1000, Math.round(Number(b.extra) || 0)));
      if (!input.department || !input.position) throw new HttpError(400, "Departamenti və vəzifəni yazın.");
      const row = plan.units.find((u) => key(u.branch) === key(input.branch) && key(u.department) === key(input.department) && key(u.section) === key(input.section) && key(u.position) === key(input.position));
      unit = row
        ? { id: row.id, branch: row.branch, department: row.department, section: row.section, position: row.position, planned: row.planned + extra, rate: row.rate, salaryCents: Math.round(row.salaryMin * 100), salaryMaxCents: Math.round(row.salaryMax * 100), note: `Plandan kənar +${extra}: ${reason}` }
        : { id: "", branch: input.branch, department: input.department, section: input.section, position: input.position, planned: extra, rate: input.rate, salaryCents: input.salaryCents, salaryMaxCents: input.salaryMaxCents, note: `Plandan kənar: ${reason}` };
      subject = `Plandan kənar +${extra} yer: ${[input.branch, input.department, input.section, input.position].filter(Boolean).join(" / ")} (${reason})`;
    } else if (kind === "band") {
      const row = plan.units.find((u) => u.id === str(b.rowId, 100));
      if (!row) throw new HttpError(404, "Ştat sətri tapılmadı.");
      const min = Math.max(0, Math.round((Number(b.salaryMin) || 0) * 100));
      const max = Math.max(min, Math.round((Number(b.salaryMax) || 0) * 100));
      if (!min && !max) throw new HttpError(400, "Yeni maaş həddini yazın.");
      unit = { id: row.id, branch: row.branch, department: row.department, section: row.section, position: row.position, planned: row.planned, rate: row.rate, salaryCents: min, salaryMaxCents: max, note: `Maaş həddi artımı: ${reason}` };
      subject = `Maaş həddi artımı: ${row.department} / ${row.position}: ${min / 100}–${(max || min) / 100} AZN (${reason})`;
    } else throw new HttpError(400, "Sorğu növü yanlışdır.");
    const problem = await staffBandProblem(db, id, [unit]);
    if (problem) throw new HttpError(409, problem);
    if (director) {
      await saveStaffUnit(db, id, unit.id, unit);
      await record("headcount", subject, { unit, ...mark }, "approved");
      await companyAudit(db, id, userId, "staff-exception", unit.id, subject);
      return ok({ ok: true, applied: true });
    }
    await record("headcount", subject, { unit, ...mark }, "pending");
    await companyAudit(db, id, userId, "staff-exception", unit.id, `sorğu: ${subject}`);
    return ok({ ok: true, pending: true });
  }
  if (request.method === "GET" && path === "company/staff/exceptions") {
    requirePermission("salaries", "Plandan kənar sorğuları yalnız HR, direktor və hesab sahibi görə bilər.");
    const rows = await db.prepare("SELECT id,kind,subject,status,requested_by_name,decided_by_name,note,created,decided FROM approval_requests WHERE company_id=? AND payload LIKE '%\"exception\"%' ORDER BY created DESC LIMIT 60").bind(id).all<{ id: string; kind: string; subject: string; status: string; requested_by_name: string; decided_by_name: string; note: string; created: string; decided: string }>();
    return ok({ items: rows.results, canApplyDirectly: canAct("approve-director") });
  }
  if (request.method === "POST" && path === "company/staff/save") {
    requirePermission("salaries", "Ştat cədvəlini yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const unit = unitInput(b);
    if (!unit.department && !unit.position) throw new HttpError(400, "Departamenti və ya vəzifəni yazın.");
    if (!Number.isFinite(unit.planned)) throw new HttpError(400, "Ştat sayı düzgün deyil.");
    let unitId = str(b.id, 100);
    // The same branch, department, section and position is one row: saving it again changes that row instead of adding a second one.
    if (!unitId) {
      const same = (await loadPlanData(db, id)).units.find((u) => [["branch", unit.branch], ["department", unit.department], ["section", unit.section], ["position", unit.position]].every(([k, v]) => String((u as Record<string, unknown>)[k] || "").trim().toLocaleLowerCase("az") === String(v || "").trim().toLocaleLowerCase("az")));
      if (same) unitId = same.id;
    }
    const unitProblem = await staffBandProblem(db, id, [{ ...unit, id: unitId }]);
    if (unitProblem) throw new HttpError(409, unitProblem);
    if (await planLocked()) {
      await queueApproval("headcount", `${unit.department || "—"} / ${unit.position || "—"}: ${unit.planned} ştat`, { unit: { ...unit, id: unitId } });
      return ok({ ok: true, pending: true });
    }
    await saveStaffUnit(db, id, unitId, unit);
    await companyAudit(db, id, userId, "staff-unit", unitId, `${unit.department} / ${unit.section} / ${unit.position}: ${unit.planned}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/staff/delete") {
    requirePermission("salaries", "Ştat cədvəlini yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const unitId = str(b.id, 100);
    if (await planLocked()) {
      await queueApproval("headcount", `Ştat sətri silinir`, { unitDelete: unitId });
      return ok({ ok: true, pending: true });
    }
    await db.prepare("DELETE FROM staff_units WHERE id=? AND company_id=?").bind(unitId, id).run();
    await companyAudit(db, id, userId, "staff-unit-removed", unitId);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "company/org-names") {
    requirePermission("salaries", "Şöbə adlarını yalnız HR, direktor və hesab sahibi görə bilər.");
    const department = str(requestUrl.searchParams.get("department"), 120);
    const [departments, sections, positions] = await Promise.all([orgNameList(db, id, "department"), orgNameList(db, id, "section", department), orgNameList(db, id, "position")]);
    return ok({ departments, sections, positions });
  }
  if (request.method === "POST" && path === "company/org-names/add") {
    requirePermission("salaries", "Şöbə adlarını yalnız HR, direktor və hesab sahibi əlavə edə bilər.");
    const b = await jsonBody(request);
    const kind: OrgKind = b.kind === "section" ? "section" : b.kind === "position" ? "position" : "department";
    const name = cleanOrgName(str(b.name, 120));
    if (name.length < 2) throw new HttpError(400, "Adı yazın.");
    if (kind === "position") {
      const before = await orgNameList(db, id, "position");
      const resolved = await resolvePosition(db, id, name);
      return ok({
        name: resolved.name,
        existing: canonicalOrgName(before, resolved.name).existing,
        matched: resolved.matched,
        requested: resolved.requested,
        original: resolved.original,
      });
    }
    const parent = kind === "section" ? await canonicalOrg(db, id, "department", str(b.department, 120)) : "";
    const known = await orgNameList(db, id, kind, parent);
    const match = canonicalOrgName(known, name);
    if (match.existing) return ok({ name: match.name, existing: true });
    await canonicalOrg(db, id, kind, name, parent);
    await companyAudit(db, id, userId, "org-name-added", kind, name);
    return ok({ name, existing: false });
  }
  return undefined;
}
