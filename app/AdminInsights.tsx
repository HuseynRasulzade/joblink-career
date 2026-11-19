"use client";
import { useCallback, useEffect, useState } from "react";
import { Activity, BarChart3, CheckCircle2, AlertTriangle, XCircle, Megaphone } from "lucide-react";

type Api = (path: string, body?: unknown) => Promise<unknown>;
type Props = { api: Api; notify: (message: string) => void };

type Metrics = {
  perDay: { day: string; company: number; candidate: number }[];
  totals: { companies: number; candidates: number };
  funnel: { company: { label: string; n: number }[]; candidate: { label: string; n: number }[] };
  invoices: { month: string; count: number; issuedAzn: number; paidAzn: number }[];
  mrr: { companyAzn: number; candidateAzn: number; hrActive: number; byPackage: Record<string, number>; byPlan: Record<string, number>; note: string };
};
const azn = (n: number) => `${n.toLocaleString("az-AZ", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₼`;

function Funnel({ title, rows }: { title: string; rows: { label: string; n: number }[] }) {
  const top = Math.max(1, rows[0]?.n || 1);
  return (
    <div>
      <h4>{title}</h4>
      {rows.map((r, i) => (
        <div key={r.label} style={{ margin: "8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>{r.label}</span>
            <b>{r.n}{i > 0 && rows[0].n > 0 ? ` · ${Math.round((r.n / rows[0].n) * 100)}%` : ""}</b>
          </div>
          <div style={{ height: 10, borderRadius: 6, background: "rgba(127,127,127,0.18)", overflow: "hidden" }}>
            <div style={{ width: `${Math.max(2, (r.n / top) * 100)}%`, height: "100%", background: "var(--teal, #147b70)", borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Admin page: registrations, the funnel from sign-up to payment, invoices by month and the monthly revenue the packages in force stand for.
export function AdminMetrics({ api, notify }: Props) {
  const [data, setData] = useState<Metrics | null>(null);
  useEffect(() => {
    (api("admin/metrics") as Promise<Metrics>).then(setData).catch((e) => notify((e as Error).message));
  }, [api, notify]);
  if (!data) return <p className="muted loading-line">Yüklənir…</p>;
  const max = Math.max(1, ...data.perDay.map((d) => d.company + d.candidate));
  const total30 = data.perDay.reduce((s, d) => s + d.company + d.candidate, 0);
  return (
    <div className="company-page">
      <section className="panel">
        <h3><BarChart3 size={18} /> Gəlir və göstəricilər</h3>
        <div className="kpi-grid">
          <div className="kpi"><small>Aylıq təxmini gəlir (ƏDV-siz)</small><strong>{azn(data.mrr.companyAzn + data.mrr.candidateAzn)}</strong><span className="muted">şirkətlər {azn(data.mrr.companyAzn)} · namizədlər {azn(data.mrr.candidateAzn)}</span></div>
          <div className="kpi"><small>Aktiv Kadr modulu</small><strong>{data.mrr.hrActive}</strong><span className="muted">alınmış və müddəti bitməmiş</span></div>
          <div className="kpi"><small>Şirkət / namizəd</small><strong>{data.totals.companies} / {data.totals.candidates}</strong><span className="muted">son 30 gündə {total30} yeni</span></div>
        </div>
        <p className="muted fine-print">{data.mrr.note}</p>
      </section>
      <section className="panel">
        <h3>Son 30 gün: yeni qeydiyyatlar</h3>
        <svg viewBox="0 0 600 120" role="img" aria-label="Gündəlik qeydiyyat sütunları" style={{ width: "100%", height: 130 }}>
          {data.perDay.map((d, i) => {
            const w = 600 / data.perDay.length;
            const hCandidate = (d.candidate / max) * 100;
            const hCompany = (d.company / max) * 100;
            return (
              <g key={d.day}>
                <title>{`${d.day}: ${d.company} şirkət, ${d.candidate} namizəd`}</title>
                <rect x={i * w + 2} y={110 - hCandidate} width={w - 4} height={hCandidate} rx={2} fill="#ff9a5c" />
                <rect x={i * w + 2} y={110 - hCandidate - hCompany} width={w - 4} height={hCompany} rx={2} fill="#2aa595" />
              </g>
            );
          })}
        </svg>
        <p className="muted fine-print"><span style={{ color: "#2aa595" }}>■</span> şirkət &nbsp; <span style={{ color: "#ff9a5c" }}>■</span> namizəd</p>
      </section>
      <section className="panel">
        <h3>Huni: qeydiyyatdan ödənişə</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 28 }}>
          <Funnel title="Şirkətlər" rows={data.funnel.company} />
          <Funnel title="Namizədlər" rows={data.funnel.candidate} />
        </div>
      </section>
      <section className="panel">
        <h3>Hesab-fakturalar (ƏDV daxil)</h3>
        {!data.invoices.length ? (
          <p className="admin-empty">Hələ hesab-faktura yoxdur.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Ay</th><th>Say</th><th>Kəsilib</th><th>Ödənilib</th><th>Gözləyir</th></tr></thead>
              <tbody>
                {data.invoices.map((r) => (
                  <tr key={r.month}><td>{r.month}</td><td>{r.count}</td><td>{azn(r.issuedAzn)}</td><td>{azn(r.paidAzn)}</td><td>{azn(Math.max(0, r.issuedAzn - r.paidAzn))}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type Health = { checks: { id: string; label: string; state: "ok" | "warn" | "bad"; detail: string }[]; topErrors: { message: string; n: number }[]; at: string };
type Notice = { text: string; level: "info" | "warning"; audience: "all" | "company" | "candidate"; until: string; active: boolean } | null;

// Admin page: what works and what does not (database, mail, AI, payment, cron, errors) and the notice for everybody.
export function AdminHealth({ api, notify }: Props) {
  const [data, setData] = useState<Health | null>(null);
  const [form, setForm] = useState({ text: "", level: "info", audience: "all", until: "", active: true });
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => {
    (api("admin/health") as Promise<Health>).then(setData).catch((e) => notify((e as Error).message));
    (api("admin/notice") as Promise<{ notice: Notice }>)
      .then((d) => d.notice && setForm({ text: d.notice.text, level: d.notice.level, audience: d.notice.audience, until: d.notice.until, active: d.notice.active }))
      .catch(() => undefined);
  }, [api, notify]);
  useEffect(load, [load]);
  async function saveNotice(active: boolean) {
    setSaving(true);
    try {
      await api("admin/notice", { ...form, active });
      setForm({ ...form, active });
      notify(active ? "Bildiriş yayımlandı." : "Bildiriş söndürüldü.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  if (!data) return <p className="muted loading-line">Yüklənir…</p>;
  const icon = (s: string) => (s === "ok" ? <CheckCircle2 size={16} color="#2aa595" /> : s === "warn" ? <AlertTriangle size={16} color="#e0a02a" /> : <XCircle size={16} color="#d9534f" />);
  const bad = data.checks.filter((c) => c.state === "bad").length;
  const warn = data.checks.filter((c) => c.state === "warn").length;
  return (
    <div className="company-page">
      <section className="panel">
        <h3><Activity size={18} /> Sistem sağlamlığı</h3>
        <p className="muted">{bad ? `${bad} problem` : "Kritik problem yoxdur"}{warn ? `, ${warn} xəbərdarlıq` : ""}. Yoxlama vaxtı: {data.at.slice(0, 19).replace("T", " ")} UTC. <button type="button" className="text-button" onClick={load}>Yenilə</button></p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <tbody>
              {data.checks.map((c) => (
                <tr key={c.id}><td style={{ width: 28 }}>{icon(c.state)}</td><td><b>{c.label}</b></td><td>{c.detail}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {!!data.topErrors.length && (
          <>
            <h4>Son 24 saatın tez-tez xətaları</h4>
            <ul>{data.topErrors.map((e) => <li key={e.message}>{e.n} × {e.message.slice(0, 160)}</li>)}</ul>
          </>
        )}
      </section>
      <section className="panel">
        <h3><Megaphone size={18} /> Hamıya bildiriş</h3>
        <p className="muted">Yazdığınız mətn namizəd, işəgötürən və admin panellərinin yuxarısında zolaq kimi görünür (məsələn, texniki iş və ya yenilik). İstifadəçi onu bağlaya bilər; yeni bildiriş yazanda yenidən görünür.</p>
        <div className="form-grid admin-notice-form">
          <label style={{ gridColumn: "1 / -1" }}>Mətn (ən çox 400 simvol)<input className="admin-input" value={form.text} maxLength={400} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Məsələn: Bu gün 02:00–03:00 arası texniki iş olacaq." /></label>
          <label>Kimlərə<select className="admin-input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}><option value="all">Hamıya</option><option value="company">Yalnız işəgötürənlərə</option><option value="candidate">Yalnız namizədlərə</option></select></label>
          <label>Görünüş<select className="admin-input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}><option value="info">Məlumat</option><option value="warning">Xəbərdarlıq</option></select></label>
          <label>Bu tarixədək (boşdursa müddətsiz)<input className="admin-input" type="date" value={form.until} onChange={(e) => setForm({ ...form, until: e.target.value })} /></label>
        </div>
        <div className="admin-actions">
          <button type="button" className="primary" disabled={saving || !form.text.trim()} onClick={() => void saveNotice(true)}>Yayımla</button>
          <button type="button" className="secondary" disabled={saving} onClick={() => void saveNotice(false)}>Söndür</button>
          <span className="muted">{form.active && form.text ? "Hazırda aktivdir." : "Hazırda aktiv bildiriş yoxdur."}</span>
        </div>
      </section>
    </div>
  );
}
