// Candidate packages ("paketlər"): prices, daily limits and subscription state.
export type PlanId = "free" | "basic" | "plus-5" | "plus-7" | "plus-10" | "premium";

export type PlanLimits = {
  aiAccess: boolean; // AI assistant, summary writer, career advice and fit review
  aiApplyPerDay: number; // companies the AI sends the CV to each day
  cvAnalysesPerDay: number; // AI CV analyses
  cvFixesPerDay: number; // CV rewrites that apply the ATS suggestions
  digestEmail: boolean; // vacancies of selected companies by e-mail
  digestSms: boolean; // ... and by text message when a phone number is given
  aiTokensWindow: number; // AI tokens that start again every 5 hours
  aiTokensMonth: number; // ceiling of AI tokens in a month
};
export type Plan = {
  id: PlanId;
  name: string;
  priceAzn: number;
  summary: string;
  features: string[];
  limits: PlanLimits;
};

export const PLAN_PERIOD_DAYS = 30;

const none: PlanLimits = { aiAccess: false, aiApplyPerDay: 0, cvAnalysesPerDay: 0, cvFixesPerDay: 0, digestEmail: false, digestSms: false, aiTokensWindow: 4000, aiTokensMonth: 20000 };
export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Paketsiz",
    priceAzn: 0,
    summary: "Profil yaradırsınız və hər şeyi özünüz edirsiniz.",
    features: ["Profil və CV yaratma", "Vakansiyalara özünüz müraciət", "Qaydalara əsaslanan CV qiymətləndirməsi", "Ayda təxminən 5 AI CV analizi"],
    limits: { ...none, aiAccess: true, cvAnalysesPerDay: 1 },
  },
  {
    id: "basic",
    name: "Sadə",
    priceAzn: 3,
    summary: "Seçdiyiniz şirkətlərin yeni vakansiyaları e-poçtunuza (və nömrə versəniz, telefonunuza) gəlir.",
    features: ["Seçilmiş şirkətlərin vakansiyaları e-poçtla", "Telefon nömrəsi varsa mesajla"],
    limits: { ...none, aiAccess: true, cvAnalysesPerDay: 2, cvFixesPerDay: 1, digestEmail: true, digestSms: true, aiTokensWindow: 4000, aiTokensMonth: 219000 },
  },
  {
    id: "plus-5",
    name: "Plus 5",
    priceAzn: 5,
    summary: "İşçi tərəfinin bütün imkanları, günlük 5 şirkətə AI müraciəti.",
    features: ["Süni intellekt günlük 5 şirkətə CV göndərir", "Gündə 1 AI CV analizi", "Gündə 1 ATS təklifləri ilə CV düzəlişi", "Sadə paketin bütün imkanları"],
    limits: { aiAccess: true, aiApplyPerDay: 5, cvAnalysesPerDay: 1, cvFixesPerDay: 1, digestEmail: true, digestSms: true, aiTokensWindow: 5000, aiTokensMonth: 366000 },
  },
  {
    id: "plus-7",
    name: "Plus 7",
    priceAzn: 7,
    summary: "Günlük 5 şirkətə AI müraciəti, 5 analiz və 5 CV düzəlişi.",
    features: ["Süni intellekt günlük 5 şirkətə CV göndərir", "Gündə 5 AI CV analizi", "Gündə 5 ATS təklifləri ilə CV düzəlişi", "Sadə paketin bütün imkanları"],
    limits: { aiAccess: true, aiApplyPerDay: 5, cvAnalysesPerDay: 5, cvFixesPerDay: 5, digestEmail: true, digestSms: true, aiTokensWindow: 10000, aiTokensMonth: 705000 },
  },
  {
    id: "plus-10",
    name: "Plus 10",
    priceAzn: 10,
    summary: "Günlük 20 şirkətə AI müraciəti, 20 analiz və 10 CV düzəlişi.",
    features: ["Süni intellekt günlük 20 şirkətə CV göndərir", "Gündə 20 AI CV analizi", "Gündə 10 ATS təklifləri ilə CV düzəlişi", "Sadə paketin bütün imkanları"],
    limits: { aiAccess: true, aiApplyPerDay: 20, cvAnalysesPerDay: 20, cvFixesPerDay: 10, digestEmail: true, digestSms: true, aiTokensWindow: 14000, aiTokensMonth: 1000000 },
  },
  {
    id: "premium",
    name: "Premium",
    priceAzn: 19,
    summary: "Ən geniş AI imkanları: günlük 30 şirkətə AI müraciəti və yüksək analiz limiti.",
    features: ["Süni intellekt günlük 30 şirkətə CV göndərir", "Gündə 30 AI CV analizi", "Gündə 15 ATS təklifləri ilə CV düzəlişi", "Ayda təxminən 550 tam AI CV analizi", "Plus 10 paketinin bütün imkanları"],
    limits: { aiAccess: true, aiApplyPerDay: 30, cvAnalysesPerDay: 30, cvFixesPerDay: 15, digestEmail: true, digestSms: true, aiTokensWindow: 29000, aiTokensMonth: 2090000 },
  },
];
export const planById = (id: string) => PLANS.find((p) => p.id === id) || null;
export const FREE_PLAN = PLANS[0];

export type SubscriptionRow = {
  planId: string;
  status: string; // active | cancelled | expired
  periodEnd: string; // ISO timestamp
  autoRenew: boolean;
};

// The plan a subscription gives right now. An ended subscription is the free plan.
export function effectivePlan(sub: SubscriptionRow | null, now = new Date()): Plan {
  if (!sub || sub.status === "expired") return FREE_PLAN;
  if (Date.parse(sub.periodEnd) <= now.getTime()) return FREE_PLAN;
  return planById(sub.planId) || FREE_PLAN;
}
export function addPeriod(from: string | Date, days = PLAN_PERIOD_DAYS) {
  return new Date(new Date(from).getTime() + days * 86_400_000).toISOString();
}
// A subscription that should renew now: its period ended and auto-renewal is on.
export function dueForRenewal(sub: SubscriptionRow | null, now = new Date()) {
  return !!sub && sub.status === "active" && Date.parse(sub.periodEnd) <= now.getTime() && sub.autoRenew;
}
export const azn = (cents: number) => `${(cents / 100).toLocaleString("az-AZ", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} AZN`;
