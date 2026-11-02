import test from "node:test";
import assert from "node:assert/strict";
import { addMonths, runSurveyRecurrence } from "../lib/survey-recurrence.ts";

// A small stand-in for the D1 database: it answers the one list query and records every write.
function fakeDb(surveys, people = [{ user_id: "u1" }, { user_id: "u2" }]) {
  const writes = [];
  const statement = (sql) => ({
    sql,
    args: [],
    bind(...args) {
      this.args = args;
      return this;
    },
    async all() {
      return { results: /FROM surveys/.test(sql) ? surveys : /FROM company_employees/.test(sql) ? people : [] };
    },
    async run() {
      writes.push({ sql, args: this.args });
      return { meta: { changes: 1 } };
    },
  });
  return { writes, prepare: statement, batch: async (list) => { for (const s of list) writes.push({ sql: s.sql, args: s.args }); } };
}
const row = (over) => ({ id: "s1", company_id: "c1", title: "Pulse", kind: "custom", questions: "[]", anonymous: 1, repeat_months: 1, series_id: "s1", created: "2026-01-10T08:00:00.000Z", ...over });

test("months are added to a date", () => {
  assert.equal(addMonths("2026-01-31T00:00:00.000Z", 1).slice(0, 7), "2026-03");
  assert.equal(addMonths("2026-01-10T08:00:00.000Z", 3).slice(0, 10), "2026-04-10");
});

test("a survey that is due opens a new round and tells the employees", async () => {
  const db = fakeDb([row({})]);
  const opened = await runSurveyRecurrence(db, new Date("2026-02-15T00:00:00Z"));
  assert.equal(opened, 1);
  assert.ok(db.writes.some((w) => /INSERT INTO surveys/.test(w.sql) && w.args[1] === "c1" && w.args[8] === "s1"));
  assert.ok(db.writes.some((w) => /UPDATE surveys SET status='closed'/.test(w.sql)));
  assert.equal(db.writes.filter((w) => /INSERT INTO notifications/.test(w.sql)).length, 2);
});

test("a survey that is not yet due, or a series already handled, is left alone", async () => {
  assert.equal(await runSurveyRecurrence(fakeDb([row({})]), new Date("2026-02-01T00:00:00Z")), 0);
  const db = fakeDb([row({ id: "s2", created: "2026-01-20T08:00:00.000Z", series_id: "s1" }), row({})]); // newest first: only the latest round counts
  assert.equal(await runSurveyRecurrence(db, new Date("2026-02-15T00:00:00Z")), 0);
});
