// Birthdays and work anniversaries that fall in the next days, from the dates on the employee cards.
export type CelebrationKind = "birthday" | "anniversary";
export type Celebration = { employeeId: string; name: string; kind: CelebrationKind; date: string; days: number; years: number };

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const DAY = 86_400_000;

// The next day this month-day comes on or after `today`; 29 February falls on 28 February in years without it.
export function nextOccurrence(monthDay: string, today: string): string {
  const [m, d] = monthDay.split("-").map(Number);
  const year = Number(today.slice(0, 4));
  const make = (y: number) => {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const day = m === 2 && d === 29 && !leap ? 28 : d;
    return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  const thisYear = make(year);
  return thisYear >= today ? thisYear : make(year + 1);
}

export function upcomingCelebrations(
  people: { id: string; name: string; birthDate: string; startDate: string }[],
  today: string,
  withinDays = 30,
): Celebration[] {
  const out: Celebration[] = [];
  const at = Date.parse(`${today}T00:00:00Z`);
  for (const p of people) {
    for (const [kind, source] of [["birthday", p.birthDate], ["anniversary", p.startDate]] as const) {
      if (!isDate(source)) continue;
      const date = nextOccurrence(source.slice(5), today);
      const days = Math.round((Date.parse(`${date}T00:00:00Z`) - at) / DAY);
      if (days > withinDays) continue;
      const years = Number(date.slice(0, 4)) - Number(source.slice(0, 4));
      // An anniversary needs at least one full year; a start date in the future is no anniversary.
      if (kind === "anniversary" && years < 1) continue;
      out.push({ employeeId: p.id, name: p.name, kind, date, days, years: kind === "anniversary" ? years : 0 });
    }
  }
  return out.sort((a, b) => a.days - b.days || a.name.localeCompare(b.name, "az"));
}

// The wording of the greeting sent on the day.
export const greeting = (c: Pick<Celebration, "kind" | "years">) =>
  c.kind === "birthday"
    ? { title: "Ad gününüz mübarək!", body: "Komandanız sizi ad günü münasibətilə təbrik edir." }
    : { title: `${c.years} ildir bizimləsiniz`, body: `Bu gün şirkətdə ${c.years}-ci iliniz tamam olur. Əməyiniz üçün təşəkkür edirik!` };
