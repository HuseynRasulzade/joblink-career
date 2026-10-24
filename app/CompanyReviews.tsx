"use client";
import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { siteLanguage } from "./i18n";

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Sorğu tamamlanmadı.");
  return data;
}

const Stars = ({ value }: { value: number }) => (
  <span aria-label={`${value} / 5`} style={{ color: "#d97706", whiteSpace: "nowrap" }}>
    {[1, 2, 3, 4, 5].map((n) => <Star key={n} size={14} fill={n <= Math.round(value) ? "currentColor" : "none"} />)}
  </span>
);

type Summary = { count: number; average: number | null; distribution: number[] };
type Mine = { rating: number; title: string; body: string; status: string; admin_note: string } | null;

// Public reviews of a company, and the form for a candidate who applied there.
export function CompanyReviews({ companyId, signedIn, isCandidate, notify }: { companyId: string; signedIn: boolean; isCandidate: boolean; notify: (m: string) => void }) {
  const [data, setData] = useState<{ reviews: { rating: number; title: string; body: string; created: string }[]; summary: Summary; mine: Mine; canReview: boolean } | null>(null);
  const [form, setForm] = useState({ rating: 5, title: "", body: "" });
  const [open, setOpen] = useState(false);
  const load = useCallback(() => request<NonNullable<typeof data>>(`companies/reviews?companyId=${encodeURIComponent(companyId)}`).then(setData).catch(() => {}), [companyId]);
  useEffect(() => { void load(); }, [load]);
  if (!data) return null;
  return (
    <section className="company-reviews">
      <h3>Rəylər {data.summary.average !== null && <><Stars value={data.summary.average} /> <small>{data.summary.average} · {data.summary.count} rəy</small></>}</h3>
      {data.reviews.map((r, i) => (
        <article key={i} className="repeat-card">
          <Stars value={r.rating} /> <b>{r.title}</b>
          <p>{r.body}</p>
          <small className="muted">Namizəd · {formatDate(r.created, siteLanguage(), { year: true })}</small>
        </article>
      ))}
      {!data.reviews.length && <p className="muted">Hələ dərc olunmuş rəy yoxdur.</p>}
      {signedIn && isCandidate && data.mine && (
        <p className="muted fine-print">
          Sizin rəyiniz: {data.mine.status === "pending" ? "yoxlanılır" : data.mine.status === "approved" ? "dərc edilib" : `dərc edilməyib (${data.mine.admin_note})`}.
        </p>
      )}
      {signedIn && isCandidate && data.canReview && (
        open ? (
          <div className="offer-composer">
            <label className="field"><span>Qiymət</span>
              <select value={form.rating} onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ulduz</option>)}</select>
            </label>
            <label className="field"><span>Başlıq (istəyə bağlı)</span><input maxLength={100} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label className="field"><span>Rəyiniz (nə yaxşı, nə pis idi; ən azı 20 simvol)</span><textarea rows={4} maxLength={1500} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
            <p className="muted fine-print">Rəy adınız göstərilmədən dərc olunur və əvvəlcə administrator tərəfindən yoxlanılır. Təhqir, şəxsi məlumat və yalan iddialar dərc edilmir.</p>
            <button
              className="primary"
              onClick={async () => {
                try {
                  await request("companies/review", { companyId, ...form });
                  notify("Rəyiniz yoxlamaya göndərildi.");
                  setOpen(false);
                  await load();
                } catch (error) {
                  notify((error as Error).message);
                }
              }}
            >
              Göndər
            </button>
          </div>
        ) : (
          <button className="secondary" onClick={() => { if (data.mine) setForm({ rating: data.mine.rating, title: data.mine.title, body: data.mine.body }); setOpen(true); }}>
            {data.mine ? "Rəyi dəyiş" : "Rəy yaz"}
          </button>
        )
      )}
    </section>
  );
}

type Pending = { id: string; rating: number; title: string; body: string; status: string; admin_note: string; created: string; company: string };
export function AdminReviews({ notify }: { notify: (m: string) => void }) {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState<Pending[]>([]);
  const load = useCallback(() => request<{ reviews: Pending[] }>(`admin/reviews?status=${status}`).then((d) => setItems(d.reviews)).catch((e) => notify((e as Error).message)), [status, notify]);
  useEffect(() => { void load(); }, [load]);
  const decide = async (id: string, decision: "approve" | "reject") => {
    const note = decision === "reject" ? window.prompt("Rədd səbəbi (rəy sahibinə göstəriləcək):") : "";
    if (decision === "reject" && !note) return;
    try { await request("admin/reviews/decide", { id, decision, note }); await load(); } catch (error) { notify((error as Error).message); }
  };
  return (
    <div className="company-page">
      <div className="admin-actions">
        {["pending", "approved", "rejected"].map((s) => <button key={s} className={status === s ? "primary" : "secondary"} onClick={() => setStatus(s)}>{{ pending: "Gözləyən", approved: "Dərc olunmuş", rejected: "Rədd edilmiş" }[s]}</button>)}
      </div>
      {items.map((r) => (
        <article key={r.id} className="panel">
          <h3>{r.company} <Stars value={r.rating} /></h3>
          {r.title && <b>{r.title}</b>}
          <p>{r.body}</p>
          <small className="muted">{formatDate(r.created, siteLanguage(), { time: true })}{r.admin_note ? ` · ${r.admin_note}` : ""}</small>
          <div className="admin-actions">
            {r.status !== "approved" && <button className="primary" onClick={() => decide(r.id, "approve")}>Dərc et</button>}
            {r.status !== "rejected" && <button onClick={() => decide(r.id, "reject")}>Rədd et</button>}
          </div>
        </article>
      ))}
      {!items.length && <p className="admin-empty">Bu bölmədə rəy yoxdur.</p>}
    </div>
  );
}

type UsageRow = { calls: number; errors: number; tokens: number; cost: number };
type AiUsage = { days: number; total: UsageRow; byFeature: (UsageRow & { feature: string })[]; byProvider: (UsageRow & { provider: string })[]; byDay: (UsageRow & { day: string })[]; byUser: (UsageRow & { user: string })[] };
const FEATURE_LABEL: Record<string, string> = { "cv-parse": "CV oxuma", "cv-audit": "CV yoxlama mərhələsi", "cv-visual": "Vizual CV analizi", assistant: "AI köməkçi", "vacancy-draft": "Vakansiya qaralaması", "job-title-map": "Vəzifə adının tapılması", "doc-check": "Sənəd yoxlaması", "test-parse": "Test faylının oxunması", other: "Digər" };
// AI calls, tokens and an estimated cost: by feature, provider, day and person.
export function AdminAiUsage({ notify }: { notify: (m: string) => void }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AiUsage | null>(null);
  useEffect(() => { request<AiUsage>(`admin/ai-usage?days=${days}`).then(setData).catch((e) => notify((e as Error).message)); }, [days, notify]);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const table = (heads: string[], rows: (string | number)[][]) => (
    <div className="admin-table-wrap"><table className="admin-table"><thead><tr>{heads.map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}{!rows.length && <tr><td colSpan={heads.length}><p className="admin-empty">Məlumat yoxdur.</p></td></tr>}</tbody></table></div>
  );
  const line = (x: UsageRow) => [x.calls, x.errors, x.tokens.toLocaleString("az-AZ"), `$${x.cost.toFixed(2)}`];
  return (
    <div className="company-page">
      <div className="admin-actions">{[7, 30, 90].map((d) => <button key={d} className={days === d ? "primary" : "secondary"} onClick={() => setDays(d)}>Son {d} gün</button>)}</div>
      <div className="kpi-grid">
        <div className="kpi"><small>AI sorğuları</small><strong>{data.total.calls}</strong><span>{data.total.errors} xəta</span></div>
        <div className="kpi"><small>Təxmini token</small><strong>{data.total.tokens.toLocaleString("az-AZ")}</strong></div>
        <div className="kpi"><small>Təxmini xərc</small><strong>${data.total.cost.toFixed(2)}</strong><span>qiymətlər təxminidir</span></div>
      </div>
      <h3>Funksiya üzrə</h3>
      {table(["Funksiya", "Sorğu", "Xəta", "Token", "Xərc"], data.byFeature.map((f) => [FEATURE_LABEL[f.feature] || f.feature, ...line(f)]))}
      <h3>Provayder üzrə</h3>
      {table(["Provayder", "Sorğu", "Xəta", "Token", "Xərc"], data.byProvider.map((f) => [f.provider, ...line(f)]))}
      <h3>İstifadəçi üzrə (ən çox 20)</h3>
      {table(["İstifadəçi", "Sorğu", "Xəta", "Token", "Xərc"], data.byUser.map((f) => [f.user, ...line(f)]))}
      <h3>Gün üzrə</h3>
      {table(["Gün", "Sorğu", "Xəta", "Token", "Xərc"], data.byDay.map((f) => [f.day, ...line(f)]))}
      <p className="muted fine-print">Xərc simvol sayından (təxminən 4 simvol = 1 token) və `lib/ai-cost.ts`-dəki qiymətlərdən hesablanır; provayderin real hesabı ilə yoxlayın. Sorğu mətnləri saxlanılmır, yalnız say və ölçü.</p>
    </div>
  );
}

type Ops = { errors: { source: string; message: string; where_at: string; count: number; last: string }[]; privacy: { kind: string; role: string; created: string }[]; privacyTotals: Record<string, number> };
// Error log (last 7 days, grouped), data export/deletion requests and the full audit export.
export function AdminOps({ notify }: { notify: (m: string) => void }) {
  const [data, setData] = useState<Ops | null>(null);
  useEffect(() => { request<Ops>("admin/ops").then(setData).catch((e) => notify((e as Error).message)); }, [notify]);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const roleLabel = (r: string) => (r === "company" ? "şirkət" : r === "admin" ? "admin" : "namizəd");
  return (
    <div className="company-page">
      <div className="kpi-grid">
        <div className="kpi"><small>Məlumat ixracı sorğuları</small><strong>{data.privacyTotals.export || 0}</strong></div>
        <div className="kpi"><small>Hesab silmə sorğuları</small><strong>{data.privacyTotals.delete || 0}</strong></div>
        <div className="kpi"><small>Xəta növləri (7 gün)</small><strong>{data.errors.length}</strong></div>
      </div>
      <div className="admin-actions">{/* eslint-disable-next-line @next/next/no-html-link-for-pages */}<a className="secondary" href="/api/joblink/admin/audit-export" download>Audit jurnalını Excel-ə yüklə</a></div>
      <h3>Xəta jurnalı (son 7 gün)</h3>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Mənbə</th><th>Mesaj</th><th>Yer</th><th>Say</th><th>Sonuncu</th></tr></thead>
        <tbody>
          {data.errors.map((e, i) => <tr key={i}><td>{e.source === "server" ? "Server" : "Brauzer"}</td><td>{e.message}</td><td>{e.where_at}</td><td>{e.count}</td><td>{formatDate(e.last, siteLanguage(), { time: true })}</td></tr>)}
          {!data.errors.length && <tr><td colSpan={5}><p className="admin-empty">Xəta qeydə alınmayıb.</p></td></tr>}
        </tbody>
      </table></div>
      <h3>Şəxsi məlumat sorğuları</h3>
      <p className="muted fine-print">Hər istifadəçi məlumatını “Hesab” bölməsindən özü yükləyir və ya hesabını silir; burada yalnız sorğunun növü, rolu və tarixi qalır (şəxs yox).</p>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Tarix</th><th>Növ</th><th>Rol</th></tr></thead>
        <tbody>
          {data.privacy.map((p, i) => <tr key={i}><td>{formatDate(p.created, siteLanguage(), { time: true })}</td><td>{p.kind === "export" ? "Məlumat ixracı" : "Hesabın silinməsi"}</td><td>{roleLabel(p.role)}</td></tr>)}
          {!data.privacy.length && <tr><td colSpan={3}><p className="admin-empty">Hələ sorğu yoxdur.</p></td></tr>}
        </tbody>
      </table></div>
      <h3>Ehtiyat nüsxə</h3>
      <p className="muted fine-print">Verilənlər bazası Cloudflare D1-dədir. D1 “Time Travel” ilə son 30 günün istənilən anına bərpa mümkündür (Cloudflare panelində: Workers &amp; Pages → D1 → joblink-career-db → Time Travel). Bu saytdan avtomatik nüsxə çıxarılmır.</p>
    </div>
  );
}
