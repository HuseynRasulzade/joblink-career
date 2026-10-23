import test from "node:test";
import assert from "node:assert/strict";
import { memoryD1 } from "./helpers/d1.mjs";
import { runJobAlerts } from "../lib/digest-job.ts";

const schema = `
CREATE TABLE job_alerts(id text primary key,user_id text,name text,filters text,last_check text,seen text default '[]',created text);
CREATE TABLE jobs(id text primary key,owner text,data text,status text,created text);
CREATE TABLE relations(actor_id text,target_id text,kind text);
CREATE TABLE notifications(id text primary key,user_id text,type text,title text,body text,link text,read integer,created text);
CREATE TABLE password_accounts(email text,user_id text);
`;
const now = new Date("2026-10-23T05:00:00Z");
const job = (id, owner, title, extra = {}) => ({ id, owner, created: "2026-10-20T10:00:00Z", status: "published", data: JSON.stringify({ title, company: "Alfa", city: "Bakı", mode: "Ofisdə", category: "Maliyyə", type: "Tam ştat", minSalary: 0, maxSalary: 0, skills: ["Excel"], ...extra }) });

function seed(db) {
  for (const j of [job("j1", "c1", "Mühasib"), job("j2", "c1", "Proqramçı"), job("j3", "c2", "Baş mühasib"), job("j4", "c3", "Mühasib köməkçisi", { deadline: "2026-10-01" }), job("j5", "c4", "Mühasib")])
    db.raw.prepare("INSERT INTO jobs VALUES(?,?,?,?,?)").run(j.id, j.owner, j.data, j.status, j.created);
  db.raw.prepare("INSERT INTO relations VALUES('u1','c4','block')").run();
  db.raw.prepare("INSERT INTO password_accounts VALUES('u1@x.az','u1')").run();
}

test("alert reports only unseen matching vacancies, once", async () => {
  const db = memoryD1(schema);
  seed(db);
  // j1 was already known when the alert was made.
  db.raw.prepare("INSERT INTO job_alerts VALUES('a1','u1','Mühasib','{\"query\":\"mühasib\"}','2026-10-01T00:00:00Z','[\"j1\"]','2026-10-01T00:00:00Z')").run();
  const mails = [];
  const mail = { send: async (m) => mails.push(m) };
  assert.equal(await runJobAlerts(db, mail, "noreply@x.az", now), 1);
  const note = db.raw.prepare("SELECT * FROM notifications").all();
  assert.equal(note.length, 1);
  // j3 matches; j1 seen; j2 other title; j4 expired; j5 blocked company.
  assert.match(note[0].body, /Baş mühasib/);
  assert.doesNotMatch(note[0].body, /Mühasib — Alfa/);
  assert.match(note[0].body, /1 yeni vakansiya/);
  assert.equal(mails.length, 1);
  assert.equal(mails[0].to[0], "u1@x.az");
  // a second run has nothing new
  assert.equal(await runJobAlerts(db, mail, "noreply@x.az", now), 0);
  assert.equal(db.raw.prepare("SELECT COUNT(*) AS n FROM notifications").get().n, 1);
});

test("a vacancy of the candidate's own company never alerts them", async () => {
  const db = memoryD1(schema);
  seed(db);
  db.raw.prepare("INSERT INTO job_alerts VALUES('a2','c2','Mühasib','{\"query\":\"mühasib\"}','2026-10-01T00:00:00Z','[]','2026-10-01T00:00:00Z')").run();
  db.raw.prepare("INSERT INTO job_alerts VALUES('a3','u9','Proqram','{\"city\":\"Gəncə\"}','2026-10-01T00:00:00Z','[]','2026-10-01T00:00:00Z')").run();
  assert.equal(await runJobAlerts(db, null, undefined, now), 1);
  const rows = db.raw.prepare("SELECT user_id,body FROM notifications").all();
  assert.equal(rows[0].user_id, "c2");
  assert.doesNotMatch(rows[0].body, /Baş mühasib/);
});
