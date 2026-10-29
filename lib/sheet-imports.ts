// Attendance marks, company calendar days and personal data of employees from a spreadsheet: the header row is
// found by the column names, wrong rows are reported by line and the rest is used. Browser (preview) and server.
import { ATTENDANCE_CODES } from "./calendar-az.ts";
import { normalizeProfile, type EmployeeProfile } from "./employee-profile.ts";
import { TAX_BENEFITS } from "./employee-rights.ts";
import { parseDateCell, parseNumberCell, type RowIssue } from "./staff-import.ts";

export const fold = (value: string) =>
  String(value ?? "")
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/[^a-z0-9а-я]+/g, " ")
    .trim();

type Aliases<K extends string> = Record<K, string[]>;
function findHeader<K extends string>(rows: string[][], aliases: Aliases<K>, must: string) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const keys = (rows[i] || []).map(fold);
    const map = new Map<K, number>();
    for (const field of Object.keys(aliases) as K[]) {
      const index = keys.findIndex((key, col) => aliases[field].includes(key) && ![...map.values()].includes(col));
      if (index >= 0) map.set(field, index);
    }
    if (map.has(must as K)) return { index: i, map };
  }
  return null;
}
const cell = (row: string[], map: Map<string, number>, field: string) => String(row[map.get(field) ?? -1] ?? "").trim();
const blank = (row: string[]) => !row.some((c) => String(c ?? "").trim());

// ── Attendance ──────────────────────────────────────────────────────────────

export type AttendanceImportRow = { line: number; name: string; email: string; from: string; to: string; code: string; note: string };

// "XS", "Xəstəlik", "Xəstəlik (xəstəlik vərəqəsi)" and the code id all name the same mark.
export function matchAttendanceCode(text: string): string {
  const key = fold(text);
  if (!key) return "";
  for (const code of ATTENDANCE_CODES) {
    const names = [code.id, code.short, code.label, code.label.replace(/\s*\(.*\)\s*/, "")].map(fold);
    if (names.includes(key)) return code.id;
  }
  const loose = ATTENDANCE_CODES.find((code) => fold(code.label).startsWith(key) && key.length >= 4);
  return loose?.id || "";
}

const ATTENDANCE_ALIASES: Aliases<"name" | "email" | "from" | "to" | "date" | "code" | "note"> = {
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  from: ["baslama tarixi", "baslanqic", "baslanqic tarixi", "tarixden", "tarix dan", "from", "start"],
  to: ["bitme tarixi", "son tarix", "tarixe qeder", "tarixedek", "tarixe kimi", "to", "end"],
  date: ["tarix", "gun", "date"],
  code: ["sebeb", "davamiyyet", "davamiyyet kodu", "kod", "novu", "status", "code"],
  note: ["qeyd", "serh", "note", "comment"],
};

export function parseAttendanceRows(rows: string[][], limit = 1000): { rows: AttendanceImportRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, ATTENDANCE_ALIASES, "name");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  if (!header.map.has("code")) return { rows: [], issues: [{ line: header.index + 1, reason: "“Səbəb” sütunu tapılmadı (məsələn: Əmək məzuniyyəti, Xəstəlik)." }] };
  const out: AttendanceImportRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir yüklənir.` });
      break;
    }
    const name = cell(row, header.map, "name").slice(0, 120);
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad yoxdur." });
      continue;
    }
    const fromText = cell(row, header.map, "from") || cell(row, header.map, "date");
    const from = parseDateCell(fromText);
    const toText = cell(row, header.map, "to");
    const to = toText ? parseDateCell(toText) : from;
    if (!from) {
      issues.push({ line, reason: `Başlama tarixi oxunmadı: “${fromText}”.` });
      continue;
    }
    if (!to || to < from) {
      issues.push({ line, reason: `Bitmə tarixi oxunmadı və ya başlamadan əvvəldir: “${toText}”.` });
      continue;
    }
    if ((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 > 365) {
      issues.push({ line, reason: "Bir sətirdə ən çox 366 gün olar." });
      continue;
    }
    const codeText = cell(row, header.map, "code");
    const code = /^(sil|silmek|temizle|clear)$/.test(fold(codeText)) ? "" : matchAttendanceCode(codeText);
    if (codeText && !code && !/^(sil|silmek|temizle|clear)$/.test(fold(codeText))) {
      issues.push({ line, reason: `Səbəb tanınmadı: “${codeText}”. “Təlimat” vərəqindəki adlardan birini yazın.` });
      continue;
    }
    out.push({ line, name, email: cell(row, header.map, "email").slice(0, 160), from, to, code, note: cell(row, header.map, "note").slice(0, 200) });
  }
  return { rows: out, issues };
}

// ── Company calendar ────────────────────────────────────────────────────────

export type CalendarImportRow = { line: number; day: string; kind: "off" | "work" | "short" | ""; label: string };

const CALENDAR_ALIASES: Aliases<"day" | "kind" | "label"> = {
  day: ["tarix", "gun", "date", "day"],
  kind: ["nov", "novu", "tip", "status", "kind", "type"],
  label: ["ad", "adi", "izah", "qeyd", "sebeb", "label", "note"],
};

export function parseCalendarKind(text: string): "off" | "work" | "short" | "clear" | "" {
  const key = fold(text);
  if (!key) return "";
  if (/^(sil|silmek|temizle|clear|standart)/.test(key)) return "clear";
  if (/qisaldilmis|qisa gun|short|bayram qabagi/.test(key)) return "short";
  if (/^(is gunu|islek|isleyir|work|isek|isek gunu)/.test(key) || /islek/.test(key)) return "work";
  if (/qeyri is|istirahet|bayram|tetil|off|holiday|is gunu deyil/.test(key)) return "off";
  return "";
}

export function parseCalendarRows(rows: string[][], limit = 400): { rows: CalendarImportRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, CALENDAR_ALIASES, "day");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Tarix” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  if (!header.map.has("kind")) return { rows: [], issues: [{ line: header.index + 1, reason: "“Növ” sütunu tapılmadı (Qeyri-iş günü, İş günü, Qısaldılmış gün)." }] };
  const out: CalendarImportRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} gün yüklənir.` });
      break;
    }
    const dayText = cell(row, header.map, "day");
    const day = parseDateCell(dayText);
    if (!day) {
      issues.push({ line, reason: `Tarix oxunmadı: “${dayText}”.` });
      continue;
    }
    const kindText = cell(row, header.map, "kind");
    const kind = parseCalendarKind(kindText);
    if (!kind) {
      issues.push({ line, reason: `Növ tanınmadı: “${kindText}”. Qeyri-iş günü, İş günü, Qısaldılmış gün və ya Sil yazın.` });
      continue;
    }
    out.push({ line, day, kind: kind === "clear" ? "" : kind, label: cell(row, header.map, "label").slice(0, 100) });
  }
  return { rows: out, issues };
}

// ── Personal data of employees ──────────────────────────────────────────────

type ProfileField = Exclude<keyof EmployeeProfile, never>;
const PROFILE_ALIASES: Aliases<"name" | "email" | ProfileField> = {
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod"],
  idSeries: ["seriya", "vesiqe seriyasi", "sv seriyasi"],
  idNumber: ["vesiqe nomresi", "sv nomresi", "nomre", "vesiqe no"],
  idIssuedBy: ["veren orqan", "vesiqeni veren orqan"],
  idIssuedDate: ["verilme tarixi", "vesiqenin verilme tarixi"],
  idExpires: ["etibarliliq muddeti", "etibarlilig muddeti", "vesiqenin etibarliliq muddeti", "bitme tarixi vesiqe"],
  birthDate: ["dogum tarixi", "dogum"],
  birthPlace: ["dogum yeri"],
  gender: ["cins", "gender"],
  citizenship: ["vetendasliq", "vetendaslig"],
  maritalStatus: ["aile veziyyeti"],
  childrenUnder14: ["14 yasinadek usaq sayi", "usaq sayi", "usaqlarin sayi"],
  hasDisabledChild: ["elilliyi olan usaq", "elil usaq"],
  disability: ["elillik", "elillik faizi", "orqanizmin funksiyalarinin pozulmasi", "elillik pozulma faizi"],
  disabilityDegree: ["elillik derecesi", "elillik qrupu"],
  disabilityWar: ["muharibe ile elaqedar elillik", "muharibe elilliyi"],
  disabilityDoc: ["elillik sened", "elillik senedi", "elillik arayisi", "elillik arayis nomresi", "elillik sened nomresi"],
  disabilityUntil: ["elillik muddeti", "elillik bitme tarixi"],
  disabledChildren: ["elilliyi olan usaq sayi", "elil usaq sayi"],
  careDependent: ["daimi qulluq", "daimi qulluq tələb edən", "daimi qulluq teleb eden", "qulluq etdiyi sexs"],
  taxBenefit: ["vergi guzesti", "gelir vergisi guzesti", "guzest"],
  taxBenefitDoc: ["guzest sened", "guzest senedi", "guzest sened nomresi"],
  taxBenefitFrom: ["guzest baslama tarixi", "guzest tarixi"],
  dependents3: ["himayesinde 3 nefer", "himayesinde en azi 3 nefer", "himaye 3"],
  mainJob: ["esas is yeri", "emek kitabcasi burada"],
  soleParent: ["usagi tekbasina boyudur", "tekvalideyn", "tek valideyn"],
  address: ["faktiki unvan", "unvan", "yasayis unvani"],
  registeredAddress: ["qeydiyyat unvani", "qeydiyyat"],
  ssn: ["ssn", "sosial sigorta nomresi", "sosial sigorta ssn nomresi"],
  voen: ["voen"],
  iban: ["iban", "bank hesabi"],
  educationLevel: ["tehsil seviyyesi", "tehsil"],
  militaryStatus: ["herbi ucot", "herbi veziyyet"],
  emergencyName: ["yaxin sexs", "yaxin sexs ad", "yaxin sexs adi"],
  emergencyPhone: ["yaxin sexs telefon", "yaxin sexsin telefonu"],
};

export type ProfileImportRow = { line: number; name: string; email: string; profile: Partial<EmployeeProfile> };

const yes = (text: string) => ["beli", "he", "ha", "yes", "1", "true", "var"].includes(fold(text));
// "61-80", "81–100%", "60%-dək" ... -> the range of the Codes.
function disabilityOf(text: string): EmployeeProfile["disability"] {
  const key = fold(text);
  if (!key || /^(yox|xeyr|none|no)/.test(key)) return "";
  const n = Number((key.match(/\d+/g) || []).slice(-1)[0]);
  if (/81/.test(key) || n >= 81) return "p81_100";
  if (/61/.test(key) || n >= 61) return "p61_80";
  return "under61";
}
function degreeOf(text: string): EmployeeProfile["disabilityDegree"] {
  const key = text.trim().toUpperCase().replace(/[^IV1-3]/g, "");
  return ({ I: "I", "1": "I", II: "II", "2": "II", III: "III", "3": "III" } as Record<string, EmployeeProfile["disabilityDegree"]>)[key] || "";
}
function careOf(text: string): EmployeeProfile["careDependent"] {
  const key = fold(text);
  if (/uşaq|usaq|child/.test(key)) return "child";
  if (/81|100/.test(key)) return "adult81";
  if (/i derece|1 derece|degree/.test(key)) return "degree1";
  return "";
}
// A benefit named by its id, its short name or its words ("müharibə veteranı", "məcburi köçkün").
function benefitOf(text: string): string {
  const key = fold(text);
  if (!key) return "";
  const found =
    TAX_BENEFITS.find((b) => b.id === key || fold(b.short) === key) ||
    TAX_BENEFITS.find((b) => fold(b.label).includes(key) && key.length >= 8);
  return found?.id || "";
}
function gender(text: string): EmployeeProfile["gender"] {
  const key = fold(text);
  if (/^(kisi|male|erkek)/.test(key) || key === "m") return "male";
  if (/^(qadin|female|xanim)/.test(key) || key === "f") return "female";
  return "";
}
function marital(text: string): EmployeeProfile["maritalStatus"] {
  const key = fold(text);
  if (/^subay|single|evlenmeyib/.test(key)) return "single";
  if (/^evli|married|aileli/.test(key)) return "married";
  if (/^bosan|divorced/.test(key)) return "divorced";
  if (/^dul|widow/.test(key)) return "widowed";
  return "";
}

export function parseProfileRows(rows: string[][], limit = 500): { rows: ProfileImportRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, PROFILE_ALIASES, "name");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const fields = (Object.keys(PROFILE_ALIASES) as (keyof typeof PROFILE_ALIASES)[]).filter((f) => f !== "name" && f !== "email" && header.map.has(f));
  if (!fields.length) return { rows: [], issues: [{ line: header.index + 1, reason: "Ad Soyad-dan başqa heç bir şəxsi məlumat sütunu tapılmadı (FİN, Seriya, Doğum tarixi …)." }] };
  const out: ProfileImportRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} işçi yüklənir.` });
      break;
    }
    const name = cell(row, header.map, "name").slice(0, 120);
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad yoxdur." });
      continue;
    }
    const raw: Record<string, unknown> = {};
    for (const field of fields) {
      const text = cell(row, header.map, field);
      if (!text) continue;
      if (["birthDate", "idIssuedDate", "idExpires", "disabilityUntil", "taxBenefitFrom"].includes(field)) {
        const date = parseDateCell(text);
        if (!date) {
          issues.push({ line, reason: `${name}: tarix oxunmadı: “${text}”.` });
          raw.__bad = true;
        } else raw[field] = date;
      } else if (field === "gender") raw.gender = gender(text);
      else if (field === "maritalStatus") raw.maritalStatus = marital(text);
      else if (field === "childrenUnder14") raw.childrenUnder14 = Math.round(parseNumberCell(text));
      else if (field === "hasDisabledChild" || field === "soleParent" || field === "disabilityWar" || field === "dependents3") raw[field] = yes(text);
      else if (field === "mainJob") raw.mainJob = !["xeyr", "no", "0", "false", "yox"].includes(fold(text));
      else if (field === "disabledChildren") raw.disabledChildren = Math.round(parseNumberCell(text));
      else if (field === "disability") raw.disability = disabilityOf(text);
      else if (field === "disabilityDegree") raw.disabilityDegree = degreeOf(text);
      else if (field === "careDependent") raw.careDependent = careOf(text);
      else if (field === "taxBenefit") raw.taxBenefit = benefitOf(text);
      else raw[field] = text;
    }
    if (raw.__bad) continue;
    const checked = normalizeProfile(raw);
    if (checked.issues.length) {
      issues.push({ line, reason: `${name}: ${checked.issues[0]}` });
      continue;
    }
    // Only what the row filled in is kept, so an empty cell never wipes stored data.
    const profile: Partial<EmployeeProfile> = {};
    for (const field of fields) if (raw[field] !== undefined && raw[field] !== "") (profile as Record<string, unknown>)[field] = (checked.profile as Record<string, unknown>)[field];
    out.push({ line, name, email: cell(row, header.map, "email").slice(0, 160), profile });
  }
  return { rows: out, issues };
}

// ── Finding the employee of a row ──────────────────────────────────────────

export type EmployeeRef = { id: string; name: string; email: string };

// By e-mail when the row has one, otherwise by name; two employees with one name need the e-mail.
export function matchEmployee(list: EmployeeRef[], row: { name: string; email: string }): { id: string } | { error: string } {
  const email = fold(row.email);
  if (email) {
    const byEmail = list.find((e) => fold(e.email) === email);
    if (byEmail) return { id: byEmail.id };
  }
  const same = list.filter((e) => fold(e.name) === fold(row.name));
  if (same.length === 1) return { id: same[0].id };
  if (same.length > 1) return { error: `${row.name}: eyni adlı ${same.length} işçi var — e-poçt sütununu doldurun.` };
  return { error: `${row.name}: işçi siyahısında tapılmadı.` };
}
