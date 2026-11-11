import test from "node:test";
import assert from "node:assert/strict";
import { parseBranchSheets, branchWorkbook, branchTemplate, BX } from "../lib/branches-excel.ts";

const rowsOf = (sheets) => sheets.map((s) => ({ name: s.name, rows: [s.headers, ...s.rows.map((r) => r.map((c) => String(c ?? "")))] }));

test("the sample file reads without a problem and carries branches, links, sales and a rule", () => {
  const r = parseBranchSheets(rowsOf(branchTemplate("2026-11")));
  assert.deepEqual(r.issues, []);
  assert.equal(r.branches.length, 2);
  assert.equal(r.links.length, 3);
  assert.equal(r.links[0].role, "Baş mühasib");
  assert.equal(r.sales[0].kind, "fixed");
  assert.equal(r.sales[1].kind, "salary_percent");
  assert.equal(r.mode, "equal");
});
test("an exported workbook reads back the same", () => {
  const sheets = branchWorkbook({ mode: "sales", branches: [{ name: "X", code: "", city: "", active: false }], links: [{ fin: "F1", name: "N", branch: "X", role: "R", sharePct: 40, bonusEligible: false, from: "2026-11-01", to: "", department: "D", section: "S" }], sales: [{ month: "2026-11", branch: "X", target: 10, sales: 12, kind: "fixed", value: 5, active: false }] });
  const r = parseBranchSheets(rowsOf(sheets));
  assert.deepEqual(r.issues, []);
  assert.equal(r.mode, "sales");
  assert.equal(r.branches[0].active, false);
  assert.deepEqual([r.links[0].sharePct, r.links[0].bonusEligible, r.links[0].from, r.links[0].department, r.links[0].section], [40, false, "2026-11-01", "D", "S"]);
  assert.deepEqual([r.sales[0].target, r.sales[0].sales, r.sales[0].active], [10, 12, false]);
});
test("bad lines are named; a file of another kind is refused", () => {
  const r = parseBranchSheets([
    { name: BX.branches, rows: [["Filial", "Kod", "Şəhər", "Aktiv"], ["", "X", "", ""], ["A", "", "", ""], ["a", "", "", ""]] },
    { name: BX.links, rows: [["FİN", "Ad Soyad", "Filial", "Vəzifə (filialda)", "Pay %", "Bonus alır", "Başlama", "Bitmə"], ["", "", "A", "", "", "", "", ""], ["F", "N", "", "", "", "", "", ""], ["F", "N", "A", "", "150", "", "", ""]] },
    { name: BX.sales, rows: [["Ay", "Filial", "Satış limiti", "Satış", "Bonus növü", "Bonus dəyəri", "Qayda aktiv"], ["2026-13", "A", "1", "1", "", "", ""], ["2026-11", "A", "-5", "1", "", "", ""], ["2026-11", "A", "5", "1", "Hədiyyə", "", ""]] },
  ]);
  assert.equal(r.issues.filter((i) => i.sheet === BX.branches).length, 2);
  assert.equal(r.issues.filter((i) => i.sheet === BX.links).length, 3);
  assert.equal(r.issues.filter((i) => i.sheet === BX.sales).length, 3);
  assert.match(parseBranchSheets([{ name: "X", rows: [["a"]] }]).issues[0].reason, /filial faylı deyil/);
});
