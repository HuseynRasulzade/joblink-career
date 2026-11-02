// Arrival and departure times: hours worked, night hours (22:00–06:00, art. 94 of the Labour Code), lateness and early leave.
export type ClockRules = { start: string; end: string; breakMinutes: number; graceMinutes: number };
export const DEFAULT_CLOCK: ClockRules = { start: "09:00", end: "18:00", breakMinutes: 60, graceMinutes: 10 };

export const minutesOf = (time: string): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((time || "").trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h > 23 || min > 59 ? null : h * 60 + min;
};
export const validTime = (time: string) => minutesOf(time) !== null;
const r2 = (n: number) => Math.round(n * 100) / 100;

// Minutes of [from, to) that fall inside 22:00–06:00; `to` may pass midnight (to > 1440).
function nightMinutes(from: number, to: number) {
  let total = 0;
  for (let day = 0; day < 3; day++) {
    const a = Math.max(from, day * 1440 - 120);
    const b = Math.min(to, day * 1440 + 360);
    if (b > a) total += b - a;
  }
  return total;
}

export function hoursFromClock(clockIn: string, clockOut: string, breakMinutes = 60): { hours: number; night: number } | null {
  const a = minutesOf(clockIn);
  let b = minutesOf(clockOut);
  if (a === null || b === null) return null;
  if (b < a) b += 1440; // the shift passes midnight
  const span = b - a;
  const rest = span > 240 ? Math.max(0, breakMinutes) : 0;
  const night = Math.min(nightMinutes(a, b), span - rest);
  return { hours: r2(Math.max(0, span - rest) / 60), night: r2(Math.max(0, night) / 60) };
}

export const lateMinutes = (clockIn: string, rules: ClockRules) => {
  const a = minutesOf(clockIn);
  const s = minutesOf(rules.start);
  if (a === null || s === null) return 0;
  const late = a - s;
  return late > rules.graceMinutes ? late : 0;
};
export const earlyLeaveMinutes = (clockOut: string, rules: ClockRules) => {
  const b = minutesOf(clockOut);
  const e = minutesOf(rules.end);
  const a = minutesOf(rules.start);
  if (b === null || e === null || a === null || b <= a) return 0; // an overnight shift is not judged by the day rules
  return e - b > rules.graceMinutes ? e - b : 0;
};

// Baku time (UTC+4, no summer time).
export const bakuNow = (now = new Date()) => {
  const t = new Date(now.getTime() + 4 * 3600_000);
  return { date: t.toISOString().slice(0, 10), time: t.toISOString().slice(11, 16) };
};
