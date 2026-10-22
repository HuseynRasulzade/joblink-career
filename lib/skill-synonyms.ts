import { canonicalSkill, normalizeSkillKey } from "./skill-catalog.ts";

function termPresent(term: string, text: string): boolean {
  if (text.includes(term)) return true;
  const words = term.split(" ").filter((word) => word.length > 2);
  return words.length > 1 && words.every((word) => text.includes(word));
}

// Job and CV skills are resolved through the same catalog. This also keeps
// matching compatible with older records that still contain an alias.
export function skillMatches(skillLabel: string, candidateText: string): boolean {
  const normalizedText = normalizeSkillKey(candidateText);
  const normalizedSkill = normalizeSkillKey(skillLabel);
  if (!normalizedSkill) return false;
  if (termPresent(normalizedSkill, normalizedText)) return true;
  const definition = canonicalSkill(skillLabel);
  return Boolean(
    definition?.aliases.some((alias) =>
      termPresent(normalizeSkillKey(alias), normalizedText),
    ),
  );
}
