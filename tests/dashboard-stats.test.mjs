import test from "node:test";
import assert from "node:assert/strict";
import { comparePeriods, inPeriod, monthlyTrend, pctChange, reachedFunnel, sourceSplit } from "../lib/dashboard-stats.ts";

const app = (status, created, updated = null, auto = 0) => ({ status, created, updated, auto });

test("monthly trend counts applications, hires and the average days to hire", () => {
  const apps = [
    app("Göndərildi", "2026-09-05T10:00:00Z"),
    app("İşə qəbul edildi", "2026-09-10T00:00:00Z", "2026-10-10T00:00:00Z"),
    app("İşə qəbul edildi", "2026-10-01T00:00:00Z", "2026-10-21T00:00:00Z"),
    app("Müsahibə", "2026-10-02T00:00:00Z", "2026-10-03T00:00:00Z"),
  ];
  const t = monthlyTrend(apps, "2026-10-23", 3);
  assert.deepEqual(t.map((m) => m.month), ["2026-08", "2026-09", "2026-10"]);
  assert.deepEqual(t.map((m) => m.applications), [0, 2, 2]);
  assert.deepEqual(t.map((m) => m.hires), [0, 0, 2]);
  assert.equal(t[2].avgDaysToHire, 25); // (30 + 20) / 2
  assert.equal(t[1].avgDaysToHire, null);
});
test("the trend crosses a year boundary", () => {
  assert.deepEqual(monthlyTrend([], "2026-02-10", 4).map((m) => m.month), ["2025-11", "2025-12", "2026-01", "2026-02"]);
});
test("funnel counts the furthest stage reached and ignores rejected applicants", () => {
  const f = reachedFunnel({ "Göndərildi": 4, "Baxışda": 3, "Müsahibə": 2, "Təklif edildi": 1, "İşə qəbul edildi": 1, "Uyğun deyil": 9 });
  assert.deepEqual(f.map((x) => x.reached), [11, 7, 4, 2, 1]);
  assert.deepEqual(f.map((x) => x.fromPrevious), [null, 64, 57, 50, 50]);
});
test("an empty funnel has no percentages", () => {
  assert.ok(reachedFunnel({}).every((x) => x.reached === 0 && x.fromPrevious === null));
});
test("source split separates AI auto-applications", () => {
  assert.deepEqual(sourceSplit([{ auto: 1 }, { auto: 0 }, { auto: 0 }]), { candidate: 2, auto: 1 });
});
test("the previous period is equally long and ends the day before the current one", () => {
  const p = comparePeriods("2026-10-01", "2026-10-10");
  assert.deepEqual(p.current, { from: "2026-10-01", to: "2026-10-10" });
  assert.deepEqual(p.previous, { from: "2026-09-21", to: "2026-09-30" });
  assert.equal(p.days, 10);
  const d = comparePeriods("", "", "2026-10-30");
  assert.deepEqual(d.current, { from: "2026-10-01", to: "2026-10-30" });
  assert.deepEqual(d.previous, { from: "2026-09-01", to: "2026-09-30" });
  assert.equal(inPeriod("2026-10-10T23:00:00Z", p.current), true);
  assert.equal(inPeriod("2026-10-11T00:00:00Z", p.current), false);
});
test("percentage change handles a zero base", () => {
  assert.equal(pctChange(15, 10), 50);
  assert.equal(pctChange(5, 10), -50);
  assert.equal(pctChange(5, 0), null);
});
