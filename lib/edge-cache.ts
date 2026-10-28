// Files that are the same for everyone can be answered from Cloudflare's cache,
// which costs the Worker almost no CPU. Pages that load the site's own scripts and
// styles must never be cached: every deploy renames those files and removes the old
// ones, so a cached page would point at files that no longer exist (the site would
// stay on "Yüklənir…" until the cache expired).
// Seconds the edge may keep the file; 0 means never cache.
export function edgeCacheSeconds(method: string, pathname: string, search: string) {
  if (method !== "GET" || search) return 0;
  if (pathname === "/robots.txt") return 3600;
  if (pathname === "/sitemap.xml") return 600;
  return 0;
}
// A response that sets a cookie or varies by person must not be shared.
export const cacheable = (response: Response) =>
  response.status === 200 && !response.headers.has("set-cookie") && !response.headers.has("vary-cookie");
