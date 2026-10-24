// Copying a vacancy or starting one from a template: only the content is reused.
// Dates, the deadline, the status, approvals and the internal reason belong to each opening.
import type { Job } from "./model.ts";

export const TEMPLATE_FIELDS = [
  "title", "company", "city", "mode", "type", "category", "minSalary", "maxSalary", "salaryKind", "minYears", "maxYears",
  "skills", "description", "requirements", "workSchedule", "address", "benefits", "certifications", "stages",
] as const;

export type JobContent = Pick<Job, "title" | "company" | "city" | "mode" | "type" | "category" | "minSalary" | "maxSalary" | "minYears" | "maxYears" | "skills" | "description" | "requirements"> &
  Partial<Pick<Job, "workSchedule" | "address" | "benefits" | "certifications" | "stages">>;

export function copyableJob(job: Partial<Job>): JobContent {
  const out: Record<string, unknown> = {};
  for (const key of TEMPLATE_FIELDS) {
    const value = (job as Record<string, unknown>)[key];
    if (value !== undefined) out[key] = JSON.parse(JSON.stringify(value));
  }
  return out as JobContent;
}

// A fresh draft built from reusable content.
export function draftFromContent(content: Partial<Job>, input: { id: string; owner: string; now: string }): Job {
  return {
    ...(copyableJob(content) as JobContent),
    id: input.id,
    owner: input.owner,
    created: input.now,
    demo: false,
    status: "draft",
    deadline: "",
    reason: "",
    reasonNote: "",
  } as Job;
}

export const TEMPLATE_LIMIT = 50;
export function cleanTemplateName(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 80) : "";
}
