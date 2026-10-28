// A job title typed by a company is matched to the shared catalog before a new name is made, so the same
// profession is not kept under many spellings: the exact title, a spelling with one or two typos, or the
// same words in another order all resolve to the catalog title.
import { canonicalJobTitle, normalizeJobTitleKey, searchJobTitles, type JobTitleDefinition } from "./job-title-catalog.ts";

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
const sortedWords = (key: string) => key.split(" ").filter(Boolean).sort().join(" ");

export type CatalogMatch = { title: JobTitleDefinition; how: "exact" | "close" };

export function bestCatalogMatch(label: string, extra?: JobTitleDefinition[]): CatalogMatch | null {
  const exact = extra ? canonicalJobTitle(label, extra) : canonicalJobTitle(label);
  if (exact) return { title: exact, how: "exact" };
  const key = normalizeJobTitleKey(label);
  if (key.length < 4) return null;
  const tolerance = key.length >= 8 ? 2 : 1;
  // The whole text, then each word on its own, so another word order still finds the title.
  const seen = new Map<string, JobTitleDefinition>();
  for (const query of [label, ...key.split(" ").filter((w) => w.length >= 3)])
    for (const title of extra ? searchJobTitles(query, 12, extra) : searchJobTitles(query, 12)) seen.set(title.id, title);
  const candidates = [...seen.values()];
  for (const title of candidates) {
    const keys = [title.label, title.labelEn, ...title.aliases].map(normalizeJobTitleKey).filter(Boolean);
    if (keys.some((k) => distance(k, key) <= tolerance || sortedWords(k) === sortedWords(key))) return { title, how: "close" };
  }
  return null;
}
