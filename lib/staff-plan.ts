// The staff table as one source of truth: every working person sits in exactly one row, so the rows,
// the department totals and the "places left" always agree. Also the pay band of a row and the rule that
// nobody is paid above or below it.
export const RATES = [1, 0.75, 0.5, 0.25] as const;
export const RATE_LABEL: Record<number, string> = { 1: "Tam ştat", 0.75: "3/4 ştat", 0.5: "Yarım ştat", 0.25: "1/4 ştat" };

export type PlanUnit = {
  id: string;
  branch?: string; // the branch the row belongs to (empty = the company itself)
  department: string;
  section: string;
  position: string;
  planned: number;
  rate: number; // share of a full place: 1, 0.75, 0.5 or 0.25
  salaryMin: number; // gross AZN a month; 0 = no band
  salaryMax: number; // 0 = same as the minimum
};
export type PlanPerson = { id: string; name?: string; department: string; section: string; position: string; status?: string; gross?: number; branches?: string[] };

const key = (value: string) => (value || "").toLocaleLowerCase("az").replace(/\s+/g, " ").trim();
const working = (person: PlanPerson) => person.status !== "left" && person.status !== "removed";

export const normalizeRate = (value: unknown) => {
  const n = Number(value);
  return RATES.includes(n as (typeof RATES)[number]) ? n : 1;
};

// How well a row suits a person: -1 = not at all; higher is closer.
function score(unit: PlanUnit, person: PlanPerson) {
  if (key(unit.department) !== key(person.department)) return -1;
  // A row of a branch takes only people who work in that branch (people with no branch fit any row).
  if (unit.branch && person.branches?.length && !person.branches.some((b) => key(b) === key(unit.branch || ""))) return -1;
  let points = 0;
  if (unit.position && person.position) {
    if (key(unit.position) !== key(person.position)) return -1;
    points += 4;
  } else if (!unit.position) points += 1;
  else points += 1; // the person has no position yet; any row of the department can take them
  if (unit.section && person.section) {
    if (key(unit.section) !== key(person.section)) return -1;
    points += 2;
  } else if (!unit.section) points += 1;
  return points;
}

export type Assignment = { byUnit: Map<string, PlanPerson[]>; unplaced: PlanPerson[] };

// Each working person goes to the closest row that still has a free place; when every suitable row is full
// the closest one takes them over its plan. Nobody is counted twice.
export function assignPeople(units: PlanUnit[], people: PlanPerson[]): Assignment {
  const byUnit = new Map<string, PlanPerson[]>(units.map((u) => [u.id, []]));
  const unplaced: PlanPerson[] = [];
  const list = people.filter(working);
  const ranked = list
    .map((person) => ({ person, best: Math.max(-1, ...units.map((u) => score(u, person))) }))
    .sort((a, b) => b.best - a.best);
  for (const { person, best } of ranked) {
    if (best < 0) {
      unplaced.push(person);
      continue;
    }
    const options = units.filter((u) => score(u, person) >= 0).sort((a, b) => score(b, person) - score(a, person));
    const free = options.find((u) => (byUnit.get(u.id)?.length || 0) < u.planned);
    byUnit.get((free || options[0]).id)!.push(person);
  }
  return { byUnit, unplaced };
}

export type UnitSummary = PlanUnit & { filled: number; free: number; fte: number; budget: number };
export type DepartmentSummary = { department: string; planned: number; filled: number; free: number; fte: number; budget: number; unplaced: number; units: number };

export function summarize(units: PlanUnit[], people: PlanPerson[]) {
  const { byUnit, unplaced } = assignPeople(units, people);
  const rows: UnitSummary[] = units.map((unit) => {
    const filled = byUnit.get(unit.id)?.length || 0;
    const top = Math.max(unit.salaryMin, unit.salaryMax);
    return { ...unit, filled, free: unit.planned - filled, fte: unit.planned * unit.rate, budget: Math.round(unit.planned * top * 100) / 100 };
  });
  const names = [...new Set([...rows.map((r) => r.department), ...unplaced.map((p) => p.department)])];
  const departments: DepartmentSummary[] = names.map((department) => {
    const mine = rows.filter((r) => key(r.department) === key(department));
    return {
      department,
      planned: mine.reduce((s, r) => s + r.planned, 0),
      filled: mine.reduce((s, r) => s + r.filled, 0),
      free: mine.reduce((s, r) => s + r.free, 0),
      fte: mine.reduce((s, r) => s + r.fte, 0),
      budget: Math.round(mine.reduce((s, r) => s + r.budget, 0) * 100) / 100,
      unplaced: unplaced.filter((p) => key(p.department) === key(department)).length,
      units: mine.length,
    };
  });
  const total = {
    planned: rows.reduce((s, r) => s + r.planned, 0),
    filled: rows.reduce((s, r) => s + r.filled, 0),
    fte: rows.reduce((s, r) => s + r.fte, 0),
    budget: Math.round(rows.reduce((s, r) => s + r.budget, 0) * 100) / 100,
    unplaced: unplaced.length,
  };
  return { rows, departments, unplaced, total };
}

// The pay band of a row as [min, max]; null when the row names no pay.
export function salaryBand(unit: Pick<PlanUnit, "salaryMin" | "salaryMax">): [number, number] | null {
  const min = Math.max(0, unit.salaryMin || 0);
  const max = Math.max(min, unit.salaryMax || 0);
  return max > 0 ? [min, max] : null;
}

// Pay above or below the band of the person's row is refused. A person whose position has no row,
// or whose rows name no pay, is not limited. Returns the message, or "" when the pay is fine.
export function checkSalary(units: PlanUnit[], person: PlanPerson, gross: number): string {
  if (!gross || gross <= 0) return "";
  const own = units.filter((u) => score(u, person) >= 4 || (u.position && key(u.position) === key(person.position) && key(u.department) === key(person.department)));
  const withBand = own.filter((u) => salaryBand(u));
  if (!withBand.length) return "";
  const fits = withBand.some((u) => {
    const [min, max] = salaryBand(u)!;
    return gross >= min - 0.005 && gross <= max + 0.005;
  });
  if (fits) return "";
  const [min, max] = salaryBand(withBand[0])!;
  const range = min === max ? `${min} AZN` : `${min}–${max} AZN`;
  return `Ştat cədvəlində “${withBand[0].position}” (${withBand[0].department}) üçün əmək haqqı ${range} (gross) müəyyən edilib; ${Math.round(gross * 100) / 100} AZN təyin etmək olmaz. Əvvəl ştat cədvəlini dəyişin (direktorun təsdiqi ilə).`;
}

export type BandConflict = { unit: PlanUnit; person: PlanPerson; band: [number, number]; side: "below" | "above" };

// People who sit in a row with a pay band but are paid below or above it (gross a month).
export function bandConflicts(units: PlanUnit[], people: PlanPerson[]): BandConflict[] {
  const { byUnit } = assignPeople(units, people);
  const out: BandConflict[] = [];
  for (const unit of units) {
    const band = salaryBand(unit);
    if (!band) continue;
    for (const person of byUnit.get(unit.id) || []) {
      const gross = person.gross || 0;
      if (gross <= 0) continue;
      if (gross < band[0] - 0.005) out.push({ unit, person, band, side: "below" });
      else if (gross > band[1] + 0.005) out.push({ unit, person, band, side: "above" });
    }
  }
  return out;
}

const money = (n: number) => `${Math.round(n * 100) / 100} AZN`;
export function conflictMessage(conflicts: BandConflict[]): string {
  const first = conflicts[0];
  const who = conflicts
    .slice(0, 5)
    .map((c) => `${(c.person as PlanPerson & { name?: string }).name || "işçi"} — ${money(c.person.gross || 0)} (${c.side === "below" ? "həddən aşağı" : "həddən yuxarı"})`)
    .join("; ");
  const [min, max] = first.band;
  return `“${first.unit.position || first.unit.department}” üçün maaş həddi ${min === max ? money(min) : `${money(min)} – ${money(max)}`} (gross) olacaq, amma bu sətirdəki işçilərin maaşı ona uyğun deyil: ${who}${conflicts.length > 5 ? ` və daha ${conflicts.length - 5} nəfər` : ""}. Əvvəl işçilərin maaşını ştata uyğunlaşdırın (işçi kartı) və ya həddi dəyişin.`;
}

// A new person may only be taken on when the staff table has a free place for the position. A company with no staff rows yet is not limited; once it has rows, a position the table does not name is refused. Returns the message, or "" when there is room.
export function placeProblem(units: PlanUnit[], people: PlanPerson[], candidate: PlanPerson): string {
  if (!candidate.position || !candidate.department) return "";
  const named = units.filter((u) => u.position && key(u.position) === key(candidate.position) && key(u.department) === key(candidate.department));
  // Once the staff table has rows, a position it does not name has no place at all.
  if (!named.length) return units.length ? `Ştat cədvəlində “${candidate.position}” (${candidate.department}) vəzifəsi yoxdur. Plana əlavə etmək üçün «Plan və fakt → İşçi sayı planı», plandan kənar ehtiyac üçün «Plandan kənar» bölməsindən istifadə edin.` : "";
  const rows = named.filter((u) => score(u, candidate) >= 0);
  const label = `“${candidate.position}” (${candidate.department})`;
  if (!rows.length) return `Ştat cədvəlində ${label} vəzifəsi belə şöbə və ya filial üçün planlaşdırılmayıb. Əvvəl ştat cədvəlinə uyğun sətir əlavə edin.`;
  const { byUnit } = assignPeople(units, people.filter((p) => p.id !== candidate.id));
  const total = rows.reduce((sum, u) => sum + u.planned, 0);
  const free = rows.reduce((sum, u) => sum + Math.max(0, u.planned - (byUnit.get(u.id)?.length || 0)), 0);
  if (free > 0) return "";
  return `Ştat cədvəlində ${label} üçün ${total} yer planlaşdırılıb və hamısı doludur. Plana uyğun işçi götürmək üçün «Plan və fakt → İşçi sayı planı»nda say artırın; plandan kənar ehtiyac üçün «Plandan kənar» bölməsində səbəblə sorğu göndərin.`;
}
