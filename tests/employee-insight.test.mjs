import test from "node:test";
import assert from "node:assert/strict";
import { duplicateGroups, median, percentile } from "../lib/employee-insight.ts";

const p = (id, extra = {}) => ({ id, name: "Ad " + id, email: "", startDate: "", fin: "", department: "X", ...extra });
test("duplicateGroups: the same FİN, e-mail, or name with start day; one group is listed once", () => {
  const groups = duplicateGroups([p("1", { fin: "ABC1234", email: "a@x.az" }), p("2", { fin: "abc1234", email: "A@x.az" }), p("3", { name: "Eyni Ad", startDate: "2026-01-01" }), p("4", { name: "eyni  ad", startDate: "2026-01-01" }), p("5")]);
  assert.equal(groups.length, 2, "FİN and e-mail point at the same two people: one group");
  assert.deepEqual(groups.map((g) => g.reason), ["Eyni FİN", "Eyni ad və işə başlama tarixi"]);
  assert.equal(duplicateGroups([p("1"), p("2")]).length, 0);
});
test("median and percentile", () => {
  assert.equal(median([]), null);
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([1, 2, 3, 4]), 2.5);
  assert.equal(percentile([10, 20, 30, 40, 50], 0.25), 20);
  assert.equal(percentile([10, 20], 0.5), 15);
});
