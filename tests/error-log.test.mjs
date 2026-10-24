import test from "node:test";
import assert from "node:assert/strict";
import { cleanErrorMessage, cleanWhere, errorFingerprint } from "../lib/error-log.ts";

test("e-mail addresses and long tokens never reach the log", () => {
  const msg = cleanErrorMessage("Failed for ali@example.az with token abcdefghijklmnopqrstuvwxyz0123456789ABCDEF  now");
  assert.equal(msg, "Failed for [e-poçt] with token [açar] now");
  assert.equal(cleanErrorMessage("söz ".repeat(200)).length, 300);
  assert.equal(cleanErrorMessage(undefined), "");
});

test("places lose ids and query strings; same error gets the same fingerprint", async () => {
  assert.equal(cleanWhere("/api/joblink/hr/assessment?id=3f2504e0-4f89-11d3-9a0c-0305e82c3301"), "/api/joblink/hr/assessment");
  assert.equal(cleanWhere("/x/3f2504e0-4f89-11d3-9a0c-0305e82c3301/y"), "/x/:id/y");
  const a = await errorFingerprint("server", "boom", "/api");
  assert.equal(a, await errorFingerprint("server", "boom", "/api"));
  assert.notEqual(a, await errorFingerprint("client", "boom", "/api"));
});
