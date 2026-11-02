// Checks of a shift schedule: a shift on a day the employee is away, too short a rest between two shifts and too many
// days in a row. They are warnings for the planner; the limits are settings of the company.
export type ShiftTimes = { start: string; end: string };
export type ShiftWarning = { employeeId: string; day: string; kind: "away" | "rest" | "streak"; text: string };

const minutes = (t: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : 0;
};
const addDay = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

export const AWAY_LABEL: Record<string, string> = { annual: "məzuniyyət", addleave: "əlavə məzuniyyət", creative: "yaradıcılıq məzuniyyəti", unpaid: "ödənişsiz məzuniyyət", study: "təhsil məzuniyyəti", maternity: "analıq", childcare: "uşağa qulluq", paternity: "atalıq", sick: "xəstəlik", injury: "iş zədəsi", trip: "ezamiyyət", medical: "tibbi müayinə", donor: "donor günü", military: "hərbi toplanış", summons: "çağırış" };

export function checkShifts(input: {
  assignments: Map<string, Map<string, ShiftTimes>>; // employee -> day -> shift
  away: Map<string, Map<string, string>>; // employee -> day -> attendance code
  names: Map<string, string>;
  minRestHours: number;
  maxConsecutive: number;
}): ShiftWarning[] {
  const out: ShiftWarning[] = [];
  const dmy = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;
  for (const [employeeId, days] of input.assignments) {
    const name = input.names.get(employeeId) || "İşçi";
    const sorted = [...days.keys()].sort();
    let streak = 0;
    let previous = "";
    for (const day of sorted) {
      const code = input.away.get(employeeId)?.get(day);
      if (code) out.push({ employeeId, day, kind: "away", text: `${name}: ${dmy(day)} tarixində ${AWAY_LABEL[code] || "yoxluq"} qeydi var, növbə təyin olunub.` });
      streak = previous && addDay(previous, 1) === day ? streak + 1 : 1;
      if (streak === input.maxConsecutive + 1) out.push({ employeeId, day, kind: "streak", text: `${name}: ${dmy(day)} tarixində ardıcıl ${streak}-ci iş günüdür (həftədə fasiləsiz istirahət lazımdır, bir gün istirahət verin).` });
      if (previous && addDay(previous, 1) === day) {
        const before = days.get(previous)!;
        const startPrev = minutes(before.start);
        let endPrev = minutes(before.end);
        if (endPrev <= startPrev) endPrev += 1440; // the shift ends after midnight
        const rest = (1440 + minutes(days.get(day)!.start) - endPrev) / 60;
        if (rest < input.minRestHours) out.push({ employeeId, day, kind: "rest", text: `${name}: ${dmy(previous)} və ${dmy(day)} növbələri arasında yalnız ${Math.round(rest * 10) / 10} saat fasilə var (ən azı ${input.minRestHours} saat).` });
      }
      previous = day;
    }
  }
  return out;
}

// A repeating pattern (for example 2 days on, 2 off) laid over a stretch: the days that carry a shift.
export function patternDays(from: string, to: string, work: number, rest: number, offset = 0): string[] {
  const w = Math.max(1, Math.round(work));
  const r = Math.max(0, Math.round(rest));
  const out: string[] = [];
  for (let day = from, i = 0; day <= to; day = addDay(day, 1), i++) if (((i + Math.max(0, offset)) % (w + r)) < w) out.push(day);
  return out;
}
