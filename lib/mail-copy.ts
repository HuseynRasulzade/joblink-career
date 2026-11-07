// What each kind of notification mail says around its text: the small heading above the title, the button label and
// the page the button opens. The site opens a page from the part of the address after "#" (https://site/#hr-approvals).
type Plan = { eyebrow: string; label: string };
const BY_LINK: Record<string, Plan> = {
  "hr-approvals": { eyebrow: "Təsdiq", label: "Təsdiqlərə keç" },
  "hr-interviews": { eyebrow: "Müsahibə", label: "Müsahibələrə bax" },
  "hr-candidates": { eyebrow: "Namizədlər", label: "Namizədlərə bax" },
  "hr-orders": { eyebrow: "Əmrlər", label: "Əmrlərə bax" },
  "hr-tests": { eyebrow: "Testlər", label: "Testlərə bax" },
  "hr-team": { eyebrow: "Komanda", label: "Komandaya bax" },
  "hr-messages": { eyebrow: "Mesaj", label: "Mesaja bax" },
  "hr-billing": { eyebrow: "Hesab-faktura", label: "Hesab-fakturaya bax" },
  "hr-employees": { eyebrow: "İşçilər", label: "İşçilərə bax" },
  "hr-people-ops": { eyebrow: "Kadr əməliyyatları", label: "Aç" },
  workplace: { eyebrow: "İş yerim", label: "İş yerimə keç" },
  messages: { eyebrow: "Mesaj", label: "Mesaja bax" },
  packages: { eyebrow: "Paketlər", label: "Paketlərə bax" },
  jobs: { eyebrow: "Vakansiya", label: "Vakansiyalara bax" },
};
const BY_TYPE: Record<string, Plan> = {
  interview: { eyebrow: "Müsahibə", label: "Müsahibəyə bax" },
  "application-status": { eyebrow: "Müraciət", label: "Müraciətlərimə bax" },
  offer: { eyebrow: "İş təklifi", label: "Təklifə bax" },
  test: { eyebrow: "Test", label: "Testə keç" },
  message: { eyebrow: "Mesaj", label: "Mesaja bax" },
  billing: { eyebrow: "Hesab-faktura", label: "Hesab-fakturaya bax" },
  review: { eyebrow: "Rəy", label: "Aç" },
  "followed-job": { eyebrow: "Yeni vakansiya", label: "Vakansiyaya bax" },
  "job-alert": { eyebrow: "Vakansiya xəbərdarlığı", label: "Vakansiyalara bax" },
};
// Candidate-side pages share one key ("applications"): the type tells what the notice is about.
export function mailPlan(type: string, link: string, siteUrl: string): { eyebrow: string; label: string; url: string } {
  const plan = BY_TYPE[type] || BY_LINK[link] || { eyebrow: "Bildiriş", label: "JobMatch-də aç" };
  const page = /^[a-z0-9-]{1,40}$/.test(link) ? link : "";
  return { ...plan, url: `${siteUrl}${page ? `/#${page}` : ""}` };
}
export const greetingFor = (name: string) => {
  const first = (name || "").trim().split(/\s+/)[0];
  return first ? `Salam, ${first}` : "Salam";
};
