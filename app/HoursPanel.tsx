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
type Entry = { day: string; hours: number; night: number; note: string; clockIn: string; clockOut: string; source: string; late: number; early: number; extra: number; overtimeStatus: string; order: string };
type Settings = { start: string; end: string; breakMinutes: number; graceMinutes: number; overtimeApproval: boolean; selfClock: boolean };
type Person = { id: string; name: string; position: string; department: string; weekHours: number; summary: Summary; entries: Entry[]; missing: string[]; mode: "daily" | "month" | "none"; total: { overtime: number; restDay: number; night: number; status: string; note: string } | null };
type Data = { month: string; settings: Settings; days: { date: string; off: string; short: boolean; label: string }[]; employees: Person[] };
const OFF: Record<string, string> = { weekend: "istirahət", holiday: "bayram", transfer: "köçürülmüş istirahət", company: "şirkət istirahəti" };
const dmy = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

// Hours worked per day: the extra, rest-day and night hours here go to the payroll by themselves.
export default function HoursPanel({ notify }: { notify: Notify }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<Data | null>(null);
  const [edit, setEdit] = useState<Person | null>(null);
  const [importing, setImporting] = useState(false);
  const [setup, setSetup] = useState(false);
  const [journal, setJournal] = useState(false);
  const [totalsImport, setTotalsImport] = useState(false);
  const [monthEdit, setMonthEdit] = useState<Person | null>(null);
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
          <button type="button" className="secondary" onClick={() => setJournal(true)}>Giriş-çıxış jurnalı</button>
          <button type="button" className="secondary" onClick={() => setSetup(true)}>Ayarlar</button>
          <button type="button" className="secondary" onClick={() => setImporting(true)}>Excel: gündəlik saat</button>
          <button type="button" className="secondary" onClick={() => setTotalsImport(true)}>Excel: ay yekunu</button>
        </div>
      </div>
      <p className="muted">
        Saat yalnız burada yazılır; əmək haqqı hesablaması onu buradan götürür. İki yol var: <b>gündəlik</b> (giriş-çıxış və ya gün üzrə saat) və <b>ay yekunu</b> (işçi üçün ayda bir rəqəm). Eyni ay üçün gündəlik qeyd varsa yalnız o sayılır, ikisi toplanmır. İş günündə gündəlik normadan (həftəlik saat ÷ 5, bayram qabağı 1 saat az) artıq saat artıq iş, istirahət və bayram günündə bütün saat istirahət günü işi sayılır; gecə saatı ayrıca göstərilir. Gecə əlavəsinin faizi işçi kartındadır. «Ayarlar»da artıq iş təsdiqi açıqdırsa, artıq saatlar imzalanmış əmr (artıq işə cəlb / istirahət günü işə cəlb) və ya təsdiq olmadan əmək haqqına düşmür.
      </p>
      {!data ? (
        <p className="muted">Yüklənir…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>İşçi</th><th>Mənbə</th><th>Qeydli gün</th><th>İşlənən saat</th><th>Artıq iş</th><th>İstirahət/bayram günü</th><th>Gecə</th><th>Gecikmə</th><th>Boş gün</th><th></th></tr>
            </thead>
            <tbody>
              {data.employees.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.name}</b><small className="skill-description">{[p.position, p.department].filter(Boolean).join(" · ")}{p.weekHours < 40 ? ` · ${p.weekHours} saatlıq həftə` : ""}</small></td>
                  <td>{p.mode === "daily" ? "Gündəlik" : p.mode === "month" ? <span>Ay yekunu{p.total && p.total.status !== "approved" && data.settings.overtimeApproval ? <small className="skill-description">təsdiq gözləyir</small> : null}</span> : "—"}</td>
                  <td>{p.summary.days}</td>
                  <td>{p.summary.worked}</td>
                  <td>{(p.mode === "month" ? p.total?.overtime : p.summary.overtime) || "—"}</td>
                  <td>{(p.mode === "month" ? p.total?.restDay : p.summary.restDay) || "—"}</td>
                  <td>{(p.mode === "month" ? p.total?.night : p.summary.night) || "—"}</td>
                  <td>{p.entries.filter((e) => e.late).length ? `${p.entries.filter((e) => e.late).length} gün / ${p.entries.reduce((t, e) => t + e.late, 0)} dəq` : "—"}</td>
                  <td>{p.missing.length ? <span title={p.missing.join(", ")}>{p.missing.length}</span> : "—"}</td>
                  <td className="admin-actions"><button type="button" onClick={() => setEdit(p)}>Gündəlik</button><button type="button" className="ghost" onClick={() => setMonthEdit(p)}>Ay yekunu</button></td>
                </tr>
              ))}
              {!data.employees.length && <tr><td colSpan={10}><p className="admin-empty">İşçi yoxdur.</p></td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {edit && data && <DayHours month={month} person={edit} days={data.days} notify={notify} onClose={() => setEdit(null)} onSaved={load} />}
      {setup && data && <ClockSettings settings={data.settings} notify={notify} onClose={() => setSetup(false)} onSaved={load} />}
      {journal && data && <Journal data={data} notify={notify} onClose={() => setJournal(false)} onSaved={load} />}
      {monthEdit && <MonthTotal month={month} person={monthEdit} notify={notify} onClose={() => setMonthEdit(null)} onSaved={load} />}
      {totalsImport && <SheetImport kind="hourtotals" extra={{ month }} notify={notify} onClose={() => setTotalsImport(false)} onDone={load} />}
      {importing && <SheetImport kind="hours" notify={notify} onClose={() => setImporting(false)} onDone={load} />}
    </div>
  );
}

function DayHours({ month, person, days, notify, onClose, onSaved }: { month: string; person: Person; days: Data["days"]; notify: Notify; onClose: () => void; onSaved: () => void }) {
  const initial = new Map(person.entries.map((e) => [e.day, e]));
  const [values, setValues] = useState<Record<string, { hours: string; night: string; inT: string; outT: string }>>(() =>
    Object.fromEntries(days.map((d) => [d.date, { hours: initial.get(d.date)?.hours ? String(initial.get(d.date)!.hours) : "", night: initial.get(d.date)?.night ? String(initial.get(d.date)!.night) : "", inT: initial.get(d.date)?.clockIn || "", outT: initial.get(d.date)?.clockOut || "" }])),
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
        if (hours === (before?.hours || 0) && night === (before?.night || 0) && v.inT === (before?.clockIn || "") && v.outT === (before?.clockOut || "")) continue;
        // Times without typed hours: the server works the hours out (break taken off, night 22:00–06:00).
        const hoursChanged = hours !== (before?.hours || 0) || night !== (before?.night || 0);
        await request("company/hours/save", { employeeId: person.id, day: d.date, hours: hoursChanged || !v.inT ? hours : 0, night: hoursChanged || !v.inT ? night : 0, clockIn: v.inT, clockOut: v.outT });
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
              <input type="time" aria-label={`${d.date} giriş`} value={values[d.date].inT} onChange={(e) => setValues({ ...values, [d.date]: { ...values[d.date], inT: e.target.value, hours: "", night: "" } })} />
              <input type="time" aria-label={`${d.date} çıxış`} value={values[d.date].outT} onChange={(e) => setValues({ ...values, [d.date]: { ...values[d.date], outT: e.target.value, hours: "", night: "" } })} />
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

function ClockSettings({ settings, notify, onClose, onSaved }: { settings: Settings; notify: Notify; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await request("company/hours/settings", form);
      notify("Ayarlar saxlanıldı.");
      onSaved();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Davamiyyət ayarları" onClose={onClose}>
      <div className="offer-composer">
        <Field label="İş başlayır"><input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
        <Field label="İş bitir"><input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
        <Field label="Nahar fasiləsi (dəqiqə): 4 saatdan uzun gündən çıxılır"><input type="number" min={0} max={240} value={form.breakMinutes} onChange={(e) => setForm({ ...form, breakMinutes: Number(e.target.value) })} /></Field>
        <Field label="Gecikmə sayılmayan müddət (dəqiqə)"><input type="number" min={0} max={120} value={form.graceMinutes} onChange={(e) => setForm({ ...form, graceMinutes: Number(e.target.value) })} /></Field>
        <label className="check-row"><input type="checkbox" checked={form.overtimeApproval} onChange={(e) => setForm({ ...form, overtimeApproval: e.target.checked })} /> Artıq iş və istirahət günü işi yalnız təsdiq edildikdə əmək haqqına düşsün</label>
        <label className="check-row"><input type="checkbox" checked={form.selfClock} onChange={(e) => setForm({ ...form, selfClock: e.target.checked })} /> İşçilər «İş yerim»də özləri gəliş-gediş qeyd etsin</label>
        <button type="button" className="primary" disabled={busy} onClick={() => void save()}>Yadda saxla</button>
      </div>
    </Modal>
  );
}

// Every day with arrival and departure, lateness, early leave and the extra hours waiting for a decision.
function Journal({ data, notify, onClose, onSaved }: { data: Data; notify: Notify; onClose: () => void; onSaved: () => void }) {
  const [only, setOnly] = useState<"all" | "late" | "extra">("all");
  const rows = data.employees.flatMap((p) => p.entries.map((e) => ({ p, e }))).filter(({ e }) => (only === "late" ? e.late || e.early : only === "extra" ? e.extra > 0 : true)).sort((a, b) => a.e.day.localeCompare(b.e.day) || a.p.name.localeCompare(b.p.name));
  async function decide(employeeId: string, day: string, status: string) {
    try {
      await request("company/hours/approve", { employeeId, day, status });
      onSaved();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function decideMonth(employeeId: string, status: string) {
    try {
      await request("company/hours/month-approve", { employeeId, month: data.month, status });
      onSaved();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <Modal title={`Giriş-çıxış jurnalı (${data.month})`} onClose={onClose}>
      <div className="offer-composer">
        <div className="admin-actions">
          {(["all", "late", "extra"] as const).map((k) => <button key={k} type="button" className={only === k ? "primary" : "ghost"} onClick={() => setOnly(k)}>{k === "all" ? "Hamısı" : k === "late" ? "Gecikmə / tez çıxış" : "Artıq iş"}</button>)}
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Tarix</th><th>İşçi</th><th>Giriş</th><th>Çıxış</th><th>Saat</th><th>Qeyd</th><th>Artıq iş</th></tr></thead>
            <tbody>
              {rows.map(({ p, e }) => (
                <tr key={`${p.id}${e.day}`}>
                  <td>{dmy(e.day)}</td><td>{p.name}</td><td>{e.clockIn || "—"}</td><td>{e.clockOut || "—"}</td><td>{e.hours}{e.source === "self" ? " (özü)" : ""}</td>
                  <td>{[e.late ? `${e.late} dəq gecikmə` : "", e.early ? `${e.early} dəq tez çıxış` : ""].filter(Boolean).join(" · ") || "—"}</td>
                  <td>
                    {e.extra > 0 ? (
                      <span>{e.extra} saat {e.overtimeStatus === "approved" ? (e.order ? `· əmr № ${e.order} əsasında` : "· təsdiqlənib") : e.overtimeStatus === "rejected" ? "· rədd edilib" : "· gözləyir"}{" "}
                        {e.overtimeStatus !== "approved" && <button type="button" onClick={() => void decide(p.id, e.day, "approved")}>Təsdiq</button>}{" "}
                        {e.overtimeStatus !== "rejected" && <button type="button" className="ghost" onClick={() => void decide(p.id, e.day, "rejected")}>Rədd</button>}
                      </span>
                    ) : "—"}
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7}><p className="admin-empty">Qeyd yoxdur.</p></td></tr>}
            </tbody>
          </table>
        </div>
        {data.employees.some((p) => p.mode === "month" && p.total && (p.total.overtime > 0 || p.total.restDay > 0)) && (
          <>
            <h4>Ay yekunu ilə yazılmış artıq iş</h4>
            <table className="admin-table">
              <thead><tr><th>İşçi</th><th>Artıq iş</th><th>İstirahət günü</th><th>Vəziyyət</th></tr></thead>
              <tbody>
                {data.employees.filter((p) => p.mode === "month" && p.total && (p.total.overtime > 0 || p.total.restDay > 0)).map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td><td>{p.total!.overtime}</td><td>{p.total!.restDay}</td>
                    <td>
                      {p.total!.status === "approved" ? "təsdiqlənib" : p.total!.status === "rejected" ? "rədd edilib" : "gözləyir"}{" "}
                      {p.total!.status !== "approved" && <button type="button" onClick={() => void decideMonth(p.id, "approved")}>Təsdiq</button>}{" "}
                      {p.total!.status !== "rejected" && <button type="button" className="ghost" onClick={() => void decideMonth(p.id, "rejected")}>Rədd</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {data.settings.overtimeApproval && <p className="muted">Təsdiq qaydası açıqdır: təsdiqlənməyən artıq iş və istirahət günü saatları əmək haqqına düşmür.</p>}
      </div>
    </Modal>
  );
}

function MonthTotal({ month, person, notify, onClose, onSaved }: { month: string; person: Person; notify: Notify; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ overtime: person.total?.overtime || 0, restDay: person.total?.restDay || 0, night: person.total?.night || 0, note: person.total?.note || "" });
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await request("company/hours/month-save", { employeeId: person.id, month, ...form });
      notify("Ay yekunu saxlanıldı.");
      onSaved();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const num = (key: "overtime" | "restDay" | "night", label: string) => (
    <Field label={label}><input type="number" min={0} max={400} step={0.5} value={form[key] || ""} onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })} /></Field>
  );
  return (
    <Modal title={`${person.name}: ay yekunu (${month})`} onClose={onClose}>
      <div className="offer-composer">
        {person.mode === "daily" ? (
          <p className="muted">Bu işçinin həmin ay üçün gündəlik saatı var: yalnız o sayılır. Ay yekunu yazmaq üçün əvvəl gündəlik qeydləri silin.</p>
        ) : (
          <>
            <p className="muted">Gündəlik qeyd yoxdursa, ayın artıq iş, istirahət günü və gecə saatları bir rəqəmlə yazılır.</p>
            {num("overtime", "Artıq iş saatı (2 qat, Əmək M. 165)")}
            {num("restDay", "İstirahət və bayram günü işlənən saat (164)")}
            {num("night", "Gecə saatı (22:00–06:00)")}
            <Field label="Qeyd"><input value={form.note} maxLength={200} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            <button type="button" className="primary" disabled={busy} onClick={() => void save()}>Yadda saxla</button>
          </>
        )}
      </div>
    </Modal>
  );
}
