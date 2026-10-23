"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ClipboardCheck, Clock, ShieldAlert } from "lucide-react";
import type { Question } from "@/lib/assessments";
import { formatDate } from "@/lib/dates";
import { siteLanguage } from "./i18n";

type Exam = {
  id: string;
  status: "assigned" | "started" | "submitted" | "expired";
  title: string;
  company: string;
  duration_min: number;
  instructions: string;
  assigned_at: string;
  deadline_at: string;
  submitted_at: string;
  result?: { score: number; max: number; percent: number; passed: boolean } | null;
};
type Session = {
  title: string;
  instructions: string;
  deadline: string;
  serverNow: string;
  questions: Omit<Question, "correct">[];
  saved?: Record<string, unknown>;
  hasAttachment: boolean;
  attachmentType: string;
};

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

// Candidate: list of tests sent by employers.
export function ExamList({ notify }: { notify: (message: string) => void }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [active, setActive] = useState<Exam | null>(null);
  const load = useCallback(() => {
    request<{ exams: Exam[] }>("exams").then((d) => setExams(d.exams)).catch(() => {});
  }, []);
  useEffect(load, [load]);
  if (!exams.length) return null;
  return (
    <section className="panel exam-list">
      <h3><ClipboardCheck size={18} /> Testlər</h3>
      {exams.map((exam) => (
        <article key={exam.id} className="exam-row">
          <div>
            <strong>{exam.title}</strong>
            <small>{exam.company} · {exam.duration_min} dəqiqə · göndərilib {formatDate(exam.assigned_at, siteLanguage(), { year: false })}</small>
          </div>
          {exam.status === "submitted" ? (
            <span className="admin-status active">
              Təhvil verilib{exam.result ? ` · ${exam.result.score}/${exam.result.max} (${exam.result.percent}%) — ${exam.result.passed ? "keçdiniz" : "keçmədiniz"}` : ""}
            </span>
          ) : exam.status === "expired" ? (
            <span className="admin-status">Vaxt bitib</span>
          ) : (
            <button className="primary" onClick={() => setActive(exam)}>{exam.status === "started" ? "Davam et" : "Testə başla"}</button>
          )}
        </article>
      ))}
      {active && (
        <ExamRoom
          exam={active}
          notify={notify}
          onClose={() => {
            setActive(null);
            load();
          }}
        />
      )}
    </section>
  );
}

// The exam itself: camera and microphone must stay on, fullscreen is required,
// leaving the page and copy/paste are recorded for the employer.
function ExamRoom({ exam, notify, onClose }: { exam: Exam; notify: (message: string) => void; onClose: () => void }) {
  const [stage, setStage] = useState<"check" | "running" | "done">("check");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [left, setLeft] = useState(0);
  const [warnings, setWarnings] = useState(0);
  const [busy, setBusy] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  const submitted = useRef(false);
  const offset = useRef(0);

  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
  }, [stream, stage]);
  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  const report = useCallback(
    (type: string) => {
      if (submitted.current) return;
      setWarnings((n) => n + 1);
      void request("exams/violation", { id: exam.id, type }).catch(() => {});
    },
    [exam.id],
  );
  const submit = useCallback(
    async (auto = false) => {
      if (submitted.current) return;
      if (!auto && !window.confirm("Testi təhvil vermək istəyirsiniz? Sonra dəyişmək olmaz.")) return;
      submitted.current = true;
      setBusy(true);
      try {
        const result = await request<{ late: boolean }>("exams/submit", { id: exam.id, answers: answersRef.current });
        notify(auto ? "Vaxt bitdi, test avtomatik təhvil verildi." : result.late ? "Test gecikmə ilə təhvil verildi." : "Test təhvil verildi.");
        setStage("done");
        stream?.getTracks().forEach((track) => track.stop());
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      } catch (error) {
        submitted.current = false;
        notify((error as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [exam.id, notify, stream],
  );

  async function enableDevices() {
    try {
      setStream(await navigator.mediaDevices.getUserMedia({ video: true, audio: true }));
    } catch {
      notify("Kamera və mikrofona icazə verilmədi. Test üçün hər ikisi açıq olmalıdır.");
    }
  }
  async function start() {
    try {
      await root.current?.requestFullscreen();
    } catch {
      notify("Tam ekran rejiminə keçmək mümkün olmadı.");
      return;
    }
    try {
      const data = await request<Session>("exams/start", { id: exam.id });
      offset.current = Date.parse(data.serverNow) - Date.now();
      // Answers saved before a crash or a closed tab come back.
      if (data.saved && Object.keys(data.saved).length) setAnswers(data.saved);
      setSession(data);
      setStage("running");
    } catch (error) {
      notify((error as Error).message);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    }
  }

  // Autosave every 20 seconds, so a crash or a closed tab loses almost nothing.
  useEffect(() => {
    if (stage !== "running") return;
    const timer = window.setInterval(() => {
      if (!submitted.current) void request("exams/save", { id: exam.id, answers: answersRef.current }).catch(() => {});
    }, 20000);
    return () => window.clearInterval(timer);
  }, [stage, exam.id]);

  // Timer follows the server deadline.
  useEffect(() => {
    if (stage !== "running" || !session) return;
    const tick = () => {
      const remaining = Math.max(0, Math.round((Date.parse(session.deadline) - (Date.now() + offset.current)) / 1000));
      setLeft(remaining);
      if (remaining === 0) void submit(true);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [stage, session, submit]);

  // Integrity monitoring while the test runs.
  useEffect(() => {
    if (stage !== "running") return;
    const onVisibility = () => document.hidden && report("tab-hidden");
    // Focusing the embedded test file is not leaving the exam.
    const onBlur = () => window.setTimeout(() => document.activeElement?.tagName !== "IFRAME" && report("blur"), 0);
    const onFullscreen = () => !document.fullscreenElement && report("fullscreen-exit");
    const block = (type: string) => (event: Event) => {
      event.preventDefault();
      report(type);
    };
    const onCopy = block("copy");
    const onCut = block("copy");
    const onPaste = block("paste");
    const onContext = block("context-menu");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "PrintScreen") report("print-screen");
      else if (event.key === "F12" || ((event.ctrlKey || event.metaKey) && event.shiftKey && ["i", "j", "c"].includes(event.key.toLowerCase()))) {
        event.preventDefault();
        report("devtools-key");
      }
    };
    const tracks = stream?.getTracks() || [];
    const onEnded = () => report("camera-off");
    tracks.forEach((track) => track.addEventListener("ended", onEnded));
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreen);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("keydown", onKey);
    return () => {
      tracks.forEach((track) => track.removeEventListener("ended", onEnded));
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreen);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("keydown", onKey);
    };
  }, [stage, stream, report]);

  const answered = session ? session.questions.filter((q) => {
    const value = answers[q.id];
    return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== "";
  }).length : 0;

  return (
    <div className="exam-room" ref={root} role="dialog" aria-modal="true" aria-label={exam.title}>
      {stage === "check" && (
        <div className="exam-check">
          <h2><ShieldAlert size={22} /> {exam.title}</h2>
          <p>{exam.instructions || "Test başlayandan sonra vaxt dayandırılmır."}</p>
          <ul>
            <li>Müddət: {exam.duration_min} dəqiqə. Vaxt bitəndə test avtomatik təhvil verilir.</li>
            <li>Kamera və mikrofon test boyu açıq olmalıdır.</li>
            <li>Test tam ekranda keçirilir. Başqa səhifəyə keçmək, tam ekrandan çıxmaq, kopyalama və yapışdırma işəgötürənə qeyd kimi göndərilir.</li>
          </ul>
          <div className="exam-camera">
            {stream ? <video ref={video} autoPlay muted playsInline /> : <div className="exam-camera-off"><Camera size={28} /></div>}
          </div>
          <div className="cv-rewrite-actions">
            <button className="secondary" onClick={onClose}>Bağla</button>
            {!stream ? (
              <button className="primary" onClick={enableDevices}><Camera size={16} /> Kamera və mikrofonu aç</button>
            ) : (
              <button className="primary" onClick={start}>{exam.status === "started" ? "Davam et" : "Testə başla"}</button>
            )}
          </div>
        </div>
      )}
      {stage === "running" && session && (
        <div className="exam-body">
          <header className="exam-head">
            <strong>{session.title}</strong>
            <span>{answered}/{session.questions.length} cavab</span>
            {warnings > 0 && <span className="exam-warning"><ShieldAlert size={14} /> {warnings} qeyd</span>}
            <span className={`exam-timer ${left < 60 ? "low" : ""}`}><Clock size={15} /> {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>
            <video ref={video} autoPlay muted playsInline className="exam-selfie" />
          </header>
          <div className="exam-content">
            {session.hasAttachment && (
              <div className="exam-file">
                {session.attachmentType === "application/pdf" ? (
                  <iframe title="Test faylı" src={`/api/joblink/exams/file?id=${encodeURIComponent(exam.id)}#toolbar=0`} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="Test faylı" src={`/api/joblink/exams/file?id=${encodeURIComponent(exam.id)}`} draggable={false} />
                )}
              </div>
            )}
            <ol className="exam-questions">
              {session.questions.map((q) => (
                <li key={q.id}>
                  <p>{q.text} <small>({q.points} bal)</small></p>
                  {q.type === "text" ? (
                    <textarea rows={4} value={String(answers[q.id] || "")} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                  ) : (
                    q.options.map((option, index) => {
                      const value = answers[q.id];
                      const checked = q.type === "single" ? value === index : Array.isArray(value) && value.includes(index);
                      return (
                        <label key={index} className="exam-option">
                          <input
                            type={q.type === "single" ? "radio" : "checkbox"}
                            name={q.id}
                            checked={checked}
                            onChange={(e) => {
                              const list = Array.isArray(value) ? (value as number[]) : [];
                              setAnswers({ ...answers, [q.id]: q.type === "single" ? index : e.target.checked ? [...list, index] : list.filter((x) => x !== index) });
                            }}
                          />
                          {option}
                        </label>
                      );
                    })
                  )}
                </li>
              ))}
            </ol>
            <button className="primary" disabled={busy} onClick={() => submit(false)}>Təhvil ver</button>
          </div>
        </div>
      )}
      {stage === "done" && (
        <div className="exam-check">
          <h2><ClipboardCheck size={22} /> Test təhvil verildi</h2>
          <p>Nəticəni işəgötürən yoxlayacaq. Müraciətinizin statusunu “Müraciətlərim” bölməsində izləyə bilərsiniz.</p>
          <button className="primary" onClick={onClose}>Bağla</button>
        </div>
      )}
    </div>
  );
}
