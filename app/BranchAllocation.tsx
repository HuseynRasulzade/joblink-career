"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { createXlsxBook } from "@/lib/xlsx";
import { MODE_LABEL, RULE_LABEL, type AllocationMode } from "@/lib/branches";

type Notify = (message: string) => void;
type Branch = { id: string; name: string; active: boolean; people: number; target: number; sales: number; reached: boolean; rule: { kind: "fixed" | "salary_percent"; value: number; active: boolean } | null; gross: number; net: number; employerCost: number; bonus: number };
type Line = { employeeId: string; name: string; position: string; branchId: string; branch: string; role: string; share: number; gross: number; net: number; employerCost: number; bonus: number };
type Data = { month: string; status: string; mode: AllocationMode; branches: Branch[]; lines: Line[]; unassigned: { employeeId: string; name: string; gross: number; net: number; employerCost: number }[] };

const AZN = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const shift = (month: string, by: number) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + by, 1)).toISOString().slice(0, 7);

async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Əməliyyat alınmadı.");
  return data;
}

// The month's pay shared over the branches (equally, by sales, or by the percentages written by hand) and the bonuses of the branches that reached their limit.
export default function BranchAllocation({ initialMonth, notify, version = 0, onMode }: { initialMonth: string; notify: Notify; version?: number; onMode?: () => void }) {
  const [month, setMonth] = useState(initialMonth);
  const [data, setData] = useState<Data | null>(null);
  const [open, setOpen] = useState("");
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    call<Data>(`company/payroll/branches?month=${month}`).then(setData).catch((e) => notifyRef.current((e as Error).message));
  }, [month]);
  useEffect(load, [load, version]);
  if (!data) return <p className="muted">Yüklənir…</p>;

  function excel() {
    const d = data as Data;
    const bytes = createXlsxBook([
      { name: "Filiallar üzrə", headers: ["Filial", "İşçi sayı", "Satış limiti", "Satış", "Limit", "Gross maaş", "Net", "İşəgötürən xərci", "Bonus"], rows: d.branches.map((b) => [b.name, b.people, b.target, b.sales, b.reached ? "Çatıb" : b.target > 0 ? "Çatmayıb" : "—", b.gross, b.net, b.employerCost, b.bonus]) },
      { name: "İşçi-filial bölgüsü", headers: ["Ad Soyad", "Vəzifə", "Filial", "Vəzifə (filialda)", "Pay %", "Gross", "Net", "İşəgötürən xərci", "Filial bonusu"], rows: d.lines.map((l) => [l.name, l.position, l.branch, l.role, Math.round(l.share * 10000) / 100, l.gross, l.net, l.employerCost, l.bonus]) },
      { name: "Filialsız", headers: ["Ad Soyad", "Gross", "Net", "İşəgötürən xərci"], rows: d.unassigned.map((u) => [u.name, u.gross, u.net, u.employerCost]) },
    ]);
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `filial-bolgusu-${d.month}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function setMode(mode: AllocationMode) {
    try {
      await call("company/branches/mode", { mode });
      notify("Bölgü rejimi dəyişdi.");
      load();
      onMode?.();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const total = (pick: (b: Branch) => number) => data.branches.reduce((t, b) => t + pick(b), 0);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="panel" style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div className="admin-actions" style={{ justifyContent: "flex-start", alignItems: "center" }}>
          <button type="button" aria-label="Əvvəlki ay" onClick={() => setMonth(shift(month, -1))}><ChevronLeft size={16} /></button>
          <b>{month}</b>
          <button type="button" aria-label="Növbəti ay" onClick={() => setMonth(shift(month, 1))}><ChevronRight size={16} /></button>
          <small className="muted">{data.status === "approved" ? "ay təsdiqlənib" : "layihə"}</small>
        </div>
        <div className="admin-actions" style={{ alignItems: "center" }}>
          <label>Maaş bölgüsü
            <select value={data.mode} onChange={(e) => void setMode(e.target.value as AllocationMode)} style={{ marginLeft: 6 }}>
              {(Object.keys(MODE_LABEL) as AllocationMode[]).map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
            </select>
          </label>
          <button type="button" className="secondary report-button" onClick={excel}><Download size={14} /> Excel</button>
        </div>
      </div>
      <p className="muted" style={{ margin: 0 }}>Bir neçə filialda işləyən işçinin maaşı və işəgötürən xərci seçilmiş rejimə görə filiallara bölünür; işçi kartında pay faizi əl ilə yazılıbsa, o üstün tutulur. Satış limitinə çatan filialın bonusu işçinin əmək haqqına avtomatik əlavə olunur (vergi və sığorta ilə).</p>

      <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead><tr><th>Filial</th><th>İşçi</th><th>Satış limiti</th><th>Satış</th><th>Limit</th><th>Bonus qaydası</th><th>Gross maaş</th><th>İşəgötürən xərci</th><th>Bonus</th></tr></thead>
          <tbody>
            {data.branches.map((b) => (
              <tr key={b.id} className={b.active ? undefined : "muted"}>
                <td><button type="button" className="text-button" onClick={() => setOpen(open === b.id ? "" : b.id)}>{b.name}</button>{b.active ? "" : <small className="muted"> (passiv)</small>}</td>
                <td>{b.people}</td>
                <td>{b.target ? AZN(b.target) : "—"}</td>
                <td>{b.sales ? AZN(b.sales) : "—"}</td>
                <td style={{ color: b.reached ? "#147b70" : b.target ? "#8a6100" : undefined }}><b>{b.reached ? "çatıb" : b.target ? "çatmayıb" : "—"}</b></td>
                <td>{b.rule ? `${RULE_LABEL[b.rule.kind]}: ${b.rule.value}${b.rule.kind === "fixed" ? " AZN" : "%"}${b.rule.active ? "" : " (söndürülüb)"}` : "—"}</td>
                <td>{AZN(b.gross)}</td>
                <td>{AZN(b.employerCost)}</td>
                <td><b>{b.bonus ? AZN(b.bonus) : "—"}</b></td>
              </tr>
            ))}
            {!data.branches.length && <tr><td colSpan={9}><p className="admin-empty">Hələ filial yoxdur.</p></td></tr>}
            {!!data.branches.length && (
              <tr>
                <td><b>Cəmi</b></td><td /><td /><td /><td /><td />
                <td><b>{AZN(total((b) => b.gross))}</b></td><td><b>{AZN(total((b) => b.employerCost))}</b></td><td><b>{AZN(total((b) => b.bonus))}</b></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead><tr><th>İşçi</th><th>Vəzifə (filialda)</th><th>Pay</th><th>Gross</th><th>Net</th><th>İşəgötürən xərci</th><th>Bonus</th></tr></thead>
            <tbody>
              {data.lines.filter((l) => l.branchId === open).map((l) => (
                <tr key={l.employeeId}>
                  <td>{l.name}<br /><small className="muted">{l.position}</small></td>
                  <td>{l.role || "—"}</td>
                  <td>{Math.round(l.share * 10000) / 100}%</td>
                  <td>{AZN(l.gross)}</td><td>{AZN(l.net)}</td><td>{AZN(l.employerCost)}</td><td>{l.bonus ? AZN(l.bonus) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!!data.unassigned.length && (
        <div className="panel">
          <b>Filiala bağlı olmayan işçilər ({data.unassigned.length})</b>
          <p className="muted" style={{ margin: "4px 0" }}>Bunların maaşı filiallara bölünmür. Bağlamaq üçün «İşçilər» sekməsinə baxın.</p>
          <small>{data.unassigned.slice(0, 12).map((u) => u.name).join(", ")}{data.unassigned.length > 12 ? "…" : ""}</small>
        </div>
      )}
    </div>
  );
}
