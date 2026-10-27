import { runtime } from "@/lib/server";
import { OPEN_VACANCIES_SQL, siteUrl, sitemapXml } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await runtime()
    .DB.prepare(`${OPEN_VACANCIES_SQL} ORDER BY j.created DESC LIMIT 2000`)
    .all<{ id: string; created: string }>()
    .catch(() => ({ results: [] as { id: string; created: string }[] }));
  return new Response(sitemapXml(siteUrl(runtime().SITE_URL), rows.results), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
