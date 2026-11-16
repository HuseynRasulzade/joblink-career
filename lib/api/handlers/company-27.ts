// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { str } from "@/lib/server";
import { OrderDbRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_27(c: Pick<RouteCtx, "ORDER_COLUMNS" | "applyDueOrderEffects" | "db" | "id" | "orderRow" | "path" | "request" | "requestUrl" | "requirePermission" | "withEffects">): Promise<Response | undefined> {
  const { ORDER_COLUMNS, applyDueOrderEffects, db, id, orderRow, path, request, requestUrl, requirePermission, withEffects } = c;
  if (request.method === "GET" && path === "company/orders") {
    requirePermission("salaries", "Əmrləri yalnız HR, direktor və hesab sahibi görə bilər.");
    const rows = await db
      .prepare(`SELECT ${ORDER_COLUMNS} FROM employee_orders o WHERE o.company_id=? AND o.employee_id=? ORDER BY o.created DESC LIMIT 100`)
      .bind(id, str(requestUrl.searchParams.get("employeeId"), 100))
      .all<OrderDbRow>();
    await applyDueOrderEffects();
    return ok({ orders: await withEffects(rows.results.map(orderRow)) });
  }
  return undefined;
}
