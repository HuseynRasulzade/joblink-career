"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, TriangleAlert, X } from "lucide-react";
import { bakuLocal } from "@/lib/interviews";
import { STAGE_CATALOG, stageInfo, type StageInfo } from "@/lib/recruitment";
import { Field } from "./components";

type Person = { userId: string; name: string; role: string };
export type Participant = { userId: string; name: string; role: string; status: string; note: string };
export type Conflict = { kind: string; withId: string; message: string };

async function call<T>(path: string, body?: unknown): Promise<T> {
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

// Round, the colleagues who take part (each with a role) and a live warning when the time collides with another interview.
export function PanelFields({
  jobId,
  applicationId,
  candidateId,
  count = 1,
  scheduledAt,
  durationMin,
  ignoreId,
  value,
  onChange,
  onConflicts,
}: {
  jobId: string;
  applicationId?: string;
  candidateId?: string;
  count?: number;
  scheduledAt: string;
  durationMin: number;
  ignoreId?: string;
  value: { userId: string; role: string }[];
  onChange: (list: { userId: string; role: string }[]) => void;
  onConflicts?: (list: Conflict[]) => void;
}) {
  const [people, setPeople] = useState<Person[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  useEffect(() => {
    call<{ people: Person[] }>("hr/interviews/people")
      .then((d) => setPeople(d.people))
      .catch(() => {});
  }, []);
  const key = JSON.stringify([jobId, applicationId, candidateId, count, scheduledAt, durationMin, ignoreId, value.map((v) => v.userId)]);
  useEffect(() => {
    if (!scheduledAt || !jobId) {
      setConflicts([]);
      onConflicts?.([]);
      return;
    }
    const timer = setTimeout(() => {
      call<{ conflicts: Conflict[] }>("hr/interviews/check", { jobId, applicationId, candidateId, count, scheduledAt, durationMin, ignoreId, participants: value.map((v) => ({ userId: v.userId })) })
        .then((d) => {
          setConflicts(d.conflicts);
          onConflicts?.(d.conflicts);
        })
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer);
    // The check depends on exactly the values in key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const chosen = (id: string) => value.find((v) => v.userId === id);
  const toggle = (p: Person) => onChange(chosen(p.userId) ? value.filter((v) => v.userId !== p.userId) : [...value, { userId: p.userId, role: p.role }]);
  return (
    <>
      <fieldset className="iv-people">
        <legend>Kimlər iştirak edəcək (əvvəl onlar təsdiqləyir, sonra namizədə göndərilir)</legend>
        {people.length ? people.map((p) => (
          <div key={p.userId} className="iv-person">
            <label><input type="checkbox" checked={!!chosen(p.userId)} onChange={() => toggle(p)} /> <b>{p.name}</b> <small>{p.role}</small></label>
            {chosen(p.userId) && (
              <input aria-label={`${p.name} üçün rol`} value={chosen(p.userId)!.role} placeholder="Rolu (məs. texniki sual verən)" onChange={(e) => onChange(value.map((v) => (v.userId === p.userId ? { ...v, role: e.target.value } : v)))} />
            )}
          </div>
        )) : <small className="muted">Komandanızda başqa üzv yoxdur: müsahibə namizədə birbaşa göndərilir. “Komanda və rollar” bölməsindən üzv dəvət edin.</small>}
      </fieldset>
      {conflicts.length > 0 && (
        <div className="iv-conflict" role="alert">
          <b><TriangleAlert size={15} /> Vaxt üst-üstə düşür</b>
          <ul>{conflicts.map((c) => <li key={c.message}>{c.message}</li>)}</ul>
          <small>Başqa vaxt seçin. Eyni vakansiya üzrə görüşlər, eyni iştirakçı və eyni namizəd üçün görüşlər üst-üstə düşə bilməz.</small>
        </div>
      )}
    </>
  );
}


type StageOptions = { stages: string[]; tests: { id: string; title: string; question_count: number; duration_min: number }[]; guide: { name: string; questions: string[] } | null; canTests: boolean };
// The stage of the selection this meeting or test belongs to (the vacancy's own stages, else the standard names), a test to send
// with it and the questions to ask. A "test" stage sends a test instead of setting a time.
export function StageFields({
  jobId,
  stage,
  onStage,
  testId,
  onTest,
  questions,
  onQuestions,
  allowTest = true,
}: {
  jobId: string;
  stage: string;
  onStage: (info: StageInfo) => void;
  testId: string;
  onTest: (id: string) => void;
  questions: string;
  onQuestions: (text: string) => void;
  allowTest?: boolean;
}) {
  const [opts, setOpts] = useState<StageOptions | null>(null);
  const [custom, setCustom] = useState(false);
  useEffect(() => {
    if (!jobId) return;
    call<StageOptions>(`hr/interviews/people?jobId=${encodeURIComponent(jobId)}`)
      .then((d) => {
        setOpts(d);
        if (!questions && d.guide?.questions.length) onQuestions(d.guide.questions.join("\n"));
      })
      .catch(() => {});
    // Loaded once per vacancy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);
  const names = opts?.stages.length ? opts.stages : STAGE_CATALOG.map((c) => c.name);
  const info = stageInfo(stage);
  const isTest = !!stage && info.type === "test";
  const known = names.includes(stage);
  return (
    <>
      <Field label="Mərhələ (vakansiyanın seçim mərhələləri)">
        <select
          value={custom ? "__custom" : known ? stage : stage ? "__custom" : ""}
          onChange={(e) => {
            if (e.target.value === "__custom") {
              setCustom(true);
              return;
            }
            setCustom(false);
            onStage(e.target.value ? stageInfo(e.target.value) : { name: "", type: "interview" });
          }}
        >
          <option value="">Mərhələ seçilməyib</option>
          {names.map((n) => <option key={n} value={n}>{n}{stageInfo(n).type === "test" ? " (test)" : ""}</option>)}
          <option value="__custom">Digər (özüm yazım)…</option>
        </select>
      </Field>
      {(custom || (!!stage && !known)) && (
        <Field label="Mərhələnin adı"><input value={stage} placeholder="Məsələn: Direktorla söhbət" onChange={(e) => onStage(stageInfo(e.target.value))} /></Field>
      )}
      {opts && !opts.stages.length && <p className="iv-stage-hint">Bu vakansiyada seçim mərhələləri yazılmayıb, standart mərhələlər göstərilir. Vakansiyanı redaktə edəndə öz mərhələlərinizi əlavə edə bilərsiniz.</p>}
      {allowTest && opts?.canTests && (isTest || opts.tests.length > 0) && (
        <div className="iv-test-box">
          <Field label={isTest ? "Göndəriləcək test" : "Görüşlə birlikdə test də göndər (istəyə bağlı)"}>
            <select value={testId} onChange={(e) => onTest(e.target.value)}>
              <option value="">{isTest ? "Test seçin" : "Test göndərilməsin"}</option>
              {opts.tests.map((t) => <option key={t.id} value={t.id}>{t.title} · {t.question_count} sual · {t.duration_min} dəq</option>)}
            </select>
          </Field>
          {isTest && <p className="iv-stage-hint">Bu test mərhələsidir: vaxt təyin etmək lazım deyil, test namizədə göndərilir və nəticəsi “Testlər” bölməsində görünür.</p>}
          {isTest && !opts.tests.length && <p className="iv-stage-hint">Bu vakansiya üçün test yoxdur. Əvvəlcə “Testlər” bölməsində test yaradın.</p>}
        </div>
      )}
      {allowTest && isTest && opts && !opts.canTests && <p className="iv-stage-hint">Test göndərmək üçün icazəniz yoxdur.</p>}
      {!isTest && (
        <Field label="Bu mərhələdə veriləcək suallar (daxili, hər sətir bir sual)">
          <textarea rows={4} value={questions} placeholder="Suallar vakansiyanın siyahısından doldurulur; dəyişə bilərsiniz" onChange={(e) => onQuestions(e.target.value)} />
        </Field>
      )}
    </>
  );
}

// The questions planned for a meeting, shown to the colleagues who take part.
export function QuestionList({ value }: { value?: string | string[] }) {
  const list = Array.isArray(value) ? value : (() => { try { return JSON.parse(value || "[]") as string[]; } catch { return []; } })();
  if (!list.length) return null;
  return (
    <details className="iv-questions">
      <summary>Bu mərhələdə veriləcək suallar ({list.length})</summary>
      <ol>{list.map((q, n) => <li key={n}>{q}</li>)}</ol>
    </details>
  );
}

// The chain a meeting goes through: colleagues first, then the candidate.
export function PanelChain({ status, participants }: { status: string; participants?: Participant[] }) {
  if (!participants?.length) return null;
  const accepted = participants.filter((p) => p.status === "accepted").length;
  const candidate = status === "confirmed" ? "təsdiqlədi" : status === "declined" ? "imtina etdi" : status === "scheduled" ? "cavab gözlənilir" : status === "completed" ? "keçirildi" : "hələ göndərilməyib";
  return (
    <div className="iv-chain" aria-label="Təsdiq mərhələləri">
      <span className="iv-step"><b>1.</b> İştirakçılar {accepted}/{participants.length}</span>
      {participants.map((p) => (
        <span key={p.userId} className={`iv-chip ${p.status === "accepted" ? "good" : p.status === "declined" ? "bad" : "warn"}`} title={`${p.role}${p.note ? `: ${p.note}` : ""}`}>
          {p.status === "accepted" ? "✓" : p.status === "declined" ? "✗" : "…"} {p.name}{p.role ? ` · ${p.role}` : ""}
        </span>
      ))}
      <span className="iv-step"><b>2.</b> Namizəd: {candidate}</span>
    </div>
  );
}

export type MyRequest = { id: string; scheduled_at: string; duration_min: number; kind: string; location: string; note: string; round: string; questions?: string | string[]; role: string; job_title: string; candidate: string };
// Requests that wait for my own answer.
export function MyRequests({ items, onDone, notify }: { items: MyRequest[]; onDone: () => void; notify: (m: string) => void }) {
  if (!items.length) return null;
  async function answer(id: string, accept: boolean) {
    let note = "";
    if (!accept) {
      const typed = window.prompt("İmtina səbəbi (müsahibəni quran şəxsə göndəriləcək):");
      if (typed === null) return;
      note = typed;
    }
    try {
      await call("hr/interviews/panel-respond", { id, accept, note });
      notify(accept ? "İştirakınız təsdiqləndi." : "İmtina göndərildi.");
      onDone();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <section className="iv-mine" aria-label="Cavabınız gözlənilir">
      <h3>Sizin təsdiqiniz gözlənilir ({items.length})</h3>
      {items.map((r) => (
        <article key={r.id} className="iv-card">
          <div className="iv-date" aria-hidden><b>{bakuLocal(r.scheduled_at).slice(8, 10)}.{bakuLocal(r.scheduled_at).slice(5, 7)}</b><span>{bakuLocal(r.scheduled_at).slice(11, 16)}</span></div>
          <div className="iv-main">
            <h3>{r.candidate || "Namizəd"} · {r.job_title}</h3>
            <p>{r.round ? `${r.round} · ` : ""}{r.duration_min} dəq{r.location ? ` · ${r.location}` : ""}</p>
            <p className="muted">Rolunuz: {r.role}{r.note ? ` · ${r.note}` : ""}</p>
            <QuestionList value={r.questions} />
          </div>
          <div className="iv-actions">
            <button className="primary" onClick={() => answer(r.id, true)}><Check size={14} /> Təsdiqlə</button>
            <button className="secondary" onClick={() => answer(r.id, false)}><X size={14} /> İmtina</button>
          </div>
        </article>
      ))}
    </section>
  );
}

type GridItem = { id: string; scheduled_at: string; duration_min: number; status: string; job_id?: string; job_title: string; candidate?: string; participants?: Participant[] };
const HOURS = Array.from({ length: 11 }, (_, i) => 8 + i); // 08:00 - 19:00
const hue = (text: string) => {
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
};
const DAY = ["B.e.", "Ç.a.", "Çər.", "C.a.", "Cümə", "Şən.", "Baz."];
// Week timetable: which hours are taken (by which vacancy) and which are free. Optionally for one vacancy or one colleague.
export function ScheduleGrid({ items, jobs, people, defaultJob }: { items: GridItem[]; jobs: [string, string][]; people: Person[]; defaultJob?: string }) {
  const [offset, setOffset] = useState(0);
  const [job, setJob] = useState(defaultJob || "");
  const [who, setWho] = useState("");
  const mondayMs = useMemo(() => {
    const baku = new Date(Date.now() + 4 * 3600000);
    const dow = (baku.getUTCDay() + 6) % 7;
    return Date.UTC(baku.getUTCFullYear(), baku.getUTCMonth(), baku.getUTCDate() - dow + offset * 7);
  }, [offset]);
  const days = Array.from({ length: 7 }, (_, i) => new Date(mondayMs + i * 86400000));
  const blocking = items.filter((i) => ["scheduled", "confirmed", "pending_panel"].includes(i.status) && (!job || i.job_id === job) && (!who || (i.participants || []).some((p) => p.userId === who)));
  const startOf = (i: GridItem) => Date.parse(i.scheduled_at) + 4 * 3600000;
  const cell = (day: Date, hour: number) => {
    const from = day.getTime() + hour * 3600000;
    const to = from + 3600000;
    return blocking.filter((i) => startOf(i) < to && startOf(i) + i.duration_min * 60000 > from);
  };
  let busyHours = 0;
  const rows = HOURS.map((h) =>
    days.map((d) => {
      const c = cell(d, h);
      if (c.length) busyHours += 1;
      return c;
    }),
  );
  const total = HOURS.length * 7;
  const label = `${days[0].getUTCDate()}.${String(days[0].getUTCMonth() + 1).padStart(2, "0")} – ${days[6].getUTCDate()}.${String(days[6].getUTCMonth() + 1).padStart(2, "0")}.${days[6].getUTCFullYear()}`;
  return (
    <section className="iv-grid" aria-label="Müsahibə cədvəli">
      <div className="iv-grid-bar">
        <button type="button" className="secondary" aria-label="Əvvəlki həftə" onClick={() => setOffset(offset - 1)}><ChevronLeft size={15} /></button>
        <b>{label}</b>
        <button type="button" className="secondary" aria-label="Növbəti həftə" onClick={() => setOffset(offset + 1)}><ChevronRight size={15} /></button>
        {offset !== 0 && <button type="button" className="text-button" onClick={() => setOffset(0)}>Bu həftə</button>}
        <select aria-label="Vakansiya üzrə cədvəl" value={job} onChange={(e) => setJob(e.target.value)}>
          <option value="">Bütün vakansiyalar</option>
          {jobs.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
        <select aria-label="İştirakçı üzrə cədvəl" value={who} onChange={(e) => setWho(e.target.value)}>
          <option value="">Bütün iştirakçılar</option>
          {people.map((p) => <option key={p.userId} value={p.userId}>{p.name}</option>)}
        </select>
        <span className="muted">Dolu: {busyHours} saat · boş: {total - busyHours} saat</span>
      </div>
      <div className="iv-grid-scroll">
        <table>
          <thead>
            <tr><th scope="col">Saat</th>{days.map((d, i) => <th key={i} scope="col">{DAY[i]} {d.getUTCDate()}.{String(d.getUTCMonth() + 1).padStart(2, "0")}</th>)}</tr>
          </thead>
          <tbody>
            {HOURS.map((h, ri) => (
              <tr key={h}>
                <th scope="row">{String(h).padStart(2, "0")}:00</th>
                {rows[ri].map((c, ci) => (
                  <td key={ci} className={c.length ? "busy" : "free"}>
                    {c.length ? c.map((i) => (
                      <span key={i.id} className={`iv-slot ${i.status === "pending_panel" ? "pending" : ""}`} style={{ background: `hsl(${hue(i.job_id || i.job_title)} 55% 90%)`, borderColor: `hsl(${hue(i.job_id || i.job_title)} 45% 55%)` }} title={`${i.candidate || ""} · ${i.job_title} · ${bakuLocal(i.scheduled_at).slice(11, 16)} (${i.duration_min} dəq)`}>
                        <b>{bakuLocal(i.scheduled_at).slice(11, 16)}</b> {i.candidate || "Namizəd"}
                        <small>{i.job_title}</small>
                      </span>
                    )) : <i>boş</i>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <small className="muted">Rənglər vakansiyaları göstərir. Qırıq haşiyə iştirakçıların təsdiqini gözləyən görüşdür. Eyni vakansiya üzrə görüşlər üst-üstə düşə bilməz.</small>
    </section>
  );
}

export { call as panelCall };
