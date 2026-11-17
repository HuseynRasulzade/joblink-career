"use client";
import { useEffect, useMemo, useRef, useState } from "react";

// Ctrl+K (or Cmd+K): jump to any section of the menu by typing a few letters.
export default function CommandPalette({ items, go }: { items: { id: string; label: string }[]; go: (page: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); setQuery(""); setIndex(0); }
      else if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  const fold = (v: string) => v.toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g");
  const list = useMemo(() => items.filter((i) => !query.trim() || fold(i.label).includes(fold(query.trim()))).slice(0, 12), [items, query]);
  if (!open) return null;
  const choose = (id: string) => { setOpen(false); go(id); };
  return (
    <div className="cmdk-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Sürətli keçid">
        <input
          ref={input}
          aria-label="Bölmə axtar"
          placeholder="Bölmə axtarın… (məs. əmək, namizəd, hesabat)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIndex(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setIndex((v) => Math.min(list.length - 1, v + 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setIndex((v) => Math.max(0, v - 1)); }
            else if (e.key === "Enter" && list[index]) choose(list[index].id);
          }}
        />
        <ul role="listbox">
          {list.map((i, k) => <li key={i.id} role="option" aria-selected={k === index} className={k === index ? "on" : ""} tabIndex={-1} onMouseEnter={() => setIndex(k)} onClick={() => choose(i.id)} onKeyDown={(e) => { if (e.key === "Enter") choose(i.id); }}>{i.label}</li>)}
          {!list.length && <li className="empty">Heç nə tapılmadı</li>}
        </ul>
        <small>↑ ↓ seçin · Enter açın · Esc bağlayın</small>
      </div>
    </div>
  );
}
