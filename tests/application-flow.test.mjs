import test from "node:test";
import assert from "node:assert/strict";
import { statusAfter } from "../lib/application-flow.ts";

const none = { activeInterviews: 0, completedInterviews: 0, pendingOffer: false };

test("opening a new application moves it to review, nothing else", () => {
  assert.equal(statusAfter("viewed", "Göndərildi", none), "Baxışda");
  assert.equal(statusAfter("viewed", "Müsahibə", none), null);
  assert.equal(statusAfter("viewed", "Baxışda", none), null);
});

test("an interview that falls through returns the candidate to review", () => {
  for (const event of ["interview-cancelled", "interview-declined", "interview-no-show"]) {
    assert.equal(statusAfter(event, "Müsahibə", none), "Baxışda", event);
  }
});

test("another planned or held interview keeps the candidate in the interview stage", () => {
  assert.equal(statusAfter("interview-cancelled", "Müsahibə", { ...none, activeInterviews: 1 }), null);
  assert.equal(statusAfter("interview-declined", "Müsahibə", { ...none, completedInterviews: 1 }), null);
});

test("an offer waiting for an answer is never overruled", () => {
  assert.equal(statusAfter("feedback-reject", "Müsahibə", { ...none, pendingOffer: true }), null);
  assert.equal(statusAfter("interview-cancelled", "Müsahibə", { ...none, pendingOffer: true }), null);
});

test("a «reject» opinion after the interview closes the application", () => {
  assert.equal(statusAfter("feedback-reject", "Müsahibə", none), "Uyğun deyil");
  assert.equal(statusAfter("feedback-reject", "İşə qəbul edildi", none), null);
});
