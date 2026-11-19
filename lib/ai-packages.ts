// The employer's AI packages: a monthly number of FULL CV analyses and of cheap AI RANKINGS (one number per applicant).
// The quotas are worked out from the OpenAI price (the worst case) so that the net profit never falls under the target of
// the size of the package: small 40%, medium 25%, large 20% (after VAT, payment fees and the running costs).
export type CompanyAiPackage = {
  id: string;
  name: string;
  priceAzn: number; // per month, WITHOUT VAT (18% VAT is added on the invoice)
  fullPerMonth: number;
  rankPerMonth: number;
  target: number; // the net profit share the package is built for (0 = free package)
};
export const COMPANY_AI_PACKAGES: CompanyAiPackage[] = [
  { id: "free", name: "Pulsuz", priceAzn: 0, fullPerMonth: 30, rankPerMonth: 300, target: 0 },
  { id: "start", name: "Başlanğıc", priceAzn: 49, fullPerMonth: 650, rankPerMonth: 4000, target: 0.4 },
  { id: "standard", name: "Standart", priceAzn: 149, fullPerMonth: 2800, rankPerMonth: 17000, target: 0.25 },
  { id: "pro", name: "Peşəkar", priceAzn: 239, fullPerMonth: 5000, rankPerMonth: 20000, target: 0.25 },
  { id: "big", name: "Böyük", priceAzn: 399, fullPerMonth: 8200, rankPerMonth: 49000, target: 0.2 },
];
export const packageById = (id: string) => COMPANY_AI_PACKAGES.find((p) => p.id === id) || COMPANY_AI_PACKAGES[0];

// What one operation costs on OpenAI (₼): a full analysis is about 3 800 tokens, a ranking about 250; 5.44 ₼ per million tokens.
export const FULL_COST_AZN = 0.020672;
export const RANK_COST_AZN = 0.00136;
// Shares of the price: the price is without VAT (VAT is added on top), 2.5% payment fee, 2.5% running costs.
export const COST_SHARES = { vat: 0, payment: 0.025, running: 0.025 };

// The HR (Kadr) module is offered on top of any AI package for a fixed monthly price (without VAT).
export const HR_MODULE_PRICE_AZN = 150;
// Used together with a paid AI package the HR module costs less: 120 AZN a month (without VAT) instead of 150.
export const HR_MODULE_BUNDLE_PRICE_AZN = 120;
// The live prices (the admin can change them: see `lib/package-limits.ts`); the constants above are the defaults.
export const HR_PRICES = { alone: HR_MODULE_PRICE_AZN, bundle: HR_MODULE_BUNDLE_PRICE_AZN };
export const hrModulePriceFor = (aiPackagePriceAzn: number) => (aiPackagePriceAzn > 0 ? HR_PRICES.bundle : HR_PRICES.alone);
// Companies registered before this day keep the HR (Kadr) module free; companies registered from this day on need it as a package.
export const HR_MODULE_REQUIRED_FROM = "2026-11-19T00:00:00.000Z";
// The HR module is open when it was bought, or when the company is older than the rule.
// A bought module lasts 30 days (`hr_until`, empty = no end, for older rows); the admin can also give it for any number of days.
export const HR_MODULE_DAYS = 30;
export const hrModuleOpen = (companyCreated: string, hrModule: boolean, hrUntil?: string | null, now: string = new Date().toISOString()) =>
  (hrModule && (!hrUntil || hrUntil > now)) || !companyCreated || companyCreated < HR_MODULE_REQUIRED_FROM;
// The end of the module after buying or renewing: from today, or from the current end when it is still in the future.
export const hrUntilAfter = (days: number, currentUntil?: string | null, now: string = new Date().toISOString()) => {
  const from = currentUntil && currentUntil > now ? new Date(currentUntil) : new Date(now);
  from.setUTCDate(from.getUTCDate() + days);
  return from.toISOString();
};
// API areas of the HR module (running the staff); recruitment areas stay open for everybody.
export const HR_MODULE_API = /^company\/(payroll|employees|staff|shifts|trips|orders|hours|attendance|leave-schedule|offboarding|performance|training|assets|skill-matrix|succession|employee-tasks|employee-docs|doc-registry|ohs|plan-fact|branches|budget-plan|hr-expenses|one-on-ones|celebrations|policies)(\/|$)/;

export const worstCaseCost = (p: CompanyAiPackage) => p.fullPerMonth * FULL_COST_AZN + p.rankPerMonth * RANK_COST_AZN;
// The net profit share when the whole quota is used on OpenAI.
export const worstCaseNetShare = (p: CompanyAiPackage) =>
  p.priceAzn ? (p.priceAzn * (1 - COST_SHARES.vat - COST_SHARES.payment - COST_SHARES.running) - worstCaseCost(p)) / p.priceAzn : 0;

export const monthKey = (at = new Date()) => at.toISOString().slice(0, 7);
export type AiUsage = { full: number; rank: number };
export const quotaLeft = (p: CompanyAiPackage, used: AiUsage) => ({ full: Math.max(0, p.fullPerMonth - used.full), rank: Math.max(0, p.rankPerMonth - used.rank) });

// Extra analyses bought on top of the monthly package. They do not expire; they are used only after the month's quota is spent.
// The price keeps at least a 25% net profit in the worst case (all spent on OpenAI), like the medium package.
export type AiTopup = { id: string; name: string; priceAzn: number; full: number; rank: number };
export const AI_TOPUPS: AiTopup[] = [
  { id: "t-small", name: "Kiçik əlavə paket", priceAzn: 12, full: 200, rank: 1500 },
  { id: "t-medium", name: "Orta əlavə paket", priceAzn: 59, full: 1000, rank: 7000 },
  { id: "t-large", name: "Böyük əlavə paket", priceAzn: 169, full: 3000, rank: 20000 },
];
export const topupById = (id: string) => AI_TOPUPS.find((t) => t.id === id) || null;
export const topupNetShare = (t: AiTopup) =>
  (t.priceAzn * (1 - COST_SHARES.vat - COST_SHARES.payment - COST_SHARES.running) - (t.full * FULL_COST_AZN + t.rank * RANK_COST_AZN)) / t.priceAzn;
