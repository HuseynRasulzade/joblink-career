// admin: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).

import { dropSharedLists } from "@/lib/api/shared";
import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_admin_01(c: Pick<RouteCtx, "path" | "request">): Promise<Response | undefined> {
  const { path, request } = c;
  if (request.method !== "GET" && path.startsWith("admin/")) dropSharedLists();
  return undefined;
}
