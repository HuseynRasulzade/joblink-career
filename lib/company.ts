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
// Ready role + extra-permission combinations offered when inviting a member.
export const ROLE_PRESETS: { id: string; label: string; role: CompanyRole; grants: CompanyPermission[]; description: string }[] = [
  { id: "test-owner", label: "Test məsul şəxsi", role: "recruiter", grants: ["tests"], description: "Rekruter + testləri yaradır, göndərir və nəticələri görür" },
  { id: "analyst", label: "Hesabat analitiki", role: "manager", grants: ["reports"], description: "Şöbə rəhbəri + hesabatları Excel-ə ixrac edir" },
  { id: "screening", label: "İlkin seçim üzrə rekruter", role: "recruiter", grants: ["tests", "reports"], description: "Rekruter + testlər və hesabatlar" },
  { id: "dept-head", label: "Şöbə rəhbəri (testlərlə)", role: "manager", grants: ["tests"], description: "Şöbə rəhbəri + namizədlərə test göndərir" },
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
// The last digit of a VÖEN tells the taxpayer type: 1 = legal entity, 2 = individual.
// This is read from the number only; the official taxpayer search is the confirmation.
export type VoenType = "legal" | "individual" | "unknown";
export function voenType(voen: string): VoenType {
  if (!validVoen(voen)) return "unknown";
  return voen[9] === "1" ? "legal" : voen[9] === "2" ? "individual" : "unknown";
}
export const VOEN_TYPE_LABEL: Record<VoenType, string> = {
  legal: "Hüquqi şəxs (nömrəyə görə)",
  individual: "Fiziki şəxs (nömrəyə görə)",
  unknown: "Tip naməlum",
};
export const VOEN_LOOKUP_URL = "https://new.e-taxes.gov.az/etaxes/services/taxpayer-info";
export const VERIFICATION_STATUS: Record<string, string> = {
  none: "Təsdiqlənməyib",
  pending: "Yoxlanılır",
  verified: "Təsdiqlənib",
  rejected: "Rədd edilib",
};

// ---- Official taxpayer search result (e-taxes "Vergi ödəyicisi haqqında məlumat") ----
export type TaxCheck = {
  payerType: "legal" | "individual";
  voen: string;
  name: string;
  active: boolean;
  vat: boolean;
  risky: boolean;
  debt: number;
  checkedAt: string;
  checkedBy: string;
  source: "manual" | "auto";
};
const one = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");
export function sanitizeTaxCheck(input: unknown, voen: string, checkedBy: string, now = new Date().toISOString()): TaxCheck | null {
  const v = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const name = one(v.name, 240);
  if (!validVoen(voen) || name.length < 2) return null;
  const debt = Math.max(0, Math.round(Number(v.debt) * 100) / 100);
  return {
    payerType: v.payerType === "individual" ? "individual" : "legal",
    voen,
    name,
    active: v.active === true,
    vat: v.vat === true,
    risky: v.risky === true,
    debt: Number.isFinite(debt) ? debt : 0,
    checkedAt: now,
    checkedBy,
    source: "manual",
  };
}
const LEGAL_FORMS = ["mehdud mesuliyyetli cemiyyeti", "mehdud mesuliyyetli cemiyyet", "mmc", "qapali sehmdar cemiyyeti", "qsc", "acik sehmdar cemiyyeti", "asc", "sehmdar cemiyyeti", "ictimai birlik", "ib", "fondu", "ltd", "llc", "limited"];
const fold = (value: string) =>
  value
    .toLowerCase()
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ç/g, "c").replace(/ş/g, "s").replace(/ğ/g, "g")
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
// The declared legal name and the registered name match when their core words are the same
// (quotes, case, diacritics and the legal form such as MMC are ignored).
export function taxNameMatches(declared: string, registered: string) {
  const core = (value: string) => {
    let text = ` ${fold(value)} `;
    for (const form of [...LEGAL_FORMS].sort((a, b) => b.length - a.length)) text = text.replaceAll(` ${form} `, " ");
    return text.trim();
  };
  const a = core(declared);
  const b = core(registered);
  return !!a && !!b && a === b;
}

// Date plus whole months; a day that does not exist in the target month (31 Aug + 6) falls on that month's last day.
export function addMonthsIso(date: string, months: number) {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  // 31 Aug + 6 months stays in the last month: clamp to its last day.
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}
