// What an employee costs and how much leave is left. Pure functions for the
// employees page, the staff table and their tests.
import { calculateFromGross, calculateFromNet, type Sector, type SalaryBreakdown } from "./salary.ts";

export type SalaryType = "gross" | "net";

export type EmployeePay = SalaryBreakdown & {
  // Net pay, gross pay and what the employer pays in all (gross plus its own contributions).
  superGross: number;
};

// The stored amount is gross or net; the other figures follow from the tax rules.
export function employeePay(amount: number, type: SalaryType, sector: Sector = "private"): EmployeePay {
  const base = type === "net" ? calculateFromNet(amount, sector) : calculateFromGross(amount, sector);
  return { ...base, superGross: base.employerCost };
}

export type Tenure = { years: number; months: number; days: number; totalMonths: number; text: string };

const toDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || "");
  return match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
};

// Time worked from the start date to the end date (or today).
export function tenure(start: string, end: string, today: string): Tenure | null {
  const from = toDate(start);
  const to = toDate(end && end < today ? end : today);
  if (!from || !to || to < from) return null;
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  const anchor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate()));
  const days = Math.max(0, Math.round((to.getTime() - anchor.getTime()) / 86_400_000));
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const text = [years && `${years} il`, rest && `${rest} ay`, !years && !rest && `${days} gün`].filter(Boolean).join(" ");
  return { years, months: rest, days, totalMonths: months, text: text || "0 gün" };
}

export type VacationBalance = {
  entitlement: number; // days per working year
  accrued: number; // days earned so far
  used: number;
  remaining: number; // may be negative (leave taken in advance)
};

// Leave is earned evenly over the working year: a month of work earns a twelfth.
export function vacationBalance(
  input: { start: string; end: string; entitlement: number; used: number },
  today: string,
): VacationBalance {
  const worked = tenure(input.start, input.end, today);
  const entitlement = Math.max(0, Math.min(365, Math.round(Number(input.entitlement) || 0)));
  const used = Math.max(0, Math.round(Number(input.used) || 0));
  const accrued = worked ? Math.round(((entitlement * worked.totalMonths) / 12) * 10) / 10 : 0;
  return { entitlement, accrued, used, remaining: Math.round((accrued - used) * 10) / 10 };
}

export type StaffUnit = { id: string; department: string; section: string; position: string; planned: number };
export type StaffPerson = { department: string; section: string; position: string; status: string };

const key = (value: string) => (value || "").toLocaleLowerCase("az").replace(/\s+/g, " ").trim();

// A person fills a place when the department and position agree; the section is
// compared only when both sides name one.
export function staffFill(unit: StaffUnit, people: StaffPerson[]) {
  return people.filter(
    (person) =>
      person.status !== "left" &&
      person.status !== "removed" &&
      key(person.department) === key(unit.department) &&
      (!unit.position || !person.position || key(person.position) === key(unit.position)) &&
      (!unit.section || !person.section || key(person.section) === key(unit.section)),
  ).length;
}

// Free places of a department: planned places less people working and vacancies already open for it.
export function freeStaffPlaces(units: StaffUnit[], people: StaffPerson[], openVacancies: number, department: string) {
  const own = units.filter((unit) => key(unit.department) === key(department));
  if (!own.length) return null;
  const planned = own.reduce((sum, unit) => sum + unit.planned, 0);
  const filled = people.filter(
    (person) => person.status !== "left" && person.status !== "removed" && key(person.department) === key(department),
  ).length;
  return { planned, filled, openVacancies, free: planned - filled - openVacancies };
}
