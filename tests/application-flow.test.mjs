import test from "node:test";
import assert from "node:assert/strict";
import { statusAfter, manualStatusMove } from "../lib/application-flow.ts";

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

test("the statuses that stand for a stage or a document cannot be set by hand", () => {
  const ok = (a, b) => manualStatusMove(a, b).ok;
  // The offer, the interview and the hire go through their own actions.
  assert.equal(ok("Müsahibə", "Təklif edildi"), false);
  assert.equal(ok("Göndərildi", "Təklif edildi"), false);
  assert.equal(ok("Baxışda", "İşə qəbul edildi"), false, "a hire needs the interview first");
  assert.equal(ok("Göndərildi", "İşə qəbul edildi"), false);
  assert.equal(ok("Müsahibə", "İşə qəbul edildi"), true);
  assert.equal(ok("Təklif edildi", "İşə qəbul edildi"), true);
  // Closing works while the application is open and not after the end.
  for (const from of ["Göndərildi", "Baxışda", "Müsahibə", "Təklif edildi"]) assert.equal(ok(from, "Uyğun deyil"), true, from);
  assert.equal(ok("İşə qəbul edildi", "Uyğun deyil"), false);
  // Reopening, taking to review, and the interview stage.
  assert.equal(ok("Uyğun deyil", "Baxışda"), true);
  assert.equal(ok("Göndərildi", "Baxışda"), true);
  assert.equal(ok("Baxışda", "Müsahibə"), true);
  assert.equal(ok("İşə qəbul edildi", "Baxışda"), false);
  assert.equal(ok("Baxışda", "Göndərildi"), false);
  // The same status (changing only the stage) is fine; the message tells where to go.
  assert.equal(ok("Müsahibə", "Müsahibə"), true);
  assert.match(manualStatusMove("Müsahibə", "Təklif edildi").message, /İş təklifi et/);
});
