"use client";
import { useCallback, useEffect, useState } from "react";
import { Bookmark, MessageCircle, Trash2 } from "lucide-react";
import { Field, Modal } from "./components";

type Notify = (message: string) => void;
type BulkResult = { done: number; skipped: { id: string; name: string; reason: string }[] };

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

// Status change, one message to several candidates, or saving them to the talent pool.
export function BulkModal({ ids, action, onClose, onDone, notify }: {
  ids: string[];
  action: "status" | "message" | "pool" | "test";
  onClose: () => void;
  onDone: () => void;
  notify: Notify;
}) {
  const [status, setStatus] = useState("Baxışda");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [tests, setTests] = useState<{ id: string; title: string; duration_min: number }[]>([]);
  const [assessmentId, setAssessmentId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const title = { status: "Statusu dəyiş", message: "Mesaj göndər", pool: "İstedad bazasına əlavə et", test: "Test göndər" }[action];
  useEffect(() => {
    if (action !== "test") return;
    request<{ assessments: { id: string; title: string; duration_min: number }[] }>("hr/assessments")
      .then((d) => { setTests(d.assessments); setAssessmentId(d.assessments[0]?.id || ""); })
      .catch((error) => notify((error as Error).message));
  }, [action, notify]);
  async function run() {
    setBusy(true);
    try {
      const data = await request<BulkResult>("hr/applications/bulk", { ids, action, status, body, tags, note, assessmentId });
      setResult(data);
      notify(`${data.done} namizəd üçün əməliyyat tamamlandı${data.skipped.length ? `, ${data.skipped.length} atlandı` : ""}.`);
      onDone();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`${title} (${ids.length})`} onClose={onClose}>
      {result ? (
        <div className="offer-composer">
          <p><b>{result.done}</b> namizəd üçün tamamlandı.</p>
          {result.skipped.length > 0 && (
            <>
              <p className="muted">Atlananlar:</p>
              <ul>{result.skipped.map((s) => <li key={s.id}>{s.name || "Namizəd"}: {s.reason}</li>)}</ul>
            </>
          )}
          <button className="primary" onClick={onClose}>Bağla</button>
        </div>
      ) : (
        <div className="offer-composer">
          {action === "status" && (
            <>
              <Field label="Yeni status">
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Baxışda">Baxışda (yalnız yeni müraciətlər)</option>
                  <option value="Uyğun deyil">Uyğun deyil</option>
                </select>
              </Field>
              <p className="muted fine-print">İşə qəbul və təklif toplu edilmir. Təklif gözləyən və geri götürülmüş müraciətlər atlanır. Namizədlərə status bildirişi göndərilir.</p>
            </>
          )}
          {action === "message" && (
            <>
              <Field label="Mesaj (hər namizədə ayrıca yazışmada gedir)">
                <textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
              </Field>
              <p className="muted fine-print">Ən çoxu 20 namizəd. Bloklanmış yazışmalar atlanır.</p>
            </>
          )}
          {action === "test" && (
            <>
              <Field label="Test">
                <select value={assessmentId} onChange={(e) => setAssessmentId(e.target.value)}>
                  {tests.map((x) => <option key={x.id} value={x.id}>{x.title} ({x.duration_min} dəq)</option>)}
                </select>
              </Field>
              {!tests.length && <p className="muted fine-print">Əvvəlcə “Testlər” bölməsində test yaradın.</p>}
              <p className="muted fine-print">Hər namizədə testin cari nüsxəsi göndərilir. Bağlanmış müraciətlər və testi artıq almış namizədlər atlanır.</p>
            </>
          )}
          {action === "pool" && (
            <>
              <Field label="Etiketlər (vergüllə, məsələn: Bakı, 1C, gələcək üçün)">
                <input value={tags} onChange={(e) => setTags(e.target.value)} />
              </Field>
              <Field label="Qeyd (daxilidir, namizəd görmür)">
                <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </Field>
              <p className="muted fine-print">Namizəd bazada olduğunu görmür. Hesabını silsə, qeyd də silinir.</p>
            </>
          )}
          <button className="primary" disabled={busy || (action === "message" && !body.trim()) || (action === "test" && !assessmentId)} onClick={run}>Təsdiqlə</button>
        </div>
      )}
    </Modal>
  );
}

type Entry = {
  id: string;
  candidateId: string;
  name: string;
  title: string;
  city: string;
  skills: string[];
  years: number;
  profileHidden: boolean;
  applications: number;
  tags: string[];
  note: string;
  updated: string;
};

// The company's saved candidates.
export function TalentPage({ notify, onMessage }: { notify: Notify; onMessage: (target: { candidateId: string; name: string }) => void }) {
  const [data, setData] = useState<{ entries: Entry[]; tags: string[]; total: number } | null>(null);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [form, setForm] = useState({ tags: "", note: "" });
  const load = useCallback(() => {
    request<{ entries: Entry[]; tags: string[]; total: number }>(`hr/talent?q=${encodeURIComponent(q)}&tag=${encodeURIComponent(tag)}`)
      .then(setData)
      .catch((error) => notify((error as Error).message));
  }, [q, tag, notify]);
  useEffect(() => {
    const timer = window.setTimeout(load, 250);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function save() {
    if (!editing) return;
    try {
      await request("hr/talent/save", { candidateId: editing.candidateId, tags: form.tags, note: form.note });
      notify("Yadda saxlanıldı.");
      setEditing(null);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function remove(entry: Entry) {
    if (!window.confirm(`${entry.name} bazadan çıxarılsın?`)) return;
    try {
      await request("hr/talent/remove", { candidateId: entry.candidateId });
      notify("Bazadan çıxarıldı.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <p className="muted">Namizədləri pipeline kartındakı <Bookmark size={13} /> düyməsi və ya toplu seçim ilə bazaya əlavə edin. Etiket və qeyd yalnız sizin komandaya görünür.</p>
      <div className="form-grid">
        <Field label="Axtarış (ad, peşə, bacarıq, etiket, qeyd)"><input value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        <Field label="Etiket">
          <select value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">Hamısı</option>
            {data.tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <p className="muted fine-print">{data.entries.length} / {data.total} namizəd</p>
      {data.entries.map((e) => (
        <article key={e.id} className="panel">
          <div className="section-heading">
            <div>
              <h3>{e.name}</h3>
              <p>{e.profileHidden ? "Profil gizlədilib" : [e.title, e.city, e.years ? `${e.years} il təcrübə` : ""].filter(Boolean).join(" · ")}{e.applications ? ` · ${e.applications} müraciət` : ""}</p>
            </div>
            <div className="admin-actions">
              <button onClick={() => onMessage({ candidateId: e.candidateId, name: e.name })}><MessageCircle size={14} /> Mesaj</button>
              <button onClick={() => { setEditing(e); setForm({ tags: e.tags.join(", "), note: e.note }); }}>Etiket və qeyd</button>
              <button aria-label="Bazadan çıxar" onClick={() => remove(e)}><Trash2 size={14} /></button>
            </div>
          </div>
          {!!e.skills.length && <div className="skill-tags">{e.skills.map((s) => <span key={s}>{s}</span>)}</div>}
          {!!e.tags.length && <p className="muted fine-print">Etiketlər: {e.tags.join(", ")}</p>}
          {e.note && <p className="muted fine-print">Qeyd: {e.note}</p>}
        </article>
      ))}
      {!data.entries.length && <p className="admin-empty">{data.total ? "Axtarışa uyğun namizəd yoxdur." : "İstedad bazası boşdur."}</p>}
      {editing && (
        <Modal title={`${editing.name}: etiket və qeyd`} onClose={() => setEditing(null)}>
          <div className="offer-composer">
            <Field label="Etiketlər (vergüllə)"><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
            <Field label="Qeyd"><textarea rows={4} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <button className="primary" onClick={save}>Yadda saxla</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Saves one candidate (also one who has not applied but keeps an open profile) to the talent pool.
export function SaveTalentModal({ candidateId, name, onClose, notify }: { candidateId: string; name: string; onClose: () => void; notify: Notify }) {
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await request("hr/talent/save", { candidateId, tags, note });
      notify(`${name} istedad bazasına əlavə edildi.`);
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`${name}: istedad bazasına əlavə et`} onClose={onClose}>
      <div className="offer-composer">
        <Field label="Etiketlər (vergüllə)"><input value={tags} placeholder="Məsələn: Bakı, 1C, gələcək üçün" onChange={(e) => setTags(e.target.value)} /></Field>
        <Field label="Qeyd (daxilidir, namizəd görmür)"><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <p className="muted fine-print">Namizəd bazada olduğunu görmür. Hesabını silsə, qeyd də silinir.</p>
        <button className="primary" disabled={busy} onClick={save}>Əlavə et</button>
      </div>
    </Modal>
  );
}
