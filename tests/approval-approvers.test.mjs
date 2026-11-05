import test from "node:test";
import assert from "node:assert/strict";
import { mayDecide, normalizeApprovalRules, requestAmount } from "../lib/company.ts";

const rules = (approvers) => normalizeApprovalRules({ approvers });

test("with no named approvers the director right is enough (as before)", () => {
  assert.equal(mayDecide(rules({}), "offer", ["u1"], false, 5000), true);
});

test("a named approver may decide up to the limit; others and amounts above it are refused", () => {
  const r = rules({ offer: [{ userId: "u1", limit: 3000 }, { userId: "u2", limit: 0 }] });
  assert.equal(mayDecide(r, "offer", ["u1"], false, 2500), true);
  assert.equal(mayDecide(r, "offer", ["u1"], false, 3500), false);
  assert.equal(mayDecide(r, "offer", ["u2"], false, 90000), true, "0 means no limit");
  assert.equal(mayDecide(r, "offer", ["u3"], false, 100), false, "not named");
  assert.equal(mayDecide(r, "salary", ["u3"], false, 100), true, "other kinds keep the old rule");
});

test("the owner always decides, and a substitute decides with the rights of the person they stand in for", () => {
  const r = rules({ exit: [{ userId: "u1", limit: 0 }] });
  assert.equal(mayDecide(r, "exit", ["owner-id"], true, null), true);
  assert.equal(mayDecide(r, "exit", ["u9", "u1"], false, null), true);
  assert.equal(mayDecide(r, "exit", ["u9"], false, null), false);
});

test("rules are cleaned: duplicates, empty ids and limits on kinds without an amount", () => {
  const r = rules({ offer: [{ userId: "u1", limit: -5 }, { userId: "u1", limit: 10 }, { userId: "", limit: 1 }], exit: [{ userId: "u2", limit: 999 }], bogus: [{ userId: "x" }] });
  assert.deepEqual(r.approvers.offer, [{ userId: "u1", limit: 0 }]);
  assert.deepEqual(r.approvers.exit, [{ userId: "u2", limit: 0 }]);
});

test("the amount of a request is the offered or the new pay", () => {
  assert.equal(requestAmount("offer", { data: { salary: 3500 } }), 3500);
  assert.equal(requestAmount("salary", { salary: 2800 }), 2800);
  assert.equal(requestAmount("exit", {}), null);
});
