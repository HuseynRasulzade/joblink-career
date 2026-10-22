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
