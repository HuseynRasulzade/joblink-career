import test from "node:test";
import assert from "node:assert/strict";
import { unzipSync, strFromU8 } from "fflate";
import { createXlsx, excelDateSerial } from "../lib/xlsx.ts";

test("ISO dates become real Excel dates", () => {
  assert.equal(excelDateSerial("1970-01-01"), 25569);
  assert.equal(excelDateSerial("2026-02-30"), null);
  assert.equal(excelDateSerial("abc"), null);
});
test("worksheet stores a date cell with the date style and text stays text", () => {
  const files = unzipSync(createXlsx(["Tarix", "Ad"], [["2026-01-15", "2026-01-15 x"]]));
  const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
  assert.match(sheet, /<c r="A2" s="2"><v>\d+<\/v><\/c>/);
  assert.match(sheet, /<c r="B2" s="0" t="inlineStr">/);
  assert.match(strFromU8(files["xl/styles.xml"]), /numFmtId="164"/);
});
