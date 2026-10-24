// The profile keeps languages as one text value, "Azərbaycan dili — ana dili; İngilis dili — B2".
// These helpers turn it into rows for the list editor and back without changing the stored format.
export type LanguageEntry = { name: string; level: string };

export const LANGUAGE_NAMES = [
  "Azərbaycan dili",
  "İngilis dili",
  "Rus dili",
  "Türk dili",
  "Fars dili",
  "Ərəb dili",
  "Alman dili",
  "Fransız dili",
  "İspan dili",
  "İtalyan dili",
  "Gürcü dili",
  "Ukrayna dili",
  "Çin dili",
  "Yapon dili",
  "Koreya dili",
  "Portuqal dili",
  "Hind dili",
  "Holland dili",
  "Polyak dili",
  "Fin dili",
];

export const NATIVE_LEVEL = "ana dili";
export const LANGUAGE_LEVELS = [
  NATIVE_LEVEL,
  "C2",
  "C1",
  "B2",
  "B1",
  "A2",
  "A1",
];

const SEPARATOR = /\s+[—–-]\s+|\s*:\s+|\s*\(/;

export function parseLanguages(value: string): LanguageEntry[] {
  const entries: LanguageEntry[] = [];
  for (const part of (value || "").split(/[;\n]+/)) {
    const raw = part.trim();
    if (!raw) continue;
    const at = raw.search(SEPARATOR);
    const name = (at === -1 ? raw : raw.slice(0, at)).trim();
    const level = (
      at === -1
        ? ""
        : raw
            .slice(at)
            .replace(/^\s*[—–:(-]\s*/, "")
            .replace(/\)\s*$/, "")
    ).trim();
    if (
      !name ||
      entries.some((item) => item.name.toLowerCase() === name.toLowerCase())
    )
      continue;
    entries.push({ name, level });
  }
  return entries;
}

export function serializeLanguages(entries: LanguageEntry[]) {
  return entries
    .filter((item) => item.name.trim())
    .map((item) =>
      item.level.trim()
        ? `${item.name.trim()} — ${item.level.trim()}`
        : item.name.trim(),
    )
    .join("; ");
}
