import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeReview, summarizeRatings } from "../lib/reviews.ts";

test("a review needs a rating and a real text", () => {
  assert.match(sanitizeReview({ rating: 0, body: "x".repeat(30) }).error, /1-dən 5/);
  assert.match(sanitizeReview({ rating: 4, body: "qısa" }).error, /20 simvol/);
  const ok = sanitizeReview({ rating: "4", title: "  Yaxşı   komanda ", body: "  Müsahibə prosesi aydın və hörmətli keçdi.  " });
  assert.deepEqual(ok, { rating: 4, title: "Yaxşı komanda", body: "Müsahibə prosesi aydın və hörmətli keçdi." });
});

test("ratings are averaged to one decimal", () => {
  assert.deepEqual(summarizeRatings([]), { count: 0, average: null, distribution: [0, 0, 0, 0, 0] });
  const s = summarizeRatings([5, 4, 4, 1]);
  assert.equal(s.count, 4);
  assert.equal(s.average, 3.5);
  assert.deepEqual(s.distribution, [1, 0, 0, 2, 1]);
});
