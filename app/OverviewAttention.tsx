"use client";
import { useEffect, useState } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { Modal } from "./components";

type Today = { key: string; label: string; count: number; link: string; level: "red" | "amber" | "info"; detail: string[] };
type Attention = { key: string; label: string; count: number; link: string };

// One slim entry on the overview instead of two long lists: the number of things waiting, the first few, and a button
// that opens a panel with everything (what to do today, and what needs attention).
export default function OverviewAttention({ go, attention }: { go: (page: string) => void; attention: Attention[] }) {
  const [today, setToday] = useState<Today[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetch("/api/joblink/company/today", { credentials: "same-origin", cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ items?: Today[] }>) : null))
      .then((d) => setToday(d?.items || []))
      .catch(() => setToday([]));
  }, []);
  const total = today.reduce((s, i) => s + i.count, 0) + attention.reduce((s, i) => s + i.count, 0);
  if (!today.length && !attention.length) return null;
  const urgent = today.some((i) => i.level === "red");
  const preview = [...today.map((i) => `${i.count} ${i.label}`), ...attention.map((i) => `${i.count} ${i.label}`)].slice(0, 2);
  return (
    <>
      <button type="button" className={`ov-attn ${urgent ? "urgent" : ""}`} onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="ov-attn-icon" aria-hidden="true"><Bell size={20} /></span>
        <span className="ov-attn-text">
          <b>{total} iş sizi gözləyir</b>
          <small>{preview.join(" · ")}{today.length + attention.length > 2 ? " · …" : ""}</small>
        </span>
        <span className="ov-attn-go">Hamısına bax <ChevronRight size={16} /></span>
      </button>
      {open && (
        <Modal title="Gözləyən işlər" onClose={() => setOpen(false)} className="side-drawer">
          <div className="jd">
            {today.length > 0 && (
              <section>
                <h3>Bu gün nə etməli</h3>
                <ul className="ov-attn-list">
                  {today.map((i) => (
                    <li key={i.key}>
                      <div>
                        <b className={i.level === "red" ? "danger-text" : undefined}>{i.count}</b> · {i.label}
                        {i.detail.length > 0 && <small>{i.detail.join(" · ")}</small>}
                      </div>
                      <button type="button" className="secondary" onClick={() => { setOpen(false); go(i.link); }}>Aç</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {attention.length > 0 && (
              <section>
                <h3>Diqqət tələb edənlər</h3>
                <ul className="ov-attn-list">
                  {attention.map((i) => (
                    <li key={i.key}>
                      <div><b>{i.count}</b> {i.label}</div>
                      <button type="button" className="secondary" onClick={() => { setOpen(false); go(i.link); }}>Aç</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
