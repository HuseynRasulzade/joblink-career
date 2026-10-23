import test from "node:test";
import assert from "node:assert/strict";
import { bakuLocal, icsFor, sanitizeFeedback, sanitizeInterview, toIso } from "../lib/interviews.ts";

const NOW = Date.parse("2026-10-23T08:00:00Z"); // 12:00 in Baku

test("a local time without an offset is Baku time (UTC+4)", () => {
  assert.equal(toIso("2026-11-02T14:30"), "2026-11-02T10:30:00.000Z");
  assert.equal(toIso("2026-11-02T10:30:00Z"), "2026-11-02T10:30:00.000Z");
  assert.equal(toIso("nonsense"), null);
  assert.equal(toIso(""), null);
  assert.equal(bakuLocal("2026-11-02T10:30:00.000Z"), "2026-11-02 14:30");
});
test("an online interview needs a link and keeps clean fields", () => {
  const ok = sanitizeInterview({ scheduledAt: "2026-11-02T14:30", kind: "online", location: "https://meet.example/abc", durationMin: 60, note: " Salam " }, NOW);
  assert.deepEqual(ok, { scheduledAt: "2026-11-02T10:30:00.000Z", durationMin: 60, kind: "online", location: "https://meet.example/abc", note: "Salam" });
  assert.match(sanitizeInterview({ scheduledAt: "2026-11-02T14:30", kind: "online", location: "" }, NOW).error, /link/i);
  assert.match(sanitizeInterview({ scheduledAt: "2026-11-02T14:30", kind: "onsite", location: "x" }, NOW).error, /ünvan/i);
});
test("a phone interview needs no place and defaults are applied", () => {
  const ok = sanitizeInterview({ scheduledAt: "2026-11-02T14:30", kind: "phone" }, NOW);
  assert.equal(ok.kind, "phone");
  assert.equal(ok.durationMin, 45);
  assert.equal(sanitizeInterview({ scheduledAt: "2026-11-02T14:30", kind: "weird", location: "https://x.test/a" }, NOW).kind, "online");
});
test("the time must be in the future but within a year", () => {
  assert.match(sanitizeInterview({ scheduledAt: "2026-10-23T12:03", kind: "phone" }, NOW).error, /keçmiş/);
  assert.equal(sanitizeInterview({ scheduledAt: "2026-10-23T12:10", kind: "phone" }, NOW).kind, "phone");
  assert.match(sanitizeInterview({ scheduledAt: "2028-01-01T10:00", kind: "phone" }, NOW).error, /bir ildən/);
  assert.match(sanitizeInterview({}, NOW).error, /seçin/);
});
test("duration is clamped between 15 and 240 minutes", () => {
  assert.equal(sanitizeInterview({ scheduledAt: "2026-11-02T14:30", kind: "phone", durationMin: 5 }, NOW).durationMin, 15);
  assert.equal(sanitizeInterview({ scheduledAt: "2026-11-02T14:30", kind: "phone", durationMin: 999 }, NOW).durationMin, 240);
});
test("feedback needs a rating from 1 to 5", () => {
  assert.deepEqual(sanitizeFeedback({ rating: 4, feedback: " Yaxşı ", decision: "advance" }), { rating: 4, feedback: "Yaxşı", decision: "advance" });
  assert.equal(sanitizeFeedback({ rating: 4, decision: "weird" }).decision, "hold");
  for (const bad of [0, 6, "x", undefined]) assert.ok("error" in sanitizeFeedback({ rating: bad }));
});
test("the calendar file has UTC times, the right length and escaped text", () => {
  const ics = icsFor({ id: "i1", scheduledAt: "2026-11-02T10:30:00.000Z", durationMin: 60, title: "Müsahibə, FBCO", location: "Nizami 10; 3-cü mərtəbə", description: "Sətir 1\nSətir 2" });
  assert.match(ics, /DTSTART:20261102T103000Z/);
  assert.match(ics, /DTEND:20261102T113000Z/);
  assert.match(ics, /SUMMARY:Müsahibə\\, FBCO/);
  assert.match(ics, /LOCATION:Nizami 10\; 3-cü mərtəbə/);
  assert.match(ics, /DESCRIPTION:Sətir 1\\nSətir 2/);
  assert.ok(ics.startsWith("BEGIN:VCALENDAR") && ics.includes("END:VEVENT") && ics.includes("\r\n"));
});
