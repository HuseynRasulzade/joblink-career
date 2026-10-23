// Which notifications also go out by e-mail, and the categories a person can switch off.
export const EMAIL_CATEGORIES: { id: string; label: string; types: string[] }[] = [
  { id: "application", label: "Müraciət statusu", types: ["application-status"] },
  { id: "interview", label: "Müsahibə dəvət və xatırlatmaları", types: ["interview"] },
  { id: "offer", label: "İş təklifləri", types: ["offer"] },
  { id: "test", label: "Testlər", types: ["test"] },
  { id: "message", label: "Yeni mesajlar", types: ["message"] },
  { id: "alert", label: "Vakansiya xəbərdarlıqları və izlədiyim şirkətlər", types: ["job-alert", "followed-job"] },
  { id: "billing", label: "Hesab-faktura və paket", types: ["billing", "plan"] },
  { id: "other", label: "Digər bildirişlər (təsdiq, rəy, işçi xatırlatmaları)", types: [] },
];
export const categoryOfType = (type: string) => EMAIL_CATEGORIES.find((c) => c.types.includes(type))?.id || "other";
// Types that always travel with an e-mail (when sending is configured); the rest are sent by their own code.
export const AUTO_EMAIL_TYPES = new Set(["application-status", "offer", "test", "billing", "review", "message"]);
export const sanitizeEmailOff = (value: unknown): string[] =>
  [...new Set((Array.isArray(value) ? value : []).map(String))].filter((id) => EMAIL_CATEGORIES.some((c) => c.id === id));
export const emailAllowedFor = (off: string[], type: string) => !off.includes(categoryOfType(type));
