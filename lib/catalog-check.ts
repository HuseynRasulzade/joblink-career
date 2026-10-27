// Catalog upkeep for the admin: bulk import of job titles and education items,
// a check for missing or doubtful translations, and finding duplicates that can
// be merged (the removed entry's names become aliases of the one kept, so
// anything that used the old name still resolves).
export type ImportIssue = { line: number; label: string; reason: string };
const clean = (value: string, max: number) => value.replace(/\s+/g, " ").trim().slice(0, max);
const lines = (input: string) => input.replace(/^﻿/, "").split(/\r?\n/);
const aliasList = (text: string) =>
  text.split("|").map((a) => clean(a, 120)).filter(Boolean).slice(0, 15);

// "Ad;Name;Qrup;sinonim1|sinonim2" (the group is a key or its Azerbaijani/English name).
export type TitleImportRow = { line: number; label: string; labelEn: string; family: string; aliases: string[] };
export function parseTitleCsv(
  input: string,
  families: Record<string, { az: string; en: string }>,
  limit = 300,
): { rows: TitleImportRow[]; issues: ImportIssue[] } {
  const rows: TitleImportRow[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();
  const familyOf = (value: string) => {
    const v = value.toLocaleLowerCase("az");
    return Object.entries(families).find(([key, f]) => key === v || f.az.toLocaleLowerCase("az") === v || f.en.toLocaleLowerCase("en") === v)?.[0] || "";
  };
  lines(input).forEach((raw, index) => {
    if (!raw.trim() || rows.length >= limit) return;
    const cells = raw.split(";");
    if (index === 0 && /^(ad|az|label|vəzifə|title)/i.test(cells[0].trim()) && /^(name|en|label)/i.test((cells[1] || "").trim())) return;
    const [label, labelEn, group, aliasText = ""] = cells.map((c, i) => clean(c, i === 3 ? 800 : 120));
    const line = index + 1;
    if (!label || !labelEn) return void issues.push({ line, label: label || "—", reason: "Ad hər iki dildə yazılmalıdır" });
    const family = familyOf(group || "");
    if (!family) return void issues.push({ line, label, reason: "Peşə qrupu tanınmadı" });
    const key = label.toLocaleLowerCase("az");
    if (seen.has(key)) return void issues.push({ line, label, reason: "Faylda təkrar sətir" });
    seen.add(key);
    rows.push({ line, label, labelEn, family, aliases: aliasList(aliasText) });
  });
  return { rows, issues };
}

// "Növ;Ad;Name;Название;Ölkə/Sahə;sinonim1|sinonim2" (kind: universitet/university or ixtisas/major).
export type EducationImportRow = { line: number; kind: "university" | "major"; label: string; labelEn: string; labelRu: string; extra: string; aliases: string[] };
export function parseEducationCsv(
  input: string,
  groups: { university: Record<string, { az: string; en: string; ru: string }>; major: Record<string, { az: string; en: string; ru: string }> },
  limit = 300,
): { rows: EducationImportRow[]; issues: ImportIssue[] } {
  const rows: EducationImportRow[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();
  lines(input).forEach((raw, index) => {
    if (!raw.trim() || rows.length >= limit) return;
    const cells = raw.split(";");
    if (index === 0 && /^(növ|kind|type)/i.test(cells[0].trim())) return;
    const [kindText, label, labelEn, labelRu, extraText, aliasText = ""] = cells.map((c, i) => clean(c, i === 5 ? 800 : 160));
    const line = index + 1;
    const kind = /^(univers|institut)/i.test(kindText) ? "university" : /^(ixtisas|major|specialty)/i.test(kindText) ? "major" : "";
    if (!kind) return void issues.push({ line, label: label || "—", reason: "Növ “universitet” və ya “ixtisas” olmalıdır" });
    if (label.length < 2) return void issues.push({ line, label: label || "—", reason: "Azərbaycanca ad yazılmayıb" });
    const options = groups[kind];
    const v = extraText.toLocaleLowerCase("az");
    const extra = Object.entries(options).find(([key, g]) => key.toLocaleLowerCase("az") === v || g.az.toLocaleLowerCase("az") === v || g.en.toLocaleLowerCase("en") === v)?.[0] || "";
    if (!extra) return void issues.push({ line, label, reason: kind === "university" ? "Ölkə tanınmadı" : "Sahə tanınmadı" });
    const key = `${kind}:${label.toLocaleLowerCase("az")}`;
    if (seen.has(key)) return void issues.push({ line, label, reason: "Faylda təkrar sətir" });
    seen.add(key);
    rows.push({ line, kind, label, labelEn: labelEn || label, labelRu: labelRu || label, extra, aliases: aliasList(aliasText) });
  });
  return { rows, issues };
}

export type CatalogEntry = {
  kind: "skill" | "job-title" | "certification" | "university" | "major";
  id: string;
  label: string;
  labelEn?: string;
  labelRu?: string;
  aliases: string[];
};
export type TranslationIssue = { kind: CatalogEntry["kind"]; id: string; label: string; problem: string };

const AZ_LETTERS = /[əıöüçşğƏİÖÜÇŞĞ]/;
const sameText = (a: string, b: string) => a.trim().toLocaleLowerCase("az") === b.trim().toLocaleLowerCase("az");
// Entries whose English (or Russian) name is missing, copied from the Azerbaijani one,
// or written with Azerbaijani letters.
export function translationIssues(entries: CatalogEntry[]): TranslationIssue[] {
  const out: TranslationIssue[] = [];
  for (const e of entries) {
    if (e.kind === "certification") continue; // a certification has one international name
    const add = (problem: string) => out.push({ kind: e.kind, id: e.id, label: e.label, problem });
    if (!e.labelEn?.trim()) add("İngilis adı yoxdur");
    else if (sameText(e.labelEn, e.label)) add("İngilis adı Azərbaycan adı ilə eynidir");
    else if (AZ_LETTERS.test(e.labelEn)) add("İngilis adında Azərbaycan hərfləri var");
    if (e.kind === "university" || e.kind === "major") {
      if (!e.labelRu?.trim()) add("Rus adı yoxdur");
      else if (sameText(e.labelRu, e.label)) add("Rus adı Azərbaycan adı ilə eynidir");
    }
  }
  return out;
}

// A name written in any language, ignoring case, accents and punctuation.
export const nameKey = (value: string) =>
  value
    .toLocaleLowerCase("az")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[əƏ]/g, "e")
    .replace(/ı/g, "i")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

export type DuplicateGroup = { kind: CatalogEntry["kind"]; ids: string[]; labels: string[]; reason: string };
// Entries of one kind that share a name or an alias (checked after normalizing).
export function duplicateGroups(entries: CatalogEntry[]): DuplicateGroup[] {
  const groups: DuplicateGroup[] = [];
  const kinds = [...new Set(entries.map((e) => e.kind))];
  for (const kind of kinds) {
    const list = entries.filter((e) => e.kind === kind);
    const keysOf = (e: CatalogEntry) => new Set([e.label, e.labelEn || "", e.labelRu || "", ...e.aliases].map(nameKey).filter((k) => k.length >= 2));
    const parent = list.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const owner = new Map<string, number>();
    list.forEach((e, i) => {
      for (const key of keysOf(e)) {
        const other = owner.get(key);
        if (other === undefined) owner.set(key, i);
        else parent[find(i)] = find(other);
      }
    });
    const buckets = new Map<number, number[]>();
    list.forEach((_, i) => buckets.set(find(i), [...(buckets.get(find(i)) || []), i]));
    for (const members of buckets.values()) {
      if (members.length < 2) continue;
      groups.push({
        kind,
        ids: members.map((i) => list[i].id),
        labels: members.map((i) => list[i].label),
        reason: "Ad və ya sinonim üst-üstə düşür",
      });
    }
  }
  return groups;
}

// The entry that stays keeps its own names and gains the other's names as aliases.
export function mergedAliases(keep: CatalogEntry, drop: CatalogEntry, max = 30) {
  const own = new Set([keep.label, keep.labelEn || "", keep.labelRu || ""].map(nameKey));
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of [...keep.aliases, drop.label, drop.labelEn || "", drop.labelRu || "", ...drop.aliases]) {
    const key = nameKey(name);
    if (!name.trim() || !key || own.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(name.trim());
  }
  return out.slice(0, max);
}
