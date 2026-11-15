"use client";
import { useCallback, useEffect, useState } from "react";
import { Boxes } from "lucide-react";

type Pkg = { id: string; name: string; priceAzn: number; fullPerMonth: number; rankPerMonth: number; target: number; worstNetShare: number };
type Company = { id: string; name: string; created: string; plan_id: string; full_used: number; rank_used: number };
type Data = { month: string; packages: Pkg[]; companies: Company[] };

// Admin page: the AI package of every employer, what it has used this month, and the packages with their worst-case profit.
export default function AdminCompanyPackages({ api, notify }: { api: (path: string, body?: unknown) => Promise<unknown>; notify: (message: string) => void }) {
  const [data, setData] = useState<Data | null>(null);
  const load = useCallback(() => {
    (api("admin/company-ai-plans") as Promise<Data>).then(setData).catch((e) => notify((e as Error).message));
  }, [api, notify]);
  useEffect(load, [load]);
  async function assign(companyId: string, planId: string) {
    try {
      setData((await api("admin/company-ai-plans", { companyId, planId })) as Data);
      notify("Paket dəyişdirildi.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
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
              <tr><th>Şirkət</th><th>Paket</th><th>Tam analiz (işlənib / kvota)</th><th>Sıralama (işlənib / kvota)</th></tr>
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
                    <td>{nf.format(c.full_used)} / {nf.format(pkg.fullPerMonth)}</td>
                    <td>{nf.format(c.rank_used)} / {nf.format(pkg.rankPerMonth)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted">Ödəniş inteqrasiyası hələ qoşulmayıb: paketi admin təyin edir.</p>
      </section>
    </div>
  );
}
