import test from "node:test";
import assert from "node:assert/strict";
import { cleanOhs, defaultDue, dueState, retentionEnd, retentionYears, textHash } from "../lib/ohs.ts";

test("a repeat briefing falls due in six months and a periodic medical in a year", () => {
  assert.equal(defaultDue("briefing", "repeat", "2026-03-31"), "2026-09-30");
  assert.equal(defaultDue("briefing", "intro", "2026-03-31"), "");
  assert.equal(defaultDue("medical", "periodic", "2026-11-03"), "2027-11-03");
  assert.equal(defaultDue("medical", "extra", "2026-11-03"), "");
});

test("due dates are told apart as overdue, soon or far", () => {
  assert.equal(dueState("2026-10-01", "2026-11-03"), "overdue");
  assert.equal(dueState("2026-11-20", "2026-11-03"), "soon");
  assert.equal(dueState("2027-05-01", "2026-11-03"), "ok");
  assert.equal(dueState("", "2026-11-03"), "none");
});

test("a briefing needs a person, a kind and an instructor", () => {
  assert.equal(cleanOhs({ type: "briefing", date: "2026-11-03", kind: "repeat", instructor: "A" }).ok, false);
  const ok = cleanOhs({ type: "briefing", employeeId: "e1", date: "2026-11-03", kind: "repeat", instructor: "Ə. Əliyev", signed: true });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.due, "2027-05-03");
  assert.equal(cleanOhs({ type: "briefing", employeeId: "e1", date: "2026-11-03", kind: "repeat", instructor: "X", due: "2026-01-01" }).ok, false);
});

test("a medical examination keeps the result and the next date", () => {
  const r = cleanOhs({ type: "medical", employeeId: "e1", date: "2026-11-03", kind: "periodic", result: "limited", clinic: "Klinika" });
  assert.equal(r.value.data.result, "limited");
  assert.equal(r.value.due, "2027-11-03");
  assert.equal(cleanOhs({ type: "medical", employeeId: "e1", date: "2026-11-03", kind: "periodic", result: "bad" }).ok, false);
});

test("an incident needs a description and marks a serious one for reporting", () => {
  assert.equal(cleanOhs({ type: "incident", date: "2026-11-03", kind: "minor", description: "x" }).ok, false);
  const r = cleanOhs({ type: "incident", date: "2026-11-03", kind: "serious", description: "Pilləkəndən yıxıldı", daysLost: "4" });
  assert.equal(r.value.data.mustReport, true);
  assert.equal(r.value.data.daysLost, 4);
  assert.equal(r.value.employeeId, "");
});

test("retention ends the given years after the last working day", () => {
  assert.equal(retentionEnd("2020-05-10", 5), "2025-05-10");
  assert.equal(retentionEnd("", 5), "");
  assert.equal(retentionYears({ timesheet: 7 }, "timesheet"), 7);
  assert.equal(retentionYears({}, "timesheet"), 5);
});

test("the same text gives the same hash and another text another", async () => {
  assert.equal(await textHash("a"), await textHash("a"));
  assert.notEqual(await textHash("a"), await textHash("b"));
});
