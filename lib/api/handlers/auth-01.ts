// auth: handlers of the JobMatch API (moved out of route.ts; the order of the checks is the order of the calls in route.ts).


import type { RouteCtx } from "@/lib/api/ctx";

export async function handle_auth_01(c: Pick<RouteCtx, "path" | "request">): Promise<Response | undefined> {
  const { path, request } = c;
  if (path.startsWith("auth/")) {
    const { authRoute } = await import("@/lib/external-auth");
    return authRoute(request, path);
  }
  return undefined;
}
