import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildPayrollWorkbook, WB } from "../lib/payroll-workbook.ts";
import { workbookImportRows } from "../lib/payroll-workbook-import.ts";
import { readWorkbookSheets } from "../lib/workbook-read.ts";
import { createXlsxBook } from "../lib/xlsx.ts";
import { monthDays } from "../lib/calendar-az.ts";
import { parseAttendanceRows, parsePayrollRows, parseTrips } from "../lib/sheet-imports.ts";
import { parseHoursTotals } from "../lib/hours.ts";
import { parseBranchSheets } from "../lib/branches-excel.ts";

const month = "2026-11";
const days = monthDays(2026, 11).map((d) => ({ date: d.date, off: d.off }));
let finCounter = 0;
const emp = (name, extra = {}) => ({ name, fin: `FN${String(++finCounter).padStart(5, "0")}`, position: "", department: "", salary: 1500, sector: "private", taxReduction: 0, weekHours: 40, averageMonthly: 0, nightPercent: 0, leaveCompDays: 0, benefitEligible: true, newSalary: 0, salaryChangeFrom: "", taxBenefit: "", dependents3: false, start: "", end: "", ...extra });
const input = {
  month, days,
  employees: [
    emp("Aysel Tam"),
    emp("Orxan Məzuniyyət", { salary: 3000, taxReduction: 200, averageMonthly: 2800, nightPercent: 50 }),
    emp("Nigar Dövlət", { salary: 800, sector: "public" }),
    emp("Elnur Yeni", { salary: 1000, weekHours: 36, start: "2026-11-12" }),
    emp("Rəşad Yüksək", { salary: 9000 }),
    emp("Samir Çıxan", { salary: 1200, end: "2026-11-05", leaveCompDays: 6, averageMonthly: 1150 }),
    emp("Vüsal Hissəli", { salary: 2000 }),
    emp("Günel Xəstə", { salary: 3000, averageMonthly: 2900 }),
    emp("Kamran Staj", { salary: 1800, benefitEligible: false }),
    emp("Leyla Dəyişən", { salary: 1000, newSalary: 1500, salaryChangeFrom: "2026-11-16" }),
    emp("Murad Güzəşt", { salary: 1400, taxBenefit: "Əlillik 61-100%", dependents3: true, taxReduction: 0 }),
  ],
  leaves: [
    { name: "Orxan Məzuniyyət", code: "annual", from: "2026-11-09", to: "2026-11-17", note: "Əmr № 5" },
    { name: "Orxan Məzuniyyət", code: "sick", from: "2026-11-23", to: "2026-11-24", note: "" },
    { name: "Nigar Dövlət", code: "downtime", from: "2026-11-03", to: "2026-11-04", note: "" },
    { name: "Nigar Dövlət", code: "unpaid", from: "2026-11-18", to: "2026-11-18", note: "" },
    { name: "Aysel Tam", code: "donor", from: "2026-11-05", to: "2026-11-05", note: "" },
    // two separate stretches: the weekend between them is not a vacation day (the 4th and 5th are worked)
    { name: "Vüsal Hissəli", code: "annual", from: "2026-11-02", to: "2026-11-03", note: "" },
    { name: "Vüsal Hissəli", code: "annual", from: "2026-11-11", to: "2026-11-13", note: "" },
    // sickness over a weekend and the Flag Day holiday: every calendar day counts
    { name: "Günel Xəstə", code: "sick", from: "2026-11-06", to: "2026-11-11", note: "" },
    { name: "Kamran Staj", code: "sick", from: "2026-11-23", to: "2026-11-24", note: "" },
  ],
  adds: [
    { name: "Aysel Tam", kind: "Mükafat", label: "Rüblük", amount: 150, deductionKind: "Ümumi" },
    { name: "Aysel Tam", kind: "Mükafat", label: "Layihə", amount: 50, deductionKind: "Ümumi" },
    { name: "Aysel Tam", kind: "Əlavə", label: "Şərait", amount: 50, deductionKind: "Ümumi" },
    { name: "Aysel Tam", kind: "Tutulma", label: "Kredit", amount: 100, deductionKind: "Ümumi" },
    { name: "Aysel Tam", kind: "Tutulma", label: "Cərimə", amount: 30, deductionKind: "Ümumi" },
    { name: "Nigar Dövlət", kind: "Tutulma", label: "Aliment", amount: 600, deductionKind: "Aliment" },
    { name: "Nigar Dövlət", kind: "Avans", label: "", amount: 200, deductionKind: "Ümumi" },
    { name: "Rəşad Yüksək", kind: "Tutulma", label: "İcra", amount: 5000, deductionKind: "İcra sənədi" },
  ],
  hours: [{ name: "Orxan Məzuniyyət", overtime: 6, restDay: 8, night: 12 }],
  trips: [
    { name: "Aysel Tam", destination: "Türkiyə, İstanbul şəhəri", place: "", start: "2026-11-23", end: "2026-11-25", purpose: "Görüş", advance: 100, other: 120 },
    { name: "Orxan Məzuniyyət", destination: "Gəncə şəhəri", place: "", start: "2026-11-02", end: "2026-11-03", purpose: "Filial", advance: 0, other: 0 },
    { name: "Nigar Dövlət", destination: "Digər şəhər, rayon mərkəzi, qəsəbə və ya kənd", place: "Şəki", start: "2026-11-10", end: "2026-11-11", purpose: "Yoxlama", advance: 20, other: 0, daily: 120 },
  ],
  rates: { USD: 1.7, EUR: 1.9037, GBP: 2.2834, JPY: 0.010768 }, ratesDate: "2026-11-06",
  benefit: { sickPercent: 80, maternityPercent: 100, minPension: 10 },
  // Vüsal works in two branches (shared by sales: 1500 / 900), Orxan in one; Nigar's branch is passive and the bonus of another is switched off
  branches: {
    mode: "sales",
    branches: [
      { name: "A filialı", code: "A", city: "Bakı", active: true, target: 1000, sales: 1500, kind: "fixed", value: 200, ruleActive: true },
      { name: "B filialı", code: "B", city: "Gəncə", active: true, target: 800, sales: 900, kind: "salary_percent", value: 50, ruleActive: true },
      { name: "C filialı", code: "C", city: "Şəki", active: false, target: 100, sales: 500, kind: "fixed", value: 999, ruleActive: true },
    ],
    links: [
      { name: "Vüsal Hissəli", fin: "", branch: "A filialı", role: "Baş mühasib", sharePct: 0, bonusEligible: true, from: "", to: "" },
      { name: "Vüsal Hissəli", fin: "", branch: "B filialı", role: "Mühasib", sharePct: 0, bonusEligible: true, from: "", to: "" },
      { name: "Orxan Məzuniyyət", fin: "", branch: "A filialı", role: "Satış meneceri", sharePct: 0, bonusEligible: true, from: "", to: "" },
      { name: "Nigar Dövlət", fin: "", branch: "C filialı", role: "Kassir", sharePct: 0, bonusEligible: true, from: "", to: "" },
      { name: "Nigar Dövlət", fin: "", branch: "B filialı", role: "Kassir", sharePct: 0, bonusEligible: false, from: "", to: "" },
      // Aysel moved in the middle of the month: A until the 13th, B from the 16th; her pay follows the working days spent in each
      { name: "Aysel Tam", fin: "", branch: "A filialı", role: "Mühasib", sharePct: 0, bonusEligible: false, from: "", to: "2026-11-13" },
      { name: "Aysel Tam", fin: "", branch: "B filialı", role: "Baş mühasib", sharePct: 0, bonusEligible: false, from: "2026-11-16", to: "" },
    ],
  },
};
input.branches.links.forEach((l) => { l.fin = input.employees.find((e) => e.name === l.name).fin; });
const finOf = (name) => input.employees.find((e) => e.name === name).fin;
const sheets = buildPayrollWorkbook(input);
const bytes = createXlsxBook(sheets);
const read = readWorkbookSheets(bytes);
const sheetOf = (name) => read.find((s) => s.name === name);

test("the workbook has every sheet, in a working order", () => {
  assert.deepEqual(read.map((s) => s.name), [WB.guide, WB.staff, WB.leaves, WB.sheet, WB.adds, WB.branches, WB.branchPeople, WB.hours, WB.trips, WB.calc, WB.params, WB.norms, WB.fx, WB.benefits, WB.codes, WB.helper]);
  assert.match(sheetOf(WB.guide).rows[0][0], /2026-11/);
});

test("the shown values are the platform's own: gross, tax, net and the amount to pay of every scenario", () => {
  const calc = sheetOf(WB.calc);
  const header = calc.rows[3];
  const col = (title) => header.indexOf(title);
  const rowOf = (name) => calc.rows.find((r) => r[0] === name);
  const n = (name, title) => Number(rowOf(name)[col(title)]);
  // 1500 gross, 19 working days, one donor day (paid), bonus 200, allowance 50, deductions 130 (cap 20% of net)
  assert.equal(n("Aysel Tam", "Hesablanmış (gross)"), 1750);
  assert.equal(n("Aysel Tam", "Mükafat"), 200);
  assert.equal(n("Aysel Tam", "Tutulma (istənilən)"), 130);
  assert.ok(n("Aysel Tam", "Ödəniləcək") > 0);
  // alimony 600 is cut to 70% of the net; the advance comes off after that
  const nigarNet = n("Nigar Dövlət", "Xalis (net)");
  assert.equal(n("Nigar Dövlət", "Tutulma həddi"), 0.7);
  assert.equal(n("Nigar Dövlət", "Tutulma (tətbiq)"), Math.min(600, Math.round(nigarNet * 0.7 * 100) / 100));
  // a leaver-free mid-month hire is paid for the days after the hire date only
  assert.ok(n("Elnur Yeni", "Hesablanmış (gross)") < 1000);
  assert.ok(n("Rəşad Yüksək", "Gəlir vergisi") > 600);
  // a leaver is paid the days up to the end date and the unused leave: 1150 ÷ 30.4 × 6
  assert.equal(n("Samir Çıxan", "Məzuniyyət kompensasiyası"), 226.97);
  assert.ok(n("Samir Çıxan", "Hesablanmış (gross)") > 226.97);
  // a pay change on the 16th: the month is paid at the day-weighted mean (8 working days at 1000, 11 at 1500)
  assert.equal(Math.round(n("Leyla Dəyişən", "Aylıq maaş (hesablama üçün)") * 100) / 100, 1289.47);
  // a tax benefit picked from the list plus the dependants' reduction: 200 + 50
  assert.equal(n("Murad Güzəşt", "Vergi azaldılması"), 250);
  // sickness: 80% of the average, calendar days 6–11 November (6 days), cut to 25 × the minimum pension (10 → 250)
  assert.equal(n("Günel Xəstə", "Müavinət (təqvim)"), 6);
  assert.equal(n("Günel Xəstə", "Sığorta müavinəti (SS ödəyir)"), 250);
  // no 6 months of insurance record: no benefit
  assert.equal(n("Kamran Staj", "Sığorta müavinəti (SS ödəyir)"), 0);
  // trips are shown beside the pay, not inside it
  assert.ok(n("Aysel Tam", "Ezamiyyət (ayrıca)") > 0);
});

test("the timesheet shows the leave codes on the right days and the day counts", () => {
  const tabel = sheetOf(WB.sheet);
  const dates = tabel.rows[2];
  const column = (iso) => {
    const serial = Math.round(Date.parse(`${iso}T00:00:00Z`) / 86400000) + 25569;
    return dates.findIndex((v) => Number(v) === serial);
  };
  const orxan = tabel.rows.find((r) => r[0] === "Orxan Məzuniyyət");
  assert.equal(orxan[column("2026-11-09")], ""); // 9 November is a public holiday: not a leave day
  assert.equal(orxan[column("2026-11-11")], "ƏM");
  assert.equal(orxan[column("2026-11-16")], "ƏM");
  assert.equal(orxan[column("2026-11-14")], ""); // a Saturday inside the vacation is not marked, but counted as a vacation calendar day
  assert.equal(orxan[column("2026-11-23")], "XS");
  const elnur = tabel.rows.find((r) => r[0] === "Elnur Yeni");
  assert.equal(elnur[column("2026-11-05")], "X");
  assert.equal(elnur[column("2026-11-13")], "");
  const head = tabel.rows[2];
  // two separate vacation stretches: only the days of the stretches count, not the weekend between them
  assert.equal(Number(tabel.rows.find((r) => r[0] === "Vüsal Hissəli")[head.indexOf("Məzuniyyət (təqvim günü)")]), 5);
  const summary = (name, title) => Number(tabel.rows.find((r) => r[0] === name)[head.indexOf(title)]);
  assert.equal(summary("Orxan Məzuniyyət", "Məzuniyyət (iş günü)"), 5);
  assert.equal(summary("Orxan Məzuniyyət", "Məzuniyyət (təqvim günü)"), 7); // 5 working days and the weekend between them
  assert.equal(summary("Orxan Məzuniyyət", "Müavinətlə (SS)"), 2);
  assert.equal(summary("Nigar Dövlət", "Boşdayanma"), 2);
  assert.equal(summary("Nigar Dövlət", "Ödənişsiz"), 1);
});

test("what goes back into the platform: every input sheet becomes rows of the platform's own imports", () => {
  const imported = workbookImportRows(read, month);
  assert.deepEqual(imported.issues, []);
  assert.deepEqual(imported.found, [WB.leaves, WB.adds, WB.hours, WB.trips, WB.branches, WB.staff]);

  const attendance = parseAttendanceRows(imported.attendance);
  assert.deepEqual(attendance.issues, []);
  assert.equal(attendance.rows.length, 9);
  const vacation = attendance.rows.find((r) => r.name === "Orxan Məzuniyyət" && r.code === "annual");
  assert.deepEqual([vacation.from, vacation.to, vacation.note], ["2026-11-09", "2026-11-17", "Əmr № 5"]);
  assert.equal(attendance.rows.find((r) => r.name === "Nigar Dövlət" && r.code === "downtime").to, "2026-11-04");

  // the bonuses of one employee are added up; each deduction keeps its own line; the advance is not sent
  const payroll = parsePayrollRows(imported.payroll);
  assert.deepEqual(payroll.issues, []);
  const aysel = payroll.rows.filter((r) => r.name === "Aysel Tam");
  assert.equal(aysel.length, 2);
  assert.equal(aysel[0].bonus, 200);
  assert.equal(aysel[0].allowance, 50);
  assert.deepEqual(aysel.map((r) => r.deductionLabel), ["Kredit", "Cərimə"]);
  const nigar = payroll.rows.find((r) => r.name === "Nigar Dövlət");
  assert.equal(nigar.deductionKind, "alimony");
  assert.equal(nigar.deductionAmount, 600);
  assert.equal(payroll.rows.find((r) => r.name === "Rəşad Yüksək").deductionKind, "writ");

  const hours = parseHoursTotals(imported.hours, month);
  assert.equal(hours.rows.length, 1);
  assert.deepEqual([hours.rows[0].overtime, hours.rows[0].restDay, hours.rows[0].night], [6, 8, 12]);

  const trips = parseTrips(imported.trips);
  assert.deepEqual(trips.issues, []);
  assert.equal(trips.rows.length, 3);
  const istanbul = trips.rows.find((t) => t.destination.includes("İstanbul"));
  assert.equal(istanbul.abroad, true);
  assert.equal(istanbul.advance, 100);
  assert.equal(trips.rows.find((t) => t.destination === "Gəncə şəhəri").abroad, false);
  // the "other place" of the table is replaced by the name typed beside it
  assert.equal(trips.rows.find((t) => t.name === "Nigar Dövlət").destination, "Şəki");
  // the per-diem typed beside a trip is kept; the others are left empty for the platform to work out from the law's norm and the bank's rate
  assert.equal(trips.rows.find((t) => t.name === "Nigar Dövlət").daily, 120);
  assert.ok(trips.rows.filter((t) => t.name !== "Nigar Dövlət").every((t) => !t.daily));
});

test("a file that is not the calculation workbook is refused with a clear message", () => {
  const other = readWorkbookSheets(createXlsxBook([{ name: "Sheet1", headers: ["a"], rows: [["b"]] }]));
  const imported = workbookImportRows(other, month);
  assert.equal(imported.attendance, null);
  assert.match(imported.issues[0], /hesablama iş kitabı deyil/);
});

test("an unknown kind in the additions sheet is reported, not silently dropped", () => {
  const changed = structuredClone(read);
  const adds = changed.find((s) => s.name === WB.adds);
  const first = adds.rows.findIndex((r) => r[0] === "Aysel Tam");
  adds.rows[first][2] = "Premiya";
  const imported = workbookImportRows(changed, month);
  assert.match(imported.issues.join(" "), /Premiya/);
});

const soffice = spawnSync("soffice", ["--version"], { encoding: "utf8" });
test("LibreOffice recalculates every formula to the value the platform gives", { skip: soffice.status !== 0 ? "LibreOffice is not installed" : false, timeout: 180000 }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wb-"));
  const file = path.join(dir, "in.xlsx");
  fs.writeFileSync(file, bytes);
  const run = spawnSync("soffice", ["--headless", "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir", path.join(dir, "out"), file], { encoding: "utf8", timeout: 150000 });
  assert.equal(run.status, 0, run.stderr);
  const recalculated = readWorkbookSheets(new Uint8Array(fs.readFileSync(path.join(dir, "out", "in.xlsx"))));
  let compared = 0;
  const problems = [];
  for (const name of [WB.sheet, WB.calc, WB.trips, WB.leaves, WB.hours, WB.helper, WB.staff, WB.branches, WB.branchPeople]) {
    const ours = sheetOf(name);
    const theirs = recalculated.find((s) => s.name === name);
    ours.rows.forEach((row, r) => {
      row.forEach((value, c) => {
        const other = theirs.rows[r]?.[c] ?? "";
        if (value === "" && other === "") return;
        compared++;
        const a = Number(value);
        const b = Number(other);
        const bothNumbers = value !== "" && other !== "" && Number.isFinite(a) && Number.isFinite(b);
        if (bothNumbers ? Math.abs(a - b) > 0.0101 : String(value) !== String(other)) problems.push(`${name}!${r + 1},${c + 1}: ${value} ≠ ${other}`);
      });
    });
  }
  assert.ok(compared > 400, `only ${compared} cells compared`);
  assert.deepEqual(problems.slice(0, 10), []);
});

const clone = () => structuredClone(read);
const rowOf = (sheets, sheet, name, kind, kindAt = 2) => sheets.find((x) => x.name === sheet).rows.find((r) => r[0] === name && (!kind || r[kindAt] === kind));

test("the named bonus and allowance lines are kept for the platform, next to the totals", () => {
  const imported = workbookImportRows(read, month);
  const aysel = imported.items.filter((i) => i.name === "Aysel Tam");
  assert.deepEqual(aysel.map((i) => [i.kind, i.label, i.amount]), [["bonus", "Rüblük", 150], ["bonus", "Layihə", 50], ["allowance", "Şərait", 50]]);
  const payroll = parsePayrollRows(imported.payroll);
  assert.equal(payroll.rows.find((r) => r.name === "Aysel Tam").bonus, 200);
});

test("an advance is sent only when it has a payment date; the ones the workbook came with are payments already recorded", () => {
  assert.deepEqual(workbookImportRows(read, month).advances, []);
  const changed = clone();
  const row = rowOf(changed, WB.adds, "Nigar Dövlət", "Avans");
  row[7] = String(Math.round(Date.parse("2026-11-10T00:00:00Z") / 86400000) + 25569);
  const imported = workbookImportRows(changed, month);
  assert.deepEqual(imported.advances, [{ name: "Nigar Dövlət", fin: finOf("Nigar Dövlət"), amount: 200, date: "2026-11-10", note: "" }]);
  row[7] = "sabah";
  assert.match(workbookImportRows(changed, month).issues.join(" "), /avansın tarixi oxunmadı/);
});

test("a pay change typed in the staff sheet becomes an order to send; a missing day is reported", () => {
  const imported = workbookImportRows(read, month);
  assert.deepEqual(imported.salaryChanges, [{ name: "Leyla Dəyişən", fin: finOf("Leyla Dəyişən"), salary: 1500, from: "2026-11-16" }]);
  const changed = clone();
  const row = rowOf(changed, WB.staff, "Leyla Dəyişən");
  row[14] = "";
  const again = workbookImportRows(changed, month);
  assert.deepEqual(again.salaryChanges, []);
  assert.match(again.issues.join(" "), /dəyişmə tarixi yoxdur/);
});

test("a destination that is not one of the law's places is refused, not taken for a place inside the country", () => {
  const changed = clone();
  const trip = rowOf(changed, WB.trips, "Aysel Tam");
  trip[2] = "Atlantida";
  let imported = workbookImportRows(changed, month);
  assert.match(imported.issues.join(" "), /Atlantida.*qanunun gündəlik cədvəlində yoxdur/);
  assert.equal(parseTrips(imported.trips).rows.some((t) => t.name === "Aysel Tam"), false);
  // "other place" without its name
  const other = rowOf(changed, WB.trips, "Nigar Dövlət");
  other[3] = "";
  imported = workbookImportRows(changed, month);
  assert.match(imported.issues.join(" "), /yerin adı yazılmayıb/);
});

test("every formula stays inside Excel's limits and none starts with an equals sign", () => {
  let longest = 0;
  let count = 0;
  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      for (const cell of row) {
        if (!cell || typeof cell !== "object" || !cell.f) continue;
        count++;
        longest = Math.max(longest, cell.f.length);
        assert.ok(!cell.f.startsWith("="), `${sheet.name}: ${cell.f.slice(0, 40)}`);
        let depth = 0;
        let deepest = 0;
        for (const ch of cell.f) {
          if (ch === "(") deepest = Math.max(deepest, ++depth);
          else if (ch === ")") depth--;
        }
        assert.equal(depth, 0, `${sheet.name}: unbalanced parentheses in ${cell.f.slice(0, 60)}`);
        assert.ok(deepest <= 60, `${sheet.name}: too deep (${deepest})`);
      }
    }
  }
  assert.ok(count > 1000);
  assert.ok(longest < 8000, `a formula of ${longest} characters`);
  // sheet names are what Excel allows
  for (const sheet of sheets) assert.ok(sheet.name.length <= 31 && !/[\\/*?:\[\]]/.test(sheet.name), sheet.name);
});

test("the helper sheet counts the calendar days of a stretch the way the platform does", async () => {
  const { vacationCalendarDays } = await import("../lib/payroll-calc.ts");
  const tabel = sheetOf(WB.sheet);
  const head = tabel.rows[2];
  const dates = head.slice(2, 2 + days.length).map((v) => Number(v));
  const type = tabel.rows[3].slice(2, 2 + days.length);
  const row = tabel.rows.find((r) => r[0] === "Günel Xəstə");
  const marked = (j) => type[j] === "iş" && ["XS", "İQ", "AN", "UQ", "AT"].includes(row[2 + j]);
  const expected = vacationCalendarDays(days, (d) => marked(days.findIndex((x) => x.date === d)), true).calendarDays;
  assert.equal(Number(row[head.indexOf("Müavinət (təqvim günü)")]), expected);
  assert.ok(dates.length === days.length);
});

test("every sheet that lists people shows their FİN beside the name", () => {
  const check = (sheetName, headerRow, finColumn = 1) => {
    const rows = sheetOf(sheetName).rows;
    assert.equal(rows[headerRow][finColumn], "FİN", `${sheetName}: no FİN column`);
    let seen = 0;
    for (const row of rows.slice(headerRow + 1)) {
      const person = input.employees.find((e) => e.name === row[0]);
      if (!person) continue;
      seen++;
      assert.equal(row[finColumn], person.fin, `${sheetName}: ${row[0]}`);
    }
    assert.ok(seen > 0, `${sheetName}: no named rows`);
  };
  check(WB.staff, 2);
  check(WB.leaves, 2);
  check(WB.sheet, 2);
  check(WB.adds, 2);
  check(WB.hours, 2);
  check(WB.trips, 2);
  check(WB.calc, 3);
});

test("the FİN of every line goes along to the platform's imports, so the person is found by it", () => {
  const imported = workbookImportRows(read, month);
  assert.equal(parseAttendanceRows(imported.attendance).rows.find((r) => r.name === "Günel Xəstə").fin, finOf("Günel Xəstə").toUpperCase());
  assert.equal(parsePayrollRows(imported.payroll).rows.find((r) => r.name === "Aysel Tam").fin, finOf("Aysel Tam").toUpperCase());
  assert.equal(parseHoursTotals(imported.hours, month).rows[0].fin, finOf("Orxan Məzuniyyət").toUpperCase());
  assert.equal(parseTrips(imported.trips).rows.find((t) => t.name === "Aysel Tam").fin, finOf("Aysel Tam").toUpperCase());
});

test("a branch that reached its limit gives a bonus: shown beside the pay and added to the bonus of the calculation", () => {
  const calc = sheetOf(WB.calc);
  const header = calc.rows[3];
  const col = (title) => header.indexOf(title);
  const n = (name, title) => Number(calc.rows.find((r) => r[0] === name)[col(title)]);
  // Vüsal: 2000, shares 1500/2400 and 900/2400; A pays 200, B pays 50% of 2000 × 0.375 = 375
  assert.equal(n("Vüsal Hissəli", "Mükafat"), 575);
  // Orxan: one branch, the fixed 200
  assert.equal(n("Orxan Məzuniyyət", "Mükafat"), 200);
  // a passive branch gives nothing, and a person who does not take the branch bonus gets none
  assert.equal(n("Nigar Dövlət", "Mükafat"), 0);
  const people = sheetOf(WB.branchPeople).rows;
  const vusal = people.filter((r) => r[1] === "Vüsal Hissəli");
  assert.deepEqual(vusal.map((r) => [r[2], Math.round(Number(r[8]) * 1000) / 1000, Number(r[12])]), [["A filialı", 0.625, 200], ["B filialı", 0.375, 375]]);
  const branches = sheetOf(WB.branches).rows;
  assert.equal(branches.find((r) => r[0] === "A filialı")[9], "Bəli");
  assert.equal(branches.find((r) => r[0] === "C filialı")[9], "Bəli");
});

test("the branch sheets go back into the platform as the standard sheets of the branch import", () => {
  const imported = workbookImportRows(read, month);
  assert.ok(imported.branchSheets);
  const parsed = parseBranchSheets(imported.branchSheets);
  assert.deepEqual(parsed.issues, []);
  assert.deepEqual(parsed.branches.map((b) => [b.name, b.active]), [["A filialı", true], ["B filialı", true], ["C filialı", false]]);
  assert.equal(parsed.links.length, 7);
  assert.equal(parsed.links[0].fin, finOf("Vüsal Hissəli"));
  const a = parsed.sales.find((x) => x.branch === "A filialı");
  assert.deepEqual([a.month, a.target, a.sales, a.kind, a.value], [month, 1000, 1500, "fixed", 200]);
  assert.equal(parsed.mode, "sales");
  // the bonus is calculated in the sheet, not typed: it is not among the lines sent as pay inputs
  assert.ok(!(imported.payroll || []).flat().includes("Filial bonusu"));
});

test("moved between branches inside the month: the share follows the working days (the platform and the workbook formulas agree)", () => {
  const people = sheetOf(WB.branchPeople);
  const head = people.rows[2];
  const rows = people.rows.filter((r) => r[1] === "Aysel Tam");
  assert.equal(rows.length, 2);
  const share = head.indexOf("Pay (hesablanan)");
  const daysCol = head.indexOf("Filialda iş günü");
  const worked = days.filter((d) => d.off === "").map((d) => d.date);
  const a = worked.filter((d) => d <= "2026-11-13").length;
  const b = worked.filter((d) => d >= "2026-11-16").length;
  assert.equal(Number(rows[0][daysCol]), a);
  assert.equal(Number(rows[1][daysCol]), b);
  assert.ok(Math.abs(Number(rows[0][share]) - a / (a + b)) < 1e-9);
  assert.ok(Math.abs(Number(rows[1][share]) - b / (a + b)) < 1e-9);
});
