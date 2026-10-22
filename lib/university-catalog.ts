import { normalizeSkillKey } from "./skill-catalog.ts";
import { UNIVERSITY_DATA } from "./university-catalog-data.ts";

// Shared list of universities and other higher-education institutions used by
// the candidate's education section. The list is generated from
// data/universities; a name that is not in it can still be typed freely.
export type University = {
  id: string;
  label: string;
  labelEn: string;
  labelRu: string;
  country: string;
  aliases: string[];
};

export const COUNTRIES: Record<string, { az: string; en: string; ru: string }> = {
  AZ: { az: "Azərbaycan", en: "Azerbaijan", ru: "Азербайджан" },
  TR: { az: "Türkiyə", en: "Türkiye", ru: "Турция" },
  RU: { az: "Rusiya", en: "Russia", ru: "Россия" },
  GE: { az: "Gürcüstan", en: "Georgia", ru: "Грузия" },
  UA: { az: "Ukrayna", en: "Ukraine", ru: "Украина" },
  BY: { az: "Belarus", en: "Belarus", ru: "Беларусь" },
  KZ: { az: "Qazaxıstan", en: "Kazakhstan", ru: "Казахстан" },
  UZ: { az: "Özbəkistan", en: "Uzbekistan", ru: "Узбекистан" },
  KG: { az: "Qırğızıstan", en: "Kyrgyzstan", ru: "Кыргызстан" },
  IR: { az: "İran", en: "Iran", ru: "Иран" },
  IL: { az: "İsrail", en: "Israel", ru: "Израиль" },
  AE: { az: "BƏƏ", en: "UAE", ru: "ОАЭ" },
  QA: { az: "Qətər", en: "Qatar", ru: "Катар" },
  SA: { az: "Səudiyyə Ərəbistanı", en: "Saudi Arabia", ru: "Саудовская Аравия" },
  EG: { az: "Misir", en: "Egypt", ru: "Египет" },
  GB: { az: "Birləşmiş Krallıq", en: "United Kingdom", ru: "Великобритания" },
  US: { az: "ABŞ", en: "United States", ru: "США" },
  CA: { az: "Kanada", en: "Canada", ru: "Канада" },
  AU: { az: "Avstraliya", en: "Australia", ru: "Австралия" },
  NZ: { az: "Yeni Zelandiya", en: "New Zealand", ru: "Новая Зеландия" },
  DE: { az: "Almaniya", en: "Germany", ru: "Германия" },
  FR: { az: "Fransa", en: "France", ru: "Франция" },
  CH: { az: "İsveçrə", en: "Switzerland", ru: "Швейцария" },
  AT: { az: "Avstriya", en: "Austria", ru: "Австрия" },
  NL: { az: "Niderland", en: "Netherlands", ru: "Нидерланды" },
  BE: { az: "Belçika", en: "Belgium", ru: "Бельгия" },
  IT: { az: "İtaliya", en: "Italy", ru: "Италия" },
  ES: { az: "İspaniya", en: "Spain", ru: "Испания" },
  PT: { az: "Portuqaliya", en: "Portugal", ru: "Португалия" },
  PL: { az: "Polşa", en: "Poland", ru: "Польша" },
  CZ: { az: "Çexiya", en: "Czechia", ru: "Чехия" },
  HU: { az: "Macarıstan", en: "Hungary", ru: "Венгрия" },
  RO: { az: "Rumıniya", en: "Romania", ru: "Румыния" },
  BG: { az: "Bolqarıstan", en: "Bulgaria", ru: "Болгария" },
  GR: { az: "Yunanıstan", en: "Greece", ru: "Греция" },
  DK: { az: "Danimarka", en: "Denmark", ru: "Дания" },
  SE: { az: "İsveç", en: "Sweden", ru: "Швеция" },
  FI: { az: "Finlandiya", en: "Finland", ru: "Финляндия" },
  NO: { az: "Norveç", en: "Norway", ru: "Норвегия" },
  IE: { az: "İrlandiya", en: "Ireland", ru: "Ирландия" },
  EE: { az: "Estoniya", en: "Estonia", ru: "Эстония" },
  LT: { az: "Litva", en: "Lithuania", ru: "Литва" },
  LV: { az: "Latviya", en: "Latvia", ru: "Латвия" },
  CN: { az: "Çin", en: "China", ru: "Китай" },
  JP: { az: "Yaponiya", en: "Japan", ru: "Япония" },
  KR: { az: "Cənubi Koreya", en: "South Korea", ru: "Южная Корея" },
  SG: { az: "Sinqapur", en: "Singapore", ru: "Сингапур" },
  HK: { az: "Honq Konq", en: "Hong Kong", ru: "Гонконг" },
  IN: { az: "Hindistan", en: "India", ru: "Индия" },
  MY: { az: "Malayziya", en: "Malaysia", ru: "Малайзия" },
  PK: { az: "Pakistan", en: "Pakistan", ru: "Пакистан" },
};

export const UNIVERSITIES: University[] = UNIVERSITY_DATA;

export const normalizeUniversityKey = (value: string) => normalizeSkillKey(value).replace(/ə/g, "e");

const keyCache = new WeakMap<University, string[]>();
const aliasKeys = (u: University) => {
  let keys = keyCache.get(u);
  if (!keys) {
    keys = u.aliases.map(normalizeUniversityKey).filter(Boolean);
    keyCache.set(u, keys);
  }
  return keys;
};

let index: Map<string, University> | null = null;
function indexed() {
  if (!index) {
    index = new Map();
    for (const u of UNIVERSITIES) {
      for (const k of aliasKeys(u)) if (!index.has(k)) index.set(k, u);
      index.set(u.id, u);
    }
  }
  return index;
}

// The catalog entry a typed or stored name refers to, in any language.
export function canonicalUniversity(value: string) {
  const key = normalizeUniversityKey(value);
  return key ? indexed().get(value) || indexed().get(key) || null : null;
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

// Exact name or abbreviation, prefix, word prefix, substring, then
// typo-tolerant (1-2 letters). Azerbaijani institutions come first on ties.
export function searchUniversities(query: string, limit = 8) {
  const needle = normalizeUniversityKey(query);
  if (needle.length < 2) return [] as University[];
  const tolerance = needle.length >= 8 ? 2 : needle.length >= 5 ? 1 : 0;
  return UNIVERSITIES.map((u) => {
    const keys = aliasKeys(u);
    let rank = 9;
    if (keys.includes(needle)) rank = 0;
    else if (keys.some((k) => k.startsWith(needle))) rank = 1;
    else if (keys.some((k) => k.split(" ").some((w) => w.startsWith(needle)))) rank = 2;
    else if (needle.length >= 3 && keys.some((k) => k.includes(needle))) rank = 3;
    else if (tolerance) {
      const best = Math.min(...keys.map((k) => distance(k, needle)));
      if (best <= tolerance) rank = 4 + best;
    }
    return { u, rank };
  })
    .filter((x) => x.rank < 9)
    .sort((a, b) => a.rank - b.rank || Number(b.u.country === "AZ") - Number(a.u.country === "AZ") || a.u.label.length - b.u.label.length)
    .slice(0, limit)
    .map((x) => x.u);
}

export function universityLabel(u: University, language: "az" | "en" | "ru") {
  return language === "en" ? u.labelEn : language === "ru" ? u.labelRu : u.label;
}
