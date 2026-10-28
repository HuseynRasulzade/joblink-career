import test from "node:test";
import assert from "node:assert/strict";
import { startFlow, approveStep, returnStep, editStep, normalizeFlow, previousHolder } from "../lib/order-flow.ts";

const signers = [
  { role: "head", title: "Şöbə rəhbəri", name: "Rəşad" },
  { role: "director", title: "Direktor", name: "Elçin" },
];
const T = (n) => `2026-05-0${n}T10:00:00Z`;

test("the head signs first, then the director; the order is signed when both have", () => {
  let state = startFlow(signers, "HR", T(1));
  assert.equal(state.holder, "head");
  assert.throws(() => approveStep(state, "director", "Elçin", T(2)), /başqa şəxsin növbəsində/);
  state = approveStep(state, "head", "Rəşad", T(2));
  assert.equal(state.holder, "director");
  assert.equal(state.status, "pending");
  state = approveStep(state, "director", "Elçin", T(3));
  assert.equal(state.status, "signed");
  assert.equal(state.holder, "");
  assert.deepEqual(state.history.map((e) => e.type), ["created", "approved", "approved", "signed"]);
  assert.throws(() => returnStep(state, "director", "Elçin", T(4), "səbəb"), /mzalanmış əmri/);
});

test("the director sends it back to the head with a reason; the head's approval is cleared", () => {
  let state = approveStep(startFlow(signers, "HR", T(1)), "head", "Rəşad", T(2));
  assert.throws(() => returnStep(state, "director", "Elçin", T(3), " "), /səbəbini yazın/);
  state = returnStep(state, "director", "Elçin", T(3), "Tarix səhvdir");
  assert.equal(state.holder, "head");
  assert.equal(state.status, "returned");
  assert.ok(state.signers.every((s) => !s.approvedAt));
  assert.equal(state.history.at(-1).note, "Tarix səhvdir");
  assert.equal(state.history.at(-1).to, "head");
});

test("the head sends it back to the creator, who edits it and sends it on again", () => {
  let state = startFlow(signers, "HR", T(1));
  state = returnStep(state, "head", "Rəşad", T(2), "Əsas yazılmayıb");
  assert.equal(state.holder, "creator");
  state = editStep(state, signers, "HR", T(3));
  assert.equal(state.holder, "head");
  assert.equal(state.status, "pending");
  assert.deepEqual(state.history.map((e) => e.type), ["created", "returned", "edited"]);
});

test("one signer only: goes back to the creator; old orders get a holder", () => {
  const only = [signers[1]];
  assert.equal(previousHolder(startFlow(only, "HR", T(1)), "director"), "creator");
  const old = normalizeFlow({ signers: [{ ...signers[0], approvedAt: T(1) }, signers[1]], status: "pending" });
  assert.equal(old.holder, "director");
  assert.equal(normalizeFlow({ signers: [{ ...signers[0], approvedAt: T(1) }], status: "pending" }).status, "signed");
});
