"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Printer } from "lucide-react";
import { Field, Modal } from "./components";
import PayrollBank from "./PayrollBank";
import PayrollReport from "./PayrollReport";
import { payslipHtml } from "@/lib/payslip-html";

type Notify = (message: string) => void;
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

type Deduction = { label: string; amount: number; kind: "general" | "writ" | "alimony" };
type Inputs = { bonus: number; allowance: number; overtimeHours: number; restDayHours: number; restDayWithinNorm: boolean; nightHours: number; nightPercent: number; deductions: Deduction[]; note: string };
type Line = { id: string; label: string; amount: number; article: string };
type Result = {
  normDays: number; workedDays: number; paidLeaveDays: number; downtimeDays: number; benefitDays: number; unpaidDays: number; hourly: number;
  lines: Line[]; benefitAmount: number; benefitCalendarDays: number; gross: number; incomeTax: number; employeeSocial: number; employeeUnemployment: number; employeeMedical: number;
  employerSocial: number; employerUnemployment: number; employerMedical: number; employerCost: number; net: number; taxReduction: number;
  otherDeductions: (Deduction & { applied: number })[]; deductionsCapped: boolean; advances: number; toPay: number; advanceExcess: number; notes: string[];
};
type Payment = { id: string; kind: "advance" | "salary" | "vacation" | "benefit" | "extra"; amount: number; paidOn: string; method: string; note: string; title: string; batchId: string; reversed: boolean; reversedBy: string; reverseReason: string };
const KIND_LABEL: Record<Payment["kind"], string> = { advance: "Avans", salary: "Əmək haqqı", vacation: "Məzuniyyət haqqı", benefit: "Sosial sığorta müavinəti", extra: "Digər ödəniş" };
type Row = {
  employeeId: string; name: string; position: string; department: string; status: string; monthlySalary: number; weekHours: number; iban: string; bankName: string; card: string; payMethod: string; fin: string; ssn: string; startDate: string; sector: string; benefit: string; section: string; salaryType: string; lastPaid: string;
  taxReduction: number; annual: { months: number; estimated: boolean; averageMonthly: number; calendarDays: number } | null; inputs: Inputs; result: Result; advances: number; salaryPaid: number; vacationDue: number; vacationPaid: number; vacationOutstanding: number; benefitDue: number; benefitPaid: number; benefitOutstanding: number; extraPaid: number; outstanding: number; availableAdvance: number;
  earnedToDate: number; payments: Payment[];
};
type Sheet = {
  month: string; status: "draft" | "approved"; approvedBy: string; approvedAt: string;
  settings: { advanceDay: number; payDay: number; dualThreshold: number; problem: string }; schedule: { advanceDate: string; payDate: string };
  workingDays: number; rows: Row[];
  totals: { employees: number; gross: number; incomeTax: number; employeeInsurance: number; net: number; advances: number; toPay: number; outstanding: number; employerContributions: number; employerCost: number };
};

const azn = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—");
const shift = (month: string, by: number) => {
  const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};
const MONTHS = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
const monthName = (month: string) => `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
const KIND_TEXT = { general: "Ümumi (20%-dək)", writ: "İcra sənədi (50%-dək)", alimony: "Aliment və s. (70%-dək)" };

export default function PayrollPage({ notify }: { notify: Notify }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [edit, setEdit] = useState<Row | null>(null);
  const [advance, setAdvance] = useState<Row | null>(null);
  const [paying, setPaying] = useState<Row | null>(null);
  const [settings, setSettings] = useState(false);
  const [bank, setBank] = useState(false);
  const [view, setView] = useState<"sheet" | "report">("sheet");
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<Sheet>(`company/payroll?month=${month}`)
      .then(setSheet)
      .catch((error) => notifyRef.current((error as Error).message));
  }, [month]);
  useEffect(load, [load]);
  async function act(path: string, body: Record<string, unknown>, done: string) {
    try {
      await request(path, { month, ...body });
      notify(done);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function printSlip(row: Row) {
    try {
      const data = await request<{ company: string; month: string; schedule: { payDate: string }; row: Row }>(`company/payroll/payslip?month=${month}&employeeId=${row.employeeId}`);
      const r = data.row;
      const win = window.open("", "_blank");
      if (!win) return notify("Çap pəncərəsi bloklanıb.");
      win.document.write(payslipHtml({ company: data.company, month: data.month, approved: sheet?.status === "approved", payDate: data.schedule.payDate, row: r }));
      win.document.close();
      win.focus();
      win.print();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (view === "report")
    return (
      <div className="company-page payroll-page">
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => setView("sheet")}>← Əmək haqqı cədvəli</button>
          <b>İşçilərlə hesablaşma hesabatı</b>
        </div>
        <PayrollReport initialMonth={month} notify={notify} />
      </div>
    );
  if (!sheet) return <p className="muted">Yüklənir…</p>;
  const t = sheet.totals;
  const approved = sheet.status === "approved";
  const paidTotal = Math.round(sheet.rows.reduce((sum, r) => sum + r.advances + r.salaryPaid, 0) * 100) / 100;
  const dueTotal = Math.round((paidTotal + t.outstanding) * 100) / 100;
  const paidShare = dueTotal > 0 ? Math.min(100, Math.round((paidTotal / dueTotal) * 100)) : 0;
  return (
    <div className="company-page payroll-page">
      <div className="section-heading">
        <div className="admin-actions">
          <button type="button" aria-label="Əvvəlki ay" onClick={() => setMonth(shift(month, -1))}>
            <ChevronLeft size={16} />
          </button>
          <b>{monthName(month)}</b>
          <button type="button" aria-label="Növbəti ay" onClick={() => setMonth(shift(month, 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="admin-actions">
          <a className="secondary report-button" href={`/api/joblink/company/payroll/export?month=${month}&kind=sheet`} download>
            <Download size={14} /> Cədvəl (XLSX)
          </a>
          <a className="secondary report-button" href={`/api/joblink/company/payroll/export?month=${month}&kind=declaration`} download>
            <Download size={14} /> Bəyannamə üçün (XLSX)
          </a>
          <a className="secondary report-button" href={`/api/joblink/company/payroll/export?month=${month}&kind=bank`} download>
            <Download size={14} /> Bank reyestri (XLSX)
          </a>
          <button type="button" className="secondary" onClick={() => setView("report")}>
            Hesablaşma hesabatı
          </button>
          <button type="button" className="primary" onClick={() => setBank(true)}>
            Bank və ödəniş sənədləri
          </button>
          <button type="button" className="secondary" onClick={() => setSettings(true)}>
            Ödəniş ayarları
          </button>
        </div>
      </div>
      <p className={`plan-state plan-${approved ? "approved" : "draft"}`}>
        {approved
          ? `${monthName(month)} təsdiqlənib (${sheet.approvedBy || "—"}, ${dmy(sheet.approvedAt.slice(0, 10))}). Hesablama dondurulub; yalnız ödənişlər qeyd olunur.`
          : "Layihə: cədvəl davamiyyətdən, maaşdan və vergi güzəştlərindən avtomatik hesablanır. Əlavə, tutulma və avansları daxil edin, sonra ayı təsdiqləyin."}{" "}
        Ödəniş günü: <b>{dmy(sheet.schedule.payDate)}</b>
        {sheet.schedule.advanceDate && (
          <>
            {" "}
            · avans günü: <b>{dmy(sheet.schedule.advanceDate)}</b>
          </>
        )}{" "}
        <small className="muted">(istirahət və bayram günü olarsa əvvəlki iş günü — Əmək M. 172.3)</small>
      </p>
      <div className="staff-kpis">
        <div className="staff-kpi"><small>Hesablanıb (gross)</small><strong>{azn(t.gross)}</strong><span>{t.employees} işçi · {sheet.workingDays} iş günü</span></div>
        <div className="staff-kpi"><small>Vergi və sığorta (işçi)</small><strong>{azn(t.incomeTax + t.employeeInsurance)}</strong><span>gəlir vergisi {azn(t.incomeTax)}</span></div>
        <div className="staff-kpi"><small>Net (əlinə)</small><strong>{azn(t.net)}</strong><span>avans {azn(t.advances)}</span></div>
        <div className="staff-kpi"><small>Ödənilib (avans və maaş)</small><strong>{azn(paidTotal)}</strong><span>{paidShare}% · cəmi {azn(dueTotal)}</span><i className="pay-progress"><b style={{ width: `${paidShare}%` }} /></i></div>
        <div className="staff-kpi staff-kpi-good"><small>Ödəniləcək qalıq</small><strong>{azn(t.outstanding)}</strong><span>hesablanmış {azn(t.toPay)}</span></div>
        <div className="staff-kpi"><small>İşəgötürənin xərci</small><strong>{azn(t.employerCost)}</strong><span>sığorta payı {azn(t.employerContributions)}</span></div>
      </div>
      <div className="admin-actions payroll-actions">
        {!approved && (
          <button type="button" className="primary" onClick={() => window.confirm(`${monthName(month)} üçün əmək haqqı cədvəli təsdiqlənsin? Hesablama dondurulacaq.`) && void act("company/payroll/approve", {}, "Ay təsdiqləndi.")}>
            Ayı təsdiqlə
          </button>
        )}
        {approved && (
          <>
            <button type="button" className="primary" disabled={t.outstanding <= 0} onClick={() => window.confirm(`${azn(t.outstanding)} məbləğində bütün qalıq ödənilmiş kimi qeyd edilsin?`) && void act("company/payroll/pay-all", { method: "bank" }, "Ödənişlər qeyd edildi.")}>
              Hamısını ödənilmiş qeyd et
            </button>
            <button type="button" className="secondary" onClick={() => window.confirm("Təsdiqi geri çəkmək hesablamanı yenidən açır. Davam edilsin?") && void act("company/payroll/reopen", {}, "Təsdiq geri çəkildi.")}>
              Təsdiqi geri çək (direktor)
            </button>
          </>
        )}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table payroll-table">
          <thead>
            <tr>
              <th>İşçi</th>
              <th>Gün</th>
              <th>Gross</th>
              <th>Vergi və sığorta</th>
              <th>Net</th>
              <th>Avans</th>
              <th>Ödəniləcək</th>
              <th>Qalıq</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((r) => (
              <tr key={r.employeeId}>
                <td>
                  <b>{r.name}</b>
                  <small className="skill-description">{[r.position, r.department, r.section].filter(Boolean).join(" · ")}</small>
                  {r.weekHours < 40 && <small className="week-badge">{r.weekHours} saatlıq həftə</small>}
                  {r.monthlySalary <= 0 && <small className="danger-text">Maaş daxil edilməyib</small>}
                </td>
                <td>
                  {r.result.workedDays + r.result.paidLeaveDays + r.result.downtimeDays} / {r.result.normDays}
                  {(r.result.benefitDays > 0 || r.result.unpaidDays > 0) && <small className="skill-description">{r.result.benefitDays ? `müavinət ${r.result.benefitDays}${r.result.benefitAmount ? ` (${azn(r.result.benefitAmount)}, ayrıca)` : ""}` : ""} {r.result.unpaidDays ? `ödənişsiz ${r.result.unpaidDays}` : ""}</small>}
                </td>
                <td>
                  {azn(r.result.gross)}
                  <small className="skill-description">maaş {azn(r.monthlySalary)}</small>
                </td>
                <td>{azn(r.result.gross - r.result.net)}{r.taxReduction > 0 && <small className="skill-description">vergi güzəşti {r.taxReduction} AZN</small>}</td>
                <td>{azn(r.result.net)}</td>
                <td>
                  {r.advances ? azn(r.advances) : "—"}
                  {!approved && <small className="skill-description">verilə bilər: {azn(r.availableAdvance)}</small>}
                </td>
                <td>
                  <b>{azn(r.result.toPay)}</b>
                  {r.result.advanceExcess > 0 && <small className="danger-text">avans {azn(r.result.advanceExcess)} artıqdır</small>}
                </td>
                <td>
                  {r.outstanding > 0 ? azn(r.outstanding) : approved ? "ödənilib" : "—"}
                  {(r.advances > 0 || r.salaryPaid > 0) && <small className="skill-description">ödənilib {azn(r.advances + r.salaryPaid)}{r.lastPaid ? ` · son ${dmy(r.lastPaid)}` : ""}</small>}
                  <small className="skill-description">{r.payMethod === "cash" ? "nağd" : r.payMethod === "card" ? `kart ${r.card || "—"}` : r.iban ? `IBAN …${r.iban.slice(-6)}` : r.card ? `kart ${r.card}` : "hesab rekviziti yoxdur"}</small>
                </td>
                <td className="admin-actions">
                  {!approved && (
                    <button type="button" onClick={() => setEdit(r)}>
                      Əlavə / tutulma
                    </button>
                  )}
                  {!approved && sheet.settings.advanceDay > 0 && (
                    <button type="button" onClick={() => setAdvance(r)}>
                      Avans
                    </button>
                  )}
                  {(approved || r.payments.length > 0) && (
                    <button type="button" className={approved && (r.outstanding > 0 || r.vacationOutstanding > 0 || r.benefitOutstanding > 0) ? "primary" : undefined} onClick={() => setPaying(r)}>
                      {approved && r.outstanding > 0 ? "Ödə" : "Ödənişlər"}
                    </button>
                  )}
                  <button type="button" aria-label="Haqq-hesab vərəqəsi" title="Haqq-hesab vərəqəsi" onClick={() => void printSlip(r)}>
                    <Printer size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {!sheet.rows.length && (
              <tr>
                <td colSpan={9}>
                  <p className="admin-empty">Bu ay üçün işçi yoxdur. İşçiləri “İşçilər” səhifəsindən əlavə edin.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <small className="skill-picker-help">
        Hesablama: aylıq maaş × (ödənilən gün / norma günü); ödənişli məzuniyyət, donor, tibbi müayinə və çağırış günləri tam, boşdayanma 2/3 ödənilir (169); analıq, uşağa qulluq, atalıq və xəstəlik günləri Sosial Sığorta müavinəti ilə ödənilir (cədvələ daxil deyil); ödənişsiz məzuniyyət və üzrsüz yoxluq ödənilmir. Gəlir vergisi və sığorta paylarının dərəcələri 2026-cı il üçündür; vergi güzəşti işçi kartındakı məlumata görə tətbiq olunur. Məzuniyyət haqqının dəqiq məbləği (Əmək M. 140) əvvəlki 12 ayın orta əmək haqqından hesablanır — burada aylıq maaşın gün payı götürülür.
      </small>
      {edit && <InputsModal month={month} row={edit} notify={notify} onClose={() => setEdit(null)} onSaved={load} />}
      {advance && <AdvanceModal month={month} row={advance} schedule={sheet.schedule.advanceDate} notify={notify} onClose={() => setAdvance(null)} onChanged={load} />}
      {paying && <PayModal month={month} row={paying} approved={approved} notify={notify} onClose={() => setPaying(null)} onSaved={load} />}
      {bank && <PayrollBank month={month} notify={notify} onClose={() => setBank(false)} onChanged={load} />}
      {settings && <SettingsModal settings={sheet.settings} notify={notify} onClose={() => setSettings(false)} onSaved={load} />}
    </div>
  );
}

function InputsModal({ month, row, notify, onClose, onSaved }: { month: string; row: Row; notify: Notify; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Inputs>(row.inputs);
  const num = (key: keyof Inputs, label: string, step = 1) => (
    <Field label={label}>
      <input type="number" min={0} step={step} value={Number(form[key]) || ""} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} />
    </Field>
  );
  async function save() {
    try {
      await request("company/payroll/input", { month, employeeId: row.employeeId, inputs: form });
      notify("Saxlanıldı.");
      onSaved();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const setDeduction = (i: number, patch: Partial<Deduction>) => setForm({ ...form, deductions: form.deductions.map((d, k) => (k === i ? { ...d, ...patch } : d)) });
  return (
    <Modal title={`${row.name}: əlavələr və tutulmalar`} onClose={onClose}>
      <div className="offer-composer">
        <p className="muted">Maaş: {azn(row.monthlySalary)} · saatlıq: {azn(row.result.hourly)} (aylıq maaş / aylıq norma saatı).</p>
        <div className="form-grid">
          {num("bonus", "Mükafat (AZN)")}
          {num("allowance", "Əlavə (AZN)")}
          {num("overtimeHours", "İş vaxtından artıq saat (2 qat, Əmək M. 165)", 0.5)}
          {num("restDayHours", "İstirahət/bayram günü işlənən saat (164)", 0.5)}
          <label className="check-row"><input type="checkbox" checked={form.restDayWithinNorm} onChange={(e) => setForm({ ...form, restDayWithinNorm: e.target.checked })} /> İş aylıq norma çərçivəsindədir (1 qat; normadan artıqdırsa 2 qat)</label>
          {num("nightHours", "Gecə saatı (22:00–06:00)", 0.5)}
          {num("nightPercent", "Gecə əlavəsi (%) — müqavilədə")}
        </div>
        <h4>Digər tutulmalar (Əmək M. 175–176)</h4>
        <p className="muted">Bütün tutulmalar birlikdə ödəniləcək məbləğin 20%-ni (icra sənədi 50%, aliment 70%) keçə bilməz; artıq hissə tutulmur.</p>
        {form.deductions.map((d, i) => (
          <div key={i} className="org-add structure-add">
            <input className="search-input" placeholder="Tutulmanın adı və səbəbi" value={d.label} onChange={(e) => setDeduction(i, { label: e.target.value })} />
            <input className="search-input" type="number" min={0} style={{ maxWidth: 110 }} value={d.amount || ""} onChange={(e) => setDeduction(i, { amount: Number(e.target.value) })} />
            <select value={d.kind} onChange={(e) => setDeduction(i, { kind: e.target.value as Deduction["kind"] })}>
              {Object.entries(KIND_TEXT).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button type="button" onClick={() => setForm({ ...form, deductions: form.deductions.filter((_, k) => k !== i) })}>×</button>
          </div>
        ))}
        <button type="button" className="secondary" disabled={form.deductions.length >= 20} onClick={() => setForm({ ...form, deductions: [...form.deductions, { label: "", amount: 0, kind: "general" }] })}>
          + Tutulma əlavə et
        </button>
        <Field label="Qeyd">
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
        <button type="button" className="primary" onClick={() => void save()}>Yadda saxla</button>
      </div>
    </Modal>
  );
}

function AdvanceModal({ month, row, schedule, notify, onClose, onChanged }: { month: string; row: Row; schedule: string; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const [amount, setAmount] = useState(row.availableAdvance);
  const [paidOn, setPaidOn] = useState(schedule || new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("bank");
  const advances = row.payments.filter((p) => p.kind === "advance" && !p.reversed);
  async function give() {
    try {
      await request("company/payroll/pay", { month, employeeId: row.employeeId, kind: "advance", amount, paidOn, method });
      notify("Avans qeyd edildi.");
      onChanged();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function remove(p: Payment) {
    const reason = window.prompt("Avansı geri çəkmə səbəbi:");
    if (!reason) return;
    try {
      await request("company/payroll/payment/reverse", { id: p.id, reason });
      notify("Avans geri çəkildi.");
      onChanged();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <Modal title={`Avans: ${row.name}`} onClose={onClose}>
      <div className="offer-composer">
        <div className="staff-kpis">
          <div className="staff-kpi"><small>Ayın net əmək haqqı</small><strong>{azn(row.result.net)}</strong></div>
          <div className="staff-kpi"><small>Bu günədək qazanılıb</small><strong>{azn(row.earnedToDate)}</strong><span>işlənmiş günlərin payı</span></div>
          <div className="staff-kpi staff-kpi-good"><small>İndi verilə bilər</small><strong>{azn(row.availableAdvance)}</strong><span>avans {azn(row.advances)} verilib</span></div>
        </div>
        <div className="form-grid">
          <Field label="Avans məbləği (AZN)"><input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
          <Field label="Ödəniş tarixi"><input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
          <Field label="Üsul">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="bank">Bank köçürməsi</option>
              <option value="cash">Nağd</option>
            </select>
          </Field>
        </div>
        <p className="muted">Avans işçinin bu günədək qazandığı (net) əmək haqqından artıq ola bilməz; daha çoxunu yalnız direktor verə bilər. Avans ayın sonunda əmək haqqından tutulur.</p>
        <button type="button" className="primary" disabled={!(amount > 0)} onClick={() => void give()}>Avansı qeyd et</button>
        {!!advances.length && (
          <>
            <h4>Verilmiş avanslar</h4>
            <ul>
              {advances.map((p) => (
                <li key={p.id}>
                  {dmy(p.paidOn)} — {azn(p.amount)} ({p.method === "cash" ? "nağd" : "bank"}){" "}
                  <button type="button" className="text-button" onClick={() => void remove(p)}>geri çək</button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
}

const PAY_KINDS: { id: "salary" | "vacation" | "benefit" | "extra"; label: string }[] = [
  { id: "salary", label: "Əmək haqqı (qalıq)" },
  { id: "vacation", label: "Məzuniyyət haqqı" },
  { id: "benefit", label: "Sosial sığorta müavinəti (xəstəlik/analıq)" },
  { id: "extra", label: "Digər ödəniş (ezamiyyət, maddi yardım və s.)" },
];

function PayModal({ month, row, approved, notify, onClose, onSaved }: { month: string; row: Row; approved: boolean; notify: Notify; onClose: () => void; onSaved: () => void }) {
  const owed = (kind: (typeof PAY_KINDS)[number]["id"]) => (kind === "salary" ? row.outstanding : kind === "vacation" ? row.vacationOutstanding : kind === "benefit" ? row.benefitOutstanding : 0);
  const first = PAY_KINDS.find((k) => owed(k.id) > 0)?.id || "salary";
  const [kind, setKind] = useState<(typeof PAY_KINDS)[number]["id"]>(first);
  const [amount, setAmount] = useState(owed(first));
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("bank");
  async function save() {
    try {
      await request("company/payroll/pay", { month, employeeId: row.employeeId, kind, amount, paidOn, method, title, note });
      notify("Ödəniş qeyd edildi.");
      onSaved();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function reverse(p: Payment) {
    const reason = window.prompt(`${KIND_LABEL[p.kind]} (${azn(p.amount)}) ödənişini geri çəkmə səbəbi:`);
    if (!reason) return;
    try {
      await request("company/payroll/payment/reverse", { id: p.id, reason });
      notify("Ödəniş geri çəkildi.");
      onSaved();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <Modal title={`Ödənişlər: ${row.name}`} onClose={onClose}>
      <div className="offer-composer">
        <div className="staff-kpis">
          <div className="staff-kpi"><small>Əmək haqqı qalığı</small><strong>{azn(row.outstanding)}</strong><span>avans {azn(row.advances)} · ödənilib {azn(row.salaryPaid)}</span></div>
          {row.vacationDue > 0 && <div className="staff-kpi"><small>Məzuniyyət haqqı</small><strong>{azn(row.vacationOutstanding)}</strong><span>hesablanıb {azn(row.vacationDue)} · ödənilib {azn(row.vacationPaid)}</span></div>}
          {row.benefitDue > 0 && <div className="staff-kpi"><small>Müavinət</small><strong>{azn(row.benefitOutstanding)}</strong><span>hesablanıb {azn(row.benefitDue)} · ödənilib {azn(row.benefitPaid)}</span></div>}
          {row.extraPaid > 0 && <div className="staff-kpi"><small>Digər ödənişlər</small><strong>{azn(row.extraPaid)}</strong></div>}
        </div>
        <p className="muted">{row.iban ? `IBAN: ${row.iban}` : "IBAN daxil edilməyib"}{row.card ? ` · kart ${row.card}` : ""}. Hər növ ayrıca ödənilir və ayrıca geri çəkilə bilər.</p>
        {!approved && <p className="danger-text">Əmək haqqı, məzuniyyət haqqı və müavinət ödənişi üçün əvvəl ayı təsdiqləyin; digər ödənişi indi də qeyd etmək olar.</p>}
        <div className="form-grid">
          <Field label="Ödənişin növü">
            <select value={kind} onChange={(e) => { const k = e.target.value as typeof kind; setKind(k); setAmount(owed(k)); }}>
              {PAY_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}{k.id !== "extra" ? ` — qalıq ${azn(owed(k.id))}` : ""}</option>)}
            </select>
          </Field>
          {kind === "extra" && <Field label="Ödənişin adı"><input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Məsələn: ezamiyyət xərci" /></Field>}
          <Field label="Məbləğ (AZN)"><input type="number" min={0} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} /></Field>
          <Field label="Ödəniş tarixi"><input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} /></Field>
          <Field label="Üsul">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="bank">Bank köçürməsi</option>
              <option value="card">Kart</option>
              <option value="cash">Nağd</option>
            </select>
          </Field>
          <Field label="Qeyd"><input value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
        <button type="button" className="primary" disabled={!(amount > 0) || (kind !== "extra" && !approved)} onClick={() => void save()}>Ödənildi</button>
        {!!row.payments.length && (
          <>
            <h4>Ödəniş tarixçəsi</h4>
            <ul className="payment-history">
              {row.payments.map((p) => (
                <li key={p.id} className={p.reversed ? "payment-reversed" : ""}>
                  {dmy(p.paidOn)} — <b>{KIND_LABEL[p.kind]}{p.title ? `: ${p.title}` : ""}</b> {azn(p.amount)} ({p.method === "cash" ? "nağd" : p.method === "card" ? "kart" : "bank"}){p.note ? ` · ${p.note}` : ""}{" "}
                  {p.reversed ? <small className="danger-text">geri çəkilib: {p.reverseReason} ({p.reversedBy})</small> : <button type="button" className="text-button" onClick={() => void reverse(p)}>geri çək</button>}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Modal>
  );
}

function SettingsModal({ settings, notify, onClose, onSaved }: { settings: Sheet["settings"]; notify: Notify; onClose: () => void; onSaved: () => void }) {
  const [advanceDay, setAdvanceDay] = useState(settings.advanceDay);
  const [payDay, setPayDay] = useState(settings.payDay);
  const [dual, setDual] = useState(settings.dualThreshold);
  async function save() {
    try {
      await request("company/payroll/settings", { advanceDay, payDay, dualThreshold: dual });
      notify("Ayarlar saxlanıldı.");
      onSaved();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <Modal title="Əmək haqqı ödəniş ayarları" onClose={onClose}>
      <div className="offer-composer">
        <p className="muted">Əmək haqqı ayda ən azı bir dəfə verilir. Tərəflərin razılığı ilə ikiyə bölünə bilər: avans və qalan hissə, aralarında 16 gündən çox fasilə olmamaqla (Əmək M. 172.1). Ödəniş günü istirahət və ya bayram gününə düşərsə, əvvəlki iş günündə verilir (172.3). Gecikdirilən hər gün üçün ən azı 1% ödənc verilir (172.5).</p>
        <div className="form-grid">
          <Field label="Avans günü (0 — avans verilmir)"><input type="number" min={0} max={28} value={advanceDay} onChange={(e) => setAdvanceDay(Number(e.target.value))} /></Field>
          <Field label="Əmək haqqının ödəniş günü (həmin ayın)"><input type="number" min={1} max={31} value={payDay} onChange={(e) => setPayDay(Number(e.target.value))} /></Field>
          <Field label="Bank ödənişinə iki nəfərin təsdiqi (AZN-dən; 0 — bir təsdiq kifayətdir)"><input type="number" min={0} step={100} value={dual} onChange={(e) => setDual(Number(e.target.value))} /></Field>
        </div>
        <button type="button" className="primary" onClick={() => void save()}>Saxla</button>
      </div>
    </Modal>
  );
}
