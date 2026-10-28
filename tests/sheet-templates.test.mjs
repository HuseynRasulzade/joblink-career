import test from "node:test";
import assert from "node:assert/strict";
import { SHEET_TEMPLATES, templateSheets } from "../lib/sheet-templates.ts";
import { parseEmployeeRows, parseStaffRows, parseStructureRows } from "../lib/staff-import.ts";
import { parseAttendanceRows, parseCalendarRows, parseProfileRows, matchAttendanceCode, parseCalendarKind } from "../lib/sheet-imports.ts";
import { createXlsxBook } from "../lib/xlsx.ts";

const asRows = (kind) => {
  const sheet = templateSheets(kind)[0];
  return [sheet.headers, ...sheet.rows].map((row) => row.map((v) => String(v ?? "")));
};

test("every sample file is read back by its own importer without a problem", () => {
  const checks = {
    employees: parseEmployeeRows,
    staff: parseStaffRows,
    structure: parseStructureRows,
    attendance: parseAttendanceRows,
    calendar: parseCalendarRows,
    profiles: parseProfileRows,
  };
  for (const [kind, parse] of Object.entries(checks)) {
    const result = parse(asRows(kind));
    assert.deepEqual(result.issues, [], `${kind} issues`);
    assert.equal(result.rows.length, SHEET_TEMPLATES[kind].examples.length, `${kind} rows`);
  }
  // the sections file has one column the structure importer does not know: the server reads the first column
  assert.deepEqual(asRows("sections").slice(0, 2), [["Şöbə"], ["Mühasibat"]]);
});

test("each template documents every column and the sample has as many cells as columns", () => {
  for (const [kind, t] of Object.entries(SHEET_TEMPLATES)) {
    for (const row of t.examples) assert.equal(row.length, t.columns.length, `${kind} example width`);
    const [sample, guide] = templateSheets(kind);
    assert.equal(sample.name, "Nümunə");
    assert.equal(guide.name, "Təlimat");
    assert.equal(guide.rows.filter((r) => r.length === 5 && r[0] && t.columns.some((c) => c.header === r[0])).length, t.columns.length, `${kind} guide`);
    assert.ok(t.columns.some((c) => c.required), `${kind} has a required column`);
    assert.ok(t.rules.length >= 1);
  }
});

test("the template is a real two-sheet workbook", () => {
  const bytes = createXlsxBook(templateSheets("attendance"));
  assert.ok(bytes.length > 1000);
});

test("attendance reasons are found by name, short code or id", () => {
  assert.equal(matchAttendanceCode("Əmək məzuniyyəti"), "annual");
  assert.equal(matchAttendanceCode("ƏM"), "annual");
  assert.equal(matchAttendanceCode("sick"), "sick");
  assert.equal(matchAttendanceCode("Xəstəlik"), "sick");
  assert.equal(matchAttendanceCode("Xəstəlik (xəstəlik vərəqəsi)"), "sick");
  assert.equal(matchAttendanceCode("Ezamiyyətdə"), "trip");
  assert.equal(matchAttendanceCode("nə isə"), "");
});

test("attendance rows: one date is one day, bad rows are reported", () => {
  const r = parseAttendanceRows([
    ["Ad Soyad", "Tarix", "Səbəb"],
    ["Aysel Məmmədova", "16.03.2026", "Xəstəlik"],
    ["", "2026-03-17", "Xəstəlik"],
    ["Orxan", "2026-03-17", "bilinmir"],
    ["Orxan", "xxx", "Xəstəlik"],
    ["Orxan", "2026-03-18", "Sil"],
  ]);
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[0].to, "2026-03-16");
  assert.equal(r.rows[1].code, "");
  assert.equal(r.issues.length, 3);
  assert.equal(parseAttendanceRows([["Ad Soyad", "Tarix"], ["A", "2026-01-01"]]).issues.length, 1);
});

test("calendar kinds", () => {
  assert.equal(parseCalendarKind("Qeyri-iş günü"), "off");
  assert.equal(parseCalendarKind("İş günü"), "work");
  assert.equal(parseCalendarKind("işlək şənbə"), "work");
  assert.equal(parseCalendarKind("Qısaldılmış gün"), "short");
  assert.equal(parseCalendarKind("Sil"), "clear");
  assert.equal(parseCalendarKind("?"), "");
  const r = parseCalendarRows([["Tarix", "Növ"], ["2026-03-14", "İş günü"], ["bad", "İş günü"], ["2026-03-15", "?"], ["2026-03-16", "Sil"]]);
  assert.equal(r.rows.length, 2);
  assert.equal(r.rows[1].kind, "");
  assert.equal(r.issues.length, 2);
});

test("personal data: only filled cells, wrong values reported", () => {
  const r = parseProfileRows([
    ["Ad Soyad", "FİN", "Doğum tarixi", "Cins", "IBAN", "Əlilliyi olan uşaq"],
    ["Aysel", "5abc12x", "12.04.1990", "Qadın", "", "Bəli"],
    ["Orxan", "12", "", "", "", ""],
    ["Nigar", "", "bad", "", "", ""],
  ]);
  assert.equal(r.rows.length, 1);
  assert.deepEqual(r.rows[0].profile, { fin: "5ABC12X", birthDate: "1990-04-12", gender: "female", hasDisabledChild: true });
  assert.equal(r.issues.length, 2);
  assert.equal(parseProfileRows([["Ad Soyad"], ["A"]]).issues.length, 1);
});

import { matchEmployee } from "../lib/sheet-imports.ts";
test("a row finds its employee by e-mail or by a unique name", () => {
  const list = [
    { id: "1", name: "Aysel Məmmədova", email: "aysel@example.az" },
    { id: "2", name: "Eyni Ad", email: "a@example.az" },
    { id: "3", name: "Eyni Ad", email: "b@example.az" },
  ];
  assert.deepEqual(matchEmployee(list, { name: "aysel məmmədova", email: "" }), { id: "1" });
  assert.deepEqual(matchEmployee(list, { name: "Eyni Ad", email: "B@example.az" }), { id: "3" });
  assert.match(matchEmployee(list, { name: "Eyni Ad", email: "" }).error, /e-poçt/);
  assert.match(matchEmployee(list, { name: "Yoxdur", email: "" }).error, /tapılmadı/);
});
