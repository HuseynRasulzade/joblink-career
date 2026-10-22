// Shared text post-processing for CV imports, used by both the browser-side
// (lib/read-cv.ts) and the server-side (/api/joblink upload route) extraction
// paths. Kept dependency-free so it is safe in both environments.

// PDF/DOCX extraction frequently leaves stray control characters, repeated
// blank lines and non-breaking spaces that break the line-based heading
// matches in lib/cv-fields.ts and add noise to the AI prompt.
export function cleanCvText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex -- intentionally strips stray control bytes left by PDF/DOCX extractors
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
    // tab / non-breaking space / figure space / narrow-no-break space -> plain space
    .replace(/[\t\u00a0\u2007\u202f]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .split("\n")
    .map((line) => line.replace(/[ ]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type PositionedText = {
  str: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
};

// PDF text streams are often stored in drawing order rather than the order a
// person reads on the page. Rebuild each page from coordinates so a role's
// bullets stay below that role instead of drifting into the next position.
export function layoutPdfText(pages: PositionedText[][]): string {
  const renderBlock = (page: PositionedText[]) => {
    const lines: { y: number; size: number; items: PositionedText[] }[] = [];
    for (const item of page.filter((entry) => entry.str.trim())) {
      const tolerance = Math.max(2, item.fontSize * 0.35);
      let line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= tolerance);
      if (!line) {
        line = { y: item.y, size: item.fontSize, items: [] };
        lines.push(line);
      }
      line.items.push(item);
      line.size = Math.max(line.size, item.fontSize);
      line.y = (line.y * (line.items.length - 1) + item.y) / line.items.length;
    }
    lines.sort((left, right) => right.y - left.y);
    const output: string[] = [];
    let previous: { y: number; size: number } | null = null;
    for (const line of lines) {
      if (
        previous &&
        previous.y - line.y > Math.max(previous.size, line.size) * 1.65
      )
        output.push("");
      line.items.sort((left, right) => left.x - right.x);
      let value = "";
      let rightEdge = -Infinity;
      for (const item of line.items) {
        const gap = item.x - rightEdge;
        if (value && gap > Math.max(1.5, item.fontSize * 0.12)) value += " ";
        value += item.str;
        rightEdge = Math.max(rightEdge, item.x + item.width);
      }
      output.push(value.trim());
      previous = line;
    }
    return output.join("\n");
  };

  const rendered = pages.map((rawPage) => {
    const page = rawPage.filter((entry) => entry.str.trim());
    if (page.length < 10) return renderBlock(page);
    const minX = Math.min(...page.map((item) => item.x));
    const maxX = Math.max(...page.map((item) => item.x + Math.max(0, item.width)));
    const width = maxX - minX;
    if (!Number.isFinite(width) || width < 100) return renderBlock(page);

    // Find a real vertical gutter before sorting by Y. A two-column CV often
    // stores text in drawing order, so global Y sorting interleaves a sidebar
    // (certificates/skills) with the main employment column. A valid gutter
    // must be visibly wide, have meaningful content on both sides and be
    // crossed by almost no text items.
    let split:
      | { divider: number; left: PositionedText[]; right: PositionedText[]; spanning: PositionedText[]; score: number }
      | null = null;
    // Find vertical "rivers": horizontal bands crossed by (almost) no text.
    // A few header lines or one long line may cross a river; they are placed
    // by where they start instead of breaking the split.
    const tolerance = Math.max(
      1,
      Math.min(Math.max(4, Math.floor(page.length * 0.08)), Math.floor(page.length * 0.15)),
    );
    const rivers: { start: number; end: number }[] = [];
    let runStart: number | null = null;
    const from = Math.floor(minX + width * 0.12);
    const to = Math.ceil(minX + width * 0.78);
    for (let position = from; position <= to + 1; position++) {
      const crossed =
        position > to
          ? tolerance + 1
          : page.reduce(
              (count, item) =>
                item.x < position && item.x + item.width > position ? count + 1 : count,
              0,
            );
      if (crossed <= tolerance) {
        if (runStart === null) runStart = position;
      } else if (runStart !== null) {
        if (position - runStart >= Math.max(14, width * 0.03))
          rivers.push({ start: runStart, end: position });
        runStart = null;
      }
    }
    rivers.sort((x, y) => y.end - y.start - (x.end - x.start));
    for (const river of rivers) {
      // Anything starting inside the river belongs to the left column.
      const divider = river.end - 2;
      const right = page.filter((item) => item.x >= divider);
      const crossing = page.filter(
        (item) => item.x < divider && item.x + item.width > divider,
      );
      // Crossing text collides only when a right-column item shares its row.
      const spanning = crossing.filter((item) =>
        right.some(
          (other) =>
            Math.abs(other.y - item.y) <= Math.max(2, item.fontSize * 0.6) &&
            other.x < item.x + item.width,
        ),
      );
      const left = page.filter(
        (item) => item.x < divider && !spanning.includes(item),
      );
      if (left.length < 5 || right.length < 5) continue;
      // A genuine column holds real sentences or starts at a common x. A pile
      // of short right-aligned dates and locations hugging the margin is not
      // a column: each of them belongs to the line on its left.
      const starts = right.map((item) => Math.round(item.x / 3));
      const aligned =
        Math.max(
          ...[...new Set(starts)].map((value) => starts.filter((v) => v === value).length),
        ) / right.length;
      const sentences =
        right.filter((item) => item.str.trim().length >= 30).length / right.length;
      if (aligned < 0.4 && sentences < 0.25) continue;
      if (left.length < page.length * 0.12 || right.length < page.length * 0.22)
        continue;
      if (spanning.length > Math.max(4, page.length * 0.08)) continue;
      const leftTop = Math.max(...left.map((item) => item.y));
      const leftBottom = Math.min(...left.map((item) => item.y));
      const rightTop = Math.max(...right.map((item) => item.y));
      const rightBottom = Math.min(...right.map((item) => item.y));
      const overlap = Math.min(leftTop, rightTop) - Math.max(leftBottom, rightBottom);
      const shorterHeight = Math.min(leftTop - leftBottom, rightTop - rightBottom);
      if (shorterHeight > 0 && overlap / shorterHeight < 0.35) continue;
      // Left items that merely cross the river without colliding go left;
      // right items always start right of it.
      split = { divider, left, right, spanning, score: river.end - river.start };
      break;
    }

    if (!split) return renderBlock(page);
    const columnTop = Math.max(
      ...split.left.map((item) => item.y),
      ...split.right.map((item) => item.y),
    );
    const topSpanning = split.spanning.filter((item) => item.y >= columnTop);
    const remainingSpanning = split.spanning.filter((item) => item.y < columnTop);
    return [
      renderBlock(topSpanning),
      renderBlock(split.left),
      renderBlock(split.right),
      renderBlock(remainingSpanning),
    ]
      .filter(Boolean)
      .join("\n\n");
  });
  return cleanCvText(rendered.join("\n\n"));
}

// Windows-1252 code points in the 0x80-0x9F range (smart quotes, dashes,
// ellipsis, euro sign, ...) do not line up with their raw byte value in
// Unicode — RTF's \'hh escape gives that raw cp1252 byte, so it must go
// through this table rather than straight to String.fromCharCode.
const CP1252_HIGH: Record<number, number> = {
  0x80: 0x20ac, 0x82: 0x201a, 0x83: 0x0192, 0x84: 0x201e, 0x85: 0x2026,
  0x86: 0x2020, 0x87: 0x2021, 0x88: 0x02c6, 0x89: 0x2030, 0x8a: 0x0160,
  0x8b: 0x2039, 0x8c: 0x0152, 0x8e: 0x017d, 0x91: 0x2018, 0x92: 0x2019,
  0x93: 0x201c, 0x94: 0x201d, 0x95: 0x2022, 0x96: 0x2013, 0x97: 0x2014,
  0x98: 0x02dc, 0x99: 0x2122, 0x9a: 0x0161, 0x9b: 0x203a, 0x9c: 0x0153,
  0x9e: 0x017e, 0x9f: 0x0178,
};
const cp1252ToUnicode = (byte: number) => CP1252_HIGH[byte] ?? byte;

// RTF -> plain text. Earlier versions of this used a handful of regex
// substitutions, which reliably leaked font/colour table contents and left
// stray backslashes in output on real Word/textutil-generated files — RTF's
// group ({...}) nesting and \* "skippable destination" marker can't be
// handled correctly without tracking brace depth. This walks the document
// character by character instead, which is the only reliable way to know
// whether a run of text is inside a metadata group that should contribute
// no output.
const SKIP_DESTINATIONS = new Set([
  "fonttbl", "colortbl", "expandedcolortbl", "stylesheet", "info",
  "generator", "pict", "object", "listtable", "listoverridetable",
  "rsidtable", "themedata", "colorschememapping", "latentstyles", "panose",
  "datastore", "xmlnstbl", "header", "headerf", "headerl", "headerr",
  "footer", "footerf", "footerl", "footerr",
]);
export function rtfToText(rtf: string): string {
  const n = rtf.length;
  let i = 0;
  let out = "";
  const skipStack: boolean[] = [false];
  const ucStack: number[] = [1];
  const currentSkip = () => skipStack[skipStack.length - 1];
  while (i < n) {
    const ch = rtf[i];
    if (ch === "{") {
      skipStack.push(currentSkip());
      ucStack.push(ucStack[ucStack.length - 1]);
      i++;
      continue;
    }
    if (ch === "}") {
      if (skipStack.length > 1) skipStack.pop();
      if (ucStack.length > 1) ucStack.pop();
      i++;
      continue;
    }
    if (ch !== "\\") {
      if (!currentSkip()) out += ch;
      i++;
      continue;
    }
    // Backslash escape or control word.
    i++;
    if (i >= n) break;
    const c = rtf[i];
    if (c === "\\" || c === "{" || c === "}") {
      if (!currentSkip()) out += c;
      i++;
      continue;
    }
    if (c === "\r" || c === "\n") {
      // "\<end-of-line>" is shorthand for \par.
      if (!currentSkip()) out += "\n";
      i++;
      continue;
    }
    if (c === "'") {
      const hex = rtf.slice(i + 1, i + 3);
      i += 3;
      if (!currentSkip() && /^[0-9a-fA-F]{2}$/.test(hex))
        out += String.fromCharCode(cp1252ToUnicode(parseInt(hex, 16)));
      continue;
    }
    if (c === "*") {
      // Marks the enclosing group as a skippable destination.
      skipStack[skipStack.length - 1] = true;
      i++;
      continue;
    }
    if (c === "~") {
      if (!currentSkip()) out += " ";
      i++;
      continue;
    }
    if (c === "-" || c === "_") {
      if (!currentSkip() && c === "_") out += "-";
      i++;
      continue;
    }
    if (!/[a-zA-Z]/.test(c)) {
      // Unknown single-character escape; drop it.
      i++;
      continue;
    }
    let j = i;
    while (j < n && /[a-zA-Z]/.test(rtf[j])) j++;
    const word = rtf.slice(i, j);
    let k = j;
    let numStr = "";
    if (rtf[k] === "-") {
      numStr += "-";
      k++;
    }
    while (k < n && /[0-9]/.test(rtf[k])) {
      numStr += rtf[k];
      k++;
    }
    const num = numStr ? parseInt(numStr, 10) : undefined;
    let end = k;
    if (rtf[end] === " ") end++; // one trailing space is the word's delimiter, not text
    if (word === "par" || word === "line") {
      if (!currentSkip()) out += "\n";
    } else if (word === "tab") {
      if (!currentSkip()) out += "\t";
    } else if (word === "uc") {
      ucStack[ucStack.length - 1] = num ?? 1;
    } else if (word === "u" && num !== undefined) {
      if (!currentSkip())
        out += String.fromCharCode(((num % 65536) + 65536) % 65536);
      // \uN is followed by that many ANSI "fallback" characters (per the
      // enclosing \ucN, default 1) for readers that don't support Unicode;
      // skip them so they don't also appear as literal text.
      let toSkip = ucStack[ucStack.length - 1];
      while (toSkip > 0 && end < n && rtf[end] !== "\\") {
        end++;
        toSkip--;
      }
    } else if (SKIP_DESTINATIONS.has(word)) {
      skipStack[skipStack.length - 1] = true;
    }
    i = end;
  }
  return cleanCvText(out);
}
