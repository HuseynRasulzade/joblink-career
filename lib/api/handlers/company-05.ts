// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { companyAudit } from "@/lib/api-core";
import { greeting } from "@/lib/celebrations";
import { jsonBody, str } from "@/lib/server";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_05(c: Pick<RouteCtx, "celebrationList" | "celebrationsOn" | "db" | "id" | "ownWorkplace" | "path" | "request" | "requestUrl" | "requirePermission" | "tellEmployee" | "userId">): Promise<Response | undefined> {
  const { celebrationList, celebrationsOn, db, id, ownWorkplace, path, request, requestUrl, requirePermission, tellEmployee, userId } = c;
  if (request.method === "GET" && path === "company/celebrations") {
    requirePermission("salaries", "Ad günü və il dönümlərini yalnız kadr işçisi görə bilər.");
    return ok({ enabled: await celebrationsOn(id), items: await celebrationList(id, 30) });
  }
  if (request.method === "POST" && path === "company/celebrations/setting") {
    requirePermission("salaries", "Bu ayarı yalnız kadr işçisi dəyişə bilər.");
    const b = await jsonBody(request);
    await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,'celebrations',?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, b.enabled === true ? "on" : "off").run();
    await companyAudit(db, id, userId, "celebrations-setting", "", b.enabled === true ? "açıq" : "bağlı");
    return ok({ ok: true, enabled: b.enabled === true });
  }
  if (request.method === "GET" && path === "company/celebrations/run") {
    requirePermission("salaries", "Təbrikləri yalnız kadr işçisi göndərə bilər.");
    const today = new Date().toISOString().slice(0, 10);
    if (!(await celebrationsOn(id))) return ok({ sent: 0 });
    const marker = await db.prepare("SELECT value FROM hr_settings WHERE company_id=? AND key='celebrations_sent'").bind(id).first<{ value: string }>();
    if (marker?.value === today) return ok({ sent: 0 });
    let sent = 0;
    for (const c of (await celebrationList(id, 0)).filter((x) => x.days === 0)) {
      const g = greeting(c);
      await tellEmployee(c.employeeId, g.title, g.body);
      sent++;
    }
    await db.prepare("INSERT INTO hr_settings(company_id,key,value) VALUES(?,'celebrations_sent',?) ON CONFLICT(company_id,key) DO UPDATE SET value=excluded.value").bind(id, today).run();
    return ok({ sent });
  }
  if (request.method === "GET" && path === "employee/celebrations") {
    const employee = await ownWorkplace(str(requestUrl.searchParams.get("employeeId"), 100));
    if (!(await celebrationsOn(employee.company_id))) return ok({ enabled: false, items: [] });
    const items = (await celebrationList(employee.company_id, 30)).filter((c) => c.employeeId !== employee.id).map((c) => ({ name: c.name, kind: c.kind, date: c.date, days: c.days, years: c.years }));
    return ok({ enabled: true, items });
  }
  return undefined;
}
