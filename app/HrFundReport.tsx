"use client";
import { useEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";

type Dep = {
  department: string; headcount: number; planned: number; free: number; over: number; fte: number; monthlyBudget: number; monthlyFund: number; monthlyVariance: number; avgSalary: number;
  vacationDays: number; vacationLiability: number; hires: number; exits: number; turnover: number; leavers: Record<string, number>;
  actualGross: number; actualNet: number; actualEmployerCost: number; budgetForPeriod: number; periodVariance: number;
};
type Report = {
  year: string; approvedMonths: number; months: { month: string; gross: number; net: number; employerCost: number }[]; departments: Dep[];
  totals: { headcount: number; planned: number; free: number; monthlyBudget: number; monthlyFund: number; monthlyVariance: number; vacationDays: number; vacationLiability: number; hires: number; exits: number; turnover: number; actualGross: number; actualNet: number; actualEmployerCost: number; budgetForPeriod: number; periodVariance: number };
};
const azn = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Headcount against the plan, the pay fund against the budget, the vacation owed and the turnover, per department.
export default function HrFundReport({ notify }: { notify: (message: string) => void }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(String(thisYear));
  const [loaded, setLoaded] = useState<{ year: string; data: Report } | null>(null);
  const report = loaded?.year === year ? loaded.data : null;
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  useEffect(() => {
    fetch(`/api/joblink/company/hr-report?year=${year}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as Report & { error?: string };
        if (!response.ok) throw new Error(data.error || "Hesabat alınmadı.");
        setLoaded({ year, data });
      })
      .catch((error) => notifyRef.current((error as Error).message));
  }, [year]);
  function print() {
    if (!report) return;
    const win = window.open("", "_blank");
    if (!win) return notify("Çap pəncərəsi bloklanıb.");
    const rows = report.departments
      .map((d) => `<tr><td>${esc(d.department)}</td><td>${d.headcount}</td><td>${d.planned}</td><td>${azn(d.monthlyBudget)}</td><td>${azn(d.monthlyFund)}</td><td>${azn(d.monthlyVariance)}</td><td>${d.vacationDays}</td><td>${azn(d.vacationLiability)}</td><td>${d.hires}/${d.exits}</td><td>${d.turnover}%</td><td>${azn(d.actualGross)}</td></tr>`)
      .join("");
    win.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>Kadr və əmək haqqı fondu ${report.year}</title><style>
      body{font:12px/1.4 Arial,sans-serif;color:#17332b;margin:18px}h1{font-size:18px;margin:0 0 6px}table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #cdd9d3;padding:4px 6px;text-align:right}th{background:#eef4f1}td:first-child,th:first-child{text-align:left}
    </style></head><body><h1>Kadr və əmək haqqı fondu hesabatı — ${report.year}</h1>
      <p>İşçi: ${report.totals.headcount} · plan: ${report.totals.planned} · aylıq fond: ${azn(report.totals.monthlyFund)} · aylıq büdcə: ${azn(report.totals.monthlyBudget)} · məzuniyyət borcu: ${azn(report.totals.vacationLiability)} · dövriyyə: ${report.totals.turnover}%</p>
      <table><thead><tr><th>Departament</th><th>İşçi</th><th>Plan</th><th>Aylıq büdcə</th><th>Aylıq fond</th><th>Büdcə − fond</th><th>Məzuniyyət (gün)</th><th>Məzuniyyət borcu</th><th>Qəbul/çıxış</th><th>Dövriyyə</th><th>Təsdiqlənmiş aylar (gross)</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }
  if (!report) return <p className="muted">Kadr və fond hesabatı hazırlanır…</p>;
  const t = report.totals;
  return (
    <section className="panel hr-fund-report">
      <div className="section-heading">
        <h3>Kadr və əmək haqqı fondu</h3>
        <div className="admin-actions">
          <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="İl">
            {[thisYear, thisYear - 1, thisYear - 2].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <a className="secondary report-button" href={`/api/joblink/company/hr-report/export?year=${year}`} download><Download size={14} /> Excel</a>
          <button type="button" className="secondary" onClick={print}><Printer size={14} /> Çap</button>
        </div>
      </div>
      <div className="staff-kpis">
        <div className="staff-kpi"><small>İşçi / plan</small><strong>{t.headcount} / {t.planned}</strong><span>boş ştat {t.free}</span></div>
        <div className="staff-kpi"><small>Aylıq fond (maaşlar, gross)</small><strong>{azn(t.monthlyFund)}</strong><span>büdcə {azn(t.monthlyBudget)}</span></div>
        <div className={`staff-kpi ${t.monthlyVariance >= 0 ? "staff-kpi-good" : ""}`}><small>Büdcə − fond (aylıq)</small><strong>{azn(t.monthlyVariance)}</strong><span>{t.monthlyVariance >= 0 ? "büdcə çərçivəsindədir" : "büdcə aşılıb"}</span></div>
        <div className="staff-kpi"><small>Məzuniyyət borcu</small><strong>{azn(t.vacationLiability)}</strong><span>{t.vacationDays} gün istifadə olunmayıb</span></div>
        <div className="staff-kpi"><small>Dövriyyə ({year})</small><strong>{t.turnover}%</strong><span>qəbul {t.hires} · çıxış {t.exits}</span></div>
        <div className="staff-kpi"><small>Təsdiqlənmiş aylar ({report.approvedMonths})</small><strong>{azn(t.actualGross)}</strong><span>büdcə − fakt {azn(t.periodVariance)}</span></div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr><th>Departament</th><th>İşçi</th><th>Plan</th><th>Aylıq büdcə</th><th>Aylıq fond</th><th>Büdcə − fond</th><th>Orta maaş</th><th>Məzuniyyət borcu</th><th>Qəbul / çıxış</th><th>Dövriyyə</th><th>Təsdiqlənmiş aylar (gross)</th></tr>
          </thead>
          <tbody>
            {report.departments.map((d) => (
              <tr key={d.department}>
                <td><b>{d.department}</b>{Object.keys(d.leavers).length > 0 && <small className="skill-description">çıxış: {Object.entries(d.leavers).map(([k, n]) => `${k} ${n}`).join(", ")}</small>}</td>
                <td>{d.headcount}{d.over > 0 && <small className="danger-text">plandan {d.over} artıq</small>}</td>
                <td>{d.planned}{d.free > 0 && <small className="skill-description">boş {d.free}</small>}</td>
                <td>{azn(d.monthlyBudget)}</td>
                <td>{azn(d.monthlyFund)}</td>
                <td className={d.monthlyVariance < 0 ? "danger-text" : undefined}>{azn(d.monthlyVariance)}</td>
                <td>{azn(d.avgSalary)}</td>
                <td>{azn(d.vacationLiability)}<small className="skill-description">{d.vacationDays} gün</small></td>
                <td>{d.hires} / {d.exits}</td>
                <td>{d.turnover}%</td>
                <td>{azn(d.actualGross)}<small className="skill-description">büdcə − fakt {azn(d.periodVariance)}</small></td>
              </tr>
            ))}
            {!report.departments.length && <tr><td colSpan={11}><p className="admin-empty">Hələ işçi və ya ştat yoxdur.</p></td></tr>}
          </tbody>
        </table>
      </div>
      <small className="skill-picker-help">Büdcə ştat cədvəlindəki yerlərin yuxarı maaş həddi ilə hesablanır. Fond işçilərin hazırkı gross maaşlarının cəmidir. Məzuniyyət borcu istifadə olunmamış günlərin maaşın gün payı (÷ 30,4) ilə dəyəridir. Dövriyyə = il ərzindəki çıxışlar / orta işçi sayı.</small>
    </section>
  );
}
