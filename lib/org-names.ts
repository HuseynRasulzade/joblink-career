// Department and section names of a company: one spelling per name, however it was typed.
export const orgKey = (name: string) =>
  String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("az");

export const cleanOrgName = (name: string) => String(name || "").trim().replace(/\s+/g, " ").slice(0, 120);

// The name as it is already kept (first spelling wins), or the cleaned new name.
export function canonicalOrgName(known: string[], name: string) {
  const cleaned = cleanOrgName(name);
  if (!cleaned) return { name: "", existing: false };
  const key = orgKey(cleaned);
  const found = known.find((item) => orgKey(item) === key);
  return found ? { name: found, existing: true } : { name: cleaned, existing: false };
}

export function uniqueOrgNames(names: string[]) {
  const seen = new Map<string, string>();
  for (const name of names) {
    const cleaned = cleanOrgName(name);
    if (cleaned && !seen.has(orgKey(cleaned))) seen.set(orgKey(cleaned), cleaned);
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b, "az"));
}
