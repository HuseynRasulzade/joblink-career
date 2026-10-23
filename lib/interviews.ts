// Interview scheduling: validation, Baku time, calendar file and feedback.
export type InterviewKind = "onsite" | "online" | "phone";
export type InterviewStatus = "scheduled" | "confirmed" | "declined" | "completed" | "cancelled" | "no_show";

export const INTERVIEW_KINDS: { id: InterviewKind; label: string; placeholder: string }[] = [
  { id: "onsite", label: "Ofisdə", placeholder: "Ünvan (məsələn: Nizami küç. 10, 3-cü mərtəbə)" },
  { id: "online", label: "Onlayn", placeholder: "Görüş linki (Zoom, Meet, Teams)" },
  { id: "phone", label: "Telefon", placeholder: "Zəng ediləcək nömrə (istəyə bağlı)" },
];
export const INTERVIEW_STATUS_LABEL: Record<InterviewStatus, string> = {
  scheduled: "Cavab gözlənilir",
  confirmed: "Namizəd təsdiqlədi",
  declined: "Namizəd imtina etdi",
  completed: "Keçirildi",
  cancelled: "Ləğv edildi",
  no_show: "Namizəd gəlmədi",
};
export const ACTIVE_INTERVIEW: InterviewStatus[] = ["scheduled", "confirmed"];

const text = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

// Azerbaijan has had no daylight saving since 2016: Baku is always UTC+4.
export const BAKU_OFFSET = "+04:00";
export function toIso(value: unknown): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  // "2026-11-02T14:30" is Baku local time; a value with Z or an offset is taken as given.
  const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw);
  const ms = Date.parse(local ? `${raw}:00${BAKU_OFFSET}` : raw);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}
export function bakuLocal(iso: string) {
  const d = new Date(Date.parse(iso) + 4 * 3600000);
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export type InterviewInput = { scheduledAt: string; durationMin: number; kind: InterviewKind; location: string; note: string };
export function sanitizeInterview(input: unknown, now = Date.now()): InterviewInput | { error: string } {
  const v = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const scheduledAt = toIso(v.scheduledAt);
  if (!scheduledAt) return { error: "Müsahibənin tarix və saatını seçin." };
  const when = Date.parse(scheduledAt);
  if (when < now + 5 * 60000) return { error: "Müsahibə vaxtı keçmişdə ola bilməz." };
  if (when > now + 366 * 86400000) return { error: "Müsahibə vaxtı bir ildən uzaq ola bilməz." };
  const kind: InterviewKind = v.kind === "onsite" || v.kind === "phone" ? v.kind : "online";
  const location = text(v.location, 300);
  if (kind !== "phone" && location.length < 3) return { error: kind === "onsite" ? "Müsahibənin ünvanını yazın." : "Onlayn görüşün linkini yazın." };
  const duration = Math.round(Number(v.durationMin) || 45);
  return { scheduledAt, durationMin: Math.max(15, Math.min(240, duration)), kind, location, note: text(v.note, 600) };
}

export type FeedbackDecision = "advance" | "hold" | "reject";
export function sanitizeFeedback(input: unknown): { rating: number; feedback: string; decision: FeedbackDecision } | { error: string } {
  const v = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const rating = Math.round(Number(v.rating));
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return { error: "Qiymətləndirmə 1-dən 5-ə qədər olmalıdır." };
  const feedback = text(v.feedback, 1500);
  const decision: FeedbackDecision = v.decision === "advance" || v.decision === "reject" ? v.decision : "hold";
  return { rating, feedback, decision };
}

const icsEscape = (value: string) => value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsTime = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
export function icsFor(input: { id: string; scheduledAt: string; durationMin: number; title: string; location: string; description: string }) {
  const end = new Date(Date.parse(input.scheduledAt) + input.durationMin * 60000).toISOString();
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Joblink//Interview//AZ",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.id}@joblink`,
    `DTSTAMP:${icsTime(new Date().toISOString())}`,
    `DTSTART:${icsTime(input.scheduledAt)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${icsEscape(input.title)}`,
    `LOCATION:${icsEscape(input.location)}`,
    `DESCRIPTION:${icsEscape(input.description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
