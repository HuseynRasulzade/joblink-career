"use client";
import { useCallback, useEffect, useState } from "react";
import { CalendarClock, CalendarPlus, Check, X } from "lucide-react";
import type { Application } from "@/lib/model";
import { ACTIVE_INTERVIEW, INTERVIEW_KINDS, bakuLocal, type InterviewKind } from "@/lib/interviews";
import { Field, Modal } from "./components";

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
export function InterviewsPage({ notify }: { notify: Notify }) {
  const [items, setItems] = useState<InterviewItem[] | null>(null);
  const [labels, setLabels] = useState<Labels>({});
  const [editing, setEditing] = useState<InterviewItem | null>(null);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [fb, setFb] = useState({ rating: 4, decision: "hold", feedback: "" });
  const load = useCallback(() => {
    request<{ interviews: InterviewItem[]; statusLabels: Labels }>("hr/interviews")
      .then((d) => {
        setItems(d.interviews);
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
  const upcoming = items.filter((i) => isActive(i.status) && Date.parse(i.scheduled_at) > now - 15 * 60000);
  const rest = items.filter((i) => !upcoming.includes(i)).reverse();
  const row = (i: InterviewItem) => {
    const past = Date.parse(i.scheduled_at) <= now + 15 * 60000;
    return (
      <article key={i.id} className="panel">
        <div className="section-heading">
          <div>
            <h3>{i.candidate || "Namizəd"} — {i.job_title}</h3>
            <p>{when(i.scheduled_at)} (Bakı) · {i.duration_min} dəq · {kindLabel(i.kind)}{i.location ? `: ${i.location}` : ""}</p>
            {i.candidate_note && <p className="muted">Namizəd yazdı: “{i.candidate_note}”</p>}
          </div>
          <span className={`admin-status ${i.status === "confirmed" || i.status === "completed" ? "active" : i.status === "scheduled" ? "paused" : "archived"}`}>{labels[i.status] || i.status}</span>
        </div>
        <div className="admin-actions">
          {isActive(i.status) && !past && <button onClick={() => setEditing(i)}>Vaxtı dəyiş</button>}
          {i.status === "declined" && <button className="primary" onClick={() => setEditing(i)}>Yeni vaxt təklif et</button>}
          {isActive(i.status) && !past && <button onClick={() => { const reason = window.prompt("Ləğv səbəbi (namizədə göndəriləcək, istəyə bağlı):") ; if (reason !== null) void act({ id: i.id, action: "cancel", reason }, "Müsahibə ləğv edildi."); }}>Ləğv et</button>}
          {isActive(i.status) && past && <button className="primary" onClick={() => act({ id: i.id, action: "complete" }, "Müsahibə keçirilmiş kimi qeyd edildi.")}><Check size={14} /> Keçirildi</button>}
          {isActive(i.status) && past && <button onClick={() => act({ id: i.id, action: "no_show" }, "Namizəd gəlmədi kimi qeyd edildi.")}><X size={14} /> Gəlmədi</button>}
          {i.status === "completed" && <button onClick={() => { setFeedbackFor(feedbackFor === i.id ? null : i.id); setFb({ rating: i.rating || 4, decision: i.decision || "hold", feedback: i.feedback || "" }); }}>{i.rating ? "Rəyi dəyiş" : "Rəy yaz"}</button>}
          <a className="secondary" href={`/api/joblink/hr/interviews/ics?id=${encodeURIComponent(i.id)}`}><CalendarPlus size={14} /> Təqvimə əlavə et</a>
        </div>
        {i.status === "completed" && i.rating ? (
          <p className="muted fine-print">Rəy: {i.rating}/5 · {i.decision === "advance" ? "növbəti mərhələyə keçsin" : i.decision === "reject" ? "uyğun deyil" : "qərar gözlənilir"}{i.feedback ? ` · ${i.feedback}` : ""}</p>
        ) : null}
        {feedbackFor === i.id && (
          <div className="offer-composer">
            <div className="form-grid">
              <Field label="Qiymət (1–5)">
                <select value={fb.rating} onChange={(e) => setFb({ ...fb, rating: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
              </Field>
              <Field label="Tövsiyə">
                <select value={fb.decision} onChange={(e) => setFb({ ...fb, decision: e.target.value })}>
                  <option value="advance">Növbəti mərhələyə keçsin</option>
                  <option value="hold">Qərar sonra</option>
                  <option value="reject">Uyğun deyil</option>
                </select>
              </Field>
            </div>
            <Field label="Rəy (daxilidir, namizəd görmür)">
              <textarea rows={3} value={fb.feedback} onChange={(e) => setFb({ ...fb, feedback: e.target.value })} />
            </Field>
            <p className="muted fine-print">Rəy tövsiyədir, statusu avtomatik dəyişmir. Qərarı pipeline-da özünüz verirsiniz.</p>
            <button className="primary" onClick={() => sendFeedback(i.id)}>Rəyi saxla</button>
          </div>
        )}
      </article>
    );
  };
  return (
    <div className="company-page">
      <p className="muted">Müsahibəni “Namizədlər” bölməsində pipeline kartındakı təqvim düyməsi ilə təyin edirsiniz. Namizəd təsdiq edir və ya imtina edir, müsahibədən əvvəl xatırlatma gəlir.</p>
      <h3>Gələcək müsahibələr</h3>
      {upcoming.map(row)}
      {!upcoming.length && <p className="admin-empty">Planlaşdırılmış müsahibə yoxdur.</p>}
      {rest.length > 0 && <h3>Keçmiş və bağlanmış</h3>}
      {rest.map(row)}
      {editing && <ScheduleInterviewModal existing={editing} onClose={() => setEditing(null)} onDone={load} notify={notify} />}
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
  async function respond(i: InterviewItem, action: "confirm" | "decline") {
    let note = "";
    if (action === "decline") {
      const typed = window.prompt("İmtina səbəbi və ya sizə uyğun yeni vaxt (istəyə bağlı):");
      if (typed === null) return;
      note = typed;
    }
    try {
      await request("interviews/respond", { id: i.id, action, note });
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
            <small>{when(i.scheduled_at)} (Bakı vaxtı) · {i.duration_min} dəq · {kindLabel(i.kind)}{i.location ? `: ${i.location}` : ""}</small>
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
