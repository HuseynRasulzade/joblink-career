import test from "node:test";
import assert from "node:assert/strict";
import { datesInLine, kindOfText, normalizeDays, parseCalendarText, textFromFile } from "../lib/calendar-extract.ts";

test("dates are found in the usual written forms", () => {
  assert.deepEqual(datesInLine("Novruz bayramı 2027-03-20", 2027), ["2027-03-20"]);
  assert.deepEqual(datesInLine("Zəfər günü 08.11.2027", 2027), ["2027-11-08"]);
  assert.deepEqual(datesInLine("Ramazan bayramı 9-10 mart 2027", 2027), ["2027-03-09", "2027-03-10"]);
  assert.deepEqual(datesInLine("20.03.2027 - 22.03.2027 Novruz", 2027), ["2027-03-20", "2027-03-21", "2027-03-22"]);
  assert.deepEqual(datesInLine("New Year 1 January", 2027), ["2027-01-01"]);
  assert.deepEqual(datesInLine("31.02.2027 yoxdur", 2027), []);
});

test("words around the date decide the kind", () => {
  assert.equal(kindOfText("Novruz bayramı"), "holiday");
  assert.equal(kindOfText("26 mart şənbə iş günü"), "work");
  assert.equal(kindOfText("Bayram ərəfəsi: qısaldılmış iş günü"), "short");
  assert.equal(kindOfText("qeyri-iş günü"), "off");
});

test("a pasted calendar becomes a list of days", () => {
  const text = [
    "2027 ili üçün istehsalat təqvimi",
    "1-2 yanvar — Yeni il bayramı",
    "20 mart 2027 Novruz bayramı",
    "27 mart 2027 şənbə iş günü",
    "08.11.2027 Zəfər günü",
    "boş sətir mətn",
  ].join("\n");
  const days = parseCalendarText(text);
  assert.deepEqual(days.map((d) => d.day), ["2027-01-01", "2027-01-02", "2027-03-20", "2027-03-27", "2027-11-08"]);
  assert.equal(days.find((d) => d.day === "2027-03-27").kind, "work");
  assert.equal(days.find((d) => d.day === "2027-01-02").label, "— Yeni il bayramı".replace("— ", ""));
});

test("an AI answer is cleaned: bad dates and kinds are dropped or mapped", () => {
  const days = normalizeDays([
    { day: "2027-03-20", kind: "holiday", label: "Novruz" },
    { date: "2027-03-27", type: "iş günü", name: "Şənbə" },
    { day: "2027-13-01", kind: "holiday" },
    { day: "bad", kind: "off" },
    { day: "1999-01-01", kind: "off" },
  ]);
  assert.deepEqual(days.map((d) => [d.day, d.kind]), [["2027-03-20", "holiday"], ["2027-03-27", "work"]]);
});

test("text files and ICS are read without AI, images and PDF are left to the AI", () => {
  const ics = "BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20270320\nDTEND;VALUE=DATE:20270323\nSUMMARY:Novruz bayramı\nEND:VEVENT\nEND:VCALENDAR";
  const text = textFromFile("t.ics", new TextEncoder().encode(ics));
  assert.deepEqual(parseCalendarText(text).map((d) => d.day), ["2027-03-20", "2027-03-21", "2027-03-22"]);
  assert.equal(textFromFile("scan.png", new Uint8Array([1, 2, 3])), null);
  assert.equal(textFromFile("a.pdf", new Uint8Array([1])), null);
});
