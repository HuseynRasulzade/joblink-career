import test from "node:test";
import assert from "node:assert/strict";
import { tokenVerdict, tokensLeft, windowIndex, windowResetAt, windowKey, tokensOfChars } from "../lib/ai-tokens.ts";
import { PLANS, planById } from "../lib/plans.ts";

const limits = { window: 5000, month: 20000 };
const now = new Date("2026-11-15T12:30:00Z");

test("the 5-hour balance and the monthly ceiling both have to have something left", () => {
  assert.deepEqual(tokenVerdict(limits, { window: 0, month: 0 }, now), { ok: true });
  const w = tokenVerdict(limits, { window: 5000, month: 6000 }, now);
  assert.equal(w.ok, false);
  assert.equal(w.reason, "window");
  assert.ok(Date.parse(w.resetAt) > now.getTime() && Date.parse(w.resetAt) - now.getTime() <= 5 * 3_600_000);
  const m = tokenVerdict(limits, { window: 100, month: 20000 }, now);
  assert.equal(m.reason, "month");
  assert.equal(m.resetAt, "2026-12-01T00:00:00.000Z");
});

test("the balance starts again every 5 hours", () => {
  const a = new Date("2026-11-15T12:30:00Z");
  const later = new Date(windowResetAt(a));
  assert.notEqual(windowKey(a), windowKey(later));
  assert.equal(windowIndex(later), windowIndex(a) + 1);
});

test("what is left is the smaller of the two balances", () => {
  assert.deepEqual(tokensLeft(limits, { window: 1000, month: 19000 }), { window: 1000, month: 1000 });
  assert.deepEqual(tokensLeft(limits, { window: 0, month: 0 }), { window: 5000, month: 20000 });
});

test("tokens are counted by four characters", () => {
  assert.equal(tokensOfChars(4000), 1000);
  assert.equal(tokensOfChars(5), 2);
});

test("every candidate package has a window and a ceiling, and a window holds at least one full analysis", () => {
  assert.ok(planById("premium"));
  for (const p of PLANS) {
    assert.ok(p.limits.aiTokensWindow > 0 && p.limits.aiTokensMonth >= p.limits.aiTokensWindow, p.id);
    assert.ok(p.limits.aiTokensWindow >= 3800, `${p.id}: a window holds a full analysis`);
  }
  // The ceilings grow with the price.
  const paid = PLANS.slice().sort((a, b) => a.priceAzn - b.priceAzn);
  for (let i = 1; i < paid.length; i++) assert.ok(paid[i].limits.aiTokensMonth >= paid[i - 1].limits.aiTokensMonth, paid[i].id);
});

test("the monthly ceiling of a package keeps the net profit target (OpenAI price, worst case)", () => {
  const target = { basic: 0.4, "plus-5": 0.4, "plus-7": 0.25, "plus-10": 0.25, premium: 0.2 };
  const perToken = 5.44 / 1_000_000;
  for (const [id, want] of Object.entries(target)) {
    const p = planById(id);
    const net = (p.priceAzn * (1 - 18 / 118 - 0.05) - p.limits.aiTokensMonth * perToken) / p.priceAzn;
    assert.ok(net >= want - 0.01, `${id}: ${net.toFixed(3)} >= ${want}`);
  }
});
