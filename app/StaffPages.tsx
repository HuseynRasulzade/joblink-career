"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Plus, Printer, Trash2, Upload } from "lucide-react";
import { buildEmployeeOffer, buildOrder, leaveDays, orderNumber, ORDER_KINDS, type OrderInput, type OrderKind } from "@/lib/orders";
import { employeePay, tenure, vacationBalance, type SalaryType } from "@/lib/payroll";
import { readSheetRows } from "@/lib/question-file";
import {
  EMPLOYEE_TEMPLATE_EXAMPLE,
  EMPLOYEE_TEMPLATE_HEADERS,
  STAFF_TEMPLATE_EXAMPLE,
  STAFF_TEMPLATE_HEADERS,
  parseEmployeeRows,
  parseStaffRows,
} from "@/lib/staff-import";
import { createXlsx } from "@/lib/xlsx";
import { Field, Modal } from "./components";

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
const azn = (value: number) => `${value.toLocaleString("az-AZ", { maximumFractionDigits: 2 })} AZN`;

// ---------- Excel file: template and import ----------
function downloadTemplate(kind: "employees" | "staff") {
  const bytes = createXlsx(
    kind === "employees" ? EMPLOYEE_TEMPLATE_HEADERS : STAFF_TEMPLATE_HEADERS,
    [kind === "employees" ? EMPLOYEE_TEMPLATE_EXAMPLE : STAFF_TEMPLATE_EXAMPLE],
    kind === "employees" ? "İşçilər" : "Ştat",
  );
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = kind === "employees" ? "isciler-numune.xlsx" : "stat-numune.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

export function SheetImport({
  kind,
  onClose,
  onDone,
  notify,
}: {
  kind: "employees" | "staff";
  onClose: () => void;
  onDone: () => void;
  notify: Notify;
}) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => {
    if (!rows) return null;
    return kind === "employees" ? parseEmployeeRows(rows) : parseStaffRows(rows);
  }, [rows, kind]);
  async function pick(file: File | undefined) {
    if (!file) return;
    try {
      setRows(await readSheetRows(file));
      setFileName(file.name);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function send() {
    if (!rows) return;
    setBusy(true);
    try {
      const result = await request<{ created: number; updated: number; issues: unknown[] }>(
        kind === "employees" ? "company/employees/import" : "company/staff/import",
        { rows },
      );
      notify(`${result.created} yeni, ${result.updated} yenilənən sətir yadda saxlanıldı.`);
      onDone();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const people = kind === "employees";
  return (
    <Modal title={people ? "İşçiləri Excel faylından əlavə et" : "Ştat cədvəlini Excel faylından əlavə et"} onClose={onClose}>
      <div className="offer-composer">
        <p className="muted">
          Birinci sətirdə sütun adları olmalıdır:{" "}
          {people
            ? "Ad Soyad, Vəzifə, Departament, Şöbə, İşə başlama, Əmək haqqı (və ya Net maaş), Maaş növü, E-poçt, Telefon, Məzuniyyət günləri, İstifadə olunmuş məzuniyyət."
            : "Departament, Şöbə, Vəzifə, Ştat sayı, Əmək haqqı, Qeyd."}{" "}
          Eyni işçi (e-poçt və ya ad və başlama tarixi) yenilənir, yenisi əlavə olunur.
        </p>
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => downloadTemplate(kind)}>
            <Download size={14} /> Nümunə fayl (.xlsx)
          </button>
          <label className="secondary report-button" style={{ cursor: "pointer" }}>
            <Upload size={14} /> {fileName || "Excel və ya CSV seçin"}
            <input type="file" accept=".xlsx,.csv" hidden onChange={(event) => void pick(event.target.files?.[0])} />
          </label>
        </div>
        {parsed && (
          <>
            <p>
              <b>{parsed.rows.length}</b> sətir hazırdır{parsed.issues.length ? `, ${parsed.issues.length} sətir oxunmadı` : ""}.
            </p>
            {!!parsed.issues.length && (
              <ul className="muted">
                {parsed.issues.slice(0, 8).map((issue) => (
                  <li key={`${issue.line}-${issue.reason}`}>
                    Sətir {issue.line}: {issue.reason}
                  </li>
                ))}
              </ul>
            )}
            {!!parsed.rows.length && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {people ? (
                        <>
                          <th>Ad Soyad</th>
                          <th>Vəzifə</th>
                          <th>Departament / Şöbə</th>
                          <th>Başlama</th>
                          <th>Əmək haqqı</th>
                        </>
                      ) : (
                        <>
                          <th>Departament</th>
                          <th>Şöbə</th>
                          <th>Vəzifə</th>
                          <th>Ştat</th>
                          <th>Əmək haqqı</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 8).map((row) =>
                      "name" in row ? (
                        <tr key={row.line}>
                          <td>{row.name}</td>
                          <td>{row.position || "—"}</td>
                          <td>{[row.department, row.section].filter(Boolean).join(" / ") || "—"}</td>
                          <td>{row.startDate || "—"}</td>
                          <td>{row.salary ? `${azn(row.salary)} (${row.salaryType})` : "—"}</td>
                        </tr>
                      ) : (
                        <tr key={row.line}>
                          <td>{row.department || "—"}</td>
                          <td>{row.section || "—"}</td>
                          <td>{row.position || "—"}</td>
                          <td>{row.planned}</td>
                          <td>{row.salary ? azn(row.salary) : "—"}</td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
            <button type="button" className="primary" disabled={busy || !parsed.rows.length} onClick={send}>
              <FileSpreadsheet size={14} /> {parsed.rows.length} sətri yadda saxla
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------- Pay and leave of one employee, worked out from the form ----------
export function EmployeePayPanel({
  salary,
  salaryType,
  sector,
  startDate,
  endDate,
  status,
  vacationDays,
  vacationUsed,
}: {
  salary: number;
  salaryType: SalaryType;
  sector: "private" | "public";
  startDate: string;
  endDate: string;
  status: string;
  vacationDays: number;
  vacationUsed: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const pay = salary > 0 ? employeePay(salary, salaryType, sector) : null;
  const worked = tenure(startDate, status === "left" ? endDate : "", today);
  const leave = vacationBalance({ start: startDate, end: status === "left" ? endDate : "", entitlement: vacationDays, used: vacationUsed }, today);
  const line = (label: string, value: number) => (
    <tr>
      <td>{label}</td>
      <td style={{ textAlign: "right" }}>{azn(value)}</td>
    </tr>
  );
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <h4>Maaş hesabı və məzuniyyət</h4>
      {pay ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <tbody>
              {line("Net (əlinə verilən)", pay.net)}
              {line("Gross (əmək haqqı)", pay.gross)}
              {line("Gəlir vergisi", pay.incomeTax)}
              {line("DSMF (işçi)", pay.employeeSocial)}
              {line("İşsizlik sığortası (işçi)", pay.employeeUnemployment)}
              {line("İcbari tibbi sığorta (işçi)", pay.employeeMedical)}
              {line("DSMF (işəgötürən)", pay.employerSocial)}
              {line("İşsizlik sığortası (işəgötürən)", pay.employerUnemployment)}
              {line("İcbari tibbi sığorta (işəgötürən)", pay.employerMedical)}
              <tr>
                <td>
                  <b>Super-gross (işəgötürənin ümumi xərci)</b>
                </td>
                <td style={{ textAlign: "right" }}>
                  <b>{azn(pay.superGross)}</b>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">Maaş yazılanda vergilər və sığorta ödənişləri burada hesablanır.</p>
      )}
      <p>
        <b>İşləyib:</b> {worked?.text || "—"} · <b>Məzuniyyət:</b> ildə {leave.entitlement} gün, qazanılıb {leave.accrued}, istifadə olunub {leave.used},{" "}
        <b style={{ color: leave.remaining < 0 ? "#b45309" : undefined }}>qalıb {leave.remaining}</b> gün
      </p>
    </div>
  );
}

// ---------- Orders ----------
type CompanyFacts = { name: string; voen: string; director: string };

function orderHtml(order: ReturnType<typeof buildOrder>) {
  const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html><html lang="az"><head><meta charset="utf-8"><title>${escape(order.title)}</title>
<style>body{font-family:"Times New Roman",serif;font-size:14pt;line-height:1.5;max-width:720px;margin:40px auto;padding:0 24px}
h1{font-size:16pt;text-align:center;text-transform:uppercase}p{margin:10px 0;text-align:justify}.sign{margin-top:48px}.note{margin-top:40px;font-size:10pt;color:#666}</style></head>
<body><h1>${escape(order.title)}</h1>${order.paragraphs.map((p) => `<p>${escape(p)}</p>`).join("")}<p class="sign">${escape(order.signature)}</p>
<p class="note">Bu mətn layihədir; hüquqi əsaslar Azərbaycan Respublikasının Əmək Məcəlləsinə görə yoxlanmalıdır.</p></body></html>`;
}

export function OrderMaker({
  employee,
}: {
  employee: { id: string; name: string; position: string; department: string; section: string; startDate: string; salary: number | null; salaryType: SalaryType; probationEnd: string; endDate: string };
}) {
  const [facts, setFacts] = useState<CompanyFacts>({ name: "", voen: "", director: "" });
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<OrderKind>("vacation");
  const [form, setForm] = useState({ date: today, from: today, to: "", newPosition: "", newDepartment: "", salary: "", basis: "", vacationKind: "illik əmək məzuniyyəti" });
  const [number, setNumber] = useState("");
  useEffect(() => {
    void Promise.all([request<{ company: { name: string } | null }>("company/me"), request<{ details: { legalName: string; voen: string; director: string } }>("company/profile")])
      .then(([me, profile]) =>
        setFacts({ name: profile.details.legalName || me.company?.name || "", voen: profile.details.voen, director: profile.details.director }),
      )
      .catch(() => undefined);
  }, []);
  const input: OrderInput = {
    kind,
    number: number || orderNumber(kind, form.date, employee.id),
    date: form.date,
    city: "Bakı",
    company: { name: facts.name, voen: facts.voen, director: facts.director, directorTitle: "Direktor" },
    employee: { name: employee.name, position: employee.position, department: employee.department, section: employee.section, startDate: employee.startDate },
    from: kind === "hire" ? employee.startDate : kind === "termination" ? form.from || employee.endDate : form.from,
    to: form.to,
    days: kind === "vacation" ? leaveDays(form.from, form.to) : undefined,
    vacationKind: form.vacationKind,
    salary: kind === "hire" ? employee.salary || undefined : Number(form.salary) || undefined,
    salaryBefore: employee.salary || undefined,
    salaryType: employee.salaryType,
    probationEnd: employee.probationEnd,
    newPosition: form.newPosition,
    newDepartment: form.newDepartment,
    basis: form.basis,
  };
  const order = buildOrder(input);
  const print = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(orderHtml(order));
    win.document.close();
    win.focus();
    win.print();
  };
  const word = () => {
    const url = URL.createObjectURL(new Blob(["﻿", orderHtml(order)], { type: "application/msword" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `emr-${order.number || "sened"}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <h4>Əmr sənədləri</h4>
      <div className="form-grid">
        <Field label="Əmrin növü">
          <select value={kind} onChange={(e) => setKind(e.target.value as OrderKind)}>
            {ORDER_KINDS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Əmrin nömrəsi">
          <input value={number} placeholder={orderNumber(kind, form.date, employee.id)} onChange={(e) => setNumber(e.target.value)} />
        </Field>
        <Field label="Əmrin tarixi">
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        {kind !== "hire" && (
          <Field label={kind === "vacation" ? "Məzuniyyətin başlanğıcı" : kind === "termination" ? "Xitam tarixi" : "Qüvvəyə minmə tarixi"}>
            <input type="date" value={form.from} onChange={(e) => set("from", e.target.value)} />
          </Field>
        )}
        {kind === "vacation" && (
          <>
            <Field label="Məzuniyyətin sonu">
              <input type="date" value={form.to} onChange={(e) => set("to", e.target.value)} />
            </Field>
            <Field label="Məzuniyyətin növü">
              <input value={form.vacationKind} onChange={(e) => set("vacationKind", e.target.value)} />
            </Field>
          </>
        )}
        {(kind === "salary" || kind === "transfer") && (
          <Field label={`Yeni əmək haqqı (AZN, ${employee.salaryType})`}>
            <input type="number" min={0} value={form.salary} onChange={(e) => set("salary", e.target.value)} />
          </Field>
        )}
        {kind === "transfer" && (
          <>
            <Field label="Yeni vəzifə">
              <input value={form.newPosition} onChange={(e) => set("newPosition", e.target.value)} />
            </Field>
            <Field label="Yeni departament / şöbə">
              <input value={form.newDepartment} onChange={(e) => set("newDepartment", e.target.value)} />
            </Field>
          </>
        )}
        {(kind === "salary" || kind === "transfer" || kind === "termination") && (
          <Field label={kind === "termination" ? "Xitamın əsası (maddə və səbəb)" : "Əsas"}>
            <input value={form.basis} onChange={(e) => set("basis", e.target.value)} />
          </Field>
        )}
      </div>
      <pre className="muted" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
        {order.text}
      </pre>
      <div className="admin-actions">
        <button type="button" className="primary" onClick={print}>
          <Printer size={14} /> Çap et / PDF
        </button>
        <button type="button" className="secondary" onClick={word}>
          <Download size={14} /> Word (.doc)
        </button>
      </div>
      <small className="muted">İmzalanmış əmri “İşçi sənədləri” bölməsinə yükləyib saxlaya bilərsiniz.</small>
    </div>
  );
}


// ---------- Job offer letter to an employee ----------
export function EmployeeOfferMaker({
  employee,
  notify,
}: {
  employee: { id: string; name: string; position: string; department: string; email: string; salary: number | null; salaryType: SalaryType };
  notify: Notify;
}) {
  const [facts, setFacts] = useState<CompanyFacts>({ name: "", voen: "", director: "" });
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    position: "",
    department: employee.department,
    salary: "",
    startDate: "",
    contractType: "Müddətsiz",
    probationMonths: "0",
    workSchedule: "",
    location: "",
    benefits: "",
    validUntil: "",
    message: "",
    signerName: "",
    signerTitle: "Direktor",
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void Promise.all([request<{ company: { name: string } | null }>("company/me"), request<{ details: { legalName: string; voen: string; director: string } }>("company/profile")])
      .then(([me, profile]) => {
        setFacts({ name: profile.details.legalName || me.company?.name || "", voen: profile.details.voen, director: profile.details.director });
        setForm((value) => ({ ...value, signerName: value.signerName || profile.details.director }));
      })
      .catch(() => undefined);
  }, []);
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const offer = buildEmployeeOffer({
    date: today,
    city: "Bakı",
    company: facts,
    employee: { name: employee.name, position: employee.position },
    position: form.position,
    department: form.department,
    salary: Number(form.salary) || undefined,
    salaryType: employee.salaryType,
    startDate: form.startDate,
    contractType: form.contractType,
    probationMonths: Number(form.probationMonths) || 0,
    workSchedule: form.workSchedule,
    location: form.location,
    benefits: form.benefits,
    validUntil: form.validUntil,
    message: form.message,
    signerName: form.signerName,
    signerTitle: form.signerTitle,
  });
  const html = () => {
    const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return `<!doctype html><html lang="az"><head><meta charset="utf-8"><title>${escape(offer.subject)}</title><style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.55;max-width:720px;margin:40px auto;padding:0 24px}p{margin:10px 0}</style></head><body>${offer.paragraphs.map((p) => `<p>${escape(p)}</p>`).join("")}<p style="margin-top:36px">${escape(offer.signature)}</p></body></html>`;
  };
  const print = () => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html());
    win.document.close();
    win.focus();
    win.print();
  };
  const word = () => {
    const url = URL.createObjectURL(new Blob(["\ufeff", html()], { type: "application/msword" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "is-teklifi.doc";
    link.click();
    URL.revokeObjectURL(url);
  };
  async function send() {
    setBusy(true);
    try {
      await request("company/employees/send-offer", { employeeId: employee.id, subject: offer.subject, text: offer.text });
      notify(`Təklif ${employee.email} ünvanına göndərildi.`);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const ready = !!form.position && Number(form.salary) > 0 && !!form.startDate;
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <h4>İşçiyə iş təklifi (job offer)</h4>
      <p className="muted">Hazır şablon: işçiyə yeni vəzifə, yüksəliş və ya köçürmə təklifi. Məktub maaşı dəyişmir; razılıq alınandan sonra maaşı işçi kartında, vəzifəni isə “Əmr sənədləri”ndə rəsmiləşdirin.</p>
      <div className="form-grid">
        <Field label="Təklif olunan vəzifə *">
          <input value={form.position} onChange={(e) => set("position", e.target.value)} />
        </Field>
        <Field label="Departament">
          <input value={form.department} onChange={(e) => set("department", e.target.value)} />
        </Field>
        <Field label={`Aylıq əmək haqqı (AZN, ${employee.salaryType}) *`}>
          <input type="number" min={0} value={form.salary} onChange={(e) => set("salary", e.target.value)} />
        </Field>
        <Field label="Başlama tarixi *">
          <input type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Müqavilə növü">
          <select value={form.contractType} onChange={(e) => set("contractType", e.target.value)}>
            {["Müddətsiz", "Müddətli", "Mülki-hüquqi"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Sınaq müddəti (ay)">
          <input type="number" min={0} max={6} value={form.probationMonths} onChange={(e) => set("probationMonths", e.target.value)} />
        </Field>
        <Field label="İş qrafiki">
          <input value={form.workSchedule} onChange={(e) => set("workSchedule", e.target.value)} />
        </Field>
        <Field label="İş yeri">
          <input value={form.location} onChange={(e) => set("location", e.target.value)} />
        </Field>
        <Field label="Əlavə imkanlar">
          <input value={form.benefits} onChange={(e) => set("benefits", e.target.value)} />
        </Field>
        <Field label="Təklifin son tarixi">
          <input type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />
        </Field>
        <Field label="İmza edən">
          <input value={form.signerName} onChange={(e) => set("signerName", e.target.value)} />
        </Field>
        <Field label="Giriş mətni (boş buraxsanız hazır mətn qoyulur)">
          <textarea value={form.message} onChange={(e) => set("message", e.target.value)} />
        </Field>
      </div>
      <pre className="muted" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
        {offer.text}
      </pre>
      <div className="admin-actions">
        <button type="button" className="primary" disabled={busy || !ready || !employee.email} title={employee.email ? "" : "İşçinin e-poçtu yoxdur"} onClick={send}>
          E-poçtla göndər
        </button>
        <a
          className={`secondary report-button${ready ? "" : " disabled"}`}
          href={`mailto:${employee.email}?subject=${encodeURIComponent(offer.subject)}&body=${encodeURIComponent(offer.text)}`}
          aria-disabled={!ready}
        >
          Poçt proqramında aç
        </a>
        <button type="button" className="secondary" onClick={print}>
          <Printer size={14} /> Çap et / PDF
        </button>
        <button type="button" className="secondary" onClick={word}>
          <Download size={14} /> Word (.doc)
        </button>
      </div>
    </div>
  );
}

// ---------- Staff table ----------
type StaffRow = { id: string; department: string; section: string; position: string; planned: number; salary: number; note: string; filled: number; free: number };
type StaffDepartment = { department: string; planned: number; filled: number; openVacancies: number; free: number; units: number };
type StaffData = { rows: StaffRow[]; departments: StaffDepartment[]; unplaced: number };

export function StaffTable({ notify }: { notify: Notify }) {
  const [data, setData] = useState<StaffData | null>(null);
  const [editing, setEditing] = useState<Partial<StaffRow> | null>(null);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<StaffData>("company/staff")
      .then(setData)
      .catch((error) => notifyRef.current((error as Error).message));
  }, []);
  useEffect(load, [load]);
  async function save() {
    if (!editing) return;
    try {
      const result = await request<{ pending?: boolean }>("company/staff/save", editing);
      notify(result.pending ? "Ştat dəyişikliyi direktorun təsdiqinə göndərildi." : "Ştat sətri yadda saxlanıldı.");
      setEditing(null);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  // The plan of a whole department is the sum of its rows; with one row it is edited right here.
  async function savePlan(department: string, value: string) {
    try {
      const result = await request<{ pending?: boolean }>("company/headcount/save", { department, planned: value === "" ? null : Number(value) });
      if (result.pending) notify("Ştat planı dəyişikliyi direktorun təsdiqinə göndərildi.");
      load();
    } catch (error) {
      notify((error as Error).message);
      load();
    }
  }
  async function remove(row: StaffRow) {
    if (!window.confirm(`“${row.department} / ${row.position}” ştat sətri silinsin?`)) return;
    try {
      const result = await request<{ pending?: boolean }>("company/staff/delete", { id: row.id });
      if (result.pending) notify("Silinmə direktorun təsdiqinə göndərildi.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  // The HR assistant opens with this place: it knows the department and section of the vacancy.
  function createVacancy(row: StaffRow) {
    try {
      window.sessionStorage.setItem("joblink-staff-vacancy", JSON.stringify({ position: row.position, department: row.department, section: row.section }));
    } catch {
      // Without storage the vacancy is made by hand.
    }
    window.location.hash = "hr-ai";
  }
  if (!data) return null;
  const needle = query.toLocaleLowerCase("az").trim();
  const rows = data.rows.filter((row) => !needle || `${row.department} ${row.section} ${row.position}`.toLocaleLowerCase("az").includes(needle));
  const planned = data.rows.reduce((sum, row) => sum + row.planned, 0);
  const filled = data.rows.reduce((sum, row) => sum + row.filled, 0);
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h3>Ştat planı və ştat cədvəli</h3>
          <p className="muted">
            Departament → şöbə → vəzifə üzrə ştat yerləri. Departamentin planı onun sətirlərinin cəmidir. Planlaşdırılan: <b>{planned}</b> · işləyir: <b>{filled}</b> · boş: <b>{Math.max(0, planned - filled)}</b>
            {data.unplaced > 0 && ` · ştatda yeri olmayan işçi: ${data.unplaced}`}
          </p>
        </div>
        <div className="admin-actions">
          <input className="search-input" placeholder="Departament, şöbə və ya vəzifə" value={query} onChange={(e) => setQuery(e.target.value)} />
          <a className="secondary report-button" href="/api/joblink/company/report?kind=staff" download>
            <Download size={14} /> XLSX
          </a>
          <button type="button" className="secondary" onClick={() => setImporting(true)}>
            <FileSpreadsheet size={14} /> Excel-dən əlavə et
          </button>
          <button type="button" className="primary" onClick={() => setEditing({ planned: 1 })}>
            <Plus size={14} /> Ştat sətri
          </button>
        </div>
      </div>
      {!!data.departments.length && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Departament</th>
                <th>Plan (ştat)</th>
                <th>İşləyir</th>
                <th>Açıq vakansiya</th>
                <th>Boş yer</th>
              </tr>
            </thead>
            <tbody>
              {data.departments.map((d) => (
                <tr key={d.department}>
                  <td>
                    <b>{d.department || "—"}</b>
                  </td>
                  <td>
                    {d.units > 1 ? (
                      <span title="Departamentin bir neçə ştat sətri var: cədvəldə dəyişin">{d.planned}</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        style={{ width: 80 }}
                        defaultValue={d.planned}
                        aria-label={`${d.department} ştat planı`}
                        onBlur={(e) => e.target.value !== String(d.planned) && void savePlan(d.department, e.target.value)}
                      />
                    )}
                  </td>
                  <td>{d.filled}</td>
                  <td>{d.openVacancies}</td>
                  <td>{d.free > 0 ? <b>{d.free} boş</b> : d.free === 0 ? "Dolu" : <span className="danger-text">{-d.free} artıq</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Departament</th>
              <th>Şöbə</th>
              <th>Vəzifə</th>
              <th>Ştat</th>
              <th>İşləyir</th>
              <th>Boş</th>
              <th>Əmək haqqı</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.department || "—"}</td>
                <td>{row.section || "—"}</td>
                <td>
                  {row.position || "—"}
                  {row.note && <small className="skill-description">{row.note}</small>}
                </td>
                <td>{row.planned}</td>
                <td>{row.filled}</td>
                <td>{row.free > 0 ? <b>{row.free}</b> : row.free === 0 ? "—" : <span className="danger-text">{row.free}</span>}</td>
                <td>{row.salary ? azn(row.salary) : "—"}</td>
                <td className="admin-actions">
                  {row.free > 0 && (
                    <button type="button" onClick={() => createVacancy(row)}>
                      Vakansiya yarat
                    </button>
                  )}
                  <button type="button" onClick={() => setEditing(row)}>
                    Düzəlt
                  </button>
                  <button type="button" aria-label="Sil" onClick={() => void remove(row)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8}>
                  <p className="admin-empty">Ştat sətri yoxdur. “Ştat sətri” ilə əlavə edin və ya Excel faylı yükləyin.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <small className="skill-picker-help">
        “İşləyir” məzuniyyətdəkiləri də sayır. İşçi ştat sətrinə departament və vəzifəsinə görə düşür. Vakansiya yaradanda həmin departamentdə boş yer yoxdursa xəbərdarlıq çıxır. Dəyişikliklər şirkət jurnalına yazılır.
      </small>
      {editing && (
        <Modal title={editing.id ? "Ştat sətrini düzəlt" : "Yeni ştat sətri"} onClose={() => setEditing(null)}>
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="Departament">
                <input value={editing.department || ""} onChange={(e) => setEditing({ ...editing, department: e.target.value })} />
              </Field>
              <Field label="Şöbə">
                <input value={editing.section || ""} onChange={(e) => setEditing({ ...editing, section: e.target.value })} />
              </Field>
              <Field label="Vəzifə">
                <input value={editing.position || ""} onChange={(e) => setEditing({ ...editing, position: e.target.value })} />
              </Field>
              <Field label="Ştat sayı">
                <input type="number" min={0} value={editing.planned ?? 1} onChange={(e) => setEditing({ ...editing, planned: Number(e.target.value) })} />
              </Field>
              <Field label="Əmək haqqı (AZN)">
                <input type="number" min={0} value={editing.salary ?? ""} onChange={(e) => setEditing({ ...editing, salary: Number(e.target.value) })} />
              </Field>
              <Field label="Qeyd">
                <input value={editing.note || ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
              </Field>
            </div>
            <button type="button" className="primary" onClick={save}>
              Yadda saxla
            </button>
          </div>
        </Modal>
      )}
      {importing && <SheetImport kind="staff" notify={notify} onClose={() => setImporting(false)} onDone={load} />}
    </section>
  );
}
