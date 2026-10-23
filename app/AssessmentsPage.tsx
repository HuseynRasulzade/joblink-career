"use client";
import { Fragment, useEffect, useState } from "react";
import { ClipboardCheck, FileText, History, Plus, Trash2, X } from "lucide-react";
import type { Application, Job } from "@/lib/model";
import type { Question, QuestionType } from "@/lib/assessments";
import { QUESTION_FILE_ACCEPT, readQuestionFile } from "@/lib/question-file";
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
  stats?: { assigned: number; submitted: number; pending: number; passed: number; failed: number; average: number | null };
};
type Detail = {
  assessment: {
    id: string;
    job_id: string;
    title: string;
    instructions: string;
    duration_min: number;
    passing_score: number;
    show_result?: number;
    on_pass?: string;
    on_fail?: string;
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
    manualScores: Record<string, number>;
    questions: Question[];
    passingScore: number;
    review_status: string;
    reviewer_name: string;
  }[];
};
type Draft = {
  id: string;
  title: string;
  instructions: string;
  durationMin: number;
  passingScore: number;
  showResult?: boolean;
  onPass?: string;
  onFail?: string;
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
// Standard layouts are read on the device; a free-form file can be read with AI after the employer agrees.
async function loadQuestions(file: File) {
  const result = await readQuestionFile(file);
  if (result.questions.length || !result.rawText || result.rawText.length < 20) return result;
  if (!window.confirm("Fayl standart formatda deyil. Mətn AI ilə oxunub suallara çevrilsin? (Fayl mətni OpenAI-yə göndərilir.)")) return result;
  const ai = await request<{ questions: Question[] }>("hr/assessments/ai-parse", { text: result.rawText });
  return { questions: ai.questions, skipped: ai.questions.length ? [] : [{ label: "Fayl", reason: "AI sual tapmadı" }] };
}
const FILE_FORMAT_HELP = "Word/PDF/TXT: “1. Sual? (2 bal)”, sonra “A) …  B) …” və “Cavab: B” (bir neçə cavab: “A, C”; cavabsız sual açıq sual sayılır). Excel/CSV: başlıq sətri “Sual, Variant A, Variant B…, Düzgün cavab, Bal”.";
function importMessage(r: { questions: unknown[]; skipped: { label: string; reason: string }[] }) {
  const skipped = r.skipped.length ? ` ${r.skipped.length} sual atlandı: ${r.skipped.slice(0, 3).map((x) => `${x.label} — ${x.reason}`).join("; ")}${r.skipped.length > 3 ? "…" : ""}` : "";
  return r.questions.length ? `${r.questions.length} sual əlavə edildi.${skipped}` : `Sual tapılmadı.${skipped}`;
}
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
  const open_ = (id: string) => open(id);
  async function act(path: string, body: Record<string, unknown>, message: string) {
    try {
      await request(path, body);
      notify(message);
      if (detail) await open(detail.assessment.id);
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
      showResult: d.assessment.show_result === 1,
      onPass: d.assessment.on_pass || "",
      onFail: d.assessment.on_fail || "",
      jobId: d.assessment.job_id,
      questions: d.assessment.questions,
      attachmentName: d.assessment.attachment_name,
      reason: "",
    });
  }
  // A copy starts as an unsaved draft: new question ids, no attachment, no history.
  function duplicate(d: Detail) {
    setDetail(null);
    setDraft({
      id: "",
      title: `${d.assessment.title} (kopya)`.slice(0, 200),
      instructions: d.assessment.instructions,
      durationMin: d.assessment.duration_min,
      passingScore: d.assessment.passing_score,
      showResult: d.assessment.show_result === 1,
      onPass: d.assessment.on_pass || "",
      onFail: d.assessment.on_fail || "",
      jobId: d.assessment.job_id,
      questions: d.assessment.questions.map((q) => ({ ...q, id: crypto.randomUUID().slice(0, 8) })),
      attachmentName: "",
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
        <label className="secondary conversation-new" title={FILE_FORMAT_HELP}>
          <FileText size={16} /> Fayldan test yarat
          <input
            type="file"
            hidden
            accept={QUESTION_FILE_ACCEPT}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              try {
                const imported = await loadQuestions(file);
                if (!imported.questions.length) return notify(importMessage(imported));
                const title = file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 160) || "Yeni test";
                const result = await request<{ id: string }>("hr/assessments/save", {
                  id: "", title: title.length < 3 ? `Test ${title}` : title, instructions: "", jobId: "", passingScore: 60,
                  durationMin: Math.max(10, Math.min(240, Math.ceil(imported.questions.length * 1.5))), questions: imported.questions,
                });
                notify(importMessage(imported) + " Test bazaya yüklənib; müddəti və keçid balını yoxlayın.");
                setDraft(null);
                await load();
                await open(result.id);
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          />
        </label>
        <nav aria-label="Testlər">
          {list.map((item) => (
            <div key={item.id} className={`conversation-item ${detail?.assessment.id === item.id ? "active" : ""}`}>
              <button type="button" className="conversation-open" onClick={() => open(item.id)}>
                <strong>{item.title}</strong>
                <small>{item.job_title || "Ümumi"} · {item.question_count} sual · {item.duration_min} dəq</small>
                <small>{item.submitted}/{item.assigned} təhvil verilib{item.stats && item.stats.average !== null ? ` · orta ${item.stats.average}%` : ""}</small>
                {item.stats && (item.stats.passed + item.stats.failed > 0) && <small>{item.stats.passed} keçdi · {item.stats.failed} keçmədi{item.stats.pending ? ` · ${item.stats.pending} yoxlanır` : ""}</small>}
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
              <label className="checkbox-row"><input type="checkbox" checked={!!draft.showResult} onChange={(e) => setDraft({ ...draft, showResult: e.target.checked })} /> Nəticəni namizədə göstər (açıq suallar yoxlandıqdan sonra)</label>
              <label className="checkbox-row"><input type="checkbox" checked={draft.onPass === "review"} onChange={(e) => setDraft({ ...draft, onPass: e.target.checked ? "review" : "" })} /> Keçəndə müraciət avtomatik “Baxışda” statusuna keçsin (yalnız yeni müraciət)</label>
              <label className="checkbox-row"><input type="checkbox" checked={draft.onFail === "reject"} onChange={(e) => setDraft({ ...draft, onFail: e.target.checked ? "reject" : "" })} /> Keçməyəndə müraciət avtomatik “Uyğun deyil” olsun (namizədə bildiriş gedir)</label>
              {draft.onFail === "reject" && <small className="skill-picker-help">Yalnız bütün suallar qiymətləndirildikdən sonra tətbiq olunur, işə qəbul və təklif mərhələsinə toxunmur.</small>}
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
            <div className="field">
              <span>Sualları fayldan yüklə (Word, Excel, PDF, CSV, TXT)</span>
              <input
                type="file"
                accept={QUESTION_FILE_ACCEPT}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  try {
                    const imported = await loadQuestions(file);
                    if (imported.questions.length)
                      setDraft((d) => (d ? { ...d, questions: [...d.questions.filter((q) => q.text.trim()), ...imported.questions].slice(0, 60) } : d));
                    notify(importMessage(imported));
                  } catch (error) {
                    notify((error as Error).message);
                  }
                }}
              />
              <small className="skill-picker-help">{FILE_FORMAT_HELP}</small>
            </div>
            <QuestionBank
              notify={notify}
              current={draft.questions.filter((q) => q.text.trim())}
              onPick={(picked) => setDraft((d) => (d ? { ...d, questions: [...d.questions.filter((q) => q.text.trim()), ...picked].slice(0, 60) } : d))}
            />
            {list.some((x) => x.id !== draft.id) && (
              <div className="field">
                <span>Başqa testdən sualları götür</span>
                <select
                  value=""
                  onChange={async (event) => {
                    const sourceId = event.target.value;
                    if (!sourceId) return;
                    try {
                      const source = await request<Detail>(`hr/assessment?id=${encodeURIComponent(sourceId)}`);
                      const copied = source.assessment.questions.map((q) => ({ ...q, id: crypto.randomUUID().slice(0, 8) }));
                      setDraft((d) => (d ? { ...d, questions: [...d.questions.filter((q) => q.text.trim()), ...copied].slice(0, 60) } : d));
                      notify(`${copied.length} sual əlavə edildi.`);
                    } catch (error) {
                      notify((error as Error).message);
                    }
                  }}
                >
                  <option value="">Test seçin…</option>
                  {list.filter((x) => x.id !== draft.id).map((x) => <option key={x.id} value={x.id}>{x.title} ({x.question_count} sual)</option>)}
                </select>
              </div>
            )}
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
                <button onClick={() => duplicate(detail)}>Kopyala</button>
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
                const open = a.questions.filter((q) => q.type === "text");
                const closed = a.status === "submitted" || a.status === "expired";
                const statusText = { submitted: "Təhvil verilib", expired: "Vaxt bitib", started: "Davam edir", assigned: "Göndərilib", cancelled: "Ləğv edilib" }[a.status] || a.status;
                return (
                  <Fragment key={a.id}>
                  <tr>
                    <td><strong>{a.candidate_name}</strong></td>
                    <td>
                      <span className={`admin-status ${a.status === "submitted" ? "active" : a.status === "started" ? "paused" : "archived"}`}>{statusText}</span>
                      {a.review_status === "pending" && <small className="skill-description">açıq suallar yoxlanmalıdır</small>}
                      {closed && a.review_status !== "pending" && percent !== null && (
                        <small className={`skill-description ${percent >= a.passingScore ? "compare-best" : ""}`}>{percent >= a.passingScore ? "Keçdi" : "Keçmədi"} (keçid {a.passingScore}%)</small>
                      )}
                      {a.review_status === "done" && a.reviewer_name && <small className="skill-description">yoxladı: {a.reviewer_name}</small>}
                    </td>
                    <td>
                      {percent === null ? "—" : <b className={a.review_status !== "pending" && percent >= a.passingScore ? "compare-best" : ""}>{a.score}/{a.max_score} ({percent}%)</b>}
                      {a.review_status === "pending" && percent !== null && <small className="skill-description">açıq suallar daxil deyil</small>}
                    </td>
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
                      <div className="admin-actions">
                        {(a.status === "started" || a.status === "expired") && (
                          <button type="button" onClick={() => act("hr/assessments/extend", { assignmentId: a.id, minutes: 15 }, "Vaxt 15 dəqiqə uzadıldı.")}>+15 dəq</button>
                        )}
                        {(a.status === "assigned" || a.status === "started") && (
                          <button type="button" onClick={() => window.confirm("Test ləğv edilsin?") && act("hr/assessments/cancel", { assignmentId: a.id }, "Test ləğv edildi.")}>Ləğv et</button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {closed && open.length > 0 && (
                    <tr>
                      <td colSpan={5}>
                        <GradeBox assignmentId={a.id} questions={open} answers={a.answers} manual={a.manualScores} notify={notify} onSaved={() => open_(detail.assessment.id)} />
                      </td>
                    </tr>
                  )}
                  </Fragment>
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

// Open questions are graded by hand, each within the question's own maximum.
function GradeBox({ assignmentId, questions, answers, manual, notify, onSaved }: {
  assignmentId: string;
  questions: Question[];
  answers: Record<string, unknown>;
  manual: Record<string, number>;
  notify: (message: string) => void;
  onSaved: () => void;
}) {
  const [grades, setGrades] = useState<Record<string, string>>(() => Object.fromEntries(questions.map((q) => [q.id, manual[q.id] === undefined ? "" : String(manual[q.id])])));
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      const result = await request<{ score: number; max: number; reviewStatus: string }>("hr/assessments/grade", { assignmentId, grades });
      notify(result.reviewStatus === "done" ? `Qiymətləndirmə tamamlandı: ${result.score}/${result.max}` : "Bal yadda saxlanıldı. Qalan suallar yoxlanmalıdır.");
      onSaved();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <details open={Object.keys(manual).length === 0}>
      <summary><b>Açıq cavabları yoxla və qiymətləndir</b></summary>
      {questions.map((q) => (
        <div key={q.id}>
          <p><b>{q.text}</b><br />{String(answers[q.id] || "—")}</p>
          <label>
            Bal (0–{q.points}){" "}
            <input type="number" min={0} max={q.points} value={grades[q.id] ?? ""} onChange={(e) => setGrades({ ...grades, [q.id]: e.target.value })} style={{ width: 80, padding: "4px 8px" }} />
          </label>
        </div>
      ))}
      <button type="button" className="primary" style={{ marginTop: 8 }} disabled={busy} onClick={save}>Balı yadda saxla</button>
    </details>
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

type BankItem = { id: string; tag: string; question: Question };
// Reusable questions of the company: save the ones in the form, pick others into it.
function QuestionBank({ notify, current, onPick }: { notify: (message: string) => void; current: Question[]; onPick: (questions: Question[]) => void }) {
  const [items, setItems] = useState<BankItem[] | null>(null);
  const [tag, setTag] = useState("");
  const [filter, setFilter] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const load = () => request<{ items: BankItem[] }>("hr/question-bank").then((d) => setItems(d.items)).catch((e) => notify((e as Error).message));
  const shown = (items || []).filter((i) => (!filter || i.tag === filter) );
  const tags = [...new Set((items || []).map((i) => i.tag).filter(Boolean))];
  return (
    <details className="field" onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && !items && void load()}>
      <summary>Sual bankı</summary>
      <div className="admin-actions">
        <input value={tag} placeholder="Etiket (məsələn: Excel)" aria-label="Etiket" onChange={(e) => setTag(e.target.value)} />
        <button
          type="button"
          disabled={!current.length}
          onClick={async () => {
            try {
              const r = await request<{ added: number; duplicates: number }>("hr/question-bank/add", { questions: current, tag });
              notify(`${r.added} sual banka əlavə edildi${r.duplicates ? `, ${r.duplicates} təkrar atlandı` : ""}.`);
              await load();
            } catch (error) {
              notify((error as Error).message);
            }
          }}
        >
          Formadakı sualları banka yaz
        </button>
      </div>
      {tags.length > 0 && (
        <select value={filter} aria-label="Etiket filtri" onChange={(e) => setFilter(e.target.value)}>
          <option value="">Bütün etiketlər</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      )}
      {items && !items.length && <p className="muted fine-print">Bank boşdur.</p>}
      <ul className="bank-list">
        {shown.map((i) => (
          <li key={i.id}>
            <label>
              <input type="checkbox" checked={chosen.includes(i.id)} onChange={(e) => setChosen(e.target.checked ? [...chosen, i.id] : chosen.filter((x) => x !== i.id))} />
              {i.question.text} {i.tag && <small>· {i.tag}</small>}
            </label>
            <button
              type="button"
              aria-label="Bankdan sil"
              onClick={async () => {
                if (!window.confirm("Sual bankdan silinsin? Mövcud testlərə təsir etmir.")) return;
                await request("hr/question-bank/delete", { id: i.id }).catch((e) => notify((e as Error).message));
                setChosen(chosen.filter((x) => x !== i.id));
                await load();
              }}
            >
              <Trash2 size={13} />
            </button>
          </li>
        ))}
      </ul>
      {chosen.length > 0 && (
        <button
          type="button"
          className="secondary"
          onClick={() => {
            onPick((items || []).filter((i) => chosen.includes(i.id)).map((i) => ({ ...i.question, id: crypto.randomUUID().slice(0, 8) })));
            notify(`${chosen.length} sual formaya əlavə edildi.`);
            setChosen([]);
          }}
        >
          Seçilmiş {chosen.length} sualı əlavə et
        </button>
      )}
    </details>
  );
}
