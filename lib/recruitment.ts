// Vacancy-level recruitment settings shared by the server and UI.
export const VACANCY_REASONS: { id: string; label: string; labelEn: string }[] = [
  { id: "new-position", label: "Yeni vəzifə (ştat genişlənməsi)", labelEn: "New position (headcount growth)" },
  { id: "replacement-exit", label: "İşçinin işdən çıxması ilə əlaqədar", labelEn: "Replacement after an employee left" },
  { id: "replacement-internal", label: "İşçinin daxili keçidi / vəzifə dəyişikliyi", labelEn: "Replacement after an internal move" },
  { id: "temporary", label: "Müvəqqəti əvəzetmə (məzuniyyət və s.)", labelEn: "Temporary cover (leave etc.)" },
  { id: "seasonal", label: "Mövsümi və ya layihə üzrə ehtiyac", labelEn: "Seasonal or project need" },
  { id: "new-department", label: "Yeni şöbə / filial", labelEn: "New department or branch" },
  { id: "other", label: "Digər", labelEn: "Other" },
];
export const DEFAULT_STAGES = ["CV-nin yoxlanılması", "Telefon müsahibəsi", "Texniki müsahibə / test", "Yekun müsahibə"];

// The one list of selection stages: the vacancy form, the pipeline and the interview window all use these names.
// "interview" stages have a time and a place (kind), "test" stages send a test, "review" stages are internal checks.
export type StageType = "review" | "interview" | "test";
export type StageInfo = { name: string; type: StageType; kind?: "onsite" | "online" | "phone" };
export const STAGE_CATALOG: StageInfo[] = [
  { name: "CV-nin yoxlanılması", type: "review" },
  { name: "Telefon müsahibəsi", type: "interview", kind: "phone" },
  { name: "Onlayn görüş", type: "interview", kind: "online" },
  { name: "Üz-üzə görüş", type: "interview", kind: "onsite" },
  { name: "Test", type: "test" },
  { name: "Texniki tapşırıq", type: "test" },
  { name: "Texniki müsahibə", type: "interview", kind: "online" },
  { name: "Rəhbər müsahibəsi", type: "interview", kind: "onsite" },
  { name: "Yekun müsahibə", type: "interview", kind: "onsite" },
  { name: "Arayış və sənəd yoxlaması", type: "review" },
];
const fold = (v: string) => v.toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g");
// What a stage named by the employer is: a catalog entry, else guessed from its words.
export function stageInfo(name: string): StageInfo {
  const exact = STAGE_CATALOG.find((s) => s.name === name);
  if (exact) return exact;
  const f = fold(name);
  if (/\b(test|tapsir(?:iq|ig)|quiz|imtahan)/.test(f)) return { name, type: "test" };
  if (/onlayn|online|zoom|meet/.test(f)) return { name, type: "interview", kind: "online" };
  if (/telefon|zeng/.test(f)) return { name, type: "interview", kind: "phone" };
  if (/muasahibe|musahibe|gorus|uz-uze|uz uze|ofis/.test(f)) return { name, type: "interview", kind: "onsite" };
  if (/cv|yoxlan|arayis|sened|tehlukesizlik/.test(f)) return { name, type: "review" };
  return { name, type: "interview", kind: "onsite" };
}
export const APPLICATION_STATUSES = [
  "Göndərildi",
  "Baxışda",
  "Müsahibə",
  "Təklif edildi",
  "İşə qəbul edildi",
  "Uyğun deyil",
];
export const WITHDRAWN_STATUS = "Geri götürülüb";
// Candidates see the selection stages once the employer accepted the
// application for review; rejected and withdrawn applications do not.
export const STAGE_VISIBLE_STATUSES = new Set(["Baxışda", "Müsahibə", "Təklif edildi", "İşə qəbul edildi"]);
export function sanitizeStages(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return [...new Set(value.filter((x): x is string => typeof x === "string").map((x) => x.trim().replace(/\s+/g, " ").slice(0, 60)).filter(Boolean))].slice(0, 8);
}

// Why an application was closed. The employer may share the reason (and a short note) with the candidate.
export const REJECTION_REASONS: { id: string; label: string }[] = [
  { id: "experience", label: "Tələb olunan təcrübə çatmır" },
  { id: "skills", label: "Bacarıqlar vakansiyanın tələbinə uyğun deyil" },
  { id: "salary", label: "Maaş gözləntisi uyğun gəlmir" },
  { id: "other-candidate", label: "Başqa namizəd seçildi" },
  { id: "test", label: "Test nəticəsi kifayət etmədi" },
  { id: "position-closed", label: "Vakansiya bağlandı" },
  { id: "other", label: "Digər" },
];
export function sanitizeRejection(input: { reason?: unknown; note?: unknown; share?: unknown }) {
  const reason = REJECTION_REASONS.find((r) => r.id === input.reason);
  const note = typeof input.note === "string" ? input.note.replace(/\s+/g, " ").trim().slice(0, 200) : "";
  return { reason: reason?.id || "", label: reason?.label || "", note, share: input.share === true && !!reason };
}
