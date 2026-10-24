"use client";
import { useEffect, useRef, useState } from "react";
import { BriefcaseBusiness, Send, Sparkles } from "lucide-react";
import ConversationList, { type ConversationSummary } from "./ConversationList";
import { siteLanguage, translate } from "./i18n";
import type { Job } from "@/lib/model";

type Message = { role: string; text: string };
const t = (text: string) => translate(text, siteLanguage());

// Candidate's AI assistant with saved conversations. A conversation started
// from a vacancy stays about that vacancy.
export default function CareerAssistant({
  jobs,
  startJob,
  onStartHandled,
  aiEnabled,
  notify,
}: {
  jobs: Job[];
  startJob: Job | null;
  onStartHandled: () => void;
  aiEnabled: boolean;
  notify: (message: string) => void;
}) {
  const [conversationId, setConversationId] = useState("");
  const [contextJob, setContextJob] = useState<Job | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startJob) return;
    // Opening the assistant from a vacancy starts a conversation about it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConversationId("");
    setMessages([]);
    setContextJob(startJob);
    onStartHandled();
  }, [startJob, onStartHandled]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function open(item: ConversationSummary) {
    try {
      const response = await fetch(`/api/joblink/ai/conversation?id=${encodeURIComponent(item.id)}`, { credentials: "same-origin" });
      const data = (await response.json()) as { messages?: { author: string; content: string }[]; error?: string };
      if (!response.ok) throw new Error(data.error || t("Söhbət açılmadı."));
      setConversationId(item.id);
      setContextJob(item.context_type === "job" ? jobs.find((job) => job.id === item.context_id) || null : null);
      setMessages((data.messages || []).map((m) => ({ role: m.author, text: m.content })));
    } catch (error) {
      notify((error as Error).message);
    }
  }

  async function send(message = text) {
    if (!message.trim() || busy) return;
    setBusy(true);
    setText("");
    setMessages((list) => [...list, { role: "user", text: message }]);
    try {
      const response = await fetch("/api/joblink/ai/chat", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message,
          contextType: contextJob ? "job" : "career",
          contextId: contextJob?.id || "",
          language: siteLanguage(),
        }),
      });
      const data = (await response.json()) as { conversationId?: string; reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error || t("AI cavab verə bilmədi."));
      setConversationId(data.conversationId || conversationId);
      setMessages((list) => [...list, { role: "assistant", text: data.reply! }]);
      setVersion((v) => v + 1);
    } catch (error) {
      setMessages((list) => [...list, { role: "assistant", text: (error as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  const suggestions = contextJob
    ? [
        "Bu vakansiyaya nə qədər uyğunam?",
        "Müraciət üçün CV-mdə nəyi gücləndirim?",
        "Müsahibədə hansı suallar gözlənilir?",
        "Müsahibə məşqi: mənə bir-bir 5 sual ver, cavabımı yazım, sonra qiymətləndir.",
        "Bu vakansiya üçün çatışmayan bacarıqlara görə 6 həftəlik öyrənmə planı hazırla.",
      ]
    : [
        "Təcrübəmə görə hansı vəzifələrə müraciət edim?",
        "CV-mi necə gücləndirə bilərəm?",
        "Növbəti 3 ayda nəyi öyrənməliyəm?",
        "Müsahibə məşqi: peşəmə uyğun 5 sual ver, cavabımı yazım, sonra qiymətləndir.",
        "Profilimdəki bacarıqlara əsasən növbəti 8 həftə üçün öyrənmə planı hazırla.",
      ];

  return (
    <div className="career-assistant">
      <ConversationList
        type=""
        activeId={conversationId}
        refreshKey={version}
        onSelect={open}
        onNew={() => {
          setConversationId("");
          setMessages([]);
          setContextJob(null);
        }}
      />
      <section className="panel chat-panel">
        {contextJob && (
          <span className="chat-context-chip">
            <BriefcaseBusiness size={14} /> {contextJob.title} · {contextJob.company}
          </span>
        )}
        {!messages.length && (
          <div className="assistant-intro">
            <div className="assistant-icon">
              <Sparkles size={25} />
            </div>
            <h2>{contextJob ? t("Bu vakansiya haqqında soruşun") : t("Karyera köməkçiniz")}</h2>
            <p>
              {contextJob
                ? t("Cavablar profiliniz və bu vakansiyanın tələbləri əsasında verilir.")
                : t("Profiliniz əsasında karyera, CV və müraciət suallarınıza cavab verir. Söhbətlər yadda saxlanılır.")}
            </p>
            {suggestions.map((suggestion) => (
              <button key={suggestion} type="button" className="prompt-chip" disabled={!aiEnabled} onClick={() => send(suggestion)}>
                {t(suggestion)}
              </button>
            ))}
          </div>
        )}
        <div className="chat-messages" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`chat-message ${m.role}`}>
              {m.role === "assistant" && <Sparkles size={16} />}
              <p>{m.text}</p>
            </div>
          ))}
          {busy && <p className="muted">{t("Yazılır…")}</p>}
          <div ref={end} />
        </div>
        <form
          className="chat-input"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <textarea
            aria-label={t("AI köməkçiyə mesaj")}
            rows={3}
            placeholder={t(aiEnabled ? "Sualınızı yazın…" : "AI bağlantısı hazırda aktiv deyil.")}
            value={text}
            disabled={!aiEnabled}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
          <button className="primary" aria-label={t("Mesajı göndər")} disabled={busy || !text.trim() || !aiEnabled}>
            <Send size={18} />
          </button>
        </form>
      </section>
    </div>
  );
}
