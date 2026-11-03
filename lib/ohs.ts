// Occupational safety records (briefings, medical examinations, incidents) and the retention periods of HR papers.
export type OhsType = "briefing" | "medical" | "incident";
export const BRIEFING_KINDS: Record<string, string> = { intro: "Giriş təlimatı", initial: "İş yerində ilkin təlimat", repeat: "Təkrar təlimat", extra: "Növbədənkənar təlimat", fire: "Yanğın təhlükəsizliyi" };
export const MEDICAL_KINDS: Record<string, string> = { initial: "İlkin (işə qəbulda)", periodic: "Dövri", extra: "Növbədənkənar" };
export const MEDICAL_RESULTS: Record<string, string> = { fit: "İşləyə bilər", limited: "Məhdudiyyətlə", unfit: "İşləyə bilməz" };
export const INCIDENT_KINDS: Record<string, string> = { near: "Yaxın hadisə (zərər yoxdur)", minor: "Yüngül zədə", serious: "Ağır zədə", fatal: "Ölümlə nəticələnən", illness: "Peşə xəstəliyi" };
export const INCIDENT_STATUS: Record<string, string> = { open: "Açıq", investigating: "Araşdırılır", closed: "Bağlanıb" };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const addMonths = (date: string, months: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
};

// The next date a briefing or a medical examination falls due when the person does not write it themselves.
export function defaultDue(type: OhsType, kind: string, date: string): string {
  if (!isDate(date)) return "";
  if (type === "briefing") return kind === "intro" || kind === "extra" ? "" : addMonths(date, 6);
  if (type === "medical") return kind === "extra" ? "" : addMonths(date, 12);
  return "";
}

export const dueState = (due: string, today: string, soonDays = 30): "none" | "overdue" | "soon" | "ok" => {
  if (!isDate(due)) return "none";
  const left = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  return left < 0 ? "overdue" : left <= soonDays ? "soon" : "ok";
};

export type OhsInput = { type: OhsType; employeeId: string; date: string; due: string; status: string; data: Record<string, string | number | boolean> };

// Checks one record; the message is in Azerbaijani for the form.
export function cleanOhs(raw: Record<string, unknown>): { ok: true; value: OhsInput } | { ok: false; error: string } {
  const type = raw.type as OhsType;
  if (type !== "briefing" && type !== "medical" && type !== "incident") return { ok: false, error: "Qeydin növü düzgün deyil." };
  const date = text(raw.date, 10);
  if (!isDate(date)) return { ok: false, error: "Tarixi yazın." };
  const employeeId = text(raw.employeeId, 100);
  const kind = text(raw.kind, 20);
  if (type === "briefing") {
    if (!employeeId) return { ok: false, error: "İşçini seçin." };
    if (!BRIEFING_KINDS[kind]) return { ok: false, error: "Təlimatın növünü seçin." };
    const instructor = text(raw.instructor, 120);
    if (!instructor) return { ok: false, error: "Təlimatı keçən şəxsin adını yazın." };
    const due = isDate(raw.due) ? (raw.due as string) : defaultDue(type, kind, date);
    if (due && due < date) return { ok: false, error: "Növbəti tarix qeyd tarixindən əvvəl ola bilməz." };
    return { ok: true, value: { type, employeeId, date, due, status: "done", data: { kind, instructor, topic: text(raw.topic, 200), signed: raw.signed === true } } };
  }
  if (type === "medical") {
    if (!employeeId) return { ok: false, error: "İşçini seçin." };
    if (!MEDICAL_KINDS[kind]) return { ok: false, error: "Baxışın növünü seçin." };
    const result = text(raw.result, 20) || "fit";
    if (!MEDICAL_RESULTS[result]) return { ok: false, error: "Nəticəni seçin." };
    const due = isDate(raw.due) ? (raw.due as string) : defaultDue(type, kind, date);
    if (due && due < date) return { ok: false, error: "Növbəti baxış tarixi qeyd tarixindən əvvəl ola bilməz." };
    return { ok: true, value: { type, employeeId, date, due, status: "done", data: { kind, result, clinic: text(raw.clinic, 160), note: text(raw.note, 300) } } };
  }
  if (!INCIDENT_KINDS[kind]) return { ok: false, error: "Hadisənin növünü seçin." };
  const description = text(raw.description, 1500);
  if (description.length < 5) return { ok: false, error: "Hadisəni qısaca təsvir edin." };
  const status = INCIDENT_STATUS[text(raw.status, 20)] ? text(raw.status, 20) : "open";
  const days = Math.max(0, Math.min(3650, Math.round(Number(raw.daysLost) || 0)));
  const serious = kind === "serious" || kind === "fatal";
  return { ok: true, value: { type, employeeId, date, due: "", status, data: { kind, place: text(raw.place, 160), description, cause: text(raw.cause, 600), measures: text(raw.measures, 600), daysLost: days, reported: raw.reported === true, witnesses: text(raw.witnesses, 300), mustReport: serious } } };
}

// ── Retention periods of HR papers ──
// The years are a starting point for the company to check with a lawyer and the state archive rules; the company can change each.
export const RETENTION_CATEGORIES: { id: string; label: string; years: number }[] = [
  { id: "personal", label: "Şəxsi işlər və əmək müqavilələri", years: 75 },
  { id: "orders", label: "Kadr əmrləri (qəbul, köçürmə, xitam)", years: 75 },
  { id: "leave", label: "Məzuniyyət və icazə əmrləri", years: 5 },
  { id: "timesheet", label: "Tabel və davamiyyət", years: 5 },
  { id: "payroll", label: "Əmək haqqı sənədləri", years: 75 },
  { id: "ohs", label: "Əməyin mühafizəsi jurnalları və qəza aktları", years: 45 },
  { id: "candidates", label: "İşə qəbul olmayan namizədlərin sənədləri", years: 1 },
];
export const retentionYears = (custom: Record<string, number>, id: string) => custom[id] ?? RETENTION_CATEGORIES.find((c) => c.id === id)?.years ?? 0;
// The day the papers of a leaver may be considered for destruction.
export function retentionEnd(endDate: string, years: number): string {
  if (!isDate(endDate) || years <= 0) return "";
  const d = new Date(`${endDate}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

// A hash of the text a person confirmed, so the version they saw can be told later.
export async function textHash(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
