// Keeping the AI affordable and visible: a monthly spending limit, and a record
// of whether the provider is answering (an empty balance or a wrong key must be
// seen by the admin, while people only get a plain explanation).
import { estimateCost } from "./ai-cost.ts";

export const AI_BUDGET_KEY = "ai_budget";
export const AI_HEALTH_KEY = "ai_health";

// The AI is used for two separate things and each has its own limit, its own spend and, if wished, its own model:
// «cv» = what a candidate does with a CV (reading, analysis, rewriting, matching, career advice),
// «vacancy» = what an employer does with vacancies (drafting a vacancy, ranking candidates, tests, document checks).
export type AiArea = "cv" | "vacancy" | "other";
export const AI_AREAS = ["cv", "vacancy"] as const;
export const AI_AREA_LABEL: Record<AiArea, string> = { cv: "CV (namizəd tərəfi)", vacancy: "Vakansiya (işəgötürən tərəfi)", other: "Digər" };
export const AI_AREA_BUDGET_KEY: Record<"cv" | "vacancy", string> = { cv: "ai_budget_cv", vacancy: "ai_budget_vacancy" };
const CV_FEATURES = new Set(["cv-parse", "cv-visual", "cv-audit", "cv-analysis", "cv-rewrite", "cv-fix", "profile-summary", "fit-review", "career-advice", "rank-jobs", "assistant", "auto-apply"]);
const VACANCY_FEATURES = new Set(["vacancy-draft", "hr-rank5", "test-parse", "doc-check", "job-title-map"]);
// A feature name may carry a language and a version after a colon (“cv-analysis:az:4”).
export function aiAreaOf(feature: string): AiArea {
  const name = String(feature || "").split(":")[0];
  if (CV_FEATURES.has(name) || name.startsWith("cv-")) return "cv";
  if (VACANCY_FEATURES.has(name) || name.startsWith("vacancy-")) return "vacancy";
  return "other";
}

export type BudgetLevel = "off" | "ok" | "warn" | "over";
export function budgetState(monthlyUsd: number, spentUsd: number) {
  const limit = monthlyUsd > 0 ? monthlyUsd : 0;
  const percent = limit ? Math.round((spentUsd / limit) * 100) : 0;
  const level: BudgetLevel = !limit ? "off" : percent >= 100 ? "over" : percent >= 80 ? "warn" : "ok";
  return { limit, spent: Math.round(spentUsd * 100) / 100, percent, level };
}

export type AiFailure = "credit" | "rate" | "key" | "other";
// What a refused request means, from the provider's status and short error code.
export function classifyAiFailure(status: number, code: string): AiFailure {
  const c = code.toLowerCase();
  if (/credit|quota|billing|insufficient|balance/.test(c) || status === 402) return "credit";
  if (status === 401 || status === 403 || /invalid_api_key|incorrect_api_key|auth/.test(c)) return "key";
  if (status === 429 || /rate/.test(c)) return "rate";
  return "other";
}
// What people see: never the provider's code.
export function friendlyAiMessage(kind: AiFailure) {
  if (kind === "credit" || kind === "key")
    return "AI xidməti müvəqqəti əlçatmazdır. Qaydalarla hesablanmış nəticə göstərilir. Problem davam edərsə, administrator məlumatlandırılıb.";
  if (kind === "rate") return "AI xidməti hazırda çox yüklənib. Bir azdan yenidən sınayın.";
  return "AI xidməti hazırda cavab vermir. Bir az sonra yenidən sınayın.";
}
export const BUDGET_EXCEEDED_MESSAGE =
  "AI-nin aylıq xərc limiti dolub. Qaydalarla hesablanmış nəticə göstərilir; limiti administrator dəyişə bilər.";

export type AiHealth = { state: "ok" | AiFailure; code: string; at: string };
export const ADMIN_HEALTH_TEXT: Record<AiFailure, string> = {
  credit: "AI hesabında kredit bitib. Provayderin Billing bölməsində balansı doldurun.",
  key: "AI açarı qəbul edilmir. Açarı və hansı layihəyə aid olduğunu yoxlayın.",
  rate: "AI provayderi sorğuları məhdudlaşdırır (çox sorğu). Bir müddət sonra düzələ bilər.",
  other: "AI provayderi cavab vermir.",
};

type Db = D1Database;
async function readSetting(db: Db, key: string) {
  const row = await db.prepare("SELECT value FROM app_settings WHERE key=?").bind(key).first<{ value: string }>().catch(() => null);
  try {
    return row ? JSON.parse(row.value) : null;
  } catch {
    return null;
  }
}
async function writeSetting(db: Db, key: string, value: unknown) {
  await db
    .prepare("INSERT INTO app_settings(key,value,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated=excluded.updated")
    .bind(key, JSON.stringify(value), new Date().toISOString())
    .run();
}
export async function readAiBudget(db: Db): Promise<number> {
  const value = await readSetting(db, AI_BUDGET_KEY);
  const usd = Number(value?.monthlyUsd);
  return Number.isFinite(usd) && usd > 0 ? Math.min(100000, usd) : 0;
}
export const writeAiBudget = (db: Db, monthlyUsd: number) =>
  writeSetting(db, AI_BUDGET_KEY, { monthlyUsd: Math.max(0, Math.min(100000, Math.round(monthlyUsd * 100) / 100)) });
export async function readAiHealth(db: Db): Promise<AiHealth> {
  const value = await readSetting(db, AI_HEALTH_KEY);
  return value && typeof value.state === "string" ? (value as AiHealth) : { state: "ok", code: "", at: "" };
}
export const writeAiHealth = (db: Db, health: AiHealth) => writeSetting(db, AI_HEALTH_KEY, health);

export async function readAreaBudget(db: Db, area: "cv" | "vacancy"): Promise<number> {
  const value = await readSetting(db, AI_AREA_BUDGET_KEY[area]);
  const usd = Number(value?.monthlyUsd);
  return Number.isFinite(usd) && usd > 0 ? Math.min(100000, usd) : 0;
}
export const writeAreaBudget = (db: Db, area: "cv" | "vacancy", monthlyUsd: number) =>
  writeSetting(db, AI_AREA_BUDGET_KEY[area], { monthlyUsd: Math.max(0, Math.min(100000, Math.round(monthlyUsd * 100) / 100)) });

// Estimated spend since the start of the month for each area, from the usage counters.
export async function monthSpendByArea(db: Db, now = new Date()): Promise<Record<AiArea, number>> {
  const start = `${now.toISOString().slice(0, 7)}-01`;
  const rows = await db
    .prepare("SELECT feature,provider,SUM(chars_in) AS chars_in,SUM(chars_out) AS chars_out FROM ai_usage WHERE day>=? GROUP BY feature,provider")
    .bind(start)
    .all<{ feature: string; provider: string; chars_in: number; chars_out: number }>()
    .catch(() => ({ results: [] as { feature: string; provider: string; chars_in: number; chars_out: number }[] }));
  const out: Record<AiArea, number> = { cv: 0, vacancy: 0, other: 0 };
  for (const r of rows.results) out[aiAreaOf(r.feature)] += estimateCost(r.provider, Number(r.chars_in) || 0, Number(r.chars_out) || 0);
  return out;
}

// Estimated spend since the start of the month, from the usage counters.
export async function monthSpendUsd(db: Db, now = new Date()) {
  const start = `${now.toISOString().slice(0, 7)}-01`;
  const rows = await db
    .prepare("SELECT provider,SUM(chars_in) AS chars_in,SUM(chars_out) AS chars_out FROM ai_usage WHERE day>=? GROUP BY provider")
    .bind(start)
    .all<{ provider: string; chars_in: number; chars_out: number }>()
    .catch(() => ({ results: [] as { provider: string; chars_in: number; chars_out: number }[] }));
  return rows.results.reduce((sum, r) => sum + estimateCost(r.provider, Number(r.chars_in) || 0, Number(r.chars_out) || 0), 0);
}
