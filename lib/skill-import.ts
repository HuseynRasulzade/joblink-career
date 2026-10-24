// Bulk skill import: one skill per line, "Ad (az);Name (en);Kateqoriya;Category;sinonim1|sinonim2".
export type SkillImportRow = { line: number; label: string; labelEn: string; category: string; categoryEn: string; aliases: string[] };
export type SkillImportIssue = { line: number; label: string; reason: string };

const clean = (value: string, max: number) => value.replace(/\s+/g, " ").trim().slice(0, max);
export function parseSkillCsv(input: string, limit = 300): { rows: SkillImportRow[]; issues: SkillImportIssue[] } {
  const rows: SkillImportRow[] = [];
  const issues: SkillImportIssue[] = [];
  const seen = new Set<string>();
  input.replace(/^\uFEFF/, "").split(/\r?\n/).forEach((raw, index) => {
    if (!raw.trim() || rows.length >= limit) return;
    const cells = raw.split(";");
    if (index === 0 && /^(ad|az|label|skill|bacar)/i.test(cells[0].trim()) && /^(name|en|label)/i.test((cells[1] || "").trim())) return;
    const [label, labelEn, category, categoryEn, aliasText = ""] = cells.map((c, i) => clean(c, i === 4 ? 500 : 70));
    const line = index + 1;
    if (!label || !labelEn || !category || !categoryEn) return void issues.push({ line, label: label || "—", reason: "Ad və kateqoriya hər iki dildə yazılmalıdır" });
    if (label.split(" ").length > 8 || labelEn.split(" ").length > 8) return void issues.push({ line, label, reason: "Bacarıq qısa olmalıdır (vəzifə cümləsi yox)" });
    const key = label.toLocaleLowerCase("az");
    if (seen.has(key)) return void issues.push({ line, label, reason: "Faylda təkrar sətir" });
    seen.add(key);
    rows.push({ line, label, labelEn, category, categoryEn, aliases: aliasText.split("|").map((a) => clean(a, 70)).filter(Boolean).slice(0, 20) });
  });
  return { rows, issues };
}
