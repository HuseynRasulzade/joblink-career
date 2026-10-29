"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";

type Notify = (message: string) => void;
type Month = { month: string; status: string; gross: number; net: number; due: number; advance: number; salary: number; vacation: number; benefit: number; extra: number; outstanding: number; benefitOutstanding: number; employeeOwes: number; late: number };
type Pay = { month: string; paidOn: string; kind: string; label: string; title: string; amount: number; method: string; note: string; reversed: boolean; reverseReason: string; reversedBy: string };
type Employee = {
  employeeId: string; name: string; position: string; department: string; fin: string; iban: string;
  gross: number; tax: number; insurance: number; net: number; deductions: number; deductionsAsked: number; due: number; vacation: number; benefitDue: number;
  paid: Record<string, number>; paidTotal: number; companyOwes: number; benefitOwes: number; late: number; employeeOwes: number; balance: number;
  months: Month[]; payments: Pay[];
};
type Report = {
  from: string; to: string; months: { month: string; status: string }[]; employees: Employee[];
  totals: { employees: number; gross: number; tax: number; insurance: number; net: number; deductions: number; due: number; paidTotal: number; advance: number; salary: number; vacation: number; benefit: number; extra: number; companyOwes: number; benefitOwes: number; late: number; employeeOwes: number; balance: number };
};

const azn = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—");
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const METHOD: Record<string, string> = { bank: "bank", card: "kart", cash: "nağd", other: "digər" };
const state = (e: Employee) => (e.balance > 0.005 ? "Şirkət işçiyə borcludur" : e.balance < -0.005 ? "İşçi şirkətə borcludur" : "Hesablaşma bağlıdır");

export default function PayrollReport({ initialMonth, notify }: { initialMonth: string; notify: Notify }) {
  const [from, setFrom] = useState(`${initialMonth.slice(0, 4)}-01`);
  const [to, setTo] = useState(initialMonth);
  const [loaded, setLoaded] = useState<{ key: string; data: Report } | null>(null);
  const report = loaded?.key === `${from}|${to}` ? loaded.data : null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState("");
  const [only, setOnly] = useState<"all" | "debt">("all");
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    const key = `${from}|${to}`;
    fetch(`/api/joblink/company/payroll/report?from=${from}&to=${to}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as Report & { error?: string };
        if (!response.ok) throw new Error(data.error || "Hesabat alınmadı.");
        setLoaded({ key, data });
      })
      .catch((error) => notifyRef.current((error as Error).message));
  }, [from, to]);
  useEffect(load, [load]);

  function print(list: Employee[]) {
    if (!report) return;
    const win = window.open("", "_blank");
    if (!win) return notify("Çap pəncərəsi bloklanıb.");
    const t = report.totals;
    const rows = list
      .map((e) => `<tr><td>${esc(e.name)}<br><small>${esc([e.position, e.department].filter(Boolean).join(" · "))}</small></td><td>${azn(e.due)}</td><td>${azn(e.paid.advance)}</td><td>${azn(e.paid.salary + e.paid.vacation)}</td><td>${azn(e.paid.benefit)}</td><td>${azn(e.paid.extra)}</td><td>${azn(e.paidTotal)}</td><td>${azn(e.companyOwes + e.benefitOwes + e.late)}</td><td>${azn(e.employeeOwes)}</td><td><b>${azn(e.balance)}</b><br><small>${state(e)}</small></td></tr>`)
      .join("");
    win.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>Hesablaşma hesabatı ${report.from} – ${report.to}</title><style>
      body{font:12px/1.4 Arial,sans-serif;color:#17332b;margin:18px}h1{font-size:18px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #cdd9d3;padding:4px 6px;text-align:right}th{background:#eef4f1}td:first-child,th:first-child{text-align:left}small{color:#5b7068}p{margin:4px 0}
    </style></head><body><h1>İşçilərlə hesablaşma hesabatı</h1><p>Dövr: ${report.from} – ${report.to} · ${list.length} işçi</p>
      <p>Ödəniləcək cəmi: <b>${azn(t.due)}</b> · ödənilib: <b>${azn(t.paidTotal)}</b> · şirkətin borcu: <b>${azn(t.companyOwes + t.benefitOwes + t.late)}</b> · işçilərin borcu: <b>${azn(t.employeeOwes)}</b></p>
      <table><thead><tr><th>İşçi</th><th>Ödəniləcək</th><th>Avans</th><th>Əmək haqqı və məzuniyyət</th><th>Müavinət</th><th>Digər</th><th>Cəmi ödənilib</th><th>Şirkətin borcu</th><th>İşçinin borcu</th><th>Xalis qalıq</th></tr></thead><tbody>${rows}</tbody></table>
      <p>Xalis qalıq müsbətdirsə şirkət işçiyə borcludur, mənfidirsə işçi şirkətə.</p></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  if (!report) return <p className="muted">Hesabat hazırlanır…</p>;
  const t = report.totals;
  const list = report.employees
    .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((e) => only === "all" || Math.abs(e.balance) > 0.005 || e.employeeOwes > 0);
  return (
    <div className="payroll-report">
      <div className="section-heading">
        <div className="admin-actions">
          <label>Başlanğıc ay <input type="month" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} /></label>
          <label>Son ay <input type="month" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} /></label>
          <input type="search" placeholder="İşçi adı" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={only} onChange={(e) => setOnly(e.target.value as "all" | "debt")} aria-label="Süzgəc">
            <option value="all">Hamısı</option>
            <option value="debt">Yalnız borcu olanlar</option>
          </select>
        </div>
        <div className="admin-actions">
          <a className="secondary report-button" href={`/api/joblink/company/payroll/report/export?from=${from}&to=${to}`} download><Download size={14} /> Excel</a>
          <button type="button" className="secondary" onClick={() => print(list)}><Printer size={14} /> Çap</button>
        </div>
      </div>
      {report.months.some((m) => m.status !== "approved") && <p className="muted">Təsdiqlənməmiş aylar ({report.months.filter((m) => m.status !== "approved").map((m) => m.month).join(", ")}) ilkin hesablamadır.</p>}
      <div className="staff-kpis">
        <div className="staff-kpi"><small>Ödəniləcək cəmi (net − tutulmalar)</small><strong>{azn(t.due)}</strong><span>gross {azn(t.gross)} · vergi və sığorta {azn(t.tax + t.insurance)}</span></div>
        <div className="staff-kpi"><small>Ödənilib</small><strong>{azn(t.paidTotal)}</strong><span>avans {azn(t.advance)} · maaş {azn(t.salary)} · məzuniyyət {azn(t.vacation)}</span></div>
        <div className="staff-kpi"><small>Müavinət və digər ödənişlər</small><strong>{azn(t.benefit + t.extra)}</strong><span>müavinət {azn(t.benefit)} · digər {azn(t.extra)}</span></div>
        <div className="staff-kpi staff-kpi-good"><small>Şirkətin işçilərə borcu</small><strong>{azn(t.companyOwes + t.benefitOwes + t.late)}</strong><span>əmək haqqı {azn(t.companyOwes)} · müavinət {azn(t.benefitOwes)} · cərimə {azn(t.late)}</span></div>
        <div className="staff-kpi"><small>İşçilərin şirkətə borcu</small><strong>{azn(t.employeeOwes)}</strong><span>artıq verilmiş avans</span></div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table payroll-table">
          <thead>
            <tr><th>İşçi</th><th>Ödəniləcək</th><th>Avans</th><th>Maaş və məzuniyyət</th><th>Müavinət</th><th>Digər</th><th>Cəmi ödənilib</th><th>Şirkətin borcu</th><th>İşçinin borcu</th><th>Xalis qalıq</th></tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <Fragment key={e.employeeId}>
                <tr onClick={() => setOpen(open === e.employeeId ? "" : e.employeeId)} style={{ cursor: "pointer" }}>
                  <td><b>{e.name}</b><small className="skill-description">{[e.position, e.department].filter(Boolean).join(" · ")}</small></td>
                  <td>{azn(e.due)}</td>
                  <td>{azn(e.paid.advance)}</td>
                  <td>{azn(e.paid.salary + e.paid.vacation)}</td>
                  <td>{azn(e.paid.benefit)}</td>
                  <td>{azn(e.paid.extra)}</td>
                  <td><b>{azn(e.paidTotal)}</b></td>
                  <td>{azn(e.companyOwes + e.benefitOwes + e.late)}</td>
                  <td>{e.employeeOwes ? <span className="danger-text">{azn(e.employeeOwes)}</span> : "—"}</td>
                  <td><b>{azn(e.balance)}</b><small className={e.balance < -0.005 ? "danger-text" : "skill-description"}>{state(e)}</small></td>
                </tr>
                {open === e.employeeId && (
                  <tr>
                    <td colSpan={10}>
                      <h4>Aylar üzrə</h4>
                      <table className="admin-table">
                        <thead><tr><th>Ay</th><th>Gross</th><th>Net</th><th>Ödəniləcək</th><th>Avans</th><th>Maaş</th><th>Məzuniyyət</th><th>Müavinət</th><th>Digər</th><th>Qalıq</th></tr></thead>
                        <tbody>
                          {e.months.map((m) => (
                            <tr key={m.month}><td>{m.month}{m.status !== "approved" ? " (layihə)" : ""}</td><td>{azn(m.gross)}</td><td>{azn(m.net)}</td><td>{azn(m.due)}</td><td>{azn(m.advance)}</td><td>{azn(m.salary)}</td><td>{azn(m.vacation)}</td><td>{azn(m.benefit)}</td><td>{azn(m.extra)}</td><td>{azn(m.outstanding + m.benefitOutstanding)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                      <h4>Ödənişlər və səbəbləri</h4>
                      {e.payments.length ? (
                        <ul className="payment-history">
                          {e.payments.map((p, i) => (
                            <li key={i} className={p.reversed ? "payment-reversed" : ""}>
                              {dmy(p.paidOn)} — <b>{p.label}{p.title ? `: ${p.title}` : ""}</b> ({p.month} ayı üçün) {azn(p.amount)} · {METHOD[p.method] || p.method || "—"}{p.note ? ` · ${p.note}` : ""}
                              {p.reversed && <small className="danger-text"> geri çəkilib: {p.reverseReason} ({p.reversedBy})</small>}
                            </li>
                          ))}
                        </ul>
                      ) : <p className="muted">Bu dövrdə ödəniş yoxdur.</p>}
                      <p className="muted">
                        Hesablanıb {azn(e.gross)} (gross) → vergi {azn(e.tax)}, sığorta {azn(e.insurance)}{e.deductions ? `, digər tutulmalar ${azn(e.deductions)}` : ""} → ödəniləcək {azn(e.due)}.
                        {e.benefitDue ? ` Müavinət (ayrıca): ${azn(e.benefitDue)}.` : ""}{e.late ? ` Gecikmə cəriməsi: ${azn(e.late)}.` : ""}
                      </p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!list.length && <tr><td colSpan={10}><p className="admin-empty">Seçilmiş dövr üçün işçi tapılmadı.</p></td></tr>}
          </tbody>
        </table>
      </div>
      <small className="skill-picker-help">Xalis qalıq müsbətdirsə şirkət işçiyə borcludur (ödənilməmiş əmək haqqı, müavinət, gecikmə cəriməsi); mənfidirsə işçiyə hesablanandan artıq avans verilib. Sətrə basanda aylar üzrə təfərrüat və ödənişlərin səbəbi açılır.</small>
    </div>
  );
}
