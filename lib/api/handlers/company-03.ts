// company: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { ATTENDANCE_CODES, knownReligiousYears } from "@/lib/calendar-az";
import { ok } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_company_03(c: Pick<RouteCtx, "attendanceData" | "path" | "request" | "requirePermission">): Promise<Response | undefined> {
  const { attendanceData, path, request, requirePermission } = c;
  if (request.method === "GET" && path === "company/attendance") {
    requirePermission("salaries", "Davamiyyəti yalnız HR, direktor və hesab sahibi görə bilər.");
    return ok({ ...(await attendanceData()), codes: ATTENDANCE_CODES, years: knownReligiousYears() });
  }
  return undefined;
}
