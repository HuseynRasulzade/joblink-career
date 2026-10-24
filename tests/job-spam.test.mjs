import test from "node:test";
import assert from "node:assert/strict";
import { jobSpamSignals } from "../lib/job-spam.ts";

const good = { title: "Baş mühasib", description: "Şirkətin mühasibat uçotunun aparılması, hesabatların hazırlanması və vergi orqanları ilə işin təşkili.", requirements: "Ali təhsil, 3 il təcrübə", minSalary: 1500, maxSalary: 2200 };
const ids = (job, n = 0) => jobSpamSignals(job, n).map((s) => s.id);

test("a normal vacancy raises no signal", () => assert.deepEqual(ids(good), []));

test("typical spam patterns are flagged", () => {
  assert.ok(ids({ ...good, description: "Evdən işləyərək qazan! İlkin ödəniş 50 AZN, sonra gündə 200 AZN." }).includes("keywords"));
  assert.ok(ids({ ...good, title: "İŞ TƏKLİFİ ƏLAQƏ +994 50 123 45 67" }).includes("title-contact"));
  assert.ok(ids({ ...good, title: "ZƏNGİN OL TEZ" }).includes("caps"));
  assert.ok(ids({ ...good, title: "Yüksək maaş!!!" }).includes("punct"));
  assert.ok(ids({ ...good, description: "Zəng edin." }).includes("short"));
  assert.ok(ids({ ...good, minSalary: 500, maxSalary: 9000 }).includes("salary"));
  assert.ok(ids(good, 3).includes("duplicates"));
});
