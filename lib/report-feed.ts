// The staff plan as CSV for Power BI / Excel (Data → From web): no names and no personal pay, only the rows of the plan and the totals of each row.
import { employeePay } from "./payroll.ts";
import { RATE_LABEL, assignPeople, unitActive, type PlanPerson, type PlanUnit } from "./staff-plan.ts";

const cell = (v: string | number) => {
  const text = String(v ?? "");
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function staffPlanCsv(units: PlanUnit[], people: PlanPerson[], month: string): string {
  const assigned = assignPeople(units, people);
  const cost = (gross: number) => (gross > 0 ? employeePay(gross, "gross", "private").employerCost : 0);
  const head = ["Filial", "Departament", "Şöbə", "Vəzifə", "Pillə", "Ştat növü", "Plan", "Başlanğıc ay", "Son ay", "Maaş min (gross)", "Maaş maks (gross)", "İşləyir", "Boş", "Aylıq xərc maks. (işəgötürən payları ilə)", "Aktiv"];
  const rows = units.map((u) => {
    const filled = assigned.byUnit.get(u.id)?.length || 0;
    const active = unitActive(u, month);
    const hi = u.salaryMax || u.salaryMin;
    return [u.branch || "Baş ofis", u.department, u.section, u.position, u.level || "", RATE_LABEL[u.rate] || "Tam ştat", u.planned, u.startMonth || "", u.endMonth || "", u.salaryMin, u.salaryMax || u.salaryMin, filled, Math.max(0, u.planned - filled), active ? Math.round(cost(hi) * u.planned * (u.rate || 1)) : 0, active ? "bəli" : "xeyr"];
  });
  return "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

export async function tokenHash(token: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newFeedToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `jmr_${btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}
