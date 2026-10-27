// Pages that are the same for everyone can be answered from Cloudflare's cache,
// which costs the Worker almost no CPU. (The Cache API only stores on a custom
// domain; on *.workers.dev it quietly does nothing, so this is safe either way.)
// Seconds the edge may keep the page; 0 means never cache.
export function edgeCacheSeconds(method: string, pathname: string, search: string) {
  if (method !== "GET" || search) return 0;
  if (pathname === "/robots.txt") return 3600;
  if (pathname === "/sitemap.xml") return 600;
  if (pathname === "/jobs" || /^\/jobs\/[^/]+$/.test(pathname) || pathname === "/") return 300;
  return 0;
}
// A response that sets a cookie or varies by person must not be shared.
export const cacheable = (response: Response) =>
  response.status === 200 && !response.headers.has("set-cookie") && !response.headers.has("vary-cookie");
