"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Field, Modal } from "./components";
import TripPlacePicker from "./TripPlacePicker";
import { SheetImport } from "./StaffPages";
import PeoplePicker from "./PeoplePicker";

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
// Many people at once go to the server in parts of 200, with the count shown on the way.
async function runChunked(notify: Notify, reload: () => void, path: string, ids: string[], base: Record<string, unknown>, done: string) {
  try {
    for (let i = 0; i < ids.length; i += 200) {
      await request(path, { ...base, employeeIds: ids.slice(i, i + 200) });
      if (ids.length > 200) notify(`${Math.min(i + 200, ids.length)} / ${ids.length} işçi…`);
    }
    notify(done);
    return true;
  } catch (error) {
    notify((error as Error).message);
    return false;
  } finally {
    reload();
  }
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
type PerfPerson = { id: string; name: string; position: string; department: string; goals: Goal[]; goalScore: number | null; band: string; review: { selfScore: number | null; selfComment: string; managerScore: number | null; managerComment: string; reviewer: string; status: string; acknowledgedAt: string; raise?: { type: string; percent: number; note: string; applied: string } } | null };
type PerfData = { cycles: { id: string; name: string; start: string; end: string; status: string }[]; cycle: string; rating: Record<string, string>; employees: PerfPerson[] };
const REVIEW_STATUS: Record<string, string> = { open: "Başlanmayıb", "self-done": "Özünüqiymət verilib", "manager-done": "Rəhbər qiymətləndirib", acknowledged: "İşçi tanış olub" };

export function Performance({ notify }: { notify: Notify }) {
  const [cycle, setCycle] = useState("");
  const [data, load] = useLoad<PerfData>(`company/performance?cycle=${cycle}`, notify);
  const [open, setOpen] = useState("");
  const [creating, setCreating] = useState(false);
  const [meet, setMeet] = useState("");
  const [importing, setImporting] = useState(false);
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
          {current && current.status === "open" && <button type="button" className="secondary" onClick={() => setImporting(true)}>Məqsədləri Excel-dən yüklə</button>}
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
                  <td className="admin-actions"><button type="button" onClick={() => setOpen(p.id)}>Aç</button><button type="button" className="ghost" onClick={() => setMeet(p.id)}>1:1</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="admin-empty">Hələ dövr yoxdur. “Yeni dövr” ilə başlayın.</p>}
      {meet && <OneOnOneModal person={data.employees.find((p) => p.id === meet)!} notify={notify} onClose={() => setMeet("")} />}
      {importing && current && <SheetImport kind="perfgoals" extra={{ cycleId: current.id }} notify={notify} onClose={() => setImporting(false)} onDone={load} />}
      {creating && <CycleForm notify={notify} onClose={() => setCreating(false)} onSaved={load} />}
      {person && current && <PersonReview person={person} colleagues={data.employees} cycleId={current.id} closed={current.status === "closed"} rating={data.rating} notify={notify} onClose={() => setOpen("")} onChanged={load} />}
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
function PersonReview({ person, colleagues, cycleId, closed, rating, notify, onClose, onChanged }: { person: PerfPerson; colleagues: { id: string; name: string }[]; cycleId: string; closed: boolean; rating: Record<string, string>; notify: Notify; onClose: () => void; onChanged: () => void }) {
  const [goal, setGoal] = useState({ title: "", target: "", weight: 1 });
  const [review, setReview] = useState({ score: String(person.review?.managerScore || ""), comment: person.review?.managerComment || "" });
  const [feedback, loadFeedback] = useLoad<{ asked: number; count: number; average: number | null; comments: string[] }>(`company/performance/feedback?cycleId=${cycleId}&employeeId=${person.id}`, notify);
  const [givers, setGivers] = useState<string[]>([]);
  const [advice, setAdvice] = useState({ type: person.review?.raise?.type || "", percent: person.review?.raise?.percent || 0, note: person.review?.raise?.note || "" });
  const [effective, setEffective] = useState(new Date().toISOString().slice(0, 7) + "-01");
  const [bonus, setBonus] = useState({ amount: 0, month: new Date().toISOString().slice(0, 7) });
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
        {person.review?.managerScore ? (
          <>
            <h4>Qiymətləndirmənin nəticəsi: tövsiyə</h4>
            <div className="form-grid">
              <Field label="Tövsiyə">
                <select value={advice.type} disabled={!!person.review.raise?.applied} onChange={(e) => setAdvice({ ...advice, type: e.target.value })}>
                  <option value="">Yoxdur</option>
                  <option value="raise">Maaş artımı</option>
                  <option value="bonus">Mükafat</option>
                  <option value="promotion">Vəzifə artımı</option>
                  <option value="plan">İnkişaf planı</option>
                </select>
              </Field>
              {advice.type === "raise" && <Field label="Artım (%)"><input type="number" min={0} max={100} step="0.5" value={advice.percent || ""} disabled={!!person.review.raise?.applied} onChange={(e) => setAdvice({ ...advice, percent: Number(e.target.value) })} /></Field>}
              <Field label="Əsaslandırma"><input value={advice.note} maxLength={300} disabled={!!person.review.raise?.applied} onChange={(e) => setAdvice({ ...advice, note: e.target.value })} /></Field>
            </div>
            {person.review.raise?.applied ? (
              <p className="muted">{person.review.raise.type === "bonus" ? `Mükafat ${person.review.raise.applied} ayının əmək haqqına yazılıb.` : `Maaş artımı ${dmy(person.review.raise.applied)} tarixindən maaş tarixçəsinə tətbiq olunub.`}</p>
            ) : (
              <div className="admin-actions">
                <button type="button" className="secondary" onClick={() => void run(notify, onChanged, "company/performance/raise", { cycleId, employeeId: person.id, ...advice }, "Tövsiyə saxlanıldı.")}>Tövsiyəni saxla</button>
                {person.review.raise?.type === "bonus" && (
                  <>
                    <input type="number" min={0} step="0.01" placeholder="Mükafat (AZN)" aria-label="Mükafatın məbləği" value={bonus.amount || ""} onChange={(e) => setBonus({ ...bonus, amount: Number(e.target.value) })} style={{ maxWidth: 140 }} />
                    <input type="month" aria-label="Hansı ayın əmək haqqına" value={bonus.month} onChange={(e) => setBonus({ ...bonus, month: e.target.value })} />
                    <button type="button" className="primary" disabled={!(bonus.amount > 0)} onClick={() => void run(notify, onChanged, "company/performance/bonus/apply", { cycleId, employeeId: person.id, amount: bonus.amount, month: bonus.month }, "Mükafat əmək haqqına yazıldı.")}>Əmək haqqına yaz</button>
                  </>
                )}
                {person.review.raise?.type === "raise" && person.review.raise.percent > 0 && (
                  <>
                    <input type="date" aria-label="Yeni maaşın qüvvəyə minmə tarixi" value={effective} onChange={(e) => setEffective(e.target.value)} />
                    <button type="button" className="primary" onClick={() => window.confirm(`Maaş ${person.review?.raise?.percent}% artırılsın və ${effective} tarixindən maaş tarixçəsinə yazılsın?`) && void run(notify, onChanged, "company/performance/raise/apply", { cycleId, employeeId: person.id, effectiveFrom: effective }, "Maaş artımı tətbiq olundu.")}>Maaşa tətbiq et</button>
                  </>
                )}
              </div>
            )}
          </>
        ) : null}
        <h4>Kolleqa rəyi (360°)</h4>
        <p className="muted">Seçilən kolleqalardan bu işçi barədə 1–5 qiymət və qısa rəy istənilir. Rəylər adsız toplanır: yalnız orta qiymət və mətnlər görünür.</p>
        {feedback && feedback.asked > 0 && (
          <p>Soruşulub: {feedback.asked} · cavab verib: {feedback.count}{feedback.average !== null ? ` · orta qiymət: ${feedback.average} / 5` : ""}</p>
        )}
        {feedback?.comments.map((c, i) => <small key={i} className="skill-description">“{c}”</small>)}
        {!closed && (
          <>
            <PeoplePicker people={colleagues.filter((p) => p.id !== person.id)} selected={givers} onChange={setGivers} height={160} label="Rəy verəcək kolleqalar" />
            <button type="button" className="secondary" disabled={!givers.length} onClick={async () => { if (await run(notify, loadFeedback, "company/performance/feedback-request", { cycleId, employeeId: person.id, giverIds: givers }, "Rəy sorğusu göndərildi.")) setGivers([]); }}>Rəy soruş</button>
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------- Training ----------
type Training = { id: string; title: string; provider: string; kind: string; start: string; end: string; hours: number; cost: number; status: string; note: string; validMonths: number; requiredFor: string; skillId: string; skillLevel: number; participants: { employeeId: string; name: string; status: string; result: string; certificateNo: string; completedOn: string; validUntil: string; bondMonths: number; bondUntil: string; bondCost: number }[] };
type TrainingData = { skills: { id: string; name: string }[]; bonds: { employeeId: string; name: string; title: string; until: string; cost: number }[]; year: string; budget: number; spent: number; expiring: { employeeId: string; name: string; title: string; validUntil: string; expired: boolean }[]; missing: { trainingId: string; title: string; requiredFor: string; employees: { id: string; name: string }[] }[]; trainings: Training[]; employees: { id: string; name: string; department: string; hours: number }[] };
const KIND_TEXT: Record<string, string> = { internal: "Daxili", external: "Xarici", online: "Onlayn", safety: "Əməyin mühafizəsi və təhlükəsizlik" };
const TSTATUS: Record<string, string> = { planned: "Planlaşdırılıb", done: "Keçirilib", cancelled: "Ləğv edilib" };
const PSTATUS: Record<string, string> = { invited: "Dəvət olunub", attending: "Gələcək", completed: "Tamamlayıb", declined: "İmtina edib" };

export function Training({ notify }: { notify: Notify }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, load] = useLoad<TrainingData>(`company/training?year=${year}`, notify);
  const [edit, setEdit] = useState<Partial<Training> | null>(null);
  const [people, setPeople] = useState<Training | null>(null);
  const [importing, setImporting] = useState(false);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const left = data.budget - data.spent;
  return (
    <div className="company-page">
      {importing && <SheetImport kind="trainings" notify={notify} onClose={() => setImporting(false)} onDone={load} />}
      <div className="section-heading">
        <div className="admin-actions">
          <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="İl">{[-1, 0, 1].map((d) => <option key={d} value={String(new Date().getFullYear() + d)}>{new Date().getFullYear() + d}</option>)}</select>
          <button type="button" className="secondary" onClick={() => { window.location.hash = "hr-planfact"; }}>Büdcəni Plan və fakt bölməsində dəyiş ↗</button>
        </div>
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => setImporting(true)}>Excel-dən yüklə</button>
          <button type="button" className="primary" onClick={() => setEdit({ title: "", kind: "external", status: "planned" })}>+ Təlim planla</button>
        </div>
      </div>
      <div className="staff-kpis">
        <div className="staff-kpi"><small>Büdcə</small><strong>{azn(data.budget)}</strong></div>
        <div className="staff-kpi"><small>Planlaşdırılan xərc</small><strong>{azn(data.spent)}</strong></div>
        <div className={`staff-kpi ${left >= 0 ? "staff-kpi-good" : ""}`}><small>Qalıq</small><strong>{azn(left)}</strong><span>{data.budget ? (left >= 0 ? "büdcə çərçivəsindədir" : "büdcə aşılıb") : "büdcə yazılmayıb"}</span></div>
      </div>
      {data.expiring.length > 0 && (
        <div className="notice" role="status">
          <b>Sertifikatın müddəti bitir və ya bitib ({data.expiring.length}):</b>
          <ul>{data.expiring.slice(0, 12).map((e) => <li key={`${e.employeeId}${e.title}`}>{e.name}: {e.title} — {e.expired ? "müddəti bitib" : "bitir"} {dmy(e.validUntil)}</li>)}</ul>
        </div>
      )}
      {data.bonds.length > 0 && (
        <div className="notice" role="status">
          <b>İşləmə öhdəliyi davam edən təlimlər ({data.bonds.length}):</b>
          <ul>{data.bonds.slice(0, 10).map((b) => <li key={`${b.employeeId}${b.title}`}>{b.name}: {b.title} — {dmy(b.until)}-dək{b.cost ? `, pozulanda ${azn(b.cost)}` : ""}</li>)}</ul>
        </div>
      )}
      {data.missing.length > 0 && (
        <div className="notice" role="status">
          <b>Məcburi təlimi olmayanlar:</b>
          <ul>{data.missing.map((m) => <li key={m.trainingId}>{m.title} ({m.requiredFor}): {m.employees.slice(0, 10).map((e) => e.name).join(", ")}{m.employees.length > 10 ? ` və daha ${m.employees.length - 10} nəfər` : ""}</li>)}</ul>
        </div>
      )}
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
              <Field label="Sertifikatın etibarlılığı (ay; 0 = müddətsiz)"><input type="number" min={0} max={120} value={edit.validMonths ?? ""} onChange={(e) => setEdit({ ...edit, validMonths: Number(e.target.value) })} /></Field>
              <Field label="Məcburidir: vəzifələr (vergüllə; məs. sürücü, operator)"><input value={edit.requiredFor || ""} onChange={(e) => setEdit({ ...edit, requiredFor: e.target.value })} /></Field>
              <Field label="Öyrətdiyi bacarıq (bacarıq matrisindən)">
                <select value={edit.skillId || ""} onChange={(e) => setEdit({ ...edit, skillId: e.target.value })}>
                  <option value="">— yoxdur —</option>
                  {data.skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              {edit.skillId && <Field label="Təlimi bitirən işçinin səviyyəsi bu qədər qalxır"><select value={edit.skillLevel ?? 2} onChange={(e) => setEdit({ ...edit, skillLevel: Number(e.target.value) })}>{LEVELS.slice(1).map((l, i) => <option key={l} value={i + 1}>{l}</option>)}</select></Field>}
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
        <PeoplePicker people={employees} selected={[...chosen]} onChange={(ids) => setChosen(new Set(ids))} label="Təlimin iştirakçıları" />
        <button type="button" className="primary" onClick={async () => { if (await run(notify, onChanged, "company/training/participants", { trainingId: training.id, employeeIds: [...chosen] }, "İştirakçılar saxlanıldı.")) onClose(); }}>Saxla və dəvət göndər</button>
        {training.participants.length > 0 && (
          <>
            <h4>Nəticələr</h4>
            {training.participants.map((p) => <ParticipantResult key={p.employeeId} training={training} p={p} notify={notify} onChanged={onChanged} />)}
          </>
        )}
      </div>
    </Modal>
  );
}

// ---------- Shifts ----------
type ShiftSwap = { id: string; day: string; from: string; to: string; fromShift: string; toShift: string; note: string; status: string; statusText: string };
type ShiftData = { departments: string[]; swaps: ShiftSwap[]; rules: { minRestHours: number; maxConsecutive: number; cover: Record<string, number> }; warnings: { employeeId: string; day: string; kind: string; text: string }[]; from: string; to: string; types: { id: string; name: string; start: string; end: string; hours: number; night: number }[]; employees: { id: string; name: string; department: string; usual: string; work: number; rest: number }[]; candidates: { id: string; name: string; department: string }[]; assignments: { employeeId: string; day: string; shiftId: string }[] };
const SHIFT_COLORS = ["#cfe8ff", "#ffe7b3", "#d6f5d6", "#e5d4f7", "#ffd4d4", "#d4f1f4"];
const WEEKDAY = ["B", "B.e", "Ç.a", "Ç", "C.a", "C", "Ş"];
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const mondayOf = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return addDays(iso, -((d.getUTCDay() + 6) % 7));
};

export function Shifts({ notify }: { notify: Notify }) {
  const [from, setFrom] = useState(mondayOf(new Date().toISOString().slice(0, 10)));
  const [data, load] = useLoad<ShiftData>(`company/shifts?from=${from}`, notify);
  const [type, setType] = useState<{ id?: string; name: string; start: string; end: string } | null>(null);
  const [pattern, setPattern] = useState<{ shiftId: string; from: string; to: string; work: number; rest: number; offset: number; ids: string[] } | null>(null);
  const [rules, setRules] = useState<{ minRestHours: number; maxConsecutive: number; cover: Record<string, number> } | null>(null);
  const [assignWarnings, setAssignWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState<"shifts" | "shiftstaff" | null>(null);
  const [staffModal, setStaffModal] = useState(false);
  const [gridQuery, setGridQuery] = useState("");
  const [gridDept, setGridDept] = useState("");
  const [gridPage, setGridPage] = useState(0);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const days = Array.from({ length: 14 }, (_, i) => addDays(data.from, i));
  // A big company: the grid shows 40 people at a time, found by name or department.
  const GRID_PAGE = 40;
  const needle = gridQuery.trim().toLocaleLowerCase("az");
  const gridPeople = data.employees.filter((p) => (!gridDept || p.department === gridDept) && (!needle || `${p.name} ${p.department}`.toLocaleLowerCase("az").includes(needle)));
  const gridPages = Math.max(1, Math.ceil(gridPeople.length / GRID_PAGE));
  const pageNow = Math.min(gridPage, gridPages - 1);
  const gridRows = gridPeople.slice(pageNow * GRID_PAGE, (pageNow + 1) * GRID_PAGE);
  const at = (employeeId: string, day: string) => data.assignments.find((a) => a.employeeId === employeeId && a.day === day)?.shiftId || "";
  const view = data;
  // Hours of the shifts of one week (a week above 40 hours is shown in red: it is extra work).
  const weekHours = (employeeId: string, offset: number) => Math.round(days.slice(offset, offset + 7).reduce((sum, d) => sum + (view.types.find((t) => t.id === at(employeeId, d))?.hours || 0), 0) * 10) / 10;
  function printGrid() {
    const w = window.open("", "_blank");
    if (!w) return;
    const esc = (v: string) => v.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
    w.document.write(`<html><head><title>Növbə qrafiki</title><style>body{font-family:sans-serif;font-size:12px}table{border-collapse:collapse}td,th{border:1px solid #999;padding:3px 6px;text-align:center}td:first-child{text-align:left}</style></head><body><h3>Növbə qrafiki ${dmy(view.from)} – ${dmy(view.to)}</h3><table><tr><th>İşçi</th>${days.map((d) => `<th>${d.slice(8, 10)}.${d.slice(5, 7)}</th>`).join("")}</tr>${view.employees.map((p) => `<tr><td>${esc(p.name)}</td>${days.map((d) => `<td>${esc(view.types.find((t) => t.id === at(p.id, d))?.name || "")}</td>`).join("")}</tr>`).join("")}</table><p>${view.types.map((t) => `${esc(t.name)}: ${t.start}–${t.end}`).join(" · ")}</p></body></html>`);
    w.document.close();
    w.print();
  }
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
          <button type="button" className="secondary" onClick={() => setStaffModal(true)}>Növbəli işçilər</button>
          <button type="button" className="primary" disabled={!data.employees.length} onClick={() => window.confirm("Hər işçinin standart növbəsi və ritmi ilə bu iki həftənin boş günləri doldurulsun? Artıq təyin olunmuş günlərə toxunulmur.") && void (async () => { try { const r = await request<{ days: number; employees: number; skipped: string[]; warnings: string[] }>("company/shifts/autofill", { from: data.from, to: data.to }); notify(`${r.employees} işçi üçün ${r.days} gün dolduruldu.${r.skipped.length ? ` Standart növbəsi olmayan: ${r.skipped.length}.` : ""}`); setAssignWarnings(r.warnings); load(); } catch (error) { notify((error as Error).message); } })()}>Standart rejimlə doldur</button>
          <button type="button" className="secondary" onClick={() => setImporting("shifts")}>Excel: növbə cədvəli</button>
          <button type="button" className="secondary" onClick={() => setImporting("shiftstaff")}>Excel: növbəli işçilər</button>
          <button type="button" className="secondary" onClick={printGrid}>Çap</button>
          <button type="button" className="secondary" onClick={() => setRules(data.rules)}>Qaydalar</button>
          <button type="button" className="secondary" disabled={!data.types.length} onClick={() => setPattern({ shiftId: data.types[0]?.id || "", from: data.from, to: data.to, work: 2, rest: 2, offset: 0, ids: [] })}>Dövrü şablon</button>
          <button type="button" className="primary" onClick={() => setType({ name: "", start: "09:00", end: "18:00" })}>+ Növbə növü</button>
        </div>
      </div>
      <div className="notice" role="note">
        <b>Bu nə üçündür?</b> Növbə cədvəlinə yalnız <b>işçi kartında «Növbəli rejimdə işləyir» seçilən</b> işçilər düşür (mağaza, zavod, kafe, mühafizə, klinika). Kartda həm də işçinin standart növbəsi və ritmi (məs. 2 gün iş / 2 gün istirahət) yazılır. Sonra «Standart rejimlə doldur» iki həftəni özü qurur, istənilən günü əl ilə və ya Excel ilə dəyişə bilərsiniz. Plan hazır olanda «Saat uçotuna köçür» saatları yazır və əmək haqqında gecə və artıq iş saatı özü hesablanır. Adi 9–18 iş rejimində olan işçilər üçün növbə lazım deyil.
      </div>
      {!data.types.length ? (
        <p className="muted">Növbə növləri yüklənir…</p>
      ) : (
        <p className="muted">
          Növbə növləri: {data.types.map((t, n) => (
            <button key={t.id} type="button" className="text-button" onClick={() => setType({ id: t.id, name: t.name, start: t.start, end: t.end })}><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: SHIFT_COLORS[n % SHIFT_COLORS.length], marginRight: 4 }} />{t.name} {t.start}–{t.end} ({t.hours} saat{t.night ? `, gecə ${t.night}` : ""}) </button>
          ))}
        </p>
      )}
      {data.employees.length > 15 && (
        <div className="admin-actions">
          <input className="search-input" type="search" aria-label="İşçi axtar" placeholder={`Qrafikdə axtar (${data.employees.length} növbəli işçi)`} value={gridQuery} onChange={(e) => { setGridQuery(e.target.value); setGridPage(0); }} />
          {data.departments.length > 1 && (
            <select aria-label="Departament" value={gridDept} onChange={(e) => { setGridDept(e.target.value); setGridPage(0); }}>
              <option value="">Bütün departamentlər</option>
              {data.departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          <button type="button" disabled={pageNow === 0} onClick={() => setGridPage(pageNow - 1)}>←</button>
          <span>{gridPeople.length ? `${pageNow * GRID_PAGE + 1}–${Math.min((pageNow + 1) * GRID_PAGE, gridPeople.length)} / ${gridPeople.length}` : "0"}</span>
          <button type="button" disabled={pageNow >= gridPages - 1} onClick={() => setGridPage(pageNow + 1)}>→</button>
        </div>
      )}
      <div className="admin-table-wrap">
        <table className="admin-table shift-grid">
          <thead><tr><th>İşçi</th>{days.map((d) => <th key={d}>{d.slice(8, 10)}.{d.slice(5, 7)}<small className="skill-description">{WEEKDAY[new Date(`${d}T00:00:00Z`).getUTCDay()]}</small></th>)}<th>Saat (1-ci / 2-ci həftə)</th></tr></thead>
          <tbody>
            {gridRows.map((p) => (
              <tr key={p.id}>
                <td><b>{p.name}</b><small className="skill-description">{p.department}{p.usual ? ` · ${p.usual}, ${p.work} iş / ${p.rest} istirahət` : " · standart növbə seçilməyib"}</small></td>
                {days.map((d) => (
                  <td key={d}>
                    <select value={at(p.id, d)} aria-label={`${p.name} ${d}`} style={{ background: at(p.id, d) ? SHIFT_COLORS[Math.max(0, data.types.findIndex((t) => t.id === at(p.id, d))) % SHIFT_COLORS.length] : undefined }} onChange={async (e) => { try { const r = await request<{ warnings?: { text: string }[] }>("company/shifts/assign", { employeeId: p.id, from: d, shiftId: e.target.value }); setAssignWarnings((r.warnings || []).map((w) => w.text)); load(); } catch (error) { notify((error as Error).message); } }}>
                      <option value="">—</option>
                      {data.types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </td>
                ))}
                <td>{[0, 7].map((w) => { const h = weekHours(p.id, w); return <span key={w} className={h > 40 ? "danger-text" : undefined}>{h}{w === 0 ? " / " : ""}</span>; })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.swaps.length > 0 && (
        <div className="notice" role="status">
          <b>Növbə dəyişdirmə sorğuları</b>
          <table className="admin-table">
            <thead><tr><th>Tarix</th><th>Kim</th><th>Kimlə</th><th>Vəziyyət</th><th></th></tr></thead>
            <tbody>
              {data.swaps.map((s) => (
                <tr key={s.id}>
                  <td>{dmy(s.day)}</td><td>{s.from} ({s.fromShift || "—"})</td><td>{s.to} ({s.toShift || "—"})</td><td>{s.statusText}</td>
                  <td className="admin-actions">
                    {s.status === "accepted" && <button type="button" className="primary" onClick={() => void run(notify, load, "company/shift-swaps/decide", { id: s.id, approve: true }, "Növbələr dəyişdirildi.")}>Təsdiq</button>}
                    {(s.status === "accepted" || s.status === "asked") && <button type="button" onClick={() => void run(notify, load, "company/shift-swaps/decide", { id: s.id, approve: false }, "Rədd edildi.")}>Rədd</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {(assignWarnings.length > 0 || data.warnings.length > 0) && (
        <div className="notice" role="status">
          <b>Qrafikdə diqqət tələb edənlər ({new Set([...assignWarnings, ...data.warnings.map((w) => w.text)]).size}):</b>
          <ul>{[...new Set([...assignWarnings, ...data.warnings.map((w) => w.text)])].slice(0, 15).map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}
      {rules && (
        <Modal title="Növbə qaydaları" onClose={() => setRules(null)}>
          <div className="offer-composer">
            <Field label="İki növbə arasında ən az fasilə (saat) — şirkətin daxili qaydası"><input type="number" min={0} max={24} step={0.5} value={rules.minRestHours} onChange={(e) => setRules({ ...rules, minRestHours: Number(e.target.value) })} /></Field>
            <Field label="Ardıcıl ən çox iş günü (sonra istirahət günü lazımdır)"><input type="number" min={1} max={14} value={rules.maxConsecutive} onChange={(e) => setRules({ ...rules, maxConsecutive: Number(e.target.value) })} /></Field>
            {data.departments.length > 0 && (
              <>
                <h4>Departament üzrə növbədə ən az işçi</h4>
                {data.departments.map((d) => (
                  <Field key={d} label={d}><input type="number" min={0} max={500} value={rules.cover[d] || ""} placeholder="yoxdur" onChange={(e) => setRules({ ...rules, cover: { ...rules.cover, [d]: Number(e.target.value) || 0 } })} /></Field>
                ))}
              </>
            )}
            <p className="muted">Qrafik bu həddlərə görə yoxlanır və pozulanda xəbərdarlıq çıxır, təyinatı dayandırmır. Həftədə fasiləsiz istirahət müddəti Əmək Məcəlləsində göstərilib: hüquqşünasla yoxlayın.</p>
            <button type="button" className="primary" onClick={async () => { if (await run(notify, load, "company/shifts/rules", rules, "Qaydalar saxlanıldı.")) setRules(null); }}>Saxla</button>
          </div>
        </Modal>
      )}
      {pattern && (
        <Modal title="Dövrü növbə şablonu" onClose={() => setPattern(null)}>
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="Növbə"><select value={pattern.shiftId} onChange={(e) => setPattern({ ...pattern, shiftId: e.target.value })}>{data.types.map((t) => <option key={t.id} value={t.id}>{t.name} {t.start}–{t.end}</option>)}</select></Field>
              <Field label="Başlanğıc"><input type="date" value={pattern.from} onChange={(e) => setPattern({ ...pattern, from: e.target.value })} /></Field>
              <Field label="Son"><input type="date" value={pattern.to} onChange={(e) => setPattern({ ...pattern, to: e.target.value })} /></Field>
              <Field label="Ardıcıl iş günü"><input type="number" min={1} max={14} value={pattern.work} onChange={(e) => setPattern({ ...pattern, work: Number(e.target.value) })} /></Field>
              <Field label="Ardıcıl istirahət günü"><input type="number" min={0} max={14} value={pattern.rest} onChange={(e) => setPattern({ ...pattern, rest: Number(e.target.value) })} /></Field>
              <Field label="Şablonun neçənci günündən başlasın (0 = birinci)"><input type="number" min={0} max={27} value={pattern.offset} onChange={(e) => setPattern({ ...pattern, offset: Number(e.target.value) })} /></Field>
            </div>
            <PeoplePicker people={data.employees} selected={pattern.ids} onChange={(ids) => setPattern({ ...pattern, ids })} label="Şablonun tətbiq olunacağı işçilər" />
            <button type="button" className="primary" disabled={!pattern.ids.length || !pattern.shiftId} onClick={async () => { try { let warnings: string[] = []; for (let k = 0; k < pattern.ids.length; k += 200) { const r = await request<{ warnings?: { text: string }[] }>("company/shifts/assign", { employeeIds: pattern.ids.slice(k, k + 200), shiftId: pattern.shiftId, from: pattern.from, to: pattern.to, work: pattern.work, rest: pattern.rest, offset: pattern.offset }); warnings = [...warnings, ...(r.warnings || []).map((w) => w.text)]; } setAssignWarnings(warnings.slice(0, 40)); notify("Şablon tətbiq olundu."); setPattern(null); load(); } catch (error) { notify((error as Error).message); } }}>Tətbiq et</button>
          </div>
        </Modal>
      )}
      {!data.employees.length && (
        <div className="notice" role="status">
          Hələ heç bir işçi növbəli rejimdə deyil. İşçi kartında «Növbəli rejimdə işləyir» seçin və ya <button type="button" className="text-button" onClick={() => setStaffModal(true)}>buradan bir neçə işçini birdən növbəli rejimə keçirin</button> (və ya Excel ilə yükləyin).
        </div>
      )}
      {staffModal && <ShiftStaffModal data={data} notify={notify} onClose={() => setStaffModal(false)} onDone={load} />}
      {importing && <SheetImport kind={importing} notify={notify} onClose={() => setImporting(null)} onDone={load} />}
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
type Trip = { id: string; employeeId: string; name: string; destination: string; purpose: string; start: string; end: string; days: number; daily: number; advance: number; status: string; statusText: string; requestedBy: string; expenses: { id: string; label: string; amount: number; day: string }[]; abroad?: boolean; manager?: { status: string; name: string; note: string } | null; calc: { perDiem: number; expenses: number; total: number; advance: number; balance: number }; settled: number };

export function Trips({ notify }: { notify: Notify }) {
  const [data, load] = useLoad<{ employees: { id: string; name: string }[]; trips: Trip[] }>("company/trips", notify);
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState<Trip | null>(null);
  const [normTable, setNormTable] = useState(false);
  const [normSettings, setNormSettings] = useState(false);
  const [importing, setImporting] = useState(false);
  if (!data) return <p className="muted">Yüklənir…</p>;
  const current = open ? data.trips.find((t) => t.id === open.id) || null : null;
  return (
    <div className="company-page">
      <div className="section-heading">
        <p className="muted">Ezamiyyət sorğusu → təsdiq → xərc hesabatı → hesablaşma. Hesablaşmada işçiyə çatan məbləğ əmək haqqındakı “digər ödəniş” kimi qeyd olunur.</p>
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => setImporting(true)}>Excel-dən yüklə</button>
          <button type="button" className="secondary" onClick={() => setNormTable(true)}>Rəsmi norma cədvəli</button>
          <button type="button" className="secondary" onClick={() => setNormSettings(true)}>Gündəlik normalar və məzənnə</button>
          <button type="button" className="primary" onClick={() => setEdit({ employeeId: data.employees[0]?.id || "", destination: "", purpose: "", start: "", end: "", daily: 0, advance: 0, approve: true, abroad: false })}>+ Ezamiyyət</button>
        </div>
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
                <td>{t.statusText}{t.manager && <small className="skill-description">{t.manager.status === "pending" ? "Rəhbərin təsdiqini gözləyir" : t.manager.status === "approved" ? `Rəhbər təsdiq etdi (${t.manager.name})` : `Rəhbər rədd etdi (${t.manager.name})`}</small>}{t.abroad && <small className="skill-description">xarici ezamiyyət</small>}{t.status === "settled" && <small className="skill-description">{t.settled >= 0 ? `işçiyə ${azn(t.settled)}` : `geri qaytarılmalı ${azn(-t.settled)}`}</small>}</td>
                <td className="admin-actions">
                  {t.status === "requested" && !(t.manager && t.manager.status === "pending") && <button type="button" className="primary" onClick={() => { const daily = window.prompt("Gündəlik məbləğ (AZN):", String(t.daily || 0)); if (daily === null) return; const advance = window.prompt("Avans (AZN):", String(t.advance || 0)); if (advance === null) return; void run(notify, load, "company/trips/decide", { id: t.id, decision: "approve", daily: Number(daily), advance: Number(advance) }, "Təsdiqləndi."); }}>Təsdiqlə</button>}
                  {t.status === "requested" && !(t.manager && t.manager.status === "pending") && <button type="button" onClick={() => void run(notify, load, "company/trips/decide", { id: t.id, decision: "reject", note: window.prompt("Rədd səbəbi:") || "" }, "Rədd edildi.")}>Rədd et</button>}
                  {t.status !== "requested" && t.status !== "rejected" && <button type="button" onClick={() => setOpen(t)}>Xərclər və hesablaşma</button>}
                </td>
              </tr>
            ))}
            {!data.trips.length && <tr><td colSpan={7}><p className="admin-empty">Ezamiyyət yoxdur.</p></td></tr>}
          </tbody>
        </table>
      </div>
      {importing && <SheetImport kind="trips" notify={notify} onClose={() => setImporting(false)} onDone={load} />}
      {normTable && <NormTable onClose={() => setNormTable(false)} />}
      {normSettings && <NormSettings notify={notify} onClose={() => setNormSettings(false)} />}
      {edit && (
        <Modal title="Yeni ezamiyyət" onClose={() => setEdit(null)}>
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="İşçi"><select value={String(edit.employeeId)} onChange={(e) => setEdit({ ...edit, employeeId: e.target.value })}>{data.employees.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
              <div className="form-wide"><TripPlacePicker destination={String(edit.destination)} abroad={edit.abroad === true} onChange={(destination, abroad) => setEdit({ ...edit, destination, abroad })} /></div>
              <Field label="Məqsəd"><input value={String(edit.purpose)} onChange={(e) => setEdit({ ...edit, purpose: e.target.value })} /></Field>
              <Field label="Başlanğıc"><input type="date" value={String(edit.start)} onChange={(e) => setEdit({ ...edit, start: e.target.value })} /></Field>
              <Field label="Bitmə"><input type="date" value={String(edit.end)} onChange={(e) => setEdit({ ...edit, end: e.target.value })} /></Field>
              <Field label="Gündəlik (AZN)"><input type="number" min={0} value={Number(edit.daily) || ""} onChange={(e) => setEdit({ ...edit, daily: Number(e.target.value) })} /></Field>
              <Field label="Avans (AZN)"><input type="number" min={0} value={Number(edit.advance) || ""} onChange={(e) => setEdit({ ...edit, advance: Number(e.target.value) })} /></Field>
            </div>
            <TripNormHint destination={String(edit.destination)} abroad={edit.abroad === true} onFill={(daily, abroad) => setEdit({ ...edit, daily, abroad })} />
            <p className="muted fine-print">Gündəlik boş qalarsa seçilən yerin rəsmi normu işlənir.</p>
            <button type="button" className="primary" onClick={async () => { if (await run(notify, load, "company/trips/save", edit, "Ezamiyyət yaradıldı.")) setEdit(null); }}>Saxla (təsdiqlənmiş)</button>
          </div>
        </Modal>
      )}
      {current && <TripDetail trip={current} notify={notify} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
// ---------- The official per-diem norms of a trip ----------
type NormFound = { kind: "domestic" | "foreign"; label: string; amount: number; currency: string; hotel?: number; daily?: number; noReceipt?: number };
type NormAnswer = { found: NormFound | null; azn: number | null; needsRate: boolean; source: string };
// Shows the official norm of the place typed in the form and writes it into the daily amount on a click.
function TripNormHint({ destination, abroad, onFill }: { destination: string; abroad: boolean; onFill: (daily: number, abroad: boolean) => void }) {
  const [answer, setAnswer] = useState<NormAnswer | null>(null);
  useEffect(() => {
    if (destination.trim().length < 2) return;
    let live = true;
    const timer = window.setTimeout(() => {
      fetch(`/api/joblink/company/trips/norm?destination=${encodeURIComponent(destination)}&abroad=${abroad ? 1 : 0}`, { credentials: "same-origin", cache: "no-store" })
        .then((r) => r.json() as Promise<NormAnswer>)
        .then((r) => live && setAnswer(r))
        .catch(() => live && setAnswer(null));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [destination, abroad]);
  if (destination.trim().length < 2 || !answer) return null;
  const f = answer.found;
  if (!f) return <p className="muted">Bu təyinat rəsmi cədvəldə tapılmadı{abroad ? ": gündəliyi əllə yazın və ya şirkətin ümumi xarici normu işlənəcək" : ""}.</p>;
  return (
    <div className="panel" style={{ margin: "8px 0" }}>
      <b>Rəsmi norma: {f.label}</b>
      <p style={{ margin: "4px 0" }}>
        {f.amount} {f.currency} / gün
        {f.kind === "domestic" && f.hotel !== undefined && <small className="muted"> (mehmanxana {f.hotel} + gündəlik xərc {f.daily}; mehmanxana sənədi yoxdursa {f.noReceipt} AZN)</small>}
        {f.kind === "foreign" && (answer.azn !== null ? <small className="muted"> ≈ {answer.azn} AZN (şirkətin yazdığı məzənnə ilə)</small> : <small className="danger-text"> · AZN üçün «Gündəlik normalar və məzənnə»də {f.currency} məzənnəsini yazın</small>)}
      </p>
      {answer.azn !== null && (
        <button type="button" className="secondary" onClick={() => onFill(answer.azn as number, f.kind === "foreign")}>
          {answer.azn} AZN-i gündəliyə yaz
        </button>
      )}
      <small className="skill-description">Mənbə: {answer.source}. Norma mehmanxana və gündəlik xərcləri (yemək, şəhərdaxili nəqliyyat, rabitə) əhatə edir; yol xərci sənədlərə əsasən ayrıca ödənilir.</small>
    </div>
  );
}

type NormTableData = { source: string; hotelShare: number; noReceiptHotelPart: number; domestic: { label: string; norm: number }[]; foreign: { n: number; country: string; currency: string; norm: number; cities: { name: string; norm: number }[] }[]; currencies: Record<string, string> };
function NormTable({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<NormTableData | null>(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    fetch("/api/joblink/company/trips/norm-table", { credentials: "same-origin", cache: "no-store" }).then((r) => r.json() as Promise<NormTableData>).then(setData).catch(() => setData(null));
  }, []);
  const needle = q.toLocaleLowerCase("az").trim();
  const rows = (data?.foreign || []).filter((r) => !needle || `${r.country} ${r.cities.map((c) => c.name).join(" ")}`.toLocaleLowerCase("az").includes(needle));
  return (
    <Modal title="Ezamiyyə xərclərinin rəsmi normaları" onClose={onClose}>
      {!data ? <p className="muted">Yüklənir…</p> : (
        <div className="offer-composer">
          <p className="muted">{data.source}. Bir günlük norma mehmanxana ({Math.round(data.hotelShare * 100)}%) və gündəlik xərcləri (yemək, şəhərdaxili nəqliyyat, rabitə) əhatə edir. Ölkə daxilində mehmanxana sənədi təqdim edilməyəndə mehmanxana hissəsinin {Math.round(data.noReceiptHotelPart * 100)}%-i ödənilir. Yol xərci sənədlərə əsasən ayrıca ödənilir.</p>
          <h4>Azərbaycan daxilində (AZN / gün)</h4>
          <table className="admin-table"><tbody>{data.domestic.map((d) => <tr key={d.label}><td>{d.label}</td><td style={{ width: 110 }}><b>{d.norm}</b></td></tr>)}</tbody></table>
          <h4>Xarici ölkələr ({data.foreign.length})</h4>
          <input className="search-input" aria-label="Ölkə və ya şəhər axtar" placeholder="Ölkə və ya şəhər axtar" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="admin-table-wrap" style={{ maxHeight: 340, overflowY: "auto" }}>
            <table className="admin-table">
              <thead><tr><th>№</th><th>Ölkə</th><th>Valyuta</th><th>Norma / gün</th><th>Ayrıca şəhər</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.n}><td>{r.n}</td><td>{r.country}</td><td>{data.currencies[r.currency] || r.currency}</td><td><b>{r.norm}</b></td><td>{r.cities.map((c) => `${c.name}: ${c.norm}`).join("; ") || "—"}</td></tr>
                ))}
                {!rows.length && <tr><td colSpan={5}><p className="admin-empty">Tapılmadı.</p></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

const FX_CODES = ["USD", "EUR", "GBP", "JPY"] as const;
function NormSettings({ notify, onClose }: { notify: Notify; onClose: () => void }) {
  const [form, setForm] = useState<{ domestic: string; abroad: string; fx: Record<string, string> } | null>(null);
  const [official, setOfficial] = useState<{ date: string; perUnit: Record<string, number> } | null>(null);
  useEffect(() => {
    fetch("/api/joblink/company/trips/norms", { credentials: "same-origin", cache: "no-store" })
      .then((r) => r.json() as Promise<{ domestic: number; abroad: number; fx: Record<string, number>; official?: { date: string; perUnit: Record<string, number> } | null }>)
      .then((n) => { setOfficial(n.official || null); return n; })
      .then((n) => setForm({ domestic: n.domestic ? String(n.domestic) : "", abroad: n.abroad ? String(n.abroad) : "", fx: Object.fromEntries(FX_CODES.map((c) => [c, n.fx?.[c] ? String(n.fx[c]) : ""])) }))
      .catch(() => setForm({ domestic: "", abroad: "", fx: {} }));
  }, []);
  async function save() {
    if (!form) return;
    try {
      await request("company/trips/norms", { domestic: Number(form.domestic) || 0, abroad: Number(form.abroad) || 0, fx: form.fx });
      notify("Saxlanıldı.");
      onClose();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <Modal title="Gündəlik normalar və məzənnə" onClose={onClose}>
      {!form ? <p className="muted">Yüklənir…</p> : (
        <div className="offer-composer">
          <p className="muted">Gündəlik boş qalanda təyinat yerinin <b>rəsmi normu</b> işlənir (Azərbaycan daxilində AZN ilə avtomatik). Xarici norma xarici valyutadadır: AZN-ə çevirmək üçün ezamiyyətin başlama gününə Mərkəzi Bankın rəsmi məzənnəsi <b>avtomatik</b> işlənir. Aşağıdakı ümumi normlar yalnız rəsmi cədvəldə tapılmayan təyinat üçündür.</p>
          <div className="fx-official">
            {official ? (
              <>
                <b>Mərkəzi Bankın rəsmi məzənnəsi ({dmy(official.date)}):</b>{" "}
                {FX_CODES.filter((c) => official.perUnit[c]).map((c) => `1 ${c} = ${official.perUnit[c]} AZN`).join(" · ")}{" "}
                <a href="https://www.cbar.az/currency/rates" target="_blank" rel="noreferrer">cbar.az</a>
              </>
            ) : <span className="muted">Mərkəzi Bankın saytından məzənnə hazırda alına bilmədi: aşağıdakı ehtiyat məzənnələr işlənəcək.</span>}
          </div>
          <p className="muted fine-print">Aşağıdakı məzənnələr yalnız <b>ehtiyat</b>dır: Mərkəzi Bankın saytı əlçatmaz olanda işlənir.</p>
          <div className="form-grid">
            {FX_CODES.map((c) => (
              <Field key={c} label={`Ehtiyat: 1 ${c} = ... AZN`}><input inputMode="decimal" value={form.fx[c] || ""} onChange={(e) => setForm({ ...form, fx: { ...form.fx, [c]: e.target.value } })} /></Field>
            ))}
            <Field label="Cədvəldə tapılmayan yer üçün ölkə daxili norma (AZN)"><input inputMode="decimal" value={form.domestic} onChange={(e) => setForm({ ...form, domestic: e.target.value })} /></Field>
            <Field label="Cədvəldə tapılmayan xarici yer üçün norma (AZN)"><input inputMode="decimal" value={form.abroad} onChange={(e) => setForm({ ...form, abroad: e.target.value })} /></Field>
          </div>
          <div className="admin-actions">
            {official && <button type="button" className="secondary" onClick={() => setForm({ ...form, fx: { ...form.fx, ...Object.fromEntries(FX_CODES.filter((c) => official.perUnit[c]).map((c) => [c, String(official.perUnit[c])])) } })}>Bugünkü rəsmi məzənnəni ehtiyat kimi yaz</button>}
            <button type="button" className="primary" onClick={() => void save()}>Saxla</button>
          </div>
        </div>
      )}
    </Modal>
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
type News = { id: string; title: string; body: string; audience: string; pinned: boolean; expires: string; author: string; created: string; requiresAck: boolean; allowComments: boolean; comments: { id: string; author: string; body: string; created: string; hr: boolean }[]; reach: { total: number; read: number; acked: number; waiting: string[] } };
type SurveyResult = { repeatMonths?: number; created: string; id: string; title: string; kind: string; anonymous: boolean; status: string; responses: number; enps: { count: number; promoters: number; passives: number; detractors: number; score: number | null } | null; byDepartment: { department: string; count: number; score: number | null }[]; averages: { id: string; label: string; average: number | null }[]; yesno: { id: string; label: string; yes: number; no: number }[]; comments: { id: string; label: string; items: string[] }[] };

export function Engage({ notify }: { notify: Notify }) {
  const [news, loadNews] = useLoad<{ departments: string[]; items: News[] }>("company/announcements", notify);
  const [surveys, loadSurveys] = useLoad<{ employees: number; surveys: SurveyResult[] }>("company/surveys", notify);
  const [edit, setEdit] = useState<Record<string, unknown> | null>(null);
  const [newsImport, setNewsImport] = useState(false);
  const [survey, setSurvey] = useState<{ title: string; kind: string; anonymous: boolean; repeatMonths?: number; questions: { label: string; kind: string }[] } | null>(null);
  return (
    <div className="company-page">
      <div className="section-heading"><h4>Elanlar</h4><button type="button" className="secondary" onClick={() => setNewsImport(true)}>Excel-dən yüklə</button><button type="button" className="primary" onClick={() => setEdit({ title: "", body: "", audience: "", pinned: false, notify: true })}>+ Elan</button></div>
      {news?.items.map((n) => (
        <div key={n.id} className="bank-batch">
          <div className="bank-batch-head">
            <div><b>{n.pinned ? "📌 " : ""}{n.title}</b> <small className="skill-description">{dmy(n.created.slice(0, 10))} · {n.author}{n.audience ? ` · ${n.audience}` : " · hamı"}{n.expires ? ` · ${dmy(n.expires)}-dək` : ""}</small><p>{n.body}</p></div>
            <button type="button" className="danger" onClick={() => window.confirm("Elan silinsin?") && void run(notify, loadNews, "company/announcements/delete", { id: n.id })}>Sil</button>
          </div>
          <small className="skill-description">Oxuyub: {n.reach.read} / {n.reach.total}{n.requiresAck ? ` · təsdiq edib: ${n.reach.acked} / ${n.reach.total}` : ""}{n.requiresAck && n.reach.waiting.length > 0 ? ` · gözləyən: ${n.reach.waiting.slice(0, 8).join(", ")}${n.reach.waiting.length > 8 ? "…" : ""}` : ""}</small>
          {n.allowComments && (
            <div className="offer-composer">
              {n.comments.map((c) => (
                <small key={c.id} className="skill-description">{c.author}: {c.body} <button type="button" className="text-button" onClick={() => void run(notify, loadNews, "company/announcements/comment", { id: n.id, commentId: c.id, remove: true })}>sil</button></small>
              ))}
              <input aria-label="Cavab" placeholder="Şərhə cavab yazın və Enter basın" maxLength={600} onKeyDown={(e) => { const el = e.currentTarget; if (e.key === "Enter" && el.value.trim().length >= 2) { const body = el.value.trim(); el.value = ""; void run(notify, loadNews, "company/announcements/comment", { id: n.id, body }, "Cavab yazıldı."); } }} />
            </div>
          )}
        </div>
      ))}
      {news && !news.items.length && <p className="muted">Elan yoxdur.</p>}
      <div className="section-heading"><h4>Sorğular</h4>
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => setSurvey({ title: "İşçi bağlılığı sorğusu (eNPS)", kind: "enps", anonymous: true, questions: [] })}>+ eNPS sorğusu</button>
          <button type="button" className="primary" onClick={() => setSurvey({ title: "", kind: "custom", anonymous: true, questions: [{ label: "", kind: "scale5" }] })}>+ Öz sorğum</button>
        </div>
      </div>
      {surveys && surveys.surveys.filter((sv) => sv.enps && sv.enps.count > 0).length > 1 && (
        <p className="muted"><b>eNPS dinamikası:</b> {[...surveys.surveys].filter((sv) => sv.enps && sv.enps.count > 0).sort((a, b) => a.created.localeCompare(b.created)).map((sv) => `${dmy(sv.created.slice(0, 10))}: ${sv.enps!.score} (${sv.enps!.count} cavab)`).join(" → ")}</p>
      )}
      {surveys?.surveys.map((sv) => (
        <div key={sv.id} className="bank-batch">
          <div className="bank-batch-head">
            <div><b>{sv.title}</b> <small className="skill-description">{sv.status === "open" ? "açıq" : "bağlı"} · {sv.anonymous ? "anonim" : "adlı"} · {sv.responses} / {surveys.employees} cavab{sv.repeatMonths ? ` · ${sv.repeatMonths === 12 ? "ildə bir dəfə" : `hər ${sv.repeatMonths} ayda`} təkrarlanır` : ""}</small></div>
            <button type="button" onClick={() => void run(notify, loadSurveys, "company/surveys/close", { id: sv.id, reopen: sv.status !== "open" })}>{sv.status === "open" ? "Bağla" : "Yenidən aç"}</button>
          </div>
          {sv.enps && sv.enps.count > 0 && <p>eNPS: <b>{sv.enps.score}</b> (tərəfdar {sv.enps.promoters}, neytral {sv.enps.passives}, tənqidçi {sv.enps.detractors}){sv.byDepartment.length > 0 && ` · ${sv.byDepartment.map((d) => `${d.department}: ${d.score}`).join(", ")}`}</p>}
          {sv.averages.map((a) => <p key={a.id}>{a.label}: <b>{a.average ?? "—"}</b></p>)}
          {sv.yesno.map((a) => <p key={a.id}>{a.label}: bəli {a.yes}, xeyr {a.no}</p>)}
          {sv.comments.map((c) => c.items.length > 0 && <details key={c.id}><summary>{c.label} ({c.items.length})</summary><ul>{c.items.map((t, i) => <li key={i}>{t}</li>)}</ul></details>)}
          {sv.responses > 0 && sv.responses < 5 && <small className="muted">Anonimliyi qorumaq üçün şərhlər və departament bölgüsü 5 cavabdan sonra göstərilir.</small>}
        </div>
      ))}
      {newsImport && <SheetImport kind="announcements" notify={notify} onClose={() => setNewsImport(false)} onDone={loadNews} />}
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
            <label className="check"><input type="checkbox" checked={edit.allowComments === true} onChange={(e) => setEdit({ ...edit, allowComments: e.target.checked })} /> İşçilər şərh yaza bilsin</label>
            <label className="check"><input type="checkbox" checked={edit.requiresAck === true} onChange={(e) => setEdit({ ...edit, requiresAck: e.target.checked })} /> İşçilər oxuduğunu təsdiq etsin (əmr, qayda, təlimat üçün)</label>
            <label className="check"><input type="checkbox" checked={edit.notify === true} onChange={(e) => setEdit({ ...edit, notify: e.target.checked })} /> İşçilərə bildiriş göndər</label>
            <button type="button" className="primary" onClick={async () => { if (await run(notify, loadNews, "company/announcements/save", edit, "Elan yayımlandı.")) setEdit(null); }}>Yayımla</button>
          </div>
        </Modal>
      )}
      {survey && (
        <Modal title="Yeni sorğu" onClose={() => setSurvey(null)}>
          <div className="offer-composer">
            <Field label="Ad"><input value={survey.title} onChange={(e) => setSurvey({ ...survey, title: e.target.value })} /></Field>
            <Field label="Təkrarlansın">
              <select value={survey.repeatMonths || 0} onChange={(e) => setSurvey({ ...survey, repeatMonths: Number(e.target.value) })}>
                <option value={0}>Bir dəfə</option>
                <option value={1}>Hər ay</option>
                <option value={3}>Hər 3 ayda</option>
                <option value={6}>Hər 6 ayda</option>
                <option value={12}>İldə bir dəfə</option>
              </select>
            </Field>
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

function ParticipantResult({ training, p, notify, onChanged }: { training: Training; p: Training["participants"][number]; notify: Notify; onChanged: () => void }) {
  const [status, setStatus] = useState(p.status);
  const [certificate, setCertificate] = useState(p.certificateNo);
  const [completedOn, setCompletedOn] = useState(p.completedOn);
  const [bondMonths, setBondMonths] = useState(p.bondMonths);
  const [bondCost, setBondCost] = useState(p.bondCost);
  return (
    <div className="bank-account">
      <span>{p.name}</span>
      <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={`${p.name}: vəziyyət`}>{Object.entries(PSTATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      {status === "completed" && (
        <>
          <input type="date" value={completedOn} onChange={(e) => setCompletedOn(e.target.value)} aria-label="Tamamlama tarixi" />
          <input placeholder="Sertifikat №" value={certificate} maxLength={60} onChange={(e) => setCertificate(e.target.value)} aria-label="Sertifikat nömrəsi" />
          <input type="number" min={0} max={120} placeholder="Öhdəlik (ay)" value={bondMonths || ""} onChange={(e) => setBondMonths(Number(e.target.value))} aria-label="Təlimdən sonra işləmə öhdəliyi (ay)" style={{ maxWidth: 110 }} />
          <input type="number" min={0} placeholder="Təlim xərci" value={bondCost || ""} onChange={(e) => setBondCost(Number(e.target.value))} aria-label="Öhdəlik pozulanda qaytarılan xərc (AZN)" style={{ maxWidth: 110 }} />
        </>
      )}
      <button type="button" onClick={() => void run(notify, onChanged, "company/training/result", { trainingId: training.id, employeeId: p.employeeId, status, result: p.result, certificateNo: certificate, completedOn, bondMonths, bondCost }, "Saxlanıldı.")}>Saxla</button>
      {p.validUntil && <small className="skill-description">Etibarlıdır: {dmy(p.validUntil)}-dək</small>}
      {p.bondUntil && <small className="skill-description">İşləmə öhdəliyi: {dmy(p.bondUntil)}-dək{p.bondCost ? ` (pozulanda ${azn(p.bondCost)})` : ""}</small>}
    </div>
  );
}

type Meeting = { id: string; day: string; topics: string; decisions: string; nextStep: string; shared: boolean; authorKind: string; author: string };
// HR keeps the notes of one-to-one meetings; a note can be hidden from the employee.
function OneOnOneModal({ person, notify, onClose }: { person: { id: string; name: string }; notify: Notify; onClose: () => void }) {
  const [data, load] = useLoad<{ items: Meeting[] }>(`company/one-on-ones?employeeId=${person.id}`, notify);
  const [form, setForm] = useState({ day: new Date().toISOString().slice(0, 10), topics: "", decisions: "", nextStep: "", shared: true });
  return (
    <Modal title={`1:1 görüşlər: ${person.name}`} onClose={onClose}>
      <div className="offer-composer">
        <div className="form-grid">
          <Field label="Tarix"><input type="date" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })} /></Field>
          <Field label="Mövzular"><input value={form.topics} maxLength={2000} onChange={(e) => setForm({ ...form, topics: e.target.value })} /></Field>
          <Field label="Qərarlar"><input value={form.decisions} maxLength={2000} onChange={(e) => setForm({ ...form, decisions: e.target.value })} /></Field>
          <Field label="Növbəti addım"><input value={form.nextStep} maxLength={500} onChange={(e) => setForm({ ...form, nextStep: e.target.value })} /></Field>
        </div>
        <label className="check"><input type="checkbox" checked={form.shared} onChange={(e) => setForm({ ...form, shared: e.target.checked })} /> İşçi görsün</label>
        <button type="button" className="primary" disabled={form.topics.trim().length < 3} onClick={async () => { if (await run(notify, load, "company/one-on-ones/save", { employeeId: person.id, ...form }, "Qeyd saxlanıldı.")) setForm({ ...form, topics: "", decisions: "", nextStep: "" }); }}>Saxla</button>
        {data?.items.map((n) => (
          <div key={n.id} className="bank-batch">
            <b>{dmy(n.day)}</b> <small className="skill-description">{n.author} ({n.authorKind === "manager" ? "rəhbər" : "HR"}){n.shared ? "" : " · yalnız rəhbərlər görür"}</small>
            <p>{n.topics}</p>{n.decisions && <p><b>Qərar:</b> {n.decisions}</p>}{n.nextStep && <p><b>Növbəti:</b> {n.nextStep}</p>}
            <button type="button" className="danger" onClick={() => window.confirm("Qeyd silinsin?") && void run(notify, load, "company/one-on-ones/delete", { id: n.id })}>Sil</button>
          </div>
        ))}
        {data && !data.items.length && <p className="muted">Qeyd yoxdur.</p>}
      </div>
    </Modal>
  );
}

// ---------- Skill matrix ----------
const LEVELS = ["—", "başlanğıc", "işləyə bilir", "yaxşı", "ekspert"];
type MatrixData = { trainings?: { id: string; title: string; start: string; skillId: string; level: number }[]; employees: { id: string; name: string; position: string; department: string }[]; skills: { id: string; name: string }[]; cells: { employeeId: string; skillId: string; level: number; target: number }[] };
// Who can do what: a level from 0 to 4 for each skill, against the level the job needs.
export function SkillMatrix({ notify }: { notify: Notify }) {
  const [data, load] = useLoad<MatrixData>("company/skill-matrix", notify);
  const [name, setName] = useState("");
  const [importing, setImporting] = useState(false);
  const [found, setFound] = useState<{ id: string; label: string; category: string }[]>([]);
  // Skills are picked from the platform catalog (the one the admin panel keeps): the box offers matches while typing.
  useEffect(() => {
    if (name.trim().length < 2) return;
    let live = true;
    const timer = window.setTimeout(() => {
      fetch(`/api/joblink/company/skill-matrix/catalog?q=${encodeURIComponent(name.trim())}`, { credentials: "same-origin", cache: "no-store" })
        .then((r) => r.json() as Promise<{ items?: { id: string; label: string; category: string }[] }>)
        .then((r) => live && setFound(r.items || []))
        .catch(() => live && setFound([]));
    }, 180);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [name, data?.skills.length]);
  const offered = name.trim().length >= 2 ? found : [];
  async function addSkill(label: string) {
    if (await run(notify, load, "company/skill-matrix/skill", { name: label }, "Bacarıq əlavə olundu.")) {
      setName("");
      setFound([]);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  const cell = (e: string, s: string) => data.cells.find((c) => c.employeeId === e && c.skillId === s) || { level: 0, target: 0 };
  const gaps = data.cells.filter((c) => c.target > c.level).length;
  const set = (employeeId: string, skillId: string, patch: { level?: number; target?: number }) => void run(notify, load, "company/skill-matrix/set", { employeeId, skillId, ...patch });
  return (
    <div className="company-page">
      {importing && <SheetImport kind="skillmatrix" notify={notify} onClose={() => setImporting(false)} onDone={load} />}
      <div className="section-heading">
        <div className="admin-actions" style={{ position: "relative", flexWrap: "wrap" }}>
          <input className="search-input" aria-label="Bacarıq axtar" placeholder="Bacarıq axtar: kataloq və ESCO (məs. Excel, forklift, xidmət)" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
          <button type="button" className="secondary" onClick={() => setImporting(true)}>Excel-dən yüklə</button>
          {offered.length > 0 && (
            <div className="panel" role="listbox" aria-label="Kataloqdan uyğun bacarıqlar" style={{ position: "absolute", top: "100%", left: 0, zIndex: 5, minWidth: 320, maxHeight: 260, overflowY: "auto" }}>
              {offered.map((f) => (
                <button key={f.id} type="button" role="option" aria-selected={false} className="ghost" style={{ display: "block", width: "100%", textAlign: "left" }} onClick={() => void addSkill(f.label)}>
                  {f.label} <small className="skill-description">{f.category === "ESCO" || f.category === "O*NET" ? `${f.category} (ingiliscə ad)` : f.category}</small>
                </button>
              ))}
            </div>
          )}
          {name.trim().length >= 2 && offered.length === 0 && <small className="skill-description">Tapılmadı: bacarıqlar yalnız admin panelindəki kataloqdan və ESCO siyahısından seçilir.</small>}
        </div>
        <p className="muted">{data.skills.length ? `${gaps} xanada səviyyə hədəfdən aşağıdır (qırmızı).` : "Əvvəl bu vəzifələr üçün vacib bacarıqları kataloqdan seçin və ya Excel faylı yükləyin."}</p>
      </div>
      {data.skills.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>İşçi</th>{data.skills.map((s) => <th key={s.id}>{s.name} <button type="button" className="text-button" aria-label={`${s.name} sil`} onClick={() => window.confirm(`«${s.name}» bacarığı bütün işçilərdən silinsin?`) && void run(notify, load, "company/skill-matrix/skill/delete", { id: s.id })}>×</button></th>)}</tr>
            </thead>
            <tbody>
              {data.employees.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b><small className="skill-description">{[p.position, p.department].filter(Boolean).join(" · ")}</small></td>
                  {data.skills.map((s) => {
                    const c = cell(p.id, s.id);
                    return (
                      <td key={s.id} style={c.target > c.level ? { background: "#ffd4d4" } : undefined}>
                        <select aria-label={`${p.name}: ${s.name} səviyyə`} value={c.level} onChange={(e) => set(p.id, s.id, { level: Number(e.target.value) })}>{LEVELS.map((l, i) => <option key={l} value={i}>{l}</option>)}</select>
                        {c.target > c.level && (data.trainings || []).filter((t) => t.skillId === s.id && t.level >= c.target).slice(0, 1).map((t) => <small key={t.id} className="skill-description" title="Planlaşdırılmış təlim">təlim: {t.title}</small>)}
                        <select aria-label={`${p.name}: ${s.name} hədəf`} value={c.target} onChange={(e) => set(p.id, s.id, { target: Number(e.target.value) })} title="Vəzifənin tələb etdiyi səviyyə">{LEVELS.map((l, i) => <option key={l} value={i}>{i ? `hədəf: ${l}` : "hədəf yoxdur"}</option>)}</select>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Who works in shifts: switch employees over (or back) with the usual shift and rhythm; the same fields are on the employee card.
function ShiftStaffModal({ data, notify, onClose, onDone }: { data: ShiftData; notify: Notify; onClose: () => void; onDone: () => void }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [shift, setShift] = useState(data.types[0]?.name || "");
  const [rhythm, setRhythm] = useState({ work: 5, rest: 2, offset: 0 });
  return (
    <Modal title="Növbəli işçilər" onClose={onClose}>
      <div className="offer-composer">
        <h4>Növbəli rejimə keçir</h4>
        <PeoplePicker people={data.candidates} selected={chosen} onChange={setChosen} label="Növbəli rejimə keçiriləcək işçilər" />
        <div className="form-grid">
          <Field label="Standart növbə"><select value={shift} onChange={(e) => setShift(e.target.value)}>{data.types.map((t) => <option key={t.id} value={t.name}>{t.name} {t.start}–{t.end}</option>)}</select></Field>
          <Field label="Ardıcıl iş günü"><input type="number" min={1} max={14} value={rhythm.work} onChange={(e) => setRhythm({ ...rhythm, work: Number(e.target.value) })} /></Field>
          <Field label="Ardıcıl istirahət günü"><input type="number" min={0} max={14} value={rhythm.rest} onChange={(e) => setRhythm({ ...rhythm, rest: Number(e.target.value) })} /></Field>
          <Field label="Ritm neçənci gündən başlasın (0 = birinci)"><input type="number" min={0} max={27} value={rhythm.offset} onChange={(e) => setRhythm({ ...rhythm, offset: Number(e.target.value) })} /></Field>
        </div>
        <button type="button" className="primary" disabled={!chosen.length} onClick={async () => { if (await runChunked(notify, onDone, "company/shifts/staff", chosen, { shiftWork: true, shiftDefault: shift, work: rhythm.work, rest: rhythm.rest, offset: rhythm.offset }, "İşçilər növbəli rejimə keçirildi.")) onClose(); }}>Növbəli rejimə keçir</button>
        {data.employees.length > 0 && (
          <>
            <h4>Növbəli rejimdən çıxar (adi iş rejiminə qaytar)</h4>
            <PeoplePicker people={data.employees.map((p) => ({ id: p.id, name: p.name, department: p.department, position: p.usual ? `${p.usual} ${p.work}/${p.rest}` : "" }))} selected={leaving} onChange={setLeaving} height={180} label="Adi rejimə qaytarılacaq işçilər" />
            <button type="button" className="secondary" disabled={!leaving.length} onClick={async () => { if (window.confirm(`${leaving.length} işçi adi iş rejiminə qaytarılsın? Növbə cədvəlindən çıxırlar, mövcud növbələri qalır.`) && (await runChunked(notify, onDone, "company/shifts/staff", leaving, { shiftWork: false }, "Adi rejimə qaytarıldı."))) { setLeaving([]); onClose(); } }}>Adi rejimə qaytar</button>
          </>
        )}
      </div>
    </Modal>
  );
}
