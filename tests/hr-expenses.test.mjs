import test from "node:test";
import assert from "node:assert/strict";
import { EXPENSE_CATEGORIES, canMove, budgetProblem } from "../lib/hr-expenses.ts";

test("every kind has an id, a label and a hint", () => {
  assert.ok(EXPENSE_CATEGORIES.length >= 7);
  for (const c of EXPENSE_CATEGORIES) assert.ok(c.id && c.label && c.hint);
  assert.equal(new Set(EXPENSE_CATEGORIES.map((c) => c.id)).size, EXPENSE_CATEGORIES.length);
});
test("an expense goes planned → approved → paid, and a payment can be taken back", () => {
  assert.ok(canMove("planned", "approved") && canMove("approved", "paid") && canMove("paid", "approved"));
  assert.ok(!canMove("planned", "paid"));
  assert.ok(!canMove("paid", "cancelled"));
  assert.ok(!canMove("paid", "planned"));
});
test("no budget, or not enough of it, refuses the expense", () => {
  assert.match(budgetProblem("Hədiyyələr", "2026", 0, 0, 100), /büdcəsi yoxdur/);
  assert.match(budgetProblem("Hədiyyələr", "2026", 1000, 950, 100), /çatmır/);
  assert.equal(budgetProblem("Hədiyyələr", "2026", 1000, 900, 100), "");
});
