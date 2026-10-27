import { runtime } from "@/lib/server";
import { robotsTxt, siteUrl } from "@/lib/seo";

export function GET() {
  return new Response(robotsTxt(siteUrl(runtime().SITE_URL)), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
