import test from "node:test";
import assert from "node:assert/strict";
import { buildHrDocument, hrDocumentHtml } from "../lib/hr-documents.ts";

const company = { name: "Test MMC", voen: "1234567890", address: "Bakı", director: "Əli Əliyev" };
const employee = { name: "Aysel Məmmədova", fin: "5ABC12X", idSeries: "AZE", idNumber: "12345678", idIssuedBy: "DİN", address: "Bakı, Nəsimi", position: "Mühasib", department: "Maliyyə", section: "", startDate: "2026-03-02", gross: 1500, weekHours: 40 };

test("contract carries the parties, position, pay and term", () => {
  const doc = buildHrDocument("contract", company, employee, { date: "2026-03-01", number: "7", probationMonths: 3 });
  const text = JSON.stringify(doc);
  assert.match(text, /Test MMC/);
  assert.match(text, /Mühasib/);
  assert.match(text, /1.?500/);
  assert.match(text, /3 ay sınaq/);
  assert.match(text, /müddətsiz/);
});
test("unknown values stay as blanks", () => {
  const doc = buildHrDocument("contract", { ...company, director: "" }, { ...employee, gross: 0, startDate: "" }, {});
  assert.match(JSON.stringify(doc), /__________/);
});
test("certificate hides the salary on request and html escapes", () => {
  const doc = buildHrDocument("certificate", company, employee, { withSalary: false, purpose: "<banka>" });
  assert.doesNotMatch(JSON.stringify(doc), /əmək haqqı/);
  assert.match(hrDocumentHtml(doc), /&lt;banka&gt;/);
});
test("addendum lists only the changed terms", () => {
  const doc = buildHrDocument("addendum", company, employee, { changeFrom: "2026-05-01", newGross: "1800" });
  const text = JSON.stringify(doc);
  assert.match(text, /1800 AZN/);
  assert.doesNotMatch(text, /vəzifəsinə keçirilir/);
});
