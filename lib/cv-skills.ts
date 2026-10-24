import { SKILL_CATALOG, normalizeSkillKey } from "./skill-catalog.ts";

// Skills a CV shows in what the person did, found by name in the catalog.
// A skills section is never complete, and an AI reading the CV drops names it
// is unsure of, so this reads the duties again for every catalog skill.
const ASPIRATION =
  /(oyren|kurs|istey|maraql|planlas|hedef|arzu|oxumusam|oxuyuram|niyyet|want|wish|learn|course|interested|plan to|aspir|goal|hope)/;

export function skillsInText(text: string, max = 50): string[] {
  const sentences = text
    .split(/[\n.;!?•]+/)
    .filter(
      (sentence) =>
        sentence.trim() &&
        !ASPIRATION.test(normalizeSkillKey(sentence).replace(/ə/g, "e")),
    );
  if (!sentences.length) return [];
  const original = sentences.join(" . ");
  const key = ` ${normalizeSkillKey(original)} `;
  const found: string[] = [];
  for (const skill of SKILL_CATALOG) {
    const terms = [skill.label, ...skill.aliases];
    const hit = terms.some((term) => {
      const normalized = normalizeSkillKey(term);
      if (!normalized) return false;
      // Acronyms of up to three letters (AI, ML, SAP) must be written in capitals.
      if (normalized.length <= 3)
        return (
          new RegExp(
            `(^|[^\\p{L}\\p{N}])${term.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}([^\\p{L}\\p{N}]|$)`,
            "u",
          ).test(original) && term === term.toUpperCase()
        );
      // Longer names match whole words, or words that start with the name
      // ("büdcələşdirmənin"), so a suffix does not hide a skill.
      return normalized.length >= 6
        ? key.includes(` ${normalized}`)
        : key.includes(` ${normalized} `);
    });
    if (hit) found.push(skill.label);
    if (found.length >= max) break;
  }
  return found;
}
