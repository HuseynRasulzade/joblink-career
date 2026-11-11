import test from "node:test";
import assert from "node:assert/strict";
import { SHEET_TEMPLATES, templateSheets } from "../lib/sheet-templates.ts";
import { parseEmployeeRows, parseStaffRows, parseStructureRows } from "../lib/staff-import.ts";
import { parseAttendanceRows, parseSurveys, parseDocDeadlines, parseCalendarRows, parseProfileRows, parsePayrollRows, matchAttendanceCode, parseCalendarKind, parseShiftSchedule, parseShiftStaff, parseLeavePlan, parseOhsRows, parseSkillMatrix, parsePerfGoals, parseTrainings, parseTrips, parseAnnouncements } from "../lib/sheet-imports.ts";
import { parseAssetRows } from "../lib/assets.ts";
import { parseHoursRows, parseHoursTotals } from "../lib/hours.ts";
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
    payroll: parsePayrollRows,
    hours: parseHoursRows,
    hourtotals: parseHoursTotals,
    shifts: parseShiftSchedule,
    shiftstaff: parseShiftStaff,
    assets: parseAssetRows,
    leaveplan: parseLeavePlan,
    ohs: parseOhsRows,
    skillmatrix: parseSkillMatrix,
    perfgoals: parsePerfGoals,
    trainings: parseTrainings,
    trips: parseTrips,
    announcements: parseAnnouncements,
    surveys: parseSurveys,
    docdeadlines: parseDocDeadlines,
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

import { parseQuestionRows } from "../lib/question-import.ts";
import { JOB_TITLES_SAMPLE, EDUCATION_SAMPLE, SKILLS_SAMPLE } from "../lib/sample-files.ts";
import { parseTitleCsv, parseEducationCsv } from "../lib/catalog-check.ts";
import { parseSkillCsv } from "../lib/skill-import.ts";
import { JOB_TITLE_FAMILIES } from "../lib/job-title-catalog.ts";
import { COUNTRIES } from "../lib/university-catalog.ts";
import { MAJOR_FIELDS } from "../lib/major-catalog.ts";

test("the test-question sample is read back as four questions of the right kinds", () => {
  const result = parseQuestionRows(asRows("questions"));
  assert.deepEqual(result.skipped, []);
  assert.equal(result.questions.length, 4);
  assert.deepEqual(result.questions.map((q) => q.type), ["single", "multiple", "single", "text"]);
  assert.deepEqual(result.questions[1].correct, [0, 1, 2]);
  assert.equal(result.questions[1].points, 2);
  assert.equal(result.questions[3].points, 3);
});

test("the admin CSV samples are accepted by their importers", () => {
  const titles = parseTitleCsv(JOB_TITLES_SAMPLE, JOB_TITLE_FAMILIES);
  assert.deepEqual(titles.issues, []);
  assert.equal(titles.rows.length, 3);
  const education = parseEducationCsv(EDUCATION_SAMPLE, { university: COUNTRIES, major: MAJOR_FIELDS });
  assert.deepEqual(education.issues, []);
  assert.equal(education.rows.length, 2);
  const skills = parseSkillCsv(SKILLS_SAMPLE);
  assert.deepEqual(skills.issues, []);
  assert.equal(skills.rows.length, 2);
});

test("disability and tax-benefit columns of the personal data file are read", () => {
  const r = parseProfileRows(asRows("profiles"));
  assert.deepEqual(r.issues, []);
  const orxan = r.rows[1].profile;
  assert.equal(orxan.disability, "p61_80");
  assert.equal(orxan.disabilityDegree, "II");
  assert.equal(orxan.disabilityDoc, "ƏA-2024-118");
  assert.equal(orxan.disabilityUntil, "2028-05-01");
  assert.equal(orxan.taxBenefit, "disabled-61-100");
  assert.equal(orxan.taxBenefitFrom, "2024-05-02");
  assert.equal(orxan.mainJob, true);
  const aysel = r.rows[0].profile;
  assert.equal(aysel.dependents3, true);
  assert.equal(aysel.disabilityWar, false);
});

test("the shift files are read: ranges, rest days, FİN, the work rhythm", () => {
  const s = parseShiftSchedule([["FİN", "Başlama tarixi", "Bitmə tarixi", "Növbə"], ["5abc123", "2026-03-02", "2026-03-06", "Səhər"], ["5abc123", "2026-03-07", "", "İstirahət"], ["6XYZ789", "2026-03-02", "2026-02-01", "Gecə"]]);
  assert.equal(s.rows.length, 2);
  assert.deepEqual([s.rows[0].fin, s.rows[0].shift, s.rows[1].shift, s.rows[1].to], ["5ABC123", "Səhər", "", "2026-03-07"]);
  assert.equal(s.issues.length, 1);
  const p = parseShiftStaff([["Ad Soyad", "Növbəli rejim", "Standart növbə", "İş günü sayı", "İstirahət günü sayı", "Başlanğıc"], ["Aysel", "Bəli", "Gündüz", "2", "2", "1"], ["Orxan", "Xeyr", "", "", "", ""], ["Nigar", "Bəli", "Gecə", "0", "", ""]]);
  assert.equal(p.rows.length, 2);
  assert.deepEqual([p.rows[0].shiftWork, p.rows[0].work, p.rows[0].rest, p.rows[0].offset], [true, 2, 2, 1]);
  assert.equal(p.rows[1].shiftWork, false);
  assert.equal(p.issues.length, 1); // a rhythm needs at least one working day
});

test("the leave plan file takes days or an end date and refuses a taken leave", () => {
  const r = parseLeavePlan([
    ["Ad Soyad", "FİN", "Başlama", "Gün sayı", "Bitmə", "Status"],
    ["Aysel", "5ABC123", "2026-07-06", "14", "", "Təsdiqlənib"],
    ["Orxan", "", "06.08.2026", "", "14.08.2026", ""],
    ["Nigar", "", "2026-09-01", "", "", ""],
    ["Cavid", "", "2026-10-01", "5", "", "Götürülüb"],
    ["Dilarə", "", "2026-10-10", "", "2026-10-01", ""],
  ]);
  assert.deepEqual(r.rows.map((x) => [x.name, x.from, x.days, x.to, x.status]), [["Aysel", "2026-07-06", 14, "", "approved"], ["Orxan", "2026-08-06", 0, "2026-08-14", "proposed"]]);
  assert.equal(r.issues.length, 3);
});

test("the safety file maps Azerbaijani words to records and reports the lines it cannot read", () => {
  const r = parseOhsRows([
    ["Qeyd növü", "Ad Soyad", "Tarix", "Növ", "Təlimatı keçən / klinika", "Nəticə", "Təsvir"],
    ["Təlimat", "Aysel", "2026-03-02", "Təkrar təlimat", "Ə. Əliyev", "", ""],
    ["Tibbi baxış", "Orxan", "2026-04-15", "Dövri", "Klinika", "Məhdudiyyətlə", ""],
    ["Hadisə", "", "2026-05-20", "Yüngül zədə", "", "", "Əl zədələndi"],
    ["Təlimat", "Nigar", "2026-03-02", "Naməlum növ", "", "", ""],
    ["Cədvəl", "Cavid", "2026-03-02", "", "", "", ""],
  ]);
  assert.deepEqual(r.rows.map((x) => [x.raw.type, x.raw.kind]), [["briefing", "repeat"], ["medical", "periodic"], ["incident", "minor"]]);
  assert.equal(r.rows[1].raw.result, "limited");
  assert.equal(r.rows[0].raw.instructor, "Ə. Əliyev");
  assert.equal(r.issues.length, 2);
});

test("the skill matrix file reads levels as figures or words and refuses nonsense and empty rows", () => {
  const r = parseSkillMatrix([
    ["Ad Soyad", "FİN", "Bacarıq", "Səviyyə", "Hədəf"],
    ["Aysel", "5ABC123", "Excel", "3", "ekspert"],
    ["Orxan", "", "Excel", "", "3"],
    ["Nigar", "", "Excel", "çox yaxşı", ""],
    ["Cavid", "", "Excel", "", ""],
    ["Dilarə", "", "", "2", ""],
  ]);
  assert.deepEqual(r.rows.map((x) => [x.name, x.skill, x.level, x.target]), [["Aysel", "Excel", 3, 4], ["Orxan", "Excel", null, 3]]);
  assert.equal(r.issues.length, 3);
});

test("the performance goals file takes a weight of 1-10 and refuses short goals", () => {
  const r = parsePerfGoals([["Ad Soyad", "Məqsəd", "Çəki"], ["Aysel", "Satışı artırmaq", "3"], ["Orxan", "Xə", "2"], ["Nigar", "Hesabat vermək", "15"], ["Cavid", "Yeni məqsəd", ""]]);
  assert.deepEqual(r.rows.map((x) => [x.name, x.weight]), [["Aysel", 3], ["Cavid", 1]]);
  assert.equal(r.issues.length, 2);
});

test("the training file groups by title and refuses unknown kinds, statuses and dates", () => {
  const r = parseTrainings([
    ["Təlimin adı", "Növ", "Başlama", "Status", "Bacarıq səviyyəsi", "İştirakçı"],
    ["Excel kursu", "Onlayn", "2026-12-07", "Keçirilib", "yaxşı", "Aysel"],
    ["Excel kursu", "Onlayn", "2026-12-07", "Keçirilib", "yaxşı", "Orxan"],
    ["Kurs", "Qəribə növ", "", "", "", ""],
    ["Kurs 2", "", "07.13.2026", "", "", ""],
    ["Kurs 3", "", "", "Naməlum", "", ""],
  ]);
  assert.deepEqual(r.rows.map((x) => [x.title, x.kind, x.status, x.skillLevel, x.name]), [["Excel kursu", "online", "done", 3, "Aysel"], ["Excel kursu", "online", "done", 3, "Orxan"]]);
  assert.equal(r.issues.length, 3);
});

test("trip rows: employee, destination and dates are required; the foreign flag and amounts are read", () => {
  const r = parseTrips([
    ["İşçi", "FİN", "Təyinat", "Başlama", "Bitmə", "Məqsəd", "Gündəlik", "Avans", "Xarici"],
    ["Aysel", "", "Gəncə", "2026-12-08", "2026-12-10", "Yoxlama", "", "100", "Xeyr"],
    ["Orxan", "", "İstanbul", "2026-12-15", "", "", "400", "", "Bəli"],
    ["", "", "Bakı", "2026-12-15", "", "", "", "", ""],
    ["Elnur", "", "", "2026-12-15", "", "", "", "", ""],
    ["Samir", "", "Quba", "2026-12-20", "2026-12-18", "", "", "", ""],
    ["Nigar", "", "Quba", "tarix deyil", "", "", "", "", ""],
  ]);
  assert.equal(r.rows.length, 2);
  assert.deepEqual([r.rows[0].destination, r.rows[0].start, r.rows[0].end, r.rows[0].advance, r.rows[0].abroad], ["Gəncə", "2026-12-08", "2026-12-10", 100, false]);
  assert.deepEqual([r.rows[1].end, r.rows[1].daily, r.rows[1].abroad], ["2026-12-15", 400, true]);
  assert.equal(r.issues.length, 4);
  assert.deepEqual(r.issues.map((i) => i.line), [4, 5, 6, 7]);
});

test("announcement rows: title and text are required, flags and the expiry date are read", () => {
  const r = parseAnnouncements([
    ["Başlıq", "Mətn", "Auditoriya", "Bitmə tarixi", "Sancılmış", "Oxu təsdiqi", "Şərhlər"],
    ["Bayram", "Ofis bağlıdır", "", "2027-03-25", "Bəli", "Xeyr", "Bəli"],
    ["Qısa", "x", "", "", "", "", ""],
    ["Tarix", "Mətn burada", "", "yox", "", "", ""],
  ]);
  assert.equal(r.rows.length, 1);
  assert.deepEqual([r.rows[0].pinned, r.rows[0].requiresAck, r.rows[0].allowComments, r.rows[0].expires], [true, false, true, "2027-03-25"]);
  assert.deepEqual(r.issues.map((i) => i.line), [3, 4]);
});

import { surveyKindOf } from "../lib/sheet-imports.ts";
test("survey kinds are read from the words people write; bad lines of surveys and deadlines are named", () => {
  assert.equal(surveyKindOf("1–10 şkala"), "scale10");
  assert.equal(surveyKindOf("1-5 şkala"), "scale5");
  assert.equal(surveyKindOf("Bəli / Xeyr"), "yesno");
  assert.equal(surveyKindOf(""), "text");
  assert.equal(surveyKindOf("qarışıq"), "");
  const bad = parseSurveys([["Sorğu", "Sual", "Sualın növü", "Anonim", "Təkrar (ay)"], ["", "Sual yazılıb", "", "", ""], ["Sorğu A", "", "", "", ""], ["Sorğu A", "Sual burada", "qarışıq", "", ""], ["Sorğu A", "Sual burada", "", "", "5"], ["Sorğu A", "Sual burada", "Mətn", "Xeyr", "3"]]);
  assert.equal(bad.rows.length, 1);
  assert.equal(bad.rows[0].anonymous, false);
  assert.equal(bad.issues.length, 4);
  const docs = parseDocDeadlines([["Ad Soyad", "FİN", "Sənədin növü", "Sənəd nömrəsi", "Bitmə tarixi"], ["", "", "Arayış", "", "2027-01-01"], ["A", "", "", "", "2027-01-01"], ["A", "", "Arayış", "", "tezliklə"], ["A", "", "Arayış", "", ""], ["B", "1abcde2", "Arayış", "7", "01.02.2027"]]);
  assert.equal(docs.issues.length, 3);
  assert.deepEqual(docs.rows.map((r) => [r.name, r.expires, r.fin]), [["A", "", ""], ["B", "2027-02-01", "1ABCDE2"]]);
});
