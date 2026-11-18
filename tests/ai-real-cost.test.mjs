import test from "node:test";
import assert from "node:assert/strict";
import { mergePrices, rowCost, summarizeAiUsage } from "../lib/ai-cost.ts";

test("real provider tokens are priced exactly, the rest is estimated", () => {
  // 1M input (400k of it cached) and 100k output on OpenAI: 0.6M*1.5 + 0.4M*0.15 + 0.1M*10 = 0.9 + 0.06 + 1 = 1.96
  const real = rowCost({ day: "d", feature: "f", provider: "openai", user_id: "", calls: 2, chars_in: 8_000_000, chars_out: 800_000, errors: 0, tokens_in: 1_000_000, tokens_out: 100_000, tokens_cached: 400_000, measured: 2 });
  assert.equal(Math.round(real.cost * 1000) / 1000, 1.96);
  assert.equal(real.tokens, 1_100_000);
  // One of two calls is measured: half of the cost is real (1M input tokens = 0.3), half from the character estimate (2M chars = 0.5M tokens = 0.15).
  const mixed = rowCost({ day: "d", feature: "f", provider: "deepseek", user_id: "", calls: 2, chars_in: 4_000_000, chars_out: 0, errors: 0, tokens_in: 1_000_000, tokens_out: 0, tokens_cached: 0, measured: 1 });
  assert.equal(Math.round(mixed.cost * 1000) / 1000, 0.45);
  const s = summarizeAiUsage([{ day: "d", feature: "f", provider: "openai", user_id: "", calls: 4, chars_in: 1, chars_out: 1, errors: 0, tokens_in: 100, tokens_out: 100, tokens_cached: 0, measured: 1 }]);
  assert.equal(s.total.realShare, 25);
});

test("old rows without token columns are still an estimate", () => {
  const r = rowCost({ day: "d", feature: "f", provider: "deepseek", user_id: "", calls: 1, chars_in: 4_000_000, chars_out: 0, errors: 0 });
  assert.equal(Math.round(r.cost * 100) / 100, 0.3);
  assert.equal(r.measuredCalls, 0);
});

test("admin prices override the defaults and bad values are ignored", () => {
  const p = mergePrices({ openai: { input: 2, output: "x", cachedInput: -5 }, newco: { input: 1, cachedInput: 0.1, output: 3 } });
  assert.equal(p.openai.input, 2);
  assert.equal(p.openai.output, 10);
  assert.equal(p.openai.cachedInput, 0.15);
  assert.equal(p.newco.output, 3);
});
