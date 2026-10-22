// Topics for support requests; shared by the request form, admin inbox and
// automatic requests such as a missing job title.
export const SUPPORT_TOPICS: { id: string; label: string; labelEn: string }[] = [
  { id: "job-title", label: "Vəzifə adının əlavə edilməsi", labelEn: "Add a job title" },
  { id: "university", label: "Universitetin əlavə edilməsi", labelEn: "Add a university" },
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
