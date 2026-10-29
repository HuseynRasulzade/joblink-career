"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Modal } from "./components";

type Notify = (message: string) => void;
type Month = {
  month: string; status: string; normDays: number; workedDays: number; paidLeaveDays: number; benefitDays: number; unpaidDays: number;
  gross: number; incomeTax: number; employeeSocial: number; employeeUnemployment: number; employeeMedical: number; employerSocial: number; employerUnemployment: number; employerMedical: number; employerCost: number;
  net: number; deductions: number; deductionsAsked: number; due: number; lines: Record<string, number>;
  advance: number; salary: number; vacation: number; benefit: number; extra: number; outstanding: number; benefitDue: number; benefitOutstanding: number; employeeOwes: number; lastPaid: string; reversed: number;
};
type Pay = { month: string; paidOn: string; kind: string; label: string; title: string; amount: number; method: string; note: string; batchId: string; reversed: boolean; reverseReason: string; reversedBy: string };
type Employee = {
  employeeId: string; name: string; position: string; department: string; section: string; fin: string; iban: string; startDate: string;
  gross: number; tax: number; insurance: number; net: number; deductions: number; deductionsAsked: number; due: number; dueApproved: number; vacation: number; benefitDue: number; employerCost: number; lines: Record<string, number>;
  paid: Record<string, number>; paidTotal: number; companyOwes: number; pendingOwes: number; benefitOwes: number; employeeOwes: number; balance: number;
  months: Month[]; payments: Pay[];
};
type Report = {
  from: string; to: string; approvedOnly: boolean; months: { month: string; status: string }[]; employees: Employee[];
  totals: { employees: number; gross: number; tax: number; insurance: number; net: number; deductions: number; due: number; dueApproved: number; paidTotal: number; advance: number; salary: number; vacation: number; benefit: number; extra: number; companyOwes: number; pendingOwes: number; benefitOwes: number; employeeOwes: number; balance: number; employerCost: number };
};

const azn = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—");
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const METHOD: Record<string, string> = { bank: "bank", card: "kart", cash: "nağd", other: "digər" };
const LINE_LABEL: Record<string, string> = { worked: "İşlənmiş günlər", vacation: "Əmək məzuniyyəti (md. 140)", "paid-leave": "Digər ödənişli günlər", downtime: "Boşdayanma (2/3)", overtime: "Artıq iş", "rest-day": "İstirahət/bayram işi", night: "Gecə işi", allowance: "Əlavələr", bonus: "Mükafat" };
const state = (e: Employee) => (e.balance > 0.005 ? "Şirkət işçiyə borcludur" : e.balance < -0.005 ? "İşçi şirkətə borcludur" : "Hesablaşma bağlıdır");

export default function PayrollReport({ initialMonth, notify }: { initialMonth: string; notify: Notify }) {
  const [from, setFrom] = useState(`${initialMonth.slice(0, 4)}-01`);
  const [to, setTo] = useState(initialMonth);
  const [approvedOnly, setApprovedOnly] = useState(false);
  const [loaded, setLoaded] = useState<{ key: string; data: Report } | null>(null);
  const key = `${from}|${to}|${approvedOnly ? 1 : 0}`;
  const report = loaded?.key === key ? loaded.data : null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState("");
  const [only, setOnly] = useState<"all" | "debt">("all");
  const [ask, setAsk] = useState<"excel" | "print" | null>(null);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    fetch(`/api/joblink/company/payroll/report?from=${from}&to=${to}${approvedOnly ? "&approvedOnly=1" : ""}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json().catch(() => ({}))) as Report & { error?: string };
        if (!response.ok) throw new Error(data.error || "Hesabat alınmadı.");
        setLoaded({ key: `${from}|${to}|${approvedOnly ? 1 : 0}`, data });
      })
      .catch((error) => notifyRef.current((error as Error).message));
  }, [from, to, approvedOnly]);
  useEffect(load, [load]);

  function exportExcel(mode: "summary" | "monthly") {
    const link = document.createElement("a");
    link.href = `/api/joblink/company/payroll/report/export?from=${from}&to=${to}&mode=${mode}${approvedOnly ? "&approvedOnly=1" : ""}`;
    link.download = "";
    link.click();
  }
  function print(mode: "summary" | "monthly", list: Employee[]) {
    if (!report) return;
    const win = window.open("", "_blank");
    if (!win) return notify("Çap pəncərəsi bloklanıb.");
    const t = report.totals;
    const style = `body{font:12px/1.4 Arial,sans-serif;color:#17332b;margin:18px}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:18px 0 4px;page-break-after:avoid}table{width:100%;border-collapse:collapse;margin-top:6px}
      th,td{border:1px solid #cdd9d3;padding:3px 6px;text-align:right}th{background:#eef4f1}td:first-child,th:first-child{text-align:left}small{color:#5b7068}p{margin:4px 0}.emp{page-break-inside:avoid;margin-bottom:14px}.draft{color:#9a6700}`;
    const head = `<h1>İşçilərlə hesablaşma hesabatı</h1><p>Dövr: ${report.from} – ${report.to}${report.approvedOnly ? " (yalnız təsdiqlənmiş aylar)" : ""} · ${list.length} işçi</p>
      <p>Ödəniləcək cəmi: <b>${azn(t.due)}</b> · ödənilib: <b>${azn(t.paidTotal)}</b> · şirkətin borcu (təsdiqlənmiş aylar): <b>${azn(t.companyOwes + t.benefitOwes)}</b>${t.pendingOwes ? ` · gözlənilən (layihə aylar): <b>${azn(t.pendingOwes)}</b>` : ""} · işçilərin borcu: <b>${azn(t.employeeOwes)}</b></p>`;
    let body: string;
    if (mode === "summary") {
      body = `<table><thead><tr><th>İşçi</th><th>Ödəniləcək</th><th>Avans</th><th>Maaş və məzuniyyət</th><th>Müavinət</th><th>Digər</th><th>Cəmi ödənilib</th><th>Şirkətin borcu</th><th>Gözlənilən</th><th>İşçinin borcu</th><th>Xalis qalıq</th></tr></thead><tbody>${list
        .map((e) => `<tr><td>${esc(e.name)}<br><small>${esc([e.position, e.department].filter(Boolean).join(" · "))}</small></td><td>${azn(e.due)}</td><td>${azn(e.paid.advance)}</td><td>${azn(e.paid.salary + e.paid.vacation)}</td><td>${azn(e.paid.benefit)}</td><td>${azn(e.paid.extra)}</td><td>${azn(e.paidTotal)}</td><td>${azn(e.companyOwes + e.benefitOwes)}</td><td>${azn(e.pendingOwes)}</td><td>${azn(e.employeeOwes)}</td><td><b>${azn(e.balance)}</b><br><small>${state(e)}</small></td></tr>`)
        .join("")}</tbody></table>`;
    } else {
      body = list
        .map((e) => {
          const months = e.months
            .map((m) => `<tr class="${m.status === "approved" ? "" : "draft"}"><td>${m.month}${m.status === "approved" ? "" : " (layihə)"}</td><td>${m.workedDays + m.paidLeaveDays}/${m.normDays}</td><td>${azn(m.gross)}</td><td>${azn(m.incomeTax)}</td><td>${azn(m.employeeSocial + m.employeeUnemployment + m.employeeMedical)}</td><td>${azn(m.deductions)}</td><td>${azn(m.due)}</td><td>${azn(m.advance)}</td><td>${azn(m.salary + m.vacation)}</td><td>${azn(m.benefit + m.extra)}</td><td>${azn(m.outstanding + m.benefitOutstanding)}</td></tr>`)
            .join("");
          const pays = e.payments
            .map((p) => `<tr><td>${dmy(p.paidOn)}</td><td>${esc(p.label)}${p.title ? `: ${esc(p.title)}` : ""}</td><td>${p.month}</td><td>${METHOD[p.method] || esc(p.method) || "—"}</td><td>${esc(p.note || "")}${p.reversed ? ` <small>(geri çəkilib: ${esc(p.reverseReason)})</small>` : ""}</td><td>${azn(p.amount)}</td></tr>`)
            .join("");
          return `<div class="emp"><h2>${esc(e.name)} <small>${esc([e.fin, e.position, e.department].filter(Boolean).join(" · "))}</small></h2>
            <p>Hesablanıb ${azn(e.gross)} → vergi ${azn(e.tax)}, sığorta ${azn(e.insurance)}${e.deductions ? `, tutulmalar ${azn(e.deductions)}` : ""} → ödəniləcək ${azn(e.due)} · ödənilib ${azn(e.paidTotal)} · <b>${state(e)}: ${azn(Math.abs(e.balance))}</b></p>
            <table><thead><tr><th>Ay</th><th>Gün</th><th>Gross</th><th>Gəlir vergisi</th><th>Sığorta</th><th>Tutulma</th><th>Ödəniləcək</th><th>Avans</th><th>Maaş/məzuniyyət</th><th>Müavinət/digər</th><th>Qalıq</th></tr></thead><tbody>${months}</tbody></table>
            ${pays ? `<table><thead><tr><th>Tarix</th><th>Ödənişin növü</th><th>Ay</th><th>Üsul</th><th>Qeyd</th><th>Məbləğ</th></tr></thead><tbody>${pays}</tbody></table>` : "<p><small>Bu dövrdə ödəniş yoxdur.</small></p>"}</div>`;
        })
        .join("");
    }
    win.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>Hesablaşma hesabatı ${report.from} – ${report.to}</title><style>${style}</style></head><body>${head}${body}<p>Xalis qalıq müsbətdirsə şirkət işçiyə borcludur, mənfidirsə işçi şirkətə. Layihə aylar hələ təsdiqlənməyib, onların qalığı borc sayılmır.</p></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  if (!report) return <p className="muted">Hesabat hazırlanır…</p>;
  const t = report.totals;
  const list = report.employees
    .filter((e) => e.name.toLowerCase().includes(query.trim().toLowerCase()))
    .filter((e) => only === "all" || Math.abs(e.balance) > 0.005 || e.employeeOwes > 0 || e.pendingOwes > 0);
  const drafts = report.months.filter((m) => m.status !== "approved").map((m) => m.month);
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
          <label className="check"><input type="checkbox" checked={approvedOnly} onChange={(e) => setApprovedOnly(e.target.checked)} /> Yalnız təsdiqlənmiş aylar</label>
        </div>
        <div className="admin-actions">
          <button type="button" className="secondary report-button" onClick={() => setAsk("excel")}><Download size={14} /> Excel</button>
          <button type="button" className="secondary" onClick={() => setAsk("print")}><Printer size={14} /> Çap</button>
        </div>
      </div>
      {drafts.length > 0 && <p className="muted">Təsdiqlənməmiş aylar ({drafts.join(", ")}) ilkin hesablamadır: onların qalığı şirkətin borcu sayılmır, ayrıca “gözlənilən” kimi göstərilir.</p>}
      <div className="staff-kpis">
        <div className="staff-kpi"><small>Ödəniləcək cəmi (net − tutulmalar)</small><strong>{azn(t.due)}</strong><span>təsdiqlənmiş aylar {azn(t.dueApproved)} · gross {azn(t.gross)}</span></div>
        <div className="staff-kpi"><small>Vergi və sığorta (işçidən)</small><strong>{azn(t.tax + t.insurance)}</strong><span>gəlir vergisi {azn(t.tax)} · sığorta {azn(t.insurance)}</span></div>
        <div className="staff-kpi"><small>Ödənilib</small><strong>{azn(t.paidTotal)}</strong><span>avans {azn(t.advance)} · maaş {azn(t.salary)} · məzuniyyət {azn(t.vacation)}</span></div>
        <div className="staff-kpi"><small>Müavinət və digər ödənişlər</small><strong>{azn(t.benefit + t.extra)}</strong><span>müavinət {azn(t.benefit)} · digər {azn(t.extra)}</span></div>
        <div className="staff-kpi staff-kpi-good"><small>Şirkətin borcu (təsdiqlənmiş aylar)</small><strong>{azn(t.companyOwes + t.benefitOwes)}</strong><span>əmək haqqı {azn(t.companyOwes)} · müavinət {azn(t.benefitOwes)}</span></div>
        <div className="staff-kpi"><small>Gözlənilən (layihə aylar)</small><strong>{azn(t.pendingOwes)}</strong><span>ay təsdiqlənəndə borca çevrilir</span></div>
        <div className="staff-kpi"><small>İşçilərin şirkətə borcu</small><strong>{azn(t.employeeOwes)}</strong><span>artıq verilmiş avans</span></div>
        <div className="staff-kpi"><small>İşəgötürənin ümumi xərci</small><strong>{azn(t.employerCost)}</strong><span>gross + işəgötürən sığortası</span></div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table payroll-table">
          <thead>
            <tr><th>İşçi</th><th>Ödəniləcək</th><th>Avans</th><th>Maaş və məzuniyyət</th><th>Müavinət</th><th>Digər</th><th>Cəmi ödənilib</th><th>Şirkətin borcu</th><th>Gözlənilən</th><th>İşçinin borcu</th><th>Xalis qalıq</th></tr>
          </thead>
          <tbody>
            {list.map((e) => (
              <Fragment key={e.employeeId}>
                <tr onClick={() => setOpen(open === e.employeeId ? "" : e.employeeId)} style={{ cursor: "pointer" }}>
                  <td><b>{e.name}</b><small className="skill-description">{[e.position, e.department, e.section].filter(Boolean).join(" · ")}</small></td>
                  <td>{azn(e.due)}</td>
                  <td>{azn(e.paid.advance)}</td>
                  <td>{azn(e.paid.salary + e.paid.vacation)}</td>
                  <td>{azn(e.paid.benefit)}</td>
                  <td>{azn(e.paid.extra)}</td>
                  <td><b>{azn(e.paidTotal)}</b></td>
                  <td>{azn(e.companyOwes + e.benefitOwes)}</td>
                  <td>{e.pendingOwes ? azn(e.pendingOwes) : "—"}</td>
                  <td>{e.employeeOwes ? <span className="danger-text">{azn(e.employeeOwes)}</span> : "—"}</td>
                  <td><b>{azn(e.balance)}</b><small className={e.balance < -0.005 ? "danger-text" : "skill-description"}>{state(e)}</small></td>
                </tr>
                {open === e.employeeId && (
                  <tr>
                    <td colSpan={11}>
                      <div className="report-detail">
                        <div>
                          <h4>Hesablanma</h4>
                          <dl className="workplace-info">
                            {Object.entries(e.lines).map(([id, amount]) => <div key={id}><dt>{LINE_LABEL[id] || id}</dt><dd>{azn(amount)}</dd></div>)}
                            <div><dt>Hesablanıb (gross)</dt><dd><b>{azn(e.gross)}</b></dd></div>
                            <div><dt>Gəlir vergisi</dt><dd>− {azn(e.tax)}</dd></div>
                            <div><dt>Sığorta (DSMF, işsizlik, tibbi)</dt><dd>− {azn(e.insurance)}</dd></div>
                            <div><dt>Net</dt><dd>{azn(e.net)}</dd></div>
                            {e.deductions > 0 && <div><dt>Digər tutulmalar{e.deductionsAsked > e.deductions ? ` (tələb ${azn(e.deductionsAsked)})` : ""}</dt><dd>− {azn(e.deductions)}</dd></div>}
                            <div><dt>Ödəniləcək</dt><dd><b>{azn(e.due)}</b></dd></div>
                            {e.benefitDue > 0 && <div><dt>Müavinət (ayrıca)</dt><dd>{azn(e.benefitDue)}</dd></div>}
                            <div><dt>İşəgötürənin ümumi xərci</dt><dd>{azn(e.employerCost)}</dd></div>
                          </dl>
                        </div>
                        <div>
                          <h4>Ödənişlər və səbəbləri</h4>
                          {e.payments.length ? (
                            <ul className="payment-history">
                              {e.payments.map((p, i) => (
                                <li key={i} className={p.reversed ? "payment-reversed" : ""}>
                                  {dmy(p.paidOn)} — <b>{p.label}{p.title ? `: ${p.title}` : ""}</b> ({p.month} ayı üçün) {azn(p.amount)} · {METHOD[p.method] || p.method || "—"}{p.batchId ? " · bank sənədi" : ""}{p.note ? ` · ${p.note}` : ""}
                                  {p.reversed && <small className="danger-text"> geri çəkilib: {p.reverseReason} ({p.reversedBy})</small>}
                                </li>
                              ))}
                            </ul>
                          ) : <p className="muted">Bu dövrdə ödəniş yoxdur.</p>}
                        </div>
                      </div>
                      <h4>Aylar üzrə</h4>
                      <table className="admin-table">
                        <thead><tr><th>Ay</th><th>Gün</th><th>Gross</th><th>Gəlir vergisi</th><th>Sığorta</th><th>Tutulma</th><th>Ödəniləcək</th><th>Avans</th><th>Maaş</th><th>Məzuniyyət</th><th>Müavinət</th><th>Digər</th><th>Qalıq</th></tr></thead>
                        <tbody>
                          {e.months.map((m) => (
                            <tr key={m.month} className={m.status === "approved" ? "" : "payment-reversed"}>
                              <td>{m.month}{m.status !== "approved" ? " (layihə)" : ""}</td>
                              <td>{m.workedDays + m.paidLeaveDays}/{m.normDays}{m.benefitDays ? <small className="skill-description">müavinət {m.benefitDays}</small> : null}{m.unpaidDays ? <small className="skill-description">ödənişsiz {m.unpaidDays}</small> : null}</td>
                              <td>{azn(m.gross)}</td><td>{azn(m.incomeTax)}</td><td>{azn(m.employeeSocial + m.employeeUnemployment + m.employeeMedical)}</td><td>{azn(m.deductions)}</td>
                              <td>{azn(m.due)}</td><td>{azn(m.advance)}</td><td>{azn(m.salary)}</td><td>{azn(m.vacation)}</td><td>{azn(m.benefit)}</td><td>{azn(m.extra)}</td><td>{azn(m.outstanding + m.benefitOutstanding)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!list.length && <tr><td colSpan={11}><p className="admin-empty">Seçilmiş dövr üçün işçi tapılmadı.</p></td></tr>}
          </tbody>
        </table>
      </div>
      <small className="skill-picker-help">Xalis qalıq təsdiqlənmiş aylara görə hesablanır: müsbətdirsə şirkət işçiyə borcludur (ödənilməmiş əmək haqqı və müavinət), mənfidirsə işçiyə hesablanandan artıq avans verilib. Sətrə basanda hesablanma, ödənişlərin səbəbi və aylar üzrə təfərrüat açılır.</small>
      {ask && (
        <Modal title={ask === "excel" ? "Excel hesabatı" : "Çap hesabatı"} onClose={() => setAsk(null)}>
          <div className="offer-composer">
            <p>Hesabat hansı formada hazırlansın? ({report.from} – {report.to}{approvedOnly ? ", yalnız təsdiqlənmiş aylar" : ""}, {list.length} işçi)</p>
            <div className="admin-actions">
              <button type="button" className="primary" onClick={() => { if (ask === "excel") exportExcel("monthly"); else print("monthly", list); setAsk(null); }}>
                Aylar üzrə ətraflı
              </button>
              <button type="button" className="secondary" onClick={() => { if (ask === "excel") exportExcel("summary"); else print("summary", list); setAsk(null); }}>
                Yekun (cədvəldəki kimi)
              </button>
            </div>
            <small className="muted">
              {ask === "excel"
                ? "Ətraflı: yekun vərəqə + hər işçinin hər ayı üzrə günlər, hesablanan komponentlər, vergi və sığorta, ödənişlər və qalıq + ay matrisi. Yekun: işçi başına bir sətir."
                : "Ətraflı: hər işçi üçün ayrıca blok (ay-ay cədvəl və ödənişlər). Yekun: işçi başına bir sətir. Çapa cədvəldə görünən (süzülmüş) işçilər düşür."}
            </small>
          </div>
        </Modal>
      )}
    </div>
  );
}
