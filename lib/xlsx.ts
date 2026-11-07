import { strToU8, zipSync } from "fflate";

// Looks of a cell in the calculation workbooks (input cells are yellow, results carry borders and number formats).
export type XlsxStyle = "text" | "title" | "note" | "input" | "inputMoney" | "inputInt" | "inputDate" | "money" | "int" | "pct" | "total" | "label" | "weekend" | "holiday" | "head" | "cell" | "dayhead";
// A formula (with the value it gives, shown until the program recalculates) or a value with a look.
export type XlsxRich = { v?: string | number | boolean | null; f?: string; s?: XlsxStyle };
export type XlsxCell = string | number | boolean | null | undefined | XlsxRich;

function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

// A plain YYYY-MM-DD value becomes a real Excel date, so it sorts and filters as one.
export function excelDateSerial(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value ? null : Math.round(time / 86400000) + 25569;
}

const STYLE_INDEX: Record<XlsxStyle, number> = { text: 0, head: 1, title: 3, note: 4, input: 5, inputMoney: 6, money: 7, int: 8, pct: 9, total: 10, label: 11, weekend: 12, holiday: 13, cell: 14, inputDate: 15, inputInt: 16, dayhead: 17 };

function cellXml(value: XlsxCell, row: number, column: number, style = 0): string {
  const reference = `${columnName(column)}${row}`;
  if (value && typeof value === "object") {
    const s = value.s ? STYLE_INDEX[value.s] : style;
    if (value.f) {
      const cached = value.v;
      if (typeof cached === "number" && Number.isFinite(cached)) return `<c r="${reference}" s="${s}"><f>${escapeXml(value.f)}</f><v>${cached}</v></c>`;
      if (typeof cached === "boolean") return `<c r="${reference}" s="${s}" t="b"><f>${escapeXml(value.f)}</f><v>${cached ? 1 : 0}</v></c>`;
      return `<c r="${reference}" s="${s}" t="str"><f>${escapeXml(value.f)}</f><v>${escapeXml(cached ?? "")}</v></c>`;
    }
    return cellXml(value.v, row, column, s);
  }
  const serial = style === 0 && typeof value === "string" ? excelDateSerial(value) : null;
  if (serial !== null) return `<c r="${reference}" s="2"><v>${serial}</v></c>`;
  if (typeof value === "number" && Number.isFinite(value))
    return `<c r="${reference}" s="${style}"><v>${value}</v></c>`;
  if (typeof value === "boolean")
    return `<c r="${reference}" s="${style}" t="b"><v>${value ? 1 : 0}</v></c>`;
  if (style !== 0 && (value === null || value === undefined || value === "")) return `<c r="${reference}" s="${style}"/>`;
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

export type XlsxSheet = {
  name: string;
  headers: string[];
  rows: XlsxCell[][];
  // Calculation workbooks: no header row (the rows are laid out as they are), widths, frozen panes, drop-down lists and merged cells.
  free?: boolean;
  widths?: number[];
  freeze?: { rows: number; cols: number };
  lists?: { ref: string; items?: string[]; source?: string }[];
  merges?: string[];
  rowHeights?: Record<number, number>; // 1-based row → height in points
};

function sheetXml(sheet: XlsxSheet) {
  const { headers, rows } = sheet;
  const free = !!sheet.free;
  const allRows = free ? rows : [headers, ...rows];
  const worksheetRows = allRows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => cellXml(value, rowIndex + 1, columnIndex, !free && rowIndex === 0 ? 1 : 0)).join("");
    const height = sheet.rowHeights?.[rowIndex + 1];
    return `<row r="${rowIndex + 1}"${height ? ` ht="${height}" customHeight="1"` : ""}>${cells}</row>`;
  }).join("");
  const width = Math.max(headers.length, ...allRows.map((r) => r.length), 1);
  const lastColumn = columnName(Math.max(0, width - 1));
  const text = (v: XlsxCell) => String(v && typeof v === "object" ? v.v ?? "" : v ?? "");
  const columnWidths = Array.from({ length: width }, (_, index) => {
    if (sheet.widths?.[index]) return `<col min="${index + 1}" max="${index + 1}" width="${sheet.widths[index]}" customWidth="1"/>`;
    const longest = Math.min(55, Math.max((headers[index] || "").length + 3, ...rows.slice(0, 500).map((row) => text(row[index]).length + 2)));
    return `<col min="${index + 1}" max="${index + 1}" width="${Math.max(12, longest)}" customWidth="1"/>`;
  }).join("");
  const freeze = free ? sheet.freeze : { rows: 1, cols: 0 };
  const pane = freeze && (freeze.rows || freeze.cols)
    ? `<pane${freeze.cols ? ` xSplit="${freeze.cols}"` : ""}${freeze.rows ? ` ySplit="${freeze.rows}"` : ""} topLeftCell="${columnName(freeze.cols)}${freeze.rows + 1}" activePane="${freeze.rows && freeze.cols ? "bottomRight" : freeze.rows ? "bottomLeft" : "topRight"}" state="frozen"/>`
    : "";
  const merges = sheet.merges?.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
  const lists = sheet.lists?.length
    ? `<dataValidations count="${sheet.lists.length}">${sheet.lists.map((l) => `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Yanlış dəyər" error="Siyahıdan seçin." sqref="${l.ref}"><formula1>${l.source ? escapeXml(l.source) : `&quot;${escapeXml((l.items || []).join(","))}&quot;`}</formula1></dataValidation>`).join("")}</dataValidations>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastColumn}${Math.max(1, allRows.length)}"/>
  <sheetViews><sheetView workbookViewId="0"${free ? ' showGridLines="0"' : ""}>${pane}</sheetView></sheetViews>
  <cols>${columnWidths}</cols>
  <sheetData>${worksheetRows}</sheetData>
  ${free ? "" : `<autoFilter ref="A1:${lastColumn}${allRows.length}"/>`}${merges}${lists}
</worksheet>`;
}

// One workbook with several sheets. The file readers take the first sheet, so the sheet with the data comes first.
export function createXlsxBook(sheets: XlsxSheet[]) {
  const list = sheets.length ? sheets : [{ name: "Sheet1", headers: [], rows: [] }];
  const names = list.map((sheet, i) => sheet.name.replace(/[\\/*?:\[\]]/g, " ").slice(0, 31) || `Sheet${i + 1}`);
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
${list.map((_, i) => `  <Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("\n")}
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${names.map((name, i) => `<sheet name="${escapeXml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>
  <calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${list.map((_, i) => `  <Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("\n")}
  <Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    "xl/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="5"><numFmt numFmtId="164" formatCode="yyyy\-mm\-dd"/><numFmt numFmtId="168" formatCode="d"/><numFmt numFmtId="165" formatCode="#,##0.00"/><numFmt numFmtId="166" formatCode="0"/><numFmt numFmtId="167" formatCode="0.0%"/></numFmts>
  <fonts count="6"><font><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FF0F3D38"/><sz val="16"/><name val="Aptos"/></font><font><i/><color rgb="FF6B7A7D"/><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="11"/><name val="Aptos"/></font><font><b/><color rgb="FF0F3D38"/><sz val="10"/><name val="Aptos"/></font></fonts>
  <fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF187C6C"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF6D6"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE9EEEE"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDF2EC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF9D9D5"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFC9D6D4"/></left><right style="thin"><color rgb="FFC9D6D4"/></right><top style="thin"><color rgb="FFC9D6D4"/></top><bottom style="thin"><color rgb="FFC9D6D4"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="18">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
    <xf numFmtId="165" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="165" fontId="4" fillId="5" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="6" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
    <xf numFmtId="164" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="166" fontId="0" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFill="1" applyBorder="1"/>
    <xf numFmtId="168" fontId="5" fillId="4" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`),
    "docProps/core.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>JobMatch</dc:title><dc:creator>JobMatch</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created>
</cp:coreProperties>`),
    "docProps/app.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>JobMatch</Application></Properties>`),
  };
  list.forEach((sheet, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(sheet));
  });
  return zipSync(files, { level: 6 });
}

export function createXlsx(headers: string[], rows: XlsxCell[][], sheetName = "Skills") {
  return createXlsxBook([{ name: sheetName.replace(/[\\/*?:\[\]]/g, " ").slice(0, 31) || "Skills", headers, rows }]);
}
