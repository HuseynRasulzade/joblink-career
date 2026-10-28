import test from "node:test";
import assert from "node:assert/strict";
import { effectiveSource, normalizeExternalSource, sourceBreakdown, trackingLink } from "../lib/sources.ts";
import { digestSubject, digestText, isDue, normalizeFrequency } from "../lib/digest.ts";

test("only known external channels are accepted from a link", () => {
  assert.equal(normalizeExternalSource("LinkedIn "), "linkedin");
  for (const bad of ["auto", "invite", "platform", "hack", "", null, 5]) assert.equal(normalizeExternalSource(bad), "");
});
test("old applications get a source from the auto flag", () => {
  assert.equal(effectiveSource("", 1), "auto");
  assert.equal(effectiveSource("", 0), "platform");
  assert.equal(effectiveSource("linkedin", 0), "linkedin");
});
test("tracking links carry the job and the channel", () => {
  assert.equal(trackingLink("https://x.test", "j1", "linkedin"), "https://x.test/jobs/j1?src=linkedin");
  assert.equal(trackingLink("https://x.test", "j1", "nonsense"), "https://x.test/jobs/j1");
});
test("source breakdown counts and sorts", () => {
  const b = sourceBreakdown([{ source: "linkedin" }, { source: "linkedin" }, { source: "", auto: 1 }, { source: "" , auto: 0 }]);
  assert.deepEqual(b.map((x) => [x.id, x.count]), [["linkedin", 2], ["auto", 1], ["platform", 1]]);
});
test("weekly digests go out on Mondays only and not twice", () => {
  const monday = new Date("2026-10-26T05:00:00Z"); // a Monday
  const tuesday = new Date("2026-10-27T05:00:00Z");
  assert.equal(isDue("weekly", "", monday), true);
  assert.equal(isDue("weekly", "", tuesday), false);
  assert.equal(isDue("weekly", "2026-10-26T05:00:00Z", monday), false);
  assert.equal(isDue("weekly", "2026-10-19T05:00:00Z", monday), true);
  assert.equal(isDue("off", "", monday), false);
});
test("monthly digests go out on the 1st, once a month", () => {
  assert.equal(isDue("monthly", "2026-10-01T05:00:00Z", new Date("2026-11-01T05:00:00Z")), true);
  assert.equal(isDue("monthly", "2026-11-01T05:00:00Z", new Date("2026-11-01T05:00:00Z")), false);
  assert.equal(isDue("monthly", "", new Date("2026-11-02T05:00:00Z")), false);
});
test("digest text lists the numbers and what needs attention", () => {
  const data = { companyName: "FBCO", frequency: "weekly", from: "2026-10-19", to: "2026-10-25", applications: 12, previousApplications: 10, hires: 1, attention: [{ label: "test yoxlanmalıdır", count: 2 }] };
  const text = digestText(data);
  assert.match(text, /Yeni müraciət: 12 \(əvvəlki dövrə görə \+20%\)/);
  assert.match(text, /- 2 test yoxlanmalıdır/);
  assert.match(digestSubject(data), /həftəlik/);
  assert.match(digestText({ ...data, attention: [], previousApplications: 0 }), /Diqqət tələb edən iş yoxdur/);
  assert.equal(normalizeFrequency("x"), "off");
});
