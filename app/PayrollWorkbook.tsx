"use client";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Modal } from "./components";
import { buildPayrollWorkbook, type WorkbookInput } from "@/lib/payroll-workbook";
import { workbookImportRows } from "@/lib/payroll-workbook-import";
import { readWorkbookSheets } from "@/lib/workbook-read";
import { createXlsxBook } from "@/lib/xlsx";
import { parseAttendanceRows, parseTrips } from "@/lib/sheet-imports";
import { parseHoursTotals } from "@/lib/hours";
import { parsePayrollRows } from "@/lib/sheet-imports";

type Notify = (message: string) => void;

async function call<T>(path: string, body?: unknown): Promise<T> {
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

// The calculation workbook of the month: formulas for pay, timesheet, leave, bonuses, deductions, hours and trips.
export async function downloadPayrollWorkbook(month: string, notify: Notify) {
  try {
    const data = await call<WorkbookInput>(`company/payroll/workbook?month=${month}`);
    const bytes = createXlsxBook(buildPayrollWorkbook(data));
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `emek-haqqi-hesablama-${month}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    notify(`${month} üçün hesablama iş kitabı yükləndi: ${data.employees.length} işçi.`);
  } catch (error) {
    notify((error as Error).message);
  }
}

type Step = { key: "attendance" | "payroll" | "hours" | "trips"; title: string; endpoint: string; rows: string[][] | null; ready: number; issues: string[] };
type StepResult = { applied?: number; created?: number; days?: number; issues?: { line: number; reason: string }[] };

// The filled workbook goes back into the platform: each input sheet is read, shown before anything is written, then sent to the
// import the platform already has for it, which checks every row again.
export function WorkbookImport({ month, notify, onClose, onDone }: { month: string; notify: Notify; onClose: () => void; onDone: () => void }) {
  const [fileName, setFileName] = useState("");
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ title: string; text: string; issues: string[] }[] | null>(null);
  const plan = useMemo(() => {
    if (!bytes) return null;
    try {
      const imported = workbookImportRows(readWorkbookSheets(bytes), month);
      const steps: Step[] = [];
      const add = (key: Step["key"], title: string, endpoint: string, rows: string[][] | null, parse: (r: string[][]) => { rows: unknown[]; issues: { line: number; reason: string }[] }) => {
        if (!rows) return;
        const parsed = parse(rows);
        steps.push({ key, title, endpoint, rows, ready: parsed.rows.length, issues: parsed.issues.map((i) => `${i.line}-ci sətir: ${i.reason}`) });
      };
      add("attendance", "Azad olmalar (davamiyyət)", "company/attendance/import", imported.attendance, parseAttendanceRows);
      add("payroll", "Mükafat, əlavə və tutulmalar", "company/payroll/inputs-import", imported.payroll, (r) => parsePayrollRows(r));
      add("hours", "Əlavə saatlar", "company/hours/totals-import", imported.hours, (r) => parseHoursTotals(r, month));
      add("trips", "Ezamiyyətlər", "company/trips/import", imported.trips, parseTrips);
      return { steps, issues: imported.issues };
    } catch {
      return { steps: [] as Step[], issues: ["Fayl oxunmadı. Joblink hesablama iş kitabını (.xlsx) seçin."] };
    }
  }, [bytes, month]);
  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return notify("Fayl 8 MB-dan kiçik olmalıdır.");
    if (!/\.xlsx$/i.test(file.name)) return notify("Excel (.xlsx) faylı seçin.");
    setBytes(new Uint8Array(await file.arrayBuffer()));
    setFileName(file.name);
    setResults(null);
  }
  const total = plan?.steps.reduce((t, s) => t + s.ready, 0) || 0;
  async function send() {
    if (!plan) return;
    setBusy(true);
    const out: { title: string; text: string; issues: string[] }[] = [];
    for (const step of plan.steps) {
      if (!step.ready || !step.rows) {
        out.push({ title: step.title, text: "Yüklənəcək sətir yoxdur.", issues: [] });
        continue;
      }
      try {
        const body = step.key === "payroll" || step.key === "hours" ? { rows: step.rows, month } : { rows: step.rows };
        const r = await call<StepResult>(step.endpoint, body);
        const count = r.applied ?? r.created ?? 0;
        out.push({ title: step.title, text: `${count} yazıldı${r.days ? `, ${r.days} gün` : ""}.`, issues: (r.issues || []).slice(0, 6).map((i) => `${i.line}-ci sətir: ${i.reason}`) });
      } catch (error) {
        out.push({ title: step.title, text: `Yüklənmədi: ${(error as Error).message}`, issues: [] });
      }
    }
    setResults(out);
    setBusy(false);
    onDone();
    notify("Excel iş kitabından yükləmə bitdi. Nəticə pəncərədə göstərilir.");
  }
  return (
    <Modal title={`Excel iş kitabından yüklə (${month})`} onClose={onClose}>
      <div className="offer-composer wb-import">
        <p className="muted">
          “Hesablama iş kitabı”ndakı <b>Azad olmalar</b>, <b>Əlavə-Tutulma</b>, <b>Saatlar</b> və <b>Ezamiyyət</b> vərəqləri platformaya yazılır. Əvvəl nəyin yüklənəcəyini görürsünüz; hər sətir platformanın qaydalarına görə yenidən yoxlanır. Təsdiqlənmiş ayın məlumatı dəyişdirilmir.
        </p>
        <label className="secondary report-button" style={{ cursor: "pointer", width: "fit-content" }}>
          <Upload size={14} /> {fileName || "Doldurulmuş iş kitabını seçin (.xlsx)"}
          <input type="file" accept=".xlsx" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        </label>
        {plan && (
          <>
            {plan.issues.map((i) => <p key={i} className="admin-error">{i}</p>)}
            {plan.steps.length > 0 && (
              <table className="admin-table wb-steps">
                <thead><tr><th>Vərəq</th><th>Hazır sətir</th><th>Oxunmayan</th></tr></thead>
                <tbody>
                  {plan.steps.map((s) => (
                    <tr key={s.key}>
                      <td><b>{s.title}</b></td>
                      <td>{s.ready}</td>
                      <td>{s.issues.length ? <details><summary>{s.issues.length} sətir</summary><ul className="muted">{s.issues.slice(0, 8).map((x) => <li key={x}>{x}</li>)}</ul></details> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!results && (
              <button type="button" className="primary" disabled={busy || !total} onClick={() => void send()}>
                {busy ? "Yüklənir…" : `Platformaya yüklə (${total} sətir)`}
              </button>
            )}
          </>
        )}
        {results && (
          <ul className="wb-results">
            {results.map((r) => (
              <li key={r.title}>
                <b>{r.title}:</b> {r.text}
                {r.issues.length > 0 && <ul className="muted">{r.issues.map((x) => <li key={x}>{x}</li>)}</ul>}
              </li>
            ))}
          </ul>
        )}
        <p className="muted fine-print"><FileSpreadsheet size={13} /> İşçi adları iş kitabında və platformada eyni olmalıdır. Avans bu yolla yüklənmir: o, Əmək haqqı → Bank və ödəniş sənədləri bölməsində qeyd olunur.</p>
      </div>
    </Modal>
  );
}

export function WorkbookButtons({ month, notify, locked, onOpenImport }: { month: string; notify: Notify; locked: boolean; onOpenImport: () => void }) {
  return (
    <>
      <button type="button" className="secondary report-button" onClick={() => void downloadPayrollWorkbook(month, notify)}>
        <Download size={14} /> Hesablama iş kitabı (Excel)
      </button>
      {!locked && (
        <button type="button" className="secondary report-button" onClick={onOpenImport}>
          <Upload size={14} /> Excel iş kitabından yüklə
        </button>
      )}
    </>
  );
}
