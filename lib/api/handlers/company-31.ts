// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { type OrgKind, canonicalOrg, orgNameList } from "@/lib/staff-db";
import { bestCatalogMatch } from "@/lib/job-title-match";
import { canonicalOrgName, cleanOrgName } from "@/lib/org-names";
import { companyAudit } from "@/lib/api-core";
import { loadPlanData, ok, resolvePosition, saveStaffUnit, staffBandProblem } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_31(c: Pick<RouteCtx, "accountRole" | "canAct" | "db" | "id" | "path" | "planLocked" | "queueApproval" | "request" | "requestUrl" | "requirePermission" | "unitInput" | "userId">): Promise<Response | undefined> {
  const { accountRole, canAct, db, id, path, planLocked, queueApproval, request, requestUrl, requirePermission, unitInput, userId } = c;
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
  if (request.method === "POST" && path === "company/staff/save") {
    requirePermission("salaries", "Ştat cədvəlini yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const unit = unitInput(b);
    if (!unit.department && !unit.position) throw new HttpError(400, "Departamenti və ya vəzifəni yazın.");
    if (!Number.isFinite(unit.planned)) throw new HttpError(400, "Ştat sayı düzgün deyil.");
    const unitId = str(b.id, 100);
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
