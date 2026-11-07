"use client";
import { Fragment, useEffect, useRef, useState } from "react";

type Line = { month: string; department: string; category: string; kind: string; amount: number };
type Fact = { month: string; department: string; amount: number; estimate: boolean };
type Data = { state?: { status: "draft" | "pending" | "approved" }; canApprove?: boolean; year: string; nowMonth: string; departments: string[]; budgets: Line[]; facts: Record<string, Fact[]> };

const MONTHS = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];
const CATEGORIES = [
  { id: "payroll", label: "Əmək haqqı", factNote: "Fakt: təsdiqlənmiş ayların hesablaması. Təsdiqlənməyən ay (bu aya qədər) indiki əmək haqqı fondu ilə təxmini göstərilir." },
  { id: "hiring", label: "İşə qəbul", factNote: "Fakt: əl ilə yazılır (elan, agentlik, test, uyğunlaşma xərcləri). Platforma bu rəqəmi başqa yerdən bilmir." },
  { id: "training", label: "Təlim", factNote: "Fakt: «Təlimlər» bölməsindəki təlimlərin xərci, başlama ayı üzrə, iştirakçıların departamentlərinə bölünür. Başa çatmayan təlim təxmini sayılır." },
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
  for (const f of data.facts.hiring || []) hiringActual.set(key("hiring", "actual", f.department, f.month), f.amount);
  const stored = (cat: string, kind: string, dept: string, month: string) => (kind === "actual" ? hiringActual.get(key(cat, kind, dept, month)) : saved.get(key(cat, kind, dept, month)));
  const shown = (cat: string, kind: string, dept: string, month: string) => {
    const k = key(cat, kind, dept, month);
    if (values[k] !== undefined) return values[k];
    const v = stored(cat, kind, dept, month);
    return v === undefined ? "" : String(v);
  };
  const num = (text: string) => (text === "" ? 0 : Number(text.replace(",", ".")) || 0);
  const budgetOf = (cat: string, month: string, dept?: string) => rows.filter((d) => dept === undefined || d === dept).reduce((t, d) => t + num(shown(cat, "budget", d, month)), 0);
  const factOf = (cat: string, month: string) => {
    const list = (data.facts[cat] || []).filter((f) => f.month === month);
    return { amount: list.reduce((t, f) => t + f.amount, 0), estimate: list.some((f) => f.estimate), any: list.length > 0 };
  };
  const factDept = (cat: string, month: string, dept: string) => (data.facts[cat] || []).filter((f) => f.month === month && f.department === dept).reduce((t, f) => t + f.amount, 0);
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
      <h4>{year}-ci il büdcəsi: plan və fakt (əmək haqqı, işə qəbul, təlim)</h4>
      <p className="muted">Hər növ üçün aylıq büdcəni departament üzrə yazın (departamentə bölmək istəmirsinizsə «Bölünməmiş» sətrinə). Aşağıdakı ümumi cədvəl hər üç növü birlikdə müqayisə edir; büdcəni aşan ay qırmızı göstərilir.</p>

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
            {category === "hiring" && (
              <tr>
                <td>Faktiki xərc<br /><small className="muted">əl ilə, ümumi</small></td>
                {months.map((m) => (
                  <td key={m}><input inputMode="decimal" aria-label={`${m} işə qəbul xərci`} style={{ width: 84 }} disabled={status !== "draft" || !editable} value={shown("hiring", "actual", COMPANY, m)} onChange={(e) => setValues({ ...values, [key("hiring", "actual", COMPANY, m)]: e.target.value })} /></td>
                ))}
                <td><b>{AZN(months.reduce((t, m) => t + num(shown("hiring", "actual", COMPANY, m)), 0))}</b></td>
              </tr>
            )}
            {category !== "hiring" && rows.filter((d) => months.some((m) => factDept(category, m, d) > 0)).map((d) => (
              <tr key={`f-${d || "company"}`} className="muted">
                <td>{label(d)}<br /><small className="muted">fakt</small></td>
                {months.map((m) => {
                  const v = factDept(category, m, d);
                  const est = (data.facts[category] || []).some((f) => f.month === m && f.department === d && f.estimate);
                  return <td key={m}>{v ? <>{AZN(v)}{est ? <small className="muted"> təxmini</small> : null}</> : "—"}</td>;
                })}
                <td><b>{AZN(months.reduce((t, m) => t + factDept(category, m, d), 0))}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h4 style={{ marginTop: 18 }}>Ümumi müqayisə: üç növ birlikdə</h4>
      <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead><tr><th>Ay</th>{CATEGORIES.map((c) => <th key={c.id} colSpan={2}>{c.label} (büdcə / fakt)</th>)}<th>Cəmi büdcə</th><th>Cəmi fakt</th><th>Fərq</th><th>İcra</th></tr></thead>
          <tbody>
            {months.map((m, i) => {
              const past = m <= data.nowMonth;
              const totals = CATEGORIES.map((c) => ({ b: budgetOf(c.id, m), f: factOf(c.id, m) }));
              const tb = totals.reduce((t, x) => t + x.b, 0);
              const tf = totals.reduce((t, x) => t + x.f.amount, 0);
              const show = past && (tf > 0 || tb > 0);
              const diff = tb - tf;
              return (
                <tr key={m}>
                  <td>{MONTHS[i]}</td>
                  {totals.map((x, k) => (
                    <Fragment key={k}><td>{x.b ? AZN(x.b) : "—"}</td><td style={{ color: x.b && x.f.amount > x.b ? "#b42318" : undefined }}>{x.f.any ? <>{AZN(x.f.amount)}{x.f.estimate ? <small className="muted"> təx.</small> : null}</> : "—"}</td></Fragment>
                  ))}
                  <td>{tb ? AZN(tb) : "—"}</td>
                  <td>{tf ? AZN(tf) : "—"}</td>
                  <td style={{ color: show && diff < 0 ? "#b42318" : undefined }}>{show && tb ? AZN(diff) : "—"}</td>
                  <td style={{ color: show && tb && tf > tb ? "#b42318" : undefined }}>{show && tb ? `${Math.round((tf / tb) * 100)}%` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <small className="skill-picker-help">«təx.» təxmini deməkdir: ay hələ təsdiqlənməyib (əmək haqqı) və ya təlim başa çatmayıb. Gələcək aylar üçün fakt göstərilmir.</small>
    </div>
  );
}
