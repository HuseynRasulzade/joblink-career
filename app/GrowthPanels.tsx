"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Field, Modal } from "./components";

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
async function run(notify: Notify, reload: () => void, path: string, body: Record<string, unknown>, done?: string) {
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

// ---------- Performance ----------
type Goal = { id: string; title: string; target: string; weight: number; progress: number; selfNote: string; managerNote: string; score: number | null; proposedBy: string };
type PerfPerson = { id: string; name: string; position: string; department: string; goals: Goal[]; goalScore: number | null; band: string; review: { selfScore: number | null; selfComment: string; managerScore: number | null; managerComment: string; reviewer: string; status: string; acknowledgedAt: string } | null };
type PerfData = { cycles: { id: string; name: string; start: string; end: string; status: string }[]; cycle: string; rating: Record<string, string>; employees: PerfPerson[] };
const REVIEW_STATUS: Record<string, string> = { open: "Başlanmayıb", "self-done": "Özünüqiymət verilib", "manager-done": "Rəhbər qiymətləndirib", acknowledged: "İşçi tanış olub" };

export function Performance({ notify }: { notify: Notify }) {
  const [cycle, setCycle] = useState("");
  const [data, load] = useLoad<PerfData>(`company/performance?cycle=${cycle}`, notify);
  const [open, setOpen] = useState("");
  const [creating, setCreating] = useState(false);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const current = data.cycles.find((c) => c.id === data.cycle);
  const person = data.employees.find((p) => p.id === open);
  return (
    <div className="company-page">
      <div className="section-heading">
        <div className="admin-actions">
          <select value={data.cycle} onChange={(e) => setCycle(e.target.value)} aria-label="Dövr">
            {data.cycles.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.status === "open" ? "açıq" : "bağlı"})</option>)}
            {!data.cycles.length && <option value="">Dövr yoxdur</option>}
          </select>
          {current && <button type="button" className="secondary" onClick={() => void run(notify, load, "company/performance/cycle", { ...current, status: current.status === "open" ? "closed" : "open" }, "Dövrün vəziyyəti dəyişdi.")}>{current.status === "open" ? "Dövrü bağla" : "Dövrü aç"}</button>}
        </div>
        <div className="admin-actions">
          {current && <a className="secondary report-button" href={`/api/joblink/company/performance/export?cycle=${current.id}`} download><Download size={14} /> Excel</a>}
          <button type="button" className="primary" onClick={() => setCreating(true)}>+ Yeni dövr</button>
        </div>
      </div>
      {current && <p className="muted">{current.name}: {dmy(current.start)} – {dmy(current.end)}. İşçilərə məqsəd yazılır, işçi icranı və özünüqiyməti doldurur, rəhbər qiymət verir, işçi tanış olub təsdiqləyir.</p>}
      {data.cycle ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>İşçi</th><th>Məqsəd</th><th>Orta qiymət</th><th>Ümumi qiymət</th><th>Vəziyyət</th><th></th></tr></thead>
            <tbody>
              {data.employees.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b><small className="skill-description">{[p.position, p.department].filter(Boolean).join(" · ")}</small></td>
                  <td>{p.goals.length}</td>
                  <td>{p.goalScore ?? "—"}</td>
                  <td>{p.review?.managerScore ? `${p.review.managerScore} / 5 · ${p.band}` : "—"}{p.review?.selfScore ? <small className="skill-description">özünüqiymət {p.review.selfScore}</small> : null}</td>
                  <td>{REVIEW_STATUS[p.review?.status || "open"]}</td>
                  <td><button type="button" onClick={() => setOpen(p.id)}>Aç</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="admin-empty">Hələ dövr yoxdur. “Yeni dövr” ilə başlayın.</p>}
      {creating && <CycleForm notify={notify} onClose={() => setCreating(false)} onSaved={load} />}
      {person && current && <PersonReview person={person} cycleId={current.id} closed={current.status === "closed"} rating={data.rating} notify={notify} onClose={() => setOpen("")} onChanged={load} />}
    </div>
  );
}
function CycleForm({ notify, onClose, onSaved }: { notify: Notify; onClose: () => void; onSaved: () => void }) {
  const year = new Date().getFullYear();
  const [form, setForm] = useState({ name: `${year} illik qiymətləndirmə`, start: `${year}-01-01`, end: `${year}-12-31` });
  return (
    <Modal title="Yeni qiymətləndirmə dövrü" onClose={onClose}>
      <div className="offer-composer">
        <div className="form-grid">
          <Field label="Ad"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Başlanğıc"><input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
          <Field label="Bitmə"><input type="date" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
        </div>
        <button type="button" className="primary" onClick={async () => { if (await run(notify, onSaved, "company/performance/cycle", form, "Dövr yaradıldı.")) onClose(); }}>Yarat</button>
      </div>
    </Modal>
  );
}
function PersonReview({ person, cycleId, closed, rating, notify, onClose, onChanged }: { person: PerfPerson; cycleId: string; closed: boolean; rating: Record<string, string>; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const [goal, setGoal] = useState({ title: "", target: "", weight: 1 });
  const [review, setReview] = useState({ score: String(person.review?.managerScore || ""), comment: person.review?.managerComment || "" });
  return (
    <Modal title={`${person.name}: məqsədlər və qiymətləndirmə`} onClose={onClose}>
      <div className="offer-composer">
        {person.goals.map((g) => (
          <div key={g.id} className="bank-batch">
            <div className="bank-batch-head">
              <div><b>{g.title}</b> <small className="skill-description">çəki {g.weight} · icra {g.progress}%{g.proposedBy === "employee" ? " · işçi təklifi" : ""}</small>{g.target && <small className="skill-description">Hədəf: {g.target}</small>}{g.selfNote && <small className="skill-description">İşçi: {g.selfNote}</small>}</div>
              <div className="admin-actions">
                <select aria-label="Qiymət" value={g.score ?? ""} disabled={closed} onChange={(e) => void run(notify, onChanged, "company/performance/goal-score", { id: g.id, score: e.target.value, note: g.managerNote })}>
                  <option value="">Qiymət —</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} — {rating[n]}</option>)}
                </select>
                {!closed && <button type="button" className="danger" onClick={() => window.confirm("Məqsəd silinsin?") && void run(notify, onChanged, "company/performance/goal/delete", { id: g.id })}>Sil</button>}
              </div>
            </div>
          </div>
        ))}
        {!closed && (
          <div className="org-add structure-add">
            <input className="search-input" placeholder="Yeni məqsəd" value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} />
            <input className="search-input" placeholder="Hədəf / ölçü" value={goal.target} onChange={(e) => setGoal({ ...goal, target: e.target.value })} />
            <input type="number" min={1} max={10} style={{ maxWidth: 80 }} value={goal.weight} aria-label="Çəki" onChange={(e) => setGoal({ ...goal, weight: Number(e.target.value) })} />
            <button type="button" className="secondary" disabled={goal.title.trim().length < 3} onClick={async () => { if (await run(notify, onChanged, "company/performance/goal", { cycleId, employeeId: person.id, ...goal })) setGoal({ title: "", target: "", weight: 1 }); }}>+ Əlavə et</button>
          </div>
        )}
        <h4>Ümumi qiymətləndirmə</h4>
        {person.review?.selfScore ? <p className="muted">İşçinin özünüqiyməti: {person.review.selfScore} / 5{person.review.selfComment ? ` — ${person.review.selfComment}` : ""}</p> : <p className="muted">İşçi hələ özünüqiymət verməyib.</p>}
        <div className="form-grid">
          <Field label="Ümumi qiymət">
            <select value={review.score} disabled={closed} onChange={(e) => setReview({ ...review, score: e.target.value })}>
              <option value="">—</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} — {rating[n]}</option>)}
            </select>
          </Field>
          <Field label="Rəy"><input value={review.comment} maxLength={1000} disabled={closed} onChange={(e) => setReview({ ...review, comment: e.target.value })} /></Field>
        </div>
        {!closed && <button type="button" className="primary" disabled={!review.score} onClick={() => void run(notify, onChanged, "company/performance/review", { cycleId, employeeId: person.id, managerScore: review.score, managerComment: review.comment }, "Qiymətləndirmə göndərildi.")}>Qiymətləndirməni göndər</button>}
        {person.review?.acknowledgedAt && <p className="muted">İşçi {dmy(person.review.acknowledgedAt.slice(0, 10))} tarixində tanış olub.</p>}
      </div>
    </Modal>
  );
}

// ---------- Training ----------
type Training = { id: string; title: string; provider: string; kind: string; start: string; end: string; hours: number; cost: number; status: string; note: string; participants: { employeeId: string; name: string; status: string; result: string }[] };
type TrainingData = { year: string; budget: number; spent: number; trainings: Training[]; employees: { id: string; name: string; department: string; hours: number }[] };
const KIND_TEXT: Record<string, string> = { internal: "Daxili", external: "Xarici", online: "Onlayn" };
const TSTATUS: Record<string, string> = { planned: "Planlaşdırılıb", done: "Keçirilib", cancelled: "Ləğv edilib" };
const PSTATUS: Record<string, string> = { invited: "Dəvət olunub", attending: "Gələcək", completed: "Tamamlayıb", declined: "İmtina edib" };

export function Training({ notify }: { notify: Notify }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, load] = useLoad<TrainingData>(`company/training?year=${year}`, notify);
  const [edit, setEdit] = useState<Partial<Training> | null>(null);
  const [people, setPeople] = useState<Training | null>(null);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const left = data.budget - data.spent;
  return (
    <div className="company-page">
      <div className="section-heading">
        <div className="admin-actions">
          <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="İl">{[-1, 0, 1].map((d) => <option key={d} value={String(new Date().getFullYear() + d)}>{new Date().getFullYear() + d}</option>)}</select>
          <button type="button" className="secondary" onClick={() => { const v = window.prompt(`${year}-ci il üçün təlim büdcəsi (AZN):`, String(data.budget)); if (v !== null) void run(notify, load, "company/training/budget", { year, amount: Number(v) }, "Büdcə saxlanıldı."); }}>Büdcəni yaz</button>
        </div>
        <button type="button" className="primary" onClick={() => setEdit({ title: "", kind: "external", status: "planned" })}>+ Təlim planla</button>
      </div>
      <div className="staff-kpis">
        <div className="staff-kpi"><small>Büdcə</small><strong>{azn(data.budget)}</strong></div>
        <div className="staff-kpi"><small>Planlaşdırılan xərc</small><strong>{azn(data.spent)}</strong></div>
        <div className={`staff-kpi ${left >= 0 ? "staff-kpi-good" : ""}`}><small>Qalıq</small><strong>{azn(left)}</strong><span>{data.budget ? (left >= 0 ? "büdcə çərçivəsindədir" : "büdcə aşılıb") : "büdcə yazılmayıb"}</span></div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Təlim</th><th>Tarix</th><th>Saat</th><th>Xərc</th><th>İştirakçı</th><th></th></tr></thead>
          <tbody>
            {data.trainings.map((t) => (
              <tr key={t.id} className={t.status === "cancelled" ? "payment-reversed" : ""}>
                <td><b>{t.title}</b><small className="skill-description">{KIND_TEXT[t.kind]} · {t.provider || "—"} · {TSTATUS[t.status]}</small></td>
                <td>{dmy(t.start)}{t.end && t.end !== t.start ? ` – ${dmy(t.end)}` : ""}</td>
                <td>{t.hours || "—"}</td>
                <td>{t.cost ? azn(t.cost) : "—"}</td>
                <td>{t.participants.length}{t.participants.length > 0 && <small className="skill-description">{t.participants.filter((p) => p.status === "completed").length} tamamlayıb</small>}</td>
                <td className="admin-actions"><button type="button" onClick={() => setPeople(t)}>İştirakçılar</button><button type="button" onClick={() => setEdit(t)}>Dəyiş</button><button type="button" className="danger" onClick={() => window.confirm("Təlim silinsin?") && void run(notify, load, "company/training/delete", { id: t.id })}>Sil</button></td>
              </tr>
            ))}
            {!data.trainings.length && <tr><td colSpan={6}><p className="admin-empty">Bu il üçün təlim planlaşdırılmayıb.</p></td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted"><b>Tamamlanmış təlim saatı:</b> {data.employees.filter((p) => p.hours > 0).map((p) => `${p.name} ${p.hours} saat`).join(", ") || "hələ yoxdur"}.</p>
      {edit && (
        <Modal title={edit.id ? "Təlimi dəyiş" : "Yeni təlim"} onClose={() => setEdit(null)}>
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="Ad"><input value={edit.title || ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
              <Field label="Təlimçi / təşkilat"><input value={edit.provider || ""} onChange={(e) => setEdit({ ...edit, provider: e.target.value })} /></Field>
              <Field label="Növ"><select value={edit.kind || "external"} onChange={(e) => setEdit({ ...edit, kind: e.target.value })}>{Object.entries(KIND_TEXT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
              <Field label="Başlanğıc"><input type="date" value={edit.start || ""} onChange={(e) => setEdit({ ...edit, start: e.target.value })} /></Field>
              <Field label="Bitmə"><input type="date" value={edit.end || ""} onChange={(e) => setEdit({ ...edit, end: e.target.value })} /></Field>
              <Field label="Saat"><input type="number" min={0} value={edit.hours ?? ""} onChange={(e) => setEdit({ ...edit, hours: Number(e.target.value) })} /></Field>
              <Field label="Xərc (AZN)"><input type="number" min={0} value={edit.cost ?? ""} onChange={(e) => setEdit({ ...edit, cost: Number(e.target.value) })} /></Field>
              <Field label="Vəziyyət"><select value={edit.status || "planned"} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>{Object.entries(TSTATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            </div>
            <button type="button" className="primary" onClick={async () => { if (await run(notify, load, "company/training/save", { ...edit }, "Saxlanıldı.")) setEdit(null); }}>Saxla</button>
          </div>
        </Modal>
      )}
      {people && <Participants training={people} employees={data.employees} notify={notify} onClose={() => setPeople(null)} onChanged={load} />}
    </div>
  );
}
function Participants({ training, employees, notify, onClose, onChanged }: { training: Training; employees: TrainingData["employees"]; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const [chosen, setChosen] = useState(new Set(training.participants.map((p) => p.employeeId)));
  return (
    <Modal title={`İştirakçılar: ${training.title}`} onClose={onClose}>
      <div className="offer-composer">
        <div className="hours-grid">
          {employees.map((p) => (
            <label key={p.id} className="check-row"><input type="checkbox" checked={chosen.has(p.id)} onChange={(e) => { const next = new Set(chosen); if (e.target.checked) next.add(p.id); else next.delete(p.id); setChosen(next); }} /> {p.name}</label>
          ))}
        </div>
        <button type="button" className="primary" onClick={async () => { if (await run(notify, onChanged, "company/training/participants", { trainingId: training.id, employeeIds: [...chosen] }, "İştirakçılar saxlanıldı.")) onClose(); }}>Saxla və dəvət göndər</button>
        {training.participants.length > 0 && (
          <>
            <h4>Nəticələr</h4>
            {training.participants.map((p) => (
              <div key={p.employeeId} className="bank-account">
                <span>{p.name}</span>
                <select value={p.status} onChange={(e) => void run(notify, onChanged, "company/training/result", { trainingId: training.id, employeeId: p.employeeId, status: e.target.value, result: p.result })}>{Object.entries(PSTATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              </div>
            ))}
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------- Shifts ----------
type ShiftData = { from: string; to: string; types: { id: string; name: string; start: string; end: string; hours: number; night: number }[]; employees: { id: string; name: string; department: string }[]; assignments: { employeeId: string; day: string; shiftId: string }[] };
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return addDays(iso, -((d.getUTCDay() + 6) % 7));
};

export function Shifts({ notify }: { notify: Notify }) {
  const [from, setFrom] = useState(mondayOf(new Date().toISOString().slice(0, 10)));
  const [data, load] = useLoad<ShiftData>(`company/shifts?from=${from}`, notify);
  const [type, setType] = useState<{ id?: string; name: string; start: string; end: string } | null>(null);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const days = Array.from({ length: 14 }, (_, i) => addDays(data.from, i));
  const at = (employeeId: string, day: string) => data.assignments.find((a) => a.employeeId === employeeId && a.day === day)?.shiftId || "";
  return (
    <div className="company-page">
      <div className="section-heading">
        <div className="admin-actions">
          <button type="button" onClick={() => setFrom(addDays(from, -7))}>←</button>
          <b>{dmy(data.from)} – {dmy(data.to)}</b>
          <button type="button" onClick={() => setFrom(addDays(from, 7))}>→</button>
        </div>
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => void run(notify, load, "company/shifts/copy", { from: data.from, to: addDays(data.from, 7) }, "Birinci həftə ikinci həftəyə köçürüldü.")}>1-ci həftəni 2-ciyə köçür</button>
          <button type="button" className="secondary" onClick={() => window.confirm("Bu iki həftənin növbələri işlənən saat kimi yazılsın? (Əmək haqqında artıq iş və gecə saatı bundan hesablanır.)") && void run(notify, load, "company/shifts/to-hours", { from: data.from, to: data.to }, "Növbələr saat uçotuna köçürüldü.")}>Saat uçotuna köçür</button>
          <button type="button" className="primary" onClick={() => setType({ name: "", start: "09:00", end: "18:00" })}>+ Növbə növü</button>
        </div>
      </div>
      <p className="muted">
        Növbə növləri: {data.types.map((t) => (
          <button key={t.id} type="button" className="text-button" onClick={() => setType({ id: t.id, name: t.name, start: t.start, end: t.end })}>{t.name} {t.start}–{t.end} ({t.hours} saat{t.night ? `, gecə ${t.night}` : ""}) </button>
        ))}
        {!data.types.length && "hələ yoxdur — əvvəl növbə növü əlavə edin."}
      </p>
      <div className="admin-table-wrap">
        <table className="admin-table shift-grid">
          <thead><tr><th>İşçi</th>{days.map((d) => <th key={d}>{d.slice(8, 10)}.{d.slice(5, 7)}</th>)}</tr></thead>
          <tbody>
            {data.employees.map((p) => (
              <tr key={p.id}>
                <td><b>{p.name}</b><small className="skill-description">{p.department}</small></td>
                {days.map((d) => (
                  <td key={d}>
                    <select value={at(p.id, d)} aria-label={`${p.name} ${d}`} onChange={(e) => void run(notify, load, "company/shifts/assign", { employeeId: p.id, from: d, shiftId: e.target.value })}>
                      <option value="">—</option>
                      {data.types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {type && (
        <Modal title={type.id ? "Növbə növünü dəyiş" : "Yeni növbə növü"} onClose={() => setType(null)}>
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="Ad"><input value={type.name} onChange={(e) => setType({ ...type, name: e.target.value })} placeholder="Səhər, Gecə…" /></Field>
              <Field label="Başlama (SS:DD)"><input value={type.start} onChange={(e) => setType({ ...type, start: e.target.value })} /></Field>
              <Field label="Bitmə (SS:DD)"><input value={type.end} onChange={(e) => setType({ ...type, end: e.target.value })} /></Field>
            </div>
            <div className="admin-actions">
              <button type="button" className="primary" onClick={async () => { if (await run(notify, load, "company/shifts/type", type, "Saxlanıldı.")) setType(null); }}>Saxla</button>
              {type.id && <button type="button" className="danger" onClick={async () => { if (await run(notify, load, "company/shifts/type/delete", { id: type.id }, "Silindi.")) setType(null); }}>Sil</button>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------- Business trips ----------
type Trip = { id: string; employeeId: string; name: string; destination: string; purpose: string; start: string; end: string; days: number; daily: number; advance: number; status: string; statusText: string; requestedBy: string; expenses: { id: string; label: string; amount: number; day: string }[]; calc: { perDiem: number; expenses: number; total: number; advance: number; balance: number }; settled: number };

export function Trips({ notify }: { notify: Notify }) {
  const [data, load] = useLoad<{ employees: { id: string; name: string }[]; trips: Trip[] }>("company/trips", notify);
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState<Trip | null>(null);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const current = open ? data.trips.find((t) => t.id === open.id) || null : null;
  return (
    <div className="company-page">
      <div className="section-heading">
        <p className="muted">Ezamiyyət sorğusu → təsdiq → xərc hesabatı → hesablaşma. Hesablaşmada işçiyə çatan məbləğ əmək haqqındakı “digər ödəniş” kimi qeyd olunur.</p>
        <button type="button" className="primary" onClick={() => setEdit({ employeeId: data.employees[0]?.id || "", destination: "", purpose: "", start: "", end: "", daily: 0, advance: 0, approve: true })}>+ Ezamiyyət</button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>İşçi</th><th>Təyinat</th><th>Tarix</th><th>Gündəlik</th><th>Avans</th><th>Vəziyyət</th><th></th></tr></thead>
          <tbody>
            {data.trips.map((t) => (
              <tr key={t.id}>
                <td>{t.name}{t.requestedBy === "employee" && <small className="skill-description">işçi sorğusu</small>}</td>
                <td><b>{t.destination}</b><small className="skill-description">{t.purpose}</small></td>
                <td>{dmy(t.start)} – {dmy(t.end)} ({t.days} gün)</td>
                <td>{t.daily ? azn(t.daily) : "—"}</td>
                <td>{t.advance ? azn(t.advance) : "—"}</td>
                <td>{t.statusText}{t.status === "settled" && <small className="skill-description">{t.settled >= 0 ? `işçiyə ${azn(t.settled)}` : `geri qaytarılmalı ${azn(-t.settled)}`}</small>}</td>
                <td className="admin-actions">
                  {t.status === "requested" && <button type="button" className="primary" onClick={() => { const daily = window.prompt("Gündəlik məbləğ (AZN):", String(t.daily || 0)); if (daily === null) return; const advance = window.prompt("Avans (AZN):", String(t.advance || 0)); if (advance === null) return; void run(notify, load, "company/trips/decide", { id: t.id, decision: "approve", daily: Number(daily), advance: Number(advance) }, "Təsdiqləndi."); }}>Təsdiqlə</button>}
                  {t.status === "requested" && <button type="button" onClick={() => void run(notify, load, "company/trips/decide", { id: t.id, decision: "reject", note: window.prompt("Rədd səbəbi:") || "" }, "Rədd edildi.")}>Rədd et</button>}
                  {t.status !== "requested" && t.status !== "rejected" && <button type="button" onClick={() => setOpen(t)}>Xərclər və hesablaşma</button>}
                </td>
              </tr>
            ))}
            {!data.trips.length && <tr><td colSpan={7}><p className="admin-empty">Ezamiyyət yoxdur.</p></td></tr>}
          </tbody>
        </table>
      </div>
      {edit && (
        <Modal title="Yeni ezamiyyət" onClose={() => setEdit(null)}>
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="İşçi"><select value={String(edit.employeeId)} onChange={(e) => setEdit({ ...edit, employeeId: e.target.value })}>{data.employees.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <Field label="Təyinat"><input value={String(edit.destination)} onChange={(e) => setEdit({ ...edit, destination: e.target.value })} /></Field>
              <Field label="Məqsəd"><input value={String(edit.purpose)} onChange={(e) => setEdit({ ...edit, purpose: e.target.value })} /></Field>
              <Field label="Başlanğıc"><input type="date" value={String(edit.start)} onChange={(e) => setEdit({ ...edit, start: e.target.value })} /></Field>
              <Field label="Bitmə"><input type="date" value={String(edit.end)} onChange={(e) => setEdit({ ...edit, end: e.target.value })} /></Field>
              <Field label="Gündəlik (AZN)"><input type="number" min={0} value={Number(edit.daily) || ""} onChange={(e) => setEdit({ ...edit, daily: Number(e.target.value) })} /></Field>
              <Field label="Avans (AZN)"><input type="number" min={0} value={Number(edit.advance) || ""} onChange={(e) => setEdit({ ...edit, advance: Number(e.target.value) })} /></Field>
            </div>
            <button type="button" className="primary" onClick={async () => { if (await run(notify, load, "company/trips/save", edit, "Ezamiyyət yaradıldı.")) setEdit(null); }}>Saxla (təsdiqlənmiş)</button>
          </div>
        </Modal>
      )}
      {current && <TripDetail trip={current} notify={notify} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
function TripDetail({ trip, notify, onClose, onChanged }: { trip: Trip; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const [form, setForm] = useState({ label: "", amount: 0, day: "" });
  const settled = trip.status === "settled";
  return (
    <Modal title={`Ezamiyyət: ${trip.name} → ${trip.destination}`} onClose={onClose}>
      <div className="offer-composer">
        <ul className="payment-history">
          {trip.expenses.map((e) => (
            <li key={e.id}>{e.day ? `${dmy(e.day)} — ` : ""}{e.label}: <b>{azn(e.amount)}</b> {!settled && <button type="button" className="text-button" onClick={() => void run(notify, onChanged, "company/trips/expense", { tripId: trip.id, expenseId: e.id, remove: true })}>sil</button>}</li>
          ))}
          {!trip.expenses.length && <li className="muted">Xərc yazılmayıb.</li>}
        </ul>
        {!settled && (
          <div className="org-add structure-add">
            <input className="search-input" placeholder="Xərc (bilet, otel…)" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <input className="search-input" type="number" min={0} style={{ maxWidth: 110 }} value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            <input type="date" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} aria-label="Tarix" />
            <button type="button" className="secondary" disabled={form.label.trim().length < 2 || !(form.amount > 0)} onClick={async () => { if (await run(notify, onChanged, "company/trips/expense", { tripId: trip.id, ...form })) setForm({ label: "", amount: 0, day: "" }); }}>+ Xərc</button>
          </div>
        )}
        <p>Gündəlik: {azn(trip.calc.perDiem)} ({trip.days} gün) + xərclər {azn(trip.calc.expenses)} = <b>{azn(trip.calc.total)}</b>; verilmiş avans {azn(trip.calc.advance)}.<br />
          <b>{trip.calc.balance > 0 ? `İşçiyə ödənilməlidir: ${azn(trip.calc.balance)}` : trip.calc.balance < 0 ? `İşçi avansın ${azn(-trip.calc.balance)} hissəsini qaytarmalıdır` : "Hesablaşma bərabərdir"}</b></p>
        {!settled && <button type="button" className="primary" onClick={async () => { if (window.confirm("Ezamiyyətlə hesablaşılsın?") && (await run(notify, onChanged, "company/trips/settle", { id: trip.id }, "Hesablaşıldı."))) onClose(); }}>Hesablaş</button>}
      </div>
    </Modal>
  );
}

// ---------- Announcements and surveys ----------
type News = { id: string; title: string; body: string; audience: string; pinned: boolean; expires: string; author: string; created: string };
type SurveyResult = { id: string; title: string; kind: string; anonymous: boolean; status: string; responses: number; enps: { count: number; promoters: number; passives: number; detractors: number; score: number | null } | null; byDepartment: { department: string; count: number; score: number | null }[]; averages: { id: string; label: string; average: number | null }[]; yesno: { id: string; label: string; yes: number; no: number }[]; comments: { id: string; label: string; items: string[] }[] };

export function Engage({ notify }: { notify: Notify }) {
  const [news, loadNews] = useLoad<{ departments: string[]; items: News[] }>("company/announcements", notify);
  const [surveys, loadSurveys] = useLoad<{ employees: number; surveys: SurveyResult[] }>("company/surveys", notify);
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [survey, setSurvey] = useState<{ title: string; kind: string; anonymous: boolean; questions: { label: string; kind: string }[] } | null>(null);
  return (
    <div className="company-page">
      <div className="section-heading"><h4>Elanlar</h4><button type="button" className="primary" onClick={() => setEdit({ title: "", body: "", audience: "", pinned: false, notify: true })}>+ Elan</button></div>
      {news?.items.map((n) => (
        <div key={n.id} className="bank-batch">
          <div className="bank-batch-head">
            <div><b>{n.pinned ? "📌 " : ""}{n.title}</b> <small className="skill-description">{dmy(n.created.slice(0, 10))} · {n.author}{n.audience ? ` · ${n.audience}` : " · hamı"}{n.expires ? ` · ${dmy(n.expires)}-dək` : ""}</small><p>{n.body}</p></div>
            <button type="button" className="danger" onClick={() => window.confirm("Elan silinsin?") && void run(notify, loadNews, "company/announcements/delete", { id: n.id })}>Sil</button>
          </div>
        </div>
      ))}
      {news && !news.items.length && <p className="muted">Elan yoxdur.</p>}
      <div className="section-heading"><h4>Sorğular</h4>
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => setSurvey({ title: "İşçi bağlılığı sorğusu (eNPS)", kind: "enps", anonymous: true, questions: [] })}>+ eNPS sorğusu</button>
          <button type="button" className="primary" onClick={() => setSurvey({ title: "", kind: "custom", anonymous: true, questions: [{ label: "", kind: "scale5" }] })}>+ Öz sorğum</button>
        </div>
      </div>
      {surveys?.surveys.map((sv) => (
        <div key={sv.id} className="bank-batch">
          <div className="bank-batch-head">
            <div><b>{sv.title}</b> <small className="skill-description">{sv.status === "open" ? "açıq" : "bağlı"} · {sv.anonymous ? "anonim" : "adlı"} · {sv.responses} / {surveys.employees} cavab</small></div>
            <button type="button" onClick={() => void run(notify, loadSurveys, "company/surveys/close", { id: sv.id, reopen: sv.status !== "open" })}>{sv.status === "open" ? "Bağla" : "Yenidən aç"}</button>
          </div>
          {sv.enps && sv.enps.count > 0 && <p>eNPS: <b>{sv.enps.score}</b> (tərəfdar {sv.enps.promoters}, neytral {sv.enps.passives}, tənqidçi {sv.enps.detractors}){sv.byDepartment.length > 0 && ` · ${sv.byDepartment.map((d) => `${d.department}: ${d.score}`).join(", ")}`}</p>}
          {sv.averages.map((a) => <p key={a.id}>{a.label}: <b>{a.average ?? "—"}</b></p>)}
          {sv.yesno.map((a) => <p key={a.id}>{a.label}: bəli {a.yes}, xeyr {a.no}</p>)}
          {sv.comments.map((c) => c.items.length > 0 && <details key={c.id}><summary>{c.label} ({c.items.length})</summary><ul>{c.items.map((t, i) => <li key={i}>{t}</li>)}</ul></details>)}
          {sv.responses > 0 && sv.responses < 5 && <small className="muted">Anonimliyi qorumaq üçün şərhlər və departament bölgüsü 5 cavabdan sonra göstərilir.</small>}
        </div>
      ))}
      {edit && (
        <Modal title="Yeni elan" onClose={() => setEdit(null)}>
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="Başlıq"><input value={String(edit.title)} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></Field>
              <Field label="Kimlər üçün">
                <select value={String(edit.audience)} onChange={(e) => setEdit({ ...edit, audience: e.target.value })}>
                  <option value="">Bütün işçilər</option>
                  {news?.departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Müddət (boş — müddətsiz)"><input type="date" value={String(edit.expires || "")} onChange={(e) => setEdit({ ...edit, expires: e.target.value })} /></Field>
            </div>
            <Field label="Mətn"><textarea rows={4} value={String(edit.body)} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></Field>
            <label className="check"><input type="checkbox" checked={edit.pinned === true} onChange={(e) => setEdit({ ...edit, pinned: e.target.checked })} /> Yuxarıda saxla</label>
            <label className="check"><input type="checkbox" checked={edit.notify === true} onChange={(e) => setEdit({ ...edit, notify: e.target.checked })} /> İşçilərə bildiriş göndər</label>
            <button type="button" className="primary" onClick={async () => { if (await run(notify, loadNews, "company/announcements/save", edit, "Elan yayımlandı.")) setEdit(null); }}>Yayımla</button>
          </div>
        </Modal>
      )}
      {survey && (
        <Modal title="Yeni sorğu" onClose={() => setSurvey(null)}>
          <div className="offer-composer">
            <Field label="Ad"><input value={survey.title} onChange={(e) => setSurvey({ ...survey, title: e.target.value })} /></Field>
            {survey.kind === "enps" ? <p className="muted">Standart suallar: “Şirkəti dostunuza tövsiyə edərdinizmi (0–10)” və səbəb.</p> : (
              <>
                {survey.questions.map((q, i) => (
                  <div key={i} className="org-add structure-add">
                    <input className="search-input" placeholder="Sual" value={q.label} onChange={(e) => setSurvey({ ...survey, questions: survey.questions.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)) })} />
                    <select value={q.kind} onChange={(e) => setSurvey({ ...survey, questions: survey.questions.map((x, k) => (k === i ? { ...x, kind: e.target.value } : x)) })}>
                      <option value="scale5">1–5 qiymət</option>
                      <option value="scale10">0–10 qiymət</option>
                      <option value="yesno">Bəli / Xeyr</option>
                      <option value="text">Mətn</option>
                    </select>
                    <button type="button" onClick={() => setSurvey({ ...survey, questions: survey.questions.filter((_, k) => k !== i) })}>×</button>
                  </div>
                ))}
                <button type="button" className="secondary" disabled={survey.questions.length >= 20} onClick={() => setSurvey({ ...survey, questions: [...survey.questions, { label: "", kind: "scale5" }] })}>+ Sual</button>
              </>
            )}
            <label className="check"><input type="checkbox" checked={survey.anonymous} onChange={(e) => setSurvey({ ...survey, anonymous: e.target.checked })} /> Anonim (cavabdeyənin adı saxlanılmır)</label>
            <button type="button" className="primary" onClick={async () => { if (await run(notify, loadSurveys, "company/surveys/save", survey, "Sorğu yayımlandı.")) setSurvey(null); }}>Yayımla</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
