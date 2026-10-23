import { unzipSync, strFromU8 } from "fflate";
import { parseQuestionRows, parseQuestionText, type ImportResult } from "./question-import";
import { layoutPdfText, rtfToText } from "./cv-text";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const QUESTION_FILE_ACCEPT = ".csv,.txt,.docx,.xlsx,.pdf,.rtf";

// Cells of the first worksheet, shared strings resolved.
function xlsxRows(bytes: Uint8Array): string[][] {
  const files = unzipSync(bytes);
  const read = (name: string) => (files[name] ? strFromU8(files[name]) : "");
  const parse = (xml: string) => new DOMParser().parseFromString(xml, "application/xml");
  const shared = Array.from(parse(read("xl/sharedStrings.xml")).getElementsByTagName("si")).map((si) =>
    Array.from(si.getElementsByTagName("t")).map((t) => t.textContent || "").join(""),
  );
  const sheetName = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if (!sheetName) return [];
  const column = (ref: string) => ref.replace(/\d+/g, "").split("").reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return Array.from(parse(read(sheetName)).getElementsByTagName("row")).map((row) => {
    const cells: string[] = [];
    for (const c of Array.from(row.getElementsByTagName("c"))) {
      const type = c.getAttribute("t");
      const raw = c.getElementsByTagName("v")[0]?.textContent || "";
      cells[column(c.getAttribute("r") || "A1")] =
        type === "s" ? shared[Number(raw)] || "" : type === "inlineStr" ? Array.from(c.getElementsByTagName("t")).map((t) => t.textContent || "").join("") : raw;
    }
    return Array.from(cells, (v) => v ?? "");
  });
}

function csvRows(text: string): string[][] {
  const delimiter = text.split("\n", 1)[0].includes(";") ? ";" : ",";
  return text.split(/\r?\n/).map((line) => line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, "")));
}

// Questions from a Word, Excel, PDF, RTF, CSV or text file, read in the browser.
export async function readQuestionFile(file: File): Promise<ImportResult> {
  if (file.size > MAX_FILE_BYTES) throw new Error("Fayl 5 MB-dan kiçik olmalıdır.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const bytes = new Uint8Array(await file.arrayBuffer());
  let result: ImportResult;
  if (ext === "xlsx") result = parseQuestionRows(xlsxRows(bytes));
  else if (ext === "csv") {
    const text = new TextDecoder().decode(bytes);
    result = parseQuestionRows(csvRows(text));
  } else {
    let text = "";
    if (ext === "docx") {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ arrayBuffer: bytes.buffer as ArrayBuffer })).value;
    } else if (ext === "pdf") {
      const { extractTextItems, getDocumentProxy } = await import("unpdf");
      const pdf = await getDocumentProxy(bytes);
      try {
        const extracted = await extractTextItems(pdf);
        text = extracted.items.map((page) => layoutPdfText([page])).join("\n");
      } finally {
        await pdf.loadingTask.destroy();
      }
    } else if (ext === "rtf") text = rtfToText(new TextDecoder().decode(bytes));
    else if (ext === "txt") text = new TextDecoder().decode(bytes);
    else throw new Error("DOCX, XLSX, PDF, RTF, CSV və ya TXT faylı seçin.");
    result = parseQuestionText(text);
    // A text file may also use the semicolon layout.
    if (!result.questions.length && !result.skipped.length) result = parseQuestionRows(csvRows(text));
  }
  if (!result.questions.length && !result.skipped.length) result.skipped.push({ label: "Fayl", reason: "sual tapılmadı. Nümunə: “1. Sual?  A) …  B) …  Cavab: B”" });
  return result;
}
