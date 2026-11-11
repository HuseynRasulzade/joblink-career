"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import BranchAllocation from "./BranchAllocation";
import BranchesExcel from "./BranchesExcel";
import BranchLinkForm, { blankLink, type LinkDraft } from "./BranchLinkForm";
import { RULE_LABEL } from "@/lib/branches";

type Notify = (message: string) => void;
type Branch = { id: string; name: string; code: string; city: string; active: boolean };
type Link = { employeeId: string; branchId: string; role: string; sharePct: number; bonusEligible: boolean; from: string; to: string; name: string; position: string; department: string; section?: string };
type Rule = { branchId: string; kind: "fixed" | "salary_percent"; value: number; active: boolean };
type Sale = { branchId: string; target: number; sales: number; reached: boolean };
type Data = { month: string; locked: boolean; mode: "equal" | "sales"; branches: Branch[]; rules: Rule[]; sales: Sale[]; links: Link[]; employees: { id: string; name: string; position: string; department: string }[]; units: { branch: string; department: string; section: string; position: string; planned: number }[] };
type Tab = "branches" | "structure" | "people" | "sales" | "allocation";

const thisMonth = () => new Date().toISOString().slice(0, 7);
const shift = (month: string, by: number) => new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + by, 1)).toISOString().slice(0, 7);

async function call<T = { ok: boolean }>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Əməliyyat alınmadı.");
  return data;
}

// Branches: the branches themselves, who works in which (with the position there and the share of the pay), the monthly sales limit,
// the sales and the bonus rule of each branch, and how the month's pay falls on them.
export default function BranchesPage({ notify }: { notify: Notify }) {
  const [tab, setTab] = useState<Tab>("branches");
  const [month, setMonth] = useState(thisMonth());
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    call<Data>(`company/branches?month=${month}`).then(setData).catch((e) => notifyRef.current((e as Error).message));
  }, [month]);
  useEffect(load, [load, version]);
  if (!data) return <p className="muted">Yüklənir…</p>;

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      notify(done);
      setVersion((n) => n + 1);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const tabs: { id: Tab; label: string }[] = [
    { id: "branches", label: "Filiallar" },
    { id: "structure", label: "Struktur" },
    { id: "people", label: "İşçilər" },
    { id: "sales", label: "Satış və bonus" },
    { id: "allocation", label: "Maaş bölgüsü" },
  ];
  return (
    <div className="company-page">
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
        <div className="admin-actions" role="tablist" aria-label="Filiallar" style={{ justifyContent: "flex-start" }}>
          {tabs.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "primary" : "secondary"} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        <div className="admin-actions" style={{ justifyContent: "flex-end" }}>
          <BranchesExcel month={month} notify={notify} onDone={() => setVersion((n) => n + 1)} />
        </div>
      </div>
      {tab === "branches" && <BranchList data={data} busy={busy} run={run} />}
      {tab === "structure" && <BranchStructure data={data} />}
      {tab === "people" && <PeopleLinks data={data} busy={busy} run={run} />}
      {tab === "sales" && <SalesAndRules data={data} month={month} setMonth={setMonth} busy={busy} run={run} />}
      {tab === "allocation" && <BranchAllocation initialMonth={month} notify={notify} version={version} onMode={() => setVersion((n) => n + 1)} />}
    </div>
  );
}

type Run = (action: () => Promise<unknown>, done: string) => Promise<void>;

function BranchList({ data, busy, run }: { data: Data; busy: boolean; run: Run }) {
  const [form, setForm] = useState<{ id: string; name: string; code: string; city: string; active: boolean } | null>(null);
  const rows = (name: string) => data.units.filter((u) => u.branch.trim().toLocaleLowerCase("az") === name.trim().toLocaleLowerCase("az"));
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p className="panel" style={{ margin: 0 }}>
        <b>Filiallar Ştat cədvəlindən yaranır.</b> <span className="muted">Ştat sətrində «Filial» sahəsini yazın: filial burada özü görünür. Hər filialın altında departamentlər, onların şöbələri və vəzifələri var («Struktur» sekməsi). Burada yalnız filialın kodu, şəhəri, aktivliyi və bonus qaydası yazılır.</span>{" "}
        <button type="button" className="secondary" onClick={() => { window.location.hash = "hr-employees"; }}>Ştat cədvəlinə keç ↗</button>
      </p>
      <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead><tr><th>Filial</th><th>Kod</th><th>Şəhər</th><th>Departament</th><th>Ştat</th><th>İşçi</th><th>Bonus qaydası</th><th /></tr></thead>
          <tbody>
            {data.branches.map((b) => {
              const rule = data.rules.find((r) => r.branchId === b.id);
              const units = rows(b.name);
              return (
                <tr key={b.id} className={b.active ? undefined : "muted"}>
                  <td><b>{b.name}</b>{b.active ? "" : <small> (passiv)</small>}</td>
                  <td>{b.code || "—"}</td>
                  <td>{b.city || "—"}</td>
                  <td>{new Set(units.map((u) => u.department)).size || "—"}</td>
                  <td>{units.reduce((t, u) => t + u.planned, 0) || "—"}</td>
                  <td>{new Set(data.links.filter((l) => l.branchId === b.id).map((l) => l.employeeId)).size}</td>
                  <td>{rule ? `${RULE_LABEL[rule.kind]}: ${rule.value}${rule.kind === "fixed" ? " AZN" : "%"}${rule.active ? "" : " (söndürülüb)"}` : "—"}</td>
                  <td>
                    <div className="admin-actions">
                      <button type="button" className="secondary" onClick={() => setForm({ ...b })}>Düzəlt</button>
                      <button type="button" className="secondary" disabled={busy} onClick={() => { const name = window.prompt("Filialın yeni adı (ştat cədvəlinin bütün sətirlərində dəyişir):", b.name); if (name && name.trim() && name.trim() !== b.name) void run(() => call("company/branches/rename", { id: b.id, name: name.trim() }), "Filialın adı dəyişdi."); }}>Adı dəyiş</button>
                      <button type="button" className="secondary" disabled={busy} onClick={() => { if (window.confirm(`“${b.name}” filialı silinsin?`)) void run(() => call("company/branches/delete", { id: b.id }), "Filial silindi."); }}>Sil</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!data.branches.length && <tr><td colSpan={8}><p className="admin-empty">Hələ filial yoxdur. Ştat cədvəlində bir sətrə «Filial» yazın.</p></td></tr>}
          </tbody>
        </table>
      </div>
      {form && (
        <div className="panel">
          <b>{form.name}</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, margin: "10px 0" }}>
            <label style={{ display: "grid", gap: 2 }}>Kod<input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></label>
            <label style={{ display: "grid", gap: 2 }}>Şəhər<input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></label>
            <label style={{ display: "flex", gap: 6, alignItems: "center" }}><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Aktiv</label>
          </div>
          <div className="admin-actions" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="primary" disabled={busy} onClick={() => void run(async () => { await call("company/branches/save", form); setForm(null); }, "Filial saxlanıldı.")}>Saxla</button>
            <button type="button" className="secondary" onClick={() => setForm(null)}>Bağla</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Branch → department → section → position, from the staff table, with the people linked to each branch under the department and position.
function BranchStructure({ data }: { data: Data }) {
  const same = (a: string, b: string) => a.trim().toLocaleLowerCase("az") === b.trim().toLocaleLowerCase("az");
  const names = [...new Set([...data.branches.map((b) => b.name), ...data.units.map((u) => u.branch)])].filter((n) => n || data.units.some((u) => !u.branch));
  const uniq = (list: string[]) => [...new Set(list)].sort((a, b) => a.localeCompare(b, "az"));
  if (!data.units.length) return <p className="admin-empty">Ştat cədvəli boşdur. Struktur ştat cədvəlindən qurulur: əvvəl orada filial, departament, şöbə və vəzifəni yazın.</p>;
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p className="muted" style={{ margin: 0 }}>Hər filialın altında onun departamentləri, onların şöbələri, sonra vəzifələr. Sayı: planlaşdırılan ştat / filiala bağlı işçi.</p>
      {uniq(names).map((branch) => {
        const rows = data.units.filter((u) => same(u.branch, branch));
        if (!rows.length) return null;
        const b = data.branches.find((x) => same(x.name, branch));
        const linked = data.links.filter((l) => b && l.branchId === b.id);
        return (
          <div key={branch || "none"} className="panel">
            <b>{branch || "Filialsız (şirkət üzrə)"}</b> <small className="muted">{rows.reduce((t, r) => t + r.planned, 0)} ştat{b ? ` · ${new Set(linked.map((l) => l.employeeId)).size} işçi` : ""}</small>
            {uniq(rows.map((r) => r.department)).map((department) => {
              const inDept = rows.filter((r) => same(r.department, department));
              return (
                <div key={department} style={{ marginLeft: 16, marginTop: 8 }}>
                  <b>▸ {department || "Departamentsiz"}</b> <small className="muted">{inDept.reduce((t, r) => t + r.planned, 0)} ştat · {linked.filter((l) => same(l.department || "", department)).length} işçi</small>
                  {uniq(inDept.map((r) => r.section)).map((section) => {
                    const inSection = inDept.filter((r) => same(r.section, section));
                    return (
                      <div key={section || "none"} style={{ marginLeft: 16, marginTop: 4 }}>
                        {section ? <b>▹ {section}</b> : <small className="muted">şöbəsiz</small>}
                        <ul style={{ margin: "2px 0 0", paddingLeft: 22 }}>
                          {inSection.map((r, i) => {
                            const people = linked.filter((l) => same(l.department || "", department) && same(l.section || "", section) && (!l.role || same(l.role, r.position)));
                            return <li key={i}>{r.position || "vəzifəsiz"} <small className="muted">{r.planned} ştat{people.length ? ` · ${people.map((p) => p.name).join(", ")}` : ""}</small></li>;
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function PeopleLinks({ data, busy, run }: { data: Data; busy: boolean; run: Run }) {
  const [only, setOnly] = useState("");
  const [draft, setDraft] = useState<LinkDraft>(blankLink());
  const list = data.links.filter((l) => !only || l.branchId === only);
  const branchName = (id: string) => data.branches.find((b) => b.id === id)?.name || "—";
  const byEmployee = new Map<string, Link[]>();
  for (const l of list) byEmployee.set(l.employeeId, [...(byEmployee.get(l.employeeId) || []), l]);
  const edit = (l: Link) => setDraft({ employeeId: l.employeeId, branchId: l.branchId, department: l.department || "", section: l.section || "", role: l.role, sharePct: l.sharePct ? String(l.sharePct) : "", bonusEligible: l.bonusEligible, from: l.from, to: l.to });
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p className="muted" style={{ margin: 0 }}>Hər sətir bir işçinin bir filialdakı işidir: filial, onun departamenti, şöbəsi və vəzifəsi (hamısı ştat cədvəlindən seçilir). Eyni işçini bir neçə filiala bağlaya bilərsiniz. Pay % boşdursa maaş «Maaş bölgüsü» rejiminə görə bölünür; yazılıbsa həmin faizlə. Bağlantını işçi kartından da edə bilərsiniz.</p>
      <BranchLinkForm draft={draft} setDraft={setDraft} branches={data.branches} units={data.units} employees={data.employees} busy={busy} onSave={() => void run(async () => { await call("company/branches/link", { ...draft, sharePct: draft.sharePct === "" ? 0 : Number(draft.sharePct.replace(",", ".")) }); setDraft({ ...blankLink(draft.employeeId), branchId: draft.branchId }); }, "Bağlantı saxlanıldı.")} />
      <div className="admin-actions" style={{ justifyContent: "flex-start", alignItems: "center" }}>
        <label>Filial üzrə süz <select value={only} onChange={(e) => setOnly(e.target.value)} style={{ marginLeft: 6 }}><option value="">Hamısı</option>{data.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </div>
      <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead><tr><th>İşçi</th><th>Filial</th><th>Departament › Şöbə</th><th>Vəzifə (filialda)</th><th>Pay</th><th>Bonus</th><th>Müddət</th><th /></tr></thead>
          <tbody>
            {[...byEmployee.values()].flatMap((rows) => rows.map((l, i) => (
              <tr key={`${l.employeeId}|${l.branchId}`}>
                <td>{i === 0 ? <><b>{l.name}</b><br /><small className="muted">{l.position}{rows.length > 1 ? ` · ${rows.length} filialda` : ""}</small></> : ""}</td>
                <td>{branchName(l.branchId)}</td>
                <td>{[l.department, l.section].filter(Boolean).join(" › ") || "—"}</td>
                <td>{l.role || "—"}</td>
                <td>{l.sharePct ? `${l.sharePct}%` : <small className="muted">rejimə görə</small>}</td>
                <td>{l.bonusEligible ? "alır" : "almır"}</td>
                <td>{l.from || l.to ? `${l.from || "…"} – ${l.to || "…"}` : "—"}</td>
                <td>
                  <div className="admin-actions">
                    <button type="button" className="secondary" onClick={() => edit(l)}>Düzəlt</button>
                    <button type="button" className="secondary" disabled={busy} onClick={() => void run(() => call("company/branches/unlink", { employeeId: l.employeeId, branchId: l.branchId }), "Bağlantı silindi.")}>Sil</button>
                  </div>
                </td>
              </tr>
            )))}
            {!list.length && <tr><td colSpan={8}><p className="admin-empty">Hələ bağlantı yoxdur.</p></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesAndRules({ data, month, setMonth, busy, run }: { data: Data; month: string; setMonth: (m: string) => void; busy: boolean; run: Run }) {
  const [values, setValues] = useState<Record<string, { target: string; sales: string }>>({});
  const [rules, setRules] = useState<Record<string, { kind: Rule["kind"]; value: string; active: boolean }>>({});
  const sale = (id: string) => data.sales.find((s) => s.branchId === id);
  const rule = (id: string) => data.rules.find((r) => r.branchId === id);
  const shown = (id: string) => values[id] || { target: sale(id)?.target ? String(sale(id)?.target) : "", sales: sale(id)?.sales ? String(sale(id)?.sales) : "" };
  const shownRule = (id: string) => rules[id] || { kind: rule(id)?.kind || "fixed", value: rule(id) ? String(rule(id)?.value) : "", active: rule(id) ? !!rule(id)?.active : true };
  const num = (t: string) => Number(String(t || "0").replace(",", ".")) || 0;
  const active = data.branches.filter((b) => b.active);
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div className="admin-actions" style={{ alignItems: "center" }}>
          <button type="button" aria-label="Əvvəlki ay" onClick={() => setMonth(shift(month, -1))}>‹</button>
          <b>{month}</b>
          <button type="button" aria-label="Növbəti ay" onClick={() => setMonth(shift(month, 1))}>›</button>
        </div>
        <small className="muted">{data.locked ? "Bu ayın əmək haqqı təsdiqlənib: satış və limit dəyişmir." : "Satış limitinə çatan filialın bonusu avtomatik hesablanır."}</small>
      </div>
      <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead><tr><th>Filial</th><th>Satış limiti (AZN)</th><th>Satış (AZN)</th><th>Nəticə</th><th>Bonus növü</th><th>Bonus dəyəri</th><th>Qayda</th><th /></tr></thead>
          <tbody>
            {active.map((b) => {
              const v = shown(b.id);
              const r = shownRule(b.id);
              const reached = num(v.target) > 0 && num(v.sales) >= num(v.target);
              return (
                <tr key={b.id}>
                  <td><b>{b.name}</b></td>
                  <td><input inputMode="decimal" style={{ width: 110 }} disabled={data.locked} value={v.target} onChange={(e) => setValues({ ...values, [b.id]: { ...v, target: e.target.value } })} /></td>
                  <td><input inputMode="decimal" style={{ width: 110 }} disabled={data.locked} value={v.sales} onChange={(e) => setValues({ ...values, [b.id]: { ...v, sales: e.target.value } })} /></td>
                  <td style={{ color: reached ? "#147b70" : undefined }}><b>{num(v.target) > 0 ? (reached ? "limit çatıb" : `çatmayıb (${Math.round((num(v.sales) / num(v.target)) * 100)}%)`) : "—"}</b></td>
                  <td>
                    <select value={r.kind} onChange={(e) => setRules({ ...rules, [b.id]: { ...r, kind: e.target.value as Rule["kind"] } })}>
                      <option value="fixed">{RULE_LABEL.fixed}</option><option value="salary_percent">{RULE_LABEL.salary_percent}</option>
                    </select>
                  </td>
                  <td><input inputMode="decimal" style={{ width: 90 }} value={r.value} placeholder={r.kind === "fixed" ? "AZN" : "% (100 = maaş)"} onChange={(e) => setRules({ ...rules, [b.id]: { ...r, value: e.target.value } })} /></td>
                  <td><label style={{ display: "flex", gap: 4, alignItems: "center" }}><input type="checkbox" checked={r.active} onChange={(e) => setRules({ ...rules, [b.id]: { ...r, active: e.target.checked } })} /> aktiv</label></td>
                  <td>
                    <div className="admin-actions">
                      <button type="button" className="secondary" disabled={busy || data.locked || !values[b.id]} onClick={() => void run(async () => { await call("company/branches/sales", { month, rows: [{ branchId: b.id, target: num(v.target), sales: num(v.sales) }] }); setValues((x) => { const next = { ...x }; delete next[b.id]; return next; }); }, "Satış saxlanıldı.")}>Satışı saxla</button>
                      <button type="button" className="secondary" disabled={busy || !rules[b.id]} onClick={() => void run(async () => { await call("company/branches/rule", { branchId: b.id, kind: r.kind, value: num(r.value), active: r.active }); setRules((x) => { const next = { ...x }; delete next[b.id]; return next; }); }, "Bonus qaydası saxlanıldı.")}>Qaydanı saxla</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!active.length && <tr><td colSpan={8}><p className="admin-empty">Əvvəl «Filiallar» sekməsində filial əlavə edin.</p></td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted" style={{ margin: 0 }}>Bonus qaydası filiala görədir (aylara görə dəyişmir): sabit məbləğ hər işçiyə verilir; «Maaşın faizi» isə filiala düşən maaşa tətbiq olunur (100 = həmin maaşın özü qədər). Bonus əmək haqqına mükafat kimi əlavə olunur, gəlir vergisi və sığorta ilə.</p>
    </div>
  );
}
