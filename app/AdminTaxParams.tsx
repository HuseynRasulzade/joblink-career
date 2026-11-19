"use client";
import { useCallback, useEffect, useState } from "react";
import { Landmark, Plus, Trash2 } from "lucide-react";

type Bracket = { upTo: number | null; rate: number };
type Params = {
  effectiveFrom: string;
  note: string;
  taxFreeAmount: number;
  taxFreeLimit: number;
  minimumWage: number;
  incomeTax: { private: Bracket[]; public: Bracket[] };
  social: { private: { employee: Bracket[]; employer: Bracket[] }; public: { employee: Bracket[]; employer: Bracket[] } };
  unemployment: { employee: number; employer: number };
  medical: Bracket[];
};
type Data = { sets: Params[]; builtin: string; active: string; today: string };
type Props = { api: (path: string, body?: unknown) => Promise<unknown>; notify: (message: string) => void };

const pct = (n: number) => `${Math.round(n * 10000) / 100}%`;
const brief = (b: Bracket[]) => b.map((x, i) => `${i ? "" : ""}${x.upTo === null ? "yuxarı" : `${x.upTo.toLocaleString("az-AZ")}-dək`} ${pct(x.rate)}`).join(" · ");

// Editable list of scale rows: the limit (empty on the last row = no limit) and the percent.
function Scale({ label, rows, onChange }: { label: string; rows: Bracket[]; onChange: (rows: Bracket[]) => void }) {
  const set = (i: number, patch: Partial<Bracket>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  return (
    <div style={{ marginBottom: 14 }}>
      <b>{label}</b>
      {rows.map((r, i) => {
        const last = i === rows.length - 1;
        return (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", margin: "6px 0", flexWrap: "wrap" }}>
            <span className="muted" style={{ minWidth: 70 }}>{last ? "Yuxarı" : "Hədd (₼)"}</span>
            {last ? (
              <input className="admin-input" disabled value="hədsiz" style={{ width: 110 }} aria-label={`${label}: son sətir`} />
            ) : (
              <input className="admin-input" type="number" min={0} step="0.01" value={r.upTo ?? ""} onChange={(e) => set(i, { upTo: e.target.value === "" ? 0 : Number(e.target.value) })} style={{ width: 110 }} aria-label={`${label}: hədd`} />
            )}
            <span className="muted">faiz</span>
            <input className="admin-input" type="number" min={0} max={60} step="0.01" value={Math.round(r.rate * 10000) / 100} onChange={(e) => set(i, { rate: (Number(e.target.value) || 0) / 100 })} style={{ width: 90 }} aria-label={`${label}: faiz`} />
            <span className="muted">%</span>
            {rows.length > 1 && (
              <button type="button" className="secondary" aria-label="Sətri sil" onClick={() => { const next = rows.filter((_, k) => k !== i); next[next.length - 1] = { ...next[next.length - 1], upTo: null }; onChange(next); }}><Trash2 size={14} /></button>
            )}
          </div>
        );
      })}
      <button type="button" className="secondary" onClick={() => { const next = rows.slice(0, -1); const prev = next.length ? next[next.length - 1].upTo || 0 : 0; onChange([...next, { upTo: prev + 1000, rate: rows[rows.length - 1].rate }, { upTo: null, rate: rows[rows.length - 1].rate }]); }}><Plus size={14} /> Pillə əlavə et</button>
    </div>
  );
}

// Admin page: the tax and insurance parameter sets. Each set has the day it takes effect; a calculation uses the set in force on its own day,
// so a change of law is entered once, with its date, and the old months keep their old rates.
export default function AdminTaxParams({ api, notify }: Props) {
  const [data, setData] = useState<Data | null>(null);
  const [draft, setDraft] = useState<Params | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    (api("admin/tax-params") as Promise<Data>).then(setData).catch((e) => notify((e as Error).message));
  }, [api, notify]);
  useEffect(load, [load]);
  if (!data) return <p className="muted loading-line">Yüklənir…</p>;
  const startFrom = (p: Params) => setDraft(JSON.parse(JSON.stringify({ ...p, effectiveFrom: "", note: "" })) as Params);
  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      setData((await api("admin/tax-params", { set: draft })) as Data);
      setDraft(null);
      notify("Parametr dəsti saxlanıldı.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(day: string) {
    if (!window.confirm(`${day} tarixli dəst silinsin?`)) return;
    try {
      setData((await api("admin/tax-params/delete", { effectiveFrom: day })) as Data);
      notify("Dəst silindi.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  const num = (key: "taxFreeAmount" | "taxFreeLimit" | "minimumWage", label: string) =>
    draft && (
      <label>{label}<input className="admin-input" type="number" min={0} step="0.01" value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) || 0 })} /></label>
    );
  const latest = data.sets[data.sets.length - 1];
  return (
    <div className="company-page">
      <section className="panel">
        <h3><Landmark size={18} /> Vergi və sığorta parametrləri</h3>
        <p className="muted">
          Gəlir vergisi pillələri, DSMF, tibbi və işsizlik sığortası, vergidən azad məbləğ və minimum əmək haqqı burada tarixlə saxlanır. Qanun dəyişəndə <b>yeni dəst</b> əlavə edin və onun qüvvəyə mindiyi günü yazın:
          hesablamalar (kalkulyatorlar, əmək haqqı, işçi xərci) <b>hər ayın öz günündə qüvvədə olan dəsti</b> işlədir, köhnə aylar köhnə faizlərlə qalır. Bugün qüvvədə olan dəst: <b>{data.active}</b>.
        </p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Qüvvəyə minir</th><th>Minimum əmək haqqı</th><th>Vergidən azad</th><th>Gəlir vergisi (qeyri-dövlət)</th><th>DSMF işəgötürən (qeyri-dövlət)</th><th>Tibbi</th><th>Qeyd</th><th /></tr></thead>
            <tbody>
              {[...data.sets].reverse().map((p) => (
                <tr key={p.effectiveFrom} style={p.effectiveFrom === data.active ? { fontWeight: 700 } : undefined}>
                  <td>{p.effectiveFrom}{p.effectiveFrom === data.active ? " ✓ indi" : p.effectiveFrom > data.today ? " (gələcək)" : ""}{p.effectiveFrom === data.builtin ? " · daxili" : ""}</td>
                  <td>{p.minimumWage} ₼</td>
                  <td>{p.taxFreeAmount} ₼ ({p.taxFreeLimit}-dək gəlirdə)</td>
                  <td>{brief(p.incomeTax.private)}</td>
                  <td>{brief(p.social.private.employer)}</td>
                  <td>{brief(p.medical)}</td>
                  <td>{p.note || "—"}</td>
                  <td><span className="admin-actions"><button type="button" className="secondary" onClick={() => startFrom(p)}>Kopyala və yeni dəst et</button>{p.effectiveFrom !== data.builtin && <button type="button" aria-label="Sil" onClick={() => void remove(p.effectiveFrom)}><Trash2 size={14} /></button>}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-actions"><button type="button" className="primary" onClick={() => startFrom(latest)}><Plus size={14} /> Yeni dəst əlavə et</button></div>
        <p className="muted fine-print">Daxili 2026 dəsti silinmir; eyni tarixli yeni dəst onu əvəz edir. Dəstin yoxlanması: tarix düzgün olmalı, pillələrin hədləri artan, son pillə hədsiz, faizlər 0–60%. Bunlar hesablamanın əsasıdır: dəyişiklikdən əvvəl rəsmi mətnlə tutuşdurun (Qanunvericilik bölməsinə sənəd yükləyə bilərsiniz).</p>
      </section>
      {draft && (
        <section className="panel">
          <h3>Yeni parametr dəsti</h3>
          <div className="form-grid admin-notice-form">
            <label>Qüvvəyə minmə tarixi<input className="admin-input" type="date" value={draft.effectiveFrom} onChange={(e) => setDraft({ ...draft, effectiveFrom: e.target.value })} /></label>
            <label>Qeyd (məsələn, hansı qanun)<input className="admin-input" value={draft.note} maxLength={300} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></label>
            {num("minimumWage", "Minimum aylıq əmək haqqı (₼)")}
            {num("taxFreeAmount", "Vergidən azad məbləğ (₼)")}
            {num("taxFreeLimit", "Azad olma həddi: gəlir bu qədərədək (₼)")}
            <label>İşsizlik sığortası, işçi (%)<input className="admin-input" type="number" min={0} max={60} step="0.01" value={Math.round(draft.unemployment.employee * 10000) / 100} onChange={(e) => setDraft({ ...draft, unemployment: { ...draft.unemployment, employee: (Number(e.target.value) || 0) / 100 } })} /></label>
            <label>İşsizlik sığortası, işəgötürən (%)<input className="admin-input" type="number" min={0} max={60} step="0.01" value={Math.round(draft.unemployment.employer * 10000) / 100} onChange={(e) => setDraft({ ...draft, unemployment: { ...draft.unemployment, employer: (Number(e.target.value) || 0) / 100 } })} /></label>
          </div>
          <Scale label="Gəlir vergisi, qeyri-dövlət sektoru" rows={draft.incomeTax.private} onChange={(rows) => setDraft({ ...draft, incomeTax: { ...draft.incomeTax, private: rows } })} />
          <Scale label="Gəlir vergisi, dövlət və neft-qaz sektoru" rows={draft.incomeTax.public} onChange={(rows) => setDraft({ ...draft, incomeTax: { ...draft.incomeTax, public: rows } })} />
          <Scale label="DSMF, işçi, qeyri-dövlət" rows={draft.social.private.employee} onChange={(rows) => setDraft({ ...draft, social: { ...draft.social, private: { ...draft.social.private, employee: rows } } })} />
          <Scale label="DSMF, işəgötürən, qeyri-dövlət" rows={draft.social.private.employer} onChange={(rows) => setDraft({ ...draft, social: { ...draft.social, private: { ...draft.social.private, employer: rows } } })} />
          <Scale label="DSMF, işçi, dövlət və neft-qaz" rows={draft.social.public.employee} onChange={(rows) => setDraft({ ...draft, social: { ...draft.social, public: { ...draft.social.public, employee: rows } } })} />
          <Scale label="DSMF, işəgötürən, dövlət və neft-qaz" rows={draft.social.public.employer} onChange={(rows) => setDraft({ ...draft, social: { ...draft.social, public: { ...draft.social.public, employer: rows } } })} />
          <Scale label="İcbari tibbi sığorta (hər tərəf)" rows={draft.medical} onChange={(rows) => setDraft({ ...draft, medical: rows })} />
          <div className="admin-actions">
            <button type="button" className="primary" disabled={busy || !draft.effectiveFrom} onClick={() => void save()}>Dəsti saxla</button>
            <button type="button" className="secondary" disabled={busy} onClick={() => setDraft(null)}>Ləğv et</button>
          </div>
        </section>
      )}
    </div>
  );
}
