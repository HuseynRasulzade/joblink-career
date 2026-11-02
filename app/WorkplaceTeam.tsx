"use client";
import { useCallback, useEffect, useRef, useState } from "react";

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
const CODE: Record<string, string> = { annual: "illik məzuniyyət", addleave: "əlavə məzuniyyət", creative: "yaradıcılıq məzuniyyəti", unpaid: "ödənişsiz məzuniyyət", study: "təhsil məzuniyyəti", maternity: "analıq", childcare: "uşağa qulluq", paternity: "atalıq", donor: "donor günü", medical: "tibbi müayinə", sick: "xəstəlik", injury: "iş zədəsi", trip: "ezamiyyət", summons: "çağırış", military: "hərbi", downtime: "boşdayanma" };

type Team = {
  people: { id: string; name: string; position: string; department: string; away: string }[];
  requests: { id: string; employeeId: string; name: string; position: string; label: string; from: string; to: string; reason: string; status: string; note: string; decidedAt: string; checks: string[]; balance: number | null }[];
  away: { name: string; from: string; to: string; code: string }[];
};

// The direct manager's page: leave applications of their people wait here before HR draws the order up.
export default function MyTeam({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data, setData] = useState<Team | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });
  const load = useCallback(() => {
    request<Team>(`employee/team?employeeId=${employeeId}`)
      .then(setData)
      .catch((error) => notifyRef.current((error as Error).message));
  }, [employeeId]);
  useEffect(load, [load]);
  async function decide(requestId: string, decision: "approve" | "reject") {
    try {
      await request("employee/team/decide", { employeeId, requestId, decision, note: notes[requestId] || "" });
      notify(decision === "approve" ? "Təsdiq edildi: ərizə HR-a göndərildi." : "Ərizə rədd edildi.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!data) return <p className="muted">Yüklənir…</p>;
  const pending = data.requests.filter((r) => r.status === "pending");
  const done = data.requests.filter((r) => r.status !== "pending");
  return (
    <div className="offer-composer">
      <h4>Təsdiqinizi gözləyənlər ({pending.length})</h4>
      {!pending.length && <p className="muted">Gözləyən ərizə yoxdur.</p>}
      {pending.map((r) => (
        <div key={r.id} className="bank-batch">
          <b>{r.name}</b> <small className="skill-description">{r.position} · {r.label} · {dmy(r.from)}{r.to && r.to !== r.from ? ` – ${dmy(r.to)}` : ""}{r.balance !== null ? ` · qalan məzuniyyət ${r.balance} gün` : ""}</small>
          {r.reason && <small className="skill-description">Səbəb: {r.reason}</small>}
          {r.checks.map((c) => <small key={c} className="skill-description" role="alert">⚠ {c}</small>)}
          <div className="admin-actions">
            <input aria-label="Qeyd" placeholder="Qeyd (rədd üçün səbəb məcburidir)" value={notes[r.id] || ""} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
            <button type="button" className="primary" onClick={() => void decide(r.id, "approve")}>Təsdiq</button>
            <button type="button" className="ghost" onClick={() => void decide(r.id, "reject")}>Rədd</button>
          </div>
        </div>
      ))}
      <h4>Komandam ({data.people.length})</h4>
      <table className="admin-table">
        <thead><tr><th>İşçi</th><th>Vəzifə</th><th>Bu gün</th></tr></thead>
        <tbody>{data.people.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.position || "—"}</td><td>{p.away ? CODE[p.away] || p.away : "işdə"}</td></tr>)}</tbody>
      </table>
      <h4>Növbəti 45 gündə yoxdur</h4>
      {!data.away.length ? <p className="muted">Planlaşdırılmış yoxluq yoxdur.</p> : (
        <table className="admin-table">
          <thead><tr><th>İşçi</th><th>Tarix</th><th>Növ</th></tr></thead>
          <tbody>{data.away.map((a, i) => <tr key={i}><td>{a.name}</td><td>{dmy(a.from)}{a.to !== a.from ? ` – ${dmy(a.to)}` : ""}</td><td>{CODE[a.code] || a.code}</td></tr>)}</tbody>
        </table>
      )}
      {done.length > 0 && (
        <>
          <h4>Son qərarlarınız</h4>
          <table className="admin-table">
            <tbody>{done.map((r) => <tr key={r.id}><td>{r.name}</td><td>{r.label}</td><td>{dmy(r.from)}</td><td>{r.status === "approved" ? "təsdiq" : "rədd"}{r.note ? `: ${r.note}` : ""}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </div>
  );
}
