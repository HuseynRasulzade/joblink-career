import { normalizeSkillKey } from "./skill-catalog.ts";
import { MAJOR_DATA } from "./major-catalog-data.ts";

// Shared list of study programmes ("ixtisas") for the education section.
// Generated from data/majors; a programme that is not in it can be typed freely.
export type Major = {
  id: string;
  label: string;
  labelEn: string;
  labelRu: string;
  field: string;
  aliases: string[];
};

export const MAJOR_FIELDS: Record<string, { az: string; en: string; ru: string }> = {
  business: { az: "İqtisadiyyat, biznes və idarəetmə", en: "Economics, business and management", ru: "Экономика, бизнес и управление" },
  law: { az: "Hüquq", en: "Law", ru: "Право" },
  social: { az: "Sosial elmlər, jurnalistika və beynəlxalq münasibətlər", en: "Social sciences, journalism and international relations", ru: "Социальные науки, журналистика и международные отношения" },
  ict: { az: "İnformasiya-kommunikasiya texnologiyaları", en: "Information and communication technologies", ru: "Информационно-коммуникационные технологии" },
  engineering: { az: "Mühəndislik, istehsal və tikinti", en: "Engineering, manufacturing and construction", ru: "Инженерия, производство и строительство" },
  science: { az: "Təbiət elmləri və riyaziyyat", en: "Natural sciences and mathematics", ru: "Естественные науки и математика" },
  education: { az: "Təhsil və pedaqogika", en: "Education and pedagogy", ru: "Образование и педагогика" },
  health: { az: "Səhiyyə", en: "Health", ru: "Здравоохранение" },
  arts: { az: "İncəsənət və dizayn", en: "Arts and design", ru: "Искусство и дизайн" },
  humanities: { az: "Humanitar elmlər və filologiya", en: "Humanities and philology", ru: "Гуманитарные науки и филология" },
  agri: { az: "Kənd təsərrüfatı, meşə və baytarlıq", en: "Agriculture, forestry and veterinary", ru: "Сельское хозяйство, лесное дело и ветеринария" },
  services: { az: "Xidmət sahələri, nəqliyyat və təhlükəsizlik", en: "Services, transport and security", ru: "Сфера услуг, транспорт и безопасность" },
};

export type DegreeLevel = { id: string; label: string; labelEn: string; labelRu: string; aliases: string[] };
export const DEGREE_LEVELS: DegreeLevel[] = [
  { id: "college", label: "Orta ixtisas təhsili (kollec)", labelEn: "Vocational / college diploma", labelRu: "Среднее специальное образование (колледж)", aliases: ["kollec", "texnikum", "orta ixtisas", "college diploma", "associate degree"] },
  { id: "bachelor", label: "Bakalavr", labelEn: "Bachelor's degree", labelRu: "Бакалавр", aliases: ["bakalavriat", "bachelor", "bachelors", "bsc", "ba", "bs", "бакалавриат"] },
  { id: "specialist", label: "İxtisaslı mütəxəssis (spesialist)", labelEn: "Specialist degree", labelRu: "Специалитет", aliases: ["spesialist", "specialist", "специалист"] },
  { id: "master", label: "Magistr", labelEn: "Master's degree", labelRu: "Магистр", aliases: ["magistratura", "master", "masters", "msc", "ma", "mba", "магистратура"] },
  { id: "residency", label: "Rezidentura", labelEn: "Medical residency", labelRu: "Ординатура", aliases: ["residency", "резидентура"] },
  { id: "doctoral", label: "Doktorantura (PhD)", labelEn: "Doctorate (PhD)", labelRu: "Докторантура (PhD)", aliases: ["phd", "doktorantura", "fəlsəfə doktoru", "doctorate", "aspirantura", "аспирантура"] },
  { id: "certificate", label: "Sertifikat proqramı", labelEn: "Certificate programme", labelRu: "Сертификатная программа", aliases: ["sertifikat", "certificate", "kurs", "course"] },
];

export const normalizeMajorKey = (value: string) => normalizeSkillKey(value).replace(/ə/g, "e");

export const MAJORS: Major[] = MAJOR_DATA;

// Programmes added by the administrator (from candidates' requests), loaded at runtime.
let customRegistry: Major[] = [];
export function setCustomMajors(list: Major[]) {
  customRegistry = Array.isArray(list) ? list : [];
}
export const customMajors = () => customRegistry;

const keyCache = new WeakMap<Major, string[]>();
const aliasKeys = (m: Major) => {
  let keys = keyCache.get(m);
  if (!keys) {
    keys = m.aliases.map(normalizeMajorKey).filter(Boolean);
    keyCache.set(m, keys);
  }
  return keys;
};
let index: Map<string, Major> | null = null;
function indexed() {
  if (!index) {
    index = new Map();
    for (const m of MAJORS) {
      for (const k of aliasKeys(m)) if (!index.has(k)) index.set(k, m);
      index.set(m.id, m);
    }
  }
  return index;
}

export function canonicalMajor(value: string) {
  const key = normalizeMajorKey(value);
  if (!key) return null;
  return indexed().get(value) || indexed().get(key) || customRegistry.find((m) => m.id === value || aliasKeys(m).includes(key)) || null;
}

function distance(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 3) return 9;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

// Exact, prefix, word prefix, substring, then typo-tolerant (1-2 letters).
export function searchMajors(query: string, limit = 8) {
  const needle = normalizeMajorKey(query);
  if (needle.length < 2) return [] as Major[];
  const tolerance = needle.length >= 8 ? 2 : needle.length >= 5 ? 1 : 0;
  return [...customRegistry, ...MAJORS].map((m) => {
    const keys = aliasKeys(m);
    let rank = 9;
    if (keys.includes(needle)) rank = 0;
    else if (keys.some((k) => k.startsWith(needle))) rank = 1;
    else if (keys.some((k) => k.split(" ").some((w) => w.startsWith(needle)))) rank = 2;
    else if (needle.length >= 3 && keys.some((k) => k.includes(needle))) rank = 3;
    else if (tolerance) {
      // A slip in the first letters of a longer name counts too ("sabancy univers").
      const best = Math.min(...keys.map((k) => Math.min(distance(k, needle), distance(k.slice(0, needle.length), needle))));
      if (best <= tolerance) rank = 4 + best;
    }
    return { m, rank };
  })
    .filter((x) => x.rank < 9)
    .sort((a, b) => a.rank - b.rank || a.m.label.length - b.m.label.length)
    .slice(0, limit)
    .map((x) => x.m);
}

export function majorLabel(m: Major, language: "az" | "en" | "ru") {
  return language === "en" ? m.labelEn : language === "ru" ? m.labelRu : m.label;
}
export function degreeLevelLabel(level: DegreeLevel, language: "az" | "en" | "ru") {
  return language === "en" ? level.labelEn : language === "ru" ? level.labelRu : level.label;
}

export function degreeLevelOf(text: string) {
  const key = normalizeMajorKey(text);
  if (!key) return null;
  return (
    DEGREE_LEVELS.find((l) => [l.label, l.labelEn, l.labelRu, ...l.aliases].some((a) => normalizeMajorKey(a) === key)) || null
  );
}

// The profile keeps one "degree" string. It is written as "programme · level"
// (the same separator the CV reader uses), so it stays readable everywhere.
const SEPARATOR = " · ";
export function parseDegree(degree: string): { major: string; level: DegreeLevel | null } {
  const parts = degree.split(/\s*·\s*/).map((p) => p.trim()).filter(Boolean);
  let level: DegreeLevel | null = null;
  const rest: string[] = [];
  for (const part of parts) {
    const found: DegreeLevel | null = level ? null : degreeLevelOf(part);
    if (found) level = found;
    else rest.push(part);
  }
  return { major: rest.join(SEPARATOR), level };
}
export function composeDegree(major: string, level: DegreeLevel | null, language: "az" | "en" | "ru" = "az") {
  return [major.trim(), level ? degreeLevelLabel(level, language) : ""].filter(Boolean).join(SEPARATOR);
}
