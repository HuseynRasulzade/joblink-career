"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import HrTrends from "./HrTrends";
import BudgetPlan from "./BudgetPlan";
import { StaffTable } from "./StaffPages";
import { takeFocus } from "./focus";

type Notify = (message: string) => void;
type PlanState = { year: string; status: "draft" | "pending" | "approved"; by: string; at: string; canApprove: boolean };
type Tab = "summary" | "headcount" | "staff" | "budget";
type Line = { month: string; department: string; category: string; kind: string; amount: number };
type Fact = { month: string; amount: number };
type Budget = { nowMonth: string; budgets: Line[]; facts: Record<string, Fact[]> };
type Trends = { planned: number; filled: number; targets: Record<string, number>; series: { month: string; headcount: number }[]; alerts: { text: string; level: string }[] };

const STATUS: Record<PlanState["status"], { label: string; tone: string }> = {
  draft: { label: "Layihə", tone: "#8a6100" },
  pending: { label: "Təsdiq gözləyir", tone: "#1f4f9c" },
  approved: { label: "Təsdiqlənib", tone: "#147b70" },
};
const AZN = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} AZN`;
const dmy = (iso: string) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { credentials: "same-origin", cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error || "Yüklənmədi.");
  return body;
}
async function post(path: string, payload: unknown) {
  const response = await fetch(`/api/joblink/${path}`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
  const body = (await response.json().catch(() => ({}))) as { error?: string; status?: string };
  if (!response.ok) throw new Error(body.error || "Əməliyyat alınmadı.");
  return body;
}

// Everything about the plan and the actual in one place: headcount, staff table and budget are written, deleted and approved here;
// the other sections only show figures and link here.
export default function HrPlanFact({ notify }: { notify: Notify }) {
  const [focus] = useState(() => takeFocus("staff"));
  const [tab, setTab] = useState<Tab>(focus ? "staff" : "summary");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [state, setState] = useState<PlanState | null>(null);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  useEffect(() => {
    let live = true;
    get<PlanState>(`company/plan-fact/state?year=${year}`)
      .then((s) => live && setState(s))
      .catch((e) => notifyRef.current((e as Error).message));
    return () => {
      live = false;
    };
  }, [year, version]);

  async function act(path: "submit" | "reopen") {
    setBusy(true);
    try {
      const r = await post(`company/plan-fact/${path}`, { year });
      notify(path === "reopen" ? `${year} planı redaktə üçün açıldı.` : r.status === "approved" ? `${year} planı təsdiqləndi.` : "Plan direktorun təsdiqinə göndərildi.");
      setVersion((n) => n + 1);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const status = state?.status || "draft";
  const locked = status !== "draft";
  const tabs: { id: Tab; label: string }[] = [
    { id: "summary", label: "Xülasə" },
    { id: "headcount", label: "İşçi sayı planı" },
    { id: "staff", label: "Ştat cədvəli" },
    { id: "budget", label: "Büdcə" },
  ];
  const years = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1];
  return (
    <div className="company-page plan-fact">
      <div className="panel" style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="İl">{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          <b style={{ color: STATUS[status].tone }}>{year} planı: {STATUS[status].label}</b>
          {state?.at && status !== "draft" && <small className="muted">{dmy(state.at.slice(0, 10))}</small>}
        </div>
        <div className="admin-actions" style={{ justifyContent: "flex-end" }}>
          {status === "draft" && <button type="button" className="primary" disabled={busy} onClick={() => void act("submit")}>{state?.canApprove ? "Planı təsdiqlə" : "Təsdiqə göndər"}</button>}
          {status === "pending" && <button type="button" className="secondary" onClick={() => { window.location.hash = "hr-approvals"; }}>Təsdiqlərə keç</button>}
          {status === "approved" && <button type="button" className="secondary" disabled={busy || !state?.canApprove} title={state?.canApprove ? "" : "Yalnız direktor aça bilər"} onClick={() => void act("reopen")}>Redaktə üçün aç</button>}
        </div>
      </div>
      <p className="muted">
        {status === "draft" && "Plan layihədir: yazmaq, dəyişmək və silmək olar. Hazır olanda təsdiqə göndərin; təsdiqlənəndən sonra plan kilidlənir."}
        {status === "pending" && "Plan təsdiq gözləyir. Bu müddətdə işçi sayı planı və büdcə dəyişmir."}
        {status === "approved" && "Plan təsdiqlənib və kilidlidir. Dəyişmək üçün direktor «Redaktə üçün aç» düyməsini basır, sonra yenidən təsdiqə göndərilir. Ştat cədvəlinin öz təsdiq qaydası var (aşağıda)."}
      </p>
      <div className="admin-actions" role="tablist" aria-label="Plan və fakt" style={{ justifyContent: "flex-start" }}>
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? "primary" : "secondary"} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>
      {tab === "summary" && <Summary year={year} version={version} go={setTab} notify={notify} />}
      {tab === "headcount" && <HrTrends notify={notify} editable locked={locked} year={year} />}
      {tab === "staff" && <StaffTable notify={notify} initialQuery={focus?.department || ""} />}
      {tab === "budget" && <BudgetPlan year={year} notify={notify} editable version={version} />}
    </div>
  );
}

// Plan against the actual in four lines: people, pay, hiring, training.
function Summary({ year, version, go, notify }: { year: string; version: number; go: (t: Tab) => void; notify: Notify }) {
  const [trends, setTrends] = useState<Trends | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const load = useCallback(() => {
    Promise.all([get<Trends>("company/hr-trends"), get<Budget>(`company/budget-plan?year=${year}`)])
      .then(([t, b]) => {
        setTrends(t);
        setBudget(b);
      })
      .catch((e) => notify((e as Error).message));
  }, [year, notify]);
  useEffect(load, [load, version]);
  if (!trends || !budget) return <p className="muted">Yüklənir…</p>;
  const nowMonth = budget.nowMonth;
  const lastMonth = year === nowMonth.slice(0, 4) ? nowMonth : Number(year) < Number(nowMonth.slice(0, 4)) ? `${year}-12` : `${year}-00`;
  const upTo = (m: string) => m <= lastMonth;
  const cats = [
    { id: "payroll", label: "Əmək haqqı" },
    { id: "hiring", label: "İşə qəbul" },
    { id: "training", label: "Təlim" },
  ].map((c) => {
    const yearBudget = budget.budgets.filter((l) => l.category === c.id).reduce((t, l) => t + l.amount, 0);
    const ytdBudget = budget.budgets.filter((l) => l.category === c.id && upTo(l.month)).reduce((t, l) => t + l.amount, 0);
    const fact = (budget.facts[c.id] || []).filter((f) => upTo(f.month)).reduce((t, f) => t + f.amount, 0);
    return { ...c, yearBudget, ytdBudget, fact };
  });
  const last = trends.series[trends.series.length - 1];
  const target = trends.targets[nowMonth];
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div className="staff-kpis">
        <div className="staff-kpi">
          <small>İşçi sayı</small>
          <strong>{last?.headcount ?? 0} / {target ?? trends.planned}</strong>
          <span>{target !== undefined ? "faktiki / bu ayın planı" : "faktiki / ştat"}</span>
        </div>
        {cats.map((c) => (
          <div key={c.id} className={`staff-kpi ${c.ytdBudget && c.fact > c.ytdBudget ? "" : c.ytdBudget ? "staff-kpi-good" : ""}`}>
            <small>{c.label}</small>
            <strong>{AZN(c.fact)}</strong>
            <span>{c.ytdBudget ? `bu günə plan ${AZN(c.ytdBudget)} · ${Math.round((c.fact / c.ytdBudget) * 100)}%` : c.yearBudget ? `illik plan ${AZN(c.yearBudget)}` : "büdcə yazılmayıb"}</span>
          </div>
        ))}
      </div>
      {!!trends.alerts.length && (
        <div className="panel">
          <b>Sapmalar</b>
          <ul style={{ paddingLeft: 18, margin: "6px 0 0" }}>
            {trends.alerts.map((a) => <li key={a.text} style={{ color: a.level === "red" ? "#b42318" : undefined }}>{a.text}</li>)}
          </ul>
        </div>
      )}
      <div className="panel">
        <b>Harada nə yazılır?</b>
        <ul style={{ paddingLeft: 18, margin: "6px 0 0" }}>
          <li><button type="button" className="text-button" onClick={() => go("headcount")}>İşçi sayı planı</button>: aylıq hədəf say, departament planı, qrafikdə plan xətti.</li>
          <li><button type="button" className="text-button" onClick={() => go("staff")}>Ştat cədvəli</button>: departament, vəzifə, say və maaş həddi (öz təsdiq qaydası ilə).</li>
          <li><button type="button" className="text-button" onClick={() => go("budget")}>Büdcə</button>: əmək haqqı, işə qəbul və təlim, departament və ay üzrə.</li>
        </ul>
        <small className="muted">Hesabatlar, İşçilər və Təlimlər bölmələri bu rəqəmləri yalnız göstərir və bura yönləndirir.</small>
      </div>
    </div>
  );
}
