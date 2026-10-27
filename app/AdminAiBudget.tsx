"use client";
import { useCallback, useEffect, useState } from "react";

type State = {
  budget: { limit: number; spent: number; percent: number; level: "off" | "ok" | "warn" | "over" };
  health: { state: string; code: string; at: string; text: string };
};
async function call(body?: unknown): Promise<State> {
  const response = await fetch("/api/joblink/admin/ai-budget", {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as State & { error?: string };
  if (!response.ok) throw new Error(data.error || "Sorğu tamamlanmadı.");
  return data;
}
function useAiState() {
  const [state, setState] = useState<State | null>(null);
  const load = useCallback(() => call().then(setState).catch(() => {}), []);
  useEffect(() => {
    void load();
  }, [load]);
  return { state, setState, load };
}

// A warning at the top of the admin overview when the AI does not answer or the
// monthly limit is near.
export function AiHealthBanner() {
  const { state } = useAiState();
  if (!state) return null;
  const problems = [
    state.health.state !== "ok" && `${state.health.text}${state.health.code ? ` (${state.health.code})` : ""}`,
    state.budget.level === "over" && `AI-nin aylıq xərc limiti dolub (${state.budget.spent} / ${state.budget.limit} dollar): AI cavab vermir, qaydalar işləyir.`,
    state.budget.level === "warn" && `AI xərci limitin ${state.budget.percent}%-ə çatıb (${state.budget.spent} / ${state.budget.limit} dollar).`,
  ].filter(Boolean) as string[];
  if (!problems.length) return null;
  return (
    <div className="panel" role="alert" style={{ borderColor: "#c2554a", background: "#fff5f3" }}>
      <b>AI diqqət tələb edir</b>
      {problems.map((p) => <p key={p}>{p}</p>)}
    </div>
  );
}

// The monthly spending limit: current spend against it, and the form to change it.
export function AiBudgetPanel({ notify }: { notify: (message: string) => void }) {
  const { state, setState } = useAiState();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  if (!state) return null;
  const { budget } = state;
  async function save() {
    setBusy(true);
    try {
      setState(await call({ monthlyUsd: value }));
      notify("Limit saxlanıldı.");
      setValue("");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <h3>AI-nin aylıq xərc limiti</h3>
      <p className="muted fine-print">
        Bu ay təxmini xərc: <b>${budget.spent}</b>
        {budget.limit ? <> / limit <b>${budget.limit}</b> ({budget.percent}%)</> : " · limit qoyulmayıb"}.
        Limit dolanda AI cavab vermir və sistem qaydalarla hesablanmış nəticə göstərir; 80%-də admin xəbərdarlıq görür. Xərc simvol sayından təxmin edilir, provayderin real hesabı ilə yoxlayın.
      </p>
      {!!budget.limit && (
        <div className="usage-bar" aria-label={`${budget.percent}%`}><i style={{ width: `${Math.min(100, budget.percent)}%` }} /></div>
      )}
      <div className="admin-actions">
        <input type="number" min={0} step="1" placeholder="Aylıq limit (dollar, 0 = yoxdur)" value={value} onChange={(e) => setValue(e.target.value)} aria-label="Aylıq limit" />
        <button className="primary" disabled={busy || value === ""} onClick={save}>Saxla</button>
      </div>
      {state.health.state !== "ok" && <p role="alert"><b>Provayder:</b> {state.health.text}{state.health.code ? ` (${state.health.code})` : ""}</p>}
    </section>
  );
}
