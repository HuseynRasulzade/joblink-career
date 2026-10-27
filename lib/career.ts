// Career evidence used when a CV is matched with a vacancy: the field of work,
// how old the experience is, and how the result is shown (a band, not a number).
export const FIELD_LABELS: Record<string, string> = {
  finance: "maliyyə və mühasibat",
  hr: "insan resursları",
  sales: "satış",
  supply: "təchizat və logistika",
  engineering: "mühəndislik",
  it: "İT",
  marketing: "marketinq",
  legal: "hüquq",
  education: "təhsil",
  hospitality: "qonaqpərvərlik və xidmət",
  health: "səhiyyə",
  security: "təhlükəsizlik",
  admin: "inzibati iş",
  oilgas: "neft və qaz",
  agriculture: "kənd təsərrüfatı",
  trades: "sənət və quraşdırma",
  transport: "nəqliyyat",
  science: "elm və tədqiqat",
  social: "sosial iş",
  personal: "şəxsi xidmət",
  public: "dövlət xidməti",
};

// How much each part counts in a field (skills + role + experience = 100), and how
// many points a preferred certification can add. Regulated fields value credentials
// more; sales and marketing value what the person has already achieved.
export type FieldProfile = { skills: number; role: number; experience: number; certBonus: number };
const DEFAULT_PROFILE: FieldProfile = { skills: 50, role: 25, experience: 25, certBonus: 5 };
export const FIELD_PROFILES: Record<string, FieldProfile> = {
  finance: { skills: 45, role: 25, experience: 30, certBonus: 10 },
  legal: { skills: 40, role: 25, experience: 35, certBonus: 10 },
  health: { skills: 40, role: 30, experience: 30, certBonus: 10 },
  supply: { skills: 45, role: 25, experience: 30, certBonus: 7 },
  engineering: { skills: 45, role: 25, experience: 30, certBonus: 7 },
  it: { skills: 55, role: 20, experience: 25, certBonus: 6 },
  sales: { skills: 35, role: 20, experience: 45, certBonus: 3 },
  marketing: { skills: 45, role: 20, experience: 35, certBonus: 3 },
  hr: { skills: 45, role: 25, experience: 30, certBonus: 5 },
};
export const fieldProfile = (field: string | undefined): FieldProfile =>
  (field && FIELD_PROFILES[field]) || DEFAULT_PROFILE;

// Work from the last seven years counts fully, older work counts less: a month of
// experience 8-12 years back counts 0.75, older than that 0.5. Nothing is dropped.
export const recencyWeight = (ageMonths: number) => (ageMonths <= 84 ? 1 : ageMonths <= 144 ? 0.75 : 0.5);

const monthIndex = (value: string, end: boolean) => {
  const m = /^(\d{4})(?:-(\d{2}))?/.exec(value || "");
  if (!m) return null;
  const month = m[2] ? Number(m[2]) - 1 : end ? 11 : 0;
  return Number(m[1]) * 12 + Math.max(0, Math.min(11, month));
};
export type Span = { start: string; end: string; current: boolean };
// Years of work in the given spans; a month covered twice is counted once.
export function weightedYears(spans: Span[], now = new Date()) {
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  const months = new Set<number>();
  for (const span of spans) {
    const from = monthIndex(span.start, false);
    const to = span.current ? nowIndex : monthIndex(span.end || span.start, true);
    if (from === null || to === null) continue;
    for (let m = from; m <= Math.min(to, nowIndex); m++) months.add(m);
  }
  let total = 0;
  for (const m of months) total += recencyWeight(nowIndex - m);
  return Math.round((total / 12) * 10) / 10;
}

export type FitBand = "strong" | "good" | "partial" | "weak";
export const BAND_LABELS: Record<FitBand, string> = {
  strong: "Güclü uyğunluq",
  good: "Yaxşı uyğunluq",
  partial: "Qismən uyğunluq",
  weak: "Zəif uyğunluq",
};
export const bandFor = (score: number): FitBand => (score >= 80 ? "strong" : score >= 60 ? "good" : score >= 40 ? "partial" : "weak");

export type PartLevel = "strong" | "good" | "partial" | "weak" | "none";
export type FitPart = { key: "work" | "field" | "skills" | "certs" | "experience"; label: string; level: PartLevel; note: string };
export const partLevel = (ratio: number): PartLevel => (ratio >= 0.8 ? "strong" : ratio >= 0.55 ? "good" : ratio >= 0.3 ? "partial" : "weak");
