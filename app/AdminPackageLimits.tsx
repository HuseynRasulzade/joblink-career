"use client";
import { useCallback, useEffect, useState } from "react";
import { Gauge } from "lucide-react";

type Row = { id: string; name: string; priceAzn: number; defaultPrice: number; limits: Record<string, number>; defaults: Record<string, number>; worstCostAzn: number; worstShare: number | null };
type Data = { hr: { alone: number; bundle: number; defaults: { alone: number; bundle: number } }; blend: { usdPerMillion: number; aznPerUsd: number; source: "real" | "default"; measuredTokens: number }; tokensPerAnalysis: number; candidate: Row[]; company: Row[] };

const CANDIDATE_FIELDS: [string, string][] = [
  ["aiApplyPerDay", "AI müraciət / gün"],
  ["cvAnalysesPerDay", "CV analizi / gün"],
  ["cvFixesPerDay", "CV düzəlişi / gün"],
  ["aiTokensWindow", "Token / 5 saat"],
  ["aiTokensMonth", "Token / ay"],
];
const COMPANY_FIELDS: [string, string][] = [
  ["fullPerMonth", "Tam CV analizi / ay"],
  ["rankPerMonth", "AI reytinqi / ay"],
];
const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

// Admin page: the AI allowance of every package (candidate and employer) in one place. A change is applied at once to everybody on the
// package; the cost column is the worst case (the whole allowance used) priced with the real token costs of the last 30 days.
export default function AdminPackageLimits({ api, notify }: { api: (path: string, body?: unknown) => Promise<unknown>; notify: (message: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [draft, setDraft] = useState<{ candidate: Record<string, Record<string, number>>; company: Record<string, Record<string, number>> }>({ candidate: {}, company: {} });
  const [prices, setPrices] = useState<{ candidate: Record<string, number>; company: Record<string, number>; hrAlone: number; hrBundle: number }>({ candidate: {}, company: {}, hrAlone: 0, hrBundle: 0 });
  const [busy, setBusy] = useState(false);
  const adopt = useCallback((d: Data) => {
    setData(d);
    setDraft({ candidate: Object.fromEntries(d.candidate.map((r) => [r.id, { ...r.limits }])), company: Object.fromEntries(d.company.map((r) => [r.id, { ...r.limits }])) });
    setPrices({ candidate: Object.fromEntries(d.candidate.map((r) => [r.id, r.priceAzn])), company: Object.fromEntries(d.company.map((r) => [r.id, r.priceAzn])), hrAlone: d.hr.alone, hrBundle: d.hr.bundle });
  }, []);
  useEffect(() => {
    (api("admin/package-limits") as Promise<Data>).then(adopt).catch((e) => notify((e as Error).message));
  }, [api, notify, adopt]);
  if (!data) return <p className="muted loading-line">Yüklənir…</p>;

  const set = (group: "candidate" | "company", id: string, key: string, value: string) =>
    setDraft({ ...draft, [group]: { ...draft[group], [id]: { ...draft[group][id], [key]: Math.max(0, Math.round(Number(value) || 0)) } } });
  async function save(reset = false) {
    if (reset && !window.confirm("Bütün paket limitləri və qiymətləri koddakı ilkin dəyərlərə qaytarılsın?")) return;
    setBusy(true);
    try {
      adopt((await api("admin/package-limits", reset ? { reset: true } : { ...draft, prices })) as Data);
      notify(reset ? "Limitlər və qiymətlər ilkin dəyərlərə qaytarıldı." : "Limitlər və qiymətlər saxlanıldı və dərhal tətbiq olundu.");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const table = (group: "candidate" | "company", rows: Row[], fields: [string, string][]) => (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Paket</th>
            <th>Qiymət (ƏDV-siz)</th>
            {fields.map(([, label]) => <th key={label}>{label}</th>)}
            <th>Ən pis halda aylıq xərc</th>
            <th>Qalan marja</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><b>{r.name}</b></td>
              <td>
                {r.defaultPrice === 0 ? (
                  "Pulsuz"
                ) : (
                  <>
                    <input className="admin-input" type="number" min={0} step="0.01" value={prices[group][r.id] ?? 0} onChange={(e) => setPrices({ ...prices, [group]: { ...prices[group], [r.id]: Math.max(0, Number(e.target.value) || 0) } })} style={{ width: 90 }} />
                    {prices[group][r.id] !== r.defaultPrice && <small className="muted" style={{ display: "block" }}>ilkin: {r.defaultPrice} ₼</small>}
                  </>
                )}
              </td>
              {fields.map(([key]) => (
                <td key={key}>
                  <input className="admin-input" type="number" min={0} value={draft[group][r.id]?.[key] ?? 0} onChange={(e) => set(group, r.id, key, e.target.value)} style={{ width: 110 }} />
                  {draft[group][r.id]?.[key] !== r.defaults[key] && <small className="muted" style={{ display: "block" }}>ilkin: {r.defaults[key]}</small>}
                </td>
              ))}
              <td>{r.worstCostAzn.toFixed(2)} ₼</td>
              <td style={{ color: r.worstShare !== null && r.worstShare < 0.15 ? "#c2554a" : undefined }}>{pct(r.worstShare)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="company-page">
      <section className="panel">
        <h3><Gauge size={18} /> Paketlərin qiymətləri və AI limitləri</h3>
        <p className="muted">
          Hər paketin AI limitini buradan dəyişin. Dəyişiklik saxlanılan kimi paketdəki hamıya tətbiq olunur (paket səhifəsindəki yazılar da yenilənir). Xərc sütunu limitin hamısı işləndikdə
          (ən pis hal) aylıq AI xərcidir: <b>{data.blend.source === "real" ? "son 30 günün real token xərci" : "hələ kifayət qədər real token yoxdur, ilkin qiymət cədvəli"}</b> ilə hesablanır
          (1 milyon token ≈ <b>${data.blend.usdPerMillion}</b>, 1 USD = {data.blend.aznPerUsd} ₼; ölçülən token: {data.blend.measuredTokens.toLocaleString("az-AZ")}). «Qalan marja» ödəniş haqqı (2,5%) çıxıldıqdan sonrakıdır; 15%-dən aşağı qırmızı görünür.
        </p>
        <h4>Kadr modulu qiyməti (ƏDV-siz, ayda)</h4>
        <div className="form-grid admin-notice-form">
          <label>AI paketi ilə birlikdə (₼)<input className="admin-input" type="number" min={1} step="0.01" value={prices.hrBundle} onChange={(e) => setPrices({ ...prices, hrBundle: Math.max(0, Number(e.target.value) || 0) })} /><small className="muted">ilkin: {data.hr.defaults.bundle} ₼ (tək qiymətdən çox ola bilməz)</small></label>
          <label>Tək, AI-siz (₼)<input className="admin-input" type="number" min={1} step="0.01" value={prices.hrAlone} onChange={(e) => setPrices({ ...prices, hrAlone: Math.max(0, Number(e.target.value) || 0) })} /><small className="muted">ilkin: {data.hr.defaults.alone} ₼</small></label>
        </div>
        <p className="muted fine-print">Qiymətlər saxlananda paket səhifələrində, açılış səhifəsində və yeni hesab-fakturalarda dərhal dəyişir; artıq kəsilmiş hesab-fakturalar dəyişmir. ƏDV (18%) qanunla müəyyən olunduğu üçün buradan dəyişmir.</p>
        <h4>Namizəd paketləri</h4>
        {table("candidate", data.candidate, CANDIDATE_FIELDS)}
        <h4>İşəgötürən AI paketləri</h4>
        {table("company", data.company, COMPANY_FIELDS)}
        <p className="muted fine-print">Bir tam CV analizi təxminən {data.tokensPerAnalysis} token sayılır. Namizəd paketlərində «ayda təxminən N analiz» yazısı «Token / ay» limitindən hesablanır.</p>
        <div className="admin-actions">
          <button type="button" className="primary" disabled={busy} onClick={() => void save(false)}>Limitləri saxla</button>
          <button type="button" className="secondary" disabled={busy} onClick={() => void save(true)}>İlkin dəyərlərə qaytar</button>
        </div>
      </section>
    </div>
  );
}
