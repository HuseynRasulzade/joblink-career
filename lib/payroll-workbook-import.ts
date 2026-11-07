// What goes from the calculation workbook back into the platform: each input sheet is turned into the rows of the
// import the platform already has (leave and absences → attendance, bonuses / additions / deductions → pay inputs,
// extra hours → month totals, trips → trips). The platform's own import then validates every row.
import { FOREIGN_NORMS } from "./trip-norms-data.ts";
import { OTHER_DOMESTIC } from "./trip-places.ts";
import { WB } from "./payroll-workbook.ts";
import type { WorkbookSheet } from "./workbook-read.ts";

export type WorkbookImport = {
  attendance: string[][] | null;
  payroll: string[][] | null;
  hours: string[][] | null;
  trips: string[][] | null;
  counts: { attendance: number; payroll: number; hours: number; trips: number };
  found: string[];
  issues: string[];
};

const fold = (value: string) =>
  value
    .toLocaleLowerCase("az")
    .replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const num = (value: string | undefined) => {
  const n = Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const FOREIGN = new Set(FOREIGN_NORMS.flatMap((n) => [n.country, ...n.cities.map((c) => `${n.country}, ${c.name}`)]));

// The rows below the header row of a sheet ("Ad Soyad" in the first column), as strings.
function dataRows(sheet: WorkbookSheet | undefined): string[][] | null {
  if (!sheet) return null;
  const at = sheet.rows.findIndex((r) => fold(r[0] || "") === "ad soyad");
  return at < 0 ? [] : sheet.rows.slice(at + 1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
}

export function workbookImportRows(sheets: WorkbookSheet[], month: string): WorkbookImport {
  const by = (name: string) => sheets.find((s) => fold(s.name) === fold(name));
  const out: WorkbookImport = { attendance: null, payroll: null, hours: null, trips: null, counts: { attendance: 0, payroll: 0, hours: 0, trips: 0 }, found: [], issues: [] };
  if (!by(WB.leaves) && !by(WB.adds) && !by(WB.hours) && !by(WB.trips)) {
    out.issues.push("Bu fayl Joblink hesablama iş kitabı deyil: “Azad olmalar”, “Əlavə-Tutulma”, “Saatlar” və ya “Ezamiyyət” vərəqi tapılmadı.");
    return out;
  }

  const leaves = dataRows(by(WB.leaves));
  if (leaves) {
    out.found.push(WB.leaves);
    // Ad Soyad | Növ | Qısa kod | Başlama | Bitmə | İş günü | Təqvim günü | Qeyd
    const rows = leaves.filter((r) => String(r[0] || "").trim() && (String(r[1] || "").trim() || String(r[2] || "").trim()));
    out.counts.attendance = rows.length;
    out.attendance = [["Ad Soyad", "Başlama tarixi", "Bitmə tarixi", "Səbəb", "Qeyd"], ...rows.map((r) => [r[0], r[3] || "", r[4] || "", r[1] || r[2] || "", r[7] || ""])];
  }

  const adds = dataRows(by(WB.adds));
  if (adds) {
    out.found.push(WB.adds);
    // Ad Soyad | Növ | Ad / səbəb | Məbləğ | Tutulma növü | Qeyd
    type Per = { bonus: number; allowance: number; deductions: { label: string; amount: number; kind: string }[]; note: string };
    const per = new Map<string, Per>();
    for (const r of adds) {
      const name = String(r[0] || "").trim();
      const kind = fold(r[1] || "");
      if (!name || !kind) continue;
      const entry = per.get(name) || { bonus: 0, allowance: 0, deductions: [], note: "" };
      const amount = num(r[3]);
      if (kind === "mukafat") entry.bonus += amount;
      else if (kind === "elave") entry.allowance += amount;
      else if (kind === "tutulma") entry.deductions.push({ label: String(r[2] || "").trim() || "Tutulma", amount, kind: String(r[4] || "Ümumi") });
      else if (kind === "avans") continue; // the advance is kept in the payments of the platform, not here
      else {
        out.issues.push(`${WB.adds}: “${r[1]}” növü tanınmadı (Mükafat, Əlavə, Tutulma və ya Avans).`);
        continue;
      }
      per.set(name, entry);
    }
    const rows: string[][] = [];
    for (const [name, e] of per) {
      const deds = e.deductions.length ? e.deductions : [{ label: "", amount: 0, kind: "" }];
      deds.forEach((d, i) => rows.push([name, i === 0 ? String(e.bonus) : "", i === 0 ? String(e.allowance) : "", d.label, d.amount ? String(d.amount) : "", d.kind, ""]));
    }
    out.counts.payroll = per.size;
    out.payroll = [["Ad Soyad", "Mükafat", "Əlavə", "Tutulma adı", "Tutulma məbləği", "Tutulma növü", "Qeyd"], ...rows];
  }

  const hours = dataRows(by(WB.hours));
  if (hours) {
    out.found.push(WB.hours);
    // Ad Soyad | Artıq iş saatı | İstirahət / bayram günü saatı | Gecə saatı
    const rows = hours.filter((r) => String(r[0] || "").trim() && (num(r[1]) > 0 || num(r[2]) > 0 || num(r[3]) > 0));
    out.counts.hours = rows.length;
    out.hours = [["Ad Soyad", "Ay", "Artıq iş saatı", "İstirahət günü saatı", "Gecə saatı"], ...rows.map((r) => [r[0], month, String(num(r[1])), String(num(r[2])), String(num(r[3]))])];
  }

  const trips = dataRows(by(WB.trips));
  if (trips) {
    out.found.push(WB.trips);
    // Ad Soyad | Təyinat | Yerin adı | Başlama | Bitmə | Məqsəd | Gün | Norma | Valyuta | Məzənnə | Gündəlik | Cəmi | Avans | Digər | Qalıq
    const rows = trips.filter((r) => String(r[0] || "").trim() && String(r[1] || "").trim());
    out.counts.trips = rows.length;
    out.trips = [["İşçi", "Təyinat", "Başlama", "Bitmə", "Məqsəd", "Gündəlik", "Avans", "Xarici"], ...rows.map((r) => {
      const place = String(r[1]).trim();
      const destination = place === OTHER_DOMESTIC ? String(r[2] || "").trim() : place;
      return [r[0], destination, r[3] || "", r[4] || "", r[5] || "", "", num(r[12]) ? String(num(r[12])) : "", FOREIGN.has(place) ? "Bəli" : "Xeyr"];
    })];
  }
  return out;
}
