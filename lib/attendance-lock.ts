// A month of the attendance sheet can be locked (by hand, or when its payroll is approved): later changes by hand are refused.
export function monthsInRange(from: string, to: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) return [];
  const out: string[] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const endY = Number(to.slice(0, 4));
  const endM = Number(to.slice(5, 7));
  while ((y < endY || (y === endY && m <= endM)) && out.length < 40) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}
export const MONTH_NAMES = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avqust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
export const monthLabel = (month: string) => `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
// The message when the range touches a locked month, otherwise "".
export function lockedProblem(locked: Iterable<string>, from: string, to: string): string {
  const set = new Set(locked);
  const hit = monthsInRange(from, to).filter((m) => set.has(m));
  return hit.length ? `Davamiyyət cədvəli kilidlidir: ${hit.map(monthLabel).join(", ")}. Dəyişiklik üçün əvvəl direktor və ya hesab sahibi kilidi açmalıdır.` : "";
}
