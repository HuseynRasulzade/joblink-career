// Employee probation reminders.
import test from "node:test";
import assert from "node:assert/strict";
import { runProbationReminders } from "../lib/digest-job.ts";

test("probation reminder goes out once per employee", async () => {
  const rows = [{ id: "e1", company_id: "c1", name: "Əli Əliyev", position: "Mühasib", probation_end: "2026-10-26" }];
  const inserted = [];
  let claimed = false;
  const db = {
    prepare(sql) {
      return {
        bind: () => ({
          all: async () => ({ results: rows }),
          first: async () => ({ email: "c1@example.test" }),
          run: async () => {
            if (sql.startsWith("UPDATE company_employees")) { const first = !claimed; claimed = true; return { meta: { changes: first ? 1 : 0 } }; }
            inserted.push(sql.slice(0, 24));
            return { meta: { changes: 1 } };
          },
        }),
      };
    },
  };
  const mails = [];
  const mail = { send: async (m) => mails.push(m.subject) };
  const now = new Date("2026-10-23T05:00:00Z");
  assert.equal(await runProbationReminders(db, mail, "x@x.test", now), 1);
  assert.equal(await runProbationReminders(db, mail, "x@x.test", now), 0);
  assert.equal(inserted.length, 1);
  assert.deepEqual(mails, ["Sınaq müddəti: Əli Əliyev"]);
});
