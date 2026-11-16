// misc: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).
import { HttpError } from "@/lib/server";

import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_misc_01(c: Pick<RouteCtx, "accountRole" | "auditorOnly" | "memberRole" | "path" | "request">): Promise<Response | undefined> {
  const { accountRole, auditorOnly, memberRole, path, request } = c;
  if (accountRole === "company" && auditorOnly && request.method === "GET" && /^company\/payroll\/(bank(\/|$)|export$|report\/export$|payslip$)|^company\/(hr-report\/export|payroll\/accounting)/.test(path))
    throw new HttpError(403, "Auditor üçün bu fayl bağlıdır: şəxsi və bank məlumatları var.");
  if (accountRole === "company" && memberRole === "auditor" && request.method !== "GET" && path.startsWith("company/"))
    throw new HttpError(403, "Auditor rolu yalnız baxış üçündür: dəyişiklik edə bilməz.");
  return undefined;
}
