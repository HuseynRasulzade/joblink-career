"use client";
import { useCallback, useEffect, useState } from "react";
import { Bell, Trash2 } from "lucide-react";
import { alertIsEmpty, describeAlert, type AlertFilters } from "@/lib/job-alerts";

type Alert = { id: string; name: string; filters: AlertFilters };

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

// "Tell me about new vacancies like this": saves the current search; the daily job notifies about new matches.
export function JobAlerts({ current, notify }: { current: AlertFilters; notify: (message: string) => void }) {
  const [items, setItems] = useState<Alert[]>([]);
  const load = useCallback(() => request<{ alerts: Alert[] }>("alerts").then((d) => setItems(d.alerts)).catch(() => {}), []);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="quick-replies" aria-label="Vakansiya xəbərdarlıqları">
      <Bell size={14} aria-hidden />
      {items.map((a) => (
        <span key={a.id} className="quick-saved" title={describeAlert(a.filters)}>
          <button type="button" disabled>{a.name}</button>
          <button
            type="button"
            aria-label={`${a.name} xəbərdarlığını sil`}
            onClick={async () => { await request("alerts/delete", { id: a.id }).catch(() => {}); await load(); }}
          >
            <Trash2 size={12} />
          </button>
        </span>
      ))}
      <button
        type="button"
        className="text-button"
        disabled={alertIsEmpty(current)}
        title={alertIsEmpty(current) ? "Əvvəl axtarış sözü yazın və ya filtr seçin" : describeAlert(current)}
        onClick={async () => {
          try {
            await request("alerts/save", { filters: current });
            notify("Xəbərdarlıq yaradıldı: bu axtarışa uyğun yeni vakansiya çıxanda bildiriş alacaqsınız.");
            await load();
          } catch (error) {
            notify((error as Error).message);
          }
        }}
      >
        Bu axtarış üçün xəbərdarlıq yarat
      </button>
    </div>
  );
}
