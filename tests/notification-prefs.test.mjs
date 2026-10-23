import test from "node:test";
import assert from "node:assert/strict";
import { AUTO_EMAIL_TYPES, categoryOfType, emailAllowedFor, sanitizeEmailOff } from "../lib/notification-prefs.ts";

test("types map to categories and unknown ones are 'other'", () => {
  assert.equal(categoryOfType("application-status"), "application");
  assert.equal(categoryOfType("followed-job"), "alert");
  assert.equal(categoryOfType("employee"), "other");
});

test("switched-off categories are not e-mailed", () => {
  const off = sanitizeEmailOff(["offer", "bogus", "offer", 5]);
  assert.deepEqual(off, ["offer"]);
  assert.equal(emailAllowedFor(off, "offer"), false);
  assert.equal(emailAllowedFor(off, "test"), true);
  assert.equal(emailAllowedFor(sanitizeEmailOff(["other"]), "review"), false);
});

test("status, offer, test, billing, review and message notifications carry e-mail", () => {
  for (const type of ["application-status", "offer", "test", "billing", "review", "message"]) assert.equal(AUTO_EMAIL_TYPES.has(type), true);
  assert.equal(AUTO_EMAIL_TYPES.has("interview"), false);
});
