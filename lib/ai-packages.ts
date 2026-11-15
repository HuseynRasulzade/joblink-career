// The employer's AI packages: a monthly number of FULL CV analyses and of cheap AI RANKINGS (one number per applicant).
// The quotas are worked out from the OpenAI price (the worst case) so that the net profit never falls under the target of
// the size of the package: small 40%, medium 25%, large 20% (after VAT, payment fees and the running costs).
export type CompanyAiPackage = {
  id: string;
  name: string;
  priceAzn: number; // per month, VAT included
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
// Shares of the price: 18% VAT inside the price, 2.5% payment fee, 2.5% running costs.
export const COST_SHARES = { vat: 18 / 118, payment: 0.025, running: 0.025 };

export const worstCaseCost = (p: CompanyAiPackage) => p.fullPerMonth * FULL_COST_AZN + p.rankPerMonth * RANK_COST_AZN;
// The net profit share when the whole quota is used on OpenAI.
export const worstCaseNetShare = (p: CompanyAiPackage) =>
  p.priceAzn ? (p.priceAzn * (1 - COST_SHARES.vat - COST_SHARES.payment - COST_SHARES.running) - worstCaseCost(p)) / p.priceAzn : 0;

export const monthKey = (at = new Date()) => at.toISOString().slice(0, 7);
export type AiUsage = { full: number; rank: number };
export const quotaLeft = (p: CompanyAiPackage, used: AiUsage) => ({ full: Math.max(0, p.fullPerMonth - used.full), rank: Math.max(0, p.rankPerMonth - used.rank) });
