// Shifts: length of a shift (also one that crosses midnight) and the part of it worked at night (22:00–06:00, art. 166).
const minutes = (t: string) => {
  const m = t.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};
export const validTime = (t: string) => minutes(t) !== null;

export function shiftHours(start: string, end: string): { hours: number; night: number } {
  const a = minutes(start);
  let b = minutes(end);
  if (a === null || b === null) return { hours: 0, night: 0 };
  if (b <= a) b += 24 * 60;
  let night = 0;
  // Night is 22:00–24:00 and 00:00–06:00 of every day the shift touches.
  for (let day = 0; day < 2; day++) {
    const base = day * 24 * 60;
    for (const [from, to] of [[base, base + 6 * 60], [base + 22 * 60, base + 24 * 60]]) night += Math.max(0, Math.min(b, to) - Math.max(a, from));
  }
  const round = (n: number) => Math.round((n / 60) * 100) / 100;
  return { hours: round(b - a), night: round(night) };
}
