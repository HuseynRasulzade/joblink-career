// The skill matrix takes its skills only from the platform's skill catalog (the one the admin panel keeps): the built-in
// skills and the ones the admin added. A name written in a file or typed in the box must be one of them, by its name or an alias.
import { SKILL_CATALOG, normalizeSkillKey } from "./skill-catalog.ts";

export type CatalogSkill = { id: string; label: string; category: string; aliases: string[] };
export type LevelCell = { level: number | null; target: number | null };

const all = (custom: CatalogSkill[]): CatalogSkill[] => [...SKILL_CATALOG.map((s) => ({ id: s.id, label: s.label, category: s.category, aliases: s.aliases })), ...custom];

export function resolveCatalogSkill(input: string, custom: CatalogSkill[] = []): CatalogSkill | null {
  const key = normalizeSkillKey(input);
  if (!key) return null;
  return all(custom).find((s) => normalizeSkillKey(s.label) === key || s.aliases.some((a) => normalizeSkillKey(a) === key)) || null;
}

// Typing "exc" offers Excel; names that start with the text come first, then names that contain it, then aliases and categories.
export function searchCatalog(query: string, custom: CatalogSkill[] = [], taken: string[] = [], limit = 12): CatalogSkill[] {
  const needle = normalizeSkillKey(query);
  if (needle.length < 2) return [];
  const skip = new Set(taken.map(normalizeSkillKey));
  const scored: { s: CatalogSkill; rank: number }[] = [];
  for (const s of all(custom)) {
    if (skip.has(normalizeSkillKey(s.label))) continue;
    const label = normalizeSkillKey(s.label);
    let rank = -1;
    if (label.startsWith(needle)) rank = 0;
    else if (label.includes(needle)) rank = 1;
    else if (s.aliases.some((a) => normalizeSkillKey(a).includes(needle))) rank = 2;
    else if (normalizeSkillKey(s.category).includes(needle)) rank = 3;
    if (rank >= 0) scored.push({ s, rank });
  }
  return scored.sort((a, b) => a.rank - b.rank || a.s.label.localeCompare(b.s.label, "az")).slice(0, limit).map((x) => x.s);
}

// A level from a file: a figure 0–4 or its word; empty means "leave as it is".
const WORDS: [RegExp, number][] = [[/^(yox|bilmir|0)$/, 0], [/^(baslangic|1)$/, 1], [/^(isleye bilir|orta|2)$/, 2], [/^(yaxsi|3)$/, 3], [/^(ekspert|usta|4)$/, 4]];
const plain = (v: string) => v.toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/[^a-z0-9]+/g, " ").trim();
export function parseLevel(value: string): number | null | "bad" {
  const text = plain(value);
  if (!text) return null;
  const hit = WORDS.find(([re]) => re.test(text));
  return hit ? hit[1] : "bad";
}
