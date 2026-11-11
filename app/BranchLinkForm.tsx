"use client";
import { useState } from "react";

export type BranchOption = { id: string; name: string; active: boolean };
export type StaffUnitOption = { branch: string; department: string; section: string; position: string; planned: number };
export type LinkDraft = { employeeId: string; branchId: string; department: string; section: string; role: string; sharePct: string; bonusEligible: boolean; from: string; to: string };
export const blankLink = (employeeId = ""): LinkDraft => ({ employeeId, branchId: "", department: "", section: "", role: "", sharePct: "", bonusEligible: true, from: "", to: "" });

const same = (a: string, b: string) => a.trim().toLocaleLowerCase("az") === b.trim().toLocaleLowerCase("az");
const uniq = (list: string[]) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b, "az"));

// One employee in one branch: the branch, then the department of that branch, then the section, then the position there. Every choice
// comes from the staff table (branch → department → section → position); a branch the staff table has no rows for takes free text.
export default function BranchLinkForm({
  draft,
  setDraft,
  branches,
  units,
  employees,
  busy,
  onSave,
  saveLabel = "Saxla",
}: {
  draft: LinkDraft;
  setDraft: (next: LinkDraft) => void;
  branches: BranchOption[];
  units: StaffUnitOption[];
  employees?: { id: string; name: string; position: string }[];
  busy: boolean;
  onSave: () => void;
  saveLabel?: string;
}) {
  const [showMore, setShowMore] = useState(false);
  const branchName = branches.find((b) => b.id === draft.branchId)?.name || "";
  const inBranch = units.filter((u) => same(u.branch, branchName));
  const structured = !!branchName && inBranch.length > 0;
  const departments = uniq(inBranch.map((u) => u.department));
  const sections = uniq(inBranch.filter((u) => same(u.department, draft.department)).map((u) => u.section));
  const positions = uniq(inBranch.filter((u) => same(u.department, draft.department) && (!draft.section || same(u.section, draft.section))).map((u) => u.position));
  return (
    <div className="panel">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10, margin: "4px 0 10px" }}>
        {employees && (
          <label style={{ display: "grid", gap: 2 }}>İşçi
            <select value={draft.employeeId} onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })}>
              <option value="">Seçin</option>
              {employees.map((p) => <option key={p.id} value={p.id}>{p.name}{p.position ? ` — ${p.position}` : ""}</option>)}
            </select>
          </label>
        )}
        <label style={{ display: "grid", gap: 2 }}>Filial
          <select value={draft.branchId} onChange={(e) => setDraft({ ...draft, branchId: e.target.value, department: "", section: "", role: "" })}>
            <option value="">Seçin</option>
            {branches.filter((b) => b.active).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 2 }}>Departament
          {structured ? (
            <select value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value, section: "", role: "" })}>
              <option value="">Seçin</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          ) : (
            <input value={draft.department} disabled={!draft.branchId} onChange={(e) => setDraft({ ...draft, department: e.target.value })} placeholder={draft.branchId ? "bu filialın ştatı yoxdur" : "əvvəl filial"} />
          )}
        </label>
        <label style={{ display: "grid", gap: 2 }}>Şöbə
          {structured && sections.length ? (
            <select value={draft.section} onChange={(e) => setDraft({ ...draft, section: e.target.value, role: "" })}>
              <option value="">— (şöbəsiz)</option>
              {sections.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          ) : (
            <input value={draft.section} disabled={!draft.department} onChange={(e) => setDraft({ ...draft, section: e.target.value })} placeholder="istəyə görə" />
          )}
        </label>
        <label style={{ display: "grid", gap: 2 }}>Vəzifə bu filialda
          <input list="branch-link-positions" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="məs. Baş mühasib" />
          <datalist id="branch-link-positions">{positions.map((p) => <option key={p} value={p} />)}</datalist>
        </label>
        <label style={{ display: "grid", gap: 2 }}>Pay % (istəyə görə)
          <input inputMode="decimal" value={draft.sharePct} onChange={(e) => setDraft({ ...draft, sharePct: e.target.value })} placeholder="boş = rejimə görə" />
        </label>
      </div>
      {showMore && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10, margin: "0 0 10px" }}>
          <label style={{ display: "grid", gap: 2 }}>Başlama<input type="date" value={draft.from} onChange={(e) => setDraft({ ...draft, from: e.target.value })} /></label>
          <label style={{ display: "grid", gap: 2 }}>Bitmə<input type="date" value={draft.to} onChange={(e) => setDraft({ ...draft, to: e.target.value })} /></label>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={draft.bonusEligible} onChange={(e) => setDraft({ ...draft, bonusEligible: e.target.checked })} /> Filial bonusu alır</label>
        </div>
      )}
      <div className="admin-actions" style={{ justifyContent: "flex-start" }}>
        <button type="button" className="primary" disabled={busy || !draft.employeeId || !draft.branchId || (structured && !draft.department)} onClick={onSave}>{saveLabel}</button>
        <button type="button" className="secondary" onClick={() => setShowMore(!showMore)}>{showMore ? "Az göstər" : "Tarix və bonus"}</button>
      </div>
    </div>
  );
}
