import test from "node:test";
import assert from "node:assert/strict";
import { daysLeft, deadlinesOf } from "../lib/hr-deadlines.ts";

test("days left and what falls inside the window", () => {
  assert.equal(daysLeft("2026-04-10", "2026-04-01"), 9);
  const r = deadlinesOf(
    [{ id: "a", name: "Aysel", profile: { idExpires: "2026-04-20", disabilityUntil: "2027-01-01" } }],
    [{ id: "d1", employeeId: "a", label: "Tibbi arayış", expires: "2026-03-30" }, { id: "d2", employeeId: "a", label: "Sertifikat", expires: "2026-09-01" }],
    "2026-04-01",
  );
  assert.deepEqual(r.map((x) => [x.what, x.days]), [["Tibbi arayış", -2], ["Şəxsiyyət vəsiqəsi", 19]]);
});
