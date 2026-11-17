// The plan and the actual in Excel: one workbook with the budget, the monthly headcount plan and the expenses, with a sample
// file and a reader that turns the filled sheets back into rows the platform checks and saves.
import type { XlsxSheet } from "./xlsx.ts";
import { EXPENSE_CATEGORIES } from "./hr-expenses.ts";
import { parseDateCell, parseMonthCell, parseStaffRows, STAFF_TEMPLATE_HEADERS, type StaffRow } from "./staff-import.ts";

export const PF = { guide: "Təlimat", budget: "Büdcə", staff: "Ştat planı", expenses: "Xərclər" } as const;
// The sheet of the earlier files (a target for each month): it is no longer used, the plan line comes from the approved staff plan.
const LEGACY_HEADCOUNT = "İşçi sayı planı";
export { parseMonthCell };

// Every kind of the budget as the file names it: pay and training come from the platform itself, the rest are the HR expenses.
export const BUDGET_KINDS: { id: string; label: string }[] = [
  { id: "payroll", label: "Əmək haqqı" },
  { id: "training", label: "Təlim" },
  ...EXPENSE_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
];

const fold = (value: string) =>
  String(value ?? "")
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const kindOf = (value: string, allowed: { id: string; label: string }[]) => {
  const key = fold(value);
  return allowed.find((k) => fold(k.id) === key || fold(k.label) === key)?.id || "";
};
const money = (value: string) => {
  const n = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

export type SheetRows = { name: string; rows: string[][] };
export type ParsedPlanFact = {
  budgets: { month: string; department: string; category: string; amount: number }[];
  staff: StaffRow[];
  legacyTargets: number;
  expenses: { category: string; title: string; department: string; amount: number; date: string; payee: string; note: string }[];
  skipped: number;
  issues: { sheet: string; line: number; reason: string }[];
  found: string[];
};

// Rows below the header row (the one whose first cell is the first column name), empty lines dropped.
function body(sheet: SheetRows | undefined, first: string): { line: number; cells: string[] }[] {
  if (!sheet) return [];
  const at = sheet.rows.findIndex((r) => fold(r[0] || "") === fold(first));
  if (at < 0) return [];
  return sheet.rows.slice(at + 1).map((cells, i) => ({ line: at + i + 2, cells })).filter((r) => r.cells.some((c) => String(c ?? "").trim() !== ""));
}

export function parsePlanFactSheets(sheets: SheetRows[]): ParsedPlanFact {
  const by = (name: string) => sheets.find((s) => fold(s.name) === fold(name));
  const out: ParsedPlanFact = { budgets: [], staff: [], legacyTargets: 0, expenses: [], skipped: 0, issues: [], found: [] };
  const budget = by(PF.budget);
  const people = by(PF.staff);
  const legacy = by(LEGACY_HEADCOUNT);
  const expenses = by(PF.expenses);
  if (!budget && !people && !expenses && !legacy) {
    out.issues.push({ sheet: "", line: 0, reason: "Bu fayl plan və fakt faylı deyil: «Büdcə», «Ştat planı» və ya «Xərclər» vərəqi tapılmadı." });
    return out;
  }
  // Növ | Departament | Ay | Məbləğ (AZN)
  const seenBudget = new Set<string>();
  for (const { line, cells } of body(budget, "Növ")) {
    out.found.push(PF.budget);
    const category = kindOf(cells[0] || "", BUDGET_KINDS);
    const month = parseMonthCell(cells[2] || "");
    const amount = money(cells[3] || "");
    if (!category) out.issues.push({ sheet: PF.budget, line, reason: `“${cells[0] || ""}” büdcə növü tanınmadı.` });
    else if (!month) out.issues.push({ sheet: PF.budget, line, reason: `“${cells[2] || ""}” ayı oxunmadı (məs. 2026-11).` });
    else if (!Number.isFinite(amount) || amount < 0) out.issues.push({ sheet: PF.budget, line, reason: `“${cells[3] || ""}” məbləği oxunmadı.` });
    else {
      const department = String(cells[1] || "").trim();
      const key = `${category}|${department}|${month}`;
      if (seenBudget.has(key)) out.issues.push({ sheet: PF.budget, line, reason: "Eyni növ, departament və ay iki dəfə yazılıb." });
      else {
        seenBudget.add(key);
        out.budgets.push({ month, department, category, amount });
      }
    }
  }
  // Filial | Departament | Şöbə | Vəzifə | Pillə | Ştat sayı | Ştat dərəcəsi | Əmək haqqı | Maksimum əmək haqqı | Başlanğıc ay | Son ay | Qeyd (the same columns as the staff table)
  if (people) {
    const read = parseStaffRows(people.rows);
    if (read.rows.length || read.issues.length) out.found.push(PF.staff);
    out.staff = read.rows;
    for (const issue of read.issues) out.issues.push({ sheet: PF.staff, line: issue.line, reason: issue.reason });
    // The same place twice in one file is one mistake, not two rows.
    const seen = new Set<string>();
    out.staff = out.staff.filter((r) => {
      const key = [r.branch, r.department, r.section, r.position, r.level].map((v) => v.trim().toLocaleLowerCase("az")).join("|");
      if (seen.has(key)) {
        out.issues.push({ sheet: PF.staff, line: r.line, reason: "Eyni filial, departament, şöbə, vəzifə və pillə iki dəfə yazılıb." });
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  if (legacy) {
    out.legacyTargets = body(legacy, "Ay").length;
    if (out.legacyTargets) out.issues.push({ sheet: LEGACY_HEADCOUNT, line: 0, reason: `Köhnə «İşçi sayı planı» vərəqi (aylıq hədəf) artıq oxunmur: plan xətti təsdiqlənmiş ştat planından gəlir. Ştatı «${PF.staff}» vərəqində yazın.` });
  }
  // Növ | Xərcin adı | Departament | Məbləğ | Tarix | Kimə ödəniləcək | Qeyd | (export only: Vəziyyət | Sifariş № | Ödəniş tarixi | Üsul | Hesab / kassa | Sənəd № | Sistem ID)
  const kinds = EXPENSE_CATEGORIES.map((c) => ({ id: c.id, label: c.label }));
  for (const { line, cells } of body(expenses, "Növ")) {
    out.found.push(PF.expenses);
    // A line that came out of the platform (it has its system ID) is already there; changes are made in the platform.
    if (String(cells[13] || "").trim()) {
      out.skipped++;
      continue;
    }
    const category = kindOf(cells[0] || "", kinds);
    const title = String(cells[1] || "").trim();
    const amount = money(cells[3] || "");
    const date = parseDateCell(cells[4] || "");
    if (!category) out.issues.push({ sheet: PF.expenses, line, reason: `“${cells[0] || ""}” xərc növü tanınmadı (əmək haqqı və təlim burada yazılmır).` });
    else if (!title) out.issues.push({ sheet: PF.expenses, line, reason: "Xərcin adı yazılmayıb." });
    else if (!Number.isFinite(amount) || amount <= 0) out.issues.push({ sheet: PF.expenses, line, reason: `“${cells[3] || ""}” məbləği müsbət rəqəm olmalıdır.` });
    else if (!date) out.issues.push({ sheet: PF.expenses, line, reason: `“${cells[4] || ""}” tarixi oxunmadı.` });
    else out.expenses.push({ category, title, department: String(cells[2] || "").trim(), amount, date, payee: String(cells[5] || "").trim(), note: String(cells[6] || "").trim() });
  }
  out.found = [...new Set(out.found)];
  return out;
}

export const EXPENSE_HEADERS = ["Növ", "Xərcin adı", "Departament", "Məbləğ (AZN)", "Tarix", "Kimə ödəniləcək", "Qeyd", "Vəziyyət", "Sifariş №", "Ödəniş tarixi", "Ödəniş üsulu", "Hesab / kassa", "Sənəd №", "Sistem ID (dəyişməyin)"];
export const BUDGET_HEADERS = ["Növ", "Departament", "Ay", "Məbləğ (AZN)"];
export const STAFF_SHEET_HEADERS = STAFF_TEMPLATE_HEADERS;
export const GUIDE_LINES = [
  "Plan və fakt: Excel ilə yükləmə təlimatı",
  "",
  "«Büdcə» vərəqi: Növ | Departament | Ay | Məbləğ. Departament boş qalarsa «bölünməmiş» sayılır. Ay: 2026-11 kimi.",
  `Növ: ${BUDGET_KINDS.map((k) => k.label).join(", ")}.`,
  "«Ştat planı» vərəqi: Filial | Departament | Şöbə | Vəzifə | Pillə | Ştat sayı | Ştat dərəcəsi | Əmək haqqı | Maksimum əmək haqqı | Başlanğıc ay | Son ay | Qeyd. Departament və vəzifə məcburidir; Filial boşdursa baş ofis. Eyni filial, departament, şöbə, vəzifə və pillə olan sətir yenilənir, yenisi əlavə olunur.",
  "Ştat dərəcəsi: tam, 3/4, yarım, 1/4. Pillə: Junior, Orta, Böyük (Senior), Rəhbər (Lead). Başlanğıc və son ay: 2026-09 kimi (müvəqqəti layihə yeri üçün son ay). Əmək haqqı və maksimum: AZN, gross.",
  "Qrafikdəki plan xətti bu vərəqdən yox, təsdiqlənmiş ştat planından hesablanır; faylda «İşçi sayı planı» (aylıq hədəf) vərəqi artıq oxunmur.",
  `«Xərclər» vərəqi (yalnız ilk 7 sütun doldurulur): Növ | Xərcin adı | Departament | Məbləğ | Tarix | Kimə ödəniləcək | Qeyd. Növ: ${EXPENSE_CATEGORIES.map((c) => c.label).join(", ")}.`,
  "Xərclər yeni xərc kimi «Planlaşdırılıb» vəziyyətində yazılır; sonra direktor təsdiqləyir və sifariş kimi xarici sistemə düşür.",
  "Platformadan çıxarılmış fayldakı xərc sətirləri (Sistem ID dolu) təkrar yazılmır, yalnız sayılır.",
  "Təsdiqlənmiş və ya təsdiqdə olan ilin büdcəsi dəyişmir; təsdiqlənmiş ştat planına yükləmə direktorun təsdiqinə göndərilir. Xərc büdcədən artıq olarsa həmin sətir rədd olunur.",
];

// ---- the workbook of a year (export) and the sample file ----


export type ExportData = {
  year: string;
  budgets: { month: string; department: string; category: string; amount: number }[];
  staff: { branch: string; department: string; section: string; position: string; level: string; rate: number; planned: number; salaryMin: number; salaryMax: number; startMonth: string; endMonth: string; note: string }[];
  expenses: { id: string; category: string; title: string; department: string; amount: number; date: string; payee: string; note: string; status: string; orderNo: string; paidOn: string; method: string; payFrom: string; payRef: string }[];
};
const STATUS_LABEL: Record<string, string> = { planned: "Planlaşdırılıb", approved: "Təsdiqlənib", ordered: "Sifarişdə", paid: "Ödənilib", cancelled: "Ləğv edilib" };
const METHOD_LABEL: Record<string, string> = { bank: "Bank köçürməsi", card: "Kart", cash: "Nağd (kassa)", other: "Digər" };
const rateWord = (rate: number) => ({ 1: "tam", 0.75: "3/4", 0.5: "yarım", 0.25: "1/4" } as Record<number, string>)[rate] || "tam";
const kindLabel = (id: string) => BUDGET_KINDS.find((k) => k.id === id)?.label || id;

export function planFactWorkbook(data: ExportData): XlsxSheet[] {
  return [
    { name: PF.guide, headers: ["Təlimat"], rows: GUIDE_LINES.slice(1).map((line) => [line]) },
    { name: PF.budget, headers: BUDGET_HEADERS, rows: data.budgets.map((b) => [kindLabel(b.category), b.department, b.month, b.amount]) },
    { name: PF.staff, headers: STAFF_SHEET_HEADERS, rows: data.staff.map((r) => [r.branch, r.department, r.section, r.position, r.level, r.planned, rateWord(r.rate), r.salaryMin || "", r.salaryMax > r.salaryMin ? r.salaryMax : "", r.startMonth, r.endMonth, r.note]) },
    {
      name: PF.expenses,
      headers: EXPENSE_HEADERS,
      rows: data.expenses.map((e) => [kindLabel(e.category), e.title, e.department, e.amount, e.date, e.payee, e.note, STATUS_LABEL[e.status] || e.status, e.orderNo, e.paidOn, METHOD_LABEL[e.method] || e.method, e.payFrom, e.payRef, e.id]),
    },
  ];
}

// The sample file: a few lines of each sheet, to be overwritten.
export function planFactTemplate(year: string): XlsxSheet[] {
  return planFactWorkbook({
    year,
    budgets: [
      { category: "payroll", department: "", month: `${year}-01`, amount: 20000 },
      { category: "gifts", department: "Maliyyə", month: `${year}-03`, amount: 500 },
      { category: "events", department: "", month: `${year}-12`, amount: 3000 },
      { category: "certificate", department: "İT", month: `${year}-06`, amount: 1200 },
    ],
    staff: [
      { branch: "", department: "Maliyyə", section: "Mühasibat", position: "Baş mühasib", level: "", rate: 1, planned: 1, salaryMin: 2500, salaryMax: 3000, startMonth: "", endMonth: "", note: "" },
      { branch: "", department: "Maliyyə", section: "Mühasibat", position: "Mühasib", level: "Junior", rate: 1, planned: 2, salaryMin: 800, salaryMax: 1200, startMonth: "", endMonth: "", note: "" },
      { branch: "", department: "Maliyyə", section: "Mühasibat", position: "Mühasib", level: "Böyük (Senior)", rate: 1, planned: 1, salaryMin: 1800, salaryMax: 2600, startMonth: `${year}-09`, endMonth: "", note: "sentyabrdan" },
      { branch: "A filialı", department: "Satış", section: "Daxili satış", position: "Satış meneceri", level: "", rate: 0.5, planned: 3, salaryMin: 600, salaryMax: 900, startMonth: `${year}-03`, endMonth: `${year}-08`, note: "layihə yeri" },
    ],
    expenses: [
      { id: "", category: "events", title: "Yeni il tədbiri", department: "", amount: 2500, date: `${year}-12-20`, payee: "Otel MMC", note: "40 nəfər", status: "", orderNo: "", paidOn: "", method: "", payFrom: "", payRef: "" },
      { id: "", category: "certificate", title: "PMP sertifikat imtahanı", department: "İT", amount: 600, date: `${year}-06-10`, payee: "PMI", note: "", status: "", orderNo: "", paidOn: "", method: "", payFrom: "", payRef: "" },
    ],
  });
}
