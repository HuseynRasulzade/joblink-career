// Which fit score each audience uses is an admin choice. "rules" is the fast,
// free rule-based percentage; "ai" is the AI rating (the rule score stays as the fallback).
export type MatchingMode = "rules" | "ai";
export type MatchingSettings = {
  candidate: MatchingMode;
  employer: MatchingMode;
  autoApply: MatchingMode;
  // How many of the best rule-ranked vacancies the AI rates automatically for one CV.
  autoJobs: number;
  // Vacancies below this rule score are not sent to the AI at all.
  minRuleScore: number;
  // New AI ratings one candidate may trigger per day; 0 means no limit yet.
  dailyAiRatings: number;
};

export const MATCHING_KEY = "matching";
export const DEFAULT_MATCHING: MatchingSettings = {
  candidate: "rules",
  employer: "rules",
  autoApply: "rules",
  autoJobs: 20,
  minRuleScore: 25,
  dailyAiRatings: 0,
};

const mode = (value: unknown, fallback: MatchingMode): MatchingMode => (value === "ai" || value === "rules" ? value : fallback);
const whole = (value: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

export function normalizeMatching(value: unknown): MatchingSettings {
  const v = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    candidate: mode(v.candidate, DEFAULT_MATCHING.candidate),
    employer: mode(v.employer, DEFAULT_MATCHING.employer),
    autoApply: mode(v.autoApply, DEFAULT_MATCHING.autoApply),
    autoJobs: whole(v.autoJobs, 1, 50, DEFAULT_MATCHING.autoJobs),
    minRuleScore: whole(v.minRuleScore, 0, 90, DEFAULT_MATCHING.minRuleScore),
    dailyAiRatings: whole(v.dailyAiRatings, 0, 1000, DEFAULT_MATCHING.dailyAiRatings),
  };
}

// The rating is reused while this hash stays the same: it covers only what the AI
// sees (CV facts and vacancy content), so a changed phone number does not re-run it
// but a new skill, role or vacancy requirement does.
export async function ratingHash(input: unknown, version: string) {
  const bytes = new TextEncoder().encode(`${version}\n${JSON.stringify(input)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
