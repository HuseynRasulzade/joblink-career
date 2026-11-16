// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { str } from "@/lib/server";
import { ok, staffPlaces } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_30(c: Pick<RouteCtx, "db" | "id" | "path" | "request" | "requestUrl" | "requirePermission" | "staffOverview">): Promise<Response | undefined> {
  const { db, id, path, request, requestUrl, requirePermission, staffOverview } = c;
  if (request.method === "GET" && path === "company/staff") {
    requirePermission("salaries", "Ştat cədvəlini yalnız HR, direktor və hesab sahibi görə bilər.");
    return ok(await staffOverview());
  }
  if (request.method === "GET" && path === "company/staff/places") {
    // The vacancy form asks how many places a department has left.
    requirePermission("salaries", "Ştat cədvəlini yalnız HR, direktor və hesab sahibi görə bilər.");
    const department = str(requestUrl.searchParams.get("department"), 120);
    return ok({ places: department ? await staffPlaces(db, id, department) : null });
  }
  return undefined;
}
