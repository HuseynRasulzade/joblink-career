// Reads every worksheet of an Excel (.xlsx) file as rows of text, in the browser or on the server: shared strings,
// inline strings, formula results (the value the program saved) and numbers (dates stay as serial numbers; the importers
// read both). Used by the calculation workbook import, which needs several sheets of one file.
import { strFromU8, unzipSync } from "fflate";

const decode = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
const textOf = (xml: string) => decode(Array.from(xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)).map((m) => m[1]).join(""));
const columnIndex = (ref: string) => ref.replace(/\d+/g, "").split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;

export type WorkbookSheet = { name: string; rows: string[][] };

export function readWorkbookSheets(bytes: Uint8Array): WorkbookSheet[] {
  const files = unzipSync(bytes);
  const read = (name: string) => (files[name] ? strFromU8(files[name]) : "");
  const shared = Array.from(read("xl/sharedStrings.xml").matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)).map((m) => textOf(m[1]));
  const workbook = read("xl/workbook.xml");
  const rels = new Map(Array.from(read("xl/_rels/workbook.xml.rels").matchAll(/<Relationship\b([^>]*)>/g)).map((m) => {
    const id = /Id="([^"]+)"/.exec(m[1])?.[1] || "";
    const target = /Target="([^"]+)"/.exec(m[1])?.[1] || "";
    return [id, target.replace(/^\//, "").replace(/^xl\//, "")] as const;
  }));
  const sheets: WorkbookSheet[] = [];
  for (const m of workbook.matchAll(/<sheet\b([^>]*)\/?>/g)) {
    const name = decode(/\bname="([^"]*)"/.exec(m[1])?.[1] || "");
    const rid = /r:id="([^"]+)"/.exec(m[1])?.[1] || "";
    const target = rels.get(rid);
    const xml = target ? read(`xl/${target}`) : "";
    if (!name || !xml) continue;
    const rows: string[][] = [];
    for (const rowMatch of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const rowNumber = Number(/\br="(\d+)"/.exec(rowMatch[1])?.[1] || rows.length + 1);
      const cells: string[] = [];
      for (const c of (rowMatch[2] || "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = c[1];
        const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1] || "A1";
        const type = /\bt="([^"]*)"/.exec(attrs)?.[1] || "";
        const inner = c[2] || "";
        const raw = decode(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? "");
        let value = raw;
        if (type === "s") value = shared[Number(raw)] ?? "";
        else if (type === "inlineStr") value = textOf(inner);
        else if (type === "b") value = raw === "1" ? "Bəli" : "Xeyr";
        else if (type === "e") value = "";
        cells[columnIndex(ref)] = value;
      }
      while (rows.length < rowNumber - 1) rows.push([]);
      rows[rowNumber - 1] = Array.from(cells, (v) => v ?? "");
    }
    sheets.push({ name, rows });
  }
  return sheets;
}
