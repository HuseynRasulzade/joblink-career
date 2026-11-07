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

const month = "2026-11";
const days = monthDays(2026, 11).map((d) => ({ date: d.date, off: d.off }));
const emp = (name, extra = {}) => ({ name, fin: "", position: "", department: "", salary: 1500, sector: "private", taxReduction: 0, weekHours: 40, averageMonthly: 0, nightPercent: 0, start: "", end: "", ...extra });
const input = {
  month, days,
  employees: [
    emp("Aysel Tam"),
    emp("Orxan Məzuniyyət", { salary: 3000, taxReduction: 200, averageMonthly: 2800, nightPercent: 50 }),
    emp("Nigar Dövlət", { salary: 800, sector: "public" }),
    emp("Elnur Yeni", { salary: 1000, weekHours: 36, start: "2026-11-12" }),
    emp("Rəşad Yüksək", { salary: 9000 }),
  ],
  leaves: [
    { name: "Orxan Məzuniyyət", code: "annual", from: "2026-11-09", to: "2026-11-17", note: "Əmr № 5" },
    { name: "Orxan Məzuniyyət", code: "sick", from: "2026-11-23", to: "2026-11-24", note: "" },
    { name: "Nigar Dövlət", code: "downtime", from: "2026-11-03", to: "2026-11-04", note: "" },
    { name: "Nigar Dövlət", code: "unpaid", from: "2026-11-18", to: "2026-11-18", note: "" },
    { name: "Aysel Tam", code: "donor", from: "2026-11-05", to: "2026-11-05", note: "" },
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
    { name: "Nigar Dövlət", destination: "Digər şəhər, rayon mərkəzi, qəsəbə və ya kənd", place: "Şəki", start: "2026-11-10", end: "2026-11-11", purpose: "Yoxlama", advance: 20, other: 0 },
  ],
  rates: { USD: 1.7, EUR: 1.9037, GBP: 2.2834, JPY: 0.010768 }, ratesDate: "2026-11-06",
};
const sheets = buildPayrollWorkbook(input);
const bytes = createXlsxBook(sheets);
const read = readWorkbookSheets(bytes);
const sheetOf = (name) => read.find((s) => s.name === name);

test("the workbook has every sheet, in a working order", () => {
  assert.deepEqual(read.map((s) => s.name), [WB.guide, WB.staff, WB.leaves, WB.sheet, WB.adds, WB.hours, WB.trips, WB.calc, WB.params, WB.norms, WB.fx, WB.codes]);
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
  assert.deepEqual(imported.found, [WB.leaves, WB.adds, WB.hours, WB.trips]);

  const attendance = parseAttendanceRows(imported.attendance);
  assert.deepEqual(attendance.issues, []);
  assert.equal(attendance.rows.length, 5);
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
  // the per-diem is left empty: the platform works it out from the law's norm and the bank's rate of the trip day
  assert.ok(trips.rows.every((t) => !t.daily));
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
  adds.rows[first][1] = "Premiya";
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
  for (const name of [WB.sheet, WB.calc, WB.trips, WB.leaves, WB.hours]) {
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
