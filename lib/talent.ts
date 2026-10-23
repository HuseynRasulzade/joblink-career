// Talent pool: the company's own saved candidates with tags and a private note.
const clean = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

export const MAX_TAGS = 8;
export function sanitizeTags(input: unknown): string[] {
  const list = Array.isArray(input) ? input : typeof input === "string" ? input.split(",") : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const tag = clean(item, 30);
    const key = tag.toLocaleLowerCase("az");
    if (tag.length < 2 || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}
export const sanitizeNote = (input: unknown) => clean(input, 800);

export type TalentFilter = { q?: string; tag?: string };
const fold = (value: string) => value.toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g");
export function matchesTalent(entry: { name: string; title: string; skills: string[]; tags: string[]; note: string }, filter: TalentFilter) {
  const tag = (filter.tag || "").trim();
  if (tag && !entry.tags.some((t) => fold(t) === fold(tag))) return false;
  const q = fold((filter.q || "").trim());
  if (!q) return true;
  return fold([entry.name, entry.title, entry.note, ...entry.skills, ...entry.tags].join(" ")).includes(q);
}
