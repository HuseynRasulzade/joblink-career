import test from "node:test";
import assert from "node:assert/strict";
import { memoryD1 } from "./helpers/d1.mjs";
import { runApprovalReminders } from "../lib/digest-job.ts";
import {
  delegateUntil,
  needsDirector,
  normalizeApprovalRules,
} from "../lib/company.ts";

const schema = `
CREATE TABLE jobs(id text primary key,owner text,data text,status text,created text);
CREATE TABLE company_members(id text,company_id text,user_id text,role text,status text);
CREATE TABLE approval_delegates(id text,company_id text,from_user text,to_user text,until text);
CREATE TABLE approval_requests(id text primary key,company_id text,kind text,subject text,status text,created text,reminded_at text default '',reminders integer default 0,escalated_at text default '');
CREATE TABLE notifications(id text primary key,user_id text,type text,title text,body text,link text,read integer,created text);
CREATE TABLE password_accounts(email text,user_id text);
CREATE TABLE notification_prefs(user_id text,email_off text);
`;
const now = new Date("2026-10-24T05:00:00Z");
const pendingJob = (requestedAt, extra = {}) =>
  JSON.stringify({
    title: "Mühasib",
    approval: {
      requestedAt,
      steps: [
        { role: "hr", decision: "", at: "" },
        { role: "director", decision: "", at: "" },
      ],
      ...extra,
    },
  });

function seed(db) {
  db.raw
    .prepare(
      "INSERT INTO company_members VALUES('m1','c1','hr1','hr','active')",
    )
    .run();
  db.raw
    .prepare(
      "INSERT INTO company_members VALUES('m2','c1','dir1','director','active')",
    )
    .run();
  db.raw
    .prepare(
      "INSERT INTO company_members VALUES('m3','c1','rec1','recruiter','active')",
    )
    .run();
}

test("a vacancy waiting for HR for two days reminds HR, the director and the owner, once", async () => {
  const db = memoryD1(schema);
  seed(db);
  db.raw
    .prepare(
      "INSERT INTO jobs VALUES('j1','c1',?,'pending_approval','2026-10-20')",
    )
    .run(pendingJob("2026-10-21T10:00:00Z"));
  db.raw
    .prepare(
      "INSERT INTO jobs VALUES('j2','c1',?,'pending_approval','2026-10-23')",
    )
    .run(pendingJob("2026-10-23T10:00:00Z"));
  assert.equal(await runApprovalReminders(db, null, undefined, now), 1);
  const users = db.raw
    .prepare("SELECT user_id FROM notifications ORDER BY user_id")
    .all()
    .map((r) => r.user_id);
  assert.deepEqual(users, ["c1", "dir1", "hr1"]);
  // The same day nothing more is sent, and the recruiter is never asked.
  assert.equal(await runApprovalReminders(db, null, undefined, now), 0);
  const stored = JSON.parse(
    db.raw.prepare("SELECT data FROM jobs WHERE id='j1'").get().data,
  );
  assert.equal(stored.approval.reminders, 1);
});

test("reminders stop after four and a substitute is reminded too", async () => {
  const db = memoryD1(schema);
  seed(db);
  db.raw
    .prepare(
      "INSERT INTO approval_delegates VALUES('d1','c1','dir1','rec1','2026-10-30')",
    )
    .run();
  db.raw
    .prepare(
      "INSERT INTO approval_requests VALUES('r1','c1','offer','Əli — Mühasib','pending','2026-10-20T10:00:00Z','',0,'')",
    )
    .run();
  db.raw
    .prepare(
      "INSERT INTO approval_requests VALUES('r2','c1','salary','Aysel','pending','2026-10-01T10:00:00Z','2026-10-02T10:00:00Z',4,'2026-10-10T10:00:00Z')",
    )
    .run();
  assert.equal(await runApprovalReminders(db, null, undefined, now), 1);
  const users = db.raw
    .prepare("SELECT user_id FROM notifications ORDER BY user_id")
    .all()
    .map((r) => r.user_id);
  assert.deepEqual(users, ["c1", "dir1", "rec1"]);
  // Two days later it reminds again; the maxed-out request never does.
  // By then r1 is also more than five days old, so the owner hears about it too.
  const later = new Date("2026-10-26T06:00:00Z");
  assert.equal(await runApprovalReminders(db, null, undefined, later), 2);
  assert.equal(
    db.raw
      .prepare("SELECT reminders FROM approval_requests WHERE id='r1'")
      .get().reminders,
    2,
  );
  assert.equal(
    db.raw
      .prepare("SELECT reminders FROM approval_requests WHERE id='r2'")
      .get().reminders,
    4,
  );
});

test("approval rules and substitute dates", () => {
  assert.deepEqual(normalizeApprovalRules({ offers: true, salaries: "yes" }), {
    offers: true,
    salaries: false,
    exits: false,
    headcount: false,
    chain: "both",
    offerMin: 0,
    raisePercent: 0,
  });
  assert.deepEqual(normalizeApprovalRules(null), {
    offers: false,
    salaries: false,
    exits: false,
    headcount: false,
    chain: "both",
    offerMin: 0,
    raisePercent: 0,
  });
  assert.equal(
    needsDirector(normalizeApprovalRules({ offers: true }), "offer", false),
    true,
  );
  assert.equal(
    needsDirector(normalizeApprovalRules({ offers: true }), "offer", true),
    false,
  );
  assert.equal(
    needsDirector(normalizeApprovalRules({ offers: true }), "salary", false),
    false,
  );
  const today = new Date("2026-10-24T08:00:00Z");
  assert.equal(delegateUntil("2026-10-28", today), "2026-10-28");
  assert.equal(delegateUntil("2026-10-23", today), "");
  assert.equal(delegateUntil("2026-12-30", today), "");
  assert.equal(delegateUntil("abc", today), "");
});

import { firstApprover, newApproval, pendingStep } from "../lib/company.ts";

test("the approval chain can be HR then director, HR only or director only", () => {
  const roles = (chain) =>
    newApproval("u", "Ad", chain).steps.map((s) => s.role);
  assert.deepEqual(roles("both"), ["hr", "director"]);
  assert.deepEqual(roles("hr"), ["hr"]);
  assert.deepEqual(roles("director"), ["director"]);
  assert.deepEqual(roles(undefined), ["hr", "director"]);
  assert.equal(
    pendingStep(newApproval("u", "Ad", "director")).role,
    "director",
  );
  assert.equal(firstApprover("director"), "approve-director");
  assert.equal(firstApprover("hr"), "approve-hr");
  assert.equal(normalizeApprovalRules({ chain: "director" }).chain, "director");
  assert.equal(normalizeApprovalRules({ chain: "x" }).chain, "both");
});

import { ESCALATE_AFTER_DAYS, salaryChangePercent } from "../lib/company.ts";

test("approval thresholds: small offers and small raises go through", () => {
  const rules = normalizeApprovalRules({
    offers: true,
    salaries: true,
    exits: true,
    headcount: false,
    offerMin: 3000,
    raisePercent: 20,
  });
  assert.equal(needsDirector(rules, "offer", false, 2500), false);
  assert.equal(needsDirector(rules, "offer", false, 3000), true);
  assert.equal(needsDirector(rules, "offer", true, 9000), false);
  assert.equal(
    needsDirector(rules, "salary", false, salaryChangePercent(1000, 1100)),
    false,
  );
  assert.equal(
    needsDirector(rules, "salary", false, salaryChangePercent(1000, 1300)),
    true,
  );
  assert.equal(
    needsDirector(rules, "salary", false, salaryChangePercent(1000, 700)),
    true,
  );
  assert.equal(needsDirector(rules, "exit", false), true);
  assert.equal(needsDirector(rules, "headcount", false), false);
  assert.equal(salaryChangePercent(0, 800), 100);
  // Without thresholds every offer waits.
  assert.equal(
    needsDirector(normalizeApprovalRules({ offers: true }), "offer", false, 1),
    true,
  );
  assert.equal(ESCALATE_AFTER_DAYS, 5);
  assert.equal(
    normalizeApprovalRules({ offerMin: -5, raisePercent: 9999 }).raisePercent,
    500,
  );
  assert.equal(normalizeApprovalRules({ offerMin: -5 }).offerMin, 0);
});

test("a request waiting five days is also reported to the owner, once", async () => {
  const db = memoryD1(schema);
  seed(db);
  db.raw
    .prepare(
      "INSERT INTO approval_requests VALUES('r9','c1','exit','Aysel: işdən çıxarılma','pending','2026-10-18T10:00:00Z','2026-10-22T10:00:00Z',3,'')",
    )
    .run();
  db.raw
    .prepare(
      "INSERT INTO jobs VALUES('j9','c1',?,'pending_approval','2026-10-10')",
    )
    .run(
      pendingJob("2026-10-10T10:00:00Z", {
        remindedAt: "2026-10-23T10:00:00Z",
        reminders: 2,
      }),
    );
  assert.equal(await runApprovalReminders(db, null, undefined, now), 2);
  const titles = db.raw
    .prepare(
      "SELECT user_id,title FROM notifications WHERE title='Gecikən təsdiq' ORDER BY user_id",
    )
    .all();
  assert.deepEqual(
    titles.map((t) => t.user_id),
    ["c1", "c1"],
  );
  assert.equal(await runApprovalReminders(db, null, undefined, now), 0);
});
