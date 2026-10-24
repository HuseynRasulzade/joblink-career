import test from "node:test";
import assert from "node:assert/strict";
import { accountSignals } from "../lib/account-signals.ts";

const now = new Date("2026-10-24T12:00:00Z");
const base = { name: "Aysel Məmmədova", email: "aysel@gmail.com", role: "candidate", jobsCount: 0, applicationsCount: 3, created: "2026-09-01T00:00:00Z" };

test("an ordinary account has no signals", () => assert.deepEqual(accountSignals(base, now), []));

test("typical fake-account patterns", () => {
  assert.deepEqual(accountSignals({ ...base, email: "x@yopmail.com" }, now), ["Birdəfəlik e-poçt ünvanı"]);
  assert.equal(accountSignals({ ...base, name: "12345 !!! 99" }, now).length, 1);
  assert.match(accountSignals({ ...base, role: "company", jobsCount: 7, verified: false }, now)[0], /7 vakansiya/);
  assert.deepEqual(accountSignals({ ...base, role: "company", jobsCount: 7, verified: true }, now), []);
  assert.match(accountSignals({ ...base, applicationsCount: 60, created: "2026-10-23T12:00:00Z" }, now)[0], /60 müraciət/);
  assert.deepEqual(accountSignals({ ...base, applicationsCount: 60 }, now), []);
});
