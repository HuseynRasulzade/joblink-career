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

test("addMonthsIso keeps month ends valid", async () => {
  const { addMonthsIso } = await import("../lib/company.ts");
  assert.equal(addMonthsIso("2026-11-02", 3), "2027-02-02");
  assert.equal(addMonthsIso("2026-08-31", 6), "2027-02-28");
  assert.equal(addMonthsIso("2027-08-31", 6), "2028-02-29");
  assert.equal(addMonthsIso("2026-01-15", 0), "2026-01-15");
  assert.equal(addMonthsIso("bad", 3), "");
});

test("safeUrl keeps only plain web links", async () => {
  const { safeUrl, companyDetailsInput } = await import("../lib/company.ts");
  assert.equal(safeUrl("https://maps.google.com/?q=Baku"), "https://maps.google.com/?q=Baku");
  assert.equal(safeUrl("example.az/about"), "https://example.az/about");
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("data:text/html,<b>x"), "");
  assert.equal(safeUrl(""), "");
  const d = companyDetailsInput({ foundedYear: "1850", mapUrl: "javascript:x", videoUrl: "youtu.be/abc", officeAddress: "  Nizami 10 " });
  assert.equal(d.foundedYear, "");
  assert.equal(d.mapUrl, "");
  assert.equal(d.videoUrl, "https://youtu.be/abc");
  assert.equal(d.officeAddress, "Nizami 10");
});

test("VAT part of a total with 18% included", async () => {
  const { vatParts, normalizeVat } = await import("../lib/vat.ts");
  assert.deepEqual(vatParts(11800, 18), { total: 11800, vat: 1800, net: 10000 });
  assert.deepEqual(vatParts(5000, 0), { total: 5000, vat: 0, net: 5000 });
  assert.equal(normalizeVat("18"), 18);
  assert.equal(normalizeVat(20), 0);
});
