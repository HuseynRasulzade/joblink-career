// Topics for support requests; shared by the request form, admin inbox and
// automatic requests such as a missing job title.
export const SUPPORT_TOPICS: { id: string; label: string; labelEn: string }[] = [
  { id: "job-title", label: "Vəzifə adının əlavə edilməsi", labelEn: "Add a job title" },
  { id: "university", label: "Universitetin əlavə edilməsi", labelEn: "Add a university" },
  { id: "major", label: "İxtisasın əlavə edilməsi", labelEn: "Add a study programme" },
  { id: "skill", label: "Bacarıq kataloqu", labelEn: "Skills catalog" },
  { id: "certification", label: "Sertifikat kataloqu", labelEn: "Certifications catalog" },
  { id: "complaint", label: "Şikayət", labelEn: "Complaint" },
  { id: "suggestion", label: "Təklif", labelEn: "Suggestion" },
  { id: "technical", label: "Texniki problem", labelEn: "Technical issue" },
  { id: "billing", label: "Ödəniş və hesab-faktura", labelEn: "Payments and invoices" },
  { id: "verification", label: "Verifikasiya", labelEn: "Verification" },
  { id: "vacancy", label: "Vakansiya və ya müraciət", labelEn: "Vacancy or application" },
  { id: "other", label: "Digər", labelEn: "Other" },
];
export const SUPPORT_STATUSES: Record<string, { label: string; labelEn: string }> = {
  new: { label: "Göndərildi", labelEn: "Sent" },
  read: { label: "Oxundu", labelEn: "Read" },
  in_progress: { label: "İcradadır", labelEn: "In progress" },
  done: { label: "Tamamlandı", labelEn: "Done" },
  rejected: { label: "Rədd edildi", labelEn: "Rejected" },
};
export const supportTopicLabel = (id: string) =>
  SUPPORT_TOPICS.find((topic) => topic.id === id)?.label || id;

// Ready answers the admin can insert into a reply and edit.
export const SUPPORT_REPLY_TEMPLATES: { id: string; label: string; text: string }[] = [
  { id: "received", label: "Sorğu qəbul edildi", text: "Salam! Sorğunuzu aldıq və baxırıq. Qısa müddətdə sizə yenidən yazacağıq." },
  { id: "more-info", label: "Əlavə məlumat lazımdır", text: "Salam! Problemi dəqiq anlamaq üçün əlavə məlumat lazımdır: hansı səhifədə baş verir, nə vaxt başlayıb və ekran şəkli əlavə edə bilərsinizmi?" },
  { id: "done", label: "Həll edildi", text: "Salam! Dediyiniz məsələ həll edildi. Hər hansı problem qalarsa, bu yazışmaya cavab yaza bilərsiniz. Təşəkkür edirik!" },
  { id: "catalog-added", label: "Kataloqa əlavə edildi", text: "Salam! Təklifiniz əsasında kataloqa əlavə etdik. İndi profil və ya vakansiyada seçə bilərsiniz." },
  { id: "not-possible", label: "Hələlik mümkün deyil", text: "Salam! Təklifinizə görə təşəkkür edirik. Hazırda bunu həyata keçirmək mümkün deyil, lakin qeyd etdik və gələcək yenilikləri planlaşdırarkən nəzərə alacağıq." },
];

// First-answer time: how long requests wait for the admin's first reply.
export function supportSla(rows: { created: string; firstReply: string | null }[], now = new Date()) {
  const answered = rows.filter((r) => r.firstReply);
  const hours = answered.map((r) => (Date.parse(r.firstReply as string) - Date.parse(r.created)) / 3600000).filter((h) => h >= 0);
  const waiting = rows.filter((r) => !r.firstReply).map((r) => (now.getTime() - Date.parse(r.created)) / 3600000);
  return {
    answered: answered.length,
    unanswered: waiting.length,
    avgFirstReplyHours: hours.length ? Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10 : null,
    oldestWaitingHours: waiting.length ? Math.round(Math.max(...waiting) * 10) / 10 : null,
  };
}
