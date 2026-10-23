// Editing a live vacancy, extending its deadline and recording why it was closed.
import type { Job } from "./model.ts";
import { TEMPLATE_FIELDS, copyableJob } from "./job-templates.ts";

// Everything the company may change on a published or paused vacancy.
export const EDITABLE_FIELDS = [...TEMPLATE_FIELDS, "deadline", "reason", "reasonNote"] as const;

export const CLOSE_REASONS: { id: string; label: string }[] = [
  { id: "filled", label: "Vəzifə dolduruldu" },
  { id: "cancelled", label: "Ehtiyac qalmadı / ləğv edildi" },
  { id: "other", label: "Digər səbəb" },
];
// "reposted" is set by the system when an ended vacancy is published again; it is not offered in the close dialog.
export const closeReasonLabel = (id: string | undefined) => (id === "reposted" ? "Təkrar yayımlandı" : CLOSE_REASONS.find((r) => r.id === id)?.label || "");

// A vacancy that is closed, waiting for approval or rejected is not edited in place.
export const isEditableStatus = (status: string) => status === "published" || status === "paused";

export const validDeadline = (value: unknown, today = new Date().toISOString().slice(0, 10)) =>
  value === "" || value === undefined || value === null || (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && value >= today && !Number.isNaN(Date.parse(value)));

export function changedFields(before: Partial<Job>, after: Partial<Job>): string[] {
  return EDITABLE_FIELDS.filter((key) => JSON.stringify((before as Record<string, unknown>)[key] ?? null) !== JSON.stringify((after as Record<string, unknown>)[key] ?? null));
}

export function pickEditable(source: Partial<Job>): Partial<Job> {
  const out: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) if ((source as Record<string, unknown>)[key] !== undefined) out[key] = (source as Record<string, unknown>)[key];
  return out as Partial<Job>;
}

// "+7 days" counted from today, or from the current deadline when it is still ahead.
export function extendedDeadline(current: string | undefined, days: number, today = new Date().toISOString().slice(0, 10)) {
  const base = current && current >= today ? current : today;
  return new Date(Date.parse(`${base}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

export const daysLeft = (deadline: string | undefined, today = new Date().toISOString().slice(0, 10)) =>
  deadline ? Math.round((Date.parse(`${deadline}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000) : null;

// Changes the applicants should hear about; wording edits and internal fields stay silent.
export const MATERIAL_FIELDS = ["title", "minSalary", "maxSalary", "city", "mode", "type", "workSchedule", "address", "deadline"] as const;
const FIELD_NAMES: Record<string, string> = {
  title: "Vəzifə", city: "Şəhər", mode: "İş rejimi", type: "Məşğulluq növü", workSchedule: "İş qrafiki", address: "Ünvan", deadline: "Müraciət üçün son tarix",
};
const salaryText = (job: Partial<Job>) => (job.minSalary || job.maxSalary ? `${job.minSalary || 0}–${job.maxSalary || 0} AZN` : "razılaşma yolu ilə");

// Short lines such as "Maaş: 900–1100 AZN → 1000–1300 AZN"; empty when nothing important changed.
export function describeMaterialChanges(before: Partial<Job>, after: Partial<Job>): string[] {
  const lines: string[] = [];
  if (before.minSalary !== after.minSalary || before.maxSalary !== after.maxSalary) lines.push(`Maaş: ${salaryText(before)} → ${salaryText(after)}`);
  for (const key of MATERIAL_FIELDS) {
    if (key === "minSalary" || key === "maxSalary") continue;
    const a = String((before as Record<string, unknown>)[key] ?? "");
    const b = String((after as Record<string, unknown>)[key] ?? "");
    if (a !== b) lines.push(`${FIELD_NAMES[key]}: ${a || "göstərilməyib"} → ${b || "göstərilməyib"}`);
  }
  return lines;
}

// ---- Publishing an ended vacancy again ----
export const REPOST_DAYS = [14, 30, 60];
export const DEFAULT_REPOST_DAYS = 30;
// Ended = closed, or still "published" but past its deadline.
export const isEndedJob = (status: string, deadline: string | undefined, today = new Date().toISOString().slice(0, 10)) =>
  status === "archived" || (status === "published" && !!deadline && deadline < today);

// A new opening with the same content and reason, a fresh deadline and none of the old
// closing, approval or moderation data. Applications stay with the old vacancy.
export function repostedJob(
  job: Partial<Job> & { id: string },
  input: { id: string; owner: string; createdBy: string; now: string; today: string; days: number },
): Job & { repostOf: string; createdBy: string } {
  const days = REPOST_DAYS.includes(input.days) ? input.days : DEFAULT_REPOST_DAYS;
  return {
    ...(copyableJob(job) as Job),
    reason: job.reason || "",
    reasonNote: job.reasonNote || "",
    id: input.id,
    owner: input.owner,
    created: input.now,
    demo: false,
    status: "published",
    deadline: new Date(Date.parse(`${input.today}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10),
    repostOf: job.id,
    createdBy: input.createdBy,
  };
}
