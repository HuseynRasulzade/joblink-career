"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { planLeave } from "@/lib/leave-schedule";
import { Field } from "./components";

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
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "—");

function useLoad<T>(path: string, notify: Notify) {
  const [data, setData] = useState<T | null>(null);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<T>(path)
      .then(setData)
      .catch((error) => notifyRef.current((error as Error).message));
  }, [path]);
  useEffect(load, [load]);
  return [data, load] as const;
}

// The employee's leave plan: sees the approved and proposed leave of the year and proposes dates.
export function MyLeave({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const year = new Date().getFullYear();
  const [data, load] = useLoad<{ balance: { entitlement: number; accrued: number; used: number; remaining: number }; entries: { id: string; start: string; end: string; days: number; status: string; statusText: string; proposedBy: string; note: string; decidedBy: string }[] }>(`employee/leave-schedule?employeeId=${employeeId}&year=${year}`, notify);
  const [form, setForm] = useState({ start: "", days: 14, note: "" });
  const plan = useMemo(() => planLeave(form.start, form.days), [form.start, form.days]);
  async function propose() {
    try {
      await request("employee/leave-schedule/propose", { employeeId, ...form });
      notify("Təklif göndərildi: HR cavab verəcək.");
      setForm({ start: "", days: 14, note: "" });
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function withdraw(id: string) {
    try {
      await request("employee/leave-schedule/withdraw", { employeeId, id });
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="offer-composer">
      <p>Qalan məzuniyyət: <b>{data.balance.remaining} gün</b> (qazanılıb {data.balance.accrued}, istifadə {data.balance.used}).</p>
      {data.entries.length ? (
        <ul className="payment-history">
          {data.entries.map((e) => (
            <li key={e.id} className={e.status === "rejected" ? "payment-reversed" : ""}>
              <b>{dmy(e.start)} – {dmy(e.end)}</b> ({e.days} gün) · {e.statusText}{e.proposedBy === "employee" ? " (sizin təklifiniz)" : ""}{e.note ? ` · ${e.note}` : ""}
              {e.status === "proposed" && e.proposedBy === "employee" && <> <button type="button" className="text-button" onClick={() => void withdraw(e.id)}>geri götür</button></>}
            </li>
          ))}
        </ul>
      ) : <p className="muted">{year}-ci il üçün məzuniyyət planlaşdırılmayıb.</p>}
      <h4>Məzuniyyət təklif et</h4>
      <div className="form-grid">
        <Field label="Başlama tarixi"><input type="date" value={form.start} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
        <Field label="Gün sayı"><input type="number" min={1} max={60} value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></Field>
        <Field label="Qeyd"><input value={form.note} maxLength={300} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
      </div>
      {plan && <p className="muted">Son gün: {dmy(plan.end)} · işə çıxış: {dmy(plan.returnDate)}{plan.holidays.length ? ` · bayram günləri sayılmır (${plan.holidays.length})` : ""}</p>}
      <button type="button" className="primary" disabled={!plan} onClick={() => void propose()}>Təklifi göndər</button>
    </div>
  );
}

export function MyAssets({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data] = useLoad<{ items: { id: string; name: string; serial: string; inventoryNo: string; issuedOn: string; returnedOn: string; condition: string }[] }>(`employee/assets?employeeId=${employeeId}`, notify);
  if (!data) return <p className="muted">Yüklənir…</p>;
  if (!data.items.length) return <p className="muted">Sizə şirkət əmlakı verilməyib.</p>;
  return (
    <table className="admin-table">
      <thead><tr><th>Əmlak</th><th>Nömrələr</th><th>Verilib</th><th>Qaytarılıb</th></tr></thead>
      <tbody>
        {data.items.map((a) => (
          <tr key={a.id}><td><b>{a.name}</b><small className="skill-description">{a.condition}</small></td><td>{a.serial || "—"}<small className="skill-description">{a.inventoryNo}</small></td><td>{dmy(a.issuedOn)}</td><td>{a.returnedOn ? dmy(a.returnedOn) : "sizdədir"}</td></tr>
        ))}
      </tbody>
    </table>
  );
}

// An employee who is leaving may fill in the exit interview themselves.
export function ExitInterview({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data] = useLoad<{ open: boolean; questions: { id: string; label: string; kind: "choice" | "scale" | "yesno" | "text"; options?: string[] }[]; answers: Record<string, string> }>(`employee/offboarding?employeeId=${employeeId}`, notify);
  const [answers, setAnswers] = useState<Record<string, string> | null>(null);
  const current = answers || data?.answers || {};
  if (!data) return <p className="muted">Yüklənir…</p>;
  if (!data.open) return <p className="muted">Hazırda çıxış prosesi açıq deyil.</p>;
  async function save() {
    try {
      await request("employee/offboarding/interview", { employeeId, answers: current });
      notify("Cavablarınız göndərildi. Təşəkkür edirik.");
    } catch (error) {
      notify((error as Error).message);
    }
  }
  const set = (id: string, value: string) => setAnswers({ ...current, [id]: value });
  return (
    <div className="offer-composer">
      <p className="muted">Çıxış müsahibəsi könüllüdür; cavablarınız yalnız şirkətin kadr şöbəsinə görünür.</p>
      {data.questions.map((q) => (
        <Field key={q.id} label={q.label}>
          {q.kind === "text" ? (
            <input value={current[q.id] || ""} maxLength={1000} onChange={(e) => set(q.id, e.target.value)} />
          ) : (
            <select value={current[q.id] || ""} onChange={(e) => set(q.id, e.target.value)}>
              <option value="">—</option>
              {q.kind === "choice" && q.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              {q.kind === "scale" && [1, 2, 3, 4, 5].map((n) => <option key={n} value={String(n)}>{n}</option>)}
              {q.kind === "yesno" && (<><option value="yes">Bəli</option><option value="no">Xeyr</option></>)}
            </select>
          )}
        </Field>
      ))}
      <button type="button" className="primary" onClick={() => void save()}>Göndər</button>
    </div>
  );
}
