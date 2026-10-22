"use client";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { siteLanguage, translate } from "./i18n";

type Item = { id: string; title: string; body: string; link: string; read: number; created: string };
const t = (text: string) => translate(text, siteLanguage());

// In-app notifications (status changes, offers, followers, new vacancies).
export default function NotificationBell({ go }: { go: (page: string) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  async function load() {
    try {
      const response = await fetch("/api/joblink/notifications", { credentials: "same-origin", cache: "no-store" });
      if (response.ok) setItems(((await response.json()) as { notifications: Item[] }).notifications);
    } catch {
      /* best-effort */
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    return () => window.clearInterval(timer);
  }, []);
  async function mark(body: unknown) {
    await fetch("/api/joblink/notifications/read", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }
  const unread = items.filter((item) => !item.read).length;
  return (
    <div className="notification-bell">
      <button type="button" aria-label={t("Bildirişlər")} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Bell size={18} />
        {unread > 0 && <i>{unread}</i>}
      </button>
      {open && (
        <div className="notification-panel" role="dialog" aria-label={t("Bildirişlər")}>
          <header>
            <strong>{t("Bildirişlər")}</strong>
            {unread > 0 && (
              <button type="button" className="text-button" onClick={() => mark({ all: true })}>
                {t("Hamısını oxunmuş et")}
              </button>
            )}
          </header>
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`notification-item ${item.read ? "" : "unread"}`}
              onClick={() => {
                void mark({ id: item.id });
                setOpen(false);
                if (item.link) go(item.link);
              }}
            >
              <strong>{item.title}</strong>
              {item.body && <span>{item.body}</span>}
              <small>{formatDate(item.created, siteLanguage(), { year: false, time: true })}</small>
            </button>
          ))}
          {!items.length && <p className="conversation-empty">{t("Hələ bildiriş yoxdur.")}</p>}
        </div>
      )}
    </div>
  );
}
