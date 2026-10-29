"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Field, Modal } from "./components";
import { SheetImport } from "./StaffPages";

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

type Summary = { days: number; worked: number; overtime: number; restDay: number; night: number };
type Entry = { day: string; hours: number; night: number; note: string };
type Person = { id: string; name: string; position: string; department: string; weekHours: number; summary: Summary; entries: Entry[] };
type Data = { month: string; days: { date: string; off: string; short: boolean; label: string }[]; employees: Person[] };
const OFF: Record<string, string> = { weekend: "istirahət", holiday: "bayram", transfer: "köçürülmüş istirahət", company: "şirkət istirahəti" };
const dmy = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

// Hours worked per day: the extra, rest-day and night hours here go to the payroll by themselves.
export default function HoursPanel({ notify }: { notify: Notify }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Data | null>(null);
  const [edit, setEdit] = useState<Person | null>(null);
  const [importing, setImporting] = useState(false);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<Data>(`company/hours?month=${month}`)
      .then(setData)
      .catch((error) => notifyRef.current((error as Error).message));
  }, [month]);
  useEffect(load, [load]);
  return (
    <div className="company-page">
      <div className="section-heading">
        <div className="admin-actions">
          <label>Ay <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label>
        </div>
        <div className="admin-actions">
          <button type="button" className="secondary" onClick={() => setImporting(true)}>Excel-dən yüklə</button>
        </div>
      </div>
      <p className="muted">Hər gün işlənən saat yazılır. İş günündə gündəlik normadan (həftəlik saat ÷ 5, bayram qabağı 1 saat az) artıq saat artıq iş, istirahət və bayram günündə bütün saat istirahət günü işi sayılır; gecə saatı ayrıca yazılır. Hesablama əmək haqqı cədvəlinə özü düşür (əl ilə yazılmış saat üstündür).</p>
      {!data ? (
        <p className="muted">Yüklənir…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>İşçi</th><th>Qeydli gün</th><th>İşlənən saat</th><th>Artıq iş</th><th>İstirahət/bayram günü</th><th>Gecə</th><th></th></tr>
            </thead>
            <tbody>
              {data.employees.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b><small className="skill-description">{[p.position, p.department].filter(Boolean).join(" · ")}{p.weekHours < 40 ? ` · ${p.weekHours} saatlıq həftə` : ""}</small></td>
                  <td>{p.summary.days}</td>
                  <td>{p.summary.worked}</td>
                  <td>{p.summary.overtime || "—"}</td>
                  <td>{p.summary.restDay || "—"}</td>
                  <td>{p.summary.night || "—"}</td>
                  <td><button type="button" onClick={() => setEdit(p)}>Saatlar</button></td>
                </tr>
              ))}
              {!data.employees.length && <tr><td colSpan={7}><p className="admin-empty">İşçi yoxdur.</p></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {edit && data && <DayHours month={month} person={edit} days={data.days} notify={notify} onClose={() => setEdit(null)} onSaved={load} />}
      {importing && <SheetImport kind="hours" notify={notify} onClose={() => setImporting(false)} onDone={load} />}
    </div>
  );
}

function DayHours({ month, person, days, notify, onClose, onSaved }: { month: string; person: Person; days: Data["days"]; notify: Notify; onClose: () => void; onSaved: () => void }) {
  const initial = new Map(person.entries.map((e) => [e.day, e]));
  const [values, setValues] = useState<Record<string, { hours: string; night: string }>>(() =>
    Object.fromEntries(days.map((d) => [d.date, { hours: initial.get(d.date)?.hours ? String(initial.get(d.date)!.hours) : "", night: initial.get(d.date)?.night ? String(initial.get(d.date)!.night) : "" }])),
  );
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      for (const d of days) {
        const v = values[d.date];
        const before = initial.get(d.date);
        const hours = Number(v.hours) || 0;
        const night = Number(v.night) || 0;
        if (hours === (before?.hours || 0) && night === (before?.night || 0)) continue;
        await request("company/hours/save", { employeeId: person.id, day: d.date, hours, night });
      }
      notify("Saatlar saxlanıldı.");
      onSaved();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`${person.name}: işlənən saatlar (${month})`} onClose={onClose}>
      <div className="offer-composer">
        <div className="hours-grid">
          {days.map((d) => (
            <div key={d.date} className={`hours-day${d.off ? " hours-off" : ""}`}>
              <small>{dmy(d.date)}{d.off ? ` · ${OFF[d.off] || d.off}` : d.short ? " · qısa" : ""}</small>
              <input type="number" min={0} max={24} step={0.5} placeholder="saat" aria-label={`${d.date} saat`} value={values[d.date].hours} onChange={(e) => setValues({ ...values, [d.date]: { ...values[d.date], hours: e.target.value } })} />
              <input type="number" min={0} max={24} step={0.5} placeholder="gecə" aria-label={`${d.date} gecə saatı`} value={values[d.date].night} onChange={(e) => setValues({ ...values, [d.date]: { ...values[d.date], night: e.target.value } })} />
            </div>
          ))}
        </div>
        <Field label=""><span className="muted">Boş buraxılan gün üçün saat sayılmır.</span></Field>
        <button type="button" className="primary" disabled={busy} onClick={() => void save()}>Yadda saxla</button>
      </div>
    </Modal>
  );
}
