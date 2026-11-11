// A vacancy may only open a place that the staff table plans: the department, the position, a free place
// (people working and vacancies already open count) and a pay inside the row's band. Nothing beyond the plan
// can be opened; an extra place first goes through the approval of a plan change.
import { assignPeople, salaryBand, type PlanPerson, type PlanUnit } from "./staff-plan.ts";

export type VacancyFacts = { branch?: string; department: string; section: string; title: string; minSalary: number; maxSalary: number; salaryKind: string; reason?: string };
export type OpenVacancy = { branch?: string; department: string; section: string; title: string; reason?: string };
export type PlanCheck =
  | { ok: true; unit: PlanUnit | null; note: "" | "no-table" }
  | { ok: false; code: "no-branch" | "no-department" | "no-position" | "no-place" | "salary"; message: string };

const key = (v: string) => (v || "").toLocaleLowerCase("az").replace(/\s+/g, " ").trim();
const range = (min: number, max: number) => (min === max ? `${min} AZN` : `${min}–${max} AZN`);

export function checkVacancyAgainstPlan(
  units: PlanUnit[],
  people: PlanPerson[],
  open: OpenVacancy[],
  job: VacancyFacts,
  // The position as the catalog names it (so “mühasib” and “Mühasib” are one position) and the pay as gross.
  canon: (position: string) => string = (p) => p,
  toGross: (amount: number, kind: string) => number = (a) => a,
): PlanCheck {
  if (!units.length) return { ok: true, unit: null, note: "no-table" };
  const wanted = key(job.branch || "");
  if (wanted && !units.some((u) => key(u.branch || "") === wanted)) {
    return { ok: false, code: "no-branch", message: `Ştat planında yer yoxdur: “${job.branch}” filialı ştat cədvəlində yoxdur. Filial yalnız ştat cədvəlindən gəlir; filialı seçin və ya ştat sətrində yazın.` };
  }
  // A vacancy of a branch is counted inside that branch: its rows, the people who work there and its open vacancies.
  const inBranch = (b?: string) => key(b || "") === wanted;
  const cu = units.filter((u) => !wanted || inBranch(u.branch)).map((u) => ({ ...u, position: u.position ? canon(u.position) : "" }));
  const cp = people.filter((p) => !wanted || (p.branches || []).some((b) => inBranch(b))).map((p) => ({ ...p, position: p.position ? canon(p.position) : "" }));
  const pseudo = (id: string, v: OpenVacancy): PlanPerson => ({ id, department: v.department, section: v.section, position: v.title ? canon(v.title) : "", status: "active", branches: v.branch ? [v.branch] : [] });
  // A temporary cover (leave and the like) fills no place of its own: the person away still holds theirs.
  const others = open.filter((v) => v.reason !== "temporary" && (!wanted || inBranch(v.branch))).map((v, i) => pseudo(`open-${i}`, v));
  const mine = pseudo("__new__", job);
  const { byUnit, unplaced } = assignPeople(cu, [...cp, ...others, mine]);
  const where = `${job.branch ? `${job.branch} / ` : ""}${job.department || "—"} / ${job.title || "—"}`;
  if (unplaced.some((p) => p.id === "__new__")) {
    const inDepartment = cu.some((u) => key(u.department) === key(job.department));
    return inDepartment
      ? { ok: false, code: "no-position", message: `Ştat planında yer yoxdur: ştat cədvəlində “${where}” vəzifəsi planlaşdırılmayıb. Vakansiyanın vəzifə adı ştat cədvəlindəki ilə eyni olmalıdır; yeni vəzifə üçün plana əlavə təsdiqlənməlidir.` }
      : { ok: false, code: "no-department", message: `Ştat planında yer yoxdur: “${job.department || "departament yazılmayıb"}” departamenti ştat cədvəlində yoxdur. Departamenti seçin və ya plana əlavə təsdiqlədin.` };
  }
  const row = cu.find((u) => (byUnit.get(u.id) || []).some((p) => p.id === "__new__"));
  if (!row) return { ok: true, unit: null, note: "" };
  const taken = (byUnit.get(row.id) || []).length - 1;
  if (taken >= row.planned && job.reason !== "temporary") {
    return { ok: false, code: "no-place", message: `Ştat planında yer yoxdur: “${where}” üçün plan ${row.planned}, bu yer(lər) artıq dolub və ya vakansiya açılıb (${taken}). Əlavə yer üçün plana əlavə təsdiqlənməlidir.` };
  }
  const band = salaryBand(row);
  if (band) {
    const min = job.minSalary > 0 ? toGross(job.minSalary, job.salaryKind) : 0;
    const max = job.maxSalary > 0 ? toGross(job.maxSalary, job.salaryKind) : 0;
    const bad = (min > 0 && min < band[0] - 0.005) || (max > 0 && max > band[1] + 0.005) || (min > band[1] + 0.005);
    if (bad) {
      return {
        ok: false,
        code: "salary",
        message: `Vakansiyanın maaşı ştat həddinə uyğun deyil: “${where}” üçün ştatda ${range(band[0], band[1])} (gross) müəyyən edilib; vakansiyada ${range(Math.round(min), Math.round(max || min))} yazılıb${job.salaryKind === "net" ? " (net-dən gross-a çevrilib)" : ""}.`,
      };
    }
  }
  return { ok: true, unit: row, note: "" };
}
