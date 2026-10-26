import assert from "node:assert/strict";
import test from "node:test";
import { compareInterviews } from "../lib/interview-compare.ts";
import {
  defaultTasks,
  taskSummary,
  addDaysIso,
  seedOnboardingTasks,
  DEFAULT_ONBOARDING,
} from "../lib/onboarding.ts";
import { memoryD1 } from "./helpers/d1.mjs";

const row = (application, candidate, rating, decision, at, extra = {}) => ({
  application_id: application,
  job_id: "j1",
  job_title: "Mühasib",
  candidate,
  application_status: "Müsahibə",
  scheduled_at: at,
  status: "completed",
  rating,
  feedback: `rəy ${candidate}`,
  decision,
  ...extra,
});

test("candidates of a vacancy are ranked by average rating, then advance votes", () => {
  const [job] = compareInterviews([
    row("a1", "Aysel", 4, "advance", "2026-10-01T10:00:00Z"),
    row("a1", "Aysel", 5, "advance", "2026-10-05T10:00:00Z"),
    row("a2", "Bəxtiyar", 5, "hold", "2026-10-02T10:00:00Z"),
    row("a3", "Cavid", 0, "", "2026-10-03T10:00:00Z", { status: "scheduled" }),
    row("a4", "Dilarə", 4.5, "advance", "2026-10-04T10:00:00Z"),
  ]);
  assert.deepEqual(
    job.candidates.map((c) => c.candidate),
    ["Bəxtiyar", "Aysel", "Dilarə", "Cavid"],
  );
  assert.equal(job.candidates[1].average, 4.5);
  assert.equal(job.candidates[1].interviews, 2);
  assert.equal(job.candidates[1].advance, 2);
  assert.equal(job.candidates[3].rated, 0);
});

test("cancelled interviews are left out and jobs are listed separately", () => {
  const out = compareInterviews([
    row("a1", "Aysel", 5, "advance", "2026-10-01T10:00:00Z", {
      status: "cancelled",
    }),
    row("a2", "Bəxtiyar", 3, "reject", "2026-10-02T10:00:00Z", {
      job_id: "j2",
      job_title: "Analitik",
    }),
  ]);
  assert.deepEqual(
    out.map((j) => j.jobTitle),
    ["Analitik"],
  );
  assert.equal(out[0].candidates[0].lastDecision, "reject");
});

test("onboarding defaults count from the start date and summarise progress", () => {
  const tasks = defaultTasks("2026-11-02");
  assert.equal(tasks.length, DEFAULT_ONBOARDING.length);
  assert.equal(tasks[0].due, "2026-11-02");
  assert.equal(addDaysIso("2026-11-28", 5), "2026-12-03");
  assert.deepEqual(
    taskSummary(
      [
        { done: 1, due: "2026-10-01" },
        { done: 0, due: "2026-10-01" },
        { done: 0, due: "2026-12-01" },
        { done: 0, due: "" },
      ],
      "2026-10-24",
    ),
    { total: 4, done: 1, overdue: 1 },
  );
});

test("the default checklist is added once", async () => {
  const db = memoryD1(
    "CREATE TABLE employee_tasks(id text primary key,company_id text,employee_id text,title text,due text default '',done integer default 0,done_at text default '',done_by text default '',position integer default 0,created text);",
  );
  assert.equal(
    await seedOnboardingTasks(db, "c1", "e1", "2026-11-02"),
    DEFAULT_ONBOARDING.length,
  );
  assert.equal(await seedOnboardingTasks(db, "c1", "e1", "2026-11-02"), 0);
  assert.equal(
    await seedOnboardingTasks(db, "c1", "e2", "2026-11-02"),
    DEFAULT_ONBOARDING.length,
  );
  assert.equal(
    db.raw
      .prepare(
        "SELECT COUNT(*) AS n FROM employee_tasks WHERE employee_id='e1'",
      )
      .get().n,
    DEFAULT_ONBOARDING.length,
  );
});
