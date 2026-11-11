"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import BranchLinkForm, { blankLink, type BranchOption, type LinkDraft, type StaffUnitOption } from "./BranchLinkForm";

type Notify = (message: string) => void;
type Link = { employeeId: string; branchId: string; role: string; sharePct: number; bonusEligible: boolean; from: string; to: string; department?: string; section?: string };
type Data = { branches: BranchOption[]; links: Link[]; units: StaffUnitOption[] };

async function call<T = { ok: boolean }>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Əməliyyat alınmadı.");
  return data;
}

// On the employee card: the branches the person works in, with the department, section and position in each (all from the staff table).
export default function EmployeeBranches({ employeeId, notify, readOnly = false }: { employeeId: string; notify: Notify; readOnly?: boolean }) {
  const [data, setData] = useState<Data | null>(null);
  const [draft, setDraft] = useState<LinkDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    call<Data>("company/branches").then(setData).catch((e) => notifyRef.current((e as Error).message));
  }, []);
  useEffect(load, [load]);
  if (!data) return <p className="muted">Filiallar yüklənir…</p>;
  const mine = data.links.filter((l) => l.employeeId === employeeId);
  const nameOf = (id: string) => data.branches.find((b) => b.id === id)?.name || "—";
  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      notify(done);
      setDraft(null);
      load();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const edit = (l: Link) => setDraft({ employeeId, branchId: l.branchId, department: l.department || "", section: l.section || "", role: l.role, sharePct: l.sharePct ? String(l.sharePct) : "", bonusEligible: l.bonusEligible, from: l.from, to: l.to });
  return (
    <div className={readOnly ? undefined : "panel"} style={{ display: "grid", gap: 8 }}>
      {!readOnly && <b>Filiallar</b>}
      {!data.branches.length && <p className="muted" style={{ margin: 0 }}>Hələ filial yoxdur. Filiallar Ştat cədvəlindən yaranır: ştat sətrində «Filial» sahəsini yazın.</p>}
      {mine.map((l) => (
        <div key={l.branchId} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span><b>{nameOf(l.branchId)}</b>{l.department ? ` › ${l.department}` : ""}{l.section ? ` › ${l.section}` : ""}{l.role ? ` › ${l.role}` : ""}{l.sharePct ? ` · pay ${l.sharePct}%` : ""}</span>
          {!readOnly && <button type="button" className="secondary" onClick={() => edit(l)}>Düzəlt</button>}
          {!readOnly && <button type="button" className="secondary" disabled={busy} onClick={() => void run(() => call("company/branches/unlink", { employeeId, branchId: l.branchId }), "Filialdan çıxarıldı.")}>Çıxar</button>}
        </div>
      ))}
      {!mine.length && !!data.branches.length && <p className="muted" style={{ margin: 0 }}>İşçi heç bir filiala bağlı deyil.</p>}
      {readOnly ? null : draft ? (
        <BranchLinkForm draft={draft} setDraft={setDraft} branches={data.branches} units={data.units} busy={busy} onSave={() => void run(() => call("company/branches/link", { ...draft, sharePct: draft.sharePct === "" ? 0 : Number(draft.sharePct.replace(",", ".")) }), "Filial bağlantısı saxlanıldı.")} />
      ) : (
        !!data.branches.length && <div className="admin-actions" style={{ justifyContent: "flex-start" }}><button type="button" className="secondary" onClick={() => setDraft(blankLink(employeeId))}>+ Filiala bağla</button></div>
      )}
    </div>
  );
}
