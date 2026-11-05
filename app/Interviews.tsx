"use client";
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CalendarPlus, Check, ClipboardCheck, X } from "lucide-react";
import type { Application } from "@/lib/model";
import { ACTIVE_INTERVIEW, INTERVIEW_KINDS, bakuLocal, type InterviewKind } from "@/lib/interviews";
import { Field, Modal } from "./components";
import { AssignTestModal } from "./AssessmentsPage";

type Notify = (message: string) => void;
export type InterviewItem = {
  id: string;
  application_id?: string;
  scheduled_at: string;
  duration_min: number;
  kind: string;
  location: string;
  note: string;
  status: string;
  candidate_note: string;
  panel?: string;
  slots?: string[];
  job_id?: string;
  job_title: string;
  candidate?: string;
  company?: string;
  rating?: number;
  feedback?: string;
  decision?: string;
};
type Labels = Record<string, string>;

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
const kindLabel = (kind: string) => INTERVIEW_KINDS.find((k) => k.id === kind)?.label || kind;
const when = (iso: string) => bakuLocal(iso);
const isActive = (status: string) => (ACTIVE_INTERVIEW as string[]).includes(status);
// "2026-11-02T10:30:00.000Z" -> the value of a datetime-local input in Baku time.
const toInput = (iso: string) => bakuLocal(iso).replace(" ", "T");

// Employer: schedule an interview for an application, or change an existing one.
export function ScheduleInterviewModal({ application, existing, onClose, onDone, notify }: {
  application?: Application;
  existing?: InterviewItem;
  onClose: () => void;
  onDone: () => void;
  notify: Notify;
}) {
  const [form, setForm] = useState({
    scheduledAt: existing ? toInput(existing.scheduled_at) : "",
    durationMin: existing?.duration_min || 45,
    kind: (existing?.kind || "online") as InterviewKind,
    location: existing?.location || "",
    note: existing?.note || "",
    panel: existing?.panel || "",
    extraSlots: ["", ""],
  });
  const [busy, setBusy] = useState(false);
  const kind = INTERVIEW_KINDS.find((k) => k.id === form.kind)!;
  async function save() {
    setBusy(true);
    try {
      if (existing) await request("hr/interviews/update", { id: existing.id, action: "reschedule", ...form });
      else await request("hr/interviews/create", { applicationId: application!.id, ...form });
      notify(existing ? "Müsahibə vaxtı dəyişdi, namizədə bildiriş göndərildi." : "Müsahibə təyin edildi, namizədə bildiriş göndərildi.");
      onDone();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`${existing ? "Müsahibə vaxtını dəyiş" : "Müsahibə təyin et"} — ${application?.profile.name || existing?.candidate || ""}`} onClose={onClose}>
      <div className="offer-composer">
        <div className="form-grid">
          <Field label="Tarix və saat (Bakı vaxtı)">
            <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
          </Field>
          <Field label="Müddət">
            <select value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}>
              {[15, 30, 45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} dəqiqə</option>)}
            </select>
          </Field>
          <Field label="Format">
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as InterviewKind })}>
              {INTERVIEW_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </Field>
          <Field label={form.kind === "onsite" ? "Ünvan" : form.kind === "online" ? "Görüş linki" : "Telefon (istəyə bağlı)"}>
            <input value={form.location} placeholder={kind.placeholder} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
        </div>
        <Field label="Müsahibə aparanlar (panel, istəyə bağlı)">
          <input value={form.panel} placeholder="Məsələn: Aynur M. (HR), Rəşad Ə. (şöbə rəhbəri)" onChange={(e) => setForm({ ...form, panel: e.target.value })} />
        </Field>
        <div className="form-grid">
          {[0, 1].map((n) => (
            <Field key={n} label={`Alternativ vaxt ${n + 1} (namizəd seçir, istəyə bağlı)`}>
              <input type="datetime-local" value={form.extraSlots[n]} onChange={(e) => setForm({ ...form, extraSlots: form.extraSlots.map((s, k) => (k === n ? e.target.value : s)) })} />
            </Field>
          ))}
        </div>
        <Field label="Namizəd üçün qeyd (istəyə bağlı)">
          <textarea rows={3} value={form.note} placeholder="Məsələn: şəxsiyyət vəsiqəsini götürün" onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
        <p className="muted fine-print">Namizəd bildiriş və e-poçt alır, Müraciətlərim bölməsində təsdiq edir və ya imtina edir. Müsahibədən əvvəl hər iki tərəfə xatırlatma göndərilir.</p>
        <button className="primary" disabled={busy || !form.scheduledAt} onClick={save}><CalendarClock size={16} /> {existing ? "Yadda saxla" : "Təyin et və göndər"}</button>
      </div>
    </Modal>
  );
}

// Employer: all interviews, status, changes and feedback.
// ---------- Interview feedback of all candidates of a vacancy, side by side ----------
type ComparisonRow = {
  applicationId: string;
  candidate: string;
  applicationStatus: string;
  interviews: number;
  rated: number;
  average: number;
  ratings: number[];
  advance: number;
  hold: number;
  reject: number;
  lastDecision: string;
  lastFeedback: string;
};
type ComparisonJob = { jobId: string; jobTitle: string; candidates: ComparisonRow[] };
function FeedbackComparison({ notify }: { notify: Notify }) {
  const [jobs, setJobs] = useState<ComparisonJob[] | null>(null);
  const [jobId, setJobId] = useState("");
  async function show() {
    try {
      const data = await request<{ jobs: ComparisonJob[] }>("hr/interviews/compare");
      setJobs(data.jobs);
      setJobId(data.jobs[0]?.jobId || "");
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const job = jobs?.find((item) => item.jobId === jobId);
  const decisionText = (value: string) =>
    value === "advance" ? "növbəti mərhələyə" : value === "reject" ? "uyğun deyil" : value === "hold" ? "qərar sonra" : "—";
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h3>Rəylərin müqayisəsi</h3>
          <p>Eyni vakansiyaya müsahibə verən namizədlərin rəyləri bir cədvəldə. Yekun qərarı özünüz verirsiniz.</p>
        </div>
        <button className="secondary" onClick={show}>
          {jobs ? "Yenilə" : "Göstər"}
        </button>
      </div>
      {jobs && (
        <>
          {jobs.length > 1 && (
            <Field label="Vakansiya">
              <select value={jobId} onChange={(e) => setJobId(e.target.value)}>
                {jobs.map((item) => (
                  <option key={item.jobId} value={item.jobId}>
                    {item.jobTitle} ({item.candidates.length})
                  </option>
                ))}
              </select>
            </Field>
          )}
          {job ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Namizəd</th>
                    <th>Müsahibə</th>
                    <th>Orta bal</th>
                    <th>Balllar</th>
                    <th>Tövsiyələr</th>
                    <th>Son rəy</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {job.candidates.map((c) => (
                    <tr key={c.applicationId}>
                      <td><strong>{c.candidate || "Namizəd"}</strong></td>
                      <td>{c.interviews}</td>
                      <td>{c.rated ? `${c.average} / 5` : "—"}</td>
                      <td>{c.ratings.join(", ") || "—"}</td>
                      <td>
                        {c.rated ? `Davam ${c.advance} · Gözlə ${c.hold} · Rədd ${c.reject}` : "—"}
                      </td>
                      <td>
                        {decisionText(c.lastDecision)}
                        {c.lastFeedback && <small className="skill-description">{c.lastFeedback}</small>}
                      </td>
                      <td>{c.applicationStatus || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="admin-empty">Hələ müsahibə rəyi yoxdur.</p>
          )}
        </>
      )}
    </section>
  );
}

type Waiting = { application_id: string; job_id: string; candidate_id: string; stage: string; updated: string; candidate: string; job_title: string };
type TestInfo = { status: string; score: number | null; maxScore: number | null; title: string };
type GuideInfo = { name: string; source: "linked" | "matched" | "generated"; questions: string[] };
type Tab = "waiting" | "upcoming" | "feedback" | "past";
const TEST_TEXT: Record<string, string> = { assigned: "göndərilib", started: "davam edir", pending: "yoxlanır", passed: "keçdi", failed: "keçmədi", graded: "yoxlanıb", submitted: "təhvil verilib" };
const GUIDE_SOURCE: Record<GuideInfo["source"], string> = { linked: "Bu vakansiya üçün yazılıb", matched: "Adına görə seçildi", generated: "Vakansiyanın bacarıqlarından avtomatik" };
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");
const initials = (name: string) => (name || "?").trim()[0]?.toLocaleUpperCase("az") || "?";
// A stand-in for the application the existing dialogs ask for (they need only its id, vacancy and name).
const stub = (w: { application_id: string; job_id: string; candidate: string }) =>
  ({ id: w.application_id, jobId: w.job_id, status: "Müsahibə", created: "", profile: { name: w.candidate || "Namizəd", title: "", email: "", phone: "", city: "", summary: "", skills: [], languages: "", certificates: "" } }) as unknown as Application;

export function InterviewsPage({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<InterviewItem[] | null>(null);
  const [waiting, setWaiting] = useState<Waiting[]>([]);
  const [tests, setTests] = useState<Record<string, TestInfo>>({});
  const [guides, setGuides] = useState<Record<string, GuideInfo>>({});
  const [labels, setLabels] = useState<Labels>({});
  const [tab, setTab] = useState<Tab | "">("");
  const [jobFilter, setJobFilter] = useState("");
  const [query, setQuery] = useState("");
  const [scheduling, setScheduling] = useState<Application | null>(null);
  const [editing, setEditing] = useState<InterviewItem | null>(null);
  const [testFor, setTestFor] = useState<Application | null>(null);
  const [openGuide, setOpenGuide] = useState("");
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [fb, setFb] = useState({ rating: 4, decision: "hold", feedback: "" });
  const load = useCallback(() => {
    request<{ interviews: InterviewItem[]; waiting?: Waiting[]; tests?: Record<string, TestInfo>; guides?: Record<string, GuideInfo>; statusLabels: Labels }>("hr/interviews")
      .then((d) => {
        setItems(d.interviews);
        setWaiting(d.waiting || []);
        setTests(d.tests || {});
        setGuides(d.guides || {});
        setLabels(d.statusLabels);
      })
      .catch((error) => notify((error as Error).message));
  }, [notify]);
  useEffect(load, [load]);
  async function act(body: Record<string, unknown>, message: string) {
    try {
      await request("hr/interviews/update", body);
      notify(message);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function sendFeedback(id: string) {
    try {
      await request("hr/interviews/feedback", { id, ...fb });
      notify("Rəy yadda saxlanıldı.");
      setFeedbackFor(null);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!items) return <p className="muted">Yüklənir…</p>;
  const now = Date.now();
  const past = (i: InterviewItem) => Date.parse(i.scheduled_at) <= now + 15 * 60000;
  const upcoming = items.filter((i) => isActive(i.status) && Date.parse(i.scheduled_at) > now - 15 * 60000);
  const needFeedback = items.filter((i) => (isActive(i.status) && !upcoming.includes(i)) || (i.status === "completed" && !i.rating));
  const closed = items.filter((i) => !upcoming.includes(i) && !needFeedback.includes(i)).reverse();
  const needle = query.toLocaleLowerCase("az").trim();
  const keep = (name: string, jobId: string, jobTitle: string) => (!jobFilter || jobId === jobFilter) && (!needle || `${name} ${jobTitle}`.toLocaleLowerCase("az").includes(needle));
  const fItems = (list: InterviewItem[]) => list.filter((i) => keep(i.candidate || "", i.job_id || "", i.job_title));
  const fWaiting = waiting.filter((w) => keep(w.candidate, w.job_id, w.job_title));
  const counts = { waiting: fWaiting.length, upcoming: fItems(upcoming).length, feedback: fItems(needFeedback).length, past: fItems(closed).length };
  const active: Tab = (tab || (counts.waiting ? "waiting" : counts.upcoming ? "upcoming" : counts.feedback ? "feedback" : "waiting")) as Tab;
  const jobs = [...new Map([...waiting.map((w) => [w.job_id, w.job_title] as const), ...items.map((i) => [i.job_id || "", i.job_title] as const)]).entries()].filter(([jid]) => jid);
  const testChip = (appId?: string) => {
    const t = appId ? tests[appId] : undefined;
    if (!t) return null;
    const done = t.status === "passed" || t.status === "failed" || t.status === "graded" || t.status === "submitted";
    return <span className={`iv-chip ${t.status === "passed" ? "good" : t.status === "failed" ? "bad" : ""}`} title={t.title}>Test: {TEST_TEXT[t.status] || t.status}{done && t.score !== null && t.maxScore ? ` · ${t.score}/${t.maxScore}` : ""}</span>;
  };
  const guideBox = (key: string, jobId: string) => {
    const g = guides[jobId];
    if (openGuide !== key || !g) return null;
    return (
      <div className="iv-guide">
        <div className="iv-guide-head"><b>{g.name}</b><span className="iv-chip">{GUIDE_SOURCE[g.source]}</span></div>
        <ol>{g.questions.map((q, n) => <li key={n}>{q}</li>)}</ol>
        <small className="muted">Suallar vakansiyaya görə avtomatik gəlir. Öz suallarınızı yazmaq üçün aşağıda “Müsahibə sualları”nda vakansiya seçin.</small>
      </div>
    );
  };
  const waitingCard = (w: Waiting) => (
    <article key={w.application_id} className="iv-card">
      <div className="iv-avatar" aria-hidden>{initials(w.candidate)}</div>
      <div className="iv-main">
        <h3>{w.candidate || "Namizəd"}</h3>
        <p>{w.job_title}{w.stage ? ` · ${w.stage}` : ""}</p>
        <div className="iv-meta"><span className="iv-chip warn">Vaxt təyin edilməyib</span><span className="muted">Dəvət olunub: {dmy(w.updated)}</span>{testChip(w.application_id)}</div>
        {guideBox(`w:${w.application_id}`, w.job_id)}
      </div>
      <div className="iv-actions">
        <button className="primary" onClick={() => setScheduling(stub(w))}><CalendarClock size={14} /> Vaxt təyin et</button>
        <button className="secondary" onClick={() => setTestFor(stub(w))}><ClipboardCheck size={14} /> Test göndər</button>
        <button className="secondary" onClick={() => setOpenGuide(openGuide === `w:${w.application_id}` ? "" : `w:${w.application_id}`)}>Suallar</button>
      </div>
    </article>
  );
  const interviewCard = (i: InterviewItem) => {
    const jobId = i.job_id || "";
    const isPast = past(i);
    const when_ = when(i.scheduled_at);
    return (
      <article key={i.id} className="iv-card">
        <div className="iv-date" aria-hidden>
          <b>{when_.slice(8, 10)}.{when_.slice(5, 7)}</b>
          <span>{when_.slice(11, 16)}</span>
        </div>
        <div className="iv-main">
          <h3>{i.candidate || "Namizəd"}</h3>
          <p>{i.job_title} · {i.duration_min} dəq · {kindLabel(i.kind)}{i.location ? `: ${i.location}` : ""}</p>
          <div className="iv-meta">
            <span className={`iv-chip ${i.status === "confirmed" || i.status === "completed" ? "good" : i.status === "scheduled" ? "warn" : "bad"}`}>{labels[i.status] || i.status}</span>
            {i.slots?.length && i.status === "scheduled" ? <span className="muted">Variantlar: {i.slots.map(when).join(" / ")}</span> : null}
            {testChip(i.application_id)}
          </div>
          {i.panel && <p className="muted">Müsahibə aparanlar: {i.panel}</p>}
          {i.candidate_note && <p className="muted">Namizəd yazdı: “{i.candidate_note}”</p>}
          {i.status === "completed" && i.rating ? <p className="muted">Rəy: {i.rating}/5 · {i.decision === "advance" ? "növbəti mərhələyə keçsin" : i.decision === "reject" ? "uyğun deyil" : "qərar gözlənilir"}{i.feedback ? ` · ${i.feedback}` : ""}</p> : null}
          {guideBox(`i:${i.id}`, jobId)}
          {feedbackFor === i.id && (
            <div className="offer-composer">
              <div className="form-grid">
                <Field label="Qiymət (1–5)"><select value={fb.rating} onChange={(e) => setFb({ ...fb, rating: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
                <Field label="Tövsiyə">
                  <select value={fb.decision} onChange={(e) => setFb({ ...fb, decision: e.target.value })}>
                    <option value="advance">Növbəti mərhələyə keçsin</option>
                    <option value="hold">Qərar sonra</option>
                    <option value="reject">Uyğun deyil</option>
                  </select>
                </Field>
              </div>
              <Field label="Rəy (daxilidir, namizəd görmür)"><textarea rows={3} value={fb.feedback} onChange={(e) => setFb({ ...fb, feedback: e.target.value })} /></Field>
              <p className="muted fine-print">Rəy tövsiyədir, statusu avtomatik dəyişmir. Qərarı Namizədlər bölməsində özünüz verirsiniz.</p>
              <button className="primary" onClick={() => sendFeedback(i.id)}>Rəyi saxla</button>
            </div>
          )}
        </div>
        <div className="iv-actions">
          {isActive(i.status) && !isPast && <button className="secondary" onClick={() => setEditing(i)}>Vaxtı dəyiş</button>}
          {i.status === "declined" && <button className="primary" onClick={() => setEditing(i)}>Yeni vaxt təklif et</button>}
          {isActive(i.status) && !isPast && <button className="secondary" onClick={() => { const reason = window.prompt("Ləğv səbəbi (namizədə göndəriləcək, istəyə bağlı):"); if (reason !== null) void act({ id: i.id, action: "cancel", reason }, "Müsahibə ləğv edildi, namizədə bildiriş göndərildi."); }}>Ləğv et</button>}
          {isActive(i.status) && isPast && <button className="primary" onClick={() => act({ id: i.id, action: "complete" }, "Müsahibə keçirilmiş kimi qeyd edildi.")}><Check size={14} /> Keçirildi</button>}
          {isActive(i.status) && isPast && <button className="secondary" onClick={() => act({ id: i.id, action: "no_show" }, "Namizəd gəlmədi kimi qeyd edildi.")}><X size={14} /> Gəlmədi</button>}
          {i.status === "completed" && <button className={i.rating ? "secondary" : "primary"} onClick={() => { setFeedbackFor(feedbackFor === i.id ? null : i.id); setFb({ rating: i.rating || 4, decision: i.decision || "hold", feedback: i.feedback || "" }); }}>{i.rating ? "Rəyi dəyiş" : "Rəy yaz"}</button>}
          {i.application_id && <button className="secondary" onClick={() => setTestFor(stub({ application_id: i.application_id as string, job_id: jobId, candidate: i.candidate || "" }))}><ClipboardCheck size={14} /> Test göndər</button>}
          <button className="secondary" onClick={() => setOpenGuide(openGuide === `i:${i.id}` ? "" : `i:${i.id}`)}>Suallar</button>
          <a className="secondary" href={`/api/joblink/hr/interviews/ics?id=${encodeURIComponent(i.id)}`}><CalendarPlus size={14} /> Təqvim</a>
        </div>
      </article>
    );
  };
  const tabs: { id: Tab; label: string; hint: string }[] = [
    { id: "waiting", label: "Vaxt gözləyir", hint: "Dəvət olunub, vaxt təyin edilməyib" },
    { id: "upcoming", label: "Gələcək", hint: "Təyin olunmuş müsahibələr" },
    { id: "feedback", label: "Rəy gözləyir", hint: "Keçib, rəy yazılmayıb" },
    { id: "past", label: "Keçmiş", hint: "Rəy yazılmış və bağlanmış" },
  ];
  return (
    <div className="company-page iv-page">
      <p className="muted">Müsahibəyə dəvət etmək üçün “Namizədlər” bölməsində namizədin yanındakı <b>“Müsahibəyə dəvət et”</b> düyməsini basın: namizəd avtomatik burada “Vaxt gözləyir” siyahısına düşür. Buradan vaxt təyin edir, test göndərir və vakansiyanın suallarını açırsınız.</p>
      <div className="iv-tiles" role="tablist" aria-label="Müsahibə mərhələləri">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={active === t.id} className={`iv-tile ${active === t.id ? "active" : ""}`} onClick={() => setTab(t.id)} title={t.hint}>
            <strong>{counts[t.id]}</strong>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div className="iv-filters">
        <select aria-label="Vakansiya" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)}>
          <option value="">Bütün vakansiyalar</option>
          {jobs.map(([jid, title]) => <option key={jid} value={jid}>{title}</option>)}
        </select>
        <input className="search-input" type="search" aria-label="Namizəd axtar" placeholder="Namizəd və ya vakansiya axtar" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {active === "waiting" && (fWaiting.length ? fWaiting.map(waitingCard) : <p className="admin-empty">Vaxt gözləyən namizəd yoxdur. “Namizədlər” bölməsində namizədi müsahibəyə dəvət edin.</p>)}
      {active === "upcoming" && (fItems(upcoming).length ? fItems(upcoming).map(interviewCard) : <p className="admin-empty">Planlaşdırılmış müsahibə yoxdur.</p>)}
      {active === "feedback" && (fItems(needFeedback).length ? fItems(needFeedback).map(interviewCard) : <p className="admin-empty">Rəy gözləyən müsahibə yoxdur.</p>)}
      {active === "past" && (fItems(closed).length ? fItems(closed).map(interviewCard) : <p className="admin-empty">Keçmiş müsahibə yoxdur.</p>)}
      <InterviewGuides notify={notify} onChanged={load} />
      <FeedbackComparison notify={notify} />
      {scheduling && <ScheduleInterviewModal application={scheduling} onClose={() => setScheduling(null)} onDone={load} notify={notify} />}
      {editing && <ScheduleInterviewModal existing={editing} onClose={() => setEditing(null)} onDone={load} notify={notify} />}
      {testFor && <AssignTestModal application={testFor} onClose={() => { setTestFor(null); load(); }} notify={notify} />}
    </div>
  );
}

// Candidate: invitations and confirmed interviews.
export function CandidateInterviews({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<InterviewItem[]>([]);
  const [labels, setLabels] = useState<Labels>({});
  const load = useCallback(() => {
    request<{ interviews: InterviewItem[]; statusLabels: Labels }>("interviews")
      .then((d) => {
        setItems(d.interviews);
        setLabels(d.statusLabels);
      })
      .catch(() => {});
  }, []);
  useEffect(load, [load]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  async function respond(i: InterviewItem, action: "confirm" | "decline") {
    if (action === "confirm" && i.slots?.length && !picked[i.id]) return notify("Sizə uyğun vaxtı seçin.");
    let note = "";
    if (action === "decline") {
      const typed = window.prompt("İmtina səbəbi və ya sizə uyğun yeni vaxt (istəyə bağlı):");
      if (typed === null) return;
      note = typed;
    }
    try {
      await request("interviews/respond", { id: i.id, action, note, slot: picked[i.id] });
      notify(action === "confirm" ? "Müsahibə təsdiqləndi." : "Şirkətə imtina bildirildi.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const now = Date.now();
  const visible = items.filter((i) => isActive(i.status) || Date.parse(i.scheduled_at) > now - 86400000);
  if (!visible.length) return null;
  return (
    <section className="panel exam-list">
      <h3><CalendarClock size={18} /> Müsahibələr</h3>
      {visible.map((i) => (
        <article key={i.id} className="exam-row">
          <div>
            <strong>{i.company} — {i.job_title}</strong>
            {i.slots?.length && i.status === "scheduled" ? (
              <fieldset className="field">
                <legend>Sizə uyğun vaxtı seçin (Bakı vaxtı)</legend>
                {i.slots.map((s) => (
                  <label key={s}><input type="radio" name={`slot-${i.id}`} checked={picked[i.id] === s} onChange={() => setPicked({ ...picked, [i.id]: s })} /> {when(s)}</label>
                ))}
              </fieldset>
            ) : (
              <small>{when(i.scheduled_at)} (Bakı vaxtı)</small>
            )}
            <small>{i.duration_min} dəq · {kindLabel(i.kind)}{i.location ? `: ${i.location}` : ""}</small>
            {i.panel && <small>Müsahibə aparanlar: {i.panel}</small>}
            {i.note && <small>Qeyd: {i.note}</small>}
            <small>{labels[i.status] || i.status}</small>
          </div>
          <div className="admin-actions">
            {isActive(i.status) && Date.parse(i.scheduled_at) > now && (
              <>
                {i.status === "scheduled" && <button className="primary" onClick={() => respond(i, "confirm")}>Təsdiqlə</button>}
                <button onClick={() => respond(i, "decline")}>İmtina et</button>
              </>
            )}
            <a className="secondary" href={`/api/joblink/interviews/ics?id=${encodeURIComponent(i.id)}`}><CalendarPlus size={14} /> Təqvimə əlavə et</a>
          </div>
        </article>
      ))}
    </section>
  );
}

type Guide = { id: string; name: string; jobId: string; questions: string[] };
// Question lists: write once, link to a vacancy, and the questions open on every interview of that vacancy.
function InterviewGuides({ notify, onChanged }: { notify: Notify; onChanged: () => void }) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [jobs, setJobs] = useState<{ id: string; title: string }[]>([]);
  const [editing, setEditing] = useState<{ id: string; name: string; text: string; jobId: string } | null>(null);
  const load = useCallback(
    () =>
      request<{ templates: Guide[]; jobs?: { id: string; title: string }[] }>("hr/interview-templates")
        .then((d) => {
          setGuides(d.templates);
          setJobs(d.jobs || []);
        })
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const jobName = (id: string) => jobs.find((j) => j.id === id)?.title || "";
  return (
    <details className="panel">
      <summary>
        <b>Müsahibə sualları</b> <small className="muted">· {guides.length} siyahı. Vakansiyaya bağlanan siyahı həmin vakansiyanın müsahibələrində avtomatik açılır</small>
      </summary>
      {guides.map((g) => (
        <details key={g.id}>
          <summary>
            {g.name} <small className="muted">({g.questions.length} sual{g.jobId ? ` · vakansiya: ${jobName(g.jobId) || "—"}` : " · ümumi"})</small>
          </summary>
          <ol>{g.questions.map((q, i) => <li key={i}>{q}</li>)}</ol>
          <div className="admin-actions">
            <button type="button" onClick={() => setEditing({ id: g.id, name: g.name, text: g.questions.join("\n"), jobId: g.jobId })}>Düzəlt</button>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm("Siyahı silinsin?")) return;
                await request("hr/interview-templates/delete", { id: g.id }).catch((e) => notify((e as Error).message));
                await load();
                onChanged();
              }}
            >
              Sil
            </button>
          </div>
        </details>
      ))}
      {!guides.length && !editing && <p className="muted">Hələ öz siyahınız yoxdur. Vakansiya üçün siyahı yazmasanız, suallar vakansiyanın bacarıqlarından avtomatik hazırlanır.</p>}
      {editing ? (
        <div className="offer-composer">
          <Field label="Siyahının adı"><input value={editing.name} placeholder="Məsələn: Baş mühasib — texniki müsahibə" onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
          <Field label="Vakansiya (seçilsə, suallar bu vakansiyanın müsahibələrində avtomatik gəlir)">
            <select value={editing.jobId} onChange={(e) => setEditing({ ...editing, jobId: e.target.value })}>
              <option value="">Ümumi (heç bir vakansiyaya bağlı deyil)</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </Field>
          <Field label="Suallar (hər sətirdə bir sual)"><textarea rows={8} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} /></Field>
          <div className="admin-actions">
            <button
              type="button"
              className="primary"
              onClick={async () => {
                try {
                  await request("hr/interview-templates/save", { id: editing.id, name: editing.name, questions: editing.text, jobId: editing.jobId });
                  setEditing(null);
                  notify("Siyahı saxlanıldı.");
                  await load();
                  onChanged();
                } catch (e) {
                  notify((e as Error).message);
                }
              }}
            >
              Saxla
            </button>
            <button type="button" onClick={() => setEditing(null)}>Ləğv et</button>
          </div>
        </div>
      ) : (
        <button type="button" className="secondary" onClick={() => setEditing({ id: "", name: "", text: "", jobId: "" })}>Yeni siyahı</button>
      )}
    </details>
  );
}
