// Editing a live vacancy, extending its deadline and recording why it was closed.
import type { Job } from "./model.ts";
import { TEMPLATE_FIELDS } from "./job-templates.ts";

// Everything the company may change on a published or paused vacancy.
export const EDITABLE_FIELDS = [...TEMPLATE_FIELDS, "deadline", "reason", "reasonNote"] as const;

export const CLOSE_REASONS: { id: string; label: string }[] = [
  { id: "filled", label: "Vəzifə dolduruldu" },
  { id: "cancelled", label: "Ehtiyac qalmadı / ləğv edildi" },
  { id: "other", label: "Digər səbəb" },
];
export const closeReasonLabel = (id: string | undefined) => CLOSE_REASONS.find((r) => r.id === id)?.label || "";

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
