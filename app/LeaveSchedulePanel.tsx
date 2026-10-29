"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { planLeave } from "@/lib/leave-schedule";
import { Field, Modal } from "./components";

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

type Person = { id: string; name: string; position: string; department: string; entitlement: number; remaining: number; planned: number };
type Entry = { id: string; employeeId: string; name: string; start: string; end: string; days: number; status: string; statusText: string; proposedBy: string; note: string; decidedBy: string };
type Data = { year: number; employees: Person[]; entries: Entry[]; load: { department: string; size: number; months: number[] }[] };
const MONTHS = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];
const dmy = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The annual leave schedule: plan, check that not too many of a department are away together, approve, print.
export default function LeaveSchedulePanel({ notify }: { notify: Notify }) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [data, setData] = useState<Data | null>(null);
  const [edit, setEdit] = useState<{ id: string; employeeId: string; start: string; days: number; note: string } | null>(null);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<Data>(`company/leave-schedule?year=${year}`)
      .then(setData)
      .catch((error) => notifyRef.current((error as Error).message));
  }, [year]);
  useEffect(load, [load]);
  async function act(path: string, body: Record<string, unknown>, done: string) {
    try {
      await request(path, body);
      notify(done);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  function print() {
    if (!data) return;
    const win = window.open("", "_blank");
    if (!win) return notify("Çap pəncərəsi bloklanıb.");
    const rows = data.entries.filter((e) => e.status !== "rejected").map((e, i) => {
      const p = data.employees.find((x) => x.id === e.employeeId);
      return `<tr><td>${i + 1}</td><td>${esc(e.name)}</td><td>${esc(p?.position || "")}</td><td>${esc(p?.department || "")}</td><td>${e.days}</td><td>${dmy(e.start)}</td><td>${dmy(e.end)}</td><td></td></tr>`;
    }).join("");
    win.document.write(`<!doctype html><html lang="az"><head><meta charset="utf-8"><title>Məzuniyyət qrafiki ${data.year}</title><style>body{font:13px/1.4 "Times New Roman",serif;margin:30px}h1{text-align:center;font-size:16px}table{width:100%;border-collapse:collapse;margin-top:14px}th,td{border:1px solid #333;padding:4px 6px}.sign{margin-top:40px;display:flex;justify-content:space-between}</style></head><body>
      <h1>${data.year}-ci il üçün əmək məzuniyyəti qrafiki</h1>
      <table><thead><tr><th>№</th><th>Ad Soyad</th><th>Vəzifə</th><th>Struktur bölmə</th><th>Gün</th><th>Başlanğıc</th><th>Bitmə</th><th>İşçinin imzası</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="sign"><span>Kadrlar şöbəsi: ____________</span><span>Direktor: ____________</span></div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  const pending = data.entries.filter((e) => e.status === "proposed");
  const withPlan = new Set(data.entries.filter((e) => e.status !== "rejected").map((e) => e.employeeId));
  const without = data.employees.filter((p) => !withPlan.has(p.id));
  const maxLoad = Math.max(1, ...data.load.flatMap((l) => l.months));
  return (
    <div className="company-page">
      <div className="section-heading">
        <div className="admin-actions">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="İl">
            {[thisYear - 1, thisYear, thisYear + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="admin-actions">
          <a className="secondary report-button" href={`/api/joblink/company/leave-schedule/export?year=${year}`} download><Download size={14} /> Excel</a>
          <button type="button" className="secondary" onClick={print}><Printer size={14} /> Çap (imza vərəqi)</button>
          <button type="button" className="primary" onClick={() => setEdit({ id: "", employeeId: data.employees[0]?.id || "", start: "", days: 14, note: "" })}>+ Məzuniyyət planla</button>
        </div>
      </div>
      <div className="staff-kpis">
        <div className="staff-kpi"><small>Planlaşdırılıb</small><strong>{data.entries.filter((e) => e.status !== "rejected").length}</strong><span>{withPlan.size} / {data.employees.length} işçi</span></div>
        <div className={`staff-kpi ${pending.length ? "" : "staff-kpi-good"}`}><small>Təsdiq gözləyir</small><strong>{pending.length}</strong><span>işçi təklifləri daxildir</span></div>
        <div className="staff-kpi"><small>Planı olmayan işçi</small><strong>{without.length}</strong><span>qrafikə daxil edilməyib</span></div>
      </div>
      <h4>Departament üzrə yük (ayda məzuniyyətdə olan işçi sayı)</h4>
      <div className="admin-table-wrap">
        <table className="admin-table leave-load">
          <thead><tr><th>Departament</th>{MONTHS.map((m) => <th key={m}>{m}</th>)}</tr></thead>
          <tbody>
            {data.load.map((l) => (
              <tr key={l.department}>
                <td>{l.department} <small className="skill-description">{l.size} nəfər</small></td>
                {l.months.map((n, i) => (
                  <td key={i} style={{ background: n ? `rgba(24,124,108,${0.12 + (0.55 * n) / maxLoad})` : undefined, textAlign: "center" }}>{n || ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h4>Qrafik</h4>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>İşçi</th><th>Tarixlər</th><th>Gün</th><th>Vəziyyət</th><th></th></tr></thead>
          <tbody>
            {data.entries.map((e) => (
              <tr key={e.id} className={e.status === "rejected" ? "payment-reversed" : ""}>
                <td><b>{e.name}</b><small className="skill-description">{data.employees.find((p) => p.id === e.employeeId)?.department}</small></td>
                <td>{dmy(e.start)} – {dmy(e.end)}{e.note && <small className="skill-description">{e.note}</small>}</td>
                <td>{e.days}</td>
                <td>{e.statusText}{e.proposedBy === "employee" ? <small className="skill-description">işçi təklifi</small> : null}{e.decidedBy && <small className="skill-description">{e.decidedBy}</small>}</td>
                <td className="admin-actions">
                  {e.status === "proposed" && <button type="button" className="primary" onClick={() => void act("company/leave-schedule/decide", { id: e.id, decision: "approve" }, "Təsdiqləndi.")}>Təsdiqlə</button>}
                  {e.status === "proposed" && <button type="button" onClick={() => { const note = window.prompt("Rədd səbəbi (işçiyə göndərilir):") ?? ""; void act("company/leave-schedule/decide", { id: e.id, decision: "reject", note }, "Rədd edildi."); }}>Rədd et</button>}
                  <button type="button" onClick={() => setEdit({ id: e.id, employeeId: e.employeeId, start: e.start, days: e.days, note: e.note })}>Dəyiş</button>
                  <button type="button" className="danger" onClick={() => window.confirm("Qeyd silinsin?") && void act("company/leave-schedule/delete", { id: e.id }, "Silindi.")}>Sil</button>
                </td>
              </tr>
            ))}
            {!data.entries.length && <tr><td colSpan={5}><p className="admin-empty">Bu il üçün hələ məzuniyyət planlaşdırılmayıb.</p></td></tr>}
          </tbody>
        </table>
      </div>
      {without.length > 0 && <p className="muted"><b>Planı olmayanlar:</b> {without.map((p) => `${p.name} (qalıq ${p.remaining} gün)`).join(", ")}.</p>}
      {edit && <LeaveForm data={data} initial={edit} notify={notify} onClose={() => setEdit(null)} onSaved={load} />}
    </div>
  );
}

function LeaveForm({ data, initial, notify, onClose, onSaved }: { data: Data; initial: { id: string; employeeId: string; start: string; days: number; note: string }; notify: Notify; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(initial);
  const person = data.employees.find((p) => p.id === form.employeeId);
  const plan = useMemo(() => planLeave(form.start, form.days), [form.start, form.days]);
  async function save(approve: boolean) {
    try {
      const result = await request<{ warnings: string[] }>("company/leave-schedule/save", { ...form, approve });
      notify(result.warnings.length ? `Saxlanıldı. Diqqət: ${result.warnings.join(" ")}` : approve ? "Qrafikə daxil edildi." : "Təklif kimi saxlanıldı.");
      onSaved();
      onClose();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <Modal title={form.id ? "Məzuniyyəti dəyiş" : "Məzuniyyət planla"} onClose={onClose}>
      <div className="offer-composer">
        <div className="form-grid">
          <Field label="İşçi">
            <select value={form.employeeId} disabled={!!form.id} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
              {data.employees.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.department || "departamentsiz"}</option>)}
            </select>
          </Field>
          <Field label="Başlama tarixi"><input type="date" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
          <Field label="Gün sayı"><input type="number" min={1} max={90} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></Field>
          <Field label="Qeyd"><input value={form.note} maxLength={300} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
        </div>
        {person && <p className="muted">Qalıq məzuniyyət: <b>{person.remaining} gün</b> (hüquq {person.entitlement}); bu il planlaşdırılıb: {person.planned} gün.</p>}
        {plan && (
          <p>
            Son gün: <b>{dmy(plan.end)}</b> · işə çıxış: <b>{dmy(plan.returnDate)}</b>
            {plan.holidays.length > 0 && <small className="skill-description"> bayram günləri sayılmır: {plan.holidays.map((h) => `${h.date.slice(8, 10)}.${h.date.slice(5, 7)}`).join(", ")}</small>}
          </p>
        )}
        <div className="admin-actions">
          <button type="button" className="primary" disabled={!plan} onClick={() => void save(true)}>Qrafikdə təsdiqlə</button>
          <button type="button" className="secondary" disabled={!plan} onClick={() => void save(false)}>Təklif kimi saxla</button>
        </div>
      </div>
    </Modal>
  );
}
