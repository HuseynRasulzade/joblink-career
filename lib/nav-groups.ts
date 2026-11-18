// The HR menu is long: its items are put under a few headings that open and close. Items that belong to no heading stay loose.
export type NavGroupDef = { id: string; label: string; ids: string[] };
export const HR_NAV_GROUPS: NavGroupDef[] = [
  { id: "hire", label: "Vakansiya və namizəd", ids: ["hr-jobs", "hr-candidates", "hr-ai", "hr-talent"] },
  { id: "assess", label: "Qiymətləndirmə", ids: ["hr-interviews", "hr-tests", "hr-ats"] },
  { id: "people", label: "İşçilər və əmrlər", ids: ["hr-employees", "hr-orders", "hr-people-ops", "hr-growth", "hr-attendance"] },
  { id: "money", label: "Plan və əmək haqqı", ids: ["hr-payroll", "hr-planfact", "hr-proposals", "hr-branches"] },
  { id: "company", label: "Şirkət", ids: ["hr-team", "hr-company", "hr-packages", "hr-billing", "hr-group"] },
];

export type NavEntry<T> = { group: NavGroupDef | null; items: T[] };
// Loose items before the first heading (the overview), then each heading with its items, then the rest (calculators, messages, guide, support).
export function groupNav<T extends { id: string }>(items: T[], groups: NavGroupDef[] = HR_NAV_GROUPS): NavEntry<T>[] {
  const owner = new Map(groups.flatMap((g) => g.ids.map((id) => [id, g.id] as const)));
  const firstGrouped = items.findIndex((i) => owner.has(i.id));
  const out: NavEntry<T>[] = [];
  const head = items.slice(0, firstGrouped < 0 ? items.length : firstGrouped).filter((i) => !owner.has(i.id));
  if (head.length) out.push({ group: null, items: head });
  for (const g of groups) {
    const mine = items.filter((i) => owner.get(i.id) === g.id);
    if (mine.length) out.push({ group: g, items: mine });
  }
  const rest = items.filter((i) => !owner.has(i.id) && items.indexOf(i) >= (firstGrouped < 0 ? items.length : firstGrouped));
  if (rest.length) out.push({ group: null, items: rest });
  return out;
}
