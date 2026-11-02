"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Field } from "./components";

type Notify = (message: string) => void;
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Sorğu tamamlanmadı.");
  return data;
}
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—");
const azn = (v: number) => `${(v || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
function useLoad<T>(path: string, notify: Notify) {
  const [data, setData] = useState<T | null>(null);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<T>(path)
      .then(setData)
      .catch((error) => notifyRef.current((error as Error).message));
  }, [path]);
  useEffect(load, [load]);
  return [data, load] as const;
}
async function act(notify: Notify, reload: () => void, path: string, body: Record<string, unknown>, done?: string) {
  try {
    await request(path, body);
    if (done) notify(done);
    reload();
    return true;
  } catch (error) {
    notify((error as Error).message);
    return false;
  }
}

type Goal = { id: string; title: string; target: string; weight: number; progress: number; selfNote: string; managerNote: string; score: number | null; proposedBy: string };
export function MyPerformance({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data, load] = useLoad<{ cycle: { id: string; name: string; start: string; end: string; status: string } | null; goals: Goal[]; goalScore: number | null; review: { selfScore: number | null; selfComment: string; managerScore: number | null; managerComment: string; reviewer: string; status: string; acknowledgedAt: string } | null; rating: Record<string, string> }>(`employee/performance?employeeId=${employeeId}`, notify);
  const [goal, setGoal] = useState({ title: "", target: "" });
  const [self, setSelf] = useState({ score: "", comment: "" });
  if (!data) return <p className="muted">Yüklənir…</p>;
  if (!data.cycle) return <p className="muted">Şirkətdə hələ qiymətləndirmə dövrü açılmayıb.</p>;
  const open = data.cycle.status === "open";
  const review = data.review;
  return (
    <div className="offer-composer">
      <p><b>{data.cycle.name}</b> ({dmy(data.cycle.start)} – {dmy(data.cycle.end)}){!open && " · dövr bağlanıb"}{data.goalScore !== null && ` · məqsədlər üzrə orta qiymət ${data.goalScore}`}</p>
      {data.goals.map((g) => (
        <div key={g.id} className="bank-batch">
          <b>{g.title}</b> <small className="skill-description">çəki {g.weight}{g.target ? ` · hədəf: ${g.target}` : ""}{g.score ? ` · qiymət ${g.score}` : ""}</small>
          {g.managerNote && <small className="skill-description">Rəhbər: {g.managerNote}</small>}
          {open && (
            <div className="admin-actions">
              <input type="range" min={0} max={100} step={5} value={g.progress} aria-label="İcra faizi" onChange={(e) => void act(notify, load, "employee/performance/progress", { employeeId, goalId: g.id, progress: Number(e.target.value), note: g.selfNote })} />
              <b>{g.progress}%</b>
              <button type="button" className="text-button" onClick={() => { const note = window.prompt("Qeyd:", g.selfNote); if (note !== null) void act(notify, load, "employee/performance/progress", { employeeId, goalId: g.id, progress: g.progress, note }); }}>qeyd</button>
            </div>
          )}
        </div>
      ))}
      {!data.goals.length && <p className="muted">Hələ məqsəd yoxdur. Aşağıdan təklif edin.</p>}
      {open && (
        <div className="org-add structure-add">
          <input className="search-input" placeholder="Məqsəd təklif et" value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} />
          <input className="search-input" placeholder="Hədəf / ölçü" value={goal.target} onChange={(e) => setGoal({ ...goal, target: e.target.value })} />
          <button type="button" className="secondary" disabled={goal.title.trim().length < 3} onClick={async () => { if (await act(notify, load, "employee/performance/goal", { employeeId, cycleId: data.cycle!.id, ...goal }, "Təklif göndərildi.")) setGoal({ title: "", target: "" }); }}>+ Əlavə et</button>
        </div>
      )}
      <h4>Özünüqiymətləndirmə</h4>
      {open && (!review || review.status === "open" || review.status === "self-done") ? (
        <div className="form-grid">
          <Field label="Ümumi qiymət (1–5)"><select value={self.score || String(review?.selfScore || "")} onChange={(e) => setSelf({ ...self, score: e.target.value })}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} — {data.rating[n]}</option>)}</select></Field>
          <Field label="Şərh"><input value={self.comment || review?.selfComment || ""} maxLength={1000} onChange={(e) => setSelf({ ...self, comment: e.target.value })} /></Field>
          <button type="button" className="secondary" disabled={!(self.score || review?.selfScore)} onClick={() => void act(notify, load, "employee/performance/self", { employeeId, cycleId: data.cycle!.id, selfScore: self.score || review?.selfScore, comment: self.comment || review?.selfComment || "" }, "Özünüqiymət göndərildi.")}>Göndər</button>
        </div>
      ) : review?.selfScore ? <p className="muted">Özünüqiymətiniz: {review.selfScore} / 5{review.selfComment ? ` — ${review.selfComment}` : ""}</p> : null}
      {review?.managerScore ? (
        <>
          <h4>Rəhbər qiymətləndirməsi</h4>
          <p><b>{review.managerScore} / 5</b> — {data.rating[review.managerScore]}{review.reviewer ? ` (${review.reviewer})` : ""}{review.managerComment ? <><br />{review.managerComment}</> : null}</p>
          {review.status === "manager-done" ? <button type="button" className="primary" onClick={() => void act(notify, load, "employee/performance/ack", { employeeId, cycleId: data.cycle!.id }, "Təsdiq edildi.")}>Tanış oldum</button> : <p className="muted">Tanış olduğunuz tarix: {dmy((review.acknowledgedAt || "").slice(0, 10))}</p>}
        </>
      ) : null}
    </div>
  );
}

export function MyTraining({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data, load] = useLoad<{ items: { id: string; title: string; provider: string; kind: string; start: string; end: string; hours: number; trainingStatus: string; status: string; result: string }[] }>(`employee/training?employeeId=${employeeId}`, notify);
  if (!data) return <p className="muted">Yüklənir…</p>;
  if (!data.items.length) return <p className="muted">Sizə təlim təyin olunmayıb.</p>;
  const PS: Record<string, string> = { invited: "Dəvət olunub", attending: "İştirak edəcəksiniz", completed: "Tamamlamısınız", declined: "İmtina etmisiniz" };
  return (
    <table className="admin-table">
      <thead><tr><th>Təlim</th><th>Tarix</th><th>Saat</th><th>Vəziyyət</th><th></th></tr></thead>
      <tbody>
        {data.items.map((t) => (
          <tr key={t.id}>
            <td><b>{t.title}</b><small className="skill-description">{t.provider}</small></td>
            <td>{dmy(t.start)}{t.end && t.end !== t.start ? ` – ${dmy(t.end)}` : ""}</td>
            <td>{t.hours || "—"}</td>
            <td>{PS[t.status] || t.status}{t.result && <small className="skill-description">{t.result}</small>}</td>
            <td className="admin-actions">
              {(t.status === "invited" || t.status === "declined") && t.trainingStatus === "planned" && <button type="button" className="primary" onClick={() => void act(notify, load, "employee/training/respond", { employeeId, trainingId: t.id, status: "attending" }, "Cavabınız qeyd olundu.")}>İştirak edəcəm</button>}
              {t.status !== "declined" && t.status !== "completed" && t.trainingStatus === "planned" && <button type="button" onClick={() => void act(notify, load, "employee/training/respond", { employeeId, trainingId: t.id, status: "declined" }, "Cavabınız qeyd olundu.")}>İmtina</button>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MyShifts({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data] = useLoad<{ items: { day: string; name: string; start: string; end: string }[] }>(`employee/shifts?employeeId=${employeeId}`, notify);
  if (!data) return <p className="muted">Yüklənir…</p>;
  if (!data.items.length) return <p className="muted">Növbəti 3 həftə üçün sizə növbə təyin olunmayıb.</p>;
  return (
    <table className="admin-table">
      <thead><tr><th>Tarix</th><th>Növbə</th><th>Saat</th></tr></thead>
      <tbody>{data.items.map((i) => <tr key={i.day}><td>{dmy(i.day)}</td><td>{i.name}</td><td>{i.start} – {i.end}</td></tr>)}</tbody>
    </table>
  );
}

type Trip = { id: string; destination: string; purpose: string; start: string; end: string; days: number; daily: number; advance: number; status: string; statusText: string; expenses: { id: string; label: string; amount: number; day: string }[]; calc: { total: number; balance: number }; settled: number };
export function MyTrips({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data, load] = useLoad<{ trips: Trip[] }>(`employee/trips?employeeId=${employeeId}`, notify);
  const [form, setForm] = useState({ destination: "", purpose: "", start: "", end: "" });
  const [expense, setExpense] = useState({ tripId: "", label: "", amount: 0 });
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="offer-composer">
      {data.trips.map((t) => (
        <div key={t.id} className="bank-batch">
          <b>{t.destination}</b> <small className="skill-description">{dmy(t.start)} – {dmy(t.end)} ({t.days} gün) · {t.statusText}{t.daily ? ` · gündəlik ${azn(t.daily)}` : ""}{t.advance ? ` · avans ${azn(t.advance)}` : ""}</small>
          {t.expenses.map((e) => <small key={e.id} className="skill-description">{e.label}: {azn(e.amount)}</small>)}
          {(t.status === "approved" || t.status === "reported") && (
            <div className="org-add structure-add">
              <input className="search-input" placeholder="Xərc (bilet, otel…)" value={expense.tripId === t.id ? expense.label : ""} onChange={(e) => setExpense({ tripId: t.id, label: e.target.value, amount: expense.tripId === t.id ? expense.amount : 0 })} />
              <input className="search-input" type="number" min={0} style={{ maxWidth: 110 }} value={expense.tripId === t.id ? expense.amount || "" : ""} onChange={(e) => setExpense({ tripId: t.id, label: expense.tripId === t.id ? expense.label : "", amount: Number(e.target.value) })} />
              <button type="button" className="secondary" disabled={expense.tripId !== t.id || expense.label.trim().length < 2 || !(expense.amount > 0)} onClick={async () => { if (await act(notify, load, "employee/trips/expense", { employeeId, tripId: t.id, label: expense.label, amount: expense.amount })) setExpense({ tripId: "", label: "", amount: 0 }); }}>+ Xərc</button>
              {t.status === "approved" && <button type="button" className="primary" onClick={() => void act(notify, load, "employee/trips/report", { employeeId, tripId: t.id }, "Hesabat verildi.")}>Hesabat ver</button>}
            </div>
          )}
          {t.status === "settled" && <small className="skill-description">{t.settled > 0 ? `Sizə ödənildi: ${azn(t.settled)}` : t.settled < 0 ? `Avansın ${azn(-t.settled)} hissəsi geri qaytarılmalıdır` : "Hesablaşma bərabərdir"}</small>}
        </div>
      ))}
      <h4>Ezamiyyət sorğusu</h4>
      <div className="form-grid">
        <Field label="Təyinat"><input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></Field>
        <Field label="Məqsəd"><input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></Field>
        <Field label="Başlanğıc"><input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
        <Field label="Bitmə"><input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
      </div>
      <button type="button" className="primary" disabled={form.destination.trim().length < 2 || !form.start || !form.end} onClick={async () => { if (await act(notify, load, "employee/trips/request", { employeeId, ...form }, "Sorğu göndərildi.")) setForm({ destination: "", purpose: "", start: "", end: "" }); }}>Sorğu göndər</button>
    </div>
  );
}

type SurveyQ = { id: string; label: string; kind: "scale10" | "scale5" | "yesno" | "text" };
export function MyEngage({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data, load] = useLoad<{ news: { id: string; title: string; body: string; pinned: boolean; author: string; created: string }[]; surveys: { id: string; title: string; anonymous: boolean; questions: SurveyQ[] }[] }>(`employee/engage?employeeId=${employeeId}`, notify);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="offer-composer">
      {data.surveys.map((sv) => (
        <div key={sv.id} className="bank-batch">
          <b>{sv.title}</b> <small className="skill-description">{sv.anonymous ? "anonim: cavabınız sizə bağlanmır" : "adlı sorğu"}</small>
          {sv.questions.map((q) => (
            <Field key={q.id} label={q.label}>
              {q.kind === "text" ? (
                <input value={answers[sv.id]?.[q.id] || ""} maxLength={1000} onChange={(e) => setAnswers({ ...answers, [sv.id]: { ...answers[sv.id], [q.id]: e.target.value } })} />
              ) : (
                <select value={answers[sv.id]?.[q.id] || ""} onChange={(e) => setAnswers({ ...answers, [sv.id]: { ...answers[sv.id], [q.id]: e.target.value } })}>
                  <option value="">—</option>
                  {q.kind === "scale10" && Array.from({ length: 11 }, (_, n) => <option key={n} value={String(n)}>{n}</option>)}
                  {q.kind === "scale5" && [1, 2, 3, 4, 5].map((n) => <option key={n} value={String(n)}>{n}</option>)}
                  {q.kind === "yesno" && (<><option value="yes">Bəli</option><option value="no">Xeyr</option></>)}
                </select>
              )}
            </Field>
          ))}
          <button type="button" className="primary" onClick={() => void act(notify, load, "employee/survey/respond", { employeeId, surveyId: sv.id, answers: answers[sv.id] || {} }, "Təşəkkür edirik, cavabınız qəbul olundu.")}>Göndər</button>
        </div>
      ))}
      <h4>Elanlar</h4>
      {data.news.map((n) => <div key={n.id} className="bank-batch"><b>{n.pinned ? "📌 " : ""}{n.title}</b> <small className="skill-description">{dmy(n.created.slice(0, 10))} · {n.author}</small><p>{n.body}</p></div>)}
      {!data.news.length && <p className="muted">Elan yoxdur.</p>}
    </div>
  );
}

export function MyReferrals({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data, load] = useLoad<{ bonus: number; statusText: Record<string, string>; jobs: { id: string; title: string }[]; items: { id: string; jobTitle: string; name: string; status: string; bonus: number; paid: boolean; created: string }[] }>(`employee/referrals?employeeId=${employeeId}`, notify);
  const [form, setForm] = useState({ jobId: "", name: "", phone: "", email: "", note: "" });
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="offer-composer">
      <p className="muted">Tanıdığınız uyğun şəxsi açıq vakansiyaya tövsiyə edin{data.bonus > 0 ? `; işə qəbul olunarsa tövsiyə bonusu ${azn(data.bonus)}` : ""}.</p>
      <div className="form-grid">
        <Field label="Vakansiya">
          <select value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })}>
            <option value="">Ümumi tövsiyə</option>
            {data.jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </Field>
        <Field label="Ad Soyad"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Telefon"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="E-poçt"><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Niyə uyğundur?"><input value={form.note} maxLength={500} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
      </div>
      <button type="button" className="primary" disabled={form.name.trim().length < 2 || (!form.phone.trim() && !form.email.trim())} onClick={async () => { if (await act(notify, load, "employee/referrals/submit", { employeeId, ...form }, "Tövsiyə göndərildi.")) setForm({ jobId: "", name: "", phone: "", email: "", note: "" }); }}>Tövsiyə et</button>
      {data.items.length > 0 && (
        <table className="admin-table">
          <thead><tr><th>Namizəd</th><th>Vakansiya</th><th>Vəziyyət</th><th>Bonus</th></tr></thead>
          <tbody>{data.items.map((r) => <tr key={r.id}><td>{r.name}<small className="skill-description">{dmy(r.created.slice(0, 10))}</small></td><td>{r.jobTitle || "—"}</td><td>{data.statusText[r.status] || r.status}</td><td>{r.bonus ? `${azn(r.bonus)}${r.paid ? " (ödənilib)" : ""}` : "—"}</td></tr>)}</tbody>
        </table>
      )}
    </div>
  );
}
