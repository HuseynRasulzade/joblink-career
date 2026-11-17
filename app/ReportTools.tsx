"use client";
import { useCallback, useEffect, useState } from "react";
import { Bookmark, Copy, KeyRound, Mail, Trash2 } from "lucide-react";
import type { Result } from "@/lib/report-compare";

type Notify = (message: string) => void;
async function call<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, { method: body === undefined ? "GET" : "POST", credentials: "same-origin", cache: "no-store", headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || "Əməliyyat alınmadı.");
  return data;
}

// A bar chart of one numeric column (the first column names the bars): the biggest 15, plain SVG.
export function ReportChart({ data, column }: { data: Result; column: number }) {
  const rows = data.rows.filter((r) => typeof r[column] === "number").map((r) => ({ label: String(r[0] || "—"), value: r[column] as number })).sort((a, b) => b.value - a.value).slice(0, 15);
  if (!rows.length) return <p className="muted">Qrafik üçün rəqəm sütunu yoxdur.</p>;
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const rowH = 24;
  const left = 190;
  const width = 640;
  return (
    <svg viewBox={`0 0 ${width} ${rows.length * rowH + 8}`} role="img" aria-label={`${data.columns[column]} qrafiki`} style={{ width: "100%", maxWidth: 760 }}>
      {rows.map((r, i) => {
        const w = ((width - left - 70) * Math.abs(r.value)) / max;
        return (
          <g key={`${r.label}-${i}`} transform={`translate(0 ${i * rowH + 4})`}>
            <text x={left - 8} y={14} fontSize={12} textAnchor="end" fill="currentColor">{r.label.length > 26 ? `${r.label.slice(0, 25)}…` : r.label}</text>
            <rect x={left} y={3} width={Math.max(2, w)} height={15} rx={3} fill={r.value < 0 ? "#b42318" : "var(--teal, #1b7f73)"} />
            <text x={left + Math.max(2, w) + 6} y={14} fontSize={12} fill="currentColor">{Number.isInteger(r.value) ? r.value : r.value.toFixed(2)}</text>
          </g>
        );
      })}
    </svg>
  );
}

type Saved = { id: string; reportId: string; name: string; filters: Record<string, string> };
// Filters kept under a name (own, per user): one click brings them back.
export function SavedBar({ reportId, values, onApply, notify }: { reportId: string; values: Record<string, string>; onApply: (filters: Record<string, string>) => void; notify: Notify }) {
  const [items, setItems] = useState<Saved[]>([]);
  const load = useCallback(() => {
    call<{ items: Saved[] }>(`company/reports/saved?report=${encodeURIComponent(reportId)}`).then((r) => setItems(r.items)).catch(() => undefined);
  }, [reportId]);
  useEffect(load, [load]);
  async function save() {
    const name = window.prompt("Bu süzgəclər hansı adla saxlansın?");
    if (!name) return;
    try {
      await call("company/reports/saved", { reportId, name, filters: values });
      notify("Süzgəclər saxlanıldı.");
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function remove(id: string) {
    await call("company/reports/saved/delete", { id }).catch(() => undefined);
    load();
  }
  return (
    <div className="admin-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
      <button type="button" className="secondary" onClick={() => void save()}><Bookmark size={14} /> Süzgəcləri saxla</button>
      {items.map((s) => (
        <span key={s.id} className="admin-actions" style={{ gap: 2 }}>
          <button type="button" className="secondary" onClick={() => onApply(s.filters)}>{s.name}</button>
          <button type="button" className="text-button" aria-label={`${s.name} sil`} onClick={() => void remove(s.id)}><Trash2 size={13} /></button>
        </span>
      ))}
    </div>
  );
}

type Schedule = { id: string; reportId: string; frequency: string; nextRun: string; lastRun: string };
// The report to the sender's own e-mail, every Monday or on the first of the month.
export function ScheduleBar({ reportId, notify }: { reportId: string; notify: Notify }) {
  const [items, setItems] = useState<Schedule[]>([]);
  const load = useCallback(() => {
    call<{ items: Schedule[] }>("company/reports/schedules").then((r) => setItems(r.items.filter((x) => x.reportId === reportId))).catch(() => undefined);
  }, [reportId]);
  useEffect(load, [load]);
  async function add(frequency: "weekly" | "monthly") {
    try {
      const r = await call<{ nextRun: string }>("company/reports/schedules", { reportId, frequency });
      notify(`Göndəriş quruldu: ilk e-poçt ${r.nextRun} tarixində.`);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function remove(id: string) {
    await call("company/reports/schedules/delete", { id }).catch(() => undefined);
    load();
  }
  return (
    <div className="admin-actions" style={{ justifyContent: "flex-start", flexWrap: "wrap" }}>
      <Mail size={14} />
      <span className="muted">E-poçtla göndər (öz ünvanınıza):</span>
      <button type="button" className="secondary" disabled={items.some((i) => i.frequency === "weekly")} onClick={() => void add("weekly")}>hər bazar ertəsi</button>
      <button type="button" className="secondary" disabled={items.some((i) => i.frequency === "monthly")} onClick={() => void add("monthly")}>hər ayın 1-i</button>
      {items.map((i) => (
        <span key={i.id} className="muted">
          {i.frequency === "monthly" ? "aylıq" : "həftəlik"} · növbəti {i.nextRun}{" "}
          <button type="button" className="text-button" aria-label="Göndərişi sil" onClick={() => void remove(i.id)}><Trash2 size={13} /></button>
        </span>
      ))}
    </div>
  );
}

// The key for Power BI / Excel: one per company, shown once, can be replaced or revoked.
export function FeedKeyPanel({ notify }: { notify: Notify }) {
  const [state, setState] = useState<{ exists: boolean; created: string; lastUsed: string } | null>(null);
  const [token, setToken] = useState("");
  const load = useCallback(() => {
    call<{ exists: boolean; created: string; lastUsed: string }>("company/reports/feed-token").then(setState).catch(() => setState(null));
  }, []);
  useEffect(load, [load]);
  if (!state) return null;
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  async function create() {
    if (state?.exists && !window.confirm("Yeni açar köhnəsini ləğv edəcək: köhnə açarla bağlı Power BI/Excel sorğuları dayanacaq. Davam edək?")) return;
    try {
      const r = await call<{ token: string }>("company/reports/feed-token", {});
      setToken(r.token);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function revoke() {
    if (!window.confirm("Açar ləğv edilsin?")) return;
    await call("company/reports/feed-token/revoke", {}).catch((e) => notify((e as Error).message));
    setToken("");
    load();
  }
  const url = `${origin}/api/report-feed/staff-plan`;
  return (
    <section className="panel">
      <h3><KeyRound size={16} /> Xarici alətlər (Power BI, Excel)</h3>
      <p className="muted">Ştat planını CSV kimi canlı oxumaq üçün açar yaradın. Fayl şəxsi ad və maaş içərmir, yalnız ştat sətirləri, say, maaş həddi və xərc. Excel: Data → From Web; Power BI: Get data → Web, başlıq <code>Authorization: Bearer AÇAR</code>.</p>
      <p className="muted">{state.exists ? `Açar var (yaradılıb ${state.created.slice(0, 10)}${state.lastUsed ? `, son istifadə ${state.lastUsed.slice(0, 10)}` : ", hələ istifadə olunmayıb"}).` : "Açar yoxdur."}</p>
      {token && (
        <div className="notice" role="status">
          <p style={{ margin: "0 0 6px" }}><b>Açarı indi kopyalayın: bir daha göstərilməyəcək.</b></p>
          <code style={{ wordBreak: "break-all" }}>{token}</code>
          <div className="admin-actions"><button type="button" className="secondary" onClick={() => { void navigator.clipboard?.writeText(token); notify("Açar kopyalandı."); }}><Copy size={14} /> Kopyala</button></div>
          <p className="muted" style={{ marginBottom: 0 }}>Ünvan: <code>{url}</code></p>
        </div>
      )}
      <div className="admin-actions">
        <button type="button" className="secondary" onClick={() => void create()}>{state.exists ? "Açarı yenilə" : "Açar yarat"}</button>
        {state.exists && <button type="button" className="secondary" onClick={() => void revoke()}>Ləğv et</button>}
      </div>
    </section>
  );
}
