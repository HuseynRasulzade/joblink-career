// The employer panel is two programs in one: finding people (recruitment) and running the staff (HR operations).
// Each section of the menu belongs to one of them; a few serve both and show in both menus.
export type HrModule = "recruit" | "ops";

export const HR_MODULES: Record<HrModule, { label: string; hint: string; home: string }> = {
  recruit: { label: "İşə qəbul", hint: "Vakansiya, namizəd, müsahibə", home: "hr-overview" },
  ops: { label: "Kadr (HR)", hint: "İşçi, əmr, əmək haqqı, davamiyyət", home: "hr-employees" },
};

export const HR_MODULE_OF: Record<string, HrModule | "both"> = {
  // finding people
  "hr-jobs": "recruit",
  "hr-candidates": "recruit",
  "hr-ai": "recruit",
  "hr-talent": "recruit",
  "hr-interviews": "recruit",
  "hr-tests": "recruit",
  "hr-messages": "recruit",
  // running the staff
  "hr-employees": "ops",
  "hr-orders": "ops",
  "hr-payroll": "ops",
  "hr-planfact": "ops",
  "hr-people-ops": "ops",
  "hr-growth": "ops",
  "hr-attendance": "ops",
  "hr-group": "ops",
  // both
  "hr-overview": "both",
  "hr-approvals": "both",
  "hr-reports": "both",
  "hr-team": "both",
  "hr-company": "both",
  "hr-billing": "both",
  "hr-calculator": "both",
  "hr-support": "both",
};

export const moduleOf = (id: string): HrModule | "both" => HR_MODULE_OF[id] || "both";
export const inModule = (id: string, mode: HrModule) => {
  const m = moduleOf(id);
  return m === "both" || m === mode;
};

// Sections kept in the code but not shown in the menu for now (to be developed later).
export const HIDDEN_HR_PAGES = new Set<string>(["hr-group"]);
