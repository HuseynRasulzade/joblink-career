import test from "node:test";
import assert from "node:assert/strict";
import { runBankDrafts } from "../lib/cron-bank-drafts.ts";

function fakeDb(companies) {
  const log = [];
  const statement = (sql) => ({ args: [], bind(...a) { this.args = a; return this; }, async all() { return { results: companies }; }, async run() { log.push({ sql, args: this.args }); return { meta: { changes: 1 } }; } });
  return { log, prepare: statement };
}

test("the job opens the bank page of each company as its owner and removes the session", async () => {
  const db = fakeDb([{ company_id: "c1" }, { company_id: "c2" }]);
  const seen = [];
  const opened = await runBankDrafts(db, async (request) => { seen.push({ url: request.url, cookie: request.headers.get("cookie") }); return new Response("{}", { status: 200 }); }, "https://x.test", new Date("2026-03-02T05:00:00Z"));
  assert.equal(opened, 2);
  assert.equal(seen.length, 2);
  assert.ok(seen.every((s) => s.url === "https://x.test/api/joblink/company/payroll/bank" && /^__Host-joblink_session=[\w-]{43}$/.test(s.cookie)));
  const inserts = db.log.filter((l) => /INSERT INTO sessions/.test(l.sql));
  const deletes = db.log.filter((l) => /DELETE FROM sessions/.test(l.sql));
  assert.equal(inserts.length, 2);
  assert.deepEqual(inserts.map((i) => i.args[1]), ["c1", "c2"]);
  assert.deepEqual(deletes.map((d) => d.args[0]), inserts.map((i) => i.args[0])); // the same hashed ids
  assert.ok(inserts[0].args[2] - inserts[0].args[3] === 300);
});

test("a failing company does not stop the others, and its session is still removed", async () => {
  const db = fakeDb([{ company_id: "c1" }, { company_id: "c2" }]);
  let n = 0;
  const opened = await runBankDrafts(db, async () => { n++; if (n === 1) throw new Error("boom"); return new Response("{}", { status: 200 }); });
  assert.equal(opened, 1);
  assert.equal(db.log.filter((l) => /DELETE FROM sessions/.test(l.sql)).length, 2);
});
