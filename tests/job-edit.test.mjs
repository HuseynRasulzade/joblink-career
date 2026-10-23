import test from "node:test";
import assert from "node:assert/strict";
import { changedFields, closeReasonLabel, daysLeft, extendedDeadline, isEditableStatus, pickEditable, validDeadline } from "../lib/job-edit.ts";

const TODAY = "2026-10-23";

test("only live vacancies are edited in place", () => {
  assert.equal(isEditableStatus("published"), true);
  assert.equal(isEditableStatus("paused"), true);
  for (const s of ["archived", "pending_approval", "rejected", "draft"]) assert.equal(isEditableStatus(s), false);
});
test("a deadline is empty or a real date that is not in the past", () => {
  assert.equal(validDeadline("", TODAY), true);
  assert.equal(validDeadline("2026-10-23", TODAY), true);
  assert.equal(validDeadline("2026-12-31", TODAY), true);
  assert.equal(validDeadline("2026-10-22", TODAY), false);
  assert.equal(validDeadline("31.12.2026", TODAY), false);
  assert.equal(validDeadline("2026-02-30", TODAY), false);
});
test("extending counts from the current deadline when it is ahead, otherwise from today", () => {
  assert.equal(extendedDeadline("2026-11-01", 7, TODAY), "2026-11-08");
  assert.equal(extendedDeadline("2026-10-01", 7, TODAY), "2026-10-30");
  assert.equal(extendedDeadline("", 14, TODAY), "2026-11-06");
});
test("days left can be negative and empty without a deadline", () => {
  assert.equal(daysLeft("2026-10-26", TODAY), 3);
  assert.equal(daysLeft("2026-10-20", TODAY), -3);
  assert.equal(daysLeft("", TODAY), null);
});
test("changed fields lists only editable differences", () => {
  const before = { title: "A", skills: ["x"], minSalary: 100, id: "1", status: "published" };
  const after = { title: "A", skills: ["x", "y"], minSalary: 100, id: "2", status: "paused" };
  assert.deepEqual(changedFields(before, after), ["skills"]);
  assert.deepEqual(changedFields(before, before), []);
});
test("pickEditable drops identity and status fields", () => {
  const p = pickEditable({ id: "1", owner: "c", status: "published", title: "A", deadline: "2026-12-01", created: "x" });
  assert.deepEqual(p, { title: "A", deadline: "2026-12-01" });
  assert.equal(closeReasonLabel("filled"), "Vəzifə dolduruldu");
  assert.equal(closeReasonLabel("zzz"), "");
});
