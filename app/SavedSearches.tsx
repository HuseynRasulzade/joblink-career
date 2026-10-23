"use client";
import { useCallback, useEffect, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";

export type SearchFilters = { minScore: number; minYears: number; requiredSkills: string; certFilter: string; onlyFollowed: boolean; query: string };
type Saved = { id: string; name: string; filters: SearchFilters };

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

// Named filter sets of the candidates page: apply with one click, save the current one.
export function SavedSearches({ current, onApply, notify }: { current: SearchFilters; onApply: (filters: SearchFilters) => void; notify: (message: string) => void }) {
  const [items, setItems] = useState<Saved[]>([]);
  const load = useCallback(() => request<{ searches: Saved[] }>("hr/saved-searches").then((d) => setItems(d.searches)).catch(() => {}), []);
  useEffect(() => { void load(); }, [load]);
  return (
    <div className="quick-replies" aria-label="Saxlanmış axtarışlar">
      <Bookmark size={14} aria-hidden />
      {items.map((s) => (
        <span key={s.id} className="quick-saved">
          <button type="button" onClick={() => onApply(s.filters)} title="Bu axtarışı tətbiq et">{s.name}</button>
          <button
            type="button"
            aria-label={`${s.name} axtarışını sil`}
            onClick={async () => { await request("hr/saved-searches/delete", { id: s.id }).catch(() => {}); await load(); }}
          >
            <Trash2 size={12} />
          </button>
        </span>
      ))}
      <button
        type="button"
        className="text-button"
        onClick={async () => {
          const name = window.prompt("Axtarışın adı (məsələn: Bakı, Excel, 2+ il):");
          if (!name) return;
          try {
            await request("hr/saved-searches/save", { name, filters: current });
            notify("Axtarış saxlanıldı.");
            await load();
          } catch (error) {
            notify((error as Error).message);
          }
        }}
      >
        Cari axtarışı saxla
      </button>
    </div>
  );
}
