// Branches in Excel: the branches, who works in which of them (with the position there and the share of the pay), and the
// monthly sales limit, the sales and the bonus rule of each branch. Written to a workbook, read back, with a sample file.
import type { XlsxSheet } from "./xlsx.ts";
import { parseDateCell } from "./staff-import.ts";
import { parseMonthCell } from "./plan-fact-excel.ts";
import { MODE_LABEL, normalizeMode, type AllocationMode } from "./branches.ts";

export const BX = { guide: "Təlimat", branches: "Filiallar", links: "İşçi-filial", sales: "Satış və bonus", mode: "Bölgü" } as const;

const fold = (value: string) =>
  String(value ?? "")
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/[^a-z0-9%]+/g, " ")
    .trim();
const yes = (v: string) => ["beli", "yes", "1", "true", "he", "var"].includes(fold(v));
const no = (v: string) => ["xeyr", "no", "0", "false", "yox"].includes(fold(v));
const num = (v: string) => {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace("%", "").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
};

export type SheetRows = { name: string; rows: string[][] };
export type ParsedBranches = {
  branches: { name: string; code: string; city: string; active: boolean }[];
  links: { fin: string; name: string; branch: string; role: string; sharePct: number; bonusEligible: boolean; from: string; to: string; department: string; section: string }[];
  sales: { month: string; branch: string; target: number; sales: number; kind: "fixed" | "salary_percent" | ""; value: number; active: boolean }[];
  mode: AllocationMode | "";
  issues: { sheet: string; line: number; reason: string }[];
  found: string[];
};

// Rows below the header row (the first cell is the first column name); a row counts when one of its first `width` cells is filled
// (the cells to the right may be formulas that show something for every line).
function body(sheet: SheetRows | undefined, first: string, width: number) {
  if (!sheet) return [];
  const at = sheet.rows.findIndex((r) => fold(r[0] || "") === fold(first));
  if (at < 0) return [];
  return sheet.rows.slice(at + 1).map((cells, i) => ({ line: at + i + 2, cells })).filter((r) => r.cells.slice(0, width).some((c) => String(c ?? "").trim() !== ""));
}

export function parseBranchSheets(sheets: SheetRows[]): ParsedBranches {
  const by = (name: string) => sheets.find((s) => fold(s.name) === fold(name));
  const out: ParsedBranches = { branches: [], links: [], sales: [], mode: "", issues: [], found: [] };
  if (!by(BX.branches) && !by(BX.links) && !by(BX.sales) && !by(BX.mode)) {
    out.issues.push({ sheet: "", line: 0, reason: "Bu fayl filial faylı deyil: «Filiallar», «İşçi-filial», «Satış və bonus» və ya «Bölgü» vərəqi tapılmadı." });
    return out;
  }
  // Filial | Kod | Şəhər | Aktiv
  const seen = new Set<string>();
  for (const { line, cells } of body(by(BX.branches), "Filial", 4)) {
    out.found.push(BX.branches);
    const name = String(cells[0] || "").trim();
    if (!name) out.issues.push({ sheet: BX.branches, line, reason: "Filialın adı yazılmayıb." });
    else if (seen.has(fold(name))) out.issues.push({ sheet: BX.branches, line, reason: `“${name}” iki dəfə yazılıb.` });
    else {
      seen.add(fold(name));
      out.branches.push({ name, code: String(cells[1] || "").trim(), city: String(cells[2] || "").trim(), active: !no(cells[3] || "") });
    }
  }
  // FİN | Ad Soyad | Filial | Vəzifə (filialda) | Pay % | Bonus alır | Başlama | Bitmə
  // Departament and Şöbə are read by their header names (the workbook's own sheet has other columns in those places).
  const linksSheet = by(BX.links);
  const linkHead = (linksSheet?.rows.find((r) => fold(r[0] || "") === "fin") || []).map((h) => fold(h));
  const deptAt = linkHead.indexOf("departament");
  const sectionAt = linkHead.indexOf("sobe");
  for (const { line, cells } of body(linksSheet, "FİN", 8)) {
    out.found.push(BX.links);
    const fin = String(cells[0] || "").trim();
    const name = String(cells[1] || "").trim();
    const branch = String(cells[2] || "").trim();
    const pct = cells[4] === undefined || String(cells[4]).trim() === "" ? 0 : num(cells[4]);
    const from = String(cells[6] || "").trim() ? parseDateCell(cells[6]) : "";
    const to = String(cells[7] || "").trim() ? parseDateCell(cells[7]) : "";
    if (!fin && !name) out.issues.push({ sheet: BX.links, line, reason: "FİN və ya ad yazılmayıb." });
    else if (!branch) out.issues.push({ sheet: BX.links, line, reason: "Filial yazılmayıb." });
    else if (!Number.isFinite(pct) || pct < 0 || pct > 100) out.issues.push({ sheet: BX.links, line, reason: `“${cells[4]}” pay faizi 0–100 arası olmalıdır.` });
    else if (String(cells[6] || "").trim() && !from) out.issues.push({ sheet: BX.links, line, reason: `“${cells[6]}” başlama tarixi oxunmadı.` });
    else if (String(cells[7] || "").trim() && !to) out.issues.push({ sheet: BX.links, line, reason: `“${cells[7]}” bitmə tarixi oxunmadı.` });
    else out.links.push({ fin, name, branch, role: String(cells[3] || "").trim(), sharePct: pct, bonusEligible: !no(cells[5] || ""), from, to, department: deptAt >= 0 ? String(cells[deptAt] || "").trim() : "", section: sectionAt >= 0 ? String(cells[sectionAt] || "").trim() : "" });
  }
  // Ay | Filial | Satış limiti | Satış | Bonus növü | Bonus dəyəri | Qayda aktiv
  const seenSale = new Set<string>();
  for (const { line, cells } of body(by(BX.sales), "Ay", 7)) {
    out.found.push(BX.sales);
    const month = parseMonthCell(cells[0] || "");
    const branch = String(cells[1] || "").trim();
    const target = String(cells[2] ?? "").trim() === "" ? 0 : num(cells[2]);
    const sales = String(cells[3] ?? "").trim() === "" ? 0 : num(cells[3]);
    const kindText = fold(cells[4] || "");
    const kind = !kindText ? "" : kindText.startsWith("sabit") || kindText === "fixed" ? "fixed" : kindText.includes("maas") || kindText.includes("%") || kindText.includes("faiz") ? "salary_percent" : null;
    const value = String(cells[5] ?? "").trim() === "" ? 0 : num(cells[5]);
    if (!month) out.issues.push({ sheet: BX.sales, line, reason: `“${cells[0] || ""}” ayı oxunmadı (məs. 2026-11).` });
    else if (!branch) out.issues.push({ sheet: BX.sales, line, reason: "Filial yazılmayıb." });
    else if (!Number.isFinite(target) || target < 0 || !Number.isFinite(sales) || sales < 0) out.issues.push({ sheet: BX.sales, line, reason: "Satış limiti və satış mənfi olmayan rəqəm olmalıdır." });
    else if (kind === null) out.issues.push({ sheet: BX.sales, line, reason: `“${cells[4]}” bonus növü tanınmadı (Sabit məbləğ və ya Maaşın %).` });
    else if (!Number.isFinite(value) || value < 0 || (kind === "salary_percent" && value > 1000)) out.issues.push({ sheet: BX.sales, line, reason: `“${cells[5]}” bonus dəyəri düzgün deyil.` });
    else if (seenSale.has(`${fold(branch)}|${month}`)) out.issues.push({ sheet: BX.sales, line, reason: "Eyni filial və ay iki dəfə yazılıb." });
    else {
      seenSale.add(`${fold(branch)}|${month}`);
      out.sales.push({ month, branch, target, sales, kind, value, active: !no(cells[6] || "") });
    }
  }
  // Bölgü rejimi | Bərabər / Satışa görə
  for (const { cells } of body(by(BX.mode), "Parametr", 2)) {
    out.found.push(BX.mode);
    if (fold(cells[0] || "").startsWith("bolgu")) out.mode = fold(cells[1] || "").includes("satis") ? "sales" : "equal";
  }
  out.found = [...new Set(out.found)];
  return out;
}

export type BranchExport = {
  mode: AllocationMode;
  branches: { name: string; code: string; city: string; active: boolean }[];
  links: { fin: string; name: string; branch: string; role: string; sharePct: number; bonusEligible: boolean; from: string; to: string; department: string; section: string }[];
  sales: { month: string; branch: string; target: number; sales: number; kind: "fixed" | "salary_percent"; value: number; active: boolean }[];
};
export const GUIDE = [
  "Filiallar: Excel ilə yükləmə təlimatı",
  "",
  "«Filiallar» vərəqi: Filial | Kod | Şəhər | Aktiv (Bəli/Xeyr). Filiallar yalnız Ştat cədvəlindən yaranır; burada olmayan filial yüklənmir, yalnız mövcudun kodu, şəhəri və aktivliyi yazılır.",
  "«İşçi-filial» vərəqi: FİN | Ad Soyad | Filial | Vəzifə (filialda) | Pay % | Bonus alır | Başlama | Bitmə | Departament | Şöbə (departament və şöbə həmin filialın ştat cədvəlindəki olmalıdır). Bir işçi bir neçə sətirdə (bir neçə filialda) ola bilər. Pay % boşdursa maaş «Bölgü» rejiminə görə bölünür; yazılıbsa həmin faizlə.",
  "«Satış və bonus» vərəqi: Ay | Filial | Satış limiti | Satış | Bonus növü (Sabit məbləğ / Maaşın %) | Bonus dəyəri | Qayda aktiv. Satış limitə çatanda və ya keçəndə bonus avtomatik hesablanır: sabit məbləğ (hər işçiyə) və ya filiala düşən maaşın faizi (100 = maaşın özü qədər).",
  "«Bölgü» vərəqi: Parametr | Dəyər. «Bölgü rejimi»: Bərabər (filial sayına görə) və ya Satışa görə.",
  "Təsdiqlənmiş ayın satışı və limiti dəyişmir. Platformadan çıxarılmış faylı geri yükləmək olar.",
];

const HEAD = {
  branches: ["Filial", "Kod", "Şəhər", "Aktiv"],
  links: ["FİN", "Ad Soyad", "Filial", "Vəzifə (filialda)", "Pay %", "Bonus alır", "Başlama", "Bitmə", "Departament", "Şöbə"],
  sales: ["Ay", "Filial", "Satış limiti", "Satış", "Bonus növü", "Bonus dəyəri", "Qayda aktiv"],
  mode: ["Parametr", "Dəyər"],
};
const yn = (b: boolean) => (b ? "Bəli" : "Xeyr");

export function branchWorkbook(data: BranchExport): XlsxSheet[] {
  return [
    { name: BX.guide, headers: ["Təlimat"], rows: GUIDE.slice(1).map((l) => [l]) },
    { name: BX.branches, headers: HEAD.branches, rows: data.branches.map((b) => [b.name, b.code, b.city, yn(b.active)]) },
    { name: BX.links, headers: HEAD.links, rows: data.links.map((l) => [l.fin, l.name, l.branch, l.role, l.sharePct || "", yn(l.bonusEligible), l.from, l.to, l.department, l.section]) },
    { name: BX.sales, headers: HEAD.sales, rows: data.sales.map((s) => [s.month, s.branch, s.target, s.sales, s.kind === "fixed" ? "Sabit məbləğ" : "Maaşın %", s.value, yn(s.active)]) },
    { name: BX.mode, headers: HEAD.mode, rows: [["Bölgü rejimi", data.mode === "sales" ? "Satışa görə" : "Bərabər"]] },
  ];
}

export function branchTemplate(month: string): XlsxSheet[] {
  return branchWorkbook({
    mode: "equal",
    branches: [
      { name: "A filialı", code: "A", city: "Bakı", active: true },
      { name: "B filialı", code: "B", city: "Gəncə", active: true },
    ],
    links: [
      { fin: "1ABCDE2", name: "Nümunə Baş Mühasib", branch: "A filialı", role: "Baş mühasib", sharePct: 0, bonusEligible: true, from: "", to: "", department: "Maliyyə", section: "" },
      { fin: "1ABCDE2", name: "Nümunə Baş Mühasib", branch: "B filialı", role: "Mühasib", sharePct: 0, bonusEligible: true, from: "", to: "", department: "Maliyyə", section: "" },
      { fin: "3FGHIJ4", name: "Nümunə Satıcı", branch: "A filialı", role: "Satış meneceri", sharePct: 100, bonusEligible: true, from: "", to: "", department: "Satış", section: "" },
    ],
    sales: [
      { month, branch: "A filialı", target: 50000, sales: 56000, kind: "fixed", value: 200, active: true },
      { month, branch: "B filialı", target: 30000, sales: 24000, kind: "salary_percent", value: 100, active: true },
    ],
  });
}
export { MODE_LABEL };

// The branch sheets of the payroll calculation workbook ("Filiallar" carries the limit, sales and rule of the month on the same line
// as the branch; "İşçi-filial" the links) as the standard sheets of this import.
export function branchSheetsFromWorkbook(sheets: SheetRows[], month: string, names: { branches: string; people: string }): SheetRows[] | null {
  const bs = sheets.find((x) => fold(x.name) === fold(names.branches));
  const bp = sheets.find((x) => fold(x.name) === fold(names.people));
  if (!bs && !bp) return null;
  const out: SheetRows[] = [];
  if (bs) {
    out.push({ name: BX.branches, rows: bs.rows });
    const at = bs.rows.findIndex((r) => fold(r[0] || "") === "filial");
    const sales: string[][] = [["Ay", "Filial", "Satış limiti", "Satış", "Bonus növü", "Bonus dəyəri", "Qayda aktiv"]];
    if (at >= 0) for (const r of bs.rows.slice(at + 1)) if (String(r[0] || "").trim()) sales.push([month, r[0] || "", r[4] || "", r[5] || "", r[6] || "", r[7] || "", r[8] || ""]);
    out.push({ name: BX.sales, rows: sales });
    const modeRow = bs.rows.find((r) => fold(r[0] || "").startsWith("bolgu"));
    if (modeRow) out.push({ name: BX.mode, rows: [["Parametr", "Dəyər"], ["Bölgü rejimi", modeRow[1] || ""]] });
  }
  if (bp) out.push({ name: BX.links, rows: bp.rows });
  return out;
}
