import test from "node:test";
import assert from "node:assert/strict";
import { describeSettingChanges } from "../lib/matching-settings.ts";

test("only changed settings are listed", () => {
  const before = { candidate: "rules", employer: "rules", autoApply: "rules", autoJobs: 10, minRuleScore: 40, dailyAiRatings: 0 };
  const after = { ...before, candidate: "ai", dailyAiRatings: 50 };
  assert.deepEqual(describeSettingChanges(before, after), ["Namizəd üçün bal rejimi: rules → ai", "Gündəlik AI limiti: 0 → 50"]);
  assert.deepEqual(describeSettingChanges(before, { ...before }), []);
});

test("support first-reply time and waiting requests", async () => {
  const { supportSla } = await import("../lib/support-topics.ts");
  const now = new Date("2026-10-24T12:00:00Z");
  const s = supportSla([
    { created: "2026-10-24T00:00:00Z", firstReply: "2026-10-24T02:00:00Z" },
    { created: "2026-10-23T00:00:00Z", firstReply: "2026-10-23T04:00:00Z" },
    { created: "2026-10-23T12:00:00Z", firstReply: null },
  ], now);
  assert.deepEqual(s, { answered: 2, unanswered: 1, avgFirstReplyHours: 3, oldestWaitingHours: 24 });
  assert.equal(supportSla([], now).avgFirstReplyHours, null);
});

test("waiting time of a verification item", async () => {
  const { waitingDays, waitingLabel } = await import("../lib/review-queue.ts");
  const now = new Date("2026-10-24T12:00:00Z");
  assert.equal(waitingDays("2026-10-21T13:00:00Z", now), 2);
  assert.equal(waitingLabel("2026-10-24T01:00:00Z", now), "bu gün");
  assert.equal(waitingLabel("2026-10-20T00:00:00Z", now), "4 gün gözləyir");
  assert.equal(waitingDays("not a date", now), 0);
});
