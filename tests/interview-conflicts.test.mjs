import test from "node:test";
import assert from "node:assert/strict";
import { findConflicts, panelState, staggerStarts } from "../lib/interviews.ts";

const H = 3600000;
const t0 = Date.parse("2027-01-15T07:00:00Z"); // 11:00 Baku
const slot = (over = {}) => ({ id: "x", start: t0, end: t0 + H, jobId: "j1", candidateId: "c1", people: ["u1"], label: "Aysel", ...over });

test("same vacancy, same colleague and same candidate overlaps are found", () => {
  const q = { start: t0 + 30 * 60000, end: t0 + 90 * 60000, jobId: "j1", candidateId: "c1", people: ["u1", "u2"] };
  const kinds = findConflicts(q, [slot()]).map((c) => c.kind).sort();
  assert.deepEqual(kinds, ["candidate", "job", "person"]);
});

test("back-to-back and other vacancies do not conflict; ignoreId skips itself", () => {
  const next = { start: t0 + H, end: t0 + 2 * H, jobId: "j1", candidateId: "c2", people: ["u2"] };
  assert.equal(findConflicts(next, [slot()]).length, 0);
  const other = { start: t0, end: t0 + H, jobId: "j2", candidateId: "c2", people: ["u2"] };
  assert.equal(findConflicts(other, [slot()]).length, 0);
  assert.equal(findConflicts({ ...other, jobId: "j1", candidateId: "c1" }, [slot({ id: "me" })].map((s) => ({ ...s })), undefined).length, 2);
  assert.equal(findConflicts({ ...other, jobId: "j1", candidateId: "c1", ignoreId: "me" }, [slot({ id: "me" })]).length, 0);
});

test("a colleague who is busy is named in the message", () => {
  const [c] = findConflicts({ start: t0, end: t0 + H, jobId: "j9", candidateId: "c9", people: ["u1"] }, [slot()], (u) => (u === "u1" ? "Rəşad" : u));
  assert.match(c.message, /Rəşad/);
  assert.match(c.message, /11:00–12:00/);
});

test("panel state: none, pending, accepted, declined", () => {
  assert.equal(panelState([]), "none");
  assert.equal(panelState(["accepted", "pending"]), "pending");
  assert.equal(panelState(["accepted", "accepted"]), "accepted");
  assert.equal(panelState(["accepted", "declined", "pending"]), "declined");
});

test("candidates of one vacancy get back-to-back times", () => {
  const starts = staggerStarts(t0, 3, 30, 10);
  assert.deepEqual(starts.map((s) => (s - t0) / 60000), [0, 40, 80]);
});
