"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Plus, Printer, Trash2, Upload } from "lucide-react";
import { buildEmployeeOffer, buildOrder, leaveDays, orderNumber, ORDER_KINDS, UNPAID_REASONS, unpaidReason, type OrderField, type OrderInput, type OrderKind } from "@/lib/orders";
import { employeePay, tenure, vacationBalance, type SalaryType } from "@/lib/payroll";
import { readSheetRows } from "@/lib/question-file";
import { parseHoursRows } from "@/lib/hours";
import { parseAssetRows } from "@/lib/assets";
import { parseEmployeeRows, parseStaffRows, parseStructureRows } from "@/lib/staff-import";
import { parseAttendanceRows, parseCalendarRows, parseProfileRows, parsePayrollRows } from "@/lib/sheet-imports";
import { SHEET_TEMPLATES, templateSheets } from "@/lib/sheet-templates";
import { OTHER_REQUEST, REQUEST_KINDS, orderPrefill, requestKindLabel, requestProblems, requestWarnings, type RequestData } from "@/lib/requests";
import { ATTENDANCE_CODES } from "@/lib/calendar-az";
import { RATES, RATE_LABEL, type PlanUnit } from "@/lib/staff-plan";
import { createXlsxBook } from "@/lib/xlsx";
import { linkCodeSheets, type LinkCodeItem } from "@/lib/employee-link";
import { canonicalOrgName } from "@/lib/org-names";
import { splitNames, suggestSections } from "@/lib/section-suggestions";
import { EMPTY_PROFILE, ageOn, idExpiresSoon, type EmployeeProfile } from "@/lib/employee-profile";
import { TAX_BENEFITS, employeeRights, suggestedBenefits, taxBenefit, taxReduction } from "@/lib/employee-rights";
import { Field, Modal } from "./components";
import JobTitleInput from "./JobTitleInput";

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
export type SheetKind = "employees" | "staff" | "structure" | "attendance" | "calendar" | "profiles" | "payroll" | "hours" | "assets";
const SHEET_META: Record<SheetKind, { title: string; endpoint: string; done: (r: SheetResult) => string }> = {
  employees: { title: "İşçiləri Excel faylından əlavə et", endpoint: "company/employees/import", done: (r) => `${r.created} yeni, ${r.updated ?? 0} yenilənən işçi yadda saxlanıldı.` },
  staff: { title: "Ştat cədvəlini Excel faylından əlavə et", endpoint: "company/staff/import", done: (r) => `${r.created} yeni, ${r.updated ?? 0} yenilənən ştat sətri yadda saxlanıldı.` },
  structure: { title: "Departament və şöbələri Excel faylından əlavə et", endpoint: "company/structure/import", done: (r) => `${r.created} yeni ad yaradıldı, ${r.existing ?? 0} artıq var idi.` },
  attendance: { title: "Davamiyyət qeydlərini Excel faylından yüklə", endpoint: "company/attendance/import", done: (r) => `${r.applied ?? 0} sətir tətbiq olundu (${r.days ?? 0} gün qeyd edildi).` },
  calendar: { title: "Şirkət təqvimini Excel faylından yüklə", endpoint: "company/calendar/import", done: (r) => `${r.applied ?? 0} gün təqvimdə yeniləndi.` },
  assets: { title: "Şirkət əmlakını Excel faylından yüklə", endpoint: "company/assets/import", done: (r) => `${r.created} əmlak anbara əlavə olundu.` },
  hours: { title: "İşlənən saatları Excel faylından yüklə", endpoint: "company/hours/import", done: (r) => `${r.applied ?? 0} günün saatı yeniləndi.` },
  payroll: { title: "Ayın əmək haqqı məlumatlarını Excel faylından yüklə", endpoint: "company/payroll/inputs-import", done: (r) => `${r.applied ?? 0} işçinin əlavə, saat və tutulma məlumatı yeniləndi.` },
  profiles: { title: "Şəxsi məlumatları Excel faylından yüklə", endpoint: "company/employees/profile-import", done: (r) => `${r.applied ?? 0} işçinin şəxsi məlumatı yeniləndi.` },
};
type SheetResult = { created: number; updated?: number; existing?: number; applied?: number; days?: number; pending?: boolean; issues?: { line: number; reason: string }[] };

function downloadBlob(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}
// The sample file with a guide sheet: what each column holds, whether it is required, its format and its values.
export function downloadTemplate(kind: SheetKind | "sections") {
  downloadBlob(createXlsxBook(templateSheets(kind)), SHEET_TEMPLATES[kind].file);
}

const codeName = (id: string) => ATTENDANCE_CODES.find((c) => c.id === id)?.label.replace(/\s*\(.*\)\s*/, "") || "Qeydi sil";
const KIND_NAME: Record<string, string> = { off: "Qeyri-iş günü", work: "İş günü", short: "Qısaldılmış gün", "": "Sil (standarta qayıt)" };
// The columns of the preview and what each parsed row shows in them.
function previewOf(kind: SheetKind, rows: unknown[]): { head: string[]; body: string[][] } {
  const list = rows as Record<string, string | number | boolean | Record<string, unknown>>[];
  const str = (v: unknown) => String(v ?? "") || "—";
  if (kind === "employees")
    return { head: ["Ad Soyad", "Vəzifə", "Departament / Şöbə", "Başlama", "Əmək haqqı"], body: list.map((r) => [str(r.name), str(r.position), [r.department, r.section].filter(Boolean).join(" / ") || "—", str(r.startDate), r.salary ? `${azn(Number(r.salary))} (${r.salaryType})` : "—"]) };
  if (kind === "staff")
    return { head: ["Departament", "Şöbə", "Vəzifə", "Ştat", "Dərəcə", "Əmək haqqı"], body: list.map((r) => [str(r.department), str(r.section), str(r.position), str(r.planned), RATE_LABEL[Number(r.rate)] || "Tam ştat", r.salary ? (Number(r.salaryMax) > Number(r.salary) ? `${azn(Number(r.salary))} – ${azn(Number(r.salaryMax))}` : azn(Number(r.salary))) : "—"]) };
  if (kind === "structure") return { head: ["Departament", "Şöbə"], body: list.map((r) => [str(r.department), str(r.section)]) };
  if (kind === "attendance") return { head: ["Ad Soyad", "Başlama", "Bitmə", "Səbəb", "Qeyd"], body: list.map((r) => [str(r.name), str(r.from), str(r.to), codeName(String(r.code)), str(r.note)]) };
  if (kind === "calendar") return { head: ["Tarix", "Növ", "Ad"], body: list.map((r) => [str(r.day), KIND_NAME[String(r.kind)] || str(r.kind), str(r.label)]) };
  if (kind === "assets") return { head: ["Ad", "Kateqoriya", "Seriya", "İnventar №", "Dəyər"], body: list.map((r) => [str(r.name), str(r.category), str(r.serial), str(r.inventoryNo), str(r.value)]) };
  if (kind === "hours") return { head: ["Ad Soyad", "Tarix", "Saat", "Gecə saatı"], body: list.map((r) => [str(r.name), str(r.day), str(r.hours), str(r.night)]) };
  if (kind === "payroll") return { head: ["Ad Soyad", "Mükafat", "Əlavə", "Artıq iş saatı", "Tutulma"], body: list.map((r) => [str(r.name), str(r.bonus), str(r.allowance), str(r.overtimeHours), r.deductionAmount ? `${str(r.deductionLabel)}: ${str(r.deductionAmount)}` : "—"]) };
  return { head: ["Ad Soyad", "E-poçt", "Doldurulan sahə sayı"], body: list.map((r) => [str(r.name), str(r.email), String(Object.keys((r.profile as object) || {}).length)]) };
}

export function SheetImport({
  kind,
  onClose,
  onDone,
  notify,
  extra,
}: {
  kind: SheetKind;
  onClose: () => void;
  onDone: () => void;
  notify: Notify;
  extra?: Record<string, unknown>;
}) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const template = SHEET_TEMPLATES[kind];
  const parsed = useMemo(() => {
    if (!rows) return null;
    const parse = { employees: parseEmployeeRows, staff: parseStaffRows, structure: parseStructureRows, attendance: parseAttendanceRows, calendar: parseCalendarRows, profiles: parseProfileRows, payroll: parsePayrollRows, hours: parseHoursRows, assets: parseAssetRows }[kind];
    return parse(rows) as { rows: unknown[]; issues: { line: number; reason: string }[] };
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
      const result = await request<SheetResult>(SHEET_META[kind].endpoint, { rows, ...extra });
      const problems = result.issues?.length ? ` ${result.issues.length} sətir yüklənmədi: ${result.issues[0].reason}` : "";
      notify(result.pending ? "Ştat cədvəli təsdiq olunub: yükləmə direktorun təsdiqinə göndərildi." : `${SHEET_META[kind].done(result)}${problems}`);
      onDone();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const preview = parsed?.rows.length ? previewOf(kind, parsed.rows.slice(0, 8)) : null;
  return (
    <Modal title={SHEET_META[kind].title} onClose={onClose}>
      <div className="offer-composer sheet-import">
        <div className="admin-actions">
          <button type="button" className="primary" onClick={() => downloadTemplate(kind)}>
            <Download size={14} /> Nümunə fayl (.xlsx)
          </button>
          <label className="secondary report-button" style={{ cursor: "pointer" }}>
            <Upload size={14} /> {fileName || "Doldurulmuş Excel və ya CSV seçin"}
            <input type="file" accept=".xlsx,.csv" hidden onChange={(event) => void pick(event.target.files?.[0])} />
          </label>
        </div>
        <details className="sheet-guide" open={!parsed}>
          <summary>
            <b>Faylı necə hazırlamalı</b> <small className="muted">— sütunlar, format və icazə verilən dəyərlər</small>
          </summary>
          <p className="muted">Nümunə faylda iki vərəq var: “Nümunə” (doldurulan vərəq, birinci olmalıdır) və “Təlimat”. Birinci sətirdə sütun adları durur, onları dəyişməyin; sütunların sırası vacib deyil.</p>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sütun</th>
                  <th>Məcburi</th>
                  <th>Format</th>
                  <th>İzah</th>
                </tr>
              </thead>
              <tbody>
                {template.columns.map((c) => (
                  <tr key={c.header}>
                    <td>
                      <b>{c.header}</b>
                    </td>
                    <td>{c.required ? "Bəli" : "—"}</td>
                    <td>{c.format}</td>
                    <td>
                      {c.description}
                      {c.values && <small className="skill-description">Dəyərlər: {c.values}</small>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="muted">
            {template.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </details>
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
            {preview && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {preview.head.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.body.map((cells, i) => (
                      <tr key={i}>
                        {cells.map((c, j) => (
                          <td key={j}>{c}</td>
                        ))}
                      </tr>
                    ))}
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
  taxReduction: reduction = 0,
}: {
  taxReduction?: number;
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
  const pay = salary > 0 ? employeePay(salary, salaryType, sector, reduction) : null;
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
<body><h1>${escape(order.title)}</h1>${order.paragraphs.map((p) => `<p>${escape(p)}</p>`).join("")}<p class="sign">${order.signature.split("\n").map(escape).join("<br>")}</p>
<p class="note">Bu mətn layihədir; hüquqi əsaslar Azərbaycan Respublikasının Əmək Məcəlləsinə görə yoxlanmalıdır.</p></body></html>`;
}
function printOrder(order: ReturnType<typeof buildOrder>) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(orderHtml(order));
  win.document.close();
  win.focus();
  win.print();
}
function downloadOrderWord(order: ReturnType<typeof buildOrder>) {
  const url = URL.createObjectURL(new Blob(["\ufeff", orderHtml(order)], { type: "application/msword" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `emr-${order.number || "sened"}.doc`;
  link.click();
  URL.revokeObjectURL(url);
}

type SignerState = { role: "head" | "director"; title: string; name: string; approvedAt?: string; approvedBy?: string };
type HistoryEvent = { type: string; by: string; at: string; role?: string; to?: string; note?: string };
export type SavedOrder = {
  id: string;
  employeeId?: string;
  kind: OrderKind;
  number: string;
  date: string;
  status: "pending" | "returned" | "signed";
  holder: "creator" | "head" | "director" | "";
  history: HistoryEvent[];
  created: string;
  input: Omit<OrderInput, "signers">;
  signers: SignerState[];
};
const HOLDER = { creator: "Əmri hazırlayan (HR)", head: "Şöbə rəhbəri", director: "Direktor", "": "" } as const;
const EVENT = { created: "Əmr yaradıldı", approved: "Təsdiqlədi", returned: "Geri göndərdi", edited: "Əmri dəyişdi", signed: "Tam imzalandı" } as Record<string, string>;
const STATUS_TEXT = (order: SavedOrder) =>
  order.status === "signed" ? "İmzalanıb" : order.status === "returned" ? `Geri qaytarılıb: ${HOLDER[order.holder]}` : `İmza gözləyir: ${HOLDER[order.holder]}`;
const rebuildOrder = (item: SavedOrder) => buildOrder({ ...item.input, signers: item.signers });
const when = (iso: string) => iso.slice(0, 16).replace("T", " ");

// Who has the order, the signatures, the approve and send-back buttons and what happened to it.
export function OrderSignerBox({ order, onChange, notify }: { order: SavedOrder; onChange: () => void; notify: Notify }) {
  const [reason, setReason] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const turn = order.signers.find((signer) => signer.role === order.holder);
  async function approve() {
    if (!turn) return;
    try {
      const result = await request<{ signed: boolean }>("company/orders/approve", { id: order.id, role: turn.role });
      notify(result.signed ? "Əmr bütün imzalarla təsdiqləndi." : "İmza təsdiqləndi. Növbə növbəti şəxsdədir.");
      onChange();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function sendBack() {
    if (!turn) return;
    try {
      const result = await request<{ holder: string }>("company/orders/return", { id: order.id, role: turn.role, reason: reason || "" });
      notify(`Əmr geri göndərildi: ${HOLDER[result.holder as keyof typeof HOLDER] || ""}.`);
      setReason(null);
      onChange();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const lastReturn = [...order.history].reverse().find((event) => event.type === "returned");
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <b>{STATUS_TEXT(order)}</b>
      {order.signers.map((signer) => (
        <div key={signer.role}>
          {signer.title}: <b>{signer.name}</b>{" "}
          {signer.approvedAt ? <small className="skill-description">təsdiqləyib: {signer.approvedBy} · {when(signer.approvedAt)}</small> : signer.role === order.holder ? <small className="skill-description">növbə bundadır</small> : <small className="skill-description">gözləyir</small>}
        </div>
      ))}
      {order.status === "returned" && lastReturn && (
        <div className="notice">
          Geri qaytarma səbəbi ({lastReturn.by}): {lastReturn.note}
        </div>
      )}
      {turn && order.status !== "signed" && reason === null && (
        <div className="admin-actions">
          <button type="button" className="primary" onClick={() => void approve()}>
            Təsdiq et ({turn.title})
          </button>
          <button type="button" onClick={() => setReason("")}>
            Geri göndər
          </button>
        </div>
      )}
      {order.status !== "signed" && order.holder === "creator" && <small className="muted">Əmri hazırlayan düzəliş edib yenidən imzaya göndərməlidir.</small>}
      {reason !== null && (
        <div style={{ display: "grid", gap: 6 }}>
          <textarea value={reason} placeholder="Səbəbi yazın: əmr özündən əvvəlki şəxsə qayıdacaq (direktordan şöbə rəhbərinə, şöbə rəhbərindən əmri hazırlayana)." onChange={(e) => setReason(e.target.value)} />
          <div className="admin-actions">
            <button type="button" className="primary" disabled={reason.trim().length < 3} onClick={() => void sendBack()}>
              Geri göndər
            </button>
            <button type="button" onClick={() => setReason(null)}>
              Ləğv et
            </button>
          </div>
        </div>
      )}
      <button type="button" className="text-button" onClick={() => setShowHistory(!showHistory)}>
        {showHistory ? "Tarixçəni gizlət" : `Tarixçə (${order.history.length})`}
      </button>
      {showHistory && (
        <ul className="muted">
          {order.history.map((event, i) => (
            <li key={i}>
              {when(event.at)} — {EVENT[event.type] || event.type}: {event.by}
              {event.note ? ` — “${event.note}”` : ""}
              {event.to ? ` → ${HOLDER[event.to as keyof typeof HOLDER] || event.to}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const FIELD_TEXT: Record<OrderField, (kind: OrderKind, salaryType: SalaryType) => string> = {
  from: (kind) =>
    ({ postpone: "Məzuniyyətin yeni başlanğıcı", restday: "İşə cəlb tarixi", overtime: "İşə cəlb tarixi (başlanğıc)", donor: "Qan verilən gün", medical: "Müayinə günü (başlanğıc)", downtime: "Boşdayanmanın başlanğıcı", recall: "Çağırış (işə başlama) tarixi", termination: "Xitam tarixi", reduction: "Xitam tarixi", probation: "Qərarın qüvvəyə minmə tarixi", extend: "Yeni müddətin başlanğıcı", transfer: "Keçirilmə tarixi", salary: "Dəyişikliyin tarixi", schedule: "Qüvvəyə minmə tarixi", name: "Dəyişikliyin tarixi", suspension: "Kənarlaşdırma tarixi" } as Record<string, string>)[kind] ||
    "Başlanğıc tarixi",
  to: (kind) => ({ postpone: "Məzuniyyətin yeni bitməsi", extendleave: "Yeni bitmə tarixi (uzadılmış)", extend: "Müqavilənin yeni bitmə tarixi", suspension: "Bitmə tarixi (boşdursa sonrakı əmrə qədər)" } as Record<string, string>)[kind] || "Bitmə tarixi",
  vacationKind: (kind) => (kind === "unpaid" ? "Ödənişsiz məzuniyyətin əsası (Əmək Məcəlləsi, 130-cu maddə)" : kind === "addleave" ? "Əlavə məzuniyyətin növü (staj, zərərli şərait, uşaqlı işçi)" : "Məzuniyyətin növü"),
  quantity: (kind) => (kind === "compensation" ? "Kompensasiya ödənilən gün sayı" : kind === "overtime" ? "Cəmi artıq iş saatı" : "İşlənən saat"),
  salary: (kind, type) => (kind === "bonus" ? "Mükafatın məbləği (AZN)" : kind === "substitute" ? "Əlavə haqq (AZN)" : `Yeni əmək haqqı (AZN, ${type})`),
  newPosition: (kind) => (kind === "substitute" ? "İcra ediləcək vəzifə" : "Yeni vəzifə"),
  newDepartment: () => "Yeni departament / şöbə",
  basis: (kind) =>
    ({ termination: "Xitamın əsası (maddə və səbəb)", reduction: "İxtisarın əsası (təşkilati qərar, nömrə)", maternity: "Əsas (tibbi rəy və ya xəstəlik vərəqəsinin nömrəsi)", study: "Əsas (təhsil müəssisəsinin çağırış arayışı)", childcare: "Əsas (ərizə, uşağın doğum şəhadətnaməsi)", paternity: "Əsas (ərizə, doğum şəhadətnaməsi)", unpaid: "Əsas (işçinin ərizəsi və s.)", addleave: "Əsas (məsələn: staj 6 gün — 116-cı maddə)", creative: "Əsas (elmi şuranın arayışı)", postpone: "Keçirilmənin səbəbi (134-cü maddə)", extendleave: "Uzadılmanın səbəbi (xəstəlik vərəqəsi, bayram günləri)", compensation: "Əsas (xitam haqqında əmr)", donor: "Əsas (tibb müəssisəsinin arayışı)", medical: "Əsas (tibb müəssisəsinin arayışı)", summons: "Əsas (çağırış vərəqəsi)", military: "Əsas (hərbi komissarlığın çağırışı)", downtime: "Boşdayanmanın səbəbi", remote: "Əsas (ərizə, razılıq)", restday: "İşə cəlbin səbəbi (107-ci maddənin halı)", overtime: "İşə cəlbin səbəbi (99.2-ci maddənin halı)", recall: "Çağırışın səbəbi", trip: "Ezamiyyətin məqsədi", training: "Təlimin məqsədi", bonus: "Mükafatın səbəbi (nəticə, layihə)", discipline: "Pozuntunun mahiyyəti, izahat və ya imtina aktının nömrəsi", suspension: "Kənarlaşdırmanın əsası", probation: "Əsas (rəhbərin rəyi)", name: "Əsas (sənəd)" } as Record<string, string>)[kind] || "Əsas",
  place: (kind) => (kind === "training" ? "Təlimin yeri və ya təşkilatı" : kind === "summons" ? "Çağıran orqan (məhkəmə, prokurorluq və s.)" : "Ezam olunan yer"),
  penalty: () => "İntizam tənbehinin növü",
  newName: () => "Yeni ad və ya soyad",
  result: () => "Sınaq müddətinin nəticəsi",
  schedule: () => "Yeni iş rejimi (məsələn, həftədə 3 gün, 10:00–15:00)",
};

type FormValues = { date: string; from: string; to: string; newPosition: string; newDepartment: string; salary: string; basis: string; vacationKind: string; place: string; penalty: string; newName: string; result: string; schedule: string; quantity: string };
function OrderFormField({ field, kind, form, salaryType, set }: { field: OrderField; kind: OrderKind; form: FormValues; salaryType: SalaryType; set: (key: keyof FormValues, value: string) => void }) {
  const label = FIELD_TEXT[field](kind, salaryType);
  if (field === "from" || field === "to")
    return (
      <Field label={label}>
        <input type="date" value={form[field]} onChange={(e) => set(field, e.target.value)} />
      </Field>
    );
  if (field === "salary")
    return (
      <Field label={label}>
        <input type="number" min={0} value={form.salary} onChange={(e) => set("salary", e.target.value)} />
      </Field>
    );
  if (field === "quantity")
    return (
      <Field label={label}>
        <input type="number" min={0} step={kind === "compensation" ? 1 : 0.5} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} />
      </Field>
    );
  if (field === "vacationKind" && kind === "unpaid") {
    const reason = unpaidReason(form.vacationKind);
    const days = leaveDays(form.from, form.to);
    return (
      <Field label={label}>
        <select value={reason?.label || ""} onChange={(e) => set("vacationKind", e.target.value)}>
          <option value="">— seçin —</option>
          {UNPAID_REASONS.map((r) => (
            <option key={r.id} value={r.label}>
              {r.label}
              {r.maxDays ? ` — ən çox ${r.maxDays} gün` : ""}
            </option>
          ))}
        </select>
        {reason?.maxDays && days > reason.maxDays && <small className="danger-text">Seçilən əsas üçün qanunda ən çox {reason.maxDays} təqvim günü nəzərdə tutulur; siz {days} gün yazmısınız.</small>}
      </Field>
    );
  }
  if (field === "result")
    return (
      <Field label={label}>
        <select value={form.result} onChange={(e) => set("result", e.target.value)}>
          {["Sınaqdan uğurla keçdi", "Sınaqdan keçmədi (əmək müqaviləsinə xitam veriləcək)", "Sınaq müddəti uzadılsın"].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </select>
      </Field>
    );
  if (field === "penalty")
    return (
      <Field label={label}>
        <input list="penalty-kinds" value={form.penalty} onChange={(e) => set("penalty", e.target.value)} />
        <datalist id="penalty-kinds">
          {["Töhmət", "Ciddi töhmət", "Xəbərdarlıq"].map((v) => (
            <option key={v} value={v} />
          ))}
        </datalist>
      </Field>
    );
  return (
    <Field label={label}>
      <input value={form[field]} onChange={(e) => set(field, e.target.value)} />
    </Field>
  );
}

type OrderEmployee = { id: string; name: string; position: string; department: string; section: string; startDate: string; salary: number | null; salaryType: SalaryType; probationEnd: string; endDate: string };

// Draws an order up, or (with `editing`) changes one that was sent back.
export type OrderPrefill = { requestId: string; kind: OrderKind; from: string; to: string; quantity: string; vacationKind: string; basis: string };
export function OrderMaker({ employee, notify, editing, onSaved, prefill }: { employee: OrderEmployee; notify: Notify; editing?: SavedOrder; onSaved?: () => void; prefill?: OrderPrefill }) {
  const [facts, setFacts] = useState<CompanyFacts>({ name: "", voen: "", director: "" });
  const today = new Date().toISOString().slice(0, 10);
  const prior = editing?.input;
  const [kind, setKind] = useState<OrderKind>(editing?.kind || prefill?.kind || "vacation");
  const [form, setForm] = useState({
    date: editing?.date || today,
    from: prior?.from || prefill?.from || today,
    to: prior?.to || prefill?.to || "",
    newPosition: prior?.newPosition || "",
    newDepartment: prior?.newDepartment || "",
    salary: prior?.salary && editing?.kind !== "hire" ? String(prior.salary) : "",
    basis: prior?.basis || prefill?.basis || "",
    vacationKind: prior?.vacationKind || prefill?.vacationKind || (editing?.kind === "unpaid" || prefill?.kind === "unpaid" ? "" : "illik əmək məzuniyyəti"),
    place: prior?.place || "",
    penalty: prior?.penalty || "Töhmət",
    newName: prior?.newName || "",
    result: prior?.result || "Sınaqdan uğurla keçdi",
    schedule: prior?.schedule || "",
    quantity: prior?.quantity ? String(prior.quantity) : prefill?.quantity || "",
  });
  const [number, setNumber] = useState(editing?.number || "");
  // The section head and the director are picked from the staff list; the names can be changed.
  const [head, setHead] = useState({ use: true, name: "", note: "" });
  const [director, setDirector] = useState({ name: "", note: "" });
  const [saved, setSaved] = useState<SavedOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const loadSaved = useCallback(() => {
    if (editing) return;
    request<{ orders: SavedOrder[] }>(`company/orders?employeeId=${employee.id}`)
      .then((r) => setSaved(r.orders))
      .catch(() => undefined);
  }, [employee.id, editing]);
  useEffect(() => {
    void Promise.all([
      request<{ company: { name: string } | null }>("company/me"),
      request<{ details: { legalName: string; voen: string; director: string } }>("company/profile"),
      request<{ head: { name: string; position: string } | null; director: { name: string; position: string; source: string } | null }>(`company/order-signers?employeeId=${employee.id}`),
    ])
      .then(([me, profile, signers]) => {
        const oldHead = editing?.signers.find((x) => x.role === "head");
        const oldDirector = editing?.signers.find((x) => x.role === "director");
        setFacts({ name: profile.details.legalName || me.company?.name || "", voen: profile.details.voen, director: signers.director?.name || profile.details.director });
        setHead({
          use: editing ? !!oldHead : !!signers.head,
          name: oldHead?.name || signers.head?.name || "",
          note: signers.head ? `${signers.head.position} (ştat cədvəlindən)` : "Departamentdə şöbə rəhbəri tapılmadı: adı yazın və ya imzanı götürün.",
        });
        setDirector({
          name: oldDirector?.name || signers.director?.name || "",
          note: signers.director ? (signers.director.source === "staff" ? `${signers.director.position} (ştat cədvəlindən)` : "Şirkət məlumatlarındakı direktor") : "Direktor tapılmadı: adı yazın.",
        });
      })
      .catch(() => undefined);
    loadSaved();
  }, [employee.id, loadSaved, editing]);
  const signerList: SignerState[] = [
    ...(head.use && head.name.trim() ? [{ role: "head" as const, title: "Şöbə rəhbəri", name: head.name.trim() }] : []),
    ...(director.name.trim() ? [{ role: "director" as const, title: "Direktor", name: director.name.trim() }] : []),
  ];
  const input: OrderInput = {
    kind,
    number: number || orderNumber(kind, form.date, employee.id),
    date: form.date,
    city: "Bakı",
    company: { name: facts.name, voen: facts.voen, director: director.name || facts.director, directorTitle: "Direktor" },
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
    place: form.place,
    penalty: form.penalty,
    newName: form.newName,
    result: form.result,
    schedule: form.schedule,
    quantity: Number(form.quantity) || undefined,
    signers: signerList,
  };
  const order = buildOrder(input);
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  async function create() {
    setBusy(true);
    try {
      const { signers, ...rest } = input;
      void signers;
      if (editing) {
        await request("company/orders/update", { id: editing.id, kind, number: input.number, date: form.date, input: rest, signers: signerList });
        notify("Əmr dəyişdirildi və yenidən imzaya göndərildi.");
        onSaved?.();
        return;
      }
      await request("company/orders/save", { employeeId: employee.id, kind, number: input.number, date: form.date, input: rest, signers: signerList, requestId: prefill?.requestId });
      notify("Əmr yaradıldı və imzaya göndərildi. İmzalayanlar növbə ilə təsdiq edir.");
      setNumber("");
      loadSaved();
      onSaved?.();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: SavedOrder) {
    if (!window.confirm(`№ ${item.number} əmri silinsin?`)) return;
    try {
      await request("company/orders/delete", { id: item.id });
      loadSaved();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <div className="panel" style={{ marginTop: 12 }}>
      <p className="muted">
        <b>İşçi:</b> {employee.name || "—"} · <b>Departament:</b> {employee.department || "—"} · <b>Şöbə:</b> {employee.section || "—"} · <b>Vəzifə:</b> {employee.position || "—"}
      </p>
      <div className="form-grid">
        <Field label="Əmrin növü">
          <select value={kind} onChange={(e) => setKind(e.target.value as OrderKind)}>
            {[...new Set(ORDER_KINDS.map((item) => item.group))].map((group) => (
              <optgroup key={group} label={group}>
                {ORDER_KINDS.filter((item) => item.group === group).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Əmrin nömrəsi">
          <input value={number} placeholder={orderNumber(kind, form.date, employee.id)} onChange={(e) => setNumber(e.target.value)} />
        </Field>
        <Field label="Əmrin tarixi">
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </Field>
        {(ORDER_KINDS.find((item) => item.id === kind)?.fields || []).map((field) => (
          <OrderFormField key={field} field={field} kind={kind} form={form} salaryType={employee.salaryType} set={set} />
        ))}
      </div>
      <h4>İmzalayanlar (növbə ilə: əvvəl şöbə rəhbəri, sonra direktor)</h4>
      <div className="form-grid">
        <Field label="Şöbə rəhbəri">
          <input value={head.name} disabled={!head.use} onChange={(e) => setHead({ ...head, name: e.target.value })} />
          <small className="skill-picker-help">{head.note}</small>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="checkbox" checked={head.use} onChange={(e) => setHead({ ...head, use: e.target.checked })} /> Bu əmri şöbə rəhbəri də imzalasın
          </label>
        </Field>
        <Field label="Direktor">
          <input value={director.name} onChange={(e) => setDirector({ ...director, name: e.target.value })} />
          <small className="skill-picker-help">{director.note}</small>
        </Field>
      </div>
      <pre className="muted" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
        {order.text}
      </pre>
      <div className="admin-actions">
        <button type="button" className="primary" disabled={busy || !signerList.length} onClick={create}>
          {editing ? "Dəyişdir və yenidən imzaya göndər" : "Əmri yarat və imzaya göndər"}
        </button>
        <button type="button" className="secondary" onClick={() => printOrder(order)}>
          <Printer size={14} /> Çap et / PDF
        </button>
        <button type="button" className="secondary" onClick={() => downloadOrderWord(order)}>
          <Download size={14} /> Word (.doc)
        </button>
      </div>
      {!editing && !!saved.length && (
        <>
          <h4>Yaradılmış əmrlər</h4>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Əmr</th>
                  <th>İmza və növbə</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {saved.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <b>№ {item.number}</b>
                      <small className="skill-description">
                        {ORDER_KINDS.find((k) => k.id === item.kind)?.label} · {item.date}
                      </small>
                    </td>
                    <td>
                      <OrderSignerBox order={item} onChange={loadSaved} notify={notify} />
                    </td>
                    <td className="admin-actions">
                      <button type="button" onClick={() => printOrder(rebuildOrder(item))}>
                        Çap et
                      </button>
                      <button type="button" onClick={() => downloadOrderWord(rebuildOrder(item))}>
                        Word
                      </button>
                      {item.status !== "signed" && (
                        <button type="button" aria-label="Sil" onClick={() => void remove(item)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <small className="muted">İmzalanmış əmri çap edib əl ilə də imzalaya və “Sənəd qovluğu”na yükləyə bilərsiniz.</small>
    </div>
  );
}

// ---------- The register of all orders ----------
export function OrdersRegistry({ notify }: { notify: Notify }) {
  type Row = SavedOrder & { employee: OrderEmployee };
  const [rows, setRows] = useState<Row[] | null>(null);
  const [filters, setFilters] = useState({ q: "", status: "", orderKind: "", from: "", to: "" });
  const [open, setOpen] = useState<Row | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value)).toString();
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<{ orders: Row[] }>(`company/orders/registry${query ? `?${query}` : ""}`)
      .then((r) => {
        setRows(r.orders);
        setOpen((current) => (current ? r.orders.find((o) => o.id === current.id) || null : null));
      })
      .catch((error) => notifyRef.current((error as Error).message));
  }, [query]);
  useEffect(load, [load]);
  const set = (key: keyof typeof filters, value: string) => setFilters({ ...filters, [key]: value });
  const waiting = rows?.filter((r) => r.status !== "signed").length || 0;
  const [tab, setTab] = useState<"orders" | "requests">("orders");
  const [newRequests, setNewRequests] = useState(0);
  return (
    <div className="company-page">
      <div className="calc-tabs" role="tablist" aria-label="Əmrlər bölməsi">
        <button type="button" role="tab" aria-selected={tab === "orders"} className={tab === "orders" ? "primary" : "ghost"} onClick={() => setTab("orders")}>
          Əmrlər reyestri
        </button>
        <button type="button" role="tab" aria-selected={tab === "requests"} className={tab === "requests" ? "primary" : "ghost"} onClick={() => setTab("requests")}>
          İşçi ərizələri{newRequests ? ` (${newRequests})` : ""}
        </button>
      </div>
      {tab === "requests" && <RequestsPanel notify={notify} onCount={setNewRequests} onOrdered={load} />}
      {tab === "orders" && (
        <>
      <div className="section-heading">
        <div>
          <p className="muted">
            Bütün əmrlər bir yerdə: kim hazırlayıb, kimdə növbədir, kim təsdiqləyib və ya geri göndərib. Gözləyən: <b>{waiting}</b>.
          </p>
        </div>
        <div className="admin-actions">
          <a className="secondary report-button" href={`/api/joblink/company/report?kind=orders${query ? `&${query}` : ""}`} download>
            <Download size={14} /> Excel hesabatı
          </a>
        </div>
      </div>
      <div className="form-grid">
        <Field label="Axtarış (nömrə, işçi, departament)">
          <input value={filters.q} onChange={(e) => set("q", e.target.value)} />
        </Field>
        <Field label="Status">
          <select value={filters.status} onChange={(e) => set("status", e.target.value)}>
            <option value="">Hamısı</option>
            <option value="open">İmza gözləyənlər</option>
            <option value="pending">İmza gözləyir</option>
            <option value="returned">Geri qaytarılıb</option>
            <option value="signed">İmzalanıb</option>
          </select>
        </Field>
        <Field label="Əmrin növü">
          <select value={filters.orderKind} onChange={(e) => set("orderKind", e.target.value)}>
            <option value="">Hamısı</option>
            {ORDER_KINDS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tarixdən">
          <input type="date" value={filters.from} onChange={(e) => set("from", e.target.value)} />
        </Field>
        <Field label="Tarixədək">
          <input type="date" value={filters.to} onChange={(e) => set("to", e.target.value)} />
        </Field>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>№</th>
              <th>Tarix</th>
              <th>Növ</th>
              <th>İşçi</th>
              <th>Departament / Şöbə</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(rows || []).map((row) => (
              <tr key={row.id}>
                <td>
                  <b>{row.number}</b>
                </td>
                <td>{row.date}</td>
                <td>{ORDER_KINDS.find((k) => k.id === row.kind)?.label.replace(" haqqında əmr", "")}</td>
                <td>{row.employee.name}</td>
                <td>
                  {row.employee.department || "—"}
                  {row.employee.section && <small className="skill-description">{row.employee.section}</small>}
                </td>
                <td>{STATUS_TEXT(row)}</td>
                <td className="admin-actions">
                  <button type="button" onClick={() => setOpen(row)}>
                    Aç
                  </button>
                </td>
              </tr>
            ))}
            {rows && !rows.length && (
              <tr>
                <td colSpan={7}>
                  <p className="admin-empty">Əmr yoxdur. Əmri işçi kartından yaradın (İşçilər → Düzəlt → Əmr sənədləri).</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {open && !editing && (
        <Modal title={`Əmr № ${open.number}: ${open.employee.name}`} onClose={() => setOpen(null)}>
          <div className="offer-composer">
            <pre className="muted" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {rebuildOrder(open).text}
            </pre>
            <OrderSignerBox order={open} onChange={load} notify={notify} />
            <div className="admin-actions">
              {open.status !== "signed" && (
                <button type="button" className="secondary" onClick={() => setEditing(open)}>
                  Əmri düzəlt
                </button>
              )}
              <button type="button" className="secondary" onClick={() => printOrder(rebuildOrder(open))}>
                <Printer size={14} /> Çap et / PDF
              </button>
              <button type="button" className="secondary" onClick={() => downloadOrderWord(rebuildOrder(open))}>
                <Download size={14} /> Word (.doc)
              </button>
            </div>
          </div>
        </Modal>
      )}
      {editing && (
        <Modal
          title={`Əmri düzəlt: № ${editing.number}`}
          onClose={() => {
            setEditing(null);
          }}
        >
          <OrderMaker
            employee={editing.employee}
            notify={notify}
            editing={editing}
            onSaved={() => {
              setEditing(null);
              setOpen(null);
              load();
            }}
          />
        </Modal>
      )}
        </>
      )}
    </div>
  );
}

// ---------- Applications (ərizə) of employees: recorded here, the order is drawn up from them ----------
type RequestRow = {
  id: string;
  kind: string;
  data: RequestData & { basis?: string };
  status: "new" | "ordered" | "rejected" | "answered" | "withdrawn";
  source: "employee" | "hr";
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  decision: string;
  by: string;
  created: string;
  employee: OrderEmployee;
};
const REQUEST_STATUS: Record<string, string> = { new: "Gözləyir", ordered: "Əmr yaradılıb", rejected: "Rədd edilib", answered: "Cavablandırılıb", withdrawn: "İşçi geri götürüb" };

function RequestsPanel({ notify, onCount, onOrdered }: { notify: Notify; onCount: (n: number) => void; onOrdered: () => void }) {
  const [rows, setRows] = useState<RequestRow[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [making, setMaking] = useState<RequestRow | null>(null);
  const [filter, setFilter] = useState<"new" | "all">("new");
  const notifyRef = useRef(notify);
  const countRef = useRef(onCount);
  useEffect(() => {
    notifyRef.current = notify;
    countRef.current = onCount;
  });
  const load = useCallback(() => {
    request<{ requests: RequestRow[] }>("company/applications")
      .then((r) => {
        setRows(r.requests);
        countRef.current(r.requests.filter((x) => x.status === "new").length);
      })
      .catch((error) => notifyRef.current((error as Error).message));
  }, []);
  useEffect(load, [load]);
  async function reject(row: RequestRow) {
    const reason = window.prompt(`“${row.employee.name}” ərizəsinin rədd səbəbi:`);
    if (!reason || reason.trim().length < 3) return;
    try {
      await request("company/applications/reject", { id: row.id, reason });
      notify("Ərizə rədd edildi.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function answer(row: RequestRow) {
    const reply = window.prompt(`“${row.employee.name}” ərizəsinə cavab:`);
    if (!reply || reply.trim().length < 3) return;
    try {
      await request("company/applications/answer", { id: row.id, reply });
      notify("Cavab yazıldı: işçi öz profilində görəcək.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function remove(row: RequestRow) {
    if (!window.confirm("Ərizə silinsin?")) return;
    try {
      await request("company/applications/delete", { id: row.id });
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!rows) return null;
  const list = rows.filter((r) => filter === "all" || r.status === "new");
  return (
    <div className="requests-panel">
      <div className="section-heading">
        <p className="muted">
          İşçinin yazılı ərizəsini burada qeyd edin, sonra “Əmr yarat” düyməsi ilə əmr ərizə əsasında hazırlanır: işçi, növ, tarixlər və əsas (ərizənin tarixi və səbəbi) avtomatik dolur. Əmr silinərsə ərizə yenidən gözləyənlərə qayıdır.
        </p>
        <div className="admin-actions">
          <select value={filter} aria-label="Süzgəc" onChange={(e) => setFilter(e.target.value as "new" | "all")}>
            <option value="new">Yalnız gözləyənlər</option>
            <option value="all">Hamısı</option>
          </select>
          <button type="button" className="primary" onClick={() => setAdding(true)}>
            <Plus size={14} /> Ərizə qeyd et
          </button>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Ərizə tarixi</th>
              <th>İşçi</th>
              <th>Ərizənin növü</th>
              <th>Müddət</th>
              <th>Səbəb</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((row) => (
              <tr key={row.id}>
                <td>{row.created.slice(0, 10)}</td>
                <td>
                  <b>{row.employee.name}</b>
                  <small className="skill-description">{[row.employee.position, row.employee.department].filter(Boolean).join(" · ")}</small>
                  <small className="skill-description">{row.source === "employee" ? "İşçi öz profilindən yazıb" : `HR qeyd edib${row.by ? `: ${row.by}` : ""}`}</small>
                </td>
                <td>{requestKindLabel(row.kind)}</td>
                <td>
                  {row.data.from ? `${row.data.from}${row.data.to ? ` – ${row.data.to}` : ""}` : "—"}
                  {row.data.quantity ? <small className="skill-description">{row.data.quantity} {row.kind === "compensation" ? "gün" : "saat"}</small> : null}
                </td>
                <td>
                  {[row.data.basis, row.data.reason].filter(Boolean).join(" — ") || "—"}
                </td>
                <td>
                  {REQUEST_STATUS[row.status]}
                  {row.status === "ordered" && <small className="skill-description">№ {row.orderNumber || "—"}</small>}
                  {(row.status === "rejected" || row.status === "answered") && <small className="skill-description">{row.decision}</small>}
                </td>
                <td className="admin-actions">
                  {row.status === "new" && row.kind !== OTHER_REQUEST.id && (
                    <button type="button" className="primary" onClick={() => setMaking(row)}>
                      Əmr yarat
                    </button>
                  )}
                  {row.status === "new" && row.kind === OTHER_REQUEST.id && (
                    <button type="button" className="primary" onClick={() => void answer(row)}>
                      Cavab yaz
                    </button>
                  )}
                  {row.status === "new" && (
                    <button type="button" onClick={() => void reject(row)}>
                      Rədd et
                    </button>
                  )}
                  {row.status !== "ordered" && (
                    <button type="button" aria-label="Sil" onClick={() => void remove(row)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td colSpan={7}>
                  <p className="admin-empty">{filter === "new" ? "Gözləyən ərizə yoxdur." : "Hələ ərizə qeyd edilməyib."}</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {adding && <RequestForm notify={notify} onClose={() => setAdding(false)} onSaved={load} />}
      {making && (
        <Modal title={`Əmr: ${making.employee.name} — ${requestKindLabel(making.kind)}`} onClose={() => setMaking(null)}>
          <OrderMaker
            employee={making.employee}
            notify={notify}
            prefill={{ requestId: making.id, ...orderPrefill(making.kind, making.data, making.created.slice(0, 10)) }}
            onSaved={() => {
              setMaking(null);
              load();
              onOrdered();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

type PersonOption = { id: string; name: string; position: string; department: string };
function RequestForm({ notify, onClose, onSaved }: { notify: Notify; onClose: () => void; onSaved: () => void }) {
  const [people, setPeople] = useState<PersonOption[] | null>(null);
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<PersonOption | null>(null);
  const [kind, setKind] = useState<string>("vacation");
  const [data, setData] = useState<RequestData>({ from: "", to: "", quantity: 0, reason: "", basis: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    request<{ employees: (PersonOption & { status: string })[] }>("company/employees")
      .then((r) => setPeople(r.employees.filter((e) => e.status !== "left")))
      .catch(() => setPeople([]));
  }, []);
  const today = new Date().toISOString().slice(0, 10);
  const meta = [...REQUEST_KINDS, OTHER_REQUEST].find((k) => k.id === kind)!;
  const fields = ORDER_KINDS.find((k) => k.id === kind)?.fields || [];
  const problems = requestProblems(kind, data);
  const warnings = requestWarnings(kind, data, today);
  const needle = search.toLocaleLowerCase("az").trim();
  const matches = (people || []).filter((p) => !needle || `${p.name} ${p.position} ${p.department}`.toLocaleLowerCase("az").includes(needle)).slice(0, 8);
  async function save() {
    if (!picked) return notify("İşçini seçin.");
    setBusy(true);
    try {
      const result = await request<{ warnings: string[] }>("company/applications/save", { employeeId: picked.id, kind, data });
      notify(`Ərizə qeyd edildi.${result.warnings?.length ? ` Diqqət: ${result.warnings[0]}` : ""}`);
      onSaved();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="İşçi ərizəsi qeyd et" onClose={onClose}>
      <div className="offer-composer">
        <Field label="İşçi (ad, vəzifə və ya departament yazın)">
          <input
            value={picked ? `${picked.name} — ${picked.position || "vəzifəsiz"}${picked.department ? ` (${picked.department})` : ""}` : search}
            placeholder="İşçini axtarın"
            onChange={(e) => {
              setPicked(null);
              setSearch(e.target.value);
            }}
          />
        </Field>
        {!picked && (
          <ul className="emp-results emp-inline" role="listbox">
            {matches.map((p) => (
              <li key={p.id}>
                <button type="button" role="option" aria-selected="false" onClick={() => setPicked(p)}>
                  <strong>{p.name}</strong>
                  <small>{[p.position || "vəzifəsiz", p.department].filter(Boolean).join(" · ")}</small>
                </button>
              </li>
            ))}
            {people === null && <li className="muted emp-none">Yüklənir…</li>}
            {people !== null && !matches.length && <li className="muted emp-none">Uyğun işçi tapılmadı.</li>}
          </ul>
        )}
        <div className="form-grid">
          <Field label="Ərizənin növü">
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {[...REQUEST_KINDS, OTHER_REQUEST].map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
          {fields.includes("from") && (
            <Field label="Başlanğıc tarixi">
              <input type="date" value={data.from} onChange={(e) => setData({ ...data, from: e.target.value })} />
            </Field>
          )}
          {fields.includes("to") && kind !== "remote" && (
            <Field label="Bitmə tarixi">
              <input type="date" value={data.to} onChange={(e) => setData({ ...data, to: e.target.value })} />
            </Field>
          )}
          {fields.includes("quantity") && (
            <Field label={kind === "compensation" ? "Kompensasiya ödənilən gün sayı" : "Saat"}>
              <input type="number" min={0} value={data.quantity || ""} onChange={(e) => setData({ ...data, quantity: Number(e.target.value) })} />
            </Field>
          )}
          {kind === "unpaid" && (
            <Field label="Ödənişsiz məzuniyyətin əsası (130-cu maddə)">
              <select value={data.basis} onChange={(e) => setData({ ...data, basis: e.target.value })}>
                <option value="">— seçin —</option>
                {UNPAID_REASONS.map((r) => (
                  <option key={r.id} value={r.label}>
                    {r.label}
                    {r.maxDays ? ` — ən çox ${r.maxDays} gün` : ""}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {kind !== "unpaid" && (
            <Field label={["extendleave", "postpone", "schedule", "name"].includes(kind) ? "Əsas / səbəb" : "Əsas (arayış, sənəd nömrəsi)"}>
              <input value={data.basis} onChange={(e) => setData({ ...data, basis: e.target.value })} />
            </Field>
          )}
          <Field label="İşçinin qeydi / səbəbi">
            <input value={data.reason} onChange={(e) => setData({ ...data, reason: e.target.value })} />
          </Field>
        </div>
        <p className="muted">{meta.hint}</p>
        {problems.length > 0 && <small className="danger-text">{problems[0]}</small>}
        {warnings.map((w) => (
          <small key={w} className="plan-state plan-pending">
            {w}
          </small>
        ))}
        <button type="button" className="primary" disabled={busy || !picked || problems.length > 0} onClick={save}>
          Ərizəni qeyd et
        </button>
      </div>
    </Modal>
  );
}

// ---------- Job offer to a current employee, from a vacancy whose selection is finished ----------
type OfferJob = {
  id: string;
  title: string;
  department?: string;
  minSalary: number;
  maxSalary: number;
  salaryKind?: "net" | "gross" | "";
  workSchedule?: string;
  address?: string;
  city: string;
  benefits?: string;
};
type OfferEmployee = { id: string; name: string; position: string; department: string; email: string; status: string };

export function InternalOfferModal({ job, notify, onClose }: { job: OfferJob; notify: Notify; onClose: () => void }) {
  const [facts, setFacts] = useState<CompanyFacts>({ name: "", voen: "", director: "" });
  const [employees, setEmployees] = useState<OfferEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    salary: job.maxSalary > 0 ? String(job.maxSalary) : "",
    startDate: "",
    contractType: "Müddətsiz",
    probationMonths: "0",
    workSchedule: job.workSchedule || "",
    location: job.address || job.city || "",
    benefits: job.benefits || "",
    validUntil: "",
    message: "",
    signerName: "",
    signerTitle: "Direktor",
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void Promise.all([
      request<{ company: { name: string } | null }>("company/me"),
      request<{ details: { legalName: string; voen: string; director: string } }>("company/profile"),
      request<{ employees: OfferEmployee[] }>("company/employees"),
    ])
      .then(([me, profile, list]) => {
        setFacts({ name: profile.details.legalName || me.company?.name || "", voen: profile.details.voen, director: profile.details.director });
        setForm((value) => ({ ...value, signerName: value.signerName || profile.details.director }));
        setEmployees(list.employees.filter((e) => e.status !== "left"));
      })
      .catch((error) => notify((error as Error).message));
  }, [notify]);
  const employee = employees.find((e) => e.id === employeeId);
  const set = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  const offer = buildEmployeeOffer({
    date: today,
    city: "Bakı",
    company: facts,
    employee: { name: employee?.name || "", position: employee?.position || "" },
    position: job.title,
    department: job.department,
    salary: Number(form.salary) || undefined,
    salaryType: job.salaryKind === "net" ? "net" : "gross",
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
    if (!employee) return;
    setBusy(true);
    try {
      await request("company/employees/send-offer", { employeeId: employee.id, jobId: job.id, subject: offer.subject, text: offer.text });
      notify(`Təklif ${employee.email} ünvanına göndərildi.`);
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const ready = !!employee && Number(form.salary) > 0 && !!form.startDate;
  return (
    <Modal title={`Daxili işçiyə iş təklifi: ${job.title}`} onClose={onClose}>
      <div className="offer-composer">
        <p className="muted">
          Vakansiyanın seçim mərhələləri tamamlanıb. Bu vakansiyaya mövcud işçinizə (yüksəliş, köçürmə) hazır təklif məktubu göndərə bilərsiniz. Məktub maaşı və vəzifəni dəyişmir: razılıqdan sonra işçi kartında və “Əmr sənədləri”ndə rəsmiləşdirin.
        </p>
        <div className="form-grid">
          <Field label="İşçi *">
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">İşçi seçin</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.position ? ` — ${e.position}` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Aylıq əmək haqqı (AZN, ${job.salaryKind === "net" ? "net" : "gross"}) *`}>
            <input type="number" min={0} value={form.salary} onChange={(e) => set("salary", e.target.value)} />
            {job.minSalary > 0 && <small className="skill-picker-help">Vakansiyada: {job.minSalary}–{job.maxSalary} AZN</small>}
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
          <button type="button" className="primary" disabled={busy || !ready || !employee?.email} title={employee && !employee.email ? "İşçinin e-poçtu yoxdur" : ""} onClick={send}>
            E-poçtla göndər
          </button>
          {employee?.email && (
            <a className="secondary report-button" href={`mailto:${employee.email}?subject=${encodeURIComponent(offer.subject)}&body=${encodeURIComponent(offer.text)}`}>
              Poçt proqramında aç
            </a>
          )}
          <button type="button" className="secondary" onClick={print}>
            <Printer size={14} /> Çap et / PDF
          </button>
          <button type="button" className="secondary" onClick={word}>
            <Download size={14} /> Word (.doc)
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------- Staff table ----------
// ---------- Department and section catalog ----------
type OrgNames = { departments: string[]; sections: string[]; positions: string[] };
type OrgKind = "department" | "section" | "position";
const ORG_KEY = { department: "departments", section: "sections", position: "positions" } as const;
export function useOrgNames() {
  const [names, setNames] = useState<OrgNames>({ departments: [], sections: [], positions: [] });
  useEffect(() => {
    request<OrgNames>("company/org-names")
      .then(setNames)
      .catch(() => undefined);
  }, []);
  const remember = (kind: OrgKind, name: string) =>
    setNames((current) => {
      const key = ORG_KEY[kind];
      return canonicalOrgName(current[key], name).existing || !name.trim() ? current : { ...current, [key]: [...current[key], name.trim()] };
    });
  return { names, remember };
}

// Name from the company catalog, chosen from a list. A name the catalog lacks is added with "Yeni əlavə et";
// a name that is already there is not created again, the catalog spelling is chosen instead.
const NEW_NAME = "__new__";
const NEW_LABEL: Record<OrgKind, string> = { department: "＋ Yeni ad əlavə et…", section: "＋ Yeni ad əlavə et…", position: "＋ Vəzifə əlavə et…" };
export function OrgNameInput({
  label,
  kind,
  value,
  onChange,
  names,
  onAdded,
  department = "",
}: {
  label: string;
  kind: OrgKind;
  value: string;
  onChange: (value: string) => void;
  names: OrgNames;
  onAdded?: (kind: OrgKind, name: string) => void;
  placeholder?: string;
  // For a section: the department it belongs to; only its sections are listed.
  department?: string;
}) {
  const [scoped, setScoped] = useState<string[] | null>(null);
  useEffect(() => {
    if (kind !== "section" || !department.trim()) return;
    let live = true;
    request<OrgNames>(`company/org-names?department=${encodeURIComponent(department)}`)
      .then((data) => live && setScoped(data.sections))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [kind, department]);
  const list = kind === "section" ? (department.trim() ? scoped || [] : []) : names[ORG_KEY[kind]];
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [hint, setHint] = useState("");
  const options = value && !canonicalOrgName(list, value).existing ? [...list, value] : list;
  const blocked = kind === "section" && !department.trim();
  async function add() {
    const name = draft.trim();
    if (name.length < 2) return;
    try {
      const result = await request<{ name: string; existing: boolean; matched?: "exact" | "close" | null; requested?: "new" | "known" | null; original?: string }>("company/org-names/add", { kind, name, department });
      onAdded?.(kind, result.name);
      if (kind === "section") setScoped((current) => (current && !canonicalOrgName(current, result.name).existing ? [...current, result.name] : current));
      onChange(result.name);
      setHint(
        result.matched === "close"
          ? `“${result.original}” ümumi kataloqda “${result.name}” kimi var — o seçildi (təkrar ad yaranmadı).`
          : result.matched === "exact" && result.original && result.original !== result.name
            ? `“${result.original}” ümumi kataloqda “${result.name}” adı ilə var — o seçildi.`
            : result.requested === "new"
              ? `“${result.name}” ümumi vəzifə kataloqunda yoxdur. Şirkət siyahınıza əlavə edildi və kataloqa əlavə olunması üçün adminə sorğu göndərildi — vəzifəni indi seçə bilərsiniz.`
              : result.requested === "known"
                ? `“${result.name}” şirkət siyahınıza əlavə edildi; kataloqa əlavə sorğusu artıq adminə göndərilib.`
                : result.existing
                  ? `“${result.name}” kataloqda artıq var — mövcud ad seçildi.`
                  : `“${result.name}” şirkət kataloquna əlavə edildi.`,
      );
      setAdding(false);
      setDraft("");
    } catch (error) {
      setHint((error as Error).message);
    }
  }
  return (
    <div className="org-input">
      <Field label={label}>
        <select
          value={adding ? NEW_NAME : value}
          disabled={blocked}
          onChange={(e) => {
            if (e.target.value === NEW_NAME) {
              setAdding(true);
              setHint("");
            } else {
              setAdding(false);
              onChange(e.target.value);
            }
          }}
        >
          <option value="">{blocked ? "— əvvəl departamenti seçin —" : "— seçin —"}</option>
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={NEW_NAME}>{NEW_LABEL[kind]}</option>
        </select>
      </Field>
      {adding && (
        <div className="org-add">
          {kind === "position" ? (
            <JobTitleInput label="Vəzifə (ümumi kataloqdan seçin və ya yazın)" value={draft} onChange={setDraft} />
          ) : (
            <input
              autoFocus
              value={draft}
              placeholder="Yeni adı yazın"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void add();
                }
              }}
            />
          )}
          <button type="button" className="secondary" onClick={() => void add()}>
            Əlavə et
          </button>
        </div>
      )}
      {hint && <small className="skill-picker-help">{hint}</small>}
    </div>
  );
}

// ---------- The employee's own profile: link code ----------
export function EmployeeLinkPanel({ employeeId, name, linked, pending, notify, onChanged }: { employeeId: string; name: string; linked: boolean; pending: boolean; notify: Notify; onChanged: () => void }) {
  const [code, setCode] = useState<{ code: string; expires: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function make() {
    setBusy(true);
    try {
      setCode(await request<{ code: string; expires: string }>("company/employees/link-code", { id: employeeId }));
      onChanged();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function unlink() {
    if (!window.confirm(`“${name}” işçisinin öz profili ilə əlaqəsi ləğv edilsin? İşçi artıq öz profilindən ərizə göndərə bilməyəcək.`)) return;
    try {
      await request("company/employees/unlink", { id: employeeId });
      notify("Qoşulma ləğv edildi.");
      setCode(null);
      onChanged();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <div className="offer-composer">
      <p className="muted">
        İşçi öz Joblink profilindən “İş yerim” bölməsinə girib şirkətə ərizə yaza bilər: ərizə sizdə “Əmrlər reyestri → İşçi ərizələri” siyahısına düşür, cavabınız isə işçinin yazışmalar reyestrində görünür. Bunun üçün işçinin hesabı bu işçi kartına bir dəfəlik kodla qoşulur (Joblink vasitəsilə işə qəbul olunanlar avtomatik qoşulur).
      </p>
      {linked ? (
        <>
          <p>
            <b>Qoşulub:</b> {name} öz profilindən ərizə göndərə bilir.
          </p>
          <div className="admin-actions">
            <button type="button" className="secondary" onClick={() => void unlink()}>
              Qoşulmanı ləğv et
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{pending && !code ? "Qüvvədə olan qoşulma kodu var (təhlükəsizlik üçün yenidən göstərilmir). Yeni kod yaratsanız köhnəsi etibarsız olur." : "İşçi hələ profilini qoşmayıb."}</p>
          <div className="admin-actions">
            <button type="button" className="primary" disabled={busy} onClick={() => void make()}>
              {pending ? "Yeni qoşulma kodu yarat" : "Qoşulma kodu yarat"}
            </button>
          </div>
          {code && (
            <div className="link-code-box">
              <small className="muted">Bu kodu işçiyə verin (yalnız indi göstərilir):</small>
              <strong className="link-code">{code.code}</strong>
              <small className="muted">
                İşçi Joblink-də hesabına daxil olub “İş yerim” bölməsində kodu yazır. Kod bir dəfə işləyir və {code.expires.slice(0, 10)} tarixinədək qüvvədədir.
              </small>
              <button type="button" className="secondary" onClick={() => void navigator.clipboard?.writeText(code.code).then(() => notify("Kod kopyalandı."))}>
                Kodu kopyala
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Codes for all employees who have not linked their own profile yet, handed out as one Excel file.
export function BulkLinkCodes({ unlinked, withCode, notify, onClose, onDone }: { unlinked: number; withCode: number; notify: Notify; onClose: () => void; onDone: () => void }) {
  const [again, setAgain] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);
  const count = again ? unlinked : Math.max(0, unlinked - withCode);
  async function make() {
    setBusy(true);
    try {
      const [done, me] = await Promise.all([
        request<{ items: LinkCodeItem[]; created: number; skipped: number }>("company/employees/link-codes", { includeActive: again }),
        request<{ company: { name: string } | null }>("company/me").catch(() => ({ company: null })),
      ]);
      if (done.items.length) downloadBlob(createXlsxBook(linkCodeSheets(done.items, me.company?.name || "şirkət")), `qosulma-kodlari-${new Date().toISOString().slice(0, 10)}.xlsx`);
      setResult({ created: done.created, skipped: done.skipped });
      onDone();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Qoşulma kodlarını toplu yarat" onClose={onClose}>
      <div className="offer-composer">
        <p className="muted">
          Öz profilini hələ qoşmamış bütün işçilər üçün qoşulma kodu yaradılır və <b>Excel faylı</b> kimi yüklənir (ad, vəzifə, departament, e-poçt, kod). Hər işçiyə yalnız öz kodunu verin: kod bir dəfə işləyir və 7 gün qüvvədədir. Kodlar bazada açıq saxlanılmır — bu fayl onları görmək üçün yeganə yoldur.
        </p>
        <p>
          Qoşulmamış işçi: <b>{unlinked}</b> · qüvvədə kodu olan: <b>{withCode}</b>
        </p>
        {withCode > 0 && (
          <label className="check-row">
            <input type="checkbox" checked={again} onChange={(e) => setAgain(e.target.checked)} /> Qüvvədə kodu olanlara da yeni kod ver (köhnə kodları etibarsız edir)
          </label>
        )}
        <button type="button" className="primary" disabled={busy || count === 0} onClick={() => void make()}>
          <Download size={14} /> {count} işçi üçün kod yarat və Excel-ə yüklə
        </button>
        {result && (
          <p className={result.created ? "plan-state plan-approved" : "plan-state"}>
            {result.created ? `${result.created} kod yaradıldı və fayl yükləndi. Faylı yalnız lazım olan şəxslərlə paylaşın və işlər bitəndən sonra silin.` : "Yeni kod yaradılmadı."}
            {result.skipped ? ` ${result.skipped} işçi keçildi (qoşulub və ya qüvvədə kodu var).` : ""}
          </p>
        )}
      </div>
    </Modal>
  );
}

// ---------- Personal data of an employee ----------
const MARITAL: [string, string][] = [["", "—"], ["single", "Subay"], ["married", "Evli"], ["divorced", "Boşanıb"], ["widowed", "Dul"]];
export function EmployeeProfilePanel({ employeeId, initial, birthDateHint, notify, onSaved }: { employeeId: string; initial?: EmployeeProfile | null; birthDateHint?: string; notify: Notify; onSaved?: (profile: EmployeeProfile) => void }) {
  const [profile, setProfile] = useState<EmployeeProfile>({ ...EMPTY_PROFILE, ...(initial || {}) });
  const set = <K extends keyof EmployeeProfile>(key: K, value: EmployeeProfile[K]) => setProfile((p) => ({ ...p, [key]: value }));
  const today = new Date().toISOString().slice(0, 10);
  const age = ageOn(profile.birthDate || birthDateHint || "", today);
  async function save() {
    try {
      const result = await request<{ profile: EmployeeProfile }>("company/employees/profile", { id: employeeId, profile });
      setProfile(result.profile);
      onSaved?.(result.profile);
      notify("Şəxsi məlumatlar yadda saxlanıldı.");
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const text = (key: keyof EmployeeProfile, label: string, props: Record<string, unknown> = {}) => (
    <Field label={label}>
      <input value={String(profile[key] ?? "")} onChange={(e) => set(key, e.target.value as never)} {...props} />
    </Field>
  );
  return (
    <div className="offer-composer">
      <p className="muted">
        Şəxsiyyət vəsiqəsi, ünvan və bank məlumatları yalnız HR, direktor və hesab sahibinə görünür.
        {age !== null && ` Yaş: ${age}.`}
        {idExpiresSoon(profile, today) && <b className="danger-text"> Vəsiqənin müddəti bitir və ya bitib.</b>}
      </p>
      <h4>Şəxsiyyət vəsiqəsi</h4>
      <div className="form-grid">
        {text("fin", "FİN", { maxLength: 7, placeholder: "7 simvol" })}
        {text("idSeries", "Seriya", { maxLength: 6, placeholder: "AZE / AA" })}
        {text("idNumber", "Nömrə", { inputMode: "numeric", maxLength: 9 })}
        {text("idIssuedBy", "Verən orqan")}
        <Field label="Verilmə tarixi"><input type="date" value={profile.idIssuedDate} onChange={(e) => set("idIssuedDate", e.target.value)} /></Field>
        <Field label="Etibarlılıq müddəti"><input type="date" value={profile.idExpires} onChange={(e) => set("idExpires", e.target.value)} /></Field>
      </div>
      <h4>Şəxsi</h4>
      <div className="form-grid">
        <Field label="Doğum tarixi"><input type="date" value={profile.birthDate} onChange={(e) => set("birthDate", e.target.value)} /></Field>
        {text("birthPlace", "Doğum yeri")}
        <Field label="Cins">
          <select value={profile.gender} onChange={(e) => set("gender", e.target.value as EmployeeProfile["gender"])}>
            <option value="">—</option>
            <option value="male">Kişi</option>
            <option value="female">Qadın</option>
          </select>
        </Field>
        {text("citizenship", "Vətəndaşlıq")}
        <Field label="Ailə vəziyyəti">
          <select value={profile.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value as EmployeeProfile["maritalStatus"])}>
            {MARITAL.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>
        <Field label="14 yaşınadək uşaq sayı"><input type="number" min={0} value={profile.childrenUnder14} onChange={(e) => set("childrenUnder14", Number(e.target.value))} /></Field>
        <label className="check-row"><input type="checkbox" checked={profile.soleParent} onChange={(e) => set("soleParent", e.target.checked)} /> Uşağı təkbaşına böyüdür</label>
        {text("educationLevel", "Təhsil səviyyəsi")}
        {text("militaryStatus", "Hərbi uçot")}
      </div>
      <h4>Əlillik və sosial status</h4>
      <p className="muted">Əlillik məlumatı işçinin qanuni hüquqlarını (iş vaxtı, məzuniyyət, ixtisarda üstünlük) və vergi güzəştini müəyyən edir. Yalnız arayış və sənədə əsasən doldurulur.</p>
      <div className="form-grid">
        <Field label="İşçinin özünün əlilliyi (orqanizmin funksiyalarının pozulması)">
          <select value={profile.disability} onChange={(e) => set("disability", e.target.value as EmployeeProfile["disability"])}>
            <option value="">Əlilliyi yoxdur</option>
            <option value="under61">Əlillik var — pozulma 60%-dək</option>
            <option value="p61_80">Əlillik var — pozulma 61–80%</option>
            <option value="p81_100">Əlillik var — pozulma 81–100%</option>
          </select>
        </Field>
        <Field label="Əlillik dərəcəsi (qrupu)">
          <select value={profile.disabilityDegree} onChange={(e) => set("disabilityDegree", e.target.value as EmployeeProfile["disabilityDegree"])}>
            <option value="">—</option>
            <option value="I">I dərəcə</option>
            <option value="II">II dərəcə</option>
            <option value="III">III dərəcə</option>
          </select>
        </Field>
        <label className="check-row"><input type="checkbox" checked={profile.disabilityWar} onChange={(e) => set("disabilityWar", e.target.checked)} /> Müharibə və ya hərbi xidmətlə əlaqədar əlillik</label>
        {text("disabilityDoc", "Əlillik arayışının nömrəsi")}
        <Field label="Əlillik müddəti (tarixədək)"><input type="date" value={profile.disabilityUntil} onChange={(e) => set("disabilityUntil", e.target.value)} /></Field>
        <Field label="Əlilliyi olan uşaq sayı"><input type="number" min={0} value={profile.disabledChildren} onChange={(e) => set("disabledChildren", Number(e.target.value))} /></Field>
        <Field label="Daimi qulluq tələb edən şəxsə baxır və onunla yaşayır">
          <select value={profile.careDependent} onChange={(e) => set("careDependent", e.target.value as EmployeeProfile["careDependent"])}>
            <option value="">Xeyr</option>
            <option value="child">Daimi qulluq tələb edən əlilliyi olan uşağa</option>
            <option value="adult81">Orqanizmin funksiyalarının 81–100% pozulması olan şəxsə</option>
            <option value="degree1">I dərəcə əlilliyi olan şəxsə / daimi qulluq tələb edən sağlamlıq imkanları məhdud uşağa</option>
          </select>
        </Field>
      </div>
      <h4>Gəlir vergisi güzəşti (Vergi Məcəlləsi, 102-ci maddə)</h4>
      <p className="muted">Vergi tutulan aylıq gəlir seçilən güzəştin məbləği qədər azaldılır. Güzəştlərdən yalnız biri — məbləğcə ən böyüyü — verilir (102.7); güzəşt yalnız əsas iş yerində və sənəd təqdim ediləndən tətbiq olunur (102.8).</p>
      {!!suggestedBenefits(profile).length && !profile.taxBenefit && (
        <div className="plan-state plan-pending">
          Məlumatlara görə hüquq ola bilər: <b>{suggestedBenefits(profile)[0].label}</b> — {suggestedBenefits(profile)[0].amount} AZN ({suggestedBenefits(profile)[0].article}).{" "}
          <button type="button" className="text-button" onClick={() => set("taxBenefit", suggestedBenefits(profile)[0].id)}>
            Bunu seç
          </button>
        </div>
      )}
      <div className="form-grid">
        <Field label="Güzəştin əsası">
          <select value={profile.taxBenefit} onChange={(e) => set("taxBenefit", e.target.value)}>
            <option value="">Güzəşt yoxdur</option>
            {[800, 400, 200, 100].map((amount) => (
              <optgroup key={amount} label={`Aylıq gəlir ${amount} AZN azalır`}>
                {TAX_BENEFITS.filter((b) => b.amount === amount).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label} ({b.article})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        {text("taxBenefitDoc", "Güzəşti təsdiq edən sənəd (nömrə, tarix)")}
        <Field label="Güzəşt hansı tarixdən tətbiq olunur"><input type="date" value={profile.taxBenefitFrom} onChange={(e) => set("taxBenefitFrom", e.target.value)} /></Field>
        <label className="check-row"><input type="checkbox" checked={profile.dependents3} onChange={(e) => set("dependents3", e.target.checked)} /> Himayəsində azı 3 nəfər var (gündüz təhsilli 23 yaşınadək tələbələr daxil) — 50 AZN (102.5)</label>
        <label className="check-row"><input type="checkbox" checked={profile.mainJob} onChange={(e) => set("mainJob", e.target.checked)} /> Bu, işçinin əsas iş yeridir (əmək kitabçası burada saxlanılır)</label>
      </div>
      <p>
        Hazırkı aylıq vergi azalması: <b>{taxReduction(profile, today)} AZN</b>
        {taxBenefit(profile.taxBenefit) ? ` (${taxBenefit(profile.taxBenefit)!.article}${profile.dependents3 ? " + 102.5" : ""})` : ""}.
      </p>
      {(() => {
        const rights = employeeRights(profile, today);
        return rights.length ? (
          <div className="rights-box">
            <h4>Əmək Məcəlləsi və Vergi Məcəlləsinə görə işçinin hüquqları</h4>
            <ul>
              {rights.map((r) => (
                <li key={r.id}>
                  {r.text} <small className="muted">({r.article})</small>
                </li>
              ))}
            </ul>
          </div>
        ) : null;
      })()}
      <h4>Ünvan və əlaqə</h4>
      <div className="form-grid">
        {text("registeredAddress", "Qeydiyyat ünvanı")}
        {text("address", "Faktiki ünvan")}
        {text("emergencyName", "Yaxın şəxs (ad)")}
        {text("emergencyPhone", "Yaxın şəxs (telefon)")}
      </div>
      <h4>Sosial sığorta</h4>
      <div className="form-grid">
        {text("ssn", "Sosial sığorta (SSN) nömrəsi")}
        {text("voen", "VÖEN")}
      </div>
      <h4>Maaş kartı və hesab rekvizitləri</h4>
      <div className="form-grid">
        <Field label="Maaş necə verilir">
          <select value={profile.payMethod} onChange={(e) => set("payMethod", e.target.value as EmployeeProfile["payMethod"])}>
            <option value="">Seçilməyib</option>
            <option value="bank">Bank hesabına köçürmə</option>
            <option value="card">Maaş kartına</option>
            <option value="cash">Nağd</option>
          </select>
        </Field>
        {text("bankName", "Bank", { placeholder: "Məsələn Kapital Bank" })}
        {text("bankCode", "Bank kodu", { inputMode: "numeric", maxLength: 12 })}
        {text("iban", "IBAN", { placeholder: "AZ00 XXXX ..." })}
        {text("accountNumber", "Hesab nömrəsi", { inputMode: "numeric", maxLength: 30 })}
        {text("cardNumber", "Maaş kartının nömrəsi", { inputMode: "numeric", maxLength: 19, placeholder: "16 rəqəm" })}
        {text("cardHolder", "Kart sahibi (kartdakı ad)", { maxLength: 80 })}
      </div>
      {profile.payMethod === "bank" && !profile.iban && <p className="danger-text">Bank köçürməsi seçilib, amma IBAN yoxdur: bank ödəniş sənədinə düşməyəcək.</p>}
      {profile.payMethod === "card" && !profile.cardNumber && !profile.iban && <p className="danger-text">Kart seçilib, amma nə kart nömrəsi, nə IBAN yazılıb.</p>}
      <button type="button" className="primary" onClick={save}>Yadda saxla</button>
    </div>
  );
}


// ---------- Staff table ----------
type StaffPerson = { id: string; name: string; gross?: number | null; outside?: "" | "below" | "above" };
type StaffRow = PlanUnit & { note: string; filled: number; free: number; fte: number; budget: number; people: StaffPerson[] };
type StaffDepartment = { department: string; planned: number; filled: number; free: number; fte: number; budget: number; unplaced: number; units: number; openVacancies: number };
type Unplaced = { id: string; name: string; department: string; section: string; position: string };
type StaffData = {
  rows: StaffRow[];
  departments: StaffDepartment[];
  unplaced: Unplaced[];
  total: { planned: number; filled: number; fte: number; budget: number; unplaced: number; payroll: number };
  pending: { id: string; subject: string; requested_by_name: string; created: string }[];
  mismatches?: number;
  locked?: boolean;
  planStatus?: "draft" | "pending" | "approved";
};
type EditingUnit = Partial<PlanUnit> & { note?: string };
const num = (value: number) => value.toLocaleString("az-AZ", { maximumFractionDigits: 2 });
const bandText = (row: { salaryMin: number; salaryMax: number }) =>
  !row.salaryMin && !row.salaryMax ? "—" : row.salaryMax > row.salaryMin ? `${azn(row.salaryMin)} – ${azn(row.salaryMax)}` : azn(row.salaryMin || row.salaryMax);

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "warn" }) {
  return (
    <div className={`staff-kpi${tone ? ` staff-kpi-${tone}` : ""}`}>
      <small>{label}</small>
      <strong>{value}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

export function StaffTable({ notify, onEditEmployee }: { notify: Notify; onEditEmployee?: (id: string) => void }) {
  const [data, setData] = useState<StaffData | null>(null);
  const [editing, setEditing] = useState<EditingUnit | null>(null);
  const [importing, setImporting] = useState<SheetKind | null>(null);
  const [tab, setTab] = useState<"table" | "structure" | "positions" | "history">("table");
  const [query, setQuery] = useState("");
  const { names, remember } = useOrgNames();
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
      remember("department", editing.department || "");
      remember("section", editing.section || "");
      remember("position", editing.position || "");
      setEditing(null);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function submitPlan() {
    if (!window.confirm("Plan direktorun təsdiqinə göndərilsin? Təsdiqdən sonra bütün dəyişikliklər direktorun təsdiqi ilə olacaq.")) return;
    try {
      const result = await request<{ status: string }>("company/staff/submit-plan", {});
      notify(result.status === "approved" ? "Ştat planı təsdiqləndi." : "Ştat planı direktorun təsdiqinə göndərildi.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function remove(row: StaffRow) {
    if (!window.confirm(`“${row.department} / ${row.position || "vəzifəsiz"}” ştat sətri silinsin?${row.filled ? ` Bu sətirdə ${row.filled} işçi işləyir — onlar ştatsız qalacaq.` : ""}`)) return;
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
  const match = (row: { department: string; section: string; position: string }) => !needle || `${row.department} ${row.section} ${row.position}`.toLocaleLowerCase("az").includes(needle);
  const total = data.total;
  const free = Math.max(0, total.planned - total.filled);
  const state = data.planStatus || "draft";
  const departments = data.departments;
  const planned = editing ? (editing.planned ?? 1) : 1;
  const band = editing ? { salaryMin: editing.salaryMin || 0, salaryMax: editing.salaryMax || 0 } : null;
  const checkPeople = editing?.id ? data.rows.find((r) => r.id === editing.id)?.people.length || 0 : 0;
  return (
    <section className="panel staff-panel">
      <div className="section-heading">
        <div>
          <h3>Ştat cədvəli</h3>
          <p className="muted">Departament → şöbə → vəzifə üzrə ştat yerləri, ştat dərəcəsi və maaş həddi. Departament göstəriciləri sətirlərin cəmidir.</p>
        </div>
        <div className="admin-actions">
          {state !== "approved" && !!data.rows.length && (
            <button type="button" className="primary" onClick={submitPlan} disabled={state === "pending"}>
              {state === "pending" ? "Təsdiq gözləyir" : "Planı təsdiqə göndər"}
            </button>
          )}
        </div>
      </div>
      <div className="staff-kpis">
        <Kpi label="Planlaşdırılan ştat" value={String(total.planned)} hint={`${num(total.fte)} tam ştat vahidi`} />
        <Kpi label="Dolu" value={String(total.filled)} hint="ştatda yeri olan işçi" />
        <Kpi label="Boş yer" value={String(free)} tone={free ? "good" : undefined} />
        <Kpi label="Ştatda yeri olmayan" value={String(total.unplaced)} tone={total.unplaced ? "warn" : undefined} hint={total.unplaced ? "aşağıda siyahıdadır" : "hamı yerləşib"} />
        <Kpi label="Aylıq maaş fondu" value={azn(total.payroll)} hint={total.budget ? `plan həddi ${azn(total.budget)}` : "ştatda maaş həddi yoxdur"} tone={total.budget && total.payroll > total.budget ? "warn" : undefined} />
      </div>
      <p className={`plan-state plan-${state}`}>
        {state === "approved"
          ? data.locked
            ? "Plan direktor tərəfindən təsdiqlənib. Dəyişikliklər, yeni sətirlər və silinmə direktorun təsdiqinə göndərilir (aylıq yeniləmə də belə edilir)."
            : "Plan təsdiqlənib. Direktor və hesab sahibi dəyişiklikləri birbaşa edə bilər; digərlərinin dəyişikliyi onların təsdiqinə düşür."
          : state === "pending"
            ? "Plan direktorun təsdiqini gözləyir. Təsdiqə qədər sətirləri düzəltmək olar."
            : "Plan layihə mərhələsindədir: departament və şöbələri yaradın, sətirləri əlavə edin və ya Excel yükləyin, sonra “Planı təsdiqə göndər” düyməsini basın. Təsdiqdən sonra direktor təsdiqləməsə dəyişmək olmaz."}
      </p>
      {!!data.mismatches && (
        <div className="staff-unplaced">
          <b>Maaşı ştat həddindən kənar olan işçi: {data.mismatches}</b>
          <p className="muted">İşçinin maaşı ilə ştat cədvəlindəki maaş arasında fərq olmamalıdır: işçiyə ştat həddindən aşağı və ya yuxarı maaş təyin etmək olmaz. Aşağıdakı cədvəldə qırmızı ilə göstərilən işçilərin maaşını düzəldin (işçi kartında “Maaşı düzəlt”) və ya ştat həddini dəyişin. Uyğunsuzluq qaldıqca həmin ştat sətrini saxlamaq mümkün olmur.</p>
        </div>
      )}
      {!!data.pending.length && (
        <div className="staff-pending">
          <b>Direktorun təsdiqini gözləyən dəyişikliklər ({data.pending.length})</b>
          <ul>
            {data.pending.map((p) => (
              <li key={p.id}>
                {p.subject} <small className="muted">— {p.requested_by_name || "—"}, {p.created.slice(0, 10)}</small>
              </li>
            ))}
          </ul>
          <a href="#hr-approvals">Təsdiqlər səhifəsinə keç</a>
        </div>
      )}
      <div className="calc-tabs" role="tablist">
        {([["table", "Ştat cədvəli"], ["structure", "Departament və şöbələr"], ["positions", "Vəzifələr"], ["history", "Dəyişiklik tarixçəsi"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? "primary" : "ghost"} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "structure" && <StructurePanel notify={notify} onChanged={load} onImport={() => setImporting("structure")} />}
      {tab === "positions" && <PositionsPanel notify={notify} onChanged={load} />}
      {tab === "history" && <StaffHistory />}
      {tab === "table" && (
        <>
          <div className="admin-actions staff-toolbar">
            <input className="search-input" placeholder="Departament, şöbə və ya vəzifə" value={query} onChange={(e) => setQuery(e.target.value)} />
            <a className="secondary report-button" href="/api/joblink/company/report?kind=staff" download>
              <Download size={14} /> XLSX
            </a>
            <button type="button" className="secondary" onClick={() => setImporting("staff")}>
              <FileSpreadsheet size={14} /> Excel-dən əlavə et
            </button>
            <button type="button" className="primary" onClick={() => setEditing({ planned: 1, rate: 1 })}>
              <Plus size={14} /> Ştat sətri
            </button>
          </div>
          {!!data.unplaced.length && (
            <div className="staff-unplaced">
              <b>Ştatda yeri olmayan işçilər ({data.unplaced.length})</b>
              <p className="muted">Bu işçilərin departament və vəzifəsinə uyğun ştat sətri yoxdur; ona görə sətirlərdə sayılmırlar. Sətir əlavə edin və ya işçinin vəzifəsini düzəldin.</p>
              <ul>
                {data.unplaced.map((p) => (
                  <li key={p.id}>
                    <span>
                      {p.name} — {p.position || "vəzifəsiz"} <small className="muted">({[p.department, p.section].filter(Boolean).join(" / ") || "departamentsiz"})</small>
                    </span>
                    <button type="button" className="secondary" onClick={() => setEditing({ department: p.department, section: p.section, position: p.position, planned: 1, rate: 1 })}>
                      Ştata əlavə et
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="admin-table-wrap">
            <table className="admin-table staff-table">
              <thead>
                <tr>
                  <th>Şöbə</th>
                  <th>Vəzifə</th>
                  <th>Ştat</th>
                  <th>Dərəcə</th>
                  <th>Maaş həddi (gross)</th>
                  <th>İşləyir</th>
                  <th>Boş</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {departments.map((d) => {
                  const rows = data.rows.filter((r) => r.department === d.department && match(r));
                  if (needle && !rows.length) return null;
                  return [
                    <tr key={`d-${d.department}`} className="staff-department">
                      <td colSpan={2}>
                        <b>{d.department || "Departamentsiz"}</b>
                      </td>
                      <td>
                        <b>{d.planned}</b>
                      </td>
                      <td>{num(d.fte)} vahid</td>
                      <td>{d.budget ? <>plan həddi <b>{azn(d.budget)}</b></> : "—"}</td>
                      <td>
                        <b>{d.filled}</b>
                        {d.unplaced > 0 && <small className="danger-text"> +{d.unplaced} ştatsız</small>}
                      </td>
                      <td>{d.free > 0 ? <b>{d.free}</b> : d.free === 0 ? "—" : <span className="danger-text">{d.free}</span>}</td>
                      <td>{d.openVacancies ? <small className="muted">{d.openVacancies} açıq vakansiya</small> : null}</td>
                    </tr>,
                    ...rows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.section || "—"}</td>
                        <td>
                          {row.position || "—"}
                          {!!row.people.length && (
                            <small className="skill-description">
                              {row.people.map((p, i) => (
                                <span key={p.id} className={p.outside ? "danger-text" : undefined}>
                                  {i ? ", " : ""}
                                  {p.name}
                                  {p.gross ? ` (${azn(p.gross)}${p.outside ? p.outside === "below" ? " — həddən aşağı" : " — həddən yuxarı" : ""})` : ""}
                                  {p.outside && onEditEmployee && (
                                    <button type="button" className="text-button" onClick={() => onEditEmployee(p.id)}>
                                      {" "}Maaşı düzəlt
                                    </button>
                                  )}
                                </span>
                              ))}
                            </small>
                          )}
                          {row.note && <small className="skill-description">{row.note}</small>}
                        </td>
                        <td>{row.planned}</td>
                        <td>{RATE_LABEL[row.rate] || "Tam ştat"}</td>
                        <td>{bandText(row)}</td>
                        <td>{row.filled}</td>
                        <td>{row.free > 0 ? <b>{row.free}</b> : row.free === 0 ? "—" : <span className="danger-text">{row.free}</span>}</td>
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
                    )),
                  ];
                })}
                {!data.rows.length && (
                  <tr>
                    <td colSpan={8}>
                      <p className="admin-empty">Ştat sətri yoxdur. Əvvəl “Departament və şöbələr” bölməsində strukturu yaradın, sonra “Ştat sətri” ilə əlavə edin və ya Excel faylı yükləyin.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <small className="skill-picker-help">
            Hər işçi yalnız bir sətirdə sayılır: departament, şöbə və vəzifəsinə ən uyğun sətirdə. “İşləyir” məzuniyyətdəkiləri də sayır. İşçiyə ştat sətrindəki maaş həddindən yuxarı və ya aşağı əmək haqqı təyin etmək olmaz. Bütün dəyişikliklər tarixçədə saxlanılır.
          </small>
        </>
      )}
      {editing && (
        <Modal title={editing.id ? "Ştat sətrini düzəlt" : "Yeni ştat sətri"} onClose={() => setEditing(null)}>
          <div className="offer-composer">
            <div className="form-grid">
              <OrgNameInput label="Departament" kind="department" names={names} onAdded={remember} value={editing.department || ""} onChange={(department) => setEditing({ ...editing, department, section: "" })} />
              <OrgNameInput label="Şöbə" kind="section" names={names} onAdded={remember} department={editing.department || ""} value={editing.section || ""} onChange={(section) => setEditing({ ...editing, section })} />
              <OrgNameInput label="Vəzifə" kind="position" names={names} onAdded={remember} value={editing.position || ""} onChange={(position) => setEditing({ ...editing, position })} />
              <Field label="Ştat sayı (neçə nəfər)">
                <input type="number" min={0} value={planned} onChange={(e) => setEditing({ ...editing, planned: Number(e.target.value) })} />
              </Field>
              <Field label="Ştat dərəcəsi">
                <select value={editing.rate ?? 1} onChange={(e) => setEditing({ ...editing, rate: Number(e.target.value) })}>
                  {RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {RATE_LABEL[rate]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Əmək haqqı — minimum (AZN, gross)">
                <input type="number" min={0} value={editing.salaryMin ?? ""} onChange={(e) => setEditing({ ...editing, salaryMin: Number(e.target.value) })} />
              </Field>
              <Field label="Əmək haqqı — maksimum (AZN, gross)">
                <input type="number" min={0} value={editing.salaryMax ?? ""} placeholder="boşdursa minimumla eyni" onChange={(e) => setEditing({ ...editing, salaryMax: Number(e.target.value) })} />
              </Field>
              <Field label="Qeyd">
                <input value={editing.note || ""} onChange={(e) => setEditing({ ...editing, note: e.target.value })} />
              </Field>
            </div>
            <p className="muted">
              Bu sətrə düşən işçiyə {band && (band.salaryMin || band.salaryMax) ? <b>{bandText({ salaryMin: band.salaryMin, salaryMax: Math.max(band.salaryMin, band.salaryMax) })}</b> : "ştatda göstərilən"} hüdudundan yuxarı və ya aşağı əmək haqqı təyin etmək olmaz.
              {planned > 0 && editing.rate && editing.rate < 1 ? ` ${planned} ${RATE_LABEL[editing.rate].toLocaleLowerCase("az")} = ${num(planned * editing.rate)} tam ştat vahididir.` : ""}
              {checkPeople ? ` Sətirdə ${checkPeople} işçi var: maaşları yeni hüdudlara uyğun deyilsə, növbəti dəyişiklikdə xəbərdarlıq çıxacaq.` : ""}
            </p>
            <button type="button" className="primary" onClick={save}>
              Yadda saxla
            </button>
          </div>
        </Modal>
      )}
      {importing && <SheetImport kind={importing} notify={notify} onClose={() => setImporting(null)} onDone={load} />}
    </section>
  );
}

// ---------- Departments and their sections ----------
type StructureSectionRow = { name: string; units: number; people: number };
type StructureDepartmentRow = { name: string; sections: StructureSectionRow[]; units: number; people: number };
type StructureData = { departments: StructureDepartmentRow[]; looseSections: { name: string }[] };

const foldName = (value: string) => value.toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/[^a-z0-9]+/g, " ").trim();

// Section names from a file: the "Şöbə" column when the first row names it, otherwise the first column.
async function sectionNamesFromFile(file: File) {
  const rows = await readSheetRows(file);
  const head = (rows[0] || []).map((cell) => foldName(String(cell ?? "")));
  const column = head.findIndex((cell) => ["sobe", "bolme", "section", "sobe adi"].includes(cell));
  const start = column >= 0 || ["sobe", "ad", "name", "adi"].includes(head[0] || "") ? 1 : 0;
  return rows
    .slice(start)
    .map((row) => String(row[column >= 0 ? column : 0] ?? "").trim())
    .filter(Boolean);
}

// The sections of one department: add one, add a list, add from Excel, rename, delete.
function DepartmentSections({ department, notify, onClose, onChanged }: { department: string; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const [data, setData] = useState<StructureDepartmentRow | null>(null);
  const [one, setOne] = useState("");
  const [many, setMany] = useState("");
  const [busy, setBusy] = useState(false);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<StructureData>("company/structure")
      .then((all) => setData(all.departments.find((d) => foldName(d.name) === foldName(department)) || { name: department, sections: [], units: 0, people: 0 }))
      .catch((error) => notifyRef.current((error as Error).message));
  }, [department]);
  useEffect(load, [load]);
  async function addMany(sections: string[], from: string) {
    if (!sections.length) return;
    setBusy(true);
    try {
      const result = await request<{ created: number; existing: number }>("company/structure/add-many", { department, sections });
      notify(`${from}: ${result.created} şöbə əlavə edildi${result.existing ? `, ${result.existing} artıq var idi` : ""}.`);
      load();
      onChanged();
      return true;
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function pickFile(file: File | undefined) {
    if (!file) return;
    try {
      const names = await sectionNamesFromFile(file);
      if (!names.length) return notify("Faylda şöbə adı tapılmadı. “Şöbə” sütunu və ya birinci sütun olmalıdır.");
      await addMany(names, file.name);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function rename(name: string) {
    const to = window.prompt(`“${name}” şöbəsinin yeni adı:`, name);
    if (to && to.trim() && to.trim() !== name)
      void request("company/structure/rename", { department, section: name, to })
        .then(() => {
          notify("Ad dəyişdirildi: ştat sətirləri və işçilər də yeni adla görünür.");
          load();
          onChanged();
        })
        .catch((error) => notify((error as Error).message));
  }
  function drop(name: string) {
    if (!window.confirm(`“${department} / ${name}” şöbəsi silinsin?`)) return;
    void request("company/structure/delete", { department, section: name })
      .then(() => {
        notify("Silindi.");
        load();
        onChanged();
      })
      .catch((error) => notify((error as Error).message));
  }
  if (!data) return null;
  const suggestions = suggestSections(department, data.sections.map((x) => x.name));
  const listed = splitNames(many);
  return (
    <Modal title={`${department} — şöbələr`} onClose={onClose}>
      <div className="offer-composer dept-sections">
        <div className="staff-kpis">
          <Kpi label="Şöbə" value={String(data.sections.length)} />
          <Kpi label="Ştat sətri" value={String(data.units)} />
          <Kpi label="İşçi" value={String(data.people)} />
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Şöbə</th>
                <th>Ştat sətri</th>
                <th>İşçi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.sections.map((x) => (
                <tr key={x.name}>
                  <td>{x.name}</td>
                  <td>{x.units}</td>
                  <td>{x.people}</td>
                  <td className="admin-actions">
                    <button type="button" onClick={() => rename(x.name)}>
                      Adını dəyiş
                    </button>
                    <button type="button" aria-label="Sil" onClick={() => drop(x.name)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {!data.sections.length && (
                <tr>
                  <td colSpan={4}>
                    <p className="admin-empty">Bu departamentdə hələ şöbə yoxdur. Aşağıdan əlavə edin.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <h4>Şöbə əlavə et</h4>
        <div className="org-add structure-add">
          <input
            className="search-input"
            value={one}
            placeholder="Şöbənin adı"
            onChange={(e) => setOne(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && one.trim().length >= 2) void addMany([one], "Əlavə edildi").then((done) => done && setOne(""));
            }}
          />
          <button type="button" className="primary" disabled={busy || one.trim().length < 2} onClick={() => void addMany([one], "Əlavə edildi").then((done) => done && setOne(""))}>
            Əlavə et
          </button>
        </div>
        {!!suggestions.length && (
          <>
            <h4>Tövsiyə olunan şöbələr</h4>
            <p className="muted">Bu departament üçün adətən olan şöbələr. Seçib əlavə edin və ya hamısını birdən əlavə edin.</p>
            <div className="suggest-chips">
              {suggestions.map((name) => (
                <button key={name} type="button" className="chip-button" disabled={busy} onClick={() => void addMany([name], "Əlavə edildi")}>
                  ＋ {name}
                </button>
              ))}
              <button type="button" className="secondary" disabled={busy} onClick={() => void addMany(suggestions, "Tövsiyə olunanlar")}>
                Hamısını əlavə et ({suggestions.length})
              </button>
            </div>
          </>
        )}
        <h4>Siyahı ilə əlavə et</h4>
        <p className="muted">Hər sətrə bir şöbə yazın (və ya vergüllə ayırın). Kataloqda olan ad təkrar yaradılmır.</p>
        <textarea rows={4} value={many} placeholder={"Mühasibat\nBüdcə və planlaşdırma\nXəzinə"} onChange={(e) => setMany(e.target.value)} />
        <div className="admin-actions">
          <button type="button" className="primary" disabled={busy || !listed.length} onClick={() => void addMany(listed, "Siyahı").then((done) => done && setMany(""))}>
            {listed.length ? `${listed.length} şöbəni əlavə et` : "Şöbələri əlavə et"}
          </button>
        </div>
        <h4>Excel-dən əlavə et</h4>
        <div className="admin-actions">
          <label className="secondary report-button" style={{ cursor: "pointer" }}>
            <Upload size={14} /> Excel və ya CSV seçin
            <input type="file" accept=".xlsx,.csv" hidden onChange={(event) => void pickFile(event.target.files?.[0])} />
          </label>
          <button type="button" className="secondary" onClick={() => downloadTemplate("sections")}>
            <Download size={14} /> Nümunə fayl (təlimatla)
          </button>
        </div>
        <small className="skill-picker-help">Faylda “Şöbə” sütunu olmalıdır (yoxdursa birinci sütun götürülür). Şöbələr yalnız “{department}” departamentinə əlavə olunur.</small>
      </div>
    </Modal>
  );
}

function StructurePanel({ notify, onChanged, onImport }: { notify: Notify; onChanged: () => void; onImport: () => void }) {
  const [data, setData] = useState<StructureData | null>(null);
  const [department, setDepartment] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<StructureData>("company/structure")
      .then(setData)
      .catch((error) => notifyRef.current((error as Error).message));
  }, []);
  useEffect(load, [load]);
  async function add() {
    const name = department.trim();
    if (name.length < 2) return;
    try {
      const result = await request<{ department: string }>("company/structure/add", { department: name });
      notify("Departament əlavə edildi (varsa mövcud ad saxlanıldı).");
      setDepartment("");
      load();
      onChanged();
      setOpen(result.department);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function rename(name: string) {
    const to = window.prompt(`“${name}” departamentinin yeni adı:`, name);
    if (to && to.trim() && to.trim() !== name)
      void request("company/structure/rename", { department: name, to })
        .then(() => {
          notify("Ad dəyişdirildi: ştat sətirləri, işçilər və vakansiyalar da yeni adla görünür.");
          load();
          onChanged();
        })
        .catch((error) => notify((error as Error).message));
  }
  function drop(name: string) {
    if (!window.confirm(`“${name}” departamenti və şöbələri silinsin?`)) return;
    void request("company/structure/delete", { department: name })
      .then(() => {
        notify("Silindi.");
        load();
        onChanged();
      })
      .catch((error) => notify((error as Error).message));
  }
  if (!data) return null;
  return (
    <div className="structure-panel">
      <div className="admin-actions staff-toolbar">
        <input className="search-input" placeholder="Yeni departamentin adı" value={department} onChange={(e) => setDepartment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void add()} />
        <button type="button" className="primary" disabled={department.trim().length < 2} onClick={() => void add()}>
          <Plus size={14} /> Departament
        </button>
        <button type="button" className="secondary" onClick={onImport}>
          <FileSpreadsheet size={14} /> Excel-dən əlavə et
        </button>
        <a className="secondary report-button" href="/api/joblink/company/report?kind=structure" download>
          <Download size={14} /> XLSX
        </a>
      </div>
      <p className="muted">
        Departament yaradandan sonra “Şöbələr” düyməsi ilə onun şöbələrini əlavə edin: tək-tək, siyahı ilə, tövsiyə olunanlardan və ya Excel-dən. Eyni ad iki dəfə yaradılmır. İstifadədə olan departament və ya şöbəni silmək olmaz; adını dəyişsəniz ştat sətirləri, işçilər və vakansiyalar da yeni adla görünür.
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Departament</th>
              <th>Şöbələr</th>
              <th>Ştat sətri</th>
              <th>İşçi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.departments.map((d) => (
              <tr key={d.name}>
                <td>
                  <b>{d.name}</b>
                </td>
                <td>
                  <span className="structure-names">{d.sections.length ? d.sections.map((s) => s.name).join(", ") : <span className="muted">Şöbə yoxdur</span>}</span>
                  <small className="muted"> {d.sections.length ? `(${d.sections.length})` : ""}</small>
                </td>
                <td>{d.units}</td>
                <td>{d.people}</td>
                <td className="admin-actions">
                  <button type="button" className="secondary" onClick={() => setOpen(d.name)}>
                    Şöbələr
                  </button>
                  <button type="button" onClick={() => rename(d.name)}>
                    Adını dəyiş
                  </button>
                  <button type="button" aria-label="Sil" onClick={() => drop(d.name)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {!data.departments.length && (
              <tr>
                <td colSpan={5}>
                  <p className="admin-empty">Hələ departament yoxdur. Yuxarıdan əlavə edin və ya Excel faylı yükləyin.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!!data.looseSections.length && (
        <p className="muted">
          Departamentə bağlanmamış şöbə adları: {data.looseSections.map((s) => s.name).join(", ")}. Bunlar ştat sətri və ya işçi kartında istifadə olunanda departamentə bağlanır.
        </p>
      )}
      {open && <DepartmentSections department={open} notify={notify} onClose={() => setOpen(null)} onChanged={() => { load(); onChanged(); }} />}
    </div>
  );
}

// ---------- The company's own list of positions ----------
function PositionsPanel({ notify, onChanged }: { notify: Notify; onChanged: () => void }) {
  const [rows, setRows] = useState<{ name: string; units: number; people: number }[] | null>(null);
  const [adding, setAdding] = useState("");
  const [hint, setHint] = useState("");
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<{ positions: { name: string; units: number; people: number }[] }>("company/structure/positions")
      .then((r) => setRows(r.positions))
      .catch((error) => notifyRef.current((error as Error).message));
  }, []);
  useEffect(load, [load]);
  async function add() {
    if (adding.trim().length < 2) return;
    try {
      const r = await request<{ name: string; existing: boolean; matched?: string | null; requested?: string | null; original?: string }>("company/org-names/add", { kind: "position", name: adding });
      setHint(
        r.matched === "close"
          ? `“${r.original}” ümumi kataloqda “${r.name}” kimi var — o əlavə edildi.`
          : r.requested === "new"
            ? `“${r.name}” ümumi kataloqda yoxdur: siyahınıza əlavə edildi və adminə kataloqa əlavə sorğusu göndərildi.`
            : r.existing
              ? `“${r.name}” siyahınızda artıq var.`
              : `“${r.name}” siyahınıza əlavə edildi.`,
      );
      setAdding("");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function rename(name: string) {
    const to = window.prompt(`“${name}” vəzifəsinin yeni adı:`, name);
    if (to && to.trim() && to.trim() !== name)
      void request("company/structure/positions/rename", { from: name, to })
        .then(() => {
          notify("Ad dəyişdirildi: ştat sətirləri və işçilər də yeni adla görünür.");
          load();
          onChanged();
        })
        .catch((error) => notify((error as Error).message));
  }
  function drop(name: string) {
    if (!window.confirm(`“${name}” vəzifəsi siyahıdan silinsin?`)) return;
    void request("company/structure/positions/delete", { name })
      .then(() => {
        notify("Silindi.");
        load();
      })
      .catch((error) => notify((error as Error).message));
  }
  if (!rows) return null;
  return (
    <div className="structure-panel">
      <p className="muted">
        Şirkətin vəzifə siyahısı: ştat cədvəli və işçi kartında bu siyahıdan seçilir. Yeni vəzifə ümumi vəzifə kataloqundan seçilir və ya yazılır; kataloqda olmayan ad siyahınıza əlavə olunur və adminə kataloqa əlavə sorğusu gedir. İstifadədə olan vəzifəni silmək olmaz; adını dəyişsəniz ştat sətirləri və işçilər də yeni adla görünür.
      </p>
      <div className="org-add structure-add">
        <JobTitleInput label="Yeni vəzifə" value={adding} onChange={setAdding} />
        <button type="button" className="primary" disabled={adding.trim().length < 2} onClick={() => void add()}>
          <Plus size={14} /> Əlavə et
        </button>
      </div>
      {hint && <small className="skill-picker-help">{hint}</small>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Vəzifə</th>
              <th>Ştat sətri</th>
              <th>İşçi</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>
                  <b>{r.name}</b>
                </td>
                <td>{r.units}</td>
                <td>{r.people}</td>
                <td className="admin-actions">
                  <button type="button" onClick={() => rename(r.name)}>
                    Adını dəyiş
                  </button>
                  <button type="button" aria-label="Sil" onClick={() => drop(r.name)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={4}>
                  <p className="admin-empty">Hələ vəzifə yoxdur. Yuxarıdan əlavə edin və ya ştat sətri yaradın.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------- Who changed the staff table, and when ----------
function StaffHistory() {
  const [entries, setEntries] = useState<{ id: string; action: string; target: string; detail: string; created: string; actor: string }[] | null>(null);
  useEffect(() => {
    request<{ entries: { id: string; action: string; target: string; detail: string; created: string; actor: string }[] }>("company/staff/history")
      .then((data) => setEntries(data.entries))
      .catch(() => setEntries([]));
  }, []);
  if (!entries) return null;
  if (!entries.length) return <p className="admin-empty">Hələ dəyişiklik yoxdur.</p>;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Tarix</th>
            <th>Dəyişiklik</th>
            <th>Təfərrüat</th>
            <th>Kim</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.created.slice(0, 16).replace("T", " ")}</td>
              <td>{e.action}</td>
              <td>{[e.target, e.detail].filter(Boolean).join(" · ") || "—"}</td>
              <td>{e.actor || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
