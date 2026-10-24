import test from "node:test";
import assert from "node:assert/strict";
import { describeSettingChanges } from "../lib/matching-settings.ts";

test("only changed settings are listed", () => {
  const before = { candidate: "rules", employer: "rules", autoApply: "rules", autoJobs: 10, minRuleScore: 40, dailyAiRatings: 0 };
  const after = { ...before, candidate: "ai", dailyAiRatings: 50 };
  assert.deepEqual(describeSettingChanges(before, after), ["Namizəd üçün bal rejimi: rules → ai", "Gündəlik AI limiti: 0 → 50"]);
  assert.deepEqual(describeSettingChanges(before, { ...before }), []);
});
