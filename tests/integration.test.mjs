import test from "node:test";
import assert from "node:assert/strict";
import { generateApiKey, looksLikeApiKey, hashApiKey, signBody, orderNumber, parseOrderNumber, safeWebhookUrl, paidReportProblem, orderView } from "../lib/integration.ts";

test("an API key has a fixed shape, is random, and only its hash is stored", async () => {
  const a = generateApiKey();
  const b = generateApiKey();
  assert.ok(looksLikeApiKey(a) && looksLikeApiKey(b));
  assert.notEqual(a, b);
  const hash = await hashApiKey(a);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, await hashApiKey(a));
  assert.ok(!hash.includes(a.slice(3)));
  assert.ok(!looksLikeApiKey("jl_short") && !looksLikeApiKey("x".repeat(43)));
});
test("the signature of a body depends on the secret and the body", async () => {
  const one = await signBody("secret", '{"a":1}');
  assert.equal(one, await signBody("secret", '{"a":1}'));
  assert.notEqual(one, await signBody("other", '{"a":1}'));
  assert.notEqual(one, await signBody("secret", '{"a":2}'));
  assert.match(one, /^[0-9a-f]{64}$/);
});
test("order numbers are written and read back", () => {
  assert.equal(orderNumber("2026", 7), "JL-2026-000007");
  assert.deepEqual(parseOrderNumber("jl-2026-000123"), { year: "2026", sequence: 123 });
  assert.equal(parseOrderNumber("JL-26-1"), null);
});
test("a web address must be https on the public internet", () => {
  assert.ok(safeWebhookUrl("https://erp.example.com/hook"));
  for (const bad of ["http://erp.example.com", "https://localhost/x", "https://127.0.0.1/x", "https://10.0.0.5/x", "https://[::1]/x", "https://user:pw@erp.example.com", "ftp://x.com", "not a url", "https://intranet/x", "https://printer.local/x"]) assert.equal(safeWebhookUrl(bad), "", bad);
});
test("the payment the outside program reports must fit the order", () => {
  const order = { amount: 400, status: "ordered" };
  assert.equal(paidReportProblem(order, { paidOn: "2026-11-22" }), "");
  assert.equal(paidReportProblem(order, { paidOn: "2026-11-22", amount: 400 }), "");
  assert.match(paidReportProblem(order, { paidOn: "2026-11-22", amount: 350 }), /uyğun deyil/);
  assert.match(paidReportProblem(order, { paidOn: "22.11.2026" }), /YYYY-MM-DD/);
  assert.match(paidReportProblem({ amount: 400, status: "paid" }, { paidOn: "2026-11-22" }), /artıq/);
  assert.match(paidReportProblem({ amount: 400, status: "planned" }, { paidOn: "2026-11-22" }), /vəziyyətdə deyil/);
});
test("an order is shown to the outside program with its number and label", () => {
  const view = orderView({ id: "1", order_no: "JL-2026-000001", status: "ordered", category: "gifts", title: "T", department: "D", amount: 10, expense_date: "2026-11-20", payee: "P", note: "", ordered_at: "x", paid_on: "", pay_method: "", pay_ref: "", external_id: "" }, (c) => `L:${c}`);
  assert.equal(view.orderNo, "JL-2026-000001");
  assert.equal(view.categoryLabel, "L:gifts");
  assert.equal(view.currency, "AZN");
});
