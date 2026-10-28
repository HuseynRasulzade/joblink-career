// Employees and the staff table from a spreadsheet: finds the header row by the column
// names (Azerbaijani, English or Russian), reads dates written as text or as Excel serials,
// and says which rows were not usable. Used in the browser (preview) and on the server.
export type EmployeeRow = {
  line: number;
  name: string;
  position: string;
  department: string;
  section: string;
  startDate: string;
  salary: number;
  salaryType: "gross" | "net";
  sector: "private" | "public";
  email: string;
  phone: string;
  vacationDays: number;
  vacationUsed: number;
};
export type StaffRow = { line: number; department: string; section: string; position: string; planned: number; salary: number; note: string };
export type RowIssue = { line: number; reason: string };

const fold = (value: string) =>
  String(value ?? "")
    .toLocaleLowerCase("az")
    .replace(/[əƏ]/g, "e")
    .replace(/ı/g, "i")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

// A date as ISO from "2026-04-09", "09.04.2026", "9/4/2026" or an Excel serial number.
export function parseDateCell(value: string): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  let year = 0;
  let month = 0;
  let day = 0;
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (match) [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if ((match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text))) [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  else if (/^\d{4,6}(\.\d+)?$/.test(text)) {
    const serial = Math.floor(Number(text));
    if (serial < 20000 || serial > 80000) return "";
    return new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000).toISOString().slice(0, 10);
  }
  if (!year) return "";
  const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso ? iso : "";
}

// "2 800", "2.800,50", "2,800.50" and "2800 AZN" are all numbers.
export function parseNumberCell(value: string): number {
  let text = String(value ?? "").replace(/[^\d.,-]/g, "");
  if (!text) return 0;
  const lastComma = text.lastIndexOf(",");
  const lastDot = text.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) text = lastComma > lastDot ? text.replace(/\./g, "").replace(",", ".") : text.replace(/,/g, "");
  else if (lastComma >= 0) text = /,\d{1,2}$/.test(text) ? text.replace(",", ".") : text.replace(/,/g, "");
  else if (lastDot >= 0 && /\.\d{3}$/.test(text) && text.indexOf(".") === lastDot) text = text.replace(".", "");
  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

type Field = "name" | "position" | "department" | "section" | "startDate" | "salary" | "salaryType" | "sector" | "email" | "phone" | "vacationDays" | "vacationUsed" | "planned" | "note";
const ALIASES: Record<Field, string[]> = {
  name: ["ad soyad", "ad soyad ata adi", "soyad ad", "isci", "isci adi", "ad", "fio", "ф и о", "фио", "full name", "name", "employee"],
  position: ["vezife", "ixtisas", "position", "title", "job title", "должность"],
  department: ["departament", "department", "idare", "департамент"],
  section: ["sobe", "section", "sektor bolme", "bolme", "otdel", "отдел"],
  startDate: ["ise baslama", "ise baslama tarixi", "ise qebul tarixi", "ise qebul", "baslama tarixi", "start date", "hire date", "дата приема"],
  salary: ["emek haqqi", "emek haqqi azn", "maas", "maas azn", "salary", "gross", "net", "оклад", "зарплата"],
  salaryType: ["maas novu", "emek haqqi novu", "gross net", "salary type", "tip zarplaty"],
  sector: ["sektor", "vergi sektoru", "sector", "tax sector"],
  email: ["e poct", "email", "e mail", "poct", "почта"],
  phone: ["telefon", "mobil", "phone", "tel", "телефон"],
  vacationDays: ["mezuniyyet gunleri", "illik mezuniyyet", "mezuniyyet hegqi", "mezuniyyet", "vacation days", "leave days", "дни отпуска"],
  vacationUsed: ["istifade olunmus mezuniyyet", "istifade edilen mezuniyyet", "istifade olunan mezuniyyet", "istifade olunmus", "used vacation", "used leave", "использовано"],
  planned: ["say", "stat sayi", "stat vahidi", "stat vahidlerinin sayi", "planned", "count", "количество", "штат"],
  note: ["qeyd", "note", "comment", "примечание"],
};

function columnMap(header: string[], fields: Field[]) {
  const map = new Map<Field, number>();
  const keys = header.map(fold);
  // The most exact column name wins, so "ad soyad" is not taken as "ad".
  for (const field of fields) {
    for (const alias of ALIASES[field]) {
      const index = keys.findIndex((key, i) => key === alias && !([...map.values()].includes(i)));
      if (index >= 0) {
        map.set(field, index);
        break;
      }
    }
  }
  // Columns written as "Net maaş" or "Gross əmək haqqı".
  if (fields.includes("salary") && !map.has("salary")) {
    const index = keys.findIndex((key, i) => /(maas|emek haqqi|salary|оклад|зарплата)/.test(key) && !([...map.values()].includes(i)));
    if (index >= 0) map.set("salary", index);
  }
  return { map, keys };
}

// The header row is the first of the top ten rows that has the name column (or the position column for the staff table).
function findHeader(rows: string[][], fields: Field[], must: Field) {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const found = columnMap(rows[i] || [], fields);
    if (found.map.has(must)) return { index: i, ...found };
  }
  return null;
}

export function parseEmployeeRows(rows: string[][], limit = 500): { rows: EmployeeRow[]; issues: RowIssue[] } {
  const fields: Field[] = ["name", "position", "department", "section", "startDate", "salary", "salaryType", "sector", "email", "phone", "vacationDays", "vacationUsed"];
  const header = findHeader(rows, fields, "name");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Ad Soyad” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const get = (row: string[], field: Field) => String(row[header.map.get(field) ?? -1] ?? "").trim();
  // The salary column says gross or net in its own name, or a type column does.
  const salaryHeader = header.keys[header.map.get("salary") ?? -1] || "";
  const out: EmployeeRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (!row.some((cell) => String(cell ?? "").trim())) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} işçi əlavə olunur.` });
      break;
    }
    const name = get(row, "name").slice(0, 120);
    if (name.length < 2) {
      issues.push({ line, reason: "Ad Soyad yoxdur." });
      continue;
    }
    const startText = get(row, "startDate");
    const startDate = parseDateCell(startText);
    if (startText && !startDate) {
      issues.push({ line, reason: `İşə başlama tarixi oxunmadı: “${startText}”.` });
      continue;
    }
    const typeText = fold(get(row, "salaryType"));
    const salaryType: "gross" | "net" = /\bnet\b|ele veril|на руки/.test(typeText) || (!typeText && /\bnet\b/.test(salaryHeader)) ? "net" : "gross";
    const sectorText = fold(get(row, "sector"));
    out.push({
      line,
      name,
      position: get(row, "position").slice(0, 120),
      department: get(row, "department").slice(0, 120),
      section: get(row, "section").slice(0, 120),
      startDate,
      salary: Math.max(0, Math.min(1_000_000, parseNumberCell(get(row, "salary")))),
      salaryType,
      sector: /dovlet|state|public|neft|oil|gosud/.test(sectorText) ? "public" : "private",
      email: get(row, "email").slice(0, 160),
      phone: get(row, "phone").slice(0, 40),
      vacationDays: header.map.has("vacationDays") ? Math.max(0, Math.min(365, Math.round(parseNumberCell(get(row, "vacationDays"))))) : 21,
      vacationUsed: Math.max(0, Math.min(3650, Math.round(parseNumberCell(get(row, "vacationUsed"))))),
    });
  }
  return { rows: out, issues };
}

export function parseStaffRows(rows: string[][], limit = 500): { rows: StaffRow[]; issues: RowIssue[] } {
  const fields: Field[] = ["department", "section", "position", "planned", "salary", "note"];
  const header = findHeader(rows, fields, "department") || findHeader(rows, fields, "position");
  if (!header) return { rows: [], issues: [{ line: 1, reason: "“Departament” və ya “Vəzifə” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const get = (row: string[], field: Field) => String(row[header.map.get(field) ?? -1] ?? "").trim();
  const out: StaffRow[] = [];
  const issues: RowIssue[] = [];
  for (let i = header.index + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (!row.some((cell) => String(cell ?? "").trim())) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} sətir əlavə olunur.` });
      break;
    }
    const department = get(row, "department").slice(0, 120);
    const position = get(row, "position").slice(0, 120);
    if (!department && !position) {
      issues.push({ line, reason: "Departament və vəzifə boşdur." });
      continue;
    }
    const plannedText = get(row, "planned");
    const planned = plannedText ? Math.round(parseNumberCell(plannedText)) : 1;
    if (planned < 0 || planned > 10000) {
      issues.push({ line, reason: `Ştat sayı düzgün deyil: “${plannedText}”.` });
      continue;
    }
    out.push({ line, department, section: get(row, "section").slice(0, 120), position, planned, salary: Math.max(0, parseNumberCell(get(row, "salary"))), note: get(row, "note").slice(0, 300) });
  }
  return { rows: out, issues };
}

export const EMPLOYEE_TEMPLATE_HEADERS = ["Ad Soyad", "Vəzifə", "Departament", "Şöbə", "İşə başlama", "Əmək haqqı", "Maaş növü (gross/net)", "Sektor (özəl/dövlət)", "E-poçt", "Telefon", "Məzuniyyət günləri (il üçün)", "İstifadə olunmuş məzuniyyət"];
export const EMPLOYEE_TEMPLATE_EXAMPLE = ["Aysel Məmmədova", "Baş mühasib", "Maliyyə", "Mühasibat", "2026-04-09", 2800, "gross", "özəl", "aysel@example.az", "+994501234567", 21, 5];
export const STAFF_TEMPLATE_HEADERS = ["Departament", "Şöbə", "Vəzifə", "Ştat sayı", "Əmək haqqı", "Qeyd"];
export const STAFF_TEMPLATE_EXAMPLE = ["Maliyyə", "Mühasibat", "Baş mühasib", 1, 2800, ""];
