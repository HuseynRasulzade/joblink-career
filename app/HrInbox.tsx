"use client";
import { useCallback, useEffect, useState } from "react";

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
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : iso);

type Inbox = {
  overtime: { employeeId: string; name: string; kind: "day" | "month"; day: string; extra: number }[];
  swaps: { id: string; day: string; from: string; to: string; fromShift: string; toShift: string }[];
  trips: { id: string; name: string; destination: string; start: string; end: string; abroad: boolean }[];
  plans: { id: string; name: string; start: string; end: string; days: number }[];
  batches: { id: string; month: string; kind: string; status: string; total: number; count: number }[];
  applications: number;
  changes: { id: string; name: string; label: string; value: string }[];
};

// Everything that waits for HR or the director, beside the vacancy and structure approvals above.
export default function HrInbox({ go, notify }: { go: (page: string) => void; notify: Notify }) {
  const [data, setData] = useState<Inbox | null>(null);
  const load = useCallback(() => {
    request<Inbox>("company/inbox").then(setData).catch(() => setData(null));
  }, []);
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
  if (!data) return null;
  const empty = !data.overtime.length && !data.swaps.length && !data.trips.length && !data.plans.length && !data.batches.length && !data.applications && !data.changes.length;
  return (
    <section className="panel" aria-label="Digər gözləyən təsdiqlər">
      <h3>Digər gözləyən təsdiqlər</h3>
      {empty && <p className="muted">Hazırda gözləyən başqa təsdiq yoxdur.</p>}
      {data.applications > 0 && <p><button type="button" className="text-button" onClick={() => go("hr-orders")}><b>{data.applications}</b> işçi ərizəsi cavab gözləyir →</button></p>}
      {data.batches.length > 0 && (
        <>
          <h4>Ödəniş sənədləri</h4>
          {data.batches.map((b) => (
            <p key={b.id}><button type="button" className="text-button" onClick={() => go("hr-payroll")}>{b.month} · {b.kind === "advance" ? "avans" : b.kind === "vacation" ? "məzuniyyət" : b.kind === "benefit" ? "müavinət" : "əmək haqqı"} · {b.count} nəfər · {b.total.toFixed(2)} AZN · {b.status === "draft" ? "təsdiq gözləyir" : "təsdiqlənib, bankda"} →</button></p>
          ))}
        </>
      )}
      {data.changes.length > 0 && (
        <>
          <h4>İşçi məlumatının dəyişdirilməsi</h4>
          {data.changes.map((c) => (
            <p key={c.id}>{c.name}: {c.label} → <b>{c.value}</b>{" "}
              <button type="button" className="primary" onClick={() => void act("company/profile-changes/decide", { id: c.id, decision: "approve" }, "Dəyişiklik işçi kartında tətbiq olundu.")}>Təsdiq, kartı yenilə</button>{" "}
              <button type="button" className="ghost" onClick={() => { const reason = window.prompt("Rədd səbəbi:") || ""; if (reason.length >= 5) void act("company/profile-changes/decide", { id: c.id, decision: "reject", reason }, "Rədd edildi."); }}>Rədd</button></p>
          ))}
        </>
      )}
      {data.overtime.length > 0 && (
        <>
          <h4>Artıq iş saatları</h4>
          <table className="admin-table">
            <tbody>
              {data.overtime.map((o) => (
                <tr key={`${o.employeeId}${o.day}${o.kind}`}>
                  <td>{o.name}</td><td>{o.kind === "month" ? `${o.day} (ay yekunu)` : dmy(o.day)}</td><td>{o.extra} saat</td>
                  <td className="admin-actions">
                    <button type="button" className="primary" onClick={() => void act(o.kind === "month" ? "company/hours/month-approve" : "company/hours/approve", o.kind === "month" ? { employeeId: o.employeeId, month: o.day, status: "approved" } : { employeeId: o.employeeId, day: o.day, status: "approved" }, "Artıq iş təsdiq edildi.")}>Təsdiq</button>
                    <button type="button" className="ghost" onClick={() => void act(o.kind === "month" ? "company/hours/month-approve" : "company/hours/approve", o.kind === "month" ? { employeeId: o.employeeId, month: o.day, status: "rejected" } : { employeeId: o.employeeId, day: o.day, status: "rejected" }, "Artıq iş rədd edildi.")}>Rədd</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {data.swaps.length > 0 && (
        <>
          <h4>Növbə dəyişdirmə</h4>
          {data.swaps.map((s) => (
            <p key={s.id}>{dmy(s.day)}: {s.from} ({s.fromShift || "—"}) ↔ {s.to} ({s.toShift || "—"}){" "}
              <button type="button" className="primary" onClick={() => void act("company/shift-swaps/decide", { id: s.id, approve: true }, "Növbələr dəyişdirildi.")}>Təsdiq</button>{" "}
              <button type="button" className="ghost" onClick={() => void act("company/shift-swaps/decide", { id: s.id, approve: false }, "Rədd edildi.")}>Rədd</button></p>
          ))}
        </>
      )}
      {data.trips.length > 0 && (
        <>
          <h4>Ezamiyyət sorğuları</h4>
          {data.trips.map((t) => (
            <p key={t.id}>{t.name}: {t.destination}{t.abroad ? " (xarici)" : ""}, {dmy(t.start)} – {dmy(t.end)}{" "}
              <button type="button" className="primary" onClick={() => void act("company/trips/decide", { id: t.id, decision: "approve" }, "Ezamiyyət təsdiqləndi, əmr hazırlandı.")}>Təsdiq</button>{" "}
              <button type="button" className="ghost" onClick={() => { const note = window.prompt("Rədd səbəbi:") || ""; if (note.length >= 3) void act("company/trips/decide", { id: t.id, decision: "reject", note }, "Rədd edildi."); }}>Rədd</button></p>
          ))}
        </>
      )}
      {data.plans.length > 0 && (
        <>
          <h4>Təklif olunmuş məzuniyyət qrafiki</h4>
          {data.plans.map((p) => (
            <p key={p.id}>{p.name}: {dmy(p.start)} – {dmy(p.end)} ({p.days} gün){" "}
              <button type="button" className="primary" onClick={() => void act("company/leave-schedule/decide", { id: p.id, decision: "approve" }, "Təsdiqləndi.")}>Təsdiq</button>{" "}
              <button type="button" className="ghost" onClick={() => void act("company/leave-schedule/decide", { id: p.id, decision: "reject" }, "Rədd edildi.")}>Rədd</button></p>
          ))}
        </>
      )}
    </section>
  );
}
