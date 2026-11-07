// What goes from the calculation workbook back into the platform: each input sheet is turned into the rows of the
// import the platform already has (leave and absences → attendance, bonuses / additions / deductions → pay inputs,
// extra hours → month totals, trips → trips), and the entries that have no sheet import (new advances, a pay change)
// are listed for the page to send one by one. The platform's own import or endpoint then checks every row.
import { FOREIGN_NORMS } from "./trip-norms-data.ts";
import { DOMESTIC_NORMS } from "./trip-norms.ts";
import { OTHER_DOMESTIC } from "./trip-places.ts";
import { WB } from "./payroll-workbook.ts";
import { parseDateCell } from "./staff-import.ts";
import type { WorkbookSheet } from "./workbook-read.ts";

export type PayItemLine = { name: string; kind: "bonus" | "allowance"; label: string; amount: number };
export type AdvanceLine = { name: string; amount: number; date: string; note: string };
export type SalaryChange = { name: string; salary: number; from: string };

export type WorkbookImport = {
  attendance: string[][] | null;
  payroll: string[][] | null;
  items: PayItemLine[];
  hours: string[][] | null;
  trips: string[][] | null;
  advances: AdvanceLine[];
  salaryChanges: SalaryChange[];
  counts: { attendance: number; payroll: number; hours: number; trips: number; advances: number; salaryChanges: number };
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
const DOMESTIC = new Set<string>([...DOMESTIC_NORMS.map((d) => d.label), OTHER_DOMESTIC]);

// The rows below the header row of a sheet ("Ad Soyad" in the first column), as strings.
function dataRows(sheet: WorkbookSheet | undefined): string[][] | null {
  if (!sheet) return null;
  const at = sheet.rows.findIndex((r) => fold(r[0] || "") === "ad soyad");
  return at < 0 ? [] : sheet.rows.slice(at + 1).filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
}

export function workbookImportRows(sheets: WorkbookSheet[], month: string): WorkbookImport {
  const by = (name: string) => sheets.find((s) => fold(s.name) === fold(name));
  const out: WorkbookImport = { attendance: null, payroll: null, items: [], hours: null, trips: null, advances: [], salaryChanges: [], counts: { attendance: 0, payroll: 0, hours: 0, trips: 0, advances: 0, salaryChanges: 0 }, found: [], issues: [] };
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
    // Ad Soyad | Növ | Ad / səbəb | Məbləğ | Tutulma növü | Qeyd | Ödəniş tarixi (avans)
    type Per = { bonus: number; allowance: number; deductions: { label: string; amount: number; kind: string }[] };
    const per = new Map<string, Per>();
    for (const r of adds) {
      const name = String(r[0] || "").trim();
      const kind = fold(r[1] || "");
      if (!name || !kind) continue;
      const amount = num(r[3]);
      if (kind === "avans") {
        // Only an advance with a payment date is new; the lines the workbook came with (no date) are payments already recorded.
        const date = parseDateCell(r[6] || "");
        if (date && amount > 0) out.advances.push({ name, amount, date, note: String(r[5] || "").trim() });
        else if (r[6] && !date) out.issues.push(`${WB.adds}: ${name} üçün avansın tarixi oxunmadı: “${r[6]}”.`);
        continue;
      }
      const entry = per.get(name) || { bonus: 0, allowance: 0, deductions: [] };
      if (kind === "mukafat") {
        entry.bonus += amount;
        if (amount > 0) out.items.push({ name, kind: "bonus", label: String(r[2] || "").trim() || "Mükafat", amount });
      } else if (kind === "elave") {
        entry.allowance += amount;
        if (amount > 0) out.items.push({ name, kind: "allowance", label: String(r[2] || "").trim() || "Əlavə", amount });
      } else if (kind === "tutulma") entry.deductions.push({ label: String(r[2] || "").trim() || "Tutulma", amount, kind: String(r[4] || "Ümumi") });
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
    out.counts.advances = out.advances.length;
    out.payroll = per.size ? [["Ad Soyad", "Mükafat", "Əlavə", "Tutulma adı", "Tutulma məbləği", "Tutulma növü", "Qeyd"], ...rows] : null;
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
    // Ad Soyad | Təyinat | Yerin adı | Başlama | Bitmə | Məqsəd | Gün | Norma | Valyuta | Məzənnə | Gündəlik | Cəmi | Avans | Digər | Qalıq | Gündəlik (əl ilə)
    const rows: string[][] = [];
    for (const r of trips.filter((x) => String(x[0] || "").trim() && String(x[1] || "").trim())) {
      const place = String(r[1]).trim();
      const named = String(r[2] || "").trim();
      // The place is one of the law's places; anything else is refused instead of being taken for a place inside the country.
      if (!FOREIGN.has(place) && !DOMESTIC.has(place)) {
        out.issues.push(`${WB.trips}: ${r[0]}: “${place}” qanunun gündəlik cədvəlində yoxdur. Təyinatı siyahıdan seçin (ölkə daxilində başqa yer üçün “${OTHER_DOMESTIC}” seçib yerin adını yazın).`);
        continue;
      }
      if (place === OTHER_DOMESTIC && named.length < 2) {
        out.issues.push(`${WB.trips}: ${r[0]}: “${OTHER_DOMESTIC}” seçilib, amma yerin adı yazılmayıb.`);
        continue;
      }
      // The per-diem typed beside the trip is kept; left empty, the platform works it out from the law's norm and the bank's rate of the first day.
      const manual = num(r[15]);
      rows.push([r[0], place === OTHER_DOMESTIC ? named : place, r[3] || "", r[4] || "", r[5] || "", manual > 0 ? String(manual) : "", num(r[12]) ? String(num(r[12])) : "", FOREIGN.has(place) ? "Bəli" : "Xeyr"]);
    }
    out.counts.trips = rows.length;
    out.trips = rows.length ? [["İşçi", "Təyinat", "Başlama", "Bitmə", "Məqsəd", "Gündəlik", "Avans", "Xarici"], ...rows] : null;
  }

  // A pay change inside the month (İşçilər: new pay and the day it starts) becomes an order of the platform's usual kind.
  const staff = dataRows(by(WB.staff));
  if (staff) {
    // Ad Soyad | FİN | Vəzifə | Şöbə | Maaş | Sektor | Azaldılma | Saat | Orta | Gecə | Başlama | Çıxma | Kompensasiya | Yeni maaş | Dəyişmə tarixi | …
    for (const r of staff) {
      const name = String(r[0] || "").trim();
      const salary = num(r[13]);
      const from = parseDateCell(r[14] || "");
      if (!name || !(salary > 0)) continue;
      if (!from) {
        out.issues.push(`${WB.staff}: ${name}: yeni maaş yazılıb, amma dəyişmə tarixi yoxdur.`);
        continue;
      }
      out.salaryChanges.push({ name, salary, from });
    }
    out.counts.salaryChanges = out.salaryChanges.length;
    if (out.salaryChanges.length) out.found.push(WB.staff);
  }
  return out;
}
