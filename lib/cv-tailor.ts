// A CV view for one vacancy: skills the vacancy asks for come first. Nothing is added, removed or reworded,
// so the candidate sends the same facts in the order that matters to this employer.
import { match, type Job, type Profile } from "./model.ts";
import { normalizeSkillKey } from "./skill-catalog.ts";

export type Tailored = { profile: Profile; matched: string[]; missing: string[]; score: number };

export function tailorProfile(profile: Profile, job: Job): Tailored {
  const result = match(profile, job);
  const wanted = new Set([...result.matched, ...job.skills].map(normalizeSkillKey));
  const first = profile.skills.filter((skill) => wanted.has(normalizeSkillKey(skill)));
  const rest = profile.skills.filter((skill) => !wanted.has(normalizeSkillKey(skill)));
  return { profile: { ...profile, skills: [...first, ...rest] }, matched: result.matched, missing: result.missing, score: result.score };
}
