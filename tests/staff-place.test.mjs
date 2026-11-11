import test from "node:test";
import assert from "node:assert/strict";
import { resolveStaffPlace } from "../lib/staff-place.ts";

const units = [
  { branch: "A filialı", department: "Maliyyə", section: "Mühasibat", position: "Mühasib" },
  { branch: "B filialı", department: "Satış", section: "", position: "Menecer" },
];
test("what the vacancy carries stays as it is", () => {
  const p = resolveStaffPlace(units, { branch: "A filialı", department: "Maliyyə", section: "Mühasibat", position: "Mühasib" });
  assert.deepEqual(p, { branch: "A filialı", department: "Maliyyə", section: "Mühasibat", position: "Mühasib" });
});
test("missing branch, department and section come from the only row of the position", () => {
  assert.deepEqual(resolveStaffPlace(units, { position: "mühasib" }), { branch: "A filialı", department: "Maliyyə", section: "Mühasibat", position: "mühasib" });
});
test("an ambiguous field is not guessed", () => {
  const two = [...units, { branch: "B filialı", department: "Maliyyə", section: "", position: "Mühasib" }];
  const p = resolveStaffPlace(two, { position: "Mühasib", department: "Maliyyə" });
  assert.equal(p.branch, "");
  assert.equal(p.section, "");
});
test("a branch given by the vacancy narrows the choice", () => {
  const two = [...units, { branch: "B filialı", department: "Maliyyə", section: "", position: "Mühasib" }];
  const p = resolveStaffPlace(two, { branch: "b FİLİALI", position: "Mühasib" });
  assert.equal(p.department, "Maliyyə");
  assert.equal(p.section, "");
});
test("nothing matches: the vacancy values are kept", () => {
  assert.deepEqual(resolveStaffPlace(units, { department: "Hüquq", position: "Vəkil" }), { branch: "", department: "Hüquq", section: "", position: "Vəkil" });
});
