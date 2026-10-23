import test from "node:test";
import assert from "node:assert/strict";
import { estimateCost, summarizeAiUsage, tokensOf } from "../lib/ai-cost.ts";

test("tokens are about four characters and cost follows the provider price", () => {
  assert.equal(tokensOf(401), 101);
  assert.equal(estimateCost("deepseek", 4_000_000, 0), 0.3);
  assert.equal(estimateCost("openai", 0, 400_000), 1);
});

test("usage is summed per feature, day, provider and person", () => {
  const row = (day, feature, provider, user_id, calls, chars_in, chars_out, errors = 0) => ({ day, feature, provider, user_id, calls, chars_in, chars_out, errors });
  const s = summarizeAiUsage(
    [row("2026-10-22", "cv-parse", "openai", "u1", 2, 40000, 8000), row("2026-10-23", "cv-parse", "openai", "u2", 1, 20000, 4000, 1), row("2026-10-23", "assistant", "deepseek", "", 5, 10000, 5000)],
    new Map([["u1", "Aysel (namizəd)"]]),
  );
  assert.equal(s.total.calls, 8);
  assert.equal(s.total.errors, 1);
  assert.equal(s.byFeature[0].feature, "cv-parse");
  assert.equal(s.byFeature.find((f) => f.feature === "assistant").calls, 5);
  assert.deepEqual(s.byDay.map((d) => d.day), ["2026-10-23", "2026-10-22"]);
  assert.deepEqual(s.byUser.map((u) => u.user), ["Aysel (namizəd)", "Silinmiş hesab"]);
  assert.equal(s.byProvider.length, 2);
});
