import test from "node:test";
import assert from "node:assert/strict";
import { checkoutFor, sandboxCheckout, abbCheckout } from "../lib/payments.ts";

const input = { orderId: "11111111-2222-3333-4444-555555555555", amountCents: 500, currency: "AZN", description: "JobMatch Plus 5", origin: "https://example.test", returnUrl: "https://example.test/?payment=x" };

test("the test bank is used until a real bank is set up", () => {
  assert.equal(checkoutFor(undefined), sandboxCheckout);
  assert.equal(checkoutFor(""), sandboxCheckout);
  assert.equal(checkoutFor("mock"), sandboxCheckout);
  assert.equal(checkoutFor("abb"), abbCheckout);
});

test("the test bank sends the buyer to a page of the site, with the order in the address", () => {
  const made = sandboxCheckout.createCheckout(input);
  assert.ok("url" in made);
  assert.equal(made.url, "https://example.test/api/joblink/pay/sandbox?order=11111111-2222-3333-4444-555555555555");
});

test("ABB says plainly that it is not set up yet and sends nothing", () => {
  const made = abbCheckout.createCheckout(input);
  assert.ok("error" in made);
  assert.match(made.error, /ABB/);
  assert.equal(abbCheckout.verifyCallback({}).paid, false);
});
