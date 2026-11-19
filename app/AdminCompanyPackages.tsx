"use client";
import { useCallback, useEffect, useState } from "react";
import { Boxes } from "lucide-react";

type Pkg = { id: string; name: string; priceAzn: number; fullPerMonth: number; rankPerMonth: number; target: number; worstNetShare: number };
type Company = { id: string; name: string; created: string; plan_id: string; hr_module: number; hr_until: string | null; full_used: number; rank_used: number };
type Data = { month: string; packages: Pkg[]; companies: Company[] };

// Admin page: the AI package of every employer, what it has used this month, and the packages with their worst-case profit.
export default function AdminCompanyPackages({ api, notify }: { api: (path: string, body?: unknown) => Promise<unknown>; notify: (message: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(() => {
    (api("admin/company-ai-plans") as Promise<Data>).then(setData).catch((e) => notify((e as Error).message));
  }, [api, notify]);
  useEffect(load, [load]);
  async function assign(companyId: string, planId: string, hrDays?: number) {
    try {
      setData((await api("admin/company-ai-plans", { companyId, planId, ...(hrDays === undefined ? {} : { hrDays }) })) as Data);
      notify(hrDays === undefined ? "Paket dəyişdirildi." : hrDays ? `Kadr modulu ${hrDays} gün verildi.` : "Kadr modulu geri alındı.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  if (!data) return <p className="muted loading-line">Yüklənir…</p>;
  const nf = new Intl.NumberFormat("az");
  return (
    <div className="company-page">
      <section className="panel">
        <h3><Boxes size={18} /> İşəgötürən AI paketləri</h3>
        <p className="muted">
          Hər paket aylıq tam CV analizi və ucuz AI sıralaması verir. Tavanlar OpenAI qiyməti ilə (ən pis hal) hesablanıb: kvota tam işlənsə belə net qazanc hədəfdən aşağı düşmür (ƏDV, ödəniş komissiyası və xərclər çıxıldıqdan sonra).
        </p>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Paket</th><th>Aylıq haqq</th><th>Tam analiz</th><th>AI sıralaması</th><th>Net qazanc hədəfi</th><th>Ən pis halda net qazanc</th></tr>
            </thead>
            <tbody>
              {data.packages.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b></td>
                  <td>{p.priceAzn ? `${p.priceAzn} ₼` : "pulsuz"}</td>
                  <td>{nf.format(p.fullPerMonth)}</td>
                  <td>{nf.format(p.rankPerMonth)}</td>
                  <td>{p.target ? `${Math.round(p.target * 100)}%` : "—"}</td>
                  <td>{p.priceAzn ? `${(p.worstNetShare * 100).toFixed(1)}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="panel">
        <h3>Şirkətlər ({data.month})</h3>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Şirkət</th><th>Paket</th><th>Kadr modulu</th><th>Tam analiz (işlənib / kvota)</th><th>Sıralama (işlənib / kvota)</th></tr>
            </thead>
            <tbody>
              {data.companies.map((c) => {
                const pkg = data.packages.find((p) => p.id === c.plan_id) || data.packages[0];
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>
                      <select value={c.plan_id} onChange={(e) => void assign(c.id, e.target.value)} aria-label={`${c.name} — paket`}>
                        {data.packages.map((p) => <option key={p.id} value={p.id}>{p.name}{p.priceAzn ? ` · ${p.priceAzn} ₼` : ""}</option>)}
                      </select>
                    </td>
                    <td>
                      {c.hr_module ? (c.hr_until ? (c.hr_until > new Date().toISOString() ? `aktiv · ${c.hr_until.slice(0, 10)}-dək` : `bitib · ${c.hr_until.slice(0, 10)}`) : "aktiv (müddətsiz)") : c.created < "2026-11-19" ? "pulsuz (köhnə şirkət)" : "yoxdur"}
                      <span className="admin-actions" style={{ display: "flex", gap: 6, marginTop: 4 }}>
                        <button type="button" className="secondary" onClick={() => void assign(c.id, c.plan_id, 30)}>+30 gün</button>
                        <button type="button" className="secondary" onClick={() => void assign(c.id, c.plan_id, 90)}>+90 gün</button>
                        {!!c.hr_module && <button type="button" className="secondary" onClick={() => { if (window.confirm("Kadr modulu geri alınsın?")) void assign(c.id, c.plan_id, 0); }}>Geri al</button>}
                      </span>
                    </td>
                    <td>{nf.format(c.full_used)} / {nf.format(pkg.fullPerMonth)}</td>
                    <td>{nf.format(c.rank_used)} / {nf.format(pkg.rankPerMonth)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted">Ödəniş inteqrasiyası hələ qoşulmayıb: paketi və Kadr modulunu (sınaq və ya hədiyyə üçün istənilən gün sayı ilə) admin verir. Alınmış Kadr modulu 30 gün işləyir, sonra bağlanır; şirkət «Paketlər»dən uzada bilər. 19 noyabr 2026-dan əvvəl yaranmış şirkətlərdə modul pulsuzdur.</p>
      </section>
    </div>
  );
}
