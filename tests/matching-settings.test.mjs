import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_MATCHING, normalizeMatching, ratingHash } from "../lib/matching-settings.ts";

test("settings fall back to safe defaults and are clamped", () => {
  assert.deepEqual(normalizeMatching(null), DEFAULT_MATCHING);
  const s = normalizeMatching({ candidate: "ai", employer: "x", autoApply: "ai", autoJobs: 999, minRuleScore: -4, dailyAiRatings: "7" });
  assert.equal(s.candidate, "ai");
  assert.equal(s.employer, "rules");
  assert.equal(s.autoApply, "ai");
  assert.equal(s.autoJobs, 50);
  assert.equal(s.minRuleScore, 0);
  assert.equal(s.dailyAiRatings, 7);
});
test("the rating hash changes only with the content the AI sees", async () => {
  const base = { cv: { skills: ["Excel"], roles: ["Mühasib"] }, job: { title: "Baş mühasib" } };
  const same = await ratingHash(base, "v1");
  assert.equal(same, await ratingHash(structuredClone(base), "v1"));
  assert.notEqual(same, await ratingHash({ ...base, cv: { skills: ["Excel", "1C"], roles: ["Mühasib"] } }, "v1"));
  assert.notEqual(same, await ratingHash({ ...base, job: { title: "Mühasib" } }, "v1"));
  assert.notEqual(same, await ratingHash(base, "v2"));
});
