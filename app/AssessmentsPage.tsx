"use client";
import { useEffect, useState } from "react";
import { ClipboardCheck, FileText, History, Plus, Trash2, X } from "lucide-react";
import type { Application, Job } from "@/lib/model";
import type { Question, QuestionType } from "@/lib/assessments";
import { Field, Modal } from "./components";
import { formatDate } from "@/lib/dates";
import { siteLanguage } from "./i18n";

type Summary = {
  id: string;
  job_id: string;
  job_title: string;
  title: string;
  duration_min: number;
  passing_score: number;
  question_count: number;
  has_attachment: number;
  assigned: number;
  submitted: number;
  updated: string;
};
type Detail = {
  assessment: {
    id: string;
    job_id: string;
    title: string;
    instructions: string;
    duration_min: number;
    passing_score: number;
    questions: Question[];
    attachment_name: string;
    attachment_type: string;
  };
  revisions: { action: string; reason: string; summary: string; created: string; actor_name: string }[];
  assignments: {
    id: string;
    status: string;
    candidate_name: string;
    assigned_at: string;
    submitted_at: string;
    score: number;
    max_score: number;
    late: number;
    violations: { type: string; at: string }[];
    answers: Record<string, unknown>;
  }[];
};
type Draft = {
  id: string;
  title: string;
  instructions: string;
  durationMin: number;
  passingScore: number;
  jobId: string;
  questions: Question[];
  attachment?: { name: string; type: string; data: string };
  removeAttachment?: boolean;
  attachmentName: string;
  reason: string;
};
const VIOLATIONS: Record<string, string> = {
  "tab-hidden": "Səhifədən çıxdı / tab dəyişdi",
  blur: "Pəncərədən kənara keçdi",
  "fullscreen-exit": "Tam ekrandan çıxdı",
  copy: "Kopyalama cəhdi",
  paste: "Yapışdırma cəhdi",
  "context-menu": "Sağ klik",
  "print-screen": "Ekran şəkli düyməsi",
  "camera-off": "Kamera bağlandı",
  "devtools-key": "Qadağan olunmuş düymə",
};
const blankQuestion = (): Question => ({ id: crypto.randomUUID().slice(0, 8), type: "single", text: "", options: ["", ""], correct: [0], points: 1 });

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

// Employer tests: build, edit with a recorded reason, assign, review results.
export default function AssessmentsPage({ notify }: { notify: (message: string) => void }) {
  const [list, setList] = useState<Summary[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [tests, hr] = await Promise.all([request<{ assessments: Summary[] }>("hr/assessments"), request<{ jobs: Job[] }>("hr")]);
      setList(tests.assessments);
      setJobs(hr.jobs);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  async function open(id: string) {
    try {
      setDetail(await request<Detail>(`hr/assessment?id=${encodeURIComponent(id)}`));
      setDraft(null);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function edit(d: Detail) {
    setDraft({
      id: d.assessment.id,
      title: d.assessment.title,
      instructions: d.assessment.instructions,
      durationMin: d.assessment.duration_min,
      passingScore: d.assessment.passing_score,
      jobId: d.assessment.job_id,
      questions: d.assessment.questions,
      attachmentName: d.assessment.attachment_name,
      reason: "",
    });
  }
  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const result = await request<{ id: string }>("hr/assessments/save", draft);
      notify(draft.id ? "Test yeniləndi; dəyişiklik tarixçəyə yazıldı." : "Test yaradıldı.");
      setDraft(null);
      await load();
      await open(result.id);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const setQuestion = (index: number, patch: Partial<Question>) =>
    draft && setDraft({ ...draft, questions: draft.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)) });

  return (
    <div className="assessments-page">
      <aside className="conversation-list">
        <button
          type="button"
          className="primary conversation-new"
          onClick={() => {
            setDetail(null);
            setDraft({ id: "", title: "", instructions: "", durationMin: 30, passingScore: 60, jobId: jobs[0]?.id || "", questions: [blankQuestion()], attachmentName: "", reason: "" });
          }}
        >
          <Plus size={16} /> Yeni test
        </button>
        <nav aria-label="Testlər">
          {list.map((item) => (
            <div key={item.id} className={`conversation-item ${detail?.assessment.id === item.id ? "active" : ""}`}>
              <button type="button" className="conversation-open" onClick={() => open(item.id)}>
                <strong>{item.title}</strong>
                <small>{item.job_title || "Ümumi"} · {item.question_count} sual · {item.duration_min} dəq</small>
                <small>{item.submitted}/{item.assigned} təhvil verilib</small>
              </button>
            </div>
          ))}
          {!list.length && <p className="conversation-empty">Hələ test yoxdur.</p>}
        </nav>
      </aside>
      <section className="panel assessment-main">
        {draft ? (
          <div className="assessment-form">
            <h2><ClipboardCheck size={20} /> {draft.id ? "Testi redaktə et" : "Yeni test"}</h2>
            <div className="form-grid">
              <Field label="Testin adı"><input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
              <Field label="Vakansiya">
                <select value={draft.jobId} onChange={(e) => setDraft({ ...draft, jobId: e.target.value })}>
                  <option value="">Ümumi (bütün vakansiyalar)</option>
                  {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
                </select>
              </Field>
              <Field label="Müddət (dəqiqə)"><input type="number" min={5} max={240} value={draft.durationMin} onChange={(e) => setDraft({ ...draft, durationMin: Number(e.target.value) })} /></Field>
              <Field label="Keçid balı (%)"><input type="number" min={0} max={100} value={draft.passingScore} onChange={(e) => setDraft({ ...draft, passingScore: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Təlimat"><textarea rows={3} value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} /></Field>
            <div className="field">
              <span>Test faylı (PDF və ya şəkil, maks. 1 MB — istəyə bağlı)</span>
              {draft.attachmentName && !draft.removeAttachment && !draft.attachment ? (
                <p className="attachment-row">
                  <FileText size={15} /> {draft.attachmentName}
                  <button type="button" className="text-button" onClick={() => setDraft({ ...draft, removeAttachment: true })}>Sil</button>
                </p>
              ) : (
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 1024 * 1024) {
                      notify("Fayl 1 MB-dan böyük olmamalıdır.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                      const data = String(reader.result).split(",")[1] || "";
                      setDraft((d) => (d ? { ...d, attachment: { name: file.name, type: file.type, data }, removeAttachment: false } : d));
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              )}
              <small className="skill-picker-help">Faylı yalnız şirkət hesabı açır; namizəd onu yalnız test vaxtı platformada görür. Hər baxış qeyd olunur.</small>
            </div>
            <h3>Suallar</h3>
            {draft.questions.map((q, index) => (
              <article className="question-card" key={q.id}>
                <div className="question-head">
                  <b>{index + 1}</b>
                  <select value={q.type} onChange={(e) => setQuestion(index, { type: e.target.value as QuestionType, correct: e.target.value === "text" ? [] : [0], options: e.target.value === "text" ? [] : q.options.length ? q.options : ["", ""] })}>
                    <option value="single">Bir düzgün cavab</option>
                    <option value="multiple">Bir neçə düzgün cavab</option>
                    <option value="text">Açıq cavab (əl ilə yoxlanılır)</option>
                  </select>
                  <input type="number" min={1} max={20} value={q.points} aria-label="Bal" onChange={(e) => setQuestion(index, { points: Number(e.target.value) })} />
                  <button type="button" aria-label="Sualı sil" onClick={() => setDraft({ ...draft, questions: draft.questions.filter((_, i) => i !== index) })}><Trash2 size={15} /></button>
                </div>
                <textarea rows={2} placeholder="Sualın mətni" value={q.text} onChange={(e) => setQuestion(index, { text: e.target.value })} />
                {q.type !== "text" && (
                  <div className="question-options">
                    {q.options.map((option, oi) => (
                      <label key={oi}>
                        <input
                          type={q.type === "single" ? "radio" : "checkbox"}
                          name={`correct-${q.id}`}
                          checked={q.correct.includes(oi)}
                          aria-label="Düzgün cavab"
                          onChange={(e) =>
                            setQuestion(index, {
                              correct: q.type === "single" ? [oi] : e.target.checked ? [...q.correct, oi] : q.correct.filter((c) => c !== oi),
                            })
                          }
                        />
                        <input value={option} placeholder={`Variant ${oi + 1}`} onChange={(e) => setQuestion(index, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })} />
                        {q.options.length > 2 && (
                          <button type="button" aria-label="Variantı sil" onClick={() => setQuestion(index, { options: q.options.filter((_, k) => k !== oi), correct: q.correct.filter((c) => c !== oi).map((c) => (c > oi ? c - 1 : c)) })}><X size={13} /></button>
                        )}
                      </label>
                    ))}
                    {q.options.length < 8 && <button type="button" className="text-button" onClick={() => setQuestion(index, { options: [...q.options, ""] })}>+ Variant</button>}
                  </div>
                )}
              </article>
            ))}
            <button type="button" className="secondary" onClick={() => setDraft({ ...draft, questions: [...draft.questions, blankQuestion()] })}><Plus size={14} /> Sual əlavə et</button>
            {draft.id && (
              <Field label="Dəyişikliyin səbəbi (məcburi, tarixçədə saxlanılır)">
                <input value={draft.reason} placeholder="Məsələn: 3-cü sualın cavab variantı düzəldildi" onChange={(e) => setDraft({ ...draft, reason: e.target.value })} />
              </Field>
            )}
            <div className="cv-rewrite-actions">
              <button type="button" className="secondary" onClick={() => setDraft(null)}>Ləğv et</button>
              <button type="button" className="primary" disabled={busy || !draft.title.trim() || (!!draft.id && draft.reason.trim().length < 5)} onClick={save}>Yadda saxla</button>
            </div>
          </div>
        ) : detail ? (
          <div className="assessment-detail">
            <div className="section-heading">
              <div>
                <h2>{detail.assessment.title}</h2>
                <p>{detail.assessment.questions.length} sual · {detail.assessment.duration_min} dəqiqə · keçid balı {detail.assessment.passing_score}%</p>
              </div>
              <div className="admin-actions">
                {detail.assessment.attachment_name && (
                  <a className="secondary" href={`/api/joblink/hr/assessment-file?id=${encodeURIComponent(detail.assessment.id)}`} target="_blank" rel="noreferrer">
                    <FileText size={14} /> Fayla bax
                  </a>
                )}
                <button onClick={() => edit(detail)}>Redaktə et</button>
                {!detail.assignments.length && (
                  <button
                    onClick={async () => {
                      if (!window.confirm("Test silinsin?")) return;
                      try {
                        await request("hr/assessments/delete", { id: detail.assessment.id });
                        setDetail(null);
                        await load();
                      } catch (error) {
                        notify((error as Error).message);
                      }
                    }}
                  >
                    Sil
                  </button>
                )}
              </div>
            </div>
            <h3>Nəticələr</h3>
            <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Namizəd</th><th>Status</th><th>Bal</th><th>Pozuntular</th><th>Təhvil</th></tr></thead><tbody>
              {detail.assignments.map((a) => {
                const percent = a.max_score ? Math.round((a.score / a.max_score) * 100) : null;
                return (
                  <tr key={a.id}>
                    <td><strong>{a.candidate_name}</strong></td>
                    <td><span className={`admin-status ${a.status === "submitted" ? "active" : a.status === "started" ? "paused" : "archived"}`}>{a.status === "submitted" ? "Təhvil verilib" : a.status === "started" ? "Davam edir" : "Göndərilib"}</span>{a.late ? <small className="skill-description">gecikmə ilə</small> : null}</td>
                    <td>{percent === null ? "—" : <b className={percent >= detail.assessment.passing_score ? "compare-best" : ""}>{a.score}/{a.max_score} ({percent}%)</b>}</td>
                    <td>
                      {a.violations.length ? (
                        <details>
                          <summary>{a.violations.length} qeyd</summary>
                          <ul className="violation-list">{a.violations.map((v, i) => <li key={i}>{formatDate(v.at, siteLanguage(), { year: false, time: true })} — {VIOLATIONS[v.type] || v.type}</li>)}</ul>
                        </details>
                      ) : "Yoxdur"}
                    </td>
                    <td>
                      {a.submitted_at ? formatDate(a.submitted_at, siteLanguage(), { time: true }) : "—"}
                      {detail.assessment.questions.some((q) => q.type === "text") && a.status === "submitted" && (
                        <details>
                          <summary>Açıq cavablar</summary>
                          {detail.assessment.questions.filter((q) => q.type === "text").map((q) => <p key={q.id}><b>{q.text}</b><br />{String(a.answers[q.id] || "—")}</p>)}
                        </details>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!detail.assignments.length && <tr><td colSpan={5}><p className="admin-empty">Test hələ namizədə göndərilməyib. Pipeline-da namizəd kartından “Test göndər” seçin.</p></td></tr>}
            </tbody></table></div>
            <h3><History size={16} /> Dəyişiklik tarixçəsi</h3>
            <ol className="event-timeline">
              {detail.revisions.map((r, i) => (
                <li key={i}>
                  <time>{formatDate(r.created, siteLanguage(), { time: true })}</time>
                  <span>{r.action === "created" ? "Yaradıldı" : r.action === "file-viewed" ? "Fayla baxıldı" : "Dəyişdirildi"}{r.summary ? ` — ${r.summary}` : ""}</span>
                  {r.reason && <small>Səbəb: {r.reason}</small>}
                  <small>{r.actor_name}</small>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="assistant-intro">
            <div className="assistant-icon"><ClipboardCheck size={25} /></div>
            <h2>Testlər və imtahanlar</h2>
            <p>Vakansiyaya uyğun test hazırlayın, namizədə göndərin və nəticəni burada görün. Test zamanı kamera və mikrofon açıq olmalıdır; səhifədən çıxmaq və kopyalama cəhdləri qeyd olunur.</p>
          </div>
        )}
      </section>
    </div>
  );
}

// Employer: pick one of the company's tests and send it to an applicant.
export function AssignTestModal({ application, onClose, notify }: { application: Application; onClose: () => void; notify: (message: string) => void }) {
  const [list, setList] = useState<Summary[] | null>(null);
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    request<{ assessments: Summary[] }>("hr/assessments")
      .then((data) => {
        const relevant = data.assessments.filter((a) => !a.job_id || a.job_id === application.jobId);
        setList(relevant);
        setChoice(relevant[0]?.id || "");
      })
      .catch((error) => notify((error as Error).message));
  }, [application.jobId, notify]);
  async function send() {
    setBusy(true);
    try {
      await request("hr/assessments/assign", { assessmentId: choice, applicationId: application.id });
      notify("Test namizədə göndərildi.");
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Test göndər — ${application.profile.name}`} onClose={onClose}>
      {list === null ? (
        <p className="muted">Yüklənir…</p>
      ) : list.length ? (
        <div className="offer-composer">
          <Field label="Test">
            <select value={choice} onChange={(e) => setChoice(e.target.value)}>
              {list.map((a) => <option key={a.id} value={a.id}>{a.title} · {a.question_count} sual · {a.duration_min} dəq</option>)}
            </select>
          </Field>
          <p className="muted fine-print">Namizəd testi “Müraciətlərim” bölməsində görəcək. Vaxt namizəd testi başlatdığı andan sayılır.</p>
          <button className="primary" disabled={busy || !choice} onClick={send}><ClipboardCheck size={16} /> Göndər</button>
        </div>
      ) : (
        <p className="muted">Bu vakansiya üçün test yoxdur. Əvvəlcə “Testlər” bölməsində test yaradın.</p>
      )}
    </Modal>
  );
}
