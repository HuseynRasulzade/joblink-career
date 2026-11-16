// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError, jsonBody, str } from "@/lib/server";
import { approveStep, editStep, returnStep, startFlow } from "@/lib/order-flow";
import { companyAudit } from "@/lib/api-core";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_28(c: Pick<RouteCtx, "afterSigned" | "applyDueOrderEffects" | "applyOrderEffect" | "cleanSigners" | "db" | "flowFail" | "id" | "loadOrder" | "mayActFor" | "orderKinds" | "path" | "registryRows" | "request" | "requesterName" | "requirePermission" | "revertOrderEffect" | "saveFlow" | "tellEmployee" | "userId" | "withEffects">): Promise<Response | undefined> {
  const { afterSigned, applyDueOrderEffects, applyOrderEffect, cleanSigners, db, flowFail, id, loadOrder, mayActFor, orderKinds, path, registryRows, request, requesterName, requirePermission, revertOrderEffect, saveFlow, tellEmployee, userId, withEffects } = c;
  if (request.method === "GET" && path === "company/orders/registry") {
    requirePermission("salaries", "Əmrlər reyestrini yalnız HR, direktor və hesab sahibi görə bilər.");
    await applyDueOrderEffects();
    return ok({ orders: await withEffects(await registryRows()) });
  }
  if (request.method === "POST" && path === "company/orders/effect/apply") {
    requirePermission("salaries", "Əmrin kartda tətbiqini yalnız əmr icazəsi olan şəxs edə bilər.");
    const b = await jsonBody(request);
    const result = await applyOrderEffect(str(b.orderId, 100), true, true);
    if (!result) throw new HttpError(409, "Bu əmr imzalanmayıb və ya kartda dəyişiklik yaratmır.");
    return ok({ ok: true, ...result });
  }
  if (request.method === "POST" && path === "company/orders/effect/revert") {
    requirePermission("salaries", "Əmrin kartda tətbiqini yalnız əmr icazəsi olan şəxs geri qaytara bilər.");
    const b = await jsonBody(request);
    await revertOrderEffect(str(b.orderId, 100), await requesterName());
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/orders/save") {
    requirePermission("salaries", "Əmrləri yalnız HR, direktor və hesab sahibi hazırlaya bilər.");
    const b = await jsonBody(request);
    const employee = await db
      .prepare("SELECT id,name FROM company_employees WHERE id=? AND company_id=? AND status<>'removed'")
      .bind(str(b.employeeId, 100), id)
      .first<{ id: string; name: string }>();
    if (!employee) throw new HttpError(404, "İşçi tapılmadı.");
    const kind = str(b.kind, 20);
    if (!orderKinds.includes(kind)) throw new HttpError(400, "Əmrin növü düzgün deyil.");
    const date = str(b.date, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Əmrin tarixini yazın.");
    const count = await db.prepare("SELECT COUNT(*) AS n FROM employee_orders WHERE company_id=? AND employee_id=?").bind(id, employee.id).first<{ n: number }>();
    if (Number(count?.n) >= 100) throw new HttpError(409, "Bir işçi üçün ən çox 100 əmr saxlamaq olar.");
    const gateId = str(b.requestId, 100);
    if (gateId) {
      const gate = await db.prepare("SELECT manager_status,manager_name FROM employee_requests WHERE id=? AND company_id=?").bind(gateId, id).first<{ manager_status: string; manager_name: string }>();
      if (gate?.manager_status === "pending") throw new HttpError(409, "Ərizə hələ birbaşa rəhbərin təsdiqini gözləyir. Rəhbər cavab verəndən sonra əmr hazırlanır.");
    }
    const input = JSON.stringify(b.input && typeof b.input === "object" ? b.input : {}).slice(0, 8000);
    const now = new Date().toISOString();
    const flow = startFlow(cleanSigners(b.signers), await requesterName(), now);
    const orderId = crypto.randomUUID();
    await db
      .prepare("INSERT INTO employee_orders(id,company_id,employee_id,kind,number,order_date,input,signers,status,holder,history,created_by,created,updated) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(orderId, id, employee.id, kind, str(b.number, 40), date, input, JSON.stringify(flow.signers), flow.status, flow.holder, JSON.stringify(flow.history), userId, now, now)
      .run();
    // An order drawn up from an application closes it.
    const requestId = str(b.requestId, 100);
    if (requestId) {
      const closed = await db
        .prepare("UPDATE employee_requests SET status='ordered',order_id=?,updated=? WHERE id=? AND company_id=? AND employee_id=? AND status='new'")
        .bind(orderId, now, requestId, id, employee.id)
        .run();
      if (closed.meta.changes) await tellEmployee(employee.id, "Ərizəniz əsasında əmr hazırlanır", `Əmr № ${str(b.number, 40) || "—"}: imza prosesindədir.`);
    }
    await companyAudit(db, id, userId, "order-created", employee.id, `${employee.name}: ${kind}${requestId ? " (ərizə əsasında)" : ""}`);
    // An order with no signers stands at once: its effects start now.
    if (flow.status === "signed") await afterSigned({ id: orderId, employeeId: employee.id, kind, number: str(b.number, 40), input: JSON.parse(input) });
    return ok({ ok: true, id: orderId }, 201);
  }
  if (request.method === "POST" && path === "company/orders/update") {
    requirePermission("salaries", "Əmrləri yalnız HR, direktor və hesab sahibi dəyişə bilər.");
    const b = await jsonBody(request);
    const order = await loadOrder(str(b.id, 100));
    const kind = str(b.kind, 20) || order.kind;
    if (!orderKinds.includes(kind)) throw new HttpError(400, "Əmrin növü düzgün deyil.");
    const date = str(b.date, 10) || order.date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Əmrin tarixini yazın.");
    const now = new Date().toISOString();
    const editor = await requesterName();
    const flow = flowFail(() => editStep(order, cleanSigners(b.signers), editor, now));
    await db
      .prepare("UPDATE employee_orders SET kind=?,number=?,order_date=?,input=? WHERE id=? AND company_id=?")
      .bind(kind, str(b.number, 40) || order.number, date, JSON.stringify(b.input && typeof b.input === "object" ? b.input : order.input).slice(0, 8000), order.id, id)
      .run();
    await saveFlow(order.id, flow, now);
    await companyAudit(db, id, userId, "order-edited", order.employeeId, `№ ${order.number}`);
    return ok({ ok: true });
  }
  if (request.method === "POST" && path === "company/orders/approve") {
    const b = await jsonBody(request);
    const order = await loadOrder(str(b.id, 100));
    const signer = order.signers.find((x) => x.role === str(b.role, 20));
    if (!signer) throw new HttpError(404, "İmzalayan tapılmadı.");
    if (signer.approvedAt) throw new HttpError(409, "Bu imza artıq təsdiqlənib.");
    const who = await mayActFor(signer.role, signer.name);
    const now = new Date().toISOString();
    const flow = flowFail(() => approveStep(order, signer.role, who, now));
    await saveFlow(order.id, flow, now);
    await companyAudit(db, id, userId, "order-approved", order.employeeId, `${signer.title}: ${signer.name} (${who})`);
    const marked = flow.status === "signed" ? await afterSigned(order) : 0;
    return ok({ ok: true, signed: flow.status === "signed", marked });
  }
  if (request.method === "POST" && path === "company/orders/return") {
    const b = await jsonBody(request);
    const order = await loadOrder(str(b.id, 100));
    const signer = order.signers.find((x) => x.role === str(b.role, 20));
    if (!signer) throw new HttpError(404, "İmzalayan tapılmadı.");
    const who = await mayActFor(signer.role, signer.name);
    const now = new Date().toISOString();
    const flow = flowFail(() => returnStep(order, signer.role, who, now, str(b.reason, 500)));
    await saveFlow(order.id, flow, now);
    await companyAudit(db, id, userId, "order-returned", order.employeeId, `${signer.title}: ${str(b.reason, 200)}`);
    return ok({ ok: true, holder: flow.holder });
  }
  if (request.method === "POST" && path === "company/orders/delete") {
    requirePermission("salaries", "Əmrləri yalnız HR, direktor və hesab sahibi silə bilər.");
    const b = await jsonBody(request);
    const result = await db.prepare("DELETE FROM employee_orders WHERE id=? AND company_id=? AND status<>'signed'").bind(str(b.id, 100), id).run();
    if (!result.meta.changes) throw new HttpError(409, "İmzalanmış əmr silinə bilməz.");
    // The application the order came from is open again.
    await db.prepare("UPDATE employee_requests SET status='new',order_id='',updated=? WHERE order_id=? AND company_id=?").bind(new Date().toISOString(), str(b.id, 100), id).run();
    return ok({ ok: true });
  }
  return undefined;
}
