// AI limits of the packages, editable by the administrator. The defaults live in the code (`lib/plans.ts`, `lib/ai-packages.ts`);
// what the admin saves is kept in `app_settings` ("package_limits") and is applied over the defaults, in place, so everything that
// reads a package (limits, the packages page, the monthly quotas) sees the new numbers.
import { PLANS, type PlanLimits } from "./plans.ts";
import { COMPANY_AI_PACKAGES } from "./ai-packages.ts";

export const PACKAGE_LIMITS_KEY = "package_limits";
export const CANDIDATE_LIMIT_KEYS = ["aiApplyPerDay", "cvAnalysesPerDay", "cvFixesPerDay", "aiTokensWindow", "aiTokensMonth"] as const;
export const COMPANY_LIMIT_KEYS = ["fullPerMonth", "rankPerMonth"] as const;
export type CandidateKey = (typeof CANDIDATE_LIMIT_KEYS)[number];
export type CompanyKey = (typeof COMPANY_LIMIT_KEYS)[number];
export type PackageOverrides = { candidate?: Record<string, Partial<Record<CandidateKey, number>>>; company?: Record<string, Partial<Record<CompanyKey, number>>> };

export const MAX_LIMIT = 100_000_000;
// One full CV analysis is about 3 800 tokens: the free and premium package texts quote the monthly number of analyses.
export const TOKENS_PER_ANALYSIS = 3800;

// Defaults are captured once, before any override is applied.
const DEFAULT_LIMITS = new Map(PLANS.map((p) => [p.id as string, { ...p.limits } as PlanLimits]));
const DEFAULT_TEXT = new Map(PLANS.map((p) => [p.id as string, { summary: p.summary, features: [...p.features] }]));
const DEFAULT_COMPANY = new Map(COMPANY_AI_PACKAGES.map((p) => [p.id, { fullPerMonth: p.fullPerMonth, rankPerMonth: p.rankPerMonth }]));

export const defaultCandidateLimits = (id: string) => DEFAULT_LIMITS.get(id) || null;
export const defaultCompanyLimits = (id: string) => DEFAULT_COMPANY.get(id) || null;

const cleanNumber = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= MAX_LIMIT ? Math.round(n) : null;
};

// Keeps only known packages, known limits and sane numbers.
export function normalizeOverrides(input: unknown): PackageOverrides {
  const out: PackageOverrides = {};
  const src = (input && typeof input === "object" ? input : {}) as PackageOverrides;
  for (const [id, values] of Object.entries(src.candidate || {})) {
    if (!DEFAULT_LIMITS.has(id)) continue;
    const row: Partial<Record<CandidateKey, number>> = {};
    for (const key of CANDIDATE_LIMIT_KEYS) {
      const n = cleanNumber((values as Record<string, unknown>)?.[key]);
      if (n !== null) row[key] = n;
    }
    if (Object.keys(row).length) (out.candidate ||= {})[id] = row;
  }
  for (const [id, values] of Object.entries(src.company || {})) {
    if (!DEFAULT_COMPANY.has(id)) continue;
    const row: Partial<Record<CompanyKey, number>> = {};
    for (const key of COMPANY_LIMIT_KEYS) {
      const n = cleanNumber((values as Record<string, unknown>)?.[key]);
      if (n !== null) row[key] = n;
    }
    if (Object.keys(row).length) (out.company ||= {})[id] = row;
  }
  return out;
}

// The texts of a package quote its numbers ("Gündə 5 AI CV analizi"): they follow the limits.
function refreshText(id: string) {
  const plan = PLANS.find((p) => p.id === id);
  const base = DEFAULT_TEXT.get(id);
  if (!plan || !base) return;
  const l = plan.limits;
  const fix = (text: string) =>
    text
      .replace(/(günlük )\d+( şirkətə (?:CV göndərir|AI müraciəti))/i, `$1${l.aiApplyPerDay}$2`)
      .replace(/(Gündə )\d+( AI CV analizi)/, `$1${l.cvAnalysesPerDay}$2`)
      .replace(/(Gündə )\d+( ATS təklifləri ilə CV düzəlişi)/, `$1${l.cvFixesPerDay}$2`)
      .replace(/(Ayda təxminən )\d+( (?:tam )?AI CV analizi)/, `$1${Math.round(l.aiTokensMonth / TOKENS_PER_ANALYSIS)}$2`);
  plan.summary = fix(base.summary);
  plan.features = base.features.map(fix);
}

// Puts the defaults back and applies the overrides on top, in place.
export function applyPackageOverrides(stored: unknown) {
  const ov = normalizeOverrides(stored);
  for (const plan of PLANS) {
    Object.assign(plan.limits, DEFAULT_LIMITS.get(plan.id), ov.candidate?.[plan.id] || {});
    refreshText(plan.id);
  }
  for (const pkg of COMPANY_AI_PACKAGES) {
    Object.assign(pkg, DEFAULT_COMPANY.get(pkg.id), ov.company?.[pkg.id] || {});
  }
  return ov;
}

type Db = D1Database;
let loadedAt = 0;
// Reads the saved limits at most once a minute per server instance (and always after the admin saves).
export async function loadPackageOverrides(db: Db, force = false) {
  if (!force && Date.now() - loadedAt < 60_000) return;
  loadedAt = Date.now();
  try {
    const row = await db.prepare("SELECT value FROM app_settings WHERE key=?").bind(PACKAGE_LIMITS_KEY).first<{ value: string }>();
    applyPackageOverrides(row ? JSON.parse(row.value) : null);
  } catch {
    // No saved limits (or the table is not there yet): the defaults stay.
  }
}
export async function savePackageOverrides(db: Db, input: unknown) {
  const ov = normalizeOverrides(input);
  await db
    .prepare("INSERT INTO app_settings(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated")
    .bind(PACKAGE_LIMITS_KEY, JSON.stringify(ov), new Date().toISOString())
    .run();
  applyPackageOverrides(ov);
  loadedAt = Date.now();
  return ov;
}
