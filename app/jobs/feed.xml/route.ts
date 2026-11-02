import { runtime } from "@/lib/server";
import { OPEN_VACANCIES_SQL, plainText, publicVacancy, siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// A public feed of the open vacancies for job boards and aggregators that read XML: title, company, place, salary, text and the link.
export async function GET() {
  const origin = siteUrl(runtime().SITE_URL);
  const rows = await runtime()
    .DB.prepare(`${OPEN_VACANCIES_SQL} ORDER BY j.created DESC LIMIT 1000`)
    .all<{ id: string; data: string; created: string }>()
    .catch(() => ({ results: [] as { id: string; data: string; created: string }[] }));
  const items = rows.results.flatMap((r) => {
    try {
      const v = publicVacancy(r.id, JSON.parse(r.data) as Record<string, unknown>, r.created);
      if (!v.title) return [];
      return [
        `<job><id>${esc(v.id)}</id><title>${esc(v.title)}</title><company>${esc(v.company)}</company><city>${esc(v.city)}</city><mode>${esc(v.mode)}</mode><type>${esc(v.type)}</type><category>${esc(v.category)}</category>` +
          `<salary_min>${v.minSalary || ""}</salary_min><salary_max>${v.maxSalary || ""}</salary_max><currency>AZN</currency><posted>${esc(v.created.slice(0, 10))}</posted><deadline>${esc(v.deadline)}</deadline>` +
          `<description>${esc(plainText(v.description, 3000))}</description><requirements>${esc(plainText(v.requirements, 2000))}</requirements><url>${esc(`${origin}/jobs/${v.id}`)}</url></job>`,
      ];
    } catch {
      return [];
    }
  });
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<jobs source="Joblink" generated="${new Date().toISOString()}">${items.join("")}</jobs>`, {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900" },
  });
}
