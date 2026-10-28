// The rule-based fit against a fixed set of decisions an HR manager would make.
import assert from "node:assert/strict";
import test from "node:test";
import { match } from "../lib/model.ts";
import { BLIND_CASES, EVAL_CASES, categoryForScore } from "./fixtures/eval-set.mjs";

const order = { reject: 0, consider: 1, interview: 2 };
function measure(cases) {
  let right = 0, severe = 0;
  const misses = [];
  for (const c of cases) {
    const score = match(c.profile, c.job).score;
    const got = categoryForScore(score);
    if (got === c.expected) right++;
    else {
      misses.push(`${c.id}: ${score} → ${got}, gözlənilən ${c.expected}`);
      if (Math.abs(order[got] - order[c.expected]) === 2) severe++;
    }
  }
  return { accuracy: right / cases.length, severe, misses };
}

for (const [name, cases] of [["main set", EVAL_CASES], ["second set", BLIND_CASES]]) {
  test(`rules reach the expected decision on at least 90% of the ${name}, never interview vs reject`, () => {
    const { accuracy, severe, misses } = measure(cases);
    assert.equal(severe, 0, `severe: ${misses.join("; ")}`);
    assert.ok(accuracy >= 0.9, `accuracy ${Math.round(accuracy * 100)}%: ${misses.join("; ")}`);
  });
}

test("a vacancy skill outside the catalog is ignored by the matching (known limit)", () => {
  const job = { ...EVAL_CASES[0].job, skills: ["Tamamilə uydurma bacarıq"] };
  assert.equal(match(EVAL_CASES[0].profile, job).skillEvidence.length, 0);
});
