import test from "node:test";
import assert from "node:assert/strict";
import { signedOrderNotice } from "../lib/orders.ts";
import { categoryOfType, emailAllowedFor, emailTypeOf, sanitizeEmailOff, shouldEmail, workplaceMailMuted } from "../lib/notification-prefs.ts";

test("the signed-order notice names the kind and number, and nothing else about the order", () => {
  const notice = signedOrderNotice({ kind: "extend", number: "ZZ-N1" });
  assert.equal(notice.title, "Sizin barənizdə əmr imzalandı (№ ZZ-N1)");
  assert.match(notice.body, /müddətinin uzadılması/);
  assert.equal(notice.link, "workplace");
  assert.equal(notice.type, "application");
  // no amounts or reasons travel in the notice
  assert.doesNotMatch(notice.body, /AZN|\d{3,}/);
});

test("an order without a number or with an unknown kind still gives a readable notice", () => {
  assert.equal(signedOrderNotice({ kind: "extend" }).title, "Sizin barənizdə əmr imzalandı");
  assert.match(signedOrderNotice({ kind: "no-such-kind", number: "7" }).body, /^Əmr\./);
});

test("the signed-order notice is e-mailed, in the employee-page category", () => {
  const notice = signedOrderNotice({ kind: "vacation", number: "12" });
  assert.equal(emailTypeOf(notice.type, notice.link), "workplace");
  assert.equal(categoryOfType(emailTypeOf(notice.type, notice.link)), "workplace");
  assert.equal(shouldEmail(notice), true);
});

test("the e-mail goes out unless the employee switched the category off", () => {
  const notice = signedOrderNotice({ kind: "vacation", number: "12" });
  const type = emailTypeOf(notice.type, notice.link);
  assert.equal(emailAllowedFor(sanitizeEmailOff([]), type), true);
  assert.equal(emailAllowedFor(sanitizeEmailOff(["offer"]), type), true);
  assert.equal(emailAllowedFor(sanitizeEmailOff(["workplace"]), type), false);
  assert.equal(workplaceMailMuted(JSON.stringify(["workplace"])), true);
});

test("an explicit false blocks the mail, an explicit true sends it, plain application notices without the workplace link do not", () => {
  assert.equal(shouldEmail({ type: "application", link: "workplace", email: false }), false);
  assert.equal(shouldEmail({ type: "interview", link: "hr-interviews", email: true }), true);
  assert.equal(shouldEmail({ type: "application", link: "hr-candidates" }), false);
  assert.equal(shouldEmail({ type: "offer", link: "applications" }), true);
});
