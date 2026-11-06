import test from "node:test";
import assert from "node:assert/strict";
import { AUTO_EMAIL_TYPES, categoryOfType, emailAllowedFor, sanitizeEmailOff, workplaceMailMuted } from "../lib/notification-prefs.ts";

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

test("approval requests are e-mailed and can be switched off as their own category", () => {
  assert.equal(AUTO_EMAIL_TYPES.has("approval"), true);
  assert.equal(categoryOfType("approval"), "approval");
  assert.equal(categoryOfType("application"), "application");
  assert.equal(emailAllowedFor(sanitizeEmailOff(["approval"]), "approval"), false);
  assert.equal(emailAllowedFor(sanitizeEmailOff(["approval"]), "offer"), true);
});

test("employee-page notices are their own e-mail category", () => {
  assert.equal(AUTO_EMAIL_TYPES.has("workplace"), true);
  assert.equal(categoryOfType("workplace"), "workplace");
  assert.equal(emailAllowedFor(sanitizeEmailOff(["workplace"]), "workplace"), false);
  assert.equal(emailAllowedFor(sanitizeEmailOff(["workplace"]), "offer"), true);
});

test("an employee who switched off the employee-page e-mail is muted; missing or broken settings are not", () => {
  assert.equal(workplaceMailMuted(JSON.stringify(["workplace"])), true);
  assert.equal(workplaceMailMuted(JSON.stringify(["offer", "workplace", "test"])), true);
  assert.equal(workplaceMailMuted(JSON.stringify(["offer", "test"])), false);
  assert.equal(workplaceMailMuted("[]"), false);
  assert.equal(workplaceMailMuted(null), false);
  assert.equal(workplaceMailMuted(undefined), false);
  assert.equal(workplaceMailMuted(""), false);
  assert.equal(workplaceMailMuted("not json"), false);
  // unknown categories are ignored, so they cannot mute by accident
  assert.equal(workplaceMailMuted(JSON.stringify(["bogus"])), false);
});
