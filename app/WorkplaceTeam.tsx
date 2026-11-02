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
  perf: { cycleId: string; name: string; end: string; people: { employeeId: string; name: string; selfScore: number | null; managerScore: number | null; managerComment: string; status: string; goals: { title: string; weight: number; progress: number; score: number | null }[] }[] } | null;
  trips: { id: string; employeeId: string; name: string; destination: string; purpose: string; start: string; end: string; abroad: boolean; waiting: boolean }[];
  shifts: { employeeId: string; name: string; day: string; shift: string; start: string; end: string }[];
};

// The direct manager's page: leave applications of their people wait here before HR draws the order up.
export default function MyTeam({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data, setData] = useState<Team | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
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
  async function tripDecide(tripId: string, decision: "approve" | "reject") {
    try {
      await request("employee/team/trip", { employeeId, tripId, decision, note: notes[tripId] || "" });
      notify(decision === "approve" ? "Ezamiyyət təsdiq edildi: HR-a göndərildi." : "Ezamiyyət rədd edildi.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function review(personId: string, cycleId: string, oldComment: string, oldScore: number | null) {
    try {
      await request("employee/team/review", { employeeId, personId, cycleId, score: Number(scores[personId] || 0) || oldScore || undefined, comment: comments[personId] ?? oldComment });
      notify("Qiymət saxlanıldı, işçiyə bildiriş göndərildi.");
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
      {data.trips.length > 0 && (
        <>
          <h4>Ezamiyyətlər</h4>
          {data.trips.map((tr) => (
            <div key={tr.id} className="bank-batch">
              <b>{tr.name}</b> <small className="skill-description">{tr.destination}{tr.abroad ? " (xarici)" : ""} · {dmy(tr.start)} – {dmy(tr.end)}{tr.purpose ? ` · ${tr.purpose}` : ""}</small>
              {tr.waiting ? (
                <div className="admin-actions">
                  <input aria-label="Qeyd" placeholder="Qeyd (rədd üçün səbəb məcburidir)" value={notes[tr.id] || ""} onChange={(e) => setNotes({ ...notes, [tr.id]: e.target.value })} />
                  <button type="button" className="primary" onClick={() => void tripDecide(tr.id, "approve")}>Təsdiq</button>
                  <button type="button" className="ghost" onClick={() => void tripDecide(tr.id, "reject")}>Rədd</button>
                </div>
              ) : <small className="skill-description">Təsdiqlənib, HR hesablaşmanı aparır.</small>}
            </div>
          ))}
        </>
      )}
      {data.perf && (
        <>
          <h4>Performans: {data.perf.name} (son tarix {dmy(data.perf.end)})</h4>
          <table className="admin-table">
            <thead><tr><th>İşçi</th><th>Özünüqiymət</th><th>Məqsədlər</th><th>Sizin qiymətiniz (1–5)</th><th></th></tr></thead>
            <tbody>
              {data.perf.people.map((p) => (
                <tr key={p.employeeId}>
                  <td>{p.name}</td>
                  <td>{p.selfScore ?? "—"}</td>
                  <td>{p.goals.length ? p.goals.map((g) => `${g.title} (${g.progress}%)`).join("; ") : "—"}</td>
                  <td>
                    <select aria-label={`${p.name}: qiymət`} value={scores[p.employeeId] ?? String(p.managerScore ?? "")} onChange={(e) => setScores({ ...scores, [p.employeeId]: e.target.value })}>
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <input aria-label={`${p.name}: rəy`} placeholder="Rəy" defaultValue={p.managerComment} onChange={(e) => setComments({ ...comments, [p.employeeId]: e.target.value })} />
                  </td>
                  <td><button type="button" disabled={!(scores[p.employeeId] || p.managerScore)} onClick={() => void review(p.employeeId, data.perf!.cycleId, p.managerComment, p.managerScore)}>{p.status === "open" ? "Qiymətləndir" : "Yenilə"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {data.shifts.length > 0 && (
        <>
          <h4>Növbələr (növbəti 14 gün)</h4>
          <table className="admin-table">
            <thead><tr><th>Tarix</th><th>İşçi</th><th>Növbə</th></tr></thead>
            <tbody>{data.shifts.map((r, i) => <tr key={i}><td>{dmy(r.day)}</td><td>{r.name}</td><td>{r.shift} {r.start}–{r.end}</td></tr>)}</tbody>
          </table>
        </>
      )}
      <h4>1:1 görüşlər</h4>
      <OneOnOnePanel employeeId={employeeId} people={data.people.map((p) => ({ id: p.id, name: p.name }))} notify={notify} />
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

type Note = { id: string; day: string; topics: string; decisions: string; nextStep: string; shared: boolean; author: string };
function OneOnOnePanel({ employeeId, people, notify }: { employeeId: string; people: { id: string; name: string }[]; notify: Notify }) {
  const [personId, setPersonId] = useState("");
  const [items, setItems] = useState<Note[]>([]);
  const [form, setForm] = useState({ topics: "", decisions: "", nextStep: "", shared: true });
  const load = useCallback((id: string) => {
    if (!id) return;
    request<{ items: Note[] }>(`employee/team/one-on-ones?employeeId=${employeeId}&personId=${id}`).then((r) => setItems(r.items)).catch((error) => notify((error as Error).message));
  }, [employeeId, notify]);
  async function save() {
    try {
      await request("employee/team/one-on-ones", { employeeId, personId, ...form });
      setForm({ topics: "", decisions: "", nextStep: "", shared: true });
      notify("1:1 qeydi saxlanıldı.");
      load(personId);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  return (
    <div className="offer-composer">
      <select aria-label="İşçi" value={personId} onChange={(e) => { setPersonId(e.target.value); setItems([]); load(e.target.value); }}>
        <option value="">İşçi seçin</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {personId && (
        <>
          <input aria-label="Mövzular" placeholder="Müzakirə mövzuları" value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} />
          <input aria-label="Qərarlar" placeholder="Qərarlar" value={form.decisions} onChange={(e) => setForm({ ...form, decisions: e.target.value })} />
          <input aria-label="Növbəti addım" placeholder="Növbəti addım" value={form.nextStep} onChange={(e) => setForm({ ...form, nextStep: e.target.value })} />
          <label className="check"><input type="checkbox" checked={form.shared} onChange={(e) => setForm({ ...form, shared: e.target.checked })} /> İşçi görsün</label>
          <button type="button" className="primary" disabled={form.topics.trim().length < 3} onClick={() => void save()}>Saxla</button>
          {items.map((n) => <div key={n.id} className="bank-batch"><b>{dmy(n.day)}</b> <small className="skill-description">{n.author}{n.shared ? "" : " · yalnız rəhbərlər görür"}</small><p>{n.topics}</p>{n.decisions && <p><b>Qərar:</b> {n.decisions}</p>}{n.nextStep && <p><b>Növbəti:</b> {n.nextStep}</p>}</div>)}
        </>
      )}
    </div>
  );
}
