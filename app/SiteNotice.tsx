"use client";
import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";

type Notice = { id: string; text: string; level: "info" | "warning"; audience: "all" | "company" | "candidate" };

// A message of the administrator for everybody (or only for companies / job seekers) above the panels. A person can close it;
// it comes back when the administrator writes a new one.
export default function SiteNotice({ role }: { role: "admin" | "company" | "candidate" | "" }) {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch("/api/joblink/public/notice", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ notice: Notice | null }>) : { notice: null }))
      .then((d) => {
        if (!alive || !d.notice) return;
        let closed = "";
        try {
          closed = window.localStorage.getItem("joblink-notice-closed") || "";
        } catch {
          // no storage: the notice stays visible
        }
        setNotice(d.notice);
        setHidden(closed === d.notice.id);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  if (!notice || hidden) return null;
  if (notice.audience !== "all" && notice.audience !== role) return null;
  return (
    <div className={`site-notice ${notice.level}`} role="status">
      <Megaphone size={16} />
      <span>{notice.text}</span>
      <button
        type="button"
        aria-label="Bağla"
        onClick={() => {
          setHidden(true);
          try {
            window.localStorage.setItem("joblink-notice-closed", notice.id);
          } catch {
            // not saved
          }
        }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
