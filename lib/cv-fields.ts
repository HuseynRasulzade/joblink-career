import { blankProfile, type Profile } from "./model.ts";

// Azerbaijani CVs in the wild mix native, English and (often) Russian
// headings — sometimes within the same document. Each concept lists every
// synonym seen in practice so the same dictionary can both look up a field
// and recognize where the next section starts, keeping the two in sync.
const HEADINGS = {
  name: "ad və soyad|adı və soyadı|ad soyad|full name|name|фио|имя",
  title:
    "vəzifə|ixtisas|peşə|ünvan|unvan|pozisyon|title|position|profession|должность|специальность",
  phone:
    "telefon(?: nömrəsi)?|əlaqə nömrəsi|mobil(?: nömrə)?|phone|telephone|mobile|телефон",
  city: "şəhər|ünvan|yaşayış yeri|city|location|address|город|адрес",
  summary:
    "haqqımda|özüm haqqında|peşəkar xülasə|xülasə|məqsəd|hakkımda|özet|kariyer hedefi|summary|profile|about me|objective|карьерная цель|о себе|цель",
  experience:
    "iş təcrübəsi|əmək fəaliyyəti|peşə təcrübəsi|təcrübə|iş geçmişi|iş deneyimi|iş tecrübesi|deneyim|tecrübe|experience|work experience|employment history|опыт работы|опыт",
  education:
    "təhsil|təhsilim|eğitim|eğitim bilgileri|education|образование|учеба",
  skills:
    "bacarıqlar|texniki bacarıqlar|peşə bacarıqları|beceriler|beceri ve yetkinlikler|yetkinlikler|yetenekler|professional skills|skills|technical skills|навыки|умения",
  languages:
    "dillər|dil bilikləri|yabancı dil|yabancı diller|konuştuğu diller|dil bilgisi|languages|языки|языковые навыки",
  certificates:
    "sertifikatlar|sertifikat|kurslar|sertifikalar|sertifika|certificates|certifications|courses|сертификаты|курсы",
  contact:
    "əlaqə|əlaqə məlumatları|iletişim|bana ulaşın|contact|contact information|контакты|контактная информация",
  projects: "layihələr|projects|проекты",
  references: "referanslar|referans|tövsiyələr|references|рекомендации",
  other:
    "cv|resume|curriculum vitae|personal information|şəxsi məlumatlar|hobbi|maraqlar|hobiler|ilgi alanları|hobbies|interests",
};
const ALL_HEADINGS = Object.values(HEADINGS).join("|");
// JS regex /i uses default Unicode case-folding, which maps İ -> "i̇" (two
// code points) rather than the Azerbaijani/Turkish "i". Matching headings
// case-insensitively against a native regex flag silently misses every
// capitalized "İş təcrübəsi", "Təhsil" etc. heading. Instead we lowercase
// with the "az" locale (İ->i, I->ı) and match case-sensitively against that.
const az = (s: string) => s.toLocaleLowerCase("az");
// Designed CVs print headings letter by letter ("E Ğ İ T İ M"), sometimes over
// two lines. Joined, they are matched against the known headings and put back
// as normal words.
const COLLAPSED_HEADINGS = new Map(
  ALL_HEADINGS.split("|").map((h) => [h.replace(/\s+/g, ""), h] as const),
);
const spacedLine = (line: string) => /^(?:\p{L}\s){3,}\p{L}$/u.test(line.trim());
function mergeSpacedHeadings(lines: string[]) {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (spacedLine(lines[i])) {
      const one = az(lines[i]).replace(/\s+/g, "");
      const two = i + 1 < lines.length && spacedLine(lines[i + 1]) ? one + az(lines[i + 1]).replace(/\s+/g, "") : "";
      if (two && COLLAPSED_HEADINGS.has(two)) {
        out.push(COLLAPSED_HEADINGS.get(two)!.toLocaleUpperCase("az"));
        i++;
        continue;
      }
      if (COLLAPSED_HEADINGS.has(one)) {
        out.push(COLLAPSED_HEADINGS.get(one)!.toLocaleUpperCase("az"));
        continue;
      }
    }
    out.push(lines[i]);
  }
  return out;
}
// A name printed letter by letter, words apart by a wider gap ("G İ Z E M   K A Y A"),
// is put back together. A single run of letters is left alone: it may be a heading.
function collapseSpacedWords(line: string) {
  const groups = line.trim().split(/\s{2,}|\t+/);
  if (groups.length < 2 || !groups.every((g) => /^(?:\p{L}\s){2,}\p{L}$/u.test(g))) return line;
  return groups.map((g) => g.replace(/\s+/g, "")).join(" ");
}
// Conservative local extraction: uncertain facts stay empty for human review.
export function cvFields(text: string): Partial<Profile> {
  const lines = mergeSpacedHeadings(
    text
      .split(/\r?\n/)
      .map((x) => collapseSpacedWords(x).trim())
      // Page markers added when a PDF is read are not part of the CV.
      .filter((x) => x && !/^\[SƏHİFƏ \d+\]$/u.test(x)),
  );
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
  const anyHeading = new RegExp(`^(?:${ALL_HEADINGS})\\s*[:：]?$`, "u");
  const mainHeading = new RegExp(
    `^(?:${HEADINGS.summary}|${HEADINGS.experience}|${HEADINGS.education}|${HEADINGS.skills})\\s*[:：]?$`,
    "u",
  );
  const firstIndex = lower.findIndex((x) => !headingLine.test(x));
  const first = firstIndex >= 0 ? lines[firstIndex] : undefined;
  const nameLike = (line: string) =>
    !anyHeading.test(az(line)) &&
    !/\d/.test(line) &&
    (/^[\p{Lu}][\p{L}'’-]+(?:\s+(?:oğlu|qızı|[\p{Lu}][\p{L}'’-]+)){1,4}$/u.test(line) ||
      // Designed CVs often print the name in capitals ("BURAK KUZEY").
      /^[\p{Lu}'’-]{2,}(?:\s+[\p{Lu}'’-]{2,}){1,3}$/u.test(line));
  // The name is the first line, or the first name-like line that has a title
  // line and then a main heading right after it (a sidebar may come first).
  let nameIndex = -1;
  for (let i = 0; i < Math.min(lines.length, 80); i++) {
    if (!nameLike(lines[i])) continue;
    const firstMain = lower.findIndex((l) => mainHeading.test(l));
    if (firstMain >= 0 && i > firstMain) break;
    if (lines[i] === first || lower.slice(i + 1, i + 3).some((l) => mainHeading.test(l))) {
      nameIndex = i;
      break;
    }
  }
  const name = field(HEADINGS.name) || (nameIndex >= 0 ? lines[nameIndex] : "");
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
  const sectionLines = (key: keyof typeof HEADINGS) => {
    const re = new RegExp(`^(?:${HEADINGS[key]})\\s*[:：]?$`, "u");
    const i = lower.findIndex((x) => re.test(x));
    if (i < 0) return [] as string[];
    const stop = new RegExp(`^(?:${ALL_HEADINGS})\\s*[:：]?$`, "u");
    const out: string[] = [];
    for (let j = i + 1; j < lower.length && out.length < 80; j++) {
      if (stop.test(lower[j])) break;
      out.push(lines[j]);
    }
    return out;
  };
  const experiences = cvExperiences(sectionLines("experience"));
  const education = cvEducation(sectionLines("education"));
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
    title:
      field(HEADINGS.title) ||
      // A short line right under the name is usually the profession.
      (() => {
        if (!name || nameIndex < 0 || lines[nameIndex] !== name) return "";
        const next = lines[nameIndex + 1];
        if (
          !next ||
          next.length < 3 ||
          next.length > 70 ||
          /[\d@:]|https?/u.test(next) ||
          new RegExp(`^(?:${ALL_HEADINGS})\\s*[:：]?$`, "u").test(az(next))
        )
          return "";
        return next;
      })(),
    city: field(HEADINGS.city),
    summary,
    skills: rawSkills
      .split(/[,;\n•·—|]+/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 50),
    languages: section("languages"),
    certificates: section("certificates"),
    experiences,
    education,
    links: (text.match(/https?:\/\/[^\s<>]+/g) || []).join("\n"),
  };
}

// ---- Work history and education, read by the rules ----------------------
// Only entries with a readable start date become work records (the profile
// needs a valid date range); anything uncertain is left for the person to fill.
const MONTHS: Record<string, string> = {
  yanvar: "01", fevral: "02", mart: "03", aprel: "04", may: "05", iyun: "06",
  iyul: "07", avqust: "08", sentyabr: "09", oktyabr: "10", noyabr: "11", dekabr: "12",
  ocak: "01", şubat: "02", nisan: "04", mayıs: "05", haziran: "06", temmuz: "07",
  ağustos: "08", eylül: "09", ekim: "10", kasım: "11", aralık: "12",
  january: "01", february: "02", march: "03", april: "04", june: "06", july: "07",
  august: "08", september: "09", october: "10", november: "11", december: "12",
  jan: "01", feb: "02", mar: "03", apr: "04", jun: "06", jul: "07", aug: "08",
  sep: "09", oct: "10", nov: "11", dec: "12",
};
const OPEN_END = "(?:present|now|current|hazırda|indiyədək|davam edir|günümüz|devam ediyor|halen|по настоящее время|настоящее время|\\.{2,}|…)";
const MONTH_NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
const POINT = `(?:(?:\\d{1,2}[./])?\\d{1,2}[./]\\d{4}|\\d{4}-\\d{2}|(?:${MONTH_NAMES})\\.?\\s+\\d{4}|\\d{4})`;
const RANGE = new RegExp(
  `(${POINT})\\s*(?:[-–—|]|to|-dan|dən|dan)\\s*(${POINT}|${OPEN_END})?`,
  "iu",
);
const SINGLE_YEAR = /(?:^|[\s|,(])((?:19|20)\d{2})(?=$|[\s|,)])/u;
function toMonth(point: string, end: boolean) {
  const text = az(point.trim());
  const year = /(\d{4})/.exec(text)?.[1];
  if (!year) return "";
  const named = /^(\p{L}{3,10})\.?\s+\d{4}$/u.exec(text);
  if (named) {
    const month = MONTHS[named[1]];
    return month ? `${year}-${month}` : `${year}-${end ? "12" : "01"}`;
  }
  const numeric = /(?:\d{1,2}[./])?(\d{1,2})[./](\d{4})$/.exec(text);
  if (numeric) return `${year}-${numeric[1].padStart(2, "0")}`;
  const iso = /^(\d{4})-(\d{2})$/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}`;
  return `${year}-${end ? "12" : "01"}`;
}
type Dates = { start: string; end: string; current: boolean; rest: string };
const tidy = (text: string) =>
  text
    .replace(/\(\s*\)/g, " ")
    .replace(/[|,;:\s]+$/u, "")
    .replace(/^[|,;:)\s\-–—]+/u, "")
    .replace(/\s{2,}/g, " ")
    .trim();
function readDates(line: string): Dates | null {
  // Matched on a lower-cased copy ("İyun" is "iyun"); the text is cut from the original.
  const low = az(line);
  const match = RANGE.exec(low);
  if (match && /(?:19|20)\d{2}/.test(match[1])) {
    const startYear = Number(/(\d{4})/.exec(match[1])?.[1]);
    const endText = match[2] || "";
    const open = !endText || new RegExp(`^${OPEN_END}$`, "iu").test(az(endText.trim()));
    const start = toMonth(match[1], false);
    const end = open ? "" : toMonth(endText, true);
    if (start && (open || (end && end >= start && Number(end.slice(0, 4)) >= startYear))) {
      const rest = tidy(line.slice(0, match.index) + " " + line.slice(match.index + match[0].length));
      return { start, end, current: open, rest };
    }
  }
  const single = SINGLE_YEAR.exec(low);
  if (single && line.replace(single[1], "").trim().length > 0) {
    const year = single[1];
    const rest = tidy(line.replace(single[0], " "));
    return { start: `${year}-01`, end: `${year}-12`, current: false, rest };
  }
  return null;
}
const ROLE_WORD =
  /(menecer|manager|müdir|müdiri|mütəxəssis|müəllim|mühasib|mühəndis|engineer|developer|specialist|analitik|analyst|direktor|director|yönetici|yönetim|uzman|asistan|assistant|tasarımcı|designer|operator|katib|koordinator|consultant|məsləhətçi|stajyer|təcrübəçi|intern|rəhbər|lead|head|satış|sales|executive|officer|agent|sürücü|aşpaz|həkim|hüquqşünas|lawyer|proqramçı|dizayner)/iu;
const COMPANY_WORD = /(mmc|asc|qsc|llc|ltd|inc|a\.ş\.|şirket|şirkət|company|group|qrup|grubu|holding|bank|universit|corp|ooo|ооо)/iu;
const hasWord = (re: RegExp, line: string) => re.test(az(line));
const sentenceLike = (line: string) => line.length > 90 || /[.!?]$/.test(line) || /^[•·\-–*]/.test(line);
function splitHeader(parts: string[]): { title: string; company: string } {
  const flat = parts.map((x) => x.trim()).filter(Boolean);
  let items: string[] = [];
  for (const part of flat) items.push(...part.split(/\s+[-–—|]\s+|\s*[-–—|]\s+|\s+[-–—|]\s*|,\s+/u).map((x) => x.trim()).filter(Boolean));
  items = items.map((x) => x.replace(/[,;]+$/u, "").trim()).filter(Boolean);
  if (!items.length) return { title: "", company: "" };
  if (items.length === 1) return hasWord(COMPANY_WORD, items[0]) && !hasWord(ROLE_WORD, items[0]) ? { title: "", company: items[0] } : { title: items[0], company: "" };
  let title = items.find((x) => hasWord(ROLE_WORD, x) && !hasWord(COMPANY_WORD, x)) || items[0];
  const company = items.find((x) => x !== title) || "";
  if (!hasWord(ROLE_WORD, title) && hasWord(ROLE_WORD, company) && !hasWord(COMPANY_WORD, company)) return { title: company, company: title };
  return { title, company };
}
export function cvExperiences(sectionLines: string[]): Profile["experiences"] {
  const found = sectionLines.map((line, index) => ({ index, dates: readDates(line) })).filter((x) => x.dates);
  const entries: { header: string[]; dates: Dates; at: number; after: boolean }[] = [];
  let used = -1;
  for (const hit of found) {
    const header: string[] = [];
    if (hit.dates!.rest) header.push(hit.dates!.rest);
    // Up to two short lines right above the date line belong to this entry.
    const room = hit.dates!.rest ? 1 : 2;
    for (let back = hit.index - 1; back > used && back >= hit.index - room; back--) {
      if (sentenceLike(sectionLines[back]) || readDates(sectionLines[back])) break;
      header.unshift(sectionLines[back]);
    }
    // Some layouts print the dates first and the position under them.
    let after = false;
    const below = sectionLines[hit.index + 1];
    if (!header.length && below && !sentenceLike(below) && !readDates(below)) {
      header.push(below);
      after = true;
    }
    entries.push({ header, dates: hit.dates!, at: hit.index, after });
    used = hit.index;
  }
  return entries
    .map((entry, n) => {
      const { title, company } = splitHeader(entry.header);
      const next = entries[n + 1];
      const stop = next
        ? next.after
          ? next.at
          : next.at - Math.max(0, next.header.length - (readDates(sectionLines[next.at])?.rest ? 1 : 0))
        : sectionLines.length;
      const from = entry.at + 1 + (entry.after ? 1 : 0);
      const description = sectionLines
        .slice(from, Math.max(from, stop))
        .filter((x) => !readDates(x) || sentenceLike(x))
        .join("\n")
        .replace(/^lorem ipsum.*$/gim, "")
        .trim()
        .slice(0, 1500);
      return { id: `e${n + 1}`, title, company, employmentType: "", start: entry.dates.start, end: entry.dates.end, current: entry.dates.current, description };
    })
    .filter((x) => x.title || x.company)
    .map((x) => ({ ...x, title: x.title || x.company, company: x.title ? x.company : "" }))
    .slice(0, 15);
}
const SCHOOL_WORD = /(universit|üniversite|universitet|institut|kollec|college|akademi|academy|lisesi|lisey|məktəb|mektep|school|gimnaziya|gymnasium|ada |bdu|atu|unec|bhos|мгу|университет|институт)/iu;
const DEGREE_WORD = /(bakalavr|magistr|doktor|lisans|yüksek lisans|bachelor|master|mba|phd|ali təhsil|orta təhsil|lisey|lise\b|diplom|bakalavriat|specialist degree|бакалавр|магистр)/iu;
export function cvEducation(sectionLines: string[]): Profile["education"] {
  const rows: Profile["education"] = [];
  const isDate = (line?: string) => !!line && !!readDates(line) && !readDates(line)!.rest;
  // Lines already taken as the subject/degree of an earlier school.
  const taken = new Set<number>();
  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i];
    if (sentenceLike(line) && !hasWord(SCHOOL_WORD, line)) continue;
    if (!hasWord(SCHOOL_WORD, line)) continue;
    const dated = readDates(line);
    const head = (dated?.rest || line).trim();
    // "School - Subject 2015-2019": the school is before the dash, the subject after it.
    const parts = head.split(/\s+[-–—|]\s+|[-–—]\s+|,\s+/u).map((x) => x.trim()).filter(Boolean);
    const school = (parts[0] || head).replace(/[,;]+$/u, "").trim();
    const subject = parts.slice(1).join(" · ");
    const before = sectionLines[i - 1];
    const below: string[] = [];
    const belowAt: number[] = [];
    // "İşletme 2014 - 2018" under the school: the subject and the years share a line.
    let subjectDates: ReturnType<typeof readDates> = null;
    for (let j = i + 1; j < sectionLines.length && below.length < 3; j++) {
      const next = sectionLines[j];
      const withDates: ReturnType<typeof readDates> = !below.length && !subjectDates ? readDates(next) : null;
      if (withDates?.rest && !hasWord(SCHOOL_WORD, next) && !sentenceLike(next)) {
        subjectDates = withDates;
        below.push(withDates.rest.trim());
        belowAt.push(j);
        continue;
      }
      if (hasWord(SCHOOL_WORD, next) || isDate(next) || sentenceLike(next) || readDates(next)) break;
      below.push(next);
      belowAt.push(j);
    }
    const degreeBefore = before && !taken.has(i - 1) && !isDate(before) && !hasWord(SCHOOL_WORD, before) && !sentenceLike(before) && hasWord(DEGREE_WORD, before) ? before : "";
    const degree = [degreeBefore || "", subject, ...(degreeBefore ? [] : [below.join(" ")])].filter(Boolean).join(" · ") ||
      (/(bakalavr|magistr|lisans|yüksek lisans|bachelor|master|mba|phd|doktor)/iu.exec(head) || [""])[0];
    // The dates sit on the school line, just below it, or on the line above it.
    const forward = [sectionLines[i + 1], sectionLines[i + 2]];
    const stopAt = forward.findIndex((x) => x && hasWord(SCHOOL_WORD, x));
    const near = (stopAt >= 0 ? forward.slice(0, stopAt) : forward).find((x) => isDate(x));
    const when = dated || subjectDates || (near ? readDates(near) : null) || (isDate(before) ? readDates(before!) : null);
    const year = (when?.end || when?.start || "").slice(0, 4);
    if (!degreeBefore) belowAt.forEach((at) => taken.add(at));
    if (rows.some((r) => r.school.toLowerCase() === school.toLowerCase() && r.degree === degree)) continue;
    rows.push({ id: `d${rows.length + 1}`, school: school.slice(0, 150), degree: degree.slice(0, 150), year });
  }
  return rows.slice(0, 8);
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
