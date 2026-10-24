// Warning signs of spam or fake vacancies, shown to the admin in the moderation list (a hint, never an automatic decision).
export type SpamInput = { title: string; description: string; requirements?: string; minSalary: number; maxSalary: number };
export type SpamSignal = { id: string; label: string };

const KEYWORDS = /(investisiya|pul\s+qazan|asan\s+pul|evd[əe]n\s+i[şs]l[əe]y[əe]r[əe]k\s+qazan|ilkin\s+[öo]d[əe]ni[şs]|depozit|qeydiyyat\s+haqq|[şs][əe]b[əe]k[əe]\s+marketinq|mlm|forex|kripto|crypto|pulsuz\s+telefon|tez\s+varlan)/i;
const CONTACT = /(\+?\d[\d\s().-]{8,}\d|[\w.+-]+@[\w-]+\.[\w.-]+|t\.me\/|telegram|whats\s?app|wa\.me|https?:\/\/)/i;

export function jobSpamSignals(job: SpamInput, sameOwnerSameTitle = 0): SpamSignal[] {
  const out: SpamSignal[] = [];
  const text = `${job.title} ${job.description} ${job.requirements || ""}`;
  if (KEYWORDS.test(text)) out.push({ id: "keywords", label: "Şübhəli ifadələr (tez qazanc, ilkin ödəniş, şəbəkə marketinqi və s.)" });
  if (CONTACT.test(job.title)) out.push({ id: "title-contact", label: "Başlıqda əlaqə məlumatı və ya link" });
  const letters = job.title.replace(/[^\p{L}]/gu, "");
  if (letters.length >= 8 && letters === letters.toLocaleUpperCase("az")) out.push({ id: "caps", label: "Başlıq tam BÖYÜK hərflərlədir" });
  if (/[!?]{2,}|[$€]{2,}/.test(job.title)) out.push({ id: "punct", label: "Başlıqda həddindən artıq durğu işarəsi" });
  if (job.description.replace(/\s+/g, " ").trim().length < 60) out.push({ id: "short", label: "Təsvir çox qısadır" });
  if (job.maxSalary >= 15000 || (job.minSalary && job.maxSalary && job.maxSalary > job.minSalary * 10)) out.push({ id: "salary", label: "Qeyri-adi maaş aralığı" });
  if (sameOwnerSameTitle >= 3) out.push({ id: "duplicates", label: `Eyni şirkətdən eyni başlıqlı ${sameOwnerSameTitle} elan` });
  return out;
}
