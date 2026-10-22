import { blankProfile, type Profile } from "./model.ts";

// Azerbaijani CVs in the wild mix native, English and (often) Russian
// headings — sometimes within the same document. Each concept lists every
// synonym seen in practice so the same dictionary can both look up a field
// and recognize where the next section starts, keeping the two in sync.
const HEADINGS = {
  name: "ad və soyad|adı və soyadı|ad soyad|full name|name|фио|имя",
  title:
    "vəzifə|ixtisas|peşə|title|position|profession|должность|специальность",
  phone:
    "telefon(?: nömrəsi)?|əlaqə nömrəsi|mobil(?: nömrə)?|phone|telephone|mobile|телефон",
  city: "şəhər|ünvan|yaşayış yeri|city|location|address|город|адрес",
  summary:
    "haqqımda|özüm haqqında|peşəkar xülasə|xülasə|məqsəd|summary|profile|about me|objective|карьерная цель|о себе|цель",
  experience:
    "iş təcrübəsi|əmək fəaliyyəti|peşə təcrübəsi|təcrübə|experience|work experience|employment history|опыт работы|опыт",
  education:
    "təhsil|təhsilim|education|образование|учеба",
  skills:
    "bacarıqlar|texniki bacarıqlar|peşə bacarıqları|professional skills|skills|technical skills|навыки|умения",
  languages: "dillər|dil bilikləri|languages|языки|языковые навыки",
  certificates:
    "sertifikatlar|sertifikat|kurslar|certificates|certifications|courses|сертификаты|курсы",
  contact:
    "əlaqə|əlaqə məlumatları|contact|contact information|контакты|контактная информация",
  projects: "layihələr|projects|проекты",
  references: "referanslar|tövsiyələr|references|рекомендации",
  other:
    "cv|resume|curriculum vitae|personal information|şəxsi məlumatlar|hobbi|maraqlar|hobbies|interests",
};
const ALL_HEADINGS = Object.values(HEADINGS).join("|");
// JS regex /i uses default Unicode case-folding, which maps İ -> "i̇" (two
// code points) rather than the Azerbaijani/Turkish "i". Matching headings
// case-insensitively against a native regex flag silently misses every
// capitalized "İş təcrübəsi", "Təhsil" etc. heading. Instead we lowercase
// with the "az" locale (İ->i, I->ı) and match case-sensitively against that.
const az = (s: string) => s.toLocaleLowerCase("az");
// Conservative local extraction: uncertain facts stay empty for human review.
export function cvFields(text: string): Partial<Profile> {
  const lines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
  const lower = lines.map(az);
  const field = (labels: string) => {
    const re = new RegExp(`^(?:${labels})\\s*(?:[:：]|[-–]\\s)\\s*`, "u");
    for (let i = 0; i < lower.length; i++) {
      const m = re.exec(lower[i]);
      if (m) return lines[i].slice(m[0].length).trim();
    }
    return "";
  };
  const headingLine = new RegExp(`^(?:${HEADINGS.other})\\s*[:：]?$`, "u");
  const firstIndex = lower.findIndex((x) => !headingLine.test(x));
  const first = firstIndex >= 0 ? lines[firstIndex] : undefined;
  const name =
    field(HEADINGS.name) ||
    (first &&
    /^[\p{Lu}][\p{L}'’-]+(?:\s+(?:oğlu|qızı|[\p{Lu}][\p{L}'’-]+)){1,4}$/u.test(
      first,
    )
      ? first
      : "");
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone =
    field(HEADINGS.phone) ||
    text.match(/\+\d[\d ()-]{8,20}\d/)?.[0] ||
    text.match(/\b0\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/)?.[0] ||
    "";
  const section = (key: keyof typeof HEADINGS) => {
    const labels = HEADINGS[key];
    const re = new RegExp(`^(?:${labels})\\s*[:：]?$`, "u");
    const i = lower.findIndex((x) => re.test(x));
    if (i < 0) return field(labels);
    const stop = new RegExp(`^(?:${ALL_HEADINGS})\\s*[:：]?$`, "u");
    const out: string[] = [];
    for (let j = i + 1; j < lower.length && out.length < 12; j++) {
      if (stop.test(lower[j])) break;
      out.push(lines[j]);
    }
    return out.join("\n");
  };
  const rawSkills = section("skills");
  // Many real CVs open with a free-form intro paragraph and no "Haqqımda" /
  // "Summary" heading at all — either the whole CV is just one paragraph
  // ("Mən hesabatlılıq və büdcə üzrə mütəxəssisəm...") or an unlabeled intro
  // sits before labeled Experience/Education sections. Previously both left
  // summary empty. Use whatever text precedes the first recognized heading
  // (the whole document if none exists) as the summary, minus the name and
  // any contact/label lines — but only while that leading block is short, so
  // a long unheaded wall of text (more likely a formatting artifact than a
  // real "about me") still isn't guessed at.
  let summary = section("summary");
  if (!summary) {
    const headingRe = new RegExp(`^(?:${ALL_HEADINGS})\\s*[:：]?$`, "u");
    const firstHeadingIndex = lower.findIndex((l) => headingRe.test(l));
    const introLines =
      firstHeadingIndex >= 0 ? lines.slice(0, firstHeadingIndex) : lines;
    if (introLines.join(" ").length <= 1500) {
      const contactLine = /@|https?:\/\/|\+?\d[\d ()-]{7,}\d/u;
      const labelLine = /^[\p{L} ]{2,40}[:：]/u;
      const prose = introLines.filter(
        (l) => l !== name && !contactLine.test(l) && !labelLine.test(l),
      );
      const joined = prose.join(" ").trim();
      if (joined.length >= 30) summary = joined.slice(0, 1200);
    }
  }
  return {
    name,
    email,
    phone,
    title: field(HEADINGS.title),
    city: field(HEADINGS.city),
    summary,
    skills: rawSkills
      .split(/[,;\n•·—|]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 50),
    languages: section("languages"),
    certificates: section("certificates"),
    links: (text.match(/https?:\/\/[^\s<>]+/g) || []).join("\n"),
  };
}

export function mergeCvFields(
  current: Profile,
  extracted: Partial<Profile>,
  sample = false,
): Profile {
  const result = { ...(sample ? blankProfile : current) };
  for (const key of [
    "name",
    "title",
    "email",
    "phone",
    "city",
    "summary",
    "languages",
    "certificates",
    "links",
  ] as const) {
    const value = extracted[key];
    if (typeof value === "string" && value.trim()) result[key] = value.trim();
  }
  for (const key of ["skills", "experiences", "education"] as const) {
    const value = extracted[key];
    if (Array.isArray(value) && value.length) (result as any)[key] = value;
  }
  if (extracted.structuredCv && typeof extracted.structuredCv === "object")
    result.structuredCv = extracted.structuredCv;
  if (Array.isArray(extracted.cvFieldConfidence))
    result.cvFieldConfidence = extracted.cvFieldConfidence;
  if (extracted.cvParserMetadata)
    result.cvParserMetadata = extracted.cvParserMetadata;
  return result;
}
