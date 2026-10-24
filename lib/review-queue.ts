// Document and company verification: how long an item has waited, and ready rejection reasons.
export const REJECTION_NOTE_TEMPLATES: { id: string; text: string }[] = [
  { id: "unreadable", text: "Sənəd oxunmur. Daha aydın şəkil və ya PDF yükləyin." },
  { id: "mismatch", text: "Sənəddəki məlumat profildə yazılanla uyğun gəlmir." },
  { id: "expired", text: "Sənədin etibarlılıq müddəti bitib." },
  { id: "incomplete", text: "Sənəd natamamdır (bütün səhifələr və ya möhür/imza görünmür)." },
  { id: "wrong-type", text: "Bu iddianı təsdiqləyən sənəd deyil. Müvafiq sənədi yükləyin." },
  { id: "voen", text: "VÖEN və ya hüquqi ad rəsmi qeydiyyatla uyğun gəlmir." },
];
export function waitingDays(since: string, now = new Date()) {
  const ms = now.getTime() - Date.parse(since);
  return Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 86400000) : 0;
}
export const waitingLabel = (since: string, now = new Date()) => {
  const days = waitingDays(since, now);
  return days === 0 ? "bu gün" : `${days} gün gözləyir`;
};
