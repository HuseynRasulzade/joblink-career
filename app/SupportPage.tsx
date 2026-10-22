"use client";
import { formatDate } from "@/lib/dates";
import { useEffect, useState } from "react";
import { Inbox, LifeBuoy, Plus, Send } from "lucide-react";
import { SUPPORT_STATUSES, SUPPORT_TOPICS, supportTopicLabel } from "@/lib/support-topics";
import { siteLanguage, translate } from "./i18n";

type Thread = {
  id: string;
  topic: string;
  subject: string;
  status: string;
  updated: string;
  user_name?: string;
  user_role?: string;
  last_message: string | null;
  unread_replies?: number;
};
type Message = { id: string; author_role: string; body: string; created: string };
const t = (text: string) => translate(text, siteLanguage());
const when = (value: string) => formatDate(value, siteLanguage(), { year: false, time: true });

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/joblink/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || t("Sorğu tamamlanmadı."));
  return data;
}

function StatusChip({ status }: { status: string }) {
  return <span className={`support-status ${status}`}>{t(SUPPORT_STATUSES[status]?.label || status)}</span>;
}

// Complaints, suggestions and other requests. Users see only their own
// requests and their status; the admin sees every request (admin mode).
export default function SupportPage({
  admin = false,
  onRead,
  notify,
}: {
  admin?: boolean;
  onRead: () => void;
  notify: (message: string) => void;
}) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ topic: "suggestion", subject: "", body: "" });
  const [reply, setReply] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [filter, setFilter] = useState({ status: "", topic: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await request<{ threads: Thread[] }>("support");
      setThreads(data.threads);
    } catch (error) {
      notify((error as Error).message);
    }
  }
  async function open(thread: Thread) {
    try {
      const data = await request<{ thread: Thread; messages: Message[] }>(`support/thread?id=${encodeURIComponent(thread.id)}`);
      setActive({ ...thread, status: data.thread.status });
      setMessages(data.messages);
      setNextStatus("");
      setCreating(false);
      onRead();
      void load();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  useEffect(() => {
    // Initial load only.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      await request("support/create", form);
      notify(t("Sorğunuz göndərildi. Statusunu bu bölmədə izləyə bilərsiniz."));
      setForm({ topic: "suggestion", subject: "", body: "" });
      setCreating(false);
      await load();
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!active || (!reply.trim() && !nextStatus)) return;
    setBusy(true);
    try {
      if (reply.trim()) await request("support/reply", { id: active.id, body: reply, status: nextStatus || undefined });
      else await request("admin/support/status", { id: active.id, status: nextStatus });
      setReply("");
      await open(active);
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const visible = threads.filter(
    (thread) => (!filter.status || thread.status === filter.status) && (!filter.topic || thread.topic === filter.topic),
  );
  return (
    <div className="messages-page support-page">
      <aside className="conversation-list">
        {!admin && (
          <button type="button" className="primary conversation-new" onClick={() => { setCreating(true); setActive(null); }}>
            <Plus size={16} /> {t("Yeni sorğu")}
          </button>
        )}
        {admin && (
          <div className="support-filters">
            <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })} aria-label={t("Status")}>
              <option value="">{t("Bütün statuslar")}</option>
              {Object.entries(SUPPORT_STATUSES).map(([key, value]) => <option key={key} value={key}>{t(value.label)}</option>)}
            </select>
            <select value={filter.topic} onChange={(e) => setFilter({ ...filter, topic: e.target.value })} aria-label={t("Mövzu")}>
              <option value="">{t("Bütün mövzular")}</option>
              {SUPPORT_TOPICS.map((topic) => <option key={topic.id} value={topic.id}>{t(topic.label)}</option>)}
            </select>
          </div>
        )}
        <nav aria-label={t("Sorğular")}>
          {visible.map((thread) => (
            <div key={thread.id} className={`conversation-item ${thread.id === active?.id ? "active" : ""}`}>
              <button type="button" className="conversation-open" onClick={() => open(thread)}>
                <strong>
                  {thread.subject}
                  {!admin && Number(thread.unread_replies) > 0 && <span className="unread-dot">{thread.unread_replies}</span>}
                  {admin && thread.status === "new" && <span className="unread-dot">•</span>}
                </strong>
                <small>
                  {t(supportTopicLabel(thread.topic))}
                  {admin && thread.user_name ? ` · ${thread.user_name}` : ""}
                </small>
                <StatusChip status={thread.status} />
              </button>
            </div>
          ))}
          {!visible.length && <p className="conversation-empty">{t("Hələ sorğu yoxdur.")}</p>}
        </nav>
      </aside>
      <section className="panel chat-panel">
        {creating ? (
          <form className="support-form" onSubmit={create}>
            <h2><LifeBuoy size={20} /> {t("Şikayət, təklif və ya sual göndərin")}</h2>
            <label className="field">
              <span>{t("Mövzu")}</span>
              <select value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })}>
                {SUPPORT_TOPICS.filter((topic) => topic.id !== "job-title" && topic.id !== "university" && topic.id !== "major").map((topic) => (
                  <option key={topic.id} value={topic.id}>{t(topic.label)}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t("Başlıq")}</span>
              <input required maxLength={160} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </label>
            <label className="field">
              <span>{t("Mesaj")}</span>
              <textarea required rows={6} maxLength={4000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </label>
            <p className="muted fine-print">{t("Sorğu admin panelinə və admin e-poçtuna göndərilir. Cavab və status dəyişikliyi burada görünəcək.")}</p>
            <button className="primary" disabled={busy}><Send size={16} /> {t("Göndər")}</button>
          </form>
        ) : active ? (
          <>
            <div className="messages-heading">
              <Inbox size={18} /> <strong>{active.subject}</strong> <StatusChip status={active.status} />
            </div>
            <div className="chat-messages">
              {messages.map((m) => (
                <div key={m.id} className={`chat-message ${(admin ? m.author_role === "admin" : m.author_role !== "admin") ? "user" : "assistant"}`}>
                  {m.author_role === "admin" && !admin && <b className="support-author">{t("Joblink dəstək")}</b>}
                  <p>{m.body}</p>
                  <small className="message-time">{when(m.created)}</small>
                </div>
              ))}
            </div>
            <form className="chat-input support-reply" onSubmit={send}>
              <textarea rows={3} aria-label={t("Cavab")} value={reply} placeholder={t(admin ? "Cavabınızı yazın…" : "Əlavə məlumat yazın…")} onChange={(e) => setReply(e.target.value)} />
              <div className="support-reply-actions">
                {admin && (
                  <select value={nextStatus} onChange={(e) => setNextStatus(e.target.value)} aria-label={t("Yeni status")}>
                    <option value="">{t("Statusu dəyişmə")}</option>
                    {Object.entries(SUPPORT_STATUSES).map(([key, value]) => <option key={key} value={key}>{t(value.label)}</option>)}
                  </select>
                )}
                <button className="primary" disabled={busy || (!reply.trim() && !nextStatus)} aria-label={t("Göndər")}>
                  <Send size={18} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="assistant-intro">
            <div className="assistant-icon"><LifeBuoy size={25} /></div>
            <h2>{t(admin ? "Sorğular və mesajlar" : "Dəstək")}</h2>
            <p>{t(admin ? "Şirkət və işçilərin bütün sorğuları burada toplanır." : "Şikayət, təklif və suallarınızı göndərin, statusunu izləyin: göndərildi, oxundu, icradadır, tamamlandı.")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
