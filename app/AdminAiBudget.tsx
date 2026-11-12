"use client";
import { useCallback, useEffect, useState } from "react";

type Budget = { limit: number; spent: number; percent: number; level: "off" | "ok" | "warn" | "over" };
type State = {
  budget: Budget;
  areas?: { cv: Budget; vacancy: Budget; other: number };
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
    state.areas?.cv.level === "over" && `CV tərəfinin AI limiti dolub (${state.areas.cv.spent} / ${state.areas.cv.limit} dollar): CV analizi AI olmadan, qaydalarla işləyir.`,
    state.areas?.vacancy.level === "over" && `Vakansiya tərəfinin AI limiti dolub (${state.areas.vacancy.spent} / ${state.areas.vacancy.limit} dollar): vakansiya AI-si qaydalarla işləyir.`,
    state.areas?.cv.level === "warn" && `CV tərəfinin AI xərci limitin ${state.areas.cv.percent}%-ə çatıb.`,
    state.areas?.vacancy.level === "warn" && `Vakansiya tərəfinin AI xərci limitin ${state.areas.vacancy.percent}%-ə çatıb.`,
  ].filter(Boolean) as string[];
  if (!problems.length) return null;
  return (
    <div className="panel" role="alert" style={{ borderColor: "#c2554a", background: "#fff5f3" }}>
      <b>AI diqqət tələb edir</b>
      {problems.map((p) => <p key={p}>{p}</p>)}
    </div>
  );
}

// The administrator account can see everyone's data: say so while it has no second step at sign-in.
export function AdminTwoFactorBanner({ openSettings }: { openSettings?: () => void }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/joblink/auth/2fa-status", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((response) => (response.ok ? (response.json() as Promise<{ enabled?: boolean }>) : null))
      .then((data) => setEnabled(data ? !!data.enabled : null))
      .catch(() => setEnabled(null));
  }, []);
  if (enabled !== false) return null;
  return (
    <div className="panel" role="alert" style={{ borderColor: "#c2554a", background: "#fff5f3" }}>
      <b>Administrator hesabında iki mərhələli giriş söndürülüdür</b>
      <p>Bu hesab bütün istifadəçilərin məlumatlarına çatır. Yuxarıdakı hesab menyusundan “Hesab parametrləri”ni açıb autentifikator tətbiqi ilə iki mərhələli girişi aktiv edin.</p>
      {openSettings && <button type="button" className="secondary" onClick={openSettings}>Hesab parametrlərinə keç</button>}
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
      {state.areas && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginTop: 12 }}>
          <AreaCard title="CV tərəfi (namizəd)" hint="CV oxuma, analiz, yenidən yazma, vakansiya uyğunluğu, karyera məsləhəti, AI köməkçi." area="cv" budget={state.areas.cv} setState={setState} notify={notify} />
          <AreaCard title="Vakansiya tərəfi (işəgötürən)" hint="Vakansiya layihəsi, namizəd sıralaması, test və sənəd oxuma, vəzifə adı uyğunlaşdırma." area="vacancy" budget={state.areas.vacancy} setState={setState} notify={notify} />
        </div>
      )}
      {state.areas && state.areas.other > 0 && <p className="muted fine-print">Bölünməyən digər AI xərci bu ay: ${state.areas.other}. Ümumi limitə daxildir.</p>}
      <p className="muted fine-print">
        Hər tərəfin öz limiti, öz xərci var: biri dolsa digəri işləməyə davam edir. Hər tərəf üçün ayrıca model də seçmək olur: Cloudflare-də <code>OPENAI_MODEL_CV</code> və <code>OPENAI_MODEL_VACANCY</code> dəyişənləri (boşdursa ümumi <code>OPENAI_MODEL</code> işləyir).
      </p>
      {state.health.state !== "ok" && <p role="alert"><b>Provayder:</b> {state.health.text}{state.health.code ? ` (${state.health.code})` : ""}</p>}
    </section>
  );
}

function AreaCard({ title, hint, area, budget, setState, notify }: { title: string; hint: string; area: "cv" | "vacancy"; budget: Budget; setState: (s: State) => void; notify: (message: string) => void }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      setState(await call({ area, areaUsd: value }));
      notify("Limit saxlanıldı.");
      setValue("");
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel" style={{ margin: 0 }}>
      <b>{title}</b>
      <p className="muted fine-print">{hint}</p>
      <p>
        Bu ay: <b>${budget.spent}</b>
        {budget.limit ? <> / limit <b>${budget.limit}</b> ({budget.percent}%)</> : " · limit qoyulmayıb"}
      </p>
      {!!budget.limit && <div className="usage-bar" aria-label={`${budget.percent}%`}><i style={{ width: `${Math.min(100, budget.percent)}%` }} /></div>}
      <div className="admin-actions">
        <input type="number" min={0} step="1" placeholder="Aylıq limit (dollar, 0 = yoxdur)" value={value} onChange={(e) => setValue(e.target.value)} aria-label={`${title}: aylıq limit`} />
        <button className="primary" disabled={busy || value === ""} onClick={save}>Saxla</button>
      </div>
    </div>
  );
}
