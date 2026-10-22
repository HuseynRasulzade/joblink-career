// Packages, subscription state and the payment helpers.
import test from "node:test";
import assert from "node:assert/strict";
import { FREE_PLAN, PLANS, addPeriod, dueForRenewal, effectivePlan, planById } from "../lib/plans.ts";
import { cardBrand, cardLabel, luhn, mockProvider, parseCard, providerFor } from "../lib/payments.ts";

test("the catalog matches the agreed packages", () => {
  assert.deepEqual(PLANS.map((p) => [p.id, p.priceAzn]), [["free", 0], ["basic", 3], ["plus-5", 5], ["plus-7", 7], ["plus-10", 10]]);
  assert.deepEqual(PLANS.map((p) => p.limits.aiApplyPerDay), [0, 0, 5, 5, 20]);
  assert.deepEqual(PLANS.map((p) => p.limits.cvAnalysesPerDay), [0, 0, 1, 5, 20]);
  assert.deepEqual(PLANS.map((p) => p.limits.cvFixesPerDay), [0, 0, 1, 5, 10]);
  assert.equal(PLANS.find((p) => p.id === "basic").limits.aiAccess, false);
  assert.ok(PLANS.filter((p) => p.id.startsWith("plus")).every((p) => p.limits.aiAccess));
  assert.equal(planById("nope"), null);
});

test("an ended or missing subscription falls back to the free plan", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const sub = (over) => ({ planId: "plus-7", status: "active", periodEnd: "2026-11-20T00:00:00Z", autoRenew: true, ...over });
  assert.equal(effectivePlan(null, now).id, "free");
  assert.equal(effectivePlan(sub({}), now).id, "plus-7");
  assert.equal(effectivePlan(sub({ periodEnd: "2026-11-10T11:59:59Z" }), now).id, "free");
  assert.equal(effectivePlan(sub({ status: "expired" }), now).id, "free");
  assert.equal(effectivePlan(sub({ planId: "unknown" }), now), FREE_PLAN);
  // A cancelled subscription keeps its plan until the paid period ends.
  assert.equal(effectivePlan(sub({ status: "cancelled" }), now).id, "plus-7");
});

test("renewal is due only for an active, auto-renewing subscription whose period ended", () => {
  const now = new Date("2026-11-10T12:00:00Z");
  const ended = { planId: "plus-5", status: "active", periodEnd: "2026-11-01T00:00:00Z", autoRenew: true };
  assert.equal(dueForRenewal(ended, now), true);
  assert.equal(dueForRenewal({ ...ended, autoRenew: false }, now), false);
  assert.equal(dueForRenewal({ ...ended, status: "cancelled" }, now), false);
  assert.equal(dueForRenewal({ ...ended, periodEnd: "2026-12-01T00:00:00Z" }, now), false);
  assert.equal(dueForRenewal(null, now), false);
  assert.equal(addPeriod("2026-11-01T00:00:00.000Z"), "2026-12-01T00:00:00.000Z");
});

test("card numbers are validated and only brand, last four and expiry are kept", () => {
  assert.equal(luhn("4242424242424242"), true);
  assert.equal(luhn("4242424242424241"), false);
  assert.equal(cardBrand("4242424242424242"), "Visa");
  assert.equal(cardBrand("5555555555554444"), "Mastercard");
  const now = new Date("2026-11-10T00:00:00Z");
  const ok = parseCard({ number: "4242 4242 4242 4242", expMonth: 12, expYear: 28, holder: "A B" }, now);
  assert.deepEqual(ok.card, { brand: "Visa", last4: "4242", expMonth: 12, expYear: 2028 });
  assert.equal(JSON.stringify(ok).includes("4242424242424242"), false);
  assert.equal(cardLabel(ok.card), "Visa •••• 4242");
  assert.match(parseCard({ number: "1234", expMonth: 1, expYear: 2030 }, now).error, /nömrəsi/);
  assert.match(parseCard({ number: "4242424242424242", expMonth: 13, expYear: 2030 }, now).error, /tarixi/);
  assert.match(parseCard({ number: "4242424242424242", expMonth: 10, expYear: 2026 }, now).error, /bitib/);
  assert.equal(parseCard({ number: "4242424242424242", expMonth: 11, expYear: 2026 }, now).error, "");
});

test("the mock provider charges, declines the test decline card and is the only provider", () => {
  const good = mockProvider.tokenize({ brand: "Visa", last4: "4242", expMonth: 1, expYear: 2030 });
  const bad = mockProvider.tokenize({ brand: "Visa", last4: "0002", expMonth: 1, expYear: 2030 });
  assert.equal(mockProvider.charge({ token: good, amountCents: 500, currency: "AZN", description: "x" }).ok, true);
  const declined = mockProvider.charge({ token: bad, amountCents: 500, currency: "AZN", description: "x" });
  assert.equal(declined.ok, false);
  assert.match(declined.error, /qəbul etmədi/);
  assert.equal(providerFor(undefined)?.name, "mock");
  assert.equal(providerFor("stripe"), null);
});
