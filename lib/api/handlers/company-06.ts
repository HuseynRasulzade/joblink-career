// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { EXIT_QUESTIONS, cleanAnswers as cleanExitAnswers } from "@/lib/offboarding";
import { HttpError, jsonBody, str } from "@/lib/server";
import { companyAudit, notify } from "@/lib/api-core";
import { quiet } from "@/lib/quiet";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_06(c: Pick<RouteCtx, "db" | "id" | "ownWorkplace" | "path" | "photoOf" | "request" | "requestUrl" | "requirePermission" | "savePhoto" | "userId">): Promise<Response | undefined> {
  const { db, id, ownWorkplace, path, photoOf, request, requestUrl, requirePermission, savePhoto, userId } = c;
  if (request.method === "GET" && path === "company/employees/photo") {
    requirePermission("salaries", "Şəkli yalnız şəxsi məlumat icazəsi olan şəxs görə bilər.");
    return ok({ image: await photoOf(id, str(requestUrl.searchParams.get("id"), 100)) });
  }
  if (request.method === "POST" && path === "company/employees/photo") {
    requirePermission("salaries", "Şəkli yalnız şəxsi məlumat icazəsi olan şəxs dəyişə bilər.");
    const b = await jsonBody(request);
    const employee = await db.prepare("SELECT id,name FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'").bind(str(b.id, 100), id).first<{ id: string; name: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    await savePhoto(id, employee.id, b.image, userId);
    await companyAudit(db, id, userId, "employee-photo", employee.id, employee.name);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/employees/photo/delete") {
    requirePermission("salaries", "Şəkli yalnız şəxsi məlumat icazəsi olan şəxs silə bilər.");
    const b = await jsonBody(request);
    await db.prepare("DELETE FROM employee_photos WHERE employee_id=? AND company_id=?").bind(str(b.id, 100), id).run();
    await companyAudit(db, id, userId, "employee-photo-removed", str(b.id, 100), "");
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "employee/photo") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    return ok({ image: await photoOf(employee.company_id, employee.id) });
  }
  if (request.method === "POST" && path === "employee/photo") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    await savePhoto(employee.company_id, employee.id, b.image, userId);
    await companyAudit(db, employee.company_id, userId, "employee-photo", employee.id, `${employee.name}: şəkli özü yüklədi`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "employee/photo/delete") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    await db.prepare("DELETE FROM employee_photos WHERE employee_id=? AND company_id=?").bind(employee.id, employee.company_id).run();
    await companyAudit(db, employee.company_id, userId, "employee-photo-removed", employee.id, `${employee.name}: şəkli özü sildi`);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "employee/assets") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const rows = await db.prepare("SELECT a.id,a.issued_on,a.returned_on,a.condition_out,a.ack_issued_at,s.name,s.serial,s.inventory_no FROM asset_assignments a JOIN assets s ON s.id=a.asset_id WHERE a.company_id=? AND a.employee_id=? ORDER BY a.issued_on DESC").bind(employee.company_id, employee.id).all<{ id: string; issued_on: string; returned_on: string; condition_out: string; ack_issued_at: string; name: string; serial: string; inventory_no: string }>();
    return ok({ items: rows.results.map((r) => ({ id: r.id, name: r.name, serial: r.serial, inventoryNo: r.inventory_no, issuedOn: r.issued_on, returnedOn: r.returned_on, condition: r.condition_out, ackedAt: r.ack_issued_at })) });
  }
  if (request.method === "POST" && path === "employee/assets/ack") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const done = await db.prepare("UPDATE asset_assignments SET ack_issued_at=? WHERE id=? AND company_id=? AND employee_id=? AND ack_issued_at=''").bind(new Date().toISOString(), str(b.assignmentId, 100), employee.company_id, employee.id).run();
    if (!done.meta.changes) throw new HttpError(404, "Təsdiq ediləcək verilmə qeydi tapılmadı və ya artıq təsdiq edilib.");
    await companyAudit(db, employee.company_id, userId, "asset-acked", employee.id, `${employee.name}: əmlakın təhvil alınması təsdiq edildi`);
    return ok({ ok: true });
  }
  if (request.method === "GET" && path === "employee/offboarding") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    const row = await db.prepare("SELECT status,exit_interview FROM offboarding_cases WHERE company_id=? AND employee_id=?").bind(employee.company_id, employee.id).first<{ status: string; exit_interview: string }>();
    if (!row || row.status !== "open") return ok({ open: false, questions: [], answers: {} });
    let answers: Record<string, string> = {};
    try {
      answers = JSON.parse(row.exit_interview || "{}");
    } catch {
      answers = {};
    }
    return ok({ open: true, questions: EXIT_QUESTIONS, answers });
  }
  if (request.method === "POST" && path === "employee/offboarding/interview") {
    const b = await jsonBody(request);
    const employee = await ownWorkplace(str(b.employeeId, 100));
    const res = await db.prepare("UPDATE offboarding_cases SET exit_interview=? WHERE company_id=? AND employee_id=? AND status='open'").bind(JSON.stringify(cleanExitAnswers(b.answers)), employee.company_id, employee.id).run();
    if (!res.meta.changes) throw new HttpError(404, "Çıxış prosesi açıq deyil.");
    await notify(db, { userId: employee.company_id, type: "employee", title: `${employee.name} çıxış müsahibəsini doldurdu`, body: "Cavablar çıxış prosesi bölməsindədir.", link: "hr-people-ops" }).catch((error) => quiet("route-best-effort", error));
    return ok({ ok: true });
  }
  return undefined;
}
