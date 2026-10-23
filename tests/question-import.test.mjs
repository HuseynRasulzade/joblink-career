import test from "node:test";
import assert from "node:assert/strict";
import { parseQuestionText, parseQuestionRows } from "../lib/question-import.ts";

test("text: single, multiple, open, points and wrapped lines", () => {
  const r = parseQuestionText(`1. Azərbaycanın paytaxtı hansıdır? (2 bal)
A) Gəncə
B) Bakı
C) Sumqayıt
Cavab: B

2. Hansılar sadə ədəddir?
A. 2
B. 4
C. 7
Düzgün cavab: A, C

3. Özünüzü təqdim edin.

4. Uzun sual
davamı burada?
a) bir
b) iki *
`);
  assert.equal(r.questions.length, 4);
  assert.deepEqual([r.questions[0].type, r.questions[0].correct, r.questions[0].points], ["single", [1], 2]);
  assert.deepEqual([r.questions[1].type, r.questions[1].correct], ["multiple", [0, 2]]);
  assert.equal(r.questions[2].type, "text");
  assert.equal(r.questions[3].text, "Uzun sual davamı burada?");
  assert.deepEqual(r.questions[3].correct, [1]);
});

test("text: question without a key is skipped with a reason", () => {
  const r = parseQuestionText("1. Sual?\nA) bir\nB) iki\n");
  assert.equal(r.questions.length, 0);
  assert.equal(r.skipped[0].label, "Sual 1");
});

test("rows: header table and answer by letter, number or text", () => {
  const r = parseQuestionRows([
    ["Sual", "Variant A", "Variant B", "Variant C", "Düzgün cavab", "Bal"],
    ["2+2?", "3", "4", "5", "B", "3"],
    ["Rəng?", "Qırmızı", "Mavi", "", "1", ""],
    ["Mətn", "x", "y", "", "y", ""],
    ["Bağlı", "a", "b", "", "", ""],
    ["Açıq sual", "", "", "", "", ""],
  ]);
  assert.equal(r.questions.length, 4);
  assert.deepEqual(r.questions[0].correct, [1]);
  assert.equal(r.questions[0].points, 3);
  assert.deepEqual(r.questions[1].correct, [0]);
  assert.deepEqual(r.questions[2].correct, [1]);
  assert.equal(r.questions[3].type, "text");
  assert.equal(r.skipped.length, 1);
});

test("rows without header fall back to the semicolon layout", () => {
  const r = parseQuestionRows([["single", "S?", "a|b", "2", "1"]]);
  assert.equal(r.questions.length, 1);
  assert.deepEqual(r.questions[0].correct, [1]);
});
