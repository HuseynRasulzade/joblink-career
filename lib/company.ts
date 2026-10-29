// Company team: roles, permissions, company details.
export type CompanyRole = "owner" | "director" | "hr" | "manager" | "recruiter";
export const COMPANY_ROLES: {
  id: CompanyRole;
  label: string;
  description: string;
}[] = [
  {
    id: "owner",
    label: "Hesab sahibi",
    description: "Bütün hüquqlar, komandanı idarə edir",
  },
  {
    id: "director",
    label: "Direktor",
    description: "Vakansiyaları yekun təsdiq edir, maaşları və hesabları görür",
  },
  {
    id: "hr",
    label: "HR meneceri",
    description:
      "Vakansiyaları təsdiq edir, təklif göndərir, işçiləri və maaşları idarə edir",
  },
  {
    id: "manager",
    label: "Şöbə rəhbəri",
    description:
      "Vakansiya yaradır (HR və direktor təsdiqi ilə), namizədlərə baxır",
  },
  {
    id: "recruiter",
    label: "Rekruter",
    description: "Namizədlərlə işləyir, vakansiyanı təsdiqə göndərir",
  },
];
export const INVITABLE_ROLES = COMPANY_ROLES.filter(
  (role) => role.id !== "owner",
).map((role) => role.id);
export const roleLabel = (role: string) =>
  COMPANY_ROLES.find((r) => r.id === role)?.label || role;

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
  | "tests" // employer tests: create, send, results and the exam file
  | "employees" // add, edit, import and remove employee cards
  | "staff" // staff table, departments and sections
  | "orders" // order documents and the register
  | "attendance" // attendance sheet and the production calendar
  | "documents" // employee document folder: contracts, orders, IDs
  | "personal-data" // identity card, address and bank data of employees
  | "audit" // the company journal
  | "payroll"; // monthly pay, advances, pay slips and the bank register

// What owner, director and HR do every day; a role below them gets each only as a grant.
const HR_WORK: CompanyPermission[] = ["employees", "staff", "orders", "attendance", "documents", "personal-data", "payroll"];
const PERMISSIONS: Record<CompanyRole, CompanyPermission[]> = {
  owner: [
    "team",
    "publish",
    "approve-hr",
    "approve-director",
    "salaries",
    "billing",
    "company-profile",
    "offers",
    "reports",
    "tests",
    "audit",
    ...HR_WORK,
  ],
  director: [
    "team",
    "publish",
    "approve-director",
    "salaries",
    "billing",
    "company-profile",
    "offers",
    "reports",
    "tests",
    "audit",
    ...HR_WORK,
  ],
  hr: [
    "publish",
    "approve-hr",
    "salaries",
    "billing",
    "company-profile",
    "offers",
    "reports",
    "tests",
    ...HR_WORK,
  ],
  manager: ["reports"],
  recruiter: [],
};
// Every permission with its group, a line of explanation and whether the owner may give it to one person
// beyond their role. "team" and the director's approval stay with the roles.
export type PermissionInfo = { id: CompanyPermission; label: string; group: string; description: string; grantable: boolean; sensitive?: boolean };
export const PERMISSION_INFO: PermissionInfo[] = [
  { id: "publish", label: "Vakansiyanı təsdiqsiz yayımlamaq", group: "Vakansiya və işə qəbul", description: "Vakansiya HR və direktor təsdiqi olmadan dərc olunur.", grantable: true },
  { id: "approve-hr", label: "Vakansiya və sorğuları HR mərhələsində təsdiqləmək", group: "Vakansiya və işə qəbul", description: "Təsdiq zəncirinin birinci pilləsi.", grantable: true },
  { id: "approve-director", label: "Yekun təsdiq (direktor)", group: "Vakansiya və işə qəbul", description: "Təsdiq zəncirinin son pilləsi, ştat planının təsdiqi.", grantable: false },
  { id: "offers", label: "İş təklifi göndərmək", group: "Vakansiya və işə qəbul", description: "Namizədə və işçiyə təklif məktubu göndərir.", grantable: true },
  { id: "tests", label: "Testlər (yaratmaq, göndərmək, nəticələr, test faylı)", group: "Vakansiya və işə qəbul", description: "İşəgötürən testləri ilə tam iş.", grantable: true },
  { id: "employees", label: "İşçi kartları (əlavə, düzəliş, Excel idxalı, silmə)", group: "Kadr və işçilər", description: "İşçi siyahısını idarə edir; maaşı görmək üçün ayrıca maaş icazəsi lazımdır.", grantable: true },
  { id: "staff", label: "Ştat cədvəli, departament və şöbələr", group: "Kadr və işçilər", description: "Ştat sətirləri, struktur və tarixçə. Təsdiqlənmiş plan dəyişiklikləri direktora gedir.", grantable: true },
  { id: "orders", label: "Əmrlər və əmrlər reyestri", group: "Kadr və işçilər", description: "Əmr yaradır, imzaya göndərir, reyestri idarə edir.", grantable: true },
  { id: "attendance", label: "Davamiyyət (tabel) və istehsalat təqvimi", group: "Kadr və işçilər", description: "İşçilərin gününü qeyd edir, şirkət təqvimini dəyişir.", grantable: true },
  { id: "documents", label: "İşçi sənəd qovluğu", group: "Kadr və işçilər", description: "Müqavilə, əmr və vəsiqə kimi sənədləri yükləyir və açır.", grantable: true, sensitive: true },
  { id: "personal-data", label: "İşçilərin şəxsi məlumatları", group: "Kadr və işçilər", description: "Şəxsiyyət vəsiqəsi, FİN, ünvan, IBAN və ailə məlumatları.", grantable: true, sensitive: true },
  { id: "salaries", label: "Maaşlar və təklif məbləğləri", group: "Maliyyə və hesabat", description: "İşçilərin əmək haqqını, vergi və sığorta hesabını və təklif məbləğlərini görür və dəyişir.", grantable: true, sensitive: true },
  { id: "payroll", label: "Əmək haqqı hesablanması, avans və ödənişlər", group: "Maliyyə və hesabat", description: "Aylıq əmək haqqı cədvəlini hesablayır, avans verir, ödənişləri qeyd edir, haqq-hesab vərəqələrini və bank reyestrini hazırlayır.", grantable: true, sensitive: true },
  { id: "reports", label: "Hesabatların Excel-ə ixracı", group: "Maliyyə və hesabat", description: "Panel hesabatları və XLSX faylları.", grantable: true },
  { id: "billing", label: "Hesab-fakturalar və ödənişlər", group: "Maliyyə və hesabat", description: "Paket, ödəniş və hesab-fakturalar.", grantable: true, sensitive: true },
  { id: "company-profile", label: "Şirkət məlumatları və təsdiqləmə", group: "Şirkət", description: "Şirkət profilini və doğrulama sənədlərini dəyişir.", grantable: true },
  { id: "audit", label: "Şirkət jurnalı", group: "Şirkət", description: "Kimin nə etdiyini görür.", grantable: true },
  { id: "team", label: "Komanda və rolların idarəsi", group: "Şirkət", description: "Üzv dəvət edir, rolları və icazələri dəyişir.", grantable: false, sensitive: true },
];
export const PERMISSION_GROUPS = [...new Set(PERMISSION_INFO.map((p) => p.group))];
// Permissions the account owner may give to one person beyond their role.
export const GRANTABLE: { id: CompanyPermission; label: string; group: string; description: string; sensitive?: boolean }[] = PERMISSION_INFO.filter(
  (p) => p.grantable,
).map(({ id, label, group, description, sensitive }) => ({ id, label, group, description, sensitive }));

// The HR endpoints behind the one broad "salaries" check each need their own permission.
const PATH_PERMISSION: [RegExp, CompanyPermission][] = [
  [/^company\/(staff|headcount|org-names|structure)(\/|$)/, "staff"],
  [/^company\/payroll(\/|$)/, "payroll"],
  [/^company\/hr-report(\/|$)/, "payroll"],
  [/^company\/(orders|order-signers|applications)(\/|$)/, "orders"],
  [/^company\/(attendance|calendar)(\/|$)/, "attendance"],
  [/^company\/employee-docs?(\/|$)/, "documents"],
  [/^company\/employees\/profile(-import)?$/, "personal-data"],
  [/^company\/(employees|employee-tasks|employee-events)(\/|$)/, "employees"],
];
export function permissionForPath(path: string): CompanyPermission {
  return PATH_PERMISSION.find(([pattern]) => pattern.test(path))?.[1] || "salaries";
}
// Ready role + extra-permission combinations offered when inviting a member.
export const ROLE_PRESETS: {
  id: string;
  label: string;
  role: CompanyRole;
  grants: CompanyPermission[];
  description: string;
}[] = [
  { id: "test-owner", label: "Test məsul şəxsi", role: "recruiter", grants: ["tests"], description: "Rekruter + testləri yaradır, göndərir və nəticələri görür" },
  { id: "analyst", label: "Hesabat analitiki", role: "manager", grants: ["reports"], description: "Şöbə rəhbəri + hesabatları Excel-ə ixrac edir" },
  { id: "screening", label: "İlkin seçim üzrə rekruter", role: "recruiter", grants: ["tests", "reports"], description: "Rekruter + testlər və hesabatlar" },
  { id: "dept-head", label: "Şöbə rəhbəri (testlərlə)", role: "manager", grants: ["tests"], description: "Şöbə rəhbəri + namizədlərə test göndərir" },
  { id: "hr-officer", label: "Kadr mütəxəssisi", role: "recruiter", grants: ["employees", "orders", "documents", "personal-data", "attendance"], description: "İşçi kartları, əmrlər, sənəd qovluğu, şəxsi məlumatlar və davamiyyət (maaşsız)" },
  { id: "timekeeper", label: "Tabel məsulu", role: "manager", grants: ["attendance"], description: "Şöbə rəhbəri + davamiyyət cədvəlini və təqvimi aparır" },
  { id: "org-planner", label: "Ştat və struktur məsulu", role: "manager", grants: ["staff", "reports"], description: "Şöbə rəhbəri + ştat cədvəli, departament və şöbələr (dəyişikliklər direktora gedir)" },
  { id: "order-clerk", label: "Əmr və sənəd məsulu", role: "recruiter", grants: ["orders", "documents"], description: "Rekruter + əmrlər reyestri və işçi sənəd qovluğu" },
  { id: "payroll", label: "Maliyyə / əmək haqqı mütəxəssisi", role: "manager", grants: ["salaries", "reports", "attendance"], description: "Şöbə rəhbəri + maaşlar, hesabatlar və davamiyyət" },
  { id: "vacancy-lead", label: "Vakansiya meneceri", role: "manager", grants: ["publish", "offers", "tests"], description: "Şöbə rəhbəri + vakansiyanı təsdiqsiz yayımlayır, təklif və test göndərir" },
];
export const normalizeGrants = (value: unknown): CompanyPermission[] =>
  [...new Set((Array.isArray(value) ? value : []).map(String))].filter(
    (g): g is CompanyPermission => GRANTABLE.some((x) => x.id === g),
  );
export function can(
  role: string,
  permission: CompanyPermission,
  grants: readonly string[] = [],
) {
  return (
    (PERMISSIONS[role as CompanyRole] || []).includes(permission) ||
    (grants.includes(permission) && GRANTABLE.some((g) => g.id === permission))
  );
}
export function permissionsOf(
  role: string,
  grants: readonly string[] = [],
): CompanyPermission[] {
  return [
    ...new Set([
      ...(PERMISSIONS[role as CompanyRole] || []),
      ...normalizeGrants(grants),
    ]),
  ];
}

// Approval chain for vacancies created by roles without "publish".
export type ApprovalStep = {
  role: "hr" | "director";
  decision: "" | "approved" | "rejected";
  by: string;
  byName: string;
  at: string;
  note: string;
};
export type JobApproval = {
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  steps: ApprovalStep[];
};
export type ApprovalChain = "both" | "hr" | "director";
export const APPROVAL_CHAINS: Record<ApprovalChain, string> = {
  both: "HR meneceri, sonra direktor",
  hr: "Yalnız HR meneceri",
  director: "Yalnız direktor",
};
export function newApproval(
  userId: string,
  name: string,
  chain: ApprovalChain = "both",
): JobApproval {
  const step = (role: "hr" | "director"): ApprovalStep => ({
    role,
    decision: "",
    by: "",
    byName: "",
    at: "",
    note: "",
  });
  return {
    requestedBy: userId,
    requestedByName: name,
    requestedAt: new Date().toISOString(),
    steps:
      chain === "hr"
        ? [step("hr")]
        : chain === "director"
          ? [step("director")]
          : [step("hr"), step("director")],
  };
}
export function pendingStep(approval: JobApproval | undefined) {
  return approval?.steps.find((step) => step.decision === "") || null;
}
export function canDecide(role: string, step: ApprovalStep | null) {
  if (!step) return false;
  return step.role === "hr"
    ? can(role, "approve-hr")
    : can(role, "approve-director");
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
  // Public employer page
  officeAddress: string;
  mapUrl: string;
  videoUrl: string;
  linkedin: string;
  instagram: string;
  facebook: string;
  foundedYear: string;
};
export const COMPANY_SIZES = [
  "1–10",
  "11–50",
  "51–200",
  "201–500",
  "501–1000",
  "1000+",
];
// Only plain https links are kept for public pages (no javascript:, data: or http:).
export function safeUrl(value: unknown, max = 300) {
  const raw = typeof value === "string" ? value.trim().slice(0, max) : "";
  if (!raw) return "";
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.protocol === "http:"
        ? `https://${url.host}${url.pathname}${url.search}`
        : url.href
      : "";
  } catch {
    return "";
  }
}
const clean = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";
export function companyDetailsInput(value: unknown): CompanyDetails {
  const v = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >;
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
    officeAddress: clean(v.officeAddress, 300),
    mapUrl: safeUrl(v.mapUrl),
    videoUrl: safeUrl(v.videoUrl),
    linkedin: safeUrl(v.linkedin),
    instagram: safeUrl(v.instagram),
    facebook: safeUrl(v.facebook),
    foundedYear: /^(19|20)\d{2}$/.test(clean(v.foundedYear, 4))
      ? clean(v.foundedYear, 4)
      : "",
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
export const VOEN_LOOKUP_URL =
  "https://new.e-taxes.gov.az/etaxes/services/taxpayer-info";
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
const one = (value: unknown, max: number) =>
  typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, max)
    : "";
export function sanitizeTaxCheck(
  input: unknown,
  voen: string,
  checkedBy: string,
  now = new Date().toISOString(),
): TaxCheck | null {
  const v =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
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
const LEGAL_FORMS = [
  "mehdud mesuliyyetli cemiyyeti",
  "mehdud mesuliyyetli cemiyyet",
  "mmc",
  "qapali sehmdar cemiyyeti",
  "qsc",
  "acik sehmdar cemiyyeti",
  "asc",
  "sehmdar cemiyyeti",
  "ictimai birlik",
  "ib",
  "fondu",
  "ltd",
  "llc",
  "limited",
];
const fold = (value: string) =>
  value
    .toLowerCase()
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
// The declared legal name and the registered name match when their core words are the same
// (quotes, case, diacritics and the legal form such as MMC are ignored).
export function taxNameMatches(declared: string, registered: string) {
  const core = (value: string) => {
    let text = ` ${fold(value)} `;
    for (const form of [...LEGAL_FORMS].sort((a, b) => b.length - a.length))
      text = text.replaceAll(` ${form} `, " ");
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
  const last = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0),
  ).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
}

// Photos on the public employer page.
export const GALLERY_LIMIT = 6;
// A team invitation stays open this long; it can be sent again after that.
export const INVITE_DAYS = 14;
export const inviteExpired = (updated: string, now = new Date()) =>
  now.getTime() - new Date(updated).getTime() > INVITE_DAYS * 86_400_000;
// Share of the public employer page that is filled in.
export function profileCompleteness(
  details: Pick<
    CompanyDetails,
    | "about"
    | "industry"
    | "size"
    | "website"
    | "officeAddress"
    | "foundedYear"
    | "videoUrl"
    | "linkedin"
    | "instagram"
    | "facebook"
  >,
  hasLogo: boolean,
  galleryCount: number,
) {
  const checks: Array<[string, boolean]> = [
    ["Loqo", hasLogo],
    ["Şirkət haqqında", details.about.trim().length >= 80],
    ["Sahə", !!details.industry.trim()],
    ["İşçi sayı", !!details.size],
    ["Vebsayt", !!details.website.trim()],
    ["Ofis ünvanı", !!details.officeAddress.trim()],
    ["Yarandığı il", !!details.foundedYear.trim()],
    [
      "Sosial şəbəkə və ya video",
      !!(
        details.videoUrl ||
        details.linkedin ||
        details.instagram ||
        details.facebook
      ),
    ],
    ["Şəkil qalereyası", galleryCount > 0],
  ];
  const done = checks.filter(([, ok]) => ok).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    missing: checks.filter(([, ok]) => !ok).map(([label]) => label),
  };
}

// ---- Approvals beyond vacancies: offers, salary changes, substitutes ----
export type ApprovalRules = {
  offers: boolean;
  salaries: boolean;
  exits: boolean;
  headcount: boolean;
  chain: ApprovalChain;
  // Offers below this net/gross amount (AZN) are sent without approval; 0 = every offer waits.
  offerMin: number;
  // Salary changes smaller than this share (%) go through; 0 = every change waits.
  raisePercent: number;
};
const wholeNumber = (value: unknown, max: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0;
};
export function normalizeApprovalRules(value: unknown): ApprovalRules {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    offers: v.offers === true,
    salaries: v.salaries === true,
    exits: v.exits === true,
    headcount: v.headcount === true,
    chain: v.chain === "hr" || v.chain === "director" ? v.chain : "both",
    offerMin: wholeNumber(v.offerMin, 1_000_000),
    raisePercent: wholeNumber(v.raisePercent, 500),
  };
}
export type ApprovalKind = "offer" | "salary" | "exit" | "headcount";
export const APPROVAL_KIND_LABEL: Record<ApprovalKind, string> = {
  offer: "İş təklifi",
  salary: "Maaş dəyişikliyi",
  exit: "İşçinin işdən çıxarılması",
  headcount: "Ştat planı dəyişikliyi",
};
// A substitute is named for at most this many days.
export const DELEGATE_MAX_DAYS = 30;
export const REMINDER_AFTER_DAYS = 2;
export const REMINDER_LIMIT = 4;
export function delegateUntil(value: unknown, now = new Date()) {
  const text = typeof value === "string" ? value.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return "";
  const today = now.toISOString().slice(0, 10);
  const last = new Date(now.getTime() + DELEGATE_MAX_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return text >= today && text <= last ? text : "";
}
// Whether a request that skipped the director must wait for one. `value` is the
// offered salary for an offer and the size of the change in percent for a salary.
export function needsDirector(rules: ApprovalRules, kind: ApprovalKind, canDecideAsDirector: boolean, value = 0) {
  if (canDecideAsDirector) return false;
  if (kind === "offer") return rules.offers && (rules.offerMin <= 0 || value >= rules.offerMin);
  if (kind === "salary") return rules.salaries && (rules.raisePercent <= 0 || value >= rules.raisePercent);
  return kind === "exit" ? rules.exits : rules.headcount;
}
// Size of a salary change in percent of the old salary (a new salary counts as 100%).
export const salaryChangePercent = (oldAmount: number, newAmount: number) =>
  oldAmount > 0 ? (Math.abs(newAmount - oldAmount) / oldAmount) * 100 : 100;
// A request or vacancy waiting this long is also reported to the account owner.
export const ESCALATE_AFTER_DAYS = 5;
// The role that decides first in a chain.
export const firstApprover = (chain: ApprovalChain) =>
  chain === "director" ? "approve-director" : "approve-hr";
