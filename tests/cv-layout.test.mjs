// Real-world CV layouts must keep each role next to its own dates and duties.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractTextItems, getDocumentProxy } from "unpdf";
import { layoutPdfText, cleanCvText } from "../lib/cv-text.ts";

async function read(name) {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(new URL(`./fixtures/${name}.pdf`, import.meta.url))));
  const { items } = await extractTextItems(pdf);
  return items.map((page) => cleanCvText(layoutPdfText([page]))).join("\n");
}
const lines = (text) => text.split("\n");

test("right-aligned dates and cities stay on their role's line (single column)", async () => {
  const text = await read("nijat");
  assert.ok(lines(text).some((l) => /Senior Audit Associate.*October 2026 - Present/.test(l)));
  assert.ok(lines(text).some((l) => /Junior Accountant.*May – September 2023/.test(l)));
});

test("long left-column lines do not detach from their column", async () => {
  const text = await read("fidan");
  const l = lines(text);
  const i = l.findIndex((x) => /Leading Reporting and Budgeting Specialist/.test(x));
  assert.match(l[i + 1], /Azersilah/);
  assert.match(l[i + 2], /12\/2023 - 02\/2026/);
  assert.ok(l.findIndex((x) => /PERSONAL PROJECTS/.test(x)) > l.findIndex((x) => /EDUCATION/.test(x)));
});

test("sidebar is read separately from the employment column", async () => {
  const text = await read("sabina");
  const l = lines(text);
  const ey = l.findIndex((x) => /^Ernst & Young Holdings/.test(x));
  assert.match(l[ey + 1], /Financial Accounting Advisory/);
  assert.match(l[ey + 2], /Collaborated/);
  assert.ok(l.findIndex((x) => /^Certificates/.test(x)) < ey);
});

test("one-line roles and wide header bands survive", async () => {
  const text = await read("mahammad");
  assert.match(text, /KPMG Azerbaijan"\n08\/2023 - 06\/2025/);
  assert.match(text, /Audit Assistant 2 \( 10\/2024 - 06\/2025\)/);
  assert.match(text, /ACCA FM \(Financial Management\)\nexam booked for December 2026/);
});

test("pipe-separated company | role lines keep right-aligned dates", async () => {
  const text = await read("narmin");
  assert.match(text, /Deloitte Azerbaijan \| Audit Assistant 1.*10\/2024 - 05\/2025/);
});

test("letter-spaced words keep a wider gap between the words through the cleaning", async () => {
  const { cleanCvText } = await import("../lib/cv-text.ts");
  assert.equal(cleanCvText("P A Z A R L A M A   Y Ö N E T İ C İ S İ"), "P A Z A R L A M A  Y Ö N E T İ C İ S İ");
  assert.equal(cleanCvText("normal   text  here"), "normal text here");
});
