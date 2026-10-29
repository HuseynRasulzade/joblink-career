// Company property handed to employees: the act printed when it is issued and when it comes back.
export const ASSET_CATEGORIES = ["Kompüter", "Telefon", "Monitor və periferiya", "Mebel", "Nəqliyyat", "Alət və avadanlıq", "Açar və kart", "Forma və geyim", "Digər"];
export const ASSET_STATUS: Record<string, string> = { stock: "Anbarda", assigned: "İşçidədir", repair: "Təmirdə", "written-off": "Silinib" };

export type ActInput = {
  kind: "issue" | "return";
  number: string;
  date: string;
  company: string;
  employee: string;
  position: string;
  asset: { name: string; serial: string; inventoryNo: string; valueCents: number };
  condition: string;
  note: string;
};

export function assetActHtml(a: ActInput): string {
  const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const dmy = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "__________");
  const value = a.asset.valueCents > 0 ? `${(a.asset.valueCents / 100).toLocaleString("az-AZ", { minimumFractionDigits: 2 })} AZN` : "__________";
  const title = a.kind === "issue" ? "Əmlakın təhvil-təslim aktı (verilmə)" : "Əmlakın təhvil-təslim aktı (qaytarılma)";
  const text =
    a.kind === "issue"
      ? `${dmy(a.date)} tarixində ${esc(a.company || "__________")} təşkilatı adından aşağıda göstərilən əmlak ${esc(a.position || "")} ${esc(a.employee)} işçiyə istifadə üçün verildi. İşçi əmlakı qorumağa, təyinatı üzrə istifadə etməyə və tələb olunduqda və ya əmək müqaviləsinə xitam veriləndə qaytarmağa borcludur.`
      : `${dmy(a.date)} tarixində ${esc(a.employee)} aşağıda göstərilən əmlakı ${esc(a.company || "__________")} təşkilatına qaytardı. Əmlak qəbul edildi.`;
  return `<!doctype html><html lang="az"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:"Times New Roman",serif;font-size:13pt;line-height:1.5;max-width:720px;margin:40px auto;padding:0 24px}h1{font-size:15pt;text-align:center;text-transform:uppercase}table{width:100%;border-collapse:collapse;margin:14px 0}td,th{border:1px solid #000;padding:6px 8px;text-align:left}.sign{display:flex;justify-content:space-between;gap:24px;margin-top:48px}.line{border-top:1px solid #000;margin-top:34px;padding-top:2px;font-size:10pt}</style></head>
<body><h1>${esc(title)} № ${esc(a.number || "____")}</h1><p>${text}</p>
<table><tr><th>Əmlak</th><th>Seriya №</th><th>İnventar №</th><th>Dəyər</th><th>Vəziyyət</th></tr><tr><td>${esc(a.asset.name)}</td><td>${esc(a.asset.serial || "—")}</td><td>${esc(a.asset.inventoryNo || "—")}</td><td>${value}</td><td>${esc(a.condition || "—")}</td></tr></table>
${a.note ? `<p>Qeyd: ${esc(a.note)}</p>` : ""}
<div class="sign"><div><b>Təhvil verən</b><div class="line">imza</div></div><div><b>Təhvil alan</b><br>${esc(a.employee)}<div class="line">imza</div></div></div></body></html>`;
}

export type AssetImportRow = { line: number; name: string; category: string; serial: string; inventoryNo: string; value: number; note: string };
const fold = (v: string) => v.toLocaleLowerCase("az").replace(/ə/g, "e").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/[^a-z0-9]+/g, " ").trim();
export function parseAssetRows(rows: string[][], limit = 500): { rows: AssetImportRow[]; issues: { line: number; reason: string }[] } {
  const headerIndex = rows.findIndex((r) => r.some((c) => /^(ad|emlak|emlakin adi|name|aktiv)$/.test(fold(c))));
  if (headerIndex < 0) return { rows: [], issues: [{ line: 1, reason: "“Ad” sütunu tapılmadı. Birinci sətirdə sütun adları olmalıdır." }] };
  const head = rows[headerIndex].map(fold);
  const find = (re: RegExp) => head.findIndex((h) => re.test(h));
  const col = { name: find(/^(ad|emlak|emlakin adi|name|aktiv)$/), category: find(/kateqoriya|qrup|category/), serial: find(/seriya|serial/), inv: find(/inventar/), value: find(/deyer|qiymet|value/), note: find(/qeyd|izah|note/) };
  const out: AssetImportRow[] = [];
  const issues: { line: number; reason: string }[] = [];
  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.every((c) => !String(c ?? "").trim())) continue;
    const line = i + 1;
    if (out.length >= limit) {
      issues.push({ line, reason: `Bir dəfəyə ən çox ${limit} əmlak yüklənir.` });
      break;
    }
    const at = (c: number) => (c >= 0 ? String(row[c] ?? "").trim() : "");
    const name = at(col.name).slice(0, 120);
    if (name.length < 2) {
      issues.push({ line, reason: "Əmlakın adı yoxdur." });
      continue;
    }
    const valueText = at(col.value).replace(/\s/g, "").replace(",", ".");
    const value = valueText ? Number(valueText) : 0;
    if (!Number.isFinite(value) || value < 0) {
      issues.push({ line, reason: `${name}: dəyər oxunmadı (“${at(col.value)}”).` });
      continue;
    }
    out.push({ line, name, category: at(col.category).slice(0, 40), serial: at(col.serial).slice(0, 60), inventoryNo: at(col.inv).slice(0, 40), value, note: at(col.note).slice(0, 300) });
  }
  return { rows: out, issues };
}
