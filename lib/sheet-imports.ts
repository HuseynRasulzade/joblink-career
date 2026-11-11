// Attendance marks, company calendar days and personal data of employees from a spreadsheet: the header row is
// found by the column names, wrong rows are reported by line and the rest is used. Browser (preview) and server.
import { ATTENDANCE_CODES } from "./calendar-az.ts";
import { normalizeProfile, type EmployeeProfile } from "./employee-profile.ts";
import { TAX_BENEFITS } from "./employee-rights.ts";
import { parseDateCell, parseNumberCell, type RowIssue } from "./staff-import.ts";
import { parseLevel } from "./skill-matrix.ts";
import { BRIEFING_KINDS, INCIDENT_KINDS, INCIDENT_STATUS, MEDICAL_KINDS, MEDICAL_RESULTS } from "./ohs.ts";

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
    if (must.split("|").some((m) => map.has(m as K))) return { index: i, map };
  }
  return null;
}
// The FİN code on an identity card: seven letters and digits.
export const finOf = (text: string) => String(text || "").toUpperCase().replace(/\s+/g, "").slice(0, 10);
const cell = (row: string[], map: Map<string, number>, field: string) => String(row[map.get(field) ?? -1] ?? "").trim();
const blank = (row: string[]) => !row.some((c) => String(c ?? "").trim());

// ── Attendance ──────────────────────────────────────────────────────────────

export type AttendanceImportRow = { line: number; name: string; email: string; fin: string; from: string; to: string; code: string; note: string };

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

const ATTENDANCE_ALIASES: Aliases<"name" | "email" | "fin" | "from" | "to" | "date" | "code" | "note"> = {
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
  from: ["baslama tarixi", "baslanqic", "baslanqic tarixi", "tarixden", "tarix dan", "from", "start"],
  to: ["bitme tarixi", "son tarix", "tarixe qeder", "tarixedek", "tarixe kimi", "to", "end"],
  date: ["tarix", "gun", "date"],
  code: ["sebeb", "davamiyyet", "davamiyyet kodu", "kod", "novu", "status", "code"],
  note: ["qeyd", "serh", "note", "comment"],
};

export function parseAttendanceRows(rows: string[][], limit = 1000): { rows: AttendanceImportRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, ATTENDANCE_ALIASES, "name|fin");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” və ya “FİN” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
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
    const fin = finOf(cell(row, header.map, "fin"));
    const name = cell(row, header.map, "name").slice(0, 120) || fin;
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad və ya FİN yoxdur." });
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
    out.push({ line, name, email: cell(row, header.map, "email").slice(0, 160), fin, from, to, code, note: cell(row, header.map, "note").slice(0, 200) });
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
  managerId: [],
  deputyId: [],
  shiftWork: [],
  shiftDefault: [],
  shiftWorkDays: [],
  shiftRestDays: [],
  shiftOffset: [],
  nightPercent: ["gece elavesi", "gece faizi", "gece %"],
  insuranceBefore: ["evvelki sigorta stajı", "evvelki sigorta staji", "sigorta staji", "sigorta stajı ay"],
  mainJob: ["esas is yeri", "emek kitabcasi burada"],
  soleParent: ["usagi tekbasina boyudur", "tekvalideyn", "tek valideyn"],
  address: ["faktiki unvan", "unvan", "yasayis unvani"],
  registeredAddress: ["qeydiyyat unvani", "qeydiyyat"],
  ssn: ["ssn", "sosial sigorta nomresi", "sosial sigorta ssn nomresi"],
  voen: ["voen"],
  iban: ["iban", "bank hesabi"],
  bankName: ["bank", "bank adi"],
  bankCode: ["bank kodu"],
  accountNumber: ["hesab nomresi", "cari hesab"],
  cardNumber: ["kart nomresi", "maas karti", "kart"],
  cardHolder: ["kart sahibi", "kartin sahibi"],
  payMethod: ["odenis usulu", "maas usulu"],
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
      else if (field === "insuranceBefore") raw.insuranceBefore = Math.round(parseNumberCell(text));
      else if (field === "nightPercent") raw.nightPercent = parseNumberCell(text);
      else if (field === "mainJob") raw.mainJob = !["xeyr", "no", "0", "false", "yox"].includes(fold(text));
      else if (field === "disabledChildren") raw.disabledChildren = Math.round(parseNumberCell(text));
      else if (field === "disability") raw.disability = disabilityOf(text);
      else if (field === "disabilityDegree") raw.disabilityDegree = degreeOf(text);
      else if (field === "careDependent") raw.careDependent = careOf(text);
      else if (field === "taxBenefit") raw.taxBenefit = benefitOf(text);
      else if (field === "payMethod") raw.payMethod = /^(bank|kocurme)/.test(fold(text)) ? "bank" : /^kart|card/.test(fold(text)) ? "card" : /^(negd|cash)/.test(fold(text)) ? "cash" : "";
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

export type EmployeeRef = { id: string; name: string; email: string; fin?: string };

// By the FİN code of the identity card when the row has one (it tells two people with one name apart), then by e-mail, then by name.
export function matchEmployee(list: EmployeeRef[], row: { name: string; email: string; fin?: string }): { id: string } | { error: string } {
  const fin = finOf(row.fin || "");
  if (fin) {
    const byFin = list.filter((e) => finOf(e.fin || "") === fin);
    if (byFin.length === 1) return { id: byFin[0].id };
    if (byFin.length > 1) return { error: `${row.name}: FİN ${fin} ilə ${byFin.length} işçi var — kartları yoxlayın.` };
    return { error: `${row.name}: FİN ${fin} ilə işçi tapılmadı (işçi kartında FİN yazılıb?).` };
  }
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

// ── Pay inputs of a month: bonus, allowance, extra hours and one deduction per row ──────────

export type PayrollImportRow = { line: number; name: string; email: string; fin: string; bonus: number; allowance: number; overtimeHours: number; restDayHours: number; nightHours: number; nightPercent: number; deductionLabel: string; deductionAmount: number; deductionKind: "general" | "writ" | "alimony"; note: string; present: string[] };
type PayrollField = "name" | "email" | "fin" | "bonus" | "allowance" | "overtimeHours" | "restDayHours" | "nightHours" | "nightPercent" | "deductionLabel" | "deductionAmount" | "deductionKind" | "note";
const PAYROLL_ALIASES: Aliases<PayrollField> = {
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
  bonus: ["mukafat", "bonus"],
  allowance: ["elave", "elaveler", "allowance"],
  overtimeHours: ["artiq is saati", "artiq is", "overtime", "is vaxtindan artiq saat"],
  restDayHours: ["istirahet gunu saati", "bayram gunu saati", "istirahet saati", "rest day hours"],
  nightHours: ["gece saati", "gece is saati", "night hours"],
  nightPercent: ["gece elavesi", "gece faizi", "gece %", "night percent"],
  deductionLabel: ["tutulma adi", "tutulmanin adi", "tutulma", "deduction"],
  deductionAmount: ["tutulma mebleği", "tutulma meblegi", "tutulma mebleg", "deduction amount"],
  deductionKind: ["tutulma novu", "tutulmanin novu", "deduction type"],
  note: ["qeyd", "izah", "note"],
};
export function parsePayrollRows(rows: string[][], limit = 500): { rows: PayrollImportRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, PAYROLL_ALIASES, "name|fin");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” və ya “FİN” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const numeric: PayrollField[] = ["bonus", "allowance", "overtimeHours", "restDayHours", "nightHours", "nightPercent", "deductionAmount"];
  if (!numeric.concat(["deductionLabel"]).some((f) => header.map.has(f))) return { rows: [], issues: [{ line: header.index + 1, reason: "Ad Soyad-dan başqa heç bir sütun tapılmadı (Mükafat, Əlavə, Artıq iş saatı, Tutulma …)." }] };
  const out: PayrollImportRow[] = [];
  const issues: RowIssue[] = [];
  let hoursIgnored = false;
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} işçi yüklənir.` });
      break;
    }
    const fin = finOf(cell(row, header.map, "fin"));
    const name = cell(row, header.map, "name").slice(0, 120) || fin;
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad və ya FİN yoxdur." });
      continue;
    }
    const values: Record<string, number> = {};
    let bad = false;
    for (const f of numeric) {
      const text = cell(row, header.map, f);
      const n = text ? parseNumberCell(text) : 0;
      if (text && (!Number.isFinite(n) || n < 0)) {
        issues.push({ line, reason: `${name}: “${text}” rəqəm kimi oxunmadı.` });
        bad = true;
        break;
      }
      values[f] = n;
    }
    if (bad) continue;
    const kindKey = fold(cell(row, header.map, "deductionKind"));
    const deductionKind = /icra|mehkeme|writ/.test(kindKey) ? "writ" : /aliment|alimony/.test(kindKey) ? "alimony" : "general";
    if (values.deductionAmount > 0 && !cell(row, header.map, "deductionLabel")) {
      issues.push({ line, reason: `${name}: tutulmanın adı yoxdur.` });
      continue;
    }
    if (values.nightPercent > 100) {
      issues.push({ line, reason: `${name}: gecə əlavəsi 100%-dən çox ola bilməz.` });
      continue;
    }
    if (values.overtimeHours || values.restDayHours || values.nightHours || values.nightPercent) hoursIgnored = true;
    out.push({
      line, name, email: cell(row, header.map, "email").slice(0, 160), fin,
      bonus: values.bonus, allowance: values.allowance, overtimeHours: values.overtimeHours, restDayHours: values.restDayHours, nightHours: values.nightHours, nightPercent: values.nightPercent,
      deductionLabel: cell(row, header.map, "deductionLabel").slice(0, 120), deductionAmount: values.deductionAmount, deductionKind, note: cell(row, header.map, "note").slice(0, 300),
      present: [...header.map.keys()],
    });
  }
  // The hours and the night supplement moved: hours go to Davamiyyət → Saat uçotu, the supplement to the employee card.
  if (hoursIgnored) issues.push({ line: header.index + 1, reason: "Saat və gecə əlavəsi sütunları burada yüklənmir (Davamiyyət → Saat uçotu və işçi kartı); mükafat, əlavə və tutulma yükləndi." });
  return { rows: out, issues };
}

// ── Shifts: the schedule of one employee over a stretch of days, and who works in shifts ──────────

export type ShiftScheduleRow = { line: number; name: string; email: string; fin: string; from: string; to: string; shift: string };
const SHIFT_ALIASES: Aliases<"name" | "email" | "fin" | "from" | "to" | "date" | "shift"> = {
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
  from: ["baslama tarixi", "baslanqic", "baslanqic tarixi", "tarixden", "from", "start"],
  to: ["bitme tarixi", "son tarix", "tarixe qeder", "tarixedek", "to", "end"],
  date: ["tarix", "gun", "date"],
  shift: ["novbe", "novbe novu", "shift"],
};
// A cell that clears the day: "İstirahət", "Sil", "-".
const restWord = (text: string) => /^(istirahet|sil|silmek|temizle|clear|-|—|off)$/.test(fold(text));

export function parseShiftSchedule(rows: string[][], limit = 2000): { rows: ShiftScheduleRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, SHIFT_ALIASES, "name|fin");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” və ya “FİN” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  if (!header.map.has("shift")) return { rows: [], issues: [{ line: header.index + 1, reason: "“Növbə” sütunu tapılmadı (məsələn: Səhər, Gündüz, Gecə)." }] };
  const out: ShiftScheduleRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir yüklənir.` });
      break;
    }
    const fin = finOf(cell(row, header.map, "fin"));
    const name = cell(row, header.map, "name").slice(0, 120) || fin;
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad və ya FİN yoxdur." });
      continue;
    }
    const fromText = cell(row, header.map, "from") || cell(row, header.map, "date");
    const from = parseDateCell(fromText);
    const toText = cell(row, header.map, "to");
    const to = toText ? parseDateCell(toText) : from;
    if (!from) {
      issues.push({ line, reason: `${name}: başlama tarixi oxunmadı: “${fromText}”.` });
      continue;
    }
    if (!to || to < from) {
      issues.push({ line, reason: `${name}: bitmə tarixi oxunmadı və ya başlamadan əvvəldir.` });
      continue;
    }
    if ((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 > 92) {
      issues.push({ line, reason: `${name}: bir sətirdə ən çox 93 gün olar.` });
      continue;
    }
    const shiftText = cell(row, header.map, "shift");
    out.push({ line, name, email: cell(row, header.map, "email").slice(0, 160), fin, from, to, shift: restWord(shiftText) ? "" : shiftText.slice(0, 60) });
  }
  return { rows: out, issues };
}

export type ShiftStaffRow = { line: number; name: string; email: string; fin: string; shiftWork: boolean; shiftDefault: string; work: number; rest: number; offset: number; present: string[] };
const STAFF_ALIASES: Aliases<"name" | "email" | "fin" | "shiftWork" | "shiftDefault" | "work" | "rest" | "offset"> = {
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
  shiftWork: ["novbeli rejim", "novbeli", "novbe ile isleyir", "shift work"],
  shiftDefault: ["standart novbe", "adeti novbe", "novbe", "novbe novu"],
  work: ["is gunu sayi", "ardicil is gunu", "is gunleri"],
  rest: ["istirahet gunu sayi", "ardicil istirahet gunu", "istirahet gunleri"],
  offset: ["baslangic", "sablon baslangici", "baslangic gunu"],
};
export function parseShiftStaff(rows: string[][], limit = 1000): { rows: ShiftStaffRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, STAFF_ALIASES, "name|fin");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” və ya “FİN” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  if (!header.map.has("shiftWork") && !header.map.has("shiftDefault")) return { rows: [], issues: [{ line: header.index + 1, reason: "“Növbəli rejim” və ya “Standart növbə” sütunu tapılmadı." }] };
  const out: ShiftStaffRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} işçi yüklənir.` });
      break;
    }
    const fin = finOf(cell(row, header.map, "fin"));
    const name = cell(row, header.map, "name").slice(0, 120) || fin;
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad və ya FİN yoxdur." });
      continue;
    }
    const numeric = (field: "work" | "rest" | "offset") => {
      const text = cell(row, header.map, field);
      return text ? parseNumberCell(text) : NaN;
    };
    const work = numeric("work");
    const rest = numeric("rest");
    const offset = numeric("offset");
    if ([work, rest, offset].some((n) => !Number.isNaN(n) && (!Number.isFinite(n) || n < 0 || n > 27))) {
      issues.push({ line, reason: `${name}: iş, istirahət və başlanğıc günləri 0–27 arası rəqəm olmalıdır.` });
      continue;
    }
    if (!Number.isNaN(work) && work < 1) {
      issues.push({ line, reason: `${name}: iş günü sayı ən azı 1 olmalıdır.` });
      continue;
    }
    const shiftText = cell(row, header.map, "shiftWork");
    out.push({
      line, name, email: cell(row, header.map, "email").slice(0, 160), fin,
      shiftWork: header.map.has("shiftWork") ? yes(shiftText) : true,
      shiftDefault: cell(row, header.map, "shiftDefault").slice(0, 60),
      work: Number.isNaN(work) ? 0 : Math.round(work), rest: Number.isNaN(rest) ? -1 : Math.round(rest), offset: Number.isNaN(offset) ? 0 : Math.round(offset),
      present: [...header.map.keys()],
    });
  }
  return { rows: out, issues };
}

// ── Leave plan: who goes on leave from which day, for how many days (or until which day) ──
export type LeavePlanRow = { line: number; name: string; email: string; fin: string; from: string; to: string; days: number; status: "proposed" | "approved"; note: string };
type LeavePlanField = "name" | "email" | "fin" | "from" | "to" | "days" | "status" | "note";
const LEAVE_PLAN_ALIASES: Aliases<LeavePlanField> = {
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
  from: ["baslama", "baslama tarixi", "baslanma", "baslangic", "tarixden", "from", "start"],
  to: ["bitme", "bitme tarixi", "qayidis", "tarixe qeder", "to", "end"],
  days: ["gun sayi", "gun", "muddet", "gunler", "days"],
  status: ["status", "veziyyet", "tesdiq"],
  note: ["qeyd", "note", "serh"],
};
export function parseLeavePlan(rows: string[][], limit = 1000): { rows: LeavePlanRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, LEAVE_PLAN_ALIASES, "name|fin");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” və ya “FİN” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  if (!header.map.has("from")) return { rows: [], issues: [{ line: header.index + 1, reason: "“Başlama” sütunu tapılmadı." }] };
  if (!header.map.has("days") && !header.map.has("to")) return { rows: [], issues: [{ line: header.index + 1, reason: "“Gün sayı” və ya “Bitmə” sütunu tapılmadı." }] };
  const out: LeavePlanRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir yüklənir.` });
      break;
    }
    const fin = finOf(cell(row, header.map, "fin"));
    const name = cell(row, header.map, "name").slice(0, 120) || fin;
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad və ya FİN yoxdur." });
      continue;
    }
    const fromText = cell(row, header.map, "from");
    const from = parseDateCell(fromText);
    if (!from) {
      issues.push({ line, reason: `${name}: başlama tarixi oxunmadı: “${fromText}”.` });
      continue;
    }
    const toText = cell(row, header.map, "to");
    const to = toText ? parseDateCell(toText) : "";
    if (toText && !to) {
      issues.push({ line, reason: `${name}: bitmə tarixi oxunmadı: “${toText}”.` });
      continue;
    }
    if (to && to < from) {
      issues.push({ line, reason: `${name}: bitmə tarixi başlamadan əvvəldir.` });
      continue;
    }
    const daysText = cell(row, header.map, "days");
    const days = daysText ? Math.round(parseNumberCell(daysText)) : 0;
    if (!to && !(days >= 1)) {
      issues.push({ line, reason: `${name}: gün sayı və ya bitmə tarixi yazılmayıb.` });
      continue;
    }
    if (days > 90 || (to && (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 > 120)) {
      issues.push({ line, reason: `${name}: bir məzuniyyət 90 gündən uzun ola bilməz.` });
      continue;
    }
    const statusText = fold(cell(row, header.map, "status"));
    if (/goturulub|istifade/.test(statusText)) {
      issues.push({ line, reason: `${name}: “götürülüb” statusu yüklənmir; məzuniyyət əmr imzalananda özü “götürülüb” olur.` });
      continue;
    }
    out.push({ line, name, email: cell(row, header.map, "email").slice(0, 160), fin, from, to: to || "", days: to ? 0 : days, status: /tesdiq|approved|beli|he\b/.test(statusText) && !/gozle|tesdiqlenmeyib/.test(statusText) ? "approved" : "proposed", note: cell(row, header.map, "note").slice(0, 300) });
  }
  return { rows: out, issues };
}

// ── Occupational safety: briefings, medical examinations and incidents, one line each ──
export type OhsSheetRow = { line: number; name: string; email: string; fin: string; raw: Record<string, unknown> };
type OhsField = "type" | "name" | "email" | "fin" | "date" | "kind" | "who" | "topic" | "signed" | "result" | "due" | "place" | "description" | "cause" | "measures" | "daysLost" | "status" | "reported";
const OHS_ALIASES: Aliases<OhsField> = {
  type: ["qeyd novu", "qeydin novu", "qeyd", "tip", "bolme", "type"],
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
  date: ["tarix", "date", "kecirilme tarixi", "hadise tarixi"],
  kind: ["novu", "nov", "kind", "telimatin novu", "baxisin novu", "hadisenin novu"],
  who: ["telimati kecen klinika", "telimati kecen", "telimati kecen shexs", "telimati kecen sexs", "kecen sexs", "klinika", "tibb muessisesi", "instruktor"],
  topic: ["movzu qeyd", "movzu", "qeyd metni", "topic"],
  signed: ["isci imzalayib", "imzalayib", "imza"],
  result: ["netice", "result"],
  due: ["novbeti tarix", "novbeti", "novbeti telimat", "novbeti baxis", "due"],
  place: ["yer", "place"],
  description: ["tesvir", "hadisenin tesviri", "description"],
  cause: ["sebeb", "cause"],
  measures: ["gorulen tedbirler", "tedbirler", "measures"],
  daysLost: ["itirilen is gunu", "itirilen gun", "days lost"],
  status: ["status", "veziyyet"],
  reported: ["bildirilib", "mufettisliye bildirilib", "reported"],
};
const matchLabel = (value: string, labels: Record<string, string>) => {
  const v = fold(value);
  if (!v) return "";
  return Object.entries(labels).find(([id, label]) => fold(id) === v || fold(label) === v || fold(label).startsWith(v))?.[0] || "";
};
export function parseOhsRows(rows: string[][], limit = 1000): { rows: OhsSheetRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, OHS_ALIASES, "type");
  if (!header || !header.map.has("date")) return { rows: [], issues: [{ line: 1, reason: "“Qeyd növü” və “Tarix” sütunları tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const out: OhsSheetRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir yüklənir.` });
      break;
    }
    const typeText = fold(cell(row, header.map, "type"));
    const type = /telimat|briefing/.test(typeText) ? "briefing" : /tibbi|baxis|medical/.test(typeText) ? "medical" : /hadise|qeza|incident|zedeleme/.test(typeText) ? "incident" : "";
    if (!type) {
      issues.push({ line, reason: "Qeyd növü “Təlimat”, “Tibbi baxış” və ya “Hadisə” olmalıdır." });
      continue;
    }
    const fin = finOf(cell(row, header.map, "fin"));
    const name = cell(row, header.map, "name").slice(0, 120) || fin;
    if (type !== "incident" && name.length < 2) {
      issues.push({ line, reason: "Ad Soyad və ya FİN yoxdur." });
      continue;
    }
    const dateText = cell(row, header.map, "date");
    const date = parseDateCell(dateText);
    if (!date) {
      issues.push({ line, reason: `${name || "Hadisə"}: tarix oxunmadı: “${dateText}”.` });
      continue;
    }
    const dueText = cell(row, header.map, "due");
    const due = dueText ? parseDateCell(dueText) : "";
    if (dueText && !due) {
      issues.push({ line, reason: `${name}: növbəti tarix oxunmadı: “${dueText}”.` });
      continue;
    }
    const labels = type === "briefing" ? BRIEFING_KINDS : type === "medical" ? MEDICAL_KINDS : INCIDENT_KINDS;
    const kindText = cell(row, header.map, "kind");
    const kind = matchLabel(kindText, labels);
    if (!kind) {
      issues.push({ line, reason: `${name || "Hadisə"}: növ tanınmadı: “${kindText}”. Seçimlər: ${Object.values(labels).join(", ")}.` });
      continue;
    }
    const who = cell(row, header.map, "who");
    const resultText = cell(row, header.map, "result");
    const result = type === "medical" ? matchLabel(resultText, MEDICAL_RESULTS) || (resultText ? "?" : "fit") : "";
    if (result === "?") {
      issues.push({ line, reason: `${name}: nəticə tanınmadı: “${resultText}”. Seçimlər: ${Object.values(MEDICAL_RESULTS).join(", ")}.` });
      continue;
    }
    const statusText = cell(row, header.map, "status");
    const status = type === "incident" ? matchLabel(statusText, INCIDENT_STATUS) || "open" : "done";
    out.push({
      line,
      name,
      email: cell(row, header.map, "email").slice(0, 160),
      fin,
      raw: {
        type, date, kind, due: due || undefined, status,
        instructor: type === "briefing" ? who : undefined, clinic: type === "medical" ? who : undefined,
        topic: cell(row, header.map, "topic"), note: type === "medical" ? cell(row, header.map, "topic") : undefined,
        signed: yes(cell(row, header.map, "signed")), result,
        place: cell(row, header.map, "place"), description: cell(row, header.map, "description"), cause: cell(row, header.map, "cause"), measures: cell(row, header.map, "measures"),
        daysLost: cell(row, header.map, "daysLost"), reported: yes(cell(row, header.map, "reported")),
      },
    });
  }
  return { rows: out, issues };
}

// ── Skill matrix: the level of each employee in each skill, and the level the job needs ──
export type SkillMatrixRow = { line: number; name: string; email: string; fin: string; skill: string; level: number | null; target: number | null };
type SkillMatrixField = "name" | "email" | "fin" | "skill" | "level" | "target";
const SKILL_MATRIX_ALIASES: Aliases<SkillMatrixField> = {
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
  skill: ["bacariq", "bacariqlar", "skill"],
  level: ["seviyye", "isci seviyyesi", "level", "hazirki seviyye"],
  target: ["hedef", "hedef seviyye", "vezifenin teleb etdiyi seviyye", "target"],
};
export function parseSkillMatrix(rows: string[][], limit = 2000): { rows: SkillMatrixRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, SKILL_MATRIX_ALIASES, "name|fin");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” və ya “FİN” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  if (!header.map.has("skill")) return { rows: [], issues: [{ line: header.index + 1, reason: "“Bacarıq” sütunu tapılmadı." }] };
  if (!header.map.has("level") && !header.map.has("target")) return { rows: [], issues: [{ line: header.index + 1, reason: "“Səviyyə” və ya “Hədəf” sütunu tapılmadı." }] };
  const out: SkillMatrixRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir yüklənir.` });
      break;
    }
    const fin = finOf(cell(row, header.map, "fin"));
    const name = cell(row, header.map, "name").slice(0, 120) || fin;
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad və ya FİN yoxdur." });
      continue;
    }
    const skill = cell(row, header.map, "skill").slice(0, 120);
    if (!skill) {
      issues.push({ line, reason: `${name}: bacarığın adı yoxdur.` });
      continue;
    }
    const level = parseLevel(cell(row, header.map, "level"));
    const target = parseLevel(cell(row, header.map, "target"));
    if (level === "bad" || target === "bad") {
      issues.push({ line, reason: `${name}: səviyyə 0–4 arası rəqəm və ya söz olmalıdır (başlanğıc, işləyə bilir, yaxşı, ekspert).` });
      continue;
    }
    if (level === null && target === null) {
      issues.push({ line, reason: `${name}: “${skill}” üçün nə səviyyə, nə hədəf yazılıb.` });
      continue;
    }
    out.push({ line, name, email: cell(row, header.map, "email").slice(0, 160), fin, skill, level, target });
  }
  return { rows: out, issues };
}

// ── Performance goals: one line per goal of an employee ──
export type PerfGoalRow = { line: number; name: string; email: string; fin: string; title: string; target: string; weight: number; cycle: string };
type PerfGoalField = "name" | "email" | "fin" | "title" | "target" | "weight" | "cycle";
const PERF_GOAL_ALIASES: Aliases<PerfGoalField> = {
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
  title: ["meqsed", "meqsedin adi", "goal", "title"],
  target: ["hedef", "gosterici", "olcu", "target"],
  weight: ["ceki", "ehemiyyet", "weight"],
  cycle: ["dovr", "qiymetlendirme dovru", "cycle"],
};
export function parsePerfGoals(rows: string[][], limit = 2000): { rows: PerfGoalRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, PERF_GOAL_ALIASES, "name|fin");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” və ya “FİN” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  if (!header.map.has("title")) return { rows: [], issues: [{ line: header.index + 1, reason: "“Məqsəd” sütunu tapılmadı." }] };
  const out: PerfGoalRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir yüklənir.` });
      break;
    }
    const fin = finOf(cell(row, header.map, "fin"));
    const name = cell(row, header.map, "name").slice(0, 120) || fin;
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad və ya FİN yoxdur." });
      continue;
    }
    const title = cell(row, header.map, "title").slice(0, 200);
    if (title.length < 3) {
      issues.push({ line, reason: `${name}: məqsəd yazılmayıb (ən azı 3 simvol).` });
      continue;
    }
    const weightText = cell(row, header.map, "weight");
    const weight = weightText ? Math.round(parseNumberCell(weightText)) : 1;
    if (weightText && !(weight >= 1 && weight <= 10)) {
      issues.push({ line, reason: `${name}: çəki 1–10 arası olmalıdır.` });
      continue;
    }
    out.push({ line, name, email: cell(row, header.map, "email").slice(0, 160), fin, title, target: cell(row, header.map, "target").slice(0, 300), weight: weightText ? weight : 1, cycle: cell(row, header.map, "cycle").slice(0, 120) });
  }
  return { rows: out, issues };
}

// ── Training plan: one line per participant; lines with the same title and start belong to one training ──
export type TrainingRow = { line: number; title: string; kind: "internal" | "external" | "online" | "safety"; provider: string; start: string; end: string; hours: number; cost: number; status: "planned" | "done" | "cancelled"; skill: string; skillLevel: number; validMonths: number; name: string; email: string; fin: string };
type TrainingField = "title" | "kind" | "provider" | "start" | "end" | "hours" | "cost" | "status" | "skill" | "skillLevel" | "validMonths" | "name" | "email" | "fin";
const TRAINING_ALIASES: Aliases<TrainingField> = {
  title: ["telimin adi", "telim", "movzu", "title", "training"],
  kind: ["telimin novu", "nov", "novu", "kind"],
  provider: ["telimci", "teskilatci", "telimci teskilatci", "telim kecen", "provider"],
  start: ["baslama", "baslama tarixi", "baslangic", "start"],
  end: ["bitme", "bitme tarixi", "son", "end"],
  hours: ["saat", "muddet saat", "hours"],
  cost: ["xerc", "xerc azn", "qiymet", "cost"],
  status: ["status", "veziyyet"],
  skill: ["bacariq", "inkisaf etdirilen bacariq", "skill"],
  skillLevel: ["bacariq seviyyesi", "hedef seviyye", "seviyye", "skill level"],
  validMonths: ["sertifikat muddeti ay", "etibarliliq ay", "sertifikat ay", "valid months"],
  name: ["istirakci", "ad soyad", "isci", "isci adi", "participant", "name"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
};
const TRAINING_KIND: [RegExp, TrainingRow["kind"]][] = [[/daxili|internal/, "internal"], [/xarici|external/, "external"], [/onlayn|online|distant/, "online"], [/emeyin muhafize|safety|tehlukesizlik/, "safety"]];
const TRAINING_STATUS: [RegExp, TrainingRow["status"]][] = [[/planlas|planned|gozle/, "planned"], [/kecirilib|bitib|tamam|done/, "done"], [/leg|cancel/, "cancelled"]];
export function parseTrainings(rows: string[][], limit = 3000): { rows: TrainingRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, TRAINING_ALIASES, "title");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Təlimin adı” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const out: TrainingRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir yüklənir.` });
      break;
    }
    const title = cell(row, header.map, "title").slice(0, 200);
    if (title.length < 3) {
      issues.push({ line, reason: "Təlimin adı yoxdur (ən azı 3 simvol)." });
      continue;
    }
    const startText = cell(row, header.map, "start");
    const start = startText ? parseDateCell(startText) : "";
    const endText = cell(row, header.map, "end");
    const end = endText ? parseDateCell(endText) : start;
    if ((startText && !start) || (endText && !end)) {
      issues.push({ line, reason: `${title}: tarix oxunmadı.` });
      continue;
    }
    if (start && end && end < start) {
      issues.push({ line, reason: `${title}: bitmə tarixi başlamadan əvvəldir.` });
      continue;
    }
    const kindText = fold(cell(row, header.map, "kind"));
    const kind = kindText ? TRAINING_KIND.find(([re]) => re.test(kindText))?.[1] : "external";
    if (!kind) {
      issues.push({ line, reason: `${title}: növ tanınmadı (daxili, xarici, onlayn, əməyin mühafizəsi).` });
      continue;
    }
    const statusText = fold(cell(row, header.map, "status"));
    const status = statusText ? TRAINING_STATUS.find(([re]) => re.test(statusText))?.[1] : "planned";
    if (!status) {
      issues.push({ line, reason: `${title}: status tanınmadı (planlaşdırılıb, keçirilib, ləğv).` });
      continue;
    }
    const level = cell(row, header.map, "skillLevel") ? parseLevel(cell(row, header.map, "skillLevel")) : null;
    if (level === "bad") {
      issues.push({ line, reason: `${title}: bacarıq səviyyəsi 0–4 arası olmalıdır.` });
      continue;
    }
    const fin = finOf(cell(row, header.map, "fin"));
    out.push({
      line, title, kind, provider: cell(row, header.map, "provider").slice(0, 120), start, end: end || start,
      hours: Math.max(0, Math.min(2000, Math.round(parseNumberCell(cell(row, header.map, "hours"))))),
      cost: Math.max(0, parseNumberCell(cell(row, header.map, "cost"))),
      status, skill: cell(row, header.map, "skill").slice(0, 120), skillLevel: level ?? 0,
      validMonths: Math.max(0, Math.min(120, Math.round(parseNumberCell(cell(row, header.map, "validMonths"))))),
      name: cell(row, header.map, "name").slice(0, 120), email: cell(row, header.map, "email").slice(0, 160), fin,
    });
  }
  return { rows: out, issues };
}

// ── Business trips (ezamiyyət): one line per trip; the employee is found by FİN, e-mail or name ──
export type TripImportRow = { line: number; name: string; email: string; fin: string; destination: string; start: string; end: string; purpose: string; daily: number; advance: number; abroad: boolean };
type TripField = "name" | "email" | "fin" | "destination" | "start" | "end" | "purpose" | "daily" | "advance" | "abroad";
const TRIP_ALIASES: Aliases<TripField> = {
  name: ["isci", "ad soyad", "isci adi", "ad", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
  destination: ["teyinat", "teyinat yeri", "sehir", "olke", "yer", "destination"],
  start: ["baslama", "baslama tarixi", "baslangic", "tarixden", "start"],
  end: ["bitme", "bitme tarixi", "son", "tarixe qeder", "end"],
  purpose: ["meqsed", "sebeb", "ezamiyyet meqsedi", "purpose"],
  daily: ["gundelik", "gundelik azn", "gundelik mebleg", "daily"],
  advance: ["avans", "avans azn", "advance"],
  abroad: ["xarici", "xarici ezamiyyet", "abroad"],
};
export function parseTrips(rows: string[][], limit = 500): { rows: TripImportRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, TRIP_ALIASES, "destination");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Təyinat” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const out: TripImportRow[] = [];
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
    const fin = finOf(cell(row, header.map, "fin"));
    const who = name || fin || "sətir";
    if (!name && !fin && !cell(row, header.map, "email")) {
      issues.push({ line, reason: "İşçi (ad, FİN və ya e-poçt) yazılmayıb." });
      continue;
    }
    const destination = cell(row, header.map, "destination").slice(0, 160);
    if (destination.length < 2) {
      issues.push({ line, reason: `${who}: təyinat yeri yazılmayıb.` });
      continue;
    }
    const start = parseDateCell(cell(row, header.map, "start"));
    const end = parseDateCell(cell(row, header.map, "end")) || start;
    if (!start) {
      issues.push({ line, reason: `${who}: başlama tarixi oxunmadı (GGGG-AA-GG).` });
      continue;
    }
    if (end < start) {
      issues.push({ line, reason: `${who}: bitmə tarixi başlamadan əvvəldir.` });
      continue;
    }
    out.push({
      line, name, email: cell(row, header.map, "email").slice(0, 160), fin, destination, start, end,
      purpose: cell(row, header.map, "purpose").slice(0, 300),
      daily: Math.max(0, parseNumberCell(cell(row, header.map, "daily"))),
      advance: Math.max(0, parseNumberCell(cell(row, header.map, "advance"))),
      abroad: yes(cell(row, header.map, "abroad")),
    });
  }
  return { rows: out, issues };
}

// ── Announcements: one line per announcement ──
export type AnnouncementImportRow = { line: number; title: string; body: string; audience: string; expires: string; pinned: boolean; requiresAck: boolean; allowComments: boolean };
type AnnouncementField = "title" | "body" | "audience" | "expires" | "pinned" | "requiresAck" | "allowComments";
const ANNOUNCEMENT_ALIASES: Aliases<AnnouncementField> = {
  title: ["basliq", "elanin basligi", "movzu", "title"],
  body: ["metn", "elanin metni", "mezmun", "body", "text"],
  audience: ["auditoriya", "departament", "kime", "audience"],
  expires: ["bitme tarixi", "son tarix", "muddet", "expires"],
  pinned: ["sancilmis", "yuxarida", "sabit", "pinned"],
  requiresAck: ["oxu tesdiqi", "tesdiq teleb olunur", "oxudum tesdiqi", "ack"],
  allowComments: ["serhler", "serhlere icaze", "comments"],
};
export function parseAnnouncements(rows: string[][], limit = 200): { rows: AnnouncementImportRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, ANNOUNCEMENT_ALIASES, "title");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Başlıq” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const out: AnnouncementImportRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} elan yüklənir.` });
      break;
    }
    const title = cell(row, header.map, "title").slice(0, 160);
    const body = cell(row, header.map, "body").slice(0, 3000);
    if (title.length < 3 || body.length < 3) {
      issues.push({ line, reason: "Başlıq və mətn yazılmalıdır (hər biri ən azı 3 simvol)." });
      continue;
    }
    const expiresText = cell(row, header.map, "expires");
    const expires = expiresText ? parseDateCell(expiresText) : "";
    if (expiresText && !expires) {
      issues.push({ line, reason: `${title}: bitmə tarixi oxunmadı (GGGG-AA-GG).` });
      continue;
    }
    out.push({ line, title, body, audience: cell(row, header.map, "audience").slice(0, 120), expires, pinned: yes(cell(row, header.map, "pinned")), requiresAck: yes(cell(row, header.map, "requiresAck")), allowComments: yes(cell(row, header.map, "allowComments")) });
  }
  return { rows: out, issues };
}

// ── Surveys: one line per question; the lines with the same survey name make one survey ──
export type SurveyImportRow = { line: number; survey: string; question: string; kind: "scale10" | "scale5" | "yesno" | "text"; anonymous: boolean; repeatMonths: number };
type SurveyField = "survey" | "question" | "kind" | "anonymous" | "repeat";
const SURVEY_ALIASES: Aliases<SurveyField> = {
  survey: ["sorgu", "sorgunun adi", "anket", "anketin adi", "survey"],
  question: ["sual", "sualin metni", "question"],
  kind: ["sualin novu", "cavab novu", "nov", "kind", "type"],
  anonymous: ["anonim", "anonymous"],
  repeat: ["tekrar", "tekrar ay", "tekrarlanma", "repeat"],
};
// “1–10 şkala”, “1-5 şkala”, “Bəli / Xeyr” and “Mətn” (and their short forms) name the four kinds.
export function surveyKindOf(text: string): SurveyImportRow["kind"] | "" {
  const key = fold(text);
  if (!key) return "text";
  if (/(^| )10( |$)/.test(key) || key === "scale10") return "scale10";
  if (/(^| )5( |$)/.test(key) || key === "scale5") return "scale5";
  if (key.startsWith("beli") || key.startsWith("he") || key.includes("xeyr") || key === "yesno") return "yesno";
  if (key.startsWith("metn") || key.startsWith("serbest") || key === "text") return "text";
  return "";
}
export function parseSurveys(rows: string[][], limit = 200): { rows: SurveyImportRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, SURVEY_ALIASES, "survey");
  if (!header || !header.map.has("question")) return { rows: [], issues: [{ line: 1, reason: "“Sorğu” və “Sual” sütunları tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const out: SurveyImportRow[] = [];
  const issues: RowIssue[] = [];
  const perSurvey = new Map<string, number>();
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sual yüklənir.` });
      break;
    }
    const survey = cell(row, header.map, "survey").slice(0, 160);
    const question = cell(row, header.map, "question").slice(0, 300);
    const kind = surveyKindOf(cell(row, header.map, "kind"));
    const repeatText = cell(row, header.map, "repeat");
    const repeat = repeatText ? Number(repeatText.replace(/[^\d]/g, "")) : 0;
    if (survey.length < 3) issues.push({ line, reason: "Sorğunun adı yazılmalıdır (ən azı 3 simvol)." });
    else if (question.length < 3) issues.push({ line, reason: `${survey}: sual yazılmalıdır (ən azı 3 simvol).` });
    else if (kind === "") issues.push({ line, reason: `${survey}: “${cell(row, header.map, "kind")}” sual növü tanınmadı (1–10 şkala, 1–5 şkala, Bəli / Xeyr, Mətn).` });
    else if (repeatText && ![0, 1, 3, 6, 12].includes(repeat)) issues.push({ line, reason: `${survey}: təkrar 1, 3, 6 və ya 12 ay ola bilər.` });
    else if ((perSurvey.get(survey.toLocaleLowerCase("az")) || 0) >= 20) issues.push({ line, reason: `${survey}: bir sorğuda ən çox 20 sual ola bilər.` });
    else {
      perSurvey.set(survey.toLocaleLowerCase("az"), (perSurvey.get(survey.toLocaleLowerCase("az")) || 0) + 1);
      out.push({ line, survey, question, kind, anonymous: !["xeyr", "no", "0"].includes(fold(cell(row, header.map, "anonymous"))), repeatMonths: repeat });
    }
  }
  return { rows: out, issues };
}

// ── Document deadlines: the date a document of an employee runs out (the document is already in his folder) ──
export type DocDeadlineRow = { line: number; name: string; email: string; fin: string; docType: string; number: string; expires: string };
type DocDeadlineField = "name" | "email" | "fin" | "docType" | "number" | "expires";
const DOC_DEADLINE_ALIASES: Aliases<DocDeadlineField> = {
  name: ["ad soyad", "isci", "isci adi", "ad", "full name", "name", "employee"],
  email: ["e poct", "email", "e mail", "poct"],
  fin: ["fin", "fin kod", "fin kodu"],
  docType: ["senedin novu", "sened", "sened novu", "novu", "document", "type"],
  number: ["sened nomresi", "nomre", "no", "number"],
  expires: ["bitme tarixi", "muddet", "son tarix", "etibarlidir", "expires"],
};
export function parseDocDeadlines(rows: string[][], limit = 1000): { rows: DocDeadlineRow[]; issues: RowIssue[] } {
  const header = findHeader(rows, DOC_DEADLINE_ALIASES, "docType");
  if (!header || !header.map.has("expires")) return { rows: [], issues: [{ line: 1, reason: "“Sənədin növü” və “Bitmə tarixi” sütunları tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const out: DocDeadlineRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (blank(row)) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir yüklənir.` });
      break;
    }
    const name = cell(row, header.map, "name");
    const fin = finOf(cell(row, header.map, "fin"));
    const email = cell(row, header.map, "email").slice(0, 160);
    const docType = cell(row, header.map, "docType").slice(0, 120);
    const text = cell(row, header.map, "expires");
    const expires = text ? parseDateCell(text) : "";
    if (!name && !fin && !email) issues.push({ line, reason: "İşçi (ad, FİN və ya e-poçt) yazılmayıb." });
    else if (!docType && !cell(row, header.map, "number")) issues.push({ line, reason: `${name || fin}: sənədin növü və ya nömrəsi yazılmalıdır.` });
    else if (text && !expires) issues.push({ line, reason: `${name || fin}: “${text}” bitmə tarixi oxunmadı (GGGG-AA-GG). Müddəti silmək üçün xananı boş buraxın.` });
    else out.push({ line, name, email, fin, docType, number: cell(row, header.map, "number").slice(0, 80), expires });
  }
  return { rows: out, issues };
}
