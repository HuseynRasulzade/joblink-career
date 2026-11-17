import test from "node:test";
import assert from "node:assert/strict";
import { planDigestText } from "../lib/plan-digest-text.ts";

test("planDigestText: silent when in order, speaks about gaps, surplus and waiting requests", () => {
  assert.equal(planDigestText({ planned: 20, filled: 20, pending: 0 }), null);
  assert.equal(planDigestText({ planned: 20, filled: 19, pending: 0 }), null); // within 5%
  assert.match(planDigestText({ planned: 20, filled: 15, pending: 0 }).body, /5 yer boşdur/);
  assert.match(planDigestText({ planned: 20, filled: 24, pending: 0 }).body, /4 nəfər çoxdur/);
  assert.match(planDigestText({ planned: 20, filled: 20, pending: 2 }).body, /2 plan və ya maaş sorğusu/);
});
