"use client";
import { formatDate } from "@/lib/dates";
import { useEffect, useState } from "react";
import { MessageSquarePlus, Pencil, Trash2 } from "lucide-react";
import { siteLanguage, translate } from "./i18n";

export type ConversationSummary = {
  id: string;
  title: string;
  context_type: string;
  context_id: string;
  updated: string;
  preview: string | null;
};
const t = (text: string) => translate(text, siteLanguage());

// ChatGPT-style list of saved AI conversations of one kind.
export default function ConversationList({
  type,
  activeId,
  refreshKey,
  onSelect,
  onNew,
  newLabel = "Yeni söhbət",
}: {
  type: string;
  activeId: string;
  refreshKey: number;
  onSelect: (conversation: ConversationSummary) => void;
  onNew: () => void;
  newLabel?: string;
}) {
  const [items, setItems] = useState<ConversationSummary[]>([]);
  async function load() {
    try {
      const response = await fetch(`/api/joblink/ai/conversations?type=${encodeURIComponent(type)}`, { credentials: "same-origin", cache: "no-store" });
      const data = (await response.json()) as { conversations?: ConversationSummary[] };
      setItems(data.conversations || []);
    } catch {
      setItems([]);
    }
  }
  useEffect(() => {
    // Reload when a message was sent or a conversation changed.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [type, refreshKey]);
  async function post(path: string, body: unknown) {
    await fetch(`/api/joblink/${path}`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    await load();
  }
  return (
    <aside className="conversation-list">
      <button type="button" className="primary conversation-new" onClick={onNew}>
        <MessageSquarePlus size={16} /> {t(newLabel)}
      </button>
      <nav aria-label={t("Söhbətlər")}>
        {items.map((item) => (
          <div key={item.id} className={`conversation-item ${item.id === activeId ? "active" : ""}`}>
            <button type="button" className="conversation-open" onClick={() => onSelect(item)}>
              <strong>{item.title}</strong>
              <small>{formatDate(item.updated, siteLanguage(), { year: false })}</small>
            </button>
            <span className="conversation-actions">
              <button
                type="button"
                aria-label={t("Adını dəyiş")}
                onClick={() => {
                  const title = window.prompt(t("Söhbətin yeni adı"), item.title);
                  if (title?.trim()) void post("ai/conversation/rename", { id: item.id, title });
                }}
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                aria-label={t("Sil")}
                onClick={() => {
                  if (window.confirm(t("Bu söhbət silinsin?"))) {
                    void post("ai/conversation/delete", { id: item.id });
                    if (item.id === activeId) onNew();
                  }
                }}
              >
                <Trash2 size={13} />
              </button>
            </span>
          </div>
        ))}
        {!items.length && <p className="conversation-empty">{t("Hələ söhbət yoxdur.")}</p>}
      </nav>
    </aside>
  );
}
