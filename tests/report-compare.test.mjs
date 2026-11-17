import test from "node:test";
import assert from "node:assert/strict";
import { previousFilters, mergeCompare } from "../lib/report-compare.ts";

test("previousFilters steps a month, a year or a date range back, and says null when there is no period", () => {
  assert.deepEqual(previousFilters({ month: "2026-01", department: "X" }, { month: "month", department: "department" }), { month: "2025-12", department: "X" });
  assert.deepEqual(previousFilters({ year: "2026" }, { year: "year" }), { year: "2025" });
  assert.deepEqual(previousFilters({ from: "2026-11-01", to: "2026-11-30" }, { from: "from", to: "to" }), { from: "2026-10-02", to: "2026-10-31" });
  assert.equal(previousFilters({ from: "2026-11-01", to: "" }, { from: "from", to: "to" }), null);
  assert.equal(previousFilters({ status: "x" }, { status: "select" }), null);
});
test("mergeCompare matches rows by their first cell and adds the earlier value and the change", () => {
  const cur = { columns: ["Departament", "İşçi", "Fond", "Qeyd"], rows: [["Maliyyə", 5, 1000, "a"], ["Satış", 3, 500, "b"]], totals: ["CƏMİ", 8, 1500, ""] };
  const prev = { columns: cur.columns, rows: [["Maliyyə", 4, 900, "a"]], totals: ["CƏMİ", 4, 900, ""] };
  const r = mergeCompare(cur, prev);
  assert.deepEqual(r.columns.slice(4), ["İşçi (əvvəlki dövr)", "İşçi: dəyişiklik", "Fond (əvvəlki dövr)", "Fond: dəyişiklik"]);
  assert.deepEqual(r.rows[0].slice(4), [4, 1, 900, 100]);
  assert.deepEqual(r.rows[1].slice(4), [0, 3, 0, 500]); // a row that did not exist before
  assert.deepEqual(r.totals.slice(4), [4, 4, 900, 600]);
  assert.equal(mergeCompare({ columns: ["A", "B"], rows: [["x", "y"]] }, { columns: ["A", "B"], rows: [] }).columns.length, 2); // nothing numeric: unchanged
});
