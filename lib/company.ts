// Company team: roles, permissions, company details.
export type CompanyRole = "owner" | "director" | "hr" | "manager" | "recruiter";
export const COMPANY_ROLES: { id: CompanyRole; label: string; description: string }[] = [
  { id: "owner", label: "Hesab sahibi", description: "Bütün hüquqlar, komandanı idarə edir" },
  { id: "director", label: "Direktor", description: "Vakansiyaları yekun təsdiq edir, maaşları və hesabları görür" },
  { id: "hr", label: "HR meneceri", description: "Vakansiyaları təsdiq edir, təklif göndərir, işçiləri və maaşları idarə edir" },
  { id: "manager", label: "Şöbə rəhbəri", description: "Vakansiya yaradır (HR və direktor təsdiqi ilə), namizədlərə baxır" },
  { id: "recruiter", label: "Rekruter", description: "Namizədlərlə işləyir, vakansiyanı təsdiqə göndərir" },
];
export const INVITABLE_ROLES = COMPANY_ROLES.filter((role) => role.id !== "owner").map((role) => role.id);
export const roleLabel = (role: string) => COMPANY_ROLES.find((r) => r.id === role)?.label || role;

export type CompanyPermission =
  | "team" // invite and remove members
  | "publish" // publish vacancies without approval
  | "approve-hr" // first approval step
  | "approve-director" // final approval step
  | "salaries" // employee salaries and offer amounts
  | "billing" // invoices and payments
  | "company-profile" // company details and verification
  | "offers" // send job offers
  | "reports" // dashboard reports and XLSX
  | "tests"; // employer tests: create, send, results and the exam file

const PERMISSIONS: Record<CompanyRole, CompanyPermission[]> = {
  owner: ["team", "publish", "approve-hr", "approve-director", "salaries", "billing", "company-profile", "offers", "reports", "tests"],
  director: ["team", "publish", "approve-director", "salaries", "billing", "company-profile", "offers", "reports", "tests"],
  hr: ["publish", "approve-hr", "salaries", "billing", "company-profile", "offers", "reports", "tests"],
  manager: ["reports"],
  recruiter: [],
};
// Permissions the account owner may give to one person beyond their role.
export const GRANTABLE: { id: CompanyPermission; label: string }[] = [
  { id: "tests", label: "Testlərə giriş (yaratmaq, göndərmək, nəticələr, test faylı)" },
  { id: "reports", label: "Hesabatların ixracı" },
];
export const normalizeGrants = (value: unknown): CompanyPermission[] =>
  [...new Set((Array.isArray(value) ? value : []).map(String))].filter((g): g is CompanyPermission => GRANTABLE.some((x) => x.id === g));
export function can(role: string, permission: CompanyPermission, grants: readonly string[] = []) {
  return (PERMISSIONS[role as CompanyRole] || []).includes(permission) || (grants.includes(permission) && GRANTABLE.some((g) => g.id === permission));
}
export function permissionsOf(role: string, grants: readonly string[] = []): CompanyPermission[] {
  return [...new Set([...(PERMISSIONS[role as CompanyRole] || []), ...normalizeGrants(grants)])];
}

// Approval chain for vacancies created by roles without "publish".
export type ApprovalStep = { role: "hr" | "director"; decision: "" | "approved" | "rejected"; by: string; byName: string; at: string; note: string };
export type JobApproval = { requestedBy: string; requestedByName: string; requestedAt: string; steps: ApprovalStep[] };
export function newApproval(userId: string, name: string): JobApproval {
  const step = (role: "hr" | "director"): ApprovalStep => ({ role, decision: "", by: "", byName: "", at: "", note: "" });
  return { requestedBy: userId, requestedByName: name, requestedAt: new Date().toISOString(), steps: [step("hr"), step("director")] };
}
export function pendingStep(approval: JobApproval | undefined) {
  return approval?.steps.find((step) => step.decision === "") || null;
}
export function canDecide(role: string, step: ApprovalStep | null) {
  if (!step) return false;
  return step.role === "hr" ? can(role, "approve-hr") : can(role, "approve-director");
}

export type CompanyDetails = {
  legalName: string;
  voen: string;
  legalAddress: string;
  director: string;
  phone: string;
  email: string;
  website: string;
  industry: string;
  size: string;
  about: string;
  bankName: string;
  iban: string;
};
export const COMPANY_SIZES = ["1–10", "11–50", "51–200", "201–500", "501–1000", "1000+"];
const clean = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
export function companyDetailsInput(value: unknown): CompanyDetails {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    legalName: clean(v.legalName, 200),
    voen: clean(v.voen, 20).replace(/\D/g, ""),
    legalAddress: clean(v.legalAddress, 300),
    director: clean(v.director, 120),
    phone: clean(v.phone, 40),
    email: clean(v.email, 160),
    website: clean(v.website, 200),
    industry: clean(v.industry, 120),
    size: COMPANY_SIZES.includes(clean(v.size, 20)) ? clean(v.size, 20) : "",
    about: clean(v.about, 3000),
    bankName: clean(v.bankName, 120),
    iban: clean(v.iban, 40).replace(/\s+/g, "").toUpperCase(),
  };
}
// Azerbaijani taxpayer ID: 10 digits.
export const validVoen = (voen: string) => /^\d{10}$/.test(voen);
export const VERIFICATION_STATUS: Record<string, string> = {
  none: "Təsdiqlənməyib",
  pending: "Yoxlanılır",
  verified: "Təsdiqlənib",
  rejected: "Rədd edilib",
};
