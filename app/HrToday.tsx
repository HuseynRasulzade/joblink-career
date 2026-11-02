"use client";
import { useEffect, useState } from "react";

type Item = { key: string; label: string; count: number; link: string; level: "red" | "amber" | "info"; detail: string[] };

// What HR has to look at today: requests waiting for a decision and dates that run out soon, in one place.
export default function HrToday({ go }: { go: (page: string) => void }) {
  const [items, setItems] = useState<Item[] | null>(null);
  useEffect(() => {
    fetch("/api/joblink/company/today", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ items?: Item[] }>) : null))
      .then((d) => setItems(d?.items || []))
      .catch(() => setItems([]));
  }, []);
  if (!items || !items.length) return null;
  return (
    <section className="panel" aria-label="Bu gün">
      <h3>Bu gün nə etməli</h3>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {items.map((i) => (
          <li key={i.key}>
            <button type="button" className="text-button" onClick={() => go(i.link)}>
              <b className={i.level === "red" ? "danger-text" : undefined}>{i.count}</b> · {i.label}
            </button>
            {i.detail.length > 0 && <small className="skill-description">{i.detail.join(" · ")}</small>}
          </li>
        ))}
      </ul>
    </section>
  );
}
