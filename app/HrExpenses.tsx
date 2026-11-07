"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/hr-expenses";

type Notify = (message: string) => void;
type Expense = { id: string; category: string; title: string; department: string; employeeId: string; amount: number; date: string; payee: string; note: string; status: "planned" | "approved" | "ordered" | "paid" | "cancelled"; orderNo: string; source: string; externalId: string; paidOn: string; method: string; payFrom: string; payRef: string; approvedBy: string };
type CategoryRow = { id: string; label: string; hint: string; budget: number; held: number; paid: number; ordered: number; left: number };
type Data = { year: string; expenses: Expense[]; categories: CategoryRow[]; employees: { id: string; name: string; department: string }[]; departments: string[]; canApprove: boolean; ordersEnabled: boolean };

const STATUS: Record<Expense["status"], { label: string; color: string }> = {
  planned: { label: "Planlaşdırılıb", color: "#8a6100" },
  approved: { label: "Təsdiqlənib", color: "#1f4f9c" },
  ordered: { label: "Sifarişdə", color: "#6d3fb2" },
  paid: { label: "Ödənilib", color: "#147b70" },
  cancelled: { label: "Ləğv edilib", color: "#6b7a7d" },
};
const METHOD: Record<string, string> = { bank: "Bank köçürməsi", card: "Kart", cash: "Nağd (kassa)", other: "Digər" };
const AZN = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
const dmy = (iso: string) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—");
const today = () => new Date().toISOString().slice(0, 10);

async function call<T = { ok: boolean }>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { method: body ? "POST" : "GET", credentials: "same-origin", cache: "no-store", headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Əməliyyat alınmadı.");
  return data;
}

type Draft = { id: string; category: string; title: string; department: string; employeeId: string; amount: string; date: string; payee: string; note: string };
const blank = (category: string): Draft => ({ id: "", category, title: "", department: "", employeeId: "", amount: "", date: today(), payee: "", note: "" });

// HR costs other than pay and training: written here, approved by the director, paid with the place and way of payment recorded.
// Each kind has its own budget line in the plan; an expense over that budget is refused.
export default function HrExpenses({ year, notify, version, onChanged }: { year: string; notify: Notify; version: number; onChanged: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [category, setCategory] = useState<string>("all");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [paying, setPaying] = useState<{ id: string; paidOn: string; method: string; payFrom: string; payRef: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    call<Data>(`company/hr-expenses?year=${year}`)
      .then(setData)
      .catch((e) => notifyRef.current((e as Error).message));
  }, [year]);
  useEffect(load, [load, version]);
  if (!data) return <p className="muted">Yüklənir…</p>;

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await action();
      notify(done);
      load();
      onChanged();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const move = (id: string, to: string, extra: Record<string, unknown> = {}) => run(() => call("company/hr-expenses/move", { id, to, ...extra }), "Saxlanıldı.");
  const save = async () => {
    if (!draft) return;
    await run(() => call("company/hr-expenses/save", { ...draft, amount: Number(draft.amount.replace(",", ".")) }), draft.id ? "Xərc yeniləndi." : "Xərc yazıldı (planlaşdırılıb).");
    setDraft(null);
  };
  const list = data.expenses.filter((e) => category === "all" || e.category === category);
  const label = (id: string) => EXPENSE_CATEGORIES.find((c) => c.id === id)?.label || id;
  const info = data.categories.find((c) => c.id === category);
  const people = data.employees.filter((p) => !draft?.department || p.department === draft.department);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="panel">
        <b>HR xərcləri ({year})</b>
        <p className="muted" style={{ margin: "4px 0 8px" }}>Əmək haqqı və təlimdən başqa kadr xərcləri burada yazılır: planlaşdırılır, direktor təsdiqləyir, təsdiqlənən xərc sifariş kimi xarici proqrama (1C, SAP, ERP) düşür, orada ödənəndən sonra «ödənildi» qeyd olunur və yalnız onda real xərc sayılır. Xarici proqram qoşulmayıbsa, ödəniş əl ilə qeyd olunur (tarix, üsul, hesab/kassa, sənəd nömrəsi). Hər növün büdcəsi «Büdcə» sekməsində yazılır; büdcəsiz və ya büdcədən artıq xərc yazılmır. Təlim xərci «İnkişaf və kommunikasiya → Təlimlər»də, əmək haqqı «Əmək haqqı»nda aparılır.</p>
        <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead><tr><th>Növ</th><th>Büdcə</th><th>Ayrılıb</th><th>Real (ödənilib)</th><th>Sifarişdə</th><th>Qalıq</th><th /></tr></thead>
            <tbody>
              {data.categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.label}<br /><small className="muted">{c.hint}</small></td>
                  <td>{c.budget ? AZN(c.budget) : <small className="muted">büdcə yoxdur</small>}</td>
                  <td>{AZN(c.held)}</td>
                  <td>{AZN(c.paid)}</td>
                  <td style={{ color: "#6d3fb2" }}>{c.ordered ? AZN(c.ordered) : "—"}</td>
                  <td style={{ color: c.budget && c.left < 0 ? "#b42318" : undefined }}>{c.budget ? AZN(c.left) : "—"}</td>
                  <td><button type="button" className="secondary" onClick={() => { setCategory(c.id); setDraft(blank(c.id)); }}>+ Xərc yaz</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {draft && (
        <div className="panel">
          <b>{draft.id ? "Xərci düzəlt" : "Yeni xərc"}: {label(draft.category)}</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10, margin: "10px 0" }}>
            <label style={{ display: "grid", gap: 2 }}>Növ
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>{EXPENSE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
            </label>
            <label style={{ display: "grid", gap: 2 }}>Xərcin adı
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="məs. Novruz hədiyyələri" />
            </label>
            <label style={{ display: "grid", gap: 2 }}>Məbləğ (AZN)
              <input inputMode="decimal" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
            </label>
            <label style={{ display: "grid", gap: 2 }}>Tarix
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </label>
            <label style={{ display: "grid", gap: 2 }}>Departament
              <select value={draft.department} onChange={(e) => setDraft({ ...draft, department: e.target.value, employeeId: "" })}>
                <option value="">Bölünməmiş (ümumi)</option>
                {data.departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 2 }}>İşçi (istəyə görə)
              <select value={draft.employeeId} onChange={(e) => setDraft({ ...draft, employeeId: e.target.value })}>
                <option value="">—</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 2 }}>Kimə ödəniləcək
              <input value={draft.payee} onChange={(e) => setDraft({ ...draft, payee: e.target.value })} placeholder="təchizatçı, agentlik, müəssisə" />
            </label>
            <label style={{ display: "grid", gap: 2 }}>Qeyd
              <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
            </label>
          </div>
          <div className="admin-actions" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="primary" disabled={busy} onClick={() => void save()}>Saxla</button>
            <button type="button" className="secondary" onClick={() => setDraft(null)}>Bağla</button>
          </div>
        </div>
      )}

      <div className="admin-actions" role="tablist" aria-label="Xərc növü" style={{ justifyContent: "flex-start" }}>
        {[{ id: "all", label: "Hamısı" }, ...EXPENSE_CATEGORIES].map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={category === c.id} className={category === c.id ? "primary" : "secondary"} onClick={() => setCategory(c.id)}>{c.label}</button>
        ))}
        <button type="button" className="primary" onClick={() => setDraft(blank(category === "all" ? "other" : category))}>+ Yeni xərc</button>
      </div>
      {info && <p className="muted" style={{ margin: 0 }}>{info.label}: büdcə {info.budget ? AZN(info.budget) : "yoxdur"}, ayrılıb {AZN(info.held)}, qalıq {info.budget ? AZN(info.left) : "—"}.</p>}

      <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead><tr><th>Tarix</th><th>Xərc</th><th>Departament</th><th>Kimə</th><th>Məbləğ</th><th>Vəziyyət</th><th>Ödəniş</th><th /></tr></thead>
          <tbody>
            {list.map((e) => (
              <tr key={e.id}>
                <td>{dmy(e.date)}</td>
                <td><b>{e.title}</b><br /><small className="muted">{label(e.category)}{e.employeeId ? ` · ${data.employees.find((p) => p.id === e.employeeId)?.name || ""}` : ""}{e.note ? ` · ${e.note}` : ""}</small></td>
                <td>{e.department || <small className="muted">ümumi</small>}</td>
                <td>{e.payee || "—"}</td>
                <td>{AZN(e.amount)}</td>
                <td><b style={{ color: STATUS[e.status].color }}>{STATUS[e.status].label}</b>{e.orderNo ? <small className="muted"><br />№ {e.orderNo}</small> : null}{e.source === "erp" ? <small className="muted"><br />xarici sistemdən{e.externalId ? ` (${e.externalId})` : ""}</small> : null}{e.approvedBy && e.status !== "planned" && e.status !== "cancelled" ? <small className="muted"><br />direktor təsdiqi</small> : null}</td>
                <td>{e.status === "paid" ? <small>{dmy(e.paidOn)}<br />{METHOD[e.method] || e.method}{e.payFrom ? ` · ${e.payFrom}` : ""}{e.payRef ? ` · №${e.payRef}` : ""}</small> : "—"}</td>
                <td>
                  <div className="admin-actions">
                    {e.status === "planned" && <button type="button" className="secondary" onClick={() => setDraft({ id: e.id, category: e.category, title: e.title, department: e.department, employeeId: e.employeeId, amount: String(e.amount), date: e.date, payee: e.payee, note: e.note })}>Düzəlt</button>}
                    {e.status === "planned" && <button type="button" className="primary" disabled={busy || !data.canApprove} title={data.canApprove ? "" : "Xərci yalnız direktor təsdiqləyir"} onClick={() => void move(e.id, "approved")}>Təsdiqlə</button>}
                    {e.status === "approved" && <button type="button" className="primary" disabled={busy} onClick={() => void move(e.id, "ordered")}>Sifariş göndər</button>}
                    {(e.status === "approved" || e.status === "ordered") && <button type="button" className="secondary" disabled={busy} onClick={() => setPaying({ id: e.id, paidOn: today(), method: "bank", payFrom: "", payRef: "" })}>{e.status === "ordered" ? "Ödənildi (əl ilə)" : "Ödə (əl ilə)"}</button>}
                    {e.status === "ordered" && <button type="button" className="secondary" disabled={busy} onClick={() => { if (window.confirm("Sifariş xarici sistemdən geri çəkilsin?")) void move(e.id, "approved"); }}>Sifarişi geri çək</button>}
                    {(e.status === "planned" || e.status === "approved" || e.status === "ordered") && <button type="button" className="secondary" disabled={busy} onClick={() => void move(e.id, "cancelled")}>Ləğv et</button>}
                    {e.status === "paid" && <button type="button" className="secondary" disabled={busy || !data.canApprove} title={data.canApprove ? "" : "Yalnız direktor"} onClick={() => { if (window.confirm("Ödəniş geri qaytarılsın?")) void move(e.id, "approved"); }}>Ödənişi geri qaytar</button>}
                    {e.status === "cancelled" && <button type="button" className="secondary" disabled={busy} onClick={() => void move(e.id, "planned")}>Bərpa et</button>}
                    {(e.status === "planned" || e.status === "cancelled") && <button type="button" className="secondary" disabled={busy} onClick={() => { if (window.confirm("Xərc silinsin?")) void run(() => call("company/hr-expenses/delete", { id: e.id }), "Xərc silindi."); }}>Sil</button>}
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td colSpan={8}><p className="admin-empty">Bu növ üçün {year}-ci ildə xərc yoxdur.</p></td></tr>}
          </tbody>
        </table>
      </div>

      {paying && (
        <div className="panel">
          <b>Ödənişi qeyd et</b>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 10, margin: "10px 0" }}>
            <label style={{ display: "grid", gap: 2 }}>Ödəniş tarixi
              <input type="date" value={paying.paidOn} onChange={(e) => setPaying({ ...paying, paidOn: e.target.value })} />
            </label>
            <label style={{ display: "grid", gap: 2 }}>Ödəniş üsulu
              <select value={paying.method} onChange={(e) => setPaying({ ...paying, method: e.target.value })}>{Object.entries(METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </label>
            <label style={{ display: "grid", gap: 2 }}>Hansı hesabdan / kassadan
              <input value={paying.payFrom} onChange={(e) => setPaying({ ...paying, payFrom: e.target.value })} placeholder="məs. Kapital Bank hesabı" />
            </label>
            <label style={{ display: "grid", gap: 2 }}>Sənəd nömrəsi
              <input value={paying.payRef} onChange={(e) => setPaying({ ...paying, payRef: e.target.value })} placeholder="ödəniş tapşırığı, qəbz, faktura" />
            </label>
          </div>
          <div className="admin-actions" style={{ justifyContent: "flex-start" }}>
            <button type="button" className="primary" disabled={busy} onClick={() => { const p = paying; setPaying(null); void move(p.id, "paid", { paidOn: p.paidOn, method: p.method, payFrom: p.payFrom, payRef: p.payRef }); }}>Ödənildi kimi qeyd et</button>
            <button type="button" className="secondary" onClick={() => setPaying(null)}>Bağla</button>
          </div>
        </div>
      )}
    </div>
  );
}
