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
const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}/.test(iso || "") ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : iso || "—");

type Policy = { id: string; kind: string; title: string; requiresAck: boolean; version: number; effectiveDate: string; body: string; ackedAt: string; withdrawnAt: string; earlierVersion: number };
const KIND: Record<string, string> = { rules: "Daxili qaydalar", policy: "Siyasət", consent: "Razılıq", other: "Sənəd" };

// The employee reads the rules and policies of the company, confirms them and may withdraw a consent.
export function MyPolicies({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [items, setItems] = useState<Policy[] | null>(null);
  const [open, setOpen] = useState("");
  const load = useCallback(() => {
    request<{ items: Policy[] }>(`employee/policies?employeeId=${encodeURIComponent(employeeId)}`).then((r) => setItems(r.items)).catch((e) => notify((e as Error).message));
  }, [employeeId, notify]);
  useEffect(load, [load]);
  async function act(path: string, docId: string, done: string) {
    try {
      await request(path, { employeeId, docId });
      notify(done);
      load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!items) return <p className="muted">Yüklənir…</p>;
  return (
    <div className="company-page">
      <p className="muted">Şirkətin daxili əmək qaydaları, siyasətləri və razılıq sənədləri. Mətn dəyişəndə yeni versiya yaranır və yenidən təsdiq istənilir. Razılığı istənilən vaxt geri götürə bilərsiniz.</p>
      {items.map((p) => {
        const done = !!p.ackedAt && !p.withdrawnAt;
        return (
          <div className="panel" key={p.id}>
            <div className="section-heading">
              <div>
                <b>{p.title}</b>
                <small className="skill-description">
                  {KIND[p.kind] || p.kind} · v{p.version} · qüvvəyə minir {dmy(p.effectiveDate)}
                </small>
              </div>
              <span className={done ? "pill good" : p.requiresAck ? "pill warn" : "pill"}>{p.withdrawnAt ? "Razılıq geri götürülüb" : done ? `Təsdiq edilib ${dmy(p.ackedAt.slice(0, 10))}` : p.requiresAck ? (p.earlierVersion ? "Yeni versiya: təsdiq gözlənilir" : "Təsdiq gözlənilir") : "Məlumat üçün"}</span>
            </div>
            <div className="admin-actions">
              <button type="button" className="ghost" onClick={() => setOpen(open === p.id ? "" : p.id)}>
                {open === p.id ? "Mətni gizlət" : "Mətni oxu"}
              </button>
              {p.requiresAck && !done && (
                <button type="button" className="primary" onClick={() => void act("employee/policies/ack", p.id, p.kind === "consent" ? "Razılığınız qeyd edildi." : "Sənədlə tanış olduğunuz qeyd edildi.")}>
                  {p.kind === "consent" ? "Razıyam" : "Tanış oldum, təsdiq edirəm"}
                </button>
              )}
              {p.kind === "consent" && done && (
                <button type="button" className="secondary" onClick={() => window.confirm("Razılıq geri götürülsün?") && void act("employee/policies/withdraw", p.id, "Razılıq geri götürüldü.")}>
                  Razılığı geri götür
                </button>
              )}
            </div>
            {open === p.id && (
              <pre className="muted" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
                {p.body}
              </pre>
            )}
          </div>
        );
      })}
      {!items.length && <p className="admin-empty">Şirkət hələ sənəd yerləşdirməyib.</p>}
    </div>
  );
}

type Safety = { items: { id: string; type: string; date: string; due: string; state: string; kind: string; result: string; topic: string }[]; labels: { briefing: Record<string, string>; medical: Record<string, string>; result: Record<string, string> } };
// The employee's own safety briefings and medical examinations, and when the next ones are due.
export function MySafety({ employeeId, notify }: { employeeId: string; notify: Notify }) {
  const [data, setData] = useState<Safety | null>(null);
  useEffect(() => {
    request<Safety>(`employee/ohs?employeeId=${encodeURIComponent(employeeId)}`).then(setData).catch((e) => notify((e as Error).message));
  }, [employeeId, notify]);
  if (!data) return null;
  return (
    <div className="panel">
      <h4>Əməyin mühafizəsi: təlimatlarım və tibbi baxışlarım</h4>
      {!data.items.length ? (
        <p className="muted">Hələ qeyd yoxdur.</p>
      ) : (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {data.items.map((r) => (
            <li key={r.id} style={{ color: r.state === "overdue" ? "var(--danger, #b42318)" : undefined }}>
              {dmy(r.date)} — {r.type === "briefing" ? data.labels.briefing[r.kind] || "Təlimat" : `${data.labels.medical[r.kind] || "Tibbi baxış"}${r.result ? `: ${data.labels.result[r.result] || ""}` : ""}`}
              {r.topic ? ` (${r.topic})` : ""}
              {r.due ? ` · növbəti: ${dmy(r.due)}${r.state === "overdue" ? " (vaxtı keçib)" : ""}` : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
