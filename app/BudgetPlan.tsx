"use client";
import { useEffect, useRef, useState } from "react";
import { EXPENSE_CATEGORIES } from "@/lib/hr-expenses";

type Line = { month: string; department: string; category: string; kind: string; amount: number };
type Fact = { month: string; department: string; amount: number; estimate: boolean; state?: "paid" | "ordered" | "approved" | "estimate" };
const stateOf = (f: Fact) => f.state || (f.estimate ? "estimate" : "paid");
type Data = { state?: { status: "draft" | "pending" | "approved" }; canApprove?: boolean; year: string; nowMonth: string; departments: string[]; budgets: Line[]; facts: Record<string, Fact[]> };

const MONTHS = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];
const CATEGORIES = [
  { id: "payroll", label: "Əmək haqqı", factNote: "Fakt: təsdiqlənmiş ayların hesablaması. Təsdiqlənməyən ay (bu aya qədər) indiki əmək haqqı fondu ilə təxmini göstərilir." },
  { id: "training", label: "Təlim", factNote: "Fakt: «Təlimlər» bölməsindəki təlimlərin xərci, başlama ayı üzrə, iştirakçıların departamentlərinə bölünür. Başa çatmayan təlim təxmini sayılır." },
  ...EXPENSE_CATEGORIES.map((c) => ({ id: c.id, label: c.label, factNote: `Fakt: «Xərclər» sekməsində yazılan və təsdiqlənən xərclər (${c.hint}). Ödənilməyən təsdiqlənmiş xərc təxmini sayılır.` })),
] as const;
const AZN = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const COMPANY = "";

// The yearly budget: pay, hiring and training, per month and per department, against the actual.
export default function BudgetPlan({ year, notify, editable = false, version = 0, onOpenPlan }: { year: string; notify: (message: string) => void; editable?: boolean; version?: number; onOpenPlan?: () => void }) {
  const [data, setData] = useState<Data | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("payroll");
  const [values, setValues] = useState<Record<string, string>>({});
  const [yearTotal, setYearTotal] = useState("");
  const [busy, setBusy] = useState(false);
  const [reloads, setReloads] = useState(0);
  const [newDept, setNewDept] = useState("");
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  useEffect(() => {
    let live = true;
    fetch(`/api/joblink/company/budget-plan?year=${year}`, { credentials: "same-origin", cache: "no-store" })
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as Data & { error?: string };
        if (!r.ok) throw new Error(body.error || "Büdcə alınmadı.");
        if (live) {
          setData(body);
          setValues({});
        }
      })
      .catch((e) => notifyRef.current((e as Error).message));
    return () => {
      live = false;
    };
  }, [year, reloads, version]);
  if (!data) return <div className="year-budget"><h4>{year}-ci il büdcəsi</h4><p className="muted">Yüklənir…</p></div>;

  const months = MONTHS.map((_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  const rows = [COMPANY, ...data.departments];
  const key = (cat: string, kind: string, dept: string, month: string) => `${cat}|${kind}|${dept}|${month}`;
  const saved = new Map(data.budgets.map((l) => [key(l.category, l.kind, l.department, l.month), l.amount]));
  const hiringActual = new Map<string, number>();
  const stored = (cat: string, kind: string, dept: string, month: string) => (kind === "actual" ? hiringActual.get(key(cat, kind, dept, month)) : saved.get(key(cat, kind, dept, month)));
  const shown = (cat: string, kind: string, dept: string, month: string) => {
    const k = key(cat, kind, dept, month);
    if (values[k] !== undefined) return values[k];
    const v = stored(cat, kind, dept, month);
    return v === undefined ? "" : String(v);
  };
  const num = (text: string) => (text === "" ? 0 : Number(text.replace(",", ".")) || 0);
  const budgetOf = (cat: string, month: string, dept?: string) => rows.filter((d) => dept === undefined || d === dept).reduce((t, d) => t + num(shown(cat, "budget", d, month)), 0);
  // Real = paid; ordered = sent to the outside program, not paid yet; pending = approved without an order, or an estimate.
  const split = (list: Fact[]) => ({
    paid: list.filter((f) => stateOf(f) === "paid").reduce((t, f) => t + f.amount, 0),
    ordered: list.filter((f) => stateOf(f) === "ordered").reduce((t, f) => t + f.amount, 0),
    pending: list.filter((f) => ["approved", "estimate"].includes(stateOf(f))).reduce((t, f) => t + f.amount, 0),
  });
  const factOf = (cat: string, month: string) => split((data.facts[cat] || []).filter((f) => f.month === month));
  const factDept = (cat: string, month: string, dept: string) => split((data.facts[cat] || []).filter((f) => f.month === month && f.department === dept));
  const anyFact = (x: { paid: number; ordered: number; pending: number }) => x.paid + x.ordered + x.pending > 0;
  const label = (d: string) => (d === COMPANY ? "Bölünməmiş (ümumi)" : d);

  function spread() {
    const total = num(yearTotal);
    if (!(total > 0)) return notify("İllik büdcəni müsbət rəqəmlə yazın.");
    const each = Math.round((total / 12) * 100) / 100;
    const next = { ...values };
    months.forEach((m, i) => (next[key(category, "budget", COMPANY, m)] = String(i === 11 ? Math.round((total - each * 11) * 100) / 100 : each)));
    setValues(next);
  }
  async function save() {
    const list = Object.entries(values).map(([k, v]) => {
      const part = k.split("|");
      return { category: part[0], kind: part[1], department: part.slice(2, -1).join("|"), month: part[part.length - 1], amount: v === "" ? null : Number(v.replace(",", ".")) };
    });
    if (!list.length) return notify("Dəyişiklik yoxdur.");
    if (list.some((x) => x.amount !== null && !Number.isFinite(x.amount))) return notify("Məbləğ rəqəm olmalıdır.");
    setBusy(true);
    try {
      const response = await fetch("/api/joblink/company/budget-plan/save", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines: list }) });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Büdcə saxlanmadı.");
      notify(`${year} büdcəsi saxlanıldı.`);
      setReloads((n) => n + 1);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function addDepartment() {
    const name = newDept.replace(/\|/g, " ").trim();
    if (!name) return;
    if (rows.some((d) => d.toLocaleLowerCase("az") === name.toLocaleLowerCase("az"))) return notify("Bu departament artıq siyahıdadır.");
    setData({ ...data!, departments: [...data!.departments, name] });
    setNewDept("");
  }
  const cat = CATEGORIES.find((c) => c.id === category)!;
  async function clearCategory() {
    if (!window.confirm(`${year}-ci ilin «${cat.label}» büdcəsi tamamilə silinsin?`)) return;
    setBusy(true);
    try {
      const response = await fetch("/api/joblink/company/budget-plan/clear", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ year, category }) });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Silinmədi.");
      notify(`${cat.label} büdcəsi silindi.`);
      setReloads((n) => n + 1);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const status = data.state?.status || "draft";
  const locked = !editable || status !== "draft";
  const dirty = Object.keys(values).length > 0;

  return (
    <div className="year-budget">
      <h4>{year}-ci il büdcəsi: plan və fakt (əmək haqqı, təlim və HR xərcləri)</h4>
      <p className="muted">Hər növ üçün aylıq büdcəni departament üzrə yazın (departamentə bölmək istəmirsinizsə «Bölünməmiş» sətrinə). Aşağıdakı cədvəllər bütün növləri müqayisə edir; büdcəni aşan ay qırmızı göstərilir.</p>

      <div className="admin-actions" role="tablist" aria-label="Büdcə növü" style={{ justifyContent: "flex-start" }}>
        {CATEGORIES.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={category === c.id} className={category === c.id ? "primary" : "secondary"} onClick={() => setCategory(c.id)}>{c.label}</button>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 8 }}>{cat.factNote}</p>

      {editable ? (
        <div className="admin-actions" style={{ justifyContent: "flex-start", alignItems: "center", gap: 8 }}>
          <label>İllik cəmi (AZN) <input inputMode="decimal" value={yearTotal} disabled={locked} onChange={(e) => setYearTotal(e.target.value)} placeholder="məs. 240000" style={{ width: 120 }} /></label>
          <button type="button" className="secondary" disabled={locked} onClick={spread}>«Bölünməmiş» sətrinə 12 aya böl</button>
          <input value={newDept} disabled={locked} onChange={(e) => setNewDept(e.target.value)} placeholder="Departament əlavə et" style={{ width: 170 }} aria-label="Departament adı" />
          <button type="button" className="secondary" disabled={locked} onClick={addDepartment}>Əlavə et</button>
          <button type="button" className="primary" disabled={busy || !dirty || locked} onClick={() => void save()}>Büdcəni saxla</button>
          <button type="button" className="secondary" disabled={busy || locked} onClick={() => void clearCategory()}>{cat.label} büdcəsini sil</button>
        </div>
      ) : onOpenPlan ? (
        <p className="panel"><b>Büdcə harada yazılır?</b> <span className="muted">Büdcə, işçi sayı planı və ştat «Plan və fakt» bölməsində yazılır, silinir və təsdiqlənir. Burada yalnız baxış var.</span> <button type="button" className="secondary" onClick={onOpenPlan}>Plan və fakt bölməsinə keç</button></p>
      ) : null}
      {editable && status !== "draft" && <p className="muted">{status === "approved" ? "Plan təsdiqlənib: dəyişmək üçün yuxarıda «Redaktə üçün aç» düyməsi (direktor)." : "Plan təsdiq gözləyir: bu müddətdə dəyişmək olmur."}</p>}

      <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Departament</th>
              {MONTHS.map((m) => <th key={m}>{m}</th>)}
              <th>İllik</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d || "company"}>
                <td>{label(d)}<br /><small className="muted">büdcə</small></td>
                {months.map((m) => (
                  <td key={m}><input inputMode="decimal" aria-label={`${label(d)} ${m} büdcəsi`} style={{ width: 84 }} disabled={locked} value={shown(category, "budget", d, m)} onChange={(e) => setValues({ ...values, [key(category, "budget", d, m)]: e.target.value })} /></td>
                ))}
                <td><b>{AZN(months.reduce((t, m) => t + num(shown(category, "budget", d, m)), 0))}</b></td>
              </tr>
            ))}
            {rows.filter((d) => months.some((m) => anyFact(factDept(category, m, d)))).map((d) => (
              <tr key={`f-${d || "company"}`} className="muted">
                <td>{label(d)}<br /><small className="muted">fakt: real / sifarişdə / gözləyən</small></td>
                {months.map((m) => {
                  const v = factDept(category, m, d);
                  return (
                    <td key={m}>
                      {anyFact(v) ? <>{v.paid ? AZN(v.paid) : "—"}{v.ordered ? <small style={{ display: "block", color: "#1f4f9c" }}>+ {AZN(v.ordered)} sifarişdə</small> : null}{v.pending ? <small className="muted" style={{ display: "block" }}>+ {AZN(v.pending)} gözləyən</small> : null}</> : "—"}
                    </td>
                  );
                })}
                <td><b>{AZN(months.reduce((t, m) => t + factDept(category, m, d).paid, 0))}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 style={{ marginTop: 18 }}>Ümumi müqayisə: növlər üzrə</h4>
      <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead><tr><th>Növ</th><th>İllik büdcə</th><th>Bu günə büdcə</th><th>Real xərc (ödənilib)</th><th>Sifarişdə (ödənilməyib)</th><th>Gözləyən / təxmini</th><th>Qalıq (büdcə − real − sifariş)</th><th>İcra (real)</th></tr></thead>
          <tbody>
            {CATEGORIES.map((c) => {
              const upTo = months.filter((m) => m <= data.nowMonth);
              const yearB = months.reduce((t, m) => t + budgetOf(c.id, m), 0);
              const ytdB = upTo.reduce((t, m) => t + budgetOf(c.id, m), 0);
              const f = upTo.reduce((t, m) => { const x = factOf(c.id, m); return { paid: t.paid + x.paid, ordered: t.ordered + x.ordered, pending: t.pending + x.pending }; }, { paid: 0, ordered: 0, pending: 0 });
              const left = ytdB - f.paid - f.ordered;
              return (
                <tr key={c.id}>
                  <td>{c.label}</td>
                  <td>{yearB ? AZN(yearB) : "—"}</td>
                  <td>{ytdB ? AZN(ytdB) : "—"}</td>
                  <td><b>{f.paid ? AZN(f.paid) : "—"}</b></td>
                  <td style={{ color: "#1f4f9c" }}>{f.ordered ? AZN(f.ordered) : "—"}</td>
                  <td className="muted">{f.pending ? AZN(f.pending) : "—"}</td>
                  <td style={{ color: left < 0 ? "#b42318" : undefined }}>{ytdB || anyFact(f) ? AZN(left) : "—"}</td>
                  <td style={{ color: ytdB && f.paid > ytdB ? "#b42318" : undefined }}>{ytdB ? `${Math.round((f.paid / ytdB) * 100)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h4 style={{ marginTop: 18 }}>Aylar üzrə: bütün növlərin cəmi</h4>
      <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead><tr><th>Ay</th><th>Cəmi büdcə</th><th>Real xərc (ödənilib)</th><th>Sifarişdə</th><th>Gözləyən / təxmini</th><th>Qalıq</th><th>İcra (real)</th></tr></thead>
          <tbody>
            {months.map((m, i) => {
              const past = m <= data.nowMonth;
              const tb = CATEGORIES.reduce((t, c) => t + budgetOf(c.id, m), 0);
              const f = CATEGORIES.reduce((t, c) => { const x = factOf(c.id, m); return { paid: t.paid + x.paid, ordered: t.ordered + x.ordered, pending: t.pending + x.pending }; }, { paid: 0, ordered: 0, pending: 0 });
              const show = past && (anyFact(f) || tb > 0);
              const left = tb - f.paid - f.ordered;
              return (
                <tr key={m}>
                  <td>{MONTHS[i]}</td>
                  <td>{tb ? AZN(tb) : "—"}</td>
                  <td><b>{f.paid ? AZN(f.paid) : "—"}</b></td>
                  <td style={{ color: "#1f4f9c" }}>{f.ordered ? AZN(f.ordered) : "—"}</td>
                  <td className="muted">{f.pending ? AZN(f.pending) : "—"}</td>
                  <td style={{ color: show && left < 0 ? "#b42318" : undefined }}>{show && tb ? AZN(left) : "—"}</td>
                  <td style={{ color: show && tb && f.paid > tb ? "#b42318" : undefined }}>{show && tb ? `${Math.round((f.paid / tb) * 100)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <small className="skill-picker-help">Real xərc: ödənilmiş (xarici sistemdə ödənilib və ya əl ilə qeyd olunub), təsdiqlənmiş əmək haqqı və bitmiş təlim. Sifarişdə: xarici sistemə sifariş kimi göndərilib, hələ ödənilməyib. Gözləyən: təsdiqlənib amma sifariş verilməyib, həm də təxmini əmək haqqı və başa çatmayan təlim. Gələcək aylar üçün fakt göstərilmir.</small>
    </div>
  );
}
