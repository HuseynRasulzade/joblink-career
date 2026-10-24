import assert from "node:assert/strict";
import test from "node:test";
import { GALLERY_LIMIT, INVITE_DAYS, inviteExpired, profileCompleteness } from "../lib/company.ts";

test("a team invitation expires after the set number of days", () => {
  const now = new Date("2026-10-24T12:00:00Z");
  assert.equal(inviteExpired("2026-10-20T12:00:00Z", now), false);
  const old = new Date(now.getTime() - (INVITE_DAYS + 1) * 86_400_000).toISOString();
  assert.equal(inviteExpired(old, now), true);
});

const empty = { about: "", industry: "", size: "", website: "", officeAddress: "", foundedYear: "", videoUrl: "", linkedin: "", instagram: "", facebook: "" };

test("the employer page completeness lists what is missing", () => {
  const none = profileCompleteness(empty, false, 0);
  assert.equal(none.percent, 0);
  assert.ok(none.missing.includes("Loqo") && none.missing.includes("Şəkil qalereyası"));
  const full = profileCompleteness(
    { about: "x".repeat(90), industry: "Maliyyə", size: "11–50", website: "a.az", officeAddress: "Bakı", foundedYear: "2012", videoUrl: "", linkedin: "https://linkedin.com/x", instagram: "", facebook: "" },
    true,
    2,
  );
  assert.equal(full.percent, 100);
  assert.deepEqual(full.missing, []);
  // A one-line description does not count as an "about" text.
  assert.ok(profileCompleteness({ ...empty, about: "Qısa" }, false, 0).missing.includes("Şirkət haqqında"));
});

test("the gallery has a small fixed limit", () => {
  assert.equal(GALLERY_LIMIT, 6);
});
