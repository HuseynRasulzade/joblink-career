import test from "node:test";
import assert from "node:assert/strict";
import { parseDateCell, parseNumberCell, parseEmployeeRows, parseStaffRows, EMPLOYEE_TEMPLATE_HEADERS, EMPLOYEE_TEMPLATE_EXAMPLE, STAFF_TEMPLATE_HEADERS, STAFF_TEMPLATE_EXAMPLE } from "../lib/staff-import.ts";

test("dates: text, dotted and Excel serial", () => {
  assert.equal(parseDateCell("2026-04-09"), "2026-04-09");
  assert.equal(parseDateCell("09.04.2026"), "2026-04-09");
  assert.equal(parseDateCell("9/4/2026"), "2026-04-09");
  assert.equal(parseDateCell("46121"), "2026-04-09");
  assert.equal(parseDateCell("31.02.2026"), "");
  assert.equal(parseDateCell("abc"), "");
});

test("numbers written in several ways", () => {
  assert.equal(parseNumberCell("2 800"), 2800);
  assert.equal(parseNumberCell("2.800,50"), 2800.5);
  assert.equal(parseNumberCell("2,800.50"), 2800.5);
  assert.equal(parseNumberCell("2800 AZN"), 2800);
  assert.equal(parseNumberCell("2.800"), 2800);
  assert.equal(parseNumberCell(""), 0);
});

test("employee sheet: header found, gross or net read, bad rows reported", () => {
  const rows = [
    ["Şirkət işçiləri"],
    ["Ad Soyad", "Vəzifə", "Departament", "Şöbə", "İşə başlama", "Net maaş", "Məzuniyyət günləri", "İstifadə olunmuş məzuniyyət"],
    ["Aysel Məmmədova", "Baş mühasib", "Maliyyə", "Mühasibat", "09.04.2026", "2 300", "24", "5"],
    ["", "Satıcı", "Satış", "", "", "", "", ""],
    ["Orxan Əliyev", "Analitik", "Maliyyə", "", "tarix deyil", "1800", "", ""],
    ["Leyla Əliyeva", "Mühasib", "Maliyyə", "", "2026-01-05", "1500", "", ""],
    [],
  ];
  const result = parseEmployeeRows(rows);
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[1].vacationDays, 21);
  assert.deepEqual(
    { n: result.rows[0].name, s: result.rows[0].startDate, a: result.rows[0].salary, t: result.rows[0].salaryType, d: result.rows[0].vacationDays, u: result.rows[0].vacationUsed, sec: result.rows[0].section },
    { n: "Aysel Məmmədova", s: "2026-04-09", a: 2300, t: "net", d: 24, u: 5, sec: "Mühasibat" },
  );
  assert.deepEqual(result.issues.map((i) => i.line), [4, 5]);
  assert.equal(parseEmployeeRows([["a", "b"]]).rows.length, 0);
});

test("staff sheet: places default to one, section kept", () => {
  const result = parseStaffRows([
    ["Departament", "Şöbə", "Vəzifə", "Ştat sayı", "Əmək haqqı"],
    ["Maliyyə", "Mühasibat", "Mühasib", "3", "1500"],
    ["Satış", "", "Satış meneceri", "", ""],
    ["", "", "", "", ""],
    ["IT", "", "", "-2", ""],
  ]);
  assert.deepEqual(result.rows.map((r) => [r.department, r.section, r.position, r.planned, r.salary]), [["Maliyyə", "Mühasibat", "Mühasib", 3, 1500], ["Satış", "", "Satış meneceri", 1, 0]]);
  assert.equal(result.issues.length, 1);
});

test("the sample files are read back without a problem", () => {
  const employees = parseEmployeeRows([EMPLOYEE_TEMPLATE_HEADERS, EMPLOYEE_TEMPLATE_EXAMPLE].map((row) => row.map(String)));
  assert.equal(employees.issues.length, 0);
  assert.equal(employees.rows[0].section, "Mühasibat");
  assert.equal(employees.rows[0].salaryType, "gross");
  const staff = parseStaffRows([STAFF_TEMPLATE_HEADERS, STAFF_TEMPLATE_EXAMPLE].map((row) => row.map(String)));
  assert.equal(staff.issues.length, 0);
  assert.equal(staff.rows[0].planned, 1);
});
