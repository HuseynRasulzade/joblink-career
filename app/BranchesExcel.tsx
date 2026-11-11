"use client";
import { useRef, useState } from "react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { createXlsxBook } from "@/lib/xlsx";
import { readWorkbookSheets } from "@/lib/workbook-read";
import { branchTemplate, branchWorkbook, type BranchExport } from "@/lib/branches-excel";
import { Modal } from "./components";

type Notify = (message: string) => void;
type Preview = { applied: boolean; summary: { branches: number; newBranches: number; links: number; sales: number; mode: string; found: string[] }; issues: { sheet: string; line: number; reason: string }[] };

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

// Branches, who works in which of them and the sales limits in Excel: out, a sample file, and a filled file in (checked first).
export default function BranchesExcel({ month, notify, onDone }: { month: string; notify: Notify; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[] | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);

  async function exportAll() {
    try {
      const data = await call<BranchExport>("company/branches/export-data");
      save(createXlsxBook(branchWorkbook(data)), "filiallar.xlsx");
      notify(`Filial məlumatı Excel-ə yazıldı: ${data.branches.length} filial, ${data.links.length} işçi bağlantısı, ${data.sales.length} satış sətri.`);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function sample() {
    save(createXlsxBook(branchTemplate(month)), "filiallar-numune.xlsx");
    notify("Nümunə fayl yükləndi: Təlimat, Filiallar, İşçi-filial, Satış və bonus və Bölgü vərəqləri.");
  }
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const read = readWorkbookSheets(new Uint8Array(await file.arrayBuffer())).map((s) => ({ name: s.name, rows: s.rows }));
      setSheets(read);
      setPreview(await call<Preview>("company/branches/import", { sheets: read, apply: false }));
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
      const result = await call<Preview>("company/branches/import", { sheets, apply: true });
      setPreview(result);
      if (result.applied) {
        notify(`Yükləndi: ${result.summary.branches} filial, ${result.summary.links} işçi bağlantısı, ${result.summary.sales} satış sətri.`);
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
  const nothing = preview && !preview.summary.branches && !preview.summary.links && !preview.summary.sales && !preview.summary.mode;
  return (
    <>
      <button type="button" className="secondary report-button" onClick={() => void exportAll()}><Download size={14} /> Excel: ixrac</button>
      <button type="button" className="secondary report-button" onClick={sample}><FileSpreadsheet size={14} /> Nümunə fayl</button>
      <button type="button" className="secondary report-button" disabled={busy} onClick={() => input.current?.click()}><Upload size={14} /> Excel-dən yüklə</button>
      <input ref={input} type="file" accept=".xlsx" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      {preview && (
        <Modal title="Filiallar: Excel-dən yükləmə" onClose={close}>
          <div style={{ display: "grid", gap: 10 }}>
            {preview.applied ? <p><b>Yükləmə tamamlandı.</b></p> : <p className="muted">Fayl yoxlandı. «Yüklə» basılana qədər heç nə saxlanmayıb.</p>}
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              <li>Filial: <b>{preview.summary.branches}</b>{preview.summary.newBranches ? ` (yeni: ${preview.summary.newBranches})` : ""}</li>
              <li>İşçi-filial bağlantısı: <b>{preview.summary.links}</b></li>
              <li>Satış və bonus sətri: <b>{preview.summary.sales}</b></li>
              {preview.summary.mode && <li>Bölgü rejimi: <b>{preview.summary.mode === "sales" ? "satışa görə" : "bərabər"}</b></li>}
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
              {!preview.applied && <button type="button" className="primary" disabled={busy || !!nothing} onClick={() => void apply()}>Yüklə{preview.issues.length ? " (düzgün sətirləri)" : ""}</button>}
              <button type="button" className="secondary" onClick={close}>Bağla</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
