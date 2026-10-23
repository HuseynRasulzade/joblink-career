"use client";
import { formatDate } from "@/lib/dates";
import { useEffect, useRef, useState } from "react";
import { CornerUpLeft, MessageCircle, Paperclip, Search, Send, X, Check, CheckCheck, ChevronsDown } from "lucide-react";
import { siteLanguage, translate } from "./i18n";

type Thread = {
  id: string;
  other_id: string;
  job_id: string;
  job_title: string;
  other_name: string;
  last_message: string | null;
  assignee_id?: string;
  assignee_name?: string;
  unread: number;
  updated: string;
};
type Message = {
  id: string;
  body: string;
  created: string;
  mine: boolean;
  author?: string;
  replyTo?: { id: string; body: string; mine: boolean } | null;
  attachment?: { name: string; type: string } | null;
};
type SearchHit = { id: string; thread_id: string; body: string; created: string; other_name: string; job_title: string };
const QUICK_REPLIES: Record<"candidate" | "company", string[]> = {
  company: [
    "Müraciətiniz üçün təşəkkür edirik. CV-nizi nəzərdən keçiririk.",
    "Sizi müsahibəyə dəvət edirik. Hansı vaxt sizin üçün əlverişlidir?",
    "Əlavə sənədləri (sertifikat, tövsiyə məktubu) göndərə bilərsinizmi?",
    "Gözlədiyiniz əmək haqqını dəqiqləşdirə bilərsinizmi?",
  ],
  candidate: [
    "Müraciətimi nəzərdən keçirdiyiniz üçün təşəkkür edirəm.",
    "Müsahibə üçün bu gün və sabah mənim üçün əlverişlidir.",
    "Sənədləri göndərirəm, zəhmət olmasa təsdiq edin.",
    "Vəzifənin iş şəraiti barədə ətraflı məlumat verə bilərsiniz?",
  ],
};
const dayKey = (value: string) => value.slice(0, 10);
const dayLabel = (value: string) => {
  const today = new Date();
  const key = dayKey(value);
  const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const yesterday = new Date(today.getTime() - 86400000);
  if (key === iso(today)) return t("Bu gün");
  if (key === iso(yesterday)) return t("Dünən");
  return formatDate(value, siteLanguage(), {});
};
export type MessageTarget = {
  candidateId?: string;
  applicationId?: string;
  jobId?: string;
  name: string;
  jobTitle?: string;
};
const t = (text: string) => translate(text, siteLanguage());
const time = (value: string) => formatDate(value, siteLanguage(), { year: false, time: true });

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

// Saved conversations between an employer and a candidate. A conversation
// belongs to one vacancy when it started from an application.
export default function MessagesPage({
  role,
  target,
  onTargetHandled,
  onRead,
  notify,
}: {
  role: "candidate" | "company";
  target: MessageTarget | null;
  onTargetHandled: () => void;
  onRead: () => void;
  notify: (message: string) => void;
}) {
  const [file, setFile] = useState<{ name: string; type: string; data: string } | null>(null);
  const [team, setTeam] = useState<{ id: string; name: string }[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [saved, setSaved] = useState<{ id: string; body: string }[]>([]);
  const loadSaved = () => {
    if (role !== "company") return Promise.resolve();
    return request<{ templates: { id: string; body: string }[] }>("messages/templates").then((d) => setSaved(d.templates)).catch(() => {});
  };
  useEffect(() => { void loadSaved(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);
  useEffect(() => {
    if (role !== "company") return;
    request<{ owner: { id: string; name: string } | null; members: { user_id?: string; id: string; name: string; status: string }[] }>("company/team")
      .then((d) => setTeam([...(d.owner ? [{ id: d.owner.id, name: d.owner.name }] : []), ...d.members.filter((m) => m.status === "active" && m.user_id).map((m) => ({ id: m.user_id as string, name: m.name }))]))
      .catch(() => {});
  }, [role]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string>("");
  const [pending, setPending] = useState<MessageTarget | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [otherReadAt, setOtherReadAt] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [search, setSearch] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [showLatest, setShowLatest] = useState(false);
  const [highlight, setHighlight] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  async function loadThreads() {
    try {
      const data = await request<{ threads: Thread[] }>("messages/threads");
      setThreads(data.threads);
      return data.threads;
    } catch {
      return [];
    }
  }
  async function open(threadId: string) {
    try {
      const data = await request<{ messages: Message[]; hasMore: boolean; otherReadAt: string }>(`messages/thread?id=${encodeURIComponent(threadId)}`);
      setActive(threadId);
      setPending(null);
      setMessages(data.messages);
      setHasMore(data.hasMore);
      setOtherReadAt(data.otherReadAt);
      setReplyTo(null);
      stick.current = true;
      onRead();
      void loadThreads();
    } catch (error) {
      notify((error as Error).message);
    }
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadThreads();
    const timer = window.setInterval(() => void loadThreads(), 30000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!target) return;
    // Starting from a candidate card or an application: reuse an existing
    // conversation for the same vacancy, otherwise prepare a new one.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadThreads().then((list) => {
      const existing = list.find(
        (thread) =>
          (!target.candidateId || thread.other_id === target.candidateId) &&
          (target.jobId ? thread.job_id === target.jobId : !thread.job_id),
      );
      if (existing) void open(existing.id);
      else {
        setActive("");
        setMessages([]);
        setPending(target);
      }
      onTargetHandled();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  useEffect(() => {
    if (stick.current) end.current?.scrollIntoView({ block: "end" });
  }, [messages]);
  useEffect(() => {
    // Debounced search across all saved messages.
    if (search.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHits([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const data = await request<{ results: SearchHit[] }>(`messages/search?q=${encodeURIComponent(search.trim())}`);
        setHits(data.results);
      } catch {
        setHits([]);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  async function loadEarlier() {
    if (!active || !messages.length) return;
    try {
      const data = await request<{ messages: Message[]; hasMore: boolean }>(
        `messages/thread?id=${encodeURIComponent(active)}&before=${encodeURIComponent(messages[0].created)}`,
      );
      stick.current = false;
      const box = scroller.current;
      const previousHeight = box?.scrollHeight || 0;
      setMessages((old) => [...data.messages, ...old]);
      setHasMore(data.hasMore);
      requestAnimationFrame(() => {
        if (box) box.scrollTop = box.scrollHeight - previousHeight;
      });
    } catch (error) {
      notify((error as Error).message);
    }
  }
  // Open a search hit: load the conversation, then walk back until the
  // message is on screen and flash it.
  async function openHit(hit: SearchHit) {
    await open(hit.thread_id);
    let attempts = 0;
    stick.current = false;
    const find = async () => {
      const element = document.getElementById(`msg-${hit.id}`);
      if (element) {
        element.scrollIntoView({ block: "center" });
        setHighlight(hit.id);
        window.setTimeout(() => setHighlight(""), 2500);
        return;
      }
      if (attempts++ > 20) return;
      const data = await request<{ messages: Message[]; hasMore: boolean }>(
        `messages/thread?id=${encodeURIComponent(hit.thread_id)}&before=${encodeURIComponent(
          document.querySelector<HTMLElement>("[data-first-message]")?.dataset.firstMessage || hit.created,
        )}`,
      ).catch(() => null);
      if (!data) return;
      setMessages((old) => [...data.messages, ...old]);
      setHasMore(data.hasMore);
      window.setTimeout(find, 60);
    };
    window.setTimeout(find, 120);
  }
  function jumpToQuoted(id: string) {
    const element = document.getElementById(`msg-${id}`);
    if (!element) {
      notify(t("Bu mesaj hələ yüklənməyib. “Əvvəlki mesajları göstər” düyməsindən istifadə edin."));
      return;
    }
    element.scrollIntoView({ block: "center", behavior: "smooth" });
    setHighlight(id);
    window.setTimeout(() => setHighlight(""), 2000);
  }
  useEffect(() => {
    if (!active) return;
    // Light polling keeps an open conversation current.
    const timer = window.setInterval(async () => {
      try {
        const data = await request<{ messages: Message[]; otherReadAt: string }>(`messages/thread?id=${encodeURIComponent(active)}`);
        // Keep earlier pages the user already loaded.
        setMessages((old) => {
          const first = data.messages[0]?.created;
          const older = first ? old.filter((m) => m.created < first) : [];
          return [...older, ...data.messages];
        });
        setOtherReadAt(data.otherReadAt);
      } catch {
        /* keep the current view */
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [active]);

  async function send() {
    if ((!text.trim() && !file) || busy) return;
    setBusy(true);
    try {
      if (active) {
        await request("messages/send", { threadId: active, body: text, replyTo: replyTo?.id, attachment: file || undefined });
        setText("");
        setFile(null);
        setReplyTo(null);
        stick.current = true;
        await open(active);
      } else if (pending) {
        const data = await request<{ threadId: string }>("messages/start", {
          body: text,
          candidateId: pending.candidateId,
          applicationId: pending.applicationId,
          jobId: pending.jobId,
        });
        setText("");
        await open(data.threadId);
      }
    } catch (error) {
      notify((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const current = threads.find((thread) => thread.id === active);
  const heading = current
    ? `${current.other_name}${current.job_title ? ` · ${current.job_title}` : ""}`
    : pending
      ? `${pending.name}${pending.jobTitle ? ` · ${pending.jobTitle}` : ""}`
      : "";
  return (
    <div className="messages-page">
      <aside className="conversation-list">
        {role === "company" && team.length > 1 && (
          <select aria-label={t("Təyinata görə süz")} value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}>
            <option value="">{t("Bütün yazışmalar")}</option>
            <option value="none">{t("Təyin olunmayanlar")}</option>
            {team.map((m) => <option key={m.id} value={m.id}>{m.name || t("Hesab sahibi")}</option>)}
          </select>
        )}
        <label className="conversation-search">
          <Search size={15} />
          <input
            value={search}
            placeholder={t("Yazışma və mesajlarda axtar")}
            aria-label={t("Yazışma və mesajlarda axtar")}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button type="button" aria-label={t("Təmizlə")} onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          )}
        </label>
        {search.trim().length >= 2 && (
          <div className="search-hits">
            <small>{hits.length ? t("Mesajlarda tapılanlar") : t("Mesaj tapılmadı")}</small>
            {hits.map((hit) => (
              <button type="button" key={hit.id} className="search-hit" onClick={() => openHit(hit)}>
                <strong>{hit.other_name}{hit.job_title ? ` · ${hit.job_title}` : ""}</strong>
                <span>{hit.body.slice(0, 110)}</span>
                <small>{time(hit.created)}</small>
              </button>
            ))}
          </div>
        )}
        <nav aria-label={t("Yazışmalar")}>
          {threads
            .filter((thread) => {
              const q = search.trim().toLocaleLowerCase("az");
              if (assigneeFilter === "none" && thread.assignee_id) return false;
              if (assigneeFilter && assigneeFilter !== "none" && thread.assignee_id !== assigneeFilter) return false;
              return !q || `${thread.other_name} ${thread.job_title}`.toLocaleLowerCase("az").includes(q);
            })
            .map((thread) => (
            <div key={thread.id} className={`conversation-item ${thread.id === active ? "active" : ""}`}>
              <button type="button" className="conversation-open" onClick={() => open(thread.id)}>
                <strong>
                  {thread.other_name}
                  {thread.unread > 0 && <span className="unread-dot">{thread.unread}</span>}
                </strong>
                <small>{thread.job_title || t("Ümumi yazışma")}{thread.assignee_name ? ` · ${t("Təyin")}: ${thread.assignee_name}` : ""}</small>
                {thread.last_message && <small className="message-preview">{thread.last_message}</small>}
              </button>
            </div>
          ))}
          {!threads.length && (
            <p className="conversation-empty">
              {role === "company"
                ? t("Namizədlər bölməsindən “Mesaj yaz” ilə yazışma başladın.")
                : t("Şirkətlər sizə yazanda və ya müraciətinizdən “Şirkətə yaz” seçəndə yazışmalar burada görünəcək.")}
            </p>
          )}
        </nav>
      </aside>
      <section className="panel chat-panel">
        {heading ? (
          <>
            <div className="messages-heading">
              <MessageCircle size={18} /> <strong>{heading}</strong>
              {role === "company" && current && team.length > 0 && (
                <select
                  aria-label={t("Yazışmanı təyin et")}
                  value={current.assignee_id || ""}
                  onChange={async (event) => {
                    try {
                      await request("messages/assign", { threadId: current.id, userId: event.target.value });
                      notify(t("Yazışma təyin edildi."));
                      await loadThreads();
                    } catch (error) {
                      notify((error as Error).message);
                    }
                  }}
                >
                  <option value="">{t("Təyin olunmayıb")}</option>
                  {team.map((m) => <option key={m.id} value={m.id}>{m.name || t("Hesab sahibi")}</option>)}
                </select>
              )}
            </div>
            <div
              className="chat-messages"
              aria-live="polite"
              ref={scroller}
              onScroll={(event) => {
                const box = event.currentTarget;
                const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
                stick.current = atBottom;
                setShowLatest(!atBottom);
              }}
            >
              {hasMore && (
                <button type="button" className="text-button load-earlier" onClick={loadEarlier}>
                  {t("Əvvəlki mesajları göstər")}
                </button>
              )}
              {messages.map((m, index) => {
                const newDay = index === 0 || dayKey(messages[index - 1].created) !== dayKey(m.created);
                const mineAfter = m.mine ? messages.slice(index + 1).some((x) => x.mine) : false;
                const read = m.mine && otherReadAt && otherReadAt >= m.created;
                return (
                  <div key={m.id}>
                    {newDay && <div className="day-separator"><span>{dayLabel(m.created)}</span></div>}
                    <div
                      id={`msg-${m.id}`}
                      data-first-message={index === 0 ? m.created : undefined}
                      className={`chat-message ${m.mine ? "user" : "assistant"} ${highlight === m.id ? "flash" : ""}`}
                    >
                      {m.replyTo && (
                        <button type="button" className="quoted" onClick={() => jumpToQuoted(m.replyTo!.id)}>
                          <strong>{m.replyTo.mine ? t("Siz") : current?.other_name || t("İstifadəçi")}</strong>
                          <span>{m.replyTo.body}</span>
                        </button>
                      )}
                      {m.body && <p>{m.body}</p>}
                      {m.attachment && (
                        <p>
                          <a href={`/api/joblink/messages/attachment?id=${encodeURIComponent(m.id)}`} target="_blank" rel="noopener noreferrer">📎 {m.attachment.name}</a>
                        </p>
                      )}
                      <small className="message-time">
                        {m.author ? `${m.author} · ` : ""}{time(m.created)}
                        {m.mine && !mineAfter && (
                          <span className="receipt" title={read ? t("Oxundu") : t("Göndərildi")}>
                            {read ? <CheckCheck size={13} /> : <Check size={13} />} {read ? t("Oxundu") : t("Göndərildi")}
                          </span>
                        )}
                        <button type="button" className="reply-button" aria-label={t("Cavab ver")} onClick={() => setReplyTo(m)}>
                          <CornerUpLeft size={13} />
                        </button>
                      </small>
                    </div>
                  </div>
                );
              })}
              {!messages.length && <p className="muted">{t("İlk mesajınızı yazın.")}</p>}
              <div ref={end} />
              {showLatest && (
                <button
                  type="button"
                  className="scroll-latest"
                  aria-label={t("Ən son mesaja keç")}
                  onClick={() => {
                    stick.current = true;
                    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
                  }}
                >
                  <ChevronsDown size={16} />
                </button>
              )}
            </div>
            <div className="quick-replies" aria-label={t("Tez cavablar")}>
              {role === "company" && saved.map((tpl) => (
                <span key={tpl.id} className="quick-saved">
                  <button type="button" onClick={() => setText(tpl.body)} title={tpl.body}>{tpl.body.length > 60 ? `${tpl.body.slice(0, 57)}…` : tpl.body}</button>
                  <button type="button" aria-label={t("Şablonu sil")} onClick={async () => { await request("messages/templates/delete", { id: tpl.id }).catch(() => {}); void loadSaved(); }}><X size={12} /></button>
                </span>
              ))}
              {role === "company" && text.trim().length >= 5 && (
                <button type="button" className="text-button" onClick={async () => { try { await request("messages/templates/save", { body: text }); notify(t("Şablon saxlanıldı.")); void loadSaved(); } catch (error) { notify((error as Error).message); } }}>
                  {t("Mətni şablon kimi saxla")}
                </button>
              )}
              {QUICK_REPLIES[role].map((reply) => (
                <button key={reply} type="button" onClick={() => setText(reply)}>
                  {t(reply)}
                </button>
              ))}
            </div>
            {replyTo && (
              <div className="reply-bar">
                <CornerUpLeft size={14} />
                <span>
                  <strong>{replyTo.mine ? t("Siz") : current?.other_name || t("İstifadəçi")}</strong>
                  {replyTo.body.slice(0, 120)}
                </span>
                <button type="button" aria-label={t("Ləğv et")} onClick={() => setReplyTo(null)}>
                  <X size={14} />
                </button>
              </div>
            )}
            <form
              className="chat-input"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <textarea
                aria-label={t("Mesaj")}
                rows={3}
                value={text}
                placeholder={t("Mesajınızı yazın…")}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <label className="attach-button" title={t("Fayl əlavə et (PDF və ya şəkil, 500 KB-a qədər)")}>
                <Paperclip size={18} />
                <input
                  type="file"
                  hidden
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const picked = event.target.files?.[0];
                    event.target.value = "";
                    if (!picked) return;
                    if (picked.size > 500_000) return notify(t("Fayl 500 KB-dan kiçik olmalıdır."));
                    const reader = new FileReader();
                    reader.onload = () => setFile({ name: picked.name, type: picked.type, data: String(reader.result).split(",")[1] || "" });
                    reader.readAsDataURL(picked);
                  }}
                />
              </label>
              {file && <small className="muted">📎 {file.name} <button type="button" className="text-button" onClick={() => setFile(null)}>×</button></small>}
              <button className="primary" aria-label={t("Mesajı göndər")} disabled={busy || (!text.trim() && !file)}>
                <Send size={18} />
              </button>
            </form>
          </>
        ) : (
          <div className="assistant-intro">
            <div className="assistant-icon">
              <MessageCircle size={25} />
            </div>
            <h2>{t("Mesajlar")}</h2>
            <p>{t("Soldan yazışma seçin. Bütün mesajlar yadda saxlanılır.")}</p>
          </div>
        )}
      </section>
    </div>
  );
}
