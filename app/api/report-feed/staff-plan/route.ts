import { runtime } from "@/lib/server";
import { loadPlanData } from "@/lib/api/shared";
import { staffPlanCsv, tokenHash } from "@/lib/report-feed";

export const dynamic = "force-dynamic";

// The staff plan as CSV for Power BI or Excel (Data → From web). The company's feed key goes in the Authorization header
// (Bearer …) or in ?token=…; the key is kept only as a hash, can be replaced or revoked, and the file holds no names or personal pay.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const bearer = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const token = bearer || url.searchParams.get("token") || "";
  const denied = () => new Response("Açar yanlışdır və ya ləğv edilib.", { status: 401, headers: { "Cache-Control": "no-store" } });
  if (!/^jmr_[A-Za-z0-9_-]{40,}$/.test(token)) return denied();
  const db = runtime().DB;
  const row = await db.prepare("SELECT company_id FROM report_tokens WHERE token_hash=?").bind(await tokenHash(token)).first<{ company_id: string }>().catch(() => null);
  if (!row) return denied();
  await db.prepare("UPDATE report_tokens SET last_used=? WHERE company_id=?").bind(new Date().toISOString(), row.company_id).run().catch(() => undefined);
  const plan = await loadPlanData(db, row.company_id);
  const csv = staffPlanCsv(plan.units, plan.people, new Date().toISOString().slice(0, 7));
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'inline; filename="stat-plani.csv"', "Cache-Control": "no-store" } });
}
