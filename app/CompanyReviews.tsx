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
