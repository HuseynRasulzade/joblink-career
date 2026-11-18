// Reads a production calendar out of an uploaded file. Text-like files (txt, csv, tsv, md, html, ics, json, docx, xlsx) are read here
// without AI: every line is searched for dates (2027-03-20, 20.03.2027, "20-23 mart 2027", "20 March") and the words next to them
// decide the kind of day. Images and PDF files are read by the AI (see the handler); its answer goes through `normalizeDays` too.
import { strFromU8, unzipSync } from "fflate";
import { readWorkbookSheets } from "./workbook-read.ts";

export type CalendarDay = { day: string; kind: "holiday" | "off" | "work" | "short"; label: string };

const MONTHS: [RegExp, number][] = [
  [/^(yanvar|january|jan|январ)/i, 1],
  [/^(fevral|february|feb|феврал)/i, 2],
  [/^(mart|march|mar|март)/i, 3],
  [/^(aprel|april|apr|апрел)/i, 4],
  [/^(may|май|мая)/i, 5],
  [/^(iyun|june|jun|июн)/i, 6],
  [/^(iyul|july|jul|июл)/i, 7],
  [/^(avqust|august|aug|август)/i, 8],
  [/^(sentyabr|september|sep|sept|сентябр)/i, 9],
  [/^(oktyabr|october|oct|октябр)/i, 10],
  [/^(noyabr|november|nov|ноябр)/i, 11],
  [/^(dekabr|december|dec|декабр)/i, 12],
];
const monthOf = (word: string) => MONTHS.find(([re]) => re.test(word))?.[1] || 0;
const MONTH_WORD = "(?:yanvar|fevral|mart|aprel|may|iyun|iyul|avqust|sentyabr|oktyabr|noyabr|dekabr|january|february|march|april|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec|январ[ьяе]|феврал[ьяе]|март[ае]?|апрел[ьяе]|ма[йяе]|июн[ьяе]|июл[ьяе]|август[ае]?|сентябр[ьяе]|октябр[ьяе]|ноябр[ьяе]|декабр[ьяе])[a-zəıöüçşğа-я]*";

const pad = (n: number) => String(n).padStart(2, "0");
function validDay(y: number, m: number, d: number) {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : "";
}
const fullYear = (y: number) => (y < 100 ? 2000 + y : y);
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
function range(a: string, b: string) {
  if (!a || !b || b < a) return a ? [a] : [];
  const out: string[] = [];
  for (let day = a; day <= b && out.length < 31; day = addDays(day, 1)) out.push(day);
  return out;
}

// The kind of day a line describes (words in Azerbaijani, English and Russian).
export function kindOfText(text: string): CalendarDay["kind"] {
  const t = text.toLowerCase();
  if (/qısaldılmış|qisaldilmis|qısa iş|short(ened)? (working )?day|сокращ/.test(t)) return "short";
  if (/(?<!qeyri-)(?<!qeyri )iş günü|is gunu|working day|work day|workday|рабоч/.test(t) && !/non-working|qeyri-iş|qeyri iş|нерабоч/.test(t)) return "work";
  if (/bayram|holiday|праздник|novruz|zəfər|qurban|ramazan|müstəqillik|günü/.test(t) && !/qeyri-iş|istirahət|day off|выходн/.test(t)) return "holiday";
  if (/qeyri-iş|qeyri iş|istirahət|day off|non-working|dayoff|выходн|нерабоч|off\b/.test(t)) return "off";
  return "holiday";
}

// Dates found in one line; the year comes from the line itself or from `defaultYear`.
export function datesInLine(line: string, defaultYear: number): string[] {
  const found: string[] = [];
  let rest = line;
  const take = (re: RegExp, fn: (m: RegExpExecArray) => string[]) => {
    rest = rest.replace(re, (...args) => {
      const m = args.slice(0, -2) as unknown as RegExpExecArray;
      const days = fn(m);
      found.push(...days);
      return " ";
    });
  };
  const num = (v: string) => Number(v);
  // 2027-03-20 .. 2027-03-23  /  20.03.2027 - 23.03.2027
  take(/(\d{4})-(\d{1,2})-(\d{1,2})\s*(?:\.\.|–|—|-|to|və|dən|until)\s*(\d{4})-(\d{1,2})-(\d{1,2})/gi, (m) => range(validDay(num(m[1]), num(m[2]), num(m[3])), validDay(num(m[4]), num(m[5]), num(m[6]))));
  take(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})\s*(?:–|—|-|to|və|dən|until)\s*(\d{1,2})[./](\d{1,2})[./](\d{2,4})/gi, (m) => range(validDay(fullYear(num(m[3])), num(m[2]), num(m[1])), validDay(fullYear(num(m[6])), num(m[5]), num(m[4]))));
  take(/(\d{4})-(\d{1,2})-(\d{1,2})/g, (m) => [validDay(num(m[1]), num(m[2]), num(m[3]))].filter(Boolean));
  take(/(\d{1,2})[./-](\d{1,2})[./-](\d{4}|\d{2})(?!\d)/g, (m) => [validDay(fullYear(num(m[3])), num(m[2]), num(m[1]))].filter(Boolean));
  // 20-23 mart 2027  /  20 mart – 23 mart 2027  /  20 mart 2027
  const word = new RegExp(`(\\d{1,2})(?:\\s*(?:-|–|—|\\.\\.)\\s*(\\d{1,2}))?\\s+(${MONTH_WORD})(?:\\s+(\\d{4}))?`, "gi");
  take(word, (m) => {
    const month = monthOf(m[3]);
    const year = m[4] ? num(m[4]) : defaultYear;
    const a = validDay(year, month, num(m[1]));
    return m[2] ? range(a, validDay(year, month, num(m[2]))) : [a].filter(Boolean);
  });
  return found.filter(Boolean);
}

// The year the file talks about: the most common 20xx in it.
export function guessYear(text: string, fallback: number) {
  const counts = new Map<number, number>();
  for (const m of text.matchAll(/\b(20\d{2})\b/g)) counts.set(Number(m[1]), (counts.get(Number(m[1])) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || fallback;
}

export function parseCalendarText(text: string, defaultYear = new Date().getFullYear()): CalendarDay[] {
  const year = guessYear(text, defaultYear);
  const out = new Map<string, CalendarDay>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!line) continue;
    const days = datesInLine(line, year);
    if (!days.length) continue;
    const kind = kindOfText(line);
    const label = line
      .replace(/\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/g, " ")
      .replace(new RegExp(`\\d{1,2}(?:\\s*[-–—]\\s*\\d{1,2})?\\s+${MONTH_WORD}(?:\\s+\\d{4})?`, "gi"), " ")
      .replace(/[|;,\t]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, "")
      .slice(0, 80);
    for (const day of days) out.set(day, { day, kind, label });
  }
  return [...out.values()].sort((a, b) => a.day.localeCompare(b.day));
}

// The days an AI answer or any other list claims: only well-formed dates and known kinds survive.
export function normalizeDays(list: unknown): CalendarDay[] {
  const out = new Map<string, CalendarDay>();
  if (!Array.isArray(list)) return [];
  for (const item of list) {
    const d = item as { day?: unknown; date?: unknown; kind?: unknown; type?: unknown; label?: unknown; name?: unknown };
    const day = String(d?.day ?? d?.date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(`${day}T00:00:00Z`))) continue;
    const year = Number(day.slice(0, 4));
    if (year < 2000 || year > 2100) continue;
    const raw = String(d?.kind ?? d?.type ?? "").toLowerCase();
    const kind = (["holiday", "off", "work", "short"].includes(raw) ? raw : kindOfText(raw)) as CalendarDay["kind"];
    out.set(day, { day, kind, label: String(d?.label ?? d?.name ?? "").slice(0, 80) });
  }
  return [...out.values()].sort((a, b) => a.day.localeCompare(b.day));
}

const decode = (text: string) =>
  text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");

export function textFromDocx(bytes: Uint8Array) {
  const xml = strFromU8(unzipSync(bytes)["word/document.xml"] || new Uint8Array());
  return decode(xml.replace(/<\/w:p>/g, "\n").replace(/<w:tab\/>/g, " ").replace(/<[^>]+>/g, ""));
}
// An Excel date stored as a serial number (days since 1899-12-30) becomes ISO text so that the line parser finds it.
const serialToIso = (v: string) => {
  const n = Number(v);
  return /^\d{5}(\.\d+)?$/.test(v) && n > 36000 && n < 80000 ? new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86_400_000).toISOString().slice(0, 10) : v;
};
export function textFromXlsx(bytes: Uint8Array) {
  return readWorkbookSheets(bytes).flatMap((s) => s.rows.map((r) => r.map(serialToIso).join(" | "))).join("\n");
}

// Text of the files that need no AI; null for images and PDF files.
export function textFromFile(name: string, bytes: Uint8Array): string | null {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "docx") return textFromDocx(bytes);
  if (ext === "xlsx") return textFromXlsx(bytes);
  if (["txt", "csv", "tsv", "md", "html", "htm", "ics", "json", "rtf", "xml"].includes(ext)) {
    const text = new TextDecoder().decode(bytes);
    // ICS: DTSTART/DTEND lines hold the days, SUMMARY the name.
    if (ext === "ics") {
      return text
        .split(/BEGIN:VEVENT/i)
        .slice(1)
        .map((ev) => {
          const start = /DTSTART[^:]*:(\d{4})(\d{2})(\d{2})/i.exec(ev);
          const end = /DTEND[^:]*:(\d{4})(\d{2})(\d{2})/i.exec(ev);
          const summary = /SUMMARY[^:]*:(.+)/i.exec(ev)?.[1]?.trim() || "";
          if (!start) return "";
          const a = `${start[1]}-${start[2]}-${start[3]}`;
          // An all-day ICS event ends on the day after its last day.
          const b = end ? addDays(`${end[1]}-${end[2]}-${end[3]}`, -1) : a;
          return `${a}${b > a ? ` - ${b}` : ""} ${summary}`;
        })
        .join("\n");
    }
    return text;
  }
  return null;
}
