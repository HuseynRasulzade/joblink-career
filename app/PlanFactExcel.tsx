"use client";
import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { createXlsxBook } from "@/lib/xlsx";
import { readWorkbookSheets } from "@/lib/workbook-read";
import { planFactTemplate, planFactWorkbook, type ExportData } from "@/lib/plan-fact-excel";
import { Modal } from "./components";

type Notify = (message: string) => void;
type Summary = { budgets: number; targets: number; expenses: number; skipped: number; found: string[] };
type Preview = { summary: Summary; issues: { sheet: string; line: number; reason: string }[]; applied?: boolean };

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Əməliyyat alınmadı.");
  return data;
}
function save(bytes: Uint8Array, name: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// The plan and the actual in Excel: the whole year out, a sample file, and a filled file in (checked first, saved on confirmation).
export default function PlanFactExcel({ year, notify, onDone }: { year: string; notify: Notify; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[] | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportYear() {
    try {
      const data = await call<ExportData>(`company/plan-fact/export-data?year=${year}`);
      save(createXlsxBook(planFactWorkbook(data)), `plan-ve-fakt-${year}.xlsx`);
      notify(`${year} planı və faktı Excel-ə yazıldı: ${data.budgets.length} büdcə sətri, ${data.targets.length} ay planı, ${data.expenses.length} xərc.`);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function sample() {
    save(createXlsxBook(planFactTemplate(year)), `plan-ve-fakt-numune-${year}.xlsx`);
    notify("Nümunə fayl yükləndi: Təlimat, Büdcə, İşçi sayı planı və Xərclər vərəqləri.");
  }
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const read = readWorkbookSheets(new Uint8Array(await file.arrayBuffer())).map((s) => ({ name: s.name, rows: s.rows }));
      setSheets(read);
      setPreview(await call<Preview>("company/plan-fact/import", { sheets: read, apply: false }));
    } catch (error) {
      notify((error as Error).message || "Fayl oxunmadı.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  async function apply() {
    if (!sheets) return;
    setBusy(true);
    try {
      const result = await call<Preview>("company/plan-fact/import", { sheets, apply: true });
      setPreview(result);
      if (result.applied) {
        notify(`Yükləndi: ${result.summary.budgets} büdcə sətri, ${result.summary.targets} ay planı, ${result.summary.expenses} xərc.`);
        onDone();
      }
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const close = () => {
    setPreview(null);
    setSheets(null);
  };
  const empty = preview && !preview.summary.budgets && !preview.summary.targets && !preview.summary.expenses;
  return (
    <>
      <button type="button" className="secondary report-button" onClick={() => void exportYear()}><Download size={14} /> Excel: ixrac</button>
      <button type="button" className="secondary report-button" onClick={sample}><FileSpreadsheet size={14} /> Nümunə fayl</button>
      <button type="button" className="secondary report-button" disabled={busy} onClick={() => input.current?.click()}><Upload size={14} /> Excel-dən yüklə</button>
      <input ref={input} type="file" accept=".xlsx" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      {preview && (
        <Modal title="Plan və fakt: Excel-dən yükləmə" onClose={close}>
          <div style={{ display: "grid", gap: 10 }}>
            {preview.applied ? <p><b>Yükləmə tamamlandı.</b></p> : <p className="muted">Fayl yoxlandı. «Yüklə» basılana qədər heç nə saxlanmayıb.</p>}
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              <li>Büdcə sətri: <b>{preview.summary.budgets}</b></li>
              <li>Ay üzrə işçi sayı planı: <b>{preview.summary.targets}</b></li>
              <li>Yeni xərc (planlaşdırılıb vəziyyətində): <b>{preview.summary.expenses}</b></li>
              {preview.summary.skipped > 0 && <li className="muted">Platformadan çıxmış {preview.summary.skipped} xərc sətri atlandı (artıq sistemdədir).</li>}
            </ul>
            {!!preview.issues.length && (
              <div>
                <b>Düzəldilməli sətirlər ({preview.issues.length}):</b>
                <ul style={{ paddingLeft: 18, margin: "4px 0 0", maxHeight: 220, overflow: "auto", color: "#b42318" }}>
                  {preview.issues.slice(0, 60).map((x, i) => <li key={i}>{x.sheet ? `${x.sheet}${x.line ? `, sətir ${x.line}` : ""}: ` : ""}{x.reason}</li>)}
                </ul>
              </div>
            )}
            <div className="admin-actions" style={{ justifyContent: "flex-start" }}>
              {!preview.applied && <button type="button" className="primary" disabled={busy || !!empty} onClick={() => void apply()}>Yüklə{preview.issues.length ? " (düzgün sətirləri)" : ""}</button>}
              <button type="button" className="secondary" onClick={close}>Bağla</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
