import { parseQuestionCsv, type Question, type QuestionType } from "./assessments.ts";

export type ImportSkip = { label: string; reason: string };
export type ImportResult = { questions: Question[]; skipped: ImportSkip[] };

const MAX_QUESTIONS = 60;
const LETTERS = "ABCDEFGH";
const newId = () => crypto.randomUUID().slice(0, 8);
const squash = (value: string) => value.replace(/\s+/g, " ").trim();

const QUESTION_START = /^\s*(?:(?:sual|question|q)\s*)?(\d{1,3})\s*[.)\-:]\s*(\S.*)$/i;
const OPTION_START = /^\s*(?:\(([A-Ha-h])\)|([A-Ha-h])\s*[.)\-:])\s*(\S.*)$/;
const ANSWER_LINE = /^\s*(?:düzgün\s+cavab|doğru\s+cavab|düzgün|cavab|answers?|correct(?:\s+answers?)?|key|açar)\s*[:\-=]\s*(.+)$/i;
const POINTS_TAIL = /\(\s*(\d{1,2})\s*(?:bal|point|points|pts?)\s*\)\s*$/i;
const CORRECT_MARK = /^\s*(?:\*|✓|✔|\+)\s*|\s*(?:\*|✓|✔)\s*$/;

// Turns the answer text ("B", "A, C", "1", "b|d") into option indexes.
function answerIndexes(raw: string, options: string[]): number[] {
  const picks = raw.split(/[,;|/&]|\s+(?:və|and)\s+/i).map((x) => x.trim()).filter(Boolean);
  const found = new Set<number>();
  for (const pick of picks) {
    const letter = pick.replace(/[.)\s]/g, "");
    if (/^[A-Ha-h]$/.test(letter)) found.add(LETTERS.indexOf(letter.toUpperCase()));
    else if (/^\d$/.test(letter)) found.add(Number(letter) - 1);
    else {
      const byText = options.findIndex((o) => squash(o).toLowerCase() === squash(pick).toLowerCase());
      if (byText >= 0) found.add(byText);
    }
  }
  // Compact form such as "AC" or "BD".
  if (!found.size && /^[A-Ha-h]{2,4}$/.test(raw.replace(/[\s.]/g, ""))) for (const ch of raw.replace(/[\s.]/g, "").toUpperCase()) found.add(LETTERS.indexOf(ch));
  return [...found].filter((n) => Number.isInteger(n) && n >= 0 && n < options.length).sort((a, b) => a - b);
}

type Draft = { n: string; text: string; options: string[]; marked: number[]; answer: string; points: number; last: "text" | "option" };

function finish(d: Draft, out: ImportResult) {
  const label = `Sual ${d.n}`;
  const text = squash(d.text.replace(POINTS_TAIL, ""));
  const points = Math.max(1, Math.min(20, d.points || 1));
  if (!text) return;
  if (!d.options.length) {
    // Numbered line without options is an open question graded by hand.
    out.questions.push({ id: newId(), type: "text", text, options: [], correct: [], points });
    return;
  }
  if (d.options.length < 2) return void out.skipped.push({ label, reason: "ən azı 2 variant lazımdır" });
  const correct = d.answer ? answerIndexes(d.answer, d.options) : d.marked;
  if (!correct.length) return void out.skipped.push({ label, reason: "düzgün cavab göstərilməyib" });
  const type: QuestionType = correct.length > 1 ? "multiple" : "single";
  out.questions.push({ id: newId(), type, text, options: d.options.slice(0, 8), correct, points });
}

// Reads questions out of plain text taken from Word, PDF or a text file:
//   1. Question? (2 bal)   A) one   B) two   Cavab: B
export function parseQuestionText(input: string): ImportResult {
  const out: ImportResult = { questions: [], skipped: [] };
  let cur: Draft | null = null;
  const flush = () => {
    if (cur) finish(cur, out);
    cur = null;
  };
  for (const line of input.replace(/\r/g, "").split("\n")) {
    if (!line.trim()) continue;
    const answer = ANSWER_LINE.exec(line);
    if (answer && cur) {
      cur.answer = answer[1].trim();
      continue;
    }
    const option = cur && OPTION_START.exec(line);
    if (cur && option) {
      let value = option[3].trim();
      const marked = CORRECT_MARK.test(value);
      value = squash(value.replace(CORRECT_MARK, ""));
      if (value) {
        cur.options.push(value);
        if (marked) cur.marked.push(cur.options.length - 1);
        cur.last = "option";
      }
      continue;
    }
    const question = QUESTION_START.exec(line);
    if (question) {
      flush();
      const points = POINTS_TAIL.exec(question[2]);
      cur = { n: question[1], text: question[2], options: [], marked: [], answer: "", points: points ? Number(points[1]) : 1, last: "text" };
      continue;
    }
    // A wrapped line continues the previous question or option.
    if (cur) {
      if (cur.last === "option" && cur.options.length) cur.options[cur.options.length - 1] = squash(`${cur.options[cur.options.length - 1]} ${line}`);
      else cur.text = squash(`${cur.text} ${line}`);
      const points = POINTS_TAIL.exec(cur.text);
      if (points) cur.points = Number(points[1]);
    }
  }
  flush();
  out.questions = out.questions.slice(0, MAX_QUESTIONS);
  return out;
}

const norm = (v: string) => squash(v).toLowerCase();

// Reads a spreadsheet: a header row (Sual, Variant A…, Düzgün cavab, Bal) or the semicolon CSV layout.
export function parseQuestionRows(rows: string[][]): ImportResult {
  const table = rows.map((r) => r.map((c) => String(c ?? "").trim())).filter((r) => r.some(Boolean));
  const out: ImportResult = { questions: [], skipped: [] };
  if (!table.length) return out;
  const head = table[0].map(norm);
  const qCol = head.findIndex((h) => /^(sual|question|sualın mətni|sual mətni)$/.test(h));
  if (qCol < 0) {
    out.questions = parseQuestionCsv(table.map((r) => r.join(";")).join("\n"));
    if (!out.questions.length) out.skipped.push({ label: "Fayl", reason: "başlıq sətri (Sual, Variant A…, Düzgün cavab) tapılmadı" });
    return out;
  }
  const optionCols = head.flatMap((h, i) => (i !== qCol && /^(variant|option|seçim)\s*[a-h1-8]?$|^[a-h]$|^(variant|option|seçim)\s*[a-h1-8]$/.test(h) ? [i] : []));
  const answerCol = head.findIndex((h, i) => !optionCols.includes(i) && /düzgün|doğru|cavab|answer|correct|açar|key/.test(h));
  const pointsCol = head.findIndex((h) => /^(bal|points?|xal)$/.test(h));
  const typeCol = head.findIndex((h) => /^(tip|type|növ)$/.test(h));
  table.slice(1).forEach((row, index) => {
    const label = `Sətir ${index + 2}`;
    const text = squash(row[qCol] || "");
    if (!text) return;
    const points = Math.max(1, Math.min(20, Number(row[pointsCol]) || 1));
    const options = optionCols.map((i) => squash(row[i] || "")).filter(Boolean);
    const kind = norm(row[typeCol] || "");
    if (!options.length || kind.startsWith("t") || kind.startsWith("a")) return void out.questions.push({ id: newId(), type: "text", text, options: [], correct: [], points });
    if (options.length < 2) return void out.skipped.push({ label, reason: "ən azı 2 variant lazımdır" });
    const correct = answerIndexes(row[answerCol] || "", options);
    if (!correct.length) return void out.skipped.push({ label, reason: "düzgün cavab göstərilməyib" });
    out.questions.push({ id: newId(), type: correct.length > 1 ? "multiple" : "single", text, options: options.slice(0, 8), correct, points });
  });
  out.questions = out.questions.slice(0, MAX_QUESTIONS);
  return out;
}
