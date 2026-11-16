// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).

import { TripRow, ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_15(c: Pick<RouteCtx, "db" | "id" | "path" | "request" | "requirePermission" | "tripView">): Promise<Response | undefined> {
  const { db, id, path, request, requirePermission, tripView } = c;
  if (request.method === "GET" && path === "company/trips") {
    requirePermission("salaries", "Ezamiyyətləri yalnız kadr işçisi görə bilər.");
    const [trips, expenses, people] = await Promise.all([
      db.prepare("SELECT id,employee_id,destination,purpose,start_date,end_date,daily_cents,advance_cents,status,requested_by,decided_by_name,settled_cents,abroad,manager_status,manager_name,manager_note FROM trips WHERE company_id=? ORDER BY start_date DESC LIMIT 300").bind(id).all<TripRow>(),
      db.prepare("SELECT id,trip_id,label,amount_cents,day FROM trip_expenses WHERE company_id=?").bind(id).all<{ id: string; trip_id: string; label: string; amount_cents: number; day: string }>(),
      db.prepare("SELECT id,name FROM company_employees WHERE company_id=? AND status<>'removed' ORDER BY name").bind(id).all<{ id: string; name: string }>(),
    ]);
    const names = new Map(people.results.map((p) => [p.id, p.name]));
    return ok({ employees: people.results, trips: trips.results.map((t) => tripView(t, names.get(t.employee_id) || "", expenses.results.filter((e) => e.trip_id === t.id))) });
  }
  return undefined;
}
